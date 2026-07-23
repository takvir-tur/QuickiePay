-- QuickiePay
-- PostgreSQL Schema

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
    'MOBILE RECHARGE'
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

-- USER SUBTYPES

CREATE TABLE agents
(
    agent_id UUID PRIMARY KEY
        DEFAULT uuid_generate_v4(),

    user_id UUID UNIQUE NOT NULL,

    business_name VARCHAR(150) NOT NULL,

    commission_rate NUMERIC(5,2)
        DEFAULT 1.50
        CHECK (commission_rate >= 0),

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

    FOREIGN KEY(user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE billers
(
    biller_id UUID PRIMARY KEY
        DEFAULT uuid_generate_v4(),

    user_id UUID UNIQUE NOT NULL,

    service_type biller_service NOT NULL,

    organization_name VARCHAR(150) NOT NULL,

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

    FOREIGN KEY(user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- ACCOUNTS

CREATE TABLE accounts
(
    account_id UUID PRIMARY KEY
        DEFAULT uuid_generate_v4(),

    user_id UUID NOT NULL,

    account_number VARCHAR(20)
        UNIQUE NOT NULL,

    account_type account_type
        DEFAULT 'PERSONAL',

    balance NUMERIC(15,2)
        DEFAULT 0
        CHECK(balance >= 0),

    --daily_limit NUMERIC(15,2)             LIMITS VARY WITH ACCOUNT TYPE
    --    DEFAULT 50000,

    status account_status
        DEFAULT 'ACTIVE',

    created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(user_id)
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

    status transaction_status
        DEFAULT 'PENDING',

    remarks VARCHAR(255),

    transaction_time TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(sender_account_id)
        REFERENCES accounts(account_id)
        ON DELETE RESTRICT
    FOREIGN KEY(receiver_account_id)
        REFERENCES accounts(account_id),

    CHECK(sender_account_id <> receiver_account_id)
);

-- =============================================================
-- SEND MONEY TRANSACTIONS
-- =============================================================

CREATE TABLE send_money_transactions
(
    transaction_id UUID PRIMARY KEY,

    receiver_account_id UUID NOT NULL,

    FOREIGN KEY(transaction_id)
        REFERENCES transactions(transaction_id)
        ON DELETE CASCADE,

    FOREIGN KEY(receiver_account_id)
        REFERENCES accounts(account_id)
        ON DELETE RESTRICT,

    CHECK (receiver_account_id IS NOT NULL)
);

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

CREATE TABLE merchant_payment_transactions
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

CREATE TABLE bill_payment_transactions
(
    transaction_id UUID PRIMARY KEY,

    biller_id UUID NOT NULL,

    bill_number VARCHAR(50) NOT NULL,

    customer_reference VARCHAR(100),

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

-- =============================================================
-- INDEXES
-- =============================================================

CREATE INDEX idx_accounts_user
ON accounts(user_id);

CREATE INDEX idx_accounts_number
ON accounts(account_number);

CREATE INDEX idx_transactions_sender
ON transactions(sender_account_id);

CREATE INDEX idx_transactions_reference
ON transactions(reference_no);

CREATE INDEX idx_transactions_time
ON transactions(transaction_time);

CREATE INDEX idx_transactions_status
ON transactions(status);

CREATE INDEX idx_send_money_receiver
ON send_money_transactions(receiver_account_id);

CREATE INDEX idx_cash_agent
ON cash_transactions(agent_id);

CREATE INDEX idx_merchant_payment
ON merchant_payment_transactions(merchant_id);

CREATE INDEX idx_bill_payment
ON bill_payment_transactions(biller_id);

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