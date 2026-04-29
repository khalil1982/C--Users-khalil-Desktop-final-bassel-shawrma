/**
 * Migration: Employees Module
 * Version: 6.0.0
 * Date: 2026-01-28
 *
 * This migration:
 * - Creates employees table
 * - Creates employee_salaries table for monthly salary tracking
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

module.exports = {
  version: '6.0.0',
  name: 'employees_module',
  description: 'Add employees and employee salaries tables',
  up: function (db) {
    // ============================================
    // STEP 1: Create employees table
    // ============================================
    db.run(`
      CREATE TABLE IF NOT EXISTS employees (
        employee_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        national_id TEXT,
        monthly_salary REAL NOT NULL CHECK(monthly_salary >= 0),
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        notes TEXT
      )
    `);

    db.run('CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status)');

    // ============================================
    // STEP 2: Create employee_salaries table
    // ============================================
    db.run(`
      CREATE TABLE IF NOT EXISTS employee_salaries (
        salary_id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        salary_month TEXT NOT NULL,
        salary_year INTEGER NOT NULL,
        amount REAL NOT NULL CHECK(amount >= 0),
        business_date TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_by TEXT NOT NULL,
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    db.run('CREATE INDEX IF NOT EXISTS idx_employee_salaries_employee ON employee_salaries(employee_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_employee_salaries_month_year ON employee_salaries(salary_year, salary_month)');
    db.run('CREATE INDEX IF NOT EXISTS idx_employee_salaries_business_date ON employee_salaries(business_date)');

    console.log('  ✅ Employees module migration completed successfully');
  }
};
