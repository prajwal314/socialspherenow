"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { type ReactNode, useCallback, useEffect, useState, useRef } from "react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";

type SyncStatus = "idle" | "syncing" | "synced" | "error" | "retrying" | "waiting_auth";

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;
const AUTH_TIMEOUT_MS = 10000; // Wait max 10 seconds for Convex auth

export function AuthBootstrap({ children }: { children: ReactNode }) {
	const { user, isLoading: isAuthLoading } = useAuth();
	const { isAuthenticated: isConvexAuthenticated, isLoading: isConvexLoading } =
		useConvexAuth();
	const upsertUser = useMutation(api.users.upsertUser);
	const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
	const [syncedUserId, setSyncedUserId] = useState<string | null>(null);
	const [retryCount, setRetryCount] = useState(0);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [authWaitStarted, setAuthWaitStarted] = useState<number | null>(null);
	const authTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Query to verify user exists in database after sync
	const convexUser = useQuery(
		api.users.getByWorkosId,
		user?.id && syncStatus === "synced" ? { workosId: user.id } : "skip"
	);

	// Fallback: sync via API route (server-side, bypasses WebSocket auth issues)
	const syncUserViaApi = useCallback(async (): Promise<boolean> => {
		try {
			console.log(`[AuthBootstrap] Attempting server-side sync via API...`);
			const response = await fetch("/api/user/sync", {
				method: "POST",
				credentials: "include",
			});
			
			if (!response.ok) {
				const error = await response.json().catch(() => ({ error: "Unknown error" }));
				console.error(`[AuthBootstrap] API sync failed:`, error);
				return false;
			}
			
			const result = await response.json();
			console.log(`[AuthBootstrap] API sync succeeded:`, result);
			return true;
		} catch (error) {
			console.error(`[AuthBootstrap] API sync error:`, error);
			return false;
		}
	}, []);

	const syncUser = useCallback(async (attempt: number = 0): Promise<boolean> => {
		if (!user) {
			console.log(`[AuthBootstrap] syncUser called but no user available`);
			return false;
		}

		console.log(`[AuthBootstrap] Attempt ${attempt + 1}: Syncing user...`, {
			workosId: user.id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			isConvexAuthenticated,
		});

		try {
			// Normalize email to lowercase to prevent case-sensitivity issues
			const normalizedEmail = (user.email ?? "").toLowerCase().trim();
			
			console.log(`[AuthBootstrap] Calling upsertUser mutation with:`, {
				workosId: user.id,
				email: normalizedEmail,
			});
			
			const result = await upsertUser({
				workosId: user.id,
				email: normalizedEmail,
				firstName: user.firstName ?? undefined,
				lastName: user.lastName ?? undefined,
				profileImageUrl: user.profilePictureUrl ?? undefined,
			});

			console.log(`[AuthBootstrap] User synced successfully: ${user.id}, result:`, result);
			return true;
		} catch (error) {
			console.error(`[AuthBootstrap] Failed to sync user via mutation (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS}):`, error);
			
			// Check if the error is authentication-related
			const errorMessage = error instanceof Error ? error.message : String(error);
			const isAuthError = errorMessage.includes("auth") || 
				errorMessage.includes("token") || 
				errorMessage.includes("unauthorized") ||
				errorMessage.includes("Unauthenticated") ||
				errorMessage.includes("Not authenticated");
			
			// If it's an auth error on first attempt, try the API fallback immediately
			if (isAuthError && attempt === 0) {
				console.warn(`[AuthBootstrap] Authentication error, trying server-side sync as fallback...`);
				const apiSuccess = await syncUserViaApi();
				if (apiSuccess) {
					return true;
				}
			}
			
			// Retry with exponential backoff
			if (attempt < MAX_RETRY_ATTEMPTS - 1) {
				const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
				console.log(`[AuthBootstrap] Retrying in ${delay}ms...`);
				await new Promise(resolve => setTimeout(resolve, delay));
				return syncUser(attempt + 1);
			}
			
			// Last resort: try API sync one more time
			console.warn(`[AuthBootstrap] All mutation attempts failed, trying API fallback as last resort...`);
			return syncUserViaApi();
		}
	}, [user, upsertUser, isConvexAuthenticated, syncUserViaApi]);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (authTimeoutRef.current) {
				clearTimeout(authTimeoutRef.current);
			}
		};
	}, []);

	useEffect(() => {
		console.log(`[AuthBootstrap] useEffect triggered:`, {
			hasUser: !!user,
			userId: user?.id,
			isConvexAuthenticated,
			isConvexLoading,
			syncStatus,
			syncedUserId,
			authWaitStarted,
		});

		// Reset sync status when user logs out
		if (!user) {
			setSyncStatus("idle");
			setSyncedUserId(null);
			setRetryCount(0);
			setErrorMessage(null);
			setAuthWaitStarted(null);
			return;
		}

		// Already synced this user successfully
		if (syncedUserId === user.id && syncStatus === "synced") {
			console.log(`[AuthBootstrap] Already synced this user, skipping`);
			return;
		}

		// Already syncing or retrying
		if (syncStatus === "syncing" || syncStatus === "retrying") {
			console.log(`[AuthBootstrap] Already syncing/retrying, skipping`);
			return;
		}

		// If Convex is authenticated, proceed with sync immediately
		if (isConvexAuthenticated && !isConvexLoading) {
			console.log(`[AuthBootstrap] Convex authenticated, starting sync for user:`, user.id);
			startSync();
			return;
		}

		// If Convex is still loading, wait for it (but with a timeout)
		if (isConvexLoading) {
			console.log(`[AuthBootstrap] Waiting for Convex auth to complete...`);
			
			// Start the timeout timer if not already started
			if (authWaitStarted === null) {
				setAuthWaitStarted(Date.now());
				setSyncStatus("waiting_auth");
			}
			return;
		}

		// Convex loading is done but not authenticated
		// This could be a temporary issue or a real auth failure
		// Wait a bit more then try to sync anyway (mutation might still work with cached token)
		if (!isConvexAuthenticated && !isConvexLoading) {
			const waitTime = authWaitStarted ? Date.now() - authWaitStarted : 0;
			
			if (waitTime < AUTH_TIMEOUT_MS && syncStatus === "waiting_auth") {
				console.log(`[AuthBootstrap] Convex auth failed but within timeout, waiting... (${waitTime}ms)`);
				
				// Set a timeout to try syncing anyway
				if (!authTimeoutRef.current) {
					authTimeoutRef.current = setTimeout(() => {
						console.log(`[AuthBootstrap] Auth timeout reached, attempting sync anyway`);
						authTimeoutRef.current = null;
						startSync();
					}, AUTH_TIMEOUT_MS - waitTime);
				}
				return;
			}
			
			// If we've waited long enough or sync status is idle, try to sync
			// The mutation might succeed if there's a valid cached token
			console.log(`[AuthBootstrap] Convex auth not successful, attempting sync anyway for user:`, user.id);
			startSync();
		}

		function startSync() {
			const currentUserId = user!.id; // We know user exists at this point
			let cancelled = false;

			const performSync = async () => {
				setSyncStatus("syncing");
				setErrorMessage(null);
				setAuthWaitStarted(null);

				const success = await syncUser(0);

				if (!cancelled) {
					if (success) {
						setSyncedUserId(currentUserId);
						setSyncStatus("synced");
						setRetryCount(0);
					} else {
						// After all retries failed, set error state
						setSyncStatus("error");
						setErrorMessage("Failed to sync your account. Please try refreshing the page or signing out and back in.");
						console.error(`[AuthBootstrap] All sync attempts failed for user: ${currentUserId}`);
					}
				}
			};

			performSync();

			return () => {
				cancelled = true;
			};
		}
	}, [
		user,
		syncedUserId,
		syncStatus,
		syncUser,
		isConvexAuthenticated,
		isConvexLoading,
		authWaitStarted,
	]);

	// Manual retry handler
	const handleRetry = useCallback(() => {
		setRetryCount(prev => prev + 1);
		setAuthWaitStarted(null);
		setSyncStatus("idle"); // Reset to trigger re-sync
	}, []);

	// Determine if verification query is still loading
	// convexUser is undefined when query is loading/skipped, null when completed with no result
	const isVerificationLoading = 
		syncStatus === "synced" && 
		convexUser === undefined;

	// Show loading during:
	// 1. Initial WorkOS auth check
	// 2. Convex auth loading (getting token) - but with timeout
	// 3. First-time user sync (only if not already synced)
	// 4. Verifying user was actually created in database
	// 5. Waiting for auth with timeout
	const shouldShowLoading =
		isAuthLoading ||
		(user &&
			(syncStatus === "syncing" || syncStatus === "retrying" || syncStatus === "waiting_auth") &&
			!syncedUserId) ||
		isVerificationLoading;

	// Verify user exists after sync - if not, show error
	// convexUser === null means query completed but no user found
	const userVerificationFailed = 
		syncStatus === "synced" && 
		convexUser === null;
	
	// Debug logging
	console.log(`[AuthBootstrap] Render state:`, {
		syncStatus,
		syncedUserId,
		convexUser: convexUser === undefined ? 'undefined (loading)' : convexUser === null ? 'null (not found)' : 'exists',
		userVerificationFailed,
		isVerificationLoading,
		shouldShowLoading,
		isConvexAuthenticated,
		isConvexLoading,
	});

	if (shouldShowLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-[#161621]">
				<div className="text-center">
					<div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
					<p className="text-sm text-gray-400">
						{syncStatus === "waiting_auth" ? "Connecting to server..." : "Preparing your account..."}
					</p>
				</div>
			</div>
		);
	}

	// Show error state with retry option if sync failed or user verification failed
	if (syncStatus === "error" || userVerificationFailed) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-[#161621]">
				<div className="text-center max-w-md px-6">
					<div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center">
						<svg
							className="w-8 h-8 text-red-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
					</div>
					<h2 className="text-lg font-semibold text-white mb-2">
						Account Sync Failed
					</h2>
					<p className="text-sm text-gray-400 mb-6">
						{errorMessage || "We couldn't set up your account. This might be a temporary issue."}
					</p>
					<div className="flex flex-col gap-3">
						<button
							type="button"
							onClick={handleRetry}
							className="w-full py-3 rounded-xl bg-[#0c8b96] text-white border border-white/20 font-medium hover:shadow-lg hover:shadow-gray-400/25 transition-all"
						>
							Try Again
						</button>
						<button
							type="button"
							onClick={() => window.location.reload()}
							className="w-full py-3 rounded-xl bg-white/10 border border-white/10 text-gray-300 font-medium hover:bg-white/15 transition-all"
						>
							Refresh Page
						</button>
						<button
							type="button"
							onClick={() => window.location.href = "/api/auth/signout"}
							className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-medium hover:bg-white/10 transition-all"
						>
							Sign Out
						</button>
					</div>
					{retryCount > 0 && (
						<p className="text-xs text-gray-500 mt-4">
							Retry attempts: {retryCount}
						</p>
					)}
				</div>
			</div>
		);
	}

	return <>{children}</>;
}
