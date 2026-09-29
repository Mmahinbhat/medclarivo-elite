/**
 * email-verify.js — "Enter the code we emailed you" popup (signup email OTP)
 *
 * Usage:
 *   showEmailVerify(email, onVerified)
 *     email       — the address the code was sent to
 *     onVerified  — called with the server reply { token, user } once the
 *                   code is accepted (the account is now verified + logged in)
 *
 * Talks to:
 *   POST /api/auth/verify-email         { email, code }
 *   POST /api/auth/resend-verification  { email }
 */
(function () {
  const API_BASE = 'https://med-clarivo.onrender.com/api';
  const RESEND_SECONDS = 60;

  let currentEmail = null;
  let onDone = null;
  let busy = false;
  let timer = null;

  function maskEmail(email) {
    const [name, domain] = String(email || '').split('@');
    if (!domain) return email || '';
    const shown = name.length <= 2 ? name[0] || '' : name.slice(0, 2);
    return shown + '•••@' + domain;
  }

  function createModal() {
    if (document.getElementById('emailVerifyModal')) return;
    const m = document.createElement('div');
    m.id = 'emailVerifyModal';
    m.style.display = 'none';
    m.innerHTML = `
      <style>
        #emailVerifyModal { position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,0.5);
          display:flex; align-items:center; justify-content:center; padding:24px; opacity:0; transition:opacity .3s; }
        #emailVerifyModal.show { opacity:1; }
        #emailVerifyModal .evm-card { background:#fff; border-radius:16px; padding:32px 28px; max-width:400px; width:100%;
          box-shadow:0 20px 60px rgba(0,0,0,.15); position:relative; }
        #emailVerifyModal .evm-close { position:absolute; top:12px; right:12px; background:none; border:none; font-size:20px;
          cursor:pointer; color:#94A3B8; padding:4px 8px; line-height:1; }
        #emailVerifyModal .evm-title { font-family:'DM Serif Display',serif; font-size:24px; color:#0C1B2E; margin-bottom:6px; }
        #emailVerifyModal .evm-sub { font-size:14px; color:#4A5568; margin-bottom:20px; line-height:1.5; }
        #emailVerifyModal .evm-sub strong { color:#0C1B2E; }
        #emailVerifyModal .evm-code { width:100%; box-sizing:border-box; padding:14px; font-size:26px; letter-spacing:10px;
          text-align:center; font-family:'JetBrains Mono','DM Sans',monospace; font-weight:600; color:#0C1B2E;
          border:1.5px solid #E2E8F0; border-radius:10px; outline:none; margin-bottom:16px; }
        #emailVerifyModal .evm-code:focus { border-color:#1B4FD8; }
        #emailVerifyModal .evm-btn { width:100%; padding:13px; background:#0C1B2E; color:#fff; font-family:'DM Sans',sans-serif;
          font-size:14px; font-weight:600; border:none; border-radius:8px; cursor:pointer; }
        #emailVerifyModal .evm-btn:disabled { opacity:.6; cursor:not-allowed; }
        #emailVerifyModal .evm-msg { font-size:13px; margin-bottom:12px; display:none; }
        #emailVerifyModal .evm-msg.show { display:block; }
        #emailVerifyModal .evm-msg.err { color:#DC2626; }
        #emailVerifyModal .evm-msg.ok { color:#16A34A; }
        #emailVerifyModal .evm-foot { text-align:center; margin-top:16px; font-size:13px; color:#4A5568; line-height:1.6; }
        #emailVerifyModal .evm-foot a { color:#1B4FD8; font-weight:600; cursor:pointer; text-decoration:none; }
        #emailVerifyModal .evm-spinner { display:inline-block; width:16px; height:16px; border:2px solid rgba(255,255,255,.3);
          border-top-color:#fff; border-radius:50%; animation:evmSpin .7s linear infinite; vertical-align:middle; margin-right:6px; }
        @keyframes evmSpin { to { transform:rotate(360deg); } }
      </style>
      <div class="evm-card">
        <button class="evm-close" type="button" aria-label="Close" onclick="closeEmailVerify()">&times;</button>
        <div class="evm-title">Check your email</div>
        <div class="evm-sub">We sent a 6-digit code to <strong id="evmEmail"></strong>. It expires in 10 minutes.</div>
        <div class="evm-msg" id="evmMsg"></div>
        <input class="evm-code" id="evmCode" type="tel" inputmode="numeric" autocomplete="one-time-code"
               maxlength="6" placeholder="••••••" aria-label="6-digit code">
        <button class="evm-btn" id="evmVerifyBtn" type="button">Verify email</button>
        <div class="evm-foot">
          <span id="evmTimer"></span>
          <a id="evmResend" style="display:none;">Resend code</a><br>
          <span style="font-size:12px;color:#94A3B8;">Can't find it? Check your spam folder.</span>
        </div>
      </div>`;
    document.body.appendChild(m);

    const input = document.getElementById('evmCode');
    input.addEventListener('input', function () {
      const clean = this.value.replace(/\D/g, '').slice(0, 6);
      if (this.value !== clean) this.value = clean;
      if (clean.length === 6) verify();
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); verify(); } });
    document.getElementById('evmVerifyBtn').addEventListener('click', verify);
    document.getElementById('evmResend').addEventListener('click', resend);
  }

  function showMsg(text, ok) {
    const el = document.getElementById('evmMsg');
    el.textContent = text;
    el.className = 'evm-msg show ' + (ok ? 'ok' : 'err');
  }
  function hideMsg() { document.getElementById('evmMsg').className = 'evm-msg'; }

  function startTimer(seconds) {
    stopTimer();
    let s = seconds;
    const t = document.getElementById('evmTimer');
    const a = document.getElementById('evmResend');
    a.style.display = 'none';
    t.style.display = '';
    t.textContent = 'Resend code in ' + s + 's';
    timer = setInterval(() => {
      s -= 1;
      if (s <= 0) { stopTimer(); t.style.display = 'none'; a.style.display = ''; }
      else t.textContent = 'Resend code in ' + s + 's';
    }, 1000);
  }
  function stopTimer() { if (timer) clearInterval(timer); timer = null; }

  async function post(path, body) {
    let res, data = {};
    try {
      res = await fetch(API_BASE + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      data = await res.json().catch(() => ({}));
    } catch (e) {
      throw new Error('Cannot reach server. Please check your connection and try again.');
    }
    return { res, data };
  }

  async function verify() {
    if (busy) return;
    const code = document.getElementById('evmCode').value.replace(/\D/g, '');
    if (code.length !== 6) { showMsg('Please enter the 6-digit code.'); return; }

    const btn = document.getElementById('evmVerifyBtn');
    busy = true;
    btn.disabled = true;
    btn.innerHTML = '<span class="evm-spinner"></span>Verifying...';
    hideMsg();
    try {
      const { res, data } = await post('/auth/verify-email', { email: currentEmail, code });
      if (!res.ok || !data.success) {
        showMsg((data.errors && data.errors[0] && data.errors[0].msg) || data.message || 'Verification failed.');
        document.getElementById('evmCode').select();
        return;
      }
      const cb = onDone;
      window.closeEmailVerify();
      if (typeof cb === 'function') cb(data);
    } catch (e) {
      showMsg(e.message);
    } finally {
      busy = false;
      btn.disabled = false;
      btn.textContent = 'Verify email';
    }
  }

  async function resend() {
    if (busy) return;
    busy = true;
    hideMsg();
    try {
      const { res, data } = await post('/auth/resend-verification', { email: currentEmail });
      if (!res.ok || !data.success) {
        showMsg(data.message || 'Could not send a new code. Please try again later.');
        startTimer(data.retryAfter || RESEND_SECONDS);
        return;
      }
      document.getElementById('evmCode').value = '';
      showMsg('A new code is on its way.', true);
      startTimer(RESEND_SECONDS);
    } catch (e) {
      showMsg(e.message);
    } finally {
      busy = false;
    }
  }

  window.showEmailVerify = function (email, onVerified) {
    currentEmail = email;
    onDone = onVerified;
    createModal();
    document.getElementById('evmEmail').textContent = maskEmail(email);
    document.getElementById('evmCode').value = '';
    hideMsg();
    const m = document.getElementById('emailVerifyModal');
    m.style.display = 'flex';
    requestAnimationFrame(() => m.classList.add('show'));
    startTimer(RESEND_SECONDS);
    setTimeout(() => document.getElementById('evmCode').focus(), 50);
  };

  window.closeEmailVerify = function () {
    const m = document.getElementById('emailVerifyModal');
    if (m) {
      m.classList.remove('show');
      setTimeout(() => { m.style.display = 'none'; }, 300);
    }
    stopTimer();
    onDone = null;
  };
})();
