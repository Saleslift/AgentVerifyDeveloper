/*
  # Fix CRM Tasks Relationships

  1. Changes
    - Add foreign key relationship between crm_tasks and profiles for user_id
    - Update existing foreign key constraints
    - Add indexes for performance

  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing foreign key if it exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'crm_tasks_user_id_fkey'
  ) THEN
    ALTER TABLE crm_tasks DROP CONSTRAINT crm_tasks_user_id_fkey;
  END IF;
END $$;

-- Add new foreign key constraint with correct reference
ALTER TABLE crm_tasks
ADD CONSTRAINT crm_tasks_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_crm_tasks_user_id ON crm_tasks(user_id);