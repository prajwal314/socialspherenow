/// <reference path="../global.d.ts" />
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
// @ts-ignore Next.js handles global CSS side-effect imports at build time.
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import LazyAnoAI from "@/components/LazyAnoAI";

const plusJakartaSans = Plus_Jakarta_Sans({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700", "800"],
	variable: "--font-primary",
	display: "swap",
});

export const metadata: Metadata = {
	title: "SocialSphere - Connect Comfortably",
	description:
		"A social app built for comfort, not pressure. Find the right people for activities, communities, and events.",
};

export const viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 5,
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${plusJakartaSans.variable} bg-black text-white antialiased overflow-x-hidden`}
				suppressHydrationWarning
			>
				<div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
					<LazyAnoAI />
				</div>
				<ConvexClientProvider>{children}</ConvexClientProvider>
			</body>
		</html>
	);
}
