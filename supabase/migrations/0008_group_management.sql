-- Phase 2 (Group Management): any approved business can create and run its
-- own groups (networks) - invite, approve join requests, remove members -
-- with no admin involved in normal operation. Additive only: the existing
-- admin-only columns/policies/functions are untouched, so /admin/networks
-- and /admin/networks/:id keep working exactly as before, and every
-- existing network, membership, slug and QR code is preserved as-is
-- (new columns are added with defaults, so current rows become
-- join_mode='invite_only', status='active', role='member').

-- NETWORKS: ownership, description, join mode -------------------------------
alter table networks add column owner_partner_id uuid references partners(id) on delete set null;
alter table networks add column description text not null default '';
alter table networks add column join_mode text not null default 'invite_only'
  check (join_mode in ('invite_only', 'request_to_join', 'open'));
alter table networks add column updated_at timestamptz not null default now();

-- NETWORK_PARTNERS: membership status + role ---------------------------------
-- A row is never hard-deleted once created (status moves to 'removed'
-- instead) so re-inviting/re-requesting is a clean upsert and there's a
-- history of who was ever in the group.
alter table network_partners add column status text not null default 'active'
  check (status in ('invited', 'requested', 'active', 'removed'));
alter table network_partners add column role text not null default 'member'
  check (role in ('owner', 'admin', 'member'));
alter table network_partners add column invited_by uuid references partners(id) on delete set null;
alter table network_partners add column updated_at timestamptz not null default now();

-- A non-admin can never rename a group's slug (would break printed QR codes
-- and shared links) - pinned back to its previous value regardless of what
-- a self-service update submits. Admin writes (is_admin() = true) pass
-- through unchanged.
create or replace function public.protect_network_admin_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    new.slug := old.slug;
  end if;
  return new;
end;
$$;

create trigger networks_protect_admin_fields
  before update on networks
  for each row execute function public.protect_network_admin_fields();

-- RLS: a group's owner/admin members can edit its name/description/join
-- mode themselves (slug stays pinned by the trigger above regardless).
-- Deleting a group stays admin-only - preserves "no printed QR ever stops
-- working" without needing to think through an abandoned/empty group case.
create policy networks_self_update on networks for update
  using (exists (
    select 1 from network_partners np
    where np.network_id = networks.id
      and np.partner_id = (select partner_id from profiles where id = auth.uid())
      and np.role in ('owner', 'admin')
      and np.status = 'active'
  ))
  with check (exists (
    select 1 from network_partners np
    where np.network_id = networks.id
      and np.partner_id = (select partner_id from profiles where id = auth.uid())
      and np.role in ('owner', 'admin')
      and np.status = 'active'
  ));

-- RLS: network_partners rows now carry invited/requested state, which must
-- not be publicly readable the way plain membership was. Replace the old
-- "select using (true)" with three narrower, additive (OR'd) policies.
drop policy if exists network_partners_select on network_partners;

-- Anyone (including anonymous visitors) can see active memberships - this
-- is what the public /network/:slug directory and shared-network partner
-- lookups rely on.
create policy network_partners_select_active on network_partners for select
  using (status = 'active');

-- A partner can always see their own row in any state (their pending
-- invites and join requests, and anything they were removed from).
create policy network_partners_select_own on network_partners for select
  using (partner_id = (select partner_id from profiles where id = auth.uid()));

-- A group's owner/admin members can see every row for that group (so they
-- can act on pending invites and join requests).
create policy network_partners_select_managed on network_partners for select
  using (exists (
    select 1 from network_partners np
    where np.network_id = network_partners.network_id
      and np.partner_id = (select partner_id from profiles where id = auth.uid())
      and np.role in ('owner', 'admin')
      and np.status = 'active'
  ));

-- Self-service writes all go through SECURITY DEFINER functions below (not
-- raw RLS policies) - the limits, role checks and upsert-vs-reject logic
-- need to run atomically. network_partners_write (admin, for all) already
-- covers every admin write and is untouched.

-- FUNCTIONS -------------------------------------------------------------

-- Create a group. Only an approved (status='active') company may create
-- one, capped at 5 groups owned at a time.
create or replace function public.create_network(
  p_name text,
  p_description text,
  p_join_mode text default 'invite_only'
) returns networks
language plpgsql security definer set search_path = public as $$
declare
  v_partner_id uuid;
  v_partner_status text;
  v_owned_count int;
  v_network_id uuid;
  v_result networks;
  v_base_slug text;
  v_slug text;
  v_attempt int := 0;
begin
  select partner_id into v_partner_id from profiles where id = auth.uid();
  if v_partner_id is null then
    raise exception 'Only a registered business can create a group';
  end if;

  select status into v_partner_status from partners where id = v_partner_id;
  if v_partner_status is distinct from 'active' then
    raise exception 'Your business must be approved before you can create a group';
  end if;

  if p_join_mode not in ('invite_only', 'request_to_join', 'open') then
    raise exception 'Invalid join mode';
  end if;

  select count(*) into v_owned_count from network_partners
  where partner_id = v_partner_id and role = 'owner' and status = 'active';
  if v_owned_count >= 5 then
    raise exception 'You can own at most 5 groups';
  end if;

  v_base_slug := trim(both '-' from regexp_replace(lower(p_name), '[^a-z0-9]+', '-', 'g'));
  if v_base_slug = '' then
    v_base_slug := 'group';
  end if;
  v_slug := v_base_slug;

  loop
    begin
      insert into networks (name, slug, description, join_mode, owner_partner_id)
      values (p_name, v_slug, coalesce(p_description, ''), p_join_mode, v_partner_id)
      returning id into v_network_id;
      exit;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      v_slug := v_base_slug || '-' || substr(md5(random()::text), 1, 4);
      if v_attempt > 5 then
        raise;
      end if;
    end;
  end loop;

  insert into network_partners (network_id, partner_id, status, role)
  values (v_network_id, v_partner_id, 'active', 'owner');

  select * into v_result from networks where id = v_network_id;
  return v_result;
end;
$$;

grant execute on function public.create_network(text, text, text) to authenticated;

-- Invite an existing, registered business into a group. Owner/admin only,
-- capped at 20 invites sent per caller per rolling 24h.
create or replace function public.invite_to_network(
  p_network_id uuid,
  p_partner_id uuid
) returns network_partners
language plpgsql security definer set search_path = public as $$
declare
  v_caller_id uuid;
  v_is_manager boolean;
  v_existing_status text;
  v_sent_today int;
  v_result network_partners;
begin
  select partner_id into v_caller_id from profiles where id = auth.uid();
  if v_caller_id is null then
    raise exception 'Not linked to a business';
  end if;
  if p_partner_id = v_caller_id then
    raise exception 'You cannot invite yourself';
  end if;

  select exists (
    select 1 from network_partners
    where network_id = p_network_id and partner_id = v_caller_id
      and role in ('owner', 'admin') and status = 'active'
  ) into v_is_manager;
  if not v_is_manager then
    raise exception 'Only a group owner or admin can invite members';
  end if;

  select count(*) into v_sent_today from network_partners
  where invited_by = v_caller_id and created_at > now() - interval '1 day';
  if v_sent_today >= 20 then
    raise exception 'Daily invite limit reached (20) - try again tomorrow';
  end if;

  select status into v_existing_status from network_partners
  where network_id = p_network_id and partner_id = p_partner_id;

  if v_existing_status in ('active', 'invited', 'requested') then
    raise exception 'That business is already a member or has a pending invite/request';
  end if;

  insert into network_partners (network_id, partner_id, status, role, invited_by)
  values (p_network_id, p_partner_id, 'invited', 'member', v_caller_id)
  on conflict (network_id, partner_id)
  do update set status = 'invited', role = 'member', invited_by = v_caller_id, updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.invite_to_network(uuid, uuid) to authenticated;

-- A partner asks to join a 'request_to_join' group. Capped at 20 requests
-- sent per caller per rolling 24h (across all groups).
create or replace function public.request_to_join_network(
  p_network_id uuid
) returns network_partners
language plpgsql security definer set search_path = public as $$
declare
  v_caller_id uuid;
  v_join_mode text;
  v_existing_status text;
  v_sent_today int;
  v_result network_partners;
begin
  select partner_id into v_caller_id from profiles where id = auth.uid();
  if v_caller_id is null then
    raise exception 'Not linked to a business';
  end if;

  select join_mode into v_join_mode from networks where id = p_network_id;
  if v_join_mode is null then
    raise exception 'Group not found';
  end if;
  if v_join_mode <> 'request_to_join' then
    raise exception 'This group does not accept join requests';
  end if;

  select count(*) into v_sent_today from network_partners
  where partner_id = v_caller_id and status = 'requested' and created_at > now() - interval '1 day';
  if v_sent_today >= 20 then
    raise exception 'Daily join-request limit reached (20) - try again tomorrow';
  end if;

  select status into v_existing_status from network_partners
  where network_id = p_network_id and partner_id = v_caller_id;
  if v_existing_status in ('active', 'invited', 'requested') then
    raise exception 'You already belong to, are invited to, or have requested this group';
  end if;

  insert into network_partners (network_id, partner_id, status, role)
  values (p_network_id, v_caller_id, 'requested', 'member')
  on conflict (network_id, partner_id)
  do update set status = 'requested', role = 'member', invited_by = null, updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.request_to_join_network(uuid) to authenticated;

-- A partner joins an 'open' group directly, no approval needed.
create or replace function public.join_open_network(
  p_network_id uuid
) returns network_partners
language plpgsql security definer set search_path = public as $$
declare
  v_caller_id uuid;
  v_join_mode text;
  v_existing_status text;
  v_result network_partners;
begin
  select partner_id into v_caller_id from profiles where id = auth.uid();
  if v_caller_id is null then
    raise exception 'Not linked to a business';
  end if;

  select join_mode into v_join_mode from networks where id = p_network_id;
  if v_join_mode is null then
    raise exception 'Group not found';
  end if;
  if v_join_mode <> 'open' then
    raise exception 'This group is not open to join directly';
  end if;

  select status into v_existing_status from network_partners
  where network_id = p_network_id and partner_id = v_caller_id;
  if v_existing_status in ('active', 'invited', 'requested') then
    raise exception 'You already belong to, are invited to, or have requested this group';
  end if;

  insert into network_partners (network_id, partner_id, status, role)
  values (p_network_id, v_caller_id, 'active', 'member')
  on conflict (network_id, partner_id)
  do update set status = 'active', role = 'member', updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.join_open_network(uuid) to authenticated;

-- Covers two different actions through one call, matched by who is calling:
--   - the invited business itself responding to its own pending invite
--     (accept -> active, decline -> removed), or
--   - a group owner/admin responding to someone else's pending join request
--     (approve -> active, reject -> removed).
create or replace function public.respond_to_network_membership(
  p_network_id uuid,
  p_partner_id uuid,
  p_approve boolean
) returns network_partners
language plpgsql security definer set search_path = public as $$
declare
  v_caller_id uuid;
  v_row network_partners;
  v_is_manager boolean;
  v_new_status text;
begin
  select partner_id into v_caller_id from profiles where id = auth.uid();
  if v_caller_id is null then
    raise exception 'Not linked to a business';
  end if;

  select * into v_row from network_partners
  where network_id = p_network_id and partner_id = p_partner_id;
  if v_row is null then
    raise exception 'No such membership';
  end if;

  if p_partner_id = v_caller_id and v_row.status = 'invited' then
    v_new_status := case when p_approve then 'active' else 'removed' end;
  else
    select exists (
      select 1 from network_partners
      where network_id = p_network_id and partner_id = v_caller_id
        and role in ('owner', 'admin') and status = 'active'
    ) into v_is_manager;
    if not v_is_manager or v_row.status <> 'requested' then
      raise exception 'Not authorized to respond to this membership';
    end if;
    v_new_status := case when p_approve then 'active' else 'removed' end;
  end if;

  update network_partners set status = v_new_status, updated_at = now()
  where network_id = p_network_id and partner_id = p_partner_id
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.respond_to_network_membership(uuid, uuid, boolean) to authenticated;

-- Remove a member (owner/admin removing someone else) or leave a group
-- (removing yourself). An owner can't be removed this way - by themself
-- (must ask admin) or by an admin member (only another owner could, and
-- MVP only ever has one owner per group) - so a group can never end up
-- with no owner and no printed link/QR becomes unmanaged silently.
create or replace function public.remove_network_member(
  p_network_id uuid,
  p_partner_id uuid
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_caller_id uuid;
  v_caller_role text;
  v_target_role text;
begin
  select partner_id into v_caller_id from profiles where id = auth.uid();
  if v_caller_id is null then
    raise exception 'Not linked to a business';
  end if;

  select role into v_target_role from network_partners
  where network_id = p_network_id and partner_id = p_partner_id and status = 'active';
  if v_target_role is null then
    raise exception 'No such active member';
  end if;

  if p_partner_id = v_caller_id then
    if v_target_role = 'owner' then
      raise exception 'A group owner can''t leave their own group - contact an admin';
    end if;
  else
    select role into v_caller_role from network_partners
    where network_id = p_network_id and partner_id = v_caller_id and status = 'active';
    if v_caller_role not in ('owner', 'admin') then
      raise exception 'Only a group owner or admin can remove members';
    end if;
    if v_target_role = 'owner' then
      raise exception 'A group owner can''t be removed this way - contact an admin';
    end if;
    if v_target_role = 'admin' and v_caller_role <> 'owner' then
      raise exception 'Only the group owner can remove an admin';
    end if;
  end if;

  update network_partners set status = 'removed', updated_at = now()
  where network_id = p_network_id and partner_id = p_partner_id;
end;
$$;

grant execute on function public.remove_network_member(uuid, uuid) to authenticated;

-- Promote/demote a member between 'admin' and 'member'. Owner-only, and
-- never targets or produces a second 'owner'.
create or replace function public.set_network_member_role(
  p_network_id uuid,
  p_partner_id uuid,
  p_role text
) returns network_partners
language plpgsql security definer set search_path = public as $$
declare
  v_caller_id uuid;
  v_caller_role text;
  v_result network_partners;
begin
  if p_role not in ('admin', 'member') then
    raise exception 'Invalid role';
  end if;

  select partner_id into v_caller_id from profiles where id = auth.uid();
  select role into v_caller_role from network_partners
  where network_id = p_network_id and partner_id = v_caller_id and status = 'active';
  if v_caller_role <> 'owner' then
    raise exception 'Only the group owner can change member roles';
  end if;

  update network_partners set role = p_role, updated_at = now()
  where network_id = p_network_id and partner_id = p_partner_id and status = 'active' and role <> 'owner'
  returning * into v_result;

  if v_result is null then
    raise exception 'No such active, non-owner member';
  end if;

  return v_result;
end;
$$;

grant execute on function public.set_network_member_role(uuid, uuid, text) to authenticated;
