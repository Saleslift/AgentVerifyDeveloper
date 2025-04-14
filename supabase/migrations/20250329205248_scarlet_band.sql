/*
  # Add Property Source and Marketplace Support

  1. Changes
    - Add source and marketplace_id columns to properties table
    - Add function to add properties to agent's listings
    - Create property share tracking
  
  2. Security
    - Add check constraints for source column
    - Add foreign key for marketplace_id
    - Secure function execution
*/

-- Begin transaction
DO $$ 
BEGIN

  -- Add source column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' 
    AND column_name = 'source'
  ) THEN
    ALTER TABLE properties
    ADD COLUMN source text NOT NULL DEFAULT 'direct';

    ALTER TABLE properties
    ADD CONSTRAINT properties_source_check 
    CHECK (source IN ('direct', 'marketplace'));
  END IF;

  -- Add marketplace_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' 
    AND column_name = 'marketplace_id'
  ) THEN
    ALTER TABLE properties
    ADD COLUMN marketplace_id uuid REFERENCES properties(id) ON DELETE SET NULL;
  END IF;

  -- Create indexes if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'properties' 
    AND indexname = 'idx_properties_source'
  ) THEN
    CREATE INDEX idx_properties_source ON properties(source);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'properties' 
    AND indexname = 'idx_properties_marketplace_id'
  ) THEN
    CREATE INDEX idx_properties_marketplace_id ON properties(marketplace_id);
  END IF;

END $$;

-- Create or replace function to add property to agent's listings
CREATE OR REPLACE FUNCTION add_to_my_listings(
  p_property_id uuid,
  p_agent_id uuid DEFAULT auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
EXCEPTION
  WHEN OTHERS THEN
    -- Log error details
    RAISE NOTICE 'Error in add_to_my_listings: %', SQLERRM;
    RAISE;
END;
$$;

-- Grant necessary permissions
DO $$ 
BEGIN
  -- Revoke existing permissions
  REVOKE ALL ON FUNCTION add_to_my_listings(uuid, uuid) FROM PUBLIC;
  
  -- Grant execute to authenticated users
  GRANT EXECUTE ON FUNCTION add_to_my_listings(uuid, uuid) TO authenticated;
END $$;

-- Verify function creation
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'add_to_my_listings'
  ) THEN
    RAISE EXCEPTION 'Function add_to_my_listings was not created successfully';
  END IF;
END $$;