const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actorRole: { type: String, required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },

    action: { type: String, required: true }, // e.g. "role.change", "user.suspend"
    module: { type: String, required: true },

    targetType: { type: String, default: null },
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null },

    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },

    ip: { type: String, default: null },
    userAgent: { type: String, default: null },

    wasDenied: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Append-only by convention: no update/delete routes exist for this model.
auditLogSchema.index({ organizationId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
