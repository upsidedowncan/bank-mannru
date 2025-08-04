-- 1. Add audio_url column to chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN audio_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN chat_messages.audio_url IS 'URL to voice message audio file in Supabase Storage';

-- 2. Create storage bucket for voice messages
-- Note: This creates the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-audio',
  'chat-audio',
  true,
  10485760, -- 10MB in bytes
  ARRAY['audio/*']
) ON CONFLICT (id) DO NOTHING;

-- 3. Set up RLS policies for the storage bucket

-- INSERT Policy: Allow authenticated users to upload voice messages
CREATE POLICY "Allow authenticated users to upload voice messages" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'chat-audio' 
  AND auth.role() = 'authenticated'
);

-- SELECT Policy: Allow public read access to voice messages
CREATE POLICY "Allow public read access to voice messages" ON storage.objects
FOR SELECT USING (
  bucket_id = 'chat-audio'
);

-- UPDATE Policy: Allow users to update their own voice messages
CREATE POLICY "Allow users to update their own voice messages" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'chat-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- DELETE Policy: Allow users to delete their own voice messages
CREATE POLICY "Allow users to delete their own voice messages" ON storage.objects
FOR DELETE USING (
  bucket_id = 'chat-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; 