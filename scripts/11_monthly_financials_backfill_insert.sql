-- Backfill script (INSERT-only) to ensure monthly_financials is NOT empty.
--
-- What it does:
-- 1) Creates month_key rows for every distinct YYYY-MM month found in:
--    - customer_orders.order_date
--    - professionnels_orders.order_date
-- 2) Inserts missing rows into monthly_financials with 0 revenue/profit.
-- 3) (Optional) If compute functions are correct in your DB, you can later populate real values using
--    upsert_monthly_financials(month_key).
--
-- Usage:
-- - Run in Supabase SQL editor.

INSERT INTO monthly_financials (
  month_key,
  customer_revenue,
  customer_profit,
  business_revenue,
  business_profit,
  total_revenue,
  total_profit,
  period_locked_at,
  updated_at
)
SELECT
  month_key,
  0::DECIMAL(18,2) AS customer_revenue,
  0::DECIMAL(18,2) AS customer_profit,
  0::DECIMAL(18,2) AS business_revenue,
  0::DECIMAL(18,2) AS business_profit,
  0::DECIMAL(18,2) AS total_revenue,
  0::DECIMAL(18,2) AS total_profit,
  NULL::TIMESTAMP AS period_locked_at,
  NOW() AS updated_at
FROM (
  SELECT DISTINCT to_char(order_date::date, 'YYYY-MM') AS month_key
  FROM customer_orders
  WHERE order_date IS NOT NULL

  UNION

  SELECT DISTINCT to_char(order_date::date, 'YYYY-MM') AS month_key
  FROM professionnels_orders
  WHERE order_date IS NOT NULL
) months
WHERE NOT EXISTS (
  SELECT 1
  FROM monthly_financials mf
  WHERE mf.month_key = months.month_key
);

-- Verification
-- Uncomment to check what exists:
-- SELECT *
-- FROM monthly_financials
-- ORDER BY month_key DESC
-- LIMIT 24;

