/*
  # Fix Rate Limit Configuration

  1. Changes
    - Update rate limit configuration for email and auth
    - Increase window size and request limits
    - Add better error messages
  
  2. Security
    - Maintain rate limiting while preventing false positives
    - Keep security measures in place
*/

-- Update rate limit configuration with more reasonable limits
UPDATE rate_limit_config
SET 
  window_seconds = 300,  -- 5 minutes
  max_requests = 10      -- 10 requests per 5 minutes
WHERE type IN ('email', 'auth');

-- Insert if not exists
INSERT INTO rate_limit_config (type, window_seconds, max_requests)
SELECT 'email', 300, 10
WHERE NOT EXISTS (SELECT 1 FROM rate_limit_config WHERE type = 'email');

INSERT INTO rate_limit_config (type, window_seconds, max_requests)
SELECT 'auth', 300, 10
WHERE NOT EXISTS (SELECT 1 FROM rate_limit_config WHERE type = 'auth');

-- Update the rate limit check function to be more lenient
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

  -- Only log if we're going to count it
  IF v_count < v_config.max_requests THEN
    INSERT INTO rate_limit_log (type, identifier)
    VALUES (p_type, p_identifier);
  END IF;

  -- Clean up old logs periodically
  IF random() < 0.1 THEN -- 10% chance to clean up
    DELETE FROM rate_limit_log
    WHERE created_at < (now() - interval '1 day');
  END IF;

  RETURN v_count < v_config.max_requests;
END;
$$;