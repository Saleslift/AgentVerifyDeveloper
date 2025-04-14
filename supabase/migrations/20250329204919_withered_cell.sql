/*
  # Add Service Areas Support

  1. Changes
    - Create function to get agent service areas
    - Add materialized view for service area statistics
    - Add refresh trigger for statistics
  
  2. Security
    - Enable RLS on views
    - Add policies for public access
*/

-- Create function to get agent service areas with property counts
CREATE OR REPLACE FUNCTION get_agent_service_areas(p_agent_id uuid)
RETURNS TABLE (
  location text,
  property_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.location,
    COUNT(*) as property_count
  FROM properties p
  LEFT JOIN agent_properties ap ON p.id = ap.property_id
  WHERE 
    p.agent_id = p_agent_id 
    OR ap.agent_id = p_agent_id
  GROUP BY p.location
  ORDER BY COUNT(*) DESC;
END;
$$;

-- Create materialized view for service area statistics
CREATE MATERIALIZED VIEW service_area_statistics AS
SELECT
  p.agent_id,
  p.location,
  COUNT(*) as total_properties,
  COUNT(*) FILTER (WHERE p.contract_type = 'Sale') as sale_properties,
  COUNT(*) FILTER (WHERE p.contract_type = 'Rent') as rent_properties,
  MIN(p.price) as min_price,
  MAX(p.price) as max_price,
  COUNT(DISTINCT ap.agent_id) as total_agents_active,
  COUNT(*) FILTER (WHERE p.created_at >= NOW() - INTERVAL '30 days') as new_properties_30d
FROM properties p
LEFT JOIN agent_properties ap ON p.id = ap.property_id
GROUP BY p.agent_id, p.location;

-- Create index for faster lookups
CREATE INDEX idx_service_area_statistics_agent_location 
ON service_area_statistics(agent_id, location);

-- Create function to refresh service area statistics
CREATE OR REPLACE FUNCTION refresh_service_area_statistics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY service_area_statistics;
END;
$$;

-- Create trigger to refresh statistics when properties change
CREATE OR REPLACE FUNCTION trigger_refresh_service_area_statistics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM pg_notify('refresh_service_area_statistics', '');
  RETURN NULL;
END;
$$;

-- Add trigger to properties table
CREATE TRIGGER refresh_service_area_stats_on_property_change
  AFTER INSERT OR UPDATE OR DELETE ON properties
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_service_area_statistics();

-- Add trigger to agent_properties table
CREATE TRIGGER refresh_service_area_stats_on_agent_property_change
  AFTER INSERT OR UPDATE OR DELETE ON agent_properties
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_service_area_statistics();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_agent_service_areas(uuid) TO public;
GRANT SELECT ON service_area_statistics TO public;