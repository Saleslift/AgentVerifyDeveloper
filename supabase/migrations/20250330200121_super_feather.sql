-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "anyone_can_insert" ON leads;
  DROP POLICY IF EXISTS "Allow public inserts" ON leads;
  DROP POLICY IF EXISTS "Allow authenticated reads" ON leads;
  DROP POLICY IF EXISTS "Allow authenticated updates" ON leads;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Drop and recreate the leads table to ensure clean state
DROP TABLE IF EXISTS leads CASCADE;

-- Create leads table
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  whatsapp text NOT NULL,
  budget text NOT NULL,
  timeline text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create single policy to allow public inserts
CREATE POLICY "public_insert_leads"
  ON leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_status ON leads(status);

-- Create trigger for updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT INSERT ON leads TO anon;
GRANT INSERT ON leads TO authenticated;