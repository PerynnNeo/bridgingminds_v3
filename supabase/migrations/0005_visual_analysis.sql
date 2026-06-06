-- ============================================================================
-- Visual delivery analysis (Camera module, C2).
-- METRICS-ONLY: analysis runs on-device (MediaPipe in the browser); we store
-- only numeric delivery metrics and the friendly feedback text. No raw video is
-- uploaded or stored. These are controllable delivery cues, never emotion or
-- appearance. (The pre-existing video_path columns stay unused in this mode.)
-- ============================================================================

-- One row per analysed clip (used for dashboard aggregation).
create table if not exists public.visual_analysis_results (
  id                          uuid primary key default uuid_generate_v4(),
  user_id                     uuid not null references public.profiles (id) on delete cascade,
  activity_type               text not null,  -- onboarding | practice | debate | daily_question
  activity_id                 uuid,           -- linked session / attempt id (nullable)
  eye_contact_ratio           float,
  face_visibility_ratio       float,
  framing_score               float,
  head_stability_score        float,
  expression_variation_score  float,
  mouth_visibility_score      float,
  lighting_quality_score      float,
  gesture_balance_score       float,          -- reserved: gesture analysis is a later pass
  delivery_presence_score     float,
  feedback_summary            text,
  created_at                  timestamptz not null default now()
);

create index if not exists visual_analysis_results_user_idx
  on public.visual_analysis_results (user_id, created_at desc);

alter table public.visual_analysis_results enable row level security;

create policy "visual_analysis_results_owner" on public.visual_analysis_results
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Optional camera fields on the existing recording tables.
alter table public.onboarding_sessions add column if not exists camera_enabled boolean not null default false;
alter table public.onboarding_sessions add column if not exists visual_metrics jsonb;
alter table public.onboarding_sessions add column if not exists combined_feedback jsonb;

alter table public.practice_attempts add column if not exists camera_enabled boolean not null default false;
alter table public.practice_attempts add column if not exists visual_metrics jsonb;
alter table public.practice_attempts add column if not exists combined_feedback jsonb;

alter table public.game_sessions add column if not exists camera_enabled boolean not null default false;
alter table public.game_sessions add column if not exists visual_metrics jsonb;
alter table public.game_sessions add column if not exists combined_feedback jsonb;
