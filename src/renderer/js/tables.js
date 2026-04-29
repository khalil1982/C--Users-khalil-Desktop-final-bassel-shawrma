(function () {
  const tablesGrid = document.getElementById('tablesGrid');
  const errorArea = document.getElementById('errorArea');
  const userBadge = document.getElementById('userBadge');
  const btnLogout = document.getElementById('btnLogout');
  const logoutModal = document.getElementById('logoutModal');
  const logoutCancel = document.getElementById('logoutCancel');
  const logoutConfirm = document.getElementById('logoutConfirm');

  let session = null;
  let tables = [];

  function showError(msg) {
    errorArea.innerHTML = msg ? `<p class="error-msg">${msg}</p>` : '';
  }

  function hideError() {
    errorArea.innerHTML = '';
  }

  function renderTables() {
    if (!tables || tables.length === 0) {
      tablesGrid.innerHTML = '<p style="text-align: center; color: var(--text-muted); grid-column: 1 / -1;">لا توجد طاولات</p>';
      return;
    }

    tablesGrid.innerHTML = tables
      .map(
        (table) => `
      <div class="table-card ${table.status === 'Available' ? 'available' : 'occupied'}" 
           data-table-id="${table.table_id}" 
           data-status="${table.status}">
        <div class="table-number">${table.table_number}</div>
        <div class="table-status">${table.status === 'Available' ? '✅ متاحة' : '🔴 مشغولة'}</div>
      </div>
    `
      )
      .join('');

    document.querySelectorAll('.table-card').forEach((card) => {
      card.addEventListener('click', handleTableClick);
    });
  }

  async function handleTableClick(e) {
    const card = e.currentTarget;
    const tableId = parseInt(card.dataset.tableId);
    const currentStatus = card.dataset.status;
    const newStatus = currentStatus === 'Available' ? 'Occupied' : 'Available';

    hideError();

    try {
      const result = await window.api.table.updateStatus(tableId, newStatus);
      if (result.ok) {
        await loadTables();
      } else {
        showError(result.error || 'فشل تحديث حالة الطاولة.');
      }
    } catch (err) {
      showError('حدث خطأ. حاول مرة أخرى.');
      console.error(err);
    }
  }

  async function loadTables() {
    try {
      tables = await window.api.table.getAll();
      renderTables();
      hideError();
    } catch (err) {
      showError('فشل تحميل الطاولات.');
      console.error(err);
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
    await loadTables();
  }

  btnLogout.addEventListener('click', () => showLogoutModal());
  logoutCancel.addEventListener('click', hideLogoutModal);
  logoutConfirm.addEventListener('click', () => doLogout());

  logoutModal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideLogoutModal();
  });

  init();
})();
