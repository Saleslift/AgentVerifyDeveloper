-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create a very simple handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role text;
  v_full_name text;
BEGIN
  -- Extract role with fallback to agent
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'agent');
  
  -- Set full name based on role
  CASE v_role
    WHEN 'agent' THEN
      v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'firstName' || ' ' || NEW.raw_user_meta_data->>'lastName',
        NEW.email
      );
    WHEN 'agency' THEN
      v_full_name := COALESCE(NEW.raw_user_meta_data->>'companyName', NEW.email);
    WHEN 'developer' THEN
      v_full_name := COALESCE(NEW.raw_user_meta_data->>'developerCompanyName', NEW.email);
    ELSE
      v_full_name := NEW.email;
  END CASE;

  -- Create profile with minimal fields
  INSERT INTO profiles (
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
    v_full_name,
    v_role,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Disable email confirmation requirement for all users
UPDATE auth.users
SET email_confirmed_at = CURRENT_TIMESTAMP
WHERE email_confirmed_at IS NULL;

-- Set default email confirmation to true for new users
ALTER TABLE auth.users 
ALTER COLUMN email_confirmed_at 
SET DEFAULT CURRENT_TIMESTAMP;

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Update RLS policies - Fixed syntax by removing IF NOT EXISTS
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
CREATE POLICY "Users can create their own profile"
ON profiles
FOR INSERT
TO public
WITH CHECK (
  auth.uid() IS NULL OR
  auth.uid() = id
);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone"
ON profiles
FOR SELECT
TO public
USING (true);