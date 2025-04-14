/*
  # Fix profiles table RLS policies

  1. Changes
    - Drop existing policies to avoid conflicts
    - Create new policies that allow profile creation during signup
    - Add policy for public profile viewing
    - Add policy for users to update their own profile

  2. Security
    - Enable RLS on profiles table
    - Allow authenticated users to manage their own profile
    - Allow public read access to profiles
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to create their own profile
CREATE POLICY "Users can create their own profile"
ON profiles FOR INSERT
TO public
WITH CHECK (
  -- During signup, auth.uid() will match the id
  auth.uid() IS NULL OR
  auth.uid() = id
);

-- Create policy to allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create policy to allow public viewing of profiles
CREATE POLICY "Profiles are viewable by everyone"
ON profiles FOR SELECT
TO public
USING (true);