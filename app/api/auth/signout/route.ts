import { signOut } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";

export async function GET() {
	await signOut();
	return NextResponse.redirect(
		new URL("/", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
	);
}
