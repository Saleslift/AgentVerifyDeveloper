/*
  # Fix Developer Role Assignment

  1. Changes
    - Update user role from 'agent' to 'developer' for users who registered as developers
    - Initialize developer_details JSON object if it doesn't exist
    - Generate slug for developer profiles if missing
  
  2. Security
    - Maintain existing RLS policies
    - Ensure proper role assignment
*/

-- Update the user's role to developer
DO $$ 
DECLARE
  v_user_id uuid;
  v_user_email text;
BEGIN
  -- Get the current user's ID and email
  SELECT id, email INTO v_user_id, v_user_email 
  FROM auth.users 
  WHERE email = current_user;
  
  -- Update the profile if it exists and is currently set as 'agent'
  IF v_user_id IS NOT NULL THEN
    UPDATE profiles
    SET 
      role = 'developer',
      developer_details = COALESCE(developer_details, '{}'::jsonb),
      updated_at = now()
    WHERE 
      id = v_user_id AND
      role = 'agent';
      
    -- Generate a slug for the developer profile if it doesn't exist
    UPDATE profiles
    SET 
      slug = generate_agent_slug(full_name, id)
    WHERE 
      id = v_user_id AND
      role = 'developer' AND
      slug IS NULL;
      
    -- Log the change
    RAISE NOTICE 'Updated role to developer for user %', v_user_email;
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
BEGIN
  -- Get the user ID from the email
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = user_email;
  
  -- Update the profile if it exists
  IF v_user_id IS NOT NULL THEN
    UPDATE profiles
    SET 
      role = 'developer',
      developer_details = COALESCE(developer_details, '{}'::jsonb),
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