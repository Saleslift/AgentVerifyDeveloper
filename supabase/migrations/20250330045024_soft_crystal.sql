-- Add creator_type column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' 
    AND column_name = 'creator_type'
  ) THEN
    ALTER TABLE properties
    ADD COLUMN creator_type text NOT NULL DEFAULT 'agent'
    CHECK (creator_type IN ('agent', 'agency', 'developer'));
  END IF;
END $$;

-- Add creator_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' 
    AND column_name = 'creator_id'
  ) THEN
    ALTER TABLE properties
    ADD COLUMN creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'check_agent_creator'
  ) THEN
    ALTER TABLE properties
    ADD CONSTRAINT check_agent_creator
    CHECK (
      (creator_type = 'agent' AND agent_id = creator_id) OR
      (creator_type != 'agent')
    );
  END IF;
END $$;

-- Create index if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_properties_creator'
  ) THEN
    CREATE INDEX idx_properties_creator ON properties(creator_type, creator_id);
  END IF;
END $$;

-- Update existing properties
UPDATE properties
SET 
  creator_type = 'agent',
  creator_id = agent_id
WHERE creator_type IS NULL OR creator_id IS NULL;

-- Create or replace function to validate property creation
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS validate_property_creation_trigger ON properties;

CREATE TRIGGER validate_property_creation_trigger
  BEFORE INSERT OR UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION validate_property_creation();

-- Drop policy if it exists and recreate it
DROP POLICY IF EXISTS "Enable property management for agencies and developers" ON properties;

CREATE POLICY "Enable property management for agencies and developers"
  ON properties
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('agency', 'developer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('agency', 'developer')
    )
  );