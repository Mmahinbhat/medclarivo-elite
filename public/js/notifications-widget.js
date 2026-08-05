/**
 * Drop-in notification bell widget.
 *
 * Requires on the page:
 *   1. Socket.io client script:  <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
 *   2. This file:                <script src="/js/notifications-widget.js"></script>
 *   3. A JWT stored wherever your app already stores it (adjust getToken() below to match).
 *   4. A bell container in the HTML:
 *        <div id="notif-bell" class="notif-bell">
 *          🔔<span id="notif-badge" class="notif-badge" hidden>0</span>
 *          <div id="notif-dropdown" class="notif-dropdown" hidden></div>
 *        </div>
 */

(function () {
  function getToken() {
    // ⚠️ Adjust to match how the rest of the app stores the JWT (localStorage/sessionStorage/cookie).
    return localStorage.getItem('token');
  }

  const token = getToken();
  if (!token) return; // not logged in, nothing to do

  const badge = document.getElementById('notif-badge');
  const dropdown = document.getElementById('notif-dropdown');
  const bell = document.getElementById('notif-bell');

  if (!bell || !badge || !dropdown) {
    console.warn('Notification widget: expected #notif-bell / #notif-badge / #notif-dropdown in the page');
    return;
  }

  function setCount(n) {
    if (n > 0) {
      badge.textContent = n > 99 ? '99+' : n;
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }

  function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  function renderItem(n) {
    const iconMap = { message: '💬', system: '⚙️', feature: '✨', mention: '📣' };
    const div = document.createElement('div');
    div.className = 'notif-item' + (n.read ? '' : ' notif-unread');
    div.dataset.id = n._id;
    div.innerHTML = `
      <span class="notif-icon">${iconMap[n.type] || '🔔'}</span>
      <div class="notif-text">
        <div class="notif-title"></div>
        <div class="notif-body"></div>
        <div class="notif-time">${timeAgo(n.createdAt)}</div>
      </div>
    `;
    div.querySelector('.notif-title').textContent = n.title;
    if (n.body) div.querySelector('.notif-body').textContent = n.body;

    div.addEventListener('click', () => {
      markRead(n._id);
      if (n.link) window.location.href = n.link;
    });

    return div;
  }

  async function loadHistory() {
    dropdown.innerHTML = '<div class="notif-loading">Loading…</div>';
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      dropdown.innerHTML = '';
      if (!data.notifications || data.notifications.length === 0) {
        dropdown.innerHTML = '<div class="notif-empty">No notifications yet</div>';
        return;
      }
      data.notifications.forEach((n) => dropdown.appendChild(renderItem(n)));
    } catch (err) {
      dropdown.innerHTML = '<div class="notif-empty">Couldn\'t load notifications</div>';
    }
  }

  async function refreshCount() {
    try {
      const res = await fetch('/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCount(data.count || 0);
    } catch (err) {
      // fail silently, bell just won't show a badge this time
    }
  }

  async function markRead(id) {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const item = dropdown.querySelector(`[data-id="${id}"]`);
      if (item) item.classList.remove('notif-unread');
      refreshCount();
    } catch (err) {
      // ignore
    }
  }

  bell.addEventListener('click', (e) => {
    const isHidden = dropdown.hidden;
    dropdown.hidden = !isHidden;
    if (isHidden) loadHistory();
  });

  document.addEventListener('click', (e) => {
    if (!bell.contains(e.target)) dropdown.hidden = true;
  });

  // --- Real-time push ---
  if (window.io) {
    const socket = window.io({ auth: { token } });

    socket.on('notification', (n) => {
      setCount((parseInt(badge.textContent) || 0) + (badge.hidden ? 1 : 0) || 1);
      refreshCount(); // authoritative count from server
      if (!dropdown.hidden) {
        dropdown.prepend(renderItem(n));
      }
      // Optional: browser notification if permitted
      if (window.Notification && Notification.permission === 'granted') {
        new Notification(n.title, { body: n.body || '' });
      }
    });
  } else {
    console.warn('Notification widget: socket.io client not loaded — real-time push disabled, falling back to badge count only');
  }

  refreshCount();
})();
