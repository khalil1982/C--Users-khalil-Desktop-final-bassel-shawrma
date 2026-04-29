(function () {
  const userBadge = document.getElementById('userBadge');
  const btnLogout = document.getElementById('btnLogout');
  const logoutModal = document.getElementById('logoutModal');
  const logoutCancel = document.getElementById('logoutCancel');
  const logoutConfirm = document.getElementById('logoutConfirm');
  const navItems = document.querySelectorAll('.nav-item');
  const resultArea = document.getElementById('resultArea');
  const systemName = document.getElementById('systemName');

  const restaurantName = document.getElementById('restaurantName');
  const currencySymbol = document.getElementById('currencySymbol');
  const showCurrencySymbol = document.getElementById('showCurrencySymbol');
  const autoStart = document.getElementById('autoStart');
  const btnSaveSettings = document.getElementById('btnSaveSettings');
  const userSelect = document.getElementById('userSelect');
  const adminPassword = document.getElementById('adminPassword');
  const newUserPassword = document.getElementById('newUserPassword');
  const confirmUserPassword = document.getElementById('confirmUserPassword');
  const btnChangePassword = document.getElementById('btnChangePassword');
  const passwordResult = document.getElementById('passwordResult');
  const btnClearData = document.getElementById('btnClearData');
  const clearDataResult = document.getElementById('clearDataResult');
  const clearDataModal = document.getElementById('clearDataModal');
  const clearDataCancel = document.getElementById('clearDataCancel');
  const clearDataConfirm = document.getElementById('clearDataConfirm');
  const btnBackup = document.getElementById('btnBackup');
  const btnRestore = document.getElementById('btnRestore');
  const backupResult = document.getElementById('backupResult');

  let session = null;

  function showToast(msg, isError = false) {
    if (!msg) {
      resultArea.innerHTML = '';
      return;
    }
    const cls = isError ? 'toast toast-error' : 'toast toast-success';
    resultArea.innerHTML = `<p class="${cls}">${msg}</p>`;
  }

  function showPasswordToast(msg, isError = false) {
    if (!msg) {
      passwordResult.innerHTML = '';
      return;
    }
    const cls = isError ? 'toast toast-error' : 'toast toast-success';
    passwordResult.innerHTML = `<p class="${cls}" role="alert">${msg}</p>`;
    passwordResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function showClearDataToast(msg, isError = false) {
    if (!msg) {
      clearDataResult.innerHTML = '';
      return;
    }
    const cls = isError ? 'toast toast-error' : 'toast toast-success';
    clearDataResult.innerHTML = `<p class="${cls}">${msg}</p>`;
  }

  function showBackupToast(msg, isError = false) {
    if (!msg) {
      backupResult.innerHTML = '';
      return;
    }
    const cls = isError ? 'toast toast-error' : 'toast toast-success';
    backupResult.innerHTML = `<p class="${cls}" role="alert">${msg}</p>`;
    backupResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function showClearDataModal() {
    showClearDataToast('');
    clearDataModal.classList.remove('hidden');
    if (clearDataConfirm) clearDataConfirm.focus();
  }

  function hideClearDataModal() {
    clearDataModal.classList.add('hidden');
  }

  async function confirmClearData() {
    hideClearDataModal();
    if (!btnClearData) return;
    btnClearData.disabled = true;
    showClearDataToast('');
    const result = await window.api.app.cleanForFreshUse();
    btnClearData.disabled = false;
    if (!result.ok) {
      showClearDataToast(result.error || 'فشل مسح البيانات.', true);
      return;
    }
    showClearDataToast('تم مسح جميع البيانات. يفضّل إعادة تحميل الصفحة أو الانتقال إلى الأقسام المعنية.');
  }

  async function handleBackup() {
    if (!btnBackup) return;
    btnBackup.disabled = true;
    showBackupToast('جاري إنشاء النسخ الاحتياطي...');

    try {
      const result = await window.api.backup.exportBackup();
      if (result.cancelled) {
        showBackupToast('تم إلغاء العملية.');
        return;
      }
      if (!result.ok) {
        showBackupToast(result.error || 'فشل إنشاء النسخ الاحتياطي.', true);
        return;
      }
      showBackupToast(`تم حفظ النسخ الاحتياطي بنجاح: ${result.path}`);
    } catch (error) {
      console.error('[BACKUP] Error:', error);
      showBackupToast(error?.message || 'فشل حفظ الملف.', true);
    } finally {
      btnBackup.disabled = false;
    }
  }

  async function handleRestore() {
    if (!btnRestore) return;
    const confirmed = confirm('⚠️ تحذير: سيتم استبدال جميع البيانات الحالية بالبيانات من ملف النسخ الاحتياطي.\n\nهل أنت متأكد من المتابعة؟');
    if (!confirmed) return;

    btnRestore.disabled = true;
    showBackupToast('جاري استعادة البيانات...');

    try {
      const result = await window.api.backup.importBackup();
      if (result.cancelled) {
        showBackupToast('تم إلغاء العملية.');
        return;
      }
      if (!result.ok) {
        showBackupToast(result.error || 'فشل استعادة البيانات.', true);
        return;
      }
      showBackupToast('تم استعادة البيانات بنجاح. جاري إعادة تحميل التطبيق...');
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      console.error('[RESTORE] Error:', error);
      showBackupToast(error?.message || 'فشل استعادة البيانات.', true);
    } finally {
      btnRestore.disabled = false;
    }
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
    if (!sid) {
      await window.api.app.clearCurrentSession();
      await window.api.app.navigate('login');
      return;
    }
    try {
      await window.api.auth.logout(sid);
    } catch (e) {
      console.error(e);
    }
    await window.api.app.clearCurrentSession();
    await window.api.app.navigate('login');
  }

  async function loadSettings() {
    const result = await window.api.settings.get();
    if (!result.ok) {
      showToast('فشل تحميل الإعدادات.', true);
      return;
    }
    restaurantName.value = result.settings.restaurantName || '';
    if (currencySymbol) currencySymbol.value = result.settings.currencySymbol || '';
    if (showCurrencySymbol) showCurrencySymbol.checked = !!result.settings.showCurrencySymbol;
    if (autoStart) autoStart.checked = !!result.settings.autoStart;
    systemName.textContent = result.settings.restaurantName || 'الإعدادات';
  }

  async function saveSettings() {
    btnSaveSettings.disabled = true;
    const payload = {
      restaurantName: restaurantName.value.trim(),
      currencySymbol: currencySymbol.value.trim(),
      showCurrencySymbol: showCurrencySymbol.checked,
      autoStart: autoStart.checked,
    };
    const result = await window.api.settings.update(payload);
    btnSaveSettings.disabled = false;
    if (!result.ok) {
      showToast(result.error || 'فشل حفظ الإعدادات.', true);
      return;
    }
    showToast('تم حفظ الإعدادات بنجاح.');
    systemName.textContent = result.settings.restaurantName || 'الإعدادات';
  }

  async function loadUsers() {
    const result = await window.api.auth.getUsers();
    if (!result.ok) {
      showPasswordToast(result.error || 'فشل تحميل المستخدمين.', true);
      return;
    }
    userSelect.innerHTML = result.users
      .map((user) => `<option value="${user.id}">${user.username} (${user.role})</option>`)
      .join('');
  }

  async function changePassword() {
    showPasswordToast('');
    if (!adminPassword || !newUserPassword || !confirmUserPassword) return;
    if (!adminPassword.value.trim()) {
      showPasswordToast('يرجى إدخال كلمة مرور المدير.', true);
      return;
    }
    if (!newUserPassword.value.trim()) {
      showPasswordToast('يرجى إدخال كلمة المرور الجديدة.', true);
      return;
    }
    if (newUserPassword.value !== confirmUserPassword.value) {
      showPasswordToast('تأكيد كلمة المرور غير مطابق.', true);
      return;
    }
    btnChangePassword.disabled = true;
    const result = await window.api.auth.changeUserPassword(
      userSelect.value,
      adminPassword.value,
      newUserPassword.value
    );
    btnChangePassword.disabled = false;
    if (!result.ok) {
      showPasswordToast(result.error || 'فشل تغيير كلمة المرور.', true);
      return;
    }
    adminPassword.value = '';
    newUserPassword.value = '';
    confirmUserPassword.value = '';
    showPasswordToast('✓ تم تغيير كلمة المرور بنجاح.');
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

  async function init() {
    try {
      session = await window.api.auth.getCurrentSession();
    } catch (e) {
      console.error(e);
    }
    if (!session || !session.user || !session.sessionId) {
      await window.api.app.navigate('login');
      return;
    }
    if (session.user.role !== 'manager') {
      await window.api.app.navigate('main');
      return;
    }
    userBadge.textContent = `👤 ${session.user.username}`;

    navItems.forEach((item) => {
      item.addEventListener('click', () => navigateTo(item.dataset.target));
    });
    if (btnLogout) btnLogout.addEventListener('click', () => showLogoutModal());
    if (logoutCancel) logoutCancel.addEventListener('click', hideLogoutModal);
    if (logoutConfirm) logoutConfirm.addEventListener('click', () => doLogout());
    if (logoutModal) logoutModal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideLogoutModal();
    });
    if (btnSaveSettings) btnSaveSettings.addEventListener('click', saveSettings);
    if (btnChangePassword) btnChangePassword.addEventListener('click', changePassword);
    if (btnClearData) btnClearData.addEventListener('click', showClearDataModal);
    if (clearDataCancel) clearDataCancel.addEventListener('click', hideClearDataModal);
    if (clearDataConfirm) clearDataConfirm.addEventListener('click', confirmClearData);
    if (btnBackup) btnBackup.addEventListener('click', handleBackup);
    if (btnRestore) btnRestore.addEventListener('click', handleRestore);
    if (clearDataModal) {
      clearDataModal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideClearDataModal();
      });
    }

    await loadSettings();
    await loadUsers();
  }

  init();
})();
