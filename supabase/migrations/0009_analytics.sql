-- ============================================================================
-- Product analytics: a flexible event log + lightweight session tracking.
-- Users can only write/read their OWN rows; the founder metrics page reads
-- across everyone via the service-role key (bypasses RLS).
-- ============================================================================

-- Generic event log (login_reason, upgrade_reason, and any future events).
create table if not exists public.analytics_events (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references public.profiles (id) on delete cascade,
  event      text not null,
  properties jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_event_idx on public.analytics_events (event, created_at desc);
create index if not exists analytics_events_user_idx on public.analytics_events (user_id);

alter table public.analytics_events enable row level security;

create policy "analytics_events_insert_own" on public.analytics_events
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "analytics_events_select_own" on public.analytics_events
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Time-in-app: one row per visit (client-generated id), refreshed by a heartbeat.
create table if not exists public.usage_sessions (
  id           uuid primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  started_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists usage_sessions_user_idx on public.usage_sessions (user_id, started_at desc);

alter table public.usage_sessions enable row level security;

create policy "usage_sessions_owner" on public.usage_sessions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
