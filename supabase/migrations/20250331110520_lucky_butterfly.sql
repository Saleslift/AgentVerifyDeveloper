/*
  # Add Property Slugs

  1. Changes
    - Add slug column to properties table
    - Add function to generate slugs
    - Add trigger to auto-generate slugs
    - Create unique index on slugs
  
  2. Security
    - Maintain existing RLS policies
    - Ensure slug uniqueness
*/

-- Add slug column to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS slug text;

-- Create function to generate slugs
CREATE OR REPLACE FUNCTION generate_property_slug(title text, id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Convert title to lowercase and replace spaces/special chars with hyphens
  base_slug := lower(regexp_replace(title, '[^a-zA-Z0-9\s]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  
  -- Add property ID to ensure uniqueness
  final_slug := base_slug || '-' || substring(id::text, 1, 8);
  
  RETURN final_slug;
END;
$$;

-- Create trigger function to set slug
CREATE OR REPLACE FUNCTION set_property_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Generate slug if not provided
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_property_slug(NEW.title, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS set_property_slug_trigger ON properties;
CREATE TRIGGER set_property_slug_trigger
  BEFORE INSERT OR UPDATE OF title ON properties
  FOR EACH ROW
  EXECUTE FUNCTION set_property_slug();

-- Create unique index for slugs
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_slug ON properties(slug);

-- Update existing properties with slugs
UPDATE properties
SET slug = generate_property_slug(title, id)
WHERE slug IS NULL;