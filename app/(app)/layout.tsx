import type { ReactNode } from "react";
import { AppProviders } from "@/components/AppProviders";

export default function AppLayout({ children }: { children: ReactNode }) {
	return <AppProviders>{children}</AppProviders>;
}
