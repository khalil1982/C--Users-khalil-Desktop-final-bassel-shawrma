const { getDb } = require('../database');

function buildDateFilter(from, to) {
  const clauses = [];
  const params = [];
  if (from) {
    clauses.push('created_at >= ?');
    params.push(from);
  }
  if (to) {
    clauses.push('created_at <= ?');
    params.push(to);
  }
  return { clauses, params };
}

function getMyCashierSummary(userId, from, to) {
  const db = getDb();
  if (!userId) {
    return { ok: false, error: 'معرّف المستخدم مطلوب.' };
  }
  const { clauses, params } = buildDateFilter(from, to);
  const where = [
    'order_is_received = 1',
    'created_by = ?',
    ...clauses
  ].join(' AND ');

  const stmt = db.prepare(
    `SELECT COUNT(*) as orders_count,
            COALESCE(SUM(subtotal), 0) as gross_sales,
            COALESCE(SUM(discount_amount), 0) as total_discount,
            COALESCE(SUM(total), 0) as net_sales,
            COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) as cash_sales,
            COALESCE(SUM(CASE WHEN payment_method = 'bank_app' THEN total ELSE 0 END), 0) as bank_app_sales
     FROM orders
     WHERE ${where}`
  );
  stmt.bind([userId, ...params]);
  const ok = stmt.step();
  const summary = ok ? stmt.getAsObject() : null;
  stmt.free();
  return { ok: true, summary: summary || {} };
}

function getAllCashiersSummary(from, to) {
  const db = getDb();
  const { clauses, params } = buildDateFilter(from, to);
  const dateFilter = clauses.length ? `AND ${clauses.join(' AND ')}` : '';

  const stmt = db.prepare(
    `SELECT u.id as user_id, u.username,
            COUNT(o.order_id) as orders_count,
            COALESCE(SUM(o.subtotal), 0) as gross_sales,
            COALESCE(SUM(o.discount_amount), 0) as total_discount,
            COALESCE(SUM(o.total), 0) as net_sales
     FROM users u
     LEFT JOIN orders o
       ON o.created_by = u.id
      AND o.order_is_received = 1
      ${dateFilter}
     WHERE u.status = 'active'
     GROUP BY u.id, u.username
     ORDER BY u.username ASC`
  );
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return { ok: true, summaries: rows };
}

module.exports = {
  getMyCashierSummary,
  getAllCashiersSummary,
};
