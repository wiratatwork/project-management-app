const prisma = require('../prisma/client');
const { buildOrderBy, buildSearchWhere } = require('../utils/pagination');

class StakeholderRepository {
  async findAll() {
    return prisma.stakeholder.findMany({
      include: {
        _count: {
          select: { projects: true, tasks: true, risks: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /** Paginated stakeholders with server-side search + sort (DataTable). */
  async findPage({ search, sortBy, sortDir, skip, limit }) {
    const sortMap = {
      name: 'name',
      email: 'email',
      position: 'position',
      department: 'department',
      organization: 'organization',
      projectCount: (dir) => ({ projects: { _count: dir } }),
      taskCount: (dir) => ({ tasks: { _count: dir } }),
    };
    const where = buildSearchWhere(search, ['name', 'email', 'position', 'department', 'organization']);
    const orderBy = buildOrderBy(sortBy, sortDir, sortMap, [{ name: 'asc' }]);
    const [rows, total] = await Promise.all([
      prisma.stakeholder.findMany({
        where,
        include: { _count: { select: { projects: true, tasks: true, risks: true } } },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.stakeholder.count({ where }),
    ]);
    return { rows, total };
  }

  async findById(id) {
    return prisma.stakeholder.findUnique({
      where: { id },
      include: {
        projects: { include: { project: true } },
        tasks: { include: { task: true } },
        risks: true,
      },
    });
  }

  async findByIds(ids) {
    return prisma.stakeholder.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, email: true },
    });
  }

  async create(data) {
    return prisma.stakeholder.create({ data });
  }

  async update(id, data) {
    return prisma.stakeholder.update({ where: { id }, data });
  }

  async delete(id) {
    return prisma.stakeholder.delete({ where: { id } });
  }
}

module.exports = new StakeholderRepository();
