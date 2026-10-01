-- QuickiePay
-- PostgreSQL Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- ENUM TYPES
CREATE TYPE account_type AS ENUM
(
    'PERSONAL',
    'BUSINESS',
    'BILLER',
    'AGENT',
    'ADMIN'
);

CREATE TYPE account_status AS ENUM
(
    'ACTIVE',
    'BLOCKED',
    'CLOSED'
);

CREATE TYPE transaction_type AS ENUM
(
    'SEND_MONEY',
    'CASH_IN',
    'CASH_OUT',
    'MERCHANT_PAYMENT',
    'BILL_PAYMENT',
    'ADD_MONEY',
    'MOBILE_RECHARGE'
);

CREATE TYPE transaction_status AS ENUM
(
    'PENDING',
    'SUCCESS',
    'FAILED',
    'CANCELLED'
);

CREATE TYPE biller_service AS ENUM
(
    'ELECTRICITY',
    'GAS',
    'WATER',
    'INTERNET',
    'MOBILE',
    'EDUCATION',
    'INSURANCE',
    'OTHER'
);

-- USERS (Supertype)
CREATE TABLE users
(
    user_id UUID PRIMARY KEY
        DEFAULT uuid_generate_v4(),

    full_name VARCHAR(100) NOT NULL,

    phone_number VARCHAR(15)
        UNIQUE NOT NULL,

    email VARCHAR(100)
        UNIQUE,

    pin_hash TEXT NOT NULL,

    national_id VARCHAR(25)
        UNIQUE,

    created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE accounts
(
    account_id UUID PRIMARY KEY
        DEFAULT uuid_generate_v4(),

    user_id UUID NOT NULL,

    
    account_type account_type
        DEFAULT 'PERSONAL',

    balance NUMERIC(15,2)
        DEFAULT 0
        CHECK(balance >= 0),

    --daily_limit NUMERIC(15,2)             LIMITS VARY WITH ACCOUNT TYPE
    --    DEFAULT 50000,


    FOREIGN KEY(user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);
-- USER SUBTYPES

CREATE TABLE personal_accounts
(
    personal_account_id UUID PRIMARY KEY 
        DEFAULT uuid_generate_v4(),

    user_id UUID UNIQUE NOT NULL,

    created_at TIMESTAMP 
        DEFAULT CURRENT_TIMESTAMP,

    status account_status
    DEFAULT 'ACTIVE',

    FOREIGN KEY(user_id) 
        REFERENCES users(user_id) 
        ON DELETE CASCADE
);

CREATE TABLE admins
(
    admin_id UUID PRIMARY KEY
        DEFAULT uuid_generate_v4(),

    user_id UUID UNIQUE NOT NULL,

    role VARCHAR(40) NOT NULL,

    permission_level SMALLINT
        DEFAULT 1,

    created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE agents
(
    agent_id UUID PRIMARY KEY
        DEFAULT uuid_generate_v4(),

    user_id UUID UNIQUE NOT NULL,

    business_name VARCHAR(150) NOT NULL,

    commission_rate NUMERIC(5,2)
        DEFAULT 1.50
        CHECK (commission_rate >= 0),
        
    status account_status
        DEFAULT 'ACTIVE',

    created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,


    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE merchants
(
    merchant_id UUID PRIMARY KEY
        DEFAULT uuid_generate_v4(),

    user_id UUID UNIQUE NOT NULL,

    business_name VARCHAR(150) NOT NULL,

    trade_license VARCHAR(50),

    status account_status
        DEFAULT 'ACTIVE',

    created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE billers
(
    biller_id UUID PRIMARY KEY
        DEFAULT uuid_generate_v4(),

    user_id UUID UNIQUE NOT NULL,

    status account_status
        DEFAULT 'ACTIVE',

    created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

    approved_by UUID,

    FOREIGN KEY(user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_biller_admin 
        FOREIGN KEY (approved_by) 
        REFERENCES admins(admin_id) 
        ON DELETE SET NULL
);

CREATE TABLE services
(
    service_id UUID PRIMARY KEY 
        DEFAULT uuid_generate_v4(), -- Added a PK for good practice

    biller_id UUID NOT NULL, -- Links back to the Biller

    service_name biller_service NOT NULL, -- Renamed to match ERD

    organization_name VARCHAR(150) NOT NULL,

    FOREIGN KEY(biller_id) 
        REFERENCES billers(biller_id) 
        ON DELETE CASCADE
);



-- =============================================================
-- TRANSACTIONS (SUPERTYPE)
-- =============================================================

CREATE TABLE transactions
(
    transaction_id UUID PRIMARY KEY
        DEFAULT uuid_generate_v4(),

    reference_no VARCHAR(25)
        UNIQUE NOT NULL,

    transaction_type transaction_type
        NOT NULL,

    sender_account_id UUID
        NOT NULL,

    receiver_account_id UUID
        NOT NULL,

    amount NUMERIC(15,2)
        NOT NULL
        CHECK (amount > 0),

    fee NUMERIC(15,2)
        DEFAULT 0
        CHECK (fee >= 0),

    transaction_status transaction_status
        DEFAULT 'PENDING',

    remarks VARCHAR(255),

    transaction_time TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(sender_account_id)
        REFERENCES accounts(account_id)
        ON DELETE RESTRICT,
    FOREIGN KEY(receiver_account_id)
        REFERENCES accounts(account_id),

    CHECK(sender_account_id <> receiver_account_id)
);

CREATE TABLE mobile_recharge_transactions
(
    recharge_id UUID PRIMARY KEY
        DEFAULT uuid_generate_v4(),

    account_id UUID NOT NULL
        REFERENCES accounts(account_id)
        ON DELETE RESTRICT,

    reference_no VARCHAR(25)
        UNIQUE NOT NULL,

    operator VARCHAR(20) NOT NULL
        CHECK (operator IN ('Grameenphone', 'Robi', 'Teletalk', 'Banglalink', 'Airtel')),

    phone_number VARCHAR(11) NOT NULL
        CHECK (phone_number ~ '^01[0-9]{9}$'),

    amount NUMERIC(15,2) NOT NULL
        CHECK (amount > 0),

    transaction_time TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================
-- SEND MONEY TRANSACTIONS
-- =============================================================

-- =============================================================
-- CASH TRANSACTIONS
-- Used for both CASH_IN and CASH_OUT
-- =============================================================

CREATE TABLE cash_transactions
(
    transaction_id UUID PRIMARY KEY,

    agent_id UUID NOT NULL,

    cash_type VARCHAR(10)
        NOT NULL
        CHECK (cash_type IN ('CASH_IN','CASH_OUT')),

    commission NUMERIC(15,2)
        DEFAULT 0
        CHECK (commission >= 0),

    FOREIGN KEY(transaction_id)
        REFERENCES transactions(transaction_id)
        ON DELETE CASCADE,

    FOREIGN KEY(agent_id)
        REFERENCES agents(agent_id)
        ON DELETE RESTRICT
);

-- =============================================================
-- MERCHANT PAYMENTS
-- =============================================================

CREATE TABLE payment_transactions
(
    transaction_id UUID PRIMARY KEY,

    merchant_id UUID NOT NULL,

    invoice_number VARCHAR(50),

    FOREIGN KEY(transaction_id)
        REFERENCES transactions(transaction_id)
        ON DELETE CASCADE,

    FOREIGN KEY(merchant_id)
        REFERENCES merchants(merchant_id)
        ON DELETE RESTRICT
);

-- =============================================================
-- BILL PAYMENTS
-- =============================================================

CREATE TABLE bill_transactions
(
    transaction_id UUID PRIMARY KEY,

    biller_id UUID NOT NULL,

    billing_month VARCHAR(20),

    due_date DATE,

    FOREIGN KEY(transaction_id)
        REFERENCES transactions(transaction_id)
        ON DELETE CASCADE,

    FOREIGN KEY(biller_id)
        REFERENCES billers(biller_id)
        ON DELETE RESTRICT
);

-- =============================================================
-- AUDIT LOGS
-- =============================================================

CREATE TABLE audit_logs
(
    log_id UUID PRIMARY KEY
        DEFAULT uuid_generate_v4(),

    admin_id UUID,

    affected_user_id UUID,

    transaction_id UUID,

    action VARCHAR(100) NOT NULL,

    description TEXT,

    ip_address VARCHAR(45),

    log_time TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(admin_id)
        REFERENCES admins(admin_id)
        ON DELETE SET NULL,

    FOREIGN KEY(affected_user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    FOREIGN KEY(transaction_id)
        REFERENCES transactions(transaction_id)
        ON DELETE SET NULL
);

CREATE TABLE system_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value NUMERIC(15,2) NOT NULL,
    description VARCHAR(255)
);

-- Add approval tracking to Agents
ALTER TABLE agents
ADD COLUMN approved_by UUID,
ADD CONSTRAINT fk_agent_admin 
    FOREIGN KEY (approved_by) 
    REFERENCES admins(admin_id) 
    ON DELETE SET NULL;

-- Add approval tracking to Merchants
ALTER TABLE merchants
ADD COLUMN approved_by UUID,
ADD CONSTRAINT fk_merchant_admin 
    FOREIGN KEY (approved_by) 
    REFERENCES admins(admin_id) 
    ON DELETE SET NULL;


-- =============================================================
-- INDEXES
-- =============================================================

CREATE INDEX idx_accounts_user
ON accounts(user_id);


CREATE INDEX idx_transactions_sender
ON transactions(sender_account_id);

CREATE INDEX idx_transactions_receiver
ON transactions(receiver_account_id);

CREATE INDEX idx_transactions_time
ON transactions(transaction_time);

CREATE INDEX idx_cash_agent
ON cash_transactions(agent_id);

CREATE INDEX idx_merchant_payment ON payment_transactions(merchant_id);
CREATE INDEX idx_bill_payment ON bill_transactions(biller_id);

CREATE INDEX idx_audit_admin
ON audit_logs(admin_id);

CREATE INDEX idx_audit_transaction
ON audit_logs(transaction_id);

-- -- =============================================================
-- -- AUTO UPDATE updated_at
-- -- =============================================================

-- CREATE OR REPLACE FUNCTION update_timestamp()
-- RETURNS TRIGGER
-- AS
-- $$
-- BEGIN
--     NEW.updated_at = CURRENT_TIMESTAMP;
--     RETURN NEW;
-- END;
-- $$
-- LANGUAGE plpgsql;

-- CREATE TRIGGER trg_users_updated_at
-- BEFORE UPDATE
-- ON users
-- FOR EACH ROW
-- EXECUTE FUNCTION update_timestamp();

-- -- =============================================================
-- -- VIEW : TRANSACTION HISTORY
-- -- =============================================================

-- CREATE VIEW transaction_history AS
-- SELECT
--     t.transaction_id,
--     t.reference_no,
--     t.transaction_type,
--     u.full_name AS sender_name,
--     a.account_number AS sender_account,
--     t.amount,
--     t.fee,
--     t.status,
--     t.transaction_time
-- FROM transactions t
-- JOIN accounts a
--     ON t.sender_account_id = a.account_id
-- JOIN users u
--     ON a.user_id = u.user_id;

-- -- =============================================================
-- -- VIEW : ACCOUNT SUMMARY
-- -- =============================================================

-- CREATE VIEW account_summary AS
-- SELECT
--     u.user_id,
--     u.full_name,
--     u.phone_number,
--     a.account_number,
--     a.balance,
--     a.status,
--     a.account_type
-- FROM users u
-- JOIN accounts a
-- ON u.user_id = a.user_id;

-- -- =============================================================
-- -- COMMENTS
-- -- =============================================================

-- COMMENT ON TABLE users IS
-- 'Stores all QuickiePay users. Agents, Merchants, Billers and Admins are specialized user roles.';

-- COMMENT ON TABLE accounts IS
-- 'Wallet accounts owned by users.';

-- COMMENT ON TABLE transactions IS
-- 'Superclass table containing common information for all financial transactions.';

-- COMMENT ON TABLE send_money_transactions IS
-- 'Additional attributes for person-to-person money transfers.';

-- COMMENT ON TABLE cash_transactions IS
-- 'Cash In and Cash Out transactions performed through agents.';

-- COMMENT ON TABLE merchant_payment_transactions IS
-- 'Payments made to registered merchants.';

-- COMMENT ON TABLE bill_payment_transactions IS
-- 'Payments made to registered billers.';

-- COMMENT ON TABLE audit_logs IS
-- 'Administrative activity log for auditing purposes.';

-- =============================================================
-- PROCEDURES, TRIGGERS & FUNCTIONS
-- (See SQL/procedures_and_triggers.sql for full detailed script)
-- =============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Functions
CREATE OR REPLACE FUNCTION fn_calculate_fee(p_txn_type transaction_type, p_amount NUMERIC)
RETURNS NUMERIC LANGUAGE plpgsql AS $$
DECLARE v_fee NUMERIC := 0.00; v_flat_fee NUMERIC; v_pct_fee NUMERIC;
BEGIN
    IF p_txn_type = 'SEND_MONEY' THEN
        SELECT setting_value INTO v_flat_fee FROM system_settings WHERE setting_key = 'SEND_MONEY_FLAT_FEE';
        v_fee := COALESCE(v_flat_fee, 5.00);
    ELSIF p_txn_type = 'CASH_OUT' THEN
        SELECT setting_value INTO v_pct_fee FROM system_settings WHERE setting_key = 'CASH_OUT_FEE_PCT';
        v_fee := ROUND((p_amount * COALESCE(v_pct_fee, 1.85) / 100.0), 2);
    END IF;
    RETURN v_fee;
END;
$$;

CREATE OR REPLACE FUNCTION fn_check_daily_limit(p_account_id UUID, p_amount NUMERIC)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE v_daily_limit NUMERIC; v_current_total NUMERIC;
BEGIN
    SELECT setting_value INTO v_daily_limit FROM system_settings WHERE setting_key = 'DAILY_TXN_LIMIT';
    v_daily_limit := COALESCE(v_daily_limit, 50000.00);
    SELECT COALESCE(SUM(amount), 0) INTO v_current_total FROM transactions
    WHERE sender_account_id = p_account_id AND DATE(transaction_time) = CURRENT_DATE AND transaction_status = 'SUCCESS';
    RETURN (v_current_total + p_amount) <= v_daily_limit;
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_monthly_spending(p_account_id UUID, p_month INT, p_year INT)
RETURNS NUMERIC LANGUAGE plpgsql AS $$
DECLARE v_total NUMERIC;
BEGIN
    SELECT COALESCE(SUM(amount + fee), 0) INTO v_total FROM transactions
    WHERE sender_account_id = p_account_id AND EXTRACT(MONTH FROM transaction_time) = p_month
      AND EXTRACT(YEAR FROM transaction_time) = p_year AND transaction_status = 'SUCCESS';
    RETURN v_total;
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_user_account_status(p_user_id UUID)
RETURNS account_status LANGUAGE plpgsql AS $$
DECLARE v_status account_status;
BEGIN
    SELECT COALESCE(pa.status, ag.status, m.status, b.status, 'ACTIVE'::account_status) INTO v_status
    FROM users u LEFT JOIN personal_accounts pa ON u.user_id = pa.user_id
    LEFT JOIN agents ag ON u.user_id = ag.user_id LEFT JOIN merchants m ON u.user_id = m.user_id
    LEFT JOIN billers b ON u.user_id = b.user_id WHERE u.user_id = p_user_id;
    RETURN v_status;
END;
$$;

-- Triggers
CREATE OR REPLACE FUNCTION fn_prevent_negative_balance() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.balance < 0 THEN
        RAISE EXCEPTION 'Database Constraint Violation: Account balance cannot be negative (Attempted: ৳%)', NEW.balance;
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_prevent_negative_balance ON accounts;
CREATE TRIGGER trg_prevent_negative_balance BEFORE UPDATE OR INSERT ON accounts FOR EACH ROW EXECUTE FUNCTION fn_prevent_negative_balance();

CREATE OR REPLACE FUNCTION fn_update_invoice_on_payment() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.invoice_number IS NOT NULL AND NEW.invoice_number <> '' THEN
        UPDATE merchant_invoices SET status = 'PAID', paid_at = CURRENT_TIMESTAMP
        WHERE invoice_number = NEW.invoice_number AND merchant_id = NEW.merchant_id AND status <> 'PAID';
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_update_invoice_on_payment ON payment_transactions;
CREATE TRIGGER trg_update_invoice_on_payment AFTER INSERT ON payment_transactions FOR EACH ROW EXECUTE FUNCTION fn_update_invoice_on_payment();

CREATE OR REPLACE FUNCTION fn_auto_audit_transaction() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.amount >= 50000.00 THEN
        INSERT INTO audit_logs (admin_id, affected_user_id, transaction_id, action, description)
        VALUES (NULL, (SELECT user_id FROM accounts WHERE account_id = NEW.sender_account_id), NEW.transaction_id, 'FLAGGED_LARGE_TRANSACTION', 'Automated risk alert: Large transaction of ৳' || NEW.amount);
    ELSIF NEW.transaction_status = 'FAILED' THEN
        INSERT INTO audit_logs (admin_id, affected_user_id, transaction_id, action, description)
        VALUES (NULL, (SELECT user_id FROM accounts WHERE account_id = NEW.sender_account_id), NEW.transaction_id, 'FLAGGED_FAILED_TRANSACTION', 'Automated alert: Transaction failed: ' || COALESCE(NEW.remarks, 'None'));
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_auto_audit_transaction ON transactions;
CREATE TRIGGER trg_auto_audit_transaction AFTER INSERT ON transactions FOR EACH ROW EXECUTE FUNCTION fn_auto_audit_transaction();

CREATE OR REPLACE FUNCTION fn_update_timestamp() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
DROP TRIGGER IF EXISTS trg_accounts_updated_at ON accounts;
CREATE TRIGGER trg_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
