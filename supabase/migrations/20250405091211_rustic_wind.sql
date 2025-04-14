/*
  # Add Project-Specific Fields to Properties Table

  1. Changes
    - Add handover_date column to properties table
    - Add payment_plan column to properties table
    - Add brochure_url column to properties table
    - Create indexes for better query performance
  
  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity
*/

-- Add project-specific columns to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS handover_date date,
ADD COLUMN IF NOT EXISTS payment_plan text,
ADD COLUMN IF NOT EXISTS brochure_url text;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_properties_handover_date ON properties(handover_date);
CREATE INDEX IF NOT EXISTS idx_properties_payment_plan ON properties(payment_plan);