# Supabase setup

One-time setup to activate auth + database for BridgingMinds.

## 1. Apply the database schema

**Option A, Dashboard (simplest).** In your Supabase project → **SQL Editor**, paste and run each file **in order**:

1. `migrations/0001_initial_schema.sql`, 9 tables, triggers
2. `migrations/0002_row_level_security.sql`, RLS policies
3. `migrations/0003_storage.sql`, private `recordings` bucket + policies
4. `seed.sql`, starter daily questions

**Option B, CLI.**

```bash
supabase link --project-ref <your-project-ref>
supabase db push          # applies migrations/
# then run seed.sql once in the SQL editor (or `supabase db reset` locally)
```

## 2. Configure Auth

In **Authentication → Sign In / Providers → Email**:

- **For fast MVP testing:** turn **off** "Confirm email" so signups log in immediately and land on onboarding.
- **To keep email confirmation on:** in **Authentication → URL Configuration**, set
  - **Site URL** → `http://localhost:3000` (and your Vercel URL later)
  - **Redirect URLs** → add `http://localhost:3000/**`
  - Then edit the **Confirm signup** email template's link to:
    `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`
    (handled by `src/app/auth/confirm/route.ts`).

## 3. Environment variables

Copy `../.env.example` → `../.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=        # Project Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Project Settings → API → anon public key
SUPABASE_SERVICE_ROLE_KEY=       # Project Settings → API → service_role key (keep secret)
```

## 4. Verify

1. `npm run dev` → open `/signup`, create an account.
2. A row should appear in **Table Editor → profiles** (created by the `handle_new_user` trigger).
3. After signup you land on `/onboarding`; tap **Skip for now** (temporary) → you reach `/home`.
4. Visiting `/home` while signed out should redirect to `/login`.

## Security notes (spec §12.7)

- RLS ensures every user can only read/write their own rows (SP5).
- The `recordings` storage bucket is **private**; files live under `<user_id>/…` and are only accessible to that user (SP6).
- Service-role key is server-only, never exposed to the browser (SP4).
