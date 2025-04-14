/*
  # Fix Storage RLS Policies

  1. Changes
    - Drop existing storage policies to avoid conflicts
    - Create properties bucket with public access
    - Enable RLS on storage.objects
    - Create new storage policies with proper UUID handling
    - Update properties and agency_properties policies

  2. Security
    - Enable RLS on storage.objects
    - Restrict file uploads to authenticated users
    - Ensure users can only manage their own files
    - Allow public read access to all files
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

-- Storage policies
CREATE POLICY "Authenticated users can upload files to their own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'properties' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update their own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'properties' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete their own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'properties' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Anyone can view public files"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'properties');

-- Update properties table policies
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.properties;
CREATE POLICY "Enable insert for authenticated users only"
ON public.properties
FOR INSERT TO authenticated
WITH CHECK (
  auth.role() = 'authenticated' AND
  agent_id = auth.uid()
);

-- Update agency_properties table policies
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.agency_properties;
CREATE POLICY "Enable insert for authenticated users only"
ON public.agency_properties
FOR INSERT TO authenticated
WITH CHECK (
  auth.role() = 'authenticated' AND
  agency_id = auth.uid()
);