# Terigent

Terigent is a fictional project-management SaaS landing page created for the VOLTIX Full Stack Developer Internship Task 1. The name combines **Terrific** and **Diligent**, reflected in the brand promise: **“Plan diligently. Achieve terrifically.”**

The page is a responsive React application with a fully interactive, browser-persisted task-board preview. All product and interface copy is in English.

## Features

- Responsive navigation, hero, features, workflow, benefits, contact, and footer sections
- Interactive three-column task board: Not Started, In Progress, and Completed
- Add tasks with title, description, status, priority, deadline, reminder, assignee, and project
- Move tasks through statuses, mark them complete, reopen them, or delete them
- Deadline indicators for tasks due soon or overdue
- Basic required-field, email, and title-length validation
- Demo tasks persisted in `localStorage`
- Resettable demo state
- Mobile, tablet, and desktop layouts
- Reduced-motion accessibility support and semantic landmarks

## Tech stack

- React
- Vite
- Plain CSS
- React Icons
- LocalStorage (front-end demo persistence)

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To create a production build:

```bash
npm run build
npm run preview
```

Automated responsive and console verification (uses an installed Google Chrome):

```bash
npm run verify:ui
```

## Project structure

```text
src/
├── components/        # Independent landing-page and task-board UI components
├── data/              # Seed/demo data
├── hooks/             # Reusable browser persistence hook
├── styles/            # Global design system and responsive styles
├── App.jsx             # Page composition
└── main.jsx            # React entry point
```

Task state is intentionally isolated inside `TaskBoard`, while persistence lives in `useLocalStorage`. This keeps the UI components reusable and makes the browser data layer easy to replace with an API client later.

## Future FastAPI and PostgreSQL integration

1. Add a `src/services/api.js` module that exposes task functions such as `listTasks`, `createTask`, `updateTask`, and `deleteTask`.
2. Replace `useLocalStorage` calls in `TaskBoard` with those service functions (or a server-state library such as TanStack Query).
3. Create a FastAPI application with `/api/tasks` CRUD endpoints and Pydantic request/response schemas matching the current task shape.
4. Model users, projects, tasks, assignments, and reminders in PostgreSQL; use SQLAlchemy and Alembic for persistence and migrations.
5. Configure Vite with an environment-based API URL (`VITE_API_BASE_URL`) and configure CORS in FastAPI for the deployed front end.
6. Add authentication and ownership checks only when user accounts become part of the product scope.

## Future reminder system

The current reminder field stores the user's preference but intentionally sends no notification. A production version could store a computed `remind_at` timestamp in PostgreSQL. FastAPI would enqueue scheduled jobs through Celery/RQ with Redis, or a managed task queue. A worker would deliver email or push notifications, record delivery status, and retry transient failures. Store timestamps in UTC and convert them using each user's timezone. Browser notifications would also require explicit permission and a service worker.

## Scope

This Task 1 implementation intentionally does not include accounts, authentication, a backend, a database, email delivery, or real notifications. The contact form is a UI demonstration and does not transmit data.
