/**
 * shared/delete-account.js — "Delete account" section + confirmation sheet.
 * Required by the App Store (5.1.1(v)) and Google Play for any app with sign-up.
 *
 * Usage: put <div id="deleteAccountMount"></div> where the section should go,
 * then <script src="shared/delete-account.js"></script> anywhere after it.
 */
(function () {
  const API = 'https://med-clarivo.onrender.com/api';
  const SUPPORT_EMAIL = 'official@medclarivo.com';
  const token = () => localStorage.getItem('mc_token') || '';
  let hasPassword = true;

  const css = `
  .da-section{background:var(--card,#fff);border:1px solid var(--line,rgba(11,18,32,.08));border-radius:22px;padding:24px;}
  :root[data-theme="dark"] .da-section{background:#161B22;}
  .da-title{font-family:'DM Serif Display',serif;font-size:20px;color:var(--ink,#0B1220);margin:0 0 4px;}
  .da-text{font-size:14px;color:var(--ink-soft,#56657B);margin:0 0 16px;line-height:1.5;}
  .da-links{margin:16px 0 0;font-size:13px;}
  .da-links a{color:var(--teal,#0FA89A);font-weight:600;text-decoration:none;}
  .da-btn-outline{padding:10px 18px;border-radius:10px;border:1.5px solid #DC2626;color:#DC2626;background:transparent;font-weight:600;font-size:14px;cursor:pointer;}
  .da-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;display:none;align-items:flex-end;justify-content:center;}
  .da-backdrop.open{display:flex;}
  @media(min-width:640px){.da-backdrop{align-items:center;}}
  .da-sheet{background:var(--card,#fff);color:var(--ink,#0B1220);width:100%;max-width:440px;border-radius:22px 22px 0 0;padding:24px 22px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(0,0,0,.25);}
  @media(min-width:640px){.da-sheet{border-radius:22px;}}
  :root[data-theme="dark"] .da-sheet{background:#161B22;}
  .da-sheet h3{font-family:'DM Serif Display',serif;font-size:22px;margin:0 0 10px;color:var(--ink,#0B1220);}
  .da-sheet ul{list-style:disc;margin:0 0 14px 18px;padding:0;font-size:13.5px;line-height:1.55;color:var(--ink-soft,#56657B);}
  .da-note{font-size:12.5px;color:var(--ink-faint,#8B97A8);margin:0 0 16px;line-height:1.5;}
  .da-label{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-soft,#56657B);margin-bottom:6px;}
  .da-input{width:100%;padding:11px 14px;border-radius:12px;border:1px solid var(--line,rgba(11,18,32,.12));background:var(--mist,#F5F7FA);color:var(--ink,#0B1220);font-size:15px;box-sizing:border-box;}
  .da-err{color:#DC2626;font-size:13px;min-height:18px;margin:8px 0 4px;}
  .da-actions{display:flex;gap:10px;margin-top:6px;}
  .da-actions button{flex:1;padding:12px;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;border:none;}
  .da-cancel{background:var(--mist-2,#EEF2F6);color:var(--ink,#0B1220);}
  :root[data-theme="dark"] .da-cancel{background:#243049;color:#F0F6FC;}
  .da-confirm{background:#DC2626;color:#fff;}
  .da-confirm:disabled{opacity:.5;cursor:default;}`;

  function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

  function mount() {
    const host = document.getElementById('deleteAccountMount');
    if (!host || host.dataset.ready) return;
    host.dataset.ready = '1';
    document.head.appendChild(Object.assign(document.createElement('style'), { textContent: css }));

    host.appendChild(el(`
      <section class="da-section">
        <h2 class="da-title">Delete account</h2>
        <p class="da-text">Permanently delete your MedClarivo account and the data linked to it. This can't be undone.</p>
        <button type="button" class="da-btn-outline" id="daOpen">Delete my account</button>
        <p class="da-links"><a href="privacy.html">Privacy Policy</a> · <a href="delete-account.html">What gets deleted</a></p>
      </section>`));

    document.body.appendChild(el(`
      <div class="da-backdrop" id="daBackdrop" role="dialog" aria-modal="true" aria-labelledby="daHeading">
        <div class="da-sheet">
          <h3 id="daHeading">Delete your account?</h3>
          <ul>
            <li>Your profile, progress, test results and study history</li>
            <li>Your doubts, messages, calls and mentor session records</li>
            <li>Your notification and device settings</li>
          </ul>
          <p class="da-note">Safety reports you filed through "Report a Concern" are kept for safety reasons. Questions? Email ${SUPPORT_EMAIL}.</p>
          <label class="da-label" id="daLabel" for="daInput">Enter your password to confirm</label>
          <input class="da-input" id="daInput" type="password" autocomplete="current-password" />
          <div class="da-err" id="daErr"></div>
          <div class="da-actions">
            <button type="button" class="da-cancel" id="daCancel">Cancel</button>
            <button type="button" class="da-confirm" id="daConfirm">Delete forever</button>
          </div>
        </div>
      </div>`));

    const $ = (id) => document.getElementById(id);
    $('daOpen').onclick = open;
    $('daCancel').onclick = close;
    $('daBackdrop').onclick = (e) => { if (e.target.id === 'daBackdrop') close(); };
    $('daConfirm').onclick = submit;
    $('daInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

    // Know which confirmation to ask for (password vs typing DELETE)
    fetch(API + '/settings', { headers: { Authorization: 'Bearer ' + token() } })
      .then((r) => r.json()).then((d) => { if (d && typeof d.hasPassword === 'boolean') hasPassword = d.hasPassword; })
      .catch(() => {});
  }

  function open() {
    const input = document.getElementById('daInput');
    document.getElementById('daLabel').textContent = hasPassword ? 'Enter your password to confirm' : 'Type DELETE to confirm';
    input.type = hasPassword ? 'password' : 'text';
    input.autocomplete = hasPassword ? 'current-password' : 'off';
    input.placeholder = hasPassword ? '' : 'DELETE';
    input.value = '';
    document.getElementById('daErr').textContent = '';
    document.getElementById('daBackdrop').classList.add('open');
    setTimeout(() => input.focus(), 50);
  }
  function close() { document.getElementById('daBackdrop').classList.remove('open'); }

  async function submit() {
    const btn = document.getElementById('daConfirm');
    const err = document.getElementById('daErr');
    const value = document.getElementById('daInput').value;
    if (!value.trim()) { err.textContent = hasPassword ? 'Enter your password.' : 'Type DELETE to confirm.'; return; }
    if (!hasPassword && value.trim().toUpperCase() !== 'DELETE') { err.textContent = 'Type DELETE exactly to confirm.'; return; }

    btn.disabled = true; btn.textContent = 'Deleting…'; err.textContent = '';
    try {
      const res = await fetch(API + '/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
        body: JSON.stringify(hasPassword ? { password: value } : { confirm: value.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        // A password account answered "type DELETE" (or the reverse) — switch and let them retry
        if (/Type DELETE/i.test(data.message || '') && hasPassword) { hasPassword = false; open(); }
        else if (/Enter your password/i.test(data.message || '') && !hasPassword) { hasPassword = true; open(); }
        err.textContent = data.message || 'Could not delete your account. Please try again.';
        return;
      }
      await cleanupDevice();
      alert('Your account has been deleted.');
      window.location.replace('index.html');
    } catch (e) {
      err.textContent = 'Cannot reach the server. Check your connection and try again.';
    } finally {
      btn.disabled = false; btn.textContent = 'Delete forever';
    }
  }

  async function cleanupDevice() {
    try {
      const PN = window.Capacitor?.isNativePlatform?.() && window.Capacitor.Plugins?.PushNotifications;
      if (PN && PN.unregister) await PN.unregister();
    } catch (e) {}
    ['mc_token', 'admin_token', 'mc_user', 'mc_fcm_token'].forEach((k) => localStorage.removeItem(k));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
