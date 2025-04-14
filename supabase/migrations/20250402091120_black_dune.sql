-- Create deal_meetings table if it doesn't exist
CREATE TABLE IF NOT EXISTS deal_meetings (
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
ALTER TABLE deal_meetings ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_deal_meetings_deal_id ON deal_meetings(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_meetings_start_time ON deal_meetings(start_time);

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Agents can view meetings for their deals" ON deal_meetings;
  DROP POLICY IF EXISTS "Agents can create meetings for their deals" ON deal_meetings;
  DROP POLICY IF EXISTS "Agents can update meetings they created" ON deal_meetings;
  DROP POLICY IF EXISTS "Agents can delete meetings they created" ON deal_meetings;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create policies for deal_meetings
CREATE POLICY "Agents can view meetings for their deals"
  ON deal_meetings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_meetings.deal_id
      AND (
        deals.listing_agent_id = auth.uid() OR 
        deals.buying_agent_id = auth.uid()
      )
    )
  );

CREATE POLICY "Agents can create meetings for their deals"
  ON deal_meetings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_meetings.deal_id
      AND (
        deals.listing_agent_id = auth.uid() OR 
        deals.buying_agent_id = auth.uid()
      )
    )
  );

CREATE POLICY "Agents can update meetings they created"
  ON deal_meetings
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Agents can delete meetings they created"
  ON deal_meetings
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Create function to create notification when a new meeting is scheduled
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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_meeting_notification_trigger ON deal_meetings;

-- Create trigger for meeting notifications
CREATE TRIGGER create_meeting_notification_trigger
  AFTER INSERT ON deal_meetings
  FOR EACH ROW
  EXECUTE FUNCTION create_meeting_notification();

-- Create function to log meeting creation in activity log
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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS log_meeting_activity_trigger ON deal_meetings;

-- Create trigger for logging meeting creation
CREATE TRIGGER log_meeting_activity_trigger
  AFTER INSERT ON deal_meetings
  FOR EACH ROW
  EXECUTE FUNCTION log_meeting_activity();