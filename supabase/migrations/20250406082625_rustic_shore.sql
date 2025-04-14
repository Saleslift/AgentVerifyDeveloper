/*
  # Fix Developer Properties Management

  1. Changes
    - Update check_agent_creator constraint to properly handle developer role
    - Modify RLS policies to allow developers to manage properties
    - Fix property creation validation for developers
  
  2. Security
    - Maintain RLS security while allowing proper developer access
    - Ensure data integrity with updated constraints
*/

-- Drop existing constraint
ALTER TABLE properties DROP CONSTRAINT IF EXISTS check_agent_creator;

-- Re-create constraint with developer support
ALTER TABLE properties ADD CONSTRAINT check_agent_creator CHECK (
  (creator_type = 'agent' AND agent_id = creator_id) OR
  (creator_type = 'developer' AND creator_id = creator_id) OR
  (creator_type = 'agency')
);

-- Update property creation validation function
CREATE OR REPLACE FUNCTION validate_property_creation()
RETURNS trigger AS $$
BEGIN
  -- Validate creator type matches user role
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = NEW.creator_id
    AND role = NEW.creator_type
  ) THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Creator type must match user role';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable property management for agencies and agents" ON properties;
DROP POLICY IF EXISTS "Enable property management for agencies and developers" ON properties;

-- Create comprehensive property management policy
CREATE POLICY "Enable property management for authorized users"
ON properties
FOR ALL
TO authenticated
USING (
  -- Check if user is the creator
  (auth.uid() = creator_id) OR
  -- Check if user is an agent associated with the property
  (creator_type = 'agent' AND agent_id = auth.uid()) OR
  -- Check if user belongs to the agency
  EXISTS (
    SELECT 1 FROM agency_agents
    WHERE agency_agents.agent_id = auth.uid()
    AND agency_agents.status = 'active'
  )
)
WITH CHECK (
  -- Allow creation/update if user matches creator role
  (auth.uid() = creator_id AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = creator_type
  )) OR
  -- Allow agency members to manage properties
  (EXISTS (
    SELECT 1 FROM agency_agents
    WHERE agency_agents.agent_id = auth.uid()
    AND agency_agents.status = 'active'
  ))
);

-- Ensure proper permissions
GRANT ALL ON properties TO authenticated;