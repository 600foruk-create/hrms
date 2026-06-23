import re
with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r"(u|emp)\.role === 'User' \|\| \1\.role === 'Employee'", r"\1.role !== 'Admin'", content)
content = re.sub(r"role === 'User' \|\| role === 'Employee'", r"role !== 'Admin'", content)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
