-- Add packaging columns to products table
--flacon: indicates if product needs a bottle (flacon)
--masque: indicates if product needs a mask (masque)
--etiquette: indicates if product needs a label (étiquette)

ALTER TABLE products ADD COLUMN IF NOT EXISTS flacon BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS masque BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS etiquette BOOLEAN DEFAULT false;

COMMENT ON COLUMN products.flacon IS 'Whether the product requires a bottle (flacon)';
COMMENT ON COLUMN products.masque IS 'Whether the product requires a mask (masque)';
COMMENT ON COLUMN products.etiquette IS 'Whether the product requires a label (étiquette)';

-- Update comment on products table
COMMENT ON TABLE products IS 'Products table with packaging info (flacon, masque, etiquette)';
