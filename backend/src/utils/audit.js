const AuditLog = require("../models/AuditLog");

async function audit({ actorUserId, companyId, action, meta }) {
  try {
    await AuditLog.create({ actorUserId, companyId, action, meta: meta || {} });
  } catch (e) {}
}

module.exports = { audit };
