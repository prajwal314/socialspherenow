"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const AuthBootstrap = dynamic(
	() => import("@/components/AuthBootstrap").then((mod) => mod.AuthBootstrap),
	{ ssr: false },
);

export function AppProviders({ children }: { children: ReactNode }) {
	return <AuthBootstrap>{children}</AuthBootstrap>;
}
