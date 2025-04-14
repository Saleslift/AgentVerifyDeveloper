/*
  # Developer Project Statistics Schema

  1. New Tables
    - `developer_project_stats` - Store statistics for developer projects
    - Includes agency metrics, project metrics, page views, etc.
  
  2. Functions
    - Functions to populate and refresh statistics
    - Tracking for project views
    - Automatic updates via triggers
*/

-- Create developer_project_stats table
CREATE TABLE IF NOT EXISTS developer_project_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Agency metrics
  num_partner_agencies INT NOT NULL DEFAULT 0,
  num_agents_in_agencies INT NOT NULL DEFAULT 0,
  num_agents_displaying_project INT NOT NULL DEFAULT 0,
  
  -- Project metrics
  num_projects_uploaded_by_developer INT NOT NULL DEFAULT 0,
  num_active_projects INT NOT NULL DEFAULT 0,
  num_total_properties_for_sale INT NOT NULL DEFAULT 0,
  
  -- Page view metrics
  total_project_page_views_by_agents INT NOT NULL DEFAULT 0,
  total_project_page_views_by_buyers INT NOT NULL DEFAULT 0,
  
  -- Metadata
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE developer_project_stats ENABLE ROW LEVEL SECURITY;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_developer_project_stats_developer_id ON developer_project_stats(developer_id);
CREATE INDEX IF NOT EXISTS idx_developer_project_stats_project_id ON developer_project_stats(project_id);
CREATE INDEX IF NOT EXISTS idx_developer_project_stats_last_updated ON developer_project_stats(last_updated_at);

-- Create unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_developer_project_stats_unique 
ON developer_project_stats(developer_id, COALESCE(project_id, '00000000-0000-0000-0000-000000000000'));

-- Add RLS policy for developers
CREATE POLICY "Developers can view their own project stats"
  ON developer_project_stats
  FOR SELECT
  TO authenticated
  USING (developer_id = auth.uid());

-- Create function to populate stats for a developer
CREATE OR REPLACE FUNCTION populate_developer_project_stats(p_developer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project RECORD;
  v_agency_count INT;
  v_agent_count INT;
  v_agent_display_count INT;
  v_project_count INT;
  v_active_project_count INT;
  v_property_count INT;
  v_agent_views INT;
  v_buyer_views INT;
BEGIN
  -- Get count of developer projects
  SELECT COUNT(*) INTO v_project_count
  FROM properties
  WHERE creator_id = p_developer_id AND creator_type = 'developer';
  
  -- Get count of active developer projects
  SELECT COUNT(*) INTO v_active_project_count
  FROM properties
  WHERE creator_id = p_developer_id 
    AND creator_type = 'developer'
    AND (status = 'published' OR status = 'validated');
  
  -- Get count of properties (unit types) across all projects
  SELECT COUNT(*) INTO v_property_count
  FROM unit_types ut
  JOIN properties p ON ut.project_id = p.id
  WHERE p.creator_id = p_developer_id 
    AND p.creator_type = 'developer'
    AND ut.status = 'available';
  
  -- Get partner agencies count
  SELECT COUNT(*) INTO v_agency_count
  FROM developer_agency_contracts
  WHERE developer_id = p_developer_id
    AND status = 'active';
  
  -- Get all agents from partner agencies
  SELECT COUNT(*) INTO v_agent_count
  FROM agency_agents aa
  JOIN developer_agency_contracts dac ON aa.agency_id = dac.agency_id
  WHERE dac.developer_id = p_developer_id
    AND dac.status = 'active'
    AND aa.status = 'active';
  
  -- For each project, calculate stats and insert/update row
  FOR v_project IN (
    SELECT id FROM properties
    WHERE creator_id = p_developer_id AND creator_type = 'developer'
  ) LOOP
    -- Count agents displaying this specific project
    SELECT COUNT(DISTINCT agent_id) INTO v_agent_display_count
    FROM agent_projects
    WHERE project_id = v_project.id;
    
    -- Count page views by agents
    SELECT COUNT(*) INTO v_agent_views
    FROM page_views
    WHERE property_id = v_project.id
      AND viewer_id IS NOT NULL;
    
    -- Count page views by public/buyers
    SELECT COUNT(*) INTO v_buyer_views
    FROM page_views
    WHERE property_id = v_project.id
      AND viewer_id IS NULL;
    
    -- Insert or update stats for this specific project
    INSERT INTO developer_project_stats (
      developer_id,
      project_id,
      num_partner_agencies,
      num_agents_in_agencies,
      num_agents_displaying_project,
      num_projects_uploaded_by_developer,
      num_active_projects,
      num_total_properties_for_sale,
      total_project_page_views_by_agents,
      total_project_page_views_by_buyers,
      last_updated_at
    ) VALUES (
      p_developer_id,
      v_project.id,
      v_agency_count,
      v_agent_count,
      v_agent_display_count,
      v_project_count,
      v_active_project_count,
      v_property_count,
      v_agent_views,
      v_buyer_views,
      now()
    )
    ON CONFLICT (developer_id, COALESCE(project_id, '00000000-0000-0000-0000-000000000000'))
    DO UPDATE SET
      num_partner_agencies = EXCLUDED.num_partner_agencies,
      num_agents_in_agencies = EXCLUDED.num_agents_in_agencies,
      num_agents_displaying_project = EXCLUDED.num_agents_displaying_project,
      num_projects_uploaded_by_developer = EXCLUDED.num_projects_uploaded_by_developer,
      num_active_projects = EXCLUDED.num_active_projects,
      num_total_properties_for_sale = EXCLUDED.num_total_properties_for_sale,
      total_project_page_views_by_agents = EXCLUDED.total_project_page_views_by_agents,
      total_project_page_views_by_buyers = EXCLUDED.total_project_page_views_by_buyers,
      last_updated_at = now();
  END LOOP;
  
  -- Insert or update summary stats (without project_id)
  INSERT INTO developer_project_stats (
    developer_id,
    project_id,
    num_partner_agencies,
    num_agents_in_agencies,
    num_agents_displaying_project,
    num_projects_uploaded_by_developer,
    num_active_projects,
    num_total_properties_for_sale,
    total_project_page_views_by_agents,
    total_project_page_views_by_buyers,
    last_updated_at
  ) VALUES (
    p_developer_id,
    NULL,
    v_agency_count,
    v_agent_count,
    (SELECT COUNT(DISTINCT agent_id) FROM agent_projects WHERE project_id IN (
      SELECT id FROM properties WHERE creator_id = p_developer_id AND creator_type = 'developer'
    )),
    v_project_count,
    v_active_project_count,
    v_property_count,
    (SELECT COALESCE(SUM(total_project_page_views_by_agents), 0) FROM developer_project_stats
     WHERE developer_id = p_developer_id AND project_id IS NOT NULL),
    (SELECT COALESCE(SUM(total_project_page_views_by_buyers), 0) FROM developer_project_stats
     WHERE developer_id = p_developer_id AND project_id IS NOT NULL),
    now()
  )
  ON CONFLICT (developer_id, COALESCE(project_id, '00000000-0000-0000-0000-000000000000'))
  DO UPDATE SET
    num_partner_agencies = EXCLUDED.num_partner_agencies,
    num_agents_in_agencies = EXCLUDED.num_agents_in_agencies,
    num_agents_displaying_project = EXCLUDED.num_agents_displaying_project,
    num_projects_uploaded_by_developer = EXCLUDED.num_projects_uploaded_by_developer,
    num_active_projects = EXCLUDED.num_active_projects,
    num_total_properties_for_sale = EXCLUDED.num_total_properties_for_sale,
    total_project_page_views_by_agents = EXCLUDED.total_project_page_views_by_agents,
    total_project_page_views_by_buyers = EXCLUDED.total_project_page_views_by_buyers,
    last_updated_at = now();
END;
$$;

-- Create function to refresh stats for a developer
CREATE OR REPLACE FUNCTION refresh_developer_stats(p_developer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM populate_developer_project_stats(p_developer_id);
END;
$$;

-- Create function to track page views and update stats
CREATE OR REPLACE FUNCTION track_project_view(
  p_project_id UUID,
  p_viewer_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_developer_id UUID;
BEGIN
  -- Find the developer who owns this project
  SELECT creator_id INTO v_developer_id
  FROM properties
  WHERE id = p_project_id AND creator_type = 'developer';
  
  IF v_developer_id IS NOT NULL THEN
    -- Insert page view record
    INSERT INTO page_views (
      property_id,
      viewer_id,
      ip_address,
      user_agent,
      viewed_at
    ) VALUES (
      p_project_id,
      p_viewer_id,
      current_setting('request.headers')::json->>'x-real-ip',
      current_setting('request.headers')::json->>'user-agent',
      now()
    );
    
    -- Update stats for this project
    UPDATE developer_project_stats SET
      total_project_page_views_by_agents = CASE
        WHEN p_viewer_id IS NOT NULL THEN total_project_page_views_by_agents + 1
        ELSE total_project_page_views_by_agents
      END,
      total_project_page_views_by_buyers = CASE
        WHEN p_viewer_id IS NULL THEN total_project_page_views_by_buyers + 1
        ELSE total_project_page_views_by_buyers
      END,
      last_updated_at = now()
    WHERE 
      developer_id = v_developer_id AND 
      (project_id = p_project_id OR project_id IS NULL);
  END IF;
END;
$$;

-- Create triggers to automatically refresh stats on relevant changes
CREATE OR REPLACE FUNCTION trigger_refresh_developer_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_developer_id UUID;
BEGIN
  -- Find the developer ID based on the table and action
  IF TG_TABLE_NAME = 'properties' THEN
    v_developer_id := NEW.creator_id;
  ELSIF TG_TABLE_NAME = 'unit_types' THEN
    SELECT creator_id INTO v_developer_id
    FROM properties
    WHERE id = NEW.project_id AND creator_type = 'developer';
  ELSIF TG_TABLE_NAME = 'agent_projects' THEN
    SELECT creator_id INTO v_developer_id
    FROM properties
    WHERE id = NEW.project_id AND creator_type = 'developer';
  ELSIF TG_TABLE_NAME = 'developer_agency_contracts' THEN
    v_developer_id := NEW.developer_id;
  END IF;
  
  -- Schedule stats refresh if we found a developer
  IF v_developer_id IS NOT NULL THEN
    PERFORM pg_notify('refresh_developer_stats', v_developer_id::text);
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create triggers on relevant tables - check if they exist first and drop them
DO $$ 
BEGIN
  -- Check if trigger exists on properties
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'refresh_stats_on_property_change' 
    AND tgrelid = 'properties'::regclass
  ) THEN
    DROP TRIGGER refresh_stats_on_property_change ON properties;
  END IF;
  
  -- Check if trigger exists on unit_types
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'refresh_stats_on_unit_type_change' 
    AND tgrelid = 'unit_types'::regclass
  ) THEN
    DROP TRIGGER refresh_stats_on_unit_type_change ON unit_types;
  END IF;
  
  -- Check if trigger exists on agent_projects
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'refresh_stats_on_agent_project_change' 
    AND tgrelid = 'agent_projects'::regclass
  ) THEN
    DROP TRIGGER refresh_stats_on_agent_project_change ON agent_projects;
  END IF;
  
  -- Check if trigger exists on developer_agency_contracts
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'refresh_stats_on_contract_change' 
    AND tgrelid = 'developer_agency_contracts'::regclass
  ) THEN
    DROP TRIGGER refresh_stats_on_contract_change ON developer_agency_contracts;
  END IF;
END $$;

-- Now create the triggers
CREATE TRIGGER refresh_stats_on_property_change
  AFTER INSERT OR UPDATE OR DELETE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_developer_stats();

CREATE TRIGGER refresh_stats_on_unit_type_change
  AFTER INSERT OR UPDATE OR DELETE ON unit_types
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_developer_stats();

CREATE TRIGGER refresh_stats_on_agent_project_change
  AFTER INSERT OR UPDATE OR DELETE ON agent_projects
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_developer_stats();

CREATE TRIGGER refresh_stats_on_contract_change
  AFTER INSERT OR UPDATE OR DELETE ON developer_agency_contracts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_developer_stats();

-- Create function to get statistics for a developer
CREATE OR REPLACE FUNCTION get_developer_stats(p_developer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats RECORD;
BEGIN
  -- First ensure stats are up-to-date
  PERFORM refresh_developer_stats(p_developer_id);
  
  -- Get the stats
  SELECT * INTO v_stats
  FROM developer_project_stats
  WHERE developer_id = p_developer_id AND project_id IS NULL;
  
  IF v_stats IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No statistics found for this developer'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'num_partner_agencies', v_stats.num_partner_agencies,
      'num_agents_in_agencies', v_stats.num_agents_in_agencies,
      'num_agents_displaying_project', v_stats.num_agents_displaying_project,
      'num_projects_uploaded_by_developer', v_stats.num_projects_uploaded_by_developer,
      'num_active_projects', v_stats.num_active_projects,
      'num_total_properties_for_sale', v_stats.num_total_properties_for_sale,
      'total_project_page_views_by_agents', v_stats.total_project_page_views_by_agents,
      'total_project_page_views_by_buyers', v_stats.total_project_page_views_by_buyers,
      'last_updated_at', v_stats.last_updated_at
    )
  );
END;
$$;

-- Grant execute permissions for functions
GRANT EXECUTE ON FUNCTION populate_developer_project_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_developer_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_developer_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION track_project_view(UUID, UUID) TO authenticated;