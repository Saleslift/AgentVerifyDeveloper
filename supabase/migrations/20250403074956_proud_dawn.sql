/*
  # Add Property Features

  1. Changes
    - Add floor_plan_image column to properties table
    - Add parking_available column to properties table
    - Add lat and lng columns for location coordinates
    - Add validation function for coordinates
    - Create indexes for location-based queries
  
  2. Security
    - Maintain existing RLS policies
    - Add validation for coordinate values
*/

-- Add location coordinates and features to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS lat numeric,
ADD COLUMN IF NOT EXISTS lng numeric,
ADD COLUMN IF NOT EXISTS floor_plan_image text,
ADD COLUMN IF NOT EXISTS parking_available boolean DEFAULT false;

-- Create indexes for location-based queries
CREATE INDEX IF NOT EXISTS idx_properties_location_coords 
ON properties(lat, lng)
WHERE lat IS NOT NULL AND lng IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_properties_parking 
ON properties(parking_available);

-- Create function to validate coordinates
CREATE OR REPLACE FUNCTION validate_property_location()
RETURNS trigger AS $$
BEGIN
  -- Validate coordinates are within UAE bounds
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    -- Check if coordinates are valid numbers
    IF NOT (
      NEW.lat::text ~ '^-?[0-9]+\.?[0-9]*$' AND
      NEW.lng::text ~ '^-?[0-9]+\.?[0-9]*$'
    ) THEN
      RAISE EXCEPTION 'Invalid coordinate format';
    END IF;

    -- Check if coordinates are within UAE bounds
    IF NEW.lat < 22.0 OR NEW.lat > 26.5 OR 
       NEW.lng < 51.0 OR NEW.lng > 56.5 THEN
      RAISE EXCEPTION 'Coordinates must be within UAE bounds';
    END IF;
  END IF;

  -- If only one coordinate is provided, both are required
  IF (NEW.lat IS NULL AND NEW.lng IS NOT NULL) OR
     (NEW.lat IS NOT NULL AND NEW.lng IS NULL) THEN
    RAISE EXCEPTION 'Both latitude and longitude must be provided';
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