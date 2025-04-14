/*
  # Update completion_status enum and add handover date field

  1. Changes
    - Add "Off-plan resale" as a valid option to the completion_status enum
    - Ensure backward compatibility with existing data
  
  2. Security
    - No changes to RLS policies
    - Maintain existing data integrity
*/

-- Alter the completion_status enum to add "Off-plan resale"
ALTER TYPE completion_status ADD VALUE IF NOT EXISTS 'Off-plan resale';

-- Update the properties table constraint if needed
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'properties_completion_status_check'
  ) THEN
    -- Drop the existing constraint
    ALTER TABLE properties DROP CONSTRAINT properties_completion_status_check;
    
    -- Add the constraint with the new value
    ALTER TABLE properties
    ADD CONSTRAINT properties_completion_status_check
    CHECK (completion_status IN ('Ready', 'Off-Plan', 'Off-plan resale'));
  END IF;
END $$;