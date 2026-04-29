const { getDb } = require('../database');
const { generateUUID } = require('../utils/uuid');
const { parseMoney } = require('../utils/money');
const { logAudit } = require('./audit');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function requestWithdrawal({ partnerId, amount, notes, businessDate }, userId) {
  const db = getDb();
  const amountResult = parseMoney(amount, { allowNull: false });
  const numericAmount = amountResult.ok ? amountResult.value : null;
  if (!partnerId) return { ok: false, error: 'الشريك مطلوب.' };
  if (!amountResult.ok) return { ok: false, error: amountResult.error };
  if (numericAmount <= 0) return { ok: false, error: 'القيمة يجب أن تكون أكبر من صفر.' };

  const dateStr = businessDate != null ? String(businessDate).trim() : '';
  if (!dateStr) return { ok: false, error: 'تاريخ السحب مطلوب. يرجى تحديد تاريخ السحب.' };
  if (!DATE_REGEX.test(dateStr)) return { ok: false, error: 'صيغة التاريخ غير صحيحة (مثال: 2025-02-05).' };

  const withdrawalId = generateUUID();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO withdrawals (
      withdrawal_id, partner_id, amount, status, requested_at, requested_by,
      approved_at, approved_by, business_date, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      withdrawalId,
      partnerId,
      numericAmount,
      'pending',
      now,
      userId,
      null,
      null,
      dateStr,
      notes?.trim() || null
    ]
  );

  logAudit({
    userId,
    action: 'WITHDRAWAL_REQUESTED',
    entityType: 'withdrawal',
    entityId: withdrawalId,
    details: { amount: numericAmount }
  });

  return { ok: true, withdrawalId };
}

function updateWithdrawalStatus(withdrawalId, status, userId) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM withdrawals WHERE withdrawal_id = ?');
  stmt.bind([withdrawalId]);
  const ok = stmt.step();
  const withdrawal = ok ? stmt.getAsObject() : null;
  stmt.free();

  if (!withdrawal) return { ok: false, error: 'طلب السحب غير موجود.' };
  if (!['approved', 'rejected'].includes(status)) {
    return { ok: false, error: 'حالة غير صحيحة.' };
  }
  if (withdrawal.status !== 'pending') {
    return { ok: false, error: 'لا يمكن تعديل هذا الطلب.' };
  }

  const now = new Date().toISOString();
  db.run(
    `UPDATE withdrawals
     SET status = ?, approved_at = ?, approved_by = ?
     WHERE withdrawal_id = ?`,
    [status, now, userId, withdrawalId]
  );

  if (status === 'approved') {
    db.run(
      'UPDATE partners SET total_withdrawals = total_withdrawals + ? WHERE partner_id = ?',
      [withdrawal.amount, withdrawal.partner_id]
    );
  }

  logAudit({
    userId,
    action: status === 'approved' ? 'WITHDRAWAL_APPROVED' : 'WITHDRAWAL_REJECTED',
    entityType: 'withdrawal',
    entityId: withdrawalId,
    details: { amount: withdrawal.amount }
  });

  return { ok: true };
}

function getWithdrawalsReport(startDate, endDate) {
  const db = getDb();
  const stmt = db.prepare(
    `SELECT w.withdrawal_id, p.name as partner_name, w.amount, w.business_date, w.notes, w.requested_at
     FROM withdrawals w
     JOIN partners p ON w.partner_id = p.partner_id
     WHERE w.business_date BETWEEN ? AND ?
     ORDER BY w.requested_at DESC`
  );
  stmt.bind([startDate, endDate]);
  const withdrawals = [];
  while (stmt.step()) {
    withdrawals.push(stmt.getAsObject());
  }
  stmt.free();
  return withdrawals;
}

module.exports = {
  requestWithdrawal,
  updateWithdrawalStatus,
  getWithdrawalsReport
};
