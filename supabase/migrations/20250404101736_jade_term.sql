/*
  # Add Developer Meetings Table

  1. New Tables
    - `developer_meetings` - Store meetings between developers and agents/agencies
      - `id` (uuid, primary key)
      - `developer_id` (uuid, references profiles)
      - `project_id` (uuid, references properties, optional)
      - `agent_id` (uuid, references profiles, optional)
      - `agency_id` (uuid, references profiles, optional)
      - `title` (text)
      - `notes` (text)
      - `date` (timestamptz)
      - `status` (text)

  2. Security
    - Enable RLS
    - Add policies for developer access
    - Ensure data integrity
*/

-- Create developer_meetings table
CREATE TABLE IF NOT EXISTS developer_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id uuid REFERENCES profiles(id) NOT NULL,
  project_id uuid REFERENCES properties(id),
  agent_id uuid REFERENCES profiles(id),
  agency_id uuid REFERENCES profiles(id),
  title text NOT NULL,
  notes text,
  date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'done'))
);

-- Enable RLS
ALTER TABLE developer_meetings ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_developer_meetings_developer_id ON developer_meetings(developer_id);
CREATE INDEX IF NOT EXISTS idx_developer_meetings_project_id ON developer_meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_developer_meetings_agent_id ON developer_meetings(agent_id);
CREATE INDEX IF NOT EXISTS idx_developer_meetings_agency_id ON developer_meetings(agency_id);
CREATE INDEX IF NOT EXISTS idx_developer_meetings_date ON developer_meetings(date);
CREATE INDEX IF NOT EXISTS idx_developer_meetings_status ON developer_meetings(status);

-- Create policies
CREATE POLICY "Developers can manage their meetings"
  ON developer_meetings
  FOR ALL
  TO authenticated
  USING (developer_id = auth.uid())
  WITH CHECK (developer_id = auth.uid());

-- Add constraint to ensure either agent_id or agency_id is set, but not both
ALTER TABLE developer_meetings
ADD CONSTRAINT check_agent_or_agency
CHECK (
  (agent_id IS NOT NULL AND agency_id IS NULL) OR
  (agent_id IS NULL AND agency_id IS NOT NULL) OR
  (agent_id IS NULL AND agency_id IS NULL)
);