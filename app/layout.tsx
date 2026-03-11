import type { Metadata } from "next";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";

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
		<html lang="en">
			<body className="bg-[#161621] text-white antialiased">
				<ConvexClientProvider>{children}</ConvexClientProvider>
			</body>
		</html>
	);
}
