/*
  # Add Property Types and Custom Amenities

  1. Changes
    - Update property_type enum to include all specified property types
    - Create custom_amenities table for storing user-defined amenities
    - Add necessary indexes for performance optimization
  
  2. Security
    - Enable RLS on custom_amenities table
    - Add policies for proper access control
    - Ensure data integrity with constraints
*/

-- Update property_type enum to include all specified property types
ALTER TYPE property_type ADD VALUE IF NOT EXISTS 'Penthouse';
ALTER TYPE property_type ADD VALUE IF NOT EXISTS 'Townhouse';

-- Create custom_amenities table
CREATE TABLE IF NOT EXISTS custom_amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE custom_amenities ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_custom_amenities_property_id ON custom_amenities(property_id);
CREATE INDEX IF NOT EXISTS idx_custom_amenities_name ON custom_amenities(name);
CREATE INDEX IF NOT EXISTS idx_custom_amenities_created_by ON custom_amenities(created_by);

-- Create policies for custom_amenities
CREATE POLICY "Users can view custom amenities"
  ON custom_amenities
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Property owners can manage custom amenities"
  ON custom_amenities
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = custom_amenities.property_id
      AND (
        properties.agent_id = auth.uid() OR
        properties.creator_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = custom_amenities.property_id
      AND (
        properties.agent_id = auth.uid() OR
        properties.creator_id = auth.uid()
      )
    )
  );

-- Create function to get all amenities for a property (built-in + custom)
CREATE OR REPLACE FUNCTION get_all_property_amenities(p_property_id uuid)
RETURNS TABLE (
  name text,
  is_custom boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return built-in amenities
  RETURN QUERY
  SELECT 
    unnest(properties.amenities) as name,
    false as is_custom
  FROM properties
  WHERE id = p_property_id;
  
  -- Return custom amenities
  RETURN QUERY
  SELECT 
    custom_amenities.name,
    true as is_custom
  FROM custom_amenities
  WHERE property_id = p_property_id;
END;
$$;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION get_all_property_amenities(uuid) TO public;