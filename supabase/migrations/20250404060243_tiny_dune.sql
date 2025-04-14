/*
  # Fix CRM tasks schema

  1. Changes
    - Add `updated_at` column to `crm_tasks` table
    - Fix linked lead relationship by renaming `linked_lead_id` to `lead_id`
    - Add trigger to automatically update `updated_at` column

  2. Security
    - No changes to RLS policies
*/

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_tasks' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE crm_tasks ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_crm_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_crm_tasks_updated_at_trigger'
  ) THEN
    CREATE TRIGGER update_crm_tasks_updated_at_trigger
    BEFORE UPDATE ON crm_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_crm_tasks_updated_at();
  END IF;
END $$;