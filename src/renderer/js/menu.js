(function () {
  const userBadge = document.getElementById('userBadge');
  const btnLogout = document.getElementById('btnLogout');
  const logoutModal = document.getElementById('logoutModal');
  const logoutCancel = document.getElementById('logoutCancel');
  const logoutConfirm = document.getElementById('logoutConfirm');
  const menuGrid = document.getElementById('menuGrid');
  const errorArea = document.getElementById('errorArea');
  const menuSearch = document.getElementById('menuSearch');
  const btnAddItem = document.getElementById('btnAddItem');
  const menuModal = document.getElementById('menuModal');
  const menuModalTitle = document.getElementById('menuModalTitle');
  const menuName = document.getElementById('menuName');
  const menuNameEn = document.getElementById('menuNameEn');
  const menuCategory = document.getElementById('menuCategory');
  const menuPrice = document.getElementById('menuPrice');
  const menuIcon = document.getElementById('menuIcon');
  const menuIconPreview = document.getElementById('menuIconPreview');
  const menuIconGrid = document.getElementById('menuIconGrid');
  const menuSort = document.getElementById('menuSort');
  const menuModalError = document.getElementById('menuModalError');
  const menuModalCancel = document.getElementById('menuModalCancel');
  const menuModalConfirm = document.getElementById('menuModalConfirm');
  const priceModal = document.getElementById('priceModal');
  const priceValue = document.getElementById('priceValue');
  const priceReason = document.getElementById('priceReason');
  const priceModalError = document.getElementById('priceModalError');
  const priceModalCancel = document.getElementById('priceModalCancel');
  const priceModalConfirm = document.getElementById('priceModalConfirm');
  const navItems = document.querySelectorAll('.nav-item');
  const filterButtons = document.querySelectorAll('.filter-btn');

  let session = null;
  let menuItems = [];
  let activeCategory = 'all';
  let editingItemId = null;
  let priceItemId = null;

  /** رموز لوحة اختيار الأيقونة: بدون، شاورما/لحوم، مشروبات، إضافات */
  const MENU_ICON_OPTIONS = [
    '', '🥙', '🌯', '🍔', '🍕', '🥪', '🍗', '🧆', '🫓', '🌮', '🥓', '🥩',
    '🥤', '☕', '🧃', '🧋', '🍺', '🥛', '🍵', '🫖', '🍶', '🍷', '🥃', '🍹',
    '🥗', '🍟', '🥒', '🧅', '🍅', '🥕', '🫒', '🥑', '🍋', '🍊', '🍎', '🧀', '🍳', '🥐'
  ];

  function renderIconPicker() {
    menuIconGrid.innerHTML = MENU_ICON_OPTIONS.map((emoji) => {
      const label = emoji === '' ? '—' : emoji;
      const title = emoji === '' ? 'بدون (استخدام افتراضي الفئة)' : emoji;
      return `<button type="button" class="icon-picker-btn" data-emoji="${escapeHtml(emoji)}" title="${escapeHtml(title)}" role="option">${label}</button>`;
    }).join('');
    menuIconGrid.querySelectorAll('.icon-picker-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const emoji = btn.dataset.emoji || '';
        menuIcon.value = emoji;
        menuIconPreview.textContent = emoji || '—';
        menuIconPreview.classList.toggle('has-icon', !!emoji);
        menuIconGrid.querySelectorAll('.icon-picker-btn').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function setPickerSelection(emoji) {
    menuIcon.value = emoji || '';
    menuIconPreview.textContent = emoji || '—';
    menuIconPreview.classList.toggle('has-icon', !!emoji);
    menuIconGrid.querySelectorAll('.icon-picker-btn').forEach((b) => {
      b.classList.toggle('selected', (b.dataset.emoji || '') === (emoji || ''));
    });
  }

  function showError(msg) {
    errorArea.innerHTML = msg ? `<p class="toast toast-error">${msg}</p>` : '';
  }

  function clearError() {
    errorArea.innerHTML = '';
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

  async function loadMenuItems() {
    clearError();
    const result = await window.api.menu.getAll(activeCategory === 'all' ? null : activeCategory, false);
    if (!result.ok) {
      showError(result.error || 'فشل تحميل الأصناف.');
      return;
    }
    menuItems = result.items || [];
    renderMenuItems();
  }

  function formatPrice(price) {
    if (price == null) return '—';
    const numeric = Number(price || 0);
    if (!Number.isFinite(numeric)) return '—';
    const fixed = numeric.toFixed(1);
    return `${fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed} ₪`;
  }

  function renderMenuItems() {
    const searchValue = menuSearch.value.trim().toLowerCase();
    const filtered = menuItems.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch = !searchValue || item.name.toLowerCase().includes(searchValue);
      return matchesCategory && matchesSearch;
    });

    if (!filtered.length) {
      menuGrid.innerHTML = '<p class="placeholder-msg">لا توجد أصناف مطابقة.</p>';
      return;
    }

    menuGrid.innerHTML = filtered
      .map((item) => {
        const isInactive = item.status === 'inactive' || item.current_price == null;
        return `
          <div class="menu-card ${isInactive ? 'disabled' : ''}">
            <button type="button" class="menu-card-close" data-action="delete" data-id="${item.menu_item_id}" title="حذف الصنف" aria-label="حذف الصنف">×</button>
            <div class="menu-icon">${item.icon_path || '🍽️'}</div>
            <div class="menu-name">${item.name}</div>
            <div class="menu-price">${formatPrice(item.current_price)}</div>
            ${isInactive ? '<span class="inactive-label">غير متوفر</span>' : ''}
            <div class="menu-actions">
              <button type="button" data-action="price" data-id="${item.menu_item_id}">السعر</button>
              <button type="button" data-action="toggle" data-id="${item.menu_item_id}">
                ${item.status === 'active' ? 'تعطيل' : 'تفعيل'}
              </button>
            </div>
          </div>
        `;
      })
      .join('');

    menuGrid.querySelectorAll('button[data-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleAction(btn.dataset.action, btn.dataset.id);
      });
    });
  }

  async function handleAction(action, itemId) {
    if (!session || session.user.role !== 'manager') {
      showError('غير مصرح. هذه العملية للمدير فقط.');
      return;
    }
    if (action === 'price') {
      priceItemId = itemId;
      priceValue.value = '';
      priceReason.value = '';
      priceModalError.textContent = '';
      priceModal.classList.remove('hidden');
      priceValue.focus();
      return;
    }
    if (action === 'toggle') {
      const result = await window.api.menu.toggleStatus(itemId);
      if (!result.ok) {
        showError(result.error || 'فشل تغيير الحالة.');
      } else {
        await loadMenuItems();
      }
      return;
    }
    if (action === 'delete') {
      const result = await window.api.menu.delete(itemId);
      if (!result.ok) {
        showError(result.error || 'فشل حذف الصنف.');
      } else {
        clearError();
        await loadMenuItems();
      }
    }
  }

  function openMenuModal() {
    if (session?.user?.role !== 'manager') {
      showError('غير مصرح. هذه العملية للمدير فقط.');
      return;
    }
    editingItemId = null;
    menuModalTitle.textContent = 'إضافة صنف جديد';
    menuName.value = '';
    menuNameEn.value = '';
    menuCategory.value = 'shawarma';
    menuPrice.value = '';
    setPickerSelection('');
    menuSort.value = '';
    menuModalError.textContent = '';
    menuModal.classList.remove('hidden');
    menuName.focus();
  }

  async function saveMenuItem() {
    menuModalError.textContent = '';
    const payload = {
      name: menuName.value.trim(),
      name_en: menuNameEn.value.trim() || null,
      category: menuCategory.value,
      price: menuPrice.value === '' ? null : parseFloat(menuPrice.value),
      icon_path: menuIcon.value.trim() || null,
      sort_order: menuSort.value ? parseInt(menuSort.value, 10) : 0
    };

    const result = editingItemId
      ? await window.api.menu.update(editingItemId, payload)
      : await window.api.menu.create(payload);

    if (!result.ok) {
      menuModalError.textContent = result.error || 'فشل حفظ الصنف.';
      return;
    }
    menuModal.classList.add('hidden');
    await loadMenuItems();
  }

  async function updatePrice() {
    priceModalError.textContent = '';
    const value = priceValue.value === '' ? null : parseFloat(priceValue.value);
    const reason = priceReason.value.trim();
    const result = await window.api.menu.updatePrice(priceItemId, value, reason);
    if (!result.ok) {
      priceModalError.textContent = result.error || 'فشل تحديث السعر.';
      return;
    }
    priceModal.classList.add('hidden');
    await loadMenuItems();
  }

  async function init() {
    renderIconPicker();
    session = await window.api.auth.getCurrentSession();
    if (!session || !session.user || !session.sessionId) {
      await window.api.app.navigate('login');
      return;
    }
    userBadge.textContent = `👤 ${session.user.username}`;
    if (session.user.role !== 'manager') {
      btnAddItem.disabled = true;
    }
    await loadMenuItems();
  }

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.category;
      renderMenuItems();
    });
  });

  navItems.forEach((item) => {
    item.addEventListener('click', () => navigateTo(item.dataset.target));
  });

  menuSearch.addEventListener('input', renderMenuItems);
  btnAddItem.addEventListener('click', openMenuModal);
  menuModalCancel.addEventListener('click', () => menuModal.classList.add('hidden'));
  menuModalConfirm.addEventListener('click', saveMenuItem);
  priceModalCancel.addEventListener('click', () => priceModal.classList.add('hidden'));
  priceModalConfirm.addEventListener('click', updatePrice);
  btnLogout.addEventListener('click', showLogoutModal);
  logoutCancel.addEventListener('click', hideLogoutModal);
  logoutConfirm.addEventListener('click', doLogout);

  init();
})();
