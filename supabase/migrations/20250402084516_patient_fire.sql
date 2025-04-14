-- Create deal_events table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deal_events') THEN
    -- Create deal_events table
    CREATE TABLE deal_events (
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
    ALTER TABLE deal_events ENABLE ROW LEVEL SECURITY;

    -- Create indexes
    CREATE INDEX idx_deal_events_deal_id ON deal_events(deal_id);
    CREATE INDEX idx_deal_events_start_time ON deal_events(start_time);

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
  END IF;
END $$;

-- Create function to create notification when a new meeting is scheduled
CREATE OR REPLACE FUNCTION create_meeting_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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
$$;

-- Create trigger for meeting notifications if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'create_meeting_notification_trigger') THEN
    CREATE TRIGGER create_meeting_notification_trigger
      AFTER INSERT ON deal_events
      FOR EACH ROW
      EXECUTE FUNCTION create_meeting_notification();
  END IF;
END $$;