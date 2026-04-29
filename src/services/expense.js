const { getDb } = require('../database');
const { generateUUID } = require('../utils/uuid');
const { parseMoney } = require('../utils/money');
const { getCurrentBusinessDate } = require('./businessDate');
const { logAudit } = require('./audit');

function createExpenseCategory({ name, nameEn }, userId) {
  const db = getDb();
  if (!name || !name.trim()) {
    return { ok: false, error: 'اسم الفئة مطلوب.' };
  }

  const categoryId = generateUUID();
  db.run(
    'INSERT INTO expense_categories (category_id, name, name_en, is_active) VALUES (?, ?, ?, 1)',
    [categoryId, name.trim(), nameEn?.trim() || null]
  );

  logAudit({
    userId,
    action: 'EXPENSE_CATEGORY_CREATED',
    entityType: 'expense_category',
    entityId: categoryId,
    details: { name: name.trim() }
  });

  return { ok: true, categoryId };
}

function getExpenseCategories(activeOnly = true) {
  const db = getDb();
  let query = 'SELECT * FROM expense_categories';
  const params = [];
  if (activeOnly) {
    query += ' WHERE is_active = 1';
  }
  query += ' ORDER BY name ASC';
  const stmt = db.prepare(query);
  if (params.length) stmt.bind(params);
  const categories = [];
  while (stmt.step()) {
    categories.push(stmt.getAsObject());
  }
  stmt.free();
  return categories;
}

function updateExpenseCategory(categoryId, { name, nameEn }, userId) {
  const db = getDb();
  if (!categoryId || !name || !name.trim()) {
    return { ok: false, error: 'معرّف الفئة واسمها مطلوبان.' };
  }
  db.run(
    'UPDATE expense_categories SET name = ?, name_en = ? WHERE category_id = ? AND is_active = 1',
    [name.trim(), (nameEn || '').trim() || null, categoryId]
  );
  if (db.getRowsModified() === 0) {
    return { ok: false, error: 'الفئة غير موجودة أو معطّلة.' };
  }
  logAudit({
    userId,
    action: 'EXPENSE_CATEGORY_UPDATED',
    entityType: 'expense_category',
    entityId: categoryId,
    details: { name: name.trim() }
  });
  return { ok: true };
}

function deleteExpenseCategory(categoryId, userId) {
  const db = getDb();
  if (!categoryId) {
    return { ok: false, error: 'معرّف الفئة مطلوب.' };
  }
  db.run('UPDATE expense_categories SET is_active = 0 WHERE category_id = ?', [categoryId]);
  if (db.getRowsModified() === 0) {
    return { ok: false, error: 'الفئة غير موجودة.' };
  }
  logAudit({
    userId,
    action: 'EXPENSE_CATEGORY_DELETED',
    entityType: 'expense_category',
    entityId: categoryId,
    details: {}
  });
  return { ok: true };
}

function createExpense({ categoryId, amount, description, attachmentPath }, userId) {
  const db = getDb();
  const amountResult = parseMoney(amount, { allowNull: false });
  const numericAmount = amountResult.ok ? amountResult.value : null;
  const note = (description || '').trim();

  if (!userId) {
    return { ok: false, error: 'معرّف المستخدم مطلوب.' };
  }
  if (!categoryId) {
    return { ok: false, error: 'فئة المصروف مطلوبة.' };
  }
  if (!amountResult.ok) {
    return { ok: false, error: amountResult.error };
  }
  if (numericAmount <= 0) {
    return { ok: false, error: 'القيمة يجب أن تكون أكبر من صفر.' };
  }
  if (!note) {
    return { ok: false, error: 'الوصف مطلوب.' };
  }

  const businessDate = getCurrentBusinessDate();
  const expenseId = generateUUID();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO expenses (
      expense_id, category_id, amount, business_date, description,
      attachment_path, created_at, created_by, is_archived
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      expenseId,
      categoryId,
      numericAmount,
      businessDate,
      note,
      attachmentPath || null,
      now,
      userId
    ]
  );

  logAudit({
    userId,
    action: 'PURCHASE_CREATED',
    entityType: 'expense',
    entityId: expenseId,
    details: { amount: numericAmount, business_date: businessDate, category_id: categoryId }
  });

  return { ok: true, expenseId };
}

function getExpensesByDate(businessDate) {
  const db = getDb();
  const stmt = db.prepare(
    `SELECT e.*, c.name as category_name
     FROM expenses e
     LEFT JOIN expense_categories c ON e.category_id = c.category_id
     WHERE e.business_date = ?
     ORDER BY e.created_at DESC`
  );
  stmt.bind([businessDate]);
  const expenses = [];
  while (stmt.step()) {
    expenses.push(stmt.getAsObject());
  }
  stmt.free();
  return expenses;
}

module.exports = {
  createExpenseCategory,
  getExpenseCategories,
  updateExpenseCategory,
  deleteExpenseCategory,
  createExpense,
  getExpensesByDate
};
