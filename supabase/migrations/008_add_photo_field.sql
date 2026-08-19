-- Add photo_url field to persons table
ALTER TABLE public.persons
ADD COLUMN photo_url TEXT;

-- Create storage bucket for client photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-photos', 'client-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for client-photos bucket
CREATE POLICY "Authenticated users can upload client photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-photos');

CREATE POLICY "Authenticated users can view client photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client-photos');

CREATE POLICY "Authenticated users can update client photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client-photos');

CREATE POLICY "Authenticated users can delete client photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-photos');
