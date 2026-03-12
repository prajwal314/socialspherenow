"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { type ReactNode, useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";

type SyncStatus = "idle" | "syncing" | "synced" | "error";

export function AuthBootstrap({ children }: { children: ReactNode }) {
	const { user, isLoading: isAuthLoading } = useAuth();
	const { isAuthenticated: isConvexAuthenticated, isLoading: isConvexLoading } =
		useConvexAuth();
	const upsertUser = useMutation(api.users.upsertUser);
	const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
	const [syncedUserId, setSyncedUserId] = useState<string | null>(null);

	useEffect(() => {
		// Reset sync status when user logs out
		if (!user) {
			setSyncStatus("idle");
			setSyncedUserId(null);
			return;
		}

		// Wait for Convex to be authenticated before syncing
		if (!isConvexAuthenticated || isConvexLoading) {
			return;
		}

		// Already synced this user
		if (syncedUserId === user.id) {
			return;
		}

		// Already syncing
		if (syncStatus === "syncing") {
			return;
		}

		let cancelled = false;

		const syncUser = async () => {
			setSyncStatus("syncing");

			try {
				await upsertUser({
					workosId: user.id,
					email: user.email ?? "",
					firstName: user.firstName ?? undefined,
					lastName: user.lastName ?? undefined,
					profileImageUrl: user.profilePictureUrl ?? undefined,
				});

				if (!cancelled) {
					setSyncedUserId(user.id);
					setSyncStatus("synced");
				}
			} catch (error) {
				console.error("Failed to sync authenticated user:", error);
				if (!cancelled) {
					// On error, still allow user through but log the issue
					// This prevents infinite loading if Convex auth is misconfigured
					setSyncStatus("error");
					setSyncedUserId(user.id); // Mark as "synced" to unblock UI
				}
			}
		};

		syncUser();

		return () => {
			cancelled = true;
		};
	}, [
		user,
		syncedUserId,
		syncStatus,
		upsertUser,
		isConvexAuthenticated,
		isConvexLoading,
	]);

	// Show loading during:
	// 1. Initial WorkOS auth check
	// 2. Convex auth loading (getting token)
	// 3. First-time user sync (only if not already synced)
	const shouldShowLoading =
		isAuthLoading ||
		isConvexLoading ||
		(user &&
			isConvexAuthenticated &&
			syncStatus === "syncing" &&
			!syncedUserId);

	if (shouldShowLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-[#161621]">
				<div className="text-center">
					<div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
					<p className="text-sm text-gray-400">Preparing your account...</p>
				</div>
			</div>
		);
	}

	return <>{children}</>;
}
