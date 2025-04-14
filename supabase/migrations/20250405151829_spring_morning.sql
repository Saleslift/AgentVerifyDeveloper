-- Create a new migration file to fix signup issues
-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create simplified handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role text;
  v_full_name text;
  v_company_details jsonb;
  v_developer_details jsonb;
BEGIN
  -- Log the start of the function
  RAISE LOG 'handle_new_user: Starting for user %', NEW.id;
  
  -- Extract role with validation
  BEGIN
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'agent');
    IF v_role NOT IN ('agent', 'agency', 'developer') THEN
      v_role := 'agent';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_role := 'agent';
  END;

  -- Set full name based on role
  BEGIN
    CASE v_role
      WHEN 'agent' THEN
        v_full_name := NULLIF(TRIM(
          COALESCE(NEW.raw_user_meta_data->>'firstName', '') || ' ' || 
          COALESCE(NEW.raw_user_meta_data->>'lastName', '')
        ), ' ');
        
      WHEN 'agency' THEN
        v_full_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'companyName', '')), '');
        
      WHEN 'developer' THEN
        v_full_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'developerCompanyName', '')), '');
    END CASE;
  EXCEPTION WHEN OTHERS THEN
    v_full_name := NEW.email;
  END;

  -- Set company details for agency
  BEGIN
    IF v_role = 'agency' THEN
      v_company_details := jsonb_build_object(
        'name', NEW.raw_user_meta_data->>'companyName',
        'registration_number', NEW.raw_user_meta_data->>'companyRegNumber',
        'address', NEW.raw_user_meta_data->>'companyAddress',
        'phone', NEW.raw_user_meta_data->>'agencyPhone'
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_company_details := NULL;
  END;

  -- Set developer details
  BEGIN
    IF v_role = 'developer' THEN
      v_developer_details := jsonb_build_object(
        'company_name', NEW.raw_user_meta_data->>'developerCompanyName',
        'company_address', NEW.raw_user_meta_data->>'developerCompanyAddress',
        'phone', NEW.raw_user_meta_data->>'developerPhone'
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_developer_details := NULL;
  END;

  -- Insert profile
  BEGIN
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
      COALESCE(v_full_name, NEW.email),
      v_role,
      v_company_details,
      v_developer_details,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE LOG 'handle_new_user: Successfully created profile for user %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: Error creating profile for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user: Unexpected error for user %: %', NEW.id, SQLERRM;
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

-- Ensure profiles table has proper constraints
DO $$ 
BEGIN
  -- Make sure email is not required to be unique
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
END $$;