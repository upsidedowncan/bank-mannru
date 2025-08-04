-- Update the check constraint to allow 'html' message type
ALTER TABLE chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;

ALTER TABLE chat_messages 
ADD CONSTRAINT chat_messages_message_type_check 
CHECK (message_type IN ('text', 'system', 'announcement', 'voice', 'image', 'video', 'html'));

-- If the above doesn't work, try finding the exact constraint name:
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'chat_messages'::regclass; 