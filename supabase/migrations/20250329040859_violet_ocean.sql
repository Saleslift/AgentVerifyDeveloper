-- Drop existing trigger to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create or replace the handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Add a small delay to ensure user is fully created
  PERFORM pg_sleep(0.5);
  
  -- Insert profile if it doesn't exist
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    company_details,
    developer_details,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'agent'),
    CASE 
      WHEN NEW.raw_user_meta_data->>'role' = 'agency' 
      THEN jsonb_build_object(
        'name', NEW.raw_user_meta_data->>'company_name',
        'registration_number', NEW.raw_user_meta_data->>'company_reg_number',
        'address', NEW.raw_user_meta_data->>'company_address',
        'phone', NEW.raw_user_meta_data->>'company_phone'
      )
      ELSE NULL
    END,
    CASE 
      WHEN NEW.raw_user_meta_data->>'role' = 'developer' 
      THEN jsonb_build_object(
        'company_name', NEW.raw_user_meta_data->>'developer_company_name',
        'company_address', NEW.raw_user_meta_data->>'developer_company_address',
        'phone', NEW.raw_user_meta_data->>'developer_phone'
      )
      ELSE NULL
    END,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Update profiles table constraints
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('agent', 'agency', 'developer'));

-- Add index for faster profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);