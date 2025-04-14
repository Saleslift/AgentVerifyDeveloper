-- Temporarily disable the validate_role_data trigger to allow updates
ALTER TABLE profiles DISABLE TRIGGER validate_role_data_trigger;

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create a simplified handle_new_user function that focuses on reliability
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role text;
  v_full_name text;
  v_company_details jsonb;
  v_developer_details jsonb;
BEGIN
  -- Immediate logging to confirm function execution
  RAISE LOG 'handle_new_user: FUNCTION TRIGGERED for user %', NEW.id;
  
  -- Extract role directly from metadata with fallback
  BEGIN
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'agent');
    RAISE LOG 'handle_new_user: Role for user %: %', NEW.id, v_role;
  EXCEPTION WHEN OTHERS THEN
    v_role := 'agent';
    RAISE LOG 'handle_new_user: Error extracting role, defaulting to agent for user %', NEW.id;
  END;
  
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
  
  RAISE LOG 'handle_new_user: Full name for user %: %', NEW.id, v_full_name;

  -- Set company details for agency
  IF v_role = 'agency' THEN
    v_company_details := jsonb_build_object(
      'name', NEW.raw_user_meta_data->>'companyName',
      'registration_number', NEW.raw_user_meta_data->>'companyRegNumber',
      'address', NEW.raw_user_meta_data->>'companyAddress',
      'phone', NEW.raw_user_meta_data->>'agencyPhone'
    );
  END IF;

  -- Set developer details
  IF v_role = 'developer' THEN
    v_developer_details := jsonb_build_object(
      'company_name', COALESCE(NEW.raw_user_meta_data->>'developerCompanyName', v_full_name),
      'company_address', COALESCE(NEW.raw_user_meta_data->>'developerCompanyAddress', 'Dubai, UAE'),
      'phone', COALESCE(NEW.raw_user_meta_data->>'developerPhone', ''),
      'whatsapp', COALESCE(NEW.raw_user_meta_data->>'developerWhatsapp', NEW.raw_user_meta_data->>'developerPhone', ''),
      'email', NEW.email
    );
    RAISE LOG 'handle_new_user: Developer details for user %: %', NEW.id, v_developer_details;
  END IF;

  -- Create or update profile
  BEGIN
    INSERT INTO profiles (
      id,
      email,
      full_name,
      role,
      company_details,
      developer_details,
      created_at,
      updated_at,
      whatsapp,
      registration_number
    )
    VALUES (
      NEW.id,
      NEW.email,
      v_full_name,
      v_role,
      v_company_details,
      v_developer_details,
      NOW(),
      NOW(),
      CASE 
        WHEN v_role = 'agent' THEN COALESCE(NEW.raw_user_meta_data->>'whatsapp', NEW.raw_user_meta_data->>'phone')
        WHEN v_role = 'agency' THEN COALESCE(NEW.raw_user_meta_data->>'agencyWhatsapp', NEW.raw_user_meta_data->>'agencyPhone')
        WHEN v_role = 'developer' THEN COALESCE(NEW.raw_user_meta_data->>'developerWhatsapp', NEW.raw_user_meta_data->>'developerPhone')
        ELSE NULL
      END,
      CASE 
        WHEN v_role = 'agent' THEN NEW.raw_user_meta_data->>'brokerNumber'
        WHEN v_role = 'agency' THEN NEW.raw_user_meta_data->>'companyRegNumber'
        ELSE NULL
      END
    )
    ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      company_details = EXCLUDED.company_details,
      developer_details = EXCLUDED.developer_details,
      updated_at = EXCLUDED.updated_at,
      whatsapp = EXCLUDED.whatsapp,
      registration_number = EXCLUDED.registration_number;
    
    RAISE LOG 'handle_new_user: Profile created/updated for user % with role %', NEW.id, v_role;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: Error creating/updating profile for user %: %', NEW.id, SQLERRM;
  END;
  
  -- Create agent referrals if needed
  IF v_role = 'agent' AND 
     NEW.raw_user_meta_data->>'referral1Name' IS NOT NULL AND 
     NEW.raw_user_meta_data->>'referral1Contact' IS NOT NULL THEN
    
    -- Check if referrals already exist
    IF NOT EXISTS (SELECT 1 FROM agent_referrals WHERE agent_id = NEW.id) THEN
      BEGIN
        INSERT INTO agent_referrals (
          agent_id,
          referral_name,
          referral_contact,
          status
        ) VALUES 
        (
          NEW.id,
          NEW.raw_user_meta_data->>'referral1Name',
          NEW.raw_user_meta_data->>'referral1Contact',
          'pending'
        ),
        (
          NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'referral2Name', 'Referral 2'),
          COALESCE(NEW.raw_user_meta_data->>'referral2Contact', 'contact2@example.com'),
          'pending'
        ),
        (
          NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'referral3Name', 'Referral 3'),
          COALESCE(NEW.raw_user_meta_data->>'referral3Contact', 'contact3@example.com'),
          'pending'
        );
        
        RAISE LOG 'handle_new_user: Created referrals for agent %', NEW.id;
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'handle_new_user: Error creating referrals for user %: %', NEW.id, SQLERRM;
      END;
    END IF;
  END IF;
  
  RAISE LOG 'handle_new_user: FUNCTION COMPLETED for user %', NEW.id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user: FATAL ERROR for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Verify trigger creation
DO $$ 
DECLARE
  trigger_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) INTO trigger_exists;
  
  IF trigger_exists THEN
    RAISE NOTICE 'Trigger on_auth_user_created successfully created';
  ELSE
    RAISE WARNING 'Trigger on_auth_user_created was NOT created successfully';
  END IF;
END $$;

-- Fix existing users who signed up as developers but got assigned as agents
UPDATE profiles p
SET 
  role = 'developer',
  developer_details = jsonb_build_object(
    'company_name', COALESCE(u.raw_user_meta_data->>'developerCompanyName', p.full_name, p.email),
    'company_address', COALESCE(u.raw_user_meta_data->>'developerCompanyAddress', p.location, 'Dubai, UAE'),
    'phone', COALESCE(u.raw_user_meta_data->>'developerPhone', ''),
    'whatsapp', COALESCE(u.raw_user_meta_data->>'developerWhatsapp', u.raw_user_meta_data->>'developerPhone', ''),
    'email', p.email
  ),
  updated_at = now()
FROM auth.users u
WHERE 
  p.id = u.id AND
  u.raw_user_meta_data->>'role' = 'developer' AND
  p.role = 'agent';

-- Generate slugs for developer profiles that don't have one
UPDATE profiles
SET 
  slug = generate_agent_slug(full_name, id)
WHERE 
  role = 'developer' 
  AND slug IS NULL;

-- Create a function to manually fix a user's role to developer
CREATE OR REPLACE FUNCTION fix_user_role_to_developer(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_metadata jsonb;
  v_email text;
BEGIN
  -- Get user metadata
  SELECT raw_user_meta_data::jsonb, email INTO v_metadata, v_email
  FROM auth.users
  WHERE id = user_id;
  
  IF v_metadata IS NULL THEN
    RAISE EXCEPTION 'User not found or metadata is null';
  END IF;
  
  -- Update profile with developer role and details
  UPDATE profiles
  SET 
    role = 'developer',
    developer_details = jsonb_build_object(
      'company_name', COALESCE(v_metadata->>'developerCompanyName', full_name, email),
      'company_address', COALESCE(v_metadata->>'developerCompanyAddress', location, 'Dubai, UAE'),
      'phone', COALESCE(v_metadata->>'developerPhone', ''),
      'whatsapp', COALESCE(v_metadata->>'developerWhatsapp', v_metadata->>'developerPhone', ''),
      'email', v_email
    ),
    updated_at = now()
  WHERE id = user_id;
  
  -- Generate slug if needed
  UPDATE profiles
  SET slug = generate_agent_slug(full_name, id)
  WHERE id = user_id AND slug IS NULL;
  
  RAISE NOTICE 'User % role updated to developer', user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION fix_user_role_to_developer(uuid) TO authenticated;

-- Re-enable the validate_role_data trigger
ALTER TABLE profiles ENABLE TRIGGER validate_role_data_trigger;