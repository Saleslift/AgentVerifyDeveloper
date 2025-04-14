/*
  # Add insert policy for profiles table

  1. Changes
    - Add RLS policy to allow users to create their own profile

  2. Security
    - Users can only create a profile with their own user ID
    - Policy uses auth.uid() to verify user identity
*/

-- Add insert policy for profiles table
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);