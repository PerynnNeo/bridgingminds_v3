-- ============================================================================
-- Row Level Security (spec §12.7 SP1–SP6)
-- Every user can only read/write their OWN rows. Personal speech data is
-- never accessible to other users. daily_questions are shared read-only
-- content; admins manage them.
-- `(select auth.uid())` is wrapped in a subselect — the recommended pattern
-- so Postgres evaluates it once per query, not once per row.
-- ============================================================================

alter table public.profiles            enable row level security;
alter table public.onboarding_sessions enable row level security;
alter table public.speech_profiles     enable row level security;
alter table public.practice_plans      enable row level security;
alter table public.practice_items      enable row level security;
alter table public.practice_attempts   enable row level security;
alter table public.game_sessions       enable row level security;
alter table public.daily_questions     enable row level security;
alter table public.progress_metrics    enable row level security;

-- ---- profiles ---------------------------------------------------------------
-- Insert is performed by the security-definer trigger (bypasses RLS).
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---- user-owned tables: full ownership over own rows ------------------------
create policy "onboarding_sessions_owner" on public.onboarding_sessions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "speech_profiles_owner" on public.speech_profiles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "practice_plans_owner" on public.practice_plans
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "practice_items_owner" on public.practice_items
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "practice_attempts_owner" on public.practice_attempts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "game_sessions_owner" on public.game_sessions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "progress_metrics_owner" on public.progress_metrics
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---- daily_questions: shared read-only content; admins manage ---------------
create policy "daily_questions_read" on public.daily_questions
  for select to authenticated
  using (true);

create policy "daily_questions_admin_write" on public.daily_questions
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
    )
  );
