-- LCN-023h: studio_spaces — namen/info van studio-ruimtes per bedrijf
-- Optioneel veld zodat je per studio-bedrijf kan vastleggen hoeveel
-- ruimtes ze hebben (Studio 1 — cyclorama, Studio 2 — daglicht, etc).

create table if not exists public.studio_spaces (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.sales_leads(id) on delete cascade,
  name text not null,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists studio_spaces_lead_id_idx
  on public.studio_spaces(lead_id, sort_order);
