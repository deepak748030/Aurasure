'use strict';

const AdminAudit = require('../models/AdminAudit');
const { newId } = require('./id');

function clientIp(req) {
  if (!req) return '';
  const fwd = req.headers?.['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || '';
}

async function writeAudit({
  actor,
  action,
  targetType = '',
  targetId = '',
  targetCode = '',
  detail = '',
  req,
}) {
  try {
    await AdminAudit.create({
      id: newId('aud'),
      actorId: actor?._id ? actor._id.toString() : actor?.id || actor?.userId || '',
      actorName: actor?.name || actor?.phone || 'admin',
      action: String(action || '').slice(0, 120),
      targetType: String(targetType || '').slice(0, 80),
      targetId: String(targetId || '').slice(0, 80),
      targetCode: String(targetCode || '').slice(0, 120),
      detail: String(detail || '').slice(0, 400),
      ip: clientIp(req),
    });
  } catch (err) {
    // An audit failure must never break the business mutation.
    console.error('[audit] write failed:', err.message);
  }
}

module.exports = { writeAudit, clientIp };
