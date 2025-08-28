-- Add media-related columns to the direct_messages table
ALTER TABLE public.direct_messages
ADD COLUMN message_type TEXT NOT NULL DEFAULT 'text',
ADD COLUMN media_url TEXT,
ADD COLUMN media_type TEXT;

-- Add a check constraint to ensure message_type has valid values
ALTER TABLE public.direct_messages
ADD CONSTRAINT direct_messages_message_type_check
CHECK (message_type IN ('text', 'image', 'video'));
