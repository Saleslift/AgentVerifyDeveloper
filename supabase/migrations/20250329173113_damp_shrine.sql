-- Update rate limit configuration with higher limits
UPDATE rate_limit_config
SET 
  window_seconds = 3600,  -- 1 hour window
  max_requests = 100      -- 100 requests per hour
WHERE type IN ('email', 'auth');

-- Insert if not exists
INSERT INTO rate_limit_config (type, window_seconds, max_requests)
SELECT 'email', 3600, 100
WHERE NOT EXISTS (SELECT 1 FROM rate_limit_config WHERE type = 'email');

INSERT INTO rate_limit_config (type, window_seconds, max_requests)
SELECT 'auth', 3600, 100
WHERE NOT EXISTS (SELECT 1 FROM rate_limit_config WHERE type = 'auth');

-- Clean up old rate limit logs
DELETE FROM rate_limit_log
WHERE created_at < now() - interval '24 hours';