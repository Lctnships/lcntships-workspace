-- ── LCN-027: Weekly reviews snapshot table ──────────────────────────────────
-- Per ISO-week een snapshot van welke leads er die week zijn beoordeeld,
-- plus optionele notities. Sluit de week af door closed_at te zetten.

CREATE TABLE IF NOT EXISTS public.weekly_reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_iso        text NOT NULL UNIQUE,        -- bv. "2026-W19"
  notes           text,
  pipeline_ids    uuid[] NOT NULL DEFAULT '{}',
  archived_ids    uuid[] NOT NULL DEFAULT '{}',
  pending_ids     uuid[] NOT NULL DEFAULT '{}',
  closed_at       timestamptz,
  closed_by       text,                        -- email
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS weekly_reviews_week_idx ON public.weekly_reviews (week_iso);
CREATE INDEX IF NOT EXISTS weekly_reviews_closed_idx ON public.weekly_reviews (closed_at);

ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all_weekly_reviews" ON public.weekly_reviews;
CREATE POLICY "auth_all_weekly_reviews"
  ON public.weekly_reviews
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
