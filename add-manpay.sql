-- Add ManPay feature support to the direct_messages table

-- 1. Add columns for ManPay data
ALTER TABLE public.direct_messages
ADD COLUMN manpay_amount NUMERIC,
ADD COLUMN manpay_sender_id UUID REFERENCES auth.users(id),
ADD COLUMN manpay_receiver_id UUID REFERENCES auth.users(id),
ADD COLUMN manpay_status TEXT;

-- 2. Drop the old message_type constraint
ALTER TABLE public.direct_messages
DROP CONSTRAINT IF EXISTS direct_messages_message_type_check;

-- 3. Add a new constraint that includes 'manpay'
ALTER TABLE public.direct_messages
ADD CONSTRAINT direct_messages_message_type_check
CHECK (message_type IN ('text', 'image', 'video', 'voice', 'manpay'));
