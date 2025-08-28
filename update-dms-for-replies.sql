-- Add reply functionality to direct messages
ALTER TABLE public.direct_messages
ADD COLUMN reply_to UUID,
ADD CONSTRAINT direct_messages_reply_to_fkey
FOREIGN KEY (reply_to) REFERENCES public.direct_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_direct_messages_reply_to ON public.direct_messages(reply_to);
