// Auth page logic
function switchTab(tab) {
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('signup-form').classList.toggle('hidden', tab !== 'signup');
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
  hideAlert();
}

function showAlert(msg, type = 'error') {
  const el = document.getElementById('auth-alert');
  el.className = `alert alert-${type}`;
  el.querySelector('.alert-icon').textContent = type === 'error' ? '⚠' : '✓';
  document.getElementById('alert-msg').textContent = msg;
}

function hideAlert() {
  document.getElementById('auth-alert').className = 'alert hidden';
}

function togglePwd(id, btn) {
  const inp = document.getElementById(id);
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

async function handleLogin(e) {
  e.preventDefault();
  hideAlert();
  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Signing in...';

  try {
    const data = await api.post('/auth/login', {
      email: document.getElementById('login-email').value.trim(),
      password: document.getElementById('login-password').value
    });
    api.setToken(data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.location.href = '/pages/dashboard.html';
  } catch (err) {
    showAlert(err.message);
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Sign In';
  }
}

async function handleSignup(e) {
  e.preventDefault();
  hideAlert();
  const btn = document.getElementById('signup-btn');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Creating account...';

  try {
    const data = await api.post('/auth/signup', {
      name: document.getElementById('signup-name').value.trim(),
      email: document.getElementById('signup-email').value.trim(),
      password: document.getElementById('signup-password').value,
      role: document.getElementById('signup-role').value
    });
    api.setToken(data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.location.href = '/pages/dashboard.html';
  } catch (err) {
    showAlert(err.message);
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Create Account';
  }
}

// Redirect if already logged in
(function() {
  if (localStorage.getItem('token')) {
    window.location.href = '/pages/dashboard.html';
  }
})();
