const Razorpay = require('razorpay');

let instance = null;

function getRazorpay() {
  if (instance) return instance;

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set in environment');
  }

  instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  return instance;
}

module.exports = { getRazorpay };
