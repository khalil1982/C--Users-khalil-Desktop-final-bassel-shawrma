/**
 * Employees page – main entry. Uses employeeService, helpers, and EmployeeCard component.
 */
import { formatCurrency, getDetailsDateRange, MONTHS } from '../utils/employeeHelpers.js';
import * as employeeService from './services/employeeService.js';
import { renderEmployeeCard } from './components/EmployeeCard.js';

(function runEmployeesPage() {
  const userBadge = document.getElementById('userBadge');
  const btnLogout = document.getElementById('btnLogout');
  const logoutModal = document.getElementById('logoutModal');
  const logoutCancel = document.getElementById('logoutCancel');
  const logoutConfirm = document.getElementById('logoutConfirm');
  const errorArea = document.getElementById('errorArea');
  const navItems = document.querySelectorAll('.nav-item');

  const btnOpenAddEmployee = document.getElementById('btnOpenAddEmployee');
  const addEmployeeModal = document.getElementById('addEmployeeModal');
  const addEmployeeCancel = document.getElementById('addEmployeeCancel');
  const addEmployeeConfirm = document.getElementById('addEmployeeConfirm');
  const modalEmployeeName = document.getElementById('modalEmployeeName');
  const modalEmployeePhone = document.getElementById('modalEmployeePhone');
  const modalEmployeeNationalId = document.getElementById('modalEmployeeNationalId');
  const modalEmployeeStatus = document.getElementById('modalEmployeeStatus');
  const addEmployeeError = document.getElementById('addEmployeeError');
  const employeesList = document.getElementById('employeesList');

  const editEmployeeModal = document.getElementById('editEmployeeModal');
  const editEmployeeCancel = document.getElementById('editEmployeeCancel');
  const editEmployeeConfirm = document.getElementById('editEmployeeConfirm');
  const editEmployeeName = document.getElementById('editEmployeeName');
  const editEmployeePhone = document.getElementById('editEmployeePhone');
  const editEmployeeNationalId = document.getElementById('editEmployeeNationalId');
  const editEmployeeSalary = document.getElementById('editEmployeeSalary');
  const editEmployeeStatus = document.getElementById('editEmployeeStatus');
  const editEmployeeError = document.getElementById('editEmployeeError');

  const salaryModal = document.getElementById('salaryModal');
  const salaryModalEmployee = document.getElementById('salaryModalEmployee');
  const salaryModalMonth = document.getElementById('salaryModalMonth');
  const salaryModalAmount = document.getElementById('salaryModalAmount');
  const salaryModalNotes = document.getElementById('salaryModalNotes');
  const salaryModalError = document.getElementById('salaryModalError');
  const salaryModalCancel = document.getElementById('salaryModalCancel');
  const salaryModalConfirm = document.getElementById('salaryModalConfirm');

  const salaryModalWithdrawalAlert = document.createElement('div');
  salaryModalWithdrawalAlert.id = 'salaryModalWithdrawalAlert';
  salaryModalWithdrawalAlert.className = 'withdrawal-alert hidden';
  Object.assign(salaryModalWithdrawalAlert.style, {
    marginBottom: '1rem',
    padding: '0.75rem',
    backgroundColor: '#fff7ed',
    border: '1px solid #fdba74',
    borderRadius: '0.5rem',
    color: '#9a3412',
    fontSize: '0.875rem',
  });
  if (salaryModalError) {
    salaryModalError.parentNode.insertBefore(salaryModalWithdrawalAlert, salaryModalError);
  }

  const withdrawalModal = document.getElementById('withdrawalModal');
  const withdrawalModalEmployee = document.getElementById('withdrawalModalEmployee');
  const withdrawalModalAmount = document.getElementById('withdrawalModalAmount');
  const withdrawalModalDate = document.getElementById('withdrawalModalDate');
  const withdrawalModalNotes = document.getElementById('withdrawalModalNotes');
  const withdrawalModalError = document.getElementById('withdrawalModalError');
  const withdrawalModalCancel = document.getElementById('withdrawalModalCancel');
  const withdrawalModalConfirm = document.getElementById('withdrawalModalConfirm');

  const employeeDetailsModal = document.getElementById('employeeDetailsModal');
  const employeeDetailsTitle = document.getElementById('employeeDetailsTitle');
  const detailsMonth = document.getElementById('detailsMonth');
  const btnApplyDetailsFilter = document.getElementById('btnApplyDetailsFilter');
  const btnShowAllDetails = document.getElementById('btnShowAllDetails');
  const employeeDetailsContent = document.getElementById('employeeDetailsContent');
  const employeeDetailsPrint = document.getElementById('employeeDetailsPrint');
  const employeeDetailsExport = document.getElementById('employeeDetailsExport');
  const employeeDetailsClose = document.getElementById('employeeDetailsClose');

  const btnViewSalariesReport = document.getElementById('btnViewSalariesReport');
  const btnShowActive = document.getElementById('btnShowActive');
  const btnShowAll = document.getElementById('btnShowAll');
  const salariesReportModal = document.getElementById('salariesReportModal');
  const salariesReportContent = document.getElementById('salariesReportContent');
  const salariesReportClose = document.getElementById('salariesReportClose');

  let session = null;
  let currentEditEmployeeId = null;
  let currentDetailsEmployeeId = null;
  let currentDetailsEmployeeName = '';
  let showActiveOnly = true;

  function showError(msg) {
    errorArea.innerHTML = msg ? `<p class="toast toast-error">${msg}</p>` : '';
  }

  function clearError() {
    errorArea.innerHTML = '';
  }

  function showSuccess(msg) {
    errorArea.innerHTML = `<p class="toast toast-success">${msg}</p>`;
    setTimeout(() => clearError(), 3000);
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
      contact: 'contact',
    };
    if (target === 'settings' && window.SettingsGate) {
      window.SettingsGate.show();
      return;
    }
    window.api.app.navigate(map[target] || 'main');
  }

  function getDetailsRange() {
    return getDetailsDateRange(detailsMonth?.value || '');
  }

  function populateEmployeeSelects(employees) {
    const activeList = (employees || []).filter((e) => e.status === 'active');
    const options = activeList.map((e) => `<option value="${e.employee_id}">${e.name}</option>`).join('');
    if (salaryModalEmployee)
      salaryModalEmployee.innerHTML = '<option value="">— اختر الموظف —</option>' + options;
    if (withdrawalModalEmployee)
      withdrawalModalEmployee.innerHTML = '<option value="">— اختر الموظف —</option>' + options;
  }

  async function loadEmployees() {
    const result = await employeeService.getAll({ activeOnly: false });
    if (!result.ok) {
      showError(result.error || 'فشل تحميل العاملين.');
      return;
    }
    let employees = result.employees || [];
    if (showActiveOnly) employees = employees.filter((e) => e.status === 'active');
    const activeEmployees = (result.employees || []).filter((e) => e.status === 'active');
    populateEmployeeSelects(activeEmployees);

    if (employees.length === 0) {
      employeesList.innerHTML =
        '<p class="placeholder-msg">لا يوجد عاملين. اضغط "إضافة عامل" لإنشاء واحد.</p>';
      return;
    }
    employeesList.innerHTML = employees.map((emp) => renderEmployeeCard(emp)).join('');
  }

  function openAddEmployeeModal() {
    addEmployeeError.textContent = '';
    modalEmployeeName.value = '';
    modalEmployeePhone.value = '';
    modalEmployeeNationalId.value = '';
    modalEmployeeStatus.value = 'active';
    addEmployeeModal.classList.remove('hidden');
    modalEmployeeName.focus();
  }

  function closeAddEmployeeModal() {
    addEmployeeModal.classList.add('hidden');
  }

  async function confirmAddEmployee() {
    addEmployeeError.textContent = '';
    const name = modalEmployeeName.value.trim();
    const phone = modalEmployeePhone.value.trim();
    const nationalId = modalEmployeeNationalId.value.trim() || null;
    const status = modalEmployeeStatus.value;
    if (!name || !phone) {
      addEmployeeError.textContent = '❌ الرجاء إدخال جميع البيانات المطلوبة.';
      return;
    }
    const result = await employeeService.create({
      name,
      phone,
      nationalId,
      monthlySalary: 0,
      status,
    });
    if (!result.ok) {
      addEmployeeError.textContent =
        result.error === 'رقم الهاتف مسجل مسبقًا.'
          ? '❌ رقم الهاتف مسجل مسبقًا.'
          : (result.error || 'فشل إضافة العامل.');
      return;
    }
    closeAddEmployeeModal();
    showSuccess('✅ تم إضافة العامل بنجاح');
    await loadEmployees();
  }

  async function openEditEmployeeModal(employeeId) {
    const result = await employeeService.get(employeeId);
    if (!result.ok) {
      showError(result.error || 'فشل تحميل بيانات العامل.');
      return;
    }
    const emp = result.employee;
    currentEditEmployeeId = employeeId;
    editEmployeeName.value = emp.name || '';
    editEmployeePhone.value = emp.phone || '';
    editEmployeeNationalId.value = emp.national_id || '';
    editEmployeeSalary.value = emp.monthly_salary ?? 0;
    editEmployeeStatus.value = emp.status || 'active';
    editEmployeeError.textContent = '';
    editEmployeeModal.classList.remove('hidden');
  }

  function closeEditEmployeeModal() {
    editEmployeeModal.classList.add('hidden');
    currentEditEmployeeId = null;
  }

  async function confirmEditEmployee() {
    editEmployeeError.textContent = '';
    const name = editEmployeeName.value.trim();
    const phone = editEmployeePhone.value.trim();
    const nationalId = editEmployeeNationalId.value.trim() || null;
    const salary = parseFloat(editEmployeeSalary.value);
    const status = editEmployeeStatus.value;
    if (!name || !phone) {
      editEmployeeError.textContent = '❌ الرجاء إدخال جميع البيانات المطلوبة.';
      return;
    }
    const result = await employeeService.update(currentEditEmployeeId, {
      name,
      phone,
      nationalId,
      monthlySalary: Number.isFinite(salary) && salary >= 0 ? salary : 0,
      status,
    });
    if (!result.ok) {
      editEmployeeError.textContent =
        result.error === 'رقم الهاتف مسجل مسبقًا.'
          ? '❌ رقم الهاتف مسجل مسبقًا.'
          : (result.error || 'فشل تحديث العامل.');
      return;
    }
    closeEditEmployeeModal();
    showSuccess('✅ تم تحديث بيانات العامل');
    await loadEmployees();
  }

  async function checkMonthlyWithdrawals() {
    if (!salaryModalWithdrawalAlert) return;
    salaryModalWithdrawalAlert.classList.add('hidden');
    salaryModalWithdrawalAlert.innerHTML = '';
    const employeeId = salaryModalEmployee?.value;
    const monthVal = salaryModalMonth?.value;
    if (!employeeId || !monthVal) return;
    const [y, m] = monthVal.split('-');
    const result = await employeeService.getMonthlyWithdrawals(
      employeeId,
      parseInt(y, 10),
      parseInt(m, 10)
    );
    if (result.ok && result.total > 0) {
      salaryModalWithdrawalAlert.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span>⚠️</span>
          <span>هذا الموظف سحب <strong>${formatCurrency(result.total)}</strong> (عدد ${result.count}) خلال هذا الشهر.</span>
        </div>
      `;
      salaryModalWithdrawalAlert.classList.remove('hidden');
    }
  }

  function openSalaryModal(prefillEmployeeId) {
    salaryModalError.textContent = '';
    salaryModalAmount.value = '';
    salaryModalNotes.value = '';
    const today = new Date();
    salaryModalMonth.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    if (salaryModalEmployee) {
      if (prefillEmployeeId) salaryModalEmployee.value = prefillEmployeeId;
      else salaryModalEmployee.value = salaryModalEmployee.querySelector('option')?.value || '';
    }
    checkMonthlyWithdrawals();
    salaryModal.classList.remove('hidden');
  }

  function closeSalaryModal() {
    salaryModal.classList.add('hidden');
  }

  async function confirmSalaryModal() {
    salaryModalError.textContent = '';
    const employeeId = salaryModalEmployee?.value;
    const monthVal = salaryModalMonth?.value || '';
    const amount = parseFloat(salaryModalAmount?.value);
    const notes = salaryModalNotes?.value?.trim() || null;
    if (!employeeId) {
      salaryModalError.textContent = '❌ الرجاء اختيار موظف.';
      return;
    }
    if (!monthVal) {
      salaryModalError.textContent = '❌ الرجاء اختيار الشهر.';
      return;
    }
    const [y, m] = monthVal.split('-');
    if (!amount || amount < 0) {
      salaryModalError.textContent = '❌ المبلغ يجب أن يكون أكبر من صفر.';
      return;
    }
    const result = await employeeService.recordSalary({
      employeeId,
      salaryMonth: m,
      salaryYear: parseInt(y, 10),
      amount,
      notes,
    });
    if (!result.ok) {
      salaryModalError.textContent = result.error || 'فشل تسجيل المرتب.';
      return;
    }
    closeSalaryModal();
    showSuccess('✅ تم تسليم المرتب بنجاح.');
    await loadEmployees();
    const allResult = await employeeService.getAll({ activeOnly: false });
    populateEmployeeSelects(allResult.employees || []);
  }

  function openWithdrawalModal(prefillEmployeeId) {
    withdrawalModalError.textContent = '';
    withdrawalModalAmount.value = '';
    withdrawalModalNotes.value = '';
    const today = new Date();
    withdrawalModalDate.value = today.toISOString().split('T')[0];
    if (withdrawalModalEmployee) {
      if (prefillEmployeeId) withdrawalModalEmployee.value = prefillEmployeeId;
      else withdrawalModalEmployee.value = withdrawalModalEmployee.querySelector('option')?.value || '';
    }
    withdrawalModal.classList.remove('hidden');
  }

  function closeWithdrawalModal() {
    withdrawalModal.classList.add('hidden');
  }

  async function confirmWithdrawalModal() {
    withdrawalModalError.textContent = '';
    const employeeId = withdrawalModalEmployee?.value;
    const amount = parseFloat(withdrawalModalAmount?.value);
    const dateVal = withdrawalModalDate?.value?.trim();
    const notes = withdrawalModalNotes?.value?.trim() || null;
    if (!employeeId) {
      withdrawalModalError.textContent = '❌ الرجاء اختيار موظف.';
      return;
    }
    if (!amount || amount <= 0) {
      withdrawalModalError.textContent = '❌ المبلغ يجب أن يكون أكبر من صفر.';
      return;
    }
    try {
      const result = await employeeService.recordWithdrawal({
        employeeId,
        amount,
        withdrawalDate: dateVal || undefined,
        notes,
      });
      if (!result.ok) {
        withdrawalModalError.textContent = result.error || 'فشل تسجيل السحب.';
        return;
      }
      closeWithdrawalModal();
      showSuccess('✅ تم تسجيل السحب بنجاح.');
      await loadEmployees();
    } catch (err) {
      withdrawalModalError.textContent = '❌ حدث خطأ غير متوقع أثناء تسجيل السحب.';
    }
  }

  async function loadEmployeeDetailsContent() {
    if (!currentDetailsEmployeeId) {
      employeeDetailsContent.innerHTML = '<p class="placeholder-msg">اختر عامل من البطاقات.</p>';
      return;
    }
    const { startDate, endDate } = getDetailsRange();
    const result = await employeeService.getFinancialDetails({
      employeeId: currentDetailsEmployeeId,
      startDate,
      endDate,
    });
    if (!result.ok) {
      employeeDetailsContent.innerHTML = `<p class="toast toast-error">${result.error || 'فشل تحميل البيانات.'}</p>`;
      return;
    }
    const salaries = result.salaries || [];
    const withdrawals = result.withdrawals || [];
    const totalSalary = Number(result.totalSalary || 0);
    const totalWithdrawals = Number(result.totalWithdrawals || 0);
    const net = Number(result.net || 0);
    employeeDetailsContent.innerHTML = `
      <div class="employee-details-section">
        <h4>📈 الملخص المالي للفترة</h4>
        <div class="details-summary-box">
          <div class="details-summary-row"><span>إجمالي المرتبات</span><span>${formatCurrency(totalSalary)}</span></div>
          <div class="details-summary-row"><span>إجمالي السحوبات</span><span>${formatCurrency(totalWithdrawals)}</span></div>
          <div class="details-summary-row net"><span>الرصيد الصافي</span><span>${formatCurrency(net)}</span></div>
        </div>
      </div>
      <div class="employee-details-section">
        <h4>📋 سجل المرتبات</h4>
        <table class="transactions-table">
          <thead><tr><th>#</th><th>الشهر</th><th>المبلغ</th><th>تاريخ التسليم</th></tr></thead>
          <tbody>
            ${salaries.length ? salaries.map((s, i) => {
              const monthName = MONTHS.find((m) => m.value === s.salary_month)?.name || s.salary_month;
              return `<tr><td>${i + 1}</td><td>${s.salary_year}-${s.salary_month} (${monthName})</td><td>${formatCurrency(s.amount)}</td><td>${s.business_date}</td></tr>`;
            }).join('') : '<tr><td colspan="4">لا توجد رواتب في الفترة.</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="employee-details-section">
        <h4>💵 سجل السحوبات (التفصيلي)</h4>
        <table class="transactions-table">
          <thead><tr><th>#</th><th>التاريخ</th><th>المبلغ</th><th>ملاحظات</th></tr></thead>
          <tbody>
            ${withdrawals.length ? withdrawals.map((w, i) => `<tr><td>${i + 1}</td><td>${w.business_date}</td><td>${formatCurrency(w.amount)}</td><td>${w.notes || '—'}</td></tr>`).join('') : '<tr><td colspan="4">لا توجد سحوبات في الفترة.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  async function openEmployeeDetailsModal(employeeId) {
    const result = await employeeService.get(employeeId);
    if (!result.ok) {
      showError(result.error || 'فشل تحميل بيانات العامل.');
      return;
    }
    currentDetailsEmployeeId = employeeId;
    currentDetailsEmployeeName = result.employee.name || '';
    if (employeeDetailsTitle)
      employeeDetailsTitle.textContent = `📊 التفاصيل المالية - ${currentDetailsEmployeeName}`;
    const today = new Date();
    if (detailsMonth) detailsMonth.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    await loadEmployeeDetailsContent();
    employeeDetailsModal.classList.remove('hidden');
  }

  function closeEmployeeDetailsModal() {
    employeeDetailsModal.classList.add('hidden');
    currentDetailsEmployeeId = null;
  }

  function onPrintDetails() {
    const printArea = employeeDetailsContent;
    if (!printArea) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>التفاصيل المالية - ${currentDetailsEmployeeName}</title>
      <style>body{font-family:inherit;padding:1rem;} table{width:100%;border-collapse:collapse;} th,td{padding:0.5rem;border:1px solid #ddd;text-align:right;}</style></head><body>
      <h2>التفاصيل المالية - ${currentDetailsEmployeeName}</h2>
      ${printArea.innerHTML}
      </body></html>`);
    win.document.close();
    win.print();
    win.close();
  }

  function onExportDetails() {
    if (!currentDetailsEmployeeId) return;
    const { startDate, endDate } = getDetailsRange();
    if (!window.api.report || typeof window.api.report.exportEmployeeDetailsExcel !== 'function') {
      showError('استخدم التقرير العام لتصدير Excel.');
      return;
    }
    window.api.report
      .exportEmployeeDetailsExcel(currentDetailsEmployeeId, startDate, endDate)
      .then((res) => {
        if (res && res.ok && res.fileName) showSuccess(`تم تصدير الملف: ${res.fileName}`);
        else showError(res?.error || 'فشل التصدير.');
      })
      .catch(() => showError('فشل التصدير.'));
  }

  async function loadSalariesReport() {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    const start = new Date(today);
    start.setMonth(start.getMonth() - 1);
    const startDate = start.toISOString().split('T')[0];
    const result = await employeeService.getSalariesReport({ startDate, endDate });
    if (!result.ok) {
      salariesReportContent.innerHTML = `<p class="toast toast-error">${result.error || 'فشل تحميل التقرير.'}</p>`;
      return;
    }
    const salaries = result.salaries || [];
    const total = salaries.reduce((sum, s) => sum + Number(s.amount || 0), 0);
    salariesReportContent.innerHTML = `
      <div class="report-summary" style="margin-bottom:1rem;">
        <div class="summary-card"><div class="summary-label">إجمالي الرواتب</div><div class="summary-value">${formatCurrency(total)}</div></div>
        <div class="summary-card"><div class="summary-label">عدد الحركات</div><div class="summary-value">${salaries.length}</div></div>
      </div>
      <table class="transactions-table">
        <thead><tr><th>الموظف</th><th>الشهر</th><th>السنة</th><th>المبلغ</th><th>تاريخ العمل</th><th>ملاحظات</th></tr></thead>
        <tbody>
          ${salaries.length ? salaries.map((s) => {
            const monthName = MONTHS.find((m) => m.value === s.salary_month)?.name || s.salary_month;
            return `<tr><td>${s.employee_name}</td><td>${monthName}</td><td>${s.salary_year}</td><td>${formatCurrency(s.amount)}</td><td>${s.business_date}</td><td>${s.notes || '—'}</td></tr>`;
          }).join('') : '<tr><td colspan="6">لا توجد رواتب في الفترة.</td></tr>'}
        </tbody>
      </table>
    `;
  }

  function openSalariesReportModal() {
    loadSalariesReport();
    salariesReportModal.classList.remove('hidden');
  }

  function closeSalariesReportModal() {
    salariesReportModal.classList.add('hidden');
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
    if (session?.sessionId) await window.api.auth.logout(session.sessionId);
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
    await loadEmployees();
  }

  navItems.forEach((item) => item.addEventListener('click', () => navigateTo(item.dataset.target)));

  if (employeesList) {
    employeesList.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn || !btn.dataset.action || !btn.dataset.id) return;
      e.stopPropagation();
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'edit') openEditEmployeeModal(id);
      else if (action === 'details') openEmployeeDetailsModal(id);
      else if (action === 'salary') openSalaryModal(id);
      else if (action === 'withdrawal') openWithdrawalModal(id);
    });
  }

  function updateFilterButtons() {
    if (showActiveOnly) {
      btnShowActive?.classList.add('active');
      btnShowAll?.classList.remove('active');
    } else {
      btnShowActive?.classList.remove('active');
      btnShowAll?.classList.add('active');
    }
  }

  btnShowActive?.addEventListener('click', () => {
    showActiveOnly = true;
    updateFilterButtons();
    loadEmployees();
  });

  btnShowAll?.addEventListener('click', () => {
    showActiveOnly = false;
    updateFilterButtons();
    loadEmployees();
  });

  if (btnOpenAddEmployee) btnOpenAddEmployee.addEventListener('click', openAddEmployeeModal);
  if (addEmployeeCancel) addEmployeeCancel.addEventListener('click', closeAddEmployeeModal);
  if (addEmployeeConfirm) addEmployeeConfirm.addEventListener('click', confirmAddEmployee);

  if (editEmployeeCancel) editEmployeeCancel.addEventListener('click', closeEditEmployeeModal);
  if (editEmployeeConfirm) editEmployeeConfirm.addEventListener('click', confirmEditEmployee);

  if (salaryModalCancel) salaryModalCancel.addEventListener('click', closeSalaryModal);
  if (salaryModalConfirm) salaryModalConfirm.addEventListener('click', confirmSalaryModal);

  salaryModalEmployee?.addEventListener('change', checkMonthlyWithdrawals);
  salaryModalMonth?.addEventListener('change', checkMonthlyWithdrawals);

  withdrawalModalCancel?.addEventListener('click', closeWithdrawalModal);
  withdrawalModalConfirm?.addEventListener('click', confirmWithdrawalModal);

  btnApplyDetailsFilter?.addEventListener('click', () => loadEmployeeDetailsContent());
  btnShowAllDetails?.addEventListener('click', () => {
    if (detailsMonth) detailsMonth.value = '';
    loadEmployeeDetailsContent();
  });
  employeeDetailsClose?.addEventListener('click', closeEmployeeDetailsModal);
  employeeDetailsPrint?.addEventListener('click', onPrintDetails);
  employeeDetailsExport?.addEventListener('click', onExportDetails);

  btnViewSalariesReport?.addEventListener('click', openSalariesReportModal);
  salariesReportClose?.addEventListener('click', closeSalariesReportModal);

  if (btnLogout) btnLogout.addEventListener('click', showLogoutModal);
  if (logoutCancel) logoutCancel.addEventListener('click', hideLogoutModal);
  if (logoutConfirm) logoutConfirm.addEventListener('click', doLogout);

  init();
})();
