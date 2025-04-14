/*
  # Add Floor Plan and Parking Support

  1. Changes
    - Add floor_plan_image column to properties table
    - Add parking_available column to properties table
    - Create index for parking availability
  
  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity
*/

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