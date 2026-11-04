-- Phase 3 (Public Directory + Referral Tracking + Leads). Additive only:
-- the legacy referral_links/referral_clicks tables and the existing
-- partner_referral_clicks table + record_partner_click() function (Phase
-- "simplified referral model") are untouched and keep working exactly as
-- they do today. This migration adds two new tables alongside them:
--
--   referral_events  - one row per directory visit / profile view /
--                       contact click / service request, each optionally
--                       attributed to a group and a referring business.
--   service_requests - the customer-submitted "Request Service" leads,
--                       with a per-business inbox.

-- SERVICE_REQUESTS -----------------------------------------------------------
create table service_requests (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  network_id uuid references networks(id) on delete set null,
  referrer_partner_id uuid references partners(id) on delete set null,
  visitor_id text not null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null default '',
  message text not null default '',
  status text not null default 'new' check (status in ('new', 'contacted', 'won', 'lost', 'spam')),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index service_requests_partner_idx on service_requests(partner_id, created_at desc);
create index service_requests_referrer_idx on service_requests(referrer_partner_id);
create index service_requests_network_idx on service_requests(network_id);

alter table service_requests enable row level security;

-- Only the receiving business (full detail, for their lead inbox) or admin
-- can read a request. The referrer explicitly does NOT get a select policy
-- here - they only ever see counts, via referral_events below, which holds
-- no customer PII.
create policy service_requests_select on service_requests for select using (
  is_admin() or partner_id = (select partner_id from profiles where id = auth.uid())
);

-- A non-admin can only ever change status/note - never the customer's own
-- submitted details or who it's attributed to. Same pattern as
-- protect_partner_admin_fields/protect_network_admin_fields.
create or replace function public.protect_service_request_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    new.partner_id := old.partner_id;
    new.network_id := old.network_id;
    new.referrer_partner_id := old.referrer_partner_id;
    new.visitor_id := old.visitor_id;
    new.customer_name := old.customer_name;
    new.customer_phone := old.customer_phone;
    new.customer_email := old.customer_email;
    new.message := old.message;
  end if;
  return new;
end;
$$;

create trigger service_requests_protect_fields
  before update on service_requests
  for each row execute function public.protect_service_request_fields();

create policy service_requests_update on service_requests for update
  using (is_admin() or partner_id = (select partner_id from profiles where id = auth.uid()))
  with check (is_admin() or partner_id = (select partner_id from profiles where id = auth.uid()));

-- REFERRAL_EVENTS -------------------------------------------------------------
create table referral_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('directory_visit', 'profile_view', 'contact_click', 'service_request')),
  contact_type text, -- for contact_click only: call/website/directions/save_contact/facebook/instagram/linkedin
  target_partner_id uuid references partners(id) on delete cascade,
  network_id uuid references networks(id) on delete set null,
  referrer_partner_id uuid references partners(id) on delete set null,
  service_request_id uuid references service_requests(id) on delete set null,
  visitor_id text not null,
  device text,
  user_agent text,
  ip_address text,
  created_at timestamptz not null default now()
);
create index referral_events_target_idx on referral_events(target_partner_id, created_at desc);
create index referral_events_referrer_idx on referral_events(referrer_partner_id, created_at desc);
create index referral_events_network_idx on referral_events(network_id, created_at desc);
create index referral_events_dedupe_idx on referral_events(visitor_id, event_type, target_partner_id, network_id, created_at desc);

alter table referral_events enable row level security;

-- No row here carries customer PII (that lives only in service_requests,
-- which has its own stricter policy above), so it's safe for the target
-- business, the referring business, and a group's owner/admin to all see
-- their own slice - which is exactly what turns these rows into "my
-- referrals generated N visits/views/clicks" counts for each of them.
create policy referral_events_select on referral_events for select using (
  is_admin()
  or target_partner_id = (select partner_id from profiles where id = auth.uid())
  or referrer_partner_id = (select partner_id from profiles where id = auth.uid())
  or exists (
    select 1 from network_partners np
    where np.network_id = referral_events.network_id
      and np.partner_id = (select partner_id from profiles where id = auth.uid())
      and np.role in ('owner', 'admin')
      and np.status = 'active'
  )
);

-- Writes only ever happen through the two functions below (anon callable,
-- since customers are never authenticated) - no insert/update/delete
-- policy is needed or granted for any role.

-- Records a directory visit / profile view / contact click. directory_visit
-- and profile_view are deduped per (visitor, event, target, network) within
-- a short window - just enough to collapse an accidental double fire (a
-- page double-mount, a double click) without blocking genuine repeat
-- visits, which must stay unlimited per the brief. contact_click is never
-- deduped: a second deliberate click (e.g. they called, then also emailed)
-- is a second real action worth counting.
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
begin
  if p_event_type not in ('directory_visit', 'profile_view', 'contact_click') then
    raise exception 'Invalid event type';
  end if;

  if p_event_type in ('directory_visit', 'profile_view') then
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

grant execute on function public.record_referral_event(
  text, text, uuid, uuid, uuid, text, text, text, text
) to anon, authenticated;

-- Submits a customer's "Request Service" lead: inserts the request, logs a
-- matching referral_events row (linked via service_request_id), and
-- rate-limits by visitor (5 requests/hour) as a basic anti-spam measure -
-- the honeypot field itself is enforced client-side (a filled honeypot
-- simply never calls this function).
create or replace function public.submit_service_request(
  p_partner_id uuid,
  p_network_id uuid,
  p_referrer_partner_id uuid,
  p_visitor_id text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_message text,
  p_device text,
  p_user_agent text,
  p_ip_address text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_partner_status text;
  v_recent_count int;
  v_request_id uuid;
begin
  select status into v_partner_status from partners where id = p_partner_id;
  if v_partner_status is null then
    raise exception 'Business not found';
  end if;

  select count(*) into v_recent_count from service_requests
  where visitor_id = p_visitor_id and created_at > now() - interval '1 hour';
  if v_recent_count >= 5 then
    raise exception 'Too many requests sent recently - please try again later';
  end if;

  if coalesce(trim(p_customer_name), '') = '' or coalesce(trim(p_customer_phone), '') = '' then
    raise exception 'Name and phone are required';
  end if;

  insert into service_requests (
    partner_id, network_id, referrer_partner_id, visitor_id,
    customer_name, customer_phone, customer_email, message
  ) values (
    p_partner_id, p_network_id, p_referrer_partner_id, p_visitor_id,
    trim(p_customer_name), trim(p_customer_phone), coalesce(trim(p_customer_email), ''), coalesce(p_message, '')
  )
  returning id into v_request_id;

  insert into referral_events (
    event_type, target_partner_id, network_id, referrer_partner_id,
    service_request_id, visitor_id, device, user_agent, ip_address
  ) values (
    'service_request', p_partner_id, p_network_id, p_referrer_partner_id,
    v_request_id, p_visitor_id, p_device, p_user_agent, p_ip_address
  );

  return v_request_id;
end;
$$;

grant execute on function public.submit_service_request(
  uuid, uuid, uuid, text, text, text, text, text, text, text, text
) to anon, authenticated;
