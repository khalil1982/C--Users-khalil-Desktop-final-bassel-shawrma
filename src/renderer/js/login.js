(function () {
  const form = document.getElementById('loginForm');
  const username = document.getElementById('username');
  const password = document.getElementById('password');
  const btnLogin = document.getElementById('btnLogin');
  const errorArea = document.getElementById('errorArea');
  const passwordToggle = document.getElementById('passwordToggle');
  const passwordToggleIcon = passwordToggle.querySelector('.password-toggle-icon');

  let passwordVisible = false;

  function togglePasswordVisibility() {
    passwordVisible = !passwordVisible;
    password.type = passwordVisible ? 'text' : 'password';
    passwordToggleIcon.textContent = passwordVisible ? '🙈' : '👁️';
    passwordToggle.setAttribute('aria-label', passwordVisible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
  }

  passwordToggle.addEventListener('click', (e) => {
    e.preventDefault();
    togglePasswordVisibility();
  });

  function showError(msg) {
    errorArea.innerHTML = msg ? `<p class="toast toast-error">${msg}</p>` : '';
  }

  function setLoading(loading) {
    btnLogin.disabled = loading;
    btnLogin.textContent = loading ? 'جاري الدخول...' : 'دخول';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');
    const u = username.value.trim();
    const p = password.value;
    if (!u) {
      showError('أدخل اسم المستخدم.');
      username.focus();
      return;
    }
    if (!p) {
      showError('أدخل كلمة المرور.');
      password.focus();
      return;
    }
    setLoading(true);
    try {
      const result = await window.api.auth.login(u, p);
      if (result.ok) {
        await window.api.app.setCurrentSession({
          user: result.user,
          sessionId: result.sessionId,
        });
        await window.api.app.navigate('main');
        return;
      }
      showError(result.error || 'فشل تسجيل الدخول.');
    } catch (err) {
      showError('حدث خطأ. حاول مرة أخرى.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  });
})();
