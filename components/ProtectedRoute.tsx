"use client";

import { useQuery } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";

interface ProtectedRouteProps {
	children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
	const { user, isLoading } = useAuth();
	const pathname = usePathname();
	const router = useRouter();

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
		// Redirect to preferences if not completed (except on preferences page)
		if (pathname !== "/preferences" && convexUser !== undefined) {
			if (!convexUser || !convexUser.hasCompletedPreferences) {
				router.replace("/preferences");
			}
		}
	}, [convexUser, pathname, router]);

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

	return <>{children}</>;
}
