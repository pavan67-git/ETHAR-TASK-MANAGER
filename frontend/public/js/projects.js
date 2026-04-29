// ========================================
// Projects Page Logic
// ========================================

let allProjects = [];
let editingProjectId = null;

async function loadProjects() {
  try {
    const data = await api.get('/projects');
    allProjects = data.projects || [];
    renderProjects(allProjects);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderProjects(projects) {
  const grid = document.getElementById('projects-grid');
  const empty = document.getElementById('projects-empty');
  if (projects.length === 0) {
    grid.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  grid.classList.remove('hidden');
  grid.innerHTML = projects.map(p => {
    const memberAvatars = (p.members||[]).slice(0,4).map(m =>
      `<div class="mini-avatar" title="${m.user?.name||''}">${getInitials(m.user?.name)}</div>`
    ).join('');
    const extra = (p.members||[]).length > 4 ? `<div class="mini-avatar">+${p.members.length-4}</div>` : '';
    return `<div class="project-card" onclick="window.location.href='/pages/board.html?id=${p._id}'">
      <div class="project-card-bar" style="background:${p.color||'var(--primary)'}"></div>
      <div class="project-card-body">
        <div class="project-card-header">
          <span class="project-card-name">${p.name}</span>
          <span class="badge ${getStatusClass(p.status)}">${statusLabel(p.status)}</span>
        </div>
        <p class="project-card-desc">${p.description||'No description'}</p>
        <div class="project-progress">
          <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${p.progress||0}%;background:${p.color||'var(--primary)'}"></div></div>
          <div class="progress-text">${p.completedTaskCount||0}/${p.taskCount||0} tasks · ${p.progress||0}% done</div>
        </div>
        <div class="project-card-footer" style="margin-top:12px">
          <div class="project-members-stack">${memberAvatars}${extra}</div>
          <span class="badge ${getPriorityClass(p.priority)}">${p.priority}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

function filterProjects(q) {
  const search = (q || document.getElementById('project-search')?.value || '').toLowerCase();
  const status = document.getElementById('status-filter')?.value || '';
  let filtered = allProjects;
  if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search));
  if (status) filtered = filtered.filter(p => p.status === status);
  renderProjects(filtered);
}

function openProjectModal(project) {
  editingProjectId = project?._id || null;
  document.getElementById('project-modal-title').textContent = editingProjectId ? 'Edit Project' : 'Create New Project';
  document.getElementById('project-submit-btn').textContent = editingProjectId ? 'Save Changes' : 'Create Project';
  document.getElementById('proj-name').value = project?.name || '';
  document.getElementById('proj-desc').value = project?.description || '';
  document.getElementById('proj-status').value = project?.status || 'planning';
  document.getElementById('proj-priority').value = project?.priority || 'medium';
  document.getElementById('proj-color').value = project?.color || '#6366f1';
  document.getElementById('proj-due').value = project?.dueDate ? project.dueDate.split('T')[0] : '';
  document.getElementById('project-modal-overlay').classList.remove('hidden');
}

function closeProjectModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('project-modal-overlay').classList.add('hidden');
  editingProjectId = null;
}

async function handleProjectSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('project-submit-btn');
  btn.disabled = true;
  const body = {
    name: document.getElementById('proj-name').value.trim(),
    description: document.getElementById('proj-desc').value.trim(),
    status: document.getElementById('proj-status').value,
    priority: document.getElementById('proj-priority').value,
    color: document.getElementById('proj-color').value,
    dueDate: document.getElementById('proj-due').value || undefined
  };
  try {
    if (editingProjectId) {
      await api.patch(`/projects/${editingProjectId}`, body);
      showToast('Project updated!', 'success');
    } else {
      await api.post('/projects', body);
      showToast('Project created!', 'success');
    }
    closeProjectModal();
    loadProjects();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

loadProjects();
