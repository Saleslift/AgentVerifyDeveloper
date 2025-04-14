/*
  # Create CRM Tasks Table

  1. New Tables
    - `crm_tasks` - Store user tasks and reminders
      - `id` (uuid, primary key)
      - `created_at` (timestamptz)
      - `user_id` (uuid, references auth.users)
      - `title` (text)
      - `due_date` (timestamptz)
      - `linked_lead_id` (uuid, references crm_leads)
      - `note` (text)
      - `is_done` (boolean)

  2. Security
    - Enable RLS
    - Add policies for user access
    - Ensure data integrity
*/

-- Create crm_tasks table
CREATE TABLE crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  due_date timestamptz NOT NULL,
  linked_lead_id uuid REFERENCES crm_leads(id),
  note text,
  is_done boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_crm_tasks_user_id ON crm_tasks(user_id);
CREATE INDEX idx_crm_tasks_due_date ON crm_tasks(due_date);
CREATE INDEX idx_crm_tasks_linked_lead_id ON crm_tasks(linked_lead_id);
CREATE INDEX idx_crm_tasks_is_done ON crm_tasks(is_done);

-- Create policy for access control
CREATE POLICY "Users can manage their own tasks"
  ON crm_tasks
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_crm_tasks_updated_at
  BEFORE UPDATE ON crm_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();