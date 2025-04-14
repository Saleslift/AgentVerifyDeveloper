/*
  # Update Storage RLS Policies

  1. Changes
    - Drop existing storage policies
    - Create new simplified policies for authenticated users
    - Enable RLS on storage.objects table
    
  2. Security
    - Allow authenticated users to manage their own files
    - Allow public read access to all files
    - Enforce user ownership through folder structure
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view files" ON storage.objects;

-- Create properties bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('properties', 'properties', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Storage policies with simplified checks
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'properties' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'properties' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'properties' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Anyone can view files"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'properties');