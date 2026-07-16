import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace wrapper styles
content = content.replace(
    '<div class="premium-card p-3 print-hide" style="display: flex; gap: 15px; align-items: flex-end; flex-wrap: wrap;">',
    '<div class="premium-card p-3 print-hide" style="display: flex; gap: 8px; align-items: flex-end; flex-wrap: nowrap; overflow-x: auto;">'
)

# Replace min-widths for filter items in the leave report
# Date Range
content = content.replace(
    '<div style="flex: 1; min-width: 220px;">\n                  <label class="filter-label">Date Range</label>',
    '<div style="flex: 1; min-width: 170px;">\n                  <label class="filter-label">Date Range</label>'
)

# Department, Employee, Leave Type, Manager
content = content.replace(
    '<div style="flex: 1; min-width: 140px;">\n                  <label class="filter-label">Department</label>',
    '<div style="flex: 1; min-width: 100px;">\n                  <label class="filter-label">Department</label>'
)
content = content.replace(
    '<div style="flex: 1; min-width: 140px;">\n                  <label class="filter-label">Employee</label>',
    '<div style="flex: 1; min-width: 100px;">\n                  <label class="filter-label">Employee</label>'
)
content = content.replace(
    '<div style="flex: 1; min-width: 140px;">\n                  <label class="filter-label">Leave Type</label>',
    '<div style="flex: 1; min-width: 100px;">\n                  <label class="filter-label">Leave Type</label>'
)
content = content.replace(
    '<div style="flex: 1; min-width: 140px;">\n                  <label class="filter-label">Manager</label>',
    '<div style="flex: 1; min-width: 100px;">\n                  <label class="filter-label">Manager</label>'
)

# Status
content = content.replace(
    '<div style="flex: 1; min-width: 120px;">\n                  <label class="filter-label">Status</label>',
    '<div style="flex: 1; min-width: 90px;">\n                  <label class="filter-label">Status</label>'
)

# Buttons Wrapper
content = content.replace(
    '<div style="display: flex; gap: 10px; margin-left: auto;">',
    '<div style="display: flex; gap: 6px; margin-left: auto;">'
)

# If they have standard btn-premium padding, maybe we can reduce button font-size slightly
content = content.replace(
    '<button class="btn-premium-primary" onclick="if(window.generateAdminReport) window.generateAdminReport(\'leave\')">Generate Report</button>',
    '<button class="btn-premium-primary" style="padding: 8px 12px; font-size: 12px; white-space: nowrap;" onclick="if(window.generateAdminReport) window.generateAdminReport(\'leave\')">Generate Report</button>'
)
content = content.replace(
    '<button class="btn-premium-outline" onclick="if(window.resetLeaveSummaryFilters) window.resetLeaveSummaryFilters()"><i class="fa-solid fa-rotate-right me-1"></i> Reset</button>',
    '<button class="btn-premium-outline" style="padding: 8px 12px; font-size: 12px; white-space: nowrap;" onclick="if(window.resetLeaveSummaryFilters) window.resetLeaveSummaryFilters()"><i class="fa-solid fa-rotate-right me-1"></i> Reset</button>'
)
content = content.replace(
    '<button class="btn-premium-outline ms-2" onclick="if(window.printReport) window.printReport(\'admin-report-leave\')"><i class="fa-solid fa-print"></i> Print</button>',
    '<button class="btn-premium-outline ms-1" style="padding: 8px 12px; font-size: 12px; white-space: nowrap;" onclick="if(window.printReport) window.printReport(\'admin-report-leave\')"><i class="fa-solid fa-print"></i> Print</button>'
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated filter row styling successfully!")
