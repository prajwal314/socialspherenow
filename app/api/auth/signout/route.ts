import { signOut } from "@workos-inc/authkit-nextjs";

export async function GET() {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
	return signOut({ returnTo: baseUrl });
}
