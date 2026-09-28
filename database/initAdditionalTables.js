const pool = require('./db_connection');

async function initAdditionalTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS merchant_invoices (
        invoice_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        merchant_id UUID NOT NULL REFERENCES merchants(merchant_id) ON DELETE CASCADE,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        customer_name VARCHAR(100),
        customer_phone VARCHAR(20),
        amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
        description TEXT,
        status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'CANCELLED')),
        due_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        paid_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS biller_bank_transfers (
        transfer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        biller_id UUID NOT NULL REFERENCES billers(biller_id) ON DELETE CASCADE,
        transaction_id UUID REFERENCES transactions(transaction_id) ON DELETE SET NULL,
        bank_name VARCHAR(100) NOT NULL,
        account_holder_name VARCHAR(100) NOT NULL,
        account_number VARCHAR(50) NOT NULL,
        branch_name VARCHAR(100),
        routing_number VARCHAR(50),
        amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
        status VARCHAR(20) DEFAULT 'COMPLETED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS merchant_store_items (
        item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        merchant_id UUID NOT NULL REFERENCES merchants(merchant_id) ON DELETE CASCADE,
        item_name VARCHAR(150) NOT NULL,
        description TEXT,
        price NUMERIC(15,2) NOT NULL CHECK (price >= 0),
        stock_quantity INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Additional tables created successfully!');
  } catch (err) {
    console.error('Error creating additional tables:', err);
  } finally {
    pool.end();
  }
}

initAdditionalTables();
