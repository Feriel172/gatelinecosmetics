-- Add supplier_id column to supplier_orders if it doesn't exist
ALTER TABLE supplier_orders
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;

-- Ensure order_items column exists and is properly typed
ALTER TABLE supplier_orders
ADD COLUMN IF NOT EXISTS order_items JSONB DEFAULT '[]';
