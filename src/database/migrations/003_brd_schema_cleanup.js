/**
 * Migration: BRD Schema Alignment & Legacy Cleanup
 * Version: 3.0.0
 * Date: 2026-01-25
 *
 * This migration:
 * - Ensures BRD tables exist (if previous migrations used legacy schema)
 * - Migrates legacy Users to users table
 * - Removes legacy shift-related tables
 */

const bcrypt = require('bcryptjs');
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

function columnExists(db, table, col) {
  const stmt = db.prepare("PRAGMA table_info(" + table + ")");
  let has = false;
  while (stmt.step()) {
    if (stmt.getAsObject().name === col) { has = true; break; }
  }
  stmt.free();
  return has;
}

function migrateLegacyUsers(db) {
  if (!tableExists(db, 'Users')) return;
  if (tableExists(db, 'users') && columnExists(db, 'users', 'id')) return;

  db.run(`
    CREATE TABLE users_new (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('manager', 'employee', 'kitchen')),
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL
    )
  `);

  const stmt = db.prepare('SELECT user_id, username, password_hash, role, is_active, created_at FROM Users');
  while (stmt.step()) {
    const r = stmt.getAsObject();
    const role = r.role === 'Admin' ? 'manager' : 'employee';
    const status = r.is_active ? 'active' : 'inactive';
    db.run(
      'INSERT INTO users_new (id, username, password_hash, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [generateUUID(), r.username, r.password_hash, role, status, r.created_at || new Date().toISOString()]
    );
  }
  stmt.free();

  db.run('DROP TABLE IF EXISTS users');
  db.run('DROP TABLE IF EXISTS Users');
  db.run('ALTER TABLE users_new RENAME TO users');

  const adminCheck = db.prepare('SELECT 1 FROM users WHERE username = ?');
  adminCheck.bind(['admin']);
  const adminExists = adminCheck.step();
  adminCheck.free();
  if (!adminExists) {
    const hash = bcrypt.hashSync('Admin123Admin', 10);
    db.run(
      'INSERT INTO users (id, username, password_hash, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [generateUUID(), 'admin', hash, 'manager', 'active', new Date().toISOString()]
    );
  }
}

function dropLegacyTables(db) {
  const legacyTables = [
    'Sessions',
    'Shifts',
    'Tables',
    'Categories',
    'Products',
    'Orders',
    'Order_Items',
    'Expenses'
  ];

  legacyTables.forEach((table) => {
    if (tableExists(db, table)) {
      db.run(`DROP TABLE IF EXISTS ${table}`);
    }
  });
}

module.exports = {
  version: '3.0.0',
  name: 'brd_schema_cleanup',
  description: 'Ensure BRD schema and remove legacy shift tables',
  up: function (db) {
    db.run('DROP TABLE IF EXISTS order_status_history');
    db.run('DROP TABLE IF EXISTS order_items');
    db.run('DROP TABLE IF EXISTS orders');
    db.run('DROP TABLE IF EXISTS menu_item_price_history');
    db.run('DROP TABLE IF EXISTS menu_items');
    db.run('DROP TABLE IF EXISTS app_sessions');
    db.run('DROP TABLE IF EXISTS audit_log');

    migrateLegacyUsers(db);

    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('manager', 'employee', 'kitchen')),
        status TEXT DEFAULT 'active',
        created_at TEXT NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        business_date TEXT NOT NULL,
        details TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS app_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        ended_at TEXT,
        business_date TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS menu_items (
        menu_item_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        name_en TEXT,
        category TEXT NOT NULL CHECK(category IN ('shawarma', 'drinks', 'extras')),
        current_price REAL CHECK(current_price >= 0 OR current_price IS NULL),
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        icon_path TEXT,
        sort_order INTEGER,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        last_price_update TEXT,
        last_updated_by TEXT,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (last_updated_by) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS menu_item_price_history (
        history_id TEXT PRIMARY KEY,
        menu_item_id TEXT NOT NULL,
        old_price REAL NOT NULL,
        new_price REAL NOT NULL,
        changed_at TEXT NOT NULL DEFAULT (datetime('now')),
        changed_by TEXT NOT NULL,
        reason TEXT,
        FOREIGN KEY (menu_item_id) REFERENCES menu_items(menu_item_id),
        FOREIGN KEY (changed_by) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        order_id TEXT PRIMARY KEY,
        order_number INTEGER NOT NULL,
        business_date TEXT NOT NULL,
        customer_name TEXT,
        customer_phone TEXT,
        status TEXT NOT NULL CHECK(status IN ('CREATED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED')),
        subtotal REAL NOT NULL CHECK(subtotal >= 0),
        discount_type TEXT CHECK(discount_type IN ('percent', 'amount')),
        discount_value REAL CHECK(discount_value >= 0),
        discount_amount REAL DEFAULT 0 CHECK(discount_amount >= 0),
        total REAL NOT NULL CHECK(total >= 0),
        payment_method TEXT CHECK(payment_method IN ('cash', 'debt')),
        notes TEXT,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        updated_at TEXT,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS order_items (
        order_item_id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        menu_item_id TEXT NOT NULL,
        item_name TEXT NOT NULL,
        unit_price REAL NOT NULL CHECK(unit_price >= 0),
        quantity INTEGER NOT NULL CHECK(quantity > 0),
        subtotal REAL NOT NULL CHECK(subtotal >= 0),
        FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
        FOREIGN KEY (menu_item_id) REFERENCES menu_items(menu_item_id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS order_status_history (
        history_id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        from_status TEXT,
        to_status TEXT NOT NULL,
        changed_at TEXT NOT NULL DEFAULT (datetime('now')),
        changed_by TEXT NOT NULL,
        reason TEXT,
        FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
        FOREIGN KEY (changed_by) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS customers (
        customer_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT UNIQUE,
        debt_limit REAL DEFAULT 500 CHECK(debt_limit >= 0),
        current_debt REAL DEFAULT 0 CHECK(current_debt >= 0),
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        created_at TEXT NOT NULL,
        notes TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS debt_transactions (
        transaction_id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        transaction_type TEXT NOT NULL CHECK(transaction_type IN ('debt_increase', 'payment')),
        amount REAL NOT NULL CHECK(amount > 0),
        business_date TEXT NOT NULL,
        order_id TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
        FOREIGN KEY (order_id) REFERENCES orders(order_id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS partners (
        partner_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        total_withdrawals REAL DEFAULT 0 CHECK(total_withdrawals >= 0)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        withdrawal_id TEXT PRIMARY KEY,
        partner_id TEXT NOT NULL,
        amount REAL NOT NULL CHECK(amount > 0),
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
        requested_at TEXT NOT NULL,
        requested_by TEXT NOT NULL,
        approved_at TEXT,
        approved_by TEXT,
        business_date TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (partner_id) REFERENCES partners(partner_id),
        FOREIGN KEY (requested_by) REFERENCES users(id),
        FOREIGN KEY (approved_by) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS expense_categories (
        category_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        name_en TEXT,
        is_active INTEGER DEFAULT 1
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS expenses (
        expense_id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        amount REAL NOT NULL CHECK(amount > 0),
        business_date TEXT NOT NULL,
        description TEXT NOT NULL,
        attachment_path TEXT,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        is_archived INTEGER DEFAULT 0,
        FOREIGN KEY (category_id) REFERENCES expense_categories(category_id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS payments (
        payment_id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        amount REAL NOT NULL CHECK(amount >= 0),
        payment_method TEXT CHECK(payment_method IN ('cash', 'debt')),
        is_refund INTEGER DEFAULT 0,
        business_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(order_id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    db.run('CREATE INDEX IF NOT EXISTS idx_orders_business_date ON orders(business_date)');
    db.run('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_audit_log_business_date ON audit_log(business_date)');
    db.run('CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category)');
    db.run('CREATE INDEX IF NOT EXISTS idx_menu_items_status ON menu_items(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_payments_business_date ON payments(business_date)');

    dropLegacyTables(db);
  },
};
