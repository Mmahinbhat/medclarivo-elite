import re

with open('www/dashboard.html', 'r') as f:
    content = f.read()

# 1. Extract the Weekly Goal block
weekly_goal = '''            <!-- Today's Progress + Weekly Goal -->
            <div class="panel p-7 reveal" style="animation-delay:.1s">
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-display text-lg text-ink">Weekly Goal</h3>
                <span class="text-teal-deep font-bold text-sm font-mono" id="weeklyGoalPct">0%</span>
              </div>
              <div class="flex justify-between items-end mb-2">
                <span class="font-bold text-ink text-sm"><span id="weeklyHoursActual">0</span>h <span class="text-ink-faint font-normal">/ <span id="weeklyHoursTarget">0</span>h</span></span>
                <span class="text-ink-faint text-xs" id="weeklyRemaining">0h remaining</span>
              </div>
              <div class="track h-2.5"><div class="fill h-2.5" id="weeklyGoalFill" style="width:0%"></div></div>
            </div>'''

upcoming_sessions = '''            <!-- Upcoming sessions -->
            <div id="sessionsSection" class="panel p-7 reveal" style="animation-delay:.14s">
              <h3 class="font-display text-lg text-ink mb-4">Upcoming Sessions</h3>
              <div class="space-y-3">
                <div class="text-center py-8">
                  <i data-lucide="calendar-x" class="w-8 h-8 text-ink-faint mx-auto mb-2"></i>
                  <p class="text-ink-faint text-sm font-semibold">No sessions scheduled yet</p>
                  <p class="text-ink-faint text-xs mt-1">Sessions booked with your mentor will show up here.</p>
                </div>
              </div>
            </div>'''

old_grid_open = '''        <!-- ═══ MAIN GRID: ANALYTICS + RIGHT COLUMN ═══ -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">

          <!-- LEFT -->
          <div class="lg:col-span-8 space-y-7">'''

new_grid_open = '''        <!-- ═══ MAIN GRID: SINGLE COLUMN, REORDERED ═══ -->
        <div class="space-y-7">'''

old_right_block = '''          </div><!-- /LEFT -->

          <!-- RIGHT COLUMN -->
          <aside class="lg:col-span-4 space-y-7 lg:sticky lg:top-[108px]">

''' + weekly_goal + '''


''' + upcoming_sessions + '''

          </aside>
        </div>'''

new_right_block = '''        </div>'''

achievements_marker = '''            <!-- ACHIEVEMENTS -->'''
new_before_achievements = upcoming_sessions + '\n\n' + weekly_goal + '\n\n            <!-- ACHIEVEMENTS -->'

assert old_grid_open in content, "grid_open not found"
assert old_right_block in content, "right_block not found"
assert achievements_marker in content, "achievements marker not found"

content = content.replace(old_grid_open, new_grid_open)
content = content.replace(old_right_block, new_right_block)
content = content.replace(achievements_marker, new_before_achievements, 1)

with open('www/dashboard.html', 'w') as f:
    f.write(content)

print("Reorder complete.")
