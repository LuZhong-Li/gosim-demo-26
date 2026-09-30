# Generic Web Scaffold

Single-port React + Express scaffold used as the starting point for a generated
application.

- `frontend/` - Vite + React, built into `frontend/dist`.
- `backend/` - Express, serves `/api/*` and the built frontend on one port.
- The backend listens on `PORT` (default `3000`).

This scaffold intentionally contains **no task-specific pages, routes or business
logic**. It provides the build, routing, static hosting and a small JSON-file
persistence helper; the generating agent writes the application on top of it.

```bash
cd frontend && npm install && npm run build
cd ../backend && npm install && npm start
```
