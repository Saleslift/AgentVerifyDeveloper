/*
  # Fix CRM foreign key relationships

  1. Changes
    - Add proper foreign key constraints for crm_agent_relations and crm_blacklist tables
    - Ensure relationships with profiles table are correctly defined

  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing foreign key constraints if they exist
ALTER TABLE IF EXISTS crm_agent_relations
DROP CONSTRAINT IF EXISTS crm_agent_relations_contacted_agent_id_fkey;

ALTER TABLE IF EXISTS crm_blacklist
DROP CONSTRAINT IF EXISTS crm_blacklist_blocked_agent_id_fkey;

-- Add correct foreign key constraints
ALTER TABLE crm_agent_relations
ADD CONSTRAINT crm_agent_relations_contacted_agent_id_fkey
FOREIGN KEY (contacted_agent_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE crm_blacklist
ADD CONSTRAINT crm_blacklist_blocked_agent_id_fkey
FOREIGN KEY (blocked_agent_id) REFERENCES profiles(id) ON DELETE CASCADE;