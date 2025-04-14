/*
  # Fix Storage Bucket Configuration

  1. Changes
    - Drop existing storage policies to avoid conflicts
    - Create properties bucket if it doesn't exist
    - Enable RLS on storage.objects
    - Create policies for file management
  
  2. Security
    - Allow authenticated users to manage their own files
    - Allow public read access to property files
    - Enforce user-specific file paths
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can upload their own property files" ON storage.objects;
DROP POLICY IF EXISTS "Users can manage their own property files" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for property files" ON storage.objects;

-- Create properties bucket if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'properties'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'properties',
      'properties',
      true,
      52428800, -- 50MB limit
      ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'video/mp4',
        'video/quicktime'
      ]
    );
  END IF;
END $$;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to upload their own files
CREATE POLICY "Users can upload their own property files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'properties' AND
  (auth.uid())::text = SPLIT_PART(name, '/', 1)
);

-- Create policy to allow users to manage their own files
CREATE POLICY "Users can manage their own property files"
ON storage.objects
TO authenticated
USING (
  bucket_id = 'properties' AND
  (auth.uid())::text = SPLIT_PART(name, '/', 1)
)
WITH CHECK (
  bucket_id = 'properties' AND
  (auth.uid())::text = SPLIT_PART(name, '/', 1)
);

-- Create policy to allow public read access
CREATE POLICY "Public read access for property files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'properties');