"use client";

import { useQuery } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";

interface ProtectedRouteProps {
	children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
	const { user, isLoading } = useAuth();
	const pathname = usePathname();
	const router = useRouter();
	const [hasRedirected, setHasRedirected] = useState(false);

	const convexUser = useQuery(
		api.users.getByWorkosId,
		user?.id ? { workosId: user.id } : "skip",
	);

	useEffect(() => {
		if (!isLoading && !user) {
			router.replace("/login");
		}
	}, [isLoading, user, router]);

	useEffect(() => {
		// Redirect to preferences if user exists but hasn't completed preferences
		// (except when already on preferences page)
		if (pathname !== "/preferences" && convexUser !== undefined && !hasRedirected) {
			if (convexUser && !convexUser.hasCompletedPreferences) {
				setHasRedirected(true);
				router.replace("/preferences");
			}
		}
	}, [convexUser, pathname, router, hasRedirected]);

	// Show loading while checking session
	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-[#161621]">
				<div className="text-center">
					<div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
					<p className="text-gray-400">Loading...</p>
				</div>
			</div>
		);
	}

	// Not authenticated
	if (!user) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-[#161621]">
				<div className="text-center">
					<div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
					<p className="text-gray-400">Redirecting to login...</p>
				</div>
			</div>
		);
	}

	// Still loading Convex user
	if (convexUser === undefined) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-[#161621]">
				<div className="text-center">
					<div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
					<p className="text-gray-400">Loading profile...</p>
				</div>
			</div>
		);
	}

	// User authenticated but not found in Convex database
	// This should not happen if AuthBootstrap worked correctly, but we handle it as a safety measure
	if (convexUser === null) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-[#161621]">
				<div className="text-center max-w-md px-6">
					<div className="mx-auto mb-4 h-16 w-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
						<svg
							className="w-8 h-8 text-yellow-400"
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
						Profile Setup Required
					</h2>
					<p className="text-sm text-gray-400 mb-6">
						We couldn't find your profile. Please sign out and sign back in to complete setup.
					</p>
					<div className="flex flex-col gap-3">
						<button
							type="button"
							onClick={() => window.location.reload()}
							className="w-full py-3 rounded-xl bg-[#0c8b96] text-white border border-white/20 font-medium hover:shadow-lg hover:shadow-gray-400/25 transition-all"
						>
							Retry
						</button>
						<button
							type="button"
							onClick={() => window.location.href = "/api/auth/signout"}
							className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-medium hover:bg-white/10 transition-all"
						>
							Sign Out & Try Again
						</button>
					</div>
				</div>
			</div>
		);
	}

	return <>{children}</>;
}
