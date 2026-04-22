-- LCN-018 F3: track crew briefing sends
-- Brief heeft al share_link (uuid). Elke send-event wordt apart gelogd
-- zodat we weten wie/wanneer de brief heeft ontvangen.

create table if not exists public.brief_shares (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references public.content_briefs(id) on delete cascade,
  recipient_email text not null,
  outbox_id uuid,
  opened_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists brief_shares_brief_id_idx on public.brief_shares(brief_id);
create index if not exists brief_shares_email_idx on public.brief_shares(recipient_email);

alter table public.brief_shares enable row level security;

create policy "brief_shares_auth_all"
  on public.brief_shares
  for all
  to authenticated
  using (true)
  with check (true);
