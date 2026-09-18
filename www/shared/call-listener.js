/**
 * shared/call-listener.js
 * Include this on every page (after Socket.IO CDN) to handle incoming voice calls.
 * It connects Socket.IO, listens for call:incoming / call:missed,
 * injects the overlay HTML if not already present, and wires up accept/decline.
 */
(function(){
  var mcToken = localStorage.getItem('mc_token');
  if (!mcToken) return;

  // Skip if we're already on call.html (it has its own socket + overlay)
  if (window.location.pathname.indexOf('call.html') !== -1) return;

  // Skip if page already has its own call socket (dashboard, mentor-dashboard, etc.)
  if (window._callSocket) return;

  // Brief toast to show connection status (helps debug)
  function showCallStatus(msg, color) {
    var el = document.getElementById('callStatusToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'callStatusToast';
      el.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:10000;padding:6px 16px;border-radius:20px;font-size:12px;font-family:sans-serif;color:#fff;pointer-events:none;transition:opacity 0.5s;';
      document.body.appendChild(el);
    }
    el.style.background = color;
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(window._callStatusTimer);
    window._callStatusTimer = setTimeout(function(){ el.style.opacity = '0'; }, 3000);
  }

  function onSocketReady() {
    if (!window.io) {
      console.warn('[CallListener] Socket.IO not loaded');
      return;
    }

    // Don't create duplicate connection if page already made one
    if (window._callSocket) return;

    var socketOrigin = 'https://med-clarivo.onrender.com';
    var socket = io(socketOrigin, {
      auth: { token: mcToken },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 15000
    });

    socket.on('connect', function() {
      console.log('[CallListener] Socket connected, id:', socket.id);
      showCallStatus('Call service connected', '#16A34A');
    });

    socket.on('connect_error', function(err) {
      console.error('[CallListener] Socket error:', err.message);
      showCallStatus('Call service: connecting...', '#F59E0B');
    });

    socket.on('disconnect', function(reason) {
      console.warn('[CallListener] Socket disconnected:', reason);
    });

    // Inject overlay HTML if not present
    if (!document.getElementById('incomingCallOverlay')) {
      var div = document.createElement('div');
      div.innerHTML = '<div id="incomingCallOverlay" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(10,20,36,0.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);flex-direction:column;align-items:center;justify-content:center;gap:16px;">'
        + '<div style="width:90px;height:90px;border-radius:50%;background:linear-gradient(135deg,#0FA89A,#0A6E64);display:flex;align-items:center;justify-content:center;font-family:\'DM Serif Display\',serif;font-size:32px;color:#fff;box-shadow:0 0 0 4px rgba(15,168,154,0.25);animation:icRingAnim 1.5s ease-in-out infinite;">'
        + '<span id="icInitials"></span></div>'
        + '<p style="font-family:\'DM Serif Display\',serif;font-size:22px;color:#fff;" id="icName"></p>'
        + '<p style="color:rgba(255,255,255,0.55);font-size:14px;">Incoming voice call...</p>'
        + '<div style="height:32px"></div>'
        + '<div style="display:flex;gap:40px;">'
        + '<button onclick="window._declineIncomingCall()" style="width:62px;height:62px;border-radius:50%;border:none;background:#DC2626;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px -4px rgba(220,38,38,0.5);">'
        + '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="23" y1="1" x2="1" y2="23"/></svg>'
        + '</button>'
        + '<button onclick="window._acceptIncomingCall()" style="width:62px;height:62px;border-radius:50%;border:none;background:#16A34A;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px -4px rgba(22,163,74,0.5);">'
        + '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>'
        + '</button>'
        + '</div></div>';
      document.body.appendChild(div.firstChild);

      // Add ring animation if not present
      if (!document.getElementById('icRingStyle')) {
        var style = document.createElement('style');
        style.id = 'icRingStyle';
        style.textContent = '@keyframes icRingAnim{0%,100%{box-shadow:0 0 0 4px rgba(15,168,154,0.25);}50%{box-shadow:0 0 0 18px rgba(15,168,154,0.08);}}';
        document.head.appendChild(style);
      }
    }

    socket.on('call:incoming', function(data) {
      console.log('[CallListener] Incoming call from:', data.callerName);
      var overlay = document.getElementById('incomingCallOverlay');
      if (!overlay) return;

      window._icCallId = data.callId;
      window._icCallerId = data.callerId;
      window._icCallerName = data.callerName || 'Unknown';
      window._icCallerAvatar = data.callerAvatar || '';

      var nameEl = document.getElementById('icName');
      var initEl = document.getElementById('icInitials');
      if (nameEl) nameEl.textContent = data.callerName || 'Unknown';
      if (initEl) initEl.textContent = (data.callerName || '').split(' ').map(function(w){ return w[0]; }).join('').slice(0,2).toUpperCase();

      overlay.style.display = 'flex';

      // Play a ring sound via Web Audio
      try {
        if (!window._icRingCtx) {
          window._icRingCtx = new (window.AudioContext || window.webkitAudioContext)();
          var osc = window._icRingCtx.createOscillator();
          var gain = window._icRingCtx.createGain();
          osc.type = 'sine';
          osc.frequency.value = 440;
          gain.gain.value = 0;
          osc.connect(gain);
          gain.connect(window._icRingCtx.destination);
          var now = window._icRingCtx.currentTime;
          for (var i = 0; i < 30; i++) {
            gain.gain.setValueAtTime(0.12, now + i * 1.0);
            gain.gain.setValueAtTime(0, now + i * 1.0 + 0.4);
          }
          osc.start();
          window._icRingOsc = osc;
        }
      } catch(e) {}
    });

    socket.on('call:missed', function() {
      var overlay = document.getElementById('incomingCallOverlay');
      if (overlay) overlay.style.display = 'none';
      _stopRingSound();
    });

    window._callSocket = socket;
  }

  function _stopRingSound() {
    try {
      if (window._icRingOsc) { window._icRingOsc.stop(); window._icRingOsc = null; }
      if (window._icRingCtx) { window._icRingCtx.close(); window._icRingCtx = null; }
    } catch(e) {}
  }

  window._acceptIncomingCall = function() {
    document.getElementById('incomingCallOverlay').style.display = 'none';
    _stopRingSound();
    var p = new URLSearchParams({
      callId: window._icCallId,
      userId: window._icCallerId,
      name: window._icCallerName,
      avatar: window._icCallerAvatar || '',
      mode: 'incoming'
    });
    window.location.href = 'call.html?' + p.toString();
  };

  window._declineIncomingCall = function() {
    document.getElementById('incomingCallOverlay').style.display = 'none';
    _stopRingSound();
    if (window._callSocket && window._icCallId) {
      window._callSocket.emit('call:reject', { callId: window._icCallId });
    }
  };

  // Check if Socket.IO is already loaded or wait for it
  if (window.io) {
    onSocketReady();
  } else {
    // Load Socket.IO script dynamically
    var script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
    script.onload = onSocketReady;
    script.onerror = function() {
      console.error('[CallListener] Failed to load Socket.IO from CDN');
    };
    document.head.appendChild(script);
  }
})();
