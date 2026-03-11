import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all chats for a user (direct + community + activity)
export const getUserChats = query({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		// Get direct chats where user is a participant
		const allChats = await ctx.db.query("chats").order("desc").collect();

		const directChats = allChats.filter(
			(chat) =>
				chat.type === "direct" && chat.participantIds?.includes(args.userId),
		);

		// Get community chats for communities user has joined
		const userMemberships = await ctx.db
			.query("communityMembers")
			.withIndex("by_user", (q) => q.eq("userId", args.userId))
			.collect();

		const communityIds = userMemberships.map((m) => m.communityId);
		const communityChats = allChats.filter(
			(chat) =>
				chat.type === "community" &&
				chat.communityId &&
				communityIds.includes(chat.communityId),
		);

		// Combine and sort by last message
		const allUserChats = [...directChats, ...communityChats].sort((a, b) => {
			const aTime = a.lastMessageAt || a.createdAt;
			const bTime = b.lastMessageAt || b.createdAt;
			return bTime - aTime;
		});

		return allUserChats;
	},
});

// Get a single chat by ID
export const getChatById = query({
	args: { chatId: v.id("chats") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.chatId);
	},
});

// Get chat with other user details (for direct chats)
export const getChatWithDetails = query({
	args: { chatId: v.id("chats"), currentUserId: v.string() },
	handler: async (ctx, args) => {
		const chat = await ctx.db.get(args.chatId);
		if (!chat) return null;

		if (chat.type === "direct" && chat.participantIds) {
			// Get other participant's info
			const otherUserId = chat.participantIds.find(
				(id) => id !== args.currentUserId,
			);
			if (otherUserId) {
				const otherUser = await ctx.db
					.query("users")
					.withIndex("by_workos_id", (q) => q.eq("workosId", otherUserId))
					.first();

				// Get profile image URL (from storage if available)
				let profileImageUrl = otherUser?.profileImageUrl;
				if (otherUser?.profileImageId) {
					profileImageUrl =
						(await ctx.storage.getUrl(otherUser.profileImageId)) || undefined;
				}

				return {
					...chat,
					otherUser: otherUser
						? {
								id: otherUser.workosId,
								name: otherUser.firstName || "Anonymous",
								profileImageUrl,
							}
						: null,
				};
			}
		}

		if (chat.type === "community" && chat.communityId) {
			const community = await ctx.db.get(chat.communityId);
			return {
				...chat,
				community: community
					? {
							id: community._id,
							name: community.name,
							imageUrl: community.imageUrl,
							memberCount: community.memberCount,
						}
					: null,
			};
		}

		// Handle event group chats
		if (chat.type === "event" && chat.eventId) {
			const event = await ctx.db.get(chat.eventId);

			// Get member count
			const chatMembersList = await ctx.db
				.query("chatMembers")
				.withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
				.collect();
			const memberCount = chatMembersList.length;

			// Check if current user is admin
			const userMembership = chatMembersList.find(
				(m) => m.userId === args.currentUserId,
			);
			const isAdmin =
				userMembership?.role === "admin" || chat.adminId === args.currentUserId;

			// Get event image URL
			let eventImageUrl: string | undefined;
			if (event?.imageId) {
				eventImageUrl = (await ctx.storage.getUrl(event.imageId)) ?? undefined;
			}

			return {
				...chat,
				eventDetails: event
					? {
							id: event._id,
							title: event.title,
							activity: event.activity,
							description: event.description,
							dateTime: event.dateTime,
							imageUrl: eventImageUrl,
						}
					: null,
				memberCount,
				isAdmin,
			};
		}

		// Handle activity group chats
		if (chat.type === "activity" && chat.activitySearchId) {
			const activitySearch = await ctx.db.get(chat.activitySearchId);

			// Get member count
			const chatMembersList = await ctx.db
				.query("chatMembers")
				.withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
				.collect();
			const memberCount = chatMembersList.length;

			// Check if current user is admin
			const userMembership = chatMembersList.find(
				(m) => m.userId === args.currentUserId,
			);
			const isAdmin =
				userMembership?.role === "admin" || chat.adminId === args.currentUserId;

			return {
				...chat,
				activityDetails: activitySearch
					? {
							id: activitySearch._id,
							activityType: activitySearch.activityType,
							userName: activitySearch.userName,
						}
					: null,
				memberCount,
				isAdmin,
			};
		}

		return chat;
	},
});

// Get all user chats with details (including connection source for filtering)
export const getUserChatsWithDetails = query({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		// Get direct chats where user is a participant
		const allChats = await ctx.db.query("chats").order("desc").collect();

		const directChats = allChats.filter(
			(chat) =>
				chat.type === "direct" && chat.participantIds?.includes(args.userId),
		);

		// Get community chats for communities user has joined
		const userMemberships = await ctx.db
			.query("communityMembers")
			.withIndex("by_user", (q) => q.eq("userId", args.userId))
			.collect();

		const communityIds = userMemberships.map((m) => m.communityId);
		const communityChats = allChats.filter(
			(chat) =>
				chat.type === "community" &&
				chat.communityId &&
				communityIds.includes(chat.communityId),
		);

		// Get event/activity group chats user is a member of (from chatMembers table)
		const userChatMemberships = await ctx.db
			.query("chatMembers")
			.withIndex("by_user", (q) => q.eq("userId", args.userId))
			.collect();

		const userChatIds = userChatMemberships.map((m) => m.chatId);
		const groupChats = allChats.filter(
			(chat) =>
				(chat.type === "event" || chat.type === "activity") &&
				userChatIds.includes(chat._id),
		);

		// Get all accepted requests involving this user to find connection sources
		const requestsAsSender = await ctx.db
			.query("requests")
			.withIndex("by_sender", (q) => q.eq("senderId", args.userId))
			.filter((q) => q.eq(q.field("status"), "accepted"))
			.collect();

		const requestsAsReceiver = await ctx.db
			.query("requests")
			.withIndex("by_receiver", (q) => q.eq("receiverId", args.userId))
			.filter((q) => q.eq(q.field("status"), "accepted"))
			.collect();

		const allAcceptedRequests = [...requestsAsSender, ...requestsAsReceiver];

		// Create a map of chatId -> connection source info
		const chatSourceMap: Record<
			string,
			{ activity: string; eventId?: string; activitySearchId?: string }
		> = {};
		for (const req of allAcceptedRequests) {
			if (req.chatId) {
				chatSourceMap[req.chatId] = {
					activity: req.activity,
					eventId: req.eventId?.toString(),
					activitySearchId: req.activitySearchId?.toString(),
				};
			}
		}

		// Enrich direct chats with other user info and connection source
		const enrichedDirectChats = await Promise.all(
			directChats.map(async (chat) => {
				const otherUserId = chat.participantIds?.find(
					(id) => id !== args.userId,
				);

				// Get connection source info
				const connectionSource = chatSourceMap[chat._id.toString()] || null;

				if (otherUserId) {
					const otherUser = await ctx.db
						.query("users")
						.withIndex("by_workos_id", (q) => q.eq("workosId", otherUserId))
						.first();

					// Get profile image URL (from storage if available)
					let displayImage = otherUser?.profileImageUrl;
					if (otherUser?.profileImageId) {
						displayImage =
							(await ctx.storage.getUrl(otherUser.profileImageId)) || undefined;
					}

					return {
						...chat,
						displayName: otherUser?.firstName || "Anonymous",
						displayImage,
						otherUserId,
						connectionSource,
					};
				}
				return {
					...chat,
					displayName: "Unknown",
					displayImage: null,
					connectionSource,
				};
			}),
		);

		// Enrich community chats with community info
		const enrichedCommunityChats = await Promise.all(
			communityChats.map(async (chat) => {
				if (chat.communityId) {
					const community = await ctx.db.get(chat.communityId);
					return {
						...chat,
						displayName: community?.name || "Community",
						displayImage: community?.imageUrl,
						memberCount: community?.memberCount,
						connectionSource: null, // Communities don't have connection source
					};
				}
				return {
					...chat,
					displayName: "Community",
					displayImage: null,
					connectionSource: null,
				};
			}),
		);

		// Enrich event/activity group chats with details
		const enrichedGroupChats = await Promise.all(
			groupChats.map(async (chat) => {
				// Get member count for this chat
				const chatMembersList = await ctx.db
					.query("chatMembers")
					.withIndex("by_chat", (q) => q.eq("chatId", chat._id))
					.collect();
				const memberCount = chatMembersList.length;

				// Check if current user is admin
				const userMembership = userChatMemberships.find(
					(m) => m.chatId === chat._id,
				);
				const isAdmin =
					userMembership?.role === "admin" || chat.adminId === args.userId;

				// For event chats, get event details
				if (chat.type === "event" && chat.eventId) {
					const event = await ctx.db.get(chat.eventId);
					let eventImageUrl: string | undefined;
					if (event?.imageId) {
						eventImageUrl =
							(await ctx.storage.getUrl(event.imageId)) ?? undefined;
					}
					return {
						...chat,
						displayName: chat.name || event?.title || "Event Group",
						displayImage: eventImageUrl,
						memberCount,
						isAdmin,
						eventDetails: event
							? {
									title: event.title,
									activity: event.activity,
									dateTime: event.dateTime,
								}
							: null,
						activityType: null, // For filtering
						connectionSource: null,
					};
				}

				// For activity chats, get activity search details
				if (chat.type === "activity" && chat.activitySearchId) {
					const activitySearch = await ctx.db.get(chat.activitySearchId);
					return {
						...chat,
						displayName:
							chat.name ||
							`${activitySearch?.activityType || "Activity"} Group`,
						displayImage: null, // Activity searches don't have images
						memberCount,
						isAdmin,
						eventDetails: null,
						activityType: activitySearch?.activityType || null, // For filtering
						connectionSource: null,
					};
				}

				return {
					...chat,
					displayName: chat.name || "Group Chat",
					displayImage: null,
					memberCount,
					isAdmin,
					eventDetails: null,
					activityType: null,
					connectionSource: null,
				};
			}),
		);

		// Combine and sort by last message
		const allUserChats = [
			...enrichedDirectChats,
			...enrichedCommunityChats,
			...enrichedGroupChats,
		].sort((a, b) => {
			const aTime = a.lastMessageAt || a.createdAt;
			const bTime = b.lastMessageAt || b.createdAt;
			return bTime - aTime;
		});

		return allUserChats;
	},
});

// Create a direct chat between two users
export const createDirectChat = mutation({
	args: {
		participantIds: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		// Check if chat already exists between these users
		const allChats = await ctx.db.query("chats").collect();
		const existingChat = allChats.find((chat) => {
			if (chat.type !== "direct" || !chat.participantIds) return false;
			return (
				chat.participantIds.length === args.participantIds.length &&
				args.participantIds.every((id) => chat.participantIds?.includes(id))
			);
		});

		if (existingChat) {
			return { success: true, chatId: existingChat._id, existing: true };
		}

		// Create new chat
		const chatId = await ctx.db.insert("chats", {
			type: "direct",
			participantIds: args.participantIds,
			createdAt: Date.now(),
		});

		return { success: true, chatId, existing: false };
	},
});

// Create or get community chat
export const getOrCreateCommunityChat = mutation({
	args: { communityId: v.id("communities") },
	handler: async (ctx, args) => {
		// Check if community chat exists
		const existingChat = await ctx.db
			.query("chats")
			.withIndex("by_community", (q) => q.eq("communityId", args.communityId))
			.first();

		if (existingChat) {
			return { success: true, chatId: existingChat._id, existing: true };
		}

		// Get community name
		const community = await ctx.db.get(args.communityId);

		// Create new community chat
		const chatId = await ctx.db.insert("chats", {
			type: "community",
			communityId: args.communityId,
			name: community?.name || "Community Chat",
			createdAt: Date.now(),
		});

		return { success: true, chatId, existing: false };
	},
});

// Update chat's last message info
export const updateChatLastMessage = mutation({
	args: {
		chatId: v.id("chats"),
		lastMessagePreview: v.string(),
		lastMessageAt: v.number(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.chatId, {
			lastMessagePreview: args.lastMessagePreview,
			lastMessageAt: args.lastMessageAt,
		});
	},
});
