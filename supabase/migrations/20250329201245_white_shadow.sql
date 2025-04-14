/*
  # Add Statistics Tables and Views

  1. New Tables
    - `page_views` - Track profile and property views
    - `property_shares` - Track property sharing between agents
    - `agent_statistics` - Materialized view for cached statistics
  
  2. Security
    - Enable RLS on all tables
    - Add policies for data access
    - Ensure data integrity
*/

-- Create page_views table
CREATE TABLE page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ip_address text,
  user_agent text,
  viewed_at timestamptz DEFAULT now(),
  CHECK (
    (profile_id IS NOT NULL AND property_id IS NULL) OR
    (profile_id IS NULL AND property_id IS NOT NULL)
  )
);

-- Create property_shares table
CREATE TABLE property_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  shared_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  shared_with uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'active',
  shared_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create materialized view for agent statistics
CREATE MATERIALIZED VIEW agent_statistics AS
WITH property_counts AS (
  SELECT 
    agent_id,
    COUNT(*) as total_properties,
    COUNT(*) FILTER (WHERE shared = true) as shared_properties,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_properties_30d
  FROM properties
  GROUP BY agent_id
),
view_counts AS (
  SELECT
    profile_id as agent_id,
    COUNT(*) as total_views,
    COUNT(DISTINCT DATE(viewed_at)) as unique_days,
    COUNT(*) FILTER (WHERE viewed_at >= NOW() - INTERVAL '30 days') as views_30d
  FROM page_views
  WHERE profile_id IS NOT NULL
  GROUP BY profile_id
),
deal_counts AS (
  SELECT
    agent_id,
    COUNT(*) as total_deals,
    COUNT(*) FILTER (WHERE status NOT IN ('transfer', 'payment')) as active_deals,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_deals_30d
  FROM (
    SELECT listing_agent_id as agent_id, status::deal_status, created_at FROM deals
    UNION ALL
    SELECT buying_agent_id as agent_id, status::deal_status, created_at FROM deals
  ) d
  GROUP BY agent_id
),
share_counts AS (
  SELECT
    shared_by as agent_id,
    COUNT(*) as total_shares,
    COUNT(DISTINCT property_id) as unique_properties_shared,
    COUNT(*) FILTER (WHERE shared_at >= NOW() - INTERVAL '30 days') as shares_30d
  FROM property_shares
  WHERE status = 'active'
  GROUP BY shared_by
)
SELECT
  p.id as agent_id,
  p.full_name,
  p.role,
  p.verified,
  COALESCE(pc.total_properties, 0) as total_properties,
  COALESCE(pc.shared_properties, 0) as shared_properties,
  COALESCE(pc.new_properties_30d, 0) as new_properties_30d,
  COALESCE(vc.total_views, 0) as total_views,
  COALESCE(vc.views_30d, 0) as views_30d,
  COALESCE(vc.unique_days, 0) as unique_viewing_days,
  COALESCE(dc.total_deals, 0) as total_deals,
  COALESCE(dc.active_deals, 0) as active_deals,
  COALESCE(dc.new_deals_30d, 0) as new_deals_30d,
  COALESCE(sc.total_shares, 0) as total_shares,
  COALESCE(sc.unique_properties_shared, 0) as unique_properties_shared,
  COALESCE(sc.shares_30d, 0) as shares_30d,
  now() as refreshed_at
FROM profiles p
LEFT JOIN property_counts pc ON pc.agent_id = p.id
LEFT JOIN view_counts vc ON vc.agent_id = p.id
LEFT JOIN deal_counts dc ON dc.agent_id = p.id
LEFT JOIN share_counts sc ON sc.agent_id = p.id
WHERE p.role = 'agent';

-- Create indexes
CREATE INDEX idx_page_views_profile_id ON page_views(profile_id);
CREATE INDEX idx_page_views_property_id ON page_views(property_id);
CREATE INDEX idx_page_views_viewed_at ON page_views(viewed_at);
CREATE INDEX idx_property_shares_property_id ON property_shares(property_id);
CREATE INDEX idx_property_shares_shared_by ON property_shares(shared_by);
CREATE INDEX idx_property_shares_shared_with ON property_shares(shared_with);
CREATE INDEX idx_property_shares_status ON property_shares(status);

-- Enable RLS
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_shares ENABLE ROW LEVEL SECURITY;

-- Create policies for page_views
CREATE POLICY "Anyone can create page views"
  ON page_views FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Agents can view their own page views"
  ON page_views FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = page_views.property_id
      AND properties.agent_id = auth.uid()
    )
  );

-- Create policies for property_shares
CREATE POLICY "Agents can share properties"
  ON property_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_shares.property_id
      AND (
        properties.agent_id = auth.uid() OR
        properties.shared = true
      )
    )
  );

CREATE POLICY "Agents can view property shares"
  ON property_shares FOR SELECT
  TO authenticated
  USING (
    shared_by = auth.uid() OR
    shared_with = auth.uid()
  );

-- Create function to refresh statistics
CREATE OR REPLACE FUNCTION refresh_agent_statistics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY agent_statistics;
END;
$$;

-- Create trigger function to refresh statistics
CREATE OR REPLACE FUNCTION trigger_refresh_agent_statistics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM pg_notify('refresh_agent_statistics', '');
  RETURN NULL;
END;
$$;

-- Create triggers to refresh statistics
CREATE TRIGGER refresh_stats_on_property_change
  AFTER INSERT OR UPDATE OR DELETE ON properties
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_agent_statistics();

CREATE TRIGGER refresh_stats_on_deal_change
  AFTER INSERT OR UPDATE OR DELETE ON deals
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_agent_statistics();

CREATE TRIGGER refresh_stats_on_share_change
  AFTER INSERT OR UPDATE OR DELETE ON property_shares
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_agent_statistics();

CREATE TRIGGER refresh_stats_on_view_change
  AFTER INSERT OR UPDATE OR DELETE ON page_views
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_agent_statistics();

-- Create function to track page views
CREATE OR REPLACE FUNCTION track_page_view(
  p_profile_id uuid DEFAULT NULL,
  p_property_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO page_views (
    profile_id,
    property_id,
    viewer_id,
    ip_address,
    user_agent
  )
  VALUES (
    p_profile_id,
    p_property_id,
    auth.uid(),
    current_setting('request.headers')::json->>'x-real-ip',
    current_setting('request.headers')::json->>'user-agent'
  );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION refresh_agent_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION track_page_view(uuid, uuid) TO public;