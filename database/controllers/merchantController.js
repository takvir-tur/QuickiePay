const pool = require('../db_connection');

// Helper to get merchant by user_id
async function getMerchantByUserId(userId) {
  const result = await pool.query(
    `SELECT m.merchant_id, m.business_name, m.trade_license, m.status, a.account_id, a.balance, u.full_name, u.phone_number
     FROM merchants m
     JOIN users u ON m.user_id = u.user_id
     JOIN accounts a ON u.user_id = a.user_id
     WHERE m.user_id = $1`,
    [userId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

// 1. Get Merchant Profile & Dashboard Overview
async function getMerchantProfile(req, res) {
  try {
    const userId = req.user.user_id;
    const merchant = await getMerchantByUserId(userId);

    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    // Fetch recent sales / payments received by this merchant
    const recentPayments = await pool.query(
      `SELECT 
        t.transaction_id,
        t.reference_no,
        t.amount,
        t.transaction_type,
        t.transaction_time,
        t.transaction_status,
        t.remarks,
        u.full_name AS sender_name,
        u.phone_number AS sender_phone
      FROM transactions t
      JOIN accounts a ON t.sender_account_id = a.account_id
      JOIN users u ON a.user_id = u.user_id
      WHERE t.receiver_account_id = $1
      ORDER BY t.transaction_time DESC
      LIMIT 8`,
      [merchant.account_id]
    );

    // Fetch summary statistics
    const statsSales = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN transaction_status = 'SUCCESS' THEN amount ELSE 0 END), 0) AS total_sales,
        COUNT(CASE WHEN transaction_status = 'SUCCESS' THEN 1 END) AS total_orders
       FROM transactions
       WHERE receiver_account_id = $1`,
      [merchant.account_id]
    );

    const statsInvoices = await pool.query(
      `SELECT 
        COUNT(*) AS total_invoices,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) AS pending_invoices,
        COUNT(CASE WHEN status = 'PAID' THEN 1 END) AS paid_invoices,
        COALESCE(SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END), 0) AS paid_invoice_total
       FROM merchant_invoices
       WHERE merchant_id = $1`,
      [merchant.merchant_id]
    );

    const statsStore = await pool.query(
      `SELECT 
        COUNT(*) AS total_products,
        COALESCE(SUM(stock_quantity), 0) AS total_inventory
       FROM merchant_store_items
       WHERE merchant_id = $1`,
      [merchant.merchant_id]
    );

    merchant.recentPayments = recentPayments.rows;
    merchant.stats = {
      total_sales: statsSales.rows[0].total_sales,
      total_orders: statsSales.rows[0].total_orders,
      ...statsInvoices.rows[0],
      ...statsStore.rows[0]
    };

    res.json(merchant);
  } catch (err) {
    console.error('Error fetching merchant profile:', err.message);
    res.status(500).json({ error: 'Server error while fetching merchant data' });
  }
}

// 2. Get Merchant Invoices
async function getInvoices(req, res) {
  try {
    const userId = req.user.user_id;
    const merchant = await getMerchantByUserId(userId);
    if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

    const { status } = req.query;
    let query = `
      SELECT 
        invoice_id, 
        merchant_id, 
        invoice_number, 
        customer_name, 
        customer_phone, 
        amount, 
        description, 
        status, 
        due_date, 
        created_at, 
        paid_at
      FROM merchant_invoices
      WHERE merchant_id = $1
    `;
    const params = [merchant.merchant_id];

    if (status && status !== 'ALL') {
      params.push(status.toUpperCase());
      query += ` AND status = $2`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching invoices:', err.message);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
}

// 3. Create Invoice
async function createInvoice(req, res) {
  try {
    const userId = req.user.user_id;
    const merchant = await getMerchantByUserId(userId);
    if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

    const { customer_name, customer_phone, amount, description, due_date } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Valid invoice amount is required' });
    }

    // Generate unique invoice number: INV-MMDD-XXXX
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${Date.now().toString().slice(-4)}${randomSuffix}`;

    const result = await pool.query(
      `INSERT INTO merchant_invoices 
       (merchant_id, invoice_number, customer_name, customer_phone, amount, description, due_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
       RETURNING *`,
      [
        merchant.merchant_id,
        invoiceNumber,
        customer_name || 'Valued Customer',
        customer_phone || null,
        parseFloat(amount),
        description || null,
        due_date || null
      ]
    );

    res.status(201).json({
      message: 'Invoice created successfully',
      invoice: result.rows[0]
    });
  } catch (err) {
    console.error('Error creating invoice:', err.message);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
}

// 4. Update Invoice Status (e.g. Mark as PAID or CANCELLED)
async function updateInvoiceStatus(req, res) {
  try {
    const userId = req.user.user_id;
    const merchant = await getMerchantByUserId(userId);
    if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'PAID', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid invoice status' });
    }

    const paidAtClause = status === 'PAID' ? 'CURRENT_TIMESTAMP' : 'NULL';

    const result = await pool.query(
      `UPDATE merchant_invoices
       SET status = $1, paid_at = ${paidAtClause}
       WHERE invoice_id = $2 AND merchant_id = $3
       RETURNING *`,
      [status, id, merchant.merchant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found or unauthorized' });
    }

    res.json({
      message: `Invoice marked as ${status}`,
      invoice: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating invoice status:', err.message);
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
}

// 5. Get Merchant Transactions (Sales & Payment History)
async function getMerchantTransactions(req, res) {
  try {
    const userId = req.user.user_id;
    const merchant = await getMerchantByUserId(userId);
    if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

    const result = await pool.query(
      `SELECT 
        t.transaction_id,
        t.reference_no,
        t.amount,
        t.fee,
        t.transaction_type,
        t.transaction_status,
        t.remarks,
        t.transaction_time,
        CASE 
          WHEN t.receiver_account_id = $1 THEN 'RECEIVED'
          ELSE 'SENT'
        END AS direction,
        u.full_name AS customer_name,
        u.phone_number AS customer_phone,
        pi.invoice_number
      FROM transactions t
      JOIN accounts a ON (
        CASE 
          WHEN t.receiver_account_id = $1 THEN t.sender_account_id
          ELSE t.receiver_account_id
        END = a.account_id
      )
      JOIN users u ON a.user_id = u.user_id
      LEFT JOIN payment_transactions pi ON t.transaction_id = pi.transaction_id
      WHERE t.receiver_account_id = $1 OR t.sender_account_id = $1
      ORDER BY t.transaction_time DESC`,
      [merchant.account_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching merchant transactions:', err.message);
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
}

// 6. Get Store Items
async function getStoreItems(req, res) {
  try {
    const userId = req.user.user_id;
    const merchant = await getMerchantByUserId(userId);
    if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

    const result = await pool.query(
      `SELECT item_id, merchant_id, item_name, description, price, stock_quantity, created_at
       FROM merchant_store_items
       WHERE merchant_id = $1
       ORDER BY created_at DESC`,
      [merchant.merchant_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching store items:', err.message);
    res.status(500).json({ error: 'Failed to fetch store items' });
  }
}

// 7. Add Store Item
async function addStoreItem(req, res) {
  try {
    const userId = req.user.user_id;
    const merchant = await getMerchantByUserId(userId);
    if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

    const { item_name, description, price, stock_quantity } = req.body;

    if (!item_name || price === undefined || parseFloat(price) < 0) {
      return res.status(400).json({ error: 'Item name and valid price are required' });
    }

    const result = await pool.query(
      `INSERT INTO merchant_store_items 
       (merchant_id, item_name, description, price, stock_quantity)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        merchant.merchant_id,
        item_name.trim(),
        description || null,
        parseFloat(price),
        parseInt(stock_quantity, 10) || 0
      ]
    );

    res.status(201).json({
      message: 'Item added successfully',
      item: result.rows[0]
    });
  } catch (err) {
    console.error('Error adding store item:', err.message);
    res.status(500).json({ error: 'Failed to add store item' });
  }
}

// 8. Update Store Item
async function updateStoreItem(req, res) {
  try {
    const userId = req.user.user_id;
    const merchant = await getMerchantByUserId(userId);
    if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

    const { id } = req.params;
    const { item_name, description, price, stock_quantity } = req.body;

    const result = await pool.query(
      `UPDATE merchant_store_items
       SET item_name = COALESCE($1, item_name),
           description = COALESCE($2, description),
           price = COALESCE($3, price),
           stock_quantity = COALESCE($4, stock_quantity)
       WHERE item_id = $5 AND merchant_id = $6
       RETURNING *`,
      [
        item_name ? item_name.trim() : null,
        description !== undefined ? description : null,
        price !== undefined ? parseFloat(price) : null,
        stock_quantity !== undefined ? parseInt(stock_quantity, 10) : null,
        id,
        merchant.merchant_id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found or unauthorized' });
    }

    res.json({
      message: 'Item updated successfully',
      item: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating store item:', err.message);
    res.status(500).json({ error: 'Failed to update store item' });
  }
}

// 9. Delete Store Item
async function deleteStoreItem(req, res) {
  try {
    const userId = req.user.user_id;
    const merchant = await getMerchantByUserId(userId);
    if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM merchant_store_items
       WHERE item_id = $1 AND merchant_id = $2
       RETURNING item_id`,
      [id, merchant.merchant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found or unauthorized' });
    }

    res.json({ message: 'Store item deleted successfully' });
  } catch (err) {
    console.error('Error deleting store item:', err.message);
    res.status(500).json({ error: 'Failed to delete store item' });
  }
}

module.exports = {
  getMerchantProfile,
  getInvoices,
  createInvoice,
  updateInvoiceStatus,
  getMerchantTransactions,
  getStoreItems,
  addStoreItem,
  updateStoreItem,
  deleteStoreItem
};