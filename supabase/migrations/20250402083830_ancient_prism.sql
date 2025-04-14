-- Add signing fields to deals table
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS listing_agent_signed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS buying_agent_signed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS signed_at timestamptz,
ADD COLUMN IF NOT EXISTS closed_at timestamptz,
ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Create function to handle MOU signing
CREATE OR REPLACE FUNCTION handle_mou_signing()
RETURNS TRIGGER AS $$
BEGIN
  -- If both agents have signed, update status to payment and set signed_at
  IF NEW.listing_agent_signed = true AND NEW.buying_agent_signed = true AND OLD.status = 'contract' THEN
    NEW.status := 'payment';
    NEW.signed_at := COALESCE(NEW.signed_at, NOW());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for MOU signing
DROP TRIGGER IF EXISTS handle_mou_signing_trigger ON deals;
CREATE TRIGGER handle_mou_signing_trigger
  BEFORE UPDATE ON deals
  FOR EACH ROW
  WHEN (
    (NEW.listing_agent_signed IS DISTINCT FROM OLD.listing_agent_signed) OR
    (NEW.buying_agent_signed IS DISTINCT FROM OLD.buying_agent_signed)
  )
  EXECUTE FUNCTION handle_mou_signing();

-- Create function to create notification when MOU is signed
CREATE OR REPLACE FUNCTION create_mou_signed_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_property_title TEXT;
  v_listing_agent_id UUID;
  v_buying_agent_id UUID;
BEGIN
  -- Only proceed if status changed to 'payment' (MOU signed)
  IF NEW.status = 'payment' AND OLD.status = 'contract' THEN
    -- Get property title
    SELECT title INTO v_property_title
    FROM properties
    WHERE id = NEW.property_id;
    
    -- Get agent IDs
    v_listing_agent_id := NEW.listing_agent_id;
    v_buying_agent_id := NEW.buying_agent_id;
    
    -- Create notification for listing agent
    INSERT INTO deal_notifications (
      deal_id,
      recipient_id,
      type,
      message,
      read,
      created_at
    ) VALUES (
      NEW.id,
      v_listing_agent_id,
      'mou-signed',
      'MOU has been signed for ' || v_property_title,
      false,
      NOW()
    );
    
    -- Create notification for buying agent
    INSERT INTO deal_notifications (
      deal_id,
      recipient_id,
      type,
      message,
      read,
      created_at
    ) VALUES (
      NEW.id,
      v_buying_agent_id,
      'mou-signed',
      'MOU has been signed for ' || v_property_title,
      false,
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for MOU signed notification
DROP TRIGGER IF EXISTS create_mou_signed_notification_trigger ON deals;
CREATE TRIGGER create_mou_signed_notification_trigger
  AFTER UPDATE OF status ON deals
  FOR EACH ROW
  EXECUTE FUNCTION create_mou_signed_notification();