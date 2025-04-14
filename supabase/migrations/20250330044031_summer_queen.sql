/*
  # Add Property Form Differentiation

  1. Changes
    - Add creator_type and creator_id columns to properties table
    - Add constraints to ensure valid creator types
    - Add foreign key constraint for creator_id
    - Add check constraint for agent_id/creator_id relationship
  
  2. Security
    - Enable RLS on properties table
    - Add policies for different creator types
    - Ensure data integrity with constraints
*/

-- Add new columns to properties table
ALTER TABLE properties
ADD COLUMN creator_type text NOT NULL DEFAULT 'agent'
CHECK (creator_type IN ('agent', 'agency', 'developer')),
ADD COLUMN creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

-- Add constraint to ensure agent_id equals creator_id when creator_type is 'agent'
ALTER TABLE properties
ADD CONSTRAINT check_agent_creator
CHECK (
  (creator_type = 'agent' AND agent_id = creator_id) OR
  (creator_type != 'agent')
);

-- Create index for faster lookups
CREATE INDEX idx_properties_creator ON properties(creator_type, creator_id);

-- Update existing properties to set creator_type and creator_id
UPDATE properties
SET 
  creator_type = 'agent',
  creator_id = agent_id
WHERE creator_type IS NULL OR creator_id IS NULL;

-- Create or replace function to validate property creation
CREATE OR REPLACE FUNCTION validate_property_creation()
RETURNS trigger AS $$
BEGIN
  -- Validate creator type matches user role
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = NEW.creator_id
    AND role = NEW.creator_type
  ) THEN
    RAISE EXCEPTION 'Creator type must match user role';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for property creation validation
CREATE TRIGGER validate_property_creation_trigger
  BEFORE INSERT OR UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION validate_property_creation();

-- Update RLS policies
CREATE POLICY "Enable property management for agencies and developers"
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