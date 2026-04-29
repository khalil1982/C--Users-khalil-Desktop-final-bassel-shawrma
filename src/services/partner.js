const { getDb } = require('../database');
const { generateUUID } = require('../utils/uuid');
const { logAudit } = require('./audit');

function createPartner({ name }, userId) {
  const db = getDb();
  const trimmedName = (name || '').trim();
  if (!trimmedName) return { ok: false, error: 'اسم الشريك مطلوب.' };

  const partnerId = generateUUID();
  db.run(
    'INSERT INTO partners (partner_id, name, status, total_withdrawals) VALUES (?, ?, ?, ?)',
    [partnerId, trimmedName, 'active', 0]
  );

  logAudit({
    userId,
    action: 'PARTNER_CREATED',
    entityType: 'partner',
    entityId: partnerId,
    details: { name: trimmedName }
  });

  return { ok: true, partnerId };
}

function getPartners(activeOnly = true) {
  const db = getDb();
  let query = 'SELECT * FROM partners';
  const params = [];
  if (activeOnly) {
    query += ' WHERE status = ?';
    params.push('active');
  }
  query += ' ORDER BY name ASC';
  const stmt = db.prepare(query);
  if (params.length) stmt.bind(params);
  const partners = [];
  while (stmt.step()) {
    partners.push(stmt.getAsObject());
  }
  stmt.free();
  return partners;
}

module.exports = {
  createPartner,
  getPartners
};
