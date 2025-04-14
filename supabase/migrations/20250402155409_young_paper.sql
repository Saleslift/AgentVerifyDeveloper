-- Add locked column to deals table
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS locked boolean DEFAULT false;

-- Update handle_signature_upload function to lock the deal when both agents sign
CREATE OR REPLACE FUNCTION handle_signature_upload()
RETURNS TRIGGER AS $$
DECLARE
  v_deal_id uuid;
  v_user_id uuid;
  v_role text;
  v_listing_agent_id uuid;
  v_buying_agent_id uuid;
  v_both_signed boolean;
BEGIN
  -- Extract data from the payload
  v_deal_id := NEW.deal_id;
  v_user_id := NEW.user_id;
  v_role := NEW.payload->>'role';
  
  -- Get deal information
  SELECT 
    listing_agent_id, 
    buying_agent_id,
    (listing_agent_signed AND buying_agent_signed) AS both_signed
  INTO 
    v_listing_agent_id, 
    v_buying_agent_id,
    v_both_signed
  FROM deals
  WHERE id = v_deal_id;
  
  -- Update the appropriate signature field in the deals table
  IF v_role = 'listing_agent' THEN
    UPDATE deals
    SET 
      listing_agent_signed = true,
      updated_at = now()
    WHERE id = v_deal_id;
  ELSIF v_role = 'buying_agent' THEN
    UPDATE deals
    SET 
      buying_agent_signed = true,
      updated_at = now()
    WHERE id = v_deal_id;
  END IF;
  
  -- Check if both agents have now signed
  SELECT 
    (listing_agent_signed AND buying_agent_signed) AS both_signed
  INTO 
    v_both_signed
  FROM deals
  WHERE id = v_deal_id;
  
  -- If both agents have signed, update status to payment and lock the deal
  IF v_both_signed THEN
    UPDATE deals
    SET 
      status = 'payment',
      signed_at = now(),
      payment_at = now(),
      updated_at = now(),
      locked = true  -- Lock the deal when both agents have signed
    WHERE id = v_deal_id;
    
    -- Log the deal locking in activity logs
    INSERT INTO deal_activity_logs (
      deal_id,
      user_id,
      type,
      payload,
      created_at
    ) VALUES (
      v_deal_id,
      v_user_id,
      'deal_locked',
      jsonb_build_object(
        'message', 'Deal is now locked. Both agents have signed.'
      ),
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;