import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Locate the admin-tab-attendance block
start_tag = '<div id="admin-tab-attendance" class="tab-view">'
end_tag = '<!-- Admin Payroll Tab -->'

start_idx = content.find(start_tag)
end_idx = content.find(end_tag)

if start_idx == -1 or end_idx == -1:
    print('Could not find block')
    exit(1)

new_html = '''<div id="admin-tab-attendance" class="tab-view">
                        <div class="view-header">
                            <div>
                                <h1>Attendance Management</h1>
                                <p class="text-secondary">View attendance records and monitor productivity slabs.</p>
                            </div>
                            <div class="actions">
                                <button class="btn btn-outline" id="btn-admin-mark-attendance"><i
                                        class="fa-regular fa-calendar-check"></i> Manual Log</button>
                            </div>
                        </div>

                        <!-- Sub-tab Navigation -->
                        <div class="sub-tab-nav">
                            <button class="btn-sub-tab active" data-subtab="attendance-log">
                                <i class="fa-solid fa-calendar-days"></i> Attendance Log
                            </button>
                            <button class="btn-sub-tab" data-subtab="attendance-my">
                                <i class="fa-solid fa-user-check"></i> My Attendance
                            </button>
                            <button class="btn-sub-tab" data-subtab="attendance-slab">
                                <i class="fa-solid fa-chart-pie"></i> Attendance Slab
                            </button>
                        </div>

                        <!-- Sub-tab Content: Attendance Log -->
                        <div class="sub-tab-content" id="subtab-content-attendance-log">
                            <div class="section-card bg-glass">
                                <div class="section-card-header">
                                    <h3>Attendance Log</h3>
                                    <div class="header-filters">
                                        <input type="date" id="admin-attendance-filter-date" class="form-control"
                                            onchange="renderAdminAttendanceTab()">
                                        <select id="admin-attendance-filter-employee" class="form-control"
                                            onchange="renderAdminAttendanceTab()">
                                            <option value="">All Employees</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="table-container">
                                    <table class="data-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Employee ID</th>
                                                <th>Employee Name</th>
                                                <th>Role</th>
                                                <th>Assigned Manager</th>
                                                <th>Status</th>
                                                <th class="text-center">Time In</th>
                                                <th class="text-center">Time Out</th>
                                                <th class="text-center">Marked By</th>
                                            </tr>
                                        </thead>
                                        <tbody id="admin-attendance-table-body">
                                            <!-- Dynamic Rows -->
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <!-- Sub-tab Content: My Attendance -->
                        <div class="sub-tab-content hidden" id="subtab-content-attendance-my">
                            <div class="section-card bg-glass">
                                <div class="section-card-header">
                                    <h3>My Attendance</h3>
                                </div>
                                <div class="table-container">
                                    <table class="data-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Status</th>
                                                <th class="text-center">Time In</th>
                                                <th class="text-center">Time Out</th>
                                            </tr>
                                        </thead>
                                        <tbody id="admin-my-attendance-table-body">
                                            <!-- Dynamic Rows -->
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <!-- Sub-tab Content: Attendance Slab -->
                        <div class="sub-tab-content hidden" id="subtab-content-attendance-slab">
                            <div class="section-card bg-glass">
                                <div class="section-card-header">
                                    <h3>Attendance Slab (Defaulters)</h3>
                                    <div class="header-filters">
                                        <input type="date" id="admin-slab-filter-date" class="form-control"
                                            onchange="renderAdminAttendanceSlab()">
                                    </div>
                                </div>
                                <p class="text-secondary mb-3">Showing employees marked as Late, Half Day, or Absent for the selected date.</p>
                                <div class="table-container">
                                    <table class="data-table">
                                        <thead>
                                            <tr>
                                                <th>Employee ID</th>
                                                <th>Employee Name</th>
                                                <th>Role</th>
                                                <th>Status</th>
                                                <th>Contact</th>
                                            </tr>
                                        </thead>
                                        <tbody id="admin-attendance-slab-table-body">
                                            <!-- Dynamic Rows -->
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Admin Leave Tab -->
                    <div id="admin-tab-leave" class="tab-view hidden">
                        <div class="view-header">
                            <div>
                                <h1>Leave Management</h1>
                                <p class="text-secondary">Configure leave policies, review employee balances, and approve requests.</p>
                            </div>
                        </div>

                        <!-- Sub-tab Navigation -->
                        <div class="sub-tab-nav">
                            <button class="btn-sub-tab active" data-subtab="leave-policy">
                                <i class="fa-solid fa-gear"></i> Leave Policy Configuration
                            </button>
                            <button class="btn-sub-tab" data-subtab="leave-balances">
                                <i class="fa-solid fa-scale-balanced"></i> Employee Leave Balances
                            </button>
                            <button class="btn-sub-tab" data-subtab="leave-requests">
                                <i class="fa-solid fa-envelope-open-text"></i> Leave Requests
                            </button>
                        </div>

                        <!-- Sub-tab Content: Leave Policy Configuration -->
                        <div class="sub-tab-content" id="subtab-content-leave-policy">
'''

# Get the original Leave Management content to paste inside
orig_leave_content = content[content.find('<!-- Leave Policy Config -->'):content.find('<!-- Employee Leave Balances Config -->')]
orig_leave_balances = content[content.find('<!-- Employee Leave Balances Config -->'):content.find('</div>\n                    </div>\n\n                    <!-- Admin Payroll Tab -->')]

new_html += orig_leave_content
new_html += '''                        </div>

                        <!-- Sub-tab Content: Employee Leave Balances -->
                        <div class="sub-tab-content hidden" id="subtab-content-leave-balances">
'''
new_html += orig_leave_balances

new_html += '''                        </div>

                        <!-- Sub-tab Content: Leave Requests -->
                        <div class="sub-tab-content hidden" id="subtab-content-leave-requests">
                            <div class="section-card bg-glass">
                                <div class="section-card-header">
                                    <h3>Global Leave Requests</h3>
                                </div>
                                <p class="text-secondary mb-3">Review and approve leave requests from all employees and managers.</p>
                                <div class="table-container">
                                    <table class="data-table">
                                        <thead>
                                            <tr>
                                                <th>Date Submitted</th>
                                                <th>Employee</th>
                                                <th>Role</th>
                                                <th>Leave Type</th>
                                                <th>Duration</th>
                                                <th>Reason</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody id="admin-leave-requests-table-body">
                                            <!-- Dynamic Rows -->
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    '''

final_content = content[:start_idx] + new_html + content[end_idx:]

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(final_content)

print("HTML Replaced Successfully!")
