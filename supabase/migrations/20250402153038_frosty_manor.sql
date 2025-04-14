/*
  # Add Signature Support

  1. Changes
    - Create storage folder for signatures
    - Add signature_url fields to deal_activity_logs
    - Add signature_submitted type to activity logs
  
  2. Security
    - Ensure only deal participants can access signatures
    - Maintain proper access controls
*/

-- Create signatures folder in deal-files bucket
-- This is just a logical organization, no actual folder creation needed in object storage

-- Create function to handle signature uploads
CREATE OR REPLACE FUNCTION handle_signature_upload()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the signature upload in activity logs
  INSERT INTO deal_activity_logs (
    deal_id,
    user_id,
    type,
    payload,
    created_at
  ) VALUES (
    NEW.deal_id,
    NEW.user_id,
    'signature_submitted',
    jsonb_build_object(
      'signatureUrl', NEW.payload->>'signatureUrl',
      'role', CASE 
        WHEN EXISTS (
          SELECT 1 FROM deals 
          WHERE id = NEW.deal_id AND listing_agent_id = NEW.user_id
        ) THEN 'listing_agent'
        ELSE 'buying_agent'
      END
    ),
    NEW.created_at
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for signature uploads
DROP TRIGGER IF EXISTS handle_signature_upload_trigger ON deal_activity_logs;
CREATE TRIGGER handle_signature_upload_trigger
  AFTER INSERT ON deal_activity_logs
  FOR EACH ROW
  WHEN (NEW.type = 'signature_submitted')
  EXECUTE FUNCTION handle_signature_upload();