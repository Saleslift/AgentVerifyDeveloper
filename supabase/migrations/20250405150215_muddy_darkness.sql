/*
  # Disable Email Confirmation for All Users

  1. Changes
    - Set email_confirmed_at to current timestamp for all users
    - Set default email_confirmed_at to current timestamp for new users
  
  2. Security
    - Maintain existing RLS policies
    - Keep profile creation secure
*/

-- Disable email confirmation requirement for all users
UPDATE auth.users
SET email_confirmed_at = CURRENT_TIMESTAMP
WHERE email_confirmed_at IS NULL;

-- Set default email confirmation to true for new users
ALTER TABLE auth.users 
ALTER COLUMN email_confirmed_at 
SET DEFAULT CURRENT_TIMESTAMP;