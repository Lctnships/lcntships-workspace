-- ── LCN-026: Company goals table ───────────────────────────────────────────────
-- Free-form goal tracker voor het dashboard. Toont waar het team naartoe werkt.

CREATE TABLE IF NOT EXISTS public.company_goals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  current_value   numeric NOT NULL DEFAULT 0,
  target_value    numeric,
  unit            text,                       -- bv. "studios", "deals", "€"
  deadline        date,
  done            boolean NOT NULL DEFAULT false,
  completed_at    timestamptz,
  sort_order      integer NOT NULL DEFAULT 0,
  created_by      text,                       -- email
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_goals_done_idx ON public.company_goals (done);
CREATE INDEX IF NOT EXISTS company_goals_deadline_idx ON public.company_goals (deadline);

ALTER TABLE public.company_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all_company_goals" ON public.company_goals;
CREATE POLICY "auth_all_company_goals"
  ON public.company_goals
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
