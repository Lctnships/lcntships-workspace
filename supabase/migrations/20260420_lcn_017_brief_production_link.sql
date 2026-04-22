-- LCN-017: koppel content_briefs aan productions (F1)
-- Geen FK want beide tabellen staan in hetzelfde workspace project.

alter table public.content_briefs
  add column if not exists production_id uuid references public.productions(id) on delete set null;

create index if not exists content_briefs_production_id_idx
  on public.content_briefs(production_id);
