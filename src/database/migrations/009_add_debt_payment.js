/**
 * Migration: Add Debt Payment Method
 * Version: 9.0.0
 * Adds 'debt' as valid payment_method for orders and payments.
 */

function tableExists(db, tableName) {
  const stmt = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name = ?"
  );
  stmt.bind([tableName]);
  const exists = stmt.step();
  stmt.free();
  return exists;
}

function columnExists(db, tableName, columnName) {
  const stmt = db.prepare(`PRAGMA table_info(${tableName})`);
  let hasColumn = false;
  while (stmt.step()) {
    const row = stmt.getAsObject();
    if (row.name === columnName) {
      hasColumn = true;
      break;
    }
  }
  stmt.free();
  return hasColumn;
}

function rebuildOrdersTable(db) {
  if (!tableExists(db, 'orders')) return;
  db.run('ALTER TABLE orders RENAME TO orders_old');
  const hasTableId = columnExists(db, 'orders_old', 'table_id');

  db.run(`
    CREATE TABLE orders (
      order_id TEXT PRIMARY KEY,
      order_number INTEGER NOT NULL,
      business_date TEXT NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      table_id INTEGER,
      status TEXT,
      order_is_received INTEGER DEFAULT 0,
      subtotal REAL NOT NULL CHECK(subtotal >= 0),
      discount_type TEXT CHECK(discount_type IN ('percent', 'amount')),
      discount_value REAL CHECK(discount_value >= 0),
      discount_amount REAL DEFAULT 0 CHECK(discount_amount >= 0),
      total REAL NOT NULL CHECK(total >= 0),
      payment_method TEXT CHECK(payment_method IN ('cash', 'bank_app', 'debt')),
      notes TEXT,
      created_at TEXT NOT NULL,
      created_by TEXT NOT NULL,
      updated_at TEXT,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  const insertCols = [
    'order_id', 'order_number', 'business_date', 'customer_name', 'customer_phone',
    'status', 'order_is_received', 'subtotal', 'discount_type', 'discount_value',
    'discount_amount', 'total', 'payment_method', 'notes', 'created_at', 'created_by', 'updated_at'
  ];
  const selectCols = [...insertCols];
  if (hasTableId) {
    insertCols.splice(5, 0, 'table_id');
    selectCols.splice(5, 0, 'table_id');
  }
  db.run(`INSERT INTO orders (${insertCols.join(', ')}) SELECT ${selectCols.join(', ')} FROM orders_old`);
  db.run('DROP TABLE orders_old');
  db.run('CREATE INDEX IF NOT EXISTS idx_orders_business_date ON orders(business_date)');
  db.run('CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by)');
  db.run('CREATE INDEX IF NOT EXISTS idx_orders_received ON orders(order_is_received)');
  db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_number_date ON orders(order_number, business_date)');
}

function rebuildPaymentsTable(db) {
  if (!tableExists(db, 'payments')) return;
  db.run('ALTER TABLE payments RENAME TO payments_old');
  db.run(`
    CREATE TABLE payments (
      payment_id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount >= 0),
      payment_method TEXT CHECK(payment_method IN ('cash', 'bank_app', 'debt')),
      is_refund INTEGER DEFAULT 0,
      business_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(order_id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);
  db.run(`
    INSERT INTO payments (
      payment_id, order_id, amount, payment_method, is_refund, business_date, created_at, created_by
    )
    SELECT
      payment_id, order_id, amount, payment_method, is_refund, business_date, created_at, created_by
    FROM payments_old
  `);
  db.run('DROP TABLE payments_old');
  db.run('CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_payments_business_date ON payments(business_date)');
}

module.exports = {
  version: '9.0.0',
  name: 'add_debt_payment',
  description: 'Add debt as valid payment method',
  up: function (db) {
    rebuildOrdersTable(db);
    rebuildPaymentsTable(db);
  }
};
