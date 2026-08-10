const crypto = require('crypto');
const Subscription = require('../models/Subscription');

/**
 * IMPORTANT: this handler expects req.body to be the RAW request buffer,
 * not JSON-parsed. Razorpay signs the exact raw bytes it sent, so if
 * express.json() has already parsed and re-serialized the body, the
 * signature check will fail even for genuine requests.
 *
 * Mount this in server.js BEFORE app.use(express.json()), like:
 *
 *   app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), webhookHandler);
 *
 * ...and make sure that line comes before the general express.json() line.
 */
async function webhookHandler(req, res) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret) {
      console.error('RAZORPAY_WEBHOOK_SECRET not set — rejecting webhook');
      return res.status(500).send('Webhook not configured');
    }
    if (!signature) {
      return res.status(400).send('Missing signature');
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(req.body) // raw Buffer
      .digest('hex');

    if (expectedSignature !== signature) {
      console.warn('Razorpay webhook signature mismatch — possible spoofed request');
      return res.status(400).send('Invalid signature');
    }

    const event = JSON.parse(req.body.toString('utf8'));
    const eventType = event.event;
    const payload = event.payload || {};

    // Only subscription.* events matter for us right now.
    const rpSub = payload.subscription && payload.subscription.entity;
    if (!rpSub) {
      // Not a subscription event (could be a payment.* event we don't act on yet) — acknowledge and ignore.
      return res.status(200).send('ok');
    }

    const subscription = await Subscription.findOne({ razorpaySubscriptionId: rpSub.id });
    if (!subscription) {
      console.warn(`Webhook for unknown subscription ${rpSub.id} (event: ${eventType})`);
      return res.status(200).send('ok'); // acknowledge anyway so Razorpay stops retrying
    }

    // Razorpay's subscription status is the source of truth — just mirror it.
    subscription.status = rpSub.status;
    if (rpSub.current_end) {
      subscription.currentPeriodEnd = new Date(rpSub.current_end * 1000); // Razorpay sends unix seconds
    }
    if (['cancelled', 'expired', 'completed'].includes(rpSub.status)) {
      subscription.cancelledAt = subscription.cancelledAt || new Date();
    }
    await subscription.save();

    console.log(`Razorpay webhook processed: ${eventType} → subscription ${rpSub.id} status=${rpSub.status}`);
    res.status(200).send('ok');
  } catch (err) {
    console.error('Webhook processing error:', err);
    // Still return 200 for errors we can't recover from, so Razorpay doesn't
    // hammer us with retries for a permanently-broken payload. Genuine
    // transient failures (DB down, etc.) will surface in logs either way.
    res.status(200).send('ok');
  }
}

module.exports = webhookHandler;
