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

-- Create agent_invitations table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'agent_invitations'
  ) THEN
    CREATE TABLE agent_invitations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text,
      agency_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
      token text NOT NULL UNIQUE,
      status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'expired')),
      expires_at timestamptz NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Enable RLS
ALTER TABLE agent_invitations ENABLE ROW LEVEL SECURITY;

-- Create indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_agent_invitations_email'
  ) THEN
    CREATE INDEX idx_agent_invitations_email ON agent_invitations(email);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_agent_invitations_token'
  ) THEN
    CREATE INDEX idx_agent_invitations_token ON agent_invitations(token);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_agent_invitations_agency_id'
  ) THEN
    CREATE INDEX idx_agent_invitations_agency_id ON agent_invitations(agency_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_agent_invitations_status'
  ) THEN
    CREATE INDEX idx_agent_invitations_status ON agent_invitations(status);
  END IF;
END $$;

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Agencies can manage their invitations" ON agent_invitations;
  DROP POLICY IF EXISTS "Public can verify invitation tokens" ON agent_invitations;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create policies
CREATE POLICY "Agencies can manage invitations"
  ON agent_invitations
  FOR ALL
  TO authenticated
  USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

CREATE POLICY "Public can verify tokens"
  ON agent_invitations
  FOR SELECT
  TO public
  USING (
    token = current_setting('app.current_token', true)
    AND status = 'pending'
    AND expires_at > now()
  );

-- Create trigger for updated_at if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_agent_invitations_updated_at'
  ) THEN
    CREATE TRIGGER update_agent_invitations_updated_at
      BEFORE UPDATE ON agent_invitations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create function to generate secure tokens
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i integer := 0;
  rand_idx integer;
BEGIN
  -- Generate a 32-character random token
  FOR i IN 1..32 LOOP
    rand_idx := floor(random() * length(chars)) + 1;
    result := result || substr(chars, rand_idx, 1);
  END LOOP;
  
  RETURN result;
END;
$$;

-- Create function to create invitation
CREATE OR REPLACE FUNCTION create_agent_invitation(
  p_email text,
  p_agency_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token text;
  v_invitation_id uuid;
  v_expiry timestamptz;
BEGIN
  -- Validate input
  IF p_email IS NULL THEN
    RAISE EXCEPTION 'Email must be provided';
  END IF;
  
  -- Generate token
  v_token := generate_invitation_token();
  
  -- Set expiry (7 days from now)
  v_expiry := now() + interval '7 days';
  
  -- Create invitation
  INSERT INTO agent_invitations (
    email,
    agency_id,
    token,
    status,
    expires_at
  ) VALUES (
    p_email,
    p_agency_id,
    v_token,
    'pending',
    v_expiry
  ) RETURNING id INTO v_invitation_id;
  
  RETURN v_invitation_id;
END;
$$;

-- Create function to verify invitation
CREATE OR REPLACE FUNCTION verify_invitation_token(
  p_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation agent_invitations%ROWTYPE;
  v_agency profiles%ROWTYPE;
  v_result jsonb;
BEGIN
  -- Set token in current session for RLS policy
  PERFORM set_config('app.current_token', p_token, true);
  
  -- Get invitation
  SELECT * INTO v_invitation
  FROM agent_invitations
  WHERE token = p_token
  AND status = 'pending'
  AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Invalid or expired invitation'
    );
  END IF;
  
  -- Get agency details
  SELECT * INTO v_agency
  FROM profiles
  WHERE id = v_invitation.agency_id;
  
  -- Build result
  v_result := jsonb_build_object(
    'valid', true,
    'invitation_id', v_invitation.id,
    'agency_id', v_invitation.agency_id,
    'agency_name', v_agency.full_name,
    'email', v_invitation.email,
    'expires_at', v_invitation.expires_at
  );
  
  RETURN v_result;
END;
$$;

-- Create function to accept invitation
CREATE OR REPLACE FUNCTION accept_invitation(
  p_token text,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation agent_invitations%ROWTYPE;
BEGIN
  -- Set token in current session for RLS policy
  PERFORM set_config('app.current_token', p_token, true);
  
  -- Get invitation
  SELECT * INTO v_invitation
  FROM agent_invitations
  WHERE token = p_token
  AND status = 'pending'
  AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Update invitation status
  UPDATE agent_invitations
  SET 
    status = 'accepted',
    updated_at = now()
  WHERE id = v_invitation.id;
  
  -- Create agent referral record
  INSERT INTO agent_referrals (
    agent_id,
    referral_name,
    referral_contact,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_invitation.agency_id,
    (SELECT full_name FROM profiles WHERE id = p_user_id),
    COALESCE(v_invitation.email, ''),
    'accepted',
    now(),
    now()
  );
  
  RETURN true;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_agent_invitation(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_invitation_token(text) TO public;
GRANT EXECUTE ON FUNCTION accept_invitation(text, uuid) TO authenticated;