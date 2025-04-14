/*
  # Fix CRM Tasks Lead ID Column

  1. Changes
    - Rename linked_lead_id to lead_id in all references
    - Update LeadProfileModal.tsx to use lead_id instead of linked_lead_id
    - Update RemindersTable.tsx to use lead_id instead of linked_lead_id
  
  2. Security
    - No changes to RLS policies
*/

-- Rename linked_lead_id to lead_id if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_tasks' AND column_name = 'linked_lead_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_tasks' AND column_name = 'lead_id'
  ) THEN
    -- Rename the column
    ALTER TABLE crm_tasks RENAME COLUMN linked_lead_id TO lead_id;
  END IF;
END $$;

-- If lead_id doesn't exist but linked_lead_id doesn't either, create lead_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_tasks' AND column_name = 'lead_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_tasks' AND column_name = 'linked_lead_id'
  ) THEN
    -- Create the column
    ALTER TABLE crm_tasks ADD COLUMN lead_id uuid REFERENCES crm_leads(id);
  END IF;
END $$;

-- Create index for lead_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_crm_tasks_lead_id'
  ) THEN
    CREATE INDEX idx_crm_tasks_lead_id ON crm_tasks(lead_id);
  END IF;
END $$;

-- Drop the old index if it exists
DROP INDEX IF EXISTS idx_crm_tasks_linked_lead_id;