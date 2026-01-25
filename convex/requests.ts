import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get pending requests for a user
export const getPendingRequests = query({
  args: { receiverId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("requests")
      .withIndex("by_receiver", (q) => q.eq("receiverId", args.receiverId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .order("desc")
      .collect();
  },
});

// Get all requests sent by a user
export const getSentRequests = query({
  args: { senderId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("requests")
      .withIndex("by_sender", (q) => q.eq("senderId", args.senderId))
      .order("desc")
      .collect();
  },
});

// Get accepted requests (for chat creation)
export const getAcceptedRequests = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Get requests where user is sender or receiver and status is accepted
    const asSender = await ctx.db
      .query("requests")
      .withIndex("by_sender", (q) => q.eq("senderId", args.userId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    const asReceiver = await ctx.db
      .query("requests")
      .withIndex("by_receiver", (q) => q.eq("receiverId", args.userId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    return [...asSender, ...asReceiver].sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Create a connection request
export const createRequest = mutation({
  args: {
    senderId: v.string(),
    senderName: v.string(),
    receiverId: v.string(),
    eventId: v.optional(v.id("events")),
    activitySearchId: v.optional(v.id("activitySearches")),
    activity: v.string(),
    intent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if a pending request already exists
    const existingRequest = await ctx.db
      .query("requests")
      .withIndex("by_sender", (q) => q.eq("senderId", args.senderId))
      .filter((q) => 
        q.and(
          q.eq(q.field("receiverId"), args.receiverId),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    if (existingRequest) {
      return { success: false, message: "Request already pending" };
    }

    const requestId = await ctx.db.insert("requests", {
      senderId: args.senderId,
      senderName: args.senderName,
      receiverId: args.receiverId,
      eventId: args.eventId,
      activitySearchId: args.activitySearchId,
      activity: args.activity,
      intent: args.intent,
      status: "pending",
      createdAt: Date.now(),
    });

    return { success: true, requestId };
  },
});

// Accept a request and create a chat
export const acceptRequest = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return { success: false, message: "Request not found" };
    }

    if (request.status !== "pending") {
      return { success: false, message: "Request is not pending" };
    }

    // Get receiver's name for system messages
    const receiver = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosId", request.receiverId))
      .first();
    const receiverName = receiver?.firstName || "Someone";

    // Check if a direct chat already exists between these users
    const allChats = await ctx.db.query("chats").collect();
    let chatId;
    
    const existingChat = allChats.find((chat) => {
      if (chat.type !== "direct" || !chat.participantIds) return false;
      const participants = [request.senderId, request.receiverId];
      return (
        chat.participantIds.length === 2 &&
        participants.every((id) => chat.participantIds?.includes(id))
      );
    });

    if (existingChat) {
      chatId = existingChat._id;
    } else {
      // Create a new direct chat
      chatId = await ctx.db.insert("chats", {
        type: "direct",
        participantIds: [request.senderId, request.receiverId],
        createdAt: Date.now(),
      });

      // Send a system message to introduce the chat
      const activityLabel = request.intent || request.activity;
      await ctx.db.insert("messages", {
        chatId: chatId,
        senderId: "system",
        senderName: "System",
        content: `Connection accepted for "${activityLabel}". Say hi!`,
        type: "system",
        createdAt: Date.now(),
      });

      // Update chat's last message
      await ctx.db.patch(chatId, {
        lastMessagePreview: `Connection accepted for "${activityLabel}"`,
        lastMessageAt: Date.now(),
      });
    }

    // Update request status and link chat
    await ctx.db.patch(args.requestId, {
      status: "accepted",
      chatId: chatId,
    });

    // If this request is linked to an activity search, increment peopleJoined and add to group chat
    if (request.activitySearchId) {
      const activitySearch = await ctx.db.get(request.activitySearchId);
      if (activitySearch && activitySearch.isActive) {
        const currentJoined = activitySearch.peopleJoined || 0;
        const newJoined = currentJoined + 1;
        const peopleNeeded = activitySearch.peopleNeeded || 1;

        // Update peopleJoined
        await ctx.db.patch(request.activitySearchId, {
          peopleJoined: newJoined,
        });

        // If this activity has a group chat (peopleNeeded > 2), add the accepted user to it
        if (peopleNeeded > 2) {
          const activityChat = await ctx.db
            .query("chats")
            .withIndex("by_activity_search", (q) => q.eq("activitySearchId", request.activitySearchId))
            .first();

          if (activityChat) {
            // Check if already a member
            const existingMember = await ctx.db
              .query("chatMembers")
              .withIndex("by_chat_and_user", (q) => 
                q.eq("chatId", activityChat._id).eq("userId", request.receiverId)
              )
              .first();

            if (!existingMember) {
              // Add to chat members
              await ctx.db.insert("chatMembers", {
                chatId: activityChat._id,
                userId: request.receiverId,
                role: "member",
                joinedAt: Date.now(),
              });

              // Update participantIds array
              const updatedParticipants = [...(activityChat.participantIds || []), request.receiverId];
              await ctx.db.patch(activityChat._id, {
                participantIds: updatedParticipants,
              });

              // Send system message
              await ctx.db.insert("messages", {
                chatId: activityChat._id,
                senderId: "system",
                senderName: "System",
                content: `${receiverName} joined the group!`,
                type: "system",
                createdAt: Date.now(),
              });

              await ctx.db.patch(activityChat._id, {
                lastMessagePreview: `${receiverName} joined the group!`,
                lastMessageAt: Date.now(),
              });
            }
          }
        }

        // Auto-close if capacity is reached
        if (newJoined >= peopleNeeded) {
          await ctx.db.patch(request.activitySearchId, {
            isActive: false,
          });
        }
      }
    }

    return { success: true, chatId };
  },
});

// Decline a request
export const declineRequest = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return { success: false, message: "Request not found" };
    }

    await ctx.db.patch(args.requestId, {
      status: "declined",
    });
    
    return { success: true };
  },
});
