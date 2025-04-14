/*
  # Add Payment Plan Fields to Properties Table

  1. Changes
    - Add payment_plan_type and related fields to properties table
    - Ensure backward compatibility with existing data
    - Add constraints and default values
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add payment plan fields to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS payment_plan_type TEXT,
ADD COLUMN IF NOT EXISTS first_payment_percent NUMERIC,
ADD COLUMN IF NOT EXISTS monthly_payment_percent NUMERIC,
ADD COLUMN IF NOT EXISTS monthly_payment_months INTEGER,
ADD COLUMN IF NOT EXISTS handover_percent NUMERIC,
ADD COLUMN IF NOT EXISTS posthandover_percent NUMERIC,
ADD COLUMN IF NOT EXISTS posthandover_months INTEGER,
ADD COLUMN IF NOT EXISTS posthandover_years_after INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN properties.payment_plan_type IS 'Type of payment plan: 30/70, 60/40, or Custom';
COMMENT ON COLUMN properties.first_payment_percent IS 'Percentage of first payment';
COMMENT ON COLUMN properties.monthly_payment_percent IS 'Monthly payment percentage (for Custom plan)';
COMMENT ON COLUMN properties.monthly_payment_months IS 'Number of months for monthly payments (for Custom plan)';
COMMENT ON COLUMN properties.handover_percent IS 'Percentage due at handover';
COMMENT ON COLUMN properties.posthandover_percent IS 'Post-handover payment percentage (for Custom plan)';
COMMENT ON COLUMN properties.posthandover_months IS 'Number of months for post-handover payments (for Custom plan)';
COMMENT ON COLUMN properties.posthandover_years_after IS 'Years after handover when post-handover payments start (for Custom plan)';

-- Initialize 30/70 plan for properties with certain payment plans
UPDATE properties 
SET 
  payment_plan_type = '30/70',
  first_payment_percent = 30,
  handover_percent = 70
WHERE 
  payment_plan = '30/70' AND 
  payment_plan_type IS NULL;

-- Initialize 60/40 plan for properties with certain payment plans
UPDATE properties 
SET 
  payment_plan_type = '60/40',
  first_payment_percent = 60,
  handover_percent = 40
WHERE 
  payment_plan = '60/40' AND 
  payment_plan_type IS NULL;

-- Update property validation function to handle payment plans
CREATE OR REPLACE FUNCTION validate_property_creation()
RETURNS trigger AS $$
BEGIN
  -- Validate creator type matches user role
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = NEW.creator_id
    AND role = NEW.creator_type
  ) THEN
    RAISE EXCEPTION 'Creator type must match user role';
  END IF;
  
  -- Set payment plan defaults if not specified
  IF NEW.payment_plan_type IS NULL THEN
    IF NEW.payment_plan = '30/70' THEN
      NEW.payment_plan_type := '30/70';
      NEW.first_payment_percent := 30;
      NEW.handover_percent := 70;
    ELSIF NEW.payment_plan = '60/40' THEN
      NEW.payment_plan_type := '60/40';
      NEW.first_payment_percent := 60;
      NEW.handover_percent := 40;
    ELSIF NEW.payment_plan IS NOT NULL THEN
      NEW.payment_plan_type := 'Custom';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;