/*
  # Create Developer Files Storage Bucket

  1. New Storage Bucket
    - `developer-files` - Store developer-related files
      - Company brochures
      - Video presentations
      - Sales agreements
      - Commission documents
      - Other developer documents

  2. Security
    - Enable RLS
    - Add policies for developer access
    - Allow public read access
*/

-- Create developer-files bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('developer-files', 'developer-files', true)
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
  bucket_id = 'developer-files' AND
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'developer'
  ))
)
WITH CHECK (
  bucket_id = 'developer-files' AND
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'developer'
  ))
);

CREATE POLICY "Public can view developer files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'developer-files');

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
  
  -- Create timestamp in YYYYMMDD format
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