-- First, let's check the current constraint on message_type
-- We need to update the check constraint to allow 'image' and 'video' types

-- Drop the existing check constraint (if it exists)
ALTER TABLE chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;

-- Add new check constraint that includes media types
ALTER TABLE chat_messages 
ADD CONSTRAINT chat_messages_message_type_check 
CHECK (message_type IN ('text', 'system', 'announcement', 'voice', 'image', 'video'));

-- Alternative approach if the above doesn't work:
-- We can also try to modify the existing constraint without dropping it
-- ALTER TABLE chat_messages 
-- DROP CONSTRAINT chat_messages_check;

-- Then recreate it with the new allowed values
-- ALTER TABLE chat_messages 
-- ADD CONSTRAINT chat_messages_check 
-- CHECK (message_type IN ('text', 'system', 'announcement', 'voice', 'image', 'video'));

-- If you're still getting errors, you might need to check what the exact constraint name is:
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'chat_messages'::regclass; 