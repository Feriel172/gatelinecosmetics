-- Create collaborations table
CREATE TABLE IF NOT EXISTS collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('Instagram', 'TikTok', 'Both')),
  influencer_username TEXT NOT NULL,
  influencer_email TEXT NOT NULL,
  influencer_phone TEXT,
  collaboration_description TEXT,
  collaboration_date DATE NOT NULL,
  collaboration_type TEXT NOT NULL CHECK (collaboration_type IN ('unpaid', 'paid')),
  collaboration_rate DECIMAL(10, 2),
  products_sent JSONB DEFAULT '[]',
  shipping_city TEXT,
  shipping_address TEXT,
  total_cost DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT false,
  deletion_reason TEXT
);

-- Enable Row Level Security
ALTER TABLE collaborations ENABLE ROW LEVEL SECURITY;

-- Create RLS Policy
CREATE POLICY "Allow all operations on collaborations"
  ON collaborations FOR ALL USING (true) WITH CHECK (true);

-- Create index for date queries
CREATE INDEX IF NOT EXISTS idx_collaborations_date ON collaborations(collaboration_date);
