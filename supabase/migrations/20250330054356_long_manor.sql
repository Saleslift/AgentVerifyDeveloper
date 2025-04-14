/*
  # Create Homepage Assets Storage Bucket

  1. Changes
    - Create storage bucket for homepage assets
    - Add policies for super admin access
    - Enable public read access
  
  2. Security
    - Restrict write access to super admins
    - Allow public read access
*/

-- Create homepage-assets bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('homepage-assets', 'homepage-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policy for super admin uploads
CREATE POLICY "Super admins can upload homepage assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'homepage-assets' AND
  EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.id = auth.uid()
  )
);

-- Create policy for super admin updates
CREATE POLICY "Super admins can update homepage assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'homepage-assets' AND
  EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.id = auth.uid()
  )
);

-- Create policy for super admin deletions
CREATE POLICY "Super admins can delete homepage assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'homepage-assets' AND
  EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.id = auth.uid()
  )
);

-- Create policy for public read access
CREATE POLICY "Public can view homepage assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'homepage-assets');