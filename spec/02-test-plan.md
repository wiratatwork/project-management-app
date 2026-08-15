# 02 — Test Plan: ProjectFlow Backend

> แผนการทดสอบ + ตารางความครอบคลุม ใช้เป็นหลักฐานว่า "ฟีเจอร์ใดถูกเทสต์แล้ว"
> ถ้าเทสต์ตัวหนึ่งล้มหลังแก้โค้ด → ดูตารางนี้ว่าเทสต์นั้นดูแลเรื่องอะไร แล้วแก้ให้ตรง

## 1. วิธีรัน

```bash
cd backend

npm test              # เตรียม test db (สร้าง/migrate/seed อัตโนมัติ) + รันเทสต์ทั้งหมด
npm run test:coverage # เหมือน npm test + รายงาน coverage (vitest --coverage)
npm run test:watch    # รันแบบ watch (เตรียม test db ก่อน แล้วค่อย vitest)
```

> เทสต์ integration ใช้ **`project_management_test`** เสมอ (ดู `scripts/prepare-test-db.js`)
> ต้องการแค่ postgres container รันอยู่: `docker compose up -d postgres`

**Frontend (component logic — ไม่ต้อง Docker/db):**

```bash
cd frontend
npm install   # ครั้งแรก (vitest + jsdom)
npm test      # vitest run — 5 ไฟล์ / 44 เทสต์ (table, gantt, avatars, ganttFilter, router)
```

## 1.1 CI — GitHub Actions (อัตโนมัติทุก push)

`.github/workflows/ci.yml` รันอัตโนมัติทุก push / pull request (3 jobs รันขนานกัน):

- **backend-tests** — `docker compose up -d postgres` → `npm ci` → `npx prisma generate` → `npm test`
- **frontend-tests** — `npm ci` → `npm test` (vitest + jsdom, ไม่ต้อง Docker)
- **docker-build** — `docker compose build` (backend + frontend) แล้ว smoke test: up ทั้ง stack,
  curl `/api/health` ผ่าน backend (`:3000`) และ nginx (`:8080`) แล้ว `docker compose down -v`

> กติกาเดียวกับ spec: commit ที่ทำให้ CI แดง ต้องแก้ก่อน merge

## 2. โครงสร้างชุดเทสต์

```
backend/tests/
├── unit/                        # ไม่แตะ DB — ทดสอบ util / middleware ล้วนๆ
│   ├── delay.test.js            # overdue, delayed, schedule status (ON_TRACK/AT_RISK/DELAYED)
│   ├── dependency.test.js       # buildGraph, wouldCreateCycle
│   ├── progress.test.js         # completed-count + weighted progress
│   ├── risk.test.js             # riskScore + riskLevel
│   ├── dateUtils.test.js        # toDateKey/todayUtc/normalizeDate/isSameOrBefore/isBeforeToday
│   ├── pagination.test.js       # parsePagination/buildOrderBy/buildSearchWhere/pageEnvelope
│   ├── ids.test.js              # parseId (บวก/ลบ/ทศนิยม/ตัวอักษร)
│   ├── auth.middleware.test.js  # requireAuth: ไม่มี header/รูปแบบผิด/token ผิด/หมดอายุ/ถูกต้อง
│   ├── validate.middleware.test.js # zod middleware: ผ่าน/ไม่ผ่าน/coerce/details mapping
│   └── errorHandler.test.js     # AppError/error ธรรมดา/Prisma P2xxx/JSON parse error/headersSent
└── integration/                 # ต้องใช้ test DB (Supertest ต่อ Express app จริง)
    ├── api.test.js              # หลัก: auth, project/task/risk CRUD, dependency, pagination, dashboard, gantt
    ├── security.test.js         # health, 404, invalid JSON, auth header edge, expired token, rate limit, parseId
    ├── stakeholders.test.js     # CRUD, duplicate email, cascade ตอนลบ (project/task links + risk owner)
    ├── priorities.test.js       # CRUD, duplicate name/level, ลบ priority ที่มี task ใช้ → 409
    ├── validation.test.js       # zod edge: required fields, enums, unknown FK, reorder, pagination clamp
    └── dashboard-gantt.test.js  # dashboard/projects|risks, gantt 404/ว่าง/รวม schedule
```

**Frontend (vitest + jsdom — ไม่แตะ backend/db):**

```
frontend/tests/
├── setup.js            # polyfill เล็กน้อย (เช่น CSS.escape) สำหรับ jsdom
├── table.test.js       # DataTable: checkbox column, select-all, bulk delete flow (ดู coverage matrix แถว 30)
├── gantt.test.js       # GanttChart: stakeholder avatars — ตัวย่อ, overflow +N, tooltip, สี deterministic (แถว 31)
├── avatars.test.js     # component กลาง avatar: initialsOf + avatarGroup (ตัวย่อ, +N, tooltip, สี, size) (แถว 32)
├── ganttFilter.test.js  # filterGanttGroups + scheduleOf + personSummaryHtml — กรองตามคน/โปรเจกต์/status,
│                        #   สรุปต่อคน (N งาน · M โปรเจกต์ · เสี่ยง/delay) (แถว 33)
└── router.test.js      # getCurrentRoute: query params ใน hash (#/gantt?stakeholder=331) (แถว 33)
```

`tests/integration/helpers.js` — ฟังก์ชันร่วม: `login()`, `auth()`, `iso(n)`, `weekendISO()`,
`createProject()`, `createTask()`, `createRisk()`, `createStakeholder()`, `createPriority()`
(ทุกตัวสร้างข้อมูลแบบสุ่มไม่ซ้ำ + ลบเองใน afterAll ตาม prefix `T-<timestamp>`)

## 3. Coverage Matrix (ฟีเจอร์ ↔ เทสต์)

| # | ฟีเจอร์ / กติกา | ไฟล์เทสต์ | เทสต์ครอบคลุมอะไร |
| --- | --- | --- | --- |
| 1 | Login + JWT | `security.test.js`, `api.test.js` | login สำเร็จ/รหัสผิด, ไม่มี token, header ผิด, token ปลอม/หมดอายุ, rate limit login |
| 2 | Health | `security.test.js` | `GET /api/health` ไม่ต้อง auth |
| 3 | 404 + envelope | `security.test.js` | route ไม่มี → `{success:false, error.code:NOT_FOUND}` |
| 4 | Body JSON ผิด | `security.test.js` | `INVALID_JSON` 400 |
| 5 | `:id` ไม่ถูกต้อง | `security.test.js` | `abc`/`0`/`-5` → 400 VALIDATION_ERROR |
| 6 | Project CRUD | `api.test.js` | create/read/update/delete, 404 หลังลบ |
| 7 | Project validate | `validation.test.js` | field ครบ/status ผิด/progress เกิน/วันเสาร์-อาทิตย์/ช่วงวันที่ |
| 8 | Duplicate project code | `api.test.js` | 409 CONFLICT |
| 9 | Stakeholder ของ project | `stakeholders.test.js` | assign ตอน create/update (แทนที่ทั้งชุด), id ไม่มีอยู่ → 400 |
| 10 | Project detail shape | `api.test.js`, `validation.test.js` | tasks/risks/stakeholders, plannedDurationDays, taskCount/riskCount |
| 11 | Task CRUD | `api.test.js` | create/read/update/delete, 404 |
| 12 | Task validate | `validation.test.js` | priorityId ไม่มี, stakeholder ไม่มี, dependency ต่างโปรเจกต์, reorder เปล่า |
| 13 | Auto task code | `api.test.js` | `{code}-001..`, ไม่ reuse หลังลบ, รับ code ที่ส่งมาเอง |
| 14 | Progress อัตโนมัติ | `api.test.js` | 1/2 → 50, จบทั้งคู่ → 100, ย้าย task ข้ามโปรเจกต์คำนวณทั้งสองฝั่ง |
| 15 | Task → COMPLETED | `api.test.js` | progress=100 อัตโนมัติ, actualEndDate=today, ไม่ re-stamp ตอนแก้ทีหลัง |
| 16 | Overdue task | `api.test.js` | overdue=true/false ตามเงื่อนไข |
| 17 | Dependencies | `api.test.js` | self/cycle ตรง/cycle อ้อม/ข้ามโปรเจกต์/ย้ายพร้อม dep/ย้ายแล้ว dep ไม่ครบ → 400 |
| 18 | Reorder | `api.test.js` | เรียงใหม่ได้, partial/duplicate → 400 |
| 19 | Risk CRUD + score | `api.test.js` | create/update คำนวณ riskScore, probability เกินช่วง → 400 |
| 20 | Risk resolvedDate | `validation.test.js` | MITIGATED/CLOSED → ตั้ง resolvedDate, OPEN → เคลียร์, resolvedDate < identifiedDate → 400 |
| 21 | Stakeholder CRUD | `stakeholders.test.js` | create/update/delete/get/list, email ซ้ำ → 409, email ผิด → 400 |
| 22 | Stakeholder cascade | `stakeholders.test.js` | ลบแล้ว project/task links หาย, risk owner = NULL |
| 23 | Priority CRUD | `priorities.test.js` | list เรียงตาม level, create/update, name/level ซ้ำ → 409, level ผิดช่วง → 400 |
| 24 | ลบ priority ที่ใช้อยู่ | `priorities.test.js` | 409 CONFLICT |
| 25 | Pagination/search/sort | `api.test.js`, `validation.test.js` | envelope, plain array, search insensitive, clamp page/limit |
| 26 | Dashboard | `api.test.js`, `dashboard-gantt.test.js` | summary, tasks, projects, risks + matrix |
| 27 | Gantt | `api.test.js`, `dashboard-gantt.test.js` | project gantt, global gantt, schedule รวม, 404 |
| 28 | Utils (delay/dependency/progress/risk/date/pagination/ids) | `unit/*` | ดูหัวข้อ 2 |
| 29 | Middleware (auth/validate/errorHandler) | `unit/*` | ดูหัวข้อ 2 |
| 30 | Bulk select/delete (UI) — checkbox column, select-all, ลบเป็นชุด | `frontend/tests/table.test.js` + manual (03 C.1) | column แรกคงที่ (non-reorder/resize/sort), เลือกทีละแถว/ทั้งหมด/mixed, ปุ่ม Delete selected (N), confirm dialog + ข้อความ custom, onBulkDelete ได้รับ ids ถูกต้อง, cancel → ไม่ลบ, error → toast + reload, checkbox ไม่ trigger row click, reload เคลียร์ selection |
| 31 | Gantt — stakeholder avatars (UI) | `frontend/tests/gantt.test.js` + manual (03 C.2) | วง avatar + ตัวย่อถูกต้อง, task ไม่มี stakeholder → ไม่มีวง, >3 คน → +N, tooltip มีชื่อ+role, สีเดียวกันเมื่อ stakeholder id เดียวกัน, แสดงใน global mode ด้วย |
| 32 | Avatar component กลาง + ตาราง Projects/Tasks/Risks/Stakeholders | `frontend/tests/avatars.test.js` + manual (03 C.3) | initialsOf ถูกต้อง, รับ []/null → '', +N, tooltip ชื่อ+role, สี deterministic (ทั้ง stakeholderId และ id), size sm; ตาราง Projects/Tasks มีคอลัมน์ People, ตาราง Stakeholders มีคอลัมน์ People (avatar ของตัวเอง), คอลัมน์ Owner ของ Risks แสดงวง + ชื่อ |
| 33 | Stakeholders → Gantt deep link (คลิกแถว → กรองตามคน) + summary บรรทัดเดียว | `frontend/tests/ganttFilter.test.js`, `frontend/tests/router.test.js` + manual (03 C.4) | filterGanttGroups: กรองเฉพาะงานของคนนั้น, ตัดโปรเจกต์ที่ไม่มีงานของเขา, รวมกับ projectId/status, _total คงเดิม; scheduleOf นับจากกลุ่มที่กรองแล้ว; personSummaryHtml: แสดง N งาน · M โปรเจกต์, เสี่ยง/delay ขึ้นสีเมื่อ >0 และเทาเมื่อ 0; router: แยก query string เป็น params (`#/gantt?stakeholder=331`), รวมกับ path segment |

## 4. หลักการเขียนเทสต์ (สำหรับคนที่มาเพิ่ม)

1. **เทสต์ unit/component** — ไม่ต้อง DB; import ตรงๆ, ใช้ค่า "today" คงที่เพื่อความ deterministic
2. **เทสต์ integration (backend)** — ใช้ `helpers.js`; ข้อมูลที่สร้างต้องมี prefix `T-<timestamp>` เพื่อให้
   `afterAll` ลบได้; **อย่าลบข้อมูล seed** (admin, priorities, stakeholders 5 คน, โปรเจกต์ PRJ-001..003)
   เพราะเทสต์อื่นอาจใช้อยู่
3. ทุกเทสต์ต้อง**คืนค่าเดิม** — อย่าพึ่งลำดับการรันระหว่างไฟล์ (vitest รันแต่ละไฟล์คนละ worker/process)
4. ถ้าทดสอบกติกาที่อิง "วันนี้" ให้ใช้ relative date (`iso(n)`) แทนวันที่ตายตัว
5. เพิ่มฟีเจอร์ใหม่ → เพิ่มแถวในตาราง coverage matrix (หัวข้อ 3) ด้วย
6. **เทสต์ frontend** — mock `ui.js` (confirmDialog/toast) ด้วย `vi.mock`, จำลองการคลิกด้วย
   `element.click()` + รอ async เสร็จ (`await settled()`), จัดการ element ให้ `document.body` เสมอ
   และล้าง DOM ใน `beforeEach`; ถ้าทดสอบ behavior ของ component ที่มีผลต่อหน้าจริง (เช่น ลบข้อมูล)
   ให้ระบุเพิ่มใน `03-regression-checklist.md` ว่าเป็น manual check

## 5. หมายเหตุ

- **Frontend** มีเทสต์อัตโนมัติสำหรับ **component logic** (`frontend/tests/*.test.js` 5 ไฟล์ — vitest + jsdom:
  table, gantt, avatars, ganttFilter, router) ที่รันได้โดยไม่ต้องเปิด browser/db; ส่วน UI เต็มรูปแบบ
  (layout, interaction จริง, dark mode, localStorage view) ยังต้องใช้ manual checklist ใน `03-regression-checklist.md`
- `server.js` (entry point) ไม่ถูก import ในเทสต์ — ปิดใน coverage exclude
- Rate-limit ทดสอบได้เพราะแต่ละ test file มี app instance ของตัวเอง (limiter store แยกกัน)
