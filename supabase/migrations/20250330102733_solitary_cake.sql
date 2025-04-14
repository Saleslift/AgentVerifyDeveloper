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
  PERFORM pg_sleep(1);
  
  -- Get metadata with fallback
  v_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  
  -- Log metadata for debugging
  RAISE LOG 'Creating profile for user % with metadata: %', NEW.id, v_metadata;
  
  -- Extract role with validation
  v_role := COALESCE(v_metadata->>'role', 'agent');
  IF v_role NOT IN ('agent', 'agency', 'developer') THEN
    RAISE EXCEPTION 'Invalid role: %', v_role;
  END IF;

  -- Set full name based on role with validation
  CASE v_role
    WHEN 'agent' THEN
      IF v_metadata->>'firstName' IS NULL OR v_metadata->>'lastName' IS NULL THEN
        RAISE EXCEPTION 'First name and last name are required for agents';
      END IF;
      v_full_name := v_metadata->>'firstName' || ' ' || v_metadata->>'lastName';
      
    WHEN 'agency' THEN
      IF v_metadata->>'companyName' IS NULL THEN
        RAISE EXCEPTION 'Company name is required for agencies';
      END IF;
      v_full_name := v_metadata->>'companyName';
      
    WHEN 'developer' THEN
      IF v_metadata->>'developerCompanyName' IS NULL THEN
        RAISE EXCEPTION 'Company name is required for developers';
      END IF;
      v_full_name := v_metadata->>'developerCompanyName';
  END CASE;

  -- Set company details for agency with validation
  IF v_role = 'agency' THEN
    IF v_metadata->>'companyRegNumber' IS NULL OR v_metadata->>'companyAddress' IS NULL THEN
      RAISE EXCEPTION 'Company registration number and address are required for agencies';
    END IF;
    
    v_company_details := jsonb_build_object(
      'name', v_metadata->>'companyName',
      'registration_number', v_metadata->>'companyRegNumber',
      'address', v_metadata->>'companyAddress',
      'phone', v_metadata->>'agencyPhone'
    );
  END IF;

  -- Set developer details with validation
  IF v_role = 'developer' THEN
    IF v_metadata->>'developerCompanyAddress' IS NULL THEN
      RAISE EXCEPTION 'Company address is required for developers';
    END IF;
    
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
        v_full_name,
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
      
      -- Log successful profile creation
      RAISE LOG 'Successfully created profile for user %', NEW.id;
      
      EXIT; -- Exit loop if successful
      
    EXCEPTION WHEN OTHERS THEN
      -- Log the error
      RAISE LOG 'Error creating profile for user % (attempt %/3): %', NEW.id, i, SQLERRM;
      
      IF i = 3 THEN 
        RAISE EXCEPTION 'Failed to create profile after 3 attempts: %', SQLERRM;
      END IF;
      
      PERFORM pg_sleep(1); -- Wait before retry
    END;
  END LOOP;
  
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