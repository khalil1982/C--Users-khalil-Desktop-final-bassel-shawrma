/**
 * Menu Service
 * Manages menu items, pricing, and price history
 *
 * Business Rules:
 * - Only MANAGER (Admin) can create/update/delete menu items
 * - Only MANAGER can update prices
 * - Price changes are tracked in menu_item_price_history
 * - Price changes do NOT affect existing orders (snapshot model)
 * - Menu item names must be unique within category
 * - All prices must be >= 0
 * - All actions are logged to audit
 */

const { getDb } = require('../database');
const { generateUUID } = require('../utils/uuid');
const { parseMoney } = require('../utils/money');
const { logAudit } = require('./audit');

/**
 * Validates user has manager role
 *
 * @param {number} userId - User ID to check
 * @returns {Object} Validation result
 * @throws {Error} If user is not a manager
 */
function validateManagerRole(userId) {
  const db = getDb();

  const stmt = db.prepare('SELECT role FROM users WHERE id = ?');
  stmt.bind([userId]);
  const hasUser = stmt.step();
  const user = hasUser ? stmt.getAsObject() : null;
  stmt.free();

  if (!user) {
    throw new Error('المستخدم غير موجود');
  }

  // Manager role for admin permissions
  if (user.role !== 'manager') {
    throw new Error('غير مصرح - هذه العملية للمدير فقط');
  }

  return { ok: true, role: user.role };
}

/**
 * Gets default icon for category
 *
 * @param {string} category - Category name
 * @returns {string} Default icon emoji
 */
function getDefaultIcon(category) {
  const icons = {
    shawarma: '🥙',
    drinks: '🥤',
    extras: '➕'
  };
  return icons[category] || '🍽️';
}

/**
 * Creates a new menu item
 *
 * @param {Object} data - Menu item data
 * @param {string} data.name - Item name (Arabic)
 * @param {string} data.name_en - Item name (English) - optional
 * @param {string} data.category - Category: 'shawarma', 'drinks', 'extras'
 * @param {number} data.price - Current price (must be >= 0)
 * @param {string} data.icon_path - Icon emoji or path (optional)
 * @param {number} data.sort_order - Display order (optional)
 * @param {number} userId - User creating the item
 * @returns {Object} Result object with created menu item
 *
 * @throws {Error} If user is not MANAGER
 * @throws {Error} If price is negative
 * @throws {Error} If duplicate name in category
 *
 * @example
 * createMenuItem({
 *   name: 'بيتا',
 *   name_en: 'Pita',
 *   category: 'shawarma',
 *   price: 15,
 *   icon_path: '🌯'
 * }, userId);
 */
function createMenuItem(data, userId) {
  const db = getDb();

  // Validate user role
  validateManagerRole(userId);

  // Validate data
  if (!data.name || data.name.trim() === '') {
    return { ok: false, error: 'اسم الصنف مطلوب' };
  }

  if (!data.category || !['shawarma', 'drinks', 'extras'].includes(data.category)) {
    return { ok: false, error: 'الفئة غير صحيحة. يجب أن تكون: shawarma, drinks, أو extras' };
  }

  if (data.price != null) {
    const priceResult = parseMoney(data.price, { allowNull: false });
    if (!priceResult.ok) {
      return { ok: false, error: priceResult.error };
    }
    if (priceResult.value < 0) {
      return { ok: false, error: 'السعر يجب أن يكون رقم موجب أو صفر' };
    }
  }

  // Check for duplicate name in same category
  const checkStmt = db.prepare(
    'SELECT menu_item_id FROM menu_items WHERE name = ? AND category = ?'
  );
  checkStmt.bind([data.name.trim(), data.category]);
  const exists = checkStmt.step();
  checkStmt.free();

  if (exists) {
    return { ok: false, error: 'هذا الصنف موجود بالفعل في هذه الفئة' };
  }

  try {
    const menuItemId = generateUUID();
    const now = new Date().toISOString();
    const hasPrice = data.price != null;
    const normalizedPrice = hasPrice ? parseMoney(data.price, { allowNull: false }).value : null;
    const status = hasPrice ? 'active' : 'inactive';

    db.run(
      `INSERT INTO menu_items (
        menu_item_id, name, name_en, category, current_price,
        status, icon_path, sort_order, created_at, created_by,
        last_price_update, last_updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        menuItemId,
        data.name.trim(),
        data.name_en?.trim() || null,
        data.category,
        hasPrice ? normalizedPrice : null,
        status,
        data.icon_path || getDefaultIcon(data.category),
        data.sort_order || 0,
        now,
        userId,
        hasPrice ? now : null,
        hasPrice ? userId : null
      ]
    );

    // Get created item
    const stmt = db.prepare('SELECT * FROM menu_items WHERE menu_item_id = ?');
    stmt.bind([menuItemId]);
    const hasItem = stmt.step();
    const menuItem = hasItem ? stmt.getAsObject() : null;
    stmt.free();

    // Log to audit
    logAudit({
      userId: userId,
      action: 'MENU_ITEM_CREATED',
      entityType: 'menu_item',
      entityId: menuItemId,
      details: {
        name: data.name,
        category: data.category,
        price: normalizedPrice
      }
    });

    return { ok: true, menuItem };

  } catch (error) {
    console.error('Error creating menu item:', error);
    return { ok: false, error: 'فشل في إضافة الصنف' };
  }
}

/**
 * Updates menu item price with history tracking
 *
 * @param {string} itemId - Menu item UUID
 * @param {number} newPrice - New price (must be >= 0)
 * @param {string} reason - Reason for price change
 * @param {number} userId - User making the change
 * @returns {Object} Result object with updated menu item
 *
 * @throws {Error} If user is not MANAGER
 * @throws {Error} If item not found
 * @throws {Error} If price is negative
 *
 * Business Rules:
 * - Only MANAGER can update prices
 * - Price history is preserved in menu_item_price_history
 * - Does NOT affect existing orders (they keep snapshot price)
 * - Audit log entry created
 */
function updateItemPrice(itemId, newPrice, reason, userId) {
  const db = getDb();

  // Validate user role
  validateManagerRole(userId);

  // Validate price
  if (newPrice == null) {
    return { ok: false, error: 'السعر مطلوب' };
  }
  const priceResult = parseMoney(newPrice, { allowNull: false });
  if (!priceResult.ok) {
    return { ok: false, error: priceResult.error };
  }
  if (priceResult.value < 0) {
    return { ok: false, error: 'السعر يجب أن يكون رقم موجب أو صفر' };
  }
  const normalizedPrice = priceResult.value;

  // Get current item
  const itemStmt = db.prepare('SELECT * FROM menu_items WHERE menu_item_id = ?');
  itemStmt.bind([itemId]);
  const hasItem = itemStmt.step();
  const item = hasItem ? itemStmt.getAsObject() : null;
  itemStmt.free();

  if (!item) {
    return { ok: false, error: 'الصنف غير موجود' };
  }

  // Check if price actually changed
  if (item.current_price === normalizedPrice) {
    return { ok: false, error: 'السعر الجديد مطابق للسعر الحالي' };
  }

  try {
    const now = new Date().toISOString();
    const historyId = generateUUID();

    db.run(
      `INSERT INTO menu_item_price_history (
        history_id, menu_item_id, old_price, new_price,
        changed_at, changed_by, reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        historyId,
        itemId,
        item.current_price == null ? 0 : item.current_price,
        normalizedPrice,
        now,
        userId,
        reason || null
      ]
    );

    // Update current price
    db.run(
      `UPDATE menu_items
       SET current_price = ?,
           last_price_update = ?,
           last_updated_by = ?,
           status = ?
       WHERE menu_item_id = ?`,
      [normalizedPrice, now, userId, 'active', itemId]
    );

    // Get updated item
    const updatedStmt = db.prepare('SELECT * FROM menu_items WHERE menu_item_id = ?');
    updatedStmt.bind([itemId]);
    const hasUpdated = updatedStmt.step();
    const updatedItem = hasUpdated ? updatedStmt.getAsObject() : null;
    updatedStmt.free();

    // Log to audit
    logAudit({
      userId: userId,
      action: 'MENU_ITEM_PRICE_UPDATED',
      entityType: 'menu_item',
      entityId: itemId,
      details: {
        name: item.name,
        old_price: item.current_price,
        new_price: normalizedPrice,
        reason: reason
      }
    });

    return { ok: true, menuItem: updatedItem };

  } catch (error) {
    console.error('Error updating price:', error);
    return { ok: false, error: 'فشل في تحديث السعر' };
  }
}

/**
 * Toggles menu item status (active/inactive)
 *
 * @param {string} itemId - Menu item UUID
 * @param {number} userId - User making the change
 * @returns {Object} Result object with updated menu item
 *
 * @throws {Error} If user is not MANAGER
 * @throws {Error} If item not found
 *
 * Business Rules:
 * - Only MANAGER can toggle status
 * - Inactive items not shown in order UI
 * - Audit log entry created
 */
function toggleItemStatus(itemId, userId) {
  const db = getDb();

  // Validate user role
  validateManagerRole(userId);

  // Get current item
  const itemStmt = db.prepare('SELECT * FROM menu_items WHERE menu_item_id = ?');
  itemStmt.bind([itemId]);
  const hasItem = itemStmt.step();
  const item = hasItem ? itemStmt.getAsObject() : null;
  itemStmt.free();

  if (!item) {
    return { ok: false, error: 'الصنف غير موجود' };
  }

  try {
    const newStatus = item.status === 'active' ? 'inactive' : 'active';

    if (newStatus === 'active' && item.current_price == null) {
      return { ok: false, error: 'لا يمكن تفعيل صنف بدون سعر' };
    }

    db.run(
      'UPDATE menu_items SET status = ? WHERE menu_item_id = ?',
      [newStatus, itemId]
    );

    // Get updated item
    const updatedStmt = db.prepare('SELECT * FROM menu_items WHERE menu_item_id = ?');
    updatedStmt.bind([itemId]);
    const hasUpdated = updatedStmt.step();
    const updatedItem = hasUpdated ? updatedStmt.getAsObject() : null;
    updatedStmt.free();

    // Log to audit
    logAudit({
      userId: userId,
      action: 'MENU_ITEM_STATUS_CHANGED',
      entityType: 'menu_item',
      entityId: itemId,
      details: {
        name: item.name,
        old_status: item.status,
        new_status: newStatus
      }
    });

    return { ok: true, menuItem: updatedItem };

  } catch (error) {
    console.error('Error toggling status:', error);
    return { ok: false, error: 'فشل في تغيير حالة الصنف' };
  }
}

/**
 * Gets all menu items by category
 *
 * @param {string} category - Category filter (optional)
 * @param {boolean} activeOnly - Return only active items (default: true)
 * @returns {Array<Object>} Menu items
 *
 * No auth required (public data for order creation)
 */
function getMenuItems(category = null, activeOnly = true) {
  const db = getDb();

  let query = 'SELECT * FROM menu_items WHERE (deleted_at IS NULL)';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (activeOnly) {
    query += ' AND status = ? AND current_price IS NOT NULL';
    params.push('active');
  }

  query += ' ORDER BY sort_order ASC, name ASC';

  const stmt = db.prepare(query);
  if (params.length > 0) {
    stmt.bind(params);
  }

  const items = [];
  while (stmt.step()) {
    items.push(stmt.getAsObject());
  }
  stmt.free();

  return items;
}

/**
 * Gets a single menu item by ID
 *
 * @param {string} itemId - Menu item UUID
 * @returns {Object|null} Menu item or null
 */
function getMenuItem(itemId) {
  const db = getDb();

  const stmt = db.prepare('SELECT * FROM menu_items WHERE menu_item_id = ?');
  stmt.bind([itemId]);
  const hasItem = stmt.step();
  const item = hasItem ? stmt.getAsObject() : null;
  stmt.free();

  return item;
}

/**
 * Gets price history for a menu item
 *
 * @param {string} itemId - Menu item UUID
 * @returns {Array<Object>} Price history records
 */
function getPriceHistory(itemId) {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT
      mph.*,
      u.username as changed_by_username
    FROM menu_item_price_history mph
    LEFT JOIN users u ON mph.changed_by = u.id
    WHERE mph.menu_item_id = ?
    ORDER BY mph.changed_at DESC
  `);

  stmt.bind([itemId]);

  const history = [];
  while (stmt.step()) {
    history.push(stmt.getAsObject());
  }
  stmt.free();

  return history;
}

/**
 * Updates menu item details (name, icon, sort order)
 *
 * @param {string} itemId - Menu item UUID
 * @param {Object} updates - Fields to update
 * @param {number} userId - User making the change
 * @returns {Object} Result object
 */
function updateMenuItem(itemId, updates, userId) {
  const db = getDb();

  // Validate user role
  validateManagerRole(userId);

  // Get current item
  const itemStmt = db.prepare('SELECT * FROM menu_items WHERE menu_item_id = ?');
  itemStmt.bind([itemId]);
  const hasItem = itemStmt.step();
  const item = hasItem ? itemStmt.getAsObject() : null;
  itemStmt.free();

  if (!item) {
    return { ok: false, error: 'الصنف غير موجود' };
  }

  try {
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name.trim());
    }

    if (updates.name_en !== undefined) {
      fields.push('name_en = ?');
      values.push(updates.name_en?.trim() || null);
    }

    if (updates.icon_path !== undefined) {
      fields.push('icon_path = ?');
      values.push(updates.icon_path);
    }

    if (updates.sort_order !== undefined) {
      fields.push('sort_order = ?');
      values.push(updates.sort_order);
    }

    if (fields.length === 0) {
      return { ok: false, error: 'لا توجد حقول للتحديث' };
    }

    values.push(itemId);

    db.run(
      `UPDATE menu_items SET ${fields.join(', ')} WHERE menu_item_id = ?`,
      values
    );

    // Get updated item
    const updatedStmt = db.prepare('SELECT * FROM menu_items WHERE menu_item_id = ?');
    updatedStmt.bind([itemId]);
    const hasUpdated = updatedStmt.step();
    const updatedItem = hasUpdated ? updatedStmt.getAsObject() : null;
    updatedStmt.free();

    // Log to audit
    logAudit({
      userId: userId,
      action: 'MENU_ITEM_UPDATED',
      entityType: 'menu_item',
      entityId: itemId,
      details: {
        name: item.name,
        updates: updates
      }
    });

    return { ok: true, menuItem: updatedItem };

  } catch (error) {
    console.error('Error updating menu item:', error);
    return { ok: false, error: 'فشل في تحديث الصنف' };
  }
}

/**
 * Deletes (soft delete) a menu item: sets deleted_at so it is hidden from menu and POS.
 * Existing orders keep their order_items (snapshot); no FK or structure impact.
 *
 * @param {string} itemId - Menu item UUID
 * @param {number} userId - User making the change
 * @returns {Object} Result object
 */
function deleteMenuItem(itemId, userId) {
  const db = getDb();

  validateManagerRole(userId);

  const itemStmt = db.prepare('SELECT * FROM menu_items WHERE menu_item_id = ?');
  itemStmt.bind([itemId]);
  const hasItem = itemStmt.step();
  const item = hasItem ? itemStmt.getAsObject() : null;
  itemStmt.free();

  if (!item) {
    return { ok: false, error: 'الصنف غير موجود' };
  }

  if (item.deleted_at) {
    return { ok: false, error: 'الصنف محذوف بالفعل' };
  }

  try {
    const now = new Date().toISOString();

    db.run(
      'UPDATE menu_items SET deleted_at = ?, status = ? WHERE menu_item_id = ?',
      [now, 'inactive', itemId]
    );

    logAudit({
      userId: userId,
      action: 'MENU_ITEM_DELETED',
      entityType: 'menu_item',
      entityId: itemId,
      details: { name: item.name, category: item.category }
    });

    return { ok: true };
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return { ok: false, error: 'فشل في حذف الصنف' };
  }
}

module.exports = {
  createMenuItem,
  updateItemPrice,
  toggleItemStatus,
  getMenuItems,
  getMenuItem,
  getPriceHistory,
  updateMenuItem,
  deleteMenuItem,
  getDefaultIcon
};
