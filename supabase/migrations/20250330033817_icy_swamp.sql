-- Drop existing job_applications table and its dependencies
DROP TABLE IF EXISTS job_applications CASCADE;

-- Create job_applications table
CREATE TABLE job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES job_postings(id) ON DELETE CASCADE NOT NULL,
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewing', 'accepted', 'rejected')),
  cover_letter text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(job_id, agent_id)
);

-- Enable RLS
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX idx_job_applications_agent_id ON job_applications(agent_id);
CREATE INDEX idx_job_applications_status ON job_applications(status);

-- Create policies
CREATE POLICY "Agents can view and manage their applications"
  ON job_applications
  FOR ALL
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agencies can view and update applications for their jobs"
  ON job_applications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM job_postings
      WHERE job_postings.id = job_applications.job_id
      AND job_postings.agency_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM job_postings
      WHERE job_postings.id = job_applications.job_id
      AND job_postings.agency_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON job_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle application status changes
CREATE OR REPLACE FUNCTION handle_application_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update updated_at timestamp
  NEW.updated_at := now();
  
  -- Validate status
  IF NEW.status NOT IN ('pending', 'reviewing', 'accepted', 'rejected') THEN
    RAISE EXCEPTION 'Invalid application status';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status changes
CREATE TRIGGER on_application_status_change
  BEFORE UPDATE OF status ON job_applications
  FOR EACH ROW
  EXECUTE FUNCTION handle_application_status_change();

-- Grant necessary permissions
GRANT ALL ON job_applications TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;