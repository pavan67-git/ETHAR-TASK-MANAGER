// ========================================
// Dashboard Page Logic
// ========================================

async function loadDashboard() {
  try {
    const greeting = document.getElementById('greeting-text');
    if (greeting) greeting.textContent = `${getGreeting()}, ${currentUser.name.split(' ')[0]}!`;

    const data = await api.get('/dashboard');
    renderStats(data.stats);
    renderDonut(data.stats.tasksByStatus);
    renderRecentTasks(data.recentTasks);
    renderUpcoming(data.upcomingTasks, data.stats.overdueTasks);
    renderRecentProjects(data.recentProjects);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderStats(s) {
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = `
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--info-bg);color:var(--primary-light)">📁</div>
      <div class="stat-value">${s.totalProjects}</div>
      <div class="stat-label">Total Projects</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--warning-bg);color:var(--warning)">📋</div>
      <div class="stat-value">${s.myTasks}</div>
      <div class="stat-label">My Tasks</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--success-bg);color:var(--success)">✅</div>
      <div class="stat-value">${s.completionRate}%</div>
      <div class="stat-label">Completion Rate</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--danger-bg);color:var(--danger)">⏰</div>
      <div class="stat-value">${s.overdueTasks}</div>
      <div class="stat-label">Overdue Tasks</div>
    </div>`;
}

function renderDonut(ts) {
  const total = (ts.todo||0) + (ts.inProgress||0) + (ts.review||0) + (ts.done||0);
  const container = document.getElementById('task-donut');
  const legend = document.getElementById('status-legend');
  if (total === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:30px 0">No tasks yet</p>';
    legend.innerHTML = '';
    return;
  }
  const items = [
    { label:'To Do', count:ts.todo||0, color:'#94a3b8' },
    { label:'In Progress', count:ts.inProgress||0, color:'#6366f1' },
    { label:'Review', count:ts.review||0, color:'#f59e0b' },
    { label:'Done', count:ts.done||0, color:'#10b981' }
  ];
  let cum = 0;
  const segs = items.filter(i=>i.count>0).map(i => {
    const pct = (i.count/total)*100;
    const offset = cum; cum += pct;
    return `<circle cx="80" cy="80" r="60" fill="none" stroke="${i.color}" stroke-width="20"
      stroke-dasharray="${pct*3.77} ${377-pct*3.77}" stroke-dashoffset="${-offset*3.77}"
      style="transition:stroke-dasharray 600ms ease"/>`;
  });
  container.innerHTML = `<svg viewBox="0 0 160 160">
    <circle cx="80" cy="80" r="60" fill="none" stroke="var(--bg-tertiary)" stroke-width="20"/>
    ${segs.join('')}
    <text x="80" y="76" text-anchor="middle" fill="var(--text-primary)" font-size="22" font-weight="800">${total}</text>
    <text x="80" y="94" text-anchor="middle" fill="var(--text-muted)" font-size="10">tasks</text>
  </svg>`;
  legend.innerHTML = items.map(i =>
    `<div class="legend-item"><span class="legend-dot" style="background:${i.color}"></span>${i.label} <span class="legend-count">${i.count}</span></div>`
  ).join('');
}

function renderRecentTasks(tasks) {
  const el = document.getElementById('recent-tasks-list');
  if (!tasks || tasks.length === 0) {
    el.innerHTML = '<p style="color:var(--text-muted);padding:20px 0;text-align:center">No tasks assigned to you yet</p>';
    return;
  }
  el.innerHTML = tasks.map(t => `
    <div class="task-list-item" onclick="window.location.href='/pages/board.html?id=${t.project?._id||t.project}'">
      <div class="task-color-bar" style="background:${t.project?.color||'var(--primary)'}"></div>
      <div class="task-item-info">
        <div class="task-item-title">${t.title}</div>
        <div class="task-item-meta">
          <span class="badge ${getStatusClass(t.status)}">${statusLabel(t.status)}</span>
          ${t.dueDate ? `<span class="${isOverdue(t.dueDate,t.status)?'overdue-text':''}">${formatRelative(t.dueDate)}</span>` : ''}
        </div>
      </div>
      <span class="badge ${getPriorityClass(t.priority)}">${t.priority}</span>
    </div>`).join('');
}

function renderUpcoming(tasks, overdueCount) {
  const badge = document.getElementById('overdue-badge');
  if (overdueCount > 0) { badge.textContent = `${overdueCount} overdue`; badge.classList.remove('hidden'); }
  else { badge.classList.add('hidden'); }

  const el = document.getElementById('upcoming-tasks-list');
  if (!tasks || tasks.length === 0) {
    el.innerHTML = '<p style="color:var(--text-muted);padding:20px 0;text-align:center">No upcoming deadlines this week</p>';
    return;
  }
  el.innerHTML = tasks.map(t => `
    <div class="task-list-item">
      <div class="task-color-bar" style="background:${t.project?.color||'var(--primary)'}"></div>
      <div class="task-item-info">
        <div class="task-item-title">${t.title}</div>
        <div class="task-item-meta">
          <span>${t.project?.name||'—'}</span>
          <span class="${isOverdue(t.dueDate,t.status)?'overdue-text':''}">${formatRelative(t.dueDate)}</span>
        </div>
      </div>
    </div>`).join('');
}

function renderRecentProjects(projects) {
  const el = document.getElementById('recent-projects-list');
  if (!projects || projects.length === 0) {
    el.innerHTML = '<p style="color:var(--text-muted);padding:20px 0;text-align:center">No active projects</p>';
    return;
  }
  el.innerHTML = projects.map(p => `
    <div class="task-list-item" onclick="window.location.href='/pages/board.html?id=${p._id}'">
      <div class="task-color-bar" style="background:${p.color||'var(--primary)'}"></div>
      <div class="task-item-info">
        <div class="task-item-title">${p.name}</div>
        <div class="task-item-meta">
          <span class="badge ${getStatusClass(p.status)}">${statusLabel(p.status)}</span>
        </div>
      </div>
    </div>`).join('');
}

loadDashboard();
