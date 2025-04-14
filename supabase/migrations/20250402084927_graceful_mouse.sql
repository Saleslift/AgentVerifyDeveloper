/*
  # Add Deal Activities Table

  1. New Tables
    - `deal_activities` - Store deal activity log
      - `id` (uuid, primary key)
      - `deal_id` (uuid, references deals)
      - `agent_id` (uuid, references profiles)
      - `timestamp` (timestamptz)
      - `action_type` (text)
      - `details` (text)

  2. Security
    - Enable RLS
    - Add policies for data access
    - Ensure data integrity
*/

-- Create deal_activities table if it doesn't exist
CREATE TABLE IF NOT EXISTS deal_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  agent_id uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  timestamp timestamptz DEFAULT now() NOT NULL,
  action_type text NOT NULL,
  details text NOT NULL
);

-- Enable RLS
ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_deal_activities_deal_id ON deal_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_activities_agent_id ON deal_activities(agent_id);
CREATE INDEX IF NOT EXISTS idx_deal_activities_timestamp ON deal_activities(timestamp);

-- Create policies
CREATE POLICY "Agents can view activities for their deals"
  ON deal_activities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_activities.deal_id
      AND (
        deals.listing_agent_id = auth.uid() OR 
        deals.buying_agent_id = auth.uid()
      )
    )
  );

-- Create functions to automatically log activities

-- Function to log chat messages
CREATE OR REPLACE FUNCTION log_chat_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Get sender name
  INSERT INTO deal_activities (
    deal_id,
    agent_id,
    timestamp,
    action_type,
    details
  ) VALUES (
    NEW.deal_id,
    NEW.sender_id,
    NEW.created_at,
    'message',
    'Sent a message'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log file uploads
CREATE OR REPLACE FUNCTION log_file_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO deal_activities (
    deal_id,
    agent_id,
    timestamp,
    action_type,
    details
  ) VALUES (
    NEW.deal_id,
    NEW.uploaded_by,
    NEW.created_at,
    'file_upload',
    'Uploaded file: ' || NEW.name
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log status changes
CREATE OR REPLACE FUNCTION log_status_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF NEW.status <> OLD.status THEN
    INSERT INTO deal_activities (
      deal_id,
      agent_id,
      timestamp,
      action_type,
      details
    ) VALUES (
      NEW.id,
      auth.uid(), -- Current user making the change
      NEW.updated_at,
      'status_change',
      'Updated status from ' || OLD.status || ' to ' || NEW.status
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log MOU signing
CREATE OR REPLACE FUNCTION log_signature_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if listing agent signed
  IF NEW.listing_agent_signed = true AND OLD.listing_agent_signed = false THEN
    INSERT INTO deal_activities (
      deal_id,
      agent_id,
      timestamp,
      action_type,
      details
    ) VALUES (
      NEW.id,
      NEW.listing_agent_id,
      NEW.updated_at,
      'signature',
      'Property owner signed the MOU'
    );
  END IF;
  
  -- Check if buying agent signed
  IF NEW.buying_agent_signed = true AND OLD.buying_agent_signed = false THEN
    INSERT INTO deal_activities (
      deal_id,
      agent_id,
      timestamp,
      action_type,
      details
    ) VALUES (
      NEW.id,
      NEW.buying_agent_id,
      NEW.updated_at,
      'signature',
      'Client agent signed the MOU'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log meeting creation
CREATE OR REPLACE FUNCTION log_meeting_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO deal_activities (
    deal_id,
    agent_id,
    timestamp,
    action_type,
    details
  ) VALUES (
    NEW.deal_id,
    NEW.created_by,
    NEW.created_at,
    'meeting',
    'Scheduled meeting: ' || NEW.title
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER log_chat_activity_trigger
  AFTER INSERT ON deal_chats
  FOR EACH ROW
  EXECUTE FUNCTION log_chat_activity();

CREATE TRIGGER log_file_activity_trigger
  AFTER INSERT ON deal_documents
  FOR EACH ROW
  EXECUTE FUNCTION log_file_activity();

CREATE TRIGGER log_status_activity_trigger
  AFTER UPDATE OF status ON deals
  FOR EACH ROW
  EXECUTE FUNCTION log_status_activity();

CREATE TRIGGER log_signature_activity_trigger
  AFTER UPDATE OF listing_agent_signed, buying_agent_signed ON deals
  FOR EACH ROW
  EXECUTE FUNCTION log_signature_activity();

CREATE TRIGGER log_meeting_activity_trigger
  AFTER INSERT ON deal_events
  FOR EACH ROW
  EXECUTE FUNCTION log_meeting_activity();