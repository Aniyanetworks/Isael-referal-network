-- Simplified referral model: one link per partner (not per referrer/target
-- pair). Additive only - does not touch referral_links/referral_clicks or
-- any of their data, which stay in place as a hidden/legacy system.

create table partner_referral_clicks (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  visitor_id text not null,
  ip_address text,
  device text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index partner_referral_clicks_partner_idx on partner_referral_clicks(partner_id);
create index partner_referral_clicks_lookup_idx on partner_referral_clicks(partner_id, visitor_id, created_at);

alter table partner_referral_clicks enable row level security;

-- Only admin, or the partner these clicks belong to, can read them.
-- Deliberately NO public insert/select policy for anon - see the RPC below.
create policy partner_referral_clicks_select on partner_referral_clicks for select using (
  is_admin() or partner_id = (select partner_id from profiles where id = auth.uid())
);

-- Anonymous customers can't be given a SELECT policy to check "have I already
-- clicked this in the last 7 days" (RLS can't verify a visitor_id claim, and
-- a blanket `using (true)` would leak click analytics publicly). This
-- SECURITY DEFINER function does the check-and-insert atomically and is the
-- only way to write to this table.
create or replace function public.record_partner_click(
  p_partner_id uuid,
  p_visitor_id text,
  p_device text,
  p_user_agent text,
  p_ip_address text
) returns partner_referral_clicks
language plpgsql security definer set search_path = public as $$
declare
  existing partner_referral_clicks;
  new_row partner_referral_clicks;
begin
  select * into existing from partner_referral_clicks
  where partner_id = p_partner_id
    and visitor_id = p_visitor_id
    and created_at > now() - interval '7 days'
  order by created_at desc
  limit 1;

  if found then
    return existing;
  end if;

  insert into partner_referral_clicks (partner_id, visitor_id, device, user_agent, ip_address)
  values (p_partner_id, p_visitor_id, p_device, p_user_agent, p_ip_address)
  returning * into new_row;
  return new_row;
end;
$$;

grant execute on function public.record_partner_click to anon, authenticated;
