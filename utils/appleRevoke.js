// Revokes a user's Sign in with Apple tokens when they delete their account.
// Apple requires apps that offer Sign in with Apple to call this on deletion:
// https://developer.apple.com/documentation/sign_in_with_apple/revoke_tokens
const jwt = require('jsonwebtoken');

function appleClientSecret() {
  const { APPLE_TEAM_ID, APPLE_CLIENT_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY } = process.env;
  if (!APPLE_TEAM_ID || !APPLE_CLIENT_ID || !APPLE_KEY_ID || !APPLE_PRIVATE_KEY) return null;
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { iss: APPLE_TEAM_ID, iat: now, exp: now + 300, aud: 'https://appleid.apple.com', sub: APPLE_CLIENT_ID },
    APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    { algorithm: 'ES256', keyid: APPLE_KEY_ID }
  );
}

/** Best-effort: resolves true if Apple accepted the revoke, false otherwise. Never throws. */
async function revokeAppleToken(refreshToken) {
  try {
    if (!refreshToken) return false;
    const secret = appleClientSecret();
    if (!secret) return false;
    const res = await fetch('https://appleid.apple.com/auth/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.APPLE_CLIENT_ID,
        client_secret: secret,
        token: refreshToken,
        token_type_hint: 'refresh_token',
      }),
    });
    if (!res.ok) console.warn('[Apple revoke] HTTP', res.status, await res.text().catch(() => ''));
    return res.ok;
  } catch (err) {
    console.warn('[Apple revoke] failed:', err.message);
    return false;
  }
}

module.exports = { revokeAppleToken };
