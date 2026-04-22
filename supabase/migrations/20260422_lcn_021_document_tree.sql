-- LCN-021: extra kolommen voor Notion-achtige document-hiërarchie + visual metadata
-- Voor page-tree sidebar + cover + icon per document.

alter table public.workspace_documents
  add column if not exists parent_id uuid references public.workspace_documents(id) on delete set null,
  add column if not exists icon text,
  add column if not exists cover_url text,
  add column if not exists sort_order integer not null default 0;

create index if not exists workspace_documents_parent_id_idx
  on public.workspace_documents(parent_id);
