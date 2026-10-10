# AGENTS.md

This repository is the SocialSphere web app. Use the project docs in [README.md](README.md) as the primary source for setup, feature intent, and deployment details.

## Project architecture

- Next.js 15 App Router with React 19 in the app directory
- TypeScript throughout
- Convex is the source of truth for persistence, queries, mutations, and matching logic
- WorkOS AuthKit handles authentication and redirect flow
- Shared UI lives in `components/`; auth helpers live in `lib/`; route groups are organized under `app/`

### Key boundaries

- `app/(app)` contains authenticated screens such as `/home`, `/explore`, `/inbox`, `/profile`, `/preferences`, and `/help`
- `app/login` and `app/callback` are auth entry points
- `convex/` contains schema, server functions, and matching logic
- `convex/_generated/` is generated code; do not hand-edit it
- `public/` contains static assets; prefer existing patterns over adding ad hoc assets

## Development workflow

Use the package scripts from [package.json](package.json):

- `npm install`
- `npm run dev` to run Next.js and Convex together
- `npm run lint` for Biome checks
- `npm run lint:fix` for targeted autofixes
- `npm run format` for formatting
- `npm run build` for Next.js production build
- `npm run build:full` for Convex deploy + build

## Coding conventions

- Follow the existing Next.js App Router patterns and route-group organization
- Keep UI changes consistent with the current Tailwind-based design system
- Prefer server-side validation and filtering in Convex for anything that affects user matching, access, onboarding, or requests
- Respect the app’s preference/onboarding flow: new users must complete the required onboarding before core features are unlocked
- Do not bypass backend matching rules from the client; matching logic should remain authoritative in Convex
- When modifying auth, user sync, or onboarding flows, inspect neighboring files in `app/`, `components/`, and `convex/` before changing behavior

## Safety and implementation notes

- Treat auth and protected route logic as sensitive; model flows after the existing WorkOS + Convex integration
- Keep changes minimal and aligned with the project’s comfort-first social app behavior
- Before finalizing a task, run the relevant verification command(s), especially `npm run lint` when changing TypeScript or UI code

## Useful references

- [README.md](README.md) for app overview and environment setup
- [package.json](package.json) for scripts and dependencies
- `convex/schema.ts` for database structure
- `convex/*.ts` for domain logic and matching behavior
