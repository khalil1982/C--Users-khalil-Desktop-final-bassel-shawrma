(function () {
  const userBadge = document.getElementById('userBadge');
  const btnLogout = document.getElementById('btnLogout');
  const logoutModal = document.getElementById('logoutModal');
  const logoutCancel = document.getElementById('logoutCancel');
  const logoutConfirm = document.getElementById('logoutConfirm');
  const errorArea = document.getElementById('errorArea');
  const navItems = document.querySelectorAll('.nav-item');

  const customerSearch = document.getElementById('customerSearch');
  const btnOpenAddDebt = document.getElementById('btnOpenAddDebt');
  const debtorsList = document.getElementById('debtorsList');
  const customersList = document.getElementById('customersList');

  const addDebtModal = document.getElementById('addDebtModal');
  const addDebtError = document.getElementById('addDebtError');
  const addDebtCancel = document.getElementById('addDebtCancel');
  const addDebtConfirm = document.getElementById('addDebtConfirm');
  const debtCustomerName = document.getElementById('debtCustomerName');
  const debtCustomerPhone = document.getElementById('debtCustomerPhone');
  const debtCustomerNationalId = document.getElementById('debtCustomerNationalId');
  const debtAmount = document.getElementById('debtAmount');
  const addDebtMaxHint = document.getElementById('addDebtMaxHint');

  const repayDebtModal = document.getElementById('repayDebtModal');
  const repayDebtError = document.getElementById('repayDebtError');
  const repayDebtCancel = document.getElementById('repayDebtCancel');
  const repayDebtConfirm = document.getElementById('repayDebtConfirm');
  const repayCustomerInfo = document.getElementById('repayCustomerInfo');
  const repayAmount = document.getElementById('repayAmount');
  const repayMethod = document.getElementById('repayMethod');
  const repayNotes = document.getElementById('repayNotes');

  const customerDetailsModal = document.getElementById('customerDetailsModal');
  const customerDetailsModalContent = document.getElementById('customerDetailsModalContent');
  const customerDetailsModalClose = document.getElementById('customerDetailsModalClose');

  let session = null;
  let selectedCustomer = null;
  let searchTimeout = null;

  function showError(msg) {
    errorArea.innerHTML = msg ? `<p class="toast toast-error">${msg}</p>` : '';
  }

  function clearError() {
    errorArea.innerHTML = '';
  }

  function formatNumber(value) {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric)) return '0';
    const fixed = numeric.toFixed(1);
    return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
  }

  function formatCurrency(value) {
    return `₪${formatNumber(value)}`;
  }

  function statusBadge(status) {
    if (status === 'debtor') {
      return '<span class="status-badge">مدين</span>';
    }
    return '<span class="status-badge clear">مستوفي</span>';
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

  function renderDebtors(debtors) {
    if (!debtors.length) {
      debtorsList.innerHTML = '<p class="placeholder-msg">لا يوجد زبائن مدينون حالياً.</p>';
      return;
    }
    debtorsList.innerHTML = debtors
      .map(
        (debtor) => `
          <div class="list-card" data-id="${debtor.customer_id}">
            <div class="card-main">
              <span class="card-title">${debtor.name}</span>
              <span class="card-subtitle">${debtor.phone || '—'}</span>
              <span class="card-subtitle">الدين الحالي: ${formatCurrency(debtor.current_debt)}</span>
            </div>
            <div class="card-actions">
              <button type="button" class="btn-secondary" data-action="details">تفاصيل</button>
              <button type="button" class="btn-primary" data-action="repay">تسجيل دفعة</button>
            </div>
          </div>
        `
      )
      .join('');
  }

  function renderCustomers(customers) {
    if (!customers.length) {
      customersList.innerHTML = '<p class="placeholder-msg">لا توجد نتائج مطابقة.</p>';
      return;
    }
    customersList.innerHTML = customers
      .map(
        (customer) => `
          <div class="list-card" data-id="${customer.customer_id}">
            <div class="card-main">
              <span class="card-title">${customer.name}</span>
              <span class="card-subtitle">${customer.phone || '—'}</span>
              <span class="card-subtitle">${customer.national_id || '—'}</span>
            </div>
            <div class="card-actions">
              ${statusBadge((customer.current_debt || 0) > 0 ? 'debtor' : 'clear')}
              <button type="button" class="btn-secondary" data-action="details">تفاصيل</button>
            </div>
          </div>
        `
      )
      .join('');
  }

  function renderTransactionsTable(rows) {
    if (!rows.length) {
      return '<p class="placeholder-msg">لا توجد حركات مسجلة.</p>';
    }
    return `
      <table class="transactions-table">
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>النوع</th>
            <th>القيمة</th>
            <th>ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
            <tr class="${row.transaction_type === 'payment' ? 'tr-payment' : 'tr-debt'}">
              <td>${row.business_date || row.created_at.split('T')[0]}</td>
              <td>${row.transaction_type === 'payment' ? 'دفعة' : 'دين'}</td>
              <td class="amount-cell">${formatCurrency(row.amount)}</td>
              <td>${row.notes || (row.payment_method ? formatPaymentMethod(row.payment_method) : '—')}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
  }


  async function loadDebtors() {
    const result = await window.api.customer.getDebtors();
    if (!result.ok) {
      showError(result.error || 'فشل تحميل قائمة المدينين.');
      return;
    }
    renderDebtors(result.debtors || []);
  }

  async function searchCustomers() {
    const query = customerSearch.value.trim();
    if (!query) {
      customersList.innerHTML = '<p class="placeholder-msg">أدخل قيمة للبحث.</p>';
      return;
    }
    const result = await window.api.customer.search(query);
    if (!result.ok) {
      showError(result.error || 'فشل البحث عن الزبائن.');
      return;
    }
    renderCustomers(result.customers || []);
  }

  async function fetchCustomerDetails(customerId) {
    const result = await window.api.customer.getDetails(customerId);
    if (!result.ok) {
      showError(result.error || 'فشل تحميل تفاصيل الزبون.');
      return null;
    }
    selectedCustomer = result.details.customer;
    return result.details;
  }

  async function selectCustomer(customerId) {
    const details = await fetchCustomerDetails(customerId);
    if (!details) return;
    renderCustomerDetailsModal(details);
    customerDetailsModal.classList.remove('hidden');
  }

  function closeCustomerDetailsModal() {
    customerDetailsModal.classList.add('hidden');
  }

  function renderCustomerDetailsModal(details) {
    if (!details) {
      customerDetailsModalContent.innerHTML = '<p class="placeholder-msg">لا توجد تفاصيل.</p>';
      return;
    }

    const customer = details.customer;
    const debtTotal = details.debts.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const repaymentTotal = details.repayments.reduce((sum, row) => sum + Number(row.amount || 0), 0);

    // Combine and sort all transactions
    const allTransactions = [...details.debts, ...details.repayments].sort((a, b) => {
      return new Date(b.created_at) - new Date(a.created_at);
    });

    customerDetailsModalContent.innerHTML = `
      <div class="details-header">
        <div>
          <div class="card-title">${customer.name}</div>
          <div class="card-subtitle">${customer.phone || '—'} • ${customer.national_id || '—'}</div>
        </div>
        <div class="card-actions">
          ${statusBadge(details.status)}
          <button type="button" class="btn-primary" id="modalRepayBtn">تسجيل دفعة</button>
        </div>
      </div>
      <div class="details-summary">
        <div class="summary-card">
          <div class="summary-label">الرصيد الحالي</div>
          <div class="summary-value">${formatCurrency(details.currentBalance)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">إجمالي الديون</div>
          <div class="summary-value">${formatCurrency(debtTotal)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">إجمالي السداد</div>
          <div class="summary-value">${formatCurrency(repaymentTotal)}</div>
        </div>
      </div>
      <div class="details-ledger">
        <h4>سجل الحركات (الديون والدفعات)</h4>
        ${renderTransactionsTable(allTransactions)}
      </div>
    `;

    const modalRepayBtn = document.getElementById('modalRepayBtn');
    if (modalRepayBtn) {
      modalRepayBtn.addEventListener('click', () => {
        closeCustomerDetailsModal();
        openRepayModal(customer);
      });
    }
  }

  async function openAddDebtModal() {
    addDebtError.textContent = '';
    debtCustomerName.value = '';
    debtCustomerPhone.value = '';
    debtCustomerNationalId.value = '';
    debtAmount.value = '';
    const maxShekels = await window.api.app.getMaxDebtShekels();
    if (typeof maxShekels === 'number' && debtAmount) {
      debtAmount.setAttribute('max', String(maxShekels));
      if (addDebtMaxHint) addDebtMaxHint.textContent = `حد الدين الأقصى ${maxShekels} شيكل أو أقل.`;
    }
    addDebtModal.classList.remove('hidden');
  }

  function closeAddDebtModal() {
    addDebtModal.classList.add('hidden');
  }

  function openRepayModal(customer) {
    if (!customer) return;
    repayDebtError.textContent = '';
    repayAmount.value = '';
    repayMethod.value = 'cash';
    repayNotes.value = '';
    repayCustomerInfo.textContent = `${customer.name} • ${customer.phone || '—'}`;
    repayDebtModal.classList.remove('hidden');
  }

  function closeRepayModal() {
    repayDebtModal.classList.add('hidden');
  }

  async function submitAddDebt() {
    addDebtError.textContent = '';
    const amount = parseFloat(debtAmount.value) || 0;
    const maxShekels = await window.api.app.getMaxDebtShekels();
    if (typeof maxShekels === 'number' && amount > maxShekels) {
      addDebtError.textContent = `تجاوز حد الدين. الحد الأقصى ${maxShekels} شيكل.`;
      return;
    }
    if (amount <= 0) {
      addDebtError.textContent = 'قيمة الدين يجب أن تكون أكبر من صفر.';
      return;
    }
    const result = await window.api.customer.createDebt(
      debtCustomerName.value.trim(),
      debtCustomerPhone.value.trim(),
      debtCustomerNationalId.value.trim() || null,
      debtAmount.value
    );
    if (!result.ok) {
      addDebtError.textContent = result.error || 'فشل إضافة الدين.';
      return;
    }
    closeAddDebtModal();
    await loadDebtors();
    if (debtCustomerPhone.value.trim()) {
      customerSearch.value = debtCustomerPhone.value.trim();
      await searchCustomers();
    }
  }

  async function submitRepayDebt() {
    repayDebtError.textContent = '';
    if (!selectedCustomer) {
      repayDebtError.textContent = 'يرجى اختيار زبون أولاً.';
      return;
    }
    
    const amount = parseFloat(repayAmount.value) || 0;
    if (amount <= 0) {
      repayDebtError.textContent = 'يرجى إدخال مبلغ صحيح.';
      return;
    }

    if (amount > selectedCustomer.current_debt) {
      repayDebtError.textContent = `مبلغ السداد لا يمكن أن يتجاوز قيمة الدين الحالي (${selectedCustomer.current_debt} ₪).`;
      return;
    }

    const result = await window.api.customer.repayDebt(
      selectedCustomer.customer_id,
      repayAmount.value,
      repayMethod.value,
      repayNotes.value.trim()
    );
    if (!result.ok) {
      repayDebtError.textContent = result.error || 'فشل سداد الدين.';
      return;
    }
    closeRepayModal();
    await loadDebtors();
    await selectCustomer(selectedCustomer.customer_id);
  }

  function showLogoutModal() {
    if (logoutModal) logoutModal.classList.remove('hidden');
    if (logoutConfirm) logoutConfirm.focus();
  }

  function hideLogoutModal() {
    if (logoutModal) logoutModal.classList.add('hidden');
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
    userBadge.textContent = `👤 ${session.user.username}`;
    await loadDebtors();
  }

  navItems.forEach((item) => {
    item.addEventListener('click', () => navigateTo(item.dataset.target));
  });

  if (debtorsList) debtorsList.addEventListener('click', async (event) => {
    const card = event.target.closest('.list-card');
    if (!card) return;
    const action = event.target.dataset.action;
    const customerId = card.dataset.id;
    if (action === 'details') {
      selectCustomer(customerId);
    }
    if (action === 'repay') {
      const details = await fetchCustomerDetails(customerId);
      if (details && selectedCustomer) {
        openRepayModal(selectedCustomer);
      }
    }
  });

  if (customersList) customersList.addEventListener('click', (event) => {
    const card = event.target.closest('.list-card');
    if (!card) return;
    selectCustomer(card.dataset.id);
  });

  if (customerSearch) customerSearch.addEventListener('input', () => {
    clearError();
    if (searchTimeout) window.clearTimeout(searchTimeout);
    searchTimeout = window.setTimeout(searchCustomers, 300);
  });

  if (btnOpenAddDebt) btnOpenAddDebt.addEventListener('click', openAddDebtModal);
  if (addDebtCancel) addDebtCancel.addEventListener('click', closeAddDebtModal);
  if (addDebtConfirm) addDebtConfirm.addEventListener('click', submitAddDebt);
  if (repayDebtCancel) repayDebtCancel.addEventListener('click', closeRepayModal);
  if (repayDebtConfirm) repayDebtConfirm.addEventListener('click', submitRepayDebt);
  if (customerDetailsModalClose) customerDetailsModalClose.addEventListener('click', closeCustomerDetailsModal);

  if (btnLogout) btnLogout.addEventListener('click', showLogoutModal);
  if (logoutCancel) logoutCancel.addEventListener('click', hideLogoutModal);
  if (logoutConfirm) logoutConfirm.addEventListener('click', doLogout);

  init();
})();
