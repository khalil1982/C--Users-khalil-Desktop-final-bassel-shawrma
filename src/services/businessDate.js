/**
 * Business Date Service
 * Manages business date logic and app session tracking
 *
 * Business Rules (from spec):
 * - business_date = Current system date (day starts at 07:00)
 * - App sessions tracked separately from login sessions
 * - Session start logged when app opens
 * - Session end logged when app closes
 */

const { getDb } = require('../database');
const { generateUUID } = require('../utils/uuid');
const { logAudit } = require('./audit');

/**
 * Gets current business date
 * Simple rule: Current system date in YYYY-MM-DD format
 *
 * @returns {string} Current business date (YYYY-MM-DD)
 *
 * @example
 * getCurrentBusinessDate() // "2026-01-24"
 */
function getCurrentBusinessDate() {
  const now = new Date();
  const local = new Date(now.getTime());
  if (local.getHours() < 7) {
    local.setDate(local.getDate() - 1);
  }
  const year = local.getFullYear();
  const month = `${local.getMonth() + 1}`.padStart(2, '0');
  const day = `${local.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Logs app session start
 * Called when user opens the application
 *
 * @param {number} userId - User ID starting the session
 * @returns {Object} Result object with session ID
 *
 * @throws {Error} If userId is not provided
 */
function logSessionStart(userId) {
  const db = getDb();

  if (!userId) {
    throw new Error('معرّف المستخدم مطلوب');
  }

  try {
    const sessionId = generateUUID();
    const businessDate = getCurrentBusinessDate();
    const startedAt = new Date().toISOString();

    db.run(
      'INSERT INTO app_sessions (id, user_id, started_at, business_date) VALUES (?, ?, ?, ?)',
      [sessionId, userId, startedAt, businessDate]
    );

    // Log to audit
    logAudit({
      userId: userId,
      action: 'APP_SESSION_STARTED',
      entityType: 'app_session',
      entityId: sessionId,
      details: {
        business_date: businessDate,
        started_at: startedAt
      }
    });

    return {
      ok: true,
      sessionId: sessionId,
      businessDate: businessDate
    };

  } catch (error) {
    console.error('Error logging session start:', error);
    throw new Error('فشل في تسجيل بداية الجلسة');
  }
}

/**
 * Logs app session end
 * Called when user closes the application
 *
 * @param {number} userId - User ID ending the session
 * @returns {Object} Result object
 *
 * @throws {Error} If no active session found
 */
function logSessionEnd(userId) {
  const db = getDb();

  if (!userId) {
    throw new Error('معرّف المستخدم مطلوب');
  }

  try {
    const endedAt = new Date().toISOString();

    // Find the most recent active session for this user
    const stmt = db.prepare(`
      SELECT id, started_at, business_date
      FROM app_sessions
      WHERE user_id = ? AND ended_at IS NULL
      ORDER BY started_at DESC
      LIMIT 1
    `);

    stmt.bind([userId]);
    const hasSession = stmt.step();
    const session = hasSession ? stmt.getAsObject() : null;
    stmt.free();

    if (!session) {
      console.warn('No active session found for user:', userId);
      return { ok: false, error: 'لا توجد جلسة نشطة' };
    }

    // Update session with end time
    db.run(
      'UPDATE app_sessions SET ended_at = ? WHERE id = ?',
      [endedAt, session.id]
    );

    // Calculate session duration
    const startTime = new Date(session.started_at);
    const endTime = new Date(endedAt);
    const durationMs = endTime - startTime;
    const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(2);

    // Log to audit
    logAudit({
      userId: userId,
      action: 'APP_SESSION_ENDED',
      entityType: 'app_session',
      entityId: session.id,
      details: {
        business_date: session.business_date,
        started_at: session.started_at,
        ended_at: endedAt,
        duration_hours: parseFloat(durationHours)
      }
    });

    return {
      ok: true,
      sessionId: session.id,
      duration: durationHours
    };

  } catch (error) {
    console.error('Error logging session end:', error);
    throw new Error('فشل في تسجيل نهاية الجلسة');
  }
}

/**
 * Gets active session for a user
 *
 * @param {number} userId - User ID
 * @returns {Object|null} Active session or null
 */
function getActiveSession(userId) {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT *
    FROM app_sessions
    WHERE user_id = ? AND ended_at IS NULL
    ORDER BY started_at DESC
    LIMIT 1
  `);

  stmt.bind([userId]);
  const hasSession = stmt.step();
  const session = hasSession ? stmt.getAsObject() : null;
  stmt.free();

  return session;
}

/**
 * Gets all sessions for a business date
 *
 * @param {string} businessDate - Business date (YYYY-MM-DD)
 * @returns {Array<Object>} Array of sessions
 */
function getSessionsByDate(businessDate) {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT
      s.*,
      u.username
    FROM app_sessions s
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.business_date = ?
    ORDER BY s.started_at DESC
  `);

  stmt.bind([businessDate]);

  const sessions = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();

    // Calculate duration if session ended
    if (row.ended_at) {
      const startTime = new Date(row.started_at);
      const endTime = new Date(row.ended_at);
      const durationMs = endTime - startTime;
      row.duration_hours = (durationMs / (1000 * 60 * 60)).toFixed(2);
    }

    sessions.push(row);
  }
  stmt.free();

  return sessions;
}

/**
 * Gets session statistics for a user
 *
 * @param {number} userId - User ID
 * @param {string} startDate - Start date (optional)
 * @param {string} endDate - End date (optional)
 * @returns {Object} Statistics object
 */
function getUserSessionStats(userId, startDate = null, endDate = null) {
  const db = getDb();

  let query = `
    SELECT
      COUNT(*) as total_sessions,
      SUM(CASE WHEN ended_at IS NOT NULL THEN 1 ELSE 0 END) as completed_sessions,
      SUM(CASE WHEN ended_at IS NULL THEN 1 ELSE 0 END) as active_sessions
    FROM app_sessions
    WHERE user_id = ?
  `;

  const params = [userId];

  if (startDate) {
    query += ' AND business_date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND business_date <= ?';
    params.push(endDate);
  }

  const stmt = db.prepare(query);
  stmt.bind(params);

  const hasResult = stmt.step();
  const stats = hasResult ? stmt.getAsObject() : {};
  stmt.free();

  return stats;
}

module.exports = {
  getCurrentBusinessDate,
  logSessionStart,
  logSessionEnd,
  getActiveSession,
  getSessionsByDate,
  getUserSessionStats
};
