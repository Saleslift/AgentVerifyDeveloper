-- Add new columns to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS floor_plan_image text,
ADD COLUMN IF NOT EXISTS parking_available boolean DEFAULT false;

-- Create index for parking availability
CREATE INDEX IF NOT EXISTS idx_properties_parking ON properties(parking_available);

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully';
END $$;