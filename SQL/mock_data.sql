-- ====================================================================
-- 1. INSERT MOCK USERS (Supertype)
-- Hardcoded UUIDs for precise relational mapping
-- ====================================================================
INSERT INTO users (user_id, full_name, phone_number, email, pin_hash, national_id) VALUES 
('00000000-0000-0000-0000-000000000000', 'Takvir Tur', '01500000000', 'admin@quickiepay.com', 'hashed_pin_1234', 'NID-0000000001'),
('11111111-1111-1111-1111-111111111111', 'Rafiqul Islam', '01711111111', 'rafiq@example.com', 'hashed_pin_1234', 'NID-1111111111'),
('22222222-2222-2222-2222-222222222222', 'Tariq Mahmud', '01822222222', 'tariq@example.com', 'hashed_pin_1234', 'NID-2222222222'),
('33333333-3333-3333-3333-333333333333', 'Nadia Rahman', '01933333333', 'nadia@example.com', 'hashed_pin_1234', 'NID-3333333333'),
('44444444-4444-4444-4444-444444444444', 'Desco Official', '01344444444', 'billing@desco.org.bd', 'hashed_pin_1234', 'NID-4444444444');


-- ====================================================================
-- 2. INSERT ADMIN SUBTYPE 
-- Must be created first so they can "approve" the agents and merchants
-- ====================================================================
INSERT INTO admins (admin_id, user_id, role, permission_level) VALUES 
('a0000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'SUPER_ADMIN', 5);


-- ====================================================================
-- 3. INSERT OTHER USER SUBTYPES (1:1 Relationships)
-- ====================================================================
-- Personal Account (Customer)
INSERT INTO personal_accounts (user_id, status) VALUES 
('11111111-1111-1111-1111-111111111111', 'ACTIVE');

-- Agent 
INSERT INTO agents (agent_id, user_id, business_name, commission_rate, approved_by) VALUES 
('c2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Bhaiya Telecom MFS', 1.50, 'a0000000-0000-0000-0000-000000000000');

-- Merchant
INSERT INTO merchants (merchant_id, user_id, business_name, trade_license, approved_by) VALUES 
('c3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Kacchi Bhai Mirpur', 'TRAD-998877', 'a0000000-0000-0000-0000-000000000000');

-- Biller
INSERT INTO billers (biller_id, user_id, approved_by) VALUES 
('c4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'a0000000-0000-0000-0000-000000000000');


-- ====================================================================
-- 4. INSERT ACCOUNTS (The Wallets)
-- Notice the account_type matches your ENUM exactly
-- ====================================================================
INSERT INTO accounts (account_id, user_id, account_type, balance) VALUES
('b0000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'ADMIN', 9999999.00),
('b1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'PERSONAL', 5000.00),
('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'AGENT', 50000.00),
('b3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'BUSINESS', 15000.00),
('b4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'BILLER', 0.00);


-- ====================================================================
-- 5. INSERT BILLER SERVICES
-- Links to the biller_id and uses your biller_service ENUM
-- ====================================================================
INSERT INTO services (biller_id, service_name, organization_name) VALUES 
('c4444444-4444-4444-4444-444444444444', 'ELECTRICITY', 'DESCO Dhaka North');