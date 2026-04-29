// ========================================
// Team Page Logic (Admin Only)
// ========================================

let allTeamMembers = [];

async function loadTeam() {
  if (currentUser.role !== 'admin') {
    window.location.href = '/pages/dashboard.html';
    return;
  }
  try {
    const data = await api.get('/users');
    allTeamMembers = data.users || [];
    renderTeam(allTeamMembers);
  } catch (err) { showToast(err.message, 'error'); }
}

function renderTeam(users) {
  const grid = document.getElementById('team-grid');
  const empty = document.getElementById('team-empty');
  if (users.length === 0) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  grid.innerHTML = users.map(u => `
    <div class="team-card">
      <div class="team-card-avatar">${getInitials(u.name)}</div>
      <div class="team-card-name">${u.name}</div>
      <div class="team-card-email">${u.email}</div>
      <span class="badge ${u.role==='admin'?'badge-info':'badge-default'}" style="margin:0 auto">${u.role}</span>
      <div class="team-card-actions">
        ${u._id !== currentUser._id ? `
          <select class="filter-select" style="font-size:0.8rem;padding:6px 28px 6px 10px" onchange="changeRole('${u._id}',this.value)">
            <option value="member" ${u.role==='member'?'selected':''}>Member</option>
            <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
          </select>
          <button class="btn-outline-danger" style="font-size:0.78rem;padding:6px 12px" onclick="deactivateUser('${u._id}')">Remove</button>
        ` : '<span style="font-size:0.78rem;color:var(--text-muted)">You</span>'}
      </div>
    </div>`).join('');
}

function searchTeam(q) {
  if (!q) { renderTeam(allTeamMembers); return; }
  const filtered = allTeamMembers.filter(u =>
    u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase())
  );
  renderTeam(filtered);
}

async function changeRole(userId, role) {
  try {
    await api.patch(`/users/${userId}/role`, { role });
    showToast(`Role changed to ${role}`, 'success');
    loadTeam();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deactivateUser(userId) {
  if (!confirm('Remove this user? They will be deactivated.')) return;
  try {
    await api.delete(`/users/${userId}`);
    showToast('User removed', 'success');
    loadTeam();
  } catch (err) { showToast(err.message, 'error'); }
}

loadTeam();
