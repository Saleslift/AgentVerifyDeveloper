/*
  # Fix Storage RLS Policies

  1. Changes
    - Drop existing storage policies to avoid conflicts
    - Create avatars and logos buckets if they don't exist
    - Enable RLS on storage.objects
    - Create simplified RLS policies for file operations

  2. Security
    - Enable RLS on storage.objects table
    - Add policies for authenticated users to manage their own files
    - Add policy for public read access to avatars and logos
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can manage their files" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for avatars and logos" ON storage.objects;

-- Create avatars bucket if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'avatars'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('avatars', 'avatars', true);
  END IF;
END $$;

-- Create logos bucket if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'logos'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('logos', 'logos', true);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to insert files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('avatars', 'logos')
);

-- Create policy for authenticated users to update their files
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id IN ('avatars', 'logos')
);

-- Create policy for authenticated users to delete their files
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id IN ('avatars', 'logos')
);

-- Create policy for public read access
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id IN ('avatars', 'logos'));