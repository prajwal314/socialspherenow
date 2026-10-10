// Unit tests for the pure email-content module.
// Server-side guards (auth, prefs enforcement, unread checks, scheduling) are
// covered by design + manual verification documented in
// docs/email-notifications.md. These tests lock the safety-critical pure
// logic: escaping, idempotency keys, cooldowns, subjects, CTAs, and body
// privacy. Resend is never touched here (no network, no secrets).
import { describe, expect, it } from "vitest";
import {
	MESSAGE_EMAIL_COOLDOWN_MS,
	REMINDER_DELAY_MS,
	connectionAcceptedEmailSubject,
	connectionRequestEmailSubject,
	dedupeKeyFor,
	escapeHtml,
	newMessageEmailSubject,
	reminderEmailSubject,
	renderConnectionAcceptedEmail,
	renderConnectionRequestEmail,
	renderNewMessageEmail,
	renderReminderEmail,
	renderWelcomeEmail,
	shouldSendMessageEmail,
	welcomeEmailSubject,
} from "../convex/emailContent";

describe("escapeHtml", () => {
	it("escapes script injection", () => {
		expect(escapeHtml('<script>alert("x")</script>')).toBe(
			"&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
		);
	});
	it("escapes ampersands, quotes and apostrophes", () => {
		expect(escapeHtml(`a&b"c'd<e>f`)).toBe(
			"a&amp;b&quot;c&#39;d&lt;e&gt;f",
		);
	});
	it("handles null/undefined/empty safely", () => {
		expect(escapeHtml(null)).toBe("");
		expect(escapeHtml(undefined)).toBe("");
		expect(escapeHtml("")).toBe("");
	});
});

describe("dedupe keys (retry safety)", () => {
	it("is deterministic for the same event", () => {
		expect(dedupeKeyFor("connection_request", ["req1"])).toBe(
			dedupeKeyFor("connection_request", ["req1"]),
		);
	});
	it("differs across requests (no cross-talk)", () => {
		expect(dedupeKeyFor("connection_request", ["a"])).not.toBe(
			dedupeKeyFor("connection_request", ["b"]),
		);
	});
	it("differs across notification types for the same id", () => {
		// A request email and its acceptance must never collapse into one send.
		expect(dedupeKeyFor("connection_request", ["r1"])).not.toBe(
			dedupeKeyFor("connection_accepted", ["r1"]),
		);
	});
	it("welcome key is stable per account (send-once)", () => {
		expect(dedupeKeyFor("welcome", ["user_1"])).toBe("welcome:user_1");
	});
	it("reminder key is stable per request (at most one reminder)", () => {
		expect(dedupeKeyFor("pending_reminder", ["req9"])).toBe(
			"pending_reminder:req9",
		);
	});
	it("message digest key buckets by cooldown window", () => {
		const t1 = 1_000;
		const t2 = 1_000 + Math.floor(MESSAGE_EMAIL_COOLDOWN_MS / 2);
		const w1 = Math.floor(t1 / MESSAGE_EMAIL_COOLDOWN_MS);
		const w2 = Math.floor(t2 / MESSAGE_EMAIL_COOLDOWN_MS);
		expect(w1).toBe(w2);
		expect(dedupeKeyFor("new_message", ["c1", "u1", w1])).toBe(
			dedupeKeyFor("new_message", ["c1", "u1", w2]),
		);
		expect(dedupeKeyFor("new_message", ["c1", "u1", w1])).not.toBe(
			dedupeKeyFor("new_message", ["c1", "u1", w1 + 1]),
		);
	});
});

describe("message cooldown", () => {
	it("sends when never sent before", () => {
		expect(shouldSendMessageEmail(null, Date.now())).toBe(true);
		expect(shouldSendMessageEmail(undefined, Date.now())).toBe(true);
	});
	it("suppresses within the cooldown window", () => {
		const now = 10_000_000;
		expect(
			shouldSendMessageEmail(now - MESSAGE_EMAIL_COOLDOWN_MS + 1_000, now),
		).toBe(false);
	});
	it("sends again after the cooldown expires", () => {
		const now = 10_000_000;
		expect(
			shouldSendMessageEmail(now - MESSAGE_EMAIL_COOLDOWN_MS - 1, now),
		).toBe(true);
	});
});

describe("subjects", () => {
	it("uses the approved copy", () => {
		expect(connectionRequestEmailSubject()).toBe(
			"You have a new connection request on SocialSphere",
		);
		expect(connectionAcceptedEmailSubject()).toBe(
			"Your connection request was accepted!",
		);
		expect(newMessageEmailSubject()).toBe(
			"You have a new message on SocialSphere",
		);
		expect(welcomeEmailSubject()).toBe("Welcome to SocialSphere!");
		expect(reminderEmailSubject()).toBe(
			"A connection request is waiting for you",
		);
	});
	it("reveals nothing sensitive", () => {
		for (const s of [
			connectionRequestEmailSubject(),
			connectionAcceptedEmailSubject(),
			newMessageEmailSubject(),
			welcomeEmailSubject(),
			reminderEmailSubject(),
		]) {
			expect(s).not.toMatch(/@/);
		}
	});
});

describe("templates", () => {
	it("connection request: names sender, links /home, escapes input", () => {
		const { html, text } = renderConnectionRequestEmail({
			recipientName: "B <b>",
			senderName: 'A <img src=x onerror=alert(1)>',
			intentLabel: "Coffee Buddy",
			ctaUrl: "https://www.socialspherenow.in/home",
		});
		expect(html).toContain("View Connection Request");
		expect(html).toContain("https://www.socialspherenow.in/home");
		expect(html).toContain("Coffee Buddy");
		expect(html).not.toContain("<img src=x");
		expect(html).not.toContain("<b>");
		expect(text).toContain("View Connection Request");
	});
	it("accepted: links /inbox", () => {
		const { html } = renderConnectionAcceptedEmail({
			accepterName: "B",
			ctaUrl: "https://www.socialspherenow.in/inbox",
		});
		expect(html).toContain("Start Chatting");
		expect(html).toContain("/inbox");
	});
	it("new message: generic digest, never includes the body", () => {
		const secretBody = "supersecret-message-body-12345";
		const { html, text } = renderNewMessageEmail({
			recipientName: "R",
			senderName: "S",
			ctaUrl: "https://www.socialspherenow.in/inbox",
			unreadCount: 3,
		});
		expect(html).toContain("Open Inbox");
		expect(html).not.toContain(secretBody);
		expect(text).not.toContain(secretBody);
		expect(html).toContain("3 unread messages");
	});
	it("welcome: links onboarding, renders without a name", () => {
		const { html } = renderWelcomeEmail({
			ctaUrl: "https://www.socialspherenow.in/preferences",
		});
		expect(html).toContain("Complete Your Profile");
		expect(html).toContain("/preferences");
	});
	it("reminder: one-time copy, links /home", () => {
		const { html, text } = renderReminderEmail({
			senderName: "A",
			ctaUrl: "https://www.socialspherenow.in/home",
		});
		expect(html).toContain("Review Request");
		expect(text).toContain("one-time reminder");
	});
	it("all templates include footer + website", () => {
		const all = [
			renderConnectionRequestEmail({
				senderName: "A",
				ctaUrl: "https://www.socialspherenow.in/home",
			}),
			renderConnectionAcceptedEmail({
				accepterName: "B",
				ctaUrl: "https://www.socialspherenow.in/inbox",
			}),
			renderNewMessageEmail({
				senderName: "S",
				ctaUrl: "https://www.socialspherenow.in/inbox",
			}),
			renderWelcomeEmail({ ctaUrl: "https://www.socialspherenow.in/home" }),
			renderReminderEmail({
				senderName: "A",
				ctaUrl: "https://www.socialspherenow.in/home",
			}),
		];
		for (const t of all) {
			expect(t.html).toContain("socialspherenow.in");
			expect(t.text).toContain("socialspherenow.in");
		}
	});
	it("reminder default delay is 48h", () => {
		expect(REMINDER_DELAY_MS).toBe(48 * 60 * 60 * 1000);
	});
});
