-- LCN-023: koppel productie aan een specifieke geklosde studio (sales_lead).
-- Cross-project FK kan niet (sales_leads zit in workspace, productions ook,
-- maar voor de zekerheid alleen kolom + index, geen harde FK).

alter table public.productions
  add column if not exists lead_id uuid;

create index if not exists productions_lead_id_idx on public.productions(lead_id);

-- Eén productie per lead afdwingen — partial unique index op niet-null lead_id
create unique index if not exists productions_lead_id_unique
  on public.productions(lead_id)
  where lead_id is not null;
