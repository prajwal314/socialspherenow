// Pure, framework-free email helpers for SocialSphere.
// IMPORTANT: this file must not import from convex/* so it stays unit-testable
// with vitest and reusable from both Convex functions and tests.

export const SITE_URL = "https://www.socialspherenow.in";
export const EMAIL_FROM_FALLBACK =
	"SocialSphere <notifications@socialspherenow.in>";

export const MESSAGE_EMAIL_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
export const REMINDER_DELAY_MS = 48 * 60 * 60 * 1000; // 48 hours

export type NotificationType =
	| "connection_request"
	| "connection_accepted"
	| "new_message"
	| "welcome"
	| "pending_reminder";

/** Escape user-controlled text for safe insertion into HTML templates. */
export function escapeHtml(input: string | undefined | null): string {
	if (input === undefined || input === null) return "";
	return String(input).replace(/[&<>"']/g, (ch) => {
		switch (ch) {
			case "&":
				return "&amp;";
			case "<":
				return "&lt;";
			case ">":
				return "&gt;";
			case '"':
				return "&quot;";
			case "'":
				return "&#39;";
			default:
				return ch;
		}
	});
}

/** Stable idempotency keys so retries collapse to a single send. */
export function dedupeKeyFor(
	type: NotificationType,
	parts: Array<string | number>,
): string {
	return `${type}:${parts.join(":")}`;
}

/**
 * Cooldown gate for message digest emails.
 * Returns true when a new email may be sent (no recent send).
 */
export function shouldSendMessageEmail(
	lastSentAt: number | undefined | null,
	now: number,
	cooldownMs: number = MESSAGE_EMAIL_COOLDOWN_MS,
): boolean {
	if (!lastSentAt) return true;
	return now - lastSentAt >= cooldownMs;
}

function baseLayout(opts: {
	preheader: string;
	heading: string;
	bodyHtml: string;
	ctaLabel: string;
	ctaUrl: string;
	reason: string;
	recipientName?: string;
}): string {
	const greeting = opts.recipientName
		? `<p style="margin:0 0 12px;color:#d4d4d8;font-size:15px;">Hi ${escapeHtml(opts.recipientName)},</p>`
		: "";
	return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#0f0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>
<div style="max-width:560px;margin:0 auto;padding:24px 16px;">
<div style="background:#161621;border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;">
<div style="padding:24px 24px 0;text-align:center;">
<div style="font-size:22px;font-weight:800;color:#ffffff;">Social<span style="color:#0c8b96;">Sphere</span></div>
<div style="font-size:12px;color:#71717a;margin-top:4px;">Built for comfort, not pressure</div>
</div>
<div style="padding:20px 24px 8px;">
<h1 style="margin:0 0 12px;font-size:20px;color:#ffffff;">${escapeHtml(opts.heading)}</h1>
${greeting}
<div style="color:#d4d4d8;font-size:15px;line-height:1.6;">${opts.bodyHtml}</div>
<div style="text-align:center;margin:24px 0 8px;">
<a href="${escapeHtml(opts.ctaUrl)}" style="display:inline-block;background:#0c8b96;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 28px;border-radius:999px;">${escapeHtml(opts.ctaLabel)}</a>
</div>
</div>
<div style="padding:16px 24px 24px;border-top:1px solid rgba(255,255,255,0.08);margin-top:12px;">
<p style="margin:0 0 8px;font-size:12px;color:#71717a;">${escapeHtml(opts.reason)}</p>
<p style="margin:0;font-size:12px;color:#71717a;">Manage these emails anytime from your SocialSphere profile settings. <a href="${SITE_URL}" style="color:#22d3ee;">socialspherenow.in</a></p>
</div>
</div>
</div>
</body>
</html>`;
}

function plainTextFooter(reason: string, ctaLabel: string, ctaUrl: string): string {
	return `\n\n${ctaLabel}: ${ctaUrl}\n\n${reason}\nManage these emails from your SocialSphere profile settings.\nSocialSphere — https://www.socialspherenow.in/`;
}

export interface ConnectionRequestEmail {
	recipientName?: string;
	senderName: string;
	intentLabel?: string;
	ctaUrl: string;
}

export function connectionRequestEmailSubject(): string {
	return "You have a new connection request on SocialSphere";
}

export function renderConnectionRequestEmail(e: ConnectionRequestEmail): {
	html: string;
	text: string;
} {
	const intent = e.intentLabel
		? ` for <strong style="color:#c4b5fd;">${escapeHtml(e.intentLabel)}</strong>`
		: "";
	const html = baseLayout({
		preheader: `${e.senderName} wants to connect with you`,
		heading: "New connection request",
		recipientName: e.recipientName,
		bodyHtml: `<p style="margin:0 0 12px;"><strong style="color:#ffffff;">${escapeHtml(e.senderName)}</strong> wants to connect${intent}.</p><p style="margin:0;">Review their profile and accept when it feels right — no pressure, no random DMs.</p>`,
		ctaLabel: "View Connection Request",
		ctaUrl: e.ctaUrl,
		reason:
			"You received this because someone sent you a connection request on SocialSphere.",
	});
	const text =
		`${e.recipientName ? `Hi ${e.recipientName},\n\n` : ""}${e.senderName} wants to connect${e.intentLabel ? ` for ${e.intentLabel}` : ""}. Review and accept when it feels right.` +
		plainTextFooter(
			"You received this because someone sent you a connection request on SocialSphere.",
			"View Connection Request",
			e.ctaUrl,
		);
	return { html, text };
}

export interface ConnectionAcceptedEmail {
	recipientName?: string;
	accepterName: string;
	ctaUrl: string;
}

export function connectionAcceptedEmailSubject(): string {
	return "Your connection request was accepted!";
}

export function renderConnectionAcceptedEmail(e: ConnectionAcceptedEmail): {
	html: string;
	text: string;
} {
	const html = baseLayout({
		preheader: `${e.accepterName} accepted your request`,
		heading: "You're connected 🎉",
		recipientName: e.recipientName,
		bodyHtml: `<p style="margin:0 0 12px;"><strong style="color:#ffffff;">${escapeHtml(e.accepterName)}</strong> accepted your connection request.</p><p style="margin:0;">Say hi and plan something fun together.</p>`,
		ctaLabel: "Start Chatting",
		ctaUrl: e.ctaUrl,
		reason:
			"You received this because a connection request you sent was accepted.",
	});
	const text =
		`${e.recipientName ? `Hi ${e.recipientName},\n\n` : ""}${e.accepterName} accepted your connection request. Say hi!` +
		plainTextFooter(
			"You received this because a connection request you sent was accepted.",
			"Start Chatting",
			e.ctaUrl,
		);
	return { html, text };
}

export interface NewMessageEmail {
	recipientName?: string;
	senderName: string;
	ctaUrl: string;
	unreadCount?: number;
}

export function newMessageEmailSubject(): string {
	return "You have a new message on SocialSphere";
}

export function renderNewMessageEmail(e: NewMessageEmail): {
	html: string;
	text: string;
} {
	const countLine =
		e.unreadCount && e.unreadCount > 1
			? `<p style="margin:0 0 12px;">You have <strong style="color:#ffffff;">${e.unreadCount} unread messages</strong>.</p>`
			: "";
	const html = baseLayout({
		preheader: "You have a new message waiting",
		heading: "New message 💬",
		recipientName: e.recipientName,
		bodyHtml: `${countLine}<p style="margin:0 0 12px;"><strong style="color:#ffffff;">${escapeHtml(e.senderName)}</strong> sent you a message on SocialSphere.</p><p style="margin:0;">Open your inbox to catch up. We keep the preview out of email to protect everyone's privacy.</p>`,
		ctaLabel: "Open Inbox",
		ctaUrl: e.ctaUrl,
		reason:
			"You received this because you have unread messages on SocialSphere.",
	});
	const text =
		`${e.recipientName ? `Hi ${e.recipientName},\n\n` : ""}${e.senderName} sent you a message on SocialSphere. Open your inbox to catch up.` +
		plainTextFooter(
			"You received this because you have unread messages on SocialSphere.",
			"Open Inbox",
			e.ctaUrl,
		);
	return { html, text };
}

export interface WelcomeEmail {
	recipientName?: string;
	ctaUrl: string;
}

export function welcomeEmailSubject(): string {
	return "Welcome to SocialSphere!";
}

export function renderWelcomeEmail(e: WelcomeEmail): {
	html: string;
	text: string;
} {
	const html = baseLayout({
		preheader: "Find your people, at your pace",
		heading: "Welcome to SocialSphere 👋",
		recipientName: e.recipientName,
		bodyHtml: `<p style="margin:0 0 12px;">Find activity partners, communities, and events based on your interests and comfort level.</p><p style="margin:0;">Complete your profile to get the best matches, then explore connections with zero pressure.</p>`,
		ctaLabel: "Complete Your Profile",
		ctaUrl: e.ctaUrl,
		reason: "You received this because you created a SocialSphere account.",
	});
	const text =
		`${e.recipientName ? `Hi ${e.recipientName},\n\n` : ""}Welcome to SocialSphere! Complete your profile to get the best matches, then explore connections with zero pressure.` +
		plainTextFooter(
			"You received this because you created a SocialSphere account.",
			"Complete Your Profile",
			e.ctaUrl,
		);
	return { html, text };
}

export interface ReminderEmail {
	recipientName?: string;
	senderName: string;
	intentLabel?: string;
	ctaUrl: string;
}

export function reminderEmailSubject(): string {
	return "A connection request is waiting for you";
}

export function renderReminderEmail(e: ReminderEmail): {
	html: string;
	text: string;
} {
	const intent = e.intentLabel
		? ` for <strong style="color:#c4b5fd;">${escapeHtml(e.intentLabel)}</strong>`
		: "";
	const html = baseLayout({
		preheader: "Just a gentle nudge",
		heading: "Still thinking it over?",
		recipientName: e.recipientName,
		bodyHtml: `<p style="margin:0 0 12px;"><strong style="color:#ffffff;">${escapeHtml(e.senderName)}</strong> is still waiting on your connection request${intent}.</p><p style="margin:0;">Accept when you're ready, or decline — either way, no hard feelings.</p>`,
		ctaLabel: "Review Request",
		ctaUrl: e.ctaUrl,
		reason:
			"This is a one-time reminder about a pending connection request on SocialSphere.",
	});
	const text =
		`${e.recipientName ? `Hi ${e.recipientName},\n\n` : ""}${e.senderName} is still waiting on your connection request${e.intentLabel ? ` for ${e.intentLabel}` : ""}.` +
		plainTextFooter(
			"This is a one-time reminder about a pending connection request on SocialSphere.",
			"Review Request",
			e.ctaUrl,
		);
	return { html, text };
}
