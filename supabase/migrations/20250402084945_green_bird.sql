-- Add category column to deal_documents if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deal_documents' 
    AND column_name = 'category'
  ) THEN
    ALTER TABLE deal_documents
    ADD COLUMN category text DEFAULT 'other';
  END IF;
END $$;

-- Create index for category column
CREATE INDEX IF NOT EXISTS idx_deal_documents_category ON deal_documents(category);

-- Update existing documents to have a category
UPDATE deal_documents
SET category = 'other'
WHERE category IS NULL;