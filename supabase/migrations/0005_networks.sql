-- Networks group partners together (e.g. "Doctor's Network") so a partner's
-- "Trusted Partners" list can be scoped to just the partners they share a
-- network with, instead of every active partner in the directory. A partner
-- can belong to multiple networks. Each network also gets its own public
-- shareable link (/network/:slug), separate from a partner's personal link.

create table networks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table network_partners (
  network_id uuid not null references networks(id) on delete cascade,
  partner_id uuid not null references partners(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (network_id, partner_id)
);
create index network_partners_partner_idx on network_partners(partner_id);

alter table networks enable row level security;
alter table network_partners enable row level security;

-- Same shape as categories: public read, admin-only write. Public read is
-- required because the anonymous /ref/:slug and /network/:slug pages need
-- to compute shared-network membership without a session.
create policy networks_select on networks for select using (true);
create policy networks_write on networks for all using (is_admin()) with check (is_admin());

create policy network_partners_select on network_partners for select using (true);
create policy network_partners_write on network_partners for all using (is_admin()) with check (is_admin());
