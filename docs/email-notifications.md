# Email Notifications (Resend + Convex)

SocialSphere sends transactional email via the official
[`@convex-dev/resend`](https://resend.com/convex) Convex component
(installed: `0.2.9`, Convex `1.32.0`).

Sender: `SocialSphere <notifications@socialspherenow.in>`
Site: `https://www.socialspherenow.in/`

## Architecture

```
public mutation (requests/messages/users)
  │  persists business op first, then ctx.scheduler.runAfter(...)
  ▼
internal scheduler (convex/emails.ts: schedule*)
  │  runAfter 0 (reminder: +48h, message digest: +5min)
  ▼
internal worker (convex/emails.ts: send*)
  │  re-validates state → checks prefs → claims notificationEvents row
  │  (dedupeKey, first-writer-wins) → resend.sendEmail(idempotencyKey)
  ▼
Resend component queue → batch → Resend API → webhook → handleEmailEvent
```

Key files:

| File | Purpose |
| --- | --- |
| `convex/convex.config.ts` | Registers the Resend component |
| `convex/schema.ts` | `users.notificationPrefs`, `users.welcomeEmailSentAt`, `notificationEvents` table |
| `convex/emailContent.ts` | Pure templates/helpers (unit-tested, no Convex imports) |
| `convex/emails.ts` | Resend instance, schedulers, workers, webhook event handler |
| `convex/http.ts` | `POST /resend-webhook` → component |
| `convex/crons.ts` | Weekly Resend retention cleanup |
| `convex/requests.ts` | Schedules request + acceptance emails |
| `convex/messages.ts` | Schedules message digest check |
| `convex/users.ts` | Schedules welcome on new-user insert; prefs get/set |
| `components/NotificationPreferences.tsx` | Profile settings toggles |
| `tests/emailContent.test.ts` | 21 unit tests (`npm test`) |

## Event flows

1. **Connection request received** — `createRequest` inserts the `pending`
   request, then schedules `scheduleConnectionRequestEmail` (immediate worker
   + one 48h reminder). Worker verifies still-`pending`, resolves the
   receiver's email from the `users` table, checks
   `notificationPrefs.connectionRequest`, claims
   `connection_request:<requestId>`, sends with subject
   `You have a new connection request on SocialSphere`, CTA → `/home`.
   Invalid/duplicate/rejected requests never mail.
2. **Connection accepted** — `acceptRequest` patches `accepted` + chat, then
   schedules. Worker verifies `accepted`, mails the *original requester*
   (subject `Your connection request was accepted!`, CTA → `/inbox`).
3. **New message** — `sendMessage` persists, then schedules with a 5-minute
   grace delay. Worker mails only recipients (never the sender, never
   system messages) that still have **unread** messages in that chat, have
   `newMessage` enabled, and got no message email for that chat in the last
   **30 minutes**. Generic digest only — **message bodies are never included**.
   Direct chats mail the other participant; group/community/event/activity
   chats resolve members, capped at 20 recipients per event. CTA → `/inbox`.
4. **Welcome** — `upsertUser` schedules only on the **insert-new-user** path.
   Worker checks `welcomeEmailSentAt` + dedupe `welcome:<workosId>` + `welcome`
   pref, so repeat logins/syncs/provisioning retries never re-send. CTA →
   `/preferences` (incomplete onboarding) or `/home`.
5. **Pending reminder** — scheduled once at request creation (`+48h`).
   Worker re-checks `status === "pending"`, `pendingReminder` pref, and claims
   `pending_reminder:<requestId>` (at most one per request). CTA → `/home`.

All workers catch provider errors, record `failed` with a sanitized summary,
and return normally — **email failure never rolls back the business op**.
`notificationEvents` rows track `type / dedupeKey / recipient / relatedId /
status / attempts / error / emailId / timestamps`.

## Environment variables (Convex server env — never `NEXT_PUBLIC_*`)

| Name | Value | Where |
| --- | --- | --- |
| `RESEND_API_KEY` | `re_...` from Resend dashboard | Convex dev + prod |
| `RESEND_WEBHOOK_SECRET` | `whsec_...` from webhook page | Convex dev + prod |
| `SITE_URL` | `https://www.socialspherenow.in` | Convex dev + prod |
| `EMAIL_FROM` | `SocialSphere <notifications@socialspherenow.in>` | Convex dev + prod |

`testMode: false` is set in code so real addresses can receive mail. Without
an API key, enqueue fails safely into `notificationEvents.status = "failed"`.

## Commands

```bash
# 1. Install (already done)
npm install

# 2. Dev env (run for your dev deployment; repeats are idempotent)
npx convex env set RESEND_API_KEY "re_..." 
npx convex env set RESEND_WEBHOOK_SECRET "whsec_..."
npx convex env set SITE_URL "https://www.socialspherenow.in"
npx convex env set EMAIL_FROM "SocialSphere <notifications@socialspherenow.in>"

# 3. Production env — same keys against the PROD deployment:
npx convex env set RESEND_API_KEY "re_..." --prod
npx convex env set RESEND_WEBHOOK_SECRET "whsec_..." --prod
npx convex env set SITE_URL "https://www.socialspherenow.in" --prod
npx convex env set EMAIL_FROM "SocialSphere <notifications@socialspherenow.in>" --prod

# 4. Run / deploy
npm run dev            # convex dev + next dev
npm test               # 21 unit tests
npx tsc --noEmit --skipLibCheck
npm run build          # next build
npx convex deploy --yes  # or: npm run build:full
```

Verify env: `npx convex env list` (and `--prod`).

## Resend setup checklist (manual)

1. Resend account → **API Keys** → create key → set `RESEND_API_KEY` (dev + prod).
2. **Domains** → add `socialspherenow.in` → add the shown SPF/DKIM/DMARC DNS
   records at your registrar → wait for `Verified`.
3. Until the domain verifies, Resend only delivers to your account email —
   use it as the controlled test recipient.
4. **Webhooks** → add endpoint
   `https://<your-deployment>.convex.site/resend-webhook`, enable all
   `email.*` events → copy secret → `RESEND_WEBHOOK_SECRET` (dev + prod).
5. Code `convex/http.ts` already mounts the handler; `convex/emails.ts`
   wires `onEmailEvent`.

> DNS verification alone does not guarantee inbox placement. Watch Resend's
> dashboard for SPF/DKIM/DMARC status, bounces, and complaints; warm up
> volume gradually.

## Testing with a controlled recipient

1. Set the API key in **dev** only; keep `testMode: false`.
2. Register/log in with an inbox you control; complete onboarding.
3. From a second account, send it a connection request → expect the request
   email within ~1–2 min (component batching).
4. Accept from the bell → requester gets the acceptance email.
5. Send a chat message, keep the recipient's inbox closed 5+ min → digest
   email (no body). Open the chat first → no email (unread check).
6. New account → exactly one welcome email.
7. Inspect: Convex dashboard → `notificationEvents` table, or
   `npx convex run emails:listRecent '{"limit":25}'`.
8. `npm test` — no real emails are sent (pure-function tests, Resend mocked
   by absence).

## Rotating the API key

1. Create the new key in Resend (keep the old one active).
2. `npx convex env set RESEND_API_KEY "re_new..."` (+ `--prod`).
3. `npx convex deploy --yes`, verify a controlled send, then revoke the old key.

## Limitations

- Welcome email triggers on first `users` insert. Accounts created before this
  deploy get **no** retroactive welcome (by design — no backfill).
- `updateNotificationPrefs` trusts the caller-supplied `workosId`, matching
  this app's existing client-auth pattern (no per-request WorkOS verification
  in Convex). A user can only affect the id they pass; server workers always
  derive recipients from DB records, never client input.
- Message "active engagement" is approximated by the 5-min delay + unread
  (`readBy`) check — there is no realtime presence system.
- Emails are **not** claimed working in production until: domain verified,
  keys set in prod, `npx convex deploy` done, webhook configured, and a real
  controlled delivery test passes.
