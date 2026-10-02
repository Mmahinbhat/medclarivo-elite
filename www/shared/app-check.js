/**
 * app-check.js — Firebase App Check for MedClarivo
 *
 * Proves to our backend that a request really comes from OUR app or OUR
 * website (not a bot calling the API directly). It works by adding an
 * "X-Firebase-AppCheck" header to every call to the sensitive auth routes.
 *
 *  - iOS app      → Apple App Attest (debug provider in the Simulator)
 *  - Android app  → Google Play Integrity (debug provider in dev builds)
 *  - Website      → invisible reCAPTCHA v3
 *
 * Include this in <head> BEFORE any other script that calls /api/auth/...
 * It never blocks a request: if a token can't be obtained, the request is
 * sent without it and the backend decides (monitor vs enforce mode).
 */
(function () {
  // ── Settings ─────────────────────────────────────────────────
  // reCAPTCHA v3 SITE key (public — safe to ship). Leave empty until created.
  const RECAPTCHA_V3_SITE_KEY = '6LcBI9ctAAAAANFIsKK7qrynmEgTGtLCUZgKqkLo';

  // Debug mode is chosen automatically: Simulator / emulator → Firebase debug
  // provider (uses the debug token you registered in Firebase); a real phone →
  // real App Attest (iPhone) / Play Integrity (Android). TestFlight and store
  // builds therefore always use the real checks.
  // To test a debug build on a real phone (e.g. Saqib's Android from Android
  // Studio), temporarily set FORCE_NATIVE_DEBUG = true — never ship it that way.
  const FORCE_NATIVE_DEBUG = false;

  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCAf2tEBniU0C4HwvkmD9E5MN9lgCKBNzo",
    authDomain: "medclarivo-9efca.firebaseapp.com",
    projectId: "medclarivo-9efca",
    storageBucket: "medclarivo-9efca.firebasestorage.app",
    messagingSenderId: "963399029203",
    appId: "1:963399029203:web:282f6812c665b076215f26"
  };
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.0/';

  // Auth routes that must carry an App Check token.
  const PROTECTED = /\/api\/auth\/(otp-request|phone-login|link-phone|login|register|verify-email|resend-verification|forgot-password|reset-password)(\?|$)/;

  const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src="' + src + '"]')) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }

  let getterPromise = null;

  function init() {
    if (getterPromise) return getterPromise;
    getterPromise = (async () => {
      if (isNative) {
        const P = window.Capacitor.Plugins && window.Capacitor.Plugins.FirebaseAppCheck;
        if (!P) { console.warn('[AppCheck] native plugin missing'); return null; }
        let useDebug = FORCE_NATIVE_DEBUG;
        try {
          const Device = window.Capacitor.Plugins && window.Capacitor.Plugins.Device;
          if (Device) useDebug = useDebug || !!(await Device.getInfo()).isVirtual;
        } catch (e) { /* treat as a real device */ }
        await P.initialize({ debugToken: useDebug, isTokenAutoRefreshEnabled: true });
        return async () => (await P.getToken()).token;
      }

      if (!RECAPTCHA_V3_SITE_KEY) { console.warn('[AppCheck] no reCAPTCHA site key set yet'); return null; }
      if (!window.firebase || !window.firebase.initializeApp) await loadScript(SDK + 'firebase-app-compat.js');
      await loadScript(SDK + 'firebase-app-check-compat.js');
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      const ac = firebase.appCheck();
      ac.activate(new firebase.appCheck.ReCaptchaEnterpriseProvider(RECAPTCHA_V3_SITE_KEY), true);
      return async () => (await ac.getToken()).token;
    })().catch((e) => { console.warn('[AppCheck] init failed:', e && e.message); return null; });
    return getterPromise;
  }

  async function getToken() {
    try {
      const get = await init();
      if (!get) return null;
      return await Promise.race([
        get(),
        new Promise((resolve) => setTimeout(() => resolve(null), 8000)), // never hang the request
      ]);
    } catch (e) {
      console.warn('[AppCheck] token failed:', e && e.message);
      return null;
    }
  }
  window.getAppCheckToken = getToken;

  // Add the header automatically to protected auth calls.
  const origFetch = window.fetch.bind(window);
  window.fetch = async function (input, initOpts) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (!PROTECTED.test(url)) return origFetch(input, initOpts);

    const token = await getToken();
    if (!token) return origFetch(input, initOpts);

    const opts = Object.assign({}, initOpts);
    const headers = new Headers(opts.headers || (typeof input !== 'string' && input.headers) || {});
    headers.set('X-Firebase-AppCheck', token);
    opts.headers = headers;
    return origFetch(input, opts);
  };

  // Warm up early so the first real request doesn't wait.
  init();
})();
