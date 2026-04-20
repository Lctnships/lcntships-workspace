-- LCN-016b: drop foreign key on email_outbox.user_id
-- De user bestaat in het main Supabase project (ytmkmiofoluespwysfxa), niet
-- in workspace (xiuplzawiionroxgwvsa). De FK kan cross-project niet enforcen
-- en blokkeert nu elke insert. Kolom blijft bestaan als losse identifier.

alter table public.email_outbox
  drop constraint if exists email_outbox_user_id_fkey;

-- Zelfde probleem op mfa_recovery_codes (zelfde cross-project FK)
alter table public.mfa_recovery_codes
  drop constraint if exists mfa_recovery_codes_user_id_fkey;
