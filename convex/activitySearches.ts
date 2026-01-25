import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Create an activity search (for partner matching)
export const createActivitySearch = mutation({
  args: {
    userId: v.string(),
    userName: v.string(),
    activityType: v.string(),
    preferences: v.any(), // Dynamic preferences based on activity type
    peopleNeeded: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Deactivate any existing active searches for same activity type
    const existingSearches = await ctx.db
      .query("activitySearches")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.eq(q.field("activityType"), args.activityType),
          q.eq(q.field("isActive"), true)
        )
      )
      .collect();

    for (const search of existingSearches) {
      await ctx.db.patch(search._id, { isActive: false });
    }

    // Create new search
    const searchId = await ctx.db.insert("activitySearches", {
      userId: args.userId,
      userName: args.userName,
      activityType: args.activityType,
      preferences: args.preferences,
      peopleNeeded: args.peopleNeeded || 1,
      peopleJoined: 0,
      isActive: true,
      createdAt: Date.now(),
    });

    return { success: true, searchId };
  },
});

// Get user's active activity searches
export const getUserActiveSearches = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("activitySearches")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("desc")
      .collect();
  },
});

// Get all active searches for a specific activity type (for matching)
export const getActiveSearchesByType = query({
  args: { activityType: v.string(), excludeUserId: v.string() },
  handler: async (ctx, args) => {
    const searches = await ctx.db
      .query("activitySearches")
      .withIndex("by_activity_type", (q) => q.eq("activityType", args.activityType))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return searches.filter((s) => s.userId !== args.excludeUserId);
  },
});

// Find matching users based on preferences
export const findMatchingUsers = query({
  args: { 
    activityType: v.string(), 
    userId: v.string(),
    preferences: v.any(), // Dynamic preferences based on activity type
  },
  handler: async (ctx, args) => {
    // Get all users who have matching activity in their preferences
    const allUsers = await ctx.db.query("users").collect();
    
    // Filter users who:
    // 1. Are not the current user
    // 2. Have the activity type in their activities
    // 3. Have overlapping availability (if specified)
    const matchingUsers = allUsers.filter((user) => {
      if (user.workosId === args.userId) return false;
      if (!user.activities?.includes(args.activityType)) return false;
      
      // Check availability overlap if both have it
      if (args.preferences.availability && user.availability) {
        const hasOverlap = args.preferences.availability.some(
          (time) => user.availability?.includes(time)
        );
        if (!hasOverlap) return false;
      }
      
      return true;
    });

    return matchingUsers.map((user) => ({
      id: user.workosId,
      name: user.firstName || "Anonymous",
      comfortPreference: user.comfortPreference,
      personalityType: user.personalityType,
    }));
  },
});

// Create activity search AND auto-match with other users
export const createActivitySearchAndMatch = mutation({
  args: {
    userId: v.string(),
    userName: v.string(),
    activityType: v.string(),
    preferences: v.any(), // Dynamic preferences based on activity type
    peopleNeeded: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 1. Deactivate existing searches for same activity type
    const existingSearches = await ctx.db
      .query("activitySearches")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("activityType"), args.activityType),
          q.eq(q.field("isActive"), true)
        )
      )
      .collect();

    for (const search of existingSearches) {
      await ctx.db.patch(search._id, { isActive: false });
    }

    // 2. Create new search
    const searchId = await ctx.db.insert("activitySearches", {
      userId: args.userId,
      userName: args.userName,
      activityType: args.activityType,
      preferences: args.preferences,
      peopleNeeded: args.peopleNeeded || 1,
      peopleJoined: 0,
      isActive: true,
      createdAt: Date.now(),
    });

    // 2b. If peopleNeeded > 2, create a group chat for this activity search
    if (args.peopleNeeded && args.peopleNeeded > 2) {
      // Format activity type for display
      const activityLabel = args.activityType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      const chatId = await ctx.db.insert("chats", {
        type: "activity",
        activitySearchId: searchId,
        adminId: args.userId,
        name: `${activityLabel} Group`,
        description: `Looking for ${args.peopleNeeded} people for ${activityLabel}`,
        participantIds: [args.userId], // Creator is first participant
        createdAt: Date.now(),
      });

      // Add creator as admin member
      await ctx.db.insert("chatMembers", {
        chatId: chatId,
        userId: args.userId,
        role: "admin",
        joinedAt: Date.now(),
      });

      // Send welcome system message
      await ctx.db.insert("messages", {
        chatId: chatId,
        senderId: "system",
        senderName: "System",
        content: `Welcome! This is the group chat for finding ${activityLabel} partners. Everyone who joins will be added here.`,
        type: "system",
        createdAt: Date.now(),
      });

      // Update chat last message
      await ctx.db.patch(chatId, {
        lastMessagePreview: `Welcome! Looking for ${activityLabel} partners.`,
        lastMessageAt: Date.now(),
      });
    }

    // 3. Find other active searches for same activity type
    const matchingSearches = await ctx.db
      .query("activitySearches")
      .withIndex("by_activity_type", (q) => q.eq("activityType", args.activityType))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Filter out current user and check for compatibility
    // For activity-specific matching, we check if preferences have any overlap
    const compatibleMatches = matchingSearches.filter((search) => {
      // Exclude self
      if (search.userId === args.userId) return false;

      // Basic compatibility: same activity type means potential match
      // More sophisticated matching can be added based on specific preference fields
      return true;
    });

    // 4. Create connection requests for each match (limit to 5 to avoid spam)
    const matchLimit = 5;
    const matchesToProcess = compatibleMatches.slice(0, matchLimit);
    let requestsCreated = 0;

    for (const match of matchesToProcess) {
      // Check if request already exists between these users (either direction)
      const existingRequestAsSender = await ctx.db
        .query("requests")
        .withIndex("by_sender", (q) => q.eq("senderId", args.userId))
        .filter((q) =>
          q.and(
            q.eq(q.field("receiverId"), match.userId),
            q.eq(q.field("status"), "pending")
          )
        )
        .first();

      const existingRequestAsReceiver = await ctx.db
        .query("requests")
        .withIndex("by_receiver", (q) => q.eq("receiverId", args.userId))
        .filter((q) =>
          q.and(
            q.eq(q.field("senderId"), match.userId),
            q.eq(q.field("status"), "pending")
          )
        )
        .first();

      if (!existingRequestAsSender && !existingRequestAsReceiver) {
        // Create a new request
        await ctx.db.insert("requests", {
          senderId: args.userId,
          senderName: args.userName,
          receiverId: match.userId,
          activitySearchId: searchId,
          activity: args.activityType,
          intent: args.activityType, // Use activity type as intent
          status: "pending",
          createdAt: Date.now(),
        });
        requestsCreated++;
      }
    }

    return {
      success: true,
      searchId,
      matchesFound: compatibleMatches.length,
      requestsSent: requestsCreated,
    };
  },
});

// Deactivate an activity search
export const deactivateSearch = mutation({
  args: { searchId: v.id("activitySearches") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.searchId, { isActive: false });
    return { success: true };
  },
});

// Get a single activity search by ID
export const getSearchById = query({
  args: { searchId: v.id("activitySearches") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.searchId);
  },
});

// Get all active searches excluding current user (for Home page discovery)
export const getAllActiveSearches = query({
  args: { excludeUserId: v.string() },
  handler: async (ctx, args) => {
    const allActive = await ctx.db
      .query("activitySearches")
      .withIndex("by_is_active", (q) => q.eq("isActive", true))
      .order("desc")
      .collect();

    // Exclude current user's searches and get user details
    const searchesWithUser = await Promise.all(
      allActive
        .filter((search) => search.userId !== args.excludeUserId)
        .map(async (search) => {
          const user = await ctx.db
            .query("users")
            .withIndex("by_workos_id", (q) => q.eq("workosId", search.userId))
            .first();

          const peopleNeeded = search.peopleNeeded || 1;
          const peopleJoined = search.peopleJoined || 0;
          const spotsLeft = peopleNeeded - peopleJoined;

          return {
            ...search,
            peopleNeeded,
            peopleJoined,
            spotsLeft,
            userDetails: user
              ? {
                  firstName: user.firstName || "Anonymous",
                  profileImageUrl: user.profileImageUrl,
                  personalityType: user.personalityType,
                }
              : null,
          };
        })
    );

    return searchesWithUser;
  },
});
