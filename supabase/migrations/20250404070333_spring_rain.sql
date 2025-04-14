-- Add agency_id column to crm_leads if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_leads' AND column_name = 'agency_id'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN agency_id uuid REFERENCES profiles(id);
  END IF;
END $$;

-- Create index for agency_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_crm_leads_agency_id'
  ) THEN
    CREATE INDEX idx_crm_leads_agency_id ON crm_leads(agency_id);
  END IF;
END $$;

-- Update RLS policies to include agency access
DROP POLICY IF EXISTS "Allow users to access their own leads" ON crm_leads;

CREATE POLICY "Allow users to access their own leads"
  ON crm_leads
  FOR ALL
  TO authenticated
  USING (
    created_by = auth.uid() OR 
    assigned_to = auth.uid() OR
    agency_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM agency_agents
      WHERE agency_agents.agency_id = crm_leads.agency_id
      AND agency_agents.agent_id = auth.uid()
      AND agency_agents.status = 'active'
    )
  )
  WITH CHECK (
    created_by = auth.uid() OR 
    assigned_to = auth.uid() OR
    agency_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM agency_agents
      WHERE agency_agents.agency_id = crm_leads.agency_id
      AND agency_agents.agent_id = auth.uid()
      AND agency_agents.status = 'active'
    )
  );

-- Update foreign key constraint for assigned_to to reference profiles
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'crm_leads_assigned_to_fkey'
  ) THEN
    ALTER TABLE crm_leads DROP CONSTRAINT crm_leads_assigned_to_fkey;
  END IF;
END $$;

ALTER TABLE crm_leads
ADD CONSTRAINT crm_leads_assigned_to_fkey
FOREIGN KEY (assigned_to) REFERENCES profiles(id);