-- Add voice message support to the direct_messages table

-- 1. Add the audio_url column
ALTER TABLE public.direct_messages
ADD COLUMN audio_url TEXT;

-- 2. Drop the old message_type constraint
ALTER TABLE public.direct_messages
DROP CONSTRAINT IF EXISTS direct_messages_message_type_check;

-- 3. Add a new constraint that includes 'voice'
ALTER TABLE public.direct_messages
ADD CONSTRAINT direct_messages_message_type_check
CHECK (message_type IN ('text', 'image', 'video', 'voice'));
