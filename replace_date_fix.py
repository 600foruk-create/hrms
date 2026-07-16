import re

with open('reports.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "const displayApplyDate = new Date(applyDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });",
    "const displayApplyDate = applyDate !== '-' && !isNaN(new Date(applyDate)) ? new Date(applyDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';"
)

content = content.replace(
    "const displayFrom = fromDate !== '-' ? new Date(fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';",
    "const displayFrom = fromDate !== '-' && !isNaN(new Date(fromDate)) ? new Date(fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';"
)

content = content.replace(
    "const displayTo = toDate !== '-' ? new Date(toDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';",
    "const displayTo = toDate !== '-' && !isNaN(new Date(toDate)) ? new Date(toDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';"
)

with open('reports.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed date parsing")
