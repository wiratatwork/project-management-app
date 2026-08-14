const AppError = require('../utils/AppError');
const stakeholderRepository = require('../repositories/stakeholder.repository');
const priorityRepository = require('../repositories/priority.repository');

async function assertStakeholdersExist(ids) {
  const unique = [...new Set(ids)];
  const found = await stakeholderRepository.findByIds(unique);
  if (found.length !== unique.length) {
    const foundIds = new Set(found.map((s) => s.id));
    const missing = unique.filter((id) => !foundIds.has(id));
    throw new AppError('One or more stakeholders do not exist', {
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details: [{ field: 'stakeholderIds', message: `Unknown stakeholder id(s): ${missing.join(', ')}` }],
    });
  }
}

async function assertPrioritiesExist(ids) {
  const unique = [...new Set(ids)];
  const found = await priorityRepository.findByIds(unique);
  if (found.length !== unique.length) {
    const foundIds = new Set(found.map((p) => p.id));
    const missing = unique.filter((id) => !foundIds.has(id));
    throw new AppError('One or more priorities do not exist', {
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details: [{ field: 'priorityId', message: `Unknown priority id(s): ${missing.join(', ')}` }],
    });
  }
}

module.exports = { assertStakeholdersExist, assertPrioritiesExist };
