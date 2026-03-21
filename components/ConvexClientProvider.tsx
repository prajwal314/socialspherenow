"use client";

import {
	AuthKitProvider,
	useAccessToken,
	useAuth,
} from "@workos-inc/authkit-nextjs/components";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
	return (
		<AuthKitProvider>
			<ConvexProviderWithAuth client={convex} useAuth={useAuthFromAuthKit}>
				{children}
			</ConvexProviderWithAuth>
		</AuthKitProvider>
	);
}

function useAuthFromAuthKit() {
	const { user, loading: isLoading } = useAuth();
	const {
		accessToken,
		loading: tokenLoading,
		error: tokenError,
	} = useAccessToken();
	const [retryCount, setRetryCount] = useState(0);
	const maxRetries = 3;

	// Log token errors for debugging
	useEffect(() => {
		if (tokenError) {
			console.error("[ConvexClientProvider] Token error:", tokenError);
		}
	}, [tokenError]);

	// Log authentication state for debugging
	useEffect(() => {
		console.log("[ConvexClientProvider] Auth state:", {
			hasUser: !!user,
			userId: user?.id,
			hasAccessToken: !!accessToken,
			isLoading,
			tokenLoading,
			tokenError: tokenError?.message,
			retryCount,
		});
	}, [user, accessToken, isLoading, tokenLoading, tokenError, retryCount]);

	const loading = (isLoading ?? false) || (tokenLoading ?? false);
	
	// Consider authenticated if we have user and token (even if there was a previous error that's now resolved)
	const authenticated = !!user && !!accessToken && !loading && !tokenError;

	const stableAccessToken = useRef<string | null>(null);
	if (accessToken && !tokenError) {
		stableAccessToken.current = accessToken;
	}

	const fetchAccessToken = useCallback(async () => {
		// Return the token if we have it
		if (stableAccessToken.current && !tokenError) {
			return stableAccessToken.current;
		}
		
		// If there's an error but we have a cached token, try using it
		if (stableAccessToken.current) {
			console.warn("[ConvexClientProvider] Token error occurred, using cached token");
			return stableAccessToken.current;
		}
		
		return null;
	}, [tokenError]);

	return {
		isLoading: loading,
		isAuthenticated: authenticated,
		fetchAccessToken,
	};
}
