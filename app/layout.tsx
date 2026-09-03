import type { Metadata } from "next";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import AnoAI from "@/components/ui/animated-shader-background";

export const metadata: Metadata = {
	title: "SocialSphere - Connect Comfortably",
	description:
		"A social app built for comfort, not pressure. Find the right people for activities, communities, and events.",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className="bg-black text-white antialiased"
				suppressHydrationWarning
			>
				<div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
					<AnoAI />
				</div>
				<ConvexClientProvider>{children}</ConvexClientProvider>
			</body>
		</html>
	);
}
