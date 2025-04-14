/*
  # Fix Property Management RLS Policies

  1. Changes
    - Add RLS policies for agencies to manage properties
    - Fix agency_properties table policies
    - Update properties table policies
    
  2. Security
    - Allow agencies to create and manage properties
    - Enable proper property sharing
*/

-- Update properties table policies
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON properties;
DROP POLICY IF EXISTS "Agents can insert own properties" ON properties;
DROP POLICY IF EXISTS "Agents can update own properties" ON properties;
DROP POLICY IF EXISTS "Agents can delete own properties" ON properties;

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

-- Update agency_properties table policies
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON agency_properties;
DROP POLICY IF EXISTS "Agencies can manage their properties" ON agency_properties;

CREATE POLICY "Agencies can manage agency properties"
ON agency_properties
FOR ALL
TO authenticated
USING (
  -- Check if user is the agency or belongs to the agency
  agency_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM agency_agents
    WHERE agency_agents.agent_id = auth.uid()
    AND agency_agents.agency_id = agency_properties.agency_id
    AND agency_agents.status = 'active'
  )
)
WITH CHECK (
  -- Allow creation/update if user is the agency or belongs to the agency
  agency_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM agency_agents
    WHERE agency_agents.agent_id = auth.uid()
    AND agency_agents.agency_id = agency_properties.agency_id
    AND agency_agents.status = 'active'
  )
);

-- Grant necessary permissions
GRANT ALL ON properties TO authenticated;
GRANT ALL ON agency_properties TO authenticated;