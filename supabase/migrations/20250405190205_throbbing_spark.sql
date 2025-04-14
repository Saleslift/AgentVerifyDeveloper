/*
  # Developer Profile Enhancement

  1. New Features
    - Create storage buckets for developer files
    - Add standardized file naming function
    - Add developer profile fields to profiles table
    - Create RLS policies for secure access
    - Add developer slug generation support
  
  2. Security
    - Enable RLS on storage buckets
    - Add policies for developer access
    - Ensure proper file access controls
*/

-- Create developer-files bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('developer-files', 'developer-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Developers can upload and manage files" ON storage.objects;
  DROP POLICY IF EXISTS "Public can view developer files" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create storage policies for developer files
CREATE POLICY "Developers can upload and manage files"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id IN ('developer-files', 'documents') AND
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'developer'
  ))
)
WITH CHECK (
  bucket_id IN ('developer-files', 'documents') AND
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'developer'
  ))
);

CREATE POLICY "Public can view developer files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id IN ('developer-files', 'documents'));

-- Create function to standardize filenames
CREATE OR REPLACE FUNCTION standardize_filename(
  original_name text,
  user_id uuid,
  category text DEFAULT 'document'
) RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  clean_name text;
  file_ext text;
  timestamp_str text;
  final_name text;
BEGIN
  -- Extract file extension
  file_ext := lower(substring(original_name from '\.([^\.]+)$'));
  
  -- Clean the filename: lowercase, replace spaces with underscores, remove special chars
  clean_name := lower(regexp_replace(original_name, '\.[^\.]+$', ''));
  clean_name := regexp_replace(clean_name, '\s+', '_', 'g');
  clean_name := regexp_replace(clean_name, '[^a-z0-9_.-]', '', 'g');
  clean_name := substring(clean_name, 1, 40);
  
  -- Create timestamp
  timestamp_str := to_char(now(), 'YYYYMMDD');
  
  -- Final filename format: category_userid_timestamp_cleanfilename.ext
  final_name := category || '_' || 
                substring(user_id::text, 1, 8) || '_' || 
                timestamp_str || '_' || 
                clean_name || '.' || 
                file_ext;
  
  RETURN final_name;
END;
$$;

-- Grant execute permission to all users
GRANT EXECUTE ON FUNCTION standardize_filename(text, uuid, text) TO public;

-- Add developer_details fields to profiles table if they don't exist
DO $$ 
BEGIN
  -- Check if developer_details column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'developer_details'
  ) THEN
    -- Column exists, update the type if needed
    -- This is a safe operation as JSONB can store any JSON structure
    NULL;
  ELSE
    -- Add the column if it doesn't exist
    ALTER TABLE profiles ADD COLUMN developer_details jsonb;
  END IF;
END $$;

-- Create function to generate developer slug
CREATE OR REPLACE FUNCTION generate_developer_slug(full_name text, id uuid)
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
  
  -- Add developer ID to ensure uniqueness
  final_slug := base_slug || '-' || substring(id::text, 1, 8);
  
  RETURN final_slug;
END;
$$;

-- Update set_agent_slug function to handle developers
CREATE OR REPLACE FUNCTION set_agent_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Generate slug if not provided and role is agent or developer
  IF NEW.slug IS NULL AND (NEW.role = 'agent' OR NEW.role = 'developer') THEN
    NEW.slug := generate_agent_slug(NEW.full_name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create or update trigger for slug generation
DROP TRIGGER IF EXISTS set_agent_slug_trigger ON profiles;
CREATE TRIGGER set_agent_slug_trigger
  BEFORE INSERT OR UPDATE OF full_name ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_agent_slug();

-- Update existing developer profiles with slugs if they don't have one
UPDATE profiles
SET slug = generate_agent_slug(full_name, id)
WHERE role = 'developer' AND slug IS NULL;

-- Create function to validate developer details
CREATE OR REPLACE FUNCTION validate_developer_details()
RETURNS TRIGGER AS $$
BEGIN
  -- If role is developer, ensure developer_details exists
  IF NEW.role = 'developer' AND NEW.developer_details IS NULL THEN
    NEW.developer_details := '{}'::jsonb;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for developer details validation
DROP TRIGGER IF EXISTS validate_developer_details_trigger ON profiles;
CREATE TRIGGER validate_developer_details_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.role = 'developer')
  EXECUTE FUNCTION validate_developer_details();

-- Create function to track developer profile updates
CREATE OR REPLACE FUNCTION log_developer_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if developer_details changed
  IF NEW.developer_details IS DISTINCT FROM OLD.developer_details THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      old_data,
      new_data,
      created_at
    ) VALUES (
      auth.uid(),
      'update',
      'profiles',
      NEW.id,
      jsonb_build_object('developer_details', OLD.developer_details),
      jsonb_build_object('developer_details', NEW.developer_details),
      now()
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN undefined_table THEN
    -- If audit_logs table doesn't exist, just return
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create trigger for developer profile updates
DROP TRIGGER IF EXISTS log_developer_profile_update_trigger ON profiles;
CREATE TRIGGER log_developer_profile_update_trigger
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.role = 'developer')
  EXECUTE FUNCTION log_developer_profile_update();

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for audit_logs
CREATE POLICY "Super admins can view audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );