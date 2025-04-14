-- Drop existing trigger and function to avoid conflicts
DROP TRIGGER IF EXISTS create_chat_notification_trigger ON deal_chats;
DROP FUNCTION IF EXISTS create_chat_notification();

-- Create improved function to create notification when a new chat message is sent
CREATE OR REPLACE FUNCTION create_chat_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_deal RECORD;
  v_sender_name TEXT;
  v_property_title TEXT;
  v_recipient_id UUID;
  v_notification_message TEXT;
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
  
  -- Set default values if needed
  v_sender_name := COALESCE(v_sender_name, 'Someone');
  v_property_title := COALESCE(v_property_title, 'a property');
  
  -- Create notification message with fallbacks to ensure it's never null
  v_notification_message := v_sender_name || ' sent a message about ' || v_property_title;
  
  -- Determine recipient (the other agent)
  IF NEW.sender_id = v_deal.listing_agent_id THEN
    v_recipient_id := v_deal.buying_agent_id;
  ELSE
    v_recipient_id := v_deal.listing_agent_id;
  END IF;
  
  -- Only create notification if we have a valid recipient
  IF v_recipient_id IS NOT NULL THEN
    -- Create notification with guaranteed non-null message
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
      v_notification_message,
      false,
      NEW.created_at
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't prevent chat message from being created
    RAISE WARNING 'Error creating chat notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for chat notifications with proper error handling
CREATE TRIGGER create_chat_notification_trigger
  AFTER INSERT ON deal_chats
  FOR EACH ROW
  EXECUTE FUNCTION create_chat_notification();

-- Create RPC function for logging chat activity
CREATE OR REPLACE FUNCTION log_chat_activity(
  p_deal_id UUID,
  p_sender_id UUID,
  p_message TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert activity log
  INSERT INTO deal_activities (
    deal_id,
    agent_id,
    timestamp,
    action_type,
    details
  ) VALUES (
    p_deal_id,
    p_sender_id,
    now(),
    'message',
    'Sent a message'
  );
  
  -- No need to create notification here as the trigger will handle it
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error logging chat activity: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION log_chat_activity(UUID, UUID, TEXT) TO authenticated;