-- Update the money gifts system to work with bank cards
-- This assumes the bank_cards table already exists

-- Make sure the gift_claimed_by column references the correct table
-- If it doesn't exist or needs to be updated:
ALTER TABLE chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_gift_claimed_by_fkey;

ALTER TABLE chat_messages 
ADD CONSTRAINT chat_messages_gift_claimed_by_fkey 
FOREIGN KEY (gift_claimed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add an index for better performance when checking claimed gifts
CREATE INDEX IF NOT EXISTS idx_chat_messages_gift_claimed_by_user 
ON chat_messages(gift_claimed_by) WHERE gift_claimed_by IS NOT NULL;

-- Optional: Add a function to safely add balance to a card
-- This can be used instead of direct balance updates
CREATE OR REPLACE FUNCTION add_balance_to_card(card_id UUID, amount_to_add INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_balance INTEGER;
BEGIN
    -- Update the balance and return the new balance
    UPDATE bank_cards 
    SET balance = balance + amount_to_add
    WHERE id = card_id
    RETURNING balance INTO new_balance;
    
    RETURN new_balance;
END;
$$; 