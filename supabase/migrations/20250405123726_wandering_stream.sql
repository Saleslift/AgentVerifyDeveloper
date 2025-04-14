/*
  # Add Units Available to Unit Types Table

  1. Changes
    - Add units_available column to unit_types table
    - Add default value of 0
    - Create index for better query performance
  
  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity
*/

-- Add units_available column to unit_types table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'unit_types' AND column_name = 'units_available'
  ) THEN
    ALTER TABLE unit_types
    ADD COLUMN units_available integer DEFAULT 0;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_unit_types_units_available 
ON unit_types(units_available);

-- Update existing unit types with default value
UPDATE unit_types
SET units_available = 0
WHERE units_available IS NULL;