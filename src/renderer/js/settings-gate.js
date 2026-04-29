/**
 * Settings gate: require manager secret (Admin123Admin) before opening Settings tab.
 * This password is dedicated to the Settings gate only; it is NOT the login password.
 */
(function () {
  function getEl(id) {
    return document.getElementById(id);
  }

  function show() {
    const modal = getEl('settingsGateModal');
    const input = getEl('settingsGatePassword');
    const err = getEl('settingsGateError');
    if (!modal || !input) return;
    if (err) err.textContent = '';
    input.value = '';
    modal.classList.remove('hidden');
    setTimeout(() => input.focus(), 50);
  }

  function hide() {
    const modal = getEl('settingsGateModal');
    const input = getEl('settingsGatePassword');
    const err = getEl('settingsGateError');
    if (modal) modal.classList.add('hidden');
    if (input) input.value = '';
    if (err) err.textContent = '';
  }

  async function onConfirm() {
    const input = getEl('settingsGatePassword');
    const err = getEl('settingsGateError');
    const btn = getEl('settingsGateConfirm');
    if (!input || !err) return;
    const password = (input.value || '').trim();
    if (!password) {
      err.textContent = 'أدخل كلمة السر.';
      return;
    }
    if (btn) btn.disabled = true;
    err.textContent = '';
    const result = await window.api.auth.verifyManagerSecret(password);
    if (btn) btn.disabled = false;
    if (!result.ok) {
      err.textContent = 'كلمة المرور غير صحيحة.';
      return;
    }
    hide();
    await window.api.app.navigate('settings');
  }

  function onCancel() {
    hide();
    window.api.app.navigate('main');
  }

  function bind() {
    const modal = getEl('settingsGateModal');
    const input = getEl('settingsGatePassword');
    const confirmBtn = getEl('settingsGateConfirm');
    const cancelBtn = getEl('settingsGateCancel');
    if (!modal) return;

    if (confirmBtn) {
      confirmBtn.addEventListener('click', onConfirm);
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', onCancel);
    }
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onConfirm();
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }

  window.SettingsGate = { show };
})();
