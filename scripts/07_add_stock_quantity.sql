-- Add quantity column to product_raw_materials for stock tracking
ALTER TABLE product_raw_materials ADD COLUMN IF NOT EXISTS quantity DECIMAL(10, 2) DEFAULT 0;

-- Add status column (will be calculated in app, but we can store it for quick reference)
ALTER TABLE product_raw_materials ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'out_of_stock';

-- Update comment
COMMENT ON COLUMN product_raw_materials.quantity IS 'Current stock quantity for this raw material assigned to a product';
COMMENT ON COLUMN product_raw_materials.status IS 'Stock status: in_stock, low_stock, out_of_stock';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_product_raw_materials_quantity ON product_raw_materials(quantity);
CREATE INDEX IF NOT EXISTS idx_product_raw_materials_status ON product_raw_materials(status);
