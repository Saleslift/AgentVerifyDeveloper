/*
  # Add Homepage Content Management

  1. New Tables
    - `homepage_content` - Store homepage section content
    - `homepage_assets` - Track homepage media assets
    - `super_admins` - Store super admin access

  2. Security
    - Enable RLS
    - Add policies for super admin access
    - Secure content management
*/

-- Create super_admins table
CREATE TABLE super_admins (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create homepage_content table
CREATE TABLE homepage_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id text NOT NULL UNIQUE,
  title text,
  subtitle text,
  description text,
  image_url text,
  video_url text,
  link_url text,
  link_text text,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES super_admins(id),
  updated_by uuid REFERENCES super_admins(id)
);

-- Create homepage_assets table
CREATE TABLE homepage_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES super_admins(id)
);

-- Enable RLS
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_assets ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_homepage_content_section ON homepage_content(section_id);
CREATE INDEX idx_homepage_content_visibility ON homepage_content(is_visible);
CREATE INDEX idx_homepage_assets_type ON homepage_assets(file_type);

-- Create policies

-- Super admins table policies
CREATE POLICY "Super admins can manage super admin list"
  ON super_admins
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Homepage content policies
CREATE POLICY "Anyone can view homepage content"
  ON homepage_content
  FOR SELECT
  TO public
  USING (is_visible = true);

CREATE POLICY "Super admins can manage homepage content"
  ON homepage_content
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );

-- Homepage assets policies
CREATE POLICY "Anyone can view homepage assets"
  ON homepage_assets
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Super admins can manage homepage assets"
  ON homepage_assets
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_homepage_content_updated_at
  BEFORE UPDATE ON homepage_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default super admin
INSERT INTO super_admins (id)
SELECT id FROM auth.users WHERE email = 'support@saleslift.ae'
ON CONFLICT DO NOTHING;

-- Insert default homepage sections
INSERT INTO homepage_content (section_id, title, description, sort_order)
VALUES
  ('hero', 'Real estate, real agents', 'Connect with verified UAE real estate professionals', 1),
  ('features', 'Why Choose Us', 'Discover the benefits of working with verified agents', 2),
  ('testimonials', 'What Our Users Say', 'Hear from satisfied clients and agents', 3),
  ('cta', 'Ready to Get Started?', 'Join the network of verified real estate professionals today', 4);