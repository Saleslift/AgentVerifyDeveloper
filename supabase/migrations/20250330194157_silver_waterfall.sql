/*
  # Fix Leads Table Migration

  1. Changes
    - Add safety checks for existing table
    - Create table only if it doesn't exist
    - Add indexes and policies safely
  
  2. Security
    - Enable RLS
    - Add policies for data access
*/

-- Create leads table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'leads'
  ) THEN
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
  END IF;
END $$;

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_email'
  ) THEN
    CREATE INDEX idx_leads_email ON leads(email);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_created_at'
  ) THEN
    CREATE INDEX idx_leads_created_at ON leads(created_at);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_status'
  ) THEN
    CREATE INDEX idx_leads_status ON leads(status);
  END IF;
END $$;

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow public to insert leads" ON leads;
  DROP POLICY IF EXISTS "Allow authenticated users to view leads" ON leads;
  DROP POLICY IF EXISTS "Allow authenticated users to update leads" ON leads;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create policies
CREATE POLICY "Allow public to insert leads"
  ON leads
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to update leads"
  ON leads
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create trigger for updated_at if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_leads_updated_at'
  ) THEN
    CREATE TRIGGER update_leads_updated_at
      BEFORE UPDATE ON leads
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;