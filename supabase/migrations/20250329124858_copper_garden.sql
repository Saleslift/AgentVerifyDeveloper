/*
  # Configure Rate Limiting for Testing

  1. Changes
    - Set rate limit to 1 second for testing
    - Add rate limit configuration table
    - Add helper functions for rate limiting
*/

-- Create rate limit configuration table
CREATE TABLE IF NOT EXISTS rate_limit_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  window_seconds integer NOT NULL,
  max_requests integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default rate limit configuration
INSERT INTO rate_limit_config (type, window_seconds, max_requests)
VALUES 
  ('email', 1, 1), -- 1 request per second for testing
  ('auth', 1, 1)   -- 1 request per second for testing
ON CONFLICT (id) DO UPDATE
SET 
  window_seconds = EXCLUDED.window_seconds,
  max_requests = EXCLUDED.max_requests,
  updated_at = now();

-- Create rate limit check function
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_type text,
  p_identifier text
) RETURNS boolean AS $$
DECLARE
  v_config rate_limit_config%ROWTYPE;
  v_count integer;
BEGIN
  -- Get rate limit config
  SELECT * INTO v_config
  FROM rate_limit_config
  WHERE type = p_type
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN true; -- No config found, allow request
  END IF;

  -- Count requests in window
  SELECT COUNT(*) INTO v_count
  FROM auth.audit_log_entries
  WHERE 
    created_at >= (now() - (v_config.window_seconds || ' seconds')::interval)
    AND ip_address = p_identifier;

  RETURN v_count < v_config.max_requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function for rate limiting
CREATE OR REPLACE FUNCTION enforce_rate_limit() 
RETURNS trigger AS $$
BEGIN
  IF NOT check_rate_limit('auth', NEW.ip_address::text) THEN
    RAISE EXCEPTION 'rate_limit_exceeded';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth attempts
DROP TRIGGER IF EXISTS auth_rate_limit ON auth.audit_log_entries;
CREATE TRIGGER auth_rate_limit
  BEFORE INSERT ON auth.audit_log_entries
  FOR EACH ROW
  EXECUTE FUNCTION enforce_rate_limit();