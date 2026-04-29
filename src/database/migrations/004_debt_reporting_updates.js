/**
 * Migration: Debt, Customer, and Balance Enhancements
 * Version: 4.0.0
 * Date: 2026-02-01
 *
 * Adds:
 * - customers.national_id
 * - debt_transactions.payment_method
 * - account_balances table (cash, bank_app)
 */

function columnExists(db, table, column) {
  const stmt = db.prepare(`PRAGMA table_info(${table})`);
  let exists = false;
  while (stmt.step()) {
    const row = stmt.getAsObject();
    if (row.name === column) {
      exists = true;
      break;
    }
  }
  stmt.free();
  return exists;
}

module.exports = {
  version: '4.0.0',
  name: 'debt_reporting_updates',
  description: 'Add national_id, payment_method, and account balances',
  up: function (db) {
    if (!columnExists(db, 'customers', 'national_id')) {
      db.run('ALTER TABLE customers ADD COLUMN national_id TEXT');
    }

    if (!columnExists(db, 'debt_transactions', 'payment_method')) {
      db.run('ALTER TABLE debt_transactions ADD COLUMN payment_method TEXT');
    }

    db.run(`
      CREATE TABLE IF NOT EXISTS account_balances (
        account_type TEXT PRIMARY KEY,
        balance REAL NOT NULL DEFAULT 0 CHECK(balance >= 0)
      )
    `);

    db.run('INSERT OR IGNORE INTO account_balances (account_type, balance) VALUES (?, ?)', [
      'cash',
      0
    ]);
    db.run('INSERT OR IGNORE INTO account_balances (account_type, balance) VALUES (?, ?)', [
      'bank_app',
      0
    ]);
  },
};
