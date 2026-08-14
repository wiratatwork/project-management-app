const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

const PROJECT_STATUSES = ['PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED'];
const RISK_STATUSES = ['OPEN', 'MITIGATED', 'CLOSED', 'ACCEPTED'];
const ROLES = ['RESPONSIBLE', 'ACCOUNTABLE', 'CONSULTED', 'INFORMED'];

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Project Management API',
      version: '1.0.0',
      description:
        'REST API for the Project Management web application. ' +
        'All endpoints except `/api/auth/login` and `/api/health` require a Bearer token ' +
        'obtained from `POST /api/auth/login`. Demo user: `admin` / `admin123`.',
    },
    servers: [{ url: '/', description: 'Same origin (nginx proxies /api to the backend)' }],
    tags: [
      { name: 'Auth', description: 'Authentication (JWT)' },
      { name: 'Dashboard', description: 'Dashboard aggregates' },
      { name: 'Projects', description: 'Project CRUD' },
      { name: 'Tasks', description: 'Task CRUD, dependencies, stakeholders' },
      { name: 'Gantt', description: 'Gantt chart data' },
      { name: 'Stakeholders', description: 'Stakeholder CRUD' },
      { name: 'Priorities', description: 'Priority CRUD (configurable)' },
      { name: 'Risks', description: 'Risk CRUD, scoring, matrix' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token from POST /api/auth/login',
        },
      },
      responses: {
        BadRequest: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        Unauthorized: {
          description: 'Missing, invalid or expired token',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        Conflict: {
          description: 'Unique constraint or conflict',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        RateLimited: {
          description: 'Too many requests',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string' },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        Project: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            projectCode: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            plannedStartDate: { type: 'string', format: 'date-time' },
            plannedEndDate: { type: 'string', format: 'date-time' },
            actualStartDate: { type: 'string', format: 'date-time', nullable: true },
            actualEndDate: { type: 'string', format: 'date-time', nullable: true },
            status: { type: 'string', enum: PROJECT_STATUSES },
            progressPercentage: { type: 'number', minimum: 0, maximum: 100 },
            taskCount: { type: 'integer' },
            riskCount: { type: 'integer' },
            delayed: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            stakeholders: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  stakeholderId: { type: 'integer' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  position: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        ProjectInput: {
          type: 'object',
          required: ['projectCode', 'name', 'plannedStartDate', 'plannedEndDate'],
          properties: {
            projectCode: { type: 'string', example: 'PRJ-010' },
            name: { type: 'string' },
            description: { type: 'string' },
            plannedStartDate: { type: 'string', format: 'date', example: '2026-08-01' },
            plannedEndDate: { type: 'string', format: 'date', example: '2026-12-01' },
            actualStartDate: { type: 'string', format: 'date', nullable: true },
            actualEndDate: { type: 'string', format: 'date', nullable: true },
            status: { type: 'string', enum: PROJECT_STATUSES },
            stakeholderIds: { type: 'array', items: { type: 'integer' } },
          },
        },
        ProjectUpdate: {
          type: 'object',
          properties: {
            projectCode: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            plannedStartDate: { type: 'string', format: 'date' },
            plannedEndDate: { type: 'string', format: 'date' },
            actualStartDate: { type: 'string', format: 'date', nullable: true },
            actualEndDate: { type: 'string', format: 'date', nullable: true },
            status: { type: 'string', enum: PROJECT_STATUSES },
            stakeholderIds: { type: 'array', items: { type: 'integer' } },
          },
        },
        ProjectDetail: {
          allOf: [
            { $ref: '#/components/schemas/Project' },
            {
              type: 'object',
              properties: {
                plannedDurationDays: { type: 'integer', nullable: true },
                actualDurationDays: { type: 'integer', nullable: true },
                tasks: { type: 'array', items: { $ref: '#/components/schemas/Task' } },
                risks: { type: 'array', items: { $ref: '#/components/schemas/Risk' } },
              },
            },
          ],
        },
        Task: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            projectId: { type: 'integer' },
            taskCode: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            priorityId: { type: 'integer' },
            priority: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
                level: { type: 'integer' },
                color: { type: 'string', nullable: true },
              },
            },
            plannedStartDate: { type: 'string', format: 'date-time' },
            plannedEndDate: { type: 'string', format: 'date-time' },
            actualStartDate: { type: 'string', format: 'date-time', nullable: true },
            actualEndDate: { type: 'string', format: 'date-time', nullable: true },
            dueDate: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: TASK_STATUSES },
            progressPercentage: { type: 'number', minimum: 0, maximum: 100 },
            overdue: { type: 'boolean' },
            scheduleStatus: { type: 'string', enum: ['ON_TRACK', 'AT_RISK', 'DELAYED'], description: 'Plan-vs-actual schedule health' },
            scheduleDaysLate: { type: 'integer', description: 'Days late versus the planned end (0 when on track)' },
            startedLateDays: { type: 'integer', description: 'Days between planned and actual start when the start was late' },
            stakeholders: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  stakeholderId: { type: 'integer' },
                  role: { type: 'string', enum: ROLES },
                  name: { type: 'string' },
                  email: { type: 'string' },
                },
              },
            },
            dependencies: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  taskId: { type: 'integer' },
                  dependsOnTaskId: { type: 'integer' },
                  dependencyType: { type: 'string', enum: ['FINISH_TO_START'] },
                  taskCode: { type: 'string' },
                  name: { type: 'string' },
                },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        TaskInput: {
          type: 'object',
          required: ['taskCode', 'name', 'priorityId', 'plannedStartDate', 'plannedEndDate', 'dueDate'],
          properties: {
            taskCode: { type: 'string', example: 'TSK-101' },
            name: { type: 'string' },
            description: { type: 'string' },
            priorityId: { type: 'integer' },
            plannedStartDate: { type: 'string', format: 'date' },
            plannedEndDate: { type: 'string', format: 'date' },
            actualStartDate: { type: 'string', format: 'date', nullable: true },
            actualEndDate: { type: 'string', format: 'date', nullable: true },
            dueDate: { type: 'string', format: 'date' },
            status: { type: 'string', enum: TASK_STATUSES },
            progressPercentage: { type: 'number', minimum: 0, maximum: 100 },
            stakeholders: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  stakeholderId: { type: 'integer' },
                  role: { type: 'string', enum: ROLES },
                },
              },
            },
            dependencyIds: { type: 'array', items: { type: 'integer' } },
          },
        },
        TaskUpdate: {
          type: 'object',
          properties: {
            taskCode: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            priorityId: { type: 'integer' },
            plannedStartDate: { type: 'string', format: 'date' },
            plannedEndDate: { type: 'string', format: 'date' },
            actualStartDate: { type: 'string', format: 'date', nullable: true },
            actualEndDate: { type: 'string', format: 'date', nullable: true },
            dueDate: { type: 'string', format: 'date' },
            status: { type: 'string', enum: TASK_STATUSES },
            progressPercentage: { type: 'number', minimum: 0, maximum: 100 },
            stakeholders: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  stakeholderId: { type: 'integer' },
                  role: { type: 'string', enum: ROLES },
                },
              },
            },
            dependencyIds: { type: 'array', items: { type: 'integer' } },
          },
        },
        Stakeholder: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string', nullable: true },
            department: { type: 'string', nullable: true },
            position: { type: 'string', nullable: true },
            organization: { type: 'string', nullable: true },
            projectCount: { type: 'integer' },
            taskCount: { type: 'integer' },
            riskCount: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        StakeholderInput: {
          type: 'object',
          required: ['name', 'email'],
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            department: { type: 'string' },
            position: { type: 'string' },
            organization: { type: 'string' },
          },
        },
        StakeholderUpdate: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', nullable: true },
            department: { type: 'string', nullable: true },
            position: { type: 'string', nullable: true },
            organization: { type: 'string', nullable: true },
          },
        },
        Priority: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string', example: 'High' },
            level: { type: 'integer', example: 2 },
            description: { type: 'string', nullable: true },
            color: { type: 'string', nullable: true },
            taskCount: { type: 'integer' },
          },
        },
        PriorityInput: {
          type: 'object',
          required: ['name', 'level'],
          properties: {
            name: { type: 'string' },
            level: { type: 'integer', minimum: 1 },
            description: { type: 'string' },
            color: { type: 'string', example: '#f97316' },
          },
        },
        PriorityUpdate: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            level: { type: 'integer', minimum: 1 },
            description: { type: 'string', nullable: true },
            color: { type: 'string', nullable: true },
          },
        },
        Risk: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            projectId: { type: 'integer' },
            title: { type: 'string' },
            description: { type: 'string', nullable: true },
            probability: { type: 'integer', minimum: 1, maximum: 5 },
            impact: { type: 'integer', minimum: 1, maximum: 5 },
            riskScore: { type: 'integer', example: 16 },
            riskLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
            mitigationPlan: { type: 'string', nullable: true },
            contingencyPlan: { type: 'string', nullable: true },
            ownerStakeholderId: { type: 'integer', nullable: true },
            owner: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
                email: { type: 'string' },
              },
            },
            status: { type: 'string', enum: RISK_STATUSES },
            identifiedDate: { type: 'string', format: 'date-time' },
            resolvedDate: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        RiskInput: {
          type: 'object',
          required: ['title', 'probability', 'impact'],
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            probability: { type: 'integer', minimum: 1, maximum: 5 },
            impact: { type: 'integer', minimum: 1, maximum: 5 },
            mitigationPlan: { type: 'string' },
            contingencyPlan: { type: 'string' },
            ownerStakeholderId: { type: 'integer', nullable: true },
            status: { type: 'string', enum: RISK_STATUSES },
            identifiedDate: { type: 'string', format: 'date' },
            resolvedDate: { type: 'string', format: 'date', nullable: true },
          },
        },
        RiskUpdate: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string', nullable: true },
            probability: { type: 'integer', minimum: 1, maximum: 5 },
            impact: { type: 'integer', minimum: 1, maximum: 5 },
            mitigationPlan: { type: 'string', nullable: true },
            contingencyPlan: { type: 'string', nullable: true },
            ownerStakeholderId: { type: 'integer', nullable: true },
            status: { type: 'string', enum: RISK_STATUSES },
            identifiedDate: { type: 'string', format: 'date' },
            resolvedDate: { type: 'string', format: 'date', nullable: true },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [path.join(__dirname, '../routes/*.routes.js')],
};

const spec = swaggerJsdoc(options);

module.exports = spec;
