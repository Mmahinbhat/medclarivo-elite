const User = require('../models/User');
const auditService = require('../services/auditService');
const { scopeFilter } = require('../middleware/rbac');
const { ROLES, MANAGEABLE_ROLES, MODULES } = require('../utils/rbacConstants');

async function createUser(req, res) {
  const { name, email, password, role, mentorId } = req.body;

  const allowedRoles = MANAGEABLE_ROLES[req.user.role] || [];
  if (!allowedRoles.includes(role)) {
    return res.status(403).json({ success: false, message: `A ${req.user.role} cannot create a ${role}.` });
  }

  if (role === ROLES.ASSISTANT) {
    if (!mentorId) return res.status(400).json({ success: false, message: 'Assistants must be linked to a mentorId.' });
    const mentor = await User.findOne({ _id: mentorId, role: ROLES.MENTOR });
    if (!mentor) return res.status(400).json({ success: false, message: 'mentorId does not reference a valid Mentor.' });
  }

  try {
    const user = await User.create({
      name,
      email,
      passwordHash: password,
      role,
      mentorId: role === ROLES.ASSISTANT ? mentorId : null,
    });

    await auditService.log({
      actor: req.user,
      action: 'user.create',
      module: MODULES.USER,
      targetType: 'User',
      targetId: user._id,
      after: { name: user.name, email: user.email, role: user.role },
      req,
    });

    res.status(201).json({ success: true, user });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function listUsers(req, res) {
  const filter = scopeFilter(req, { assignedField: 'mentorId' });
  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, users });
}

async function suspendUser(req, res) {
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ success: false, message: 'User not found.' });

  const allowedRoles = MANAGEABLE_ROLES[req.user.role] || [];
  if (!allowedRoles.includes(target.role)) {
    return res.status(403).json({ success: false, message: `A ${req.user.role} cannot suspend a ${target.role}.` });
  }

  const before = { isActive: target.isActive };
  target.isActive = false;
  target.suspendedAt = new Date();
  target.suspendedReason = req.body.reason || null;
  target.permissionVersion += 1;
  await target.save();

  await auditService.log({
    actor: req.user,
    action: 'user.suspend',
    module: MODULES.USER,
    targetType: 'User',
    targetId: target._id,
    before,
    after: { isActive: false, reason: target.suspendedReason },
    req,
  });

  res.json({ success: true, message: 'User suspended.' });
}

async function reactivateUser(req, res) {
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ success: false, message: 'User not found.' });

  const allowedRoles = MANAGEABLE_ROLES[req.user.role] || [];
  if (!allowedRoles.includes(target.role)) {
    return res.status(403).json({ success: false, message: `A ${req.user.role} cannot reactivate a ${target.role}.` });
  }

  target.isActive = true;
  target.suspendedAt = null;
  target.suspendedReason = null;
  await target.save();

  await auditService.log({
    actor: req.user,
    action: 'user.reactivate',
    module: MODULES.USER,
    targetType: 'User',
    targetId: target._id,
    after: { isActive: true },
    req,
  });

  res.json({ success: true, message: 'User reactivated.' });
}

module.exports = { createUser, listUsers, suspendUser, reactivateUser };
