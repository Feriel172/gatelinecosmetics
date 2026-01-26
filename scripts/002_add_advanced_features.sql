-- Add missing columns to tables for archiving and editing
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS status_comment TEXT;

-- Create delivery_cities table for better city management
CREATE TABLE IF NOT EXISTS delivery_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name TEXT NOT NULL UNIQUE,
  delivery_cost DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS for delivery_cities
ALTER TABLE delivery_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on delivery_cities"
  ON delivery_cities FOR ALL USING (true) WITH CHECK (true);
