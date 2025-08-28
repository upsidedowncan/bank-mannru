-- Add audio_duration column to store the length of voice messages

-- 1. Add column to chat_messages
ALTER TABLE public.chat_messages
ADD COLUMN audio_duration NUMERIC;

-- 2. Add column to direct_messages
ALTER TABLE public.direct_messages
ADD COLUMN audio_duration NUMERIC;
