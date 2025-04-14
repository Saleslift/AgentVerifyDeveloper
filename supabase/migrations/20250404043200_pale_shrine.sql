/*
  # Create CRM Developers Table

  1. New Tables
    - `crm_developers` - Store developer contacts and information
      - `id` (uuid, primary key)
      - `created_at` (timestamptz)
      - `created_by` (uuid, references auth.users)
      - `developer_name` (text)
      - `contact_person` (text)
      - `phone` (text)
      - `email` (text)
      - `project_link` (text)
      - `status` (text)
      - `note` (text)

  2. Security
    - Enable RLS
    - Add policies for user access
    - Ensure data integrity
*/

-- Create crm_developers table
CREATE TABLE crm_developers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  developer_name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  project_link text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  note text
);

-- Enable RLS
ALTER TABLE crm_developers ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_crm_developers_created_by ON crm_developers(created_by);
CREATE INDEX idx_crm_developers_status ON crm_developers(status);
CREATE INDEX idx_crm_developers_developer_name ON crm_developers(developer_name);

-- Create policy for access control
CREATE POLICY "Users can manage their own developers"
  ON crm_developers
  FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_crm_developers_updated_at
  BEFORE UPDATE ON crm_developers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();