/**
 * Migration: Ensure Employee Withdrawals Table Exists
 * Version: 8.0.1
 * Date: 2026-01-29
 * Safety migration to ensure employee_withdrawals table exists.
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

module.exports = {
  version: '8.0.1',
  name: 'ensure_employee_withdrawals',
  description: 'Ensure employee_withdrawals table exists',
  up: function (db) {
    if (!tableExists(db, 'employee_withdrawals')) {
      console.log('  ⚠️  employee_withdrawals table missing, creating...');
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
      console.log('  ✅ employee_withdrawals table created');
    } else {
      console.log('  ✅ employee_withdrawals table already exists');
    }
  }
};
