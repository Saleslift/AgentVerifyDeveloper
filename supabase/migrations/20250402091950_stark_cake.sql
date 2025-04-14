-- Add AI check fields to deal_documents table
ALTER TABLE deal_documents
ADD COLUMN IF NOT EXISTS ai_check_result jsonb,
ADD COLUMN IF NOT EXISTS ai_check_status text,
ADD COLUMN IF NOT EXISTS checked_at timestamptz;

-- Create index for AI check status
CREATE INDEX IF NOT EXISTS idx_deal_documents_ai_check_status 
ON deal_documents(ai_check_status);

-- Create function to trigger AI check when MOU document is uploaded
CREATE OR REPLACE FUNCTION trigger_ai_check_on_mou_upload()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for MOU documents
  IF NEW.category = 'mou' THEN
    -- Set initial status to pending
    NEW.ai_check_status := 'pending';
    NEW.checked_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for AI check
DROP TRIGGER IF EXISTS ai_check_trigger ON deal_documents;
CREATE TRIGGER ai_check_trigger
  BEFORE INSERT ON deal_documents
  FOR EACH ROW
  WHEN (NEW.category = 'mou')
  EXECUTE FUNCTION trigger_ai_check_on_mou_upload();