import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Locate the leave-summary-cards-container section
start_marker = '<div id="leave-summary-cards-container"'
end_marker = '<!-- MAIN TABLE -->'

if start_marker in content and end_marker in content:
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker, start_idx)
    
    section = content[start_idx:end_idx]
    
    # Replace col wrapper
    section = section.replace('<div class="col-md-2 col-sm-4 col-6">', '<div style="flex: 1; min-width: 140px;">')
    
    # Replace the premium-card div (with relative and without relative)
    section = section.replace(
        '<div class="premium-card p-3 h-100 d-flex align-items-center" style="gap: 12px; margin-bottom: 0; position: relative;">',
        '<div class="premium-card py-2 px-1 h-100 d-flex flex-column justify-content-center align-items-center text-center" style="margin-bottom: 0; position: relative; min-height: 75px;">'
    )
    section = section.replace(
        '<div class="premium-card p-3 h-100 d-flex align-items-center" style="gap: 12px; margin-bottom: 0;">',
        '<div class="premium-card py-2 px-1 h-100 d-flex flex-column justify-content-center align-items-center text-center" style="margin-bottom: 0; position: relative; min-height: 75px;">'
    )
    
    # Remove all sum-card-icon divs
    section = re.sub(r'<div class="sum-card-icon".*?</div>', '', section, flags=re.DOTALL)
    
    # Adjust flex-grow-1 container inside card
    section = section.replace('<div class="flex-grow-1">', '<div class="flex-grow-1 d-flex flex-column justify-content-center align-items-center" style="width: 100%;">')
    
    # Adjust absolute positioning of percentages
    section = section.replace('bottom: 12px; right: 12px;', 'bottom: 6px; right: 8px; font-size: 10px;')
    
    # Re-insert the modified section
    content = content[:start_idx] + section + content[end_idx:]

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated summary cards successfully!")
