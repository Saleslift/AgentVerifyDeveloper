/*
  # Add CRM Activities Table

  1. New Tables
    - `crm_activities` - Store activity logs and comments for leads
      - `id` (uuid, primary key)
      - `lead_id` (uuid, references crm_leads)
      - `agent_id` (uuid, references auth.users)
      - `type` (text)
      - `comment` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for data access
    - Ensure data integrity
*/

-- Create crm_activities table
CREATE TABLE crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE NOT NULL,
  agent_id uuid REFERENCES auth.users(id) NOT NULL,
  type text NOT NULL,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_crm_activities_lead_id ON crm_activities(lead_id);
CREATE INDEX idx_crm_activities_agent_id ON crm_activities(agent_id);
CREATE INDEX idx_crm_activities_created_at ON crm_activities(created_at);
CREATE INDEX idx_crm_activities_type ON crm_activities(type);

-- Create policy for access control
CREATE POLICY "Allow users to access their own activities"
  ON crm_activities
  FOR ALL
  TO authenticated
  USING (
    agent_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = crm_activities.lead_id
      AND (crm_leads.created_by = auth.uid() OR crm_leads.assigned_to = auth.uid())
    )
  )
  WITH CHECK (
    agent_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = crm_activities.lead_id
      AND (crm_leads.created_by = auth.uid() OR crm_leads.assigned_to = auth.uid())
    )
  );