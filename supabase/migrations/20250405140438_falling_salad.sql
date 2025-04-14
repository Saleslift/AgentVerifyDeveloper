/*
  # Fix Developer Agency Contracts Table

  1. Changes
    - Check if policies already exist before creating them
    - Ensure table and indexes are created only if they don't exist
    - Maintain all functionality from the original migration
  
  2. Security
    - Maintain existing RLS policies
    - Ensure proper access controls
*/

-- Create developer_agency_contracts table if it doesn't exist
CREATE TABLE IF NOT EXISTS developer_agency_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  agency_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected')),
  developer_contract_url text,
  agency_license_url text,
  agency_signed_contract_url text,
  agency_registration_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  notes text,
  UNIQUE(developer_id, agency_id)
);

-- Enable RLS
ALTER TABLE developer_agency_contracts ENABLE ROW LEVEL SECURITY;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_developer_agency_contracts_developer_id ON developer_agency_contracts(developer_id);
CREATE INDEX IF NOT EXISTS idx_developer_agency_contracts_agency_id ON developer_agency_contracts(agency_id);
CREATE INDEX IF NOT EXISTS idx_developer_agency_contracts_status ON developer_agency_contracts(status);

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Developers can manage their contracts" ON developer_agency_contracts;
  DROP POLICY IF EXISTS "Agencies can view their contracts" ON developer_agency_contracts;
  DROP POLICY IF EXISTS "Agencies can update their contracts" ON developer_agency_contracts;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create policies
CREATE POLICY "Developers can manage their contracts"
  ON developer_agency_contracts
  FOR ALL
  TO authenticated
  USING (developer_id = auth.uid())
  WITH CHECK (developer_id = auth.uid());

CREATE POLICY "Agencies can view their contracts"
  ON developer_agency_contracts
  FOR SELECT
  TO authenticated
  USING (agency_id = auth.uid());

CREATE POLICY "Agencies can update their contracts"
  ON developer_agency_contracts
  FOR UPDATE
  TO authenticated
  USING (agency_id = auth.uid())
  WITH CHECK (
    agency_id = auth.uid() AND
    (
      -- Agencies can only update specific fields
      (
        agency_license_url IS DISTINCT FROM developer_agency_contracts.agency_license_url OR
        agency_signed_contract_url IS DISTINCT FROM developer_agency_contracts.agency_signed_contract_url OR
        agency_registration_url IS DISTINCT FROM developer_agency_contracts.agency_registration_url
      ) AND
      -- Agencies cannot change these fields
      developer_id = developer_agency_contracts.developer_id AND
      agency_id = developer_agency_contracts.agency_id AND
      developer_contract_url = developer_agency_contracts.developer_contract_url
    )
  );

-- Create trigger for updated_at if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_developer_agency_contracts_updated_at'
  ) THEN
    CREATE TRIGGER update_developer_agency_contracts_updated_at
      BEFORE UPDATE ON developer_agency_contracts
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create function to automatically update status when all documents are uploaded
CREATE OR REPLACE FUNCTION check_contract_documents_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if all required documents are uploaded
  IF 
    NEW.developer_contract_url IS NOT NULL AND
    NEW.agency_license_url IS NOT NULL AND
    NEW.agency_signed_contract_url IS NOT NULL AND
    NEW.agency_registration_url IS NOT NULL AND
    NEW.status = 'pending'
  THEN
    -- Update status to active
    NEW.status := 'active';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status update if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'check_contract_documents_complete_trigger'
  ) THEN
    CREATE TRIGGER check_contract_documents_complete_trigger
      BEFORE UPDATE ON developer_agency_contracts
      FOR EACH ROW
      EXECUTE FUNCTION check_contract_documents_complete();
  END IF;
END $$;

-- Create storage bucket for agency contracts if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('agency-contracts', 'agency-contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies to avoid conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Developers can upload and manage contract documents" ON storage.objects;
  DROP POLICY IF EXISTS "Agencies can view their contract documents" ON storage.objects;
  DROP POLICY IF EXISTS "Agencies can upload their contract documents" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create storage policies for agency contracts
CREATE POLICY "Developers can upload and manage contract documents"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'agency-contracts' AND
  (auth.uid())::text = SPLIT_PART(name, '/', 1)
);

CREATE POLICY "Agencies can view their contract documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'agency-contracts' AND
  (
    (auth.uid())::text = SPLIT_PART(name, '/', 1) OR
    (auth.uid())::text = SPLIT_PART(name, '/', 2)
  )
);

CREATE POLICY "Agencies can upload their contract documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'agency-contracts' AND
  (auth.uid())::text = SPLIT_PART(name, '/', 2)
);