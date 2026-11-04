-- Phase 5 (Future-Ready Architecture). Schema and read access only - no
-- Stripe, GoHighLevel or AI-agent code is activated or called anywhere.
-- These tables exist so billing/integrations/rewards can be built later
-- without another schema migration, per the brief: "prepare the database
-- and integration interfaces for future [...]. Do not activate or develop
-- those integrations in MVP 1.0."
--
-- No secret ever belongs in these tables or anywhere client-readable - a
-- future Stripe/GoHighLevel integration stores its API keys/OAuth tokens
-- as Supabase Edge Function secrets, never in a table. These tables only
-- ever hold non-secret identifiers and status.

-- PLANS ------------------------------------------------------------------
create table plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('connect', 'growth', 'pro_ai')),
  name text not null,
  price_cents int not null default 0,
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year')),
  features jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table plans enable row level security;
-- Public read so pricing can be shown before anyone logs in; admin-only write.
create policy plans_select on plans for select using (true);
create policy plans_write on plans for all using (is_admin()) with check (is_admin());

insert into plans (code, name, price_cents, features) values
  ('connect', 'Connect', 0, '["Up to 5 groups", "Unlimited referral links", "Basic lead inbox"]'::jsonb),
  ('growth', 'Growth', 4900, '["Everything in Connect", "More groups", "Priority support"]'::jsonb),
  ('pro_ai', 'Pro AI', 14900, '["Everything in Growth", "AI follow-up agent", "GoHighLevel integration"]'::jsonb);

-- SUBSCRIPTIONS ------------------------------------------------------------
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  plan_id uuid not null references plans(id) on delete restrict,
  provider text not null default 'stripe' check (provider in ('stripe')),
  provider_customer_id text,
  provider_subscription_id text,
  status text not null default 'inactive' check (status in ('inactive', 'trialing', 'active', 'past_due', 'canceled')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index subscriptions_one_per_partner_idx on subscriptions(partner_id);

alter table subscriptions enable row level security;
create policy subscriptions_select on subscriptions for select using (
  is_admin() or partner_id = (select partner_id from profiles where id = auth.uid())
);
create policy subscriptions_write on subscriptions for all using (is_admin()) with check (is_admin());

-- INTEGRATIONS ---------------------------------------------------------------
create table integrations (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  provider text not null check (provider in ('gohighlevel')),
  status text not null default 'not_connected' check (status in ('not_connected', 'connected', 'error')),
  external_account_id text,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index integrations_partner_provider_idx on integrations(partner_id, provider);

alter table integrations enable row level security;
create policy integrations_select on integrations for select using (
  is_admin() or partner_id = (select partner_id from profiles where id = auth.uid())
);
create policy integrations_write on integrations for all using (is_admin()) with check (is_admin());

-- REWARD_CREDITS -------------------------------------------------------------
-- An append-only ledger (no update/delete policy for anyone, admin
-- included - a correction is a new offsetting row, same as real ledgers).
create table reward_credits (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  amount_cents int not null,
  reason text not null default '',
  related_service_request_id uuid references service_requests(id) on delete set null,
  created_at timestamptz not null default now()
);
create index reward_credits_partner_idx on reward_credits(partner_id, created_at desc);

alter table reward_credits enable row level security;
create policy reward_credits_select on reward_credits for select using (
  is_admin() or partner_id = (select partner_id from profiles where id = auth.uid())
);
create policy reward_credits_insert on reward_credits for insert with check (is_admin());

-- A partner's current plan code, defaulting to the free 'connect' plan
-- when they have no subscription row yet. Not called anywhere yet - a
-- ready-made entitlement check for whatever plan-gated feature ships
-- first (e.g. the AI follow-up agent, or raising the 5-group cap).
create or replace function public.partner_plan_code(p_partner_id uuid)
returns text language sql security definer set search_path = public stable as $$
  select coalesce(
    (select p.code from subscriptions s join plans p on p.id = s.plan_id
     where s.partner_id = p_partner_id and s.status in ('trialing', 'active')
     order by s.created_at desc limit 1),
    'connect'
  );
$$;

grant execute on function public.partner_plan_code(uuid) to authenticated;
