-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role text;
  v_full_name text;
  v_company_details jsonb;
  v_developer_details jsonb;
  v_metadata jsonb;
BEGIN
  -- Add initial delay to ensure metadata is available
  PERFORM pg_sleep(0.5);
  
  -- Safely cast raw_user_meta_data to jsonb
  BEGIN
    v_metadata := COALESCE(NEW.raw_user_meta_data::jsonb, '{}'::jsonb);
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Invalid metadata format for user %: %', NEW.id, NEW.raw_user_meta_data;
    v_metadata := '{}'::jsonb;
  END;
  
  -- Extract role with validation
  v_role := COALESCE(v_metadata->>'role', 'agent');
  IF v_role NOT IN ('agent', 'agency', 'developer') THEN
    v_role := 'agent';
  END IF;

  -- Set full name based on role
  CASE v_role
    WHEN 'agent' THEN
      v_full_name := NULLIF(TRIM(
        COALESCE(v_metadata->>'firstName', '') || ' ' || 
        COALESCE(v_metadata->>'lastName', '')
      ), ' ');
      
    WHEN 'agency' THEN
      v_full_name := NULLIF(TRIM(COALESCE(v_metadata->>'companyName', '')), '');
      
    WHEN 'developer' THEN
      v_full_name := NULLIF(TRIM(COALESCE(v_metadata->>'developerCompanyName', '')), '');
  END CASE;

  -- Set company details for agency
  IF v_role = 'agency' THEN
    v_company_details := jsonb_build_object(
      'name', v_metadata->>'companyName',
      'registration_number', v_metadata->>'companyRegNumber',
      'address', v_metadata->>'companyAddress',
      'phone', v_metadata->>'agencyPhone'
    );
  END IF;

  -- Set developer details
  IF v_role = 'developer' THEN
    v_developer_details := jsonb_build_object(
      'company_name', v_metadata->>'developerCompanyName',
      'company_address', v_metadata->>'developerCompanyAddress',
      'phone', v_metadata->>'developerPhone'
    );
  END IF;

  -- Insert profile with retry logic
  FOR i IN 1..3 LOOP
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
      ON CONFLICT (id) DO UPDATE
      SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        company_details = EXCLUDED.company_details,
        developer_details = EXCLUDED.developer_details,
        updated_at = NOW();
      
      EXIT; -- Exit loop if successful
      
    EXCEPTION WHEN OTHERS THEN
      IF i = 3 THEN 
        RAISE LOG 'Failed to create profile for user % after 3 attempts: %', NEW.id, SQLERRM;
      ELSE
        PERFORM pg_sleep(0.5); -- Wait before retry
      END IF;
    END;
  END LOOP;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Unexpected error in handle_new_user for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Update RLS policies
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

CREATE POLICY "Users can create their own profile"
ON profiles FOR INSERT
TO public
WITH CHECK (
  auth.uid() IS NULL OR
  auth.uid() = id
);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles are viewable by everyone"
ON profiles FOR SELECT
TO public
USING (true);