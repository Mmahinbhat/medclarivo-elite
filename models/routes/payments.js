const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { PLANS, getPlan } = require('../config/plans');
const { getRazorpay } = require('../utils/razorpay');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

router.use(protect);

// GET /api/payments/plans — public-facing plan list (no Razorpay ids exposed)
router.get('/plans', (req, res) => {
  const plans = Object.entries(PLANS).map(([key, p]) => ({
    planKey: key,
    tier: p.tier,
    billingCycle: p.billingCycle,
    label: p.label,
    priceDisplay: p.priceDisplay,
    amount: p.amount,
    currency: p.currency,
  }));
  res.json({ success: true, plans });
});

// GET /api/payments/me — the logged-in user's current subscription, if any
router.get('/me', async (req, res) => {
  try {
    const sub = await Subscription.findOne({ user: req.user._id })
      .sort('-createdAt')
      .lean();
    res.json({ success: true, subscription: sub || null });
  } catch (err) {
    console.error('Fetch subscription error:', err);
    res.status(500).json({ success: false, message: 'Failed to load subscription.' });
  }
});

// POST /api/payments/subscribe — body: { planKey }
// Creates (or reuses) a Razorpay customer, creates a Razorpay subscription,
// and returns what the frontend needs to open Razorpay Checkout.
router.post('/subscribe', async (req, res) => {
  try {
    const { planKey } = req.body;
    const plan = getPlan(planKey);
    if (!plan) return res.status(400).json({ success: false, message: 'Invalid plan.' });
    if (!plan.razorpayPlanId) {
      return res.status(503).json({ success: false, message: 'This plan is not configured yet. Try again shortly.' });
    }

    const razorpay = getRazorpay();
    const user = await User.findById(req.user._id);

    // Reuse an existing Razorpay customer if we've already created one for
    // this user (stored on their most recent subscription record).
    let razorpayCustomerId = null;
    const lastSub = await Subscription.findOne({ user: user._id, razorpayCustomerId: { $ne: null } }).sort('-createdAt');
    if (lastSub) {
      razorpayCustomerId = lastSub.razorpayCustomerId;
    } else {
      const customer = await razorpay.customers.create({
        name: user.name || 'MedClarivo User',
        email: user.email,
        contact: user.phone || undefined,
        fail_existing: 0, // if a customer with this email already exists on Razorpay, reuse it instead of erroring
      });
      razorpayCustomerId = customer.id;
    }

    const rpSubscription = await razorpay.subscriptions.create({
      plan_id: plan.razorpayPlanId,
      customer_notify: 1,
      total_count: plan.billingCycle === 'monthly' ? 12 : 5, // 12 monthly cycles or 5 yearly cycles before it needs manual renewal setup — adjust as needed
      notes: {
        userId: String(user._id),
        planKey,
      },
    });

    await Subscription.create({
      user: user._id,
      planKey,
      tier: plan.tier,
      billingCycle: plan.billingCycle,
      razorpaySubscriptionId: rpSubscription.id,
      razorpayCustomerId,
      status: rpSubscription.status, // usually 'created' at this point
    });

    res.status(201).json({
      success: true,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      razorpaySubscriptionId: rpSubscription.id,
      plan: { label: plan.label, priceDisplay: plan.priceDisplay },
    });
  } catch (err) {
    console.error('Create subscription error:', err);
    res.status(500).json({ success: false, message: 'Failed to start subscription.' });
  }
});

// POST /api/payments/cancel — cancels the user's active subscription
router.post('/cancel', async (req, res) => {
  try {
    const sub = await Subscription.findOne({ user: req.user._id, status: { $in: ['active', 'authenticated', 'pending'] } }).sort('-createdAt');
    if (!sub) return res.status(404).json({ success: false, message: 'No active subscription found.' });

    const razorpay = getRazorpay();
    await razorpay.subscriptions.cancel(sub.razorpaySubscriptionId, { cancel_at_cycle_end: 0 });

    sub.status = 'cancelled';
    sub.cancelledAt = new Date();
    await sub.save();

    res.json({ success: true });
  } catch (err) {
    console.error('Cancel subscription error:', err);
    res.status(500).json({ success: false, message: 'Failed to cancel subscription.' });
  }
});

module.exports = router;
