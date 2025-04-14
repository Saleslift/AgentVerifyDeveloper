/*
  # Add Role Management

  1. Changes
    - Add role column to profiles table
    - Add role-specific columns
    - Update RLS policies for role-based access
  
  2. Security
    - Enforce role-based access control
    - Add policies for different roles
*/

-- Add role column to profiles
ALTER TABLE profiles
ADD COLUMN role text NOT NULL DEFAULT 'agent'
CHECK (role IN ('agent', 'agency', 'developer'));

-- Add role-specific columns
ALTER TABLE profiles
ADD COLUMN company_details jsonb,
ADD COLUMN developer_details jsonb;

-- Create function to validate role-specific data
CREATE OR REPLACE FUNCTION validate_role_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate agency role data
  IF NEW.role = 'agency' AND (
    NEW.company_details IS NULL OR
    NEW.company_details->>'name' IS NULL OR
    NEW.company_details->>'registration_number' IS NULL
  ) THEN
    RAISE EXCEPTION 'Agency profile must include company details';
  END IF;

  -- Validate developer role data
  IF NEW.role = 'developer' AND (
    NEW.developer_details IS NULL OR
    NEW.developer_details->>'company_name' IS NULL
  ) THEN
    RAISE EXCEPTION 'Developer profile must include company details';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for role data validation
CREATE TRIGGER validate_role_data_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_role_data();

-- Update RLS policies for role-based access

-- Job postings policy for agencies
CREATE POLICY "Only agencies can create job postings"
  ON job_postings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'agency'
    )
  );

-- Property management policies
CREATE POLICY "Agencies and developers can manage properties"
  ON properties
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('agency', 'developer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('agency', 'developer')
    )
  );

-- Agent management policies
CREATE POLICY "Only agencies can manage agents"
  ON agency_agents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'agency'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'agency'
    )
  );

-- Create indexes for role-based queries
CREATE INDEX idx_profiles_role ON profiles(role);