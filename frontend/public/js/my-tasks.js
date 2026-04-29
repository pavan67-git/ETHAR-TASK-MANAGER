// ========================================
// My Tasks Page Logic
// ========================================

let overdueFilter = false;

async function loadMyTasks() {
  const container = document.getElementById('my-tasks-container');
  const empty = document.getElementById('tasks-empty');
  container.innerHTML = '<div class="loading-spinner"></div>';
  empty.classList.add('hidden');

  const status = document.getElementById('task-status-filter')?.value || '';
  const priority = document.getElementById('task-priority-filter')?.value || '';

  let url = '/tasks?assignee=me';
  if (status) url += `&status=${status}`;
  if (priority) url += `&priority=${priority}`;
  if (overdueFilter) url += '&overdue=true';

  try {
    const data = await api.get(url);
    const tasks = data.tasks || [];

    // Show overdue button
    const overdueCount = tasks.filter(t => isOverdue(t.dueDate, t.status)).length;
    const odBtn = document.getElementById('overdue-filter-btn');
    if (overdueCount > 0 || overdueFilter) {
      odBtn.classList.remove('hidden');
      document.getElementById('overdue-count-text').textContent = overdueFilter ? 'Show All' : `${overdueCount} Overdue`;
    } else { odBtn.classList.add('hidden'); }

    if (tasks.length === 0) {
      container.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    container.innerHTML = tasks.map(t => `
      <div class="task-row" onclick="window.location.href='/pages/board.html?id=${t.project?._id||t.project}'">
        <div class="task-row-left">
          <div class="task-color-bar" style="background:${t.project?.color||'var(--primary)'}"></div>
          <div>
            <div class="task-row-title">${t.title}</div>
            <div class="task-row-project">
              <span class="task-row-project-dot" style="background:${t.project?.color||'var(--primary)'}"></span>
              ${t.project?.name||'Unknown Project'}
            </div>
          </div>
        </div>
        <div class="task-row-right">
          <span class="badge ${getStatusClass(t.status)}">${statusLabel(t.status)}</span>
          <span class="badge ${getPriorityClass(t.priority)}">${t.priority}</span>
          ${t.dueDate ? `<span class="task-row-due ${isOverdue(t.dueDate,t.status)?'overdue':''}">${formatRelative(t.dueDate)}</span>` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    showToast(err.message, 'error');
    container.innerHTML = '';
  }
}

function toggleOverdueFilter() {
  overdueFilter = !overdueFilter;
  loadMyTasks();
}

loadMyTasks();
