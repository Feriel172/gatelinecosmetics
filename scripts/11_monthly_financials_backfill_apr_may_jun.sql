-- Backfill real values for April/May/June (no 0 placeholders).
--
-- IMPORTANT:
-- Run this in the Supabase SQL editor (Postgres), not in PowerShell.
-- The script uses your existing functions:
--   - upsert_monthly_financials(p_month_key TEXT)
-- which recomputes revenue/profit snapshots for that month.
--
-- Edit the YEAR below if needed.

DO $$
DECLARE
  y INT := 2026; -- <-- change year
BEGIN
  -- April, May, June
  PERFORM upsert_monthly_financials(to_char(make_date(y, 4, 1), 'YYYY-MM'));
  PERFORM upsert_monthly_financials(to_char(make_date(y, 5, 1), 'YYYY-MM'));
  PERFORM upsert_monthly_financials(to_char(make_date(y, 6, 1), 'YYYY-MM'));
END $$;

-- Verification
-- SELECT *
-- FROM monthly_financials
-- WHERE month_key IN (
--   to_char(make_date((SELECT 2026), 4, 1), 'YYYY-MM'),
--   to_char(make_date((SELECT 2026), 5, 1), 'YYYY-MM'),
--   to_char(make_date((SELECT 2026), 6, 1), 'YYYY-MM')
-- )
-- ORDER BY month_key;

