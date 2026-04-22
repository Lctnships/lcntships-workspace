-- LCN-019: drop alle cross-project FKs naar auth.users (bestaat in main DB, niet in workspace DB)

alter table public.productions
  drop constraint if exists productions_created_by_fkey;
