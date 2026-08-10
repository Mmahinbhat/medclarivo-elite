const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    planKey: {
      // matches a key in config/plans.js, e.g. 'elite_monthly'
      type: String,
      required: true,
    },
    tier: {
      type: String,
      enum: ['basic', 'elite'],
      required: true,
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      required: true,
    },
    // Razorpay's subscription id (sub_xxxxx) — the source of truth for status
    razorpaySubscriptionId: {
      type: String,
      required: true,
      unique: true,
    },
    razorpayCustomerId: {
      type: String,
      default: null,
    },
    // Mirrors Razorpay's subscription status values:
    // created, authenticated, active, pending, halted, cancelled, completed, expired
    status: {
      type: String,
      enum: ['created', 'authenticated', 'active', 'pending', 'halted', 'cancelled', 'completed', 'expired'],
      default: 'created',
      index: true,
    },
    currentPeriodEnd: {
      // when the current billing cycle ends / next charge is due
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// One active-ish subscription record per user is the common case, but we
// don't hard-enforce uniqueness on `user` alone — a user could have an old
// cancelled one and a new active one in history. Callers should query by
// { user, status: 'active' } when checking access.
subscriptionSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
