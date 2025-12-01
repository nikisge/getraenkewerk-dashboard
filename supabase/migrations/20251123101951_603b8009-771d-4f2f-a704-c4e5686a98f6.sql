-- Create storage bucket for action images
INSERT INTO storage.buckets (id, name, public)
VALUES ('action-images', 'action-images', true);

-- Create RLS policies for action images
CREATE POLICY "Action images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'action-images');

CREATE POLICY "Anyone can upload action images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'action-images');

CREATE POLICY "Anyone can update action images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'action-images');

CREATE POLICY "Anyone can delete action images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'action-images');