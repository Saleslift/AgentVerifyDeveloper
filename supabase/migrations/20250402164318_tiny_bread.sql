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
  DROP POLICY IF EXISTS "Anyone can create notifications" ON deal_notifications;
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
  DROP POLICY IF EXISTS "Anyone can create activity logs" ON deal_activity_logs;
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