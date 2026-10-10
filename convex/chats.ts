import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all chats for a user (direct + community + group + activity)
export const getUserChats = query({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		const allChats = await ctx.db.query("chats").order("desc").collect();

		const directChats = allChats.filter(
			(chat) =>
				chat.type === "direct" && chat.participantIds?.includes(args.userId),
		);

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

		const userGroupMemberships = await ctx.db
			.query("communityGroupMembers")
			.withIndex("by_user", (q) => q.eq("userId", args.userId))
			.collect();
		const userGroupIds = new Set(userGroupMemberships.map((m) => m.groupId));
		const groupChats = allChats.filter(
			(chat) =>
				chat.type === "group" && chat.groupId && userGroupIds.has(chat.groupId),
		);

		const allUserChats = [
			...directChats,
			...communityChats,
			...groupChats,
		].sort((a, b) => {
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
			let communityImageUrl = community?.imageUrl;
			if (community?.imageId) {
				communityImageUrl =
					(await ctx.storage.getUrl(community.imageId)) ?? undefined;
			}
			return {
				...chat,
				community: community
					? {
							id: community._id,
							name: community.name,
							imageUrl: communityImageUrl,
							memberCount: community.memberCount,
						}
					: null,
			};
		}

		if (chat.type === "group" && chat.groupId) {
			const groupId = chat.groupId;
			const group = await ctx.db.get(groupId);
			const community = group ? await ctx.db.get(group.communityId) : null;
			let communityImageUrl = community?.imageUrl;
			if (community?.imageId) {
				communityImageUrl =
					(await ctx.storage.getUrl(community.imageId)) ?? undefined;
			}
			const groupMembers = await ctx.db
				.query("communityGroupMembers")
				.withIndex("by_group", (q) => q.eq("groupId", groupId))
				.collect();

			return {
				...chat,
				name: community?.name
					? `${community.name} / ${group?.name ?? chat.name ?? "Group Chat"}`
					: (group?.name ?? chat.name ?? "Group Chat"),
				description: group?.description ?? chat.description,
				communityId: group?.communityId,
				community: community
					? {
							id: community._id,
							name: community.name,
							imageUrl: communityImageUrl,
							memberCount: community.memberCount,
						}
					: null,
				memberCount: groupMembers.length,
				isAdmin: group?.creatorId === args.currentUserId,
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
		const allChats = await ctx.db.query("chats").order("desc").collect();

		const directChats = allChats.filter(
			(chat) =>
				chat.type === "direct" && chat.participantIds?.includes(args.userId),
		);

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

		const userChatMemberships = await ctx.db
			.query("chatMembers")
			.withIndex("by_user", (q) => q.eq("userId", args.userId))
			.collect();
		const userChatIds = userChatMemberships.map((m) => m.chatId);

		const userGroupMemberships = await ctx.db
			.query("communityGroupMembers")
			.withIndex("by_user", (q) => q.eq("userId", args.userId))
			.collect();
		const userGroupIds = new Set(userGroupMemberships.map((m) => m.groupId));
		const communityGroupChats = allChats.filter(
			(chat) =>
				chat.type === "group" && chat.groupId && userGroupIds.has(chat.groupId),
		);

		const eventAndActivityChats = allChats.filter(
			(chat) =>
				(chat.type === "event" || chat.type === "activity") &&
				userChatIds.includes(chat._id),
		);

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

		const enrichedDirectChats = await Promise.all(
			directChats.map(async (chat) => {
				const otherUserId = chat.participantIds?.find(
					(id) => id !== args.userId,
				);
				const connectionSource = chatSourceMap[chat._id.toString()] || null;

				if (otherUserId) {
					const otherUser = await ctx.db
						.query("users")
						.withIndex("by_workos_id", (q) => q.eq("workosId", otherUserId))
						.first();

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

		const enrichedCommunityChats = await Promise.all(
			communityChats.map(async (chat) => {
				if (chat.communityId) {
					const community = await ctx.db.get(chat.communityId);
					let displayImage = community?.imageUrl;
					if (community?.imageId) {
						displayImage =
							(await ctx.storage.getUrl(community.imageId)) ?? undefined;
					}
					return {
						...chat,
						displayName: community?.name || "Community",
						displayImage,
						memberCount: community?.memberCount,
						connectionSource: null,
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

		const enrichedCommunityGroupChats = await Promise.all(
			communityGroupChats.map(async (chat) => {
				if (chat.groupId) {
					const groupId = chat.groupId;
					const group = await ctx.db.get(chat.groupId);
					const community = group ? await ctx.db.get(group.communityId) : null;
					let displayImage = community?.imageUrl;
					if (community?.imageId) {
						displayImage =
							(await ctx.storage.getUrl(community.imageId)) ?? undefined;
					}
					const groupMembers = await ctx.db
						.query("communityGroupMembers")
						.withIndex("by_group", (q) => q.eq("groupId", groupId))
						.collect();

					return {
						...chat,
						displayName: community?.name
							? `${community.name} / ${group?.name || chat.name || "Group Chat"}`
							: group?.name || chat.name || "Group Chat",
						displayImage,
						memberCount: groupMembers.length,
						isAdmin: group?.creatorId === args.userId,
						eventDetails: null,
						activityType: null,
						connectionSource: null,
					};
				}

				return {
					...chat,
					displayName: chat.name || "Group Chat",
					displayImage: null,
					memberCount: 0,
					isAdmin: false,
					eventDetails: null,
					activityType: null,
					connectionSource: null,
				};
			}),
		);

		const enrichedEventAndActivityChats = await Promise.all(
			eventAndActivityChats.map(async (chat) => {
				const chatMembersList = await ctx.db
					.query("chatMembers")
					.withIndex("by_chat", (q) => q.eq("chatId", chat._id))
					.collect();
				const memberCount = chatMembersList.length;
				const userMembership = userChatMemberships.find(
					(m) => m.chatId === chat._id,
				);
				const isAdmin =
					userMembership?.role === "admin" || chat.adminId === args.userId;

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
						activityType: null,
						connectionSource: null,
					};
				}

				if (chat.type === "activity" && chat.activitySearchId) {
					const activitySearch = await ctx.db.get(chat.activitySearchId);
					return {
						...chat,
						displayName:
							chat.name ||
							`${activitySearch?.activityType || "Activity"} Group`,
						displayImage: null,
						memberCount,
						isAdmin,
						eventDetails: null,
						activityType: activitySearch?.activityType || null,
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

		const allUserChats = [
			...enrichedDirectChats,
			...enrichedCommunityChats,
			...enrichedCommunityGroupChats,
			...enrichedEventAndActivityChats,
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
