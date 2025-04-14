/*
  # Create CRM Leads Table

  1. New Tables
    - `crm_leads` - Store customer relationship management leads
      - `id` (uuid, primary key)
      - `created_at` (timestamptz)
      - `created_by` (uuid, references auth.users)
      - `role` (text)
      - `name` (text)
      - `phone` (text)
      - `email` (text)
      - `source` (text)
      - `status` (text)
      - `assigned_to` (uuid, references auth.users)
      - `related_property_id` (uuid)
      - `note` (text)
      - `reminder_date` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for data access
    - Ensure data integrity
*/

-- Create crm_leads table
CREATE TABLE crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('agent', 'agency', 'developer')),
  name text NOT NULL,
  phone text,
  email text,
  source text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'in-talk', 'visit', 'offer', 'closed', 'lost')),
  assigned_to uuid REFERENCES auth.users(id),
  related_property_id uuid,
  note text,
  reminder_date timestamptz
);

-- Enable RLS
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_crm_leads_created_by ON crm_leads(created_by);
CREATE INDEX idx_crm_leads_assigned_to ON crm_leads(assigned_to);
CREATE INDEX idx_crm_leads_status ON crm_leads(status);
CREATE INDEX idx_crm_leads_reminder_date ON crm_leads(reminder_date);

-- Create policy for access control
CREATE POLICY "Allow users to access their own leads"
  ON crm_leads
  FOR ALL
  TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid())
  WITH CHECK (created_by = auth.uid() OR assigned_to = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_crm_leads_updated_at
  BEFORE UPDATE ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();