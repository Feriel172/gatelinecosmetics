-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  recipe TEXT,
  ingredient_details JSONB DEFAULT '[]',
  production_cost DECIMAL(10, 2),
  selling_price DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create supplier orders table
CREATE TABLE IF NOT EXISTS supplier_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_date TIMESTAMP DEFAULT NOW(),
  total_amount DECIMAL(10, 2),
  order_items JSONB NOT NULL DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  instagram_handle TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create customer orders table
CREATE TABLE IF NOT EXISTS customer_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_reference TEXT NOT NULL UNIQUE,
  order_date TIMESTAMP DEFAULT NOW(),
  order_items JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(10, 2),
  delivery_cost DECIMAL(10, 2),
  total_amount DECIMAL(10, 2),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create delivery zones/rates table for flexible delivery cost calculations
CREATE TABLE IF NOT EXISTS delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_name TEXT NOT NULL,
  delivery_cost DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (allowing all operations for now - owner can restrict later)
CREATE POLICY "Allow all operations on products"
  ON products FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on suppliers"
  ON suppliers FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on supplier_orders"
  ON supplier_orders FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on customers"
  ON customers FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on customer_orders"
  ON customer_orders FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on delivery_zones"
  ON delivery_zones FOR ALL USING (true) WITH CHECK (true);
