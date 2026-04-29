const { getDb, persistDatabase } = require('../database');
const fs = require('fs');

/**
 * Export all database tables to JSON structure
 * @returns {Object} Backup data with metadata and all table data
 */
function exportBackup() {
  const db = getDb();
  
  // Get all table names (excluding sqlite system tables)
  const tablesStmt = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `);
  
  const tables = [];
  while (tablesStmt.step()) {
    tables.push(tablesStmt.getAsObject().name);
  }
  tablesStmt.free();
  
  const backup = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    tables: {},
  };
  
  // Export each table's data
  for (const tableName of tables) {
    try {
      const stmt = db.prepare(`SELECT * FROM ${tableName}`);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      backup.tables[tableName] = rows;
    } catch (error) {
      console.error(`[BACKUP] Failed to export table ${tableName}:`, error);
      // Continue with other tables even if one fails
      backup.tables[tableName] = [];
    }
  }
  
  return backup;
}

/**
 * Validate backup JSON structure
 * @param {Object} backup - Backup data object
 * @returns {Object} Validation result
 */
function validateBackup(backup) {
  if (!backup || typeof backup !== 'object') {
    return { ok: false, error: 'ملف النسخ الاحتياطي غير صالح: البيانات غير موجودة.' };
  }
  
  if (!backup.version || !backup.tables || typeof backup.tables !== 'object') {
    return { ok: false, error: 'ملف النسخ الاحتياطي غير صالح: البنية غير صحيحة.' };
  }
  
  if (!Array.isArray(backup.tables)) {
    // Check if tables is an object with arrays
    for (const [tableName, rows] of Object.entries(backup.tables)) {
      if (!Array.isArray(rows)) {
        return { ok: false, error: `ملف النسخ الاحتياطي غير صالح: جدول ${tableName} غير صالح.` };
      }
    }
  }
  
  return { ok: true };
}

/**
 * Restore database from backup JSON
 * @param {Object} backup - Backup data object
 * @returns {Object} Restore result
 */
function restoreBackup(backup) {
  const validation = validateBackup(backup);
  if (!validation.ok) {
    return validation;
  }
  
  const db = getDb();
  
  try {
    // Disable foreign keys temporarily
    db.run('PRAGMA foreign_keys = OFF');
    
    // Begin transaction
    db.run('BEGIN TRANSACTION');
    
    try {
      // Clear existing tables (in reverse dependency order to avoid FK issues)
      const clearOrder = [
        'order_items',
        'order_status_history',
        'payments',
        'debt_transactions',
        'employee_withdrawals',
        'employee_salaries',
        'withdrawals',
        'expenses',
        'orders',
        'customers',
        'employees',
        'partners',
        'menu_item_price_history',
        'audit_log',
        'app_sessions',
        'account_balances',
        'menu_items',
        'expense_categories',
        'tables',
        'migrations',
        'users',
      ];
      
      // Clear tables that exist
      for (const tableName of clearOrder) {
        try {
          db.run(`DELETE FROM ${tableName}`);
        } catch (error) {
          // Table might not exist, continue
          console.log(`[RESTORE] Table ${tableName} not found or already empty, skipping clear`);
        }
      }
      
      // Restore data for each table
      for (const [tableName, rows] of Object.entries(backup.tables)) {
        if (!Array.isArray(rows) || rows.length === 0) {
          continue;
        }
        
        try {
          // Get column names from first row
          const firstRow = rows[0];
          const columns = Object.keys(firstRow);
          
          if (columns.length === 0) {
            continue;
          }
          
          // Build INSERT statement
          const placeholders = columns.map(() => '?').join(', ');
          const columnNames = columns.join(', ');
          const insertSql = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;
          
          // Insert rows
          for (const row of rows) {
            const values = columns.map(col => row[col] ?? null);
            db.run(insertSql, values);
          }
          
          console.log(`[RESTORE] Restored ${rows.length} rows to table ${tableName}`);
        } catch (error) {
          console.error(`[RESTORE] Failed to restore table ${tableName}:`, error);
          // Rollback transaction on error
          db.run('ROLLBACK');
          db.run('PRAGMA foreign_keys = ON');
          return { ok: false, error: `فشل استعادة جدول ${tableName}: ${error.message}` };
        }
      }
      
      // Commit transaction
      db.run('COMMIT');
      db.run('PRAGMA foreign_keys = ON');
      
      // Persist database to disk
      persistDatabase();
      
      return { ok: true };
    } catch (error) {
      // Rollback on any error
      db.run('ROLLBACK');
      db.run('PRAGMA foreign_keys = ON');
      throw error;
    }
  } catch (error) {
    console.error('[RESTORE] Restore failed:', error);
    return { ok: false, error: `فشل الاستعادة: ${error.message}` };
  }
}

module.exports = {
  exportBackup,
  restoreBackup,
  validateBackup,
};
