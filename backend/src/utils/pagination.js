/**
 * Shared pagination / search / sort helpers for list endpoints.
 *
 * List endpoints are dual-mode:
 *   - without a `page` param they return the plain array (backward compatible
 *     with existing consumers such as the dashboard and dropdowns)
 *   - with `page` they return a paginated envelope:
 *       { rows, total, page, limit, totalPages }
 */
function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const sortBy = typeof query.sortBy === 'string' ? query.sortBy : '';
  const sortDir = query.sortDir === 'desc' ? 'desc' : 'asc';
  return { page, limit, search, sortBy, sortDir, skip: (page - 1) * limit };
}

/**
 * Prisma `orderBy` from a whitelisted column map. A map value is either a
 * plain column name (→ `{ col: dir }`) or a function `(dir) => orderByEntry`
 * (used for relation-count sorts, e.g. `{ tasks: { _count: dir } }`).
 * Falls back to `fallback` when the requested column is not whitelisted.
 */
function buildOrderBy(sortBy, sortDir, columnMap, fallback) {
  if (sortBy && columnMap[sortBy]) {
    const entry = typeof columnMap[sortBy] === 'function' ? columnMap[sortBy](sortDir) : { [columnMap[sortBy]]: sortDir };
    return [entry, ...fallback];
  }
  return fallback;
}

/** Prisma `where` fragment that case-insensitively matches `search` on fields. */
function buildSearchWhere(search, fields) {
  if (!search) return {};
  return { OR: fields.map((f) => ({ [f]: { contains: search, mode: 'insensitive' } })) };
}

/** The paginated response payload for the `data` field. */
function pageEnvelope(rows, total, page, limit) {
  return { rows, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

/**
 * Send a list response in dual mode: plain array without `page`, paginated
 * envelope `{ rows, total, page, limit, totalPages }` with `page`.
 */
function respondList(res, req, rows, total) {
  if (req.query.page !== undefined) {
    const { page, limit } = parsePagination(req.query);
    res.json({ success: true, data: pageEnvelope(rows, total, page, limit) });
  } else {
    res.json({ success: true, data: rows });
  }
}

module.exports = { parsePagination, buildOrderBy, buildSearchWhere, pageEnvelope, respondList };
