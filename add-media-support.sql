-- Add media support columns to chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN media_url TEXT,
ADD COLUMN media_type TEXT;

-- Create chat-media storage bucket (run this in Supabase Storage)
-- You need to create this bucket manually in Supabase Dashboard:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "Create a new bucket"
-- 3. Name: "chat-media"
-- 4. Public bucket: Yes
-- 5. File size limit: 50MB
-- 6. Allowed MIME types: image/*, video/*

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_media_url ON chat_messages(media_url);
CREATE INDEX IF NOT EXISTS idx_chat_messages_media_type ON chat_messages(media_type);

-- Update RLS policies to allow media uploads
-- (Adjust according to your existing RLS setup)

-- Example RLS policy for media messages
-- (You may need to adjust these policies based on your existing RLS setup)
/*
CREATE POLICY "Users can insert media messages" ON chat_messages
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  (media_url IS NULL OR media_url LIKE 'https://%')
);
*/ 