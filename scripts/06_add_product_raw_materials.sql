-- Create junction table for product-raw material relationships
CREATE TABLE product_raw_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  quantity DECIMAL(10, 2), -- Optional quantity needed for the product
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, raw_material_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_product_raw_materials_product ON product_raw_materials(product_id);
CREATE INDEX idx_product_raw_materials_raw_material ON product_raw_materials(raw_material_id);

-- Enable Row Level Security
ALTER TABLE product_raw_materials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for product_raw_materials table
CREATE POLICY "Allow authenticated users to view product_raw_materials" ON product_raw_materials
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert product_raw_materials" ON product_raw_materials
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update product_raw_materials" ON product_raw_materials
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete product_raw_materials" ON product_raw_materials
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add comment to clarify the table purpose
COMMENT ON TABLE product_raw_materials IS 'Junction table linking products to their required raw materials';
COMMENT ON COLUMN product_raw_materials.quantity IS 'Quantity of raw material needed per product unit (optional)';
