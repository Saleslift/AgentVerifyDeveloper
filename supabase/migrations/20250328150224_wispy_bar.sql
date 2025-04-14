/*
  # Create storage bucket policies

  1. New Buckets
    - `avatars` bucket for profile photos
    - `logos` bucket for agency logos
  
  2. Security
    - Enable RLS on both buckets
    - Add policies for authenticated users to manage their own files
    - Allow public read access for all files
*/

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

-- Create policy to allow users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (auth.uid())::text = SPLIT_PART(name, '-', 1)
);

-- Create policy to allow users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (auth.uid())::text = SPLIT_PART(name, '-', 1)
);

-- Create policy to allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (auth.uid())::text = SPLIT_PART(name, '-', 1)
);

-- Create policy to allow users to upload their own logo
CREATE POLICY "Users can upload their own logo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos' AND
  (auth.uid())::text = SPLIT_PART(name, '-', 1)
);

-- Create policy to allow users to update their own logo
CREATE POLICY "Users can update their own logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'logos' AND
  (auth.uid())::text = SPLIT_PART(name, '-', 1)
);

-- Create policy to allow users to delete their own logo
CREATE POLICY "Users can delete their own logo"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'logos' AND
  (auth.uid())::text = SPLIT_PART(name, '-', 1)
);

-- Create policy to allow public read access to all files
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (true);