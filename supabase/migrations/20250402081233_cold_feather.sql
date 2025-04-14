/*
  # Add Deal Notifications and Events

  1. New Tables
    - `deal_notifications` - Store notifications for deal activities
    - `deal_events` - Store calendar events for deal meetings and viewings

  2. Security
    - Enable RLS on all tables
    - Add policies for data access
    - Ensure data integrity
*/

-- Create deal_notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS deal_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('chat', 'file', 'mou-signed', 'meeting')),
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create deal_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS deal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  location text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE deal_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_events ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_deal_notifications_deal_id ON deal_notifications(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_notifications_recipient_id ON deal_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_deal_notifications_read ON deal_notifications(read);
CREATE INDEX IF NOT EXISTS idx_deal_events_deal_id ON deal_events(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_events_start_time ON deal_events(start_time);

-- Create policies for deal_notifications
CREATE POLICY "Users can view their own notifications"
  ON deal_notifications
  FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON deal_notifications
  FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Create policies for deal_events
CREATE POLICY "Agents can view events for their deals"
  ON deal_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_events.deal_id
      AND (
        deals.listing_agent_id = auth.uid() OR 
        deals.buying_agent_id = auth.uid()
      )
    )
  );

CREATE POLICY "Agents can create events for their deals"
  ON deal_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_events.deal_id
      AND (
        deals.listing_agent_id = auth.uid() OR 
        deals.buying_agent_id = auth.uid()
      )
    )
  );

CREATE POLICY "Agents can update events they created"
  ON deal_events
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Agents can delete events they created"
  ON deal_events
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Create functions to automatically create notifications

-- Function to create notification when a new chat message is sent
CREATE OR REPLACE FUNCTION create_chat_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_deal RECORD;
  v_sender_name TEXT;
  v_property_title TEXT;
  v_recipient_id UUID;
BEGIN
  -- Get deal information
  SELECT d.*, p.title AS property_title
  INTO v_deal
  FROM deals d
  JOIN properties p ON d.property_id = p.id
  WHERE d.id = NEW.deal_id;
  
  -- Get sender name
  SELECT full_name INTO v_sender_name
  FROM profiles
  WHERE id = NEW.sender_id;
  
  -- Determine recipient (the other agent)
  IF NEW.sender_id = v_deal.listing_agent_id THEN
    v_recipient_id := v_deal.buying_agent_id;
  ELSE
    v_recipient_id := v_deal.listing_agent_id;
  END IF;
  
  -- Create notification
  INSERT INTO deal_notifications (
    deal_id,
    recipient_id,
    type,
    message,
    read,
    created_at
  ) VALUES (
    NEW.deal_id,
    v_recipient_id,
    'chat',
    v_sender_name || ' sent a message about ' || v_property_title,
    false,
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create notification when a new file is uploaded
CREATE OR REPLACE FUNCTION create_file_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_deal RECORD;
  v_uploader_name TEXT;
  v_property_title TEXT;
  v_recipient_id UUID;
BEGIN
  -- Get deal information
  SELECT d.*, p.title AS property_title
  INTO v_deal
  FROM deals d
  JOIN properties p ON d.property_id = p.id
  WHERE d.id = NEW.deal_id;
  
  -- Get uploader name
  SELECT full_name INTO v_uploader_name
  FROM profiles
  WHERE id = NEW.uploaded_by;
  
  -- Determine recipient (the other agent)
  IF NEW.uploaded_by = v_deal.listing_agent_id THEN
    v_recipient_id := v_deal.buying_agent_id;
  ELSE
    v_recipient_id := v_deal.listing_agent_id;
  END IF;
  
  -- Create notification
  INSERT INTO deal_notifications (
    deal_id,
    recipient_id,
    type,
    message,
    read,
    created_at
  ) VALUES (
    NEW.deal_id,
    v_recipient_id,
    'file',
    v_uploader_name || ' uploaded ' || NEW.name || ' for ' || v_property_title,
    false,
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create notification when MOU is signed (deal status changes to 'payment')
CREATE OR REPLACE FUNCTION create_mou_signed_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_property_title TEXT;
BEGIN
  -- Only proceed if status changed to 'payment' (MOU signed)
  IF NEW.status = 'payment' AND OLD.status != 'payment' THEN
    -- Get property title
    SELECT title INTO v_property_title
    FROM properties
    WHERE id = NEW.property_id;
    
    -- Create notification for listing agent
    IF NEW.listing_agent_id != auth.uid() THEN
      INSERT INTO deal_notifications (
        deal_id,
        recipient_id,
        type,
        message,
        read,
        created_at
      ) VALUES (
        NEW.id,
        NEW.listing_agent_id,
        'mou-signed',
        'MOU has been signed for ' || v_property_title,
        false,
        NOW()
      );
    END IF;
    
    -- Create notification for buying agent
    IF NEW.buying_agent_id != auth.uid() THEN
      INSERT INTO deal_notifications (
        deal_id,
        recipient_id,
        type,
        message,
        read,
        created_at
      ) VALUES (
        NEW.id,
        NEW.buying_agent_id,
        'mou-signed',
        'MOU has been signed for ' || v_property_title,
        false,
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create notification when a new meeting is scheduled
CREATE OR REPLACE FUNCTION create_meeting_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_deal RECORD;
  v_creator_name TEXT;
  v_property_title TEXT;
  v_recipient_id UUID;
BEGIN
  -- Get deal information
  SELECT d.*, p.title AS property_title
  INTO v_deal
  FROM deals d
  JOIN properties p ON d.property_id = p.id
  WHERE d.id = NEW.deal_id;
  
  -- Get creator name
  SELECT full_name INTO v_creator_name
  FROM profiles
  WHERE id = NEW.created_by;
  
  -- Determine recipient (the other agent)
  IF NEW.created_by = v_deal.listing_agent_id THEN
    v_recipient_id := v_deal.buying_agent_id;
  ELSE
    v_recipient_id := v_deal.listing_agent_id;
  END IF;
  
  -- Create notification
  INSERT INTO deal_notifications (
    deal_id,
    recipient_id,
    type,
    message,
    read,
    created_at
  ) VALUES (
    NEW.deal_id,
    v_recipient_id,
    'meeting',
    v_creator_name || ' scheduled "' || NEW.title || '" for ' || v_property_title,
    false,
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER create_chat_notification_trigger
  AFTER INSERT ON deal_chats
  FOR EACH ROW
  EXECUTE FUNCTION create_chat_notification();

CREATE TRIGGER create_file_notification_trigger
  AFTER INSERT ON deal_documents
  FOR EACH ROW
  EXECUTE FUNCTION create_file_notification();

CREATE TRIGGER create_mou_signed_notification_trigger
  AFTER UPDATE OF status ON deals
  FOR EACH ROW
  EXECUTE FUNCTION create_mou_signed_notification();

CREATE TRIGGER create_meeting_notification_trigger
  AFTER INSERT ON deal_events
  FOR EACH ROW
  EXECUTE FUNCTION create_meeting_notification();