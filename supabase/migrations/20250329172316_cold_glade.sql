/*
  # Remove Phone Verification Tables and Columns

  1. Changes
    - Drop verification_attempts table
    - Remove phone_number and phone_verified columns from profiles
    - Drop related functions
*/

-- Drop verification attempts table
DROP TABLE IF EXISTS verification_attempts;

-- Remove phone verification columns from profiles
ALTER TABLE profiles
DROP COLUMN IF EXISTS phone_number,
DROP COLUMN IF EXISTS phone_verified;

-- Drop related functions
DROP FUNCTION IF EXISTS track_verification_attempt(text);
DROP FUNCTION IF EXISTS mark_phone_verified(uuid, text);