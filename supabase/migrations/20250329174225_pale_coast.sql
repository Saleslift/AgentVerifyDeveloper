-- Drop existing rate limit tables and functions
DROP TABLE IF EXISTS rate_limit_log CASCADE;
DROP TABLE IF EXISTS rate_limit_config CASCADE;
DROP FUNCTION IF EXISTS check_rate_limit CASCADE;
DROP FUNCTION IF EXISTS handle_auth_rate_limit CASCADE;
DROP FUNCTION IF EXISTS enforce_rate_limit CASCADE;
DROP FUNCTION IF EXISTS cleanup_rate_limit_logs CASCADE;

-- Disable email confirmation requirement
UPDATE auth.users
SET email_confirmed_at = CURRENT_TIMESTAMP
WHERE email_confirmed_at IS NULL;

-- Set default email confirmation to true for new users
ALTER TABLE auth.users 
ALTER COLUMN email_confirmed_at 
SET DEFAULT CURRENT_TIMESTAMP;

-- Remove email confirmation triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update the handle_new_user function to not deal with email confirmation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'agent'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger without email confirmation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();