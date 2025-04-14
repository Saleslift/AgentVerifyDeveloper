/*
  # Add Agent Profile Slugs

  1. Changes
    - Add slug column to profiles table
    - Add function to generate agent slugs
    - Add trigger to auto-generate slugs
    - Create unique index on slugs
  
  2. Security
    - Maintain existing RLS policies
    - Ensure slug uniqueness
*/

-- Add slug column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS slug text;

-- Create function to generate agent slugs
CREATE OR REPLACE FUNCTION generate_agent_slug(full_name text, id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Convert name to lowercase and replace spaces/special chars with hyphens
  base_slug := lower(regexp_replace(full_name, '[^a-zA-Z0-9\s]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  
  -- Add agent ID to ensure uniqueness
  final_slug := base_slug || '-' || substring(id::text, 1, 8);
  
  RETURN final_slug;
END;
$$;

-- Create trigger function to set slug
CREATE OR REPLACE FUNCTION set_agent_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Generate slug if not provided and role is agent
  IF NEW.slug IS NULL AND NEW.role = 'agent' THEN
    NEW.slug := generate_agent_slug(NEW.full_name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS set_agent_slug_trigger ON profiles;
CREATE TRIGGER set_agent_slug_trigger
  BEFORE INSERT OR UPDATE OF full_name ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_agent_slug();

-- Create unique index for slugs
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_slug ON profiles(slug);

-- Update existing agent profiles with slugs
UPDATE profiles
SET slug = generate_agent_slug(full_name, id)
WHERE role = 'agent' AND slug IS NULL;