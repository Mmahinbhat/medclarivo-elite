import re

# Canonical sidebar block (from mentor-dashboard.html), minus the Weekly Availability card.
TEMPLATE = '''  <aside class="sidebar" id="sidebar">
    <div class="px-5 pt-5 pb-4 flex items-center justify-between">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style="background:linear-gradient(135deg,var(--teal),var(--teal-deep));">
          <i data-lucide="cross" class="w-[18px] h-[18px] text-white"></i>
        </div>
        <div class="hide-on-collapse min-w-0">
          <p class="font-display text-white text-[17px] leading-none tracking-tight">MedClarivo</p>
          <p class="text-[9.5px] text-teal-2 font-bold tracking-[0.18em] uppercase mt-1">Mentor</p>
        </div>
      </div>
      <button class="hide-on-collapse btn-ghost-icon text-white/40 hover:text-white hover:bg-white/8" id="collapseBtn" onclick="toggleCollapse()" data-tip="Collapse">
        <i data-lucide="panel-left-close" class="w-[17px] h-[17px]"></i>
      </button>
    </div>

    <div class="mx-3 mb-3 p-2.5 rounded-2xl bg-white/5 flex items-center gap-3 cursor-pointer hover:bg-white/8 transition-colors">
      <div class="avatar-ring flex-shrink-0">
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs font-display" id="sidebarAvatar" style="background:linear-gradient(135deg,var(--teal),var(--teal-deep));">A</div>
      </div>
      <div class="hide-on-collapse flex-1 min-w-0">
        <p class="text-white font-semibold text-[13px] truncate" id="sidebarName">Dr. Arjun Mehta</p>
        <p class="text-white/35 text-[10.5px] truncate" id="sidebarCredentials">Mentor</p>
      </div>
      <i data-lucide="chevrons-up-down" class="hide-on-collapse w-3.5 h-3.5 text-white/25 flex-shrink-0"></i>
    </div>

    <nav class="flex-1 overflow-y-auto no-scrollbar py-1">
      <p class="hide-on-collapse px-6 py-2 text-[10px] text-white/25 uppercase tracking-[0.16em] font-bold">Main</p>
      <a href="mentor-dashboard.html" class="nav-item{ACT_DASH}" data-tip="Dashboard">
        <i data-lucide="layout-dashboard"></i><span class="nav-label">Dashboard</span>
      </a>
      <a href="mentor-mentees.html" class="nav-item{ACT_MENTEES}" data-tip="My Mentees">
        <i data-lucide="users"></i><span class="nav-label">My Mentees</span>
      </a>
      <a href="mentor-requests.html" class="nav-item{ACT_REQUESTS}" data-tip="Requests">
        <i data-lucide="user-check"></i><span class="nav-label flex-1">Requests</span>
        <span class="hide-on-collapse chip chip-navy" style="padding:1px 7px;font-size:9.5px">Soon</span>
      </a>
      <a href="mentor-analytics.html" class="nav-item{ACT_ANALYTICS}" data-tip="Analytics">
        <i data-lucide="bar-chart-3"></i><span class="nav-label">Analytics</span>
      </a>

      <p class="hide-on-collapse px-6 py-2 mt-3 text-[10px] text-white/25 uppercase tracking-[0.16em] font-bold">Mentorship</p>
      <a href="mentor-sessions.html" class="nav-item{ACT_SESSIONS}" data-tip="Sessions">
        <i data-lucide="video"></i><span class="nav-label">Sessions</span>
      </a>
      <a href="mentor-doubt-forum.html" class="nav-item{ACT_DOUBT}" data-tip="Doubt Forum">
        <i data-lucide="message-circle"></i><span class="nav-label flex-1">Doubt Forum</span>
        <span class="hide-on-collapse w-1.5 h-1.5 bg-teal-2 rounded-full pulse-dot"></span>
      </a>
      <a href="mentor-inbox.html" class="nav-item{ACT_INBOX}" data-tip="Admin Messages">
        <i data-lucide="megaphone"></i><span class="nav-label flex-1">Admin Messages</span>
        <span id="adminMsgBadge" class="hide-on-collapse chip chip-navy" style="padding:1px 7px;font-size:9.5px;display:none"></span>
      </a>

      <p class="hide-on-collapse px-6 py-2 mt-3 text-[10px] text-white/25 uppercase tracking-[0.16em] font-bold">Account</p>
      <a href="#" class="nav-item" onclick="setNav(this,event)" data-tip="Recognition">
        <i data-lucide="award"></i><span class="nav-label">Recognition</span>
      </a>
      <a href="#" class="nav-item" onclick="setNav(this,event)" data-tip="Settings">
        <i data-lucide="settings"></i><span class="nav-label">Settings</span>
      </a>
    </nav>

    <button id="signOutBtn" onclick="handleLogout(event)" class="nav-item mb-4 text-red-300/70 hover:text-red-300 hover:bg-red-500/10" data-tip="Sign Out" style="background:none;border:none;cursor:pointer;font:inherit;text-align:left;">
      <i data-lucide="log-out"></i><span class="nav-label">Sign Out</span>
    </button>
  </aside>'''

FILES = {
    'www/mentor-dashboard.html':   'DASH',
    'www/mentor-mentees.html':     'MENTEES',
    'www/mentor-requests.html':    'REQUESTS',
    'www/mentor-analytics.html':   'ANALYTICS',
    'www/mentor-sessions.html':    'SESSIONS',
    'www/mentor-doubt-forum.html': 'DOUBT',
    'www/mentor-inbox.html':       'INBOX',
}
KEYS = ['DASH','MENTEES','REQUESTS','ANALYTICS','SESSIONS','DOUBT','INBOX']

for path, active_key in FILES.items():
    with open(path, 'r') as f:
        content = f.read()

    block = TEMPLATE
    for k in KEYS:
        block = block.replace('{ACT_' + k + '}', ' active' if k == active_key else '')

    new_content = re.sub(r'<aside class="sidebar" id="sidebar">.*?</aside>', block, content, count=1, flags=re.DOTALL)

    if new_content == content:
        print(f'WARNING: no sidebar replaced in {path}')
    else:
        with open(path, 'w') as f:
            f.write(new_content)
        print(f'Fixed: {path}')
