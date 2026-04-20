-- LCN-014: Production agenda polls
-- Workspace users create productions with proposed dates and share a public link.
-- Anyone with the link can submit which dates they can make (no login required).

create table if not exists public.productions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  proposed_dates date[] not null,
  share_token text not null unique,
  status text not null default 'open' check (status in ('open', 'closed')),
  final_date date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists productions_share_token_idx on public.productions(share_token);
create index if not exists productions_created_at_idx on public.productions(created_at desc);

create table if not exists public.production_votes (
  id uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.productions(id) on delete cascade,
  voter_name text not null,
  available_dates date[] not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists production_votes_production_id_idx on public.production_votes(production_id);

alter table public.productions enable row level security;
alter table public.production_votes enable row level security;

create policy "productions_authenticated_all"
  on public.productions
  for all
  to authenticated
  using (true)
  with check (true);

create policy "productions_anon_select"
  on public.productions
  for select
  to anon
  using (status = 'open');

create policy "production_votes_authenticated_all"
  on public.production_votes
  for all
  to authenticated
  using (true)
  with check (true);

create policy "production_votes_anon_insert"
  on public.production_votes
  for insert
  to anon
  with check (
    exists (
      select 1 from public.productions p
      where p.id = production_id and p.status = 'open'
    )
  );

create or replace function public.set_productions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists productions_set_updated_at on public.productions;
create trigger productions_set_updated_at
  before update on public.productions
  for each row execute function public.set_productions_updated_at();
