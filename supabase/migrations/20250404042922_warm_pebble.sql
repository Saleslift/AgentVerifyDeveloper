/*
  # Create CRM Blacklist Table

  1. New Tables
    - `crm_blacklist` - Store agent blacklist information
      - `id` (uuid, primary key)
      - `created_at` (timestamptz)
      - `agent_id` (uuid, references auth.users)
      - `blocked_agent_id` (uuid, references auth.users)
      - `reason` (text)
      - `date_blocked` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for agent access
    - Ensure data integrity
*/

-- Create crm_blacklist table
CREATE TABLE crm_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  agent_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  blocked_agent_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason text,
  date_blocked timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE crm_blacklist ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_crm_blacklist_agent_id ON crm_blacklist(agent_id);
CREATE INDEX idx_crm_blacklist_blocked_agent_id ON crm_blacklist(blocked_agent_id);
CREATE INDEX idx_crm_blacklist_date_blocked ON crm_blacklist(date_blocked);

-- Create policy for access control
CREATE POLICY "Agents can manage their own blacklist"
  ON crm_blacklist
  FOR ALL
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- Add unique constraint to prevent duplicate blocks
ALTER TABLE crm_blacklist
ADD CONSTRAINT unique_agent_blocked_agent
UNIQUE (agent_id, blocked_agent_id);

-- Create trigger for updated_at
CREATE TRIGGER update_crm_blacklist_updated_at
  BEFORE UPDATE ON crm_blacklist
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();