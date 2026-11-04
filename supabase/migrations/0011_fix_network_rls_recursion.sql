-- Fixes a bug in migration 0008: the network_partners_select_managed
-- policy (on network_partners) queried network_partners again from
-- *inside its own policy*, and networks_self_update + referral_events_select
-- did the same thing one level removed - a self-referential RLS policy,
-- which Postgres cannot evaluate and fails with an internal error (surfaced
-- to the app as a 500 from PostgREST, e.g. on GET .../network_partners).
--
-- Fix: move the "is this partner an owner/admin of this network" check
-- into a SECURITY DEFINER function, the same pattern is_admin() already
-- uses for exactly this reason (see its comment in migration 0001) -
-- evaluated as the function's owner, so it does not re-trigger RLS on the
-- table it reads, which breaks the recursion.

create or replace function public.is_network_manager(p_network_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from network_partners
    where network_id = p_network_id
      and partner_id = (select partner_id from profiles where id = auth.uid())
      and role in ('owner', 'admin')
      and status = 'active'
  );
$$;

drop policy if exists networks_self_update on networks;
create policy networks_self_update on networks for update
  using (public.is_network_manager(id))
  with check (public.is_network_manager(id));

drop policy if exists network_partners_select_managed on network_partners;
create policy network_partners_select_managed on network_partners for select
  using (public.is_network_manager(network_id));

-- referral_events only exists once migration 0009 has run - guarded so
-- this migration works whether 0011 is applied before or after 0009.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'referral_events'
  ) then
    drop policy if exists referral_events_select on referral_events;
    create policy referral_events_select on referral_events for select using (
      is_admin()
      or target_partner_id = (select partner_id from profiles where id = auth.uid())
      or referrer_partner_id = (select partner_id from profiles where id = auth.uid())
      or public.is_network_manager(network_id)
    );
  end if;
end $$;
