import { ConvexHttpClient } from "convex/browser";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Server-side user sync - this bypasses the WebSocket auth issues
// by using the HTTP client with server-side auth validation
export async function POST() {
	try {
		const { user } = await withAuth();
		
		if (!user) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		console.log("[API /user/sync] Syncing user:", {
			workosId: user.id,
			email: user.email,
		});

		const normalizedEmail = (user.email ?? "").toLowerCase().trim();

		// Use Convex HTTP client for server-side mutation
		const result = await convex.mutation(api.users.upsertUser, {
			workosId: user.id,
			email: normalizedEmail,
			firstName: user.firstName ?? undefined,
			lastName: user.lastName ?? undefined,
			profileImageUrl: user.profilePictureUrl ?? undefined,
		});

		console.log("[API /user/sync] User synced successfully:", result);

		return NextResponse.json({
			success: true,
			userId: result,
		});
	} catch (error) {
		console.error("[API /user/sync] Failed to sync user:", error);
		
		return NextResponse.json(
			{ 
				error: "Failed to sync user",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

// Also support GET for easier debugging
export async function GET() {
	try {
		const { user } = await withAuth();
		
		if (!user) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		// Check if user exists in Convex
		const existingUser = await convex.query(api.users.getByWorkosId, {
			workosId: user.id,
		});

		return NextResponse.json({
			workosUser: {
				id: user.id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
			},
			convexUser: existingUser,
			synced: !!existingUser,
		});
	} catch (error) {
		console.error("[API /user/sync] Failed to check user:", error);
		
		return NextResponse.json(
			{ 
				error: "Failed to check user",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
