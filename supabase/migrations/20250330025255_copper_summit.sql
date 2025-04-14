/*
  # Fix Job Applications Migration

  1. Changes
    - Add safety checks for existing policies
    - Create job_applications table if not exists
    - Add indexes for performance
    - Add RLS policies if they don't exist
  
  2. Security
    - Enable RLS
    - Add policies for agents and agencies
    - Secure application data
*/

-- Create job_applications table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'job_applications'
  ) THEN
    CREATE TABLE job_applications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id uuid REFERENCES job_postings(id) ON DELETE CASCADE NOT NULL,
      agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      cover_letter text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

    -- Create indexes
    CREATE INDEX idx_job_applications_job_id ON job_applications(job_id);
    CREATE INDEX idx_job_applications_agent_id ON job_applications(agent_id);
  END IF;
END $$;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Agents can view and manage their applications" ON job_applications;
  DROP POLICY IF EXISTS "Agencies can view applications for their jobs" ON job_applications;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Create policies
CREATE POLICY "Agents can view and manage their applications"
  ON job_applications
  FOR ALL
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agencies can view applications for their jobs"
  ON job_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM job_postings
      WHERE job_postings.id = job_applications.job_id
      AND job_postings.agency_id = auth.uid()
    )
  );

-- Create trigger for updated_at if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_job_applications_updated_at'
  ) THEN
    CREATE TRIGGER update_job_applications_updated_at
      BEFORE UPDATE ON job_applications
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;