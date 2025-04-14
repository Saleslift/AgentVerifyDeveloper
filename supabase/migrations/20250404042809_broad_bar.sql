/*
  # Create CRM Clients Table

  1. New Tables
    - `crm_clients` - Store client information for the CRM system
      - `id` (uuid, primary key)
      - `created_at` (timestamptz)
      - `lead_id` (uuid, references crm_leads)
      - `agent_id` (uuid, references auth.users)
      - `stage` (text)
      - `note` (text)
      - `contract_uploaded` (boolean)

  2. Security
    - Enable RLS
    - Add policies for agent access
    - Ensure data integrity
*/

-- Create crm_clients table
CREATE TABLE crm_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  lead_id uuid REFERENCES crm_leads(id) NOT NULL,
  agent_id uuid REFERENCES auth.users(id) NOT NULL,
  stage text DEFAULT 'visit done' CHECK (stage IN ('visit done', 'docs ready', 'payment sent', 'closed')),
  note text,
  contract_uploaded boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE crm_clients ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_crm_clients_lead_id ON crm_clients(lead_id);
CREATE INDEX idx_crm_clients_agent_id ON crm_clients(agent_id);
CREATE INDEX idx_crm_clients_stage ON crm_clients(stage);

-- Create policy for access control
CREATE POLICY "Allow access to agent's own clients"
  ON crm_clients
  FOR ALL
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_crm_clients_updated_at
  BEFORE UPDATE ON crm_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();