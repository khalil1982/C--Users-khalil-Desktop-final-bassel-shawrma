/**
 * Migration: Post-review updates
 * Version: 4.1.0
 * Date: 2026-02-10
 *
 * Changes:
 * - Add order_is_received flag and update payment method options
 * - Add national_id to customers and enforce unique phone
 * - Seed default purchase categories
 */

const { generateUUID } = require('../../utils/uuid');

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

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      order_id TEXT PRIMARY KEY,
      order_number INTEGER NOT NULL,
      business_date TEXT NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      status TEXT,
      order_is_received INTEGER DEFAULT 0,
      subtotal REAL NOT NULL CHECK(subtotal >= 0),
      discount_type TEXT CHECK(discount_type IN ('percent', 'amount')),
      discount_value REAL CHECK(discount_value >= 0),
      discount_amount REAL DEFAULT 0 CHECK(discount_amount >= 0),
      total REAL NOT NULL CHECK(total >= 0),
      payment_method TEXT CHECK(payment_method IN ('cash', 'bank_app')),
      notes TEXT,
      created_at TEXT NOT NULL,
      created_by TEXT NOT NULL,
      updated_at TEXT,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  db.run(`
    INSERT INTO orders (
      order_id, order_number, business_date, customer_name, customer_phone,
      status, order_is_received, subtotal, discount_type, discount_value,
      discount_amount, total, payment_method, notes, created_at, created_by, updated_at
    )
    SELECT
      order_id,
      order_number,
      business_date,
      customer_name,
      customer_phone,
      status,
      CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END,
      subtotal,
      discount_type,
      discount_value,
      discount_amount,
      total,
      CASE WHEN payment_method = 'debt' THEN 'cash' ELSE payment_method END,
      notes,
      created_at,
      created_by,
      updated_at
    FROM orders_old
  `);

  db.run('DROP TABLE IF EXISTS orders_old');

  db.run('CREATE INDEX IF NOT EXISTS idx_orders_business_date ON orders(business_date)');
  db.run('CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by)');
  db.run('CREATE INDEX IF NOT EXISTS idx_orders_received ON orders(order_is_received)');
  db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_number_date ON orders(order_number, business_date)');
}

function rebuildPaymentsTable(db) {
  if (!tableExists(db, 'payments')) return;

  db.run('ALTER TABLE payments RENAME TO payments_old');

  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      payment_id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount >= 0),
      payment_method TEXT CHECK(payment_method IN ('cash', 'bank_app')),
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
      payment_id,
      order_id,
      amount,
      CASE WHEN payment_method = 'debt' THEN 'cash' ELSE payment_method END,
      is_refund,
      business_date,
      created_at,
      created_by
    FROM payments_old
  `);

  db.run('DROP TABLE IF EXISTS payments_old');

  db.run('CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_payments_business_date ON payments(business_date)');
}

function updateCustomersTable(db) {
  if (!tableExists(db, 'customers')) return;

  if (!columnExists(db, 'customers', 'national_id')) {
    db.run('ALTER TABLE customers ADD COLUMN national_id TEXT');
  }

  db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_phone_unique ON customers(phone)');
}

function seedPurchaseCategories(db) {
  if (!tableExists(db, 'expense_categories')) return;

  const categories = [
    { name: 'تشغيلية - خضروات', nameEn: 'Operational - Vegetables' },
    { name: 'تشغيلية - بهارات', nameEn: 'Operational - Spices' },
    { name: 'تشغيلية - لحمة + غاز', nameEn: 'Operational - Meat + Gas' },
    { name: 'تشغيلية - مشروبات يومية', nameEn: 'Operational - Daily Drinks' },
    { name: 'معدات - أدوات مطبخ', nameEn: 'Tools - Kitchen Tools' },
    { name: 'معدات - أدوات كهرباء', nameEn: 'Tools - Electrical Tools' },
    { name: 'مشتريات خارجية - خبز', nameEn: 'External - Bread' },
    { name: 'مشتريات خارجية - منظفات', nameEn: 'External - Cleaners' },
    { name: 'مشتريات خارجية - كاتشب', nameEn: 'External - Ketchup' },
    { name: 'مشتريات خارجية - سلفان', nameEn: 'External - Cellophane' },
    { name: 'مشتريات خارجية - أخرى', nameEn: 'External - Other' }
  ];

  categories.forEach((category) => {
    const stmt = db.prepare('SELECT 1 FROM expense_categories WHERE name = ?');
    stmt.bind([category.name]);
    const exists = stmt.step();
    stmt.free();

    if (!exists) {
      db.run(
        'INSERT INTO expense_categories (category_id, name, name_en, is_active) VALUES (?, ?, ?, 1)',
        [generateUUID(), category.name, category.nameEn]
      );
    }
  });
}

module.exports = {
  version: '4.1.0',
  name: 'post_review_updates',
  description: 'Add order receive flag, update payments, customers, and seed purchase categories',
  up: function (db) {
    rebuildOrdersTable(db);
    rebuildPaymentsTable(db);
    updateCustomersTable(db);
    seedPurchaseCategories(db);
  }
};
