import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Date Range: 220px -> 170px
content = re.sub(
    r'<div style="flex: 1; min-width: 220px;">(\s*<label class="filter-label">Date Range</label>)',
    r'<div style="flex: 1; min-width: 170px;">\1',
    content
)

# Standard dropdowns: 140px -> 100px
content = re.sub(
    r'<div style="flex: 1; min-width: 140px;">(\s*<label class="filter-label">(Department|Employee|Leave Type|Manager)</label>)',
    r'<div style="flex: 1; min-width: 100px;">\1',
    content
)

# Status: 120px -> 90px
content = re.sub(
    r'<div style="flex: 1; min-width: 120px;">(\s*<label class="filter-label">Status</label>)',
    r'<div style="flex: 1; min-width: 90px;">\1',
    content
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated filter item widths successfully!")
