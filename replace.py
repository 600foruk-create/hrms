import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = '''<!-- Sub Tab 4: Leave Report -->
<div id="subtab-content-admin-report-leave" class="sub-tab-content hidden">
    <div id="admin-leave-content-summary" class="section-card bg-white flex-table-card" style="padding: 20px; min-height: 100vh; overflow-x: auto; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        
        <!-- TOP CONTROLS ROW: FILTERS -->
        <div class="p-3 mb-4 d-print-none" style="border-radius: 8px; border: none; min-width: 1100px; display: flex; flex-wrap: nowrap; align-items: center; gap: 10px;">
            <div class="input-group" style="width: 280px; flex-shrink: 0; display: flex !important; flex-wrap: nowrap !important; border-radius: 6px; overflow: hidden; border: 1px solid #cbd5e1; height: 38px;">
                <input type="date" id="admin-rep-leave-start" class="form-control border-0 text-dark px-2 shadow-none text-center" style="font-size: 13px; background: transparent; flex: 1;">
                <span class="input-group-text bg-white text-muted border-0 px-1" style="font-size: 13px;">-</span>
                <input type="date" id="admin-rep-leave-end" class="form-control border-0 text-dark px-2 shadow-none text-center" style="font-size: 13px; background: transparent; flex: 1;">
            </div>
            <div style="width: 140px; flex-shrink: 0;">
                <select id="admin-rep-leave-dept" class="form-select text-dark shadow-none" style="font-size: 13px; border-radius: 6px; border: 1px solid #cbd5e1; height: 38px; width: 100%;">
                    <option value="All">All Departments</option>
                </select>
            </div>
            <div style="width: 140px; flex-shrink: 0;">
                <select id="admin-rep-leave-emp" class="form-select text-dark shadow-none" style="font-size: 13px; border-radius: 6px; border: 1px solid #cbd5e1; height: 38px; width: 100%;">
                    <option value="All">All Employees</option>
                </select>
            </div>
            <div style="width: 140px; flex-shrink: 0;">
                <select id="admin-rep-leave-type" class="form-select text-dark shadow-none" style="font-size: 13px; border-radius: 6px; border: 1px solid #cbd5e1; height: 38px; width: 100%;">
                    <option value="All">All Types</option>
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Medical Leave">Medical Leave</option>
                    <option value="Annual Leave">Annual Leave</option>
                    <option value="Unpaid Leave">Unpaid Leave</option>
                    <option value="Maternity Leave">Maternity Leave</option>
                    <option value="Emergency Leave">Emergency Leave</option>
                </select>
            </div>
            <div style="width: 120px; flex-shrink: 0;">
                <select id="admin-rep-leave-status" class="form-select text-dark shadow-none" style="font-size: 13px; border-radius: 6px; border: 1px solid #cbd5e1; height: 38px; width: 100%;">
                    <option value="All">All Status</option>
                    <option value="Approved">Approved</option>
                    <option value="Pending">Pending</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Cancelled">Cancelled</option>
                </select>
            </div>
            <div style="width: 140px; flex-shrink: 0;">
                <select id="admin-rep-leave-manager" class="form-select text-dark shadow-none" style="font-size: 13px; border-radius: 6px; border: 1px solid #cbd5e1; height: 38px; width: 100%;">
                    <option value="All">All Managers</option>
                </select>
            </div>
            
            <div class="d-flex flex-nowrap align-items-center" style="gap: 8px; margin-left: auto;">
                <button class="btn btn-primary text-white shadow-none" style="font-size: 13px; font-weight: 500; white-space: nowrap; padding: 0 16px; height: 38px; border-radius: 6px;" onclick="if(window.generateAdminReport) window.generateAdminReport('leave')">
                    <i class="fa-solid fa-chart-bar me-1"></i>Generate Report
                </button>
                <button class="btn bg-white text-dark shadow-none" style="font-size: 13px; font-weight: 500; white-space: nowrap; padding: 0 12px; height: 38px; border-radius: 6px; border: 1px solid #cbd5e1;" onclick="if(window.resetLeaveSummaryFilters) window.resetLeaveSummaryFilters()" title="Reset Filters">
                    <i class="fa-solid fa-rotate-right me-1"></i> Reset
                </button>
            </div>
        </div>

        <!-- SUMMARY CARDS IN ONE ROW -->
        <div id="leave-summary-cards-container" class="mb-4 d-print-none" style="display: flex; flex-wrap: nowrap; overflow-x: auto; gap: 15px; min-width: 1000px;">
            <div style="flex: 1; min-width: 130px;">
                <div class="bg-white p-3 h-100 shadow-sm position-relative text-center" style="border-radius: 8px; border: 1px solid #e2e8f0; min-height: 70px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <div style="font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 4px; white-space: nowrap;">Total Requests</div>
                    <div id="leave-sum-total" style="font-size: 24px; font-weight: 800; color: #0f172a; line-height: 1;">0</div>
                </div>
            </div>
            <div style="flex: 1; min-width: 130px;">
                <div class="bg-white p-3 h-100 shadow-sm position-relative text-center" style="border-radius: 8px; border: 1px solid #e2e8f0; min-height: 70px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <div style="font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 4px; white-space: nowrap;">Approved</div>
                    <div id="leave-sum-approved" style="font-size: 24px; font-weight: 800; color: #10b981; line-height: 1;">0</div>
                </div>
            </div>
            <div style="flex: 1; min-width: 130px;">
                <div class="bg-white p-3 h-100 shadow-sm position-relative text-center" style="border-radius: 8px; border: 1px solid #e2e8f0; min-height: 70px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <div style="font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 4px; white-space: nowrap;">Pending</div>
                    <div id="leave-sum-pending" style="font-size: 24px; font-weight: 800; color: #f59e0b; line-height: 1;">0</div>
                </div>
            </div>
            <div style="flex: 1; min-width: 130px;">
                <div class="bg-white p-3 h-100 shadow-sm position-relative text-center" style="border-radius: 8px; border: 1px solid #e2e8f0; min-height: 70px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <div style="font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 4px; white-space: nowrap;">Rejected</div>
                    <div id="leave-sum-rejected" style="font-size: 24px; font-weight: 800; color: #ef4444; line-height: 1;">0</div>
                </div>
            </div>
            <div style="flex: 1; min-width: 130px;">
                <div class="bg-white p-3 h-100 shadow-sm position-relative text-center" style="border-radius: 8px; border: 1px solid #e2e8f0; min-height: 70px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <div style="font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 4px; white-space: nowrap;">Currently On Leave</div>
                    <div id="leave-sum-onleave" style="font-size: 24px; font-weight: 800; color: #3b82f6; line-height: 1;">0</div>
                </div>
            </div>
            <div style="flex: 1; min-width: 130px;">
                <div class="bg-white p-3 h-100 shadow-sm position-relative text-center" style="border-radius: 8px; border: 1px solid #e2e8f0; min-height: 70px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <div style="font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 4px; white-space: nowrap;">Days Consumed</div>
                    <div id="leave-sum-consumed" style="font-size: 24px; font-weight: 800; color: #8b5cf6; line-height: 1;">0</div>
                </div>
            </div>
        </div>

        <!-- PRINTABLE AREA (Contains 4 Tables + Insights) -->
        <div class="bg-white mb-4 print-full-width" style="border-radius: 8px; border: none; overflow: hidden; min-width: 1000px;">
            <div class="p-3 border-bottom d-flex justify-content-between align-items-center d-print-none">
                <h5 style="margin: 0; font-size: 16px; font-weight: 700; color: #1e293b;">Leave Analytics Report</h5>
                <div class="d-flex flex-nowrap" style="gap: 8px;">
                    <button class="btn btn-sm border text-dark bg-white shadow-sm" style="font-size: 12px; font-weight: 500;" onclick="if(window.exportLeaveExcel) window.exportLeaveExcel()">Excel</button>
                    <button class="btn btn-sm border text-dark bg-white shadow-sm" style="font-size: 12px; font-weight: 500;" onclick="if(window.exportLeavePDF) window.exportLeavePDF()">PDF</button>
                    <button class="btn btn-sm border text-dark bg-white shadow-sm" style="font-size: 12px; font-weight: 500;" onclick="if(window.printReport) window.printReport('admin-report-leave')">Print</button>
                </div>
            </div>
            
            <div class="table-responsive printable-area print-full-width" id="print-area-admin-report-leave">
                <style>
                    @media print {
                        .print-full-width {
                            min-width: 100% !important;
                            width: 100% !important;
                        }
                        .leave-report-table {
                            min-width: 100% !important;
                            width: 100% !important;
                            border-collapse: collapse !important;
                            font-size: 10px !important;
                            white-space: normal !important;
                        }
                        .leave-report-table thead th {
                            background-color: #0f2e53 !important;
                            color: #ffffff !important;
                            border-bottom: none !important;
                            font-size: 9px !important;
                            padding: 6px 4px !important;
                        }
                        .leave-report-table td {
                            border-bottom: 1px solid #e2e8f0 !important;
                            border-right: none !important;
                            border-left: none !important;
                            padding: 6px 4px !important;
                        }
                        .leave-bottom-widgets {
                            display: none !important;
                        }
                    }
                </style>
                <div class="print-header hidden" style="text-align: center; margin-bottom: 20px;">
                    <h2 id="print-title-admin-report-leave">LEAVE MANAGEMENT REPORT</h2>
                    <p id="print-subtitle-admin-report-leave"></p>
                </div>

                <!-- TABLE 1: Leave Request Report -->
                <h6 style="margin-top: 20px; margin-bottom: 10px; font-size: 14px; font-weight: 700; color: #0f2e53; text-transform: uppercase;">1. Leave Request Report</h6>
                <table class="table align-middle data-table leave-report-table" id="table-admin-leave-requests" style="margin-bottom: 30px; font-size: 12px; min-width: 1000px; white-space: nowrap;">
                    <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 11px; font-weight: 700; text-transform: uppercase;">
                        <tr>
                            <th class="ps-3 py-3" style="width: 80px; border-bottom: none;">Applied</th>
                            <th class="py-3" style="border-bottom: none;">Emp ID</th>
                            <th class="py-3" style="border-bottom: none;">Employee Name</th>
                            <th class="py-3" style="border-bottom: none;">Department</th>
                            <th class="py-3" style="border-bottom: none;">Leave Type</th>
                            <th class="py-3" style="border-bottom: none;">From</th>
                            <th class="py-3" style="border-bottom: none;">To</th>
                            <th class="text-center py-3" style="border-bottom: none;">Total Days</th>
                            <th class="text-center py-3" style="border-bottom: none;">Status</th>
                            <th class="py-3" style="border-bottom: none;">Approved By</th>
                            <th class="py-3" style="border-bottom: none;">Reason</th>
                        </tr>
                    </thead>
                    <tbody id="admin-rep-body-leave-requests">
                        <tr><td colspan="11" class="text-center text-muted" style="padding: 30px;">Click Generate to view data</td></tr>
                    </tbody>
                </table>

                <!-- TABLE 2: Employee Leave Summary -->
                <h6 style="margin-top: 20px; margin-bottom: 10px; font-size: 14px; font-weight: 700; color: #0f2e53; text-transform: uppercase;">2. Employee Leave Summary</h6>
                <table class="table align-middle data-table leave-report-table" id="table-admin-leave-emp-summary" style="margin-bottom: 30px; font-size: 12px; min-width: 1000px; white-space: nowrap;">
                    <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 11px; font-weight: 700; text-transform: uppercase;">
                        <tr>
                            <th class="ps-3 py-3" style="border-bottom: none;">Employee Name</th>
                            <th class="py-3" style="border-bottom: none;">Department</th>
                            <th class="text-center py-3" style="border-bottom: none;">Casual Used</th>
                            <th class="text-center py-3" style="border-bottom: none;">Medical Used</th>
                            <th class="text-center py-3" style="border-bottom: none;">Annual Used</th>
                            <th class="text-center py-3" style="border-bottom: none;">Unpaid Used</th>
                            <th class="text-center py-3" style="border-bottom: none;">Total Used</th>
                            <th class="text-center py-3" style="border-bottom: none;">Remaining Balance</th>
                        </tr>
                    </thead>
                    <tbody id="admin-rep-body-leave-emp-summary">
                        <tr><td colspan="8" class="text-center text-muted" style="padding: 30px;">Click Generate to view data</td></tr>
                    </tbody>
                </table>

                <!-- TABLE 3: Leave Balance Report -->
                <h6 style="margin-top: 20px; margin-bottom: 10px; font-size: 14px; font-weight: 700; color: #0f2e53; text-transform: uppercase;">3. Leave Balance Report</h6>
                <table class="table align-middle data-table leave-report-table" id="table-admin-leave-balance" style="margin-bottom: 30px; font-size: 12px; min-width: 1000px; white-space: nowrap;">
                    <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 11px; font-weight: 700; text-transform: uppercase;">
                        <tr>
                            <th class="ps-3 py-3" style="border-bottom: none;">Employee Name</th>
                            <th class="text-center py-3" style="border-bottom: none;">Annual Balance</th>
                            <th class="text-center py-3" style="border-bottom: none;">Casual Balance</th>
                            <th class="text-center py-3" style="border-bottom: none;">Medical Balance</th>
                            <th class="text-center py-3" style="border-bottom: none;">Total Remaining</th>
                        </tr>
                    </thead>
                    <tbody id="admin-rep-body-leave-balance">
                        <tr><td colspan="5" class="text-center text-muted" style="padding: 30px;">Click Generate to view data</td></tr>
                    </tbody>
                </table>

                <!-- TABLE 4: Department Leave Analysis -->
                <h6 style="margin-top: 20px; margin-bottom: 10px; font-size: 14px; font-weight: 700; color: #0f2e53; text-transform: uppercase;">4. Department Leave Analysis</h6>
                <table class="table align-middle data-table leave-report-table" id="table-admin-leave-dept-analysis" style="margin-bottom: 30px; font-size: 12px; min-width: 1000px; white-space: nowrap;">
                    <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 11px; font-weight: 700; text-transform: uppercase;">
                        <tr>
                            <th class="ps-3 py-3" style="border-bottom: none;">Department</th>
                            <th class="text-center py-3" style="border-bottom: none;">Total Employees</th>
                            <th class="text-center py-3" style="border-bottom: none;">Total Requests</th>
                            <th class="text-center py-3" style="border-bottom: none;">Approved Leaves</th>
                            <th class="text-center py-3" style="border-bottom: none;">Leave Days Used</th>
                            <th class="text-center py-3" style="border-bottom: none;">Avg Leave Per Emp</th>
                        </tr>
                    </thead>
                    <tbody id="admin-rep-body-leave-dept-analysis">
                        <tr><td colspan="6" class="text-center text-muted" style="padding: 30px;">Click Generate to view data</td></tr>
                    </tbody>
                </table>

                <!-- LEAVE INSIGHTS SECTION -->
                <h6 style="margin-top: 20px; margin-bottom: 10px; font-size: 14px; font-weight: 700; color: #0f2e53; text-transform: uppercase;">5. Leave Insights</h6>
                <div class="row leave-bottom-widgets" style="margin-bottom: 30px;">
                    <div class="col-md-3">
                        <div class="p-3 bg-light rounded shadow-sm h-100" style="border: 1px solid #e2e8f0;">
                            <div style="font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 8px;">Most Leaves Taken</div>
                            <ol id="leave-insight-most-leaves" style="font-size: 12px; color: #334155; margin: 0; padding-left: 15px;">
                                <li>-</li><li>-</li><li>-</li>
                            </ol>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="p-3 bg-light rounded shadow-sm h-100" style="border: 1px solid #e2e8f0;">
                            <div style="font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 8px;">Most Used Type</div>
                            <div id="leave-insight-freq-type" style="font-size: 14px; font-weight: 600; color: #3b82f6;">-</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="p-3 bg-light rounded shadow-sm h-100" style="border: 1px solid #e2e8f0;">
                            <div style="font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 8px;">Highest Usage Dept</div>
                            <div id="leave-insight-high-dept" style="font-size: 14px; font-weight: 600; color: #f59e0b;">-</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="p-3 bg-light rounded shadow-sm h-100" style="border: 1px solid #e2e8f0;">
                            <div style="font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 8px;">Low Balance (< 3 Days)</div>
                            <ul id="leave-insight-low-bal" style="font-size: 12px; color: #ef4444; margin: 0; padding-left: 15px; font-weight: 600;">
                                <li>-</li>
                            </ul>
                        </div>
                    </div>
                </div>

            </div>
        </div>

    </div>
</div>
'''

modal_replacement = '''    <!-- Employee Leave Detail Modal -->
    <div id="modal-employee-leave-detail" class="modal hidden" style="max-width: 800px; width: 95%;">
        <div class="modal-header">
            <h3>Employee Leave Details</h3>
            <div class="modal-header-controls">
                <button class="modal-close"><i class="fa-solid fa-xmark"></i></button>
            </div>
        </div>
        <div class="modal-body">
            <div class="row mb-4">
                <div class="col-md-6">
                    <h5 style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 10px;">Employee Info</h5>
                    <table class="table table-sm table-borderless" style="font-size: 13px;">
                        <tbody>
                            <tr><td style="width: 100px; color: #64748b;">ID:</td><td id="emp-leave-detail-id" style="font-weight: 600; color: #0f172a;">-</td></tr>
                            <tr><td style="color: #64748b;">Name:</td><td id="emp-leave-detail-name" style="font-weight: 600; color: #0f172a;">-</td></tr>
                            <tr><td style="color: #64748b;">Department:</td><td id="emp-leave-detail-dept" style="font-weight: 600; color: #0f172a;">-</td></tr>
                            <tr><td style="color: #64748b;">Designation:</td><td id="emp-leave-detail-desig" style="font-weight: 600; color: #0f172a;">-</td></tr>
                            <tr><td style="color: #64748b;">Manager:</td><td id="emp-leave-detail-manager" style="font-weight: 600; color: #0f172a;">-</td></tr>
                        </tbody>
                    </table>
                </div>
                <div class="col-md-6">
                    <h5 style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 10px;">Leave Statistics</h5>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <div class="d-flex justify-content-between mb-2" style="font-size: 13px;">
                            <span style="color: #64748b;">Casual Leave Used:</span><span id="emp-leave-detail-casual" style="font-weight: 600; color: #0f172a;">-</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2" style="font-size: 13px;">
                            <span style="color: #64748b;">Medical Leave Used:</span><span id="emp-leave-detail-medical" style="font-weight: 600; color: #0f172a;">-</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2" style="font-size: 13px;">
                            <span style="color: #64748b;">Annual Leave Used:</span><span id="emp-leave-detail-annual" style="font-weight: 600; color: #0f172a;">-</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2" style="font-size: 13px;">
                            <span style="color: #64748b;">Unpaid Leave Used:</span><span id="emp-leave-detail-unpaid" style="font-weight: 600; color: #0f172a;">-</span>
                        </div>
                        <div class="d-flex justify-content-between pt-2 mt-2" style="border-top: 1px dashed #cbd5e1; font-size: 14px;">
                            <span style="color: #1e293b; font-weight: 700;">Remaining Balance:</span><span id="emp-leave-detail-balance" style="font-weight: 800; color: #22c55e;">-</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <h5 style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 10px;">Leave History</h5>
            <div class="table-responsive" style="max-height: 250px; overflow-y: auto;">
                <table class="table table-sm align-middle" style="font-size: 12px; white-space: nowrap;">
                    <thead style="background: #f1f5f9; position: sticky; top: 0; z-index: 1;">
                        <tr>
                            <th>Type</th>
                            <th>From</th>
                            <th>To</th>
                            <th>Days</th>
                            <th>Status</th>
                            <th>Reason</th>
                        </tr>
                    </thead>
                    <tbody id="emp-leave-detail-history">
                        <tr><td colspan="6" class="text-center text-muted">No history found</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
        <div class="modal-footer" style="padding: 15px; border-top: 1px solid rgba(0,0,0,0.05); text-align: right;">
            <button class="btn btn-outline modal-close">Close</button>
        </div>
    </div>
'''

new_content = re.sub(
    r'<!-- Sub Tab 4: Leave Report -->.*?<!-- Sub Tab 5: Payroll Report -->', 
    replacement + '\n\n                        <!-- Sub Tab 5: Payroll Report -->', 
    content, 
    flags=re.DOTALL
)

if 'id="modal-employee-leave-detail"' not in new_content:
    new_content = new_content.replace('<!-- End Modals -->', modal_replacement + '\n    <!-- End Modals -->')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)
    
print("Replaced index.html")
