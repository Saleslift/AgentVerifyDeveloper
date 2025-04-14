/*
  # Add Prelaunch Project Support

  1. New Columns
    - `is_prelaunch` boolean - Flag indicating prelaunch status
    - Location fields for map integration
    - Prelaunch-specific fields for collecting interest

  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity with constraints
*/

-- Add isPrelaunch boolean
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS is_prelaunch BOOLEAN DEFAULT FALSE;

-- Add Google Maps location fields
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS map_address TEXT, -- full text address from Google Maps
ADD COLUMN IF NOT EXISTS map_latitude FLOAT,
ADD COLUMN IF NOT EXISTS map_longitude FLOAT;

-- Add prelaunch-specific fields
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS eoi_amount NUMERIC, -- Expression of Interest amount
ADD COLUMN IF NOT EXISTS launch_date DATE,
ADD COLUMN IF NOT EXISTS unit_types TEXT[], -- array of unit type labels
ADD COLUMN IF NOT EXISTS average_unit_size INTEGER,
ADD COLUMN IF NOT EXISTS unit_size_unit TEXT DEFAULT 'sqft' CHECK (unit_size_unit IN ('sqft', 'sqm')),
ADD COLUMN IF NOT EXISTS release_process TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_properties_is_prelaunch ON properties(is_prelaunch);
CREATE INDEX IF NOT EXISTS idx_properties_launch_date ON properties(launch_date);
CREATE INDEX IF NOT EXISTS idx_properties_map_location ON properties(map_latitude, map_longitude)
WHERE map_latitude IS NOT NULL AND map_longitude IS NOT NULL;

-- Update validation trigger to handle prelaunch projects
CREATE OR REPLACE FUNCTION validate_property_creation()
RETURNS trigger AS $$
BEGIN
  -- Validate creator type matches user role
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = NEW.creator_id
    AND role = NEW.creator_type
  ) THEN
    -- For prelaunch projects, ensure required fields are present
    IF NEW.is_prelaunch = true THEN
      -- Verify at least one image
      IF NOT (NEW.images IS NOT NULL AND array_length(NEW.images, 1) > 0) THEN
        RAISE EXCEPTION 'Prelaunch project must have at least one image';
      END IF;
      
      -- Verify required prelaunch fields
      IF NEW.launch_date IS NULL THEN
        RAISE EXCEPTION 'Prelaunch project must have a launch date';
      END IF;
    END IF;
    
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Creator type must match user role';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add comments for better documentation
COMMENT ON COLUMN properties.is_prelaunch IS 'Flag indicating if this is a prelaunch project';
COMMENT ON COLUMN properties.map_address IS 'Full address from Google Maps';
COMMENT ON COLUMN properties.map_latitude IS 'Latitude coordinate for map placement';
COMMENT ON COLUMN properties.map_longitude IS 'Longitude coordinate for map placement';
COMMENT ON COLUMN properties.eoi_amount IS 'Expression of Interest amount required for reservation';
COMMENT ON COLUMN properties.launch_date IS 'Date when the project will officially launch';
COMMENT ON COLUMN properties.unit_types IS 'Array of available unit types (e.g., "1BR", "2BR")';
COMMENT ON COLUMN properties.average_unit_size IS 'Average unit size (number only)';
COMMENT ON COLUMN properties.unit_size_unit IS 'Unit of measurement for size (sqft or sqm)';
COMMENT ON COLUMN properties.release_process IS 'Description of the release process for units';