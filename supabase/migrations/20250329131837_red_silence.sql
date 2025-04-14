/*
  # Add Agent Properties Table

  1. New Tables
    - `agent_properties` - Store property assignments to agents
      - `id` (uuid, primary key)
      - `property_id` (uuid, references properties)
      - `agent_id` (uuid, references profiles)
      - `status` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for property distribution
    - Add policies for agent access
*/

-- Create agent_properties table
CREATE TABLE agent_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(property_id, agent_id)
);

-- Enable RLS
ALTER TABLE agent_properties ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_agent_properties_property_id ON agent_properties(property_id);
CREATE INDEX idx_agent_properties_agent_id ON agent_properties(agent_id);

-- Create policies
CREATE POLICY "Agencies can distribute properties"
ON agent_properties
FOR ALL
TO authenticated
USING (
  -- Check if user is the agency that owns the property
  EXISTS (
    SELECT 1 FROM agency_properties ap
    WHERE ap.property_id = agent_properties.property_id
    AND ap.agency_id = auth.uid()
    AND ap.status = 'active'
  )
)
WITH CHECK (
  -- Allow distribution if user is the agency that owns the property
  EXISTS (
    SELECT 1 FROM agency_properties ap
    WHERE ap.property_id = agent_properties.property_id
    AND ap.agency_id = auth.uid()
    AND ap.status = 'active'
  )
);

CREATE POLICY "Agents can view their assigned properties"
ON agent_properties
FOR SELECT
TO authenticated
USING (
  agent_id = auth.uid()
);

-- Create trigger for updated_at
CREATE TRIGGER update_agent_properties_updated_at
  BEFORE UPDATE ON agent_properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON agent_properties TO authenticated;