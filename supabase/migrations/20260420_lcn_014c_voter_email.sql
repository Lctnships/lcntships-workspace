-- LCN-014c: optioneel email-veld op votes zodat we voters kunnen informeren
alter table public.production_votes
  add column if not exists voter_email text;
