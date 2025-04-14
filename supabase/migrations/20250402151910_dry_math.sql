/*
  # Add Deal Activity Logs Table

  1. New Tables
    - `deal_activity_logs` - Store comprehensive activity logs for deals
      - `id` (uuid, primary key)
      - `deal_id` (uuid, references deals)
      - `user_id` (uuid, references profiles)
      - `type` (text)
      - `payload` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for data access
    - Ensure data integrity
*/

-- Create deal_activity_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS deal_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE deal_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_deal_activity_logs_deal_id ON deal_activity_logs(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_activity_logs_user_id ON deal_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_activity_logs_type ON deal_activity_logs(type);
CREATE INDEX IF NOT EXISTS idx_deal_activity_logs_created_at ON deal_activity_logs(created_at);

-- Create policies
CREATE POLICY "Agents can view activity logs for their deals"
  ON deal_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_activity_logs.deal_id
      AND (
        deals.listing_agent_id = auth.uid() OR 
        deals.buying_agent_id = auth.uid()
      )
    )
  );

-- Create function to log status changes
CREATE OR REPLACE FUNCTION log_deal_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF NEW.status <> OLD.status THEN
    INSERT INTO deal_activity_logs (
      deal_id,
      user_id,
      type,
      payload,
      created_at
    ) VALUES (
      NEW.id,
      auth.uid(),
      'status_change',
      jsonb_build_object(
        'oldStatus', OLD.status,
        'newStatus', NEW.status
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to log message sent
CREATE OR REPLACE FUNCTION log_deal_message_sent()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO deal_activity_logs (
    deal_id,
    user_id,
    type,
    payload,
    created_at
  ) VALUES (
    NEW.deal_id,
    NEW.sender_id,
    'message_sent',
    jsonb_build_object(
      'message', NEW.message
    ),
    NEW.created_at
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to log document uploads
CREATE OR REPLACE FUNCTION log_deal_document_upload()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO deal_activity_logs (
    deal_id,
    user_id,
    type,
    payload,
    created_at
  ) VALUES (
    NEW.deal_id,
    NEW.uploaded_by,
    'document_upload',
    jsonb_build_object(
      'documentName', NEW.name,
      'documentType', NEW.type,
      'category', NEW.category
    ),
    NEW.created_at
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to log meeting creation
CREATE OR REPLACE FUNCTION log_deal_meeting_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO deal_activity_logs (
    deal_id,
    user_id,
    type,
    payload,
    created_at
  ) VALUES (
    NEW.deal_id,
    NEW.created_by,
    'meeting_created',
    jsonb_build_object(
      'title', NEW.title,
      'startTime', NEW.start_time,
      'endTime', NEW.end_time,
      'location', NEW.location
    ),
    NEW.created_at
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to log MOU signing
CREATE OR REPLACE FUNCTION log_deal_mou_signed()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if listing agent signed
  IF NEW.listing_agent_signed = true AND OLD.listing_agent_signed = false THEN
    INSERT INTO deal_activity_logs (
      deal_id,
      user_id,
      type,
      payload,
      created_at
    ) VALUES (
      NEW.id,
      NEW.listing_agent_id,
      'mou_signed',
      jsonb_build_object(
        'role', 'listing_agent',
        'agentId', NEW.listing_agent_id
      ),
      NEW.updated_at
    );
  END IF;
  
  -- Check if buying agent signed
  IF NEW.buying_agent_signed = true AND OLD.buying_agent_signed = false THEN
    INSERT INTO deal_activity_logs (
      deal_id,
      user_id,
      type,
      payload,
      created_at
    ) VALUES (
      NEW.id,
      NEW.buying_agent_id,
      'mou_signed',
      jsonb_build_object(
        'role', 'buying_agent',
        'agentId', NEW.buying_agent_id
      ),
      NEW.updated_at
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS log_deal_status_change_trigger ON deals;
CREATE TRIGGER log_deal_status_change_trigger
  AFTER UPDATE OF status ON deals
  FOR EACH ROW
  EXECUTE FUNCTION log_deal_status_change();

DROP TRIGGER IF EXISTS log_deal_message_sent_trigger ON deal_chats;
CREATE TRIGGER log_deal_message_sent_trigger
  AFTER INSERT ON deal_chats
  FOR EACH ROW
  EXECUTE FUNCTION log_deal_message_sent();

DROP TRIGGER IF EXISTS log_deal_document_upload_trigger ON deal_documents;
CREATE TRIGGER log_deal_document_upload_trigger
  AFTER INSERT ON deal_documents
  FOR EACH ROW
  EXECUTE FUNCTION log_deal_document_upload();

DROP TRIGGER IF EXISTS log_deal_meeting_created_trigger ON deal_meetings;
CREATE TRIGGER log_deal_meeting_created_trigger
  AFTER INSERT ON deal_meetings
  FOR EACH ROW
  EXECUTE FUNCTION log_deal_meeting_created();

DROP TRIGGER IF EXISTS log_deal_mou_signed_trigger ON deals;
CREATE TRIGGER log_deal_mou_signed_trigger
  AFTER UPDATE OF listing_agent_signed, buying_agent_signed ON deals
  FOR EACH ROW
  EXECUTE FUNCTION log_deal_mou_signed();