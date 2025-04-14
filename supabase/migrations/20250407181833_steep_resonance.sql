/*
  # Add Developer Project Management Features

  1. New Columns
    - Add status column to properties table
    - Add media_images, media_videos, brochure, floor_plan, and import_token columns to properties table
    - Add api_token column to profiles table for developers

  2. New Tables
    - Create import_tokens table to track imports
    
  3. Security
    - Add policies for token management
    - Ensure proper access control
*/

-- Add status column to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'published'));

-- Add media columns to properties table (as JSONB)
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS media_images JSONB,
ADD COLUMN IF NOT EXISTS media_videos JSONB,
ADD COLUMN IF NOT EXISTS brochure JSONB,
ADD COLUMN IF NOT EXISTS floor_plan JSONB,
ADD COLUMN IF NOT EXISTS import_token UUID;

-- Add api_token column to profiles table (for developers)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS api_token UUID DEFAULT gen_random_uuid();

-- Create import_tokens table
CREATE TABLE IF NOT EXISTS import_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  project_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours'),
  used_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE import_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for import_tokens table
CREATE POLICY "Developers can manage their import tokens"
  ON import_tokens
  FOR ALL
  TO authenticated
  USING (developer_id = auth.uid())
  WITH CHECK (developer_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_import_token ON properties(import_token);
CREATE INDEX IF NOT EXISTS idx_import_tokens_developer_id ON import_tokens(developer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_api_token ON profiles(api_token);

-- Create function to generate a new API token
CREATE OR REPLACE FUNCTION generate_developer_api_token(p_developer_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_token UUID;
BEGIN
  -- Generate a new UUID token
  SELECT gen_random_uuid() INTO v_new_token;
  
  -- Update the developer's profile with the new token
  UPDATE profiles
  SET api_token = v_new_token
  WHERE id = p_developer_id
  AND role = 'developer';
  
  RETURN v_new_token;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_developer_api_token(UUID) TO authenticated;

-- Create function to generate an import token
CREATE OR REPLACE FUNCTION generate_import_token(p_developer_id UUID, p_project_count INTEGER)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token_id UUID;
BEGIN
  -- Insert a new import token
  INSERT INTO import_tokens(developer_id, project_count)
  VALUES (p_developer_id, p_project_count)
  RETURNING id INTO v_token_id;
  
  RETURN v_token_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_import_token(UUID, INTEGER) TO authenticated;

-- Create function to get XLS template headers
CREATE OR REPLACE FUNCTION get_project_import_template()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN jsonb_build_object(
    'headers', ARRAY[
      'project_name',
      'location',
      'price_start',
      'unit_type',
      'size_range',
      'status',
      'description',
      'payment_plan',
      'handover_date',
      'amenities'
    ],
    'example_row', jsonb_build_object(
      'project_name', 'Palm Residences',
      'location', 'Dubai Marina, Dubai, UAE',
      'price_start', '1500000',
      'unit_type', '1 Bedroom, 2 Bedroom, 3 Bedroom',
      'size_range', '650-1800',
      'status', 'upcoming',
      'description', 'Luxury waterfront residences with panoramic views',
      'payment_plan', '40/60',
      'handover_date', '2025-12-31',
      'amenities', 'Pool, Gym, Parking, Security'
    )
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_project_import_template() TO authenticated;