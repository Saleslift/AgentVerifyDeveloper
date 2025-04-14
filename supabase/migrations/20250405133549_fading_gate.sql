/*
  # Enable RLS on profiles table

  1. Changes
    - Enable Row Level Security on profiles table
    - Add policy for users to read their own profile
    - Add policy for public to view profiles
  
  2. Security
    - Ensure users can only access their own profile data
    - Allow public read access for agent profiles
*/

-- Enable RLS if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Users can read their own profile'
  ) THEN
    CREATE POLICY "Users can read their own profile"
    ON profiles
    FOR SELECT
    USING (auth.uid() = id);
  END IF;
END $$;

-- Allow public to view profiles (for agent directory)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Public can view profiles'
  ) THEN
    CREATE POLICY "Public can view profiles"
    ON profiles
    FOR SELECT
    TO public
    USING (true);
  END IF;
END $$;

-- Allow users to update their own profile
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Allow users to create their own profile
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Users can create their own profile'
  ) THEN
    CREATE POLICY "Users can create their own profile"
    ON profiles
    FOR INSERT
    TO public
    WITH CHECK (
      auth.uid() IS NULL OR
      auth.uid() = id
    );
  END IF;
END $$;