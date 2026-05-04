-- LCN-023b: drop cross-project FKs op productions.
-- created_by verwijst naar auth.users in workspace DB, maar de echte user
-- staat in het main Supabase project. Zelfde fix als LCN-016b voor outbox.
-- Productie van een nieuwe productie faalt anders met foreign key violation.

alter table public.productions
  drop constraint if exists productions_created_by_fkey;

-- Voor de zekerheid ook eventuele andere user-FKs droppen
alter table public.productions
  drop constraint if exists productions_user_id_fkey;
