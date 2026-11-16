/* =============================================================
   script.js — TaskFlow Frontend Application Logic
   =============================================================

   HOW THIS FILE IS ORGANIZED:
   1. Configuration          — API base URL
   2. State                  — which tasks are loaded, delete target
   3. DOM references         — cached element lookups
   4. Bootstrap instances    — modal and toast objects
   5. API functions          — all fetch() calls to the backend
   6. Render functions       — build the HTML table rows
   7. UI event handlers      — button clicks, search, filter
   8. Initialization         — runs on page load

   WHY FETCH API?
     fetch() is built into every modern browser. It sends HTTP requests
     to your backend exactly like PowerShell's Invoke-RestMethod does.
     It returns a Promise, so we use async/await for clean, readable code.
============================================================= */


/* =============================================================
   1. CONFIGURATION
   Change API_BASE_URL to your Render URL when deploying.
   Example: 'https://taskflow-api.onrender.com'
============================================================= */
const API_BASE_URL = 'https://taskflow-api-085t.onrender.com';


/* =============================================================
   2. APPLICATION STATE
============================================================= */
let currentDeleteId = null;    // ID of the task pending deletion
let currentDeleteTitle = '';   // Title shown in the delete modal
let currentFilter = '';        // Active status filter ('', 'pending', 'completed')
let searchTimeout = null;      // Timer for debounced search


/* =============================================================
   3. DOM ELEMENT REFERENCES
   We grab elements once and reuse them — avoids repeated
   document.getElementById() calls throughout the code.
============================================================= */
const tasksTbody         = document.getElementById('tasks-tbody');
const loadingState       = document.getElementById('loading-state');
const emptyState         = document.getElementById('empty-state');
const tasksTableWrapper  = document.getElementById('tasks-table-wrapper');
const taskCountBadge     = document.getElementById('task-count-badge');
const searchInput        = document.getElementById('search-input');
const statusFilter       = document.getElementById('status-filter');

// Stat card values
const statTotal          = document.getElementById('stat-total');
const statPending        = document.getElementById('stat-pending');
const statCompleted      = document.getElementById('stat-completed');
const statRate           = document.getElementById('stat-rate');

// Modal form elements
const taskForm           = document.getElementById('task-form');
const taskIdInput        = document.getElementById('task-id');
const taskTitleInput     = document.getElementById('task-title');
const taskDescInput      = document.getElementById('task-description');
const taskModalLabel     = document.getElementById('taskModalLabel');
const saveTaskBtn        = document.getElementById('save-task-btn');
const saveTaskLabel      = document.getElementById('save-task-label');
const confirmDeleteBtn   = document.getElementById('confirm-delete-btn');
const deleteTaskTitle    = document.getElementById('delete-task-title');

// Toast elements
const toastEl            = document.getElementById('app-toast');
const toastIcon          = document.getElementById('toast-icon');
const toastMessage       = document.getElementById('toast-message');


/* =============================================================
   4. BOOTSTRAP INSTANCES
   We initialize Bootstrap's JS components so we can control
   them programmatically (e.g., show/hide a modal from code).
============================================================= */
const taskModalEl   = document.getElementById('taskModal');
const deleteModalEl = document.getElementById('deleteModal');
const taskModal     = new bootstrap.Modal(taskModalEl);
const deleteModal   = new bootstrap.Modal(deleteModalEl);
const toast         = new bootstrap.Toast(toastEl, { delay: 3500 });


/* =============================================================
   5. API FUNCTIONS
   Each function maps to one backend endpoint.
   All use async/await with error handling.
============================================================= */

/**
 * Fetch all tasks, with optional search and status filter.
 * GET /api/tasks?search=...&status=...
 */
async function fetchTasks(search = '', status = '') {
  // Build query string dynamically
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (status) params.append('status', status);

  const url = `${API_BASE_URL}/api/tasks?${params.toString()}`;

  const response = await fetch(url);

  // If the HTTP status is not 2xx, throw an error so the caller handles it
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Failed to fetch tasks');
  }

  return response.json(); // { success: true, count: N, data: [...] }
}

/**
 * Create a new task.
 * POST /api/tasks
 */
async function createTask(title, description) {
  const response = await fetch(`${API_BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to create task');
  return data;
}

/**
 * Update an existing task's title and description.
 * PUT /api/tasks/:id
 */
async function updateTask(id, title, description) {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to update task');
  return data;
}

/**
 * Toggle a task's status between 'pending' and 'completed'.
 * PATCH /api/tasks/:id/status
 */
async function toggleTaskStatus(id, newStatus) {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to update status');
  return data;
}

/**
 * Delete a task permanently.
 * DELETE /api/tasks/:id
 */
async function deleteTask(id) {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
    method: 'DELETE',
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to delete task');
  return data;
}


/* =============================================================
   6. RENDER FUNCTIONS
   These functions build HTML and update the DOM.
============================================================= */

/**
 * Main render function — load tasks and update everything.
 */
async function loadAndRenderTasks() {
  showLoading();

  try {
    const search = searchInput.value.trim();
    const status = statusFilter.value;

    const result = await fetchTasks(search, status);
    const tasks  = result.data;

    // Update stat cards (always fetch unfiltered counts for accuracy)
    await updateStats();

    // Update the task count badge
    taskCountBadge.textContent = tasks.length;

    if (tasks.length === 0) {
      showEmptyState();
      return;
    }

    // Build table rows
    tasksTbody.innerHTML = tasks.map(renderTaskRow).join('');
    showTable();

  } catch (err) {
    console.error('Load error:', err);
    showToast('error', `Failed to load tasks: ${err.message}`);
    showEmptyState();
  }
}

/**
 * Build a single <tr> HTML string for one task object.
 * We use data-* attributes to pass the task id/status to event handlers.
 */
function renderTaskRow(task) {
  const isCompleted    = task.status === 'completed';
  const statusClass    = isCompleted ? 'completed' : 'pending';
  const statusIcon     = isCompleted ? 'bi-check-circle-fill' : 'bi-clock';
  const toggleIcon     = isCompleted ? 'bi-arrow-counterclockwise' : 'bi-check-lg';
  const toggleTitle    = isCompleted ? 'Mark as Pending' : 'Mark as Completed';
  const newStatus      = isCompleted ? 'pending' : 'completed';
  const toggleBtnClass = isCompleted ? 'btn-toggle-status is-completed' : 'btn-toggle-status';
  const createdDate    = formatDate(task.created_at);
  const description    = task.description
    ? `<span class="desc-text">${escapeHtml(task.description)}</span>`
    : `<span class="no-desc">No description</span>`;

  return `
    <tr data-id="${task.id}">
      <td class="text-muted" style="font-size:.8rem;">#${task.id}</td>

      <td class="task-title-cell">${escapeHtml(task.title)}</td>

      <td class="task-desc-cell d-none d-md-table-cell">${description}</td>

      <td>
        <span class="status-badge ${statusClass}">
          <i class="bi ${statusIcon}"></i>
          ${capitalize(task.status)}
        </span>
      </td>

      <td class="text-muted small d-none d-sm-table-cell">${createdDate}</td>

      <td class="text-end">
        <div class="d-flex justify-content-end gap-1">
          <!-- Toggle status -->
          <button
            class="action-btn ${toggleBtnClass}"
            title="${toggleTitle}"
            onclick="handleToggleStatus(${task.id}, '${newStatus}')"
          ><i class="bi ${toggleIcon}"></i></button>

          <!-- Edit -->
          <button
            class="action-btn btn-edit"
            title="Edit Task"
            onclick="handleEditClick(${task.id}, '${escapeAttr(task.title)}', '${escapeAttr(task.description || '')}')"
          ><i class="bi bi-pencil"></i></button>

          <!-- Delete -->
          <button
            class="action-btn btn-delete"
            title="Delete Task"
            onclick="handleDeleteClick(${task.id}, '${escapeAttr(task.title)}')"
          ><i class="bi bi-trash"></i></button>
        </div>
      </td>
    </tr>
  `;
}

/**
 * Fetch ALL tasks (no filter) and update the stat cards.
 */
async function updateStats() {
  try {
    const result  = await fetchTasks(); // No filters
    const tasks   = result.data;
    const total   = tasks.length;
    const done    = tasks.filter(t => t.status === 'completed').length;
    const pending = total - done;
    const rate    = total === 0 ? 0 : Math.round((done / total) * 100);

    statTotal.textContent     = total;
    statPending.textContent   = pending;
    statCompleted.textContent = done;
    statRate.textContent      = `${rate}%`;
  } catch {
    // Silently fail — stats are non-critical
  }
}


/* =============================================================
   7. EVENT HANDLERS
   These are called by button clicks in the HTML (onclick=...)
   and by DOM event listeners below.
============================================================= */

/**
 * Open the modal in CREATE mode.
 * Resets the form so previous values don't bleed in.
 */
function openCreateModal() {
  taskIdInput.value       = '';           // No ID = create mode
  taskTitleInput.value    = '';
  taskDescInput.value     = '';
  taskModalLabel.innerHTML = '<i class="bi bi-plus-circle me-2"></i>New Task';
  saveTaskLabel.textContent = 'Save Task';
  taskForm.classList.remove('was-validated');
  taskModal.show();
}

/**
 * Open the modal in EDIT mode — pre-fills the form.
 * Called from the pencil button in each table row.
 */
function handleEditClick(id, title, description) {
  taskIdInput.value       = id;           // ID present = update mode
  taskTitleInput.value    = title;
  taskDescInput.value     = description;
  taskModalLabel.innerHTML = '<i class="bi bi-pencil me-2"></i>Edit Task';
  saveTaskLabel.textContent = 'Update Task';
  taskForm.classList.remove('was-validated');
  taskModal.show();
}

/**
 * Save button inside the modal.
 * Decides create vs. update based on whether taskIdInput has a value.
 */
async function handleSaveTask() {
  // Bootstrap form validation
  taskForm.classList.add('was-validated');
  if (!taskForm.checkValidity()) return;

  const id          = taskIdInput.value;
  const title       = taskTitleInput.value.trim();
  const description = taskDescInput.value.trim();

  // Disable the button while the request is in flight
  saveTaskBtn.disabled = true;
  saveTaskBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving…';

  try {
    if (id) {
      // UPDATE existing task
      await updateTask(id, title, description);
      showToast('success', 'Task updated successfully!');
    } else {
      // CREATE new task
      await createTask(title, description);
      showToast('success', 'Task created successfully!');
    }

    taskModal.hide();
    await loadAndRenderTasks();

  } catch (err) {
    showToast('error', err.message);
  } finally {
    // Re-enable the button
    saveTaskBtn.disabled = false;
    saveTaskBtn.innerHTML = '<i class="bi bi-floppy me-1"></i><span id="save-task-label">' + (id ? 'Update Task' : 'Save Task') + '</span>';
  }
}

/**
 * Open the delete confirmation modal.
 * Called from the trash button in each table row.
 */
function handleDeleteClick(id, title) {
  currentDeleteId    = id;
  currentDeleteTitle = title;
  deleteTaskTitle.textContent = `"${title}"`;
  deleteModal.show();
}

/**
 * Confirmed delete — called by the red Delete button in the modal.
 */
async function handleConfirmDelete() {
  if (!currentDeleteId) return;

  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Deleting…';

  try {
    await deleteTask(currentDeleteId);
    showToast('success', `"${currentDeleteTitle}" deleted.`);
    deleteModal.hide();
    await loadAndRenderTasks();
  } catch (err) {
    showToast('error', err.message);
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.innerHTML = '<i class="bi bi-trash me-1"></i>Delete';
    currentDeleteId    = null;
    currentDeleteTitle = '';
  }
}

/**
 * Toggle a task's status between pending ↔ completed.
 * Called from the checkmark button in each table row.
 */
async function handleToggleStatus(id, newStatus) {
  try {
    await toggleTaskStatus(id, newStatus);
    const label = newStatus === 'completed' ? 'Marked as completed!' : 'Marked as pending!';
    showToast('success', label);
    await loadAndRenderTasks();
  } catch (err) {
    showToast('error', err.message);
  }
}

/**
 * Filter tasks when the status dropdown changes.
 */
function handleFilterChange() {
  currentFilter = statusFilter.value;
  loadAndRenderTasks();
}

/**
 * Search with debounce — waits 400ms after the user stops typing
 * before sending the request. Avoids hammering the API on every keystroke.
 */
function handleSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadAndRenderTasks();
  }, 400);
}

/**
 * Sidebar filter buttons (All / Pending / Completed)
 */
function setSidebarFilter(status) {
  statusFilter.value = status;
  currentFilter      = status;

  // Update active sidebar item
  document.querySelectorAll('.sidebar-nav-item').forEach(el => el.classList.remove('active'));

  if      (status === '')          document.getElementById('show-all-btn').classList.add('active');
  else if (status === 'pending')   document.getElementById('show-pending-btn').classList.add('active');
  else if (status === 'completed') document.getElementById('show-completed-btn').classList.add('active');

  loadAndRenderTasks();
}


/* =============================================================
   UI STATE HELPERS
   Show/hide the three mutually-exclusive states of the table area.
============================================================= */
function showLoading() {
  loadingState.classList.remove('d-none');
  emptyState.classList.add('d-none');
  tasksTableWrapper.classList.add('d-none');
}
function showEmptyState() {
  loadingState.classList.add('d-none');
  emptyState.classList.remove('d-none');
  tasksTableWrapper.classList.add('d-none');
}
function showTable() {
  loadingState.classList.add('d-none');
  emptyState.classList.add('d-none');
  tasksTableWrapper.classList.remove('d-none');
}

/**
 * Show a toast notification.
 * @param {'success'|'error'} type
 * @param {string} message
 */
function showToast(type, message) {
  if (type === 'success') {
    toastEl.className   = 'toast align-items-center border-0 text-bg-success';
    toastIcon.className = 'bi bi-check-circle-fill';
  } else {
    toastEl.className   = 'toast align-items-center border-0 text-bg-danger';
    toastIcon.className = 'bi bi-exclamation-circle-fill';
  }
  toastMessage.textContent = message;
  toast.show();
}


/* =============================================================
   UTILITY FUNCTIONS
============================================================= */

/** Format an ISO date string into a readable short date */
function formatDate(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-GB', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  });
}

/** Capitalize first letter */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Escape HTML special characters to prevent XSS.
 * Never insert raw user data directly into innerHTML.
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Escape single quotes for use inside onclick='...' HTML attributes */
function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/\n/g, ' ');
}


/* =============================================================
   8. INITIALIZATION
   Wire up all event listeners and load the first batch of tasks.
============================================================= */
document.addEventListener('DOMContentLoaded', () => {

  // --- Initial data load ---
  loadAndRenderTasks();

  // --- New Task button (topbar) ---
  document.getElementById('new-task-btn').addEventListener('click', openCreateModal);

  // --- Refresh button ---
  document.getElementById('refresh-btn').addEventListener('click', loadAndRenderTasks);

  // --- Modal save button ---
  saveTaskBtn.addEventListener('click', handleSaveTask);

  // --- Confirm delete button ---
  confirmDeleteBtn.addEventListener('click', handleConfirmDelete);

  // --- Search input ---
  searchInput.addEventListener('input', handleSearch);

  // --- Status filter dropdown ---
  statusFilter.addEventListener('change', handleFilterChange);

  // --- Sidebar filter buttons ---
  document.getElementById('show-all-btn').addEventListener('click', () => setSidebarFilter(''));
  document.getElementById('show-pending-btn').addEventListener('click',   () => setSidebarFilter('pending'));
  document.getElementById('show-completed-btn').addEventListener('click', () => setSidebarFilter('completed'));

  // --- Mobile sidebar toggle ---
  const sidebarEl      = document.getElementById('sidebar');
  const sidebarToggle  = document.getElementById('sidebar-toggle');

  // Create overlay element for mobile
  const overlay = document.createElement('div');
  overlay.id    = 'sidebar-overlay';
  document.body.appendChild(overlay);

  sidebarToggle.addEventListener('click', () => {
    sidebarEl.classList.toggle('show');
    overlay.classList.toggle('show');
  });
  overlay.addEventListener('click', () => {
    sidebarEl.classList.remove('show');
    overlay.classList.remove('show');
  });

  // --- Reset modal form state when modal closes ---
  taskModalEl.addEventListener('hidden.bs.modal', () => {
    taskForm.classList.remove('was-validated');
    taskIdInput.value    = '';
    taskTitleInput.value = '';
    taskDescInput.value  = '';
  });

});
