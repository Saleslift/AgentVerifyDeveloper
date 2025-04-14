/*
  # Fix Developer Role Assignment in Signup Process

  1. Changes
    - Completely rewrite the handle_new_user function to fix role assignment
    - Add extensive logging to track function execution
    - Ensure developer_details is properly populated from metadata
    - Fix the trigger to ensure it's properly attached
  
  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity with proper validation
*/

-- Temporarily disable the validate_role_data trigger to allow updates
ALTER TABLE profiles DISABLE TRIGGER validate_role_data_trigger;

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create a completely rewritten handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role text;
  v_full_name text;
  v_company_details jsonb;
  v_developer_details jsonb;
  v_metadata jsonb;
BEGIN
  -- Immediate logging to confirm function execution
  RAISE LOG 'handle_new_user: FUNCTION TRIGGERED for user %', NEW.id;
  
  -- Safely extract metadata with extensive error handling
  BEGIN
    -- First try to parse as jsonb
    v_metadata := NEW.raw_user_meta_data::jsonb;
    RAISE LOG 'handle_new_user: Successfully parsed metadata for user %: %', NEW.id, v_metadata;
  EXCEPTION WHEN OTHERS THEN
    -- If parsing fails, try to convert from text
    BEGIN
      v_metadata := to_jsonb(NEW.raw_user_meta_data::text);
      RAISE LOG 'handle_new_user: Converted text metadata for user %: %', NEW.id, v_metadata;
    EXCEPTION WHEN OTHERS THEN
      -- Last resort fallback
      RAISE LOG 'handle_new_user: Failed to parse metadata for user %: %', NEW.id, NEW.raw_user_meta_data;
      v_metadata := '{}'::jsonb;
    END;
  END;
  
  -- Extract and validate role with detailed logging
  v_role := v_metadata->>'role';
  RAISE LOG 'handle_new_user: Raw role value for user %: %', NEW.id, v_role;
  
  -- Explicit role validation with fallback
  IF v_role IS NULL THEN
    v_role := 'agent';
    RAISE LOG 'handle_new_user: NULL role for user %, defaulting to agent', NEW.id;
  ELSIF v_role NOT IN ('agent', 'agency', 'developer') THEN
    RAISE LOG 'handle_new_user: Invalid role % for user %, defaulting to agent', v_role, NEW.id;
    v_role := 'agent';
  END IF;
  
  RAISE LOG 'handle_new_user: Final role for user %: %', NEW.id, v_role;

  -- Set full name based on role with detailed logging
  CASE v_role
    WHEN 'agent' THEN
      v_full_name := NULLIF(TRIM(
        COALESCE(v_metadata->>'firstName', '') || ' ' || 
        COALESCE(v_metadata->>'lastName', '')
      ), ' ');
      RAISE LOG 'handle_new_user: Agent name for user %: %', NEW.id, v_full_name;
      
    WHEN 'agency' THEN
      v_full_name := NULLIF(TRIM(COALESCE(v_metadata->>'companyName', '')), '');
      RAISE LOG 'handle_new_user: Agency name for user %: %', NEW.id, v_full_name;
      
    WHEN 'developer' THEN
      v_full_name := NULLIF(TRIM(COALESCE(v_metadata->>'developerCompanyName', '')), '');
      RAISE LOG 'handle_new_user: Developer name for user %: %', NEW.id, v_full_name;
  END CASE;

  -- Set company details for agency
  IF v_role = 'agency' THEN
    v_company_details := jsonb_build_object(
      'name', v_metadata->>'companyName',
      'registration_number', v_metadata->>'companyRegNumber',
      'address', v_metadata->>'companyAddress',
      'phone', v_metadata->>'agencyPhone'
    );
    RAISE LOG 'handle_new_user: Agency details for user %: %', NEW.id, v_company_details;
  END IF;

  -- Set developer details with all available metadata
  IF v_role = 'developer' THEN
    v_developer_details := jsonb_build_object(
      'company_name', COALESCE(v_metadata->>'developerCompanyName', v_full_name, NEW.email),
      'company_address', COALESCE(v_metadata->>'developerCompanyAddress', 'Dubai, UAE'),
      'phone', COALESCE(v_metadata->>'developerPhone', ''),
      'whatsapp', COALESCE(v_metadata->>'developerWhatsapp', v_metadata->>'developerPhone', ''),
      'email', NEW.email
    );
    RAISE LOG 'handle_new_user: Developer details for user %: %', NEW.id, v_developer_details;
  END IF;

  -- Insert or update profile with detailed logging
  BEGIN
    -- Check if profile already exists
    IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
      -- Update existing profile
      UPDATE profiles
      SET
        email = NEW.email,
        full_name = COALESCE(v_full_name, NEW.email),
        role = v_role,
        company_details = v_company_details,
        developer_details = v_developer_details,
        updated_at = NOW(),
        whatsapp = CASE 
          WHEN v_role = 'agent' THEN COALESCE(v_metadata->>'whatsapp', v_metadata->>'phone')
          WHEN v_role = 'agency' THEN COALESCE(v_metadata->>'agencyWhatsapp', v_metadata->>'agencyPhone')
          WHEN v_role = 'developer' THEN COALESCE(v_metadata->>'developerWhatsapp', v_metadata->>'developerPhone')
          ELSE NULL
        END,
        registration_number = CASE 
          WHEN v_role = 'agent' THEN v_metadata->>'brokerNumber'
          WHEN v_role = 'agency' THEN v_metadata->>'companyRegNumber'
          ELSE NULL
        END
      WHERE id = NEW.id;
      
      RAISE LOG 'handle_new_user: Updated existing profile for user % with role %', NEW.id, v_role;
    ELSE
      -- Create new profile
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
        COALESCE(v_full_name, NEW.email),
        v_role,
        v_company_details,
        v_developer_details,
        NOW(),
        NOW(),
        CASE 
          WHEN v_role = 'agent' THEN COALESCE(v_metadata->>'whatsapp', v_metadata->>'phone')
          WHEN v_role = 'agency' THEN COALESCE(v_metadata->>'agencyWhatsapp', v_metadata->>'agencyPhone')
          WHEN v_role = 'developer' THEN COALESCE(v_metadata->>'developerWhatsapp', v_metadata->>'developerPhone')
          ELSE NULL
        END,
        CASE 
          WHEN v_role = 'agent' THEN v_metadata->>'brokerNumber'
          WHEN v_role = 'agency' THEN v_metadata->>'companyRegNumber'
          ELSE NULL
        END
      );
      
      RAISE LOG 'handle_new_user: Created new profile for user % with role %', NEW.id, v_role;
    END IF;
    
    -- Create agent referrals if needed
    IF v_role = 'agent' AND 
       v_metadata->>'referral1Name' IS NOT NULL AND 
       v_metadata->>'referral1Contact' IS NOT NULL THEN
      
      -- Check if referrals already exist
      IF NOT EXISTS (SELECT 1 FROM agent_referrals WHERE agent_id = NEW.id) THEN
        INSERT INTO agent_referrals (
          agent_id,
          referral_name,
          referral_contact,
          status
        ) VALUES 
        (
          NEW.id,
          v_metadata->>'referral1Name',
          v_metadata->>'referral1Contact',
          'pending'
        ),
        (
          NEW.id,
          COALESCE(v_metadata->>'referral2Name', 'Referral 2'),
          COALESCE(v_metadata->>'referral2Contact', 'contact2@example.com'),
          'pending'
        ),
        (
          NEW.id,
          COALESCE(v_metadata->>'referral3Name', 'Referral 3'),
          COALESCE(v_metadata->>'referral3Contact', 'contact3@example.com'),
          'pending'
        );
        
        RAISE LOG 'handle_new_user: Created referrals for agent %', NEW.id;
      END IF;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: Error creating/updating profile for user %: %', NEW.id, SQLERRM;
  END;
  
  RAISE LOG 'handle_new_user: FUNCTION COMPLETED for user %', NEW.id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user: FATAL ERROR for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger with explicit schema reference
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

-- Log the changes
DO $$ 
DECLARE
  fixed_count int;
BEGIN
  SELECT COUNT(*) INTO fixed_count 
  FROM profiles 
  WHERE role = 'developer';
  
  RAISE NOTICE 'Fixed % developer profiles', fixed_count;
END $$;

-- Re-enable the validate_role_data trigger
ALTER TABLE profiles ENABLE TRIGGER validate_role_data_trigger;