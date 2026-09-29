const { getAppCheck } = require('firebase-admin/app-check');

// Firebase App Check: proves a request comes from our real app / website.
//   APP_CHECK_ENFORCE unset/false → MONITOR: log problems, let requests through
//   APP_CHECK_ENFORCE=true        → ENFORCE: reject requests without a valid token
const enforce = () => String(process.env.APP_CHECK_ENFORCE).toLowerCase() === 'true';

module.exports = async function appCheck(req, res, next) {
  const token = req.header('X-Firebase-AppCheck');
  const where = `${req.method} ${req.originalUrl.split('?')[0]}`;

  if (!token) {
    if (enforce()) {
      return res.status(401).json({ success: false, message: 'Please update the app or refresh the page and try again.' });
    }
    console.warn(`[AppCheck] MISSING token — ${where}`);
    return next();
  }

  try {
    const claims = await getAppCheck().verifyToken(token);
    req.appCheck = claims;
    console.log(`[AppCheck] ok (${claims.appId}) — ${where}`);
    return next();
  } catch (err) {
    if (enforce()) {
      return res.status(401).json({ success: false, message: 'Please update the app or refresh the page and try again.' });
    }
    console.warn(`[AppCheck] INVALID token — ${where}: ${err.message}`);
    return next();
  }
};
