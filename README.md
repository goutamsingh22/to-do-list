# To-Do List

A clean task manager that runs entirely in the browser. No build step, no backend, no dependencies at runtime.

## Features

- **Add** tasks from the input box (press `Enter` or click **Add**)
- **Complete** / un-complete a task with the checkbox
- **Delete** a task with the trash icon
- **Edit** a task by double-clicking its text (`Enter` saves, `Esc` cancels)
- **Filter** by All / Active / Completed, with live counts per filter
- **Clear completed** removes every finished task at once
- **Persistence**: tasks are saved to `localStorage` and restored on reload
- Dark / light theme toggle (remembered)
- Responsive layout, keyboard accessible, empty states per filter

## Run

Just open `public/index.html` in a browser, or serve locally:

```bash
npm start
```

Then visit http://localhost:3000

## Test

The test suite runs the real `app.js` against a headless DOM:

```bash
npm install
npm test
```

## Project structure

```
to-do-list/
├── package.json
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
└── test/
    └── todo.test.cjs
```

## Storage

Tasks are stored under the `taskly.tasks.v1` key as JSON:

```json
[{ "id": "...", "text": "Buy milk", "completed": false, "createdAt": 1730000000000 }]
```

Corrupted or malformed stored data is discarded safely, and the app keeps working in memory if `localStorage` is unavailable (private browsing, blocked storage).
