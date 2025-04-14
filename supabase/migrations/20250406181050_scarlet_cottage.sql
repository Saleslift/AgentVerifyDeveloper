/*
  # Create CRM and Pipeline Schema

  1. New Tables
    - `crm_leads` - Store lead information for agents
    - `crm_deals` - Store deal pipeline information
    - `crm_messages` - Store messages related to deals
    - `crm_documents` - Store document metadata for deals
    - `crm_activities` - Store activity logs for leads and deals

  2. Security
    - Enable RLS on all tables
    - Add policies for agent access
    - Ensure data integrity with constraints
*/

-- Create crm_leads table
CREATE TABLE IF NOT EXISTS crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone_number text NOT NULL,
  email text,
  language text CHECK (language IN ('English', 'Arabic')),
  lead_type text NOT NULL CHECK (lead_type IN ('Buyer', 'Renter', 'Seller', 'Investor')),
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  lead_score integer CHECK (lead_score >= 0 AND lead_score <= 100),
  status text NOT NULL CHECK (status IN ('New', 'Contacted', 'Follow-up', 'Converted', 'Lost')),
  notes text,
  last_contacted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create crm_deals table
CREATE TABLE IF NOT EXISTS crm_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_type text NOT NULL CHECK (deal_type IN ('Own Property', 'Marketplace Property', 'Collaboration', 'Off-plan Project')),
  lead_id uuid REFERENCES crm_leads(id) ON DELETE SET NULL,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  project_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  co_agent_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('Draft', 'In Progress', 'Docs Sent', 'Signed', 'Closed', 'Lost')),
  deal_value numeric,
  commission_split text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create crm_messages table
CREATE TABLE IF NOT EXISTS crm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES crm_deals(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create crm_documents table
CREATE TABLE IF NOT EXISTS crm_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES crm_deals(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('ID', 'Buyer Passport', 'Seller ID', 'MOU', 'Contract', 'Payment Receipt')),
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer NOT NULL,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create crm_activities table
CREATE TABLE IF NOT EXISTS crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES crm_deals(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('Note', 'Call', 'Email', 'Meeting', 'Document', 'Status Change')),
  description text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CHECK ((lead_id IS NOT NULL AND deal_id IS NULL) OR (lead_id IS NULL AND deal_id IS NOT NULL))
);

-- Create crm_reminders table
CREATE TABLE IF NOT EXISTS crm_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES crm_deals(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  due_date timestamptz NOT NULL,
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK ((lead_id IS NOT NULL AND deal_id IS NULL) OR (lead_id IS NULL AND deal_id IS NOT NULL))
);

-- Create crm_checklists table
CREATE TABLE IF NOT EXISTS crm_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES crm_deals(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  is_completed boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_checklists ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_crm_leads_agent_id ON crm_leads(agent_id);
CREATE INDEX idx_crm_leads_status ON crm_leads(status);
CREATE INDEX idx_crm_leads_lead_type ON crm_leads(lead_type);
CREATE INDEX idx_crm_leads_created_at ON crm_leads(created_at);

CREATE INDEX idx_crm_deals_agent_id ON crm_deals(agent_id);
CREATE INDEX idx_crm_deals_lead_id ON crm_deals(lead_id);
CREATE INDEX idx_crm_deals_property_id ON crm_deals(property_id);
CREATE INDEX idx_crm_deals_status ON crm_deals(status);
CREATE INDEX idx_crm_deals_created_at ON crm_deals(created_at);

CREATE INDEX idx_crm_messages_deal_id ON crm_messages(deal_id);
CREATE INDEX idx_crm_messages_sender_id ON crm_messages(sender_id);
CREATE INDEX idx_crm_messages_created_at ON crm_messages(created_at);

CREATE INDEX idx_crm_documents_deal_id ON crm_documents(deal_id);
CREATE INDEX idx_crm_documents_type ON crm_documents(type);
CREATE INDEX idx_crm_documents_uploaded_by ON crm_documents(uploaded_by);

CREATE INDEX idx_crm_activities_lead_id ON crm_activities(lead_id);
CREATE INDEX idx_crm_activities_deal_id ON crm_activities(deal_id);
CREATE INDEX idx_crm_activities_agent_id ON crm_activities(agent_id);
CREATE INDEX idx_crm_activities_activity_type ON crm_activities(activity_type);
CREATE INDEX idx_crm_activities_created_at ON crm_activities(created_at);

CREATE INDEX idx_crm_reminders_lead_id ON crm_reminders(lead_id);
CREATE INDEX idx_crm_reminders_deal_id ON crm_reminders(deal_id);
CREATE INDEX idx_crm_reminders_agent_id ON crm_reminders(agent_id);
CREATE INDEX idx_crm_reminders_due_date ON crm_reminders(due_date);
CREATE INDEX idx_crm_reminders_is_completed ON crm_reminders(is_completed);

CREATE INDEX idx_crm_checklists_deal_id ON crm_checklists(deal_id);
CREATE INDEX idx_crm_checklists_is_completed ON crm_checklists(is_completed);

-- Create policies for crm_leads
CREATE POLICY "Agents can manage their own leads"
  ON crm_leads
  FOR ALL
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- Create policies for crm_deals
CREATE POLICY "Agents can manage their own deals"
  ON crm_deals
  FOR ALL
  TO authenticated
  USING (agent_id = auth.uid() OR co_agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid() OR co_agent_id = auth.uid());

-- Create policies for crm_messages
CREATE POLICY "Agents can view messages for their deals"
  ON crm_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_deals
      WHERE crm_deals.id = crm_messages.deal_id
      AND (crm_deals.agent_id = auth.uid() OR crm_deals.co_agent_id = auth.uid())
    )
  );

CREATE POLICY "Agents can send messages for their deals"
  ON crm_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM crm_deals
      WHERE crm_deals.id = crm_messages.deal_id
      AND (crm_deals.agent_id = auth.uid() OR crm_deals.co_agent_id = auth.uid())
    )
  );

CREATE POLICY "Agents can update read status of messages"
  ON crm_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_deals
      WHERE crm_deals.id = crm_messages.deal_id
      AND (crm_deals.agent_id = auth.uid() OR crm_deals.co_agent_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_deals
      WHERE crm_deals.id = crm_messages.deal_id
      AND (crm_deals.agent_id = auth.uid() OR crm_deals.co_agent_id = auth.uid())
    )
  );

-- Create policies for crm_documents
CREATE POLICY "Agents can view documents for their deals"
  ON crm_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_deals
      WHERE crm_deals.id = crm_documents.deal_id
      AND (crm_deals.agent_id = auth.uid() OR crm_deals.co_agent_id = auth.uid())
    )
  );

CREATE POLICY "Agents can upload documents for their deals"
  ON crm_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM crm_deals
      WHERE crm_deals.id = crm_documents.deal_id
      AND (crm_deals.agent_id = auth.uid() OR crm_deals.co_agent_id = auth.uid())
    )
  );

-- Create policies for crm_activities
CREATE POLICY "Agents can view activities for their leads and deals"
  ON crm_activities
  FOR SELECT
  TO authenticated
  USING (
    agent_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = crm_activities.lead_id
      AND crm_leads.agent_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM crm_deals
      WHERE crm_deals.id = crm_activities.deal_id
      AND (crm_deals.agent_id = auth.uid() OR crm_deals.co_agent_id = auth.uid())
    )
  );

CREATE POLICY "Agents can create activities for their leads and deals"
  ON crm_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    agent_id = auth.uid() AND
    (
      (
        crm_activities.lead_id IS NOT NULL AND
        EXISTS (
          SELECT 1 FROM crm_leads
          WHERE crm_leads.id = crm_activities.lead_id
          AND crm_leads.agent_id = auth.uid()
        )
      ) OR
      (
        crm_activities.deal_id IS NOT NULL AND
        EXISTS (
          SELECT 1 FROM crm_deals
          WHERE crm_deals.id = crm_activities.deal_id
          AND (crm_deals.agent_id = auth.uid() OR crm_deals.co_agent_id = auth.uid())
        )
      )
    )
  );

-- Create policies for crm_reminders
CREATE POLICY "Agents can manage their reminders"
  ON crm_reminders
  FOR ALL
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

-- Create policies for crm_checklists
CREATE POLICY "Agents can manage checklists for their deals"
  ON crm_checklists
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_deals
      WHERE crm_deals.id = crm_checklists.deal_id
      AND (crm_deals.agent_id = auth.uid() OR crm_deals.co_agent_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_deals
      WHERE crm_deals.id = crm_checklists.deal_id
      AND (crm_deals.agent_id = auth.uid() OR crm_deals.co_agent_id = auth.uid())
    )
  );

-- Create storage bucket for deal documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('crm-documents', 'crm-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for deal documents
CREATE POLICY "Agents can upload documents for their deals"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'crm-documents' AND
  EXISTS (
    SELECT 1 FROM crm_deals
    WHERE crm_deals.id::text = SPLIT_PART(name, '/', 1)
    AND (crm_deals.agent_id = auth.uid() OR crm_deals.co_agent_id = auth.uid())
  )
);

CREATE POLICY "Agents can access documents for their deals"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'crm-documents' AND
  EXISTS (
    SELECT 1 FROM crm_deals
    WHERE crm_deals.id::text = SPLIT_PART(name, '/', 1)
    AND (crm_deals.agent_id = auth.uid() OR crm_deals.co_agent_id = auth.uid())
  )
);

-- Create functions for updated_at triggers
CREATE OR REPLACE FUNCTION update_crm_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_crm_deals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_crm_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_crm_checklists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_crm_leads_updated_at
  BEFORE UPDATE ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_leads_updated_at();

CREATE TRIGGER update_crm_deals_updated_at
  BEFORE UPDATE ON crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_deals_updated_at();

CREATE TRIGGER update_crm_reminders_updated_at
  BEFORE UPDATE ON crm_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_reminders_updated_at();

CREATE TRIGGER update_crm_checklists_updated_at
  BEFORE UPDATE ON crm_checklists
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_checklists_updated_at();

-- Create function to automatically log activities
CREATE OR REPLACE FUNCTION log_crm_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_description text;
  v_activity_type text;
  v_agent_id uuid;
  v_lead_id uuid;
  v_deal_id uuid;
BEGIN
  -- Determine the agent ID
  v_agent_id := auth.uid();
  
  -- Set activity type and description based on the table and operation
  IF TG_TABLE_NAME = 'crm_leads' THEN
    v_lead_id := NEW.id;
    
    IF TG_OP = 'INSERT' THEN
      v_activity_type := 'Note';
      v_description := 'Created new lead: ' || NEW.full_name;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.status <> OLD.status THEN
        v_activity_type := 'Status Change';
        v_description := 'Changed lead status from ' || OLD.status || ' to ' || NEW.status;
      ELSE
        v_activity_type := 'Note';
        v_description := 'Updated lead information';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'crm_deals' THEN
    v_deal_id := NEW.id;
    
    IF TG_OP = 'INSERT' THEN
      v_activity_type := 'Note';
      v_description := 'Created new deal';
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.status <> OLD.status THEN
        v_activity_type := 'Status Change';
        v_description := 'Changed deal status from ' || OLD.status || ' to ' || NEW.status;
      ELSE
        v_activity_type := 'Note';
        v_description := 'Updated deal information';
      END IF;
    END IF;
  END IF;
  
  -- Insert activity log
  IF v_activity_type IS NOT NULL THEN
    INSERT INTO crm_activities (
      lead_id,
      deal_id,
      agent_id,
      activity_type,
      description,
      created_at
    ) VALUES (
      v_lead_id,
      v_deal_id,
      v_agent_id,
      v_activity_type,
      v_description,
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for activity logging
CREATE TRIGGER log_crm_lead_activity
  AFTER INSERT OR UPDATE ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION log_crm_activity();

CREATE TRIGGER log_crm_deal_activity
  AFTER INSERT OR UPDATE ON crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION log_crm_activity();

-- Create function to sync lead status with deal status
CREATE OR REPLACE FUNCTION sync_lead_deal_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If deal status changes to 'Closed', update the lead status to 'Converted'
  IF NEW.status = 'Closed' AND NEW.lead_id IS NOT NULL THEN
    UPDATE crm_leads
    SET status = 'Converted',
        last_contacted_at = now(),
        updated_at = now()
    WHERE id = NEW.lead_id;
  -- If deal status changes to 'Lost', update the lead status to 'Lost'
  ELSIF NEW.status = 'Lost' AND NEW.lead_id IS NOT NULL THEN
    UPDATE crm_leads
    SET status = 'Lost',
        last_contacted_at = now(),
        updated_at = now()
    WHERE id = NEW.lead_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for lead-deal status sync
CREATE TRIGGER sync_lead_deal_status_trigger
  AFTER UPDATE OF status ON crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION sync_lead_deal_status();

-- Create function to update last_contacted_at when a message is sent
CREATE OR REPLACE FUNCTION update_lead_last_contacted()
RETURNS TRIGGER AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  -- Get the lead_id from the deal
  SELECT lead_id INTO v_lead_id
  FROM crm_deals
  WHERE id = NEW.deal_id;
  
  -- Update the lead's last_contacted_at if lead exists
  IF v_lead_id IS NOT NULL THEN
    UPDATE crm_leads
    SET last_contacted_at = now(),
        updated_at = now()
    WHERE id = v_lead_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating last_contacted_at
CREATE TRIGGER update_lead_last_contacted_trigger
  AFTER INSERT ON crm_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_last_contacted();

-- Grant necessary permissions
GRANT ALL ON crm_leads TO authenticated;
GRANT ALL ON crm_deals TO authenticated;
GRANT ALL ON crm_messages TO authenticated;
GRANT ALL ON crm_documents TO authenticated;
GRANT ALL ON crm_activities TO authenticated;
GRANT ALL ON crm_reminders TO authenticated;
GRANT ALL ON crm_checklists TO authenticated;