/*
  # Fix Agent Statistics View

  1. Changes
    - Update agent_statistics view to include marketplace properties
    - Add proper counting of active listings
    - Add required unique index for concurrent refresh
  
  2. Security
    - Maintain existing RLS policies
    - Keep data integrity
*/

-- Drop existing materialized view
DROP MATERIALIZED VIEW IF EXISTS agent_statistics;

-- Create updated materialized view
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
marketplace_counts AS (
  SELECT
    agent_id,
    COUNT(*) as marketplace_properties
  FROM agent_properties
  WHERE status = 'active'
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
  COALESCE(pc.total_properties, 0) + COALESCE(mc.marketplace_properties, 0) as total_properties,
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
LEFT JOIN marketplace_counts mc ON mc.agent_id = p.id
LEFT JOIN view_counts vc ON vc.agent_id = p.id
LEFT JOIN deal_counts dc ON dc.agent_id = p.id
LEFT JOIN share_counts sc ON sc.agent_id = p.id
WHERE p.role = 'agent';

-- Create unique index required for concurrent refresh
CREATE UNIQUE INDEX agent_statistics_agent_id_unique ON agent_statistics(agent_id);

-- Create index for faster lookups
CREATE INDEX idx_agent_statistics_agent_id ON agent_statistics(agent_id);

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW agent_statistics;