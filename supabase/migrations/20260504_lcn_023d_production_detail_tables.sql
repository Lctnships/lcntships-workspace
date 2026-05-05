-- LCN-023d: productie detail tabellen — activity log, notities, crew, gear, shotlist

create table if not exists public.production_activities (
  id uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.productions(id) on delete cascade,
  actor_email text,
  actor_name text,
  action_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists production_activities_production_id_idx
  on public.production_activities(production_id, created_at desc);

create table if not exists public.production_notes (
  id uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.productions(id) on delete cascade,
  author_email text,
  author_name text,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists production_notes_production_id_idx
  on public.production_notes(production_id, created_at desc);

create table if not exists public.production_crew (
  id uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.productions(id) on delete cascade,
  team_member_id uuid,
  email text,
  name text,
  role text,
  confirmed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists production_crew_production_id_idx
  on public.production_crew(production_id);

create table if not exists public.production_gear (
  id uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.productions(id) on delete cascade,
  name text not null,
  category text not null default 'equipment',
  quantity integer not null default 1,
  notes text,
  checked boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists production_gear_production_id_idx
  on public.production_gear(production_id, sort_order);

create table if not exists public.production_shotlist (
  id uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.productions(id) on delete cascade,
  shot_number integer,
  description text not null,
  location text,
  notes text,
  done boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists production_shotlist_production_id_idx
  on public.production_shotlist(production_id, sort_order);
