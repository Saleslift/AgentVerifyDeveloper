/*
  # Fix Add to My Listings Functionality

  1. Changes
    - Drop existing policies to avoid conflicts
    - Create new simplified policies for agent_properties
    - Add proper constraints and checks
    - Enable RLS
  
  2. Security
    - Ensure agents can only add shared properties
    - Prevent duplicate listings
    - Maintain data integrity
*/

-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "agent_marketplace_additions_policy" ON agent_properties;
  DROP POLICY IF EXISTS "agent_property_management_policy" ON agent_properties;
  DROP POLICY IF EXISTS "agent_property_viewing_policy" ON agent_properties;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE agent_properties ENABLE ROW LEVEL SECURITY;

-- Create simplified policies
CREATE POLICY "agent_property_access"
ON agent_properties
FOR ALL
TO authenticated
USING (
  -- Can access if agent owns the property
  agent_id = auth.uid()
  OR
  -- Can access if property is shared
  EXISTS (
    SELECT 1 FROM properties
    WHERE id = property_id
    AND shared = true
  )
)
WITH CHECK (
  -- Can modify if agent owns the property
  agent_id = auth.uid()
  AND
  -- Property must exist and be shared for new additions
  EXISTS (
    SELECT 1 FROM properties
    WHERE id = property_id
    AND (
      agent_id = auth.uid() OR shared = true
    )
  )
);

-- Create function to check for duplicate properties
CREATE OR REPLACE FUNCTION check_duplicate_property()
RETURNS TRIGGER AS $$
BEGIN
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
    AND (agent_id = NEW.agent_id OR shared = true)
  ) THEN
    RAISE EXCEPTION 'Property not found or not available for sharing';
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

-- Grant necessary permissions
GRANT ALL ON agent_properties TO authenticated;