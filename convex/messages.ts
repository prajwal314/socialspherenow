import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get messages for a chat (with pagination support)
export const getChatMessages = query({
  args: { 
    chatId: v.id("chats"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .order("desc")
      .take(limit);

    // Return in chronological order (oldest first)
    return messages.reverse();
  },
});

// Get messages after a certain timestamp (for real-time updates)
export const getNewMessages = query({
  args: { 
    chatId: v.id("chats"),
    afterTimestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat_and_time", (q) => 
        q.eq("chatId", args.chatId).gt("createdAt", args.afterTimestamp)
      )
      .order("asc")
      .collect();

    return messages;
  },
});

// Send a message
export const sendMessage = mutation({
  args: {
    chatId: v.id("chats"),
    senderId: v.string(),
    senderName: v.string(),
    content: v.string(),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const messageType = args.type || "text";

    // Insert message
    const messageId = await ctx.db.insert("messages", {
      chatId: args.chatId,
      senderId: args.senderId,
      senderName: args.senderName,
      content: args.content,
      type: messageType,
      createdAt: now,
      readBy: [args.senderId], // Sender has read their own message
    });

    // Update chat's last message info
    const preview = args.content.length > 50 
      ? args.content.substring(0, 50) + "..." 
      : args.content;

    await ctx.db.patch(args.chatId, {
      lastMessagePreview: preview,
      lastMessageAt: now,
    });

    return { success: true, messageId };
  },
});

// Send a system message (e.g., "User joined the chat")
export const sendSystemMessage = mutation({
  args: {
    chatId: v.id("chats"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.insert("messages", {
      chatId: args.chatId,
      senderId: "system",
      senderName: "System",
      content: args.content,
      type: "system",
      createdAt: now,
    });

    await ctx.db.patch(args.chatId, {
      lastMessagePreview: args.content,
      lastMessageAt: now,
    });

    return { success: true };
  },
});

// Mark messages as read
export const markMessagesAsRead = mutation({
  args: {
    chatId: v.id("chats"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get unread messages for this user in this chat
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .collect();

    // Update each message's readBy array
    for (const message of messages) {
      if (!message.readBy?.includes(args.userId)) {
        await ctx.db.patch(message._id, {
          readBy: [...(message.readBy || []), args.userId],
        });
      }
    }

    return { success: true };
  },
});

// Get unread message count for a user across all chats
export const getUnreadCount = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Get all chats for user
    const allChats = await ctx.db.query("chats").collect();
    
    const userChats = allChats.filter(
      (chat) =>
        chat.type === "direct" && chat.participantIds?.includes(args.userId)
    );

    let unreadCount = 0;

    for (const chat of userChats) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_chat", (q) => q.eq("chatId", chat._id))
        .collect();

      unreadCount += messages.filter(
        (msg) => msg.senderId !== args.userId && !msg.readBy?.includes(args.userId)
      ).length;
    }

    return unreadCount;
  },
});

// Get unread count for a specific chat
export const getChatUnreadCount = query({
  args: { chatId: v.id("chats"), userId: v.string() },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .collect();

    return messages.filter(
      (msg) => msg.senderId !== args.userId && !msg.readBy?.includes(args.userId)
    ).length;
  },
});
