/*
  # Fix Deal Notifications and Activity Logs RLS Policies

  1. Changes
    - Add RLS policies for deal_notifications table
    - Add RLS policies for deal_activity_logs table
    - Fix invalid UUID error in activity logging
  
  2. Security
    - Allow agents to create notifications for other agents
    - Allow agents to view their own notifications
    - Allow agents to create activity logs for their deals
*/

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view their own notifications" ON deal_notifications;
  DROP POLICY IF EXISTS "Users can update their own notifications" ON deal_notifications;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create policies for deal_notifications
CREATE POLICY "Anyone can create notifications"
  ON deal_notifications
  FOR INSERT
  TO public
  WITH CHECK (true);

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

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Agents can view activity logs for their deals" ON deal_activity_logs;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create policies for deal_activity_logs
CREATE POLICY "Anyone can create activity logs"
  ON deal_activity_logs
  FOR INSERT
  TO public
  WITH CHECK (true);

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

-- Add locked column to deals table if it doesn't exist
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS locked boolean DEFAULT false;

-- Create function to handle signature uploads with proper UUID handling
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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS handle_signature_upload_trigger ON deal_activity_logs;

-- Create trigger for signature uploads
CREATE TRIGGER handle_signature_upload_trigger
  AFTER INSERT ON deal_activity_logs
  FOR EACH ROW
  WHEN (NEW.type = 'signature_submitted')
  EXECUTE FUNCTION handle_signature_upload();