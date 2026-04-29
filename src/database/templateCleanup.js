/**
 * Template DB Cleanup
 * Removes ALL transactional and personal data; keeps schema, menu_items,
 * expense_categories (purchase categories), users, tables (restaurant tables), migrations.
 * Safe to run after schema + migrations + seeds.
 * Do NOT drop tables; only DELETE records.
 */

function tableExists(db, name) {
  const stmt = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?");
  stmt.bind([name]);
  const ok = stmt.step();
  stmt.free();
  return !!ok;
}

function deleteIfExists(db, table) {
  if (!tableExists(db, table)) return;
  db.run(`DELETE FROM ${table}`);
}

/**
 * Run cleanup on db: remove all transactional/personal data.
 * Keeps: users, menu_items, expense_categories, tables, migrations.
 * @param {object} db - sql.js database instance
 * @param {object} opts - options: { resetSequences?: boolean } (default false; set true for template build only)
 */
function runTemplateCleanup(db, opts = {}) {
  db.run('PRAGMA foreign_keys = OFF');

  // Sales & Orders (children before parents when applicable)
  deleteIfExists(db, 'order_items');
  deleteIfExists(db, 'order_status_history');
  deleteIfExists(db, 'payments');
  deleteIfExists(db, 'orders');
  deleteIfExists(db, 'receipts');
  deleteIfExists(db, 'table_orders');

  // Customers & Debts
  deleteIfExists(db, 'debt_transactions');
  deleteIfExists(db, 'customers');
  deleteIfExists(db, 'debts');
  deleteIfExists(db, 'debt_payments');
  deleteIfExists(db, 'debt_ledger');

  // Purchases (transactions only); keep expense_categories
  deleteIfExists(db, 'purchases');
  deleteIfExists(db, 'purchase_items');
  deleteIfExists(db, 'expenses');

  // Partners
  deleteIfExists(db, 'withdrawals');
  deleteIfExists(db, 'partner_withdrawals');
  deleteIfExists(db, 'partners');

  // Employees
  deleteIfExists(db, 'employee_salaries');
  deleteIfExists(db, 'employee_advances');
  deleteIfExists(db, 'employee_withdrawals');
  deleteIfExists(db, 'employees');

  // Audit / sessions / report-related
  deleteIfExists(db, 'audit_log');
  deleteIfExists(db, 'app_sessions');
  deleteIfExists(db, 'menu_item_price_history');

  if (opts.resetSequences && tableExists(db, 'sqlite_sequence')) {
    db.run('DELETE FROM sqlite_sequence');
  }

  // Reset account_balances for cash/bank (required by app)
  if (tableExists(db, 'account_balances')) {
    db.run("DELETE FROM account_balances");
    db.run("INSERT OR IGNORE INTO account_balances (account_type, balance) VALUES ('cash', 0)");
    db.run("INSERT OR IGNORE INTO account_balances (account_type, balance) VALUES ('bank_app', 0)");
  }

  db.run('PRAGMA foreign_keys = ON');
}

module.exports = { runTemplateCleanup };
