/*
  # Fix Developer Role Assignment

  1. Changes
    - Fix existing users who signed up as developers but got assigned as agents
    - Update developer_details field with proper values from metadata
    - Generate slugs for developer profiles that don't have one
  
  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity
*/

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