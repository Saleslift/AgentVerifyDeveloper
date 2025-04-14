/*
  # Create Deal Files Storage Bucket

  1. Changes
    - Create storage bucket for deal files
    - Add policies for authenticated users
    - Enable RLS on storage.objects
  
  2. Security
    - Restrict file uploads to deal participants
    - Allow public read access for authorized users
*/

-- Create deal-files bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('deal-files', 'deal-files', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can upload deal files" ON storage.objects;
  DROP POLICY IF EXISTS "Users can access deal files" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create policy for file uploads
CREATE POLICY "Users can upload deal files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'deal-files' AND
  (EXISTS (
    SELECT 1 FROM deals
    WHERE deals.id::text = SPLIT_PART(name, '/', 1)
    AND (
      deals.listing_agent_id = auth.uid() OR
      deals.buying_agent_id = auth.uid()
    )
  ))
);

-- Create policy for file access
CREATE POLICY "Users can access deal files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'deal-files' AND
  (EXISTS (
    SELECT 1 FROM deals
    WHERE deals.id::text = SPLIT_PART(name, '/', 1)
    AND (
      deals.listing_agent_id = auth.uid() OR
      deals.buying_agent_id = auth.uid()
    )
  ))
);

-- Create policy for file updates
CREATE POLICY "Users can update deal files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'deal-files' AND
  (EXISTS (
    SELECT 1 FROM deals
    WHERE deals.id::text = SPLIT_PART(name, '/', 1)
    AND (
      deals.listing_agent_id = auth.uid() OR
      deals.buying_agent_id = auth.uid()
    )
  ))
);

-- Create policy for file deletions
CREATE POLICY "Users can delete deal files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'deal-files' AND
  (EXISTS (
    SELECT 1 FROM deals
    WHERE deals.id::text = SPLIT_PART(name, '/', 1)
    AND (
      deals.listing_agent_id = auth.uid() OR
      deals.buying_agent_id = auth.uid()
    )
  ))
);