# SocialSphere

SocialSphere is a comfort-first social app for finding activity partners, joining communities, discovering events, and building connections at a user-controlled pace.

## Stack

- Next.js 15 App Router and React 19
- TypeScript
- Convex for the database, queries, and mutations
- WorkOS AuthKit for authentication
- Tailwind CSS and Biome
- Three.js for the animated background and black-hole hero

## Features

- WorkOS sign-in and automatic Convex user synchronization
- Required five-step preference onboarding for new users
- Profile editing for interests, activities, availability, comfort, and personality
- Preference-aware activity suggestions and connection requests
- Activity-specific matching with availability and flexible-answer support
- Real-time connection requests, direct chats, events, and communities
- Community group management and image uploads through Convex Storage

## Project Structure

The active authenticated routes are grouped under `app/(app)`:

- `/home` - suggestions, requests, events, and communities
- `/explore` - activity searches and communities
- `/inbox` - chats and messages
- `/profile` - profile and preference editing
- `/preferences` - required first-login onboarding
- `/help` - FAQs and feedback

Convex functions and the schema live in `convex/`. Shared UI is in `components/`, and authentication helpers are in `lib/`.

## Setup

Requirements: Node.js 20 or newer and a Convex deployment.

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.local.example` to `.env.local` and provide:

```env
WORKOS_CLIENT_ID=client_...
WORKOS_API_KEY=sk_...
WORKOS_COOKIE_PASSWORD=<at least 32 characters>
NEXT_PUBLIC_CONVEX_URL=https://<deployment>.convex.cloud
WORKOS_REDIRECT_URI=http://localhost:3000/callback
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. Configure the matching WorkOS redirect URI and Convex environment variables for the deployment.

## Development

Run Next.js and Convex together:

```bash
npm run dev
```

Open `http://localhost:3000` in a browser. After authentication, a new user is synchronized to Convex and redirected to preference onboarding before accessing the app.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start Next.js and Convex development servers |
| `npm run build` | Build the Next.js application |
| `npm run build:full` | Deploy Convex, then build Next.js |
| `npm run convex:deploy` | Deploy Convex functions and schema |
| `npm run start` | Start the production server |
| `npm run lint` | Check source with Biome |
| `npm run lint:fix` | Apply Biome fixes |
| `npm run format` | Format source with Biome |

## Matching Behavior

Connection suggestions are filtered on the Convex side. A candidate must match the viewer's relevant onboarding activity or intent, have compatible availability when both users provide it, and satisfy activity-specific search answers when both users have answered them. Manual requests are checked by the same server-side matcher, so the UI cannot bypass the preference rules.