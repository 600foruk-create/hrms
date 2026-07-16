import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix Summary Cards
content = content.replace(
    '<div class="row g-3 mb-4" id="leave-summary-cards-container">',
    '<div id="leave-summary-cards-container" style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 25px;">'
)
content = content.replace(
    '<div class="col-md-2 col-sm-4 col-6">\n                  <div class="premium-card',
    '<div style="flex: 1; min-width: 160px;">\n                  <div class="premium-card'
)

# 2. Fix the 3 bottom tables (Emp Summary, Balances, Dept Analysis)
content = content.replace(
    '<div class="row g-3 mb-4">\n            <!-- Table 1 -->\n            <div class="col-md-4">',
    '<div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 25px;">\n            <!-- Table 1 -->\n            <div style="flex: 1; min-width: 320px;">'
)
content = content.replace(
    '<!-- Table 2 -->\n            <div class="col-md-4">',
    '<!-- Table 2 -->\n            <div style="flex: 1; min-width: 320px;">'
)
content = content.replace(
    '<!-- Table 3 -->\n            <div class="col-md-4">',
    '<!-- Table 3 -->\n            <div style="flex: 1; min-width: 320px;">'
)

# 3. Fix Insights Section
content = content.replace(
    '<div class="premium-card p-4">\n            <div class="card-header-title mb-4" style="color: #1e3a8a;"><i class="fa-solid fa-chart-pie me-2"></i>Leave Insights</div>\n            <div class="row g-4">',
    '<div class="premium-card p-4">\n            <div class="card-header-title mb-4" style="color: #1e3a8a;"><i class="fa-solid fa-chart-pie me-2"></i>Leave Insights</div>\n            <div style="display: flex; flex-wrap: wrap; gap: 20px;">'
)
content = content.replace(
    '<!-- Most Leave Taken Employees -->\n                <div class="col-md-3 border-end">',
    '<!-- Most Leave Taken Employees -->\n                <div style="flex: 1.5; min-width: 220px;" class="border-end pe-3">'
)
content = content.replace(
    '<!-- Most Used Leave Type (Donut) -->\n                <div class="col-md-3 border-end d-flex flex-column">',
    '<!-- Most Used Leave Type (Donut) -->\n                <div style="flex: 1.5; min-width: 220px; display: flex; flex-direction: column;" class="border-end pe-3">'
)
content = content.replace(
    '<!-- Department With Highest Leave Usage -->\n                <div class="col-md-2 border-end">',
    '<!-- Department With Highest Leave Usage -->\n                <div style="flex: 1; min-width: 180px;" class="border-end pe-3">'
)
content = content.replace(
    '<!-- Employees On Leave Today -->\n                <div class="col-md-2 border-end">',
    '<!-- Employees On Leave Today -->\n                <div style="flex: 1.2; min-width: 200px;" class="border-end pe-3">'
)
content = content.replace(
    '<!-- Low Leave Balance Employees -->\n                <div class="col-md-2">',
    '<!-- Low Leave Balance Employees -->\n                <div style="flex: 1.2; min-width: 200px;">'
)

# Replace the d-flex inside the donut chart to avoid horizontal overflow if needed
content = content.replace(
    '<div class="d-flex align-items-center justify-content-center flex-grow-1" style="gap: 20px;">\n                        <div class="donut-chart-box" id="leave-donut-chart"></div>\n                        <div id="leave-donut-legend" style="display: flex; flex-direction: column; gap: 8px; font-size: 11px; color: #475569;">',
    '<div style="display: flex; align-items: center; justify-content: center; flex-grow: 1; gap: 15px; flex-wrap: wrap;">\n                        <div class="donut-chart-box" id="leave-donut-chart"></div>\n                        <div id="leave-donut-legend" style="display: flex; flex-direction: column; gap: 8px; font-size: 11px; color: #475569; min-width: 100px;">'
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated index.html to use pure flexbox instead of Bootstrap grid")
