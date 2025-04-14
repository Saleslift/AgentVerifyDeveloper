-- Check if crm_activities table already exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'crm_activities'
  ) THEN
    -- Create crm_activities table only if it doesn't exist
    CREATE TABLE crm_activities (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE NOT NULL,
      agent_id uuid REFERENCES auth.users(id) NOT NULL,
      type text NOT NULL,
      comment text NOT NULL,
      created_at timestamptz DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;

    -- Create indexes
    CREATE INDEX idx_crm_activities_lead_id ON crm_activities(lead_id);
    CREATE INDEX idx_crm_activities_agent_id ON crm_activities(agent_id);
    CREATE INDEX idx_crm_activities_created_at ON crm_activities(created_at);
    CREATE INDEX idx_crm_activities_type ON crm_activities(type);
  END IF;
END $$;

-- Create policy for access control (will be replaced if it already exists)
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