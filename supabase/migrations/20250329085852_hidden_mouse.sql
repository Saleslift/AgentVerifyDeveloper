-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow uploads for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Allow public viewing of files" ON storage.objects;

-- Create properties bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('properties', 'properties', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create simplified storage policies
CREATE POLICY "Allow uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'properties');

CREATE POLICY "Allow updates"
ON storage.objects FOR UPDATE
USING (bucket_id = 'properties');

CREATE POLICY "Allow deletes"
ON storage.objects FOR DELETE
USING (bucket_id = 'properties');

CREATE POLICY "Allow public viewing"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'properties');