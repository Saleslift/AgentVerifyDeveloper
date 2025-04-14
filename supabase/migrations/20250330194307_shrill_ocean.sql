/*
  # Fix Leads Table RLS Policies

  1. Changes
    - Drop and recreate leads table
    - Add proper RLS policies
    - Enable public inserts
    - Allow authenticated viewing
  
  2. Security
    - Enable RLS
    - Add proper policies
    - Ensure data integrity
*/

-- Drop existing table and policies
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

-- Create indexes
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_status ON leads(status);

-- Create policies with proper security
CREATE POLICY "Enable insert access for all users"
ON leads FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Enable read access for authenticated users only"
ON leads FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable update access for authenticated users only"
ON leads FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON leads TO authenticated;
GRANT INSERT ON leads TO anon;