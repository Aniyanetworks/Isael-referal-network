-- Fixes a race in record_referral_event (migration 0009): the
-- directory_visit/profile_view dedupe was a plain "check, then insert if
-- nothing found", which is not atomic - two near-simultaneous calls for the
-- same (visitor, event, target, network) can both pass the check before
-- either has inserted, producing two rows instead of one. In practice this
-- showed up from React StrictMode's dev-only double-invoke of effects (now
-- also guarded client-side), but the same race is reachable for real with
-- two tabs/devices hitting the same profile at once, so it's worth closing
-- here too.
--
-- Fix: take a transaction-scoped advisory lock keyed on the same
-- (event_type, visitor_id, target_partner_id, network_id) before doing the
-- check - a second concurrent call for the same key blocks until the first
-- call's transaction (and its insert) has committed, so the check it then
-- performs is guaranteed to see that row.
create or replace function public.record_referral_event(
  p_event_type text,
  p_contact_type text,
  p_target_partner_id uuid,
  p_network_id uuid,
  p_referrer_partner_id uuid,
  p_visitor_id text,
  p_device text,
  p_user_agent text,
  p_ip_address text
) returns referral_events
language plpgsql security definer set search_path = public as $$
declare
  existing referral_events;
  new_row referral_events;
  dedupe_key text;
begin
  if p_event_type not in ('directory_visit', 'profile_view', 'contact_click') then
    raise exception 'Invalid event type';
  end if;

  if p_event_type in ('directory_visit', 'profile_view') then
    dedupe_key := p_event_type || '|' || p_visitor_id || '|'
      || coalesce(p_target_partner_id::text, '') || '|' || coalesce(p_network_id::text, '');
    perform pg_advisory_xact_lock(hashtext(dedupe_key)::bigint);

    select * into existing from referral_events
    where event_type = p_event_type
      and visitor_id = p_visitor_id
      and target_partner_id is not distinct from p_target_partner_id
      and network_id is not distinct from p_network_id
      and created_at > now() - interval '1 minute'
    order by created_at desc
    limit 1;

    if found then
      return existing;
    end if;
  end if;

  insert into referral_events (
    event_type, contact_type, target_partner_id, network_id, referrer_partner_id,
    visitor_id, device, user_agent, ip_address
  ) values (
    p_event_type, p_contact_type, p_target_partner_id, p_network_id, p_referrer_partner_id,
    p_visitor_id, p_device, p_user_agent, p_ip_address
  )
  returning * into new_row;

  return new_row;
end;
$$;
