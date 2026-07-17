import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove all labels in the filter section
# I will just remove <label class="filter-label">...</label> everywhere
content = re.sub(r'\s*<label class="filter-label">.*?</label>', '', content)

# Also fix the vertical alignment of the filter container which was 'align-items: flex-end;'
# Since labels are gone, 'align-items: center;' might look better
content = content.replace(
    '<div class="premium-card p-3 print-hide" style="display: flex; gap: 5px; align-items: flex-end; flex-wrap: nowrap; overflow-x: auto;">',
    '<div class="premium-card p-3 print-hide" style="display: flex; gap: 5px; align-items: center; flex-wrap: nowrap; overflow-x: auto;">'
)

# 2. Fix the last card size by shortening the title to fit on one line
content = content.replace(
    '<div class="sum-card-title">Total Leave Days Consumed</div>',
    '<div class="sum-card-title">Total Days Consumed</div>'
)

# Also, ensure all premium-cards in the summary section stretch to 100% height of their flex container
# I'll add height: 100%; to the inline style of the cards
content = content.replace(
    'style="margin-bottom: 0; position: relative; min-height: 75px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 10px;"',
    'style="margin-bottom: 0; position: relative; min-height: 75px; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 10px;"'
)


with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied fixes for labels and card height!")
