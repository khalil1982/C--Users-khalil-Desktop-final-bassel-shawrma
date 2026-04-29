(function () {
  const userBadge = document.getElementById('userBadge');
  const btnLogout = document.getElementById('btnLogout');
  const logoutModal = document.getElementById('logoutModal');
  const logoutCancel = document.getElementById('logoutCancel');
  const logoutConfirm = document.getElementById('logoutConfirm');
  const errorArea = document.getElementById('errorArea');
  const navItems = document.querySelectorAll('.nav-item');

  const reportStartDate = document.getElementById('reportStartDate');
  const reportEndDate = document.getElementById('reportEndDate');
  const btnRefreshReports = document.getElementById('btnRefreshReports');
  const btnExportExcel = document.getElementById('btnExportExcel');

  const summaryReportCards = document.getElementById('summaryReportCards');
  const bestSellingTable = document.getElementById('bestSellingTable').querySelector('tbody');

  const purchasesTable = document.getElementById('purchasesTable').querySelector('tbody');
  const tablesReportTable = document.getElementById('tablesReportTable').querySelector('tbody');
  const financialRecordContainer = document.getElementById('financialRecordContainer');
  const employeesReportCards = document.getElementById('employeesReportCards');
  const debtsTable = document.getElementById('debtsTable').querySelector('tbody');
  const repaymentsTable = document.getElementById('repaymentsTable').querySelector('tbody');

  let session = null;

  function showError(msg) {
    errorArea.innerHTML = msg ? `<p class="toast toast-error">${msg}</p>` : '';
  }

  function clearError() {
    errorArea.innerHTML = '';
  }

  function formatCurrency(amount) {
    const numeric = Number(amount || 0);
    if (!Number.isFinite(numeric)) return '₪0';
    const fixed = numeric.toFixed(1);
    return `₪${fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed}`;
  }

  function formatPaymentMethod(method) {
    const map = {
      cash: 'نقداً',
      bank_app: 'تطبيق بنكي',
      debt: 'دين'
    };
    return map[method] || '—';
  }

  function navigateTo(target) {
    const map = {
      dashboard: 'main',
      menu: 'menu',
      orders: 'pos',
      customers: 'customers',
      finance: 'finance',
      employees: 'employees',
      reports: 'reports',
      settings: 'settings',
      contact: 'contact'
    };
    if (target === 'settings' && window.SettingsGate) {
      window.SettingsGate.show();
      return;
    }
    window.api.app.navigate(map[target] || 'main');
  }

  function renderCards(container, entries) {
    container.innerHTML = entries
      .map(
        (entry) => `
          <div class="report-card">
            <div class="report-label">${entry.label}</div>
            <div class="report-value">${entry.value}</div>
          </div>
        `
      )
      .join('');
  }

  function getRange() {
    return { start: reportStartDate.value, end: reportEndDate.value };
  }

  async function loadSummaryReport() {
    clearError();
    const range = getRange();
    const result = await window.api.report.getSummary(range.start, range.end);
    if (!result.ok) {
      showError(result.error || 'فشل تحميل التقرير.');
      return;
    }
    const report = result.report;
    renderCards(summaryReportCards, [
      { label: 'عدد الطلبات', value: report.total_orders },
      { label: 'إجمالي المبيعات', value: formatCurrency(report.total_sales) },
      { label: 'إجمالي الخصومات', value: formatCurrency(report.total_discounts) },
      { label: 'مبيعات نقداً', value: formatCurrency(report.total_cash) },
      { label: 'مبيعات تطبيق بنكي', value: formatCurrency(report.total_bank_app) }
    ]);
  }

  async function loadBestSelling() {
    clearError();
    const range = getRange();
    const result = await window.api.report.getBestSelling(range.start, range.end, 10);
    if (!result.ok) {
      showError(result.error || 'فشل تحميل التقرير.');
      return;
    }
    const items = result.items || [];
    bestSellingTable.innerHTML = items
      .map(
        (row) => `
        <tr>
          <td>${row.item_name}</td>
          <td>${row.total_sold}</td>
          <td>${formatCurrency(row.total_revenue)}</td>
        </tr>
      `
      )
      .join('');
    
    // Add chart after table
    const bestSellingSection = document.getElementById('bestSellingTable').closest('.report-section');
    if (bestSellingSection && items.length > 0) {
      // Remove existing chart if any
      const existingChart = bestSellingSection.querySelector('#bestSellingChart');
      if (existingChart) existingChart.remove();
      
      // Add chart container
      const chartContainer = document.createElement('div');
      chartContainer.id = 'bestSellingChartContainer';
      chartContainer.style.cssText = 'margin-top: 2rem; padding: var(--spacing-4); background: var(--info-50); border-radius: var(--radius-md);';
      chartContainer.innerHTML = '<canvas id="bestSellingChart" width="800" height="300"></canvas>';
      bestSellingSection.appendChild(chartContainer);
      
      // Load chart
      setTimeout(() => loadBestSellingChart(items), 100);
    }
  }

  function loadBestSellingChart(items) {
    const canvas = document.getElementById('bestSellingChart');
    if (!canvas || !items || items.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    const maxItems = Math.min(items.length, 10);
    const labels = items.slice(0, maxItems).map(item => item.item_name || item.name || '');
    const data = items.slice(0, maxItems).map(item => Number(item.total_revenue || item.revenue || 0));
    
    // Set canvas size
    canvas.width = canvas.offsetWidth || 800;
    canvas.height = 300;
    
    // Simple bar chart using canvas
    const maxValue = Math.max(...data, 1);
    const padding = 60;
    const barWidth = (canvas.width - padding * 2) / labels.length;
    const barHeight = canvas.height - padding * 2;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw bars
    ctx.fillStyle = '#ea580c';
    data.forEach((value, index) => {
      const height = (value / maxValue) * barHeight;
      const x = padding + index * barWidth;
      const y = canvas.height - padding - height;
      
      ctx.fillRect(x, y, barWidth - 5, height);
      
      // Value label
      ctx.fillStyle = '#292524';
      ctx.font = '11px Cairo';
      ctx.textAlign = 'center';
      ctx.fillText(formatCurrency(value), x + barWidth / 2 - 2.5, y - 5);
      ctx.fillStyle = '#ea580c';
    });
    
    // Y-axis labels
    ctx.fillStyle = '#57534e';
    ctx.font = '11px Cairo';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const value = (maxValue / 5) * i;
      const y = canvas.height - padding - (barHeight / 5) * i;
      ctx.fillText(formatCurrency(value), padding - 10, y + 4);
    }
    
    // X-axis labels (item names)
    ctx.textAlign = 'center';
    ctx.font = '10px Cairo';
    ctx.fillStyle = '#57534e';
    labels.forEach((label, index) => {
      const x = padding + index * barWidth + barWidth / 2 - 2.5;
      const y = canvas.height - padding + 20;
      const shortLabel = label.length > 12 ? label.substring(0, 10) + '...' : label;
      ctx.fillText(shortLabel, x, y);
    });
  }

  async function loadPurchasesBreakdown() {
    clearError();
    const range = getRange();
    const result = await window.api.report.getPurchasesBreakdown(range.start, range.end);
    if (!result.ok) {
      showError(result.error || 'فشل تحميل تقرير المشتريات.');
      return;
    }
    const purchases = result.purchases || [];
    if (!purchases.length) {
      purchasesTable.innerHTML = '<tr><td colspan="4">لا توجد مشتريات في الفترة المحددة.</td></tr>';
      return;
    }
    purchasesTable.innerHTML = purchases
      .map(
        (row) => `
        <tr>
          <td>${row.category_name}</td>
          <td>${row.business_date}</td>
          <td>${row.purchase_count}</td>
          <td>${formatCurrency(row.total_amount)}</td>
        </tr>
      `
      )
      .join('');
  }

  async function loadTablesReport() {
    clearError();
    const range = getRange();
    const result = await window.api.report.getTablesBreakdown(range.start, range.end);
    if (!result.ok) {
      showError(result.error || 'فشل تحميل تقرير الطاولات.');
      return;
    }
    const rows = result.tables || [];
    if (!rows.length) {
      tablesReportTable.innerHTML = '<tr><td colspan="6">لا توجد طلبات مرتبطة بالطاولات في الفترة المحددة.</td></tr>';
      return;
    }
    tablesReportTable.innerHTML = rows
      .map(
        (row) => `
        <tr>
          <td>${row.table_number}</td>
          <td>${row.orders_count ?? 0}</td>
          <td>${formatCurrency(row.total)}</td>
          <td>${formatCurrency(row.total_cash)}</td>
          <td>${formatCurrency(row.total_bank_app)}</td>
          <td>${formatCurrency(row.total_debt)}</td>
        </tr>
      `
      )
      .join('');
  }

  async function loadFinanceSummary() {
    clearError();
    const range = getRange();
    const result = await window.api.report.getFinancialSummary(range.start, range.end);
    if (!result.ok) {
      showError(result.error || 'فشل تحميل الملخص المالي.');
      return;
    }
    const s = result.summary;
    const totalRevenue = Number(s.sales || 0) + Number(s.debt_payments || 0);
    const totalExpenses = Number(s.expenses || 0) + Number(s.employee_salaries || 0) + Number(s.withdrawals || 0);
    const net = totalRevenue - totalExpenses;
    const kitchenPurchases = Number(s.kitchen_purchases || 0);
    const generalExpenses = Number(s.expenses || 0) - kitchenPurchases;

    financialRecordContainer.innerHTML = `
      <div class="financial-group revenue-group">
        <h3>💰 الإيرادات</h3>
        <div class="financial-row">
          <span>إجمالي المبيعات:</span>
          <span class="val">${formatCurrency(s.sales)}</span>
        </div>
        <div class="financial-row">
          <span>سداد الديون (دخل):</span>
          <span class="val">${formatCurrency(s.debt_payments)}</span>
        </div>
        <div class="financial-row total">
          <span>إجمالي الإيرادات:</span>
          <span class="val">${formatCurrency(totalRevenue)}</span>
        </div>
      </div>

      <div class="financial-group expense-group">
        <h3>💸 المصروفات</h3>
        <div class="financial-row">
          <span>المصروفات العامة:</span>
          <span class="val">${formatCurrency(generalExpenses)}</span>
        </div>
        <div class="financial-row">
          <span>مشتريات المطبخ:</span>
          <span class="val">${formatCurrency(kitchenPurchases)}</span>
        </div>
        <div class="financial-row">
          <span>رواتب العاملين:</span>
          <span class="val">${formatCurrency(s.employee_salaries)}</span>
        </div>
        <div class="financial-row">
          <span>سحوبات الشركاء:</span>
          <span class="val">${formatCurrency(s.withdrawals)}</span>
        </div>
        <div class="financial-row total">
          <span>إجمالي المصروفات:</span>
          <span class="val text-danger">${formatCurrency(totalExpenses)}</span>
        </div>
      </div>

      <div class="financial-group net-group">
        <h3>📊 الصافي</h3>
        <div class="financial-row net-result">
          <span>الربح التقديري:</span>
          <span class="val ${net >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(net)}</span>
        </div>
      </div>
    `;
  }

  async function loadEmployeesReport() {
    clearError();
    const range = getRange();
    const result = await window.api.report.getFinancialSummary(range.start, range.end);
    if (!result.ok || !result.summary) {
      if (result?.error) showError(result.error);
      return;
    }
    const s = result.summary;
    const empSalaries = Number(s.employee_salaries) || 0;
    const empWithdrawals = Number(s.employee_withdrawals) || 0;
    const net = empSalaries - empWithdrawals;
    renderCards(employeesReportCards, [
      { label: 'إجمالي المرتبات', value: formatCurrency(empSalaries) },
      { label: 'إجمالي السحوبات', value: formatCurrency(empWithdrawals) },
      { label: 'الصافي', value: formatCurrency(net) }
    ]);
  }

  async function loadDebts() {
    const range = getRange();
    const result = await window.api.report.getDebts(range.start, range.end);
    if (!result.ok) {
      showError(result.error || 'فشل تحميل تقرير الديون.');
      return;
    }
    debtsTable.innerHTML = result.debts
      .map(
        (row) => `
        <tr>
          <td>${row.name}</td>
          <td>${row.phone || '—'}</td>
          <td>${formatCurrency(row.current_debt)}</td>
        </tr>
      `
      )
      .join('');
  }

  async function loadRepayments() {
    const range = getRange();
    const result = await window.api.report.getDebtRepayments(range.start, range.end);
    if (!result.ok) {
      showError(result.error || 'فشل تحميل سجل السداد.');
      return;
    }
    repaymentsTable.innerHTML = result.repayments
      .map(
        (row) => `
        <tr>
          <td>${row.customer_name}</td>
          <td>${formatCurrency(row.amount)}</td>
          <td>${formatPaymentMethod(row.payment_method)}</td>
          <td>${row.business_date}</td>
        </tr>
      `
      )
      .join('');
  }

  async function exportExcel() {
    clearError();
    const range = getRange();
    if (!range.start || !range.end) {
      showError('حدّد تاريخ البداية والنهاية ثم جرّب التصدير.');
      return;
    }
    try {
      const result = await window.api.report.exportExcel(range.start, range.end);
      if (!result.ok) {
        showError(result.error || 'فشل تصدير ملف Excel.');
        return;
      }
      errorArea.innerHTML = `<p class="toast toast-success">تم تصدير الملف: ${result.fileName}</p>`;
    } catch (e) {
      showError(e?.message || 'فشل تصدير ملف Excel.');
    }
  }

  async function loadAllReports() {
    await loadSummaryReport();
    await loadBestSelling();
    await loadPurchasesBreakdown();
    await loadTablesReport();
    await loadFinanceSummary();
    await loadEmployeesReport();
    await loadDebts();
    await loadRepayments();
  }

  function showLogoutModal() {
    logoutModal.classList.remove('hidden');
    logoutConfirm.focus();
  }

  function hideLogoutModal() {
    logoutModal.classList.add('hidden');
  }

  async function doLogout() {
    hideLogoutModal();
    const sid = session?.sessionId;
    if (sid) {
      await window.api.auth.logout(sid);
    }
    await window.api.app.clearCurrentSession();
    await window.api.app.navigate('login');
  }

  async function init() {
    session = await window.api.auth.getCurrentSession();
    if (!session || !session.user || !session.sessionId) {
      await window.api.app.navigate('login');
      return;
    }
    userBadge.textContent = session.user.username;
    const today = new Date().toISOString().split('T')[0];
    reportStartDate.value = today;
    reportEndDate.value = today;
    await loadAllReports();
  }

  navItems.forEach((item) => {
    item.addEventListener('click', () => navigateTo(item.dataset.target));
  });

  btnRefreshReports.addEventListener('click', loadAllReports);
  btnExportExcel.addEventListener('click', exportExcel);
  btnLogout.addEventListener('click', showLogoutModal);
  logoutCancel.addEventListener('click', hideLogoutModal);
  logoutConfirm.addEventListener('click', doLogout);

  init();
})();
