-- Enable Row Level Security on bank_cards
ALTER TABLE public.bank_cards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on bank_cards to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own bank cards" ON public.bank_cards;
DROP POLICY IF EXISTS "Users can insert their own bank cards" ON public.bank_cards;
DROP POLICY IF EXISTS "Users can update their own bank cards" ON public.bank_cards;
DROP POLICY IF EXISTS "Users can delete their own bank cards" ON public.bank_cards;

-- Create new policies for bank_cards
CREATE POLICY "Users can view their own bank cards"
ON public.bank_cards FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank cards"
ON public.bank_cards FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank cards"
ON public.bank_cards FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank cards"
ON public.bank_cards FOR DELETE
USING (auth.uid() = user_id);

-- Enable Row Level Security on chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on chat_messages to avoid conflicts
DROP POLICY IF EXISTS "Users can view all messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can claim gifts" ON public.chat_messages;

-- Create new policies for chat_messages
-- 1. Allow users to see all messages (in public channels)
CREATE POLICY "Users can view all messages"
ON public.chat_messages FOR SELECT
USING (true);

-- 2. Allow users to insert messages for themselves
CREATE POLICY "Users can insert their own messages"
ON public.chat_messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. Allow users to update their own messages
CREATE POLICY "Users can update their own messages"
ON public.chat_messages FOR UPDATE
USING (auth.uid() = user_id);

-- 4. Allow users to delete their own messages
CREATE POLICY "Users can delete their own messages"
ON public.chat_messages FOR DELETE
USING (auth.uid() = user_id);

-- 5. Allow any authenticated user to claim a gift
CREATE POLICY "Users can claim gifts"
ON public.chat_messages FOR UPDATE
USING (gift_claimed_by IS NULL)
WITH CHECK (gift_claimed_by = auth.uid());
