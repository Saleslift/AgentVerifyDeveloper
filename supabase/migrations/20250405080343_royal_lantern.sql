/*
  # Add Agent Projects and Unit Types Tables

  1. New Tables
    - `agent_projects` - Store projects that agents have added to their public page
      - `id` (uuid, primary key)
      - `agent_id` (uuid, references profiles)
      - `project_id` (uuid, references properties)
      - `created_at` (timestamptz)

    - `unit_types` - Store unit types for developer projects
      - `id` (uuid, primary key)
      - `project_id` (uuid, references properties)
      - `developer_id` (uuid, references profiles)
      - `name` (text)
      - `size_range` (text)
      - `floor_range` (text)
      - `price_range` (text)
      - `status` (text)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for data access
    - Ensure data integrity
*/

-- Create agent_projects table
CREATE TABLE IF NOT EXISTS agent_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(agent_id, project_id)
);

-- Create unit_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS unit_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  developer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  size_range text,
  floor_range text,
  price_range text,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold out')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE agent_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_types ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agent_projects_agent_id ON agent_projects(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_projects_project_id ON agent_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_unit_types_project_id ON unit_types(project_id);
CREATE INDEX IF NOT EXISTS idx_unit_types_developer_id ON unit_types(developer_id);
CREATE INDEX IF NOT EXISTS idx_unit_types_status ON unit_types(status);

-- Create policies for agent_projects
CREATE POLICY "Agents can manage their projects"
  ON agent_projects
  FOR ALL
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- Drop existing policies for unit_types if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Developers can manage their unit types" ON unit_types;
  DROP POLICY IF EXISTS "Anyone can view unit types" ON unit_types;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create policies for unit_types
CREATE POLICY "Developers can manage their unit types"
  ON unit_types
  FOR ALL
  TO authenticated
  USING (developer_id = auth.uid())
  WITH CHECK (developer_id = auth.uid());

CREATE POLICY "Anyone can view unit types"
  ON unit_types
  FOR SELECT
  TO public
  USING (true);

-- Create function for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_unit_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS update_unit_types_updated_at ON unit_types;

-- Create trigger for updated_at
CREATE TRIGGER update_unit_types_updated_at
  BEFORE UPDATE ON unit_types
  FOR EACH ROW
  EXECUTE FUNCTION update_unit_types_updated_at();