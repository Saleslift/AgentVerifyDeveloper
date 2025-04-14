/*
  # Add Floor Plan and Parking Features

  1. New Columns
    - `floor_plan_image` (text) - Store floor plan image URL
    - `parking_available` (boolean) - Track parking availability

  2. Changes
    - Add new columns to properties table
    - Update existing properties with default values
*/

-- Add new columns to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS floor_plan_image text,
ADD COLUMN IF NOT EXISTS parking_available boolean DEFAULT false;

-- Create index for parking availability
CREATE INDEX IF NOT EXISTS idx_properties_parking ON properties(parking_available);