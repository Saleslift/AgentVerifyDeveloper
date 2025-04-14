/*
  # Fix Marketplace RLS Policies

  1. Changes
    - Simplify RLS policies for agent_properties
    - Fix property sharing logic
    - Add proper constraints and checks
  
  2. Security
    - Ensure proper access control
    - Prevent duplicate listings
    - Enable marketplace functionality
*/

-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "agent_property_access" ON agent_properties;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE agent_properties ENABLE ROW LEVEL SECURITY;

-- Create simplified policy for agent property access
CREATE POLICY "agent_property_access"
ON agent_properties
FOR ALL
TO authenticated
USING (
  -- Can access if agent owns the property
  agent_id = auth.uid()
)
WITH CHECK (
  -- Can modify if agent owns the property
  agent_id = auth.uid()
  AND
  -- For new additions, property must be shared and not owned by the agent
  EXISTS (
    SELECT 1 FROM properties
    WHERE id = property_id
    AND shared = true
    AND agent_id != auth.uid()
  )
);

-- Create function to check for duplicate properties
CREATE OR REPLACE FUNCTION check_duplicate_property()
RETURNS TRIGGER AS $$
DECLARE
  v_property_owner uuid;
BEGIN
  -- Get property owner
  SELECT agent_id INTO v_property_owner
  FROM properties
  WHERE id = NEW.property_id;

  -- Check if trying to add own property
  IF v_property_owner = NEW.agent_id THEN
    RAISE EXCEPTION 'Cannot add your own property to listings';
  END IF;

  -- Check for existing active listing
  IF EXISTS (
    SELECT 1 FROM agent_properties
    WHERE property_id = NEW.property_id
    AND agent_id = NEW.agent_id
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Property is already in your listings';
  END IF;

  -- Check if property exists and is shared
  IF NOT EXISTS (
    SELECT 1 FROM properties
    WHERE id = NEW.property_id
    AND shared = true
  ) THEN
    RAISE EXCEPTION 'Property not found or not available for sharing';
  END IF;

  -- Set default status if not provided
  IF NEW.status IS NULL THEN
    NEW.status := 'active';
  END IF;

  -- Set timestamps if not provided
  IF NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;
  
  IF NEW.updated_at IS NULL THEN
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent duplicates
DROP TRIGGER IF EXISTS prevent_duplicate_properties ON agent_properties;
CREATE TRIGGER prevent_duplicate_properties
  BEFORE INSERT ON agent_properties
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_property();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_agent_properties_lookup
ON agent_properties(agent_id, property_id, status);

-- Grant necessary permissions
GRANT ALL ON agent_properties TO authenticated;