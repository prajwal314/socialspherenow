import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    workosId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()), // External URL (from WorkOS)
    profileImageId: v.optional(v.id("_storage")), // Convex storage ID for uploaded images
    createdAt: v.number(),
    // Preference fields
    intents: v.optional(v.array(v.string())),
    activities: v.optional(v.array(v.string())),
    comfortPreference: v.optional(v.string()),
    availability: v.optional(v.array(v.string())),
    personalityType: v.optional(v.string()),
    hasCompletedPreferences: v.optional(v.boolean()),
  }).index("by_workos_id", ["workosId"]),

  events: defineTable({
    creatorId: v.string(), // workosId of creator
    creatorName: v.string(),
    activity: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")), // Convex storage ID for event image
    dateTime: v.number(), // timestamp
    peopleNeeded: v.optional(v.number()), // Total number of people needed (null = unlimited)
    isLive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_creator", ["creatorId"])
    .index("by_activity", ["activity"])
    .index("by_is_live", ["isLive"]),

  requests: defineTable({
    senderId: v.string(), // workosId of sender
    senderName: v.string(),
    receiverId: v.string(), // workosId of receiver
    eventId: v.optional(v.id("events")), // optional - may be from activity search
    activitySearchId: v.optional(v.id("activitySearches")), // optional - may be from activity search
    activity: v.string(),
    intent: v.optional(v.string()), // e.g., "Dinner partner", "Travel mate"
    status: v.string(), // "pending" | "accepted" | "declined"
    chatId: v.optional(v.id("chats")), // created when accepted
    createdAt: v.number(),
  })
    .index("by_receiver", ["receiverId"])
    .index("by_sender", ["senderId"])
    .index("by_status", ["status"]),

  communities: defineTable({
    name: v.string(),
    description: v.string(),
    imageId: v.optional(v.id("_storage")), // Convex storage ID for community image
    imageUrl: v.optional(v.string()), // Legacy external URL
    category: v.string(), // matches user interests (music, art, gaming, coding, etc.)
    customCategory: v.optional(v.string()), // User-typed custom category
    creatorId: v.string(), // workosId of creator
    memberCount: v.number(),
    isPublic: v.optional(v.boolean()), // Public communities are discoverable
    createdAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_creator", ["creatorId"]),

  communityMembers: defineTable({
    communityId: v.id("communities"),
    userId: v.string(), // workosId
    role: v.string(), // "admin" | "moderator" | "member"
    joinedAt: v.number(),
  })
    .index("by_community", ["communityId"])
    .index("by_user", ["userId"])
    .index("by_community_and_user", ["communityId", "userId"]),

  communityGroups: defineTable({
    communityId: v.id("communities"),
    name: v.string(),
    description: v.optional(v.string()),
    creatorId: v.string(), // workosId of admin who created the group
    memberCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_community", ["communityId"])
    .index("by_creator", ["creatorId"]),

  communityGroupMembers: defineTable({
    groupId: v.id("communityGroups"),
    userId: v.string(), // workosId
    joinedAt: v.number(),
  })
    .index("by_group", ["groupId"])
    .index("by_user", ["userId"]),

  activitySearches: defineTable({
    userId: v.string(), // workosId of searcher
    userName: v.string(),
    activityType: v.string(), // e.g., "roommate", "travel_mate", "date"
    preferences: v.any(), // Dynamic preferences based on activity type
    peopleNeeded: v.optional(v.number()), // Number of partners needed (null = 1)
    peopleJoined: v.optional(v.number()), // Number of accepted connections
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_activity_type", ["activityType"])
    .index("by_is_active", ["isActive"]),

  chats: defineTable({
    type: v.string(), // "direct" | "community" | "group" | "event" | "activity"
    // For direct chats
    participantIds: v.optional(v.array(v.string())), // workosIds for direct chat
    // For community/activity chats
    communityId: v.optional(v.id("communities")),
    groupId: v.optional(v.id("communityGroups")), // For group chats within community
    activitySearchId: v.optional(v.id("activitySearches")),
    eventId: v.optional(v.id("events")), // For event group chats
    // Admin and metadata
    adminId: v.optional(v.string()), // workosId of chat admin (event creator / activity searcher)
    name: v.optional(v.string()), // For group chats
    description: v.optional(v.string()), // Description for event/activity group chats
    lastMessageAt: v.optional(v.number()),
    lastMessagePreview: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_community", ["communityId"])
    .index("by_group", ["groupId"])
    .index("by_event", ["eventId"])
    .index("by_activity_search", ["activitySearchId"])
    .index("by_last_message", ["lastMessageAt"]),

  messages: defineTable({
    chatId: v.id("chats"),
    senderId: v.string(), // workosId
    senderName: v.string(),
    content: v.string(),
    type: v.string(), // "text" | "image" | "system"
    createdAt: v.number(),
    readBy: v.optional(v.array(v.string())), // workosIds who have read
  })
    .index("by_chat", ["chatId"])
    .index("by_chat_and_time", ["chatId", "createdAt"]),

  eventAttendees: defineTable({
    eventId: v.id("events"),
    userId: v.string(), // workosId
    userName: v.string(),
    status: v.string(), // "interested" | "going"
    joinedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"]),

  // Members of event/activity group chats
  chatMembers: defineTable({
    chatId: v.id("chats"),
    userId: v.string(), // workosId
    role: v.string(), // "admin" | "member"
    joinedAt: v.number(),
  })
    .index("by_chat", ["chatId"])
    .index("by_user", ["userId"])
    .index("by_chat_and_user", ["chatId", "userId"]),
});
