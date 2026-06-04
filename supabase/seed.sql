-- ============================================================================
-- Seed data, spin-the-wheel daily questions (spec §10.3.2).
-- Safe to re-run: skips rows whose question_text already exists.
-- ============================================================================

insert into public.daily_questions (category, question_text, difficulty)
select v.category, v.question_text, v.difficulty
from (values
  ('fun',          'What is one app you would invent?',                 'easy'),
  ('fun',          'If you could have any superpower, what would it be and why?', 'easy'),
  ('school',       'Should school start later in the morning?',         'medium'),
  ('school',       'What is one thing you would change about school?',  'medium'),
  ('storytelling', 'Tell us about a hobby you enjoy.',                  'easy'),
  ('storytelling', 'Describe a time you felt proud of yourself.',       'medium'),
  ('pitch',        'Convince someone to try your favourite food.',      'medium'),
  ('pitch',        'Pitch your favourite movie in 30 seconds.',         'hard'),
  ('opinion',      'Why do you think teamwork is important?',           'medium'),
  ('opinion',      'Is it better to be a leader or a team member?',     'hard')
) as v (category, question_text, difficulty)
where not exists (
  select 1 from public.daily_questions d where d.question_text = v.question_text
);
