-- LCN-023i: workspace_todos — basis to-do list voor dashboard
-- Iedereen in de workspace kan taken aanmaken en assignen aan iedereen.
-- Geen mail-notificaties — alleen dashboard.

create table if not exists public.workspace_todos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  assigned_to_email text,
  assigned_to_name text,
  assigned_by_email text,
  due_date date,
  done boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists workspace_todos_assigned_to_idx
  on public.workspace_todos(assigned_to_email, done);

create index if not exists workspace_todos_due_date_idx
  on public.workspace_todos(due_date) where done = false;
