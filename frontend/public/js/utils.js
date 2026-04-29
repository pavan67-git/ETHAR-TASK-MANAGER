// ========================================
// Utility Functions
// ========================================

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelative(d) {
  if (!d) return '';
  const now = new Date(), date = new Date(d);
  const diff = date - now, days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days <= 7) return `${days}d left`;
  return formatDate(d);
}

function isOverdue(d, status) {
  if (!d || status === 'done') return false;
  return new Date(d) < new Date();
}

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getPriorityClass(p) { return `badge-priority-${p}`; }
function getStatusClass(s)   { return `badge-status-${s}`; }

function statusLabel(s) {
  const map = { 'todo':'To Do','in-progress':'In Progress','review':'In Review','done':'Done',
    'planning':'Planning','active':'Active','on-hold':'On Hold','completed':'Completed','cancelled':'Cancelled'};
  return map[s] || s;
}

function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ️'}</span><span class="toast-msg">${msg}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
  c.appendChild(t);
  setTimeout(() => { if (t.parentElement) t.remove(); }, 4000);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function debounce(fn, ms = 300) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
