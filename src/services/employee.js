const { getDb } = require('../database');
const { generateUUID } = require('../utils/uuid');
const { parseMoney, roundMoney } = require('../utils/money');
const { getCurrentBusinessDate } = require('./businessDate');
const { logAudit } = require('./audit');

function createEmployee({ name, phone, nationalId, monthlySalary, status, notes }, userId) {
  const db = getDb();
  const trimmedName = (name || '').trim();
  const trimmedPhone = phone ? String(phone).trim() : '';
  const trimmedNationalId = nationalId ? nationalId.trim() : null;

  if (!trimmedName) {
    return { ok: false, error: 'الرجاء إدخال جميع البيانات المطلوبة.' };
  }
  if (!trimmedPhone) {
    return { ok: false, error: 'الرجاء إدخال جميع البيانات المطلوبة.' };
  }

  const salaryNum = monthlySalary != null && monthlySalary !== '' ? parseFloat(monthlySalary) : 0;
  const salary = Number.isFinite(salaryNum) && salaryNum >= 0 ? roundMoney(salaryNum) : 0;

  const dupStmt = db.prepare('SELECT 1 FROM employees WHERE phone = ?');
  dupStmt.bind([trimmedPhone]);
  if (dupStmt.step()) {
    dupStmt.free();
    return { ok: false, error: 'رقم الهاتف مسجل مسبقًا.' };
  }
  dupStmt.free();

  const employeeId = generateUUID();
  const empStatus = status === 'inactive' ? 'inactive' : 'active';
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO employees (
      employee_id, name, phone, national_id, monthly_salary, status, created_at, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      employeeId,
      trimmedName,
      trimmedPhone,
      trimmedNationalId,
      salary,
      empStatus,
      now,
      notes?.trim() || null
    ]
  );

  logAudit({
    userId,
    action: 'EMPLOYEE_CREATED',
    entityType: 'employee',
    entityId: employeeId,
    details: { name: trimmedName, monthly_salary: salary }
  });

  return { ok: true, employeeId };
}

function updateEmployee(employeeId, { name, phone, nationalId, monthlySalary, status, notes }, userId) {
  const db = getDb();
  const employee = getEmployee(employeeId);
  if (!employee) {
    return { ok: false, error: 'الموظف غير موجود.' };
  }

  const updates = [];
  const values = [];

  if (name !== undefined) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { ok: false, error: 'اسم الموظف مطلوب.' };
    }
    updates.push('name = ?');
    values.push(trimmedName);
  }

  if (phone !== undefined) {
    updates.push('phone = ?');
    values.push(phone ? phone.trim() : null);
  }

  if (nationalId !== undefined) {
    updates.push('national_id = ?');
    values.push(nationalId ? nationalId.trim() : null);
  }

  if (monthlySalary !== undefined) {
    const salaryResult = parseMoney(monthlySalary, { allowNull: false });
    if (!salaryResult.ok) {
      return { ok: false, error: salaryResult.error };
    }
    const salary = roundMoney(salaryResult.value);
    if (salary < 0) {
      return { ok: false, error: 'الراتب يجب أن يكون أكبر من أو يساوي صفر.' };
    }
    updates.push('monthly_salary = ?');
    values.push(salary);
  }

  if (status !== undefined) {
    if (!['active', 'inactive'].includes(status)) {
      return { ok: false, error: 'الحالة غير صحيحة.' };
    }
    updates.push('status = ?');
    values.push(status);
  }

  if (notes !== undefined) {
    updates.push('notes = ?');
    values.push(notes ? notes.trim() : null);
  }

  if (updates.length === 0) {
    return { ok: true };
  }

  values.push(employeeId);
  db.run(`UPDATE employees SET ${updates.join(', ')} WHERE employee_id = ?`, values);

  logAudit({
    userId,
    action: 'EMPLOYEE_UPDATED',
    entityType: 'employee',
    entityId: employeeId,
    details: { updates: updates.length }
  });

  return { ok: true };
}

function getEmployee(employeeId) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM employees WHERE employee_id = ?');
  stmt.bind([employeeId]);
  const ok = stmt.step();
  const employee = ok ? stmt.getAsObject() : null;
  stmt.free();
  return employee;
}

function getAllEmployees(activeOnly = false) {
  const db = getDb();
  let query = 'SELECT * FROM employees';
  const params = [];
  if (activeOnly) {
    query += ' WHERE status = ?';
    params.push('active');
  }
  query += ' ORDER BY name ASC';
  const stmt = db.prepare(query);
  if (params.length) stmt.bind(params);
  const employees = [];
  while (stmt.step()) {
    employees.push(stmt.getAsObject());
  }
  stmt.free();
  return employees;
}

function recordSalary({ employeeId, salaryMonth, salaryYear, amount, notes }, userId) {
  const db = getDb();
  try {
    const employee = getEmployee(employeeId);
    if (!employee) {
      return { ok: false, error: 'الموظف غير موجود.' };
    }

    const amountResult = parseMoney(amount, { allowNull: false });
    if (!amountResult.ok) {
      return { ok: false, error: amountResult.error };
    }
    const numericAmount = roundMoney(amountResult.value);
    if (numericAmount < 0) {
      return { ok: false, error: 'المبلغ يجب أن يكون أكبر من أو يساوي صفر.' };
    }

    const salaryId = generateUUID();
    const businessDate = getCurrentBusinessDate();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO employee_salaries (
        salary_id, employee_id, salary_month, salary_year, amount, business_date, notes, created_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        salaryId,
        employeeId,
        salaryMonth,
        salaryYear,
        numericAmount,
        businessDate,
        notes?.trim() || null,
        now,
        userId
      ]
    );

    logAudit({
      userId,
      action: 'EMPLOYEE_SALARY_RECORDED',
      entityType: 'employee_salary',
      entityId: salaryId,
      details: { employee_id: employeeId, amount: numericAmount, month: salaryMonth, year: salaryYear }
    });

    return { ok: true, salaryId };
  } catch (error) {
    console.error('Error recording salary:', error);
    return { ok: false, error: 'حدث خطأ أثناء تسجيل المرتب: ' + error.message };
  }
}

function getEmployeeSalariesReport(startDate, endDate) {
  const db = getDb();
  const stmt = db.prepare(
    `SELECT 
      e.employee_id,
      e.name as employee_name,
      es.salary_month,
      es.salary_year,
      SUM(es.amount) as amount,
      MAX(es.business_date) as business_date,
      MAX(es.created_at) as created_at
     FROM employee_salaries es
     JOIN employees e ON es.employee_id = e.employee_id
     WHERE es.business_date BETWEEN ? AND ?
     GROUP BY e.employee_id, es.salary_month, es.salary_year
     ORDER BY es.salary_year DESC, es.salary_month DESC, e.name ASC`
  );
  stmt.bind([startDate, endDate]);
  const salaries = [];
  while (stmt.step()) {
    salaries.push(stmt.getAsObject());
  }
  stmt.free();
  return salaries;
}

function getMonthlyPayrollReport(year, month) {
  const db = getDb();
  const stmt = db.prepare(
    `SELECT 
      e.employee_id,
      e.name as employee_name,
      e.monthly_salary,
      es.amount as paid_amount,
      es.business_date,
      CASE WHEN es.salary_id IS NOT NULL THEN 1 ELSE 0 END as is_paid
     FROM employees e
     LEFT JOIN employee_salaries es ON e.employee_id = es.employee_id 
       AND es.salary_year = ? AND es.salary_month = ?
     WHERE e.status = 'active'
     ORDER BY e.name ASC`
  );
  stmt.bind([year, month]);
  const payroll = [];
  while (stmt.step()) {
    payroll.push(stmt.getAsObject());
  }
  stmt.free();
  return payroll;
}

function recordWithdrawal({ employeeId, amount, withdrawalDate, notes }, userId) {
  const db = getDb();
  try {
    const employee = getEmployee(employeeId);
    if (!employee) {
      return { ok: false, error: 'الرجاء اختيار موظف.' };
    }

    const amountResult = parseMoney(amount, { allowNull: false });
    if (!amountResult.ok) {
      return { ok: false, error: amountResult.error };
    }
    const numericAmount = roundMoney(amountResult.value);
    if (numericAmount <= 0) {
      return { ok: false, error: 'المبلغ يجب أن يكون أكبر من صفر.' };
    }

    const businessDate = withdrawalDate && String(withdrawalDate).trim() ? String(withdrawalDate).trim() : getCurrentBusinessDate();
    const withdrawalId = generateUUID();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO employee_withdrawals (
        withdrawal_id, employee_id, amount, business_date, notes, created_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        withdrawalId,
        employeeId,
        numericAmount,
        businessDate,
        notes?.trim() || null,
        now,
        userId
      ]
    );

    logAudit({
      userId,
      action: 'EMPLOYEE_WITHDRAWAL_RECORDED',
      entityType: 'employee_withdrawal',
      entityId: withdrawalId,
      details: { employee_id: employeeId, amount: numericAmount, business_date: businessDate }
    });

    return { ok: true, withdrawalId };
  } catch (error) {
    console.error('Error recording withdrawal:', error);
    return { ok: false, error: 'حدث خطأ أثناء تسجيل السحب: ' + error.message };
  }
}

function getWithdrawalsByEmployeeAndDateRange(employeeId, startDate, endDate) {
  const db = getDb();
  const stmt = db.prepare(
    `SELECT ew.withdrawal_id, ew.employee_id, e.name as employee_name,
            ew.amount, ew.business_date, ew.notes, ew.created_at
     FROM employee_withdrawals ew
     JOIN employees e ON ew.employee_id = e.employee_id
     WHERE ew.employee_id = ? AND ew.business_date BETWEEN ? AND ?
     ORDER BY ew.business_date DESC, ew.created_at DESC`
  );
  stmt.bind([employeeId, startDate, endDate]);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function getSalariesByEmployeeAndDateRange(employeeId, startDate, endDate) {
  const db = getDb();
  const stmt = db.prepare(
    `SELECT es.salary_id, es.employee_id, e.name as employee_name,
            es.salary_month, es.salary_year, es.amount, es.business_date, es.notes, es.created_at
     FROM employee_salaries es
     JOIN employees e ON es.employee_id = e.employee_id
     WHERE es.employee_id = ? AND es.business_date BETWEEN ? AND ?
     ORDER BY es.salary_year DESC, es.salary_month DESC`
  );
  stmt.bind([employeeId, startDate, endDate]);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function getEmployeeFinancialDetails(employeeId, startDate, endDate) {
  const employee = getEmployee(employeeId);
  if (!employee) {
    return null;
  }
  const salaries = getSalariesByEmployeeAndDateRange(employeeId, startDate, endDate);
  const withdrawals = getWithdrawalsByEmployeeAndDateRange(employeeId, startDate, endDate);
  const totalSalary = salaries.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const totalWithdrawals = withdrawals.reduce((sum, w) => sum + Number(w.amount || 0), 0);
  const net = totalSalary - totalWithdrawals;
  return {
    employee,
    salaries,
    withdrawals,
    totalSalary,
    totalWithdrawals,
    net
  };
}

/**
 * Gets summary of withdrawals for an employee in a specific month
 */
function getEmployeeMonthlyWithdrawals(employeeId, year, month) {
  const db = getDb();
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const stmt = db.prepare(
    `SELECT SUM(amount) as total, COUNT(*) as count
     FROM employee_withdrawals
     WHERE employee_id = ? AND business_date BETWEEN ? AND ?`
  );
  stmt.bind([employeeId, startDate, endDate]);
  const row = stmt.step() ? stmt.getAsObject() : { total: 0, count: 0 };
  stmt.free();
  return {
    total: row.total || 0,
    count: row.count || 0,
    month,
    year
  };
}

module.exports = {
  createEmployee,
  updateEmployee,
  getEmployee,
  getAllEmployees,
  recordSalary,
  getEmployeeSalariesReport,
  getMonthlyPayrollReport,
  recordWithdrawal,
  getWithdrawalsByEmployeeAndDateRange,
  getSalariesByEmployeeAndDateRange,
  getEmployeeFinancialDetails,
  getEmployeeMonthlyWithdrawals
};
