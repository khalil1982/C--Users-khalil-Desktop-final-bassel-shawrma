/**
 * Migration: Tables System & Database Fixes
 * Version: 5.0.0
 * Date: 2026-01-28
 *
 * This migration:
 * - Creates tables table for restaurant tables
 * - Adds table_id column to orders table
 * - Ensures order_number and business_date columns exist
 * - Seeds default 10 tables
 * - Removes any shift-related columns or references
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

module.exports = {
  version: '5.0.0',
  name: 'tables_system_fixes',
  description: 'Add tables system, fix orders table, remove shift references',
  up: function (db) {
    // ============================================
    // STEP 1: Create tables table
    // ============================================
    db.run(`
      CREATE TABLE IF NOT EXISTS tables (
        table_id INTEGER PRIMARY KEY,
        table_number INTEGER NOT NULL UNIQUE,
        status TEXT DEFAULT 'available' CHECK(status IN ('available', 'occupied')),
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    db.run('CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_tables_active ON tables(is_active)');

    // Seed default 10 tables
    const existingTablesStmt = db.prepare('SELECT COUNT(*) as count FROM tables');
    existingTablesStmt.step();
    const count = existingTablesStmt.getAsObject().count || 0;
    existingTablesStmt.free();

    if (count === 0) {
      const now = new Date().toISOString();
      for (let i = 1; i <= 10; i++) {
        db.run(
          'INSERT INTO tables (table_number, status, is_active, created_at) VALUES (?, ?, ?, ?)',
          [i, 'available', 1, now]
        );
      }
      console.log('  ✅ Seeded 10 default tables');
    }

    // ============================================
    // STEP 2: Add table_id to orders if it doesn't exist
    // ============================================
    if (tableExists(db, 'orders')) {
      if (!columnExists(db, 'orders', 'table_id')) {
        db.run('ALTER TABLE orders ADD COLUMN table_id INTEGER');
        db.run('CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id)');
        console.log('  ✅ Added table_id column to orders');
      }

      // Ensure order_number exists
      if (!columnExists(db, 'orders', 'order_number')) {
        db.run('ALTER TABLE orders ADD COLUMN order_number INTEGER');
        console.log('  ✅ Added order_number column to orders');
      }

      // Ensure business_date exists
      if (!columnExists(db, 'orders', 'business_date')) {
        db.run('ALTER TABLE orders ADD COLUMN business_date TEXT');
        console.log('  ✅ Added business_date column to orders');
      }
    }

    // ============================================
    // STEP 3: Remove any shift-related columns if they exist
    // ============================================
    if (tableExists(db, 'orders')) {
      if (columnExists(db, 'orders', 'shift_id')) {
        // We can't drop columns in SQLite, but we can ignore them
        console.log('  ⚠️  shift_id column exists in orders (will be ignored)');
      }
    }

    // Drop shift-related tables if they exist
    const shiftTables = ['shifts', 'Shifts'];
    shiftTables.forEach((tableName) => {
      if (tableExists(db, tableName)) {
        db.run(`DROP TABLE IF EXISTS ${tableName}`);
        console.log(`  ✅ Dropped legacy table: ${tableName}`);
      }
    });

    console.log('  ✅ Tables system migration completed successfully');
  }
};
