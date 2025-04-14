/*
  # Agency Dashboard Schema

  1. New Tables
    - `job_postings` - Job listings posted by agencies
    - `job_applications` - Applications submitted by agents
    - `agency_properties` - Properties managed by agencies
    - `agency_agents` - Agents affiliated with agencies

  2. Security
    - Enable RLS on all tables
    - Add policies for agencies and agents
    - Secure access to sensitive data

  3. Changes
    - Add agency_id to profiles table
    - Add agency role to auth.users
*/

-- Add agency_id to profiles
ALTER TABLE profiles
ADD COLUMN agency_id uuid REFERENCES profiles(id);

-- Create job_postings table
CREATE TABLE job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES profiles(id) NOT NULL,
  title text NOT NULL,
  experience_required text NOT NULL,
  languages text[] NOT NULL,
  location text NOT NULL,
  salary_min numeric,
  salary_max numeric,
  description text NOT NULL,
  qualifications text[] NOT NULL,
  deadline timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create job_applications table
CREATE TABLE job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES job_postings(id) ON DELETE CASCADE NOT NULL,
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  cover_letter text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create agency_properties table
CREATE TABLE agency_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agency_id, property_id)
);

-- Create agency_agents table
CREATE TABLE agency_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agency_id, agent_id)
);

-- Enable RLS
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_agents ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_job_postings_agency_id ON job_postings(agency_id);
CREATE INDEX idx_job_postings_status ON job_postings(status);
CREATE INDEX idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX idx_job_applications_agent_id ON job_applications(agent_id);
CREATE INDEX idx_agency_properties_agency_id ON agency_properties(agency_id);
CREATE INDEX idx_agency_properties_property_id ON agency_properties(property_id);
CREATE INDEX idx_agency_agents_agency_id ON agency_agents(agency_id);
CREATE INDEX idx_agency_agents_agent_id ON agency_agents(agent_id);

-- Create policies for job_postings
CREATE POLICY "Agencies can manage their job postings"
  ON job_postings
  TO authenticated
  USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

CREATE POLICY "Job postings are viewable by everyone"
  ON job_postings
  FOR SELECT
  TO public
  USING (status = 'active');

-- Create policies for job_applications
CREATE POLICY "Agents can view and manage their applications"
  ON job_applications
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agencies can view applications for their jobs"
  ON job_applications
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM job_postings
    WHERE job_postings.id = job_applications.job_id
    AND job_postings.agency_id = auth.uid()
  ));

-- Create policies for agency_properties
CREATE POLICY "Agencies can manage their properties"
  ON agency_properties
  TO authenticated
  USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

CREATE POLICY "Agents can view agency properties"
  ON agency_properties
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM agency_agents
    WHERE agency_agents.agency_id = agency_properties.agency_id
    AND agency_agents.agent_id = auth.uid()
    AND agency_agents.status = 'active'
  ));

-- Create policies for agency_agents
CREATE POLICY "Agencies can manage their agents"
  ON agency_agents
  TO authenticated
  USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

CREATE POLICY "Agents can view their agency affiliations"
  ON agency_agents
  FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid());

-- Create triggers for updated_at
CREATE TRIGGER update_job_postings_updated_at
  BEFORE UPDATE ON job_postings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON job_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agency_properties_updated_at
  BEFORE UPDATE ON agency_properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agency_agents_updated_at
  BEFORE UPDATE ON agency_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();