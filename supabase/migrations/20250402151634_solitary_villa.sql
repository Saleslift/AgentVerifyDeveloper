-- Add timestamp fields for each deal status
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS inquiry_at timestamptz,
ADD COLUMN IF NOT EXISTS viewing_at timestamptz,
ADD COLUMN IF NOT EXISTS offer_at timestamptz,
ADD COLUMN IF NOT EXISTS negotiation_at timestamptz,
ADD COLUMN IF NOT EXISTS contract_at timestamptz,
ADD COLUMN IF NOT EXISTS payment_at timestamptz,
ADD COLUMN IF NOT EXISTS transfer_at timestamptz;

-- Update existing deals with current status timestamp
-- Use explicit casting to text to avoid enum errors
UPDATE deals
SET 
  inquiry_at = CASE WHEN status::text = 'inquiry' OR status::text IN ('viewing', 'offer', 'negotiation', 'contract', 'payment', 'transfer') THEN created_at ELSE NULL END,
  viewing_at = CASE WHEN status::text IN ('viewing', 'offer', 'negotiation', 'contract', 'payment', 'transfer') THEN updated_at ELSE NULL END,
  offer_at = CASE WHEN status::text IN ('offer', 'negotiation', 'contract', 'payment', 'transfer') THEN updated_at ELSE NULL END,
  negotiation_at = CASE WHEN status::text IN ('negotiation', 'contract', 'payment', 'transfer') THEN updated_at ELSE NULL END,
  contract_at = CASE WHEN status::text IN ('contract', 'payment', 'transfer') THEN updated_at ELSE NULL END,
  payment_at = CASE WHEN status::text IN ('payment', 'transfer') THEN updated_at ELSE NULL END,
  transfer_at = CASE WHEN status::text = 'transfer' THEN updated_at ELSE NULL END;

-- Create function to automatically set timestamp when status changes
CREATE OR REPLACE FUNCTION set_deal_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status has changed
  IF NEW.status <> OLD.status THEN
    -- Set timestamp for the new status
    CASE NEW.status::text
      WHEN 'inquiry' THEN
        NEW.inquiry_at := NOW();
      WHEN 'viewing' THEN
        NEW.viewing_at := NOW();
      WHEN 'offer' THEN
        NEW.offer_at := NOW();
      WHEN 'negotiation' THEN
        NEW.negotiation_at := NOW();
      WHEN 'contract' THEN
        NEW.contract_at := NOW();
      WHEN 'payment' THEN
        NEW.payment_at := NOW();
      WHEN 'transfer' THEN
        NEW.transfer_at := NOW();
      ELSE
        -- No timestamp field for other statuses
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status timestamp
DROP TRIGGER IF EXISTS set_deal_status_timestamp_trigger ON deals;
CREATE TRIGGER set_deal_status_timestamp_trigger
  BEFORE UPDATE OF status ON deals
  FOR EACH ROW
  EXECUTE FUNCTION set_deal_status_timestamp();