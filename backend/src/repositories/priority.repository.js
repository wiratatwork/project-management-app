const prisma = require('../prisma/client');
const { buildOrderBy, buildSearchWhere } = require('../utils/pagination');

class PriorityRepository {
  async findAll() {
    return prisma.priority.findMany({
      include: { _count: { select: { tasks: true } } },
      orderBy: { level: 'asc' },
    });
  }

  /** Paginated priorities with server-side search + sort (DataTable). */
  async findPage({ search, sortBy, sortDir, skip, limit }) {
    const sortMap = { name: 'name', level: 'level', description: 'description' };
    const where = buildSearchWhere(search, ['name', 'description']);
    const orderBy = buildOrderBy(sortBy, sortDir, sortMap, [{ level: 'asc' }]);
    const [rows, total] = await Promise.all([
      prisma.priority.findMany({ where, include: { _count: { select: { tasks: true } } }, orderBy, skip, take: limit }),
      prisma.priority.count({ where }),
    ]);
    return { rows, total };
  }

  async findById(id) {
    return prisma.priority.findUnique({ where: { id } });
  }

  async findByIds(ids) {
    return prisma.priority.findMany({ where: { id: { in: ids } } });
  }

  async create(data) {
    return prisma.priority.create({ data });
  }

  async update(id, data) {
    return prisma.priority.update({ where: { id }, data });
  }

  async delete(id) {
    return prisma.priority.delete({ where: { id } });
  }

  async taskCount(id) {
    return prisma.task.count({ where: { priorityId: id } });
  }
}

module.exports = new PriorityRepository();
