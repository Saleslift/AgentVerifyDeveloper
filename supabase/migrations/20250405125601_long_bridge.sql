/*
  # Add Cascade Delete for Projects

  1. Changes
    - Add ON DELETE CASCADE to foreign key constraints for project-related tables
    - Ensure proper cleanup when a project is deleted
  
  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity
*/

-- Add ON DELETE CASCADE to unit_types table if it doesn't already have it
DO $$ 
BEGIN
  -- First check if the constraint exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unit_types_project_id_fkey'
  ) THEN
    -- Drop the existing constraint
    ALTER TABLE unit_types DROP CONSTRAINT unit_types_project_id_fkey;
  END IF;
  
  -- Add the constraint with CASCADE
  ALTER TABLE unit_types
  ADD CONSTRAINT unit_types_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES properties(id) ON DELETE CASCADE;
END $$;

-- Add ON DELETE CASCADE to agent_projects table if it doesn't already have it
DO $$ 
BEGIN
  -- First check if the constraint exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'agent_projects_project_id_fkey'
  ) THEN
    -- Drop the existing constraint
    ALTER TABLE agent_projects DROP CONSTRAINT agent_projects_project_id_fkey;
  END IF;
  
  -- Add the constraint with CASCADE
  ALTER TABLE agent_projects
  ADD CONSTRAINT agent_projects_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES properties(id) ON DELETE CASCADE;
END $$;

-- Add ON DELETE CASCADE to agency_project_requests table if it doesn't already have it
DO $$ 
BEGIN
  -- First check if the constraint exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'agency_project_requests_project_id_fkey'
  ) THEN
    -- Drop the existing constraint
    ALTER TABLE agency_project_requests DROP CONSTRAINT agency_project_requests_project_id_fkey;
  END IF;
  
  -- Add the constraint with CASCADE
  ALTER TABLE agency_project_requests
  ADD CONSTRAINT agency_project_requests_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES properties(id) ON DELETE CASCADE;
END $$;

-- Add ON DELETE CASCADE to developer_project_leads table if it doesn't already have it
DO $$ 
BEGIN
  -- First check if the constraint exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'developer_project_leads_project_id_fkey'
  ) THEN
    -- Drop the existing constraint
    ALTER TABLE developer_project_leads DROP CONSTRAINT developer_project_leads_project_id_fkey;
  END IF;
  
  -- Add the constraint with CASCADE
  ALTER TABLE developer_project_leads
  ADD CONSTRAINT developer_project_leads_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES properties(id) ON DELETE CASCADE;
END $$;