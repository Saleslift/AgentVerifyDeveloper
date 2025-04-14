-- Check if deal_chats table already exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deal_chats') THEN
    -- Create deal_chats table
    CREATE TABLE deal_chats (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
      sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
      message text NOT NULL,
      read boolean DEFAULT false,
      created_at timestamptz DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE deal_chats ENABLE ROW LEVEL SECURITY;

    -- Create indexes
    CREATE INDEX idx_deal_chats_deal_id ON deal_chats(deal_id);
    CREATE INDEX idx_deal_chats_sender_id ON deal_chats(sender_id);
  END IF;
END $$;

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Agents can view chats for their deals" ON deal_chats;
  DROP POLICY IF EXISTS "Agents can send messages in their deals" ON deal_chats;
  DROP POLICY IF EXISTS "Agents can update read status of messages" ON deal_chats;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create policies
CREATE POLICY "Agents can view chats for their deals"
  ON deal_chats
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_chats.deal_id
      AND (
        deals.listing_agent_id = auth.uid() OR 
        deals.buying_agent_id = auth.uid()
      )
    )
  );

CREATE POLICY "Agents can send messages in their deals"
  ON deal_chats
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_chats.deal_id
      AND (
        deals.listing_agent_id = auth.uid() OR 
        deals.buying_agent_id = auth.uid()
      )
    )
  );

CREATE POLICY "Agents can update read status of messages"
  ON deal_chats
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_chats.deal_id
      AND (
        deals.listing_agent_id = auth.uid() OR 
        deals.buying_agent_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_chats.deal_id
      AND (
        deals.listing_agent_id = auth.uid() OR 
        deals.buying_agent_id = auth.uid()
      )
    )
  );

-- Create function to create notification when a new chat message is sent
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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_chat_notification_trigger ON deal_chats;

-- Create trigger for chat notifications
CREATE TRIGGER create_chat_notification_trigger
  AFTER INSERT ON deal_chats
  FOR EACH ROW
  EXECUTE FUNCTION create_chat_notification();