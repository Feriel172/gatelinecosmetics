-- Create raw_materials table for inventory management
CREATE TABLE raw_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better query performance
CREATE INDEX idx_raw_materials_name ON raw_materials(name);

-- Enable Row Level Security
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for raw_materials table
-- Allow authenticated users to view all raw materials
CREATE POLICY "Allow authenticated users to view raw materials" ON raw_materials
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert new raw materials
CREATE POLICY "Allow authenticated users to insert raw materials" ON raw_materials
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update raw materials
CREATE POLICY "Allow authenticated users to update raw materials" ON raw_materials
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete raw materials
CREATE POLICY "Allow authenticated users to delete raw materials" ON raw_materials
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add comment to clarify the table purpose
COMMENT ON TABLE raw_materials IS 'Raw materials and components used in product manufacturing (bottles, bags, packages, etc.)';
COMMENT ON COLUMN raw_materials.name IS 'Name of the raw material or component';
COMMENT ON COLUMN raw_materials.description IS 'Optional description of the raw material';
