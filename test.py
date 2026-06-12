import re
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()
matches = re.findall(r'<div\s+id="[^"]+"\s+class="tab-view[^>]*>', html)
for m in matches:
    print(m)
