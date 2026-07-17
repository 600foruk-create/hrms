import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# I will completely replace the ROW 1: FILTERS container content
# with a clean version that has NO wrapper divs for the inputs

start_marker = '<!-- ROW 1: FILTERS -->'
end_marker = '<!-- ROW 2: SUMMARY CARDS -->'

if start_marker in content and end_marker in content:
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)
    
    new_filters = """        <!-- ROW 1: FILTERS -->
        <div class="premium-card p-3 print-hide" style="display: flex; gap: 10px; align-items: center; flex-wrap: nowrap; overflow-x: auto;">
            <input type="date" id="admin-rep-leave-start" class="premium-select" style="padding: 0 8px; font-size: 12px; height: 36px; min-width: 120px; flex: 1;">
            <input type="date" id="admin-rep-leave-end" class="premium-select" style="padding: 0 8px; font-size: 12px; height: 36px; min-width: 120px; flex: 1;">
            
            <select id="admin-rep-leave-dept" class="premium-select" style="height: 36px; min-width: 120px; flex: 1;">
                <option value="All">All Departments</option>
            </select>
            
            <select id="admin-rep-leave-emp" class="premium-select" style="height: 36px; min-width: 120px; flex: 1;">
                <option value="All">All Employees</option>
            </select>
            
            <select id="admin-rep-leave-type" class="premium-select" style="height: 36px; min-width: 120px; flex: 1;">
                <option value="All">All Leave Types</option>
                <option value="Casual Leave">Casual Leave</option>
                <option value="Medical Leave">Medical Leave</option>
                <option value="Annual Leave">Annual Leave</option>
                <option value="Unpaid Leave">Unpaid Leave</option>
            </select>
            
            <select id="admin-rep-leave-status" class="premium-select" style="height: 36px; min-width: 100px; flex: 1;">
                <option value="All">All Status</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
            </select>
            
            <select id="admin-rep-leave-manager" class="premium-select" style="height: 36px; min-width: 120px; flex: 1;">
                <option value="All">All Managers</option>
            </select>
            
            <div style="display: flex; gap: 6px; margin-left: auto; flex-shrink: 0;">
                <button class="btn-premium-primary" style="padding: 8px 12px; font-size: 12px; white-space: nowrap;" onclick="if(window.generateAdminReport) window.generateAdminReport('leave')">Generate Report</button>
                <button class="btn-premium-outline" style="padding: 8px 12px; font-size: 12px; white-space: nowrap;" onclick="if(window.resetLeaveSummaryFilters) window.resetLeaveSummaryFilters()"><i class="fa-solid fa-rotate-right me-1"></i> Reset</button>
                <button class="btn-premium-outline ms-1" style="padding: 8px 12px; font-size: 12px; white-space: nowrap;" onclick="if(window.printReport) window.printReport('admin-report-leave')"><i class="fa-solid fa-print"></i> Print</button>
            </div>
        </div>

"""
    content = content[:start_idx] + new_filters + content[end_idx:]

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied fix for wrapper divs and overlap!")
