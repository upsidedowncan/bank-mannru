-- Add audio_url column to chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN audio_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN chat_messages.audio_url IS 'URL to voice message audio file in Supabase Storage';

-- Create storage bucket for voice messages (run this in Supabase Storage section)
-- Bucket name: chat-audio
-- Public bucket: true
-- File size limit: 10MB
-- Allowed MIME types: audio/*

-- Set up RLS policies for the storage bucket
-- Allow authenticated users to upload voice messages
-- Allow public read access to voice messages
-- Allow users to delete their own voice messages

-- Example RLS policies for chat-audio bucket:
-- INSERT: auth.role() = 'authenticated'
-- SELECT: true (public read)
-- UPDATE: auth.uid()::text = (storage.foldername(name))[1]
-- DELETE: auth.uid()::text = (storage.foldername(name))[1] 