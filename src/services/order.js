const { getDb } = require('../database');
const { getCurrentBusinessDate } = require('./businessDate');
const { logAudit, logDiscountViolation } = require('./audit');
const { generateUUID } = require('../utils/uuid');
const { parseMoney, roundMoney, ceilMoney } = require('../utils/money');

const PAYMENT_METHODS = ['cash', 'bank_app', 'debt'];
const MAX_DISCOUNT_PERCENT = 15;

function getNextOrderNumber(db, businessDate) {
  const stmt = db.prepare(
    'SELECT COALESCE(MAX(order_number), 0) as max_number FROM orders WHERE business_date = ?'
  );
  stmt.bind([businessDate]);
  const ok = stmt.step();
  const row = ok ? stmt.getAsObject() : { max_number: 0 };
  stmt.free();
  return (row.max_number || 0) + 1;
}

function getOrder(orderId) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM orders WHERE order_id = ?');
  stmt.bind([orderId]);
  const ok = stmt.step();
  const order = ok ? stmt.getAsObject() : null;
  stmt.free();
  return order;
}

function getActiveOrderByTable(tableId) {
  const db = getDb();
  if (tableId == null) return null;
  const stmt = db.prepare(
    `SELECT o.*
     FROM orders o
     WHERE o.table_id = ?
       AND o.order_is_received = 0
       AND EXISTS (
         SELECT 1 FROM order_items oi
         WHERE oi.order_id = o.order_id
       )
     ORDER BY o.created_at DESC
     LIMIT 1`
  );
  stmt.bind([tableId]);
  const ok = stmt.step();
  const order = ok ? stmt.getAsObject() : null;
  stmt.free();
  return order;
}

function createOrder({ customerName, customerPhone, notes, tableId }, userId) {
  const db = getDb();

  if (!userId) {
    return { ok: false, error: 'معرّف المستخدم مطلوب.' };
  }

  const businessDate = getCurrentBusinessDate();
  const orderNumber = getNextOrderNumber(db, businessDate);
  const orderId = generateUUID();
  const now = new Date().toISOString();

  // Build column list dynamically based on what exists
  const columns = [
    'order_id', 'order_number', 'business_date', 'customer_name', 'customer_phone',
    'status', 'order_is_received', 'subtotal', 'discount_type', 'discount_value', 'discount_amount', 'total',
    'payment_method', 'notes', 'created_at', 'created_by', 'updated_at'
  ];
  const values = [
    orderId,
    orderNumber,
    businessDate,
    customerName?.trim() || null,
    customerPhone?.trim() || null,
    null,
    0,
    0,
    null,
    null,
    0,
    0,
    null,
    notes?.trim() || null,
    now,
    userId,
    now
  ];

  // Add table_id if provided
  if (tableId != null) {
    columns.push('table_id');
    values.push(tableId);
  }

  db.run(
    `INSERT INTO orders (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    values
  );

  logAudit({
    userId,
    action: 'ORDER_CREATED',
    entityType: 'order',
    entityId: orderId,
    details: { order_number: orderNumber, business_date: businessDate }
  });

  logAudit({
    userId,
    action: 'ORDER_UNRECEIVED',
    entityType: 'order',
    entityId: orderId,
    details: { order_number: orderNumber }
  });

  return {
    ok: true,
    order: getOrder(orderId)
  };
}

function recalculateOrder(orderId) {
  const db = getDb();
  const order = getOrder(orderId);
  if (!order) return { ok: false, error: 'الطلب غير موجود.' };

  const stmt = db.prepare('SELECT SUM(subtotal) as subtotal FROM order_items WHERE order_id = ?');
  stmt.bind([orderId]);
  const ok = stmt.step();
  const result = ok ? stmt.getAsObject() : { subtotal: 0 };
  stmt.free();

  const subtotal = roundMoney(result.subtotal || 0);
  let discountAmount = 0;

  if (order.discount_type === 'percent' && order.discount_value != null) {
    discountAmount = Math.trunc((subtotal * order.discount_value) / 100);
  } else if (order.discount_type === 'amount' && order.discount_value != null) {
    discountAmount = Math.trunc(Number(order.discount_value) || 0);
  }

  const total = ceilMoney(Math.max(0, subtotal - discountAmount));
  const now = new Date().toISOString();

  db.run(
    'UPDATE orders SET subtotal = ?, discount_amount = ?, total = ?, updated_at = ? WHERE order_id = ?',
    [subtotal, discountAmount, total, now, orderId]
  );

  return { ok: true, subtotal, discountAmount, total };
}

function addOrderItem(orderId, menuItemId, quantity, userId) {
  const db = getDb();

  if (!orderId) return { ok: false, error: 'معرّف الطلب مطلوب.' };
  if (!menuItemId) return { ok: false, error: 'معرّف الصنف مطلوب.' };
  if (!quantity || quantity < 1) return { ok: false, error: 'الكمية يجب أن تكون أكبر من صفر.' };

  const order = getOrder(orderId);
  if (!order) return { ok: false, error: 'الطلب غير موجود.' };
  if (order.order_is_received) {
    return { ok: false, error: 'لا يمكن تعديل الطلب بعد الاستلام.' };
  }

  const itemStmt = db.prepare(
    'SELECT * FROM menu_items WHERE menu_item_id = ? AND status = ?'
  );
  itemStmt.bind([menuItemId, 'active']);
  const itemOk = itemStmt.step();
  const item = itemOk ? itemStmt.getAsObject() : null;
  itemStmt.free();

  if (!item || item.current_price == null || item.current_price <= 0) {
    return { ok: false, error: 'الصنف غير متوفر حالياً أو السعر غير صالح.' };
  }

  const existingStmt = db.prepare(
    'SELECT * FROM order_items WHERE order_id = ? AND menu_item_id = ?'
  );
  existingStmt.bind([orderId, menuItemId]);
  const existingItems = [];
  while (existingStmt.step()) {
    existingItems.push(existingStmt.getAsObject());
  }
  existingStmt.free();

  const unitPrice = item.current_price;
  const subtotal = roundMoney(unitPrice * quantity);

  if (existingItems.length > 0) {
    const combinedQuantity =
      existingItems.reduce((sum, existing) => sum + (existing.quantity || 0), 0) + quantity;
    const baseItem = existingItems[0];
    const appliedUnitPrice = baseItem.unit_price != null ? baseItem.unit_price : unitPrice;
    const updatedSubtotal = roundMoney(appliedUnitPrice * combinedQuantity);

    db.run(
      'UPDATE order_items SET quantity = ?, subtotal = ? WHERE order_item_id = ?',
      [combinedQuantity, updatedSubtotal, baseItem.order_item_id]
    );

    const extraIds = existingItems.slice(1).map((existing) => existing.order_item_id);
    if (extraIds.length) {
      db.run(
        `DELETE FROM order_items WHERE order_item_id IN (${extraIds.map(() => '?').join(',')})`,
        extraIds
      );
    }
  } else {
    db.run(
      `INSERT INTO order_items (
        order_item_id, order_id, menu_item_id, item_name, unit_price, quantity, subtotal
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      ,
      [generateUUID(), orderId, menuItemId, item.name, unitPrice, quantity, subtotal]
    );
  }

  recalculateOrder(orderId);

  logAudit({
    userId,
    action: existingItems.length > 0 ? 'ORDER_ITEM_UPDATED' : 'ORDER_ITEM_ADDED',
    entityType: 'order',
    entityId: orderId,
    details: { menu_item_id: menuItemId, quantity }
  });

  return { ok: true };
}

function removeOrderItem(orderItemId, userId) {
  const db = getDb();

  if (!orderItemId) return { ok: false, error: 'معرّف العنصر مطلوب.' };

  const itemStmt = db.prepare('SELECT * FROM order_items WHERE order_item_id = ?');
  itemStmt.bind([orderItemId]);
  const ok = itemStmt.step();
  const item = ok ? itemStmt.getAsObject() : null;
  itemStmt.free();

  if (!item) return { ok: false, error: 'العنصر غير موجود.' };

  const order = getOrder(item.order_id);
  if (!order) return { ok: false, error: 'الطلب غير موجود.' };
  if (order.order_is_received) {
    return { ok: false, error: 'لا يمكن تعديل الطلب بعد الاستلام.' };
  }

  db.run('DELETE FROM order_items WHERE order_item_id = ?', [orderItemId]);

  recalculateOrder(order.order_id);

  logAudit({
    userId,
    action: 'ORDER_ITEM_REMOVED',
    entityType: 'order',
    entityId: order.order_id,
    details: { order_item_id: orderItemId }
  });

  return { ok: true };
}

/**
 * Update order item quantity (e.g. decrement by one).
 * If newQuantity < 1, the item is removed.
 */
function updateItemQuantity(orderItemId, newQuantity, userId) {
  const db = getDb();

  if (!orderItemId) return { ok: false, error: 'معرّف العنصر مطلوب.' };
  if (newQuantity != null && newQuantity < 0) {
    return { ok: false, error: 'الكمية غير صالحة.' };
  }

  const itemStmt = db.prepare('SELECT * FROM order_items WHERE order_item_id = ?');
  itemStmt.bind([orderItemId]);
  const ok = itemStmt.step();
  const item = ok ? itemStmt.getAsObject() : null;
  itemStmt.free();

  if (!item) return { ok: false, error: 'العنصر غير موجود.' };

  const order = getOrder(item.order_id);
  if (!order) return { ok: false, error: 'الطلب غير موجود.' };
  if (order.order_is_received) {
    return { ok: false, error: 'لا يمكن تعديل الطلب بعد الاستلام.' };
  }

  const currentQty = Number(item.quantity) || 0;
  if (newQuantity == null) newQuantity = currentQty - 1;

  if (newQuantity < 1) {
    db.run('DELETE FROM order_items WHERE order_item_id = ?', [orderItemId]);
    recalculateOrder(order.order_id);
    logAudit({
      userId,
      action: 'ORDER_ITEM_REMOVED',
      entityType: 'order',
      entityId: order.order_id,
      details: { order_item_id: orderItemId, reason: 'quantity_decremented_to_zero' }
    });
    return { ok: true };
  }

  const unitPrice = Number(item.unit_price) || 0;
  const newSubtotal = roundMoney(unitPrice * newQuantity);

  db.run(
    'UPDATE order_items SET quantity = ?, subtotal = ? WHERE order_item_id = ?',
    [newQuantity, newSubtotal, orderItemId]
  );

  recalculateOrder(order.order_id);

  logAudit({
    userId,
    action: 'ORDER_ITEM_UPDATED',
    entityType: 'order',
    entityId: order.order_id,
    details: { order_item_id: orderItemId, quantity: newQuantity }
  });

  return { ok: true };
}

function applyDiscount(orderId, discountType, discountValue, user) {
  const db = getDb();
  const order = getOrder(orderId);
  if (!order) return { ok: false, error: 'الطلب غير موجود.' };

  if (order.order_is_received) {
    return { ok: false, error: 'لا يمكن تطبيق خصم بعد الاستلام' };
  }

  if (!['employee', 'manager'].includes(user.role)) {
    return { ok: false, error: 'غير مصرح بتطبيق الخصم' };
  }

  const subtotal = order.subtotal || 0;
  if (subtotal <= 0) return { ok: false, error: 'المجموع الفرعي غير صالح' };

  let discountAmount = 0;
  if (discountType === 'percent') {
    const percentNum = Number(discountValue);
    if (!Number.isFinite(percentNum) || percentNum < 0) {
      return { ok: false, error: 'نسبة الخصم غير صالحة.' };
    }
    if (percentNum > MAX_DISCOUNT_PERCENT) {
      logDiscountViolation({
        userId: user.userId,
        orderId,
        attemptedPercent: percentNum,
        maxAllowed: MAX_DISCOUNT_PERCENT
      });
      return { ok: false, error: `الحد الأقصى للخصم ${MAX_DISCOUNT_PERCENT}%` };
    }
    discountAmount = Math.trunc((subtotal * percentNum) / 100);
  } else if (discountType === 'amount') {
    const amountResult = parseMoney(discountValue, { allowNull: false });
    if (!amountResult.ok) {
      return { ok: false, error: amountResult.error };
    }
    discountAmount = Math.trunc(amountResult.value);
    const effectivePercent = (discountAmount / subtotal) * 100;
    if (effectivePercent > MAX_DISCOUNT_PERCENT + 0.01) {
      logDiscountViolation({
        userId: user.userId,
        orderId,
        attemptedPercent: effectivePercent,
        maxAllowed: MAX_DISCOUNT_PERCENT
      });
      return { ok: false, error: `الحد الأقصى للخصم ${MAX_DISCOUNT_PERCENT}%` };
    }
  } else {
    return { ok: false, error: 'نوع الخصم غير صحيح' };
  }

  const total = ceilMoney(Math.max(0, subtotal - discountAmount));
  db.run(
    `UPDATE orders SET
      discount_type = ?,
      discount_value = ?,
      discount_amount = ?,
      total = ?,
      updated_at = ?
     WHERE order_id = ?`,
    [
      discountType,
      discountValue,
      discountAmount,
      total,
      new Date().toISOString(),
      orderId
    ]
  );

  logAudit({
    userId: user.userId,
    action: 'DISCOUNT_APPLIED',
    entityType: 'order',
    entityId: orderId,
    details: {
      order_number: order.order_number,
      discount_type: discountType,
      discount_value: discountValue,
      discount_amount: discountAmount
    }
  });

  return { ok: true };
}

function removeDiscount(orderId, userId) {
  const db = getDb();
  const order = getOrder(orderId);
  if (!order) return { ok: false, error: 'الطلب غير موجود.' };

  if (order.order_is_received) {
    return { ok: false, error: 'لا يمكن إزالة الخصم بعد الاستلام.' };
  }

  const total = ceilMoney(order.subtotal || 0);
  db.run(
    `UPDATE orders SET
      discount_type = NULL,
      discount_value = NULL,
      discount_amount = 0,
      total = ?,
      updated_at = ?
     WHERE order_id = ?`,
    [total, new Date().toISOString(), orderId]
  );

  logAudit({
    userId,
    action: 'DISCOUNT_REMOVED',
    entityType: 'order',
    entityId: orderId,
    details: { order_number: order.order_number }
  });

  return { ok: true };
}

function markOrderReceived(orderId, paymentMethod, userId) {
  const db = getDb();
  const order = getOrder(orderId);
  if (!order) return { ok: false, error: 'الطلب غير موجود.' };

  if (order.order_is_received) {
    return { ok: false, error: 'الطلب مسجل كمستلم بالفعل.' };
  }

  if (!paymentMethod || !PAYMENT_METHODS.includes(paymentMethod)) {
    return { ok: false, error: 'يرجى اختيار طريقة الدفع.' };
  }

  const now = new Date().toISOString();

  db.run(
    'UPDATE orders SET order_is_received = 1, payment_method = ?, updated_at = ? WHERE order_id = ?',
    [paymentMethod, now, orderId]
  );

  db.run(
    `INSERT INTO payments (
      payment_id, order_id, amount, payment_method, is_refund, business_date, created_at, created_by
    ) VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
    [
      generateUUID(),
      orderId,
      order.total || 0,
      paymentMethod,
      order.business_date,
      now,
      userId
    ]
  );

  logAudit({
    userId,
    action: 'ORDER_RECEIVED',
    entityType: 'order',
    entityId: orderId,
    details: {
      order_number: order.order_number,
      total: order.total,
      payment_method: paymentMethod
    }
  });

  logAudit({
    userId,
    action: 'PAYMENT_APPLIED',
    entityType: 'order',
    entityId: orderId,
    details: {
      order_number: order.order_number,
      amount: order.total,
      payment_method: paymentMethod
    }
  });

  return { ok: true };
}

function markOrderDelivered(orderId, userId) {
  const db = getDb();
  const order = getOrder(orderId);
  if (!order) return { ok: false, error: 'الطلب غير موجود.' };

  if (order.order_is_received) {
    return { ok: false, error: 'تمت محاسبة هذا الطلب بالفعل.' };
  }

  const now = new Date().toISOString();
  db.run('UPDATE orders SET status = ?, updated_at = ? WHERE order_id = ?', [
    'delivered',
    now,
    orderId,
  ]);

  logAudit({
    userId,
    action: 'ORDER_DELIVERED',
    entityType: 'order',
    entityId: orderId,
    details: {
      order_number: order.order_number,
      table_id: order.table_id || null,
    },
  });

  return { ok: true };
}

function cancelOrder(orderId, reason, userId) {
  const db = getDb();
  const order = getOrder(orderId);
  if (!order) return { ok: false, error: 'الطلب غير موجود.' };

  if (order.order_is_received) {
    return { ok: false, error: 'لا يمكن إلغاء الطلب بعد الاستلام.' };
  }

  const now = new Date().toISOString();

  db.run('DELETE FROM order_items WHERE order_id = ?', [orderId]);
  db.run('UPDATE orders SET subtotal = 0, discount_amount = 0, total = 0, updated_at = ? WHERE order_id = ?', [now, orderId]);

  logAudit({
    userId,
    action: 'ORDER_CANCELLED',
    entityType: 'order',
    entityId: orderId,
    details: {
      order_number: order.order_number,
      reason: reason || null
    }
  });

  return { ok: true };
}

function getOrderWithItems(orderId) {
  const db = getDb();
  const order = getOrder(orderId);
  if (!order) return null;

  const itemsStmt = db.prepare(
    `SELECT oi.*, mi.category, mi.icon_path
     FROM order_items oi
     LEFT JOIN menu_items mi ON mi.menu_item_id = oi.menu_item_id
     WHERE oi.order_id = ?
     ORDER BY oi.order_item_id ASC`
  );
  itemsStmt.bind([orderId]);
  const items = [];
  while (itemsStmt.step()) {
    items.push(itemsStmt.getAsObject());
  }
  itemsStmt.free();

  return { ...order, items };
}

module.exports = {
  createOrder,
  addOrderItem,
  removeOrderItem,
  updateItemQuantity,
  applyDiscount,
  removeDiscount,
  markOrderReceived,
  cancelOrder,
  getOrderWithItems,
  recalculateOrder,
  getActiveOrderByTable,
  markOrderDelivered
};
