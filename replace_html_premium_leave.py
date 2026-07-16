import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

new_html = '''<!-- Sub Tab 4: Leave Report -->
<div id="subtab-content-admin-report-leave" class="sub-tab-content hidden" style="background-color: #f8fafc; padding: 15px;">
    
    <!-- Custom CSS for Premium Leave UI -->
    <style>
        .premium-card {
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1);
            border: 1px solid #f1f5f9;
            margin-bottom: 20px;
        }
        .filter-label {
            font-size: 11px;
            font-weight: 600;
            color: #64748b;
            margin-bottom: 4px;
            display: block;
        }
        .premium-select, .premium-input {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 12px;
            color: #1e293b;
            padding: 8px 12px;
            box-shadow: none !important;
            height: 36px;
            background-color: #fdfdfd;
        }
        .premium-select:focus, .premium-input:focus {
            border-color: #3b82f6;
            outline: none;
        }
        .btn-premium-primary {
            background-color: #2563eb;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            padding: 0 16px;
            height: 36px;
            box-shadow: 0 1px 2px rgba(37,99,235,0.3);
        }
        .btn-premium-outline {
            background-color: white;
            color: #1e293b;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            padding: 0 16px;
            height: 36px;
        }
        .sum-card-icon {
            width: 48px;
            height: 48px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
        }
        .sum-card-title {
            font-size: 12px;
            font-weight: 600;
            color: #64748b;
            margin-bottom: 2px;
        }
        .sum-card-val {
            font-size: 24px;
            font-weight: 800;
            color: #0f172a;
            line-height: 1;
        }
        .sum-card-sub {
            font-size: 10px;
            font-weight: 600;
            color: #94a3b8;
            margin-top: auto;
        }
        .prem-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            white-space: nowrap;
        }
        .prem-table th {
            font-size: 11px;
            font-weight: 700;
            color: #0f2e53;
            text-transform: capitalize;
            padding: 12px 10px;
            border-bottom: 2px solid #f1f5f9;
        }
        .prem-table td {
            padding: 12px 10px;
            color: #334155;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: middle;
        }
        .badge-soft-blue { background: #e0f2fe; color: #0369a1; border: none; font-weight: 600; padding: 4px 8px; border-radius: 4px; font-size: 11px; }
        .badge-soft-green { background: #dcfce7; color: #15803d; border: none; font-weight: 600; padding: 4px 8px; border-radius: 4px; font-size: 11px; }
        .badge-soft-purple { background: #f3e8ff; color: #7e22ce; border: none; font-weight: 600; padding: 4px 8px; border-radius: 4px; font-size: 11px; }
        .badge-soft-orange { background: #ffedd5; color: #c2410c; border: none; font-weight: 600; padding: 4px 8px; border-radius: 4px; font-size: 11px; }
        
        .badge-out-green { border: 1px solid #22c55e; color: #15803d; background: transparent; font-weight: 600; padding: 4px 10px; border-radius: 12px; font-size: 11px; }
        .badge-out-orange { border: 1px solid #f97316; color: #c2410c; background: transparent; font-weight: 600; padding: 4px 10px; border-radius: 12px; font-size: 11px; }
        .badge-out-red { border: 1px solid #ef4444; color: #b91c1c; background: transparent; font-weight: 600; padding: 4px 10px; border-radius: 12px; font-size: 11px; }
        
        .badge-pill-green { background: #bbf7d0; color: #166534; font-weight: 700; padding: 4px 12px; border-radius: 12px; font-size: 11px; border: none;}
        
        .pagination-box {
            display: flex; gap: 4px; align-items: center;
        }
        .page-btn {
            width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
            border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; background: transparent; color: #64748b;
        }
        .page-btn:hover { background: #f1f5f9; }
        .page-btn.active { background: #2563eb; color: white; }
        
        .card-header-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 15px; }
        
        .donut-chart-box {
            width: 120px; height: 120px; border-radius: 50%;
            position: relative; display: flex; align-items: center; justify-content: center;
            background: conic-gradient(#3b82f6 0% 47%, #22c55e 47% 67%, #a855f7 67% 96%, #eab308 96% 100%);
        }
        .donut-chart-box::after {
            content: ""; width: 80px; height: 80px; border-radius: 50%; background: white; position: absolute;
        }
        .legend-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 6px; }
        .num-badge { width: 20px; height: 20px; border-radius: 4px; background: #eff6ff; color: #2563eb; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; justify-content: center; margin-right: 8px;}
        
        /* Print Styles */
        @media print {
            .premium-card { box-shadow: none !important; border: 1px solid #e2e8f0 !important; page-break-inside: avoid; margin-bottom: 15px !important; }
            .print-hide { display: none !important; }
            body { background: white !important; }
            #subtab-content-admin-report-leave { padding: 0 !important; background: white !important; }
            .col-md-4 { width: 33.333% !important; float: left; padding: 0 5px !important;}
            .row { display: flex; flex-wrap: wrap; margin-right: -5px; margin-left: -5px; }
        }
    </style>

    <div class="printable-area" id="print-area-admin-report-leave">
        
        <div class="print-header hidden" style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #0f2e53; font-weight: 800;">LEAVE ANALYTICS REPORT</h2>
            <p id="print-subtitle-admin-report-leave" style="color: #64748b; font-size: 13px;"></p>
        </div>

        <!-- ROW 1: FILTERS -->
        <div class="premium-card p-3 print-hide" style="display: flex; gap: 15px; align-items: flex-end; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 220px;">
                <label class="filter-label">Date Range</label>
                <div class="input-group" style="height: 36px; border-radius: 6px; overflow: hidden; border: 1px solid #e2e8f0; background: #fdfdfd; display: flex !important; flex-wrap: nowrap !important;">
                    <span class="input-group-text bg-transparent border-0 text-muted px-2"><i class="fa-regular fa-calendar"></i></span>
                    <input type="date" id="admin-rep-leave-start" class="form-control border-0 bg-transparent px-1 shadow-none text-center" style="font-size: 12px; color: #1e293b;">
                    <span class="input-group-text bg-transparent border-0 text-muted px-0">-</span>
                    <input type="date" id="admin-rep-leave-end" class="form-control border-0 bg-transparent px-1 shadow-none text-center" style="font-size: 12px; color: #1e293b;">
                </div>
            </div>
            <div style="flex: 1; min-width: 140px;">
                <label class="filter-label">Department</label>
                <select id="admin-rep-leave-dept" class="premium-select w-100">
                    <option value="All">All Departments</option>
                </select>
            </div>
            <div style="flex: 1; min-width: 140px;">
                <label class="filter-label">Employee</label>
                <select id="admin-rep-leave-emp" class="premium-select w-100">
                    <option value="All">All Employees</option>
                </select>
            </div>
            <div style="flex: 1; min-width: 140px;">
                <label class="filter-label">Leave Type</label>
                <select id="admin-rep-leave-type" class="premium-select w-100">
                    <option value="All">All Leave Types</option>
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Medical Leave">Medical Leave</option>
                    <option value="Annual Leave">Annual Leave</option>
                    <option value="Unpaid Leave">Unpaid Leave</option>
                </select>
            </div>
            <div style="flex: 1; min-width: 120px;">
                <label class="filter-label">Status</label>
                <select id="admin-rep-leave-status" class="premium-select w-100">
                    <option value="All">All Status</option>
                    <option value="Approved">Approved</option>
                    <option value="Pending">Pending</option>
                    <option value="Rejected">Rejected</option>
                </select>
            </div>
            <div style="flex: 1; min-width: 140px;">
                <label class="filter-label">Manager</label>
                <select id="admin-rep-leave-manager" class="premium-select w-100">
                    <option value="All">All Managers</option>
                </select>
            </div>
            <div style="display: flex; gap: 10px; margin-left: auto;">
                <button class="btn-premium-primary" onclick="if(window.generateAdminReport) window.generateAdminReport('leave')">Generate Report</button>
                <button class="btn-premium-outline" onclick="if(window.resetLeaveSummaryFilters) window.resetLeaveSummaryFilters()"><i class="fa-solid fa-rotate-right me-1"></i> Reset</button>
                <button class="btn-premium-outline ms-2" onclick="if(window.printReport) window.printReport('admin-report-leave')"><i class="fa-solid fa-print"></i> Print</button>
            </div>
        </div>

        <!-- ROW 2: SUMMARY CARDS -->
        <div class="row g-3 mb-4" id="leave-summary-cards-container">
            <div class="col-md-2 col-sm-4 col-6">
                <div class="premium-card p-3 h-100 d-flex align-items-center" style="gap: 12px; margin-bottom: 0;">
                    <div class="sum-card-icon" style="background: #f5f3ff; color: #8b5cf6;"><i class="fa-solid fa-file-invoice"></i></div>
                    <div class="flex-grow-1">
                        <div class="sum-card-title">Total Leave Requests</div>
                        <div class="sum-card-val" id="leave-sum-total">0</div>
                    </div>
                </div>
            </div>
            <div class="col-md-2 col-sm-4 col-6">
                <div class="premium-card p-3 h-100 d-flex align-items-center" style="gap: 12px; margin-bottom: 0; position: relative;">
                    <div class="sum-card-icon" style="background: #ecfdf5; color: #10b981;"><i class="fa-regular fa-circle-check"></i></div>
                    <div class="flex-grow-1">
                        <div class="sum-card-title">Approved Requests</div>
                        <div class="sum-card-val" id="leave-sum-approved" style="color: #10b981;">0</div>
                    </div>
                    <div class="sum-card-sub" style="position: absolute; bottom: 12px; right: 12px;" id="leave-sum-pct-app">0%</div>
                </div>
            </div>
            <div class="col-md-2 col-sm-4 col-6">
                <div class="premium-card p-3 h-100 d-flex align-items-center" style="gap: 12px; margin-bottom: 0; position: relative;">
                    <div class="sum-card-icon" style="background: #fff7ed; color: #f97316;"><i class="fa-regular fa-clock"></i></div>
                    <div class="flex-grow-1">
                        <div class="sum-card-title">Pending Requests</div>
                        <div class="sum-card-val" id="leave-sum-pending" style="color: #f97316;">0</div>
                    </div>
                    <div class="sum-card-sub" style="position: absolute; bottom: 12px; right: 12px;" id="leave-sum-pct-pen">0%</div>
                </div>
            </div>
            <div class="col-md-2 col-sm-4 col-6">
                <div class="premium-card p-3 h-100 d-flex align-items-center" style="gap: 12px; margin-bottom: 0; position: relative;">
                    <div class="sum-card-icon" style="background: #fef2f2; color: #ef4444;"><i class="fa-regular fa-circle-xmark"></i></div>
                    <div class="flex-grow-1">
                        <div class="sum-card-title">Rejected Requests</div>
                        <div class="sum-card-val" id="leave-sum-rejected" style="color: #ef4444;">0</div>
                    </div>
                    <div class="sum-card-sub" style="position: absolute; bottom: 12px; right: 12px;" id="leave-sum-pct-rej">0%</div>
                </div>
            </div>
            <div class="col-md-2 col-sm-4 col-6">
                <div class="premium-card p-3 h-100 d-flex align-items-center" style="gap: 12px; margin-bottom: 0;">
                    <div class="sum-card-icon" style="background: #eff6ff; color: #3b82f6;"><i class="fa-solid fa-user-clock"></i></div>
                    <div class="flex-grow-1">
                        <div class="sum-card-title">Employees On Leave Today</div>
                        <div class="sum-card-val" id="leave-sum-onleave" style="color: #0f172a;">0</div>
                    </div>
                </div>
            </div>
            <div class="col-md-2 col-sm-4 col-6">
                <div class="premium-card p-3 h-100 d-flex align-items-center" style="gap: 12px; margin-bottom: 0; position: relative;">
                    <div class="sum-card-icon" style="background: #f0fdf4; color: #22c55e;"><i class="fa-regular fa-calendar-check"></i></div>
                    <div class="flex-grow-1">
                        <div class="sum-card-title">Total Leave Days Consumed</div>
                        <div class="sum-card-val" id="leave-sum-consumed" style="color: #0f172a;">0</div>
                    </div>
                    <div class="sum-card-sub" style="position: absolute; bottom: 12px; right: 12px; color: #64748b; font-weight: 400;">Days</div>
                </div>
            </div>
        </div>

        <!-- MAIN TABLE -->
        <div class="premium-card p-4">
            <div class="card-header-title">Leave Requests Report</div>
            <div class="table-responsive">
                <table class="prem-table" id="table-admin-leave-requests">
                    <thead>
                        <tr>
                            <th style="width: 30px;">#</th>
                            <th>Applied Date</th>
                            <th>Employee ID</th>
                            <th>Employee Name</th>
                            <th>Department</th>
                            <th>Leave Type</th>
                            <th>From Date</th>
                            <th>To Date</th>
                            <th class="text-center">Total Days</th>
                            <th class="text-center">Status</th>
                            <th>Approved By</th>
                            <th>Reason</th>
                        </tr>
                    </thead>
                    <tbody id="admin-rep-body-leave-requests">
                        <tr><td colspan="12" class="text-center text-muted" style="padding: 30px;">No leave requests found for selected criteria</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="d-flex justify-content-between align-items-center mt-3 print-hide">
                <div style="font-size: 11px; color: #64748b;" id="leave-req-footer-text">Showing 0 to 0 of 0 entries</div>
                <div class="pagination-box">
                    <button class="page-btn"><i class="fa-solid fa-angle-left"></i></button>
                    <button class="page-btn active">1</button>
                    <button class="page-btn">2</button>
                    <button class="page-btn">3</button>
                    <span style="color: #94a3b8; margin: 0 4px; font-size: 12px;">...</span>
                    <button class="page-btn"><i class="fa-solid fa-angle-right"></i></button>
                </div>
            </div>
        </div>

        <!-- 3 COLUMN TABLES -->
        <div class="row g-3 mb-4">
            <!-- Table 1 -->
            <div class="col-md-4">
                <div class="premium-card p-3 h-100 d-flex flex-column" style="margin-bottom: 0;">
                    <div class="card-header-title">Employee Leave Summary</div>
                    <div class="table-responsive flex-grow-1">
                        <table class="prem-table" id="table-admin-leave-emp-summary">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th class="text-center" style="font-size: 10px;">Casual<br>Leave</th>
                                    <th class="text-center" style="font-size: 10px;">Medical<br>Leave</th>
                                    <th class="text-center" style="font-size: 10px;">Annual<br>Leave</th>
                                    <th class="text-center" style="font-size: 10px;">Unpaid<br>Leave</th>
                                    <th class="text-center" style="font-size: 10px;">Total<br>Used</th>
                                    <th class="text-center" style="font-size: 10px;">Remaining<br>Balance</th>
                                </tr>
                            </thead>
                            <tbody id="admin-rep-body-leave-emp-summary">
                                <tr><td colspan="7" class="text-center text-muted py-3">No data found</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-2 print-hide" style="font-size: 10px; color: #64748b;">
                        <span id="leave-emp-footer-text">Showing 0 to 0 of 0 entries</span>
                        <a href="javascript:void(0)" style="color: #2563eb; font-weight: 600; text-decoration: none;">View All</a>
                    </div>
                </div>
            </div>

            <!-- Table 2 -->
            <div class="col-md-4">
                <div class="premium-card p-3 h-100 d-flex flex-column" style="margin-bottom: 0;">
                    <div class="card-header-title">Leave Balance Report</div>
                    <div class="table-responsive flex-grow-1">
                        <table class="prem-table" id="table-admin-leave-balance">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th class="text-center" style="font-size: 10px;">Annual Leave<br>Balance</th>
                                    <th class="text-center" style="font-size: 10px;">Casual Leave<br>Balance</th>
                                    <th class="text-center" style="font-size: 10px;">Medical Leave<br>Balance</th>
                                    <th class="text-center" style="font-size: 10px;">Total<br>Remaining</th>
                                </tr>
                            </thead>
                            <tbody id="admin-rep-body-leave-balance">
                                <tr><td colspan="5" class="text-center text-muted py-3">No data found</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-2 print-hide" style="font-size: 10px; color: #64748b;">
                        <span id="leave-bal-footer-text">Showing 0 to 0 of 0 entries</span>
                        <a href="javascript:void(0)" style="color: #2563eb; font-weight: 600; text-decoration: none;">View All</a>
                    </div>
                </div>
            </div>

            <!-- Table 3 -->
            <div class="col-md-4">
                <div class="premium-card p-3 h-100 d-flex flex-column" style="margin-bottom: 0;">
                    <div class="card-header-title">Department Leave Analysis</div>
                    <div class="table-responsive flex-grow-1">
                        <table class="prem-table" id="table-admin-leave-dept-analysis">
                            <thead>
                                <tr>
                                    <th>Department</th>
                                    <th class="text-center" style="font-size: 10px;">Total<br>Employees</th>
                                    <th class="text-center" style="font-size: 10px;">Total<br>Requests</th>
                                    <th class="text-center" style="font-size: 10px;">Approved</th>
                                    <th class="text-center" style="font-size: 10px;">Leave Days<br>Used</th>
                                    <th class="text-center" style="font-size: 10px;">Avg Leave /<br>Employee</th>
                                </tr>
                            </thead>
                            <tbody id="admin-rep-body-leave-dept-analysis">
                                <tr><td colspan="6" class="text-center text-muted py-3">No data found</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-2 print-hide" style="font-size: 10px; color: #64748b;">
                        <span id="leave-dept-footer-text">Showing 0 to 0 of 0 entries</span>
                        <a href="javascript:void(0)" style="color: #2563eb; font-weight: 600; text-decoration: none;">View All</a>
                    </div>
                </div>
            </div>
        </div>

        <!-- INSIGHTS -->
        <div class="premium-card p-4">
            <div class="card-header-title mb-4" style="color: #1e3a8a;"><i class="fa-solid fa-chart-pie me-2"></i>Leave Insights</div>
            <div class="row g-4">
                <!-- Most Leave Taken Employees -->
                <div class="col-md-3 border-end">
                    <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 15px;">Most Leave Taken Employees</div>
                    <div id="leave-insight-most-leaves" style="display: flex; flex-direction: column; gap: 12px;">
                        <!-- JS injected -->
                    </div>
                </div>

                <!-- Most Used Leave Type (Donut) -->
                <div class="col-md-3 border-end d-flex flex-column">
                    <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 15px;">Most Used Leave Type</div>
                    <div class="d-flex align-items-center justify-content-center flex-grow-1" style="gap: 20px;">
                        <div class="donut-chart-box" id="leave-donut-chart"></div>
                        <div id="leave-donut-legend" style="display: flex; flex-direction: column; gap: 8px; font-size: 11px; color: #475569;">
                            <!-- JS injected -->
                        </div>
                    </div>
                </div>

                <!-- Department With Highest Leave Usage -->
                <div class="col-md-2 border-end">
                    <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 15px;">Department With Highest Leave Usage</div>
                    <div id="leave-insight-high-dept-name" style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 5px;">-</div>
                    <div style="font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1;"><span id="leave-insight-high-dept-days">0</span> <span style="font-size: 12px; font-weight: 500; color: #64748b;">Days</span></div>
                    <div style="font-size: 10px; color: #94a3b8; margin-bottom: 8px;">Total Leave Days</div>
                    <div style="font-size: 11px; font-weight: 600; color: #22c55e;" id="leave-insight-high-dept-trend"><i class="fa-solid fa-arrow-up"></i> 0% <span style="font-weight: 400; color: #94a3b8;">vs Last Month</span></div>
                </div>

                <!-- Employees On Leave Today -->
                <div class="col-md-2 border-end">
                    <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 15px;">Employees On Leave Today</div>
                    <div id="leave-insight-onleave-list" style="display: flex; flex-direction: column; gap: 12px;">
                        <!-- JS injected -->
                    </div>
                </div>

                <!-- Low Leave Balance Employees -->
                <div class="col-md-2">
                    <div style="font-size: 12px; font-weight: 700; color: #ef4444; margin-bottom: 15px;"><i class="fa-solid fa-user-group me-1"></i> Low Leave Balance Employees</div>
                    <div id="leave-insight-low-bal-list" style="display: flex; flex-direction: column; gap: 12px;">
                        <!-- JS injected -->
                    </div>
                </div>
            </div>
        </div>

    </div>
</div>
'''

new_content = re.sub(
    r'<!-- Sub Tab 4: Leave Report -->.*?<!-- Sub Tab 5: Payroll Report -->', 
    new_html + '\n\n                        <!-- Sub Tab 5: Payroll Report -->', 
    content, 
    flags=re.DOTALL
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)
    
print("Replaced premium html in index.html")
