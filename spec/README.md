# ProjectFlow — เอกสาร Specification & Test

โฟลเดอร์นี้คือ **แหล่งอ้างอิงสำหรับตรวจสอบว่าโปรแกรมยังทำงานถูกต้อง** เมื่อมีการแก้ไขโค้ดในอนาคต
ใช้คู่กับชุดเทสต์อัตโนมัติ (`npm test` ใน `backend/` และ `frontend/`) เพื่อเช็คว่าการแก้ไขไม่ได้ทำลายฟีเจอร์เดิม

## ⚠️ กติกา: ทุกครั้งที่แก้โค้ด ต้องอัปเดต spec + testcases ด้วยเสมอ

1. **แก้ฟีเจอร์/เพิ่มฟีเจอร์/แก้บั๊ก** → อัปเดตเอกสารในโฟลเดอร์นี้ให้ตรงกับพฤติกรรมจริง:
   - `01-system-analysis.md` — ถ้าฟีเจอร์/กติกาเปลี่ยน
   - `02-test-plan.md` — เพิ่ม/แก้แถวใน coverage matrix (ข้อ 3)
   - `03-regression-checklist.md` — เพิ่ม/แก้ checklist ที่เกี่ยวข้อง
2. **ต้องมี test case** ครอบคลุมการเปลี่ยนแปลงนั้น — อย่างน้อยหนึ่งในนี้:
   - เทสต์อัตโนมัติฝั่ง backend (`backend/tests/`) สำหรับ API/business logic
   - เทสต์อัตโนมัติฝั่ง frontend (`frontend/tests/`) สำหรับ component/UI logic (ปัจจุบันมี `table/gantt/avatars/ganttFilter/router`.test.js — 44 เทสต์)
   - manual checklist ใน `03-regression-checklist.md` สำหรับสิ่งที่เทสต์อัตโนมัติครอบคลุมไม่ได้
3. รันเทสต์ให้ผ่านก่อนสรุปงาน (`npm test` ทั้ง backend และ frontend)

## เอกสารในโฟลเดอร์นี้

| ไฟล์ | เนื้อหา |
| --- | --- |
| [`01-system-analysis.md`](./01-system-analysis.md) | วิเคราะห์ระบบ: สถาปัตยกรรม, โมดูล, ข้อมูล, กติกาทางธุรกิจ (business rules), API ทั้งหมด, สภาพแวดล้อม |
| [`02-test-plan.md`](./02-test-plan.md) | แผนการทดสอบ: โครงสร้างชุดเทสต์, ตารางความครอบคลุม (coverage matrix), วิธีรัน, วิธีเพิ่มเทสต์ |
| [`03-regression-checklist.md`](./03-regression-checklist.md) | เช็กลิสต์ย่อสำหรับตรวจ regression ทั้งแบบอัตโนมัติ (รันเทสต์) และแบบ manual (UI) |

## วิธีใช้เมื่อแก้ไขโค้ด

```bash
# 1. ให้ postgres รันอยู่ (test database ถูกสร้าง/ migrate / seed ให้อัตโนมัติ)
docker compose up -d postgres

# 2. รันเทสต์ทั้งหมด (เทสต์ใช้ db แยก project_management_test ไม่แตะ db จริง)
cd backend
npm test

# 3. ดูเปอร์เซ็นต์ความครอบคลุม (coverage) — ใช้ตอนต้องการรู้ว่าโค้ดส่วนไหนยังไม่ถูกเทสต์
npm run test:coverage
```

**Frontend (component/UI logic — vitest + jsdom, ไม่ต้องใช้ Docker):**

```bash
cd frontend
npm install   # ครั้งแรกเท่านั้น (ติดตั้ง vitest + jsdom)
npm test      # รันเทสต์ component ทั้ง 5 ไฟล์ / 44 เทสต์ (table, gantt, avatars, ganttFilter, router)
```

ถ้าเทสต์ผ่านครบ + ผ่าน checklist ใน `03-regression-checklist.md` → ถือว่าการแก้ไขปลอดภัย

> หมายเหตุ: เทสต์ integration รันบน **test database แยก** (`project_management_test`) เสมอ
> ข้อมูลใน db จริง (`project_management`) ที่ใช้ทำงานประจำจะไม่มีวันถูกแตะโดยเทสต์
> เทสต์ frontend รันใน jsdom (จำลอง browser) — ไม่ต้องเปิดเว็บ/ไม่แตะ db เลย
