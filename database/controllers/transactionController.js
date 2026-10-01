const pool = require('../db_connection');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getSystemConfigs } = require('../utils/configHelper');


async function makePayment(req, res) {
  const payerUserId = req.user.user_id;
  const { merchant_phone, amount, pin, note, invoice_number } = req.body;

  if (!merchant_phone || !amount || !pin) {
    return res.status(400).json({
      error: 'Merchant phone, amount and PIN are required'
    });
  }

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' });
  }

  const client = await pool.connect();

  try {
    // 1. Verify Payer PIN
    const payerResult = await client.query(`
      SELECT pin_hash FROM users WHERE user_id = $1
    `, [payerUserId]);

    if (payerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const isPinValid = await bcrypt.compare(pin, payerResult.rows[0].pin_hash);
    if (!isPinValid) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // 2. Execute Stored Procedure: sp_merchant_payment
    // (Also invokes trigger trg_update_invoice_on_payment automatically)
    await client.query('BEGIN');
    const spResult = await client.query(
      'CALL sp_merchant_payment($1, $2, $3, $4, $5, NULL, NULL, NULL, NULL)',
      [payerUserId, merchant_phone, numericAmount, note || null, invoice_number || null]
    );
    await client.query('COMMIT');

    const { p_reference_no, p_merchant_name } = spResult.rows[0];

    res.status(200).json({
      message: 'Payment successful',
      referenceNo: p_reference_no,
      merchant: p_merchant_name,
      amount: numericAmount
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Make Payment Error:', err.message);
    const msg = err.message || 'Payment failed';
    if (msg.includes('Insufficient') || msg.includes('Merchant not found') || msg.includes('limit') || msg.includes('own merchant') || msg.includes('active')) {
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: 'Payment failed: ' + msg });
  } finally {
    client.release();
  }
}

async function getMerchantLookup(req, res) {
  const { phone } = req.params;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    const result = await pool.query(
      `SELECT
        u.user_id,
        u.full_name,
        u.phone_number,
        m.merchant_id,
        m.business_name,
        m.trade_license,
        m.status
      FROM users u
      JOIN merchants m ON u.user_id = m.user_id
      WHERE u.phone_number = $1`,
      [phone]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Active merchant not found with this phone number' });
    }

    const merchant = result.rows[0];
    if (merchant.status && merchant.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'This merchant account is currently inactive' });
    }

    res.json({
      full_name: merchant.full_name,
      business_name: merchant.business_name,
      phone_number: merchant.phone_number,
      merchant_id: merchant.merchant_id
    });
  } catch (err) {
    console.error('Merchant Lookup Error:', err.message);
    res.status(500).json({ error: 'Failed to look up merchant' });
  }
}


async function sendMoney(req, res) {
  const senderUserId = req.user.user_id; 
  const { receiver_phone, amount, pin, note } = req.body;
  
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' });
  }

  const client = await pool.connect();
  
  try {
    // 1. Verify Sender PIN
    const senderResult = await client.query(`
      SELECT pin_hash FROM users WHERE user_id = $1
    `, [senderUserId]);
    
    if (senderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sender not found' });
    }

    const isPinValid = await bcrypt.compare(pin, senderResult.rows[0].pin_hash);
    if (!isPinValid) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // 2. Execute Stored Procedure: sp_send_money
    // (Handles limit checks via fn_check_daily_limit, fee via fn_calculate_fee, locking, and balance updates)
    await client.query("BEGIN");
    const spResult = await client.query(
      'CALL sp_send_money($1, $2, $3, $4, NULL, NULL, NULL, NULL, NULL)',
      [senderUserId, receiver_phone, numericAmount, note || null]
    );
    await client.query("COMMIT");

    const { p_reference_no, p_fee, p_total_deduction } = spResult.rows[0];

    res.status(200).json({
      message: 'Money sent successfully',
      referenceNo: p_reference_no,
      amount: numericAmount,
      fee: parseFloat(p_fee),
      totalDeduction: parseFloat(p_total_deduction)
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Send Money Error:', err.message);
    const msg = err.message || 'Transaction failed';
    if (msg.includes('Insufficient') || msg.includes('Receiver not found') || msg.includes('limit') || msg.includes('yourself')) {
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: 'Transaction failed: ' + msg });
  } finally {
    client.release();
  }
}
// =====================================================
// CASH IN
// Agent gives digital money to customer
// Customer balance + amount
// Agent balance - amount
// Commission = 0
// =====================================================

async function cashIn(req, res) {
  const agentUserId = req.user.user_id;

  const {
    customer_phone,
    amount,
    pin,
    note
  } = req.body;

  if (!customer_phone || !amount || !pin) {
    return res.status(400).json({
      error: 'Customer phone, amount and PIN are required'
    });
  }

  const numericAmount = parseFloat(amount);

  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({
      error: 'Amount must be greater than 0'
    });
  }

  const client = await pool.connect();

  try {
    // 1. Verify Agent PIN
    const agentResult = await client.query(`
      SELECT pin_hash FROM users WHERE user_id = $1
    `, [agentUserId]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const isPinValid = await bcrypt.compare(pin, agentResult.rows[0].pin_hash);
    if (!isPinValid) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // 2. Fetch Customer Name for Response
    const custRes = await client.query('SELECT full_name FROM users WHERE phone_number = $1', [customer_phone]);
    const customerName = custRes.rows[0]?.full_name || customer_phone;

    // 3. Execute Stored Procedure: sp_cash_in
    await client.query('BEGIN');
    const spResult = await client.query(
      'CALL sp_cash_in($1, $2, $3, $4, NULL, NULL, NULL)',
      [agentUserId, customer_phone, numericAmount, note || null]
    );
    await client.query('COMMIT');

    const { p_reference_no } = spResult.rows[0];

    res.status(200).json({
      message: 'Cash In successful',
      referenceNo: p_reference_no,
      reference_no: p_reference_no,
      customer: customerName,
      amount: numericAmount,
      commission: 0
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cash In Error:', err.message);
    const msg = err.message || 'Cash In transaction failed';
    if (msg.includes('Insufficient') || msg.includes('Customer not found') || msg.includes('active') || msg.includes('own account') || msg.includes('registered as an agent')) {
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: msg });
  } finally {
    client.release();
  }
}


// =====================================================
// CASH OUT
// Customer gives digital money to agent
// Customer balance - (amount + commission)
// Agent balance + (amount + commission) [money with charge sent to agent]
// Agent earns commission
// =====================================================

const cashOut = async (req, res) => {
    const client = await pool.connect();

    try {
        // Logged-in user (Customer)
        const userId = req.user.user_id;

        const {
            agent_phone,
            amount,
            pin,
            note
        } = req.body;

        // 1. Basic validation
        if (!agent_phone || !amount || !pin) {
            return res.status(400).json({
                error: "Agent number, amount and PIN are required"
            });
        }

        const numericAmount = Number(amount);

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                error: "Invalid amount"
            });
        }

        // 2. Get user's account & verify PIN
        const userResult = await client.query(
            `SELECT pin_hash FROM users WHERE user_id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: "User account not found"
            });
        }

        const isPinValid = await bcrypt.compare(
            pin,
            userResult.rows[0].pin_hash
        );

        if (!isPinValid) {
            return res.status(401).json({
                error: "Invalid PIN"
            });
        }

        // 3. Lookup Agent info for response object
        const agentResult = await client.query(
            `SELECT u.full_name, u.phone_number, a.business_name
             FROM users u
             JOIN agents a ON u.user_id = a.user_id
             WHERE u.phone_number = $1`,
            [agent_phone]
        );

        const agent = agentResult.rows[0] || {
            full_name: 'Agent',
            phone_number: agent_phone,
            business_name: 'Agent Point'
        };

        // 4. Execute Stored Procedure: sp_cash_out
        // (Handles limit checks, percentage fee via fn_calculate_fee, locking, and balance updates)
        await client.query("BEGIN");
        const spResult = await client.query(
            'CALL sp_cash_out($1, $2, $3, $4, NULL, NULL, NULL, NULL, NULL)',
            [userId, agent_phone, numericAmount, note || null]
        );
        await client.query("COMMIT");

        const { p_reference_no, p_fee, p_total_deduction } = spResult.rows[0];

        return res.status(200).json({
            message: "Cash out successful",
            referenceNo: p_reference_no,
            reference_no: p_reference_no,
            amount: numericAmount,
            charge: parseFloat(p_fee), 
            commission: parseFloat(p_fee), 
            totalDeduction: parseFloat(p_total_deduction),
            agent: {
                name: agent.full_name,
                phone: agent.phone_number,
                businessName: agent.business_name
            }
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Cash Out Error:", error);
        const msg = error.message || "Cash out failed";
        if (msg.includes('Insufficient') || msg.includes('not found') || msg.includes('limit') || msg.includes('yourself')) {
            return res.status(400).json({ error: msg });
        }
        return res.status(500).json({
            error: "Cash out failed",
            details: msg
        });

    } finally {
        client.release();
    }
};

// =====================================================
// AGENT LOOKUP FOR CASH OUT
// =====================================================

async function getAgentLookup(req, res) {
  const { phone } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        u.user_id,
        u.full_name,
        u.phone_number,
        acc.account_id,
        ag.agent_id,
        ag.business_name,
        ag.commission_rate,
        ag.status
      FROM users u
      JOIN accounts acc ON u.user_id = acc.user_id
      JOIN agents ag ON u.user_id = ag.user_id
      WHERE u.phone_number = $1
    `, [phone]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = result.rows[0];
    if (agent.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Agent account is not active' });
    }

    if (agent.user_id === req.user.user_id) {
      return res.status(400).json({ error: 'You cannot cash out to yourself' });
    }

    res.json({
      name: agent.full_name,
      businessName: agent.business_name,
      phoneNumber: agent.phone_number,
      commissionRate: parseFloat(agent.commission_rate) || 1.50
    });
  } catch (err) {
    console.error('Agent lookup error:', err.message);
    res.status(500).json({ error: 'Failed to look up agent' });
  }
}

async function getTransactionHistory(req, res) {
  const userId = req.user.user_id; // From verifyToken middleware

  try {
    // This query grabs the user's account_id, then finds all transactions where 
    // they are either the sender OR the receiver, dynamically labeling it.
    const result = await pool.query(`
      SELECT 
        t.reference_no AS id,
        CASE 
          WHEN t.receiver_account_id = (SELECT account_id FROM accounts WHERE user_id = $1) THEN 'RECEIVED'
          ELSE t.transaction_type::text 
        END AS type,
        u.full_name AS "receiverName",
        u.phone_number AS "receiverPhone",
        t.amount,
        t.transaction_time AS date,
        t.transaction_status AS status,
        t.remarks AS note,
        COALESCE(t.fee, 0) AS fee 
      FROM transactions t
      -- Join accounts and users to get the details of the OTHER person in the transaction
      JOIN accounts a ON (
        CASE 
          WHEN t.sender_account_id = (SELECT account_id FROM accounts WHERE user_id = $1) THEN t.receiver_account_id
          ELSE t.sender_account_id
        END = a.account_id
      )
      JOIN users u ON a.user_id = u.user_id
      WHERE t.sender_account_id = (SELECT account_id FROM accounts WHERE user_id = $1)
         OR t.receiver_account_id = (SELECT account_id FROM accounts WHERE user_id = $1)
      UNION ALL
      SELECT
        r.reference_no AS id,
        'MOBILE_RECHARGE' AS type,
        r.operator AS "receiverName",
        r.phone_number AS "receiverPhone",
        r.amount,
        r.transaction_time AS date,
        'SUCCESS' AS status,
        'Simulated mobile recharge' AS note,
        0::numeric AS fee
      FROM mobile_recharge_transactions r
      JOIN accounts a ON a.account_id = r.account_id
      WHERE a.user_id = $1
      ORDER BY date DESC
    `, [userId]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching history:', err.message);
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
}

async function mobileRecharge(req, res) {
  const userId = req.user.user_id;
  const { operator, phone_number, amount, pin } = req.body;
  const supportedOperators = ['Grameenphone', 'Robi', 'Teletalk', 'Banglalink', 'Airtel'];
  const operatorPrefixes = {
    Grameenphone: [/^013/, /^017/],
    Banglalink:   [/^019/, /^014/],
    Robi:         [/^018/],
    Airtel:       [/^016/],
    Teletalk:     [/^015/],
  };
  const numericAmount = Number(amount);

  if (!supportedOperators.includes(operator)) {
    return res.status(400).json({ error: 'Select a supported Bangladesh operator' });
  }
  if (typeof phone_number !== 'string' || !/^01\d{9}$/.test(phone_number)) {
    return res.status(400).json({ error: 'Enter a valid 11-digit Bangladesh mobile number' });
  }
  // Enforce operator-specific prefix on the server side
  const allowedPrefixes = operatorPrefixes[operator] || [];
  if (!allowedPrefixes.some(re => re.test(phone_number))) {
    return res.status(400).json({
      error: `Phone number does not match ${operator} prefix. Expected: ${allowedPrefixes.map(r => r.source.replace('^', '')).join(' or ')}`
    });
  }
  if (!Number.isInteger(numericAmount) || numericAmount <= 0 || numericAmount > 10000) {
    return res.status(400).json({ error: 'Recharge amount must be a whole number between ৳1 and ৳10,000' });
  }
  if (typeof pin !== 'string' || !/^\d{4,6}$/.test(pin)) {
    return res.status(400).json({ error: 'Enter your 4-6 digit PIN' });
  }

  const client = await pool.connect();
  try {
    const userResult = await client.query(
      'SELECT pin_hash FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    if (!(await bcrypt.compare(pin, userResult.rows[0].pin_hash))) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    await client.query('BEGIN');
    const accountResult = await client.query(
      'SELECT account_id, balance FROM accounts WHERE user_id = $1 FOR UPDATE',
      [userId]
    );

    if (accountResult.rows.length === 0) {
      throw new Error('Account not found');
    }
    if (Number(accountResult.rows[0].balance) < numericAmount) {
      throw new Error('Insufficient balance');
    }

    const accountId = accountResult.rows[0].account_id;
    const referenceNo = `RCH${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Look up the designated System/Admin account as the receiver for double-entry integrity.
    // Exclude the sender's own account to satisfy CHECK(sender_account_id <> receiver_account_id).
    const systemAccResult = await client.query(
      `SELECT account_id FROM accounts
       WHERE account_id != $1
       ORDER BY (account_type = 'ADMIN') DESC
       LIMIT 1`,
      [accountId]
    );
    if (systemAccResult.rows.length === 0) {
      throw new Error('No system account available for mobile recharge settlement');
    }
    const systemAccountId = systemAccResult.rows[0].account_id;

    const balanceResult = await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE account_id = $2 RETURNING balance',
      [numericAmount, accountId]
    );

    // Insert into the main transactions table for admin panel / global ledger visibility
    await client.query(
      `INSERT INTO transactions
        (reference_no, transaction_type, sender_account_id, receiver_account_id, amount, fee, transaction_status, remarks)
       VALUES ($1, 'MOBILE_RECHARGE', $2, $3, $4, 0, 'SUCCESS', $5)`,
      [referenceNo, accountId, systemAccountId, numericAmount, `Mobile recharge to ${operator} - ${phone_number}`]
    );

    // Insert into the mobile-recharge-specific detail table
    await client.query(
      `INSERT INTO mobile_recharge_transactions
        (account_id, reference_no, operator, phone_number, amount)
       VALUES ($1, $2, $3, $4, $5)`,
      [accountId, referenceNo, operator, phone_number, numericAmount]
    );
    await client.query('COMMIT');

    return res.status(200).json({
      message: 'Simulated mobile recharge successful',
      referenceNo,
      operator,
      phone_number,
      amount: numericAmount,
      balance: balanceResult.rows[0].balance
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Mobile Recharge Error:', err.message);
    if (err.message.includes('Insufficient') || err.message.includes('Account not found')) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Mobile recharge failed' });
  } finally {
    client.release();
  }
}

async function payBill(req, res) {
  const payerUserId = req.user.user_id;
  const { biller_id, service_id, biller_phone, amount, pin, billing_month, due_date, account_number, note } = req.body;

  if ((!biller_id && !biller_phone && !service_id) || !amount || !pin) {
    return res.status(400).json({ error: 'Biller/Service identifier, amount, and PIN are required' });
  }

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' });
  }

  const client = await pool.connect();
  try {
    // 1. Verify Payer PIN
    const payerResult = await client.query(`
      SELECT pin_hash FROM users WHERE user_id = $1
    `, [payerUserId]);

    if (payerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payer account not found' });
    }

    const isPinValid = await bcrypt.compare(pin, payerResult.rows[0].pin_hash);
    if (!isPinValid) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // 2. Execute Stored Procedure: sp_pay_bill
    await client.query('BEGIN');
    const spResult = await client.query(
      'CALL sp_pay_bill($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, NULL, NULL, NULL)',
      [
        payerUserId,
        biller_id || null,
        service_id || null,
        biller_phone || null,
        account_number || null,
        numericAmount,
        billing_month || null,
        due_date || null,
        note || null
      ]
    );
    await client.query('COMMIT');

    const { p_reference_no, p_biller_name } = spResult.rows[0];

    res.status(200).json({
      message: 'Bill payment successful',
      referenceNo: p_reference_no,
      biller: p_biller_name,
      amount: numericAmount,
      billing_month: billing_month || new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      account_number
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Pay Bill Error:', err.message);
    const msg = err.message || 'Bill payment failed';
    if (msg.includes('Insufficient') || msg.includes('not found') || msg.includes('own account')) {
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: 'Bill payment failed: ' + msg });
  } finally {
    client.release();
  }
}

async function getRecentContacts(req, res) {
  const userId = req.user.user_id;

  try {
    const result = await pool.query(`
      SELECT 
        u.user_id,
        u.full_name AS name,
        u.phone_number AS phone,
        MAX(t.transaction_time) AS last_transacted,
        (
          SELECT t2.amount 
          FROM transactions t2 
          WHERE (t2.sender_account_id = a.account_id AND t2.receiver_account_id = user_account.account_id)
             OR (t2.sender_account_id = user_account.account_id AND t2.receiver_account_id = a.account_id)
          ORDER BY t2.transaction_time DESC 
          LIMIT 1
        ) AS last_amount,
        (
          SELECT t3.remarks 
          FROM transactions t3 
          WHERE (t3.sender_account_id = a.account_id AND t3.receiver_account_id = user_account.account_id)
             OR (t3.sender_account_id = user_account.account_id AND t3.receiver_account_id = a.account_id)
          ORDER BY t3.transaction_time DESC 
          LIMIT 1
        ) AS last_note
      FROM transactions t
      JOIN accounts user_account ON user_account.user_id = $1
      JOIN accounts a ON (
        CASE 
          WHEN t.sender_account_id = user_account.account_id THEN t.receiver_account_id
          ELSE t.sender_account_id
        END = a.account_id
      )
      JOIN users u ON a.user_id = u.user_id
      WHERE (t.sender_account_id = user_account.account_id OR t.receiver_account_id = user_account.account_id)
        AND u.user_id != $1
      GROUP BY u.user_id, u.full_name, u.phone_number, a.account_id, user_account.account_id
      ORDER BY last_transacted DESC
      LIMIT 8
    `, [userId]);

    const formatted = result.rows.map((row) => {
      const parts = (row.name || '').trim().split(' ');
      const initials = parts.length >= 2 
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : (row.name || 'QP').substring(0, 2).toUpperCase();

      const lastDate = row.last_transacted ? new Date(row.last_transacted).toLocaleDateString() : '';
      const note = row.last_amount ? `৳${row.last_amount} · ${lastDate}` : (row.last_note || lastDate);

      return {
        name: row.name,
        phone: row.phone,
        initials,
        note
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching recent contacts:', err.message);
    res.status(500).json({ error: 'Failed to fetch recent contacts' });
  }
}

module.exports = { 
  sendMoney, 
  cashOut, 
  cashIn, 
  makePayment,
  payBill,
  getMerchantLookup,
  getRecentContacts,
  getTransactionHistory, 
  getAgentLookup,
  mobileRecharge
};