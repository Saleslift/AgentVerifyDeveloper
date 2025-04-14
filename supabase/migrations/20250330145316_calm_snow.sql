/*
  # Simplify Property Sharing

  1. Changes
    - Simplify agent_properties table structure
    - Create single, clear RLS policy
    - Add validation function
    - Add necessary indexes
  
  2. Security
    - Prevent duplicate listings
    - Validate property availability
    - Ensure proper access control
*/

-- Drop existing policies and triggers
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "marketplace_access" ON agent_properties;
  DROP TRIGGER IF EXISTS validate_property_addition_trigger ON agent_properties;
  DROP FUNCTION IF EXISTS validate_property_addition();
END $$;

-- Simplify agent_properties table
TRUNCATE agent_properties;

ALTER TABLE agent_properties
DROP COLUMN IF EXISTS created_at,
DROP COLUMN IF EXISTS updated_at;

-- Enable RLS
ALTER TABLE agent_properties ENABLE ROW LEVEL SECURITY;

-- Create single, simple policy
CREATE POLICY "marketplace_access"
ON agent_properties
FOR ALL
TO authenticated
USING (agent_id = auth.uid())
WITH CHECK (
  agent_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM properties
    WHERE id = property_id
    AND shared = true
    AND agent_id != auth.uid()
  )
);

-- Create validation function
CREATE OR REPLACE FUNCTION validate_property_addition()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if property exists and is shared
  IF NOT EXISTS (
    SELECT 1 FROM properties
    WHERE id = NEW.property_id
    AND shared = true
    AND agent_id != NEW.agent_id
  ) THEN
    RAISE EXCEPTION 'Property not found or not available for sharing';
  END IF;

  -- Check for duplicate listing
  IF EXISTS (
    SELECT 1 FROM agent_properties
    WHERE property_id = NEW.property_id
    AND agent_id = NEW.agent_id
  ) THEN
    RAISE EXCEPTION 'Property is already in your listings';
  END IF;

  -- Set default status
  NEW.status := COALESCE(NEW.status, 'active');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create validation trigger
CREATE TRIGGER validate_property_addition_trigger
  BEFORE INSERT ON agent_properties
  FOR EACH ROW
  EXECUTE FUNCTION validate_property_addition();

-- Create unique constraint
ALTER TABLE agent_properties
DROP CONSTRAINT IF EXISTS agent_properties_property_id_agent_id_key;

ALTER TABLE agent_properties
ADD CONSTRAINT agent_properties_property_id_agent_id_key
UNIQUE (property_id, agent_id);

-- Create lookup index
DROP INDEX IF EXISTS idx_agent_properties_lookup;
CREATE INDEX idx_agent_properties_lookup
ON agent_properties(agent_id, property_id, status);

-- Grant permissions
GRANT ALL ON agent_properties TO authenticated;