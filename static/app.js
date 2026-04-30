const api = {
  async get(path) {
    const r = await fetch(path); return r.json();
  },
  async post(path, body) {
    const r = await fetch(path, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    return r.status === 204 ? null : r.json();
  },
  async put(path, body) {
    const r = await fetch(path, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    return r.json();
  },
  async del(path) {
    await fetch(path, { method: 'DELETE' });
  }
};

let memos = [];
let currentTab = 'pending';

function fmt(time) { return time ? time.slice(0,5) : ''; }
function fmtDate(dt) { return dt ? dt.slice(0,10) : ''; }

function renderMemo(m) {
  const isDone = !!m.is_done;
  const div = document.createElement('div');
  div.className = 'memo-item' + (isDone ? ' done' : '');
  div.dataset.id = m.id;

  const check = document.createElement('button');
  check.className = 'memo-check' + (isDone ? ' checked' : '');
  check.title = isDone ? 'Rouvrir' : 'Marquer comme fait';
  check.innerHTML = isDone ? '✓' : '';
  check.onclick = () => toggleDone(m.id, isDone);

  const body = document.createElement('div');
  body.className = 'memo-body';

  const title = document.createElement('div');
  title.className = 'memo-title' + (isDone ? ' done-text' : '');
  title.textContent = m.title;

  body.appendChild(title);

  if (m.description) {
    const desc = document.createElement('div');
    desc.className = 'memo-desc';
    desc.textContent = m.description;
    body.appendChild(desc);
  }

  const meta = document.createElement('div');
  meta.className = 'memo-meta';
  if (!isDone) {
    meta.innerHTML = `<span>🔔 ${fmt(m.reminder_time)}</span><span>📅 ${fmtDate(m.created_at)}</span>`;
  } else {
    meta.innerHTML = `<span>✅ Fait le ${fmtDate(m.done_at)}</span>`;
  }
  body.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'memo-actions';
  const editBtn = document.createElement('button');
  editBtn.className = 'btn-icon';
  editBtn.title = 'Modifier';
  editBtn.textContent = '✏️';
  editBtn.onclick = () => openEdit(m);
  actions.appendChild(editBtn);

  div.appendChild(check);
  div.appendChild(body);
  div.appendChild(actions);
  return div;
}

function render() {
  const pending = memos.filter(m => !m.is_done);
  const done = memos.filter(m => m.is_done);

  const badge = document.getElementById('badge-pending');
  badge.textContent = pending.length > 0 ? pending.length : '';

  const listPending = document.getElementById('list-pending');
  const listDone = document.getElementById('list-done');
  listPending.innerHTML = '';
  listDone.innerHTML = '';

  if (pending.length === 0) {
    listPending.innerHTML = '<div class="empty-state">Aucun mémo en cours 🎉</div>';
  } else {
    pending.forEach(m => listPending.appendChild(renderMemo(m)));
  }

  if (done.length === 0) {
    listDone.innerHTML = '<div class="empty-state">Aucun mémo terminé</div>';
  } else {
    done.forEach(m => listDone.appendChild(renderMemo(m)));
  }
}

async function load() {
  memos = await api.get('/api/memos');
  render();
}

async function toggleDone(id, isDone) {
  const path = isDone ? `/api/memos/${id}/undone` : `/api/memos/${id}/done`;
  const updated = await api.post(path, {});
  const idx = memos.findIndex(m => m.id === id);
  if (idx !== -1) memos[idx] = updated;
  render();
}

// Add form
document.getElementById('btn-add').onclick = async () => {
  const title = document.getElementById('input-title').value.trim();
  if (!title) { document.getElementById('input-title').focus(); return; }
  const desc = document.getElementById('input-desc').value.trim();
  const time = document.getElementById('input-time').value || '09:00';
  const memo = await api.post('/api/memos', { title, description: desc, reminder_time: time });
  memos.unshift(memo);
  document.getElementById('input-title').value = '';
  document.getElementById('input-desc').value = '';
  render();
  // Switch to pending tab
  setTab('pending');
};

document.getElementById('input-title').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-add').click();
});

// Tabs
function setTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('list-pending').classList.toggle('hidden', tab !== 'pending');
  document.getElementById('list-done').classList.toggle('hidden', tab !== 'done');
}

document.querySelectorAll('.tab').forEach(t => {
  t.onclick = () => setTab(t.dataset.tab);
});

// Settings modal
document.getElementById('btn-settings').onclick = async () => {
  const settings = await api.get('/api/settings');
  document.getElementById('input-webhook').value = settings.discord_webhook || '';
  document.getElementById('modal-settings').classList.remove('hidden');
};
document.getElementById('btn-settings-cancel').onclick = () => {
  document.getElementById('modal-settings').classList.add('hidden');
};
document.getElementById('btn-settings-save').onclick = async () => {
  const webhook = document.getElementById('input-webhook').value.trim();
  await api.post('/api/settings', { discord_webhook: webhook });
  document.getElementById('modal-settings').classList.add('hidden');
};

// Edit modal
function openEdit(m) {
  document.getElementById('edit-id').value = m.id;
  document.getElementById('edit-title').value = m.title;
  document.getElementById('edit-desc').value = m.description || '';
  document.getElementById('edit-time').value = fmt(m.reminder_time);
  document.getElementById('modal-edit').classList.remove('hidden');
}

document.getElementById('btn-edit-cancel').onclick = () => {
  document.getElementById('modal-edit').classList.add('hidden');
};

document.getElementById('btn-edit-save').onclick = async () => {
  const id = parseInt(document.getElementById('edit-id').value);
  const updated = await api.put(`/api/memos/${id}`, {
    title: document.getElementById('edit-title').value.trim(),
    description: document.getElementById('edit-desc').value.trim(),
    reminder_time: document.getElementById('edit-time').value
  });
  const idx = memos.findIndex(m => m.id === id);
  if (idx !== -1) memos[idx] = updated;
  document.getElementById('modal-edit').classList.add('hidden');
  render();
};

document.getElementById('btn-edit-delete').onclick = async () => {
  const id = parseInt(document.getElementById('edit-id').value);
  if (!confirm('Supprimer ce mémo ?')) return;
  await api.del(`/api/memos/${id}`);
  memos = memos.filter(m => m.id !== id);
  document.getElementById('modal-edit').classList.add('hidden');
  render();
};

// Close modals on backdrop click
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.classList.add('hidden');
  });
});

load();
