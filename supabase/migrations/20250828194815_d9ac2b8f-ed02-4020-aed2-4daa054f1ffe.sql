-- Enable required extensions (Supabase usually has these already)
create extension if not exists pgcrypto;

-- =========================
-- Entities
-- =========================
create table countries (
  code text primary key,
  name text not null,
  centroid jsonb
);

create table cmps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country_code text not null references countries(code),
  published boolean not null default false,
  area_sqm numeric,
  acc_project_id text not null,
  acc_folder_id text,
  created_at timestamptz default now()
);
create index cmps_country_published_idx on cmps(country_code, published);

-- HFB / Detailed Solution
do $$ begin
  if not exists (select 1 from pg_type where typname = 'level_kind') then
    create type level_kind as enum('marketHall','showroom');
  end if;
end $$;

create table hfbs (
  id uuid primary key default gen_random_uuid(),
  cmp_id uuid not null references cmps(id) on delete cascade,
  level level_kind not null,
  name text not null,
  area_sqm numeric not null,
  pct numeric not null,
  unique(cmp_id, level, name)
);

create table detailed_solutions (
  id uuid primary key default gen_random_uuid(),
  hfb_id uuid not null references hfbs(id) on delete cascade,
  code text not null,
  name text,
  area_sqm numeric not null,
  pct numeric not null,
  unique(hfb_id, code)
);

-- Revit sheets + contacts
create table revit_sheets (
  id uuid primary key default gen_random_uuid(),
  cmp_id uuid not null references cmps(id) on delete cascade,
  name text not null,
  number text not null,
  acc_item_id text not null,
  acc_version_id text not null,
  pdf_url text,
  last_synced_at timestamptz
);

create table contacts (
  cmp_id uuid primary key references cmps(id) on delete cascade,
  name text not null,
  role text,
  email text not null,
  phone text
);

-- =========================
-- Jobs & Metrics
-- =========================
create table ingest_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz default now(),
  finished_at timestamptz,
  status text check (status in ('running','succeeded','failed')) not null default 'running',
  cadence text check (cadence in ('monthly','quarterly','manual')) not null default 'monthly',
  notes text
);

create table ingest_jobs (
  id uuid primary key default gen_random_uuid(),
  cmp_id uuid not null references cmps(id) on delete cascade,
  requested_by uuid, -- supabase auth user id
  status text check (status in ('queued','running','succeeded','failed','retry')) not null default 'queued',
  attempts int not null default 0,
  scheduled_at timestamptz not null default now()
);

create table da_jobs (
  id uuid primary key default gen_random_uuid(),
  cmp_id uuid not null references cmps(id) on delete cascade,
  task text not null,
  input_item_id text not null,
  input_version_id text not null,
  status text check (status in ('queued','running','succeeded','failed')) not null default 'queued',
  workitem_id text,
  output_urls jsonb,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

create table metrics_aps_usage (
  day date not null,
  endpoint text not null,
  calls int not null default 0,
  tokens int not null default 0,
  primary key (day, endpoint)
);

-- =========================
-- RLS
-- =========================
alter table countries enable row level security;
alter table cmps enable row level security;
alter table hfbs enable row level security;
alter table detailed_solutions enable row level security;
alter table revit_sheets enable row level security;
alter table contacts enable row level security;
alter table ingest_runs enable row level security;
alter table ingest_jobs enable row level security;
alter table da_jobs enable row level security;
alter table metrics_aps_usage enable row level security;

-- For Sprint 0 pilot we keep read-open; we'll tighten later with country scoping.
create policy viewer_read_countries on countries for select using (true);
create policy viewer_read_cmps      on cmps      for select using (true);
create policy viewer_read_hfbs      on hfbs      for select using (true);
create policy viewer_read_ds        on detailed_solutions for select using (true);
create policy viewer_read_sheets    on revit_sheets for select using (true);
create policy viewer_read_contacts  on contacts  for select using (true);

-- Editors can manage jobs (replace role check later if needed)
create policy editor_read_ingest on ingest_runs for select using (true);
create policy editor_jobs_all on ingest_jobs
  for all using (true) with check (true);

create policy editor_da_jobs_all on da_jobs
  for all using (true) with check (true);

create policy viewer_read_metrics on metrics_aps_usage for select using (true);