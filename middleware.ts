import { authkitMiddleware } from "@workos-inc/authkit-nextjs";

// Build redirect URI based on environment
function getRedirectUri(): string {
	const vercelEnv = process.env.VERCEL_ENV;
	const branchUrl = process.env.VERCEL_BRANCH_URL;
	const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
	const workosRedirectUri = process.env.WORKOS_REDIRECT_URI;

	if (vercelEnv === "preview" && branchUrl) {
		return `https://${branchUrl}/callback`;
	}

	if (vercelEnv === "production" && productionUrl) {
		return `https://${productionUrl}/callback`;
	}

	// Fallback to WORKOS_REDIRECT_URI or throw error if not configured
	if (!workosRedirectUri) {
		console.error("WORKOS_REDIRECT_URI is not configured!", {
			VERCEL_ENV: vercelEnv,
			VERCEL_BRANCH_URL: branchUrl,
			VERCEL_PROJECT_PRODUCTION_URL: productionUrl,
			WORKOS_REDIRECT_URI: workosRedirectUri,
		});
		throw new Error(
			"Missing redirect URI configuration. Please set WORKOS_REDIRECT_URI environment variable.",
		);
	}

	return workosRedirectUri;
}

export default authkitMiddleware({
	eagerAuth: true,
	middlewareAuth: {
		enabled: true,
		unauthenticatedPaths: ["/", "/login", "/sign-in", "/sign-up"],
	},
	redirectUri: getRedirectUri(),
});

export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		// Always run for API routes
		"/(api|trpc)(.*)",
	],
};
