const { getDb } = require('../database');

/**
 * Get the currently active shift
 * @returns {Object|null} Active shift object or null if none exists
 */
function getActiveShift() {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM Shifts WHERE status = ? ORDER BY opened_at DESC LIMIT 1');
  stmt.bind(['Active']);
  const ok = stmt.step();
  const shift = ok ? stmt.getAsObject() : null;
  stmt.free();
  return shift;
}

/**
 * Get the last closed shift
 * @returns {Object|null} Last closed shift object or null if none exists
 */
function getLastClosedShift() {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM Shifts WHERE status = ? ORDER BY closed_at DESC LIMIT 1');
  stmt.bind(['Closed']);
  const ok = stmt.step();
  const shift = ok ? stmt.getAsObject() : null;
  stmt.free();
  return shift;
}

/**
 * Check if user is Admin
 * @param {number} userId - User ID
 * @returns {boolean} True if user is Admin
 */
function isAdmin(userId) {
  const db = getDb();
  const stmt = db.prepare('SELECT role FROM Users WHERE user_id = ?');
  stmt.bind([userId]);
  const ok = stmt.step();
  const user = ok ? stmt.getAsObject() : null;
  stmt.free();
  return user && user.role === 'Admin';
}

/**
 * Open a new shift
 * @param {number} userId - User ID opening the shift (must be Admin)
 * @param {string} shiftType - 'Morning' or 'Evening'
 * @returns {Object} Result object with ok flag and data/error
 */
function openShift(userId, shiftType) {
  const db = getDb();

  if (!userId) {
    return { ok: false, error: 'معرّف المستخدم مطلوب.' };
  }

  if (!isAdmin(userId)) {
    return { ok: false, error: 'فقط المدير يمكنه فتح الوردية.' };
  }

  if (shiftType !== 'Morning' && shiftType !== 'Evening') {
    return { ok: false, error: 'نوع الوردية يجب أن يكون صباحية أو مسائية.' };
  }

  const activeShift = getActiveShift();
  if (activeShift) {
    return {
      ok: false,
      error: `يوجد وردية نشطة بالفعل (${activeShift.shift_type}). يجب إغلاقها أولاً.`,
      activeShift: {
        shiftId: activeShift.shift_id,
        shiftType: activeShift.shift_type,
        openedAt: activeShift.opened_at,
      },
    };
  }

  const now = new Date().toISOString();
  db.run(
    'INSERT INTO Shifts (shift_type, opened_by, opened_at, status) VALUES (?, ?, ?, ?)',
    [shiftType, userId, now, 'Active']
  );

  const newShift = getActiveShift();
  return {
    ok: true,
    shift: {
      shiftId: newShift.shift_id,
      shiftType: newShift.shift_type,
      openedBy: newShift.opened_by,
      openedAt: newShift.opened_at,
      status: newShift.status,
    },
  };
}

/**
 * Close the active shift
 * @param {number} userId - User ID closing the shift (must be Admin)
 * @returns {Object} Result object with ok flag and data/error
 */
function closeShift(userId) {
  const db = getDb();

  if (!userId) {
    return { ok: false, error: 'معرّف المستخدم مطلوب.' };
  }

  if (!isAdmin(userId)) {
    return { ok: false, error: 'فقط المدير يمكنه إغلاق الوردية.' };
  }

  const activeShift = getActiveShift();
  if (!activeShift) {
    return { ok: false, error: 'لا توجد وردية نشطة للإغلاق.' };
  }

  const now = new Date().toISOString();
  db.run(
    'UPDATE Shifts SET closed_by = ?, closed_at = ?, status = ? WHERE shift_id = ?',
    [userId, now, 'Closed', activeShift.shift_id]
  );

  const closedShift = db
    .prepare('SELECT * FROM Shifts WHERE shift_id = ?')
    .bind([activeShift.shift_id]);
  const ok = closedShift.step();
  const updatedShift = ok ? closedShift.getAsObject() : null;
  closedShift.free();

  return {
    ok: true,
    shift: {
      shiftId: updatedShift.shift_id,
      shiftType: updatedShift.shift_type,
      openedAt: updatedShift.opened_at,
      closedAt: updatedShift.closed_at,
      openedBy: updatedShift.opened_by,
      closedBy: updatedShift.closed_by,
      status: updatedShift.status,
    },
  };
}

/**
 * Validate that an active shift exists
 * Used before allowing operations like orders
 * @returns {Object} Validation result with ok flag and shift/error
 */
function validateActiveShift() {
  const activeShift = getActiveShift();
  if (!activeShift) {
    return {
      ok: false,
      error: 'لا يمكن تنفيذ العملية. يجب فتح وردية أولاً.',
    };
  }
  return {
    ok: true,
    shift: {
      shiftId: activeShift.shift_id,
      shiftType: activeShift.shift_type,
      openedAt: activeShift.opened_at,
    },
  };
}

module.exports = {
  openShift,
  closeShift,
  getActiveShift,
  getLastClosedShift,
  validateActiveShift,
  isAdmin,
};
