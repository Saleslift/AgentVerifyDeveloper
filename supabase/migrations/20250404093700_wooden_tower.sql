/*
  # Add Developer Contracts and Agency Project Requests Tables

  1. New Tables
    - `developer_contracts` - Store contract templates uploaded by developers
      - `id` (uuid, primary key)
      - `developer_id` (uuid, references profiles)
      - `file_url` (text)
      - `file_name` (text)
      - `uploaded_at` (timestamptz)

    - `agency_project_requests` - Store agency requests to collaborate on projects
      - `id` (uuid, primary key)
      - `project_id` (uuid, references properties)
      - `agency_id` (uuid, references profiles)
      - `signed_file` (text)
      - `signed_file_name` (text)
      - `status` (text)
      - `requested_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for data access
    - Ensure data integrity
*/

-- Create developer_contracts table
CREATE TABLE IF NOT EXISTS developer_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

-- Create agency_project_requests table
CREATE TABLE IF NOT EXISTS agency_project_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  agency_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  signed_file text,
  signed_file_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed_uploaded', 'approved', 'rejected')),
  requested_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE developer_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_project_requests ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_developer_contracts_developer_id ON developer_contracts(developer_id);
CREATE INDEX IF NOT EXISTS idx_agency_project_requests_project_id ON agency_project_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_agency_project_requests_agency_id ON agency_project_requests(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_project_requests_status ON agency_project_requests(status);

-- Create policies for developer_contracts
CREATE POLICY "Developers can manage their own contracts"
  ON developer_contracts
  FOR ALL
  TO authenticated
  USING (developer_id = auth.uid())
  WITH CHECK (developer_id = auth.uid());

CREATE POLICY "Agencies can view developer contracts"
  ON developer_contracts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'agency'
    )
  );

-- Create policies for agency_project_requests
CREATE POLICY "Developers can view and manage requests for their projects"
  ON agency_project_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = agency_project_requests.project_id
      AND properties.agent_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = agency_project_requests.project_id
      AND properties.agent_id = auth.uid()
    )
  );

CREATE POLICY "Agencies can view and manage their own requests"
  ON agency_project_requests
  FOR ALL
  TO authenticated
  USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

-- Create storage bucket for developer contracts if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('developer-contracts', 'developer-contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for developer contracts
CREATE POLICY "Developers can upload their contracts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'developer-contracts' AND
  (auth.uid())::text = SPLIT_PART(name, '/', 1)
);

CREATE POLICY "Developers can manage their contracts"
ON storage.objects
TO authenticated
USING (
  bucket_id = 'developer-contracts' AND
  (auth.uid())::text = SPLIT_PART(name, '/', 1)
)
WITH CHECK (
  bucket_id = 'developer-contracts' AND
  (auth.uid())::text = SPLIT_PART(name, '/', 1)
);

CREATE POLICY "Agencies can view developer contracts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'developer-contracts');

-- Create storage bucket for signed contracts if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('signed-contracts', 'signed-contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for signed contracts
CREATE POLICY "Agencies can upload signed contracts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'signed-contracts' AND
  (auth.uid())::text = SPLIT_PART(name, '/', 1)
);

CREATE POLICY "Agencies and developers can view signed contracts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'signed-contracts' AND
  (
    (auth.uid())::text = SPLIT_PART(name, '/', 1) OR
    EXISTS (
      SELECT 1 FROM agency_project_requests apr
      JOIN properties p ON p.id = apr.project_id
      WHERE apr.agency_id::text = SPLIT_PART(name, '/', 1)
      AND p.agent_id = auth.uid()
    )
  )
);