/*
  # Update Storage RLS Policies

  1. Changes
     - Simplify storage RLS policies to allow authenticated users to upload files
     - Remove folder name checks that were causing issues
     - Keep basic authentication checks for security
     - Maintain public read access for properties bucket

  2. Security
     - Enable RLS on storage.objects
     - Require authentication for write operations
     - Allow public read access
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload files to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view public files" ON storage.objects;

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