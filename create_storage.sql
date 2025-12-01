-- Create the storage bucket for action images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('action-images', 'action-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload images
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'action-images' );

-- Policy to allow public to view images
CREATE POLICY "Allow public viewing"
ON storage.objects
FOR SELECT
TO public
USING ( bucket_id = 'action-images' );

-- Policy to allow authenticated users to update their own images (optional, but good practice)
CREATE POLICY "Allow authenticated updates"
ON storage.objects
FOR UPDATE
TO authenticated
USING ( bucket_id = 'action-images' );

-- Policy to allow authenticated users to delete their own images (optional)
CREATE POLICY "Allow authenticated deletes"
ON storage.objects
FOR DELETE
TO authenticated
USING ( bucket_id = 'action-images' );
