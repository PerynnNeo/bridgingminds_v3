-- ============================================================================
-- Durable coaching cache (Phase 7, production readiness).
-- generateItemCoaching() memoises results in-process, but that cache does NOT
-- survive serverless cold starts (each Vercel invocation is a fresh instance).
-- So coaching cards are also persisted here, keyed by a content + speech-profile
-- signature. The payload is non-sensitive coaching text (no raw recordings, no
-- PII, just scores rounded into a signature), so it is shared read/write across
-- authenticated users to maximise cache hits and cut Claude spend.
-- ============================================================================

create table if not exists public.coaching_cache (
  signature  text primary key,
  payload    jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.coaching_cache enable row level security;

-- Shared cache: any signed-in user can read and write entries.
create policy "coaching_cache_read" on public.coaching_cache
  for select to authenticated
  using (true);

create policy "coaching_cache_insert" on public.coaching_cache
  for insert to authenticated
  with check (true);

create policy "coaching_cache_update" on public.coaching_cache
  for update to authenticated
  using (true)
  with check (true);
