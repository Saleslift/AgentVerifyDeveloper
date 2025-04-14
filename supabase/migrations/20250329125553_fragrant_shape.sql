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
  ('email', 300, 5),    -- 5 requests per 5 minutes
  ('auth', 300, 5)      -- 5 requests per 5 minutes
ON CONFLICT (id) DO UPDATE
SET 
  window_seconds = EXCLUDED.window_seconds,
  max_requests = EXCLUDED.max_requests,
  updated_at = now();

-- Create rate limit tracking table
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  identifier text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_rate_limit_log_lookup ON rate_limit_log (type, identifier, created_at);

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle auth rate limiting
CREATE OR REPLACE FUNCTION handle_auth_rate_limit(ip_address text)
RETURNS void AS $$
BEGIN
  IF NOT check_rate_limit('auth', ip_address) THEN
    RAISE EXCEPTION 'Too many login attempts. Please try again later.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;