/*
  # Add Deal Documents Storage

  1. Changes
    - Create storage bucket for deal documents
    - Add policies for document management
    - Enable RLS on storage.objects
  
  2. Security
    - Only allow authenticated users to manage their documents
    - Restrict access to deal participants
    - Enable public read access for authorized users
*/

-- Create deal-documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('deal-documents', 'deal-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policy for document uploads
CREATE POLICY "Users can upload deal documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'deal-documents' AND
  (EXISTS (
    SELECT 1 FROM deals
    WHERE deals.id = SPLIT_PART(name, '/', 1)::uuid
    AND (
      deals.listing_agent_id = auth.uid() OR
      deals.buying_agent_id = auth.uid()
    )
  ))
);

-- Create policy for document updates
CREATE POLICY "Users can update their deal documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'deal-documents' AND
  (EXISTS (
    SELECT 1 FROM deals
    WHERE deals.id = SPLIT_PART(name, '/', 1)::uuid
    AND (
      deals.listing_agent_id = auth.uid() OR
      deals.buying_agent_id = auth.uid()
    )
  ))
);

-- Create policy for document deletions
CREATE POLICY "Users can delete their deal documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'deal-documents' AND
  (EXISTS (
    SELECT 1 FROM deals
    WHERE deals.id = SPLIT_PART(name, '/', 1)::uuid
    AND (
      deals.listing_agent_id = auth.uid() OR
      deals.buying_agent_id = auth.uid()
    )
  ))
);

-- Create policy for document access
CREATE POLICY "Users can access deal documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'deal-documents' AND
  (EXISTS (
    SELECT 1 FROM deals
    WHERE deals.id = SPLIT_PART(name, '/', 1)::uuid
    AND (
      deals.listing_agent_id = auth.uid() OR
      deals.buying_agent_id = auth.uid()
    )
  ))
);