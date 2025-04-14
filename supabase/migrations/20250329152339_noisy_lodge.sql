/*
  # Add Phone Verification Support

  1. Changes
    - Add phone_number and phone_verified columns to profiles table
    - Add verification_attempts table for rate limiting
    - Add functions and triggers for verification handling
  
  2. Security
    - Track verification attempts
    - Implement rate limiting
    - Store verification status
*/

-- Add phone verification columns to profiles
ALTER TABLE profiles
ADD COLUMN phone_number text,
ADD COLUMN phone_verified boolean DEFAULT false;

-- Create verification attempts tracking
CREATE TABLE verification_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  attempt_count integer DEFAULT 1,
  last_attempt timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_verification_attempts_phone ON verification_attempts(phone_number);

-- Create function to track verification attempts
CREATE OR REPLACE FUNCTION track_verification_attempt(p_phone_number text)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_attempts integer;
  v_last_attempt timestamptz;
BEGIN
  -- Get current attempts
  SELECT attempt_count, last_attempt INTO v_attempts, v_last_attempt
  FROM verification_attempts
  WHERE phone_number = p_phone_number
  AND last_attempt > now() - interval '24 hours'
  FOR UPDATE;

  IF NOT FOUND THEN
    -- First attempt in 24 hours
    INSERT INTO verification_attempts (phone_number)
    VALUES (p_phone_number);
    RETURN true;
  END IF;

  -- Check if too many attempts
  IF v_attempts >= 5 THEN
    -- Check if enough time has passed since last attempt
    IF v_last_attempt > now() - interval '1 hour' THEN
      RETURN false;
    END IF;

    -- Reset counter after 1 hour
    UPDATE verification_attempts
    SET attempt_count = 1, last_attempt = now()
    WHERE phone_number = p_phone_number;
  ELSE
    -- Increment attempt counter
    UPDATE verification_attempts
    SET attempt_count = attempt_count + 1, last_attempt = now()
    WHERE phone_number = p_phone_number;
  END IF;

  RETURN true;
END;
$$;

-- Create function to mark phone as verified
CREATE OR REPLACE FUNCTION mark_phone_verified(user_id uuid, phone_number text)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE profiles
  SET 
    phone_number = phone_number,
    phone_verified = true,
    updated_at = now()
  WHERE id = user_id;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION track_verification_attempt(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION mark_phone_verified(uuid, text) TO authenticated, anon;