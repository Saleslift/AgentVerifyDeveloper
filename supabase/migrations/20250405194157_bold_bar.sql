/*
  # Fix User Role Update Migration

  1. Changes
    - Update the user's role from 'agent' to 'developer' in the profiles table
    - Initialize developer_details field with empty JSON object
    - Generate a slug for the developer profile if it doesn't exist
    - Fix the audit log insertion to avoid null record_id error
  
  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity
*/

-- Update the user's role to developer
UPDATE profiles
SET 
  role = 'developer',
  developer_details = COALESCE(developer_details, '{}'::jsonb),
  updated_at = now()
WHERE 
  email = current_user AND
  role = 'agent';

-- Generate a slug for the developer profile if it doesn't exist
UPDATE profiles
SET 
  slug = generate_agent_slug(full_name, id)
WHERE 
  email = current_user AND
  role = 'developer' AND
  slug IS NULL;

-- Log the role change in audit logs if the table exists
DO $$ 
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the user ID first to avoid null record_id
  SELECT id INTO v_user_id FROM profiles WHERE email = current_user;
  
  IF v_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'audit_logs'
  ) THEN
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
      v_user_id,
      jsonb_build_object('role', 'agent'),
      jsonb_build_object('role', 'developer'),
      now()
    );
  END IF;
END $$;