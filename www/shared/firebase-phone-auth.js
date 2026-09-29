/**
 * firebase-phone-auth.js — Phone OTP (login/signup + "Verify phone" linking)
 *
 * - Inside the Capacitor app (iOS/Android): uses the native
 *   @capacitor-firebase/authentication plugin (no reCAPTCHA in the WebView).
 * - On the website: uses the Firebase JS SDK with invisible reCAPTCHA.
 * - Before ANY SMS is sent, asks our backend (/auth/otp-request) for
 *   permission — enforces 5 OTPs per number per day.
 * - After verification, sends the Firebase ID token to our backend:
 *     login mode → /auth/phone-login  (creates/finds user, returns our JWT)
 *     link mode  → /auth/link-phone   (links verified number to current account)
 *
 * Usage:
 *   showPhoneLogin()                 — login/signup modal (index.html)
 *   showPhoneVerify(onDone(phone))   — verify/link modal (settings.html)
 */
(function () {
  const API_BASE = 'https://med-clarivo.onrender.com/api';

  // Firebase web config — public by design (not a secret).
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCAf2tEBniU0C4HwvkmD9E5MN9lgCKBNzo",
    authDomain: "medclarivo-9efca.firebaseapp.com",
    projectId: "medclarivo-9efca",
    storageBucket: "medclarivo-9efca.firebasestorage.app",
    messagingSenderId: "963399029203",
    appId: "1:963399029203:web:282f6812c665b076215f26"
  };

  const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const NativeAuth = isNative ? (window.Capacitor.Plugins && window.Capacitor.Plugins.FirebaseAuthentication) : null;

  const MODE_TEXT = {
    login: {
      title: 'Sign in with Phone',
      sub: "We'll send a one-time verification code to your phone.",
      verifyBtn: 'Verify & Sign In',
    },
    link: {
      title: 'Verify your phone',
      sub: "We'll text a code to confirm this number belongs to you.",
      verifyBtn: 'Verify number',
    },
  };

  let mode = 'login';        // 'login' | 'link'
  let onLinked = null;       // callback for link mode
  let currentPhone = null;   // 10-digit number the code was sent to
  let busy = false;          // a send is in progress
  let finishing = false;     // backend exchange in progress

  // Web (Firebase JS SDK)
  let firebaseAuth = null;
  let confirmationResult = null;
  let recaptchaVerifier = null;
  let sdkLoaded = false;

  // Native (Capacitor plugin)
  let nativeVerificationId = null;
  let nativeListenersReady = false;
  let pendingSend = null;    // { resolve, reject } while waiting for phoneCodeSent

  // ── Web: load Firebase SDK dynamically ───────────────────
  function loadFirebaseSDK() {
    return new Promise((resolve, reject) => {
      if (sdkLoaded) return resolve();
      const appScript = document.createElement('script');
      appScript.src = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js';
      appScript.onload = () => {
        const authScript = document.createElement('script');
        authScript.src = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js';
        authScript.onload = () => {
          sdkLoaded = true;
          if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
          firebaseAuth = firebase.auth();
          firebaseAuth.useDeviceLanguage();
          resolve();
        };
        authScript.onerror = () => reject(new Error('Failed to load Firebase Auth SDK'));
        document.head.appendChild(authScript);
      };
      appScript.onerror = () => reject(new Error('Failed to load Firebase SDK'));
      document.head.appendChild(appScript);
    });
  }

  async function ensureWebRecaptcha() {
    if (recaptchaVerifier) return;
    recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptchaContainer', { size: 'invisible' });
    await recaptchaVerifier.render();
  }

  function resetWebRecaptcha() {
    if (recaptchaVerifier) {
      try { recaptchaVerifier.clear(); } catch (e) {}
    }
    recaptchaVerifier = null;
    const c = document.getElementById('recaptchaContainer');
    if (c) c.innerHTML = '';
  }

  // ── Native: plugin listeners ─────────────────────────────
  async function setupNativeListeners() {
    if (nativeListenersReady || !NativeAuth) return;
    nativeListenersReady = true;

    await NativeAuth.addListener('phoneCodeSent', (event) => {
      nativeVerificationId = event.verificationId;
      if (pendingSend) { const p = pendingSend; pendingSend = null; p.resolve(); }
    });

    await NativeAuth.addListener('phoneVerificationFailed', (event) => {
      const err = new Error(event && event.message ? event.message : 'Verification failed.');
      if (pendingSend) { const p = pendingSend; pendingSend = null; p.reject(err); }
      else showOtpError(err.message);
    });

    // Android can verify instantly / auto-read the SMS. The user is then
    // already signed in natively, so finish without waiting for typed code.
    await NativeAuth.addListener('phoneVerificationCompleted', async () => {
      if (pendingSend) { const p = pendingSend; pendingSend = null; p.resolve(); }
      try {
        await finishWithFirebaseToken(await nativeIdToken());
      } catch (e) {
        showOtpError(e.message || 'Verification failed.');
      }
    });
  }

  function nativeSendCode(phoneNumber) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (pendingSend) { pendingSend = null; reject(new Error('Timed out sending the code. Please try again.')); }
      }, 60000);
      pendingSend = {
        resolve: () => { clearTimeout(timer); resolve(); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      };
      NativeAuth.signInWithPhoneNumber({ phoneNumber }).catch((e) => {
        if (pendingSend) { const p = pendingSend; pendingSend = null; p.reject(e); }
      });
    });
  }

  async function nativeIdToken() {
    const result = await NativeAuth.getIdToken();
    if (!result || !result.token) throw new Error('Could not get verification token.');
    return result.token;
  }

  async function firebaseSignOut() {
    // We only use Firebase to prove phone ownership; our own JWT is the session.
    try {
      if (isNative && NativeAuth) await NativeAuth.signOut();
      else if (firebaseAuth) await firebaseAuth.signOut();
    } catch (e) {}
  }

  // ── Backend calls ────────────────────────────────────────
  async function requestOtpSlot(fullPhone) {
    let res, data = {};
    try {
      res = await fetch(API_BASE + '/auth/otp-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      });
      data = await res.json().catch(() => ({}));
    } catch (e) {
      throw new Error('Network error. Please check your internet connection.');
    }
    if (!res.ok || !data.success) {
      const msg = data.message || (data.errors && data.errors[0] && data.errors[0].msg) || 'Could not send OTP right now.';
      const err = new Error(msg);
      err.fromBackend = true;
      throw err;
    }
    return data;
  }

  function goToDashboard(user) {
    if (typeof redirectToDashboard === 'function') return redirectToDashboard();
    const role = (user && user.role ? user.role : '').toLowerCase();
    const byRole = {
      mentor: 'mentor-dashboard.html',
      assistant: 'assistant-dashboard.html',
      parent: 'parent-dashboard.html',
      admin: 'admin-dashboard.html',
      super_admin: 'admin-dashboard.html',
    };
    if (byRole[role]) window.location.href = byRole[role];
    else if (user && user.onboardingComplete) window.location.href = 'dashboard.html';
    else window.location.href = 'onboarding.html';
  }

  async function finishWithFirebaseToken(idToken) {
    if (finishing) return;
    finishing = true;
    try {
      if (mode === 'link') {
        const res = await fetch(API_BASE + '/auth/link-phone', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + (localStorage.getItem('mc_token') || ''),
          },
          body: JSON.stringify({ firebaseIdToken: idToken }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) throw new Error(data.message || 'Could not verify this number.');

        try {
          const u = JSON.parse(localStorage.getItem('mc_user') || '{}');
          u.phone = data.phone;
          u.phoneVerified = true;
          localStorage.setItem('mc_user', JSON.stringify(u));
        } catch (e) {}

        await firebaseSignOut();
        const cb = onLinked;
        closePhoneAuth();
        if (typeof cb === 'function') cb(data.phone);
        return;
      }

      // login / signup
      const res = await fetch(API_BASE + '/auth/phone-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseIdToken: idToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || 'Verification failed. Please try again.');

      localStorage.setItem('mc_token', data.token);
      localStorage.setItem('mc_user', JSON.stringify(data.user));
      await firebaseSignOut();
      closePhoneAuth();

      if (typeof showToast === 'function') {
        const name = (data.user && data.user.name) || 'there';
        showToast('✅ Welcome' + (name !== 'User' ? ', ' + name.split(' ')[0] : '') + '!', 'success');
      }
      setTimeout(() => goToDashboard(data.user), 800);
    } finally {
      finishing = false;
    }
  }

  // ── Modal ────────────────────────────────────────────────
  function createModal() {
    if (document.getElementById('phoneAuthModal')) return;

    const modal = document.createElement('div');
    modal.id = 'phoneAuthModal';
    modal.style.display = 'none';
    modal.innerHTML = `
      <style>
        #phoneAuthModal {
          position:fixed; inset:0; z-index:9999;
          background:rgba(0,0,0,0.5);
          display:flex; align-items:center; justify-content:center;
          padding:24px;
          opacity:0; transition:opacity 0.3s;
        }
        #phoneAuthModal.show { opacity:1; }
        #phoneAuthModal .pam-card {
          background:#fff; border-radius:16px; padding:32px 28px;
          max-width:400px; width:100%; box-shadow:0 20px 60px rgba(0,0,0,0.15);
          position:relative;
        }
        #phoneAuthModal .pam-close {
          position:absolute; top:12px; right:12px;
          background:none; border:none; font-size:20px; cursor:pointer;
          color:#94A3B8; padding:4px 8px; line-height:1;
        }
        #phoneAuthModal .pam-close:hover { color:#0C1B2E; }
        #phoneAuthModal .pam-title {
          font-family:'DM Serif Display', serif;
          font-size:24px; color:#0C1B2E; margin-bottom:6px;
        }
        #phoneAuthModal .pam-sub {
          font-size:14px; color:#4A5568; margin-bottom:24px;
        }
        #phoneAuthModal .pam-input-wrap {
          display:flex; align-items:center; gap:8px; margin-bottom:16px;
        }
        #phoneAuthModal .pam-prefix {
          background:#F7F9FC; border:1.5px solid #E2E8F0; border-radius:8px;
          padding:12px 10px; font-size:14px; font-weight:600; color:#0C1B2E;
          white-space:nowrap;
        }
        #phoneAuthModal .pam-input {
          flex:1; padding:12px 14px; font-size:15px;
          border:1.5px solid #E2E8F0; border-radius:8px;
          font-family:'DM Sans',sans-serif; color:#0C1B2E;
          outline:none; transition:border-color 0.2s;
        }
        #phoneAuthModal .pam-input:focus { border-color:#1B4FD8; }
        #phoneAuthModal .pam-input::placeholder { color:#94A3B8; }
        #phoneAuthModal .pam-btn {
          width:100%; padding:13px; background:#0C1B2E; color:#fff;
          font-family:'DM Sans',sans-serif; font-size:14px; font-weight:600;
          border:none; border-radius:8px; cursor:pointer;
          transition:background 0.2s, opacity 0.2s;
        }
        #phoneAuthModal .pam-btn:hover { background:#1B4FD8; }
        #phoneAuthModal .pam-btn:disabled { opacity:0.6; cursor:not-allowed; }
        #phoneAuthModal .pam-error {
          color:#DC2626; font-size:13px; margin-bottom:12px; display:none;
        }
        #phoneAuthModal .pam-error.show { display:block; }
        #phoneAuthModal .pam-otp-inputs {
          display:flex; gap:8px; justify-content:center; margin-bottom:20px;
        }
        #phoneAuthModal .pam-otp-digit {
          width:46px; height:52px; text-align:center; font-size:22px;
          font-family:'JetBrains Mono','DM Sans',monospace; font-weight:600;
          border:1.5px solid #E2E8F0; border-radius:10px; color:#0C1B2E;
          outline:none; transition:border-color 0.2s;
        }
        #phoneAuthModal .pam-otp-digit:focus { border-color:#1B4FD8; }
        #phoneAuthModal .pam-resend {
          text-align:center; margin-top:16px; font-size:13px; color:#4A5568;
        }
        #phoneAuthModal .pam-resend a {
          color:#1B4FD8; font-weight:600; cursor:pointer; text-decoration:none;
        }
        #phoneAuthModal .pam-spinner {
          display:inline-block; width:16px; height:16px;
          border:2px solid rgba(255,255,255,0.3); border-top-color:#fff;
          border-radius:50%; animation:pamSpin 0.7s linear infinite;
          vertical-align:middle; margin-right:6px;
        }
        @keyframes pamSpin { to { transform:rotate(360deg); } }
        #phoneAuthModal [data-step="otp"] { display:none; }
        @media (max-width: 380px) {
          #phoneAuthModal .pam-otp-digit { width:40px; height:48px; font-size:20px; }
          #phoneAuthModal .pam-card { padding:28px 20px; }
        }
      </style>

      <div class="pam-card">
        <button class="pam-close" type="button" onclick="closePhoneAuth()" aria-label="Close">&times;</button>

        <!-- Step 1: Phone number -->
        <div data-step="phone">
          <div class="pam-title" id="pamTitle">Sign in with Phone</div>
          <div class="pam-sub" id="pamSub">We'll send a one-time verification code to your phone.</div>
          <div class="pam-error" id="pamPhoneError"></div>
          <div class="pam-input-wrap">
            <span class="pam-prefix">+91</span>
            <input class="pam-input" id="pamPhone" type="tel" placeholder="10-digit mobile number"
                   maxlength="10" inputmode="numeric" pattern="[0-9]*" autocomplete="tel">
          </div>
          <div id="recaptchaContainer" style="margin-bottom:16px;"></div>
          <button class="pam-btn" id="pamSendBtn" type="button" onclick="sendOTP()">Send OTP</button>
        </div>

        <!-- Step 2: OTP verification -->
        <div data-step="otp">
          <div class="pam-title">Enter OTP</div>
          <div class="pam-sub" id="pamOtpSub">Code sent to +91 XXXXXXXXXX</div>
          <div class="pam-error" id="pamOtpError"></div>
          <div class="pam-otp-inputs" id="pamOtpInputs">
            <input class="pam-otp-digit" type="tel" maxlength="1" inputmode="numeric" autocomplete="one-time-code" data-idx="0">
            <input class="pam-otp-digit" type="tel" maxlength="1" inputmode="numeric" data-idx="1">
            <input class="pam-otp-digit" type="tel" maxlength="1" inputmode="numeric" data-idx="2">
            <input class="pam-otp-digit" type="tel" maxlength="1" inputmode="numeric" data-idx="3">
            <input class="pam-otp-digit" type="tel" maxlength="1" inputmode="numeric" data-idx="4">
            <input class="pam-otp-digit" type="tel" maxlength="1" inputmode="numeric" data-idx="5">
          </div>
          <button class="pam-btn" id="pamVerifyBtn" type="button" onclick="verifyOTP()">Verify & Sign In</button>
          <div class="pam-resend">
            <span id="pamResendTimer">Resend in <strong>30s</strong></span>
            <a id="pamResendLink" style="display:none;" onclick="resendOTP()">Resend OTP</a>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    setupOTPInputs();

    // PHONE_DIGITS_ONLY
    document.getElementById('pamPhone').addEventListener('input', function () {
      const clean = this.value.replace(/\D/g, '').slice(0, 10);
      if (this.value !== clean) this.value = clean;
    });
    document.getElementById('pamPhone').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); window.sendOTP(); }
    });
  }

  function setupOTPInputs() {
    const digits = document.querySelectorAll('.pam-otp-digit');
    digits.forEach((input, i) => {
      input.addEventListener('input', function () {
        // iOS one-time-code autofill can drop all 6 digits into the first box
        const raw = this.value.replace(/\D/g, '');
        if (raw.length > 1) {
          raw.slice(0, 6).split('').forEach((ch, idx) => { if (digits[idx]) digits[idx].value = ch; });
          if (raw.length >= 6) window.verifyOTP();
          else if (digits[raw.length]) digits[raw.length].focus();
          return;
        }
        this.value = raw;
        if (this.value && i < digits.length - 1) digits[i + 1].focus();
        if (i === digits.length - 1 && this.value) {
          const code = Array.from(digits).map(d => d.value).join('');
          if (code.length === 6) window.verifyOTP();
        }
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !this.value && i > 0) digits[i - 1].focus();
      });
      input.addEventListener('paste', function (e) {
        e.preventDefault();
        const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
        pasted.split('').forEach((ch, idx) => { if (digits[idx]) digits[idx].value = ch; });
        if (pasted.length >= 6) window.verifyOTP();
        else if (digits[pasted.length]) digits[pasted.length].focus();
      });
    });
  }

  function applyModeText() {
    const t = MODE_TEXT[mode] || MODE_TEXT.login;
    document.getElementById('pamTitle').textContent = t.title;
    document.getElementById('pamSub').textContent = t.sub;
    document.getElementById('pamVerifyBtn').textContent = t.verifyBtn;
  }

  async function openModal(newMode) {
    mode = newMode;
    createModal();
    resetModal();
    applyModeText();

    const modal = document.getElementById('phoneAuthModal');
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('show'));

    if (isNative) {
      if (!NativeAuth) {
        showPhoneError('Phone verification is not available in this version of the app. Please update the app.');
      } else {
        try { await setupNativeListeners(); } catch (e) { console.error('[Phone Auth] listeners', e); }
      }
    } else {
      try {
        await loadFirebaseSDK();
      } catch (err) {
        console.error(err);
        showPhoneError('Failed to load verification service. Please check your internet and try again.');
      }
    }

    const input = document.getElementById('pamPhone');
    if (input) input.focus();
  }

  window.showPhoneLogin = function () {
    onLinked = null;
    return openModal('login');
  };

  window.showPhoneVerify = function (onDone) {
    onLinked = typeof onDone === 'function' ? onDone : null;
    return openModal('link');
  };

  window.closePhoneAuth = function () {
    const modal = document.getElementById('phoneAuthModal');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => { modal.style.display = 'none'; }, 300);
    }
    stopResendTimer();
    resetModal();
    onLinked = null;
  };

  function resetModal() {
    const phoneStep = document.querySelector('[data-step="phone"]');
    const otpStep = document.querySelector('[data-step="otp"]');
    if (phoneStep) phoneStep.style.display = '';
    if (otpStep) otpStep.style.display = 'none';
    const input = document.getElementById('pamPhone');
    if (input) input.value = '';
    document.querySelectorAll('.pam-otp-digit').forEach(d => { d.value = ''; });
    hidePhoneError();
    hideOtpError();
    confirmationResult = null;
    nativeVerificationId = null;
    currentPhone = null;
  }

  function showOtpStep(phone) {
    document.querySelector('[data-step="phone"]').style.display = 'none';
    document.querySelector('[data-step="otp"]').style.display = 'block';
    document.getElementById('pamOtpSub').textContent =
      'Code sent to +91 ' + phone.slice(0, 3) + '****' + phone.slice(7);
    document.querySelectorAll('.pam-otp-digit').forEach(d => { d.value = ''; });
    const first = document.querySelector('.pam-otp-digit');
    if (first) first.focus();
  }

  function friendlySendError(err) {
    if (err.fromBackend) return err.message;
    const code = err.code || '';
    const msg = err.message || '';
    if (code === 'auth/too-many-requests' || /too many/i.test(msg)) return 'Too many attempts. Please wait a few minutes and try again.';
    if (code === 'auth/invalid-phone-number' || /invalid.*phone/i.test(msg)) return 'That phone number looks invalid.';
    if (code === 'auth/captcha-check-failed') return 'Verification check failed. Please reload and try again.';
    if (code === 'auth/quota-exceeded') return 'SMS limit reached. Please try again later.';
    return 'Failed to send OTP. ' + (msg || 'Please try again.');
  }

  function friendlyVerifyError(err) {
    const code = err.code || '';
    const msg = err.message || '';
    if (code === 'auth/invalid-verification-code' || (/invalid/i.test(msg) && /code/i.test(msg))) return 'Incorrect code. Please check and try again.';
    if (code === 'auth/code-expired' || /expired/i.test(msg)) return 'Code expired. Please resend.';
    return msg || 'Verification failed. Please try again.';
  }

  // ── Send OTP ─────────────────────────────────────────────
  async function doSend(fromResend) {
    if (busy) return;
    const phone = (document.getElementById('pamPhone').value || '').replace(/\D/g, '') || currentPhone || '';
    const showErr = fromResend ? showOtpError : showPhoneError;

    if (phone.length !== 10) {
      showErr('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (isNative && !NativeAuth) {
      showErr('Phone verification is not available in this version of the app. Please update the app.');
      return;
    }

    const fullPhone = '+91' + phone;
    const btn = document.getElementById('pamSendBtn');
    busy = true;
    btn.disabled = true;
    btn.innerHTML = '<span class="pam-spinner"></span>Sending...';
    hidePhoneError();
    hideOtpError();

    try {
      // 1) Our daily limit (5 per number) — checked BEFORE any SMS is sent
      await requestOtpSlot(fullPhone);

      // 2) Ask Firebase to send the SMS
      if (isNative) {
        await setupNativeListeners();
        nativeVerificationId = null;
        await nativeSendCode(fullPhone);
      } else {
        if (!sdkLoaded) await loadFirebaseSDK();
        await ensureWebRecaptcha();
        confirmationResult = await firebaseAuth.signInWithPhoneNumber(fullPhone, recaptchaVerifier);
      }

      currentPhone = phone;
      if (!finishing) {
        showOtpStep(phone);
        startResendTimer();
      }
    } catch (err) {
      console.error('[Phone Auth] send', err);
      showErr(friendlySendError(err));
      if (!isNative) resetWebRecaptcha();
    } finally {
      busy = false;
      btn.disabled = false;
      btn.innerHTML = 'Send OTP';
    }
  }

  window.sendOTP = function () { return doSend(false); };
  window.resendOTP = function () { return doSend(true); };

  // ── Verify OTP ───────────────────────────────────────────
  window.verifyOTP = async function () {
    if (finishing) return;
    const digits = document.querySelectorAll('.pam-otp-digit');
    const code = Array.from(digits).map(d => d.value).join('');

    if (code.length !== 6) {
      showOtpError('Please enter the 6-digit code.');
      return;
    }
    if (isNative ? !nativeVerificationId : !confirmationResult) {
      showOtpError('Session expired. Please resend OTP.');
      return;
    }

    const btn = document.getElementById('pamVerifyBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="pam-spinner"></span>Verifying...';
    hideOtpError();

    try {
      let idToken;
      if (isNative) {
        await NativeAuth.confirmVerificationCode({
          verificationId: nativeVerificationId,
          verificationCode: code,
        });
        idToken = await nativeIdToken();
      } else {
        const result = await confirmationResult.confirm(code);
        idToken = await result.user.getIdToken();
      }
      await finishWithFirebaseToken(idToken);
    } catch (err) {
      console.error('[Phone Auth] verify', err);
      showOtpError(friendlyVerifyError(err));
    } finally {
      btn.disabled = false;
      btn.textContent = (MODE_TEXT[mode] || MODE_TEXT.login).verifyBtn;
    }
  };

  // ── Resend timer ─────────────────────────────────────────
  let resendInterval = null;

  function startResendTimer() {
    stopResendTimer();
    let seconds = 30;
    const timerEl = document.getElementById('pamResendTimer');
    const linkEl = document.getElementById('pamResendLink');
    timerEl.style.display = '';
    linkEl.style.display = 'none';
    timerEl.innerHTML = 'Resend in <strong>' + seconds + 's</strong>';
    resendInterval = setInterval(() => {
      seconds -= 1;
      if (seconds <= 0) {
        stopResendTimer();
        timerEl.style.display = 'none';
        linkEl.style.display = '';
      } else {
        timerEl.innerHTML = 'Resend in <strong>' + seconds + 's</strong>';
      }
    }, 1000);
  }

  function stopResendTimer() {
    if (resendInterval) clearInterval(resendInterval);
    resendInterval = null;
  }

  // ── Error helpers ────────────────────────────────────────
  function showPhoneError(msg) {
    const el = document.getElementById('pamPhoneError');
    if (el) { el.textContent = msg; el.classList.add('show'); }
  }
  function hidePhoneError() {
    const el = document.getElementById('pamPhoneError');
    if (el) el.classList.remove('show');
  }
  function showOtpError(msg) {
    const el = document.getElementById('pamOtpError');
    if (el) { el.textContent = msg; el.classList.add('show'); }
  }
  function hideOtpError() {
    const el = document.getElementById('pamOtpError');
    if (el) el.classList.remove('show');
  }
})();
