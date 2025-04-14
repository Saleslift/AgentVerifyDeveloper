-- Create deal_meetings table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deal_meetings') THEN
    CREATE TABLE deal_meetings (
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
    CREATE INDEX idx_deal_meetings_deal_id ON deal_meetings(deal_id);
    CREATE INDEX idx_deal_meetings_start_time ON deal_meetings(start_time);
  END IF;
END $$;

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
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'deal_meetings' AND policyname = 'Agents can view meetings for their deals'
  ) THEN
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
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'deal_meetings' AND policyname = 'Agents can create meetings for their deals'
  ) THEN
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
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'deal_meetings' AND policyname = 'Agents can update meetings they created'
  ) THEN
    CREATE POLICY "Agents can update meetings they created"
      ON deal_meetings
      FOR UPDATE
      TO authenticated
      USING (created_by = auth.uid())
      WITH CHECK (created_by = auth.uid());
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'deal_meetings' AND policyname = 'Agents can delete meetings they created'
  ) THEN
    CREATE POLICY "Agents can delete meetings they created"
      ON deal_meetings
      FOR DELETE
      TO authenticated
      USING (created_by = auth.uid());
  END IF;
END $$;

-- Create function to create notification when a new meeting is scheduled
CREATE OR REPLACE FUNCTION create_meeting_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Get deal information and property title
  PERFORM pg_notify('meeting_scheduled', json_build_object(
    'deal_id', NEW.deal_id,
    'created_by', NEW.created_by,
    'title', NEW.title
  )::text);
  
  -- Create notification for the other agent
  INSERT INTO deal_notifications (
    deal_id,
    recipient_id,
    type,
    message,
    read,
    created_at
  )
  SELECT
    NEW.deal_id,
    CASE 
      WHEN d.listing_agent_id = NEW.created_by THEN d.buying_agent_id
      ELSE d.listing_agent_id
    END,
    'meeting',
    (SELECT full_name FROM profiles WHERE id = NEW.created_by) || 
    ' scheduled "' || NEW.title || '" for ' || 
    (SELECT title FROM properties WHERE id = d.property_id),
    false,
    NOW()
  FROM deals d
  WHERE d.id = NEW.deal_id;
  
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