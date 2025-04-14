-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow public to insert messages" ON leads;
  DROP POLICY IF EXISTS "Allow authenticated users to view messages" ON leads;
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

-- Create policy for public inserts
CREATE POLICY "Allow public inserts"
  ON leads
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create policy for authenticated reads
CREATE POLICY "Allow authenticated reads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for authenticated updates
CREATE POLICY "Allow authenticated updates"
  ON leads
  FOR UPDATE
  TO authenticated
  USING (true)
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
GRANT ALL ON leads TO authenticated;
GRANT INSERT ON leads TO public;