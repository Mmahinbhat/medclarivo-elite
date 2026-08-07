import re

TEMPLATE = '''<nav class="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 shadow-lg" style="background:#fff;border-top:1px solid rgba(11,18,32,0.08);height:calc(56px + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom);">
  <button onclick="window.location.href='mentor-dashboard.html'" class="flex flex-col items-center gap-1 p-2{ACT_HOME}">
    <i data-lucide="layout-dashboard" class="w-5 h-5"></i>
    <span class="text-[9px] font-bold">Home</span>
  </button>
  <button onclick="window.location.href='mentor-mentees.html'" class="flex flex-col items-center gap-1 p-2{ACT_MENTEES}">
    <i data-lucide="users" class="w-5 h-5"></i>
    <span class="text-[9px] font-semibold">Mentees</span>
  </button>
  <button onclick="window.location.href='mentor-requests.html'" class="flex flex-col items-center gap-1 p-2{ACT_REQUESTS} relative">
    <i data-lucide="user-check" class="w-5 h-5"></i>
    <span class="text-[9px] font-semibold">Requests</span>
    <span class="absolute top-1 right-2.5 w-1.5 h-1.5 bg-teal rounded-full"></span>
  </button>
  <button onclick="window.location.href='mentor-sessions.html'" class="flex flex-col items-center gap-1 p-2{ACT_SESSIONS}">
    <i data-lucide="video" class="w-5 h-5"></i>
    <span class="text-[9px] font-semibold">Sessions</span>
  </button>
  <button onclick="showToast('Mentor profile page coming soon')" class="flex flex-col items-center gap-1 p-2 text-ink-faint">
    <i data-lucide="user" class="w-5 h-5"></i>
    <span class="text-[9px] font-semibold">Profile</span>
  </button>
</nav>
</body>'''

FILES = {
    'www/mentor-mentees.html':     'MENTEES',
    'www/mentor-requests.html':    'REQUESTS',
    'www/mentor-sessions.html':    'SESSIONS',
    'www/mentor-analytics.html':   None,
    'www/mentor-doubt-forum.html': None,
    'www/mentor-inbox.html':       None,
}
KEYS = ['HOME', 'MENTEES', 'REQUESTS', 'SESSIONS']

for path, active_key in FILES.items():
    with open(path, 'r') as f:
        content = f.read()

    block = TEMPLATE
    for k in KEYS:
        block = block.replace('{ACT_' + k + '}', ' text-teal-deep' if k == active_key else ' text-ink-faint')

    if '</body>' not in content:
        print(f'WARNING: no </body> found in {path}')
        continue

    new_content = content.replace('</body>', block, 1)

    if new_content == content:
        print(f'WARNING: no change in {path}')
    else:
        with open(path, 'w') as f:
            f.write(new_content)
        print(f'Fixed: {path}')

def check_showtoast():
    for path in FILES:
        with open(path) as f:
            c = f.read()
        if 'function showToast' not in c:
            print(f'NOTE: {path} has no showToast() function defined — Profile button may error')

check_showtoast()
