const Subscription = require('../models/Subscription');

const TIER_RANK = { basic: 1, elite: 2 };

/**
 * Use after `protect` on any route that should require an active paid plan.
 *   router.get('/premium-thing', protect, requireSubscription('basic'), handler);
 *   router.get('/elite-thing', protect, requireSubscription('elite'), handler);
 */
function requireSubscription(minTier = 'basic') {
  return async function (req, res, next) {
    try {
      const sub = await Subscription.findOne({
        user: req.user._id,
        status: 'active',
      }).sort('-createdAt');

      if (!sub) {
        return res.status(403).json({ success: false, message: 'An active subscription is required for this.' });
      }
      if (TIER_RANK[sub.tier] < TIER_RANK[minTier]) {
        return res.status(403).json({ success: false, message: `This requires the ${minTier} plan or higher.` });
      }

      req.subscription = sub;
      next();
    } catch (err) {
      console.error('requireSubscription error:', err);
      res.status(500).json({ success: false, message: 'Could not verify subscription.' });
    }
  };
}

module.exports = requireSubscription;
