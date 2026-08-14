/**
 * Database seed for the Project Management application.
 *
 * Idempotent: safe to run multiple times. Entities are upserted by their
 * natural unique keys; join tables (dependencies, stakeholder links) and
 * risks are re-synced for the seeded projects only.
 *
 * Demo login:  admin / admin123
 */

const { PrismaClient, Prisma } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return a UTC-midnight Date `n` days from today (negative = past),
 * snapped to a business day (Mon–Fri) so demo dates obey the weekend rule.
 */
function daysFromNow(n) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const PRIORITIES = [
  { name: 'Critical', level: 1, description: 'Blocks delivery; must be resolved immediately.', color: '#dc2626' },
  { name: 'High', level: 2, description: 'Important; should be completed as soon as possible.', color: '#f97316' },
  { name: 'Medium', level: 3, description: 'Normal priority within the current delivery window.', color: '#eab308' },
  { name: 'Low', level: 4, description: 'Nice to have; can be scheduled later.', color: '#3b82f6' },
];

const STAKEHOLDERS = [
  { name: 'Alice Johnson', email: 'alice.johnson@example.com', phone: '+1-555-0101', department: 'Engineering', position: 'Engineering Manager', organization: 'Acme Corp' },
  { name: 'Bob Smith', email: 'bob.smith@example.com', phone: '+1-555-0102', department: 'Operations', position: 'Operations Lead', organization: 'Acme Corp' },
  { name: 'Carol Davis', email: 'carol.davis@example.com', phone: '+1-555-0103', department: 'Finance', position: 'Finance Director', organization: 'Acme Corp' },
  { name: 'David Wilson', email: 'david.wilson@example.com', phone: '+1-555-0104', department: 'IT', position: 'Infrastructure Architect', organization: 'Acme Corp' },
  { name: 'Emma Brown', email: 'emma.brown@example.com', phone: '+1-555-0105', department: 'Product', position: 'Product Owner', organization: 'Acme Corp' },
];

// projectCode: { project data, tasks: [...], risks: [...], stakeholders: [...] }
const PROJECTS = [
  {
    projectCode: 'PRJ-001',
    name: 'Production Dashboard Implementation',
    description:
      'Build and ship a real-time production monitoring dashboard covering backend services, frontend app and infrastructure.',
    plannedStartDate: daysFromNow(-42),
    plannedEndDate: daysFromNow(56),
    actualStartDate: daysFromNow(-36),
    actualEndDate: null,
    status: 'IN_PROGRESS',
    stakeholderIds: [0, 1, 4], // Alice, Bob, Emma
    tasks: [
      { taskCode: 'PRJ-001-001', name: 'Requirement Gathering', priority: 'High', plannedStart: -42, plannedEnd: -31, due: -31, status: 'COMPLETED', progress: 100, description: 'Collect and prioritise requirements from all business units.', stakeholders: { 4: 'RESPONSIBLE', 2: 'CONSULTED' } },
      { taskCode: 'PRJ-001-002', name: 'Database Design', priority: 'Critical', plannedStart: -28, plannedEnd: -17, due: -17, status: 'COMPLETED', progress: 100, description: 'Design the schema for metrics storage and reporting.', stakeholders: { 0: 'RESPONSIBLE' } },
      { taskCode: 'PRJ-001-003', name: 'Backend Development', priority: 'Critical', plannedStart: -14, plannedEnd: 14, due: 14, status: 'IN_PROGRESS', progress: 40, description: 'Implement ingestion pipeline and reporting API.', stakeholders: { 0: 'RESPONSIBLE', 3: 'CONSULTED' } },
      { taskCode: 'PRJ-001-004', name: 'Frontend Development', priority: 'High', plannedStart: -14, plannedEnd: 28, due: 28, status: 'IN_PROGRESS', progress: 30, description: 'Build the dashboard UI and visualisations.', stakeholders: { 4: 'ACCOUNTABLE', 1: 'CONSULTED' } },
      { taskCode: 'PRJ-001-005', name: 'Integration Test', priority: 'High', plannedStart: 18, plannedEnd: 35, due: 35, status: 'TODO', progress: 0, description: 'End-to-end integration testing of the full pipeline.', stakeholders: { 1: 'RESPONSIBLE' } },
      { taskCode: 'PRJ-001-006', name: 'UAT', priority: 'Medium', plannedStart: 38, plannedEnd: 49, due: 49, status: 'TODO', progress: 0, description: 'User acceptance testing with business stakeholders.', stakeholders: { 2: 'ACCOUNTABLE', 4: 'RESPONSIBLE' } },
      { taskCode: 'PRJ-001-007', name: 'Production Deployment', priority: 'Critical', plannedStart: 52, plannedEnd: 56, due: 56, status: 'TODO', progress: 0, description: 'Roll out the dashboard to production.', stakeholders: { 3: 'RESPONSIBLE' } },
      { taskCode: 'PRJ-001-008', name: 'Documentation', priority: 'Low', plannedStart: -7, plannedEnd: 3, due: -2, status: 'BLOCKED', progress: 10, description: 'User and operations documentation. Currently blocked by missing API examples.', stakeholders: { 4: 'RESPONSIBLE' } },
    ],
    dependencies: [
      ['PRJ-001-002', 'PRJ-001-001'],
      ['PRJ-001-003', 'PRJ-001-002'],
      ['PRJ-001-004', 'PRJ-001-002'],
      ['PRJ-001-005', 'PRJ-001-003'],
      ['PRJ-001-005', 'PRJ-001-004'],
      ['PRJ-001-006', 'PRJ-001-005'],
      ['PRJ-001-007', 'PRJ-001-006'],
      ['PRJ-001-008', 'PRJ-001-003'],
    ],
    risks: [
      { title: 'Third-party API instability may slip backend timeline', description: 'The metrics source API has been flaky in staging.', probability: 4, impact: 4, mitigationPlan: 'Add retry logic and caching layer.', contingencyPlan: 'Switch to nightly batch ingestion as fallback.', owner: 3, status: 'OPEN', identifiedDaysAgo: 21 },
      { title: 'Scope creep from stakeholders', description: 'New dashboard widgets requested during UAT preparation.', probability: 3, impact: 3, mitigationPlan: 'Freeze scope after requirements sign-off.', contingencyPlan: 'Defer non-critical widgets to a second release.', owner: 4, status: 'OPEN', identifiedDaysAgo: 14 },
      { title: 'Slow dashboard queries', description: 'Aggregations over large metric volumes may exceed latency budget.', probability: 2, impact: 4, mitigationPlan: 'Pre-aggregate rollups and add indexes.', contingencyPlan: 'Enable read replicas.', owner: 0, status: 'MITIGATED', identifiedDaysAgo: 30 },
    ],
  },
  {
    projectCode: 'PRJ-002',
    name: 'Mobile App Launch',
    description: 'Design, build and release version 1.0 of the mobile companion app.',
    plannedStartDate: daysFromNow(-14),
    plannedEndDate: daysFromNow(91),
    actualStartDate: null,
    actualEndDate: null,
    status: 'PLANNED',
    stakeholderIds: [4, 2],
    tasks: [
      { taskCode: 'PRJ-002-001', name: 'Market Research', priority: 'Medium', plannedStart: -14, plannedEnd: -3, due: -3, status: 'COMPLETED', progress: 100, description: 'Competitor analysis and feature prioritisation.', stakeholders: { 4: 'RESPONSIBLE' } },
      { taskCode: 'PRJ-002-002', name: 'App Design', priority: 'High', plannedStart: 0, plannedEnd: 14, due: 14, status: 'IN_PROGRESS', progress: 25, description: 'UX flows and visual design for v1.0.', stakeholders: { 4: 'ACCOUNTABLE' } },
      { taskCode: 'PRJ-002-003', name: 'Prototype', priority: 'High', plannedStart: 18, plannedEnd: 35, due: 35, status: 'TODO', progress: 0, description: 'Interactive prototype for stakeholder feedback.', stakeholders: {} },
      { taskCode: 'PRJ-002-004', name: 'Beta Release', priority: 'Critical', plannedStart: 38, plannedEnd: 70, due: 70, status: 'TODO', progress: 0, description: 'Private beta to a selected user group.', stakeholders: { 1: 'RESPONSIBLE' } },
      { taskCode: 'PRJ-002-005', name: 'App Store Submission', priority: 'High', plannedStart: 73, plannedEnd: 91, due: 91, status: 'TODO', progress: 0, description: 'Prepare store listing and submit for review.', stakeholders: { 2: 'ACCOUNTABLE' } },
    ],
    dependencies: [
      ['PRJ-002-002', 'PRJ-002-001'],
      ['PRJ-002-003', 'PRJ-002-002'],
      ['PRJ-002-004', 'PRJ-002-003'],
      ['PRJ-002-005', 'PRJ-002-004'],
    ],
    risks: [
      { title: 'App store review delays', description: 'Submission may be delayed by review queue.', probability: 3, impact: 3, mitigationPlan: 'Submit early with complete metadata.', contingencyPlan: 'Prepare contingency release date.', owner: 4, status: 'OPEN', identifiedDaysAgo: 10 },
      { title: 'Beta feedback volume exceeds capacity', description: 'Team may not keep up with beta issue triage.', probability: 2, impact: 2, mitigationPlan: 'Set expectations and triage SLAs.', contingencyPlan: 'Extend beta by one sprint.', owner: 1, status: 'OPEN', identifiedDaysAgo: 5 },
    ],
  },
  {
    projectCode: 'PRJ-003',
    name: 'Legacy System Migration',
    description: 'Migrate data and workloads from the legacy mainframe to the new platform.',
    plannedStartDate: daysFromNow(-75),
    plannedEndDate: daysFromNow(-14),
    actualStartDate: daysFromNow(-70),
    actualEndDate: null,
    status: 'IN_PROGRESS',
    stakeholderIds: [3, 1, 0],
    tasks: [
      { taskCode: 'PRJ-003-001', name: 'Inventory & Assessment', priority: 'High', plannedStart: -75, plannedEnd: -57, due: -57, status: 'COMPLETED', progress: 100, description: 'Full inventory of legacy systems and dependencies.', stakeholders: { 3: 'RESPONSIBLE' } },
      { taskCode: 'PRJ-003-002', name: 'Data Extraction', priority: 'Critical', plannedStart: -54, plannedEnd: -29, due: -29, status: 'COMPLETED', progress: 100, description: 'Extract data from legacy storage.', stakeholders: { 0: 'RESPONSIBLE' } },
      { taskCode: 'PRJ-003-003', name: 'Data Transformation', priority: 'Critical', plannedStart: -26, plannedEnd: -7, due: -7, status: 'IN_PROGRESS', progress: 60, description: 'Transform and validate migrated data.', stakeholders: { 3: 'RESPONSIBLE', 0: 'CONSULTED' } },
      { taskCode: 'PRJ-003-004', name: 'Validation & Sign-off', priority: 'High', plannedStart: -4, plannedEnd: 14, due: 14, status: 'TODO', progress: 0, description: 'Business validation and sign-off of migrated data.', stakeholders: { 1: 'ACCOUNTABLE' } },
      { taskCode: 'PRJ-003-005', name: 'Cutover', priority: 'Critical', plannedStart: 17, plannedEnd: 28, due: 28, status: 'TODO', progress: 0, description: 'Switch production traffic to the new platform.', stakeholders: { 3: 'RESPONSIBLE' } },
    ],
    dependencies: [
      ['PRJ-003-002', 'PRJ-003-001'],
      ['PRJ-003-003', 'PRJ-003-002'],
      ['PRJ-003-004', 'PRJ-003-003'],
      ['PRJ-003-005', 'PRJ-003-004'],
    ],
    risks: [
      { title: 'Data quality issues in transformation', description: 'Inconsistent legacy records slow down transformation.', probability: 3, impact: 4, mitigationPlan: 'Automated validation suite on every batch.', contingencyPlan: 'Manual cleanup sprint before cutover.', owner: 0, status: 'OPEN', identifiedDaysAgo: 20 },
      { title: 'Cutover window too short', description: 'Weekend window may be insufficient for full switchover.', probability: 2, impact: 5, mitigationPlan: 'Rehearse cutover twice in staging.', contingencyPlan: 'Request extended maintenance window.', owner: 3, status: 'MITIGATED', identifiedDaysAgo: 15 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Seed logic
// ---------------------------------------------------------------------------

async function seed() {
  console.log('Seeding database...');

  // Demo user (for JWT authentication)
  const passwordHash = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash, name: 'Administrator' },
    create: { username: 'admin', passwordHash, name: 'Administrator' },
  });
  console.log(`  user: ${user.username} (password: admin123)`);

  // Priorities
  const priorityByName = {};
  for (const p of PRIORITIES) {
    const record = await prisma.priority.upsert({
      where: { level: p.level },
      update: { name: p.name, description: p.description, color: p.color },
      create: p,
    });
    priorityByName[p.name] = record;
  }
  console.log(`  priorities: ${PRIORITIES.length}`);

  // Stakeholders
  const stakeholderByEmail = {};
  for (const s of STAKEHOLDERS) {
    const record = await prisma.stakeholder.upsert({
      where: { email: s.email },
      update: s,
      create: s,
    });
    stakeholderByEmail[s.email] = record;
  }
  console.log(`  stakeholders: ${STAKEHOLDERS.length}`);

  for (const projectDef of PROJECTS) {
    // Upsert project
    const project = await prisma.project.upsert({
      where: { projectCode: projectDef.projectCode },
      update: {
        name: projectDef.name,
        description: projectDef.description,
        plannedStartDate: projectDef.plannedStartDate,
        plannedEndDate: projectDef.plannedEndDate,
        actualStartDate: projectDef.actualStartDate,
        actualEndDate: projectDef.actualEndDate,
        status: projectDef.status,
        // Keep the auto task-code counter ahead of the demo tasks.
        nextTaskNumber: projectDef.tasks.length + 1,
      },
      create: {
        projectCode: projectDef.projectCode,
        name: projectDef.name,
        description: projectDef.description,
        plannedStartDate: projectDef.plannedStartDate,
        plannedEndDate: projectDef.plannedEndDate,
        actualStartDate: projectDef.actualStartDate,
        actualEndDate: projectDef.actualEndDate,
        status: projectDef.status,
        nextTaskNumber: projectDef.tasks.length + 1,
      },
    });

    // Re-sync project stakeholders
    await prisma.projectStakeholder.deleteMany({ where: { projectId: project.id } });
    for (const idx of projectDef.stakeholderIds) {
      const stakeholder = STAKEHOLDERS[idx];
      await prisma.projectStakeholder.create({
        data: { projectId: project.id, stakeholderId: stakeholderByEmail[stakeholder.email].id },
      });
    }

    // Remove any tasks that are no longer part of the seed definition (e.g.
    // the old TSK-xxx codes) so re-seeding normalizes the demo data.
    const definedCodes = projectDef.tasks.map((t) => t.taskCode);
    await prisma.task.deleteMany({
      where: { projectId: project.id, NOT: { taskCode: { in: definedCodes } } },
    });

    // Upsert tasks
    const taskByCode = {};
    for (const t of projectDef.tasks) {
      const task = await prisma.task.upsert({
        where: { projectId_taskCode: { projectId: project.id, taskCode: t.taskCode } },
        update: {
          name: t.name,
          description: t.description,
          priorityId: priorityByName[t.priority].id,
          plannedStartDate: daysFromNow(t.plannedStart),
          plannedEndDate: daysFromNow(t.plannedEnd),
          dueDate: daysFromNow(t.due),
          status: t.status,
          progressPercentage: t.progress,
        },
        create: {
          projectId: project.id,
          taskCode: t.taskCode,
          name: t.name,
          description: t.description,
          priorityId: priorityByName[t.priority].id,
          plannedStartDate: daysFromNow(t.plannedStart),
          plannedEndDate: daysFromNow(t.plannedEnd),
          dueDate: daysFromNow(t.due),
          status: t.status,
          progressPercentage: t.progress,
        },
      });
      taskByCode[t.taskCode] = task;
    }

    // Re-sync task stakeholders and dependencies
    await prisma.taskStakeholder.deleteMany({
      where: { task: { projectId: project.id } },
    });
    await prisma.taskDependency.deleteMany({
      where: { task: { projectId: project.id } },
    });

    for (const t of projectDef.tasks) {
      const task = taskByCode[t.taskCode];
      for (const [idx, role] of Object.entries(t.stakeholders || {})) {
        const stakeholder = STAKEHOLDERS[Number(idx)];
        await prisma.taskStakeholder.create({
          data: { taskId: task.id, stakeholderId: stakeholderByEmail[stakeholder.email].id, role },
        });
      }
    }

    for (const [taskCode, dependsOnCode] of projectDef.dependencies) {
      await prisma.taskDependency.create({
        data: {
          taskId: taskByCode[taskCode].id,
          dependsOnTaskId: taskByCode[dependsOnCode].id,
        },
      });
    }

    // Re-sync risks (computed riskScore = probability * impact)
    await prisma.risk.deleteMany({ where: { projectId: project.id } });
    for (const r of projectDef.risks) {
      await prisma.risk.create({
        data: {
          projectId: project.id,
          title: r.title,
          description: r.description,
          probability: r.probability,
          impact: r.impact,
          riskScore: r.probability * r.impact,
          mitigationPlan: r.mitigationPlan,
          contingencyPlan: r.contingencyPlan,
          ownerStakeholderId: r.owner != null ? stakeholderByEmail[STAKEHOLDERS[r.owner].email].id : null,
          status: r.status,
          identifiedDate: daysFromNow(-r.identifiedDaysAgo),
        },
      });
    }

    // Auto-calculate project progress from tasks
    const tasks = await prisma.task.findMany({ where: { projectId: project.id } });
    const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
    const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
    await prisma.project.update({ where: { id: project.id }, data: { progressPercentage: progress } });

    console.log(`  project ${project.projectCode}: ${tasks.length} tasks, ${projectDef.risks.length} risks, progress ${progress}%`);
  }

  console.log('Seeding complete.');
}

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
