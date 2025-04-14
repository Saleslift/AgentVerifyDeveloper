/*
  # Create Leads Table

  1. New Tables
    - `leads` - Store contact form submissions
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text)
      - `whatsapp` (text)
      - `budget` (text)
      - `timeline` (text)
      - `status` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on leads table
    - Add policies for:
      - Public can insert new leads
      - Only authenticated users can view leads
      - Only authenticated users can update leads

  3. Notes
    - Budget stored as text to allow flexible ranges
    - Timeline options: immediate, 1-3months, 3-6months, 6months+
    - Status tracking for lead management
*/

-- Create leads table
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  whatsapp text NOT NULL,
  budget text NOT NULL,
  timeline text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public to insert leads
CREATE POLICY "Allow public to insert leads"
  ON leads
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create policy to allow authenticated users to view leads
CREATE POLICY "Allow authenticated users to view leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow authenticated users to update leads
CREATE POLICY "Allow authenticated users to update leads"
  ON leads
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_status ON leads(status);