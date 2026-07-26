(function() {
  function initBackButton() {
    // Only show inside the native app (not the regular website)
    if (!window.Capacitor || !window.Capacitor.isNativePlatform()) return;
    // Only show if there's actually somewhere to go back to
    if (window.history.length <= 1) return;
    // Don't add twice if this script somehow runs more than once
    if (document.getElementById('nativeBackBtn')) return;

    var btn = document.createElement('button');
    btn.id = 'nativeBackBtn';
    btn.setAttribute('aria-label', 'Back');
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>';
    btn.style.cssText = [
      'position:fixed',
      'top:calc(env(safe-area-inset-top, 20px) + 10px)',
      'left:14px',
      'z-index:999999',
      'width:38px',
      'height:38px',
      'border-radius:12px',
      'background:rgba(255,255,255,0.92)',
      'backdrop-filter:blur(10px)',
      '-webkit-backdrop-filter:blur(10px)',
      'box-shadow:0 4px 14px rgba(11,18,32,0.18)',
      'border:1px solid rgba(11,18,32,0.06)',
      'color:#0B1220',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'cursor:pointer',
      'padding:0'
    ].join(';');
    btn.addEventListener('click', function() {
      window.history.back();
    });
    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackButton);
  } else {
    initBackButton();
  }
})();
