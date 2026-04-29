const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../database');

function getSingleRow(db, query, params = []) {
  const stmt = db.prepare(query);
  stmt.bind(params);
  const ok = stmt.step();
  const row = ok ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

function getRows(db, query, params = []) {
  const stmt = db.prepare(query);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function validateDateRange(startDate, endDate) {
  if (!startDate || !endDate) {
    return { ok: false, error: 'تحديد تاريخ البداية والنهاية مطلوب.' };
  }
  if (startDate > endDate) {
    return { ok: false, error: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية.' };
  }
  return { ok: true };
}

function getSalesSummary(startDate, endDate) {
  const db = getDb();
  const validation = validateDateRange(startDate, endDate);
  if (!validation.ok) return validation;

  const row = getSingleRow(
    db,
    `SELECT COUNT(*) as total_orders,
            COALESCE(SUM(total), 0) as total_sales,
            COALESCE(SUM(discount_amount), 0) as total_discounts,
            COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) as total_cash,
            COALESCE(SUM(CASE WHEN payment_method = 'bank_app' THEN total ELSE 0 END), 0) as total_bank_app
     FROM orders
     WHERE business_date BETWEEN ? AND ? AND order_is_received = 1`,
    [startDate, endDate]
  );

  return {
    ok: true,
    report: row || {
      total_orders: 0,
      total_sales: 0,
      total_discounts: 0,
      total_cash: 0,
      total_bank_app: 0
    }
  };
}

function getBestSellingItems(startDate, endDate, limit = 10) {
  const db = getDb();
  const validation = validateDateRange(startDate, endDate);
  if (!validation.ok) return validation;
  const safeLimit = Math.max(1, parseInt(limit, 10) || 10);
  const rows = getRows(
    db,
    `SELECT oi.item_name,
            SUM(oi.quantity) as total_sold,
            SUM(oi.subtotal) as total_revenue
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.order_id
     WHERE o.business_date BETWEEN ? AND ? AND o.order_is_received = 1
     GROUP BY oi.menu_item_id, oi.item_name
     ORDER BY total_sold DESC
     LIMIT ?`,
    [startDate, endDate, safeLimit]
  );

  return { ok: true, items: rows };
}

function getAppSessionsReport(startDate, endDate) {
  const db = getDb();
  const validation = validateDateRange(startDate, endDate);
  if (!validation.ok) return validation;
  const rows = getRows(
    db,
    `SELECT u.username,
            s.started_at,
            s.ended_at,
            s.business_date,
            (julianday(s.ended_at) - julianday(s.started_at)) * 24 as hours_worked
     FROM app_sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.business_date BETWEEN ? AND ?
     ORDER BY s.started_at`,
    [startDate, endDate]
  );

  return { ok: true, sessions: rows };
}

function getFinancialSummary(startDate, endDate) {
  const db = getDb();
  const validation = validateDateRange(startDate, endDate);
  if (!validation.ok) return validation;
  const row = getSingleRow(
    db,
    `SELECT
      (SELECT COALESCE(SUM(total), 0) FROM orders WHERE business_date BETWEEN ? AND ? AND order_is_received = 1) as sales,
      (SELECT COALESCE(SUM(total), 0) FROM orders WHERE business_date BETWEEN ? AND ? AND order_is_received = 1 AND payment_method = 'cash') as sales_cash,
      (SELECT COALESCE(SUM(total), 0) FROM orders WHERE business_date BETWEEN ? AND ? AND order_is_received = 1 AND payment_method = 'bank_app') as sales_bank_app,
      (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE business_date BETWEEN ? AND ?) as expenses,
      (SELECT COALESCE(SUM(amount), 0) FROM debt_transactions WHERE business_date BETWEEN ? AND ? AND transaction_type = 'payment') as debt_payments,
      (SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE business_date BETWEEN ? AND ? AND status = 'approved') as withdrawals,
      (SELECT COALESCE(SUM(amount), 0) FROM employee_salaries WHERE business_date BETWEEN ? AND ?) as employee_salaries,
      (SELECT COALESCE(SUM(amount), 0) FROM employee_withdrawals WHERE business_date BETWEEN ? AND ?) as employee_withdrawals,
      (SELECT COALESCE(SUM(e.amount), 0) FROM expenses e JOIN expense_categories ec ON e.category_id = ec.category_id WHERE ec.name LIKE '%مطبخ%' AND e.business_date BETWEEN ? AND ?) as kitchen_purchases`,
    [startDate, endDate, startDate, endDate, startDate, endDate, startDate, endDate, startDate, endDate, startDate, endDate, startDate, endDate, startDate, endDate, startDate, endDate]
  );

  return {
    ok: true,
    summary: row || {
      sales: 0,
      sales_cash: 0,
      sales_bank_app: 0,
      expenses: 0,
      debt_payments: 0,
      withdrawals: 0,
      employee_salaries: 0,
      employee_withdrawals: 0,
      kitchen_purchases: 0
    }
  };
}

function getActiveDebts(startDate, endDate) {
  const db = getDb();
  const validation = validateDateRange(startDate, endDate);
  if (!validation.ok) return validation;

  const rows = getRows(
    db,
    `SELECT c.customer_id, c.name, c.phone, c.current_debt
     FROM customers c
     WHERE c.current_debt > 0
       AND EXISTS (
         SELECT 1 FROM debt_transactions dt
         WHERE dt.customer_id = c.customer_id
           AND dt.business_date BETWEEN ? AND ?
       )
     ORDER BY c.current_debt DESC, c.name ASC`,
    [startDate, endDate]
  );

  return { ok: true, debts: rows };
}

function getDebtRepayments(startDate, endDate) {
  const db = getDb();
  const validation = validateDateRange(startDate, endDate);
  if (!validation.ok) return validation;

  const rows = getRows(
    db,
    `SELECT dt.transaction_id,
            c.name as customer_name,
            dt.amount,
            dt.payment_method,
            dt.business_date,
            dt.created_at
     FROM debt_transactions dt
     JOIN customers c ON dt.customer_id = c.customer_id
     WHERE dt.transaction_type = 'payment'
       AND dt.business_date BETWEEN ? AND ?
     ORDER BY dt.created_at DESC`,
    [startDate, endDate]
  );

  return { ok: true, repayments: rows };
}

function getPurchasesBreakdown(startDate, endDate) {
  const db = getDb();
  const validation = validateDateRange(startDate, endDate);
  if (!validation.ok) return validation;

  const rows = getRows(
    db,
    `SELECT
        COALESCE(c.name, 'بدون فئة') as category_name,
        e.business_date,
        COUNT(*) as purchase_count,
        SUM(e.amount) as total_amount
     FROM expenses e
     LEFT JOIN expense_categories c ON e.category_id = c.category_id
     WHERE e.business_date BETWEEN ? AND ?
     GROUP BY c.name, e.business_date
     ORDER BY e.business_date ASC, c.name ASC`,
    [startDate, endDate]
  );

  return { ok: true, purchases: rows };
}

function getTablesBreakdown(startDate, endDate) {
  const db = getDb();
  const validation = validateDateRange(startDate, endDate);
  if (!validation.ok) return validation;

  const rows = getRows(
    db,
    `SELECT
        t.table_number,
        COUNT(*) as orders_count,
        COALESCE(SUM(o.total), 0) as total,
        COALESCE(SUM(CASE WHEN o.payment_method = 'cash' THEN o.total ELSE 0 END), 0) as total_cash,
        COALESCE(SUM(CASE WHEN o.payment_method = 'bank_app' THEN o.total ELSE 0 END), 0) as total_bank_app,
        COALESCE(SUM(CASE WHEN o.payment_method = 'debt' THEN o.total ELSE 0 END), 0) as total_debt
     FROM orders o
     JOIN tables t ON o.table_id = t.table_id
     WHERE o.table_id IS NOT NULL
       AND o.order_is_received = 1
       AND o.business_date BETWEEN ? AND ?
     GROUP BY t.table_id, t.table_number
     ORDER BY t.table_number ASC`,
    [startDate, endDate]
  );

  return { ok: true, tables: rows };
}

function getOrdersForExport(startDate, endDate) {
  const db = getDb();
  return getRows(
    db,
    `SELECT order_id, order_number, business_date, customer_name, customer_phone,
            status, subtotal, discount_amount, total, payment_method
     FROM orders
     WHERE business_date BETWEEN ? AND ?
     ORDER BY business_date ASC, order_number ASC`,
    [startDate, endDate]
  );
}

function getPaymentsForExport(startDate, endDate) {
  const db = getDb();
  return getRows(
    db,
    `SELECT payment_id, order_id, amount, payment_method, is_refund, business_date, created_at
     FROM payments
     WHERE business_date BETWEEN ? AND ?
     ORDER BY created_at DESC`,
    [startDate, endDate]
  );
}

function getDebtTransactionsForExport(startDate, endDate, type) {
  const db = getDb();
  return getRows(
    db,
    `SELECT dt.transaction_id, c.name as customer_name, c.phone,
            dt.amount, dt.payment_method, dt.business_date, dt.created_at
     FROM debt_transactions dt
     JOIN customers c ON dt.customer_id = c.customer_id
     WHERE dt.transaction_type = ?
       AND dt.business_date BETWEEN ? AND ?
     ORDER BY dt.created_at DESC`,
    [type, startDate, endDate]
  );
}

function getExpensesForExport(startDate, endDate) {
  const db = getDb();
  return getRows(
    db,
    `SELECT e.expense_id, c.name as category_name, e.amount, e.business_date, e.description, e.created_at
     FROM expenses e
     LEFT JOIN expense_categories c ON e.category_id = c.category_id
     WHERE e.business_date BETWEEN ? AND ?
     ORDER BY e.created_at DESC`,
    [startDate, endDate]
  );
}

function getWithdrawalsForExport(startDate, endDate) {
  const db = getDb();
  return getRows(
    db,
    `SELECT w.withdrawal_id, p.name as partner_name, w.amount, w.status, w.business_date, w.notes, w.requested_at
     FROM withdrawals w
     JOIN partners p ON w.partner_id = p.partner_id
     WHERE w.business_date BETWEEN ? AND ?
     ORDER BY w.requested_at DESC`,
    [startDate, endDate]
  );
}

function getEmployeeSalariesForExport(startDate, endDate) {
  const db = getDb();
  return getRows(
    db,
    `SELECT e.name as employee_name, es.salary_month, es.salary_year, es.amount, es.business_date, es.notes
     FROM employee_salaries es
     JOIN employees e ON es.employee_id = e.employee_id
     WHERE es.business_date BETWEEN ? AND ?
     ORDER BY es.salary_year DESC, es.salary_month DESC, e.name ASC`,
    [startDate, endDate]
  );
}

function getEmployeeWithdrawalsForExport(startDate, endDate) {
  const db = getDb();
  return getRows(
    db,
    `SELECT e.name as employee_name, ew.amount, ew.business_date, ew.notes
     FROM employee_withdrawals ew
     JOIN employees e ON ew.employee_id = e.employee_id
     WHERE ew.business_date BETWEEN ? AND ?
     ORDER BY ew.business_date DESC`,
    [startDate, endDate]
  );
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildWorksheet(name, headers, rows) {
  const headerRow = `<Row>${headers
    .map((header) => `<Cell><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`)
    .join('')}</Row>`;

  const dataRows = rows
    .map((row) => {
      const cells = headers.map((header) => {
        const value = row[header];
        const isNumber = typeof value === 'number' && Number.isFinite(value);
        const type = isNumber ? 'Number' : 'String';
        return `<Cell><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
      });
      return `<Row>${cells.join('')}</Row>`;
    })
    .join('');

  return `
    <Worksheet ss:Name="${escapeXml(name)}">
      <Table>
        ${headerRow}
        ${dataRows}
      </Table>
    </Worksheet>
  `;
}

function getGeneralSummaryForExport(startDate, endDate) {
  const summaryResult = getFinancialSummary(startDate, endDate);
  if (!summaryResult.ok || !summaryResult.summary) {
    throw new Error(summaryResult.error || 'فشل تحميل الملخص المالي.');
  }
  const s = summaryResult.summary;
  const sales = Number(s.sales) || 0;
  const debtPayments = Number(s.debt_payments) || 0;
  const expenses = Number(s.expenses) || 0;
  const kitchenPurchases = Number(s.kitchen_purchases) || 0;
  const employeeSalaries = Number(s.employee_salaries) || 0;
  const withdrawals = Number(s.withdrawals) || 0;
  const totalRevenue = sales + debtPayments;
  const totalExpenses = expenses + employeeSalaries + withdrawals;

  return [
    { 'البند': 'إجمالي المبيعات', 'القيمة': sales },
    { 'البند': 'إجمالي سداد الديون (دخل)', 'القيمة': debtPayments },
    { 'البند': 'إجمالي الإيرادات', 'القيمة': totalRevenue },
    { 'البند': 'المصروفات العامة', 'القيمة': expenses - kitchenPurchases },
    { 'البند': 'مشتريات المطبخ', 'القيمة': kitchenPurchases },
    { 'البند': 'رواتب الموظفين', 'القيمة': employeeSalaries },
    { 'البند': 'سحوبات الشركاء', 'القيمة': withdrawals },
    { 'البند': 'إجمالي المصاريف', 'القيمة': totalExpenses },
    { 'البند': 'صافي الربح التقديري', 'القيمة': totalRevenue - totalExpenses }
  ];
}

function getEmployeeFinancialsForExport(startDate, endDate) {
  const db = getDb();
  return getRows(
    db,
    `SELECT e.name as employee_name,
            COALESCE((SELECT SUM(amount) FROM employee_salaries WHERE employee_id = e.employee_id AND business_date BETWEEN ? AND ?), 0) as total_salaries,
            COALESCE((SELECT SUM(amount) FROM employee_withdrawals WHERE employee_id = e.employee_id AND business_date BETWEEN ? AND ?), 0) as total_withdrawals
     FROM employees e
     WHERE EXISTS (SELECT 1 FROM employee_salaries WHERE employee_id = e.employee_id AND business_date BETWEEN ? AND ?)
        OR EXISTS (SELECT 1 FROM employee_withdrawals WHERE employee_id = e.employee_id AND business_date BETWEEN ? AND ?)`,
    [startDate, endDate, startDate, endDate, startDate, endDate, startDate, endDate]
  );
}

function exportReportsToExcel(startDate, endDate) {
  const validation = validateDateRange(startDate, endDate);
  if (!validation.ok) return validation;

  const db = getDb();

  function safeDebts() {
    const r = getActiveDebts(startDate, endDate);
    return (r.ok && Array.isArray(r.debts)) ? r.debts : [];
  }

  function safeTables() {
    const r = getTablesBreakdown(startDate, endDate);
    return (r.ok && Array.isArray(r.tables)) ? r.tables : [];
  }

  function safeKitchenRows() {
    try {
      return getRows(db, `
        SELECT e.business_date, ec.name as category, e.amount, e.description
        FROM expenses e
        JOIN expense_categories ec ON e.category_id = ec.category_id
        WHERE ec.name LIKE '%مطبخ%' AND e.business_date BETWEEN ? AND ?
      `, [startDate, endDate]);
    } catch (_) {
      return [];
    }
  }

  try {
    // 1. General Summary
    const generalSummary = getGeneralSummaryForExport(startDate, endDate);
    const summaryHeaders = ['البند', 'القيمة'];

    // 2. Financial Record (Revenue/Expenses)
    const financialRecord = generalSummary;

    // 3. Employee Salaries
    const salaries = getEmployeeSalariesForExport(startDate, endDate).map(r => ({
      'الموظف': r.employee_name,
      'الشهر': `${r.salary_year}-${r.salary_month}`,
      'المبلغ': r.amount,
      'التاريخ': r.business_date,
      'ملاحظات': r.notes || '—'
    }));
    const salaryHeaders = ['الموظف', 'الشهر', 'المبلغ', 'التاريخ', 'ملاحظات'];

    // 4. Employee Withdrawals
    const empWithdrawals = getEmployeeWithdrawalsForExport(startDate, endDate).map(r => ({
      'الموظف': r.employee_name,
      'المبلغ': r.amount,
      'التاريخ': r.business_date,
      'ملاحظات': r.notes || '—'
    }));
    const empWithdrawalHeaders = ['الموظف', 'المبلغ', 'التاريخ', 'ملاحظات'];

    // 5. Customers & Debts
    const customers = safeDebts().map(r => ({
      'الزبون': r.name,
      'الهاتف': r.phone || '—',
      'الدين الحالي': r.current_debt
    }));
    const customerHeaders = ['الزبون', 'الهاتف', 'الدين الحالي'];

    // 6. Partner Withdrawals
    const partnerWithdrawals = getWithdrawalsForExport(startDate, endDate).map(r => ({
      'الشريك': r.partner_name,
      'المبلغ': r.amount,
      'الحالة': r.status,
      'التاريخ': r.business_date,
      'ملاحظات': r.notes || '—'
    }));
    const partnerWithdrawalHeaders = ['الشريك', 'المبلغ', 'الحالة', 'التاريخ', 'ملاحظات'];

    // 7. Table Sales
    const tableSales = safeTables().map(r => ({
      'رقم الطاولة': r.table_number,
      'عدد الطلبات': r.orders_count,
      'الإجمالي': r.total,
      'كاش': r.total_cash,
      'بنكي': r.total_bank_app
    }));
    const tableSalesHeaders = ['رقم الطاولة', 'عدد الطلبات', 'الإجمالي', 'كاش', 'بنكي'];

    // 8. Expenses
    const expenses = getExpensesForExport(startDate, endDate).map(r => ({
      'الفئة': r.category_name || 'عام',
      'المبلغ': r.amount,
      'التاريخ': r.business_date,
      'الوصف': r.description || '—'
    }));
    const expenseHeaders = ['الفئة', 'المبلغ', 'التاريخ', 'الوصف'];

    // 9. Kitchen Purchases
    const kitchenPurchases = safeKitchenRows().map(r => ({
      'التاريخ': r.business_date,
      'المبلغ': r.amount,
      'الوصف': r.description || '—'
    }));
    const kitchenHeaders = ['التاريخ', 'المبلغ', 'الوصف'];

    // 10. Employee Details Summary
    const empDetails = getEmployeeFinancialsForExport(startDate, endDate).map(r => ({
      'الموظف': r.employee_name,
      'إجمالي الرواتب': r.total_salaries,
      'إجمالي السحوبات': r.total_withdrawals,
      'الرصيد': (Number(r.total_salaries) || 0) - (Number(r.total_withdrawals) || 0)
    }));
    const empDetailsHeaders = ['الموظف', 'إجمالي الرواتب', 'إجمالي السحوبات', 'الرصيد'];

    const sheetsXml = [
      buildWorksheet('ملخص عام', summaryHeaders, generalSummary),
      buildWorksheet('السجل المالي', summaryHeaders, financialRecord),
      buildWorksheet('رواتب العاملين', salaryHeaders, salaries),
      buildWorksheet('سحوبات العاملين', empWithdrawalHeaders, empWithdrawals),
      buildWorksheet('الزبائن والديون', customerHeaders, customers),
      buildWorksheet('سحوبات الشركاء', partnerWithdrawalHeaders, partnerWithdrawals),
      buildWorksheet('مبيعات الطاولات', tableSalesHeaders, tableSales),
      buildWorksheet('المصروفات', expenseHeaders, expenses),
      buildWorksheet('مشتريات المطبخ', kitchenHeaders, kitchenPurchases),
      buildWorksheet('ملخص الموظفين', empDetailsHeaders, empDetails)
    ].join('');

    const workbookXml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${sheetsXml}
</Workbook>`;

    const fileName = `shawarma-comprehensive-report-${startDate}-to-${endDate}.xls`;
    const filePath = path.join(app.getPath('downloads'), fileName);
    fs.writeFileSync(filePath, workbookXml, 'utf8');

    return { ok: true, filePath, fileName };
  } catch (e) {
    const msg = (e && e.message) ? String(e.message) : String(e);
    return { ok: false, error: msg.includes('تحديد تاريخ') || msg.includes('قبل تاريخ')
      ? msg
      : 'خطأ في قاعدة البيانات أو الملفات. جرّب إعادة تشغيل التطبيق. التفاصيل: ' + msg };
  }
}

module.exports = {
  validateDateRange,
  getSalesSummary,
  getBestSellingItems,
  getAppSessionsReport,
  getFinancialSummary,
  getActiveDebts,
  getDebtRepayments,
   getPurchasesBreakdown,
   getTablesBreakdown,
  getOrdersForExport,
  getPaymentsForExport,
  getDebtTransactionsForExport,
  getExpensesForExport,
  getWithdrawalsForExport,
  getEmployeeSalariesForExport,
  getEmployeeWithdrawalsForExport,
  exportReportsToExcel
};
