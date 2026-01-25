import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get user by WorkOS ID
export const getByWorkosId = query({
  args: { workosId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosId", args.workosId))
      .first();
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
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosId", args.workosId))
      .first();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        profileImageUrl: args.profileImageUrl,
      });
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      workosId: args.workosId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      profileImageUrl: args.profileImageUrl,
      createdAt: Date.now(),
    });
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

    const updates = {};
    if (args.intents !== undefined) updates.intents = args.intents;
    if (args.activities !== undefined) updates.activities = args.activities;
    if (args.comfortPreference !== undefined) updates.comfortPreference = args.comfortPreference;
    if (args.availability !== undefined) updates.availability = args.availability;
    if (args.personalityType !== undefined) updates.personalityType = args.personalityType;

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
      } catch (e) {
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
      } catch (e) {
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
          q.eq(q.field("status"), "accepted")
        )
      )
      .first();

    const connectionAsReceiver = await ctx.db
      .query("requests")
      .withIndex("by_receiver", (q) => q.eq("receiverId", args.currentUserId))
      .filter((q) => 
        q.and(
          q.eq(q.field("senderId"), args.targetUserId),
          q.eq(q.field("status"), "accepted")
        )
      )
      .first();

    const isConnected = !!(connectionAsSender || connectionAsReceiver);

    // Get profile image URL if using Convex storage
    let profileImageUrl = targetUser.profileImageUrl;
    if (targetUser.profileImageId) {
      profileImageUrl = await ctx.storage.getUrl(targetUser.profileImageId) || undefined;
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
