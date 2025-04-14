/*
  # Prelaunch Project Support Migration

  1. New Fields
    - Add project type enum and field to track entry method
    - Add JSON field for price by unit type
    - Add size range fields for better filtering
    - Add other prelaunch-specific fields
    - Update existing fields for better support

  2. Security
    - Maintain RLS policies
    - Add proper constraints and validations
*/

-- Create project type enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'project_entry_type'
  ) THEN
    CREATE TYPE project_entry_type AS ENUM ('manual', 'imported', 'prelaunch');
  END IF;
END $$;

-- Add new fields to properties table or modify existing ones
ALTER TABLE properties
-- Project metadata fields
ADD COLUMN IF NOT EXISTS entry_type project_entry_type DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS starting_price_by_unit_type JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS size_range_min INTEGER,
ADD COLUMN IF NOT EXISTS size_range_max INTEGER,

-- Ensure we have these prelaunch fields (some might already exist)
ADD COLUMN IF NOT EXISTS is_prelaunch BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS launch_date DATE,
ADD COLUMN IF NOT EXISTS eoi_amount NUMERIC,
ADD COLUMN IF NOT EXISTS release_process TEXT,

-- Location fields
ADD COLUMN IF NOT EXISTS map_address TEXT,
ADD COLUMN IF NOT EXISTS map_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS map_longitude DOUBLE PRECISION,

-- Unit information
ADD COLUMN IF NOT EXISTS unit_types TEXT[],
ADD COLUMN IF NOT EXISTS average_unit_size INTEGER,
ADD COLUMN IF NOT EXISTS unit_size_unit TEXT DEFAULT 'sqft' CHECK (unit_size_unit IN ('sqft', 'sqm'));

-- Create or update indexes
CREATE INDEX IF NOT EXISTS idx_properties_entry_type ON properties(entry_type);
CREATE INDEX IF NOT EXISTS idx_properties_is_prelaunch ON properties(is_prelaunch);
CREATE INDEX IF NOT EXISTS idx_properties_launch_date ON properties(launch_date);
CREATE INDEX IF NOT EXISTS idx_properties_size_range ON properties(size_range_min, size_range_max);
CREATE INDEX IF NOT EXISTS idx_properties_map_location ON properties(map_latitude, map_longitude) 
  WHERE map_latitude IS NOT NULL AND map_longitude IS NOT NULL;

-- Add constraint with check for existence first
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_prelaunch_fields'
  ) THEN
    ALTER TABLE properties
    ADD CONSTRAINT check_prelaunch_fields 
    CHECK (
      NOT is_prelaunch OR 
      (is_prelaunch AND launch_date IS NOT NULL)
    );
  END IF;
END $$;

-- Add comments for field documentation
COMMENT ON COLUMN properties.entry_type IS 'How the property was added: manual entry, import, or prelaunch project';
COMMENT ON COLUMN properties.starting_price_by_unit_type IS 'JSON mapping of unit types to starting prices: {"Studio": 500000, "1BR": 700000}';
COMMENT ON COLUMN properties.size_range_min IS 'Minimum unit size across all unit types';
COMMENT ON COLUMN properties.size_range_max IS 'Maximum unit size across all unit types';
COMMENT ON COLUMN properties.is_prelaunch IS 'Flag indicating if this is a prelaunch project';
COMMENT ON COLUMN properties.launch_date IS 'Date when the project will officially launch';
COMMENT ON COLUMN properties.eoi_amount IS 'Expression of Interest amount required for reservation';
COMMENT ON COLUMN properties.release_process IS 'Description of the release process for units';
COMMENT ON COLUMN properties.map_address IS 'Full address from Google Maps';
COMMENT ON COLUMN properties.map_latitude IS 'Latitude coordinate for map placement';
COMMENT ON COLUMN properties.map_longitude IS 'Longitude coordinate for map placement';
COMMENT ON COLUMN properties.unit_types IS 'Array of available unit types (e.g., "1BR", "2BR")';
COMMENT ON COLUMN properties.average_unit_size IS 'Average unit size (number only)';
COMMENT ON COLUMN properties.unit_size_unit IS 'Unit of measurement for size (sqft or sqm)';

-- Update property validation function to handle prelaunch projects with additional fields
CREATE OR REPLACE FUNCTION validate_property_creation()
RETURNS trigger AS $$
BEGIN
  -- Validate creator type matches user role
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = NEW.creator_id
    AND role = NEW.creator_type
  ) THEN
    RAISE EXCEPTION 'Creator type must match user role';
  END IF;
  
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
    
    -- Set entry_type to prelaunch if not already set
    IF NEW.entry_type IS NULL OR NEW.entry_type != 'prelaunch' THEN
      NEW.entry_type := 'prelaunch';
    END IF;
  ELSIF NEW.entry_type IS NULL THEN
    -- Set default entry_type based on presence of import_token
    IF NEW.import_token IS NOT NULL THEN
      NEW.entry_type := 'imported';
    ELSE
      NEW.entry_type := 'manual';
    END IF;
  END IF;
  
  -- If size_range_min and size_range_max are not set but average_unit_size is,
  -- use average as both min and max
  IF NEW.size_range_min IS NULL AND NEW.size_range_max IS NULL AND NEW.average_unit_size IS NOT NULL THEN
    NEW.size_range_min := NEW.average_unit_size;
    NEW.size_range_max := NEW.average_unit_size;
  END IF;
  
  -- Generate starting_price_by_unit_type if unit_types exist and it's not already set
  IF NEW.unit_types IS NOT NULL AND array_length(NEW.unit_types, 1) > 0 AND 
     (NEW.starting_price_by_unit_type IS NULL OR NEW.starting_price_by_unit_type = '{}'::jsonb) THEN
    
    -- Create a basic JSONB with the same price for all unit types
    -- In a real scenario, you would want more specific prices
    NEW.starting_price_by_unit_type := jsonb_object(
      array_agg(unit_type),
      array_fill(NEW.price::text, ARRAY[array_length(NEW.unit_types, 1)])
    )
    FROM unnest(NEW.unit_types) as unit_type;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add or update the trigger
DROP TRIGGER IF EXISTS validate_property_creation_trigger ON properties;
CREATE TRIGGER validate_property_creation_trigger
  BEFORE INSERT OR UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION validate_property_creation();