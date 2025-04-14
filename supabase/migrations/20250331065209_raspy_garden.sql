/*
  # Add Property Location Fields

  1. Changes
    - Add lat and lng columns to properties table
    - Add index for location-based queries
    - Add floor plan image and parking columns
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add location coordinates if they don't exist
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS lat numeric,
ADD COLUMN IF NOT EXISTS lng numeric;

-- Add floor plan and parking if they don't exist
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS floor_plan_image text,
ADD COLUMN IF NOT EXISTS parking_available boolean DEFAULT false;

-- Create indexes for location-based queries
CREATE INDEX IF NOT EXISTS idx_properties_location_coords 
ON properties(lat, lng)
WHERE lat IS NOT NULL AND lng IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_properties_parking 
ON properties(parking_available);

-- Update existing properties to set coordinates from location
CREATE OR REPLACE FUNCTION update_property_coordinates()
RETURNS void AS $$
BEGIN
  -- This is a placeholder for geocoding logic
  -- In production, you would implement actual geocoding here
  NULL;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate coordinates
CREATE OR REPLACE FUNCTION validate_property_location()
RETURNS trigger AS $$
BEGIN
  -- Validate coordinates are within UAE bounds
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    IF NEW.lat < 22.0 OR NEW.lat > 26.5 OR 
       NEW.lng < 51.0 OR NEW.lng > 56.5 THEN
      RAISE EXCEPTION 'Coordinates must be within UAE bounds';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for location validation
DROP TRIGGER IF EXISTS validate_property_location_trigger ON properties;
CREATE TRIGGER validate_property_location_trigger
  BEFORE INSERT OR UPDATE OF lat, lng ON properties
  FOR EACH ROW
  EXECUTE FUNCTION validate_property_location();