# Better Scroll

Better Scroll is an AI-powered reel app that turns saved knowledge into short, scrollable video briefings. The MVP focuses on research papers first, then expands into browser bookmarks, YouTube watch lists, saved HTML pages, PDFs, and other knowledge sources.

The app is designed around a pre-generated content workflow: agents run on a schedule, process the user's saved sources, generate scripts, and deliver a limited set of short videos for the next day. For the initial demo, the system targets 10 generated videos.

## MVP Architecture

### App Experience

- Web frontend as the primary app surface
- Expo-compatible mobile fallback for deployment flexibility
- Scroll-based reel interface for AI-generated video content
- Pre-generated feed instead of fully real-time generation

### Agent Workflow

- Cloud-managed agents run at predetermined times
- Initial workflow target: 12am processing with 6am video delivery
- Agents scrape, summarize, and transform source material into video scripts
- Google Grounding Search is used for managed research and enrichment
- Gemini handles link processing and content extraction

### Knowledge Sources

- Browser bookmarks are the primary input, starting from exported HTML files
- Research papers and PDFs are the first content focus
- HTML pages, including social media bookmarks, are planned next
- YouTube videos from watch lists are supported as a later source type
- Chat memory integration is a future consideration

### Video Pipeline

- Script generation feeds the video creation workflow
- Veo3 generates clips with an 8-second maximum per clip
- The MVP may use 4 parallel calls to create roughly 24-30 second reels
- Sequential generation may be explored for better context continuity

### Storage And Infrastructure

- Local storage is used for the first MVP
- GCP credits are available for future cloud storage
- Google Drive is the simplest planned cloud storage option
- Agent management runs in a cloud environment
- The architecture remains compatible with Expo app deployment

## Tech Stack

- **TypeScript** - For type safety and improved developer experience
- **Next.js** - Full-stack React framework
- **React Native** - Build mobile apps using React
- **Expo** - Tools for React Native development
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **oRPC** - End-to-end type-safe APIs with OpenAPI integration
- **Drizzle** - TypeScript-first ORM
- **SQLite/Turso** - Database engine
- **Oxlint** - Oxlint + Oxfmt (linting & formatting)
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Database Setup

This project uses SQLite with Drizzle ORM.

1. Start the local SQLite database (optional):

```bash
bun run db:local
```

2. Update your `.env` file in the `apps/web` directory with the appropriate connection details if needed.

3. Apply the schema to your database:

```bash
bun run db:push
```

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the fullstack application.
Use the Expo Go app to run the mobile application.

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@my-better-t-app/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Git Hooks and Formatting

- Format and lint fix: `bun run check`

## Project Structure

```
my-better-t-app/
├── apps/
│   └── web/         # Fullstack application (Next.js)
│   ├── native/      # Mobile application (React Native, Expo)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── api/         # API layer / business logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run check-types`: Check TypeScript types across all apps
- `bun run dev:native`: Start the React Native/Expo development server
- `bun run db:push`: Push schema changes to database
- `bun run db:generate`: Generate database client/types
- `bun run db:migrate`: Run database migrations
- `bun run db:studio`: Open database studio UI
- `bun run db:local`: Start the local SQLite database
- `bun run check`: Run Oxlint and Oxfmt
