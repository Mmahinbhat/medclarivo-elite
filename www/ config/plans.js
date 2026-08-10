// Central place to define pricing. Change numbers here — nothing else needs
// to change. razorpayPlanId values are placeholders; fill them in once you
// create matching Plans in the Razorpay Dashboard (Products > Plans).
//
// Razorpay amounts are always in the smallest currency unit (paise for INR),
// so ₹499 = 49900.

const PLANS = {
  basic_monthly: {
    tier: 'basic',
    billingCycle: 'monthly',
    label: 'Basic',
    priceDisplay: '₹499/mo',
    amount: 49900,
    currency: 'INR',
    interval: 1,
    period: 'monthly',
    razorpayPlanId: process.env.RAZORPAY_PLAN_BASIC_MONTHLY || null,
  },
  basic_yearly: {
    tier: 'basic',
    billingCycle: 'yearly',
    label: 'Basic',
    priceDisplay: '₹4,999/yr',
    amount: 499900,
    currency: 'INR',
    interval: 1,
    period: 'yearly',
    razorpayPlanId: process.env.RAZORPAY_PLAN_BASIC_YEARLY || null,
  },
  elite_monthly: {
    tier: 'elite',
    billingCycle: 'monthly',
    label: 'Elite',
    priceDisplay: '₹1,499/mo',
    amount: 149900,
    currency: 'INR',
    interval: 1,
    period: 'monthly',
    razorpayPlanId: process.env.RAZORPAY_PLAN_ELITE_MONTHLY || null,
  },
  elite_yearly: {
    tier: 'elite',
    billingCycle: 'yearly',
    label: 'Elite',
    priceDisplay: '₹14,999/yr',
    amount: 1499900,
    currency: 'INR',
    interval: 1,
    period: 'yearly',
    razorpayPlanId: process.env.RAZORPAY_PLAN_ELITE_YEARLY || null,
  },
};

function getPlan(planKey) {
  return PLANS[planKey] || null;
}

module.exports = { PLANS, getPlan };
