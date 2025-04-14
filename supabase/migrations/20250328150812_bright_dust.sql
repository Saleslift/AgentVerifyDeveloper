/*
  # Fix storage bucket RLS policies

  1. Changes
    - Drop existing policies to avoid conflicts
    - Create storage buckets with proper configuration
    - Enable RLS on storage.objects table
    - Add policies for authenticated users to manage their files
    - Allow public read access
  
  2. Security
    - Policies restrict users to only manage their own files
    - File names must start with user's UUID
    - Public read access for all files
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own logo" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;

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

-- Create policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  -- User can only upload files that start with their ID
  auth.uid()::text = SPLIT_PART(name, '-', 1) AND
  -- File must be in either avatars or logos bucket
  bucket_id IN ('avatars', 'logos')
);

-- Create policy to allow authenticated users to update their files
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  -- User can only update files that start with their ID
  auth.uid()::text = SPLIT_PART(name, '-', 1) AND
  -- File must be in either avatars or logos bucket
  bucket_id IN ('avatars', 'logos')
);

-- Create policy to allow authenticated users to delete their files
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  -- User can only delete files that start with their ID
  auth.uid()::text = SPLIT_PART(name, '-', 1) AND
  -- File must be in either avatars or logos bucket
  bucket_id IN ('avatars', 'logos')
);

-- Create policy to allow public read access
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (
  -- Only allow access to files in avatars and logos buckets
  bucket_id IN ('avatars', 'logos')
);