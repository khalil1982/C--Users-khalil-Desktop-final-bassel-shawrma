/**
 * Migration: Menu item soft delete
 * Version: 10.0.0
 * Adds deleted_at to menu_items for permanent hide from menu and POS (orders unchanged).
 */

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
  version: '10.0.0',
  name: 'menu_item_deleted_at',
  description: 'Add deleted_at to menu_items for soft delete',
  up: function (db) {
    if (!columnExists(db, 'menu_items', 'deleted_at')) {
      db.run('ALTER TABLE menu_items ADD COLUMN deleted_at TEXT');
    }
  }
};
