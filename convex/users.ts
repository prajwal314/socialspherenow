import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Helper function to normalize email
const normalizeEmail = (email: string): string => {
	return email.toLowerCase().trim();
};

// Get user by WorkOS ID
export const getByWorkosId = query({
	args: { workosId: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_workos_id", (q) => q.eq("workosId", args.workosId))
			.first();

		if (!user) {
			console.log(`[users.getByWorkosId] User not found for workosId: ${args.workosId}`);
			return null;
		}

		// Get profile image URL if using Convex storage
		let profileImageUrl = user.profileImageUrl;
		if (user.profileImageId) {
			profileImageUrl =
				(await ctx.storage.getUrl(user.profileImageId)) || undefined;
		}

		return {
			...user,
			profileImageUrl,
		};
	},
});

// Get user by email (normalized)
export const getByEmail = query({
	args: { email: v.string() },
	handler: async (ctx, args) => {
		const normalizedEmail = normalizeEmail(args.email);
		const user = await ctx.db
			.query("users")
			.withIndex("by_email", (q) => q.eq("email", normalizedEmail))
			.first();

		if (!user) {
			return null;
		}

		// Get profile image URL if using Convex storage
		let profileImageUrl = user.profileImageUrl;
		if (user.profileImageId) {
			profileImageUrl =
				(await ctx.storage.getUrl(user.profileImageId)) || undefined;
		}

		return {
			...user,
			profileImageUrl,
		};
	},
});

// Create or update user after WorkOS authentication
export const upsertUser = mutation({
	args: {
		workosId: v.string(),
		email: v.string(),
		firstName: v.optional(v.string()),
		lastName: v.optional(v.string()),
		profileImageUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		console.log(`[users.upsertUser] Called with:`, {
			workosId: args.workosId,
			email: args.email,
			firstName: args.firstName,
			lastName: args.lastName,
			hasProfileImageUrl: !!args.profileImageUrl,
		});

		// Normalize email to prevent case sensitivity issues
		const normalizedEmail = normalizeEmail(args.email);

		// First, check if user exists by workosId
		const existingUserByWorkosId = await ctx.db
			.query("users")
			.withIndex("by_workos_id", (q) => q.eq("workosId", args.workosId))
			.first();

		if (existingUserByWorkosId) {
			// Update existing user
			await ctx.db.patch(existingUserByWorkosId._id, {
				email: normalizedEmail,
				firstName: args.firstName,
				lastName: args.lastName,
				// Only update profileImageUrl if it's provided and user doesn't have a custom upload
				...(args.profileImageUrl && !existingUserByWorkosId.profileImageId
					? { profileImageUrl: args.profileImageUrl }
					: {}),
			});
			console.log(`[users.upsertUser] Updated existing user: ${args.workosId}`);
			return existingUserByWorkosId._id;
		}

		// Check if a user with the same email already exists (potential duplicate)
		const existingUserByEmail = await ctx.db
			.query("users")
			.withIndex("by_email", (q) => q.eq("email", normalizedEmail))
			.first();

		if (existingUserByEmail) {
			// This is a rare case - same email, different workosId
			// Update the workosId to the new one (user might have re-registered)
			console.warn(
				`[users.upsertUser] User with email ${normalizedEmail} exists with different workosId. Updating workosId from ${existingUserByEmail.workosId} to ${args.workosId}`
			);
			await ctx.db.patch(existingUserByEmail._id, {
				workosId: args.workosId,
				firstName: args.firstName,
				lastName: args.lastName,
				...(args.profileImageUrl && !existingUserByEmail.profileImageId
					? { profileImageUrl: args.profileImageUrl }
					: {}),
			});
			return existingUserByEmail._id;
		}

		// Create new user
		const newUserId = await ctx.db.insert("users", {
			workosId: args.workosId,
			email: normalizedEmail,
			firstName: args.firstName,
			lastName: args.lastName,
			profileImageUrl: args.profileImageUrl,
			createdAt: Date.now(),
		});

		console.log(`[users.upsertUser] Created new user: ${args.workosId} with id: ${newUserId}`);
		return newUserId;
	},
});

// Save user preferences after onboarding
export const saveUserPreferences = mutation({
	args: {
		workosId: v.string(),
		intents: v.array(v.string()),
		activities: v.array(v.string()),
		comfortPreference: v.string(),
		availability: v.array(v.string()),
		personalityType: v.string(),
	},
	handler: async (ctx, args) => {
		const existingUser = await ctx.db
			.query("users")
			.withIndex("by_workos_id", (q) => q.eq("workosId", args.workosId))
			.first();

		if (!existingUser) {
			throw new Error("User not found");
		}

		await ctx.db.patch(existingUser._id, {
			intents: args.intents,
			activities: args.activities,
			comfortPreference: args.comfortPreference,
			availability: args.availability,
			personalityType: args.personalityType,
			hasCompletedPreferences: true,
		});

		return existingUser._id;
	},
});

// Update user profile (name only - email comes from WorkOS)
export const updateProfile = mutation({
	args: {
		workosId: v.string(),
		firstName: v.string(),
		lastName: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const existingUser = await ctx.db
			.query("users")
			.withIndex("by_workos_id", (q) => q.eq("workosId", args.workosId))
			.first();

		if (!existingUser) {
			throw new Error("User not found");
		}

		await ctx.db.patch(existingUser._id, {
			firstName: args.firstName,
			lastName: args.lastName,
		});

		return { success: true };
	},
});

// Update user preferences (partial update)
export const updatePreferences = mutation({
	args: {
		workosId: v.string(),
		intents: v.optional(v.array(v.string())),
		activities: v.optional(v.array(v.string())),
		comfortPreference: v.optional(v.string()),
		availability: v.optional(v.array(v.string())),
		personalityType: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const existingUser = await ctx.db
			.query("users")
			.withIndex("by_workos_id", (q) => q.eq("workosId", args.workosId))
			.first();

		if (!existingUser) {
			throw new Error("User not found");
		}

		const updates: {
			intents?: string[];
			activities?: string[];
			comfortPreference?: string;
			availability?: string[];
			personalityType?: string;
		} = {};
		if (args.intents !== undefined) updates.intents = args.intents;
		if (args.activities !== undefined) updates.activities = args.activities;
		if (args.comfortPreference !== undefined)
			updates.comfortPreference = args.comfortPreference;
		if (args.availability !== undefined)
			updates.availability = args.availability;
		if (args.personalityType !== undefined)
			updates.personalityType = args.personalityType;

		await ctx.db.patch(existingUser._id, updates);

		return { success: true };
	},
});

// Update user's profile image (using Convex storage)
export const updateProfileImage = mutation({
	args: {
		workosId: v.string(),
		profileImageId: v.id("_storage"),
	},
	handler: async (ctx, args) => {
		const existingUser = await ctx.db
			.query("users")
			.withIndex("by_workos_id", (q) => q.eq("workosId", args.workosId))
			.first();

		if (!existingUser) {
			throw new Error("User not found");
		}

		// If user had a previous uploaded image, delete it from storage
		if (existingUser.profileImageId) {
			try {
				await ctx.storage.delete(existingUser.profileImageId);
			} catch {
				// Ignore error if image already deleted
				console.log("Previous image already deleted or not found");
			}
		}

		await ctx.db.patch(existingUser._id, {
			profileImageId: args.profileImageId,
		});

		return { success: true };
	},
});

// Remove user's profile image
export const removeProfileImage = mutation({
	args: {
		workosId: v.string(),
	},
	handler: async (ctx, args) => {
		const existingUser = await ctx.db
			.query("users")
			.withIndex("by_workos_id", (q) => q.eq("workosId", args.workosId))
			.first();

		if (!existingUser) {
			throw new Error("User not found");
		}

		// Delete from storage if exists
		if (existingUser.profileImageId) {
			try {
				await ctx.storage.delete(existingUser.profileImageId);
			} catch {
				console.log("Image already deleted or not found");
			}
		}

		await ctx.db.patch(existingUser._id, {
			profileImageId: undefined,
		});

		return { success: true };
	},
});

// Get user profile for viewing (with connection check)
export const getUserProfile = query({
	args: {
		targetUserId: v.string(), // workosId of the user to view
		currentUserId: v.string(), // workosId of the current user
	},
	handler: async (ctx, args) => {
		// Get the target user
		const targetUser = await ctx.db
			.query("users")
			.withIndex("by_workos_id", (q) => q.eq("workosId", args.targetUserId))
			.first();

		if (!targetUser) {
			return null;
		}

		// Check if users are connected (have an accepted request between them)
		const connectionAsSender = await ctx.db
			.query("requests")
			.withIndex("by_sender", (q) => q.eq("senderId", args.currentUserId))
			.filter((q) =>
				q.and(
					q.eq(q.field("receiverId"), args.targetUserId),
					q.eq(q.field("status"), "accepted"),
				),
			)
			.first();

		const connectionAsReceiver = await ctx.db
			.query("requests")
			.withIndex("by_receiver", (q) => q.eq("receiverId", args.currentUserId))
			.filter((q) =>
				q.and(
					q.eq(q.field("senderId"), args.targetUserId),
					q.eq(q.field("status"), "accepted"),
				),
			)
			.first();

		const isConnected = !!(connectionAsSender || connectionAsReceiver);

		// Get profile image URL if using Convex storage
		let profileImageUrl = targetUser.profileImageUrl;
		if (targetUser.profileImageId) {
			profileImageUrl =
				(await ctx.storage.getUrl(targetUser.profileImageId)) || undefined;
		}

		// Get user stats
		const events = await ctx.db
			.query("events")
			.withIndex("by_creator", (q) => q.eq("creatorId", args.targetUserId))
			.collect();

		const memberships = await ctx.db
			.query("communityMembers")
			.withIndex("by_user", (q) => q.eq("userId", args.targetUserId))
			.collect();

		const sentAccepted = await ctx.db
			.query("requests")
			.withIndex("by_sender", (q) => q.eq("senderId", args.targetUserId))
			.filter((q) => q.eq(q.field("status"), "accepted"))
			.collect();

		const receivedAccepted = await ctx.db
			.query("requests")
			.withIndex("by_receiver", (q) => q.eq("receiverId", args.targetUserId))
			.filter((q) => q.eq(q.field("status"), "accepted"))
			.collect();

		// Return profile data - show more details if connected
		if (isConnected) {
			return {
				isConnected: true,
				workosId: targetUser.workosId,
				firstName: targetUser.firstName,
				lastName: targetUser.lastName,
				profileImageUrl,
				personalityType: targetUser.personalityType,
				intents: targetUser.intents,
				activities: targetUser.activities,
				availability: targetUser.availability,
				comfortPreference: targetUser.comfortPreference,
				stats: {
					eventsCreated: events.length,
					communitiesJoined: memberships.length,
					connections: sentAccepted.length + receivedAccepted.length,
				},
				memberSince: targetUser.createdAt,
			};
		}

		// Return limited info for non-connected users
		return {
			isConnected: false,
			workosId: targetUser.workosId,
			firstName: targetUser.firstName,
			profileImageUrl,
			personalityType: targetUser.personalityType,
			stats: {
				connections: sentAccepted.length + receivedAccepted.length,
			},
		};
	},
});

// Get user stats (for profile page)
export const getUserStats = query({
	args: { workosId: v.string() },
	handler: async (ctx, args) => {
		// Count events created
		const events = await ctx.db
			.query("events")
			.withIndex("by_creator", (q) => q.eq("creatorId", args.workosId))
			.collect();

		// Count communities joined
		const memberships = await ctx.db
			.query("communityMembers")
			.withIndex("by_user", (q) => q.eq("userId", args.workosId))
			.collect();

		// Count accepted connections
		const sentAccepted = await ctx.db
			.query("requests")
			.withIndex("by_sender", (q) => q.eq("senderId", args.workosId))
			.filter((q) => q.eq(q.field("status"), "accepted"))
			.collect();

		const receivedAccepted = await ctx.db
			.query("requests")
			.withIndex("by_receiver", (q) => q.eq("receiverId", args.workosId))
			.filter((q) => q.eq(q.field("status"), "accepted"))
			.collect();

		return {
			eventsCreated: events.length,
			communitiesJoined: memberships.length,
			connections: sentAccepted.length + receivedAccepted.length,
		};
	},
});

// ============================================================================
// DATA MIGRATION MUTATIONS
// Run these once to fix existing broken users in the database
// ============================================================================

// Migration: Normalize all existing user emails to lowercase
export const migrateNormalizeEmails = mutation({
	args: {},
	handler: async (ctx) => {
		const allUsers = await ctx.db.query("users").collect();
		let normalizedCount = 0;
		let duplicatesFound: string[] = [];

		// Track seen emails to detect duplicates
		const seenEmails = new Map<string, string>(); // email -> workosId

		for (const user of allUsers) {
			const normalizedEmail = normalizeEmail(user.email);

			// Check for duplicates
			if (seenEmails.has(normalizedEmail)) {
				duplicatesFound.push(
					`Duplicate: ${user.email} (workosId: ${user.workosId}) conflicts with ${seenEmails.get(normalizedEmail)}`
				);
				continue;
			}

			seenEmails.set(normalizedEmail, user.workosId);

			// Update email if it needs normalization
			if (user.email !== normalizedEmail) {
				await ctx.db.patch(user._id, { email: normalizedEmail });
				normalizedCount++;
				console.log(`Normalized email for user ${user.workosId}: ${user.email} -> ${normalizedEmail}`);
			}
		}

		return {
			success: true,
			totalUsers: allUsers.length,
			normalizedCount,
			duplicatesFound,
		};
	},
});

// Migration: Find users with missing required fields
export const migrateFindIncompleteUsers = query({
	args: {},
	handler: async (ctx) => {
		const allUsers = await ctx.db.query("users").collect();
		
		const incompleteUsers = allUsers.filter((user) => {
			const issues: string[] = [];
			
			if (!user.workosId) issues.push("missing workosId");
			if (!user.email) issues.push("missing email");
			if (!user.createdAt) issues.push("missing createdAt");
			
			return issues.length > 0;
		}).map((user) => ({
			_id: user._id,
			workosId: user.workosId,
			email: user.email,
			firstName: user.firstName,
			createdAt: user.createdAt,
		}));

		return {
			totalUsers: allUsers.length,
			incompleteCount: incompleteUsers.length,
			incompleteUsers,
		};
	},
});

// Migration: Fix users with missing createdAt
export const migrateFixMissingCreatedAt = mutation({
	args: {},
	handler: async (ctx) => {
		const allUsers = await ctx.db.query("users").collect();
		let fixedCount = 0;

		for (const user of allUsers) {
			if (!user.createdAt) {
				await ctx.db.patch(user._id, { createdAt: Date.now() });
				fixedCount++;
				console.log(`Fixed missing createdAt for user: ${user.workosId}`);
			}
		}

		return {
			success: true,
			totalUsers: allUsers.length,
			fixedCount,
		};
	},
});

// Migration: Find and remove duplicate users (keeps the most recent one)
export const migrateFindDuplicateUsers = query({
	args: {},
	handler: async (ctx) => {
		const allUsers = await ctx.db.query("users").collect();
		
		// Group by email (case-insensitive)
		const emailGroups = new Map<string, typeof allUsers>();
		
		for (const user of allUsers) {
			const normalizedEmail = normalizeEmail(user.email);
			if (!emailGroups.has(normalizedEmail)) {
				emailGroups.set(normalizedEmail, []);
			}
			emailGroups.get(normalizedEmail)!.push(user);
		}

		// Find groups with more than one user
		const duplicates = Array.from(emailGroups.entries())
			.filter(([_, users]) => users.length > 1)
			.map(([email, users]) => ({
				email,
				count: users.length,
				users: users.map((u) => ({
					_id: u._id,
					workosId: u.workosId,
					firstName: u.firstName,
					createdAt: u.createdAt,
					hasCompletedPreferences: u.hasCompletedPreferences,
				})),
			}));

		return {
			totalUsers: allUsers.length,
			duplicateGroups: duplicates.length,
			duplicates,
		};
	},
});

// Migration: Merge duplicate users (keeps the most complete profile)
export const migrateMergeDuplicateUsers = mutation({
	args: {
		dryRun: v.optional(v.boolean()), // If true, just logs what would happen
	},
	handler: async (ctx, args) => {
		const allUsers = await ctx.db.query("users").collect();
		const dryRun = args.dryRun ?? true;
		const mergeResults: Array<{
			email: string;
			kept: string;
			deleted: string[];
		}> = [];

		// Group by email (case-insensitive)
		const emailGroups = new Map<string, typeof allUsers>();
		
		for (const user of allUsers) {
			const normalizedEmail = normalizeEmail(user.email);
			if (!emailGroups.has(normalizedEmail)) {
				emailGroups.set(normalizedEmail, []);
			}
			emailGroups.get(normalizedEmail)!.push(user);
		}

		// Process duplicate groups
		for (const [email, users] of emailGroups.entries()) {
			if (users.length <= 1) continue;

			// Sort by: hasCompletedPreferences (true first), then by createdAt (oldest first for stability)
			const sorted = [...users].sort((a, b) => {
				// Prefer users with completed preferences
				if (a.hasCompletedPreferences && !b.hasCompletedPreferences) return -1;
				if (!a.hasCompletedPreferences && b.hasCompletedPreferences) return 1;
				// Then prefer older accounts (more established)
				return (a.createdAt || 0) - (b.createdAt || 0);
			});

			const keepUser = sorted[0];
			const deleteUsers = sorted.slice(1);

			if (!dryRun) {
				// Delete duplicate users
				for (const user of deleteUsers) {
					await ctx.db.delete(user._id);
					console.log(`Deleted duplicate user: ${user.workosId} (${user.email})`);
				}
			}

			mergeResults.push({
				email,
				kept: keepUser.workosId,
				deleted: deleteUsers.map((u) => u.workosId),
			});
		}

		return {
			success: true,
			dryRun,
			mergeResults,
			totalMerged: mergeResults.length,
		};
	},
});

// Debug: List all users in database
export const debugListAllUsers = query({
	args: {},
	handler: async (ctx) => {
		const allUsers = await ctx.db.query("users").collect();
		return allUsers.map((u) => ({
			_id: u._id,
			workosId: u.workosId,
			email: u.email,
			firstName: u.firstName,
			lastName: u.lastName,
			hasCompletedPreferences: u.hasCompletedPreferences,
			createdAt: u.createdAt,
			hasProfileImageId: !!u.profileImageId,
			hasProfileImageUrl: !!u.profileImageUrl,
		}));
	},
});

// Check database health - returns summary of any issues
export const checkDatabaseHealth = query({
	args: {},
	handler: async (ctx) => {
		const allUsers = await ctx.db.query("users").collect();
		
		const issues: string[] = [];
		
		// Check for email case inconsistencies
		const emailsNeedNormalization = allUsers.filter(
			(u) => u.email !== normalizeEmail(u.email)
		).length;
		if (emailsNeedNormalization > 0) {
			issues.push(`${emailsNeedNormalization} users need email normalization`);
		}

		// Check for missing createdAt
		const missingCreatedAt = allUsers.filter((u) => !u.createdAt).length;
		if (missingCreatedAt > 0) {
			issues.push(`${missingCreatedAt} users missing createdAt`);
		}

		// Check for duplicates
		const emailGroups = new Map<string, number>();
		for (const user of allUsers) {
			const normalized = normalizeEmail(user.email);
			emailGroups.set(normalized, (emailGroups.get(normalized) || 0) + 1);
		}
		const duplicateEmails = Array.from(emailGroups.entries()).filter(
			([_, count]) => count > 1
		);
		if (duplicateEmails.length > 0) {
			issues.push(`${duplicateEmails.length} duplicate email groups found`);
		}

		// Check for users without workosId
		const missingWorkosId = allUsers.filter((u) => !u.workosId).length;
		if (missingWorkosId > 0) {
			issues.push(`${missingWorkosId} users missing workosId`);
		}

		return {
			healthy: issues.length === 0,
			totalUsers: allUsers.length,
			issues,
			timestamp: new Date().toISOString(),
		};
	},
});
