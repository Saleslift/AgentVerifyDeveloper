-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "agent_property_access" ON agent_properties;
  DROP POLICY IF EXISTS "marketplace_property_additions" ON agent_properties;
  DROP POLICY IF EXISTS "property_management" ON agent_properties;
  DROP POLICY IF EXISTS "property_viewing" ON agent_properties;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE agent_properties ENABLE ROW LEVEL SECURITY;

-- Create simplified policy for agent property access
CREATE POLICY "agent_property_access"
ON agent_properties
FOR ALL
TO authenticated
USING (
  -- Can access if agent owns the property
  agent_id = auth.uid()
)
WITH CHECK (
  -- Can modify if agent owns the property
  agent_id = auth.uid()
  AND
  -- Property must exist and be shared for new additions
  EXISTS (
    SELECT 1 FROM properties
    WHERE id = property_id
    AND shared = true
    AND agent_id != auth.uid()
  )
);

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

-- Update existing shared properties
UPDATE properties
SET marketplace_id = id
WHERE shared = true AND marketplace_id IS NULL;

-- Create function to check for duplicate properties
CREATE OR REPLACE FUNCTION check_duplicate_property()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for existing active listing
  IF EXISTS (
    SELECT 1 FROM agent_properties
    WHERE property_id = NEW.property_id
    AND agent_id = NEW.agent_id
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Property is already in your listings';
  END IF;

  -- Check if property exists and is shared
  IF NOT EXISTS (
    SELECT 1 FROM properties
    WHERE id = NEW.property_id
    AND shared = true
    AND agent_id != NEW.agent_id
  ) THEN
    RAISE EXCEPTION 'Property not found or not available for sharing';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent duplicates
DROP TRIGGER IF EXISTS prevent_duplicate_properties ON agent_properties;
CREATE TRIGGER prevent_duplicate_properties
  BEFORE INSERT ON agent_properties
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_property();

-- Grant necessary permissions
GRANT ALL ON agent_properties TO authenticated;