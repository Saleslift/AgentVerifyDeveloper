-- Add reviewer_contact column to reviews table
ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS reviewer_contact jsonb;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_contact 
ON reviews USING GIN(reviewer_contact);

-- Update existing reviews with empty contact info
UPDATE reviews
SET reviewer_contact = '{}'::jsonb
WHERE reviewer_contact IS NULL;