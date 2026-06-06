# BridgingMinds

AI-powered speech confidence and communication practice platform for youths (13–25).
Voice onboarding → personalised speech profile → practice drills + speaking games → progress dashboard.

An optional **on-device camera layer** also coaches visual delivery (eye contact, expression, gestures) without ever uploading video.

> Speech analytics are framed as **guidance to help you practise**, not clinical assessment.

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 (App Router) + React + TypeScript |
| Styling | Tailwind CSS (pastel-green design system) |
| Database / Auth / Storage | Supabase (PostgreSQL) |
| Language AI | **Claude** (Anthropic), Haiku / Sonnet / Opus tiered |
| Speech-to-text | **AssemblyAI** (filler-word + word-timing detection) |
| Text-to-speech | Browser Web Speech API (free; pluggable) |
| Visual delivery | **MediaPipe** Face + Hand Landmarker, on-device (metrics only, no video stored) |
| Hosting | Vercel |

All AI calls run **server-side only**, API keys are never exposed to the browser.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev                  # http://localhost:3000
```

The app shell works without keys. AI/database features activate once `.env.local` is filled.

## Deployment

See **[DEPLOY.md](./DEPLOY.md)** for the full production guide: apply the Supabase migrations + seed, set the environment variables on Vercel, configure the Auth URLs, and run the post-deploy smoke test.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check (no emit) |

## Project structure

```
src/
├─ app/
│  ├─ (app)/                # Authenticated pages (noindex): home, practice, games, profile
│  ├─ page.tsx              # Public landing
│  ├─ layout.tsx            # Root layout (fonts, SEO, theme)
│  └─ globals.css
├─ components/
│  ├─ ui/                   # Button, Card, RecordButton, ScoreCard, states
│  ├─ layout/               # BottomNav
│  └─ onboarding|practice|games|dashboard|profile|tutorial/  # feature UIs
├─ config/                  # site config, usage limits
├─ lib/
│  ├─ ai/                   # Provider-agnostic AI layer (Claude + AssemblyAI)
│  ├─ supabase/             # Browser + server clients, middleware session refresh
│  ├─ tts.ts                # Browser text-to-speech
│  └─ utils.ts
├─ types/                   # Hand-authored Supabase DB types
└─ middleware.ts            # Supabase session refresh
```

## Build phases

- **Phase 0, Foundations** ✅ scaffolding, design system, AI layer, app shell
- **Phase 1, Auth + database schema** ✅ (9 tables + RLS + storage)
- **Phase 2, Voice onboarding + speech profile** ✅
- **Phase 3, Home / Stats dashboard** ✅
- **Phase 4, Practice module** ✅ (per-item AI coaching cards)
- **Phase 5, Games** ✅ (debate vs AI/friend + daily question)
- **Phase 6, Profile, usage limits, tutorial, SEO** ✅
- **Phase 7, Polish + deploy** ✅ (durable coaching cache, error boundaries, [DEPLOY.md](./DEPLOY.md))
