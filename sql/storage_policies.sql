-- Storage Bucket and Policies for KnitFlow
-- Run this in Supabase SQL Editor after creating the buckets in the Storage UI

-- First, create buckets via Supabase Dashboard > Storage:
-- 1. Create bucket 'patterns' (private)
-- 2. Create bucket 'note-photos' (private)

-- Or via SQL:
INSERT INTO storage.buckets (id, name, public) VALUES ('patterns', 'patterns', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('note-photos', 'note-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Patterns bucket policies
-- Users can upload to their own folder
CREATE POLICY "Users can upload patterns to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'patterns'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read own patterns
CREATE POLICY "Users can read own patterns"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'patterns'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete own patterns
CREATE POLICY "Users can delete own patterns"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'patterns'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Note photos bucket policies
-- Users can upload to their own folder
CREATE POLICY "Users can upload note photos to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'note-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read own note photos
CREATE POLICY "Users can read own note photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'note-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete own note photos
CREATE POLICY "Users can delete own note photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'note-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
