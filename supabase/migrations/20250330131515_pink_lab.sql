/*
  # Fix Marketplace Properties

  1. Changes
    - Add trigger to set marketplace_id when property is shared
    - Update existing shared properties
    - Add constraint for marketplace_id when shared
  
  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity
*/

-- Update existing shared properties
UPDATE properties
SET marketplace_id = id
WHERE shared = true AND marketplace_id IS NULL;

-- Create function to manage marketplace_id
CREATE OR REPLACE FUNCTION manage_marketplace_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Set marketplace_id to property's own id when shared is true
  IF NEW.shared = true AND NEW.marketplace_id IS NULL THEN
    NEW.marketplace_id := NEW.id;
  END IF;

  -- Clear marketplace_id when shared is false
  IF NEW.shared = false THEN
    NEW.marketplace_id := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for marketplace_id management
DROP TRIGGER IF EXISTS manage_marketplace_id_trigger ON properties;
CREATE TRIGGER manage_marketplace_id_trigger
  BEFORE INSERT OR UPDATE OF shared ON properties
  FOR EACH ROW
  EXECUTE FUNCTION manage_marketplace_id();

-- Add constraint to ensure marketplace_id is set when shared
ALTER TABLE properties
DROP CONSTRAINT IF EXISTS check_marketplace_id;

ALTER TABLE properties
ADD CONSTRAINT check_marketplace_id
CHECK (
  (shared = false AND marketplace_id IS NULL) OR
  (shared = true AND marketplace_id IS NOT NULL)
);

-- Create index for faster marketplace queries
CREATE INDEX IF NOT EXISTS idx_properties_marketplace
ON properties(shared, marketplace_id)
WHERE shared = true;