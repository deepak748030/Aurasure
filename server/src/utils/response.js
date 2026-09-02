'use strict';

/**
 * Consistent JSON envelope for every successful response:
 *   { success: true, data, meta? }
 * and a tiny typed helper for list responses carrying pagination metadata.
 */

function ok(res, data, meta = undefined, statusCode = 200) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

function created(res, data, meta = undefined) {
  return ok(res, data, meta, 201);
}

function noContent(res) {
  return res.status(204).send();
}

/**
 * Build pagination metadata + skip/limit from `req.query`.
 * Accepts 1-based `page` and `limit` (clamped to a safe max).
 */
function paginate(query, { defaultLimit = 20, maxLimit = 50 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

function listMeta(total, page, limit) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

module.exports = { ok, created, noContent, paginate, listMeta };
