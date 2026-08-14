const prisma = require('../prisma/client');
const { buildOrderBy, buildSearchWhere } = require('../utils/pagination');

const riskInclude = {
  project: { select: { id: true, projectCode: true, name: true } },
  owner: { select: { id: true, name: true, email: true } },
};

class RiskRepository {
  async findManyByProject(projectId) {
    return prisma.risk.findMany({
      where: { projectId },
      include: riskInclude,
      orderBy: [{ riskScore: 'desc' }, { id: 'asc' }],
    });
  }

  async findMany(filters = {}) {
    const where = {};
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.status) where.status = filters.status;
    return prisma.risk.findMany({
      where,
      include: riskInclude,
      orderBy: [{ riskScore: 'desc' }, { id: 'asc' }],
    });
  }

  /** Paginated risks with server-side search + sort (DataTable). */
  async findPage({ search, sortBy, sortDir, skip, limit, filters = {} }) {
    const sortMap = {
      title: 'title',
      probability: 'probability',
      impact: 'impact',
      riskScore: 'riskScore',
      riskLevel: 'riskLevel',
      status: 'status',
      identifiedDate: 'identifiedDate',
    };
    const where = {
      ...buildSearchWhere(search, ['title', 'description', 'mitigationPlan', 'contingencyPlan']),
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    };
    const orderBy = buildOrderBy(sortBy, sortDir, sortMap, [{ riskScore: 'desc' }, { id: 'asc' }]);
    const [rows, total] = await Promise.all([
      prisma.risk.findMany({ where, include: riskInclude, orderBy, skip, take: limit }),
      prisma.risk.count({ where }),
    ]);
    return { rows, total };
  }

  async findById(id) {
    return prisma.risk.findUnique({ where: { id }, include: riskInclude });
  }

  async create(data) {
    return prisma.risk.create({ data, include: riskInclude });
  }

  async update(id, data) {
    return prisma.risk.update({ where: { id }, data, include: riskInclude });
  }

  async delete(id) {
    return prisma.risk.delete({ where: { id } });
  }

  /** (probability, impact) counts for open risks, used by the risk matrix. */
  async findOpenMatrixCounts() {
    return prisma.risk.groupBy({
      by: ['probability', 'impact'],
      where: { status: 'OPEN' },
      _count: { _all: true },
    });
  }

  async countByStatus() {
    return prisma.risk.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
  }

  async openCount() {
    return prisma.risk.count({ where: { status: 'OPEN' } });
  }
}

module.exports = new RiskRepository();
