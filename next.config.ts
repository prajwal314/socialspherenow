import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Disable ESLint during build (using Biome instead)
	eslint: {
		ignoreDuringBuilds: true,
	},
	// Disable TypeScript errors during build for now (fix incrementally)
	typescript: {
		ignoreBuildErrors: true,
	},
	// Image optimization domains if needed
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "**",
			},
		],
	},
};

export default nextConfig;
