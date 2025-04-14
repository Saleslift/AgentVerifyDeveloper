-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create a very simple handle_new_user function that avoids any references to notifications
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a basic profile with minimal fields
  INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'agent'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Disable email confirmation requirement for all users
UPDATE auth.users
SET email_confirmed_at = CURRENT_TIMESTAMP
WHERE email_confirmed_at IS NULL;

-- Set default email confirmation to true for new users
ALTER TABLE auth.users 
ALTER COLUMN email_confirmed_at 
SET DEFAULT CURRENT_TIMESTAMP;

-- Create sample_notifications function if it exists and is causing issues
DROP FUNCTION IF EXISTS create_sample_notifications_for_new_user() CASCADE;

-- Create a dummy function that does nothing to replace any references
CREATE OR REPLACE FUNCTION create_sample_notifications_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- This function intentionally does nothing
  -- It replaces any references to notifications table
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check if notifications table exists and create it if needed
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'notifications'
  ) THEN
    -- Create a minimal notifications table to satisfy any references
    CREATE TABLE notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
      type text NOT NULL,
      title text NOT NULL,
      message text NOT NULL,
      link_url text,
      is_read boolean DEFAULT false,
      created_at timestamptz DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

    -- Create basic policies
    CREATE POLICY "Users can view their own notifications"
      ON notifications
      FOR SELECT
      TO authenticated
      USING (recipient_id = auth.uid());

    CREATE POLICY "Users can update their own notifications"
      ON notifications
      FOR UPDATE
      TO authenticated
      USING (recipient_id = auth.uid())
      WITH CHECK (recipient_id = auth.uid());
  END IF;
END $$;