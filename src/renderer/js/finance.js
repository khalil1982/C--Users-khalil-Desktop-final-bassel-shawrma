(function () {
  const userBadge = document.getElementById('userBadge');
  const btnLogout = document.getElementById('btnLogout');
  const logoutModal = document.getElementById('logoutModal');
  const logoutCancel = document.getElementById('logoutCancel');
  const logoutConfirm = document.getElementById('logoutConfirm');
  const errorArea = document.getElementById('errorArea');
  const navItems = document.querySelectorAll('.nav-item');

  // Purchase Categories
  const btnOpenAddCategoryModal = document.getElementById('btnOpenAddCategoryModal');
  const addCategoryModal = document.getElementById('addCategoryModal');
  const addCategoryModalTitle = document.getElementById('addCategoryModalTitle');
  const addCategoryCancel = document.getElementById('addCategoryCancel');
  const addCategoryConfirm = document.getElementById('addCategoryConfirm');
  const modalCategoryName = document.getElementById('modalCategoryName');
  const addCategoryError = document.getElementById('addCategoryError');
  const categoriesList = document.getElementById('categoriesList');
  const deleteCategoryModal = document.getElementById('deleteCategoryModal');
  const deleteCategoryMessage = document.getElementById('deleteCategoryMessage');
  const deleteCategoryCancel = document.getElementById('deleteCategoryCancel');
  const deleteCategoryConfirm = document.getElementById('deleteCategoryConfirm');

  // Purchase Registration
  const purchaseItemsGrid = document.getElementById('purchaseItemsGrid');
  const purchaseTotalAmount = document.getElementById('purchaseTotalAmount');
  const purchaseTotalError = document.getElementById('purchaseTotalError');
  const btnPurchaseDetails = document.getElementById('btnPurchaseDetails');
  const btnSavePurchase = document.getElementById('btnSavePurchase');
  const btnPurchasesModal = document.getElementById('btnPurchasesModal');

  // Purchase Details Modal
  const purchaseDetailsModal = document.getElementById('purchaseDetailsModal');
  const purchaseDetailsContent = document.getElementById('purchaseDetailsContent');
  const purchaseDetailsClose = document.getElementById('purchaseDetailsClose');
  const purchaseDetailsError = document.getElementById('purchaseDetailsError');
  const btnCalculatePurchaseTotal = document.getElementById('btnCalculatePurchaseTotal');

  // Edit Purchase Item Modal
  const editPurchaseItemModal = document.getElementById('editPurchaseItemModal');
  const editItemCategory = document.getElementById('editItemCategory');
  const editItemPrice = document.getElementById('editItemPrice');
  const editPurchaseItemError = document.getElementById('editPurchaseItemError');
  const editPurchaseItemCancel = document.getElementById('editPurchaseItemCancel');
  const editPurchaseItemConfirm = document.getElementById('editPurchaseItemConfirm');

  // Purchases by Date Modal
  const purchasesModal = document.getElementById('purchasesModal');
  const purchasesFilterDate = document.getElementById('purchasesFilterDate');
  const purchasesModalContent = document.getElementById('purchasesModalContent');
  const purchasesModalClose = document.getElementById('purchasesModalClose');

  // Partners & Withdrawals
  const partnerName = document.getElementById('partnerName');
  const btnAddPartner = document.getElementById('btnAddPartner');
  const partnerSelect = document.getElementById('partnerSelect');
  const withdrawalAmount = document.getElementById('withdrawalAmount');
  const withdrawalDate = document.getElementById('withdrawalDate');
  const withdrawalNotes = document.getElementById('withdrawalNotes');
  const btnConfirmWithdrawal = document.getElementById('btnConfirmWithdrawal');
  const btnViewWithdrawalsReport = document.getElementById('btnViewWithdrawalsReport');
  const withdrawalsReportModal = document.getElementById('withdrawalsReportModal');
  const withdrawalsReportClose = document.getElementById('withdrawalsReportClose');
  const withdrawalsReportContent = document.getElementById('withdrawalsReportContent');

  let session = null;
  let purchaseItemsList = []; // { categoryId, categoryName, price }
  let editPurchaseItemIndex = -1;
  let editingCategoryId = null;
  let deletingCategoryId = null;

  function showError(msg) {
    errorArea.innerHTML = msg ? `<p class="toast toast-error">${msg}</p>` : '';
  }

  function clearError() {
    errorArea.innerHTML = '';
  }

  function formatCurrency(value) {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric)) return '₪0';
    const fixed = numeric.toFixed(1);
    return `₪${fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed}`;
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

  let categories = [];

  // ============================================
  // Purchase Categories
  // ============================================
  async function loadCategories() {
    const result = await window.api.expense.getCategories();
    if (!result.ok) {
      showError(result.error || 'فشل تحميل الفئات.');
      return;
    }
    categories = result.categories || [];

    if (categories.length === 0) {
      categoriesList.innerHTML = '<p class="placeholder-msg">لا توجد فئات. اضغط "إضافة فئة" لإنشاء واحدة.</p>';
    } else {
      categoriesList.innerHTML = categories
        .map((cat) => `
          <div class="category-card" data-category-id="${cat.category_id}">
            <div class="category-card-name">${cat.name}</div>
            <div class="category-card-actions">
              <button type="button" class="btn-edit-category" data-category-id="${cat.category_id}" aria-label="تعديل">تعديل</button>
              <button type="button" class="btn-delete-category" data-category-id="${cat.category_id}" aria-label="حذف">حذف</button>
            </div>
          </div>
        `)
        .join('');
      categoriesList.querySelectorAll('.category-card').forEach((card) => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.category-card-actions')) return;
          const categoryId = card.dataset.categoryId;
          const cat = categories.find((c) => c.category_id === categoryId);
          purchaseItemsList.push({ categoryId, categoryName: cat?.name || '', price: 0 });
          renderPurchaseItemsGrid();
          updatePurchaseTotalFromItems();
        });
      });
      categoriesList.querySelectorAll('.btn-edit-category').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const cat = categories.find((c) => c.category_id === btn.dataset.categoryId);
          if (cat) openEditCategoryModal(cat);
        });
      });
      categoriesList.querySelectorAll('.btn-delete-category').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const cat = categories.find((c) => c.category_id === btn.dataset.categoryId);
          if (cat) openDeleteCategoryModal(cat);
        });
      });
    }
  }

  function openAddCategoryModal() {
    editingCategoryId = null;
    addCategoryError.textContent = '';
    modalCategoryName.value = '';
    if (addCategoryModalTitle) addCategoryModalTitle.textContent = 'إضافة فئة مشتريات';
    addCategoryModal.classList.remove('hidden');
    modalCategoryName.focus();
  }

  function openEditCategoryModal(cat) {
    editingCategoryId = cat.category_id;
    addCategoryError.textContent = '';
    modalCategoryName.value = cat.name || '';
    if (addCategoryModalTitle) addCategoryModalTitle.textContent = 'تعديل فئة مشتريات';
    addCategoryModal.classList.remove('hidden');
    modalCategoryName.focus();
  }

  function closeAddCategoryModal() {
    addCategoryModal.classList.add('hidden');
    editingCategoryId = null;
  }

  async function confirmAddCategory() {
    addCategoryError.textContent = '';
    const name = modalCategoryName.value.trim();
    if (!name) {
      addCategoryError.textContent = 'اسم الفئة مطلوب.';
      return;
    }
    if (editingCategoryId) {
      const result = await window.api.expense.updateCategory(editingCategoryId, name, null);
      if (!result.ok) {
        addCategoryError.textContent = result.error || 'فشل تعديل الفئة.';
        return;
      }
    } else {
      const result = await window.api.expense.createCategory(name, null);
      if (!result.ok) {
        addCategoryError.textContent = result.error || 'فشل إضافة الفئة.';
        return;
      }
    }
    closeAddCategoryModal();
    await loadCategories();
    if (editingCategoryId) {
      purchaseItemsList = purchaseItemsList.map((it) => {
        if (it.categoryId === editingCategoryId) {
          const c = categories.find((cat) => cat.category_id === editingCategoryId);
          return { ...it, categoryName: c?.name || it.categoryName };
        }
        return it;
      });
      renderPurchaseItemsGrid();
    }
  }

  function openDeleteCategoryModal(cat) {
    deletingCategoryId = cat.category_id;
    if (deleteCategoryMessage) deleteCategoryMessage.textContent = `هل أنت متأكد من حذف الفئة «${cat.name}»؟`;
    if (deleteCategoryConfirm) deleteCategoryConfirm.disabled = false;
    deleteCategoryModal.classList.remove('hidden');
    if (deleteCategoryConfirm) deleteCategoryConfirm.focus();
  }

  function closeDeleteCategoryModal() {
    deleteCategoryModal.classList.add('hidden');
    deletingCategoryId = null;
    if (deleteCategoryConfirm) deleteCategoryConfirm.disabled = false;
  }

  async function confirmDeleteCategory() {
    if (!deletingCategoryId) {
      closeDeleteCategoryModal();
      return;
    }
    if (deleteCategoryConfirm) deleteCategoryConfirm.disabled = true;
    try {
      const result = await window.api.expense.deleteCategory(deletingCategoryId);
      if (!result || !result.ok) {
        showError(result?.error || 'فشل حذف الفئة.');
        return;
      }
      purchaseItemsList = purchaseItemsList.filter((it) => it.categoryId !== deletingCategoryId);
      renderPurchaseItemsGrid();
      closeDeleteCategoryModal();
      await loadCategories();
      clearError();
      if (errorArea) errorArea.innerHTML = '<p class="toast toast-success">تم حذف الفئة.</p>';
      setTimeout(() => clearError(), 3000);
    } catch (e) {
      showError(e?.message || 'حدث خطأ أثناء حذف الفئة.');
    } finally {
      if (deleteCategoryConfirm) deleteCategoryConfirm.disabled = false;
    }
  }

  function renderPurchaseItemsGrid() {
    if (!purchaseItemsGrid) return;
    if (purchaseItemsList.length === 0) {
      purchaseItemsGrid.innerHTML = '<p class="placeholder-msg">اضغط على فئة من الأعلى لإضافة صنف.</p>';
      return;
    }
    purchaseItemsGrid.innerHTML = purchaseItemsList
      .map((item, index) => `
        <div class="purchase-category-card" data-index="${index}">
          <div class="purchase-category-name">${item.categoryName}</div>
          <div class="purchase-card-actions">
            <button type="button" class="btn-edit-card" data-index="${index}" aria-label="تعديل">تعديل</button>
            <button type="button" class="btn-remove-card" data-index="${index}" aria-label="حذف">✕</button>
          </div>
        </div>
      `)
      .join('');

    purchaseItemsGrid.querySelectorAll('.btn-remove-card').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index, 10);
        purchaseItemsList.splice(index, 1);
        renderPurchaseItemsGrid();
        updatePurchaseTotalFromItems();
      });
    });
    purchaseItemsGrid.querySelectorAll('.btn-edit-card').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditPurchaseItemModal(parseInt(btn.dataset.index, 10));
      });
    });
  }

  function openEditPurchaseItemModal(index) {
    editPurchaseItemIndex = index;
    editPurchaseItemError.textContent = '';
    const item = purchaseItemsList[index];
    if (!item) return;
    const first = '<option value="">اختر النوع</option>';
    const opts = categories.map((c) => `<option value="${c.category_id}" ${c.category_id === item.categoryId ? 'selected' : ''}>${c.name}</option>`).join('');
    editItemCategory.innerHTML = first + opts;
    editItemPrice.value = item.price != null && item.price !== '' ? item.price : '';
    editPurchaseItemModal.classList.remove('hidden');
    editItemPrice.focus();
  }

  function closeEditPurchaseItemModal() {
    editPurchaseItemModal.classList.add('hidden');
    editPurchaseItemIndex = -1;
  }

  function confirmEditPurchaseItem() {
    editPurchaseItemError.textContent = '';
    const categoryId = editItemCategory?.value?.trim() || '';
    const price = parseFloat(editItemPrice?.value) || 0;
    if (!categoryId) {
      editPurchaseItemError.textContent = 'يرجى اختيار النوع (الفئة).';
      return;
    }
    if (editPurchaseItemIndex < 0 || editPurchaseItemIndex >= purchaseItemsList.length) {
      closeEditPurchaseItemModal();
      return;
    }
    const cat = categories.find((c) => c.category_id === categoryId);
    purchaseItemsList[editPurchaseItemIndex] = {
      categoryId,
      categoryName: cat?.name || '',
      price
    };
    closeEditPurchaseItemModal();
    renderPurchaseItemsGrid();
    updatePurchaseTotalFromItems();
  }

  function updatePurchaseTotalFromItems() {
    const sum = purchaseItemsList.reduce((s, item) => s + (item.price ?? 0), 0);
    if (purchaseTotalAmount) {
      purchaseTotalAmount.value = formatCurrency(sum);
    }
    if (purchaseTotalError) purchaseTotalError.textContent = '';
  }

  function calculatePurchaseTotal() {
    const inputs = purchaseDetailsContent.querySelectorAll('.purchase-detail-price');
    inputs.forEach((input) => {
      const index = parseInt(input.dataset.index, 10);
      const v = input.value.trim();
      const price = v === '' ? 0 : parseFloat(input.value) || 0;
      if (purchaseItemsList[index]) {
        purchaseItemsList[index].price = price;
      }
    });
    updatePurchaseTotalFromItems();
    if (purchaseDetailsError) {
      purchaseDetailsError.innerHTML = '<p class="toast toast-success" style="margin:0; padding:0.2rem 0.5rem; font-size:0.9rem;">✓ تم الحساب</p>';
      setTimeout(() => { purchaseDetailsError.innerHTML = ''; }, 2000);
    }
  }

  function openPurchaseDetailsModal() {
    if (purchaseItemsList.length === 0) {
      showError('يرجى إضافة أصناف أولاً (اضغط على فئة).');
      return;
    }
    renderPurchaseDetailsModal();
    purchaseDetailsModal.classList.remove('hidden');
  }

  function closePurchaseDetailsModal() {
    purchaseDetailsModal.classList.add('hidden');
    if (purchaseDetailsError) purchaseDetailsError.textContent = '';
  }

  function renderPurchaseDetailsModal() {
    if (!purchaseDetailsContent) return;

    purchaseDetailsContent.innerHTML = purchaseItemsList
      .map((item, index) => {
        const priceVal = (item.price != null && item.price !== '' && Number(item.price) > 0) ? item.price : '';
        return `
          <div class="purchase-detail-item">
            <div class="purchase-detail-header">
              <span class="purchase-detail-name">${item.categoryName}</span>
            </div>
            <div class="purchase-detail-body">
              <div class="form-row">
                <label>سعر الصنف (₪)</label>
                <input type="number" class="purchase-detail-price" data-index="${index}" value="${priceVal}" min="0" step="0.1" inputmode="decimal" autocomplete="off" />
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    purchaseDetailsContent.querySelectorAll('.purchase-detail-price').forEach((input) => {
      input.addEventListener('change', () => {
        const v = input.value.trim();
        if (v !== '' && (parseFloat(v) || 0) < 0) {
          input.value = '0';
        }
      });
    });
  }

  async function savePurchase() {
    if (purchaseItemsList.length === 0) {
      showError('يرجى إضافة أصناف أولاً (اضغط على فئة).');
      return;
    }
    const itemsTotal = purchaseItemsList.reduce((sum, item) => sum + (item.price ?? 0), 0);
    if (itemsTotal <= 0) {
      showError('يرجى إدخال أسعار الأصناف في تفاصيل الأصناف.');
      return;
    }
    clearError();
    let successCount = 0;
    let errorCount = 0;
    for (const item of purchaseItemsList) {
      const price = item.price ?? 0;
      if (price <= 0) continue;
      const description = `${item.categoryName} — ${formatCurrency(price)}`;
      const result = await window.api.expense.create(item.categoryId, price, description, null);
      if (result.ok) successCount++;
      else {
        errorCount++;
        showError(`فشل حفظ: ${item.categoryName} — ${result.error}`);
      }
    }
    if (successCount > 0) {
      purchaseItemsList = [];
      renderPurchaseItemsGrid();
      updatePurchaseTotalFromItems();
      if (errorCount === 0) {
        showError('');
        errorArea.innerHTML = `<p class="toast toast-success">تم حفظ ${successCount} مشتريات بنجاح.</p>`;
        setTimeout(() => clearError(), 3000);
      }
    }
  }

  // ============================================
  // Partners & Withdrawals
  // ============================================
  async function loadPartners() {
    const result = await window.api.partner.getAll();
    if (!result.ok) {
      showError(result.error || 'فشل تحميل الشركاء.');
      return;
    }
    partnerSelect.innerHTML = result.partners
      .map((partner) => `<option value="${partner.partner_id}">${partner.name}</option>`)
      .join('');
  }

  async function addPartner() {
    clearError();
    const name = partnerName.value.trim();
    if (!name) {
      showError('اسم الشريك مطلوب.');
      return;
    }
    const result = await window.api.partner.create(name);
    if (!result.ok) {
      showError(result.error || 'فشل إضافة الشريك.');
      return;
    }
    partnerName.value = '';
    await loadPartners();
  }

  async function confirmWithdrawal() {
    clearError();
    const partnerId = partnerSelect.value;
    const amount = parseFloat(withdrawalAmount.value);
    const date = withdrawalDate.value;
    const notes = withdrawalNotes.value.trim();

    if (!partnerId) {
      showError('يرجى اختيار الشريك.');
      return;
    }
    if (!amount || amount <= 0) {
      showError('القيمة يجب أن تكون أكبر من صفر.');
      return;
    }
    if (!date) {
      showError('التاريخ مطلوب.');
      return;
    }

    // Simplified withdrawal - directly approve (date required)
    const result = await window.api.withdrawal.request(partnerId, amount, notes, date);
    if (!result.ok) {
      showError(result.error || 'فشل تسجيل السحب.');
      return;
    }

    // Auto-approve
    const approveResult = await window.api.withdrawal.updateStatus(result.withdrawalId, 'approved');
    if (!approveResult.ok) {
      showError('تم تسجيل السحب ولكن فشل الموافقة التلقائية.');
      return;
    }

    withdrawalAmount.value = '';
    withdrawalDate.value = new Date().toISOString().split('T')[0];
    withdrawalNotes.value = '';
    showError('');
    errorArea.innerHTML = `<p class="toast toast-success">تم تسجيل السحب بنجاح.</p>`;
    setTimeout(() => clearError(), 3000);
  }

  async function loadWithdrawalsReport() {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];

    const result = await window.api.withdrawal.getReport(startDate, today);
    if (!result.ok) {
      withdrawalsReportContent.innerHTML = `<p class="toast toast-error">${result.error || 'فشل تحميل التقرير.'}</p>`;
      return;
    }

    const withdrawals = result.withdrawals || [];
    if (withdrawals.length === 0) {
      withdrawalsReportContent.innerHTML = '<p class="placeholder-msg">لا توجد سحوبات في الفترة المحددة.</p>';
      return;
    }

    const total = withdrawals.reduce((sum, w) => sum + Number(w.amount || 0), 0);
    withdrawalsReportContent.innerHTML = `
      <div class="report-summary">
        <div class="summary-card">
          <div class="summary-label">إجمالي السحوبات</div>
          <div class="summary-value">${formatCurrency(total)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">عدد السحوبات</div>
          <div class="summary-value">${withdrawals.length}</div>
        </div>
      </div>
      <table class="transactions-table">
        <thead>
          <tr>
            <th>الشريك</th>
            <th>المبلغ</th>
            <th>تاريخ السحب</th>
            <th>الملاحظات</th>
            <th>تاريخ الطلب</th>
          </tr>
        </thead>
        <tbody>
          ${withdrawals
            .map(
              (w) => `
            <tr>
              <td>${w.partner_name}</td>
              <td>${formatCurrency(w.amount)}</td>
              <td>${w.business_date}</td>
              <td>${w.notes || '—'}</td>
              <td>${w.requested_at ? new Date(w.requested_at).toLocaleDateString('ar') : '—'}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  function openWithdrawalsReportModal() {
    loadWithdrawalsReport();
    withdrawalsReportModal.classList.remove('hidden');
  }

  function closeWithdrawalsReportModal() {
    withdrawalsReportModal.classList.add('hidden');
  }

  async function loadPurchasesByDate() {
    if (!purchasesModalContent || !purchasesFilterDate) return;
    const date = purchasesFilterDate.value || new Date().toISOString().split('T')[0];
    const result = await window.api.expense.getByDate(date);
    if (!result.ok) {
      purchasesModalContent.innerHTML = `<p class="toast toast-error">${result.error || 'فشل تحميل المشتريات.'}</p>`;
      return;
    }
    const expenses = result.expenses || [];
    if (expenses.length === 0) {
      purchasesModalContent.innerHTML = '<p class="placeholder-msg">لا توجد مشتريات في هذا التاريخ.</p>';
      return;
    }
    const total = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    purchasesModalContent.innerHTML = `
      <div class="report-summary" style="margin-bottom: var(--spacing-4);">
        <div class="summary-card">
          <div class="summary-label">الإجمالي</div>
          <div class="summary-value">${formatCurrency(total)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">عدد السجلات</div>
          <div class="summary-value">${expenses.length}</div>
        </div>
      </div>
      <table class="transactions-table">
        <thead>
          <tr>
            <th>الفئة</th>
            <th>الوصف</th>
            <th>المبلغ</th>
            <th>تاريخ العمل</th>
          </tr>
        </thead>
        <tbody>
          ${expenses.map((e) => `
            <tr>
              <td>${e.category_name || '—'}</td>
              <td>${e.description || '—'}</td>
              <td>${formatCurrency(e.amount)}</td>
              <td>${e.business_date || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  async function openPurchasesModal() {
    if (!purchasesFilterDate.value) {
      const res = await window.api.businessDate.getCurrent();
      const today = (res?.ok && res.businessDate) ? res.businessDate : new Date().toISOString().split('T')[0];
      purchasesFilterDate.value = today;
    }
    await loadPurchasesByDate();
    purchasesModal.classList.remove('hidden');
  }

  function closePurchasesModal() {
    purchasesModal.classList.add('hidden');
  }

  // ============================================
  // Logout
  // ============================================
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

  // ============================================
  // Initialize
  // ============================================
  async function init() {
    session = await window.api.auth.getCurrentSession();
    if (!session || !session.user || !session.sessionId) {
      await window.api.app.navigate('login');
      return;
    }
    userBadge.textContent = session.user.username;

    const res = await window.api.businessDate.getCurrent();
    const today = (res?.ok && res.businessDate) ? res.businessDate : new Date().toISOString().split('T')[0];
    if (purchasesFilterDate) purchasesFilterDate.value = today;
    if (withdrawalDate) withdrawalDate.value = today;

    await loadCategories();
    await loadPartners();
    renderPurchaseItemsGrid();

    const financeInputs = [
      withdrawalAmount,
      withdrawalDate,
      withdrawalNotes,
      partnerName,
      modalCategoryName,
      editItemPrice,
      purchasesFilterDate
    ];
    financeInputs.forEach((el) => {
      if (el) {
        el.removeAttribute('readonly');
        el.disabled = false;
      }
    });

    updatePurchaseTotalFromItems();
    if (purchasesFilterDate) purchasesFilterDate.addEventListener('change', loadPurchasesByDate);
  }

  // Event Listeners
  navItems.forEach((item) => {
    item.addEventListener('click', () => navigateTo(item.dataset.target));
  });

  if (btnOpenAddCategoryModal) btnOpenAddCategoryModal.addEventListener('click', openAddCategoryModal);
  if (addCategoryCancel) addCategoryCancel.addEventListener('click', closeAddCategoryModal);
  if (addCategoryConfirm) addCategoryConfirm.addEventListener('click', confirmAddCategory);
  if (deleteCategoryCancel) deleteCategoryCancel.addEventListener('click', closeDeleteCategoryModal);
  if (deleteCategoryConfirm) deleteCategoryConfirm.addEventListener('click', confirmDeleteCategory);

  if (btnPurchasesModal) btnPurchasesModal.addEventListener('click', openPurchasesModal);
  if (purchasesModalClose) purchasesModalClose.addEventListener('click', closePurchasesModal);
  if (btnPurchaseDetails) btnPurchaseDetails.addEventListener('click', openPurchaseDetailsModal);
  if (purchaseDetailsClose) purchaseDetailsClose.addEventListener('click', closePurchaseDetailsModal);
  if (btnCalculatePurchaseTotal) btnCalculatePurchaseTotal.addEventListener('click', calculatePurchaseTotal);
  if (btnSavePurchase) btnSavePurchase.addEventListener('click', savePurchase);
  if (editPurchaseItemCancel) editPurchaseItemCancel.addEventListener('click', closeEditPurchaseItemModal);
  if (editPurchaseItemConfirm) editPurchaseItemConfirm.addEventListener('click', confirmEditPurchaseItem);

  btnAddPartner.addEventListener('click', addPartner);
  btnConfirmWithdrawal.addEventListener('click', confirmWithdrawal);
  btnViewWithdrawalsReport.addEventListener('click', openWithdrawalsReportModal);
  withdrawalsReportClose.addEventListener('click', closeWithdrawalsReportModal);

  btnLogout.addEventListener('click', showLogoutModal);
  logoutCancel.addEventListener('click', hideLogoutModal);
  logoutConfirm.addEventListener('click', doLogout);

  init();
})();
