// ========================================
// App Shell — Shared across all app pages
// ========================================

let currentUser = null;

function requireAuth() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  if (!token || !user) { window.location.href = '/'; return false; }
  currentUser = JSON.parse(user);
  return true;
}

function populateSidebar() {
  if (!currentUser) return;
  const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  el('sidebar-avatar', getInitials(currentUser.name));
  el('sidebar-name', currentUser.name);
  el('sidebar-role', currentUser.role);

  // Show admin-only nav items
  if (currentUser.role === 'admin') {
    document.querySelectorAll('.admin-only').forEach(e => e.classList.remove('hidden'));
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function logout() {
  api.clearToken();
  window.location.href = '/';
}

// Initialize on all app pages
(function initApp() {
  if (!requireAuth()) return;
  populateSidebar();
  // Close sidebar on outside click (mobile)
  document.addEventListener('click', (e) => {
    const sb = document.getElementById('sidebar');
    if (sb && sb.classList.contains('open') && !sb.contains(e.target) && !e.target.closest('.mobile-menu-btn')) {
      sb.classList.remove('open');
    }
  });
})();
