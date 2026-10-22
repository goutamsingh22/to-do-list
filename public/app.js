(function () {
  'use strict';

  var TASKS_KEY = 'taskly.tasks.v1';
  var THEME_KEY = 'taskly.theme';

  var CHECK_ICON =
    '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>';
  var EDIT_ICON =
    '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
  var TRASH_ICON =
    '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

  var state = {
    tasks: loadTasks(),
    filter: 'all'
  };

  var el = {
    form: document.getElementById('todo-form'),
    input: document.getElementById('todo-input'),
    list: document.getElementById('todo-list'),
    filters: document.getElementById('filters'),
    empty: document.getElementById('empty-state'),
    emptyTitle: document.getElementById('empty-title'),
    emptyHint: document.getElementById('empty-hint'),
    summary: document.getElementById('summary'),
    clearCompleted: document.getElementById('clear-completed'),
    themeToggle: document.getElementById('theme-toggle')
  };

  function loadTasks() {
    try {
      var raw = localStorage.getItem(TASKS_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(function (t) { return t && typeof t.text === 'string' && t.text.trim() !== ''; })
        .map(function (t) {
          return {
            id: typeof t.id === 'string' ? t.id : createId(),
            text: t.text,
            completed: Boolean(t.completed),
            createdAt: Number(t.createdAt) || Date.now()
          };
        });
    } catch (err) {
      return [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(TASKS_KEY, JSON.stringify(state.tasks));
    } catch (err) {
      /* storage unavailable - keep working in memory */
    }
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 't-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function getTask(id) {
    for (var i = 0; i < state.tasks.length; i++) {
      if (state.tasks[i].id === id) return state.tasks[i];
    }
    return null;
  }

  function visibleTasks() {
    if (state.filter === 'active') {
      return state.tasks.filter(function (t) { return !t.completed; });
    }
    if (state.filter === 'completed') {
      return state.tasks.filter(function (t) { return t.completed; });
    }
    return state.tasks.slice();
  }

  function addTask(text) {
    var value = text.trim();
    if (!value) return;
    state.tasks.unshift({
      id: createId(),
      text: value,
      completed: false,
      createdAt: Date.now()
    });
    saveTasks();
    render();
  }

  function toggleTask(id) {
    var task = getTask(id);
    if (!task) return;
    task.completed = !task.completed;
    saveTasks();
    render();
  }

  function deleteTask(id) {
    state.tasks = state.tasks.filter(function (t) { return t.id !== id; });
    saveTasks();
    render();
  }

  function clearCompleted() {
    state.tasks = state.tasks.filter(function (t) { return !t.completed; });
    saveTasks();
    render();
  }

  function renameTask(id, text) {
    var task = getTask(id);
    var value = text.trim();
    if (!task) return;
    if (!value) {
      deleteTask(id);
      return;
    }
    task.text = value;
    saveTasks();
    render();
  }

  function setFilter(filter) {
    state.filter = filter;
    render();
  }

  function render() {
    var items = visibleTasks();
    var fragment = document.createDocumentFragment();

    items.forEach(function (task) {
      fragment.appendChild(buildTask(task));
    });

    el.list.replaceChildren(fragment);

    var activeCount = state.tasks.filter(function (t) { return !t.completed; }).length;
    var completedCount = state.tasks.length - activeCount;

    el.filters.querySelectorAll('.filter').forEach(function (btn) {
      var isActive = btn.dataset.filter === state.filter;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });

    el.filters.querySelector('[data-count="all"]').textContent = state.tasks.length;
    el.filters.querySelector('[data-count="active"]').textContent = activeCount;
    el.filters.querySelector('[data-count="completed"]').textContent = completedCount;

    el.empty.classList.toggle('is-visible', items.length === 0);
    setEmptyCopy();

    if (state.tasks.length === 0) {
      el.summary.textContent = 'No tasks yet';
    } else if (activeCount === 0) {
      el.summary.textContent = 'All ' + state.tasks.length + ' tasks completed';
    } else {
      el.summary.textContent = activeCount + (activeCount === 1 ? ' task' : ' tasks') + ' left';
    }

    el.clearCompleted.disabled = completedCount === 0;
  }

  function setEmptyCopy() {
    if (state.filter === 'active') {
      el.emptyTitle.textContent = state.tasks.length ? 'All caught up' : 'Nothing to do';
      el.emptyHint.textContent = state.tasks.length
        ? 'Every task is completed — nice work.'
        : 'Add your first task above to get started.';
    } else if (state.filter === 'completed') {
      el.emptyTitle.textContent = 'Nothing completed yet';
      el.emptyHint.textContent = 'Finished tasks will be listed here.';
    } else {
      el.emptyTitle.textContent = 'Nothing to do';
      el.emptyHint.textContent = 'Add your first task above to get started.';
    }
  }

  function buildTask(task) {
    var li = document.createElement('li');
    li.className = 'task' + (task.completed ? ' is-done' : '');
    li.dataset.id = task.id;

    var check = document.createElement('button');
    check.type = 'button';
    check.className = 'task-check';
    check.title = task.completed ? 'Mark as active' : 'Mark as completed';
    check.setAttribute('aria-label', check.title);
    check.setAttribute('aria-pressed', String(task.completed));
    check.innerHTML = CHECK_ICON;

    var text = document.createElement('span');
    text.className = 'task-text';
    text.textContent = task.text;
    text.title = 'Double-click to edit';

    var actions = document.createElement('div');
    actions.className = 'task-actions';

    var edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'icon-btn';
    edit.dataset.action = 'edit';
    edit.title = 'Edit task';
    edit.setAttribute('aria-label', 'Edit task');
    edit.innerHTML = EDIT_ICON;

    var remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'icon-btn danger';
    remove.dataset.action = 'delete';
    remove.title = 'Delete task';
    remove.setAttribute('aria-label', 'Delete task');
    remove.innerHTML = TRASH_ICON;

    actions.appendChild(edit);
    actions.appendChild(remove);

    li.appendChild(check);
    li.appendChild(text);
    li.appendChild(actions);

    return li;
  }

  function startEditing(li) {
    var task = getTask(li.dataset.id);
    if (!task) return;

    var text = li.querySelector('.task-text');
    var input = document.createElement('input');
    input.className = 'task-edit';
    input.type = 'text';
    input.maxLength = 200;
    input.value = task.text;

    var finished = false;
    function commit(save) {
      if (finished) return;
      finished = true;
      if (save) {
        renameTask(task.id, input.value);
      } else {
        render();
      }
    }

    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        commit(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        commit(false);
      }
    });
    input.addEventListener('blur', function () { commit(true); });

    text.replaceWith(input);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  el.form.addEventListener('submit', function (event) {
    event.preventDefault();
    addTask(el.input.value);
    el.input.value = '';
    el.input.focus();
  });

  el.filters.addEventListener('click', function (event) {
    var btn = event.target.closest('.filter');
    if (!btn) return;
    setFilter(btn.dataset.filter);
  });

  el.list.addEventListener('click', function (event) {
    var li = event.target.closest('.task');
    if (!li) return;

    if (event.target.closest('.task-check')) {
      toggleTask(li.dataset.id);
      return;
    }

    var action = event.target.closest('[data-action]');
    if (!action) return;
    if (action.dataset.action === 'delete') deleteTask(li.dataset.id);
    if (action.dataset.action === 'edit') startEditing(li);
  });

  el.list.addEventListener('dblclick', function (event) {
    if (!event.target.closest('.task-text')) return;
    var li = event.target.closest('.task');
    if (li) startEditing(li);
  });

  el.clearCompleted.addEventListener('click', clearCompleted);

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (err) {
      /* ignore */
    }
  }

  (function initTheme() {
    var saved = null;
    try {
      saved = localStorage.getItem(THEME_KEY);
    } catch (err) {
      saved = null;
    }
    var theme = saved || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  })();

  el.themeToggle.addEventListener('click', function () {
    var current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  render();
})();
