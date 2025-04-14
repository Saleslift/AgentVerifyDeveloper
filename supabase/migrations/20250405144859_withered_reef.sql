/*
  # Fix handle_new_user function

  1. Changes
    - Improve error handling in handle_new_user function
    - Add more detailed logging
    - Fix profile creation issues
    - Handle metadata parsing more robustly
  
  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity
*/

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
  v_log_message text;
BEGIN
  -- Add initial delay to ensure metadata is available
  PERFORM pg_sleep(0.5);
  
  -- Log the start of the function
  RAISE LOG 'handle_new_user: Starting for user %', NEW.id;
  
  -- Safely cast raw_user_meta_data to jsonb
  BEGIN
    v_metadata := COALESCE(NEW.raw_user_meta_data::jsonb, '{}'::jsonb);
    RAISE LOG 'handle_new_user: Metadata for user %: %', NEW.id, v_metadata;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: Invalid metadata format for user %: %', NEW.id, NEW.raw_user_meta_data;
    v_metadata := '{}'::jsonb;
  END;
  
  -- Extract role with validation
  v_role := COALESCE(v_metadata->>'role', 'agent');
  IF v_role NOT IN ('agent', 'agency', 'developer') THEN
    RAISE LOG 'handle_new_user: Invalid role % for user %, defaulting to agent', v_role, NEW.id;
    v_role := 'agent';
  END IF;

  -- Set full name based on role
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
      )
      ON CONFLICT (id) DO UPDATE
      SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        company_details = EXCLUDED.company_details,
        developer_details = EXCLUDED.developer_details,
        updated_at = NOW(),
        whatsapp = EXCLUDED.whatsapp,
        registration_number = EXCLUDED.registration_number;
      
      RAISE LOG 'handle_new_user: Successfully created profile for user %', NEW.id;
      
      -- Create agent referrals if needed
      IF v_role = 'agent' AND 
         v_metadata->>'referral1Name' IS NOT NULL AND 
         v_metadata->>'referral1Contact' IS NOT NULL THEN
        
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
          v_metadata->>'referral2Name',
          v_metadata->>'referral2Contact',
          'pending'
        ),
        (
          NEW.id,
          v_metadata->>'referral3Name',
          v_metadata->>'referral3Contact',
          'pending'
        );
        
        RAISE LOG 'handle_new_user: Created referrals for agent %', NEW.id;
      END IF;
      
      EXIT; -- Exit loop if successful
      
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'handle_new_user: Error creating profile for user % (attempt %/3): %', NEW.id, i, SQLERRM;
      
      IF i = 3 THEN 
        RAISE LOG 'handle_new_user: Failed to create profile after 3 attempts for user %: %', NEW.id, SQLERRM;
      ELSE
        PERFORM pg_sleep(0.5); -- Wait before retry
      END IF;
    END;
  END LOOP;
  
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

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Update RLS policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Users can create their own profile'
  ) THEN
    CREATE POLICY "Users can create their own profile"
    ON profiles
    FOR INSERT
    TO public
    WITH CHECK (
      auth.uid() IS NULL OR
      auth.uid() = id
    );
  END IF;
END $$;