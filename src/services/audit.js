/**
 * Audit Service
 * Provides comprehensive audit logging for all system actions
 *
 * Business Rules:
 * - ALL significant actions must be logged
 * - Audit logs are NEVER deleted (immutable)
 * - Each log includes: who, what, when, why
 * - Linked to business_date for reporting
 */

const { getDb } = require('../database');
const { generateUUID } = require('../utils/uuid');

/**
 * Get current business date (YYYY-MM-DD format)
 * @returns {string} Current business date
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
 * Logs an action to the audit log
 *
 * @param {Object} params - Audit log parameters
 * @param {number} params.userId - User performing the action
 * @param {string} params.action - Action name (e.g., 'MENU_ITEM_CREATED')
 * @param {string} params.entityType - Type of entity affected (optional)
 * @param {string} params.entityId - ID of entity affected (optional)
 * @param {Object} params.details - Additional details (will be stringified)
 * @returns {Object} Result object with ok flag
 *
 * @example
 * logAudit({
 *   userId: 1,
 *   action: 'MENU_ITEM_CREATED',
 *   entityType: 'menu_item',
 *   entityId: 'uuid-123',
 *   details: { name: 'بيتا', price: 15 }
 * });
 */
function logAudit(params) {
  const db = getDb();

  if (!params.userId) {
    console.warn('Audit log: userId is required');
    return { ok: false, error: 'userId مطلوب' };
  }

  if (!params.action) {
    console.warn('Audit log: action is required');
    return { ok: false, error: 'action مطلوب' };
  }

  try {
    const auditId = generateUUID();
    const businessDate = getCurrentBusinessDate();
    const timestamp = new Date().toISOString();

    db.run(
      `INSERT INTO audit_log (
        id, user_id, action, entity_type, entity_id,
        timestamp, business_date, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        auditId,
        params.userId,
        params.action,
        params.entityType || null,
        params.entityId || null,
        timestamp,
        businessDate,
        params.details ? JSON.stringify(params.details) : null
      ]
    );

    return { ok: true, auditId };

  } catch (error) {
    console.error('Error logging audit:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Logs a discount violation attempt
 *
 * @param {Object} params - Violation parameters
 * @param {number} params.userId - User who attempted the violation
 * @param {string} params.orderId - Order ID
 * @param {number} params.attemptedPercent - Attempted discount percentage
 * @param {number} params.maxAllowed - Maximum allowed (5%)
 * @returns {Object} Result object
 */
function logDiscountViolation(params) {
  return logAudit({
    userId: params.userId,
    action: 'DISCOUNT_VIOLATION',
    entityType: 'order',
    entityId: params.orderId,
    details: {
      attempted_percent: params.attemptedPercent,
      max_allowed: params.maxAllowed || 5,
      violation_type: 'exceeded_limit'
    }
  });
}

/**
 * Gets audit log entries with filters
 *
 * @param {Object} filters - Filter parameters
 * @param {number} filters.userId - Filter by user ID (optional)
 * @param {string} filters.action - Filter by action (optional)
 * @param {string} filters.businessDate - Filter by business date (optional)
 * @param {number} filters.limit - Max results (default: 100)
 * @returns {Array<Object>} Audit log entries
 */
function getAuditLog(filters = {}) {
  const db = getDb();

  let query = `
    SELECT
      al.*,
      u.username
    FROM audit_log al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE 1=1
  `;

  const params = [];

  if (filters.userId) {
    query += ' AND al.user_id = ?';
    params.push(filters.userId);
  }

  if (filters.action) {
    query += ' AND al.action = ?';
    params.push(filters.action);
  }

  if (filters.businessDate) {
    query += ' AND al.business_date = ?';
    params.push(filters.businessDate);
  }

  if (filters.entityType) {
    query += ' AND al.entity_type = ?';
    params.push(filters.entityType);
  }

  if (filters.entityId) {
    query += ' AND al.entity_id = ?';
    params.push(filters.entityId);
  }

  query += ' ORDER BY al.timestamp DESC';

  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  } else {
    query += ' LIMIT 100';
  }

  const stmt = db.prepare(query);
  if (params.length > 0) {
    stmt.bind(params);
  }

  const results = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    // Parse details if present
    if (row.details) {
      try {
        row.details = JSON.parse(row.details);
      } catch (e) {
        // Keep as string if parse fails
      }
    }
    results.push(row);
  }
  stmt.free();

  return results;
}

/**
 * Gets audit statistics for a business date
 *
 * @param {string} businessDate - Business date (YYYY-MM-DD)
 * @returns {Object} Statistics object
 */
function getAuditStatistics(businessDate) {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT
      action,
      COUNT(*) as count
    FROM audit_log
    WHERE business_date = ?
    GROUP BY action
    ORDER BY count DESC
  `);

  stmt.bind([businessDate]);

  const statistics = {};
  while (stmt.step()) {
    const row = stmt.getAsObject();
    statistics[row.action] = row.count;
  }
  stmt.free();

  return statistics;
}

/**
 * Gets recent order events for cashier activity view
 *
 * @param {number} limit - Number of events to return
 * @returns {Array<Object>} Recent order events
 */
function getRecentOrderEvents(limit = 4) {
  const db = getDb();
  const stmt = db.prepare(
    `SELECT
      al.*,
      o.order_number,
      o.total,
      o.order_is_received,
      o.payment_method,
      o.table_id
    FROM audit_log al
    LEFT JOIN orders o ON al.entity_id = o.order_id
    WHERE al.entity_type = 'order'
      AND al.action = 'PAYMENT_APPLIED'
    ORDER BY al.timestamp DESC
    LIMIT ?`
  );

  stmt.bind([limit]);

  const results = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    if (row.details) {
      try {
        row.details = JSON.parse(row.details);
      } catch (e) {
        // Keep as string if parse fails
      }
    }
    results.push(row);
  }
  stmt.free();

  return results;
}

module.exports = {
  logAudit,
  logDiscountViolation,
  getAuditLog,
  getAuditStatistics,
  getRecentOrderEvents,
  getCurrentBusinessDate
};
