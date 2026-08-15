# ProjectFlow — Project Management Web Application

A complete, Dockerized **Project Management System** with a working frontend, REST API,
PostgreSQL database, Gantt charts, dashboards and full CRUD — not a prototype.

![Stack](https://img.shields.io/badge/stack-Node.js%20%7C%20Express%20%7C%20Prisma%20%7C%20PostgreSQL%20%7C%20Docker-blue)

---

## 1. Project Overview

ProjectFlow lets a team manage:

- **Projects** — CRUD, statuses, planned vs actual dates, automatic progress calculation
- **Tasks** — CRUD, priorities, due dates, progress, stakeholders, **dependencies** (managed from each project's **Tasks** tab and directly on the **Gantt chart** — there is no separate Tasks menu)
- **Task dependencies** — finish-to-start links with self-dependency and **circular-dependency prevention**
- **Stakeholders** — a single stakeholder registry shared across projects and tasks (no duplicates), with RACI-style roles on tasks
- **Priorities** — configurable levels (1 = Critical, 2 = High, …), not hard-coded; the New/Edit form's **color field is a swatch picker** — a 16-color preset grid plus a native color wheel, all kept in sync with a hidden input so the chosen value is submitted like any field; the hex code renders as a **read-only plain-text readout** (it's derived from the picker, so it's never a typed input)
- **Risks** — CRUD, `risk_score = probability × impact`, risk matrix, mitigation/contingency plans, owners; the New/Edit form's **Probability, Impact and Status are pill selectors** (Probability/Impact 1–5 green→red dots side-by-side; Status OPEN/MITIGATED/CLOSED/ACCEPTED with status colors) with **no default value** (Probability/Impact required; unselected Status falls back to OPEN) — Identified Date also has no default so a fresh form is never pre-filled. **A risk is always tied to a project**: the New Risk modal (on the global Risks page) opens with a **required Project dropdown** (choose any project; the old "select a project filter first" gate is gone), while Edit and project-page forms lock the project as read-only text
- **Dashboard** — summary cards, project progress, task/risk charts
- **Gantt chart** — planned vs actual timelines, progress overlays, dependency connectors, today marker, **plan-vs-actual delay analysis** (tasks flagged `ON_TRACK` / `AT_RISK` / `DELAYED` with days-late counts), sortable, and **full task CRUD directly from the chart** (New Task button; click a task to edit or delete). On the **global Gantt page** the New Task form forces you to **pick a project yourself** (required select) unless the page is already **filtered down to one project**, in which case that project is fixed
- **Global Gantt page** — every project on one timeline, filterable by **project**, **stakeholder** and **task status**, with switchable **timeline scales** (Day / Week / 2 Weeks / Month / Quarter; compressed views always fill the viewport width so bars and axis labels stay readable); **drag the planned bar** (or its right edge) to reschedule a task, and **drag a task to reorder it within its project** (tasks with dependencies are locked, and cross-project moves are not possible); the task-name column can be **pinned (default, frozen while scrolling), scrolled, or hidden** via the toolbar dropdown and **resized by dragging its right edge** (160–480px), and **zoom in/out buttons** (50%–400%) magnify the timeline on top of the chosen scale — all view settings (scale, sort, column mode/width, zoom) are **remembered in `localStorage`** across pages and sessions, with a **⟲ Reset view** button (shown when the view differs from defaults) to restore everything at once
- **Light theme by default with a Dark mode** — switch via the ☀️/🌙 menu in the top-right of the top bar; your choice is saved in `localStorage` (all colors are CSS variables, so every screen adapts)
- **Breadcrumbs + Back on every page** — a shared component (`frontend/src/js/components/breadcrumbs.js`) injected above all pages shows the trail (e.g. `Home / Projects / <project name>`, with the project name filled in once loaded) plus a **Back button** that goes one level up the app tree (project detail → Projects list, top-level pages → Dashboard; never leaves the app); the Home crumb links back to the dashboard. On the project-detail page the **Projects crumb is a dropdown project switcher** — click it to search and jump straight to any project (list cached 30s, current project highlighted with a check, status color dots, closes on outside click / Escape). The **project sub-tabs (Overview / Tasks / Gantt / Stakeholders / Risks) remember the last-selected tab per project** in `localStorage` (`pm_project_tab_<projectId>`) so a refresh reopens the same tab (falls back to Overview for unknown values)
- **One searchable dropdown everywhere** — every `<select>` in the app (toolbar filters, Gantt scale/sort, all form fields) is the same `Select` component (`frontend/src/js/components/select.js`): type to search/filter options, arrow+enter keyboard navigation, and it exposes the same `value`/`change` API as a native select
- **Overdue tasks flash red** — on the project's Tasks tab and in every Gantt view (project Gantt tab + global Gantt page), a task whose due date has passed (`overdue: true`) gets a **blinking red background** on its whole row (shared `overdue-blink` keyframe; table rows via a `rowClass` hook in the DataTable, Gantt rows via an `overdue` class; blink pauses on hover)
- **One shared DataTable everywhere** — every list screen (Projects, Risks, Stakeholders, Priorities, and the project-detail Tasks/Risks tabs) uses the same `renderDataTable` component (`frontend/src/js/components/table.js`): **server-side pagination** (page + rows-per-page), **search-as-you-type**, and **click-to-sort column headers** — each table gets an API function and the component fetches with `page/limit/search/sortBy/sortDir` (list endpoints return a `{ rows, total, page, limit, totalPages }` envelope when a `page` param is passed, and the plain array otherwise). **Column order is drag-to-reorder**: grab any header (grip icon appears on hover) and drop it on another to swap positions — the order is remembered per table in `localStorage` (`pm_table_cols_<tableKey>`) and reapplied on every visit, with a **"Reset columns" button** in the toolbar that appears only when a custom order is active and restores the default. **Column widths are also draggable** — drag the right edge of any header to resize that column (60–700px), persisted per table in `localStorage` (`pm_table_widths_<tableKey>`) and reapplied on every visit just like the Gantt name-column width
- **Bootstrap Icons (self-hosted)** — the whole UI uses the icon library (`frontend/src/vendor/bootstrap-icons/`, no emoji): navigation, stat cards, theme toggle, buttons, Gantt drag handles/locks/status dots, table sort arrows, etc.
- **Noto Sans Thai** — self-hosted variable font (`frontend/src/fonts/`), applied to the whole UI including buttons and form controls
- **Polished modals & forms** — modals follow the `skills/ui-ux-pro-max` design language: blurred backdrop, layered elevation shadows, 16px radius, entrance animation, icon close button, and `prefers-reduced-motion` respected; focused fields get a visible ring
- **Stakeholder assignment screen** (Project → Stakeholders) — search-as-you-type filter, initials avatars, custom checkboxes with focus rings, live "X of Y assigned" counter, loading state on Save, and helpful empty states — the selection lives in a state set so **searching never loses or accidentally unassigns hidden stakeholders**
- **Project form pills & stakeholder rows** — the New/Edit Project modal uses a **Status pill group** (same `pillGroup` component as the task form, colored per status) and the **Stakeholders** section (renamed from "Assignments") is the **same row-list UI as the task modal**: avatar + name + role line per row with an icon remove button, plus an **Add bar** (searchable select + Add button) — selection is backed by a Set so Save always sends exactly what the user picked, and duplicates are rejected
- **Sectioned task form** — the New/Edit Task modal (shared component behind both the Tasks tab and the Gantt, incl. on the global Gantt page) is grouped into **Details / Schedule / Dependencies / Task Stakeholders** sections with icons and dividers: the **Schedule section splits dates into side-by-side PLAN and ACTUAL cards** (purple/amber headers, shorter labels, optional-actual hints), dependencies use custom checkboxes with a live "X of Y selected" chip and a **search box that filters by task code or name**, and stakeholder rows show **initials avatars + role select + icon remove** (delegated, so dynamically added rows behave identically). **Task codes are auto-generated** as `{ProjectCode}-{NNN}` (e.g. `PRJ-001-004`) from a per-project counter that only ever increments — deleted task codes are **never reused** (delete `PRJ-001-003` and the next task is still `PRJ-001-005`); the New Task form hides the code field entirely, and any value the user cannot edit (Task Code on Edit, a Project locked to the current one) renders as **plain text** rather than a disabled input
- **Status & Priority as pills** — in the task form those two fields are clickable colored pill groups (radio semantics, `:has`-driven highlight, focus rings) instead of dropdowns; the same component covers New and Edit everywhere. **Progress is a pill set 0/20/40/60/80/100** (no slider) coupled with Status: picking **100% auto-sets Status to COMPLETED and locks it** (with a hint), picking **COMPLETED auto-sets Progress to 100% and locks it** — lowering progress reverts Status to IN_PROGRESS, leaving COMPLETED drops progress to 80. New tasks open with **no default Priority or Status** — the form requires the user to pick a priority, and an unset status is left to the backend's default (TODO). The **searchable Select portals its panel to `<body>` when opened** (fixed positioning, z-index above the modal backdrop) so the dropdown can never be clipped or hidden behind the modal — with flip-up when near the viewport edge, auto-close on outside click/scroll, and the **panel sized to the trigger but clamped to 220–320px** so an open dropdown never stretches to the full window width nor balloons with long option labels (they ellipsize)
- **No weekend task/project dates** — date pickers revert a Saturday/Sunday pick immediately with an inline error and block submit; Gantt drag-to-reschedule and edge-resize **snap to business days** (Sat → Fri, Sun → Mon); the API rejects weekend dates with 400

Data is persisted in PostgreSQL; every screen reads live data from the API.

## 2. Architecture

```
Browser
   │
   ▼
Frontend container (nginx: static SPA + /api proxy)
   │
   ▼
Backend container (Node.js + Express + Prisma)
   │
   ▼
PostgreSQL container (data persisted in a Docker volume)
```

The backend is a **modular monolith** with a strict layering:

```
Route → Controller → Service → Repository → Prisma → PostgreSQL
```

- **routes** — HTTP wiring + request validation + Swagger annotations
- **controllers** — request/response handling (thin)
- **services** — business logic: dependency cycle detection, progress calculation,
  overdue detection, risk scoring, date validation
- **repositories** — all Prisma data access
- **middleware** — JWT auth, rate limiting, logging, centralized error handling
- **validators** — zod schemas (all critical validation happens server-side)

No business logic lives inside Express routes.

### Repository layout

```
├── docker-compose.yml          # postgres + backend + frontend
├── .env.example                # copy to .env
├── backend/
│   ├── Dockerfile
│   ├── docker-entrypoint.sh    # migrate deploy → seed → start
│   ├── prisma/
│   │   ├── schema.prisma       # full schema with indexes & cascade rules
│   │   ├── migrations/         # committed Prisma migrations
│   │   └── seed.js             # idempotent demo data
│   ├── src/
│   │   ├── app.js / server.js
│   │   ├── config/             # env, swagger/OpenAPI definition
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── middleware/         # auth, validate, rateLimit, errorHandler, requestLogger
│   │   ├── validators/         # zod schemas
│   │   ├── prisma/             # Prisma client instance
│   │   └── utils/              # AppError, delay, progress, dependencyGraph, riskLevel, dates
│   └── tests/                  # unit + integration tests (Vitest)
└── frontend/
    ├── Dockerfile
    ├── nginx.conf              # SPA + /api proxy
    └── src/                    # plain HTML/CSS/JS (ES modules, no build step)
        ├── index.html
        ├── css/styles.css
        └── js/
            ├── app.js          # bootstrap, layout, auth guard
            ├── api.js          # fetch client with JWT
            ├── router.js       # hash router
            ├── components/     # ui (modal/badges/toast), table (DataTable), forms, charts, GanttChart, RiskMatrix
            └── pages/          # Login, Dashboard, Projects, ProjectDetail, Gantt, Stakeholders, Priorities, Risks
```

## 3. Technology Stack

| Layer      | Technology                                             |
| ---------- | ------------------------------------------------------ |
| Backend    | Node.js 22, Express 4                                   |
| ORM        | Prisma 5 (PostgreSQL provider)                          |
| Database   | PostgreSQL 16 (Docker volume persisted)                 |
| Validation | Zod                                                      |
| Auth       | JWT (jsonwebtoken) + bcryptjs password hashing          |
| Security   | Helmet, CORS, express-rate-limit, Prisma (SQL injection safe) |
| Logging    | pino + pino-http (structured JSON, secrets redacted)    |
| Docs       | Swagger UI + OpenAPI 3.0 (swagger-jsdoc)                |
| Frontend   | Vanilla HTML/CSS/JS ES modules (no framework, no build step) |
| Charts     | Hand-rolled SVG/div charts (donut, bars, risk matrix)   |
| Testing    | Vitest + Supertest                                      |
| Containers | Docker Compose (3 services, dedicated network)          |

## 4. Prerequisites

- **Docker** with Docker Compose v2+ (the only requirement — Node.js and PostgreSQL are **not** needed on the host)
- Git (to clone)

## 5. Quick Start

```bash
git clone <repository-url>
cd project-management

cp .env.example .env        # optional — sensible defaults exist

docker compose up -d
```

The backend container automatically applies migrations, seeds demo data, and starts.
First build takes a few minutes; afterwards it is fast.

### Access

| What          | URL                         |
| ------------- | --------------------------- |
| Frontend      | http://localhost:8080       |
| Backend API   | http://localhost:3000/api   |
| Swagger / OpenAPI | http://localhost:8080/api-docs |
| Raw OpenAPI spec | http://localhost:8080/api-docs.json |

**Demo login:** `admin` / `admin123`

> The frontend nginx proxies `/api` to the backend, so the browser talks to one origin.

## 6. Environment Variables

Everything is configurable via the root `.env` (see `.env.example`):

```env
NODE_ENV=development

FRONTEND_PORT=8080
BACKEND_PORT=3000
POSTGRES_PORT=5432

POSTGRES_USER=pm_user
POSTGRES_PASSWORD=pm_password
POSTGRES_DB=project_management

# Used by the backend container (hostname = compose service name)
DATABASE_URL=postgresql://pm_user:pm_password@postgres:5432/project_management

JWT_SECRET=change_this_secret    # ⚠️ change in any real deployment
JWT_EXPIRES_IN=1d

CORS_ORIGIN=*
LOG_LEVEL=info
```

`.env` is git-ignored; the application fails fast in production if `JWT_SECRET` is missing.

## 7. Database

- Schema lives in `backend/prisma/schema.prisma`
- Committed migrations in `backend/prisma/migrations/`
- Tables: `projects`, `tasks`, `task_dependencies`, `stakeholders`,
  `project_stakeholders`, `task_stakeholders`, `priorities`, `risks`, `users` (JWT only)
- Foreign keys with proper cascade behavior:
  - deleting a project cascades to its tasks, risks and links
  - deleting a task cascades its dependencies and stakeholder links
  - deleting a stakeholder removes links (`ON DELETE CASCADE`) and unassigns risk ownership (`SET NULL`)
  - a priority in use by tasks cannot be deleted (`RESTRICT`)
- Indexes on frequently queried fields: `project_id`, `status`, `due_date`,
  `planned_start_date`, `planned_end_date`, `priority_id`, `(probability, impact)`
- Unique constraints: `project_code`, `(project_id, task_code)`, `stakeholder.email`,
  `priority.name`, `priority.level`, `(task_id, depends_on_task_id)`, `(project_id, stakeholder_id)`, `(task_id, stakeholder_id)`

Run migrations manually (only needed when developing on the host):

```bash
cd backend
npx prisma migrate dev            # create + apply a new migration
npx prisma migrate deploy         # apply committed migrations
```

## 8. Seed Data

`backend/prisma/seed.js` is **idempotent** (safe to run repeatedly) and creates:

- 1 demo user (`admin` / `admin123`)
- 4 priorities (Critical 1, High 2, Medium 3, Low 4)
- 5 stakeholders
- 3 projects (one in progress, one planned, one **delayed**)
- 18 tasks with realistic planned/actual dates, priorities, stakeholders and progress
- **task dependencies** (e.g. Requirement Gathering → Database Design → Backend/Frontend → Integration Test → UAT → Deployment)
- 7 risks with computed scores (including a CRITICAL one) and mitigation plans

Dates are generated relative to "today", so the dashboard always shows live
examples of overdue tasks and delayed projects.

```bash
docker compose exec backend node prisma/seed.js
```

## 9. API Documentation

Interactive Swagger UI: **http://localhost:8080/api-docs** (or `http://localhost:3000/api-docs`).

All endpoints (except `POST /api/auth/login` and `GET /api/health`) require:

```
Authorization: Bearer <jwt>
```

### Endpoint overview

```
Auth
  POST /api/auth/login

Dashboard
  GET /api/dashboard/summary
  GET /api/dashboard/projects
  GET /api/dashboard/tasks
  GET /api/dashboard/risks

Projects
  GET    /api/projects
  GET    /api/projects/:id
  POST   /api/projects
  PUT    /api/projects/:id
  DELETE /api/projects/:id

Tasks
  GET    /api/projects/:projectId/tasks
  GET    /api/tasks                (optional ?projectId= & ?status=)
  GET    /api/tasks/:id
  POST   /api/projects/:projectId/tasks
  PUT    /api/tasks/:id
  DELETE /api/tasks/:id

Stakeholders
  GET    /api/stakeholders
  GET    /api/stakeholders/:id
  POST   /api/stakeholders
  PUT    /api/stakeholders/:id
  DELETE /api/stakeholders/:id

Priorities
  GET    /api/priorities
  POST   /api/priorities
  PUT    /api/priorities/:id
  DELETE /api/priorities/:id

Risks
  GET    /api/projects/:projectId/risks
  GET    /api/risks               (optional ?projectId= & ?status=)
  GET    /api/risks/:id
  POST   /api/projects/:projectId/risks
  PUT    /api/risks/:id
  DELETE /api/risks/:id

Gantt
  GET    /api/gantt                  (global — all projects, tasks + schedule summary)
  GET    /api/projects/:projectId/gantt
  PUT    /api/projects/:projectId/tasks/reorder   (persist drag-to-reorder order)
```

### Response envelope

Success:

```json
{ "success": true, "data": { } }
```

Error (centralized handler — no stack traces in production):

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [{ "field": "dueDate", "message": "dueDate must be on or after plannedStartDate" }]
  }
}
```

Common error codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` / `INVALID_TOKEN` (401),
`NOT_FOUND` (404), `CONFLICT` (409), `CIRCULAR_DEPENDENCY` (400), `RATE_LIMITED` (429).

## 10. Business Rules

- **Validation** (server-side, Zod): `plannedStart ≤ plannedEnd`, `dueDate ≥ plannedStart`,
  `actualStart ≤ actualEnd`, `0 ≤ progress ≤ 100`, probability/impact in 1–5, email format,
  etc. The Task and Project modals also **validate date order live** (end-before-start shows
  an inline error on the offending field and blocks submit, with the same PLAN/ACTUAL layout)
- **No weekend dates on tasks/projects**: every task/project date field (`plannedStartDate`,
  `plannedEndDate`, `dueDate`, `actualStartDate`, `actualEndDate`) is rejected on
  Saturday/Sunday (400). The form date pickers **revert a weekend pick immediately** with an
  inline error and block submit; Gantt **drag-to-reschedule and edge-resize snap to business
  days** (Saturday → Friday, Sunday → Monday) so the backend rule can't be violated from the
  chart either. Demo seed data is generated on business days.
- **Project progress** is **auto-calculated** from tasks after every task mutation:
  `completed tasks / total tasks × 100`. The service layer supports weighted progress
  (`SUM(progress × weight) / SUM(weight)`) for later use — see `backend/src/utils/progress.js`.
- **Overdue tasks**: `status ∉ {COMPLETED, CANCELLED} AND dueDate < today`.
- **Delayed projects**: `status ∉ {COMPLETED, CANCELLED} AND plannedEndDate < today`.
  (CANCELLED is intentionally excluded — cancelled work is not "late".)
- **Per-task schedule health** (Gantt + task payloads): each task carries `scheduleStatus`
  (`ON_TRACK` / `AT_RISK` / `DELAYED`), `scheduleDaysLate` and `startedLateDays`.
  A task is `DELAYED` when its planned end has passed unfinished, or when a completed
  task finished after its planned end; `AT_RISK` when it started later than planned or
  has ≤ 7 days left before its planned end; otherwise `ON_TRACK`.
- **Dependencies**: a task cannot depend on itself; dependencies must be in the same
  project; cycles are rejected with `CIRCULAR_DEPENDENCY`.
- **Risk score**: always computed server-side as `probability × impact`.
  Levels: CRITICAL ≥ 16, HIGH 8–15, MEDIUM 4–7, LOW 1–3.
- **Task completion**: marking a task COMPLETED auto-sets progress to 100 and records
  `actualEndDate` if missing.

## 11. Development (host)

The only host tooling needed is Node.js (≥ 20) **and Docker for PostgreSQL**:

```bash
# 1. Start just the database
docker compose up -d postgres

# 2. Backend (localhost DB URL)
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
node prisma/seed.js
npm run dev          # http://localhost:3000

# 3. Frontend (static server proxying /api to :3000)
cd frontend
node dev-server.js   # http://localhost:4173
```

## 12. Testing

```bash
# Unit + integration tests (integration tests need the DB up + seeded)
cd backend
docker compose up -d postgres        # ensure DB is running
npx prisma migrate deploy
node prisma/seed.js
npm test
```

Coverage (41 tests):

- Unit: overdue/delay detection, circular dependency detection, progress
  calculation (completed-count and weighted), risk score + levels
- Integration (Supertest against the real API + PostgreSQL):
  project CRUD, task CRUD, self/indirect dependency rejection, cross-project
  dependency rejection, date validation, automatic progress recalculation,
  overdue flags, risk score computation, dashboard + gantt endpoints, auth

## 13. Production Deployment

For a real deployment:

1. Copy `.env.example` → `.env` and set a strong `JWT_SECRET`, DB credentials, and `CORS_ORIGIN`.
2. `docker compose up -d --build`
3. Put a reverse proxy / TLS terminator in front of the `frontend` service (or publish
   `FRONTEND_PORT=80`).
4. Security is on by default: Helmet headers, CORS restriction, rate limiting
   (300 req/15 min API, 10 login attempts/15 min), input validation, JWT auth,
   bcrypt password hashing, Prisma parameterization, structured logging with
   secrets redacted.

## 14. Known Limitations / Notes

- **Authentication** is minimal by design: a single seeded demo user with JWT login.
  User management / RBAC / notifications / comments / attachments / audit logs are
  explicitly **not** implemented (future work, per the spec).
- Project progress currently uses the completed-task-count strategy; weighted progress
  is implemented in `utils/progress.js` and can be enabled without schema changes.
- The risk matrix shows counts of **open** risks per cell.
- Seed re-syncs dependencies/stakeholder links/risks for the seeded projects only —
  user-created data is never touched.

## 15. Useful Commands

```bash
docker compose up -d                    # start everything
docker compose ps                       # status
docker compose logs -f backend          # backend logs
docker compose exec backend node prisma/seed.js   # reseed
docker compose down                     # stop
docker compose down -v                  # stop + wipe the database volume
```

---

Built with Node.js, Express, Prisma, PostgreSQL, Docker and vanilla JavaScript.
