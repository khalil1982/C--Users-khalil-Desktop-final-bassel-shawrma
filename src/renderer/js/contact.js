(function () {
  const userBadge = document.getElementById('userBadge');
  const btnLogout = document.getElementById('btnLogout');
  const logoutModal = document.getElementById('logoutModal');
  const logoutCancel = document.getElementById('logoutCancel');
  const logoutConfirm = document.getElementById('logoutConfirm');
  const navItems = document.querySelectorAll('.nav-item');

  let session = null;

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
    userBadge.textContent = `👤 ${session.user.username}`;

    navItems.forEach((item) => {
      item.addEventListener('click', () => navigateTo(item.dataset.target));
    });
    if (btnLogout) btnLogout.addEventListener('click', showLogoutModal);
    if (logoutCancel) logoutCancel.addEventListener('click', hideLogoutModal);
    if (logoutConfirm) logoutConfirm.addEventListener('click', doLogout);
    if (logoutModal) logoutModal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideLogoutModal();
    });
  }

  init();
})();
