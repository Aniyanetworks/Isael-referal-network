-- "Join Now" on a group's public link (/network/:slug) for a signed-out
-- visitor now goes straight to signup instead of login-then-signup, and
-- the signup remembers which group they came from. Admin approval is NOT
-- skipped - the application still goes through Partner Approvals exactly
-- as before. Only once an admin approves it does the business actually
-- land in that group: instantly active for an 'open' group, or as a
-- pending join request for a 'request_to_join' group (same as if they'd
-- clicked "Join"/"Request to Join" themselves). An 'invite_only' group
-- never gets auto-joined this way - the owner still has to invite them.

alter table partners add column pending_network_id uuid references networks(id) on delete set null;

drop function if exists public.apply_as_partner(text, text, text, text, text, text, uuid, text, text);

create or replace function public.apply_as_partner(
  p_company_name text,
  p_partner_name text,
  p_email text,
  p_phone text,
  p_website text,
  p_address text,
  p_category_id uuid,
  p_description text,
  p_logo_url text,
  p_network_id uuid default null
)
returns partners
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_id uuid;
  v_result partners;
  v_base_slug text;
  v_slug text;
  v_attempt int := 0;
begin
  if (select partner_id from profiles where id = auth.uid()) is not null then
    raise exception 'This account is already linked to a business';
  end if;

  v_base_slug := trim(both '-' from regexp_replace(lower(p_company_name), '[^a-z0-9]+', '-', 'g'));
  if v_base_slug = '' then
    v_base_slug := 'partner';
  end if;
  v_slug := v_base_slug;

  loop
    begin
      insert into partners (
        company_name, partner_name, email, phone, website, address,
        category_id, description, logo_url, status, slug, pending_network_id
      ) values (
        p_company_name, p_partner_name, p_email, p_phone, p_website, p_address,
        p_category_id, coalesce(p_description, ''), coalesce(p_logo_url, ''), 'pending', v_slug, p_network_id
      )
      returning id into v_partner_id;
      exit;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      v_slug := v_base_slug || '-' || substr(md5(random()::text), 1, 4);
      if v_attempt > 5 then
        raise;
      end if;
    end;
  end loop;

  update profiles set partner_id = v_partner_id where id = auth.uid();

  select * into v_result from partners where id = v_partner_id;
  return v_result;
end;
$$;

grant execute on function public.apply_as_partner(
  text, text, text, text, text, text, uuid, text, text, uuid
) to authenticated;

-- Fires when admin approval flips a partner from pending to active (a
-- plain `update partners set status = 'active' ...` - no service-layer
-- change needed for that). Joins/requests the group they signed up
-- through, then clears the intent so it only ever fires once.
create or replace function public.handle_partner_approval_network_join()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_join_mode text;
begin
  if new.status = 'active' and old.status is distinct from 'active' and new.pending_network_id is not null then
    select join_mode into v_join_mode from networks where id = new.pending_network_id;

    if v_join_mode = 'open' then
      insert into network_partners (network_id, partner_id, status, role)
      values (new.pending_network_id, new.id, 'active', 'member')
      on conflict (network_id, partner_id)
      do update set status = 'active', role = 'member', updated_at = now();
    elsif v_join_mode = 'request_to_join' then
      insert into network_partners (network_id, partner_id, status, role)
      values (new.pending_network_id, new.id, 'requested', 'member')
      on conflict (network_id, partner_id)
      do update set status = 'requested', role = 'member', invited_by = null, updated_at = now();
    end if;
    -- invite_only (or a group deleted since signup, v_join_mode null):
    -- no automatic membership - the owner still has to invite them.

    new.pending_network_id := null;
  end if;
  return new;
end;
$$;

drop trigger if exists partners_handle_approval_network_join on partners;
create trigger partners_handle_approval_network_join
  before update on partners
  for each row execute function public.handle_partner_approval_network_join();
