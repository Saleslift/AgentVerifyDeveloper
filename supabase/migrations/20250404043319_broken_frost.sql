/*
  # Create CRM Agent Relations Table

  1. New Tables
    - `crm_agent_relations` - Store relationships between agents
      - `id` (uuid, primary key)
      - `created_at` (timestamptz)
      - `agent_id` (uuid, references auth.users)
      - `contacted_agent_id` (uuid, references auth.users)
      - `status` (text)
      - `note` (text)

  2. Security
    - Enable RLS
    - Add policies for agent access
    - Ensure data integrity
*/

-- Create crm_agent_relations table
CREATE TABLE crm_agent_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  agent_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contacted_agent_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  note text
);

-- Enable RLS
ALTER TABLE crm_agent_relations ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_crm_agent_relations_agent_id ON crm_agent_relations(agent_id);
CREATE INDEX idx_crm_agent_relations_contacted_agent_id ON crm_agent_relations(contacted_agent_id);
CREATE INDEX idx_crm_agent_relations_status ON crm_agent_relations(status);

-- Create policy for access control
CREATE POLICY "Agents can manage their own agent relations"
  ON crm_agent_relations
  FOR ALL
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- Add unique constraint to prevent duplicate relations
ALTER TABLE crm_agent_relations
ADD CONSTRAINT unique_agent_relation
UNIQUE (agent_id, contacted_agent_id);

-- Create trigger for updated_at
CREATE TRIGGER update_crm_agent_relations_updated_at
  BEFORE UPDATE ON crm_agent_relations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();