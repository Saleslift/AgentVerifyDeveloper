/*
  # Create properties storage bucket

  1. Changes
    - Create storage bucket for property images and videos
    - Add policies for authenticated users to manage their files
    - Allow public read access
  
  2. Security
    - Only allow authenticated users to upload files
    - Restrict file access to owner
    - Enable public read access for all files
*/

-- Create properties bucket if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'properties'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('properties', 'properties', true);
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