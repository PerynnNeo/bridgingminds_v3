-- ============================================================================
-- Visual delivery baseline on the speech profile (Camera module, C3).
-- Onboarding now (optionally) measures a visual delivery baseline. Storing it on
-- the canonical speech_profiles row keeps the profile self-contained for the
-- dashboard, coaching personalisation, and the speech-profile screen.
-- ============================================================================

alter table public.speech_profiles add column if not exists visual_metrics jsonb;
alter table public.speech_profiles add column if not exists visual_summary text;
