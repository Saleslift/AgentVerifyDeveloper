-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Enable insert access for all users" ON leads;
  DROP POLICY IF EXISTS "Enable read access for authenticated users only" ON leads;
  DROP POLICY IF EXISTS "Enable update access for authenticated users only" ON leads;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create simplified policies
CREATE POLICY "public_insert_policy"
ON leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "auth_select_policy"
ON leads
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "auth_update_policy"
ON leads
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT INSERT ON leads TO anon;
GRANT INSERT ON leads TO authenticated;
GRANT SELECT, UPDATE ON leads TO authenticated;