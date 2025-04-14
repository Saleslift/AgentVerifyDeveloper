/*
  # Storage Bucket Policies

  1. New Policies
    - Create storage bucket policies for properties
    - Enable authenticated users to manage their own files
    - Restrict access to user's own directory

  2. Security
    - Enable RLS on storage buckets
    - Add policies for CRUD operations
    - Ensure proper path validation
*/

-- Create properties bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('properties', 'properties', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for the properties bucket
CREATE POLICY "Authenticated users can upload files to their own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'properties' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Authenticated users can update their own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'properties' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Authenticated users can delete their own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'properties' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view public files"
ON storage.objects FOR SELECT TO public
USING (
  bucket_id = 'properties'
);

-- Create policy for agency_properties table
CREATE POLICY "Enable insert for authenticated users only"
ON public.agency_properties
FOR INSERT TO authenticated
WITH CHECK (
  auth.role() = 'authenticated' AND
  agency_id = auth.uid()
);

-- Create policy for properties table
CREATE POLICY "Enable insert for authenticated users only"
ON public.properties
FOR INSERT TO authenticated
WITH CHECK (
  auth.role() = 'authenticated' AND
  agent_id = auth.uid()
);