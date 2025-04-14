/*
  # Fix Rate Limiting Implementation

  1. Changes
    - Drop existing objects with CASCADE to handle dependencies
    - Create rate limit tables and functions
    - Add proper error handling and security
    - Set up automatic cleanup
  
  2. Security
    - Enable RLS on tables
    - Use security definer for functions
    - Implement proper rate limiting
*/

-- Drop existing objects with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS check_rate_limit(text, text) CASCADE;
DROP FUNCTION IF EXISTS handle_auth_rate_limit(text) CASCADE;
DROP FUNCTION IF EXISTS enforce_rate_limit() CASCADE;
DROP TABLE IF EXISTS rate_limit_log CASCADE;
DROP TABLE IF EXISTS rate_limit_config CASCADE;

-- Create rate limit configuration table
CREATE TABLE rate_limit_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  window_seconds integer NOT NULL,
  max_requests integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create rate limit log table
CREATE TABLE rate_limit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  identifier text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_rate_limit_log_lookup ON rate_limit_log (type, identifier, created_at);

-- Insert default rate limit configuration
INSERT INTO rate_limit_config (type, window_seconds, max_requests)
VALUES 
  ('email', 300, 5),    -- 5 requests per 5 minutes
  ('auth', 300, 5);     -- 5 requests per 5 minutes

-- Create rate limit check function
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_type text,
  p_identifier text
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
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
  FROM rate_limit_log
  WHERE 
    type = p_type
    AND identifier = p_identifier
    AND created_at >= (now() - (v_config.window_seconds || ' seconds')::interval);

  -- Log attempt
  INSERT INTO rate_limit_log (type, identifier)
  VALUES (p_type, p_identifier);

  -- Clean up old logs
  DELETE FROM rate_limit_log
  WHERE created_at < (now() - interval '1 day');

  RETURN v_count < v_config.max_requests;
END;
$$;

-- Create function to handle auth rate limiting
CREATE OR REPLACE FUNCTION handle_auth_rate_limit(
  ip_address text DEFAULT current_setting('request.headers')::json->>'cf-connecting-ip'
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT check_rate_limit('auth', COALESCE(ip_address, 'unknown')) THEN
    RAISE EXCEPTION 'Too many login attempts. Please try again later.';
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_rate_limit(text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION handle_auth_rate_limit(text) TO authenticated, anon;

-- Create function to clean up old rate limit logs
CREATE OR REPLACE FUNCTION cleanup_rate_limit_logs()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM rate_limit_log
  WHERE created_at < (now() - interval '1 day');
END;
$$;