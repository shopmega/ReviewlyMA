-- Supabase Storage Bucket Configuration
-- Run these commands in your Supabase Dashboard SQL Editor

-- 1. Create storage buckets
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES 
  ('claim-proofs', 'claim-proofs', false, false, 104857600, '{application/pdf,image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm}'),
  ('business-images', 'business-images', true, true, 104857600, '{image/jpeg,image/png,image/webp,image/gif,image/svg+xml}'),
  ('carousel-images', 'carousel-images', true, true, 104857600, '{image/jpeg,image/png,image/webp,image/gif,image/svg+xml}');

-- 2. Set up Row Level Security (RLS) policies for claim-proofs bucket
-- Only authenticated users can upload, but only admins can read (handled in application logic)
CREATE POLICY "Allow authenticated users to upload claim proofs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'claim-proofs');

CREATE POLICY "Allow authenticated users to update claim proofs" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'claim-proofs');

CREATE POLICY "Allow authenticated users to delete claim proofs" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'claim-proofs');

-- 3. Set up RLS policies for business-images bucket
CREATE POLICY "Allow public read access to business images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'business-images');

CREATE POLICY "Allow authenticated users to upload business images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'business-images');

CREATE POLICY "Allow authenticated users to update business images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'business-images');

CREATE POLICY "Allow authenticated users to delete business images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'business-images');

-- 4. Set up RLS policies for carousel-images bucket
CREATE POLICY "Allow public read access to carousel images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'carousel-images');

CREATE POLICY "Allow admin access to upload carousel images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'carousel-images');

CREATE POLICY "Allow admin access to update carousel images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'carousel-images');

CREATE POLICY "Allow admin access to delete carousel images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'carousel-images');

-- 5. Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;