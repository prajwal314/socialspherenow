import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all live events
export const getLiveEvents = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db
			.query("events")
			.withIndex("by_is_live", (q) => q.eq("isLive", true))
			.order("desc")
			.collect();
	},
});

// Get all live events excluding current user's events (for Home page)
export const getAllLiveEventsExcludingUser = query({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		const allLiveEvents = await ctx.db
			.query("events")
			.withIndex("by_is_live", (q) => q.eq("isLive", true))
			.order("desc")
			.collect();

		// Exclude user's own events and add image URLs + attendee count
		const filteredEvents = allLiveEvents.filter(
			(event) => event.creatorId !== args.userId,
		);

		// Add image URLs and spots info for each event
		const eventsWithDetails = await Promise.all(
			filteredEvents.map(async (event) => {
				let imageUrl = null;
				if (event.imageId) {
					imageUrl = await ctx.storage.getUrl(event.imageId);
				}

				// Get attendee count (only "going" status counts toward spots)
				const attendees = await ctx.db
					.query("eventAttendees")
					.withIndex("by_event", (q) => q.eq("eventId", event._id))
					.filter((q) => q.eq(q.field("status"), "going"))
					.collect();

				const goingCount = attendees.length;
				const spotsLeft = event.peopleNeeded
					? event.peopleNeeded - goingCount
					: null;

				return {
					...event,
					imageUrl,
					goingCount,
					spotsLeft, // null means unlimited
				};
			}),
		);

		return eventsWithDetails;
	},
});

// Get live events filtered by user activities, excluding user's own events
export const getLiveEventsForUser = query({
	args: {
		activities: v.array(v.string()),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const allLiveEvents = await ctx.db
			.query("events")
			.withIndex("by_is_live", (q) => q.eq("isLive", true))
			.order("desc")
			.collect();

		// Filter events matching user's activities and exclude own events
		return allLiveEvents.filter(
			(event) =>
				args.activities.includes(event.activity) &&
				event.creatorId !== args.userId,
		);
	},
});

// Create a new event
export const createEvent = mutation({
	args: {
		creatorId: v.string(),
		creatorName: v.string(),
		activity: v.string(),
		title: v.string(),
		description: v.optional(v.string()),
		imageId: v.optional(v.id("_storage")),
		peopleNeeded: v.optional(v.number()),
		dateTime: v.number(),
	},
	handler: async (ctx, args) => {
		const eventId = await ctx.db.insert("events", {
			creatorId: args.creatorId,
			creatorName: args.creatorName,
			activity: args.activity,
			title: args.title,
			description: args.description,
			imageId: args.imageId,
			peopleNeeded: args.peopleNeeded,
			dateTime: args.dateTime,
			isLive: true,
			createdAt: Date.now(),
		});

		// If peopleNeeded > 2, create a group chat for this event
		if (args.peopleNeeded && args.peopleNeeded > 2) {
			const chatId = await ctx.db.insert("chats", {
				type: "event",
				eventId: eventId,
				adminId: args.creatorId,
				name: args.title,
				description: args.description || `Group chat for: ${args.activity}`,
				participantIds: [args.creatorId], // Creator is first participant
				createdAt: Date.now(),
			});

			// Add creator as admin member
			await ctx.db.insert("chatMembers", {
				chatId: chatId,
				userId: args.creatorId,
				role: "admin",
				joinedAt: Date.now(),
			});

			// Send welcome system message
			await ctx.db.insert("messages", {
				chatId: chatId,
				senderId: "system",
				senderName: "System",
				content: `Welcome to "${args.title}"! This is the group chat for everyone attending this event.`,
				type: "system",
				createdAt: Date.now(),
			});

			// Update chat last message
			await ctx.db.patch(chatId, {
				lastMessagePreview: `Welcome to "${args.title}"!`,
				lastMessageAt: Date.now(),
			});
		}

		return eventId;
	},
});

// Get events created by a specific user
export const getEventsByCreator = query({
	args: { creatorId: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("events")
			.withIndex("by_creator", (q) => q.eq("creatorId", args.creatorId))
			.order("desc")
			.collect();
	},
});

// Get a single event by ID
export const getEventById = query({
	args: { eventId: v.id("events") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.eventId);
	},
});

// End an event (set isLive to false)
export const endEvent = mutation({
	args: { eventId: v.id("events") },
	handler: async (ctx, args) => {
		await ctx.db.patch(args.eventId, { isLive: false });
	},
});

// Get event attendees
export const getEventAttendees = query({
	args: { eventId: v.id("events") },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("eventAttendees")
			.withIndex("by_event", (q) => q.eq("eventId", args.eventId))
			.collect();
	},
});

// Get attendee count for an event
export const getEventAttendeeCount = query({
	args: { eventId: v.id("events") },
	handler: async (ctx, args) => {
		const attendees = await ctx.db
			.query("eventAttendees")
			.withIndex("by_event", (q) => q.eq("eventId", args.eventId))
			.collect();
		return attendees.length;
	},
});

// Check if user is attending an event
export const isUserAttending = query({
	args: { eventId: v.id("events"), userId: v.string() },
	handler: async (ctx, args) => {
		const attendance = await ctx.db
			.query("eventAttendees")
			.withIndex("by_event", (q) => q.eq("eventId", args.eventId))
			.filter((q) => q.eq(q.field("userId"), args.userId))
			.first();
		return attendance;
	},
});

// Join an event
export const joinEvent = mutation({
	args: {
		eventId: v.id("events"),
		userId: v.string(),
		userName: v.string(),
		status: v.optional(v.string()), // "interested" or "going"
	},
	handler: async (ctx, args) => {
		const event = await ctx.db.get(args.eventId);
		if (!event) {
			return { success: false, message: "Event not found" };
		}

		// Check if event is still live
		if (!event.isLive) {
			return { success: false, message: "Event is no longer available" };
		}

		// Check if already attending
		const existing = await ctx.db
			.query("eventAttendees")
			.withIndex("by_event", (q) => q.eq("eventId", args.eventId))
			.filter((q) => q.eq(q.field("userId"), args.userId))
			.first();

		if (existing) {
			// Update status if already exists
			await ctx.db.patch(existing._id, {
				status: args.status || "going",
			});
			return { success: true, updated: true };
		}

		// If status is "going", check capacity
		if (args.status === "going" || !args.status) {
			if (event.peopleNeeded) {
				const goingAttendees = await ctx.db
					.query("eventAttendees")
					.withIndex("by_event", (q) => q.eq("eventId", args.eventId))
					.filter((q) => q.eq(q.field("status"), "going"))
					.collect();

				if (goingAttendees.length >= event.peopleNeeded) {
					return { success: false, message: "Event is full" };
				}
			}
		}

		// Add new attendance
		await ctx.db.insert("eventAttendees", {
			eventId: args.eventId,
			userId: args.userId,
			userName: args.userName,
			status: args.status || "going",
			joinedAt: Date.now(),
		});

		// If event has a group chat (peopleNeeded > 2), add user to it
		if (event.peopleNeeded && event.peopleNeeded > 2) {
			const eventChat = await ctx.db
				.query("chats")
				.withIndex("by_event", (q) => q.eq("eventId", args.eventId))
				.first();

			if (eventChat) {
				// Check if already a member
				const existingMember = await ctx.db
					.query("chatMembers")
					.withIndex("by_chat_and_user", (q) =>
						q.eq("chatId", eventChat._id).eq("userId", args.userId),
					)
					.first();

				if (!existingMember) {
					// Add to chat members
					await ctx.db.insert("chatMembers", {
						chatId: eventChat._id,
						userId: args.userId,
						role: "member",
						joinedAt: Date.now(),
					});

					// Update participantIds array
					const updatedParticipants = [
						...(eventChat.participantIds || []),
						args.userId,
					];
					await ctx.db.patch(eventChat._id, {
						participantIds: updatedParticipants,
					});

					// Send system message
					await ctx.db.insert("messages", {
						chatId: eventChat._id,
						senderId: "system",
						senderName: "System",
						content: `${args.userName} joined the event!`,
						type: "system",
						createdAt: Date.now(),
					});

					await ctx.db.patch(eventChat._id, {
						lastMessagePreview: `${args.userName} joined the event!`,
						lastMessageAt: Date.now(),
					});
				}
			}
		}

		// Check if event is now full and should be auto-closed
		if ((args.status === "going" || !args.status) && event.peopleNeeded) {
			const updatedGoingCount = await ctx.db
				.query("eventAttendees")
				.withIndex("by_event", (q) => q.eq("eventId", args.eventId))
				.filter((q) => q.eq(q.field("status"), "going"))
				.collect();

			if (updatedGoingCount.length >= event.peopleNeeded) {
				// Auto-close the event
				await ctx.db.patch(args.eventId, { isLive: false });
				return { success: true, updated: false, eventClosed: true };
			}
		}

		return { success: true, updated: false };
	},
});

// Leave an event
export const leaveEvent = mutation({
	args: {
		eventId: v.id("events"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const attendance = await ctx.db
			.query("eventAttendees")
			.withIndex("by_event", (q) => q.eq("eventId", args.eventId))
			.filter((q) => q.eq(q.field("userId"), args.userId))
			.first();

		if (!attendance) {
			return { success: false, message: "Not attending this event" };
		}

		await ctx.db.delete(attendance._id);
		return { success: true };
	},
});

// Get events created by user with details (for profile page)
export const getUserEventsWithDetails = query({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		const events = await ctx.db
			.query("events")
			.withIndex("by_creator", (q) => q.eq("creatorId", args.userId))
			.order("desc")
			.collect();

		// Add image URLs and attendee info for each event
		const eventsWithDetails = await Promise.all(
			events.map(async (event) => {
				let imageUrl = null;
				if (event.imageId) {
					imageUrl = await ctx.storage.getUrl(event.imageId);
				}

				// Get attendee count
				const attendees = await ctx.db
					.query("eventAttendees")
					.withIndex("by_event", (q) => q.eq("eventId", event._id))
					.collect();

				const goingCount = attendees.filter((a) => a.status === "going").length;
				const spotsLeft = event.peopleNeeded
					? event.peopleNeeded - goingCount
					: null;

				return {
					...event,
					imageUrl,
					goingCount,
					spotsLeft,
					attendeeCount: attendees.length,
				};
			}),
		);

		return eventsWithDetails;
	},
});

// Delete an event (only creator can delete)
export const deleteEvent = mutation({
	args: {
		eventId: v.id("events"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const event = await ctx.db.get(args.eventId);
		if (!event) {
			return { success: false, message: "Event not found" };
		}

		// Check if user is the creator
		if (event.creatorId !== args.userId) {
			return { success: false, message: "Only the creator can delete this event" };
		}

		// Delete associated event attendees
		const attendees = await ctx.db
			.query("eventAttendees")
			.withIndex("by_event", (q) => q.eq("eventId", args.eventId))
			.collect();

		for (const attendee of attendees) {
			await ctx.db.delete(attendee._id);
		}

		// If event has a group chat, delete it and its messages
		const eventChat = await ctx.db
			.query("chats")
			.withIndex("by_event", (q) => q.eq("eventId", args.eventId))
			.first();

		if (eventChat) {
			// Delete chat members
			const chatMembers = await ctx.db
				.query("chatMembers")
				.withIndex("by_chat", (q) => q.eq("chatId", eventChat._id))
				.collect();

			for (const member of chatMembers) {
				await ctx.db.delete(member._id);
			}

			// Delete messages
			const messages = await ctx.db
				.query("messages")
				.withIndex("by_chat", (q) => q.eq("chatId", eventChat._id))
				.collect();

			for (const message of messages) {
				await ctx.db.delete(message._id);
			}

			// Delete the chat
			await ctx.db.delete(eventChat._id);
		}

		// Delete the event image from storage if exists
		if (event.imageId) {
			await ctx.storage.delete(event.imageId);
		}

		// Delete the event
		await ctx.db.delete(args.eventId);

		return { success: true, message: "Event deleted successfully" };
	},
});

// Get event with attendees and creator info
export const getEventWithDetails = query({
	args: { eventId: v.id("events") },
	handler: async (ctx, args) => {
		const event = await ctx.db.get(args.eventId);
		if (!event) return null;

		const attendees = await ctx.db
			.query("eventAttendees")
			.withIndex("by_event", (q) => q.eq("eventId", args.eventId))
			.collect();

		// Get creator info
		const creator = await ctx.db
			.query("users")
			.withIndex("by_workos_id", (q) => q.eq("workosId", event.creatorId))
			.first();

		// Get event image URL if exists
		let imageUrl = null;
		if (event.imageId) {
			imageUrl = await ctx.storage.getUrl(event.imageId);
		}

		// Calculate spots info
		const goingCount = attendees.filter((a) => a.status === "going").length;
		const spotsLeft = event.peopleNeeded
			? event.peopleNeeded - goingCount
			: null;

		return {
			...event,
			imageUrl,
			attendees,
			attendeeCount: attendees.length,
			goingCount,
			spotsLeft, // null means unlimited
			creator: creator
				? {
						id: creator.workosId,
						name: creator.firstName || "Anonymous",
						profileImageUrl: creator.profileImageUrl,
					}
				: null,
		};
	},
});
