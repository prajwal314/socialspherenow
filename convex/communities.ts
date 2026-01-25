import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Community categories with icons
export const COMMUNITY_CATEGORIES = [
  { id: "music", label: "Music", icon: "🎵" },
  { id: "art", label: "Art & Design", icon: "🎨" },
  { id: "gaming", label: "Gaming", icon: "🎮" },
  { id: "coding", label: "Coding & Tech", icon: "💻" },
  { id: "photography", label: "Photography", icon: "📷" },
  { id: "fitness", label: "Fitness & Health", icon: "💪" },
  { id: "travel", label: "Travel", icon: "✈️" },
  { id: "food", label: "Food & Cooking", icon: "🍳" },
  { id: "books", label: "Books & Reading", icon: "📚" },
  { id: "movies", label: "Movies & TV", icon: "🎬" },
  { id: "sports", label: "Sports", icon: "⚽" },
  { id: "business", label: "Business & Startups", icon: "🚀" },
  { id: "language", label: "Language Learning", icon: "🗣️" },
  { id: "pets", label: "Pets & Animals", icon: "🐾" },
  { id: "crafts", label: "DIY & Crafts", icon: "🛠️" },
  { id: "science", label: "Science", icon: "🔬" },
  { id: "fashion", label: "Fashion & Style", icon: "👗" },
  { id: "anime", label: "Anime & Manga", icon: "🎌" },
  { id: "other", label: "Other", icon: "✨" },
];

// Get all communities with resolved image URLs
export const getAllCommunities = query({
  args: {},
  handler: async (ctx) => {
    const communities = await ctx.db.query("communities").order("desc").collect();
    
    // Resolve storage URLs for images
    const communitiesWithUrls = await Promise.all(
      communities.map(async (community) => {
        let resolvedImageUrl = community.imageUrl;
        if (community.imageId) {
          resolvedImageUrl = await ctx.storage.getUrl(community.imageId) ?? undefined;
        }
        return { ...community, imageUrl: resolvedImageUrl };
      })
    );
    
    return communitiesWithUrls;
  },
});

// Get communities by category (for personalized suggestions)
export const getCommunitiesByCategories = query({
  args: { categories: v.array(v.string()), excludeUserId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const allCommunities = await ctx.db.query("communities").order("desc").collect();
    
    // Filter by matching categories, exclude user's own communities, and sort by member count
    const filtered = allCommunities
      .filter((community) => {
        const matchesCategory = args.categories.includes(community.category);
        const notOwnCommunity = args.excludeUserId ? community.creatorId !== args.excludeUserId : true;
        return matchesCategory && notOwnCommunity;
      })
      .sort((a, b) => b.memberCount - a.memberCount);
    
    // Resolve storage URLs for images
    const communitiesWithUrls = await Promise.all(
      filtered.map(async (community) => {
        let resolvedImageUrl = community.imageUrl;
        if (community.imageId) {
          resolvedImageUrl = await ctx.storage.getUrl(community.imageId) ?? undefined;
        }
        return { ...community, imageUrl: resolvedImageUrl };
      })
    );
    
    return communitiesWithUrls;
  },
});

// Get all communities created by other users (excluding current user)
export const getCommunitiesByOthers = query({
  args: { excludeUserId: v.string() },
  handler: async (ctx, args) => {
    const allCommunities = await ctx.db.query("communities").order("desc").collect();
    
    // Filter out user's own communities and sort by member count
    const filtered = allCommunities
      .filter((community) => community.creatorId !== args.excludeUserId)
      .sort((a, b) => b.memberCount - a.memberCount);
    
    // Resolve storage URLs for images
    const communitiesWithUrls = await Promise.all(
      filtered.map(async (community) => {
        let resolvedImageUrl = community.imageUrl;
        if (community.imageId) {
          resolvedImageUrl = await ctx.storage.getUrl(community.imageId) ?? undefined;
        }
        return { ...community, imageUrl: resolvedImageUrl };
      })
    );
    
    return communitiesWithUrls;
  },
});

// Get communities user has joined with role info
export const getUserCommunities = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("communityMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const communities = await Promise.all(
      memberships.map(async (membership) => {
        const community = await ctx.db.get(membership.communityId);
        if (!community) return null;
        
        // Resolve image URL
        let resolvedImageUrl = community.imageUrl;
        if (community.imageId) {
          resolvedImageUrl = await ctx.storage.getUrl(community.imageId) ?? undefined;
        }
        
        return {
          ...community,
          imageUrl: resolvedImageUrl,
          role: membership.role,
          joinedAt: membership.joinedAt,
        };
      })
    );

    return communities.filter(Boolean);
  },
});

// Get user's joined community IDs for quick lookup
export const getUserCommunityIds = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("communityMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return memberships.map((m) => m.communityId);
  },
});

// Get count of communities created by user (for 3-limit check)
export const getUserCreatedCommunitiesCount = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const communities = await ctx.db
      .query("communities")
      .withIndex("by_creator", (q) => q.eq("creatorId", args.userId))
      .collect();

    return communities.length;
  },
});

// Get community details with groups and admins
export const getCommunityDetails = query({
  args: { communityId: v.id("communities") },
  handler: async (ctx, args) => {
    const community = await ctx.db.get(args.communityId);
    if (!community) return null;

    // Resolve image URL
    let resolvedImageUrl = community.imageUrl;
    if (community.imageId) {
      resolvedImageUrl = await ctx.storage.getUrl(community.imageId) ?? undefined;
    }

    // Get all members
    const members = await ctx.db
      .query("communityMembers")
      .withIndex("by_community", (q) => q.eq("communityId", args.communityId))
      .collect();

    // Get admins
    const admins = members.filter((m) => m.role === "admin");

    // Get groups
    const groups = await ctx.db
      .query("communityGroups")
      .withIndex("by_community", (q) => q.eq("communityId", args.communityId))
      .collect();

    return {
      ...community,
      imageUrl: resolvedImageUrl,
      admins,
      groups,
      totalMembers: members.length,
    };
  },
});

// Check if user is a member of a community
export const isUserMember = query({
  args: { userId: v.string(), communityId: v.id("communities") },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("communityMembers")
      .withIndex("by_community_and_user", (q) => 
        q.eq("communityId", args.communityId).eq("userId", args.userId)
      )
      .first();

    return !!membership;
  },
});

// Get user's role in a community
export const getUserRole = query({
  args: { userId: v.string(), communityId: v.id("communities") },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("communityMembers")
      .withIndex("by_community_and_user", (q) => 
        q.eq("communityId", args.communityId).eq("userId", args.userId)
      )
      .first();

    return membership?.role ?? null;
  },
});

// Create a community (user-created with 3-limit)
export const createCommunity = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    imageId: v.optional(v.id("_storage")),
    category: v.string(),
    customCategory: v.optional(v.string()),
    creatorId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check 3-community limit
    const existingCommunities = await ctx.db
      .query("communities")
      .withIndex("by_creator", (q) => q.eq("creatorId", args.creatorId))
      .collect();

    if (existingCommunities.length >= 3) {
      throw new Error("You can only create up to 3 communities");
    }

    // Create the community
    const communityId = await ctx.db.insert("communities", {
      name: args.name,
      description: args.description,
      imageId: args.imageId,
      category: args.category,
      customCategory: args.customCategory,
      creatorId: args.creatorId,
      memberCount: 1, // Creator is first member
      isPublic: true,
      createdAt: Date.now(),
    });

    // Add creator as admin member
    await ctx.db.insert("communityMembers", {
      communityId,
      userId: args.creatorId,
      role: "admin",
      joinedAt: Date.now(),
    });

    // Create community chat
    await ctx.db.insert("chats", {
      type: "community",
      communityId,
      name: args.name,
      createdAt: Date.now(),
    });

    return communityId;
  },
});

// Join a community as member
export const joinCommunity = mutation({
  args: { userId: v.string(), communityId: v.id("communities") },
  handler: async (ctx, args) => {
    // Check if already a member
    const existingMembership = await ctx.db
      .query("communityMembers")
      .withIndex("by_community_and_user", (q) => 
        q.eq("communityId", args.communityId).eq("userId", args.userId)
      )
      .first();

    if (existingMembership) {
      return { success: false, message: "Already a member" };
    }

    // Add membership with "member" role
    await ctx.db.insert("communityMembers", {
      communityId: args.communityId,
      userId: args.userId,
      role: "member",
      joinedAt: Date.now(),
    });

    // Increment member count
    const community = await ctx.db.get(args.communityId);
    if (community) {
      await ctx.db.patch(args.communityId, {
        memberCount: community.memberCount + 1,
      });
    }

    return { success: true };
  },
});

// Leave a community
export const leaveCommunity = mutation({
  args: { userId: v.string(), communityId: v.id("communities") },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("communityMembers")
      .withIndex("by_community_and_user", (q) => 
        q.eq("communityId", args.communityId).eq("userId", args.userId)
      )
      .first();

    if (!membership) {
      return { success: false, message: "Not a member" };
    }

    // Check if user is the only admin
    if (membership.role === "admin") {
      const allAdmins = await ctx.db
        .query("communityMembers")
        .withIndex("by_community", (q) => q.eq("communityId", args.communityId))
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect();

      if (allAdmins.length <= 1) {
        return { 
          success: false, 
          message: "You are the only admin. Please make someone else an admin before leaving." 
        };
      }
    }

    // Remove from all groups in this community first
    const groups = await ctx.db
      .query("communityGroups")
      .withIndex("by_community", (q) => q.eq("communityId", args.communityId))
      .collect();

    for (const group of groups) {
      const groupMembership = await ctx.db
        .query("communityGroupMembers")
        .withIndex("by_group", (q) => q.eq("groupId", group._id))
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .first();

      if (groupMembership) {
        await ctx.db.delete(groupMembership._id);
        await ctx.db.patch(group._id, {
          memberCount: Math.max(0, group.memberCount - 1),
        });
      }
    }

    // Remove membership
    await ctx.db.delete(membership._id);

    // Decrement member count
    const community = await ctx.db.get(args.communityId);
    if (community && community.memberCount > 0) {
      await ctx.db.patch(args.communityId, {
        memberCount: community.memberCount - 1,
      });
    }

    return { success: true };
  },
});

// Update community (admin only)
export const updateCommunity = mutation({
  args: {
    communityId: v.id("communities"),
    userId: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    // Check if user is admin
    const membership = await ctx.db
      .query("communityMembers")
      .withIndex("by_community_and_user", (q) => 
        q.eq("communityId", args.communityId).eq("userId", args.userId)
      )
      .first();

    if (!membership || membership.role !== "admin") {
      throw new Error("Only admins can update the community");
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.imageId !== undefined) updates.imageId = args.imageId;

    await ctx.db.patch(args.communityId, updates);

    // Update chat name if community name changed
    if (args.name) {
      const chat = await ctx.db
        .query("chats")
        .withIndex("by_community", (q) => q.eq("communityId", args.communityId))
        .first();
      
      if (chat) {
        await ctx.db.patch(chat._id, { name: args.name });
      }
    }

    return { success: true };
  },
});

// Make a member an admin
export const makeAdmin = mutation({
  args: {
    communityId: v.id("communities"),
    userId: v.string(), // Admin making the request
    targetUserId: v.string(), // User to make admin
  },
  handler: async (ctx, args) => {
    // Check if requester is admin
    const requesterMembership = await ctx.db
      .query("communityMembers")
      .withIndex("by_community_and_user", (q) => 
        q.eq("communityId", args.communityId).eq("userId", args.userId)
      )
      .first();

    if (!requesterMembership || requesterMembership.role !== "admin") {
      throw new Error("Only admins can make other members admin");
    }

    // Get target user's membership
    const targetMembership = await ctx.db
      .query("communityMembers")
      .withIndex("by_community_and_user", (q) => 
        q.eq("communityId", args.communityId).eq("userId", args.targetUserId)
      )
      .first();

    if (!targetMembership) {
      throw new Error("User is not a member of this community");
    }

    if (targetMembership.role === "admin") {
      return { success: false, message: "User is already an admin" };
    }

    await ctx.db.patch(targetMembership._id, { role: "admin" });

    return { success: true };
  },
});

// Remove admin role (demote to member)
export const removeAdmin = mutation({
  args: {
    communityId: v.id("communities"),
    userId: v.string(), // Admin making the request
    targetUserId: v.string(), // User to demote
  },
  handler: async (ctx, args) => {
    // Check if requester is admin
    const requesterMembership = await ctx.db
      .query("communityMembers")
      .withIndex("by_community_and_user", (q) => 
        q.eq("communityId", args.communityId).eq("userId", args.userId)
      )
      .first();

    if (!requesterMembership || requesterMembership.role !== "admin") {
      throw new Error("Only admins can remove admin role");
    }

    // Check if target is the creator (can't demote creator)
    const community = await ctx.db.get(args.communityId);
    if (community?.creatorId === args.targetUserId) {
      throw new Error("Cannot remove admin role from the community creator");
    }

    // Get target user's membership
    const targetMembership = await ctx.db
      .query("communityMembers")
      .withIndex("by_community_and_user", (q) => 
        q.eq("communityId", args.communityId).eq("userId", args.targetUserId)
      )
      .first();

    if (!targetMembership) {
      throw new Error("User is not a member of this community");
    }

    await ctx.db.patch(targetMembership._id, { role: "member" });

    return { success: true };
  },
});

// ============ GROUP FUNCTIONS ============

// Create a group within a community (admin only)
export const createGroup = mutation({
  args: {
    communityId: v.id("communities"),
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user is admin
    const membership = await ctx.db
      .query("communityMembers")
      .withIndex("by_community_and_user", (q) => 
        q.eq("communityId", args.communityId).eq("userId", args.userId)
      )
      .first();

    if (!membership || membership.role !== "admin") {
      throw new Error("Only admins can create groups");
    }

    // Create the group
    const groupId = await ctx.db.insert("communityGroups", {
      communityId: args.communityId,
      name: args.name,
      description: args.description,
      creatorId: args.userId,
      memberCount: 1, // Creator joins automatically
      createdAt: Date.now(),
    });

    // Add creator as member of the group
    await ctx.db.insert("communityGroupMembers", {
      groupId,
      userId: args.userId,
      joinedAt: Date.now(),
    });

    // Create group chat
    await ctx.db.insert("chats", {
      type: "group",
      communityId: args.communityId,
      groupId,
      name: args.name,
      createdAt: Date.now(),
    });

    return groupId;
  },
});

// Get groups in a community with user's membership info
export const getCommunityGroups = query({
  args: { communityId: v.id("communities"), userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const groups = await ctx.db
      .query("communityGroups")
      .withIndex("by_community", (q) => q.eq("communityId", args.communityId))
      .collect();

    if (!args.userId) {
      return groups.map((g) => ({ ...g, isMember: false }));
    }

    // Check membership for each group
    const groupsWithMembership = await Promise.all(
      groups.map(async (group) => {
        const membership = await ctx.db
          .query("communityGroupMembers")
          .withIndex("by_group", (q) => q.eq("groupId", group._id))
          .filter((q) => q.eq(q.field("userId"), args.userId))
          .first();

        return { ...group, isMember: !!membership };
      })
    );

    return groupsWithMembership;
  },
});

// Join a group (must be community member first)
export const joinGroup = mutation({
  args: {
    groupId: v.id("communityGroups"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    // Check if user is a community member
    const communityMembership = await ctx.db
      .query("communityMembers")
      .withIndex("by_community_and_user", (q) => 
        q.eq("communityId", group.communityId).eq("userId", args.userId)
      )
      .first();

    if (!communityMembership) {
      throw new Error("You must be a community member to join groups");
    }

    // Check if already a group member
    const existingMembership = await ctx.db
      .query("communityGroupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existingMembership) {
      return { success: false, message: "Already a member of this group" };
    }

    // Add to group
    await ctx.db.insert("communityGroupMembers", {
      groupId: args.groupId,
      userId: args.userId,
      joinedAt: Date.now(),
    });

    // Increment member count
    await ctx.db.patch(args.groupId, {
      memberCount: group.memberCount + 1,
    });

    return { success: true };
  },
});

// Leave a group
export const leaveGroup = mutation({
  args: {
    groupId: v.id("communityGroups"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("communityGroupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!membership) {
      return { success: false, message: "Not a member of this group" };
    }

    // Remove membership
    await ctx.db.delete(membership._id);

    // Decrement member count
    const group = await ctx.db.get(args.groupId);
    if (group && group.memberCount > 0) {
      await ctx.db.patch(args.groupId, {
        memberCount: group.memberCount - 1,
      });
    }

    return { success: true };
  },
});

// Delete a group (admin only)
export const deleteGroup = mutation({
  args: {
    groupId: v.id("communityGroups"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    // Check if user is admin
    const membership = await ctx.db
      .query("communityMembers")
      .withIndex("by_community_and_user", (q) => 
        q.eq("communityId", group.communityId).eq("userId", args.userId)
      )
      .first();

    if (!membership || membership.role !== "admin") {
      throw new Error("Only admins can delete groups");
    }

    // Delete all group members
    const groupMembers = await ctx.db
      .query("communityGroupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    for (const member of groupMembers) {
      await ctx.db.delete(member._id);
    }

    // Delete group chat and its messages
    const chat = await ctx.db
      .query("chats")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .first();

    if (chat) {
      // Delete all messages in the chat
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_chat", (q) => q.eq("chatId", chat._id))
        .collect();

      for (const message of messages) {
        await ctx.db.delete(message._id);
      }

      await ctx.db.delete(chat._id);
    }

    // Delete the group
    await ctx.db.delete(args.groupId);

    return { success: true };
  },
});

// Get community members (for admin panel)
export const getCommunityMembers = query({
  args: { communityId: v.id("communities") },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("communityMembers")
      .withIndex("by_community", (q) => q.eq("communityId", args.communityId))
      .collect();

    // Get user details for each member
    const membersWithDetails = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_workos_id", (q) => q.eq("workosId", membership.userId))
          .first();

        let profileImageUrl = user?.profileImageUrl;
        if (user?.profileImageId) {
          profileImageUrl = await ctx.storage.getUrl(user.profileImageId) ?? profileImageUrl;
        }

        return {
          ...membership,
          userDetails: user ? {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            profileImageUrl,
          } : null,
        };
      })
    );

    return membersWithDetails;
  },
});
