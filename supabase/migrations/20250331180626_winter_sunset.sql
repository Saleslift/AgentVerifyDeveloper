/*
  # Add created_at column to agent_properties

  1. Changes
    - Add created_at column with default value
    - Add index for faster queries
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add created_at column if it doesn't exist
ALTER TABLE agent_properties
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Create index for created_at column
CREATE INDEX IF NOT EXISTS idx_agent_properties_created_at 
ON agent_properties(created_at);