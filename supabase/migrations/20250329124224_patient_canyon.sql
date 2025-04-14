/*
  # Create Messages Table

  1. New Tables
    - `messages` - Store contact form messages
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text)
      - `message` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policy for public inserts
    - Add policy for authenticated reads
*/

-- Create messages table
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public to insert messages
CREATE POLICY "Allow public to insert messages"
  ON messages
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create policy to allow authenticated users to view messages
CREATE POLICY "Allow authenticated users to view messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (true);

-- Create index for faster lookups
CREATE INDEX idx_messages_created_at ON messages(created_at);