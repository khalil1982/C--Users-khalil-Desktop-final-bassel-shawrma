const { getDb } = require('../database');

function getAllTables() {
  const db = getDb();
  const stmt = db.prepare(
    'SELECT * FROM tables WHERE is_active = 1 ORDER BY table_number ASC'
  );
  const tables = [];
  while (stmt.step()) {
    tables.push(stmt.getAsObject());
  }
  stmt.free();
  return tables;
}

function getTable(tableId) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM tables WHERE table_id = ?');
  stmt.bind([tableId]);
  const ok = stmt.step();
  const table = ok ? stmt.getAsObject() : null;
  stmt.free();
  return table;
}

function updateTableStatus(tableId, status) {
  const db = getDb();
  if (!['available', 'occupied'].includes(status)) {
    return { ok: false, error: 'حالة غير صحيحة.' };
  }
  db.run('UPDATE tables SET status = ? WHERE table_id = ?', [status, tableId]);
  return { ok: true };
}

function createTable(tableNumber) {
  const db = getDb();
  const stmt = db.prepare('SELECT 1 FROM tables WHERE table_number = ?');
  stmt.bind([tableNumber]);
  const exists = stmt.step();
  stmt.free();

  if (exists) {
    return { ok: false, error: 'رقم الطاولة مسجل مسبقاً.' };
  }

  const now = new Date().toISOString();
  db.run(
    'INSERT INTO tables (table_number, status, is_active, created_at) VALUES (?, ?, ?, ?)',
    [tableNumber, 'available', 1, now]
  );

  return { ok: true };
}

function updateTableCount(count) {
  const db = getDb();
  const currentStmt = db.prepare('SELECT COUNT(*) as count FROM tables WHERE is_active = 1');
  currentStmt.step();
  const currentCount = currentStmt.getAsObject().count || 0;
  currentStmt.free();

  if (count < currentCount) {
    // Deactivate extra tables
    const stmt = db.prepare(
      'UPDATE tables SET is_active = 0 WHERE table_id IN (SELECT table_id FROM tables WHERE is_active = 1 ORDER BY table_number DESC LIMIT ?)'
    );
    stmt.bind([currentCount - count]);
    stmt.step();
    stmt.free();
  } else if (count > currentCount) {
    // Add new tables
    const maxStmt = db.prepare('SELECT COALESCE(MAX(table_number), 0) as max_num FROM tables');
    maxStmt.step();
    const maxNum = maxStmt.getAsObject().max_num || 0;
    maxStmt.free();

    const now = new Date().toISOString();
    for (let i = 1; i <= count - currentCount; i++) {
      db.run(
        'INSERT INTO tables (table_number, status, is_active, created_at) VALUES (?, ?, ?, ?)',
        [maxNum + i, 'available', 1, now]
      );
    }
  }

  return { ok: true };
}

module.exports = {
  getAllTables,
  getTable,
  updateTableStatus,
  createTable,
  updateTableCount
};
