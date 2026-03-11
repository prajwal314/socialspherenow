import { getSignInUrl, withAuth } from "@workos-inc/authkit-nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function LoginPage() {
	// Check if user is already authenticated
	const { user } = await withAuth();

	// If already logged in, redirect to home
	if (user) {
		redirect("/home");
	}

	// Get the sign-in URL from WorkOS
	const signInUrl = await getSignInUrl();

	return (
		<div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[#161621]">
			<h1 className="text-2xl font-bold mb-6 text-white">
				Sign in to SocialSphere
			</h1>

			<Link
				href={signInUrl}
				className="bg-gradient-to-r from-purple-500 to-cyan-500 text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition"
			>
				Sign In with WorkOS
			</Link>
		</div>
	);
}
