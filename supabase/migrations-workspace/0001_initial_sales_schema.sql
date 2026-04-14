-- Workspace DB — Sales schema (initial)
-- Target project: xiuplzawiionroxgwvsa (Lctnships-workspace)
-- Source: copied from lctnships public DB (ytmkmiofoluespwysfxa)
-- Note: sales_leads.assigned_to FK to users removed (cross-DB)

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =========================================================
-- sales_leads
-- =========================================================
create table public.sales_leads (
  id uuid primary key default uuid_generate_v4(),
  company_name text not null,
  contact_name text,
  email text,
  phone text,
  city text,
  address text,
  website text,
  source text default 'Manual',
  status text default 'cold' check (status in ('cold','warm','hot','negotiation','closed','lost')),
  notes text,
  assigned_to uuid, -- references users(id) in public DB — no FK (cross-DB)
  instagram text,
  facebook text,
  linkedin text,
  twitter text,
  enriched boolean default false,
  enriched_at timestamptz,
  enrichment_error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =========================================================
-- lead_contacts
-- =========================================================
create table public.lead_contacts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.sales_leads(id) on delete cascade,
  name text not null,
  role text,
  email text,
  phone text,
  is_primary boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =========================================================
-- lead_activities
-- =========================================================
create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.sales_leads(id) on delete cascade,
  type text not null check (type in ('call','voicemail','email','note','status_change','meeting')),
  summary text,
  notes text,
  metadata jsonb default '{}'::jsonb,
  created_by text default 'admin',
  created_at timestamptz default now()
);

-- =========================================================
-- leads (scraper raw data)
-- =========================================================
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text,
  phone text,
  email text,
  city text,
  address text,
  google_rating numeric,
  google_reviews integer,
  google_url text,
  google_place_id text,
  thumbnail text,
  categories text[],
  instagram text,
  facebook text,
  linkedin text,
  twitter text,
  source text default 'scraper',
  search_query text,
  status text default 'new',
  enriched boolean default false,
  enriched_at timestamptz,
  enrichment_error text,
  notes text,
  qualified boolean,
  disqualified_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (name, city)
);

-- =========================================================
-- sales_agenda
-- =========================================================
create table public.sales_agenda (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.sales_leads(id) on delete set null,
  title text not null,
  description text,
  type text not null default 'meeting' check (type in ('meeting','call','follow_up','demo','other')),
  date date not null,
  start_time time not null,
  end_time time,
  location text,
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled','no_show')),
  assigned_to text,
  attendees text[] default '{}'::text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =========================================================
-- search_history
-- =========================================================
create table public.search_history (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  city text,
  results_count integer default 0,
  emails_found integer default 0,
  created_at timestamptz default now()
);

-- =========================================================
-- serpapi_usage
-- =========================================================
create table public.serpapi_usage (
  id uuid primary key default gen_random_uuid(),
  month text not null unique,
  searches_used integer default 0,
  max_searches integer default 100
);

-- =========================================================
-- Indexes for common queries
-- =========================================================
create index idx_sales_leads_status on public.sales_leads(status);
create index idx_sales_leads_created_at on public.sales_leads(created_at desc);
create index idx_lead_activities_lead_id on public.lead_activities(lead_id);
create index idx_lead_activities_created_at on public.lead_activities(created_at desc);
create index idx_lead_contacts_lead_id on public.lead_contacts(lead_id);
create index idx_leads_status on public.leads(status);
create index idx_leads_created_at on public.leads(created_at desc);
create index idx_sales_agenda_date on public.sales_agenda(date);
create index idx_sales_agenda_lead_id on public.sales_agenda(lead_id);

-- =========================================================
-- Security: lock down to service_role only
-- Workspace DB is ONLY accessible via Next.js API routes using service_role.
-- No anon / authenticated access.
-- =========================================================
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

-- Enable RLS as defense-in-depth (service_role bypasses RLS anyway)
alter table public.sales_leads enable row level security;
alter table public.lead_contacts enable row level security;
alter table public.lead_activities enable row level security;
alter table public.leads enable row level security;
alter table public.sales_agenda enable row level security;
alter table public.search_history enable row level security;
alter table public.serpapi_usage enable row level security;
