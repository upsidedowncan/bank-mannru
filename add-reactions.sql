-- Create the message_reactions table
CREATE TABLE public.message_reactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    emoji text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT message_reactions_pkey PRIMARY KEY (id),
    CONSTRAINT message_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    CONSTRAINT message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Ensure a user can only react with the same emoji once per message
    CONSTRAINT unique_user_emoji_reaction UNIQUE (message_id, user_id, emoji)
);

-- Add comments to the table and columns
COMMENT ON TABLE public.message_reactions IS 'Stores emoji reactions to messages.';
COMMENT ON COLUMN public.message_reactions.id IS 'The unique identifier for the reaction.';
COMMENT ON COLUMN public.message_reactions.message_id IS 'The ID of the message being reacted to.';
COMMENT ON COLUMN public.message_reactions.user_id IS 'The ID of the user who reacted.';
COMMENT ON COLUMN public.message_reactions.emoji IS 'The emoji character used for the reaction.';
COMMENT ON COLUMN public.message_reactions.created_at IS 'The timestamp when the reaction was created.';

-- Enable Row-Level Security for the table
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- 1. Allow authenticated users to view all reactions
CREATE POLICY "Allow authenticated users to view reactions"
ON public.message_reactions
FOR SELECT
TO authenticated
USING (true);

-- 2. Allow users to insert their own reactions
CREATE POLICY "Allow users to insert their own reactions"
ON public.message_reactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Allow users to delete their own reactions
CREATE POLICY "Allow users to delete their own reactions"
ON public.message_reactions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
