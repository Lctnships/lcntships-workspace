-- LCN-014b: deadline per productie + anti-dubbele stemmen per naam
alter table public.productions
  add column if not exists deadline timestamptz;

-- Eén stem per (productie, naam) — case-insensitive matching via lower()
create unique index if not exists production_votes_unique_per_name
  on public.production_votes (production_id, lower(voter_name));
