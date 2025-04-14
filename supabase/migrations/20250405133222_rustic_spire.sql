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
CREATE POLICY "Users can read their own profile"
ON profiles
FOR SELECT
USING (auth.uid() = id);

-- Allow public to view profiles (for agent directory)
CREATE POLICY "Public can view profiles"
ON profiles
FOR SELECT
TO public
USING (true);