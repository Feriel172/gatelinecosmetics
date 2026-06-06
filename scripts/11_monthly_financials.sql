-- Monthly locked financial aggregates
-- Stores revenue/profit split for customer and business orders, plus totals.

CREATE TABLE IF NOT EXISTS monthly_financials (
  month_key TEXT PRIMARY KEY, -- YYYY-MM
  customer_revenue DECIMAL(18,2) NOT NULL DEFAULT 0,
  customer_profit DECIMAL(18,2) NOT NULL DEFAULT 0,
  business_revenue DECIMAL(18,2) NOT NULL DEFAULT 0,
  business_profit DECIMAL(18,2) NOT NULL DEFAULT 0,
  total_revenue DECIMAL(18,2) NOT NULL DEFAULT 0,
  total_profit DECIMAL(18,2) NOT NULL DEFAULT 0,
  -- when the month is locked/finalized (set by the app after end-of-month)
  period_locked_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Basic RLS: allow all for now (same pattern as other tables).
ALTER TABLE monthly_financials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on monthly_financials"
  ON monthly_financials FOR ALL USING (true) WITH CHECK (true);

-- Helper: compute profit for customer orders for a month.
-- Uses current product.production_cost at time of computation.
-- Once you lock the month, the app should avoid recomputing.
CREATE OR REPLACE FUNCTION compute_customer_month_financials(p_month_key TEXT)
RETURNS TABLE(customer_revenue DECIMAL(18,2), customer_profit DECIMAL(18,2))
LANGUAGE plpgsql AS $$
DECLARE
  y INT;
  m INT;
  start_d DATE;
  end_d DATE;
BEGIN
  y := substring(p_month_key from 1 for 4)::INT;
  m := substring(p_month_key from 6 for 2)::INT;
  start_d := make_date(y, m, 1);
  end_d := (make_date(y, m, 1) + interval '1 month')::date;

  RETURN QUERY
  WITH scoped AS (
    SELECT *
    FROM customer_orders
    WHERE status = 'confirmée'
      AND is_archived = false
      AND order_date >= start_d
      AND order_date < end_d
  )
  SELECT
    COALESCE(SUM((subtotal || 0)::DECIMAL), 0) AS customer_revenue,
    COALESCE(SUM( (item_selling - item_cost) * item_qty ), 0) AS customer_profit
  FROM scoped,
       LATERAL (
         SELECT
           ( (item->>'price')::DECIMAL ) AS item_selling,
           ( (item->>'quantity')::DECIMAL ) AS item_qty,
           COALESCE(prod.production_cost::DECIMAL, 0) AS item_cost
         FROM jsonb_array_elements(scoped.order_items) item
         LEFT JOIN products prod
           ON prod.id = (item->>'product_id')::uuid
       ) calc;
END;
$$;

-- Helper: compute business orders for a month.
CREATE OR REPLACE FUNCTION compute_business_month_financials(p_month_key TEXT)
RETURNS TABLE(business_revenue DECIMAL(18,2), business_profit DECIMAL(18,2))
LANGUAGE plpgsql AS $$
DECLARE
  y INT;
  m INT;
  start_d DATE;
  end_d DATE;
BEGIN
  y := substring(p_month_key from 1 for 4)::INT;
  m := substring(p_month_key from 6 for 2)::INT;
  start_d := make_date(y, m, 1);
  end_d := (make_date(y, m, 1) + interval '1 month')::date;

  RETURN QUERY
  WITH scoped AS (
    SELECT *
    FROM professionnels_orders
    WHERE is_archived = false
      AND order_date >= start_d
      AND order_date < end_d
  )
  SELECT
    COALESCE(SUM((total_amount || 0)::DECIMAL), 0) AS business_revenue,
    COALESCE(SUM( (item_selling - item_cost) * item_qty ), 0) AS business_profit
  FROM scoped,
       LATERAL (
         SELECT
           ( (item->>'price')::DECIMAL ) AS item_selling,
           ( (item->>'quantity')::DECIMAL ) AS item_qty,
           COALESCE(prod.production_cost::DECIMAL, 0) AS item_cost
         FROM jsonb_array_elements(scoped.order_items) item
         LEFT JOIN products prod
           ON prod.id = (item->>'product_id')::uuid
       ) calc;
END;
$$;

-- Upsert monthly totals by recomputing contributions for that month.
-- This should be called whenever a relevant order becomes confirmed / saved.
-- If the month is locked (period_locked_at not null), the function does nothing.
CREATE OR REPLACE FUNCTION upsert_monthly_financials(p_month_key TEXT)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
  cust_rev DECIMAL(18,2) := 0;
  cust_profit DECIMAL(18,2) := 0;
  biz_rev DECIMAL(18,2) := 0;
  biz_profit DECIMAL(18,2) := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM monthly_financials WHERE month_key = p_month_key AND period_locked_at IS NOT NULL) THEN
    RETURN;
  END IF;

  SELECT * INTO cust_rev, cust_profit FROM compute_customer_month_financials(p_month_key);
  SELECT * INTO biz_rev, biz_profit FROM compute_business_month_financials(p_month_key);

  INSERT INTO monthly_financials(
    month_key,
    customer_revenue,
    customer_profit,
    business_revenue,
    business_profit,
    total_revenue,
    total_profit,
    period_locked_at,
    updated_at
  ) VALUES (
    p_month_key,
    COALESCE(cust_rev, 0),
    COALESCE(cust_profit, 0),
    COALESCE(biz_rev, 0),
    COALESCE(biz_profit, 0),
    COALESCE(cust_rev, 0) + COALESCE(biz_rev, 0),
    COALESCE(cust_profit, 0) + COALESCE(biz_profit, 0),
    NULL,
    NOW()
  )
  ON CONFLICT (month_key) DO UPDATE SET
    customer_revenue = EXCLUDED.customer_revenue,
    customer_profit = EXCLUDED.customer_profit,
    business_revenue = EXCLUDED.business_revenue,
    business_profit = EXCLUDED.business_profit,
    total_revenue = EXCLUDED.total_revenue,
    total_profit = EXCLUDED.total_profit,
    updated_at = NOW();
END;
$$;

