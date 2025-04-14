/*
  # Add updated_at column to agent_properties

  1. Changes
    - Add updated_at column with default value
    - Add index for faster queries
    - Add trigger for automatic updates
  
  2. Security
    - Handle existing trigger gracefully
    - Maintain data integrity
*/

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_agent_properties_updated_at ON agent_properties;

-- Add updated_at column if it doesn't exist
ALTER TABLE agent_properties
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create index for updated_at column
CREATE INDEX IF NOT EXISTS idx_agent_properties_updated_at 
ON agent_properties(updated_at);

-- Create trigger to update updated_at
CREATE TRIGGER update_agent_properties_updated_at
  BEFORE UPDATE ON agent_properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();