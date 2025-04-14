/*
  # Simplify Property Sharing System

  1. Changes
    - Simplify agent_properties table structure
    - Create clearer RLS policies
    - Add better constraints and validation
    - Improve error messages
  
  2. Security
    - Maintain data integrity
    - Prevent duplicate listings
    - Ensure proper access control
*/

-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "agent_property_access" ON agent_properties;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Simplify agent_properties table
ALTER TABLE agent_properties
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS updated_at;

-- Enable RLS
ALTER TABLE agent_properties ENABLE ROW LEVEL SECURITY;

-- Create simplified policy for property access
CREATE POLICY "marketplace_access"
ON agent_properties
FOR ALL
TO authenticated
USING (
  -- Can access if agent owns the listing
  agent_id = auth.uid()
)
WITH CHECK (
  -- Can only add/modify if:
  -- 1. Agent is adding for themselves
  agent_id = auth.uid()
  AND
  -- 2. Property exists and is shared
  EXISTS (
    SELECT 1 FROM properties
    WHERE id = property_id
    AND shared = true
    -- 3. Cannot add own property
    AND agent_id != auth.uid()
  )
);

-- Create function to validate property additions
CREATE OR REPLACE FUNCTION validate_property_addition()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if trying to add own property
  IF EXISTS (
    SELECT 1 FROM properties
    WHERE id = NEW.property_id
    AND agent_id = NEW.agent_id
  ) THEN
    RAISE EXCEPTION 'Cannot add your own property to listings';
  END IF;

  -- Check if property exists and is shared
  IF NOT EXISTS (
    SELECT 1 FROM properties
    WHERE id = NEW.property_id
    AND shared = true
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
  NEW.status := 'active';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
DROP TRIGGER IF EXISTS validate_property_addition_trigger ON agent_properties;
CREATE TRIGGER validate_property_addition_trigger
  BEFORE INSERT ON agent_properties
  FOR EACH ROW
  EXECUTE FUNCTION validate_property_addition();

-- Create unique constraint to prevent duplicates
ALTER TABLE agent_properties
DROP CONSTRAINT IF EXISTS agent_properties_property_id_agent_id_key;

ALTER TABLE agent_properties
ADD CONSTRAINT agent_properties_property_id_agent_id_key
UNIQUE (property_id, agent_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_properties_lookup
ON agent_properties(agent_id, property_id, status);

-- Grant necessary permissions
GRANT ALL ON agent_properties TO authenticated;