-- LCN-016: Email outbox pattern
-- Elke intent-to-send wordt eerst vastgelegd, daarna pas verstuurd via Resend.
-- Zo kunnen crashes / bugs nooit meer stil emails verliezen.

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  source text not null,
  user_id uuid references auth.users(id) on delete set null,
  to_email text not null,
  to_name text,
  from_email text not null,
  from_name text,
  subject text not null,
  html text,
  text_body text,
  lead_id uuid,
  metadata jsonb default '{}'::jsonb,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  last_error text,
  resend_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists email_outbox_status_idx on public.email_outbox(status, created_at);
create index if not exists email_outbox_created_at_idx on public.email_outbox(created_at desc);

alter table public.email_outbox enable row level security;

-- Workspace users kunnen hun eigen outbox zien (voor UI)
create policy "email_outbox_own_select"
  on public.email_outbox
  for select
  to authenticated
  using (user_id = auth.uid());

-- Alle mutaties via service role (API routes)

create or replace function public.set_email_outbox_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists email_outbox_set_updated_at on public.email_outbox;
create trigger email_outbox_set_updated_at
  before update on public.email_outbox
  for each row execute function public.set_email_outbox_updated_at();
