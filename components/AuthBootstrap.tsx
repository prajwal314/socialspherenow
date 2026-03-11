"use client";

import { useMutation } from "convex/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";

export function AuthBootstrap({ children }: { children: ReactNode }) {
	const { user, isLoading } = useAuth();
	const upsertUser = useMutation(api.users.upsertUser);
	const syncedUserIdRef = useRef<string | null>(null);
	const [isSyncing, setIsSyncing] = useState(false);

	useEffect(() => {
		if (!user?.id || syncedUserIdRef.current === user.id || isSyncing) {
			return;
		}

		let cancelled = false;

		const syncUser = async () => {
			setIsSyncing(true);

			try {
				await upsertUser({
					workosId: user.id,
					email: user.email ?? "",
					firstName: user.firstName ?? undefined,
					lastName: user.lastName ?? undefined,
					profileImageUrl: user.profilePictureUrl ?? undefined,
				});

				if (!cancelled) {
					syncedUserIdRef.current = user.id;
				}
			} catch (error) {
				console.error("Failed to sync authenticated user:", error);
			} finally {
				if (!cancelled) {
					setIsSyncing(false);
				}
			}
		};

		syncUser();

		return () => {
			cancelled = true;
		};
	}, [isSyncing, upsertUser, user]);

	if (isLoading || (user && syncedUserIdRef.current !== user.id && isSyncing)) {
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
