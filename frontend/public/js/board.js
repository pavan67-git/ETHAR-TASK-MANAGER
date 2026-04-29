// ========================================
// Kanban Board Page Logic
// ========================================

let projectId = null;
let projectData = null;
let editingTaskId = null;

function getProjectId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

async function loadBoard() {
  projectId = getProjectId();
  if (!projectId) { window.location.href = '/pages/projects.html'; return; }
  try {
    const data = await api.get(`/projects/${projectId}`);
    projectData = data.project;
    document.getElementById('board-project-name').textContent = projectData.name;
    document.getElementById('board-title').textContent = projectData.name;
    renderMembers(projectData);
    renderColumns(data.tasksByStatus || {});
  } catch (err) {
    showToast(err.message, 'error');
    setTimeout(() => window.location.href = '/pages/projects.html', 1500);
  }
}

function renderMembers(proj) {
  const el = document.getElementById('board-members');
  const members = proj.members || [];
  el.innerHTML = members.slice(0,5).map(m =>
    `<div class="user-avatar" style="width:30px;height:30px;font-size:0.65rem;margin-left:-6px" title="${m.user?.name||''}">${getInitials(m.user?.name)}</div>`
  ).join('');
}

function renderColumns(byStatus) {
  ['todo','in-progress','review','done'].forEach(s => {
    const tasks = byStatus[s] || [];
    document.getElementById(`count-${s}`).textContent = tasks.length;
    const container = document.getElementById(`cards-${s}`);
    if (tasks.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem;text-align:center;padding:20px 0">No tasks</p>';
      return;
    }
    container.innerHTML = tasks.map(t => `
      <div class="kanban-card" draggable="true" data-id="${t._id}"
        ondragstart="dragStart(event)" onclick="openTaskDetail('${t._id}')">
        <div class="kanban-card-title">${t.title}</div>
        <div class="kanban-card-meta">
          <div class="kanban-card-info">
            <span class="badge ${getPriorityClass(t.priority)}">${t.priority}</span>
            ${t.dueDate ? `<span class="kanban-card-due ${isOverdue(t.dueDate,t.status)?'overdue':''}">${formatRelative(t.dueDate)}</span>` : ''}
          </div>
          ${t.assignee ? `<div class="kanban-card-assignee" title="${t.assignee.name}">${getInitials(t.assignee.name)}</div>` : ''}
        </div>
      </div>`).join('');
  });
}

// Drag and drop
function dragStart(e) {
  e.dataTransfer.setData('text/plain', e.target.dataset.id);
  e.target.classList.add('dragging');
  setTimeout(() => e.target.classList.remove('dragging'), 200);
}
function allowDrop(e) { e.preventDefault(); }
async function dropTask(e, newStatus) {
  e.preventDefault();
  const taskId = e.dataTransfer.getData('text/plain');
  if (!taskId) return;
  try {
    await api.patch(`/tasks/${taskId}`, { status: newStatus });
    loadBoard();
    showToast('Task moved!', 'success');
  } catch (err) { showToast(err.message, 'error'); }
}

// Task Modal
function openTaskModal(defaultStatus) {
  editingTaskId = null;
  document.getElementById('task-modal-title').textContent = 'Create Task';
  document.getElementById('task-submit-btn').textContent = 'Create Task';
  document.getElementById('task-form').reset();
  if (defaultStatus) document.getElementById('task-status').value = defaultStatus;
  populateAssignees();
  document.getElementById('task-modal-overlay').classList.remove('hidden');
}

function closeTaskModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('task-modal-overlay').classList.add('hidden');
}

function populateAssignees() {
  const sel = document.getElementById('task-assignee');
  sel.innerHTML = '<option value="">Unassigned</option>';
  if (!projectData?.members) return;
  projectData.members.forEach(m => {
    if (m.user) sel.innerHTML += `<option value="${m.user._id}">${m.user.name} (${m.user.email})</option>`;
  });
}

async function handleTaskSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('task-submit-btn');
  btn.disabled = true;
  const body = {
    title: document.getElementById('task-title').value.trim(),
    description: document.getElementById('task-desc').value.trim(),
    status: document.getElementById('task-status').value,
    priority: document.getElementById('task-priority').value,
    assignee: document.getElementById('task-assignee').value || undefined,
    dueDate: document.getElementById('task-due').value || undefined,
    estimatedHours: document.getElementById('task-hours').value || undefined,
    projectId: projectId
  };
  try {
    if (editingTaskId) {
      await api.patch(`/tasks/${editingTaskId}`, body);
      showToast('Task updated!', 'success');
    } else {
      await api.post('/tasks', body);
      showToast('Task created!', 'success');
    }
    closeTaskModal();
    loadBoard();
  } catch (err) { showToast(err.message, 'error'); }
  finally { btn.disabled = false; }
}

// Task Detail
async function openTaskDetail(taskId) {
  document.getElementById('task-detail-overlay').classList.remove('hidden');
  const body = document.getElementById('task-detail-body');
  body.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const { task } = await api.get(`/tasks/${taskId}`);
    const badges = document.getElementById('detail-badges');
    badges.innerHTML = `<span class="badge ${getStatusClass(task.status)}">${statusLabel(task.status)}</span>
      <span class="badge ${getPriorityClass(task.priority)}">${task.priority}</span>`;
    body.innerHTML = `
      <h2 style="font-size:1.15rem;margin-bottom:12px">${task.title}</h2>
      <p style="color:var(--text-secondary);margin-bottom:20px;font-size:0.9rem">${task.description||'No description'}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
        <div><span style="font-size:0.78rem;color:var(--text-muted)">Assignee</span>
          <p style="font-size:0.9rem">${task.assignee?.name||'Unassigned'}</p></div>
        <div><span style="font-size:0.78rem;color:var(--text-muted)">Due Date</span>
          <p style="font-size:0.9rem" class="${isOverdue(task.dueDate,task.status)?'overdue-text':''}">${task.dueDate?formatDate(task.dueDate):'None'}</p></div>
        <div><span style="font-size:0.78rem;color:var(--text-muted)">Created By</span>
          <p style="font-size:0.9rem">${task.createdBy?.name||'—'}</p></div>
        <div><span style="font-size:0.78rem;color:var(--text-muted)">Created</span>
          <p style="font-size:0.9rem">${formatDate(task.createdAt)}</p></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        <button class="btn-secondary" onclick="editTask('${task._id}')">✏️ Edit</button>
        <button class="btn-outline-danger" onclick="deleteTask('${task._id}')">🗑️ Delete</button>
      </div>
      <div style="border-top:1px solid var(--border);padding-top:16px">
        <h4 style="font-size:0.9rem;margin-bottom:12px">Comments (${task.comments?.length||0})</h4>
        <div id="comments-list">${(task.comments||[]).map(c => `
          <div style="padding:8px 0;border-bottom:1px solid var(--border)">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <div class="user-avatar" style="width:24px;height:24px;font-size:0.6rem">${getInitials(c.user?.name)}</div>
              <span style="font-size:0.85rem;font-weight:500">${c.user?.name||'User'}</span>
              <span style="font-size:0.72rem;color:var(--text-muted)">${formatDate(c.createdAt)}</span>
            </div>
            <p style="font-size:0.85rem;color:var(--text-secondary);padding-left:32px">${c.text}</p>
          </div>`).join('')}
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <input type="text" id="comment-input" placeholder="Add a comment..." style="flex:1" onkeydown="if(event.key==='Enter')addComment('${task._id}')" />
          <button class="btn-primary" onclick="addComment('${task._id}')">Send</button>
        </div>
      </div>`;
  } catch (err) {
    body.innerHTML = `<p style="color:var(--danger)">Error: ${err.message}</p>`;
  }
}

function closeTaskDetail(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('task-detail-overlay').classList.add('hidden');
}

async function editTask(id) {
  closeTaskDetail();
  try {
    const { task } = await api.get(`/tasks/${id}`);
    editingTaskId = id;
    document.getElementById('task-modal-title').textContent = 'Edit Task';
    document.getElementById('task-submit-btn').textContent = 'Save Changes';
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-desc').value = task.description || '';
    document.getElementById('task-status').value = task.status;
    document.getElementById('task-priority').value = task.priority;
    document.getElementById('task-due').value = task.dueDate ? task.dueDate.split('T')[0] : '';
    document.getElementById('task-hours').value = task.estimatedHours || '';
    populateAssignees();
    if (task.assignee) document.getElementById('task-assignee').value = task.assignee._id;
    document.getElementById('task-modal-overlay').classList.remove('hidden');
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  try {
    await api.delete(`/tasks/${id}`);
    showToast('Task deleted', 'success');
    closeTaskDetail();
    loadBoard();
  } catch (err) { showToast(err.message, 'error'); }
}

async function addComment(taskId) {
  const input = document.getElementById('comment-input');
  const text = input.value.trim();
  if (!text) return;
  try {
    await api.post(`/tasks/${taskId}/comments`, { text });
    input.value = '';
    openTaskDetail(taskId);
  } catch (err) { showToast(err.message, 'error'); }
}

// Members modal
function openMembersModal() { document.getElementById('members-modal-overlay').classList.remove('hidden'); renderMembersList(); }
function closeMembersModal(e) { if (e && e.target !== e.currentTarget) return; document.getElementById('members-modal-overlay').classList.add('hidden'); }

function renderMembersList() {
  const el = document.getElementById('members-list');
  if (!projectData?.members) { el.innerHTML = '<p style="color:var(--text-muted)">No members</p>'; return; }
  el.innerHTML = projectData.members.map(m => {
    const u = m.user;
    const isOwner = projectData.owner?._id === u?._id;
    return `<div class="member-item">
      <div class="user-avatar" style="width:36px;height:36px;font-size:0.75rem">${getInitials(u?.name)}</div>
      <div class="member-item-info">
        <div class="member-item-name">${u?.name||'Unknown'} ${isOwner?'<span style="color:var(--warning);font-size:0.72rem">👑 Owner</span>':''}</div>
        <div class="member-item-email">${u?.email||''}</div>
      </div>
      <span class="member-item-role">${m.role}</span>
      ${!isOwner && projectData.isAdmin?`<button class="btn-ghost" onclick="removeMember('${u?._id}')" title="Remove">✕</button>`:''}
    </div>`;
  }).join('');
}

const searchUsers = debounce(async (q) => {
  const el = document.getElementById('user-search-results');
  if (!q || q.length < 2) { el.classList.add('hidden'); return; }
  try {
    const { users } = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
    if (users.length === 0) { el.innerHTML = '<p style="padding:12px;color:var(--text-muted)">No users found</p>'; }
    else {
      el.innerHTML = users.map(u => `
        <div class="user-result-item">
          <div class="user-result-info">
            <div class="user-result-avatar">${getInitials(u.name)}</div>
            <div><div class="user-result-name">${u.name}</div><div class="user-result-email">${u.email}</div></div>
          </div>
          <button class="btn-ghost" onclick="addMember('${u._id}')">+ Add</button>
        </div>`).join('');
    }
    el.classList.remove('hidden');
  } catch (err) { console.error(err); }
}, 300);

async function addMember(userId) {
  try {
    await api.post(`/projects/${projectId}/members`, { userId, role: 'member' });
    showToast('Member added!', 'success');
    document.getElementById('member-search-input').value = '';
    document.getElementById('user-search-results').classList.add('hidden');
    loadBoard();
    renderMembersList();
  } catch (err) { showToast(err.message, 'error'); }
}

async function removeMember(userId) {
  if (!confirm('Remove this member?')) return;
  try {
    await api.delete(`/projects/${projectId}/members/${userId}`);
    showToast('Member removed', 'success');
    loadBoard();
  } catch (err) { showToast(err.message, 'error'); }
}

loadBoard();
