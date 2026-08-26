# SocialSphere Now

A modern social networking platform built with Next.js 15, React 19, and Convex for real-time data.

## Project Overview

SocialSphere Now is a full-featured social platform enabling users to create communities, share events, and connect with others in real-time. The application leverages modern web technologies for performance, scalability, and developer experience.

## Tech Stack

- **Framework**: Next.js 15.5.12 (React framework with App Router)
- **Language**: TypeScript 5.8.0
- **UI Library**: React 19.2.0 + React DOM 19.2.0
- **Styling**: Tailwind CSS 4.1.18 with PostCSS and Autoprefixer
- **Backend**: Convex (real-time database with serverless functions)
- **Authentication**: @workos-inc/authkit-nextjs (OAuth/SAML authentication)
- **Build Tool**: Turbopack (Next.js development server)
- **Linting & Formatting**: Biome 2.4.6
- **Concurrency**: concurrently (for running dev servers)

## Key Features

- Real-time community creation and management
- Event scheduling and discovery
- User profiles and networking
- Protected routes and authentication
- Responsive design with modern UI

## Getting Started

```bash
# Install dependencies
npm install

# Start development server (convex + next)
npm run dev

# Build for production
npm run build
```

## Available Scripts

- `dev` - Start development with Convex and Next.js
- `build` - Build production Next.js app
- `build:full` - Deploy Convex and build
- `convex:deploy` - Deploy Convex backend
- `start` - Start production server
- `lint` - Run Biome linting
- `format` - Format code with Biome