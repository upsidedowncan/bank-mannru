-- Add money gift columns to chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN gift_amount INTEGER,
ADD COLUMN gift_claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN gift_claimed_at TIMESTAMP WITH TIME ZONE;

-- Update the check constraint to allow 'money_gift' message type
ALTER TABLE chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;

ALTER TABLE chat_messages 
ADD CONSTRAINT chat_messages_message_type_check 
CHECK (message_type IN ('text', 'system', 'announcement', 'voice', 'image', 'video', 'html', 'money_gift'));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_gift_amount ON chat_messages(gift_amount);
CREATE INDEX IF NOT EXISTS idx_chat_messages_gift_claimed_by ON chat_messages(gift_claimed_by);
CREATE INDEX IF NOT EXISTS idx_chat_messages_gift_claimed_at ON chat_messages(gift_claimed_at);

-- Add constraint to ensure gift_amount is positive when present
ALTER TABLE chat_messages 
ADD CONSTRAINT chat_messages_gift_amount_positive 
CHECK (gift_amount IS NULL OR gift_amount > 0); 