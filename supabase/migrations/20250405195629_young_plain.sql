/*
  # Fix Developer Role Assignment

  1. Changes
    - Fix the issue with updating user roles to developer
    - Properly handle audit logs to avoid null record_id error
    - Ensure developer_details is initialized correctly
  
  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity
*/

-- Update the user's role to developer with proper error handling
DO $$ 
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_current_role text;
BEGIN
  -- Get the current user's ID and email
  SELECT id, email INTO v_user_id, v_user_email 
  FROM auth.users 
  WHERE email = current_user;
  
  -- Get current role
  SELECT role INTO v_current_role
  FROM profiles
  WHERE id = v_user_id;
  
  -- Update the profile if it exists and is currently set as 'agent'
  IF v_user_id IS NOT NULL AND v_current_role = 'agent' THEN
    -- Update role to developer
    UPDATE profiles
    SET 
      role = 'developer',
      developer_details = jsonb_build_object(
        'company_name', full_name,
        'company_address', location
      ),
      updated_at = now()
    WHERE 
      id = v_user_id;
      
    -- Generate a slug for the developer profile if it doesn't exist
    UPDATE profiles
    SET 
      slug = generate_agent_slug(full_name, id)
    WHERE 
      id = v_user_id AND
      slug IS NULL;
      
    -- Log the change to audit_logs if the table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'audit_logs'
    ) THEN
      -- Only insert if we have a valid user ID
      INSERT INTO audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_data,
        new_data,
        created_at
      ) VALUES (
        v_user_id,
        'update',
        'profiles',
        v_user_id,  -- Using v_user_id which we know is not null
        jsonb_build_object('role', 'agent'),
        jsonb_build_object('role', 'developer'),
        now()
      );
    END IF;
    
    RAISE NOTICE 'Updated role to developer for user %', v_user_email;
  ELSE
    RAISE NOTICE 'No update needed for user % (ID: %, current role: %)', 
      v_user_email, v_user_id, v_current_role;
  END IF;
END $$;

-- Create a function to update user roles directly
CREATE OR REPLACE FUNCTION update_user_role_to_developer(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_current_role text;
BEGIN
  -- Get the user ID from the email
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = user_email;
  
  -- Get current role
  SELECT role INTO v_current_role
  FROM profiles
  WHERE id = v_user_id;
  
  -- Update the profile if it exists
  IF v_user_id IS NOT NULL THEN
    -- Update role to developer with proper developer_details
    UPDATE profiles
    SET 
      role = 'developer',
      developer_details = CASE 
        WHEN developer_details IS NULL THEN 
          jsonb_build_object(
            'company_name', full_name,
            'company_address', COALESCE(location, 'Dubai, UAE')
          )
        ELSE 
          developer_details
        END,
      updated_at = now()
    WHERE 
      id = v_user_id;
      
    -- Generate a slug for the developer profile if it doesn't exist
    UPDATE profiles
    SET 
      slug = generate_agent_slug(full_name, id)
    WHERE 
      id = v_user_id AND
      role = 'developer' AND
      slug IS NULL;
      
    RAISE NOTICE 'Updated role to developer for user %', user_email;
  ELSE
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_role_to_developer(text) TO authenticated;

-- Validate that developer_details is properly initialized for all developer profiles
UPDATE profiles
SET developer_details = jsonb_build_object(
  'company_name', full_name,
  'company_address', COALESCE(location, 'Dubai, UAE')
)
WHERE 
  role = 'developer' AND
  (developer_details IS NULL OR developer_details = '{}'::jsonb);