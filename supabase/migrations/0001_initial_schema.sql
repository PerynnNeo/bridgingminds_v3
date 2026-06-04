-- ============================================================================
-- BridgingMinds — initial schema (spec §5.2)
-- 9 core tables + auto-profile trigger + updated_at trigger.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- profiles — account details & onboarding status (§5.2.1)
-- 1:1 with auth.users
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  age_group text,
  onboarding_completed boolean not null default false,
  consent_audio_analysis boolean not null default false,
  consent_video_analysis boolean not null default false,
  consent_personalization boolean not null default false,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- onboarding_sessions — baseline recordings & transcripts (§5.2.2)
-- ----------------------------------------------------------------------------
create table public.onboarding_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reading_audio_path text,
  rapid_answer_audio_path text,
  video_path text,
  reading_transcript text,
  rapid_answer_transcript text,
  analysis_status text not null default 'pending'
    check (analysis_status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- speech_profiles — AI-generated speaking profile (§5.2.3)
-- ----------------------------------------------------------------------------
create table public.speech_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  pacing_score float,
  clarity_score float,
  fluency_score float,
  filler_word_rate float,
  pause_pattern_summary text,
  common_mispronunciations jsonb not null default '[]'::jsonb,
  confidence_cues jsonb not null default '[]'::jsonb,
  strengths text[] not null default '{}',
  focus_areas text[] not null default '{}',
  generated_summary text,
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- practice_plans — personalised improvement plans (§5.2.4)
-- ----------------------------------------------------------------------------
create table public.practice_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_title text,
  plan_summary text,
  focus_area text
    check (focus_area in ('pacing', 'pronunciation', 'fluency', 'confidence', 'filler_words')),
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- practice_items — assigned words / phrases / lines (§5.2.5)
-- ----------------------------------------------------------------------------
create table public.practice_items (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid references public.practice_plans (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_type text check (item_type in ('word', 'phrase', 'pitch', 'presentation')),
  text text not null,
  target_skill text
    check (target_skill in ('pronunciation', 'pacing', 'fluency', 'tone', 'clarity')),
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  model_audio_path text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- practice_attempts — recorded attempts & scores (§5.2.6)
-- ----------------------------------------------------------------------------
create table public.practice_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  practice_item_id uuid references public.practice_items (id) on delete set null,
  audio_path text,
  video_path text,
  transcript text,
  clarity_score float,
  pacing_score float,
  pronunciation_score float,
  filler_word_count integer,
  feedback text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- game_sessions — debate & daily question responses (§5.2.7)
-- ----------------------------------------------------------------------------
create table public.game_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_type text check (game_type in ('debate', 'daily_question')),
  mode text check (mode in ('solo_ai', 'friend_same_device', 'solo_prompt')),
  prompt text,
  transcript text,
  audio_path text,
  video_path text,
  structure_score float,
  clarity_score float,
  pacing_score float,
  confidence_score float,
  feedback text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- daily_questions — spin-the-wheel prompts (§5.2.8)
-- ----------------------------------------------------------------------------
create table public.daily_questions (
  id uuid primary key default uuid_generate_v4(),
  category text check (category in ('school', 'fun', 'pitch', 'opinion', 'storytelling')),
  question_text text not null,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- progress_metrics — daily progress summaries (§5.2.9)
-- ----------------------------------------------------------------------------
create table public.progress_metrics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null default current_date,
  total_recordings integer not null default 0,
  avg_clarity_score float,
  avg_pacing_score float,
  avg_pronunciation_score float,
  filler_word_rate float,
  streak_count integer not null default 0,
  most_improved_skill text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ----------------------------------------------------------------------------
-- Indexes on foreign keys used by the dashboard & lookups
-- ----------------------------------------------------------------------------
create index idx_onboarding_sessions_user on public.onboarding_sessions (user_id);
create index idx_speech_profiles_user on public.speech_profiles (user_id);
create index idx_practice_plans_user on public.practice_plans (user_id);
create index idx_practice_items_user on public.practice_items (user_id);
create index idx_practice_items_plan on public.practice_items (plan_id);
create index idx_practice_attempts_user on public.practice_attempts (user_id);
create index idx_practice_attempts_item on public.practice_attempts (practice_item_id);
create index idx_game_sessions_user on public.game_sessions (user_id);
create index idx_progress_metrics_user_date on public.progress_metrics (user_id, date);

-- ----------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up.
-- Reads optional signup metadata (full_name, age_group, consent flags).
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id, email, full_name, age_group,
    consent_audio_analysis, consent_video_analysis, consent_personalization
  )
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'age_group', ''),
    coalesce((new.raw_user_meta_data ->> 'consent_audio_analysis')::boolean, false),
    coalesce((new.raw_user_meta_data ->> 'consent_video_analysis')::boolean, false),
    coalesce((new.raw_user_meta_data ->> 'consent_personalization')::boolean, false)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Keep speech_profiles.updated_at fresh on update.
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger speech_profiles_set_updated_at
  before update on public.speech_profiles
  for each row execute function public.set_updated_at();
