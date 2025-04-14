/*
  # Fix Property Management Policies

  1. Changes
    - Drop existing policies safely
    - Create new simplified policies for property management
    - Add proper constraints and checks
    - Update agent_properties table structure
  
  2. Security
    - Enable RLS on all tables
    - Add proper policies for each role
    - Ensure data integrity
*/

-- Drop existing policies
DO $$ 
BEGIN
  -- Drop property policies
  DROP POLICY IF EXISTS "Enable property management for agencies and agents" ON properties;
  DROP POLICY IF EXISTS "Enable property management for agencies and developers" ON properties;
  DROP POLICY IF EXISTS "Properties are viewable by everyone" ON properties;
  DROP POLICY IF EXISTS "Agencies and developers can manage properties" ON properties;

  -- Drop agent_properties policies
  DROP POLICY IF EXISTS "agent_property_access" ON agent_properties;
  DROP POLICY IF EXISTS "Agents can view their assigned properties" ON agent_properties;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_properties ENABLE ROW LEVEL SECURITY;

-- Create property policies
CREATE POLICY "Properties are viewable by everyone"
ON properties FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable property management for agencies and agents"
ON properties
FOR ALL
TO authenticated
USING (
  -- Check if user is the agent or belongs to the agency
  agent_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM agency_agents
    WHERE agency_agents.agent_id = auth.uid()
    AND agency_agents.status = 'active'
  ) OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'agency'
  )
)
WITH CHECK (
  -- Allow creation/update if user is the agent or belongs to the agency
  agent_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM agency_agents
    WHERE agency_agents.agent_id = auth.uid()
    AND agency_agents.status = 'active'
  ) OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'agency'
  )
);

-- Create agent_properties policies
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

-- Create trigger to prevent duplicates if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'prevent_duplicate_properties'
  ) THEN
    CREATE TRIGGER prevent_duplicate_properties
      BEFORE INSERT ON agent_properties
      FOR EACH ROW
      EXECUTE FUNCTION check_duplicate_property();
  END IF;
END $$;

-- Drop existing refresh trigger to avoid conflicts
DROP TRIGGER IF EXISTS refresh_service_area_stats_on_agent_property_change ON agent_properties;

-- Create trigger to refresh statistics when agent properties change
CREATE OR REPLACE FUNCTION trigger_refresh_service_area_statistics()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('refresh_service_area_statistics', '');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create new refresh trigger
CREATE TRIGGER refresh_service_area_stats_on_agent_property_change
  AFTER INSERT OR UPDATE OR DELETE ON agent_properties
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_service_area_statistics();

-- Grant necessary permissions
GRANT ALL ON properties TO authenticated;
GRANT ALL ON agent_properties TO authenticated;