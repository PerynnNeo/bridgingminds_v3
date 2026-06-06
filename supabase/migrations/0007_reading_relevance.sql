-- ============================================================================
-- Reading fidelity + answer relevance metrics on the speech profile.
-- reading_accuracy_score: how faithfully the user read the onboarding passage
--   (deterministic word alignment, catches skipped/mixed-up words). 0..100.
-- on_topic_score: whether the spontaneous answer actually addressed the prompt
--   and held together (AI judged, not "is the opinion correct"). 0..100.
-- ============================================================================

alter table public.speech_profiles add column if not exists reading_accuracy_score float;
alter table public.speech_profiles add column if not exists on_topic_score float;
