/**
 * firebase-phone-auth.js — Firebase Phone OTP Authentication
 *
 * Loads Firebase JS SDK, handles phone number → OTP → verify flow.
 * After verification, sends the Firebase ID token to the backend
 * which creates/finds the user and returns a JWT.
 *
 * Usage: include this script on login/signup pages, then call:
 *   showPhoneLogin()  — opens the phone OTP modal
 */
(function() {
  const API_BASE = 'https://med-clarivo.onrender.com/api';

  // ── Firebase Web Config ──────────────────────────────────
  // TODO: Replace with your actual Firebase config from
  // Firebase Console → Project Settings → Your apps → Web app
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCAf2tEBniU0C4HwvkmD9E5MN9lgCKBNzo",
    authDomain: "medclarivo-9efca.firebaseapp.com",
    projectId: "medclarivo-9efca",
    storageBucket: "medclarivo-9efca.firebasestorage.app",
    messagingSenderId: "963399029203",
    appId: "1:963399029203:web:282f6812c665b076215f26"
  };

  let firebaseAuth = null;
  let confirmationResult = null;
  let recaptchaVerifier = null;
  let sdkLoaded = false;

  // ── Load Firebase SDK dynamically ────────────────────────
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
          // Initialize Firebase
          if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
          }
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

  // ── Create / inject the phone login modal ────────────────
  function createModal() {
    if (document.getElementById('phoneAuthModal')) return;

    const modal = document.createElement('div');
    modal.id = 'phoneAuthModal';
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
      </style>

      <div class="pam-card">
        <button class="pam-close" onclick="closePhoneAuth()">&times;</button>

        <!-- Step 1: Phone number -->
        <div data-step="phone">
          <div class="pam-title">Sign in with Phone</div>
          <div class="pam-sub">We'll send a one-time verification code to your phone.</div>
          <div class="pam-error" id="pamPhoneError"></div>
          <div class="pam-input-wrap">
            <span class="pam-prefix">+91</span>
            <input class="pam-input" id="pamPhone" type="tel" placeholder="10-digit mobile number"
                   maxlength="10" inputmode="numeric" pattern="[0-9]*" autocomplete="tel">
          </div>
          <div id="recaptchaContainer" style="margin-bottom:16px;"></div>
          <button class="pam-btn" id="pamSendBtn" onclick="sendOTP()">Send OTP</button>
        </div>

        <!-- Step 2: OTP verification -->
        <div data-step="otp">
          <div class="pam-title">Enter OTP</div>
          <div class="pam-sub" id="pamOtpSub">Code sent to +91 XXXXXXXXXX</div>
          <div class="pam-error" id="pamOtpError"></div>
          <div class="pam-otp-inputs" id="pamOtpInputs">
            <input class="pam-otp-digit" type="tel" maxlength="1" inputmode="numeric" data-idx="0">
            <input class="pam-otp-digit" type="tel" maxlength="1" inputmode="numeric" data-idx="1">
            <input class="pam-otp-digit" type="tel" maxlength="1" inputmode="numeric" data-idx="2">
            <input class="pam-otp-digit" type="tel" maxlength="1" inputmode="numeric" data-idx="3">
            <input class="pam-otp-digit" type="tel" maxlength="1" inputmode="numeric" data-idx="4">
            <input class="pam-otp-digit" type="tel" maxlength="1" inputmode="numeric" data-idx="5">
          </div>
          <button class="pam-btn" id="pamVerifyBtn" onclick="verifyOTP()">Verify & Sign In</button>
          <div class="pam-resend">
            <span id="pamResendTimer">Resend in <strong>30s</strong></span>
            <a id="pamResendLink" style="display:none;" onclick="resendOTP()">Resend OTP</a>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // OTP input auto-advance
    setupOTPInputs();
  }

  function setupOTPInputs() {
    const digits = document.querySelectorAll('.pam-otp-digit');
    digits.forEach((input, i) => {
      input.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '');
        if (this.value && i < digits.length - 1) {
          digits[i + 1].focus();
        }
        // Auto-verify when all 6 digits entered
        if (i === digits.length - 1 && this.value) {
          const code = Array.from(digits).map(d => d.value).join('');
          if (code.length === 6) verifyOTP();
        }
      });
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' && !this.value && i > 0) {
          digits[i - 1].focus();
        }
      });
      // Handle paste
      input.addEventListener('paste', function(e) {
        e.preventDefault();
        const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
        pasted.split('').forEach((ch, idx) => {
          if (digits[idx]) digits[idx].value = ch;
        });
        if (pasted.length >= 6) verifyOTP();
        else if (digits[pasted.length]) digits[pasted.length].focus();
      });
    });
  }

  // ── Show/hide modal ─────────────────────────────────────
  window.showPhoneLogin = async function() {
    createModal();
    const modal = document.getElementById('phoneAuthModal');
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('show'));

    try {
      await loadFirebaseSDK();
      // Set up invisible reCAPTCHA
      if (!recaptchaVerifier) {
        recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptchaContainer', {
          size: 'invisible',
          callback: function() {
            // reCAPTCHA solved — will proceed with sendOTP
          }
        });
        recaptchaVerifier.render();
      }
    } catch (err) {
      showPhoneError('Failed to load verification service. Please try again.');
      console.error(err);
    }

    document.getElementById('pamPhone').focus();
  };

  window.closePhoneAuth = function() {
    const modal = document.getElementById('phoneAuthModal');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => modal.style.display = 'none', 300);
    }
    // Reset to phone step
    resetModal();
  };

  function resetModal() {
    const phoneStep = document.querySelector('[data-step="phone"]');
    const otpStep = document.querySelector('[data-step="otp"]');
    if (phoneStep) phoneStep.style.display = '';
    if (otpStep) otpStep.style.display = 'none';
    confirmationResult = null;
  }

  // ── Send OTP ────────────────────────────────────────────
  window.sendOTP = async function() {
    const phoneInput = document.getElementById('pamPhone');
    const phone = phoneInput.value.replace(/\D/g, '');

    if (phone.length !== 10) {
      showPhoneError('Please enter a valid 10-digit mobile number.');
      return;
    }

    const fullPhone = '+91' + phone;
    const btn = document.getElementById('pamSendBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="pam-spinner"></span>Sending...';
    hidePhoneError();

    try {
      confirmationResult = await firebaseAuth.signInWithPhoneNumber(fullPhone, recaptchaVerifier);

      // Switch to OTP step
      document.querySelector('[data-step="phone"]').style.display = 'none';
      document.querySelector('[data-step="otp"]').style.display = '';
      document.getElementById('pamOtpSub').textContent = 'Code sent to +91 ' + phone.slice(0,3) + '****' + phone.slice(7);
      document.querySelectorAll('.pam-otp-digit').forEach(d => d.value = '');
      document.querySelector('.pam-otp-digit').focus();

      startResendTimer();
    } catch (err) {
      console.error('[Phone Auth]', err);
      let msg = 'Failed to send OTP. ';
      if (err.code === 'auth/too-many-requests') {
        msg += 'Too many attempts. Please wait a few minutes.';
      } else if (err.code === 'auth/invalid-phone-number') {
        msg += 'Invalid phone number.';
      } else if (err.code === 'auth/captcha-check-failed') {
        msg += 'Verification check failed. Please reload and try again.';
      } else {
        msg += err.message || 'Please try again.';
      }
      showPhoneError(msg);

      // Reset reCAPTCHA for retry
      if (recaptchaVerifier) {
        try { recaptchaVerifier.clear(); } catch(e) {}
        recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptchaContainer', {
          size: 'invisible',
        });
        recaptchaVerifier.render();
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Send OTP';
    }
  };

  // ── Verify OTP ──────────────────────────────────────────
  window.verifyOTP = async function() {
    const digits = document.querySelectorAll('.pam-otp-digit');
    const code = Array.from(digits).map(d => d.value).join('');

    if (code.length !== 6) {
      showOtpError('Please enter the 6-digit code.');
      return;
    }

    if (!confirmationResult) {
      showOtpError('Session expired. Please resend OTP.');
      return;
    }

    const btn = document.getElementById('pamVerifyBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="pam-spinner"></span>Verifying...';
    hideOtpError();

    try {
      // Verify OTP with Firebase
      const result = await confirmationResult.confirm(code);
      const idToken = await result.user.getIdToken();

      // Send Firebase ID token to our backend
      const res = await fetch(API_BASE + '/auth/phone-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseIdToken: idToken }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('mc_token', data.token);
        localStorage.setItem('mc_user', JSON.stringify(data.user));

        closePhoneAuth();

        // Show success toast if available
        if (typeof showToast === 'function') {
          const name = data.user.name || 'there';
          showToast('✅ Welcome' + (name !== 'User' ? ', ' + name.split(' ')[0] : '') + '!', 'success');
        }

        // Redirect to appropriate dashboard
        setTimeout(() => {
          if (typeof redirectToDashboard === 'function') {
            redirectToDashboard();
          } else {
            const role = (data.user.role || '').toLowerCase();
            if (role === 'mentor') window.location.href = 'mentor-dashboard.html';
            else if (data.user.onboardingComplete) window.location.href = 'dashboard.html';
            else window.location.href = 'onboarding.html';
          }
        }, 800);
      } else {
        showOtpError(data.message || 'Verification failed. Please try again.');
      }
    } catch (err) {
      console.error('[OTP Verify]', err);
      if (err.code === 'auth/invalid-verification-code') {
        showOtpError('Incorrect code. Please check and try again.');
      } else if (err.code === 'auth/code-expired') {
        showOtpError('Code expired. Please resend.');
      } else {
        showOtpError(err.message || 'Verification failed.');
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Verify & Sign In';
    }
  };

  // ── Resend timer ────────────────────────────────────────
  let resendInterval = null;

  function startResendTimer() {
    let seconds = 30;
    const timerEl = document.getElementById('pamResendTimer');
    const linkEl = document.getElementById('pamResendLink');
    timerEl.style.display = '';
    linkEl.style.display = 'none';

    if (resendInterval) clearInterval(resendInterval);
    resendInterval = setInterval(() => {
      seconds--;
      timerEl.innerHTML = 'Resend in <strong>' + seconds + 's</strong>';
      if (seconds <= 0) {
        clearInterval(resendInterval);
        timerEl.style.display = 'none';
        linkEl.style.display = '';
      }
    }, 1000);
  }

  window.resendOTP = function() {
    resetModal();
    document.querySelector('[data-step="phone"]').style.display = '';
    document.getElementById('pamSendBtn').click();
  };

  // ── Error helpers ───────────────────────────────────────
  function showPhoneError(msg) {
    const el = document.getElementById('pamPhoneError');
    el.textContent = msg; el.classList.add('show');
  }
  function hidePhoneError() {
    document.getElementById('pamPhoneError').classList.remove('show');
  }
  function showOtpError(msg) {
    const el = document.getElementById('pamOtpError');
    el.textContent = msg; el.classList.add('show');
  }
  function hideOtpError() {
    document.getElementById('pamOtpError').classList.remove('show');
  }
})();
