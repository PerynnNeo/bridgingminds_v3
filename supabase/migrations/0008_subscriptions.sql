-- ============================================================================
-- Subscriptions / paywall (Stripe).
-- One row per user. The Stripe WEBHOOK is the source of truth and writes here
-- using the service-role key (which bypasses RLS). Users can only READ their
-- own row, so a client can never grant itself Premium.
-- ============================================================================

create table if not exists public.subscriptions (
  user_id                uuid primary key references public.profiles (id) on delete cascade,
  plan                   text not null default 'free',  -- 'free' | 'premium'
  status                 text,                           -- stripe status: trialing | active | past_due | canceled | ...
  stripe_customer_id     text,
  stripe_subscription_id text,
  stripe_price_id        text,
  current_period_end     timestamptz,
  trial_end              timestamptz,
  cancel_at_period_end   boolean not null default false,
  updated_at             timestamptz not null default now()
);

create index if not exists subscriptions_customer_idx on public.subscriptions (stripe_customer_id);
create index if not exists subscriptions_subscription_idx on public.subscriptions (stripe_subscription_id);

alter table public.subscriptions enable row level security;

-- Read-only for the owner. No insert/update policy, so only the service-role
-- webhook can write subscription state.
create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated
  using ((select auth.uid()) = user_id);
