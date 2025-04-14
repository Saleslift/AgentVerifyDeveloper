/*
  # Add Agent Referrals Table

  1. New Tables
    - `agent_referrals` - Store referrals made during agent signup
      - `id` (uuid, primary key)
      - `agent_id` (uuid, references profiles)
      - `referral_name` (text)
      - `referral_contact` (text)
      - `status` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for data access
    - Ensure data integrity
*/

-- Create agent_referrals table
CREATE TABLE IF NOT EXISTS agent_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  referral_name text NOT NULL,
  referral_contact text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE agent_referrals ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agent_referrals_agent_id ON agent_referrals(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_referrals_status ON agent_referrals(status);

-- Create policies
CREATE POLICY "Agents can view their own referrals"
  ON agent_referrals
  FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can create referrals"
  ON agent_referrals
  FOR INSERT
  TO authenticated
  WITH CHECK (agent_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_agent_referrals_updated_at
  BEFORE UPDATE ON agent_referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON agent_referrals TO authenticated;