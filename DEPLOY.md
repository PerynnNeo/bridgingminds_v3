# Deploying BridgingMinds

This guide takes a fresh clone to a live production deployment on **Vercel** (hosting) + **Supabase** (database, auth, storage), with **Claude** and **AssemblyAI** as the AI providers.

Estimated time: 30 to 45 minutes.

---

## 1. Accounts and keys you need

| Service | What for | Where to get the key |
| --- | --- | --- |
| **Anthropic (Claude)** | Speech analysis, feedback, coaching, debate AI | https://console.anthropic.com/settings/keys |
| **AssemblyAI** | Speech to text + filler-word detection | https://www.assemblyai.com/app/account |
| **Supabase** | Postgres, Auth, Storage | Project Settings to API |
| **Vercel** | Hosting | Connect your Git provider |

> Security: if any key has ever been pasted into a chat, an email, or a screenshot, rotate it before going live. (The Anthropic key shared during development should be rotated.)

---

## 2. Supabase setup

### 2.1 Create the project
1. Create a new project at https://supabase.com/dashboard. Pick a strong database password and a region close to your users.
2. Wait for it to finish provisioning.

### 2.2 Apply the schema, security, and seed
Run the SQL files in `supabase/migrations/` **in order**, then the seed. Two options:

**Option A: SQL editor (no CLI).** Open Dashboard to SQL Editor and paste/run each file in this order:
1. `migrations/0001_initial_schema.sql` (9 tables + `handle_new_user` trigger)
2. `migrations/0002_row_level_security.sql` (RLS: every user sees only their own rows)
3. `migrations/0003_storage.sql` (private `recordings` bucket + policies)
4. `migrations/0004_coaching_cache.sql` (durable AI coaching cache)
5. `migrations/0005_visual_analysis.sql` (camera module: visual_analysis_results + camera columns)
6. `migrations/0006_profile_visual_baseline.sql` (visual baseline on the speech profile)
7. `seed.sql` (daily-question content)

**Option B: Supabase CLI.**
```bash
supabase link --project-ref <your-ref>
supabase db push          # applies everything in migrations/
# then run seed.sql once via the SQL editor or psql
```

### 2.3 Verify
- **Table editor**: you should see `profiles`, `speech_profiles`, `practice_items`, `game_sessions`, `coaching_cache`, etc.
- **Authentication to Policies**: every table shows RLS enabled.
- **Storage**: a private bucket named `recordings` exists.
- **Database to Triggers**: `on_auth_user_created` calls `handle_new_user` (this auto-creates a `profiles` row on signup; if it is missing, new users get "profile not found" errors).

### 2.4 Auth configuration
Authentication to URL Configuration:
- **Site URL**: your production URL (e.g. `https://bridgingminds.app`). Use the Vercel URL first, then your custom domain once attached.
- **Redirect URLs**: add the same origin (and your `*.vercel.app` preview origin if you use preview auth).
- Authentication to Providers: keep **Email** enabled. Decide whether to require email confirmation (recommended for production).

### 2.5 Grab the API keys
Project Settings to API:
- `Project URL` to `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key to `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key to `SUPABASE_SERVICE_ROLE_KEY` (server only, never expose to the browser)

---

## 3. Environment variables

The full set (see `.env.example`):

```
ANTHROPIC_API_KEY=          # Claude
ASSEMBLYAI_API_KEY=         # speech to text
NEXT_PUBLIC_SUPABASE_URL=   # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # server only
NEXT_PUBLIC_SITE_URL=       # https://your-domain  (used for SEO, Open Graph, sitemap)
```

`NEXT_PUBLIC_*` values are exposed to the browser by design. Everything else is server only.

---

## 4. Deploy to Vercel

1. **Import** the repository at https://vercel.com/new. Vercel auto-detects Next.js (no build-setting changes needed: build `next build`, output handled automatically).
2. **Environment Variables**: add every variable from section 3 for the **Production** environment (and **Preview** if you want preview deploys to work). Set `NEXT_PUBLIC_SITE_URL` to the domain you will use.
3. **Deploy.** First build takes a couple of minutes.
4. **Custom domain** (optional): Project Settings to Domains. After attaching it, update `NEXT_PUBLIC_SITE_URL` and the Supabase Auth Site URL / Redirect URLs to match, then redeploy.

### Runtime notes
- The AI routes (`/api/onboarding/analyze`, `/api/practice/*`, `/api/games/*`) declare `runtime = 'nodejs'` and a `maxDuration` (30 to 60s). On Vercel Hobby the function timeout caps at 60s; onboarding analysis (Opus + thinking) is the longest call. If you see timeouts, upgrade the plan or lower `maxTokens` in `src/lib/ai/analyze.ts`.

---

## 5. Post-deploy smoke test (Definition of Done)

Walk the full loop on the live site:
1. **Sign up** to a `profiles` row is created automatically to redirected into onboarding.
2. **Onboarding**: read the passage + answer the question to a speech profile + personalised plan generate.
3. **Home**: scores, streak, and "today's focus" render.
4. **Practice**: open a category to a per-item coaching card loads to record to feedback with scores.
5. **Games**: Daily question spin to record to feedback; Debate (vs AI) prep to argument to counterpoint to feedback.
6. **Profile**: toggle a consent switch (persists), retake onboarding, replay tutorial.
7. **SEO**: `/{robots.txt,sitemap.xml,opengraph-image}` all return 200.

Recording needs **HTTPS + microphone permission** (both fine on the Vercel domain).

---

## 6. Optional production add-ons

### Vercel Analytics (privacy-friendly, zero-config)
```bash
npm i @vercel/analytics
```
Then add to `src/app/layout.tsx`:
```tsx
import { Analytics } from '@vercel/analytics/react';
// ...inside <body>, after {children}:
<Analytics />
```

### Error reporting (Sentry)
`src/app/error.tsx` and `src/app/global-error.tsx` already have a `console.error` hook where a report belongs. To wire Sentry: `npx @sentry/wizard@latest -i nextjs`, then call `Sentry.captureException(error)` inside those `useEffect`s.

---

## 7. Operating notes
- **Usage limits** live in `src/config/limits.ts` (practice attempts/day, debate/day, daily question/day). Tune them to your Claude/AssemblyAI budget.
- **Model tiers** are in `src/lib/ai/anthropic.ts` (Haiku for fast feedback, Sonnet default, Opus for deep onboarding). Drop to cheaper tiers to cut cost.
- **Coaching cache**: `coaching_cache` (migration 0004) persists generated coaching across cold starts and users, cutting repeat Claude calls. Safe to `truncate` if you change the coaching prompt (or bump the `v3|` signature prefix in `src/lib/ai/coaching.ts`).
- **Privacy**: recordings live in a private bucket; RLS keeps every user's data isolated; authenticated pages are disallowed in `robots.txt`.

### Camera / visual delivery
- **On-device only**: visual analysis (eye contact, expression, head steadiness, gesture, lighting) runs in the browser via MediaPipe. **No video is ever uploaded or stored**, only the numeric metrics and the friendly feedback text. Claude never receives the face.
- **HTTPS required**: the camera needs a secure context. It works on `localhost` and on any HTTPS domain (Vercel), but not over a plain-HTTP LAN address.
- **Consent-gated**: the camera only appears once a user turns on **Video analysis** (the onboarding "Use my camera" choice or the Profile toggle). Everything has a built-in audio-only fallback.
- **Scope**: camera is offered in onboarding, the Presentation / Pitch / Quick-thinking practice categories (not single-word pronunciation), the daily question, and debate vs AI. Debate friend mode is audio-only.
- **Performance**: two MediaPipe models (face + hands) run at a low frame rate; the hand model is throttled to half-rate. The WASM + models load from a CDN on first use (a few MB, cached after).
- **Diagnostic**: `/camera-check` is an on-device test page (noindex) for confirming the camera + metrics work on a given device. You can delete `src/app/camera-check/` before a public launch if you prefer.

---

## 8. Troubleshooting
| Symptom | Cause / fix |
| --- | --- |
| "Could not find table public.profiles" or stuck redirect to onboarding | The `handle_new_user` trigger did not run (migrations not applied, or the account predates it). Re-run `0001`, and backfill the missing `profiles` row. |
| Login succeeds then bounces back | Supabase Auth **Site URL / Redirect URLs** do not match the deployed origin. |
| AI routes 500 with a timeout | Function exceeded `maxDuration`. Upgrade plan or lower `maxTokens`. |
| Microphone blocked | Must be served over HTTPS (Vercel is) and the user must grant mic permission. |
| OG image / canonical URLs wrong | `NEXT_PUBLIC_SITE_URL` not set to the production domain. |
