const { getDb } = require('../database');
const { generateUUID } = require('../utils/uuid');
const { parseMoney, roundMoney } = require('../utils/money');
const { getCurrentBusinessDate } = require('./businessDate');
const { logAudit } = require('./audit');
const { MAX_DEBT_SHEKELS } = require('../constants');

function createCustomer({ name, phone, debtLimit, notes, nationalId }, userId = null) {
  const db = getDb();
  const trimmedName = (name || '').trim();
  const trimmedPhone = phone ? phone.trim() : null;
  const trimmedNationalId = nationalId ? nationalId.trim() : null;

  if (!trimmedName) {
    return { ok: false, error: 'اسم الزبون مطلوب.' };
  }
  if (!trimmedPhone) {
    return { ok: false, error: 'رقم الهاتف مطلوب.' };
  }

  const existing = getCustomerByPhone(trimmedPhone);
  if (existing) {
    return { ok: false, error: 'رقم الهاتف مسجل مسبقاً.' };
  }

  const customerId = generateUUID();
  const now = new Date().toISOString();
  const limitResult = debtLimit != null
    ? parseMoney(debtLimit, { allowNull: false })
    : { ok: true, value: 500 };
  if (!limitResult.ok) {
    return { ok: false, error: limitResult.error };
  }
  const limit = limitResult.value;

  db.run(
    `INSERT INTO customers (
      customer_id, name, phone, national_id, debt_limit, current_debt, status, created_at, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      customerId,
      trimmedName,
      trimmedPhone,
      trimmedNationalId,
      limit >= 0 ? limit : 500,
      0,
      'active',
      now,
      notes?.trim() || null
    ]
  );

  if (userId) {
    logAudit({
      userId,
      action: 'CUSTOMER_CREATED',
      entityType: 'customer',
      entityId: customerId,
      details: { name: trimmedName, phone: trimmedPhone }
    });
  }

  return { ok: true, customerId };
}

function createOrUpdateCustomerByPhone({ name, phone, nationalId }, userId) {
  const trimmedName = (name || '').trim();
  const trimmedPhone = phone ? phone.trim() : null;

  if (!trimmedName) {
    return { ok: false, error: 'اسم الزبون مطلوب.' };
  }
  if (!trimmedPhone) {
    return { ok: false, error: 'رقم الهاتف مطلوب.' };
  }

  const existing = getCustomerByPhone(trimmedPhone);
  if (existing) {
    const updatedName = trimmedName || existing.name;
    const updatedNationalId = nationalId?.trim() || existing.national_id || null;

    const db = getDb();
    db.run(
      'UPDATE customers SET name = ?, national_id = ? WHERE customer_id = ?',
      [updatedName, updatedNationalId, existing.customer_id]
    );

    logAudit({
      userId,
      action: 'CUSTOMER_UPDATED',
      entityType: 'customer',
      entityId: existing.customer_id,
      details: { name: updatedName, phone: trimmedPhone }
    });

    return { ok: true, customerId: existing.customer_id };
  }

  return createCustomer({ name: trimmedName, phone: trimmedPhone, nationalId }, userId);
}

function getCustomer(customerId) {
  if (!customerId) return null;
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM customers WHERE customer_id = ?');
  stmt.bind([customerId]);
  const ok = stmt.step();
  const customer = ok ? stmt.getAsObject() : null;
  stmt.free();
  return customer;
}

function getCustomerByPhone(phone) {
  if (!phone) return null;
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM customers WHERE phone = ?');
  stmt.bind([phone]);
  const ok = stmt.step();
  const customer = ok ? stmt.getAsObject() : null;
  stmt.free();
  return customer;
}

function getCustomerByNationalId(nationalId) {
  if (!nationalId) return null;
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM customers WHERE national_id = ?');
  stmt.bind([nationalId]);
  const ok = stmt.step();
  const customer = ok ? stmt.getAsObject() : null;
  stmt.free();
  return customer;
}

function findCustomerForDebt(phone, nationalId) {
  const trimmedPhone = phone ? String(phone).trim() : null;
  const trimmedNationalId = nationalId ? String(nationalId).trim() : null;
  if (trimmedPhone) {
    const byPhone = getCustomerByPhone(trimmedPhone);
    if (byPhone) return byPhone;
  }
  if (trimmedNationalId) {
    const byNationalId = getCustomerByNationalId(trimmedNationalId);
    if (byNationalId) return byNationalId;
  }
  return null;
}

function ensureAccountBalance(accountType) {
  const db = getDb();
  db.run(
    'INSERT OR IGNORE INTO account_balances (account_type, balance) VALUES (?, ?)',
    [accountType, 0]
  );
}

function adjustAccountBalance(accountType, amount) {
  if (!['cash', 'bank_app'].includes(accountType)) {
    return { ok: false, error: 'طريقة الدفع غير صحيحة.' };
  }
  ensureAccountBalance(accountType);
  const db = getDb();
  const updated = roundMoney(amount);
  db.run(
    'UPDATE account_balances SET balance = round(balance + ?, 1) WHERE account_type = ?',
    [updated, accountType]
  );
  return { ok: true };
}

function recordDebtTransaction(
  { customerId, transactionType, amount, orderId, notes, paymentMethod },
  userId
) {
  const db = getDb();
  if (!customerId) return { ok: false, error: 'الزبون مطلوب.' };
  if (!['debt_increase', 'payment'].includes(transactionType)) {
    return { ok: false, error: 'نوع العملية غير صحيح.' };
  }
  const amountResult = parseMoney(amount, { allowNull: false });
  if (!amountResult.ok) {
    return { ok: false, error: amountResult.error };
  }
  const numericAmount = amountResult.value;
  if (numericAmount <= 0) {
    return { ok: false, error: 'القيمة يجب أن تكون أكبر من صفر.' };
  }

  if (transactionType === 'payment' && !['cash', 'bank_app'].includes(paymentMethod)) {
    return { ok: false, error: 'طريقة الدفع غير صحيحة.' };
  }

  const customer = getCustomer(customerId);
  if (!customer) return { ok: false, error: 'الزبون غير موجود.' };

  let newDebt = customer.current_debt || 0;
  if (transactionType === 'debt_increase') {
    if (numericAmount > MAX_DEBT_SHEKELS) {
      return { ok: false, error: `الحد الأقصى للدين هو ${MAX_DEBT_SHEKELS} شيكل.` };
    }
    if (newDebt + numericAmount > MAX_DEBT_SHEKELS) {
      return { ok: false, error: 'تجاوز حد الدين.' };
    }
    newDebt = roundMoney(newDebt + numericAmount);
  } else {
    if (numericAmount > newDebt) {
      return { ok: false, error: 'مبلغ السداد أكبر من قيمة الدين الحالي.' };
    }
    newDebt = roundMoney(newDebt - numericAmount);
  }

  const transactionId = generateUUID();
  const businessDate = getCurrentBusinessDate();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO debt_transactions (
      transaction_id, customer_id, transaction_type, amount, business_date,
      order_id, notes, payment_method, created_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      transactionId,
      customerId,
      transactionType,
      numericAmount,
      businessDate,
      orderId || null,
      notes?.trim() || null,
      transactionType === 'payment' ? paymentMethod : null,
      now,
      userId
    ]
  );

  db.run('UPDATE customers SET current_debt = ? WHERE customer_id = ?', [newDebt, customerId]);

  if (transactionType === 'payment') {
    adjustAccountBalance(paymentMethod, numericAmount);
  }

  logAudit({
    userId,
    action: transactionType === 'debt_increase' ? 'DEBT_CREATED' : 'DEBT_PAYMENT_RECORDED',
    entityType: 'customer',
    entityId: customerId,
    details: {
      transaction_type: transactionType,
      amount: numericAmount,
      payment_method: transactionType === 'payment' ? paymentMethod : null
    }
  });

  return { ok: true, transactionId };
}

function createDebt({ name, phone, nationalId, amount }, userId) {
  const trimmedName = (name || '').trim();
  const trimmedPhone = (phone || '').trim();
  const trimmedNationalId = nationalId ? nationalId.trim() : null;

  if (!trimmedName) return { ok: false, error: 'اسم الزبون مطلوب.' };
  if (!trimmedPhone) return { ok: false, error: 'رقم الهاتف مطلوب.' };

  let customer = getCustomerByPhone(trimmedPhone);
  const db = getDb();

  if (!customer) {
    const customerId = generateUUID();
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO customers (
        customer_id, name, phone, national_id, debt_limit, current_debt, status, created_at, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customerId,
        trimmedName,
        trimmedPhone,
        trimmedNationalId,
        500,
        0,
        'active',
        now,
        null
      ]
    );
    customer = getCustomer(customerId);
    logAudit({
      userId,
      action: 'CUSTOMER_CREATED',
      entityType: 'customer',
      entityId: customerId,
      details: { name: trimmedName, phone: trimmedPhone }
    });
  } else {
    const updates = [];
    const values = [];
    if (trimmedName && trimmedName !== customer.name) {
      updates.push('name = ?');
      values.push(trimmedName);
    }
    if (trimmedNationalId && trimmedNationalId !== customer.national_id) {
      updates.push('national_id = ?');
      values.push(trimmedNationalId);
    }
    if (updates.length) {
      values.push(customer.customer_id);
      db.run(`UPDATE customers SET ${updates.join(', ')} WHERE customer_id = ?`, values);
    }
  }

  return recordDebtTransaction(
    {
      customerId: customer.customer_id,
      transactionType: 'debt_increase',
      amount,
      orderId: null,
      notes: 'إضافة دين مستقلة',
      paymentMethod: null
    },
    userId
  );
}

function createDebtForOrder({ name, phone, nationalId, amount, orderId }, userId) {
  const trimmedName = (name || '').trim();
  const trimmedPhone = (phone || '').trim();
  const trimmedNationalId = nationalId ? String(nationalId).trim() : null;

  if (!trimmedName) return { ok: false, error: 'اسم الزبون مطلوب.' };
  if (!trimmedPhone) return { ok: false, error: 'رقم الهاتف مطلوب.' };

  let customer = findCustomerForDebt(trimmedPhone, trimmedNationalId);
  const db = getDb();

  if (!customer) {
    const customerId = generateUUID();
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO customers (
        customer_id, name, phone, national_id, debt_limit, current_debt, status, created_at, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customerId,
        trimmedName,
        trimmedPhone,
        trimmedNationalId,
        500,
        0,
        'active',
        now,
        null
      ]
    );
    customer = getCustomer(customerId);
    logAudit({
      userId,
      action: 'CUSTOMER_CREATED',
      entityType: 'customer',
      entityId: customerId,
      details: { name: trimmedName, phone: trimmedPhone }
    });
  } else {
    const updates = [];
    const values = [];
    if (trimmedName && trimmedName !== customer.name) {
      updates.push('name = ?');
      values.push(trimmedName);
    }
    if (trimmedNationalId && trimmedNationalId !== customer.national_id) {
      updates.push('national_id = ?');
      values.push(trimmedNationalId);
    }
    if (updates.length) {
      values.push(customer.customer_id);
      db.run(`UPDATE customers SET ${updates.join(', ')} WHERE customer_id = ?`, values);
    }
  }

  return recordDebtTransaction(
    {
      customerId: customer.customer_id,
      transactionType: 'debt_increase',
      amount,
      orderId: orderId || null,
      notes: orderId ? 'دفع طلب - دين' : 'إضافة دين مستقلة',
      paymentMethod: null
    },
    userId
  );
}

function repayDebt({ customerId, amount, paymentMethod, notes }, userId) {
  return recordDebtTransaction(
    {
      customerId,
      transactionType: 'payment',
      amount,
      orderId: null,
      notes: notes || 'سداد دين',
      paymentMethod
    },
    userId
  );
}

function getDebtors() {
  const db = getDb();
  const stmt = db.prepare(
    `SELECT customer_id, name, phone, current_debt
     FROM customers
     WHERE current_debt > 0
     ORDER BY current_debt DESC, name ASC`
  );
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function searchCustomers(query) {
  const db = getDb();
  const term = (query || '').trim();
  if (!term) return [];

  const like = `%${term}%`;
  const stmt = db.prepare(
    `SELECT customer_id, name, phone, national_id, current_debt
     FROM customers
     WHERE name LIKE ? OR phone LIKE ? OR national_id LIKE ?
     ORDER BY name ASC
     LIMIT 50`
  );
  stmt.bind([like, like, like]);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function getCustomerDetails(customerId) {
  const db = getDb();
  const customer = getCustomer(customerId);
  if (!customer) return null;

  const stmt = db.prepare(
    `SELECT transaction_id, transaction_type, amount, business_date, created_at, payment_method
     FROM debt_transactions
     WHERE customer_id = ?
     ORDER BY created_at DESC`
  );
  stmt.bind([customerId]);
  const transactions = [];
  while (stmt.step()) {
    transactions.push(stmt.getAsObject());
  }
  stmt.free();

  const debts = transactions.filter((t) => t.transaction_type === 'debt_increase');
  const repayments = transactions.filter((t) => t.transaction_type === 'payment');

  return {
    customer,
    debts,
    repayments,
    currentBalance: customer.current_debt || 0,
    status: (customer.current_debt || 0) > 0 ? 'debtor' : 'clear'
  };
}

module.exports = {
  createCustomer,
  createOrUpdateCustomerByPhone,
  getCustomer,
  recordDebtTransaction,
  createDebt,
  createDebtForOrder,
  repayDebt,
  getDebtors,
  searchCustomers,
  getCustomerDetails,
  getCustomerByPhone
};
