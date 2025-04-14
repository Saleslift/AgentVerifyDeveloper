-- Drop existing review policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
  DROP POLICY IF EXISTS "Authenticated users can create reviews" ON reviews;
  DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
  DROP POLICY IF EXISTS "Users can delete own reviews" ON reviews;
  DROP POLICY IF EXISTS "Agents can reply to their reviews" ON reviews;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Create policy for public viewing
CREATE POLICY "Reviews are viewable by everyone"
ON reviews FOR SELECT
TO public
USING (true);

-- Create policy for review creation
CREATE POLICY "Anyone can create reviews"
ON reviews FOR INSERT
TO public
WITH CHECK (true);

-- Create policy for review updates by reviewers
CREATE POLICY "Users can update own reviews"
ON reviews FOR UPDATE
TO authenticated
USING (reviewer_id = auth.uid())
WITH CHECK (reviewer_id = auth.uid());

-- Create policy for review deletion
CREATE POLICY "Users can delete own reviews"
ON reviews FOR DELETE
TO authenticated
USING (reviewer_id = auth.uid());

-- Create separate policy for agent replies
CREATE POLICY "Agents can reply to reviews"
ON reviews FOR UPDATE
TO authenticated
USING (
  agent_id = auth.uid() AND
  reviewer_id != auth.uid()
);

-- Grant necessary permissions
GRANT ALL ON reviews TO authenticated;
GRANT SELECT, INSERT ON reviews TO public;