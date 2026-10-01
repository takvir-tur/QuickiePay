-- ============================================================================
-- QUICKIEPAY — PL/pgSQL PROCEDURES, TRIGGERS & FUNCTIONS
-- Database: PostgreSQL
-- Purpose: Encapsulates financial transactions, integrity rules, and audit
--          automation inside the database layer.
-- ============================================================================

-- Ensure updated_at tracking columns exist on core tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;


-- ============================================================================
-- SECTION 1: USER-DEFINED FUNCTIONS (UDFs)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function 1: fn_calculate_fee
-- Purpose: Dynamically calculates the transaction fee based on transaction type
--          and configurable values stored in the system_settings table.
-- Returns: NUMERIC (the fee amount)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_calculate_fee(
    p_txn_type transaction_type,
    p_amount NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    v_fee NUMERIC := 0.00;
    v_flat_fee NUMERIC;
    v_pct_fee NUMERIC;
BEGIN
    IF p_txn_type = 'SEND_MONEY' THEN
        -- Read flat fee for Send Money from system_settings (defaults to ৳5.00)
        SELECT setting_value INTO v_flat_fee
        FROM system_settings WHERE setting_key = 'SEND_MONEY_FLAT_FEE';
        v_fee := COALESCE(v_flat_fee, 5.00);

    ELSIF p_txn_type = 'CASH_OUT' THEN
        -- Read percentage charge for Cash Out (defaults to 1.85%)
        SELECT setting_value INTO v_pct_fee
        FROM system_settings WHERE setting_key = 'CASH_OUT_FEE_PCT';
        v_fee := ROUND((p_amount * COALESCE(v_pct_fee, 1.85) / 100.0), 2);

    ELSE
        v_fee := 0.00;
    END IF;

    RETURN v_fee;
END;
$$;


-- ----------------------------------------------------------------------------
-- Function 2: fn_check_daily_limit
-- Purpose: Enforces the daily transaction limit by summing today's outgoing
--          successful transactions for an account and checking if adding
--          p_amount would exceed the DAILY_TXN_LIMIT.
-- Returns: BOOLEAN (TRUE if transaction is allowed, FALSE if exceeded)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_check_daily_limit(
    p_account_id UUID,
    p_amount NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_daily_limit NUMERIC;
    v_current_total NUMERIC;
BEGIN
    -- Read DAILY_TXN_LIMIT setting (default ৳50,000.00)
    SELECT setting_value INTO v_daily_limit
    FROM system_settings WHERE setting_key = 'DAILY_TXN_LIMIT';

    IF v_daily_limit IS NULL THEN
        v_daily_limit := 50000.00;
    END IF;

    -- Calculate total spent today
    SELECT COALESCE(SUM(amount), 0) INTO v_current_total
    FROM transactions
    WHERE sender_account_id = p_account_id
      AND DATE(transaction_time) = CURRENT_DATE
      AND transaction_status = 'SUCCESS';

    IF (v_current_total + p_amount) > v_daily_limit THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$;


-- ----------------------------------------------------------------------------
-- Function 3: fn_get_monthly_spending
-- Purpose: Computes total outgoing spending (amount + fee) for a given account
--          in a specific month and year.
-- Returns: NUMERIC (total monthly expenditure)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_monthly_spending(
    p_account_id UUID,
    p_month INT,
    p_year INT
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    v_total NUMERIC;
BEGIN
    SELECT COALESCE(SUM(amount + fee), 0) INTO v_total
    FROM transactions
    WHERE sender_account_id = p_account_id
      AND EXTRACT(MONTH FROM transaction_time) = p_month
      AND EXTRACT(YEAR FROM transaction_time) = p_year
      AND transaction_status = 'SUCCESS';

    RETURN v_total;
END;
$$;


-- ----------------------------------------------------------------------------
-- Function 4: fn_get_user_account_status
-- Purpose: Resolves the effective account status ('ACTIVE', 'BLOCKED', 'CLOSED')
--          by querying across the user's role subtype table.
-- Returns: account_status ENUM
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_get_user_account_status(
    p_user_id UUID
)
RETURNS account_status
LANGUAGE plpgsql
AS $$
DECLARE
    v_status account_status;
BEGIN
    SELECT COALESCE(pa.status, ag.status, m.status, b.status, 'ACTIVE'::account_status)
    INTO v_status
    FROM users u
    LEFT JOIN personal_accounts pa ON u.user_id = pa.user_id
    LEFT JOIN agents ag ON u.user_id = ag.user_id
    LEFT JOIN merchants m ON u.user_id = m.user_id
    LEFT JOIN billers b ON u.user_id = b.user_id
    WHERE u.user_id = p_user_id;

    RETURN v_status;
END;
$$;



-- ============================================================================
-- SECTION 2: STORED PROCEDURES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Procedure 1: sp_send_money
-- Purpose: Atomically executes a person-to-person money transfer.
-- Features:
--   - Validates receiver phone and ensures sender != receiver
--   - Checks MAX_PER_TXN_LIMIT and DAILY_TXN_LIMIT via fn_check_daily_limit()
--   - Computes fee using fn_calculate_fee()
--   - Applies deterministic alphabetical row locking to prevent deadlocks
--   - Enforces balance sufficiency
--   - Debits sender (amount + fee) and credits receiver (amount)
--   - Records transaction entry and returns reference_no, fee, total_deduction
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_send_money(
    IN p_sender_user_id UUID,
    IN p_receiver_phone VARCHAR,
    IN p_amount NUMERIC,
    IN p_note TEXT,
    INOUT p_reference_no VARCHAR DEFAULT NULL,
    INOUT p_fee NUMERIC DEFAULT NULL,
    INOUT p_total_deduction NUMERIC DEFAULT NULL,
    INOUT p_sender_account_id UUID DEFAULT NULL,
    INOUT p_receiver_account_id UUID DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_sender_balance NUMERIC;
    v_max_limit NUMERIC;
    v_first_acc UUID;
    v_second_acc UUID;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be greater than 0';
    END IF;

    -- Lookup Sender Account
    SELECT a.account_id INTO p_sender_account_id
    FROM users u
    JOIN accounts a ON u.user_id = a.user_id
    WHERE u.user_id = p_sender_user_id;

    IF p_sender_account_id IS NULL THEN
        RAISE EXCEPTION 'Sender account not found';
    END IF;

    -- Lookup Receiver Account
    SELECT a.account_id INTO p_receiver_account_id
    FROM users u
    JOIN accounts a ON u.user_id = a.user_id
    WHERE u.phone_number = p_receiver_phone;

    IF p_receiver_account_id IS NULL THEN
        RAISE EXCEPTION 'Receiver not found';
    END IF;

    IF p_sender_account_id = p_receiver_account_id THEN
        RAISE EXCEPTION 'You cannot send money to yourself';
    END IF;

    -- Max Per Transaction Limit Check
    SELECT setting_value INTO v_max_limit
    FROM system_settings WHERE setting_key = 'MAX_PER_TXN_LIMIT';

    IF v_max_limit IS NOT NULL AND p_amount > v_max_limit THEN
        RAISE EXCEPTION 'Amount exceeds the maximum limit of ৳% per transaction.', v_max_limit;
    END IF;

    -- Daily Transaction Limit Check
    IF NOT fn_check_daily_limit(p_sender_account_id, p_amount) THEN
        RAISE EXCEPTION 'Transaction exceeds daily transaction limit';
    END IF;

    -- Calculate Fee & Total Deduction
    p_fee := fn_calculate_fee('SEND_MONEY'::transaction_type, p_amount);
    p_total_deduction := ROUND(p_amount + p_fee, 2);

    -- Deterministic sorted row locking to prevent deadlocks
    IF p_sender_account_id < p_receiver_account_id THEN
        v_first_acc := p_sender_account_id;
        v_second_acc := p_receiver_account_id;
    ELSE
        v_first_acc := p_receiver_account_id;
        v_second_acc := p_sender_account_id;
    END IF;

    PERFORM balance FROM accounts WHERE account_id = v_first_acc FOR UPDATE;
    PERFORM balance FROM accounts WHERE account_id = v_second_acc FOR UPDATE;

    -- Verify Sender Balance
    SELECT balance INTO v_sender_balance
    FROM accounts WHERE account_id = p_sender_account_id;

    IF v_sender_balance < p_total_deduction THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Deduct sender & credit receiver
    UPDATE accounts SET balance = balance - p_total_deduction WHERE account_id = p_sender_account_id;
    UPDATE accounts SET balance = balance + p_amount WHERE account_id = p_receiver_account_id;

    -- Insert Transaction Record
    IF p_reference_no IS NULL OR p_reference_no = '' THEN
        p_reference_no := 'TXN' || FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::TEXT;
    END IF;

    INSERT INTO transactions (
        reference_no,
        transaction_type,
        sender_account_id,
        receiver_account_id,
        amount,
        fee,
        transaction_status,
        remarks
    )
    VALUES (
        p_reference_no,
        'SEND_MONEY',
        p_sender_account_id,
        p_receiver_account_id,
        p_amount,
        p_fee,
        'SUCCESS',
        p_note
    );
END;
$$;


-- ----------------------------------------------------------------------------
-- Procedure 2: sp_cash_in
-- Purpose: Atomically executes an agent Cash In to a customer.
-- Features:
--   - Validates that caller is an ACTIVE agent
--   - Validates customer is registered with a PERSONAL account
--   - Locks both accounts in deterministic order
--   - Deducts amount from agent balance, adds amount to customer balance
--   - Records in both transactions and cash_transactions tables
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_cash_in(
    IN p_agent_user_id UUID,
    IN p_customer_phone VARCHAR,
    IN p_amount NUMERIC,
    IN p_note TEXT,
    INOUT p_reference_no VARCHAR DEFAULT NULL,
    INOUT p_agent_account_id UUID DEFAULT NULL,
    INOUT p_customer_account_id UUID DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_agent_id UUID;
    v_agent_status account_status;
    v_agent_balance NUMERIC;
    v_first_acc UUID;
    v_second_acc UUID;
    v_tx_id UUID;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be greater than 0';
    END IF;

    -- Validate Agent
    SELECT a.account_id, ag.agent_id, ag.status
    INTO p_agent_account_id, v_agent_id, v_agent_status
    FROM users u
    JOIN accounts a ON u.user_id = a.user_id
    JOIN agents ag ON u.user_id = ag.user_id
    WHERE u.user_id = p_agent_user_id;

    IF p_agent_account_id IS NULL THEN
        RAISE EXCEPTION 'You are not registered as an agent';
    END IF;

    IF v_agent_status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'Agent account is not active';
    END IF;

    -- Validate Customer
    SELECT a.account_id INTO p_customer_account_id
    FROM users u
    JOIN accounts a ON u.user_id = a.user_id
    WHERE u.phone_number = p_customer_phone
      AND a.account_type = 'PERSONAL';

    IF p_customer_account_id IS NULL THEN
        RAISE EXCEPTION 'Customer not found';
    END IF;

    IF p_customer_account_id = p_agent_account_id THEN
        RAISE EXCEPTION 'You cannot cash in to your own account';
    END IF;

    -- Deterministic locking
    IF p_agent_account_id < p_customer_account_id THEN
        v_first_acc := p_agent_account_id;
        v_second_acc := p_customer_account_id;
    ELSE
        v_first_acc := p_customer_account_id;
        v_second_acc := p_agent_account_id;
    END IF;

    PERFORM balance FROM accounts WHERE account_id = v_first_acc FOR UPDATE;
    PERFORM balance FROM accounts WHERE account_id = v_second_acc FOR UPDATE;

    -- Check Agent Balance
    SELECT balance INTO v_agent_balance FROM accounts WHERE account_id = p_agent_account_id;
    IF v_agent_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient agent balance';
    END IF;

    -- Execute Balance Transfers
    UPDATE accounts SET balance = balance - p_amount WHERE account_id = p_agent_account_id;
    UPDATE accounts SET balance = balance + p_amount WHERE account_id = p_customer_account_id;

    -- Record Main Transaction
    IF p_reference_no IS NULL OR p_reference_no = '' THEN
        p_reference_no := 'CIN' || FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::TEXT;
    END IF;

    INSERT INTO transactions (
        reference_no,
        transaction_type,
        sender_account_id,
        receiver_account_id,
        amount,
        fee,
        transaction_status,
        remarks
    )
    VALUES (
        p_reference_no,
        'CASH_IN',
        p_agent_account_id,
        p_customer_account_id,
        p_amount,
        0,
        'SUCCESS',
        p_note
    )
    RETURNING transaction_id INTO v_tx_id;

    -- Record Cash Transaction Subtype
    INSERT INTO cash_transactions (
        transaction_id,
        agent_id,
        cash_type,
        commission
    )
    VALUES (
        v_tx_id,
        v_agent_id,
        'CASH_IN',
        0
    );
END;
$$;


-- ----------------------------------------------------------------------------
-- Procedure 3: sp_cash_out
-- Purpose: Atomically executes a customer Cash Out through an agent.
-- Features:
--   - Validates active agent
--   - Checks MAX_PER_TXN_LIMIT and DAILY_TXN_LIMIT
--   - Calculates cash out fee (1.85% via fn_calculate_fee)
--   - Debits customer (amount + fee) and credits agent (amount + fee)
--   - Records in transactions and cash_transactions (commission = fee)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_cash_out(
    IN p_user_id UUID,
    IN p_agent_phone VARCHAR,
    IN p_amount NUMERIC,
    IN p_note TEXT,
    INOUT p_reference_no VARCHAR DEFAULT NULL,
    INOUT p_fee NUMERIC DEFAULT NULL,
    INOUT p_total_deduction NUMERIC DEFAULT NULL,
    INOUT p_user_account_id UUID DEFAULT NULL,
    INOUT p_agent_account_id UUID DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_agent_id UUID;
    v_user_balance NUMERIC;
    v_max_limit NUMERIC;
    v_first_acc UUID;
    v_second_acc UUID;
    v_tx_id UUID;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Invalid amount';
    END IF;

    -- User Account
    SELECT a.account_id INTO p_user_account_id
    FROM users u
    JOIN accounts a ON u.user_id = a.user_id
    WHERE u.user_id = p_user_id;

    IF p_user_account_id IS NULL THEN
        RAISE EXCEPTION 'User account not found';
    END IF;

    -- Active Agent
    SELECT a.account_id, ag.agent_id
    INTO p_agent_account_id, v_agent_id
    FROM users u
    JOIN accounts a ON u.user_id = a.user_id
    JOIN agents ag ON u.user_id = ag.user_id
    WHERE u.phone_number = p_agent_phone
      AND ag.status = 'ACTIVE';

    IF p_agent_account_id IS NULL THEN
        RAISE EXCEPTION 'Active agent not found with this phone number';
    END IF;

    IF p_user_account_id = p_agent_account_id THEN
        RAISE EXCEPTION 'You cannot cash out to yourself';
    END IF;

    -- Max limit check
    SELECT setting_value INTO v_max_limit
    FROM system_settings WHERE setting_key = 'MAX_PER_TXN_LIMIT';

    IF v_max_limit IS NOT NULL AND p_amount > v_max_limit THEN
        RAISE EXCEPTION 'Amount exceeds the maximum limit of ৳% per transaction.', v_max_limit;
    END IF;

    -- Daily limit check
    IF NOT fn_check_daily_limit(p_user_account_id, p_amount) THEN
        RAISE EXCEPTION 'Transaction exceeds your daily limit';
    END IF;

    -- Fee calculation using Function
    p_fee := fn_calculate_fee('CASH_OUT'::transaction_type, p_amount);
    p_total_deduction := ROUND(p_amount + p_fee, 2);

    -- Deadlock-free locking
    IF p_user_account_id < p_agent_account_id THEN
        v_first_acc := p_user_account_id;
        v_second_acc := p_agent_account_id;
    ELSE
        v_first_acc := p_agent_account_id;
        v_second_acc := p_user_account_id;
    END IF;

    PERFORM balance FROM accounts WHERE account_id = v_first_acc FOR UPDATE;
    PERFORM balance FROM accounts WHERE account_id = v_second_acc FOR UPDATE;

    -- Check User Balance
    SELECT balance INTO v_user_balance FROM accounts WHERE account_id = p_user_account_id;
    IF v_user_balance < p_total_deduction THEN
        RAISE EXCEPTION 'Insufficient balance. Required: ৳% (Amount: ৳% + Charge: ৳%), Available: ৳%',
            p_total_deduction, p_amount, p_fee, v_user_balance;
    END IF;

    -- Deduct from user and credit agent (including fee)
    UPDATE accounts SET balance = balance - p_total_deduction WHERE account_id = p_user_account_id;
    UPDATE accounts SET balance = balance + p_total_deduction WHERE account_id = p_agent_account_id;

    -- Record transaction
    IF p_reference_no IS NULL OR p_reference_no = '' THEN
        p_reference_no := 'COUT' || FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::TEXT;
    END IF;

    INSERT INTO transactions (
        reference_no,
        transaction_type,
        sender_account_id,
        receiver_account_id,
        amount,
        fee,
        transaction_status,
        remarks
    )
    VALUES (
        p_reference_no,
        'CASH_OUT',
        p_user_account_id,
        p_agent_account_id,
        p_amount,
        p_fee,
        'SUCCESS',
        p_note
    )
    RETURNING transaction_id INTO v_tx_id;

    -- Record cash transaction
    INSERT INTO cash_transactions (
        transaction_id,
        agent_id,
        cash_type,
        commission
    )
    VALUES (
        v_tx_id,
        v_agent_id,
        'CASH_OUT',
        p_fee
    );
END;
$$;


-- ----------------------------------------------------------------------------
-- Procedure 4: sp_merchant_payment
-- Purpose: Atomically executes a QR or manual merchant payment.
-- Features:
--   - Validates active merchant
--   - Validates customer balance
--   - Debits payer and credits merchant
--   - Records in transactions and payment_transactions
--   - Auto-triggers trg_update_invoice_on_payment to mark invoice PAID if present
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_merchant_payment(
    IN p_payer_user_id UUID,
    IN p_merchant_phone VARCHAR,
    IN p_amount NUMERIC,
    IN p_note TEXT,
    IN p_invoice_number VARCHAR,
    INOUT p_reference_no VARCHAR DEFAULT NULL,
    INOUT p_merchant_name VARCHAR DEFAULT NULL,
    INOUT p_payer_account_id UUID DEFAULT NULL,
    INOUT p_merchant_account_id UUID DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_merchant_id UUID;
    v_merchant_status account_status;
    v_payer_balance NUMERIC;
    v_max_limit NUMERIC;
    v_first_acc UUID;
    v_second_acc UUID;
    v_tx_id UUID;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be greater than 0';
    END IF;

    -- Payer Account
    SELECT a.account_id INTO p_payer_account_id
    FROM users u
    JOIN accounts a ON u.user_id = a.user_id
    WHERE u.user_id = p_payer_user_id;

    IF p_payer_account_id IS NULL THEN
        RAISE EXCEPTION 'Account not found';
    END IF;

    -- Merchant
    SELECT u.full_name, m.merchant_id, COALESCE(m.business_name, u.full_name), m.status, a.account_id
    INTO p_merchant_name, v_merchant_id, p_merchant_name, v_merchant_status, p_merchant_account_id
    FROM users u
    JOIN accounts a ON u.user_id = a.user_id
    JOIN merchants m ON u.user_id = m.user_id
    WHERE u.phone_number = p_merchant_phone;

    IF p_merchant_account_id IS NULL THEN
        RAISE EXCEPTION 'Merchant not found';
    END IF;

    IF v_merchant_status IS NOT NULL AND v_merchant_status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'This merchant is not currently active';
    END IF;

    IF p_merchant_account_id = p_payer_account_id THEN
        RAISE EXCEPTION 'You cannot pay your own merchant account';
    END IF;

    -- Max limit check
    SELECT setting_value INTO v_max_limit
    FROM system_settings WHERE setting_key = 'MAX_PER_TXN_LIMIT';

    IF v_max_limit IS NOT NULL AND p_amount > v_max_limit THEN
        RAISE EXCEPTION 'Amount exceeds the maximum limit of ৳% per transaction.', v_max_limit;
    END IF;

    -- Lock accounts
    IF p_payer_account_id < p_merchant_account_id THEN
        v_first_acc := p_payer_account_id;
        v_second_acc := p_merchant_account_id;
    ELSE
        v_first_acc := p_merchant_account_id;
        v_second_acc := p_payer_account_id;
    END IF;

    PERFORM balance FROM accounts WHERE account_id = v_first_acc FOR UPDATE;
    PERFORM balance FROM accounts WHERE account_id = v_second_acc FOR UPDATE;

    -- Check balance
    SELECT balance INTO v_payer_balance FROM accounts WHERE account_id = p_payer_account_id;
    IF v_payer_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Update balances
    UPDATE accounts SET balance = balance - p_amount WHERE account_id = p_payer_account_id;
    UPDATE accounts SET balance = balance + p_amount WHERE account_id = p_merchant_account_id;

    -- Record transaction
    IF p_reference_no IS NULL OR p_reference_no = '' THEN
        p_reference_no := 'PAY' || FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::TEXT;
    END IF;

    INSERT INTO transactions (
        reference_no,
        transaction_type,
        sender_account_id,
        receiver_account_id,
        amount,
        fee,
        transaction_status,
        remarks
    )
    VALUES (
        p_reference_no,
        'MERCHANT_PAYMENT',
        p_payer_account_id,
        p_merchant_account_id,
        p_amount,
        0,
        'SUCCESS',
        p_note
    )
    RETURNING transaction_id INTO v_tx_id;

    -- Record payment subtype (Trigger will update merchant_invoices if invoice_number provided)
    INSERT INTO payment_transactions (transaction_id, merchant_id, invoice_number)
    VALUES (v_tx_id, v_merchant_id, p_invoice_number);
END;
$$;


-- ----------------------------------------------------------------------------
-- Procedure 5: sp_pay_bill
-- Purpose: Atomically pays a utility bill or service invoice.
-- Features:
--   - Resolves biller by biller_id, service_id, or phone
--   - Locks accounts and debits payer
--   - Credits biller account
--   - Records in transactions and bill_transactions tables
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_pay_bill(
    IN p_payer_user_id UUID,
    IN p_biller_id UUID,
    IN p_service_id UUID,
    IN p_biller_phone VARCHAR,
    IN p_account_number VARCHAR,
    IN p_amount NUMERIC,
    IN p_billing_month VARCHAR,
    IN p_due_date DATE,
    IN p_note TEXT,
    INOUT p_reference_no VARCHAR DEFAULT NULL,
    INOUT p_biller_name VARCHAR DEFAULT NULL,
    INOUT p_payer_account_id UUID DEFAULT NULL,
    INOUT p_biller_account_id UUID DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_actual_biller_id UUID;
    v_payer_balance NUMERIC;
    v_first_acc UUID;
    v_second_acc UUID;
    v_tx_id UUID;
    v_remarks VARCHAR;
    v_month VARCHAR;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be greater than 0';
    END IF;

    -- 1. Payer Account
    SELECT a.account_id INTO p_payer_account_id
    FROM users u
    JOIN accounts a ON u.user_id = a.user_id
    WHERE u.user_id = p_payer_user_id;

    IF p_payer_account_id IS NULL THEN
        RAISE EXCEPTION 'Payer account not found';
    END IF;

    -- 2. Resolve Biller
    IF p_biller_id IS NOT NULL THEN
        SELECT b.biller_id, u.full_name, a.account_id
        INTO v_actual_biller_id, p_biller_name, p_biller_account_id
        FROM billers b
        JOIN users u ON b.user_id = u.user_id
        JOIN accounts a ON u.user_id = a.user_id
        WHERE b.biller_id = p_biller_id;
    ELSIF p_service_id IS NOT NULL THEN
        SELECT b.biller_id, s.organization_name, a.account_id
        INTO v_actual_biller_id, p_biller_name, p_biller_account_id
        FROM services s
        JOIN billers b ON s.biller_id = b.biller_id
        JOIN users u ON b.user_id = u.user_id
        JOIN accounts a ON u.user_id = a.user_id
        WHERE s.service_id = p_service_id;
    ELSIF p_biller_phone IS NOT NULL AND p_biller_phone <> '' THEN
        SELECT b.biller_id, u.full_name, a.account_id
        INTO v_actual_biller_id, p_biller_name, p_biller_account_id
        FROM billers b
        JOIN users u ON b.user_id = u.user_id
        JOIN accounts a ON u.user_id = a.user_id
        WHERE u.phone_number = p_biller_phone;
    END IF;

    -- Fallback to any registered biller if none specified
    IF p_biller_account_id IS NULL THEN
        SELECT b.biller_id, u.full_name, a.account_id
        INTO v_actual_biller_id, p_biller_name, p_biller_account_id
        FROM billers b
        JOIN users u ON b.user_id = u.user_id
        JOIN accounts a ON u.user_id = a.user_id
        LIMIT 1;
    END IF;

    IF p_biller_account_id IS NULL THEN
        RAISE EXCEPTION 'No registered biller found to receive payment';
    END IF;

    IF p_biller_account_id = p_payer_account_id THEN
        RAISE EXCEPTION 'You cannot pay a bill to your own account';
    END IF;

    -- 3. Lock accounts in deterministic order
    IF p_payer_account_id < p_biller_account_id THEN
        v_first_acc := p_payer_account_id;
        v_second_acc := p_biller_account_id;
    ELSE
        v_first_acc := p_biller_account_id;
        v_second_acc := p_payer_account_id;
    END IF;

    PERFORM balance FROM accounts WHERE account_id = v_first_acc FOR UPDATE;
    PERFORM balance FROM accounts WHERE account_id = v_second_acc FOR UPDATE;

    -- 4. Check balance
    SELECT balance INTO v_payer_balance FROM accounts WHERE account_id = p_payer_account_id;
    IF v_payer_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- 5. Update balances
    UPDATE accounts SET balance = balance - p_amount WHERE account_id = p_payer_account_id;
    UPDATE accounts SET balance = balance + p_amount WHERE account_id = p_biller_account_id;

    -- 6. Insert transaction
    IF p_reference_no IS NULL OR p_reference_no = '' THEN
        p_reference_no := 'BIL' || FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::TEXT;
    END IF;

    v_remarks := COALESCE(p_note, CASE WHEN p_account_number IS NOT NULL AND p_account_number <> '' THEN 'Bill Acc: ' || p_account_number ELSE 'Utility Bill Payment' END);

    INSERT INTO transactions (
        reference_no,
        transaction_type,
        sender_account_id,
        receiver_account_id,
        amount,
        fee,
        transaction_status,
        remarks
    )
    VALUES (
        p_reference_no,
        'BILL_PAYMENT',
        p_payer_account_id,
        p_biller_account_id,
        p_amount,
        0,
        'SUCCESS',
        v_remarks
    )
    RETURNING transaction_id INTO v_tx_id;

    -- 7. Insert bill_transactions
    v_month := COALESCE(p_billing_month, TO_CHAR(CURRENT_DATE, 'FMMonth YYYY'));

    INSERT INTO bill_transactions (
        transaction_id,
        biller_id,
        billing_month,
        due_date
    )
    VALUES (
        v_tx_id,
        v_actual_biller_id,
        v_month,
        p_due_date
    );
END;
$$;


-- ----------------------------------------------------------------------------
-- Procedure 6: sp_toggle_user_status
-- Purpose: Admin procedure that toggles a user's status between 'ACTIVE' and
--          'BLOCKED' inside the corresponding subtype table dynamically.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_toggle_user_status(
    IN p_user_id UUID,
    INOUT p_new_status account_status DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_type account_type;
BEGIN
    SELECT account_type INTO v_type FROM accounts WHERE user_id = p_user_id;

    IF v_type IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    IF v_type = 'PERSONAL' THEN
        UPDATE personal_accounts
        SET status = CASE WHEN status = 'ACTIVE' THEN 'BLOCKED'::account_status ELSE 'ACTIVE'::account_status END
        WHERE user_id = p_user_id
        RETURNING status INTO p_new_status;
    ELSIF v_type = 'AGENT' THEN
        UPDATE agents
        SET status = CASE WHEN status = 'ACTIVE' THEN 'BLOCKED'::account_status ELSE 'ACTIVE'::account_status END
        WHERE user_id = p_user_id
        RETURNING status INTO p_new_status;
    ELSIF v_type = 'BUSINESS' THEN
        UPDATE merchants
        SET status = CASE WHEN status = 'ACTIVE' THEN 'BLOCKED'::account_status ELSE 'ACTIVE'::account_status END
        WHERE user_id = p_user_id
        RETURNING status INTO p_new_status;
    ELSIF v_type = 'BILLER' THEN
        UPDATE billers
        SET status = CASE WHEN status = 'ACTIVE' THEN 'BLOCKED'::account_status ELSE 'ACTIVE'::account_status END
        WHERE user_id = p_user_id
        RETURNING status INTO p_new_status;
    ELSE
        RAISE EXCEPTION 'Cannot update status for account type %', v_type;
    END IF;
END;
$$;



-- ============================================================================
-- SECTION 3: TRIGGERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Trigger 1: trg_prevent_negative_balance
-- Event: BEFORE UPDATE OR INSERT ON accounts
-- Purpose: Enforces financial integrity at the database layer by raising an
--          exception if any wallet balance drops below ৳0.00.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_prevent_negative_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.balance < 0 THEN
        RAISE EXCEPTION 'Database Constraint Violation: Account balance cannot be negative (Attempted: ৳%)', NEW.balance;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_negative_balance ON accounts;
CREATE TRIGGER trg_prevent_negative_balance
BEFORE UPDATE OR INSERT ON accounts
FOR EACH ROW
EXECUTE FUNCTION fn_prevent_negative_balance();


-- ----------------------------------------------------------------------------
-- Trigger 2: trg_update_invoice_on_payment
-- Event: AFTER INSERT ON payment_transactions
-- Purpose: Automatically marks a merchant invoice as 'PAID' and sets paid_at
--          whenever a payment transaction referencing an invoice_number is created.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_update_invoice_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.invoice_number IS NOT NULL AND NEW.invoice_number <> '' THEN
        UPDATE merchant_invoices
        SET status = 'PAID', paid_at = CURRENT_TIMESTAMP
        WHERE invoice_number = NEW.invoice_number
          AND merchant_id = NEW.merchant_id
          AND status <> 'PAID';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_invoice_on_payment ON payment_transactions;
CREATE TRIGGER trg_update_invoice_on_payment
AFTER INSERT ON payment_transactions
FOR EACH ROW
EXECUTE FUNCTION fn_update_invoice_on_payment();


-- ----------------------------------------------------------------------------
-- Trigger 3: trg_auto_audit_transaction
-- Event: AFTER INSERT ON transactions
-- Purpose: Real-time fraud detection and risk logging. Automatically writes
--          alerts into audit_logs for transactions >= ৳50,000 or failed transactions.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_auto_audit_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.amount >= 50000.00 THEN
        INSERT INTO audit_logs (admin_id, affected_user_id, transaction_id, action, description)
        VALUES (
            NULL,
            (SELECT user_id FROM accounts WHERE account_id = NEW.sender_account_id),
            NEW.transaction_id,
            'FLAGGED_LARGE_TRANSACTION',
            'Automated risk alert: Large transaction of ৳' || NEW.amount || ' (' || NEW.transaction_type || ')'
        );
    ELSIF NEW.transaction_status = 'FAILED' THEN
        INSERT INTO audit_logs (admin_id, affected_user_id, transaction_id, action, description)
        VALUES (
            NULL,
            (SELECT user_id FROM accounts WHERE account_id = NEW.sender_account_id),
            NEW.transaction_id,
            'FLAGGED_FAILED_TRANSACTION',
            'Automated alert: Transaction failed with remarks: ' || COALESCE(NEW.remarks, 'None')
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_audit_transaction ON transactions;
CREATE TRIGGER trg_auto_audit_transaction
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION fn_auto_audit_transaction();


-- ----------------------------------------------------------------------------
-- Trigger 4 & 5: trg_users_updated_at & trg_accounts_updated_at
-- Event: BEFORE UPDATE ON users / accounts
-- Purpose: Automatically keeps the updated_at timestamp current on record updates.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_accounts_updated_at ON accounts;
CREATE TRIGGER trg_accounts_updated_at
BEFORE UPDATE ON accounts
FOR EACH ROW
EXECUTE FUNCTION fn_update_timestamp();
