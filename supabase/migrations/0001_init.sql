-- Referral Partner Directory Platform - initial schema, RLS, and seed data.
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- CATEGORIES -----------------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- PARTNERS ---------------------------------------------------------------
create table partners (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  partner_name text not null,
  email text not null,
  phone text not null default '',
  website text not null default '',
  address text not null default '',
  category_id uuid references categories(id) on delete restrict,
  slug text not null unique,
  description text not null default '',
  logo_url text not null default '',
  social_links jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index partners_category_id_idx on partners(category_id);
create index partners_status_idx on partners(status);

-- PROFILES -----------------------------------------------------------------
-- role defaults to 'partner' with partner_id = null ("pending link") for
-- every self-signup; the one Admin account is promoted manually after they
-- sign up once.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'partner' check (role in ('admin','partner')),
  partner_id uuid references partners(id) on delete set null,
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- REFERRAL LINKS -------------------------------------------------------------
create table referral_links (
  id uuid primary key default gen_random_uuid(),
  referrer_partner_id uuid not null references partners(id) on delete cascade,
  target_partner_id uuid not null references partners(id) on delete cascade,
  slug text not null unique,
  qr_code_url text not null default '',
  created_at timestamptz not null default now(),
  check (referrer_partner_id <> target_partner_id),
  unique (referrer_partner_id, target_partner_id)
);

-- REFERRAL CLICKS --------------------------------------------------------
create table referral_clicks (
  id uuid primary key default gen_random_uuid(),
  referral_link_id uuid not null references referral_links(id) on delete cascade,
  visitor_id text not null,
  ip_address text,
  device text,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (referral_link_id, visitor_id)
);
create index referral_clicks_link_idx on referral_clicks(referral_link_id);

-- HELPER: avoids RLS recursion when policies need to check "is this admin"
create function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- RLS ----------------------------------------------------------------------
alter table categories enable row level security;
alter table partners enable row level security;
alter table profiles enable row level security;
alter table referral_links enable row level security;
alter table referral_clicks enable row level security;

create policy categories_select on categories for select using (true);
create policy categories_write on categories for all using (is_admin()) with check (is_admin());

create policy partners_select on partners for select using (
  status = 'active' or is_admin()
  or id = (select partner_id from profiles where id = auth.uid())
);
create policy partners_write on partners for all using (is_admin()) with check (is_admin());

create policy profiles_select on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_update on profiles for update using (is_admin()) with check (is_admin());

create policy referral_links_select on referral_links for select using (true);
create policy referral_links_insert on referral_links for insert with check (
  is_admin() or referrer_partner_id = (select partner_id from profiles where id = auth.uid())
);
create policy referral_links_admin_write on referral_links for update using (is_admin()) with check (is_admin());
create policy referral_links_admin_delete on referral_links for delete using (is_admin());

create policy referral_clicks_insert on referral_clicks for insert with check (true);
create policy referral_clicks_select on referral_clicks for select using (
  is_admin() or exists (
    select 1 from referral_links rl
    where rl.id = referral_link_id
    and rl.referrer_partner_id = (select partner_id from profiles where id = auth.uid())
  )
);

-- Seed: categories
insert into categories (id, name, slug, created_at) values
  (uuid_generate_v5(uuid_ns_url(), 'cat-plumbing'), 'Plumbing', 'plumbing', '2025-06-03T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'cat-hvac'), 'HVAC', 'hvac', '2025-06-03T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'cat-electrical'), 'Electrical', 'electrical', '2025-06-08T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'cat-web-dev'), 'Web Development', 'web-development', '2025-06-13T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'cat-painting'), 'Painting', 'painting', '2025-06-23T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'cat-roofing'), 'Roofing', 'roofing', '2025-06-28T12:00:00.000Z');

-- Seed: partners
insert into partners (id, company_name, partner_name, email, phone, website, address, category_id, slug, description, logo_url, social_links, status, created_at, updated_at) values
  (uuid_generate_v5(uuid_ns_url(), 'partner-abc-plumbing'), 'ABC Plumbing', 'Alan Brooks', 'contact@abcplumbing.com', '+1 (200) 555-1000', 'https://abcplumbing.com', 'New York, NY', uuid_generate_v5(uuid_ns_url(), 'cat-plumbing'), 'abc-plumbing', 'Trusted residential and commercial plumbing service with 24/7 emergency response.', 'https://api.dicebear.com/9.x/initials/svg?seed=ABC%20Plumbing', '{"facebook":"https://facebook.com/","instagram":"https://instagram.com/"}'::jsonb, 'active', '2025-07-13T12:00:00.000Z', '2025-07-13T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'partner-flowright-plumbing'), 'FlowRight Plumbing', 'Maria Gomez', 'contact@flowrightplumbing.com', '+1 (210) 555-1037', 'https://flowrightplumbing.com', 'Jersey City, NJ', uuid_generate_v5(uuid_ns_url(), 'cat-plumbing'), 'flowright-plumbing', 'Licensed plumbers specializing in leak detection, repiping, and water heater installs.', 'https://api.dicebear.com/9.x/initials/svg?seed=FlowRight%20Plumbing', '{"linkedin":"https://linkedin.com/company/"}'::jsonb, 'active', '2025-08-22T12:00:00.000Z', '2025-08-22T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'partner-rapid-rooter'), 'Rapid Rooter Plumbing', 'Tom Reyes', 'contact@rapidrooterplumbing.com', '+1 (220) 555-1074', 'https://rapidrooterplumbing.com', 'Newark, NJ', uuid_generate_v5(uuid_ns_url(), 'cat-plumbing'), 'rapid-rooter-plumbing', 'Drain cleaning and rooter service for homes and small businesses.', 'https://api.dicebear.com/9.x/initials/svg?seed=Rapid%20Rooter%20Plumbing', '{}'::jsonb, 'inactive', '2025-10-01T12:00:00.000Z', '2025-10-01T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'partner-arctic-air-hvac'), 'Arctic Air HVAC', 'Devon Walsh', 'contact@arcticairhvac.com', '+1 (230) 555-1111', 'https://arcticairhvac.com', 'Brooklyn, NY', uuid_generate_v5(uuid_ns_url(), 'cat-hvac'), 'arctic-air-hvac', 'Heating and cooling installation, maintenance, and repair for every season.', 'https://api.dicebear.com/9.x/initials/svg?seed=Arctic%20Air%20HVAC', '{"facebook":"https://facebook.com/","linkedin":"https://linkedin.com/company/"}'::jsonb, 'active', '2025-07-28T12:00:00.000Z', '2025-07-28T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'partner-comfort-zone-hvac'), 'Comfort Zone HVAC', 'Priya Nair', 'contact@comfortzonehvac.com', '+1 (240) 555-1148', 'https://comfortzonehvac.com', 'Queens, NY', uuid_generate_v5(uuid_ns_url(), 'cat-hvac'), 'comfort-zone-hvac', 'Energy-efficient HVAC systems and duct cleaning for residential properties.', 'https://api.dicebear.com/9.x/initials/svg?seed=Comfort%20Zone%20HVAC', '{"facebook":"https://facebook.com/","instagram":"https://instagram.com/"}'::jsonb, 'active', '2025-09-21T12:00:00.000Z', '2025-09-21T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'partner-brightspark-electric'), 'BrightSpark Electric', 'Jamal Carter', 'contact@brightsparkelectric.com', '+1 (250) 555-1185', 'https://brightsparkelectric.com', 'Hoboken, NJ', uuid_generate_v5(uuid_ns_url(), 'cat-electrical'), 'brightspark-electric', 'Licensed electricians handling rewiring, panel upgrades, and smart home installs.', 'https://api.dicebear.com/9.x/initials/svg?seed=BrightSpark%20Electric', '{"linkedin":"https://linkedin.com/company/"}'::jsonb, 'active', '2025-08-07T12:00:00.000Z', '2025-08-07T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'partner-voltpro-electrical'), 'VoltPro Electrical', 'Elena Vasquez', 'contact@voltproelectrical.com', '+1 (260) 555-1222', 'https://voltproelectrical.com', 'Yonkers, NY', uuid_generate_v5(uuid_ns_url(), 'cat-electrical'), 'voltpro-electrical', 'Commercial and residential electrical contracting with same-week scheduling.', 'https://api.dicebear.com/9.x/initials/svg?seed=VoltPro%20Electrical', '{}'::jsonb, 'active', '2025-10-11T12:00:00.000Z', '2025-10-11T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'partner-pixelforge-web-studio'), 'PixelForge Web Studio', 'Sam Whitfield', 'contact@pixelforgewebstudio.com', '+1 (270) 555-1259', 'https://pixelforgewebstudio.com', 'Manhattan, NY', uuid_generate_v5(uuid_ns_url(), 'cat-web-dev'), 'pixelforge-web-studio', 'Custom web design and development studio for local service businesses.', 'https://api.dicebear.com/9.x/initials/svg?seed=PixelForge%20Web%20Studio', '{"facebook":"https://facebook.com/","linkedin":"https://linkedin.com/company/"}'::jsonb, 'active', '2025-11-20T12:00:00.000Z', '2025-11-20T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'partner-codecraft-developers'), 'CodeCraft Developers', 'Nina Patel', 'contact@codecraftdevelopers.com', '+1 (200) 555-1296', 'https://codecraftdevelopers.com', 'Stamford, CT', uuid_generate_v5(uuid_ns_url(), 'cat-web-dev'), 'codecraft-developers', 'Full-stack development shop building booking systems and business websites.', 'https://api.dicebear.com/9.x/initials/svg?seed=CodeCraft%20Developers', '{"facebook":"https://facebook.com/","instagram":"https://instagram.com/"}'::jsonb, 'inactive', '2025-12-30T12:00:00.000Z', '2025-12-30T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'partner-precision-painters'), 'Precision Painters', 'Carlos Mendes', 'contact@precisionpainters.com', '+1 (210) 555-1333', 'https://precisionpainters.com', 'White Plains, NY', uuid_generate_v5(uuid_ns_url(), 'cat-painting'), 'precision-painters', 'Interior and exterior painting with a focus on clean, precise finish work.', 'https://api.dicebear.com/9.x/initials/svg?seed=Precision%20Painters', '{"linkedin":"https://linkedin.com/company/"}'::jsonb, 'active', '2025-12-10T12:00:00.000Z', '2025-12-10T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'partner-colorcraft-painting'), 'ColorCraft Painting Co', 'Julia Stone', 'contact@colorcraftpaintingco.com', '+1 (220) 555-1370', 'https://colorcraftpaintingco.com', 'Paterson, NJ', uuid_generate_v5(uuid_ns_url(), 'cat-painting'), 'colorcraft-painting-co', 'Residential painting crew known for fast turnaround and tidy job sites.', 'https://api.dicebear.com/9.x/initials/svg?seed=ColorCraft%20Painting%20Co', '{}'::jsonb, 'active', '2026-01-09T12:00:00.000Z', '2026-01-09T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'partner-skyline-roofing'), 'SkyLine Roofing', 'Derek Holt', 'contact@skylineroofing.com', '+1 (230) 555-1407', 'https://skylineroofing.com', 'Bronx, NY', uuid_generate_v5(uuid_ns_url(), 'cat-roofing'), 'skyline-roofing', 'Roof replacement, repair, and inspection with a lifetime workmanship warranty.', 'https://api.dicebear.com/9.x/initials/svg?seed=SkyLine%20Roofing', '{"facebook":"https://facebook.com/","linkedin":"https://linkedin.com/company/"}'::jsonb, 'active', '2025-10-26T12:00:00.000Z', '2025-10-26T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'partner-summitpeak-roofing'), 'SummitPeak Roofing', 'Grace Lin', 'contact@summitpeakroofing.com', '+1 (240) 555-1444', 'https://summitpeakroofing.com', 'New Rochelle, NY', uuid_generate_v5(uuid_ns_url(), 'cat-roofing'), 'summitpeak-roofing', 'Storm damage roofing specialists working directly with insurance adjusters.', 'https://api.dicebear.com/9.x/initials/svg?seed=SummitPeak%20Roofing', '{"facebook":"https://facebook.com/","instagram":"https://instagram.com/"}'::jsonb, 'active', '2026-01-19T12:00:00.000Z', '2026-01-19T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'partner-topshield-roofing'), 'TopShield Roofing', 'Marcus Webb', 'contact@topshieldroofing.com', '+1 (250) 555-1481', 'https://topshieldroofing.com', 'Elizabeth, NJ', uuid_generate_v5(uuid_ns_url(), 'cat-roofing'), 'topshield-roofing', 'Metal and shingle roofing installation for residential properties.', 'https://api.dicebear.com/9.x/initials/svg?seed=TopShield%20Roofing', '{"linkedin":"https://linkedin.com/company/"}'::jsonb, 'active', '2026-02-28T12:00:00.000Z', '2026-02-28T12:00:00.000Z');

-- Seed: referral_links
insert into referral_links (id, referrer_partner_id, target_partner_id, slug, qr_code_url, created_at) values
  (uuid_generate_v5(uuid_ns_url(), 'link-01'), uuid_generate_v5(uuid_ns_url(), 'partner-arctic-air-hvac'), uuid_generate_v5(uuid_ns_url(), 'partner-abc-plumbing'), 'abc-plumbing-ref-arctic-air-hvac', '', '2026-02-28T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-02'), uuid_generate_v5(uuid_ns_url(), 'partner-arctic-air-hvac'), uuid_generate_v5(uuid_ns_url(), 'partner-brightspark-electric'), 'brightspark-electric-ref-arctic-air-hvac', '', '2026-03-10T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-03'), uuid_generate_v5(uuid_ns_url(), 'partner-comfort-zone-hvac'), uuid_generate_v5(uuid_ns_url(), 'partner-flowright-plumbing'), 'flowright-plumbing-ref-comfort-zone-hvac', '', '2026-03-15T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-04'), uuid_generate_v5(uuid_ns_url(), 'partner-abc-plumbing'), uuid_generate_v5(uuid_ns_url(), 'partner-arctic-air-hvac'), 'arctic-air-hvac-ref-abc-plumbing', '', '2026-03-20T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-05'), uuid_generate_v5(uuid_ns_url(), 'partner-brightspark-electric'), uuid_generate_v5(uuid_ns_url(), 'partner-pixelforge-web-studio'), 'pixelforge-web-studio-ref-brightspark-electric', '', '2026-03-30T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-06'), uuid_generate_v5(uuid_ns_url(), 'partner-pixelforge-web-studio'), uuid_generate_v5(uuid_ns_url(), 'partner-codecraft-developers'), 'codecraft-developers-ref-pixelforge-web-studio', '', '2026-04-04T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-07'), uuid_generate_v5(uuid_ns_url(), 'partner-codecraft-developers'), uuid_generate_v5(uuid_ns_url(), 'partner-precision-painters'), 'precision-painters-ref-codecraft-developers', '', '2026-04-19T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-08'), uuid_generate_v5(uuid_ns_url(), 'partner-precision-painters'), uuid_generate_v5(uuid_ns_url(), 'partner-colorcraft-painting'), 'colorcraft-painting-co-ref-precision-painters', '', '2026-04-24T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-09'), uuid_generate_v5(uuid_ns_url(), 'partner-skyline-roofing'), uuid_generate_v5(uuid_ns_url(), 'partner-precision-painters'), 'precision-painters-ref-skyline-roofing', '', '2026-04-29T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-10'), uuid_generate_v5(uuid_ns_url(), 'partner-summitpeak-roofing'), uuid_generate_v5(uuid_ns_url(), 'partner-skyline-roofing'), 'skyline-roofing-ref-summitpeak-roofing', '', '2026-05-04T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-11'), uuid_generate_v5(uuid_ns_url(), 'partner-topshield-roofing'), uuid_generate_v5(uuid_ns_url(), 'partner-arctic-air-hvac'), 'arctic-air-hvac-ref-topshield-roofing', '', '2026-05-09T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-12'), uuid_generate_v5(uuid_ns_url(), 'partner-voltpro-electrical'), uuid_generate_v5(uuid_ns_url(), 'partner-comfort-zone-hvac'), 'comfort-zone-hvac-ref-voltpro-electrical', '', '2026-05-14T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-13'), uuid_generate_v5(uuid_ns_url(), 'partner-flowright-plumbing'), uuid_generate_v5(uuid_ns_url(), 'partner-voltpro-electrical'), 'voltpro-electrical-ref-flowright-plumbing', '', '2026-05-19T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-14'), uuid_generate_v5(uuid_ns_url(), 'partner-colorcraft-painting'), uuid_generate_v5(uuid_ns_url(), 'partner-skyline-roofing'), 'skyline-roofing-ref-colorcraft-painting-co', '', '2026-05-29T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-15'), uuid_generate_v5(uuid_ns_url(), 'partner-comfort-zone-hvac'), uuid_generate_v5(uuid_ns_url(), 'partner-abc-plumbing'), 'abc-plumbing-ref-comfort-zone-hvac', '', '2026-06-03T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-16'), uuid_generate_v5(uuid_ns_url(), 'partner-abc-plumbing'), uuid_generate_v5(uuid_ns_url(), 'partner-precision-painters'), 'precision-painters-ref-abc-plumbing', '', '2026-06-13T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-17'), uuid_generate_v5(uuid_ns_url(), 'partner-arctic-air-hvac'), uuid_generate_v5(uuid_ns_url(), 'partner-skyline-roofing'), 'skyline-roofing-ref-arctic-air-hvac', '', '2026-06-28T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-18'), uuid_generate_v5(uuid_ns_url(), 'partner-pixelforge-web-studio'), uuid_generate_v5(uuid_ns_url(), 'partner-arctic-air-hvac'), 'arctic-air-hvac-ref-pixelforge-web-studio', '', '2026-07-08T12:00:00.000Z');

-- Seed: referral_clicks
insert into referral_clicks (referral_link_id, visitor_id, ip_address, device, user_agent, created_at) values
  (uuid_generate_v5(uuid_ns_url(), 'link-08'), 'visitor-001', '24.114.217.170', 'desktop', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', '2026-07-03T22:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-15'), 'visitor-002', '24.120.63.224', 'mobile', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-07-11T01:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-11'), 'visitor-003', '24.155.0.120', 'tablet', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', '2026-06-06T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-02'), 'visitor-004', '24.15.47.199', 'mobile', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', '2026-07-12T17:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-05'), 'visitor-005', '24.206.81.114', 'desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', '2026-06-08T23:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-02'), 'visitor-006', '24.164.53.77', 'mobile', 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-06-13T08:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-02'), 'visitor-007', '24.74.19.168', 'mobile', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36', '2026-05-07T10:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-16'), 'visitor-008', '24.109.240.35', 'desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', '2026-06-26T01:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-08'), 'visitor-009', '24.229.19.183', 'tablet', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-05-27T08:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-05'), 'visitor-010', '24.209.30.253', 'mobile', 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-06-19T23:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-03'), 'visitor-011', '24.152.82.186', 'mobile', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', '2026-05-13T21:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-18'), 'visitor-012', '24.227.110.139', 'mobile', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', '2026-05-27T05:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-13'), 'visitor-013', '24.230.23.121', 'tablet', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', '2026-05-03T08:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-12'), 'visitor-014', '24.178.56.105', 'desktop', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36', '2026-06-29T08:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-08'), 'visitor-015', '24.226.83.202', 'mobile', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', '2026-05-13T04:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-01'), 'visitor-016', '24.188.161.223', 'tablet', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-06-05T01:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-02'), 'visitor-017', '24.12.179.180', 'mobile', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-06-29T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-02'), 'visitor-018', '24.253.145.252', 'desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', '2026-06-09T06:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-04'), 'visitor-019', '24.110.106.174', 'mobile', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-05-10T05:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-05'), 'visitor-020', '24.155.139.150', 'desktop', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-07-02T05:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-11'), 'visitor-021', '24.56.43.177', 'mobile', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', '2026-07-01T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-07'), 'visitor-022', '24.52.122.96', 'mobile', 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-05-17T02:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-01'), 'visitor-023', '24.221.134.214', 'tablet', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', '2026-07-14T22:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-14'), 'visitor-024', '24.53.99.139', 'tablet', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', '2026-05-12T17:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-12'), 'visitor-025', '24.13.17.43', 'mobile', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36', '2026-05-21T14:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-15'), 'visitor-026', '24.161.213.217', 'mobile', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-06-18T16:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-11'), 'visitor-027', '24.89.239.159', 'mobile', 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-07-15T04:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-01'), 'visitor-028', '24.21.165.185', 'tablet', 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-06-16T20:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-01'), 'visitor-029', '24.69.35.12', 'mobile', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', '2026-06-07T20:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-14'), 'visitor-030', '24.200.49.169', 'mobile', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', '2026-06-17T02:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-04'), 'visitor-031', '24.84.78.37', 'mobile', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-06-11T00:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-09'), 'visitor-032', '24.111.34.0', 'desktop', 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-07-21T16:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-04'), 'visitor-033', '24.128.25.209', 'desktop', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-07-07T20:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-07'), 'visitor-034', '24.24.246.191', 'mobile', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36', '2026-06-09T18:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-06'), 'visitor-035', '24.45.19.24', 'desktop', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-05-29T21:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-07'), 'visitor-036', '24.249.5.101', 'mobile', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-05-15T00:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-02'), 'visitor-037', '24.240.242.67', 'mobile', 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-05-05T21:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-07'), 'visitor-038', '24.206.79.125', 'tablet', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', '2026-05-28T00:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-06'), 'visitor-039', '24.246.251.195', 'mobile', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36', '2026-05-29T17:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-04'), 'visitor-040', '24.223.80.224', 'mobile', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-06-10T17:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-08'), 'visitor-041', '24.221.176.38', 'mobile', 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-06-15T06:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-08'), 'visitor-042', '24.196.188.182', 'desktop', 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-05-09T00:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-05'), 'visitor-043', '24.18.127.227', 'mobile', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', '2026-06-18T22:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-12'), 'visitor-044', '24.132.11.42', 'desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', '2026-06-24T17:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-15'), 'visitor-045', '24.174.21.8', 'mobile', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36', '2026-07-03T17:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-08'), 'visitor-046', '24.231.226.87', 'desktop', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36', '2026-07-07T01:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-02'), 'visitor-047', '24.66.183.132', 'mobile', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', '2026-07-18T19:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-11'), 'visitor-048', '24.234.29.14', 'desktop', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-07-07T07:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-18'), 'visitor-049', '24.148.214.87', 'mobile', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', '2026-05-23T18:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-03'), 'visitor-050', '24.52.200.128', 'desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', '2026-05-21T03:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-15'), 'visitor-051', '24.201.125.242', 'desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', '2026-06-08T21:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-02'), 'visitor-052', '24.196.61.34', 'mobile', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36', '2026-06-09T08:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-16'), 'visitor-053', '24.133.190.12', 'tablet', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', '2026-07-03T11:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-03'), 'visitor-054', '24.181.194.64', 'tablet', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', '2026-07-11T22:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-05'), 'visitor-055', '24.48.217.22', 'desktop', 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-07-10T02:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-05'), 'visitor-056', '24.158.123.171', 'desktop', 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-05-16T05:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-02'), 'visitor-057', '24.132.194.113', 'mobile', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-06-14T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-15'), 'visitor-058', '24.92.108.64', 'mobile', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', '2026-05-30T11:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-15'), 'visitor-059', '24.194.167.206', 'desktop', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', '2026-06-10T01:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-05'), 'visitor-060', '24.121.114.147', 'desktop', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36', '2026-07-27T21:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-01'), 'visitor-061', '24.94.185.237', 'mobile', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36', '2026-05-09T02:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-01'), 'visitor-062', '24.144.126.112', 'mobile', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36', '2026-07-17T20:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-07'), 'visitor-063', '24.241.212.122', 'desktop', 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-07-23T01:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-05'), 'visitor-064', '24.173.141.155', 'tablet', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36', '2026-05-01T14:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-17'), 'visitor-065', '24.206.244.206', 'desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', '2026-05-01T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-05'), 'visitor-066', '24.222.173.197', 'mobile', 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-06-17T15:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-10'), 'visitor-067', '24.63.39.95', 'mobile', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', '2026-07-16T07:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-08'), 'visitor-068', '24.95.162.248', 'mobile', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36', '2026-05-24T12:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-11'), 'visitor-069', '24.223.64.151', 'tablet', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', '2026-06-24T17:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-08'), 'visitor-070', '24.80.118.134', 'tablet', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', '2026-06-06T11:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-09'), 'visitor-071', '24.202.110.152', 'tablet', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-06-06T09:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-17'), 'visitor-072', '24.46.173.180', 'mobile', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', '2026-06-01T16:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-13'), 'visitor-073', '24.0.15.24', 'tablet', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', '2026-07-25T00:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-01'), 'visitor-074', '24.190.161.0', 'mobile', 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-06-28T08:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-12'), 'visitor-075', '24.166.12.159', 'mobile', 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-06-07T03:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-07'), 'visitor-076', '24.104.150.49', 'desktop', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36', '2026-05-24T06:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-16'), 'visitor-077', '24.240.109.152', 'mobile', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36', '2026-05-01T16:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-11'), 'visitor-078', '24.87.231.129', 'tablet', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-07-15T05:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-17'), 'visitor-079', '24.128.248.5', 'mobile', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36', '2026-05-02T07:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-17'), 'visitor-080', '24.57.241.78', 'mobile', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-07-09T06:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-16'), 'visitor-081', '24.159.80.130', 'mobile', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', '2026-07-12T23:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-15'), 'visitor-082', '24.168.137.226', 'mobile', 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-06-18T22:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-04'), 'visitor-083', '24.149.168.159', 'mobile', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', '2026-07-27T20:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-03'), 'visitor-084', '24.83.4.31', 'mobile', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-07-25T02:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-11'), 'visitor-085', '24.34.180.54', 'mobile', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36', '2026-06-28T04:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-08'), 'visitor-086', '24.119.208.21', 'desktop', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-05-10T17:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-16'), 'visitor-087', '24.118.44.168', 'mobile', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36', '2026-05-06T03:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-03'), 'visitor-088', '24.41.229.146', 'desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', '2026-05-13T10:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-06'), 'visitor-089', '24.133.152.248', 'mobile', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36', '2026-06-11T16:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-15'), 'visitor-090', '24.22.57.234', 'mobile', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36', '2026-06-11T02:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-03'), 'visitor-091', '24.94.85.164', 'tablet', 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-07-06T23:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-05'), 'visitor-092', '24.131.185.145', 'mobile', 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-07-09T03:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-01'), 'visitor-093', '24.39.12.30', 'mobile', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36', '2026-06-12T02:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-03'), 'visitor-094', '24.254.185.111', 'mobile', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36', '2026-07-02T23:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-02'), 'visitor-095', '24.28.215.96', 'desktop', 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-07-24T19:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-07'), 'visitor-096', '24.16.158.223', 'desktop', 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-07-08T14:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-04'), 'visitor-097', '24.106.5.100', 'desktop', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', '2026-06-16T03:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-01'), 'visitor-098', '24.245.195.58', 'desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', '2026-05-27T18:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-17'), 'visitor-099', '24.217.226.62', 'mobile', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', '2026-05-16T08:00:00.000Z'),
  (uuid_generate_v5(uuid_ns_url(), 'link-01'), 'visitor-100', '24.214.231.237', 'desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36', '2026-07-27T15:00:00.000Z');
