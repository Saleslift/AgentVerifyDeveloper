/*
  # Add Town house to property_type enum

  1. Changes
    - Add "Town house" as a valid option to the property_type enum
    - Ensure backward compatibility with existing data
  
  2. Security
    - No changes to RLS policies
    - Maintain existing data integrity
*/

-- Alter the property_type enum to add "Town house"
ALTER TYPE property_type ADD VALUE IF NOT EXISTS 'Town house';

-- Update the properties table constraint if needed
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'properties_type_check'
  ) THEN
    -- Drop the existing constraint
    ALTER TABLE properties DROP CONSTRAINT properties_type_check;
    
    -- Add the constraint with the new value
    ALTER TABLE properties
    ADD CONSTRAINT properties_type_check
    CHECK (type IN ('Apartment', 'House', 'Villa', 'Town house', 'Land'));
  END IF;
END $$;