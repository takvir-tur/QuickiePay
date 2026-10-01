-- Add updated_at column to users if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 1. TRIGGER
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- 2. FUNCTION
CREATE OR REPLACE FUNCTION get_user_total_spent(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    total NUMERIC;
BEGIN
    SELECT COALESCE(SUM(t.amount), 0) INTO total
    FROM transactions t
    JOIN accounts a ON t.sender_account_id = a.account_id
    WHERE a.user_id = p_user_id 
      AND t.transaction_status = 'SUCCESS';
      
    RETURN total;
END;
$$ LANGUAGE plpgsql;

-- 3. PROCEDURE WITH TRANSACTION CONTROL
CREATE OR REPLACE PROCEDURE admin_reverse_transaction(
    IN p_transaction_id UUID,
    INOUT p_status TEXT,
    INOUT p_message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_txn RECORD;
    v_receiver_balance NUMERIC;
    v_refund_amount NUMERIC;
    v_account1 UUID;
    v_account2 UUID;
BEGIN
    -- Need to lock row
    SELECT * INTO v_txn FROM transactions WHERE transaction_id = p_transaction_id FOR UPDATE;
    IF NOT FOUND THEN
        p_status := 'ERROR';
        p_message := 'Transaction not found';
        ROLLBACK;
        RETURN;
    END IF;

    IF v_txn.transaction_status IN ('CANCELLED', 'FAILED') THEN
        p_status := 'ERROR';
        p_message := 'Transaction cannot be reversed because it is already ' || v_txn.transaction_status;
        ROLLBACK;
        RETURN;
    END IF;

    -- Deterministic lock to prevent deadlock
    IF v_txn.sender_account_id < v_txn.receiver_account_id THEN
        v_account1 := v_txn.sender_account_id;
        v_account2 := v_txn.receiver_account_id;
    ELSE
        v_account1 := v_txn.receiver_account_id;
        v_account2 := v_txn.sender_account_id;
    END IF;

    IF v_account1 IS NOT NULL THEN
        PERFORM balance FROM accounts WHERE account_id = v_account1 FOR UPDATE;
    END IF;
    IF v_account2 IS NOT NULL THEN
        PERFORM balance FROM accounts WHERE account_id = v_account2 FOR UPDATE;
    END IF;

    -- Verify receiver balance
    SELECT balance INTO v_receiver_balance FROM accounts WHERE account_id = v_txn.receiver_account_id;
    IF v_receiver_balance < v_txn.amount THEN
        p_status := 'ERROR';
        p_message := 'Receiver has insufficient balance to reverse this transaction';
        ROLLBACK;
        RETURN;
    END IF;

    -- Deduct from receiver
    UPDATE accounts SET balance = balance - v_txn.amount WHERE account_id = v_txn.receiver_account_id;

    -- Refund sender
    IF v_txn.sender_account_id IS NOT NULL THEN
        v_refund_amount := v_txn.amount + COALESCE(v_txn.fee, 0);
        UPDATE accounts SET balance = balance + v_refund_amount WHERE account_id = v_txn.sender_account_id;
    END IF;

    -- Update transaction status
    UPDATE transactions SET transaction_status = 'CANCELLED' WHERE transaction_id = p_transaction_id;

    p_status := 'SUCCESS';
    p_message := 'Transaction reversed successfully';
    COMMIT;
END;
$$;
