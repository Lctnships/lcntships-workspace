-- LCN-023e: crew register tabel — losse administratie van freelancers / vaste crew
-- Deze tabel houdt geen accounts bij (daar is team_members voor),
-- alleen contactgegevens voor productie-administratie.

create table if not exists public.crew_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  default_role text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- production_crew krijgt FK naar crew_members. De oude losse kolommen
-- (name/email/role) blijven in productie-context bestaan zodat je per
-- productie een afwijkende rol kunt zetten.
alter table public.production_crew
  add column if not exists crew_member_id uuid references public.crew_members(id) on delete set null;

create index if not exists production_crew_crew_member_id_idx
  on public.production_crew(crew_member_id);
