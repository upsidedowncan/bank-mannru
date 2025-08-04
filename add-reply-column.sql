-- Add reply_to column to chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN reply_to UUID REFERENCES chat_messages(id) ON DELETE SET NULL;

-- Add admin_only column to chat_channels table (if not already added)
ALTER TABLE chat_channels 
ADD COLUMN admin_only BOOLEAN DEFAULT FALSE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to ON chat_messages(reply_to);
CREATE INDEX IF NOT EXISTS idx_chat_channels_admin_only ON chat_channels(admin_only);

-- Update RLS policies to allow replies
-- (This assumes you have RLS enabled on chat_messages table)
-- You may need to adjust these policies based on your existing RLS setup

-- Example RLS policy for inserting messages with replies
-- (Adjust according to your existing policies)
/*
CREATE POLICY "Users can insert messages with replies" ON chat_messages
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  (reply_to IS NULL OR EXISTS (
    SELECT 1 FROM chat_messages 
    WHERE id = reply_to AND channel_id = chat_messages.channel_id
  ))
);
*/ 