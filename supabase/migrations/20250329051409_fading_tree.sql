/*
  # Add Agent Invitations Table

  1. New Tables
    - `agent_invitations` - Store agent invitation records
      - `id` (uuid, primary key)
      - `email` (text)
      - `agency_id` (uuid, references profiles)
      - `token` (text)
      - `status` (text)
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for agencies to manage invitations
    - Add policy for public to verify tokens
*/

-- Create agent_invitations table
CREATE TABLE agent_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  agency_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE agent_invitations ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_agent_invitations_email ON agent_invitations(email);
CREATE INDEX idx_agent_invitations_token ON agent_invitations(token);
CREATE INDEX idx_agent_invitations_agency_id ON agent_invitations(agency_id);
CREATE INDEX idx_agent_invitations_status ON agent_invitations(status);

-- Create policies
CREATE POLICY "Agencies can manage their invitations"
  ON agent_invitations
  FOR ALL
  TO authenticated
  USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

CREATE POLICY "Public can verify invitation tokens"
  ON agent_invitations
  FOR SELECT
  TO public
  USING (
    token = current_setting('app.current_token', true)
    AND status = 'pending'
    AND expires_at > now()
  );

-- Create trigger for updated_at
CREATE TRIGGER update_agent_invitations_updated_at
  BEFORE UPDATE ON agent_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();