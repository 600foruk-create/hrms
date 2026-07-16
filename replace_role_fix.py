import re

with open('reports.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "allUsers.filter(u => u.role === 'employee' || u.role === 'manager').forEach(u => {",
    "allUsers.filter(u => u.role && (u.role.toLowerCase() === 'employee' || u.role.toLowerCase() === 'manager')).forEach(u => {"
)

# And check if there's any other place that needs case-insensitive role check
# in reports.js, specifically in initAdminReportsTab for leave
content = content.replace(
    "window.db.users.filter(u => u.role === 'employee' || u.role === 'manager').forEach(u => {",
    "window.db.users.filter(u => u.role && (u.role.toLowerCase() === 'employee' || u.role.toLowerCase() === 'manager')).forEach(u => {"
)

with open('reports.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed role casing")
