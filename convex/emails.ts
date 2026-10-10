import { Resend, vOnEmailEventArgs } from "@convex-dev/resend";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
} from "./_generated/server";
import {
	MESSAGE_EMAIL_COOLDOWN_MS,
	REMINDER_DELAY_MS,
	SITE_URL,
	connectionAcceptedEmailSubject,
	connectionRequestEmailSubject,
	dedupeKeyFor,
	newMessageEmailSubject,
	reminderEmailSubject,
	renderConnectionAcceptedEmail,
	renderConnectionRequestEmail,
	renderNewMessageEmail,
	renderReminderEmail,
	renderWelcomeEmail,
	welcomeEmailSubject,
	type NotificationType,
} from "./emailContent";

// ---------------------------------------------------------------------------
// Resend component instance
// testMode:false so real addresses can receive mail once RESEND_API_KEY is set.
// Without an API key, enqueue fails safely inside try/catch and core flows
// are never rolled back.
// ---------------------------------------------------------------------------
export const resend: Resend = new Resend(components.resend, {
	testMode: false,
	onEmailEvent: internal.emails.handleEmailEvent,
});

const MESSAGE_EMAIL_DELAY_MS = 5 * 60 * 1000; // 5 min grace so active readers skip mail

function getSiteUrl(): string {
	const configured = process.env.SITE_URL as string | undefined;
	return (configured ?? SITE_URL).replace(/\/$/, "");
}

function getEmailFrom(): string {
	const configured = process.env.EMAIL_FROM as string | undefined;
	return (
		configured ?? "SocialSphere <notifications@socialspherenow.in>"
	);
}

interface Prefs {
	connectionRequest: boolean;
	connectionAccepted: boolean;
	newMessage: boolean;
	pendingReminder: boolean;
	welcome: boolean;
}

function resolvePrefs(user: {
	notificationPrefs?: {
		connectionRequest?: boolean;
		connectionAccepted?: boolean;
		newMessage?: boolean;
		pendingReminder?: boolean;
		welcome?: boolean;
	} | null;
}): Prefs {
	return {
		connectionRequest: user.notificationPrefs?.connectionRequest ?? true,
		connectionAccepted: user.notificationPrefs?.connectionAccepted ?? true,
		newMessage: user.notificationPrefs?.newMessage ?? true,
		pendingReminder: user.notificationPrefs?.pendingReminder ?? true,
		welcome: user.notificationPrefs?.welcome ?? true,
	};
}

function isValidEmail(email: string | undefined | null): boolean {
	if (!email) return false;
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeError(error: unknown): string {
	if (error instanceof Error) {
		// Strip anything that looks like a key/token; keep first 180 chars.
		return error.message
			.replace(/(re_|sk_|whsec_)[A-Za-z0-9_-]+/g, "[redacted]")
			.slice(0, 180);
	}
	return "unknown error";
}

async function getUserByWorkosId(ctx: MutationCtx, workosId: string) {
	return await ctx.db
		.query("users")
		.withIndex("by_workos_id", (q) => q.eq("workosId", workosId))
		.first();
}

/** Enqueue-time idempotency: first caller wins, retries get the existing row. */
async function claimNotification(
	ctx: MutationCtx,
	type: NotificationType,
	dedupeKey: string,
	recipientUserId: string,
	relatedId?: string,
) {
	const existing = await ctx.db
		.query("notificationEvents")
		.withIndex("by_dedupe", (q) => q.eq("dedupeKey", dedupeKey))
		.first();
	if (existing) return { already: true as const, record: existing };
	const id = await ctx.db.insert("notificationEvents", {
		type,
		dedupeKey,
		recipientUserId,
		relatedId,
		status: "queued",
		attempts: 0,
		createdAt: Date.now(),
	});
	const record = await ctx.db.get(id);
	if (!record) throw new Error("Failed to create notification record");
	return { already: false as const, record };
}

async function markEvent(
	ctx: MutationCtx,
	eventId: { _id: unknown } & Record<string, unknown>,
	patch: {
		status: string;
		emailId?: string;
		error?: string;
		attempts?: number;
	},
) {
	await ctx.db.patch(
		// biome-ignore lint/suspicious/noExplicitAny: convex id branding
		eventId._id as any,
		{
			...patch,
			processedAt: Date.now(),
		},
	);
}

// ---------------------------------------------------------------------------
// Scheduling entry points (called via ctx.scheduler from public mutations)
// ---------------------------------------------------------------------------

export const scheduleConnectionRequestEmail = internalMutation({
	args: { requestId: v.id("requests") },
	handler: async (ctx, args) => {
		await ctx.scheduler.runAfter(0, internal.emails.sendConnectionRequestEmail, {
			requestId: args.requestId,
		});
		// One reminder, 48h later; the worker re-verifies pending state.
		await ctx.scheduler.runAfter(
			REMINDER_DELAY_MS,
			internal.emails.sendPendingReminder,
			{ requestId: args.requestId },
		);
	},
});

export const scheduleConnectionAcceptedEmail = internalMutation({
	args: { requestId: v.id("requests") },
	handler: async (ctx, args) => {
		await ctx.scheduler.runAfter(0, internal.emails.sendConnectionAcceptedEmail, {
			requestId: args.requestId,
		});
	},
});

export const scheduleMessageEmail = internalMutation({
	args: {
		chatId: v.id("chats"),
		senderWorkosId: v.string(),
		messageId: v.id("messages"),
	},
	handler: async (ctx, args) => {
		await ctx.scheduler.runAfter(
			MESSAGE_EMAIL_DELAY_MS,
			internal.emails.sendNewMessageEmail,
			{
				chatId: args.chatId,
				senderWorkosId: args.senderWorkosId,
				messageId: args.messageId,
			},
		);
	},
});

export const scheduleWelcomeEmail = internalMutation({
	args: { workosId: v.string() },
	handler: async (ctx, args) => {
		await ctx.scheduler.runAfter(0, internal.emails.sendWelcomeEmail, {
			workosId: args.workosId,
		});
	},
});

// ---------------------------------------------------------------------------
// Workers
// ---------------------------------------------------------------------------

export const sendConnectionRequestEmail = internalMutation({
	args: { requestId: v.id("requests") },
	handler: async (ctx, args) => {
		const request = await ctx.db.get(args.requestId);
		if (!request || request.status !== "pending") return { ok: false as const, reason: "not-pending" };

		const receiver = await getUserByWorkosId(ctx, request.receiverId);
		const sender = await getUserByWorkosId(ctx, request.senderId);
		if (!receiver || !isValidEmail(receiver.email)) return { ok: false as const, reason: "no-recipient" };
		if (resolvePrefs(receiver).connectionRequest === false)
			return { ok: false as const, reason: "opted-out" };

		const dedupeKey = dedupeKeyFor("connection_request", [request._id]);
		const { already, record } = await claimNotification(
			ctx,
			"connection_request",
			dedupeKey,
			receiver.workosId,
			request._id,
		);
		if (already && record.status !== "failed") return { ok: false as const, reason: "duplicate" };

		const senderName =
			sender?.firstName || request.senderName || "Someone";
		const site = getSiteUrl();
		const { html, text } = renderConnectionRequestEmail({
			recipientName: receiver.firstName,
			senderName,
			intentLabel: request.intent || request.activity,
			ctaUrl: `${site}/home`,
		});

		try {
			const emailId = await resend.sendEmail(ctx, {
				from: getEmailFrom(),
				to: receiver.email,
				subject: connectionRequestEmailSubject(),
				html,
				text,
				headers: [
					{ name: "X-SocialSphere-Type", value: "connection_request" },
					{ name: "X-SocialSphere-Request", value: String(request._id) },
				],
				idempotencyKey: dedupeKey,
			});
			await markEvent(ctx, record, {
				status: "sent",
				emailId: emailId as string,
				attempts: record.attempts + 1,
			});
			return { ok: true as const };
		} catch (error) {
			// Email failure must never roll back the persisted request.
			await markEvent(ctx, record, {
				status: "failed",
				error: sanitizeError(error),
				attempts: record.attempts + 1,
			});
			return { ok: false as const, reason: "provider-error" };
		}
	},
});

export const sendConnectionAcceptedEmail = internalMutation({
	args: { requestId: v.id("requests") },
	handler: async (ctx, args) => {
		const request = await ctx.db.get(args.requestId);
		if (!request || request.status !== "accepted") return { ok: false as const, reason: "not-accepted" };

		const originalRequester = await getUserByWorkosId(ctx, request.senderId);
		const accepter = await getUserByWorkosId(ctx, request.receiverId);
		if (!originalRequester || !isValidEmail(originalRequester.email))
			return { ok: false as const, reason: "no-recipient" };
		if (resolvePrefs(originalRequester).connectionAccepted === false)
			return { ok: false as const, reason: "opted-out" };

		const dedupeKey = dedupeKeyFor("connection_accepted", [request._id]);
		const { already, record } = await claimNotification(
			ctx,
			"connection_accepted",
			dedupeKey,
			originalRequester.workosId,
			request._id,
		);
		if (already && record.status !== "failed") return { ok: false as const, reason: "duplicate" };

		const site = getSiteUrl();
		const { html, text } = renderConnectionAcceptedEmail({
			recipientName: originalRequester.firstName,
			accepterName: accepter?.firstName || "Someone",
			ctaUrl: `${site}/inbox`,
		});

		try {
			const emailId = await resend.sendEmail(ctx, {
				from: getEmailFrom(),
				to: originalRequester.email,
				subject: connectionAcceptedEmailSubject(),
				html,
				text,
				headers: [{ name: "X-SocialSphere-Type", value: "connection_accepted" }],
				idempotencyKey: dedupeKey,
			});
			await markEvent(ctx, record, {
				status: "sent",
				emailId: emailId as string,
				attempts: record.attempts + 1,
			});
			return { ok: true as const };
		} catch (error) {
			await markEvent(ctx, record, {
				status: "failed",
				error: sanitizeError(error),
				attempts: record.attempts + 1,
			});
			return { ok: false as const, reason: "provider-error" };
		}
	},
});

export const sendNewMessageEmail = internalMutation({
	args: {
		chatId: v.id("chats"),
		senderWorkosId: v.string(),
		messageId: v.id("messages"),
	},
	handler: async (ctx, args) => {
		const chat = await ctx.db.get(args.chatId);
		const message = await ctx.db.get(args.messageId);
		// Never mail for deleted/failed/unsaved messages.
		if (!chat || !message || message.chatId !== chat._id) return { ok: false as const, reason: "invalid" };
		if (message.senderId !== args.senderWorkosId) return { ok: false as const, reason: "sender-mismatch" };
		if (message.senderId === "system" || message.type === "system")
			return { ok: false as const, reason: "system-message" };

		// Resolve recipients by chat shape.
		let recipientIds: string[] = [];
		if (chat.type === "direct" && chat.participantIds) {
			recipientIds = chat.participantIds.filter((id) => id !== args.senderWorkosId);
		} else if (chat.type === "community" && chat.communityId) {
			const communityId = chat.communityId;
			const members = await ctx.db
				.query("communityMembers")
				.withIndex("by_community", (q) => q.eq("communityId", communityId))
				.collect();
			recipientIds = members
				.map((m) => m.userId)
				.filter((id) => id !== args.senderWorkosId);
		} else {
			const members = await ctx.db
				.query("chatMembers")
				.withIndex("by_chat", (q) => q.eq("chatId", chat._id))
				.collect();
			recipientIds = members
				.map((m) => m.userId)
				.filter((id) => id !== args.senderWorkosId);
			if (chat.participantIds) {
				for (const id of chat.participantIds) {
					if (id !== args.senderWorkosId && !recipientIds.includes(id))
						recipientIds.push(id);
				}
			}
		}
		// Abuse/flood guard: cap recipients per message event.
		recipientIds = [...new Set(recipientIds)].slice(0, 20);

		const sender = await getUserByWorkosId(ctx, args.senderWorkosId);
		const senderName = sender?.firstName || message.senderName || "Someone";
		const site = getSiteUrl();
		const now = Date.now();
		let sent = 0;

		for (const recipientId of recipientIds) {
			const recipient = await getUserByWorkosId(ctx, recipientId);
			if (!recipient || !isValidEmail(recipient.email)) continue;
			if (resolvePrefs(recipient).newMessage === false) continue;

			// Only mail when the recipient genuinely has unread mail in this chat
			// (active readers mark messages read on open, which suppresses mail).
			const chatMessages = await ctx.db
				.query("messages")
				.withIndex("by_chat", (q) => q.eq("chatId", chat._id))
				.collect();
			const unread = chatMessages.filter(
				(m) =>
					m.senderId !== recipientId &&
					m.senderId !== "system" &&
					m.type !== "system" &&
					!m.readBy?.includes(recipientId),
			);
			if (unread.length === 0) continue;

			// Cooldown / digest: at most one message email per chat+recipient window.
			const windowStart = now - MESSAGE_EMAIL_COOLDOWN_MS;
			const recent = await ctx.db
				.query("notificationEvents")
				.withIndex("by_recipient", (q) => q.eq("recipientUserId", recipientId))
				.order("desc")
				.take(20);
			const recentForChat = recent.find(
				(e) =>
					e.type === "new_message" &&
					e.relatedId === String(chat._id) &&
					e.status === "sent" &&
					e.createdAt >= windowStart,
			);
			if (recentForChat) continue;

			const dedupeKey = dedupeKeyFor("new_message", [
				chat._id,
				recipientId,
				Math.floor(now / MESSAGE_EMAIL_COOLDOWN_MS),
			]);
			const { already, record } = await claimNotification(
				ctx,
				"new_message",
				dedupeKey,
				recipientId,
				String(chat._id),
			);
			if (already && record.status !== "failed") continue;

			// Never include the message body — generic digest only.
			const { html, text } = renderNewMessageEmail({
				recipientName: recipient.firstName,
				senderName,
				ctaUrl: `${site}/inbox`,
				unreadCount: unread.length,
			});
			try {
				const emailId = await resend.sendEmail(ctx, {
					from: getEmailFrom(),
					to: recipient.email,
					subject: newMessageEmailSubject(),
					html,
					text,
					headers: [{ name: "X-SocialSphere-Type", value: "new_message" }],
					idempotencyKey: dedupeKey,
				});
				await markEvent(ctx, record, {
					status: "sent",
					emailId: emailId as string,
					attempts: record.attempts + 1,
				});
				sent += 1;
			} catch (error) {
				await markEvent(ctx, record, {
					status: "failed",
					error: sanitizeError(error),
					attempts: record.attempts + 1,
				});
			}
		}
		return { ok: true as const, sent };
	},
});

export const sendWelcomeEmail = internalMutation({
	args: { workosId: v.string() },
	handler: async (ctx, args) => {
		const user = await getUserByWorkosId(ctx, args.workosId);
		if (!user || !isValidEmail(user.email)) return { ok: false as const, reason: "no-recipient" };
		if (user.welcomeEmailSentAt) return { ok: false as const, reason: "already-sent" };
		if (resolvePrefs(user).welcome === false) return { ok: false as const, reason: "opted-out" };

		const dedupeKey = dedupeKeyFor("welcome", [user.workosId]);
		const { already, record } = await claimNotification(
			ctx,
			"welcome",
			dedupeKey,
			user.workosId,
			String(user._id),
		);
		if (already && record.status !== "failed") {
			if (!user.welcomeEmailSentAt)
				await ctx.db.patch(user._id, { welcomeEmailSentAt: Date.now() });
			return { ok: false as const, reason: "duplicate" };
		}

		const site = getSiteUrl();
		const needsOnboarding =
			!user.termsAcceptedAt || !user.hasCompletedPreferences;
		const { html, text } = renderWelcomeEmail({
			recipientName: user.firstName,
			ctaUrl: needsOnboarding ? `${site}/preferences` : `${site}/home`,
		});

		try {
			const emailId = await resend.sendEmail(ctx, {
				from: getEmailFrom(),
				to: user.email,
				subject: welcomeEmailSubject(),
				html,
				text,
				headers: [{ name: "X-SocialSphere-Type", value: "welcome" }],
				idempotencyKey: dedupeKey,
			});
			await markEvent(ctx, record, {
				status: "sent",
				emailId: emailId as string,
				attempts: record.attempts + 1,
			});
			await ctx.db.patch(user._id, { welcomeEmailSentAt: Date.now() });
			return { ok: true as const };
		} catch (error) {
			await markEvent(ctx, record, {
				status: "failed",
				error: sanitizeError(error),
				attempts: record.attempts + 1,
			});
			return { ok: false as const, reason: "provider-error" };
		}
	},
});

export const sendPendingReminder = internalMutation({
	args: { requestId: v.id("requests") },
	handler: async (ctx, args) => {
		const request = await ctx.db.get(args.requestId);
		// Only pending requests get a reminder — accepted/declined/invalid never do.
		if (!request || request.status !== "pending")
			return { ok: false as const, reason: "resolved" };

		const receiver = await getUserByWorkosId(ctx, request.receiverId);
		const sender = await getUserByWorkosId(ctx, request.senderId);
		if (!receiver || !isValidEmail(receiver.email)) return { ok: false as const, reason: "no-recipient" };
		if (resolvePrefs(receiver).pendingReminder === false)
			return { ok: false as const, reason: "opted-out" };

		const dedupeKey = dedupeKeyFor("pending_reminder", [request._id]);
		const { already, record } = await claimNotification(
			ctx,
			"pending_reminder",
			dedupeKey,
			receiver.workosId,
			request._id,
		);
		// At most one reminder per request, even across retries/duplicates.
		if (already) return { ok: false as const, reason: "duplicate" };

		const site = getSiteUrl();
		const { html, text } = renderReminderEmail({
			recipientName: receiver.firstName,
			senderName: sender?.firstName || request.senderName || "Someone",
			intentLabel: request.intent || request.activity,
			ctaUrl: `${site}/home`,
		});

		try {
			const emailId = await resend.sendEmail(ctx, {
				from: getEmailFrom(),
				to: receiver.email,
				subject: reminderEmailSubject(),
				html,
				text,
				headers: [{ name: "X-SocialSphere-Type", value: "pending_reminder" }],
				idempotencyKey: dedupeKey,
			});
			await markEvent(ctx, record, {
				status: "sent",
				emailId: emailId as string,
				attempts: record.attempts + 1,
			});
			return { ok: true as const };
		} catch (error) {
			await markEvent(ctx, record, {
				status: "failed",
				error: sanitizeError(error),
				attempts: record.attempts + 1,
			});
			return { ok: false as const, reason: "provider-error" };
		}
	},
});

// ---------------------------------------------------------------------------
// Resend delivery-event callback (wired via webhook -> component -> here).
// Keeps our tracking rows fresh without storing PII.
// ---------------------------------------------------------------------------
export const handleEmailEvent = internalMutation({
	args: vOnEmailEventArgs,
	handler: async (ctx, args) => {
		const matches = await ctx.db
			.query("notificationEvents")
			.withIndex("by_status", (q) => q.eq("status", "sent"))
			.order("desc")
			.take(50);
		const row = matches.find((r) => r.emailId === args.id);
		if (row) {
			await ctx.db.patch(row._id, { processedAt: Date.now() });
		}
	},
});

// Debug helper: recent notification events (run via `npx convex run`).
export const listRecent = internalQuery({
	args: { limit: v.optional(v.number()) },
	handler: async (ctx, args) => {
		const rows = await ctx.db
			.query("notificationEvents")
			.order("desc")
			.take(args.limit ?? 25);
		return rows.map((r) => ({
			type: r.type,
			status: r.status,
			relatedId: r.relatedId,
			attempts: r.attempts,
			createdAt: r.createdAt,
			processedAt: r.processedAt,
			error: r.error,
		}));
	},
});
