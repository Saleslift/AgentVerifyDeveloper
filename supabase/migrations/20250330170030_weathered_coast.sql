/*
  # Add Agent Profile Enhancements

  1. New Tables
    - `agent_service_areas` - Store agent service areas
    - `agent_certifications` - Store agent certifications

  2. New Columns
    - Add agency-related columns to profiles table
    - Add certification-related columns to profiles table
  
  3. Security
    - Enable RLS on new tables
    - Add policies for data access
*/

-- Create agent_service_areas table
CREATE TABLE IF NOT EXISTS agent_service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  location text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agent_id, location)
);

-- Create agent_certifications table
CREATE TABLE IF NOT EXISTS agent_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  file_url text NOT NULL,
  is_rera boolean DEFAULT false,
  rera_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add new columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS agency_website text,
ADD COLUMN IF NOT EXISTS agency_email text,
ADD COLUMN IF NOT EXISTS agency_formation_date date,
ADD COLUMN IF NOT EXISTS agency_team_size integer;

-- Enable RLS
ALTER TABLE agent_service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_certifications ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agent_service_areas_agent ON agent_service_areas(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_certifications_agent ON agent_certifications(agent_id);

-- Create policies for agent_service_areas
CREATE POLICY "Agents can manage their service areas"
  ON agent_service_areas
  FOR ALL
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Public can view agent service areas"
  ON agent_service_areas
  FOR SELECT
  TO public
  USING (true);

-- Create policies for agent_certifications
CREATE POLICY "Agents can manage their certifications"
  ON agent_certifications
  FOR ALL
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Public can view agent certifications"
  ON agent_certifications
  FOR SELECT
  TO public
  USING (true);

-- Create updated_at triggers
CREATE TRIGGER update_agent_service_areas_updated_at
  BEFORE UPDATE ON agent_service_areas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_certifications_updated_at
  BEFORE UPDATE ON agent_certifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for certifications if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('certifications', 'certifications', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for certifications
CREATE POLICY "Agents can upload their certifications"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'certifications' AND
  (auth.uid())::text = SPLIT_PART(name, '/', 1)
);

CREATE POLICY "Agents can manage their certifications"
ON storage.objects
TO authenticated
USING (
  bucket_id = 'certifications' AND
  (auth.uid())::text = SPLIT_PART(name, '/', 1)
)
WITH CHECK (
  bucket_id = 'certifications' AND
  (auth.uid())::text = SPLIT_PART(name, '/', 1)
);

CREATE POLICY "Public can view certifications"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'certifications');