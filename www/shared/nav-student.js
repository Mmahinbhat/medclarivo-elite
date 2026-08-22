// Shared student sidebar navigation.
// Single source of truth for the student role's nav — edit HERE, not per-page.
// Usage: <div id="sidebar-mount"></div> then <script src="shared/nav-student.js"></script>

(function () {
  const NAV_SECTIONS = [
    {
      label: "Main",
      items: [
        { href: "dashboard.html", icon: "layout-dashboard", label: "Dashboard" },
        { href: "progress.html", icon: "trending-up", label: "Progress" },
        { href: "analytics.html", icon: "bar-chart-3", label: "Analytics" },
      ],
    },
    {
      label: "Mentorship",
      items: [
        { href: "my-mentor.html", icon: "users", label: "My Mentor" },
        { href: "student-sessions.html", icon: "video", label: "Sessions" },
        { href: "student-messages.html", icon: "mail", label: "Messages" },
        { href: "doubt-forum.html", icon: "message-circle", label: "Doubt Forum", dot: true },
      ],
    },
    {
      label: "Support",
      items: [
        { href: "raise-ticket.html", icon: "shield-alert", label: "Raise a Ticket" },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "achievements.html", icon: "award", label: "Achievements" },
        { href: "settings.html", icon: "settings", label: "Settings" },
      ],
    },
  ];

  function currentPage() {
    const path = window.location.pathname;
    return path.substring(path.lastIndexOf("/") + 1) || "dashboard.html";
  }

  function renderItem(item, active) {
    const dot = item.dot
      ? `<span class="hide-on-collapse w-1.5 h-1.5 bg-teal-2 rounded-full pulse-dot"></span>`
      : "";
    const labelClass = item.dot ? "nav-label flex-1" : "nav-label";
    return `
      <a href="${item.href}" class="nav-item${active ? " active" : ""}" data-tip="${item.label}">
        <i data-lucide="${item.icon}"></i><span class="${labelClass}">${item.label}</span>${dot}
      </a>`;
  }

  function renderNav() {
    const page = currentPage();
    return NAV_SECTIONS.map(section => `
      <p class="hide-on-collapse px-6 py-2 mt-3 text-[10px] text-white/25 uppercase tracking-[0.16em] font-bold">${section.label}</p>
      ${section.items.map(item => renderItem(item, item.href === page)).join("")}
    `).join("");
  }

  function renderSidebar() {
    return `
    <aside class="sidebar" id="sidebar">
      <div class="px-5 pt-5 pb-4 flex items-center justify-between">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style="background:linear-gradient(135deg,var(--teal),var(--teal-deep));">
            <i data-lucide="cross" class="w-[18px] h-[18px] text-white"></i>
          </div>
          <div class="hide-on-collapse min-w-0">
            <p class="font-display text-white text-[17px] leading-none tracking-tight">MedClarivo</p>
            <p class="text-[9.5px] text-teal-2 font-bold tracking-[0.18em] uppercase mt-1">Elite</p>
          </div>
        </div>
        <button class="hide-on-collapse btn-ghost-icon text-white/40 hover:text-white hover:bg-white/8" id="collapseBtn" onclick="toggleCollapse()" data-tip="Collapse">
          <i data-lucide="panel-left-close" class="w-[17px] h-[17px]"></i>
        </button>
      </div>

      <div class="mx-3 mb-3 p-2.5 rounded-2xl bg-white/5 flex items-center gap-3 cursor-pointer hover:bg-white/8 transition-colors">
        <div class="avatar-ring flex-shrink-0">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs font-display" style="background:linear-gradient(135deg,var(--teal),var(--teal-deep));" id="sidebarInitial">M</div>
        </div>
        <div class="hide-on-collapse flex-1 min-w-0">
          <p class="text-white font-semibold text-[13px] truncate" id="sidebarName">Mahin Bhat</p>
          <p class="text-white/35 text-[10.5px] truncate" id="sidebarExamLevel">NEET UG &middot; Final Year</p>
        </div>
        <i data-lucide="chevrons-up-down" class="hide-on-collapse w-3.5 h-3.5 text-white/25 flex-shrink-0"></i>
      </div>

      <nav class="flex-1 overflow-y-auto no-scrollbar py-1">
        ${renderNav()}
      </nav>

      <div class="hide-on-collapse mx-3 mb-3 p-4 rounded-2xl" style="background:linear-gradient(135deg,rgba(15,168,154,0.22),rgba(15,168,154,0.06));border:1px solid rgba(15,168,154,0.25)">
        <div class="flex items-center gap-2 mb-2">
          <i data-lucide="sparkles" class="w-4 h-4 text-teal-2"></i>
          <span class="text-white font-bold text-[13px]">Elite Access</span>
        </div>
        <p class="text-white/45 text-[11px] leading-snug mb-3">Free early access active. Upgrade for unlimited 1:1 sessions.</p>
        <button class="w-full py-2 rounded-xl text-[11.5px] font-bold btn-primary">Upgrade Plan</button>
      </div>

      <a href="#" onclick="handleLogout(event)" class="nav-item mb-4 text-red-300/70 hover:text-red-300 hover:bg-red-500/10" data-tip="Sign Out">
        <i data-lucide="log-out"></i><span class="nav-label">Sign Out</span>
      </a>
    </aside>`;
  }

  function mount() {
    const target = document.getElementById("sidebar-mount");
    if (!target) {
      console.error("nav-student.js: no #sidebar-mount element found on this page");
      return;
    }
    target.outerHTML = renderSidebar();
    applyUserBadge();
    refreshUserBadge();
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function applyUserBadge() {
    try {
      const me = JSON.parse(localStorage.getItem('mc_user') || '{}');
      const nameEl = document.getElementById('sidebarName');
      if (nameEl && me.name) nameEl.textContent = me.name;
      const examEl = document.getElementById('sidebarExamLevel');
      if (examEl && me.onboarding && me.onboarding.exam) {
        const stage = me.onboarding.level || me.onboarding.stage || '';
        examEl.textContent = stage ? `${me.onboarding.exam} · ${stage}` : me.onboarding.exam;
      }
      const initialEl = document.getElementById('sidebarInitial');
      if (initialEl && me.name) initialEl.textContent = me.name.trim().charAt(0).toUpperCase();
    } catch (e) { /* localStorage empty or malformed — leave placeholder */ }
  }

  async function refreshUserBadge() {
    try {
      const token = localStorage.getItem('mc_token');
      if (!token) return;
      const res = await fetch('https://med-clarivo.onrender.com/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        localStorage.setItem('mc_user', JSON.stringify(data.user));
        applyUserBadge();
      }
    } catch (e) { /* offline or token invalid — cached badge already shown, leave it */ }
  }

  window.mountStudentSidebar = mount;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
