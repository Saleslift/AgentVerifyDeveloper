-- Fix profile creation trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role text;
  v_full_name text;
  v_company_details jsonb;
  v_developer_details jsonb;
BEGIN
  -- Extract role from metadata
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'agent');
  
  -- Set full name based on role
  CASE v_role
    WHEN 'agent' THEN
      v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'firstName' || ' ' || NEW.raw_user_meta_data->>'lastName',
        ''
      );
    WHEN 'agency' THEN
      v_full_name := COALESCE(NEW.raw_user_meta_data->>'companyName', '');
    WHEN 'developer' THEN
      v_full_name := COALESCE(NEW.raw_user_meta_data->>'developerCompanyName', '');
  END CASE;

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
      'company_name', NEW.raw_user_meta_data->>'developerCompanyName',
      'company_address', NEW.raw_user_meta_data->>'developerCompanyAddress',
      'phone', NEW.raw_user_meta_data->>'developerPhone'
    );
  END IF;

  -- Insert profile
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
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();