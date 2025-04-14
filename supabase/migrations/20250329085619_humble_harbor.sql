/*
  # Fix Storage RLS Policies

  1. Changes
    - Drop existing storage policies to avoid conflicts
    - Create properties bucket with public access
    - Enable RLS on storage.objects table
    - Create simplified storage policies for authenticated users
    - Remove folder path restrictions to fix upload issues

  2. Security
    - Maintain basic authentication checks
    - Keep public read access for property images
    - Allow authenticated users to manage their uploads
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

-- Create simplified storage policies
CREATE POLICY "Allow uploads for authenticated users"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'properties'
);

CREATE POLICY "Allow updates for authenticated users"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'properties'
);

CREATE POLICY "Allow deletes for authenticated users"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'properties'
);

CREATE POLICY "Allow public viewing of files"
ON storage.objects FOR SELECT TO public
USING (
  bucket_id = 'properties'
);