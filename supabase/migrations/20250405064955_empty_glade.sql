/*
  # Remove CRM Tables

  1. Changes
    - Drop all CRM-related tables
    - Drop related functions and triggers
    - Clean up database schema
  
  2. Security
    - No changes to RLS policies for remaining tables
*/

-- Drop CRM tables in the correct order to avoid foreign key constraint issues
DROP TABLE IF EXISTS crm_activities CASCADE;
DROP TABLE IF EXISTS crm_tasks CASCADE;
DROP TABLE IF EXISTS crm_clients CASCADE;
DROP TABLE IF EXISTS crm_agent_relations CASCADE;
DROP TABLE IF EXISTS crm_blacklist CASCADE;
DROP TABLE IF EXISTS crm_developers CASCADE;
DROP TABLE IF EXISTS crm_leads CASCADE;

-- Drop any related functions
DROP FUNCTION IF EXISTS update_crm_tasks_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_crm_leads_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_crm_clients_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_crm_developers_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_crm_agent_relations_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_crm_blacklist_updated_at() CASCADE;