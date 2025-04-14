/*
  # Create Developer Project Leads Table

  1. New Tables
    - `developer_project_leads` - Store agent-generated interest on developer's projects
      - `id` (uuid, primary key)
      - `agent_id` (uuid, references profiles)
      - `agency_id` (uuid, references profiles)
      - `developer_id` (uuid, references profiles)
      - `project_id` (uuid, references properties)
      - `client_name` (text)
      - `status` (text)
      - `notes` (text)
      - `submitted_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for data access
    - Ensure data integrity
*/

-- Create developer_project_leads table
CREATE TABLE IF NOT EXISTS developer_project_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES profiles(id) NOT NULL,
  agency_id uuid REFERENCES profiles(id),
  developer_id uuid REFERENCES profiles(id) NOT NULL,
  project_id uuid REFERENCES properties(id) NOT NULL,
  client_name text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in-talk', 'site-visit', 'closed')),
  notes text,
  submitted_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE developer_project_leads ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_developer_project_leads_agent_id ON developer_project_leads(agent_id);
CREATE INDEX IF NOT EXISTS idx_developer_project_leads_agency_id ON developer_project_leads(agency_id);
CREATE INDEX IF NOT EXISTS idx_developer_project_leads_developer_id ON developer_project_leads(developer_id);
CREATE INDEX IF NOT EXISTS idx_developer_project_leads_project_id ON developer_project_leads(project_id);
CREATE INDEX IF NOT EXISTS idx_developer_project_leads_status ON developer_project_leads(status);
CREATE INDEX IF NOT EXISTS idx_developer_project_leads_submitted_at ON developer_project_leads(submitted_at);

-- Create policies
CREATE POLICY "Developers can view leads for their projects"
  ON developer_project_leads
  FOR SELECT
  TO authenticated
  USING (developer_id = auth.uid());

CREATE POLICY "Developers can update leads for their projects"
  ON developer_project_leads
  FOR UPDATE
  TO authenticated
  USING (developer_id = auth.uid())
  WITH CHECK (developer_id = auth.uid());

CREATE POLICY "Agents can create leads for projects"
  ON developer_project_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    agent_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'agent'
    )
  );

CREATE POLICY "Agents can view their own leads"
  ON developer_project_leads
  FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid());

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_developer_project_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_developer_project_leads_updated_at
  BEFORE UPDATE ON developer_project_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_developer_project_leads_updated_at();

-- Create function to notify developer of new lead
CREATE OR REPLACE FUNCTION notify_developer_of_new_lead()
RETURNS TRIGGER AS $$
BEGIN
  -- In a real implementation, this would send a notification to the developer
  -- For now, we'll just return the NEW record
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_developer_of_new_lead_trigger
  AFTER INSERT ON developer_project_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_developer_of_new_lead();