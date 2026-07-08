const permissionService = require('../services/permissionService');
const auditService = require('../services/auditService');

/**
 * authorize(module, action) — for NEW granular RBAC routes (user management,
 * permission management, audit logs, etc). Your existing routes using
 * restrictTo('mentor', 'admin') keep working unchanged; use this for
 * anything new that should go through the DB-driven permission engine.
 */
function authorize(module, action) {
  return async (req, res, next) => {
    try {
      const { allowed, scope } = await permissionService.can(req.user, module, action);

      if (!allowed) {
        await auditService.log({
          actor: req.user,
          action: `${module}.${action}`,
          module,
          req,
          wasDenied: true,
        });
        return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
      }

      req.scope = scope;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Builds a Mongo filter fragment from req.scope for list/read endpoints.
 * `assignedField` = the field on the target collection linking back to the
 * caller (e.g. "mentorId" for students, "mentor" for MentorRequest docs).
 */
function scopeFilter(req, { assignedField = 'mentorId' } = {}) {
  const { SCOPES } = require('../utils/rbacConstants');
  switch (req.scope) {
    case SCOPES.ALL:
      return {};
    case SCOPES.ORG:
      return req.user.organizationId ? { organizationId: req.user.organizationId } : {};
    case SCOPES.ASSIGNED:
      return { [assignedField]: req.user._id };
    case SCOPES.OWN:
      return { _id: req.user._id };
    default:
      return { _id: null }; // fail closed
  }
}

module.exports = { authorize, scopeFilter };
