const mongoose = require('mongoose');
const { ROLE_LIST, MODULE_LIST, ACTION_LIST, SCOPES } = require('../utils/rbacConstants');

// organizationId: null = the single global rule set every user currently
// falls under (since MedClarivo has no active multi-tenancy yet). If you
// turn on multi-tenancy later, org-specific rows with a real organizationId
// will override these global ones automatically — see permissionService.
const permissionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    role: { type: String, enum: ROLE_LIST, required: true },
    module: { type: String, enum: MODULE_LIST, required: true },
    action: { type: String, enum: ACTION_LIST, required: true },

    allowed: { type: Boolean, default: false },
    scope: { type: String, enum: Object.values(SCOPES), default: SCOPES.NONE },

    note: { type: String, default: null },
  },
  { timestamps: true }
);

permissionSchema.index(
  { organizationId: 1, role: 1, module: 1, action: 1 },
  { unique: true }
);

module.exports = mongoose.model('Permission', permissionSchema);
