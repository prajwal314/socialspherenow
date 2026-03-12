"use client";

import { useAuth as useWorkOSAuth } from "@workos-inc/authkit-nextjs/components";

// Re-export useAuth hook with additional convenience methods
export function useAuth() {
	const { user, loading } = useWorkOSAuth();

	return {
		user,
		isLoading: loading,
		loading,
		// For sign in/out, redirect to the route handlers
		signIn: () => {
			window.location.href = "/sign-in";
		},
		signUp: () => {
			window.location.href = "/sign-up";
		},
		signOut: () => {
			window.location.href = "/api/auth/signout";
		},
	};
}

// Export user type for convenience
export type AuthUser = NonNullable<ReturnType<typeof useWorkOSAuth>["user"]>;
