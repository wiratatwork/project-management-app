# 03 — Regression Checklist

> ใช้ตรวจหลังแก้โค้ดทุกครั้ง: รันเทสต์อัตโนมัติก่อน แล้วสุ่มเช็ค manual ที่จำเป็น
> ✅ = ผ่าน / ❌ = พัง (ต้องแก้ก่อนปล่อย)

## A. อัตโนมัติ (ต้องผ่านทุกครั้ง)

- [ ] `docker compose up -d postgres` — postgres รันอยู่
- [ ] `cd backend && npm test` — เทสต์ทั้งหมดผ่าน (unit + integration)
- [ ] (แนะนำ) `npm run test:coverage` — coverage ไม่ลดลงแบบมีนัยสำคัญเมื่อเทียบกับเดิม
- [ ] `cd frontend && npm test` — เทสต์ component ผ่านทั้ง 5 ไฟล์ (table, gantt, avatars, ganttFilter, router)
- [ ] เทสต์ไม่แตะ db จริง: `docker compose exec -T postgres psql -U pm_user -d project_management -tAc 'SELECT count(*) FROM "Project"'`
      ตัวเลขต้องไม่เปลี่ยนหลังรันเทสต์

## B. Business rules (เทสต์อัตโนมัติครอบคลุม — รัน `npm test` ก็พอ)

- [ ] Project/Task CRUD + 404
- [ ] วันเสาร์/อาทิตย์ถูก reject (400) ทุก date field
- [ ] progress ของโปรเจกต์คำนวณอัตโนมัติเมื่อสร้าง/แก้/ลบ/ย้าย task
- [ ] task code อัตโนมัติไม่ซ้ำและไม่ reuse
- [ ] dependency: self / duplicate / ต่างโปรเจกต์ / cycle ถูก reject
- [ ] riskScore = probability × impact เสมอ
- [ ] ลบ stakeholder → links หาย + risk owner เป็น NULL
- [ ] ลบ priority ที่มี task ใช้ → 409
- [ ] ไม่มี token / token ผิด / หมดอายุ → 401

## C. Manual — UI (เช็คเมื่อแก้ frontend หรือเทสต์อัตโนมัติไม่ครอบคลุม)

เปิด `http://localhost:8080` ล็อกอิน `admin` / `admin123`

- [ ] **Login** — ล็อกอินสำเร็จ, รหัสผิดแจ้ง error, logout กลับหน้า login
- [ ] **Dashboard** — การ์ด summary ตัวเลขตรงกับข้อมูล, กราฟแสดง, ไม่มี JS error ใน console
- [ ] **Projects** — สร้าง/แก้/ลบโปรเจกต์, status pill, เลือก stakeholder, วันที่วันเสาร์/อาทิตย์ถูกบล็อกทันที
- [ ] **Tasks (ในโปรเจกต์)** — สร้าง/แก้/ลบ task, task code ขึ้นอัตโนมัติ, progress 100 ↔ status COMPLETED โยงกัน,
      task overdue กะพริบแดง
- [ ] **Gantt** — แถบ timeline ถูกต้อง, ลาก bar เพื่อเลื่อนกำหนดการ (snap ข้ามเสาร์-อาทิตย์),
      ลาก reorder, dependency connector แสดง, เปลี่ยน scale/zoom แล้วจำค่าได้ (localStorage)
- [ ] **Stakeholders** — สร้าง/แก้/ลบ, email ซ้ำโดน reject, assign/unassign ในโปรเจกต์, ตัวนับ X of Y
- [ ] **Priorities** — สร้าง/แก้, ลบ priority ที่มี task ใช้ → error แจ้ง
- [ ] **Risks** — สร้าง/แก้/ลบ, probability×impact เปลี่ยน score + level ตาม, status pill, matrix ตรง
- [ ] **Global Gantt** — filter ตามโปรเจกต์/stakeholder/status, timeline scale สลับได้
- [ ] **Dark mode** — สลับ ☀️/🌙 แล้วทุกหน้าเข้ากัน, ค่าจำได้หลัง refresh
- [ ] **Breadcrumbs/Back** — หน้า Project detail มี trail + ปุ่ม Back, dropdown สลับโปรเจกต์

### C.1 Bulk select & delete (checkbox column) — ทุกตารางที่ลบได้ (Projects / Tasks / Risks / Stakeholders / Priorities)

- [ ] **Column checkbox อยู่ตำแหน่งแรกสุด** ของทุกตารางที่ลบได้ — กว้างแคบ จัดกลาง
- [ ] **ลากไม่ได้ / ปรับขนาดไม่ได้ / sort ไม่ได้** — ลองลากหัวคอลัมน์ checkbox: ต้องไม่ขยับ;
      หัวคอลัมน์ checkbox ต้องไม่มี grip หรือ resize handle (ต่างจากคอลัมน์อื่น)
- [ ] **เลือกทีละรายการ** — ติ๊ก checkbox แถว → ปุ่ม "Delete selected (N)" โผล่พร้อมตัวเลขที่ถูกต้อง
- [ ] **เลือกทั้งหมด (ทั้งหน้า)** — ติ๊ก header select-all → ทุกแถวในหน้าถูกติ๊ก + ปุ่มนับครบ;
      ติ๊กบางส่วน → header เป็น mixed (—); ติ๊กซ้ำอีกครั้ง → เคลียร์หมด + ปุ่มหาย
- [ ] **ติ๊ก checkbox ไม่เปิดหน้า/ไม่เปิด modal** — คลิกที่ตัวแถว (นอก checkbox) ยัง navigate ตามปกติ
- [ ] **Confirm dialog** — กด "Delete selected" → ขึ้นข้อความยืนยันพร้อมจำนวน + ข้อความเฉพาะ resource
      (เช่น project เตือนว่า cascade ลบ tasks/risks); กด Cancel → ไม่มีการลบ
- [ ] **ลบจริง** — ยืนยัน → ลบครบ, toast แจ้ง, ตารางโหลดใหม่, selection เคลียร์, ปุ่มหาย
- [ ] **ลบบางส่วนไม่ได้ (partial failure)** — เลือก priority ที่มี task ใช้อยู่ + ที่ว่าง → ลบ:
      อันที่ว่างถูกลบ, toast แจ้ง "Deleted X of Y — เหตุผล", ที่ติด 409 ไม่หาย
- [ ] **เปลี่ยนหน้า/search หลังเลือก** → selection เคลียร์ (ไม่เผลอลบรายการข้ามหน้า)

### C.2 Gantt — stakeholder avatars (วงกลมโปรไฟล์)

- [ ] ทุก task ที่มี stakeholder แสดง**วงกลม avatar** ที่ขอบขวาของแถวชื่อ task (ทั้งหน้าโปรเจกต์เดียว + global Gantt)
- [ ] ตัวย่อถูกต้อง (2 ตัวแรกของชื่อ เช่น "Wirat Sakorn" → `WS`); **คนเดียวกันสีเดิม**ในทุก task/ทุกหน้า
- [ ] task ที่ไม่มี stakeholder → ไม่มีวง ไม่กินพื้นที่
- [ ] มี stakeholder 4+ คน → แสดง 3 วงแรก + badge `+N`
- [ ] hover วง avatar → tooltip แสดงชื่อ + role (เช่น `RESPONSIBLE`)
- [ ] ลาก bar / reorder / resize คอลัมน์ชื่อ task ยังทำงานปกติ (avatar ไม่ไปขวาง)
- [ ] เปลี่ยน theme dark → avatar ยังอ่านได้ชัด (ขอบวงใช้ `--surface`)

### C.3 Avatar ในตาราง Tasks / Risks

- [ ] **Project Detail → Tasks tab**: มีคอลัมน์ **"People"** แสดงวง avatar ของ stakeholder ของ task
      (หลายคน → สูงสุด 3 วง + `+N`); task ไม่มี stakeholder → ช่องว่าง
- [ ] **Projects (หน้ารวม)**: มีคอลัมน์ **"People"** แสดง stakeholder ของโปรเจกต์ (หลายคน → +N);
      โปรเจกต์ไม่มี stakeholder → ช่องว่าง
- [ ] **Stakeholders (หน้ารวม)**: มีคอลัมน์ **"People"** (column แรก) แสดงวง avatar ของคนนั้นเอง;
      ตัวย่อตรงกับชื่อ (เช่น "Wirat Sakorn" → `WS`)
- [ ] **Risks (global) และ Risks tab ในโปรเจกต์**: คอลัมน์ Owner แสดง **วง avatar + ชื่อ** ของ owner;
      risk ไม่มี owner → `—`
- [ ] คนเดียวกัน**สีเดิม**ข้ามทุกหน้าจอ (Gantt / Projects / Tasks / Stakeholders / Risks) และตัวย่อถูกต้อง
- [ ] tooltip ชี้ดูชื่อ + role ได้ (ทั้งวงและกลุ่ม)
- [ ] เรียงคอลัมน์/search/หน้าเปลี่ยนยังทำงานปกติ, avatar ไม่ทำให้แถวสูงเพี้ยน

### C.4 Stakeholders → Gantt (deep link)

- [ ] คลิกที่แถว stakeholder (หน้า Stakeholders) → ไปหน้า Gantt (global) **กรองด้วยคนนั้น**
      (URL เปลี่ยนเป็น `#/gantt?stakeholder=<id>`)
- [ ] แสดงเฉพาะ**งานที่คนนั้นเกี่ยวข้อง** + เฉพาะโปรเจกต์ที่มีงานของเขา; จำนวนงานรวมในหัวกรองตรง
- [ ] เห็นสถานะ delay ชัด: schedule chips (Delayed / At risk / On track) นับจากงานที่กรองแล้ว,
      แถว DELAYED/AT_RISK ขึ้นสี + variance note ("Nd late" / "approaching end")
- [ ] มี **chip ชื่อคน + avatar + ปุ่ม ✕**; กด ✕ → กลับไป Gantt ไม่กรอง (URL กลับ `#/gantt`)
- [ ] ถัดจาก chip มี **summary บรรทัดเดียว**: `N งาน · M โปรเจกต์` + `● เสี่ยง X · ● delay แล้ว Y`
      (ตัวเลขตรงกับ Gantt ด้านล่าง; เสี่ยง/delay ขึ้นสีส้ม/แดงเมื่อ > 0)
- [ ] สลับคนใน dropdown Stakeholder → กรองเปลี่ยนตาม + URL ตาม
- [ ] refresh หน้า (ขณะกรองคนอยู่) → ยังกรองคนเดิม (deep link ทำงาน)
- [ ] กดปุ่ม Edit/Delete บนแถว stakeholder → ยังทำงานปกติ (ไม่หลุดไป Gantt)

## D. เมื่อแก้ไข backend ฝั่งใด ให้เช็คเพิ่ม

| แก้ส่วน | เช็คอะไรเพิ่ม |
| --- | --- |
| validators/ | รัน `validation.test.js` + ลองส่ง payload ผิดผ่าน Swagger (`/api-docs`) |
| services/ | รัน `api.test.js` + `dashboard-gantt.test.js` — กติกาข้อ 4 ใน `01-system-analysis.md` |
| middleware/ | รัน `security.test.js` + unit ของ middleware |
| repositories/ หรือ schema.prisma | `npm run db:test:prepare` + รันทุกอย่าง (ต้อง migrate ใหม่) |
| auth/rate limit | รัน `security.test.js` (ทดสอบ 429) |
