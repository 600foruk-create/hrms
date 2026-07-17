import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix Filter Row to remove extra spaces and separate From/To Date
# First, remove the Date Range block
date_range_block = r'<div style="flex: 1; min-width: 170px;">\s*<label class="filter-label">Date Range</label>\s*<div class="input-group".*?</div>\s*</div>'
content = re.sub(date_range_block, 
    '<div style="width: 115px; flex-shrink: 0;">\n                  <label class="filter-label">From Date</label>\n                  <input type="date" id="admin-rep-leave-start" class="premium-select w-100" style="padding: 0 5px; font-size: 11px;">\n              </div>\n              <div style="width: 115px; flex-shrink: 0;">\n                  <label class="filter-label">To Date</label>\n                  <input type="date" id="admin-rep-leave-end" class="premium-select w-100" style="padding: 0 5px; font-size: 11px;">\n              </div>', 
    content, flags=re.DOTALL)

# Replace other filters to use fixed width and flex-shrink: 0 to avoid extra space
content = re.sub(r'<div style="flex: 1; min-width: 100px;">', '<div style="width: 110px; flex-shrink: 0;">', content)
content = re.sub(r'<div style="flex: 1; min-width: 90px;">', '<div style="width: 100px; flex-shrink: 0;">', content)

# Reduce gap in the main filter container
content = content.replace(
    '<div class="premium-card p-3 print-hide" style="display: flex; gap: 8px; align-items: flex-end; flex-wrap: nowrap; overflow-x: auto;">',
    '<div class="premium-card p-3 print-hide" style="display: flex; gap: 5px; align-items: flex-end; flex-wrap: nowrap; overflow-x: auto;">'
)

# 2. Fix Summary Cards Centering (pure CSS instead of Bootstrap classes)
content = content.replace(
    '<div class="premium-card py-2 px-1 h-100 d-flex flex-column justify-content-center align-items-center text-center" style="margin-bottom: 0; position: relative; min-height: 75px;">',
    '<div class="premium-card" style="margin-bottom: 0; position: relative; min-height: 75px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 10px;">'
)
content = content.replace(
    '<div class="flex-grow-1 d-flex flex-column justify-content-center align-items-center" style="width: 100%;">',
    '<div style="width: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center;">'
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied fix for From/To dates and pure CSS centering!")
