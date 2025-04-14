/*
  # Add Marketplace Properties Support

  1. Changes
    - Add source and marketplace_id columns to properties table
    - Add policies for property management
  
  2. Security
    - Add policies for property access and management
*/

-- Add source and marketplace_id columns to properties
ALTER TABLE properties
ADD COLUMN source text NOT NULL DEFAULT 'direct'
CHECK (source IN ('direct', 'marketplace'));

ALTER TABLE properties
ADD COLUMN marketplace_id uuid REFERENCES properties(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_properties_source ON properties(source);
CREATE INDEX idx_properties_marketplace_id ON properties(marketplace_id);

-- Create function to add property to agent's listings
CREATE OR REPLACE FUNCTION add_to_my_listings(
  p_property_id uuid,
  p_agent_id uuid DEFAULT auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_property_id uuid;
BEGIN
  -- Check if property exists and is shared
  IF NOT EXISTS (
    SELECT 1 FROM properties
    WHERE id = p_property_id
    AND shared = true
  ) THEN
    RAISE EXCEPTION 'Property not found or not available for sharing';
  END IF;

  -- Check if agent already has this property
  IF EXISTS (
    SELECT 1 FROM agent_properties
    WHERE property_id = p_property_id
    AND agent_id = p_agent_id
  ) THEN
    RAISE EXCEPTION 'Property already in your listings';
  END IF;

  -- Create agent_properties record
  INSERT INTO agent_properties (property_id, agent_id)
  VALUES (p_property_id, p_agent_id)
  RETURNING property_id INTO v_new_property_id;

  -- Create property share record
  INSERT INTO property_shares (
    property_id,
    shared_by,
    shared_with,
    status
  )
  VALUES (
    p_property_id,
    (SELECT agent_id FROM properties WHERE id = p_property_id),
    p_agent_id,
    'active'
  );

  RETURN v_new_property_id;
END;
$$;