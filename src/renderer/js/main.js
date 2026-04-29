(function () {
  const userBadge = document.getElementById('userBadge');
  const systemName = document.getElementById('systemNameTop');
  const btnLogout = document.getElementById('btnLogout');
  const logoutModal = document.getElementById('logoutModal');
  const logoutCancel = document.getElementById('logoutCancel');
  const logoutConfirm = document.getElementById('logoutConfirm');
  const navItems = document.querySelectorAll('.nav-item');
  const dashboardCards = document.querySelectorAll('.dashboard-card');

  let session = null;

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
    const settings = await window.api.settings.get();
    if (settings.ok && systemName) {
      systemName.textContent = settings.settings.restaurantName || systemName.textContent;
    }
    if (userBadge) {
      userBadge.textContent = `👤 ${session.user.username}`;
    }
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

  navItems.forEach((item) => {
    item.addEventListener('click', () => navigateTo(item.dataset.target));
  });

  dashboardCards.forEach((card) => {
    card.addEventListener('click', () => navigateTo(card.dataset.target));
  });

  if (btnLogout) btnLogout.addEventListener('click', () => showLogoutModal());
  if (logoutCancel) logoutCancel.addEventListener('click', hideLogoutModal);
  if (logoutConfirm) logoutConfirm.addEventListener('click', () => doLogout());

  if (logoutModal) {
    logoutModal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideLogoutModal();
    });
  }

  init();
})();
