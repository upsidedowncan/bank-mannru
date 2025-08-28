CREATE OR REPLACE FUNCTION handle_manpay_transaction(
    sender_id_in uuid,
    receiver_id_in uuid,
    amount_in numeric
)
RETURNS boolean AS $$
DECLARE
    sender_card_id uuid;
    receiver_card_id uuid;
    sender_balance numeric;
BEGIN
    -- 1. Find a card for the sender with enough balance
    SELECT id, balance INTO sender_card_id, sender_balance
    FROM public.bank_cards
    WHERE user_id = sender_id_in AND balance >= amount_in AND is_active = true
    ORDER BY created_at
    LIMIT 1;

    -- 2. If no such card exists, return failure
    IF sender_card_id IS NULL THEN
        RAISE EXCEPTION 'Insufficient funds or no active card found for sender';
        RETURN false;
    END IF;

    -- 3. Find the first active card for the receiver
    SELECT id INTO receiver_card_id
    FROM public.bank_cards
    WHERE user_id = receiver_id_in AND is_active = true
    ORDER BY created_at
    LIMIT 1;

    -- 4. If the receiver has no active card, return failure
    IF receiver_card_id IS NULL THEN
        RAISE EXCEPTION 'No active card found for receiver';
        RETURN false;
    END IF;

    -- 5. Perform the transaction atomically
    UPDATE public.bank_cards
    SET balance = balance - amount_in
    WHERE id = sender_card_id;

    UPDATE public.bank_cards
    SET balance = balance + amount_in
    WHERE id = receiver_card_id;

    -- 6. Return success
    RETURN true;

EXCEPTION
    WHEN OTHERS THEN
        -- Any error will cause a rollback, so the transaction is atomic.
        -- We can log the error here if needed.
        RAISE NOTICE 'ManPay transaction failed: %', SQLERRM;
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
