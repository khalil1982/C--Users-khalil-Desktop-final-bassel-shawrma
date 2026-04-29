/**
 * Migration: Phase 2 - Menu Management + Orders + Discounts
 * Version: 2.0.0
 * Date: 2026-01-24
 *
 * This migration adds:
 * - Audit logging system
 * - App sessions tracking
 * - Menu items with price history
 * - Orders system with state machine
 * - Order items with price snapshots
 * - Order status history
 * - Financial tables (customers, debts, partners, withdrawals, expenses)
 * - Payments table for refunds
 */

const bcrypt = require('bcryptjs');
const { generateUUID } = require('../../utils/uuid');

module.exports = {
  version: '2.0.0',
  name: 'phase2_menu_orders',
  description: 'Add Phase 2 tables: Menu Management, Orders, Discounts, and Audit',

  /**
   * Apply this migration
   * @param {Object} db - sql.js database instance
   */
  up: function(db) {
    // ============================================
    // STEP 1: Audit Log Table
    // ============================================
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

    db.run('CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_audit_log_business_date ON audit_log(business_date)');
    db.run('CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp)');
    db.run('CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action)');

    // ============================================
    // STEP 2: App Sessions Table
    // ============================================
    db.run(`
      CREATE TABLE IF NOT EXISTS app_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        ended_at TEXT,
        business_date TEXT NOT NULL
      )
    `);

    db.run('CREATE INDEX IF NOT EXISTS idx_app_sessions_user_id ON app_sessions(user_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_app_sessions_business_date ON app_sessions(business_date)');

    // ============================================
    // STEP 3: Menu Items Table
    // ============================================
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

    db.run('CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category)');
    db.run('CREATE INDEX IF NOT EXISTS idx_menu_items_status ON menu_items(status)');
    db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_items_name_category ON menu_items(name, category)');

    // ============================================
    // STEP 4: Menu Item Price History Table
    // ============================================
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

    db.run('CREATE INDEX IF NOT EXISTS idx_price_history_menu_item ON menu_item_price_history(menu_item_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_price_history_date ON menu_item_price_history(changed_at)');

    // ============================================
    // STEP 5: New Orders Table (Phase 2)
    // ============================================
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

    db.run('CREATE INDEX IF NOT EXISTS idx_orders_business_date ON orders(business_date)');
    db.run('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by)');
    db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_number_date ON orders(order_number, business_date)');

    // ============================================
    // STEP 6: New Order Items Table (Phase 2)
    // ============================================
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

    db.run('CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON order_items(menu_item_id)');

    // ============================================
    // STEP 7: Order Status History Table
    // ============================================
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

    db.run('CREATE INDEX IF NOT EXISTS idx_status_history_order_id ON order_status_history(order_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_status_history_date ON order_status_history(changed_at)');

    // ============================================
    // STEP 8: Customer Debts
    // ============================================
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

    // ============================================
    // STEP 9: Partners & Withdrawals
    // ============================================
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

    // ============================================
    // STEP 10: Expenses
    // ============================================
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

    // ============================================
    // STEP 11: Payments (Refund tracking)
    // ============================================
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

    db.run('CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_payments_business_date ON payments(business_date)');

    // ============================================
    // STEP 12: Seed System User (for migrations and seeds)
    // ============================================
    this.seedSystemUser(db);

    console.log('  ✅ Phase 2 migration completed successfully');
  },

  /**
   * Seeds a system user for automated operations
   * @param {Object} db - sql.js database instance
   */
  seedSystemUser: function(db) {
    // Check if system user exists
    let stmt = db.prepare('SELECT id FROM users WHERE username = ?');
    stmt.bind(['system']);
    const exists = stmt.step();
    stmt.free();

    if (!exists) {
      // Create system user (role: Admin, but with known identifier)
      const hash = bcrypt.hashSync('System@2026!', 10);
      db.run(
        'INSERT INTO users (id, username, password_hash, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [generateUUID(), 'system', hash, 'manager', 'inactive', new Date().toISOString()]
      );
      console.log('  ✅ System user created');
    }
  }
};
