# 01 — System Analysis: ProjectFlow

> เอกสารวิเคราะห์ระบบ เขียนจากโค้ดจริง (backend) เพื่อใช้อ้างอิงเวลาแก้ไข/ทดสอบ
> วันที่มีผล: อัปเดตล่าสุดตาม commit ปัจจุบัน

## 1. ภาพรวม

ProjectFlow คือ Web Application จัดการโปรเจกต์ (Project Management) แบบ Dockerized ครบวงจร:

- **Frontend** — Vanilla HTML/CSS/JS (ES modules, ไม่มี build step) รันบน nginx
- **Backend** — Node.js 22 + Express 4 + Prisma 5 (PostgreSQL 16)
- **สถาปัตยกรรม**: `Route → Controller → Service → Repository → Prisma → PostgreSQL`

ไม่มี business logic อยู่ใน route — ทั้งหมดอยู่ใน service layer

```
Browser
   │
   ▼
Frontend (nginx: SPA + /api proxy → :3000)
   │
   ▼
Backend (Express + Prisma)
   │
   ▼
PostgreSQL 16 (Docker volume)
```

## 2. โมดูลหลัก (backend/src)

### routes/ — การประกาศเส้นทาง + Swagger annotation
| ไฟล์ | เส้นทาง | หมายเหตุ |
| --- | --- | --- |
| `index.js` | — | `/auth` สาธารณะ, ทุกอย่างที่เหลือผ่าน `requireAuth` |
| `auth.routes.js` | `POST /api/auth/login` | ผ่าน `authLimiter` (10 ครั้ง/15 นาที/IP) |
| `project.routes.js` | `/api/projects`, `/api/projects/:id` | list/get/create/update/delete |
| `task.routes.js` | `/api/projects/:projectId/tasks`, `/api/tasks`, `/api/tasks/:id`, `.../tasks/reorder` | CRUD + reorder |
| `risk.routes.js` | `/api/projects/:projectId/risks`, `/api/risks`, `/api/risks/:id` | CRUD |
| `stakeholder.routes.js` | `/api/stakeholders`, `/api/stakeholders/:id` | CRUD |
| `priority.routes.js` | `/api/priorities`, `/api/priorities/:id` | list/create/update/delete (ไม่มี GET by id) |
| `dashboard.routes.js` | `/api/dashboard/summary|projects|tasks|risks` | 4 endpoints |
| `gantt.routes.js` | `/api/gantt`, `/api/projects/:projectId/gantt` | global + per-project |

> **ลำดับ mount สำคัญ** ใน `routes/index.js`: gantt → task → risk → project → stakeholder → priority → dashboard
> (เส้นทางเฉพาะเจาะจงมากกว่า mount ก่อน)

### controllers/ — รับ-ส่ง HTTP (บางมาก)
- `parseId()` จาก `utils/ids.js` ใช้ทุก endpoint ที่มี `:id` → 400 ถ้าไม่ใช่จำนวนเต็มบวก
- list endpoints เป็น **dual-mode**: ไม่มี `?page` → คืน array ธรรมดา, มี `?page` → คืน
  `{ rows, total, page, limit, totalPages }`
- create → 201, อื่นๆ → 200, envelope `{ success, data }`

### services/ — business logic ทั้งหมด
| ไฟล์ | กติกาหลัก |
| --- | --- |
| `auth.service.js` | bcrypt เปรียบเทียบ, error เดียวกันทั้ง user ไม่มี/รหัสผิด (กัน enumeration), สร้าง JWT `{sub, username}` |
| `project.service.js` | ตรวจ stakeholder ก่อน assign, `recalculateProgress()` หลังสร้าง/แก้ task |
| `task.service.js` | auto task code `{projectCode}-{NNN}` (counter ไม่หด), ตรวจ dependencies (self / duplicate / ต่างโปรเจกต์ / cycle), จัดการ COMPLETED → progress 100 + actualEndDate, ย้ายข้ามโปรเจกต์ + คำนวณ progress ทั้งสองฝั่ง, reorder ต้องครบทุก task |
| `risk.service.js` | `riskScore = probability × impact` เสมอ (คำนวณจากค่าปัจจุบัน), MITIGATED/CLOSED → ตั้ง resolvedDate=today, OPEN → เคลียร์ resolvedDate |
| `stakeholder.service.js` | CRUD ธรรมดา, conflict จาก unique constraint (email) |
| `priority.service.js` | ลบไม่ได้ถ้ามี task ใช้อยู่ (409 CONFLICT) |
| `dashboard.service.js` | ใช้ `isTaskOverdue` / `isProjectDelayed` / `riskLevel` คำนวณ aggregate |
| `gantt.service.js` | รวม schedule health ของ task (`ON_TRACK/AT_RISK/DELAYED`) ต่อโปรเจกต์และรวมทุกโปรเจกต์ |
| `helpers.js` | `assertStakeholdersExist`, `assertPrioritiesExist` → 400 พร้อม list id ที่หายไป |
| `shapers.js` | แปลง record → response shape (เพิ่ม `overdue`, `scheduleStatus`, `riskLevel`, `delayed`, counts, duration days) |

### validators/ — zod schemas (validation ฝั่ง server ทุกจุด)
- **common.js**: enum ทั้งหมด + `refineDateRanges()` — **ห้ามวันเสาร์/อาทิตย์** ในทุก date field,
  `plannedStart ≤ plannedEnd`, `actualStart ≤ actualEnd`
- `task.validator.js`: เพิ่ม `dueDate ≥ plannedStartDate`
- `risk.validator.js`: `resolvedDate ≥ identifiedDate`
- หลัง validate ผ่าน ค่าใน `req.body` จะถูกแทนด้วยค่าที่ parse/coerce แล้ว

### middleware/
| ไฟล์ | หน้าที่ |
| --- | --- |
| `auth.js` | ต้องมี `Authorization: Bearer <jwt>` → 401 UNAUTHORIZED; token ผิด/หมดอายุ → 401 INVALID_TOKEN |
| `validate.js` | safeParse zod → 400 VALIDATION_ERROR พร้อม `details[]` ต่อ field |
| `rateLimiter.js` | API 300/15 นาที, login 10/15 นาที ต่อ IP |
| `errorHandler.js` | map Prisma error (P2002→409, P2025→404, P2003→400, P2014→400), body parse error (INVALID_JSON 400, PAYLOAD_TOO_LARGE 413), ไม่ leak stack ลง response |
| `notFound.js` | 404 `NOT_FOUND` รูปแบบเดียวกับ error อื่น |
| `requestLogger.js` | pino-http, redact password/token/authorization |

### utils/
| ไฟล์ | หน้าที่ |
| --- | --- |
| `delay.js` | `isTaskOverdue`, `isProjectDelayed`, `taskScheduleStatus` (ON_TRACK/AT_RISK/DELAYED + daysLate + startedLateDays, window 7 วัน) |
| `dependencyGraph.js` | `buildGraph`, `wouldCreateCycle` (DFS) |
| `progress.js` | `completedCountProgress` (ค่าเริ่มต้น) + `weightedProgress` (สำรอง) |
| `riskLevel.js` | `riskScore = p×i`, `riskLevel`: CRITICAL ≥16, HIGH ≥8, MEDIUM ≥4, LOW |
| `dateUtils.js` | เปรียบเทียบวันที่แบบ UTC calendar date (ignore เวลา) |
| `ids.js` | `parseId` ตรวจ :id |
| `pagination.js` | `parsePagination` (clamp page ≥1, limit 1..100), `buildOrderBy` (whitelist), `buildSearchWhere` (insensitive), `pageEnvelope` |
| `AppError.js` | error แบบ operational พร้อม code/statusCode/details |

## 3. ข้อมูล (schema.prisma)

| ตาราง | หมายเหตุ |
| --- | --- |
| `User` | แค่ login JWT (admin/admin123 จาก seed) |
| `Project` | `projectCode` unique, `nextTaskNumber` (ตัวนับรหัส task), cascade ไป tasks/risks/links |
| `Task` | `@@unique([projectId, taskCode])`, cascade ไป dependencies/stakeholder links |
| `TaskDependency` | finish-to-start, `@@unique([taskId, dependsOnTaskId])`, cascade ทั้งสองทาง |
| `TaskStakeholder` | `@@unique([taskId, stakeholderId])` |
| `Stakeholder` | `email` unique; ลบ → ล้าง links (cascade) + `ownerStakeholderId` ใน risk กลายเป็น NULL (SetNull) |
| `ProjectStakeholder` | `@@unique([projectId, stakeholderId])` |
| `Priority` | `name` unique, `level` unique; task อ้างอิงด้วย `RESTRICT` → ลบไม่ได้ถ้ามี task ใช้ |
| `Risk` | `riskScore = probability × impact`, index `(probability, impact)` |

## 4. กติกาทางธุรกิจ (ต้องไม่ถูกทำลายเวลาแก้โค้ด)

1. **ห้ามวันเสาร์/อาทิตย์** ในทุก date field ของ project/task (validate + API ตอบ 400)
2. `plannedStart ≤ plannedEnd`, `actualStart ≤ actualEnd`, `dueDate ≥ plannedStart`
3. **Project progress คำนวณอัตโนมัติ** = จำนวน task COMPLETED / task ทั้งหมด × 100
4. **Overdue task** = `status ∉ {COMPLETED, CANCELLED} AND dueDate < today`
5. **Delayed project** = `status ∉ {COMPLETED, CANCELLED} AND plannedEndDate < today`
6. **Task code อัตโนมัติ** `{projectCode}-{NNN}`; counter เพิ่มอย่างเดียว — **ไม่ reuse** รหัสที่ลบไปแล้ว
7. **Dependencies**: ห้าม self, ห้าม duplicate, ต้องอยู่ในโปรเจกต์เดียวกัน, ห้าม cycle
8. **Risk score** คำนวณฝั่ง server เสมอ; ระดับ CRITICAL ≥16 / HIGH 8–15 / MEDIUM 4–7 / LOW 1–3
9. **Task → COMPLETED**: auto progress = 100 + ตั้ง `actualEndDate` ถ้ายังไม่มี; การแก้ task ที่ completed แล้ว **ห้าม re-stamp** actualEndDate
10. **Risk → MITIGATED/CLOSED**: ตั้ง `resolvedDate` ถ้ายังไม่มี; กลับเป็น OPEN → เคลียร์ `resolvedDate`
11. **ลบ priority** ที่มี task ใช้อยู่ → 409; **ลบ stakeholder** → ลบ links ออก + risk owner เป็น NULL
12. **Reorder tasks** ต้องส่ง task ids ครบทุก task ในโปรเจกต์ (partial → 400)
13. **JWT**: ทุก endpoint ยกเว้น `POST /api/auth/login` และ `GET /api/health` ต้องมี Bearer token
14. **Rate limit**: API 300 ครั้ง/15 นาที, login 10 ครั้ง/15 นาที ต่อ IP
15. Task ที่ CANCELLED ไม่นับ overdue/delayed (งานที่ยกเลิกไม่ใช่ "สาย")

## 5. สภาพแวดล้อม & ฐานข้อมูล

- **Docker Compose 3 services**: `postgres` (16-alpine), `backend` (Node 22), `frontend` (nginx)
- ค่าต่างๆ กำหนดผ่าน root `.env` (ดู `.env.example`): `POSTGRES_*`, `JWT_SECRET`, `CORS_ORIGIN`, ports
- Backend container รัน `migrate deploy → seed (เงื่อนไข) → start` อัตโนมัติ —
  seed จะรันเฉพาะตอน **DB ว่าง** (เครื่องใหม่ต้องมี user `admin` ไว้ล็อกอิน) หรือเมื่อตั้ง
  `SEED_ON_START=true`; DB ที่มีข้อมูลแล้วจะ **ไม่ถูก re-seed** อีก ทำให้ demo data
  ไม่กลับมาทุกครั้งที่ restart (`SEED_ON_START=false` = ไม่ seed เลย)
- **DB สำหรับเทสต์แยกจาก db จริง**: เทสต์ใช้ `project_management_test` (สร้าง/migrate/seed อัตโนมัติ
  โดย `npm run db:test:prepare` ก่อน `vitest`) — อ่านเพิ่มใน `02-test-plan.md`
- Demo login: `admin` / `admin123`

## 6. Frontend (เทสต์อัตโนมัติเฉพาะ component logic — UI เต็มรูปแบบใช้ manual checklist)

- `js/api.js` — fetch client + JWT, `js/router.js` — hash router **รองรับ query params ใน hash** (deep link เช่น `#/gantt?stakeholder=331`),
  `js/app.js` — bootstrap/auth guard
- components: `table.js` (DataTable: pagination/search/sort/ลากเรียงคอลัมน์/ปรับความกว้าง + **selectable**),
  `select.js` (dropdown ค้นหาได้), `forms.js` (modal/pill/date picker), `GanttChart.js` (ลาก bar/ปรับขนาด/ซูม),
  `avatars.js` (วงกลมโปรไฟล์กลาง ดู 6.2/6.3), `RiskMatrix.js`, `charts.js`, `ui.js`, `breadcrumbs.js`
- pages: Login, Dashboard, Projects, ProjectDetail (Overview/Tasks/Gantt/Stakeholders/Risks), Gantt (global), Stakeholders, Priorities, Risks
- ฟีเจอร์ฝั่ง UI ที่ backend ตรวจไม่ถึง (ต้องเช็ค manual): การ validate วันที่แบบ live, pill selectors,
  การ snap วันเสาร์/อาทิตย์ใน Gantt drag, dark mode, การจำ view ใน localStorage

### 6.1 Bulk select & delete (checkbox column) — ฟีเจอร์ใน `table.js`

ตารางทุกหน้า**ที่ลบรายการได้**เปิดใช้ `selectable: true` + `onBulkDelete` + `confirmBulkDelete`:

| หน้า | ตาราง | รายการที่ลบเป็นชุดได้ |
| --- | --- | --- |
| Projects | projects | projects |
| Risks | risks | risks |
| Stakeholders | stakeholders | stakeholders |
| Priorities | priorities | priorities |
| Project Detail → Tasks tab | tasks | tasks |
| Project Detail → Risks tab | risks | risks |

**พฤติกรรม (กติกา UI ที่ต้องไม่ถูกทำลาย):**

1. **Column แรกเป็น checkbox คงที่** — ไม่ลากเรียง (non-reorder), ไม่ปรับขนาด (non-resize),
   ไม่ sort, กว้าง 42px จัดกลาง — ใช้ class `dt-check` (ไม่มี `dt-col`/grip/resize handle)
2. **เลือกทีละรายการ** → ติ๊ก checkbox ของแถว; **เลือกทั้งหมด (ทั้งหน้า)** → ติ๊ก header select-all;
   ติ๊กบางส่วน → header เป็นสถานะ mixed (indeterminate)
3. ปุ่ม **"Delete selected (N)"** (สีแดง, ซ่อนเมื่อไม่เลือก) โผล่ใน toolbar — กดแล้วขึ้น confirm dialog
   ข้อความเฉพาะแต่ละ resource (เช่น project เตือนว่า cascade ลบ tasks/risks)
4. **การลบเป็นชุดรันผ่าน endpoint เดิม** — วน `DELETE /api/:resource/:id` แบบ parallel
   (`Promise.allSettled`); ถ้าบางรายการลบไม่ได้ (เช่น priority ที่ task ใช้อยู่ → 409) จะ toast
   "Deleted X of Y — เหตุผล" ส่วนที่เหลือลบต่อ (ไม่ fail ทั้งชุด)
5. **Selection เป็นแบบต่อหน้า (page-scoped)** — เปลี่ยนหน้า/search/reload → เคลียร์ทันที
6. ติ๊ก checkbox **ไม่ trigger row click** (ไม่ navigate) — กดที่ตัวแถวเท่านั้นถึง navigate
7. หลังลบเสร็จ → โหลดตารางใหม่ + เคลียร์ selection; หน้า detail (tasks/risks) รีเฟรช header counts ด้วย

### 6.2 Avatar วงกลมโปรไฟล์ (component กลาง `js/components/avatars.js`)

- `initialsOf(name)` — ตัวย่อ 2 ตัวแรกของชื่อ ("Wirat Sakorn" → `WS`); `avatarGroup(people, {max=3, size})`
  — แสดงวงซ้อนกันสูงสุด `max` วง + badge **"+N"** ถ้าเกิน; tooltip ชื่อ + role ทั้งกลุ่มและรายวง
- สีพื้น/สีตัวอักษร **กำหนดจาก `stakeholderId ?? id` แบบ deterministic** — คนเดียวกันสีเดิมทุกที่
  (จานสี 6 สี: `AVATAR_COLORS`); task/risk ที่**ไม่มีคน → ไม่แสดง**วง (ไม่กินพื้นที่)
- ใช้ร่วมกัน 3 จุด (ดู 6.3): แถว task ใน Gantt, คอลัมน์ People ในตาราง Tasks, คอลัมน์ Owner ในตาราง Risks

### 6.3 ตำแหน่งที่แสดง avatar

| หน้าจอ | ตำแหน่ง | ข้อมูล |
| --- | --- | --- |
| Gantt (หน้าโปรเจกต์ + global) | ขอบขวาของแถวชื่อ task | `task.stakeholders[]` (หลายคน → +N) |
| Project Detail → Tasks tab | คอลัมน์ "People" | `task.stakeholders[]` (หลายคน → +N) |
| Projects (หน้ารวม) | คอลัมน์ "People" | `project.stakeholders[]` (หลายคน → +N) |
| Stakeholders (หน้ารวม) | คอลัมน์ "People" (column แรก) | avatar ของ stakeholder คนนั้นเอง `{id, name}` |
| Risks (global) → ตาราง risks | คอลัมน์ Owner: **วง avatar + ชื่อ** | `risk.owner {id,name,email}` (คนเดียว) |
| Project Detail → Risks tab | คอลัมน์ Owner: **วง avatar + ชื่อ** | `risk.owner {id,name,email}` (คนเดียว) |

- ข้อมูลมาจาก API ที่มีอยู่แล้ว (`shapeTask.stakeholders`, `shapeRisk.owner`) — ไม่ต้องเรียก API เพิ่ม
- ขนาด `avatar-sm` (18px) ใช้ในคอลัมน์ตาราง; วงปกติ (20px) ใช้ใน Gantt

### 6.4 Stakeholders → Gantt (deep link "คนนี้เกี่ยวกับอะไรบ้าง")

- **คลิกที่แถวในหน้า Stakeholders** → ไปที่หน้า Gantt (global) **กรองด้วยบุคคลนั้น** ผ่าน deep link
  `#/gantt?stakeholder=<id>` — ดูว่าเขามีงานอะไรบ้าง ในโปรเจกต์ไหน งานไหน `AT_RISK` (ใกล้ delay)
  และ `DELAYED` (delay แล้ว) ผ่าน schedule chips / สีแถว / variance note
- **Router** รับ query string ใน hash (`getCurrentRoute`) → `params.stakeholder` ส่งเข้า `GanttPage.mount`
  → ตั้ง `filters.stakeholderId` เริ่มต้น
- **Filter logic** อยู่ใน `js/pages/ganttFilter.js` (pure function `filterGanttGroups` + `scheduleOf`):
  กรองงานที่ `t.stakeholders` มีคนนั้นอยู่; โปรเจกต์ที่ไม่มีงานของเขาจะถูกตัดออก; `_total` เก็บจำนวนเต็มเดิม
  (ข้อมูลเดิมทุกงานของโปรเจกต์) — ใช้ร่วมกับ filter project/status ที่มีอยู่
- เมื่อกรองด้วยคน → มี **chip แสดงชื่อ + avatar + ปุ่ม ✕** ใน filter bar + **summary บรรทัดเดียว**
  (`personSummaryHtml`): `N งาน · M โปรเจกต์` + `● เสี่ยง X · ● delay แล้ว Y` — ตัวเลขเสี่ยง/delay
  ขึ้นสีส้ม/แดง (และจุดสีตาม) เฉพาะเมื่อ > 0, เทาเมื่อเป็น 0; การเปลี่ยน/ล้างคน sync กลับไปที่ URL
  (`history.replaceState` ไม่รีเฟรชหน้า) ให้ refresh แล้วยังกรองเหมือนเดิม
- หน้า Stakeholders: `onRowClick` บนตาราง (คลิกแถว → navigate; ปุ่ม Edit/Delete/checkbox ยังทำงานปกติ)

## 7. เอกสารอ้างอิงอื่น

- `README.md` (root) — quick start, env vars, API docs, deployment
- Swagger UI: `http://localhost:8080/api-docs` หรือ `http://localhost:3000/api-docs`
