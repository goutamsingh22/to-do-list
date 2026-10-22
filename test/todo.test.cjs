const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const APP_DIR = path.join(__dirname, '..', 'public');
const APP_JS = fs.readFileSync(path.join(APP_DIR, 'app.js'), 'utf8');
const INDEX_HTML = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');

function boot(seed) {
  const dom = new JSDOM(INDEX_HTML, {
    runScripts: 'dangerously',
    url: 'http://localhost/',
    pretendToBeVisual: true
  });
  const { window } = dom;
  if (seed) window.localStorage.setItem('taskly.tasks.v1', seed);
  window.eval(APP_JS);
  return window;
}

function rows(window) {
  return [...window.document.querySelectorAll('#todo-list .task')].map((li) => ({
    id: li.dataset.id,
    text: li.querySelector('.task-text').textContent,
    done: li.classList.contains('is-done')
  }));
}

function add(window, text) {
  const input = window.document.getElementById('todo-input');
  input.value = text;
  window.document
    .getElementById('todo-form')
    .dispatchEvent(new window.Event('submit', { cancelable: true, bubbles: true }));
}

function click(window, selector, scope) {
  (scope || window.document).querySelector(selector).dispatchEvent(
    new window.MouseEvent('click', { bubbles: true, cancelable: true })
  );
}

function filter(window, name) {
  click(window, `.filter[data-filter="${name}"]`);
}

const count = (window, name) =>
  Number(window.document.querySelector(`[data-count="${name}"]`).textContent);

let failures = 0;
function check(label, fn) {
  try {
    fn();
    console.log(`  ok  ${label}`);
  } catch (err) {
    failures++;
    console.log(`FAIL  ${label}\n      ${err.message}`);
  }
}

console.log('to-do list smoke tests');

check('starts empty', () => {
  const w = boot();
  assert.strictEqual(rows(w).length, 0);
  assert.strictEqual(count(w, 'all'), 0);
  assert.ok(w.document.getElementById('empty-state').classList.contains('is-visible'));
});

check('adds a task and clears the input', () => {
  const w = boot();
  add(w, 'Buy milk');
  assert.deepStrictEqual(rows(w).map((r) => r.text), ['Buy milk']);
  assert.strictEqual(w.document.getElementById('todo-input').value, '');
  assert.strictEqual(count(w, 'all'), 1);
  assert.strictEqual(count(w, 'active'), 1);
});

check('ignores blank input', () => {
  const w = boot();
  add(w, '   ');
  assert.strictEqual(rows(w).length, 0);
});

check('completes a task', () => {
  const w = boot();
  add(w, 'Write docs');
  click(w, '.task-check');
  assert.strictEqual(rows(w)[0].done, true);
  assert.strictEqual(count(w, 'active'), 0);
  assert.strictEqual(count(w, 'completed'), 1);
  assert.strictEqual(w.document.getElementById('summary').textContent, 'All 1 tasks completed');
});

check('un-completes a task', () => {
  const w = boot();
  add(w, 'Write docs');
  click(w, '.task-check');
  click(w, '.task-check');
  assert.strictEqual(rows(w)[0].done, false);
  assert.strictEqual(count(w, 'active'), 1);
});

check('filters active / completed / all', () => {
  const w = boot();
  add(w, 'One');
  add(w, 'Two');
  click(w, '.task-check', w.document.querySelectorAll('#todo-list .task')[0]);

  filter(w, 'completed');
  assert.deepStrictEqual(rows(w).map((r) => r.text), ['Two']);

  filter(w, 'active');
  assert.deepStrictEqual(rows(w).map((r) => r.text), ['One']);

  filter(w, 'all');
  assert.strictEqual(rows(w).length, 2);
  assert.ok(w.document.querySelector('.filter[data-filter="all"]').classList.contains('is-active'));
});

check('deletes a task', () => {
  const w = boot();
  add(w, 'Temp');
  click(w, '[data-action="delete"]');
  assert.strictEqual(rows(w).length, 0);
  assert.strictEqual(count(w, 'all'), 0);
});

check('clears completed tasks', () => {
  const w = boot();
  add(w, 'Keep');
  add(w, 'Drop');
  click(w, '.task-check', w.document.querySelectorAll('#todo-list .task')[0]);
  w.document.getElementById('clear-completed').dispatchEvent(
    new w.Event('click', { bubbles: true })
  );
  assert.deepStrictEqual(rows(w).map((r) => r.text), ['Keep']);
});

check('persists tasks to localStorage', () => {
  const w = boot();
  add(w, 'Persisted');
  click(w, '.task-check');
  const saved = JSON.parse(w.localStorage.getItem('taskly.tasks.v1'));
  assert.strictEqual(saved.length, 1);
  assert.strictEqual(saved[0].text, 'Persisted');
  assert.strictEqual(saved[0].completed, true);
  assert.ok(saved[0].id);
});

check('restores tasks on reload', () => {
  const w = boot();
  add(w, 'One');
  add(w, 'Two');
  const saved = w.localStorage.getItem('taskly.tasks.v1');

  const w2 = boot(saved);
  assert.deepStrictEqual(rows(w2).map((r) => r.text), ['Two', 'One']);
  assert.strictEqual(count(w2, 'all'), 2);
});

check('restores completion state on reload', () => {
  const w = boot();
  add(w, 'Done thing');
  click(w, '.task-check');
  const saved = w.localStorage.getItem('taskly.tasks.v1');

  const w2 = boot(saved);
  assert.strictEqual(rows(w2)[0].done, true);
  assert.strictEqual(count(w2, 'completed'), 1);
});

check('renames a task via double-click', () => {
  const w = boot();
  add(w, 'Old name');
  const text = w.document.querySelector('.task-text');
  text.dispatchEvent(new w.MouseEvent('dblclick', { bubbles: true, cancelable: true }));

  const input = w.document.querySelector('.task-edit');
  assert.ok(input, 'edit input should be created');
  input.value = 'New name';
  input.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

  assert.deepStrictEqual(rows(w).map((r) => r.text), ['New name']);
  assert.strictEqual(JSON.parse(w.localStorage.getItem('taskly.tasks.v1'))[0].text, 'New name');
});

check('cancels rename on Escape', () => {
  const w = boot();
  add(w, 'Keep me');
  const text = w.document.querySelector('.task-text');
  text.dispatchEvent(new w.MouseEvent('dblclick', { bubbles: true, cancelable: true }));
  const input = w.document.querySelector('.task-edit');
  input.value = 'Discarded';
  input.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.deepStrictEqual(rows(w).map((r) => r.text), ['Keep me']);
});

check('survives corrupted storage', () => {
  const w = boot('{not json');
  assert.strictEqual(rows(w).length, 0);
});

check('drops malformed stored tasks', () => {
  const w = boot(JSON.stringify([{ id: 'a', text: 'Valid', completed: false }, { id: 'b', text: '  ' }, null]));
  assert.deepStrictEqual(rows(w).map((r) => r.text), ['Valid']);
});

check('toggles theme and remembers it', () => {
  const w = boot();
  const toggle = w.document.getElementById('theme-toggle');
  assert.strictEqual(w.document.documentElement.getAttribute('data-theme'), 'dark');
  toggle.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  assert.strictEqual(w.document.documentElement.getAttribute('data-theme'), 'light');
  assert.strictEqual(w.localStorage.getItem('taskly.theme'), 'light');
});

console.log(failures ? `\n${failures} test(s) failed` : '\nall tests passed');
process.exit(failures ? 1 : 0);
