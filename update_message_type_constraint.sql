-- Update the check constraint on message_type to include 'market_item'
-- Run this in your Supabase SQL editor

-- First, let's see what the current constraint looks like
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'chat_messages'::regclass 
AND contype = 'c';

-- Drop the existing check constraint (we'll need to recreate it)
-- Note: You'll need to replace 'chat_messages_message_type_check' with the actual constraint name from the query above
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;

-- Add the new check constraint that includes 'market_item'
ALTER TABLE chat_messages 
ADD CONSTRAINT chat_messages_message_type_check 
CHECK (message_type IN ('text', 'system', 'announcement', 'voice', 'image', 'video', 'html', 'money_gift', 'manpay', 'market_item')); 