-- LCN-020: workspace_documents (Plate rich text)
-- Aparte tabel zodat bestaande `documents` (file uploads) niet vervuild wordt.
-- Geen FK naar auth.users — cross-project issue; created_by als plain uuid.

create table if not exists public.workspace_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Naamloos document',
  content jsonb not null default '[]'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_documents_updated_at_idx
  on public.workspace_documents(updated_at desc);

alter table public.workspace_documents enable row level security;

create policy "workspace_documents_auth_all"
  on public.workspace_documents
  for all
  to authenticated
  using (true)
  with check (true);

create or replace function public.set_workspace_documents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists workspace_documents_set_updated_at on public.workspace_documents;
create trigger workspace_documents_set_updated_at
  before update on public.workspace_documents
  for each row execute function public.set_workspace_documents_updated_at();
