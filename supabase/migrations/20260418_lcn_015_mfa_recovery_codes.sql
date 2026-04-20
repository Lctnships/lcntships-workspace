-- LCN-015: MFA recovery codes
-- Gehashte back-up codes per user. Plaintext alleen 1x getoond bij genereren.

create table if not exists public.mfa_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists mfa_recovery_codes_user_id_idx on public.mfa_recovery_codes(user_id);

alter table public.mfa_recovery_codes enable row level security;

-- Gebruikers mogen alleen hun eigen codes zien (metadata, niet de hash zelf)
create policy "mfa_recovery_codes_own_select"
  on public.mfa_recovery_codes
  for select
  to authenticated
  using (user_id = auth.uid());

-- Alle mutaties gaan via API routes met service role — geen anon/authenticated writes
