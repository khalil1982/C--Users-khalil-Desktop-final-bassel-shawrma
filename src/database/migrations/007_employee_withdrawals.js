/**
 * Migration: Employee Withdrawals (Advances)
 * Version: 7.0.0
 * Date: 2026-01-28
 * Creates employee_withdrawals table for سحب سلفة.
 */

module.exports = {
  version: '7.0.0',
  name: 'employee_withdrawals',
  description: 'Add employee_withdrawals table for advances',
  up: function (db) {
    db.run(`
      CREATE TABLE IF NOT EXISTS employee_withdrawals (
        withdrawal_id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        amount REAL NOT NULL CHECK(amount >= 0),
        business_date TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_by TEXT NOT NULL,
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    db.run('CREATE INDEX IF NOT EXISTS idx_employee_withdrawals_employee ON employee_withdrawals(employee_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_employee_withdrawals_business_date ON employee_withdrawals(business_date)');
    console.log('  ✅ Employee withdrawals migration completed successfully');
  }
};
