import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	compress: true,
	eslint: { ignoreDuringBuilds: true },
	typescript: { ignoreBuildErrors: true },
	poweredByHeader: false,
	images: {
		formats: ["image/avif", "image/webp"],
		remotePatterns: [{ protocol: "https", hostname: "**" }],
	},
	experimental: { optimizePackageImports: ["three", "lucide-react"] },
};

export default nextConfig;
