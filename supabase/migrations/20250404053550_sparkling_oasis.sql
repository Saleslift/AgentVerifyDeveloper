/*
  # Fix CRM Activities Relationship

  1. Changes
    - Update the agent_id foreign key to reference profiles(id) instead of auth.users(id)
    - Add foreign key constraint for proper relationship
    - Update RLS policies to maintain security
  
  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity
*/

-- Drop the existing foreign key constraint if it exists
ALTER TABLE crm_activities 
DROP CONSTRAINT IF EXISTS crm_activities_agent_id_fkey;

-- Add the new foreign key constraint to profiles table
ALTER TABLE crm_activities
ADD CONSTRAINT crm_activities_agent_id_fkey
FOREIGN KEY (agent_id) REFERENCES profiles(id);

-- Update RLS policies to maintain security
DROP POLICY IF EXISTS "Allow users to access their own activities" ON crm_activities;

CREATE POLICY "Allow users to access their own activities"
  ON crm_activities
  FOR ALL
  TO authenticated
  USING (
    agent_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = crm_activities.lead_id
      AND (crm_leads.created_by = auth.uid() OR crm_leads.assigned_to = auth.uid())
    )
  )
  WITH CHECK (
    agent_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = crm_activities.lead_id
      AND (crm_leads.created_by = auth.uid() OR crm_leads.assigned_to = auth.uid())
    )
  );