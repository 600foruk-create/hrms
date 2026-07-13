// Reports & Analytics Module Logic

// Removed DOMContentLoaded init, now using specific init functions called by app.js

// Admin Reports Tab Switcher
window.renderAdminReportsTab = function(tabId) {
    const contentDivs = document.querySelectorAll('#admin-tab-reports .sub-tab-content');
    contentDivs.forEach(div => div.classList.add('hidden'));
    
    const navButtons = document.querySelectorAll('#admin-tab-reports .btn-sub-tab');
    navButtons.forEach(btn => btn.classList.remove('active'));

    const activeContent = document.getElementById('subtab-content-admin-report-' + tabId);
    if (activeContent) activeContent.classList.remove('hidden');

    const activeBtn = document.querySelector('#admin-tab-reports .btn-sub-tab[data-subtab=\"admin-report-' + tabId + '\"]');
    if (activeBtn) activeBtn.classList.add('active');
    if (window.generateAdminReport) window.generateAdminReport(tabId);
};

// Manager Reports Tab Switcher
window.renderManagerReportsTab = function(tabId) {
    const contentDivs = document.querySelectorAll('#manager-tab-reports .sub-tab-content');
    contentDivs.forEach(div => div.classList.add('hidden'));
    
    const navButtons = document.querySelectorAll('#manager-tab-reports .btn-sub-tab');
    navButtons.forEach(btn => btn.classList.remove('active'));

    const activeContent = document.getElementById('subtab-content-manager-report-' + tabId);
    if (activeContent) activeContent.classList.remove('hidden');

    const activeBtn = document.querySelector('#manager-tab-reports .btn-sub-tab[data-subtab=\"manager-report-' + tabId + '\"]');
    if (activeBtn) activeBtn.classList.add('active');
    if (window.generateManagerReport) window.generateManagerReport(tabId);
};

// Loan Report Inner Tab Switcher (Active vs Cleared vs All)
window.switchLoanInnerTab = function(role, status) {
    const tabs = ['Active', 'Cleared', 'All'];
    tabs.forEach(t => {
        const btn = document.getElementById(`${role}-loan-tab-${t}`);
        if (btn) {
            if (t === status) {
                btn.className = 'btn btn-primary btn-sm loan-inner-tab active';
            } else {
                btn.className = 'btn btn-outline btn-sm loan-inner-tab';
            }
        }
    });

    const prefixMap = { 'admin': 'admin-rep-loan-status', 'mgr': 'mgr-rep-loan-status', 'emp': 'emp-rep-loan-status' };
    const statusSelect = document.getElementById(prefixMap[role]);
    if (statusSelect) statusSelect.value = status;

    if (role === 'admin' && window.generateAdminReport) window.generateAdminReport('loans');
    else if (role === 'mgr' && window.generateManagerReport) window.generateManagerReport('loans');
    else if (role === 'emp' && window.generateEmployeeReport) window.generateEmployeeReport('loans');
};

// Attendance Inner Tab Switcher
window.switchAttTab = function(role, view) {
    const tabs = ['log', 'register'];
    tabs.forEach(t => {
        const btn = document.getElementById(`btn-${role}-att-${t}`);
        if (btn) {
            if (t === view) {
                btn.className = 'btn btn-primary btn-sm loan-inner-tab active';
            } else {
                btn.className = 'btn btn-outline btn-sm loan-inner-tab';
            }
        }
        
        const content = document.getElementById(`${role}-att-content-${t}`);
        if (content) {
            if (t === view) {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        }
    });
};

// Unified Print Function
window.printReport = function(reportId) {
    const printAreas = document.querySelectorAll('.printable-area');
    printAreas.forEach(area => {
        if (area.id !== 'print-area-' + reportId) {
            area.classList.add('no-print-temp');
            area.style.display = 'none';
        } else {
            area.querySelector('.print-header').classList.remove('hidden');
        }
    });

    document.body.classList.add('printing-report');
    window.print();
    
    document.body.classList.remove('printing-report');
    printAreas.forEach(area => {
        area.classList.remove('no-print-temp');
        area.style.display = '';
        if (area.id === 'print-area-' + reportId) {
            area.querySelector('.print-header').classList.add('hidden');
        }
    });
};

window.initAdminReportsTab = function() {
    const db = getDb();
    const activeUser = window.currentUser || JSON.parse(localStorage.getItem('current_user'));
    
    // Fill Employee Selects (for Admin)
    const empSelectsAdmin = ['admin-rep-att-emp', 'admin-rep-att-reg-emp', 'admin-rep-leave-emp', 'admin-rep-pay-emp', 'admin-rep-prod-emp', 'admin-rep-loan-emp'];
    const employees = db.users; // Show all users including managers and admins
    empSelectsAdmin.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.innerHTML = '<option value=\"All\">All Employees</option>';
            employees.forEach(e => el.innerHTML += '<option value=\"' + e.id + '\">' + e.name + '</option>');
        }
    });

    const elMgr = document.getElementById('admin-rep-emp-manager');
    if(elMgr) {
        elMgr.innerHTML = '<option value=\"All\">All Managers</option>';
        db.users.filter(u => u.role === 'Manager').forEach(m => {
            elMgr.innerHTML += '<option value=\"' + m.id + '\">' + m.name + '</option>';
        });
    }

    // Default dates
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    
    ['admin-rep-att-start', 'admin-rep-leave-start', 'admin-rep-prod-start'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = startStr;
    });
    ['admin-rep-att-end', 'admin-rep-leave-end', 'admin-rep-prod-end'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = endStr;
    });

    const currentMonthStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`;
    const adminRegMonthEl = document.getElementById('admin-rep-att-reg-month');
    if (adminRegMonthEl) adminRegMonthEl.value = currentMonthStr;

    const assetCategories = [...new Set(db.assets.map(a => a.category))];
    const catSelect = document.getElementById('admin-rep-assets-cat');
    if(catSelect) {
        catSelect.innerHTML = '<option value=\"All\">All Categories</option>';
        assetCategories.forEach(c => {
            catSelect.innerHTML += '<option value=\"' + c + '\">' + c + '</option>';
        });
    }

    const activeEmps = db.users.filter(u => u.status === 'Active');
    const assetEmpSelect = document.getElementById('admin-rep-assets-emp');
    if(assetEmpSelect) {
        assetEmpSelect.innerHTML = '<option value=\"All\">Any Employee / None</option>';
        activeEmps.forEach(e => {
            assetEmpSelect.innerHTML += '<option value=\"' + e.id + '\">' + e.name + '</option>';
        });
    }
}

window.initManagerReportsTab = function() {
    const db = getDb();
    const activeUser = window.currentUser || JSON.parse(localStorage.getItem('current_user'));

    // Default dates
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    
    // Fill Manager Team Selects
    if (activeUser && activeUser.role === 'Manager') {
        const teamMembers = db.users.filter(u => u.managerId === activeUser.id || u.managerId === activeUser.name || u.managerId === activeUser.email);
        const team = [activeUser, ...teamMembers];
        const mgrSelects = ['mgr-rep-att-emp', 'mgr-rep-att-reg-emp', 'mgr-rep-leave-emp', 'mgr-rep-prod-emp', 'mgr-rep-loan-emp'];
        mgrSelects.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.innerHTML = '<option value=\"All\">All Team Members</option>';
                team.forEach(e => el.innerHTML += '<option value=\"' + e.id + '\">' + e.name + '</option>');
            }
        });
        
        ['mgr-rep-att-start', 'mgr-rep-leave-start', 'mgr-rep-prod-start'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = startStr;
        });
        ['mgr-rep-att-end', 'mgr-rep-leave-end', 'mgr-rep-prod-end'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = endStr;
        });

        const currentMonthStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`;
        const mgrRegMonthEl = document.getElementById('mgr-rep-att-reg-month');
        if (mgrRegMonthEl) mgrRegMonthEl.value = currentMonthStr;
    }
}

window.generateAdminReport = function(type) {
    const db = getDb();
    if (type === 'employees') generateAdminEmployeesReport(db);
    else if (type === 'attendance') generateAdminAttendanceReport(db);
    else if (type === 'attendance-register') generateAttendanceRegister('admin');
    else if (type === 'leave') generateAdminLeaveReport(db);
    else if (type === 'payroll') generateAdminPayrollReport(db);
    else if (type === 'productivity') generateAdminProductivityReport(db);
    else if (type === 'assets') generateAdminAssetsReport(db);
    else if (type === 'loans') generateAdminLoansReport(db);
};

window.generateManagerReport = function(type) {
    const db = getDb();
    const activeUser = window.currentUser || JSON.parse(localStorage.getItem('current_user'));
    if (!activeUser || activeUser.role !== 'Manager') return;
    
    const teamMembers = db.users.filter(u => u.managerId === activeUser.id || u.managerId === activeUser.name || u.managerId === activeUser.email);
    const teamIds = [activeUser.id, ...teamMembers.map(u => u.id)];
    
    if (type === 'employees') generateMgrEmployeesReport(db, teamIds);
    else if (type === 'attendance') generateMgrAttendanceReport(db, teamIds);
    else if (type === 'attendance-register') generateAttendanceRegister('manager');
    else if (type === 'leave') generateMgrLeaveReport(db, teamIds);
    else if (type === 'productivity') generateMgrProductivityReport(db, teamIds);
    else if (type === 'loans') generateMgrLoansReport(db, teamIds);
};

function generateAdminEmployeesReport(db) {
    const status = document.getElementById('admin-rep-emp-status').value;
    const role = document.getElementById('admin-rep-emp-role').value;
    const managerId = document.getElementById('admin-rep-emp-manager').value;

    let filtered = db.users.filter(u => {
        if(status !== 'All' && u.status !== status) return false;
        if(role !== 'All' && u.role !== role) return false;
        if(managerId !== 'All' && u.managerId !== managerId) return false;
        return true;
    });

    const tbody = document.getElementById('admin-rep-body-employees');
    tbody.innerHTML = '';
    
    if(filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan=\"6\" class=\"text-center text-muted\">No employees found</td></tr>';
    } else {
        filtered.forEach(u => {
            const mgrName = u.managerId ? (db.users.find(m => m.id === u.managerId)?.name || 'Unknown') : '-';
            const stat = u.status || 'Active';
            tbody.innerHTML += '<tr><td>'+u.id+'</td><td><strong>'+u.name+'</strong></td><td>'+u.role+'</td><td>'+mgrName+'</td><td>'+u.email+'</td><td><span class=\"status-badge status-'+stat.toLowerCase()+'\">'+stat+'</span></td></tr>';
        });
    }
    document.getElementById('print-subtitle-admin-employees').innerText = 'Total Employees: ' + filtered.length + ' | Status: ' + status + ' | Role: ' + role;
}

function generateAdminAttendanceReport(db) {
    const start = document.getElementById('admin-rep-att-start').value;
    const end = document.getElementById('admin-rep-att-end').value;
    const emp = document.getElementById('admin-rep-att-emp').value;
    const status = document.getElementById('admin-rep-att-status').value;

    let logs = [];
    if(db.attendance) {
        db.attendance.forEach(log => {
            if(emp !== 'All' && String(log.employeeId) !== String(emp)) return;
            if(start && log.date < start) return;
            if(end && log.date > end) return;
            if(status !== 'All' && log.status !== status) return;
            logs.push(log);
        });
    }
    
    logs.sort((a,b) => new Date(b.date) - new Date(a.date));

    const tbody = document.getElementById('admin-rep-body-attendance');
    tbody.innerHTML = '';
    
    if(logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan=\"6\" class=\"text-center text-muted\">No attendance records found</td></tr>';
    } else {
        logs.forEach(log => {
            const u = db.users.find(u => u.id === log.employeeId);
            const uname = u ? u.name : 'Unknown';
            tbody.innerHTML += '<tr><td>'+log.date+'</td><td>'+log.employeeId+'</td><td><strong>'+uname+'</strong></td><td>'+(log.timeIn || '-')+'</td><td>'+(log.timeOut || '-')+'</td><td><span class=\"status-badge status-'+(log.status?log.status.toLowerCase().replace(' ','-'):'present')+'\">'+log.status+'</span></td></tr>';
        });
    }
    document.getElementById('print-subtitle-admin-attendance').innerText = 'Date Range: ' + start + ' to ' + end + ' | Filter: ' + (emp==='All'?'All Employees':emp);
}

function generateAdminLeaveReport(db) {
    const start = document.getElementById('admin-rep-leave-start').value;
    const end = document.getElementById('admin-rep-leave-end').value;
    const emp = document.getElementById('admin-rep-leave-emp').value;
    const type = document.getElementById('admin-rep-leave-type').value;
    const status = document.getElementById('admin-rep-leave-status').value;

    let logs = [];
    if(db.leaves) {
        logs = db.leaves.filter(l => {
            if(emp !== 'All' && l.employeeId !== emp) return false;
            if(type !== 'All' && l.type !== type) return false;
            if(status !== 'All' && l.status !== status) return false;
            if(start && new Date(l.startDate) < new Date(start)) return false;
            if(end && new Date(l.endDate) > new Date(end)) return false;
            return true;
        });
    }

    const tbody = document.getElementById('admin-rep-body-leave');
    tbody.innerHTML = '';
    
    if(logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan=\"6\" class=\"text-center text-muted\">No leave records found</td></tr>';
    } else {
        logs.forEach(l => {
            const u = db.users.find(u => u.id === l.employeeId);
            const uname = u ? u.name : (l.employeeName || 'Unknown');
            const appliedOn = l.submittedAt ? l.submittedAt.split('T')[0] : l.startDate;
            const duration = Math.ceil((new Date(l.endDate) - new Date(l.startDate)) / (1000 * 60 * 60 * 24)) + 1;
            tbody.innerHTML += '<tr><td>'+appliedOn+'</td><td><strong>'+uname+'</strong></td><td>'+l.type+'</td><td>'+duration+' Days</td><td>'+l.startDate+' to '+l.endDate+'</td><td><span class=\"status-badge status-'+l.status.toLowerCase()+'\">'+l.status+'</span></td></tr>';
        });
    }
    document.getElementById('print-subtitle-admin-leave').innerText = 'Date Range: ' + start + ' to ' + end + ' | Total Requests: ' + logs.length;
}

function generateAdminPayrollReport(db) {
    const m = document.getElementById('admin-rep-pay-month').value;
    const y = document.getElementById('admin-rep-pay-year').value;
    const emp = document.getElementById('admin-rep-pay-emp').value;

    let logs = [];
    if(db.payrollHistory) {
        logs = db.payrollHistory.filter(s => {
            if(emp !== 'All' && s.userId !== emp) return false;
            
            const slipMonth = s.startDate ? s.startDate.substring(5, 7) : '';
            const slipYear = s.startDate ? s.startDate.substring(0, 4) : '';
            
            if(m !== 'All' && slipMonth !== m) return false;
            if(y !== 'All' && slipYear !== y) return false;
            return true;
        });
    }

    const tbody = document.getElementById('admin-rep-body-payroll');
    tbody.innerHTML = '';
    
    if(logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan=\"7\" class=\"text-center text-muted\">No payroll records found</td></tr>';
    } else {
        logs.forEach(s => {
            const u = db.users.find(u => u.id === s.userId);
            const uname = u ? u.name : 'Unknown';
            
            const basic = parseInt(u?.salary) || 0;
            const globalSlab = db.globalSalarySettings || { allowances: [], deductions: [] };
            let profile = db.salaryProfiles?.find(p => p.userId === s.userId);
            let allowances = profile && profile.isCustomSlab ? (profile.allowances || []) : (globalSlab.allowances || []);
            let deductions = profile && profile.isCustomSlab ? (profile.deductions || []) : (globalSlab.deductions || []);
            
            if (!Array.isArray(allowances)) allowances = [];
            if (!Array.isArray(deductions)) deductions = [];
            
            let fixedAll = 0;
            allowances.forEach(a => { fixedAll += (a.type === 'percentage') ? (basic * (parseFloat(a.value)||0)) / 100 : (parseFloat(a.value)||0); });
            
            let fixedDed = 0;
            deductions.forEach(d => { fixedDed += (d.type === 'percentage') ? (basic * (parseFloat(d.value)||0)) / 100 : (parseFloat(d.value)||0); });

            const totalDed = fixedDed + (parseFloat(s.absencyDeduction) || 0) + (parseFloat(s.loanDeduction) || 0) + (parseFloat(s.otherDeduction) || 0);
            const totalAdd = fixedAll + (parseFloat(s.bonus) || 0);
            const netPay = basic + totalAdd - totalDed;
            
            const slipMonth = s.startDate ? s.startDate.substring(5, 7) : '-';
            const slipYear = s.startDate ? s.startDate.substring(0, 4) : '-';
            
            tbody.innerHTML += '<tr><td>'+slipMonth+'/'+slipYear+'</td><td><strong>'+uname+'</strong></td><td>Rs '+Math.round(basic).toLocaleString()+'</td><td>Rs '+Math.round(totalAdd).toLocaleString()+'</td><td>Rs '+Math.round(totalDed).toLocaleString()+'</td><td><strong>Rs '+Math.round(netPay).toLocaleString()+'</strong></td><td><span class=\"status-badge status-approved\">Paid</span></td></tr>';
        });
    }
    document.getElementById('print-subtitle-admin-payroll').innerText = 'Period: ' + m + '/' + y + ' | Total Slips: ' + logs.length;
}

function generateAdminProductivityReport(db) {
    const start = document.getElementById('admin-rep-prod-start').value;
    const end = document.getElementById('admin-rep-prod-end').value;
    const emp = document.getElementById('admin-rep-prod-emp').value;
    const status = document.getElementById('admin-rep-prod-status').value;

    let logs = [];
    if(db.productivity) {
        logs = db.productivity.filter(l => {
            const uid = l.employee_id || l.employeeId;
            if(emp !== 'All' && uid !== emp) return false;
            if(status !== 'All' && l.status !== status) return false;
            if(start && l.date < start) return false;
            if(end && l.date > end) return false;
            return true;
        });
    }

    const tbody = document.getElementById('admin-rep-body-productivity');
    tbody.innerHTML = '';
    
    if(logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan=\"6\" class=\"text-center text-muted\">No productivity records found</td></tr>';
    } else {
        logs.forEach(l => {
            const uid = l.employee_id || l.employeeId;
            const u = db.users.find(u => u.id === uid);
            const uname = u ? u.name : 'Unknown';
            tbody.innerHTML += '<tr><td>'+l.date+'</td><td><strong>'+uname+'</strong></td><td>'+(l.taskCount||0)+'</td><td>'+(l.durationHours||0)+'</td><td><strong>'+(l.score||0)+'/10</strong></td><td><span class=\"status-badge status-'+(l.status||'pending').toLowerCase()+'\">'+(l.status||'Pending')+'</span></td></tr>';
        });
    }
    document.getElementById('print-subtitle-admin-productivity').innerText = 'Date Range: ' + start + ' to ' + end + ' | Logs: ' + logs.length;
}

function generateAdminAssetsReport(db) {
    const cat = document.getElementById('admin-rep-assets-cat').value;
    const status = document.getElementById('admin-rep-assets-status').value;
    const emp = document.getElementById('admin-rep-assets-emp').value;

    let logs = [];
    if(db.assets) {
        logs = db.assets.filter(a => {
            if(cat !== 'All' && a.category !== cat) return false;
            if(status !== 'All' && a.status !== status) return false;
            if(emp !== 'All') {
                if(emp === 'None' && a.assignedTo) return false;
                if(emp !== 'None' && a.assignedTo !== emp) return false;
            }
            return true;
        });
    }

    const tbody = document.getElementById('admin-rep-body-assets');
    tbody.innerHTML = '';
    
    if(logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan=\"6\" class=\"text-center text-muted\">No asset records found</td></tr>';
    } else {
        logs.forEach(a => {
            let uname = '-';
            if (a.assignedTo) {
                const u = db.users.find(u => u.id === a.assignedTo);
                uname = u ? u.name : 'Unknown';
            }
            const issueDate = a.issueDate || '-';
            tbody.innerHTML += '<tr><td>'+a.category+'</td><td><strong>'+a.name+'</strong></td><td>'+a.serial+'</td><td><span class=\"status-badge status-'+a.status.toLowerCase()+'\">'+a.status+'</span></td><td>'+uname+'</td><td>'+issueDate+'</td></tr>';
        });
    }
    document.getElementById('print-subtitle-admin-assets').innerText = 'Category: ' + cat + ' | Status: ' + status + ' | Total: ' + logs.length;
}

function generateAdminLoansReport(db) {
    const emp = document.getElementById('admin-rep-loan-emp').value;
    const status = document.getElementById('admin-rep-loan-status').value;

    let loans = db.loans || [];
    let filtered = loans.filter(l => {
        if (emp !== 'All' && String(l.userId) !== String(emp)) return false;
        const isCleared = (parseFloat(l.remainingAmount) || 0) <= 0;
        const currentStatus = isCleared ? 'Cleared' : 'Active';
        if (status !== 'All' && currentStatus !== status) return false;
        return true;
    });

    const tbody = document.getElementById('admin-rep-body-loans');
    tbody.innerHTML = '';

    let totalIssued = 0;
    let totalEmi = 0;
    let totalRemaining = 0;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No loan records found</td></tr>';
    } else {
        filtered.forEach(l => {
            const u = db.users.find(user => user.id === l.userId);
            const uname = u ? u.name : 'Unknown Employee';
            const tot = parseFloat(l.totalAmount) || 0;
            const emi = parseFloat(l.monthlyInstallment) || 0;
            const rem = parseFloat(l.remainingAmount) || 0;
            const isCleared = rem <= 0;
            const statusBadge = isCleared ? '<span class="status-badge status-approved">Cleared</span>' : '<span class="status-badge status-pending">Active</span>';
            const issueDate = l.issuedAt ? l.issuedAt.split('T')[0] : '-';

            totalIssued += tot;
            totalEmi += emi;
            totalRemaining += rem;

            tbody.innerHTML += `<tr><td>${l.id || '-'}</td><td><strong>${uname}</strong><br><span class="text-secondary" style="font-size:11px">${l.userId}</span></td><td>${l.type || '-'}</td><td>Rs ${tot.toLocaleString()}</td><td>Rs ${emi.toLocaleString()}</td><td class="bold ${rem > 0 ? 'text-danger' : 'text-success'}">Rs ${rem.toLocaleString()}</td><td>${statusBadge}</td><td>${issueDate}</td></tr>`;
        });
    }

    const elIssued = document.getElementById('admin-rep-loans-total-issued');
    const elEmi = document.getElementById('admin-rep-loans-total-emi');
    const elRem = document.getElementById('admin-rep-loans-total-remaining');
    if (elIssued) elIssued.innerText = 'Rs ' + totalIssued.toLocaleString();
    if (elEmi) elEmi.innerText = 'Rs ' + totalEmi.toLocaleString();
    if (elRem) elRem.innerText = 'Rs ' + totalRemaining.toLocaleString();

    document.getElementById('print-subtitle-admin-loans').innerText = 'Employee Filter: ' + (emp === 'All' ? 'All Employees' : emp) + ' | Status: ' + status + ' | Total Records: ' + filtered.length;
}

// Manager functions
function generateMgrEmployeesReport(db, teamIds) {
    const status = document.getElementById('mgr-rep-emp-status').value;
    let filtered = db.users.filter(u => teamIds.includes(u.id));
    if(status !== 'All') filtered = filtered.filter(u => u.status === status);

    const tbody = document.getElementById('mgr-rep-body-employees');
    tbody.innerHTML = '';
    if(filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan=\"5\" class=\"text-center text-muted\">No team members found</td></tr>';
    } else {
        filtered.forEach(u => {
            const stat = u.status || 'Active';
            tbody.innerHTML += '<tr><td>'+u.id+'</td><td><strong>'+u.name+'</strong></td><td>'+u.email+'</td><td>'+(u.phone||'-')+'</td><td><span class=\"status-badge status-'+stat.toLowerCase()+'\">'+stat+'</span></td></tr>';
        });
    }
    document.getElementById('print-subtitle-manager-employees').innerText = 'Total Team Members: ' + filtered.length;
}

function generateMgrAttendanceReport(db, teamIds) {
    const start = document.getElementById('mgr-rep-att-start').value;
    const end = document.getElementById('mgr-rep-att-end').value;
    const emp = document.getElementById('mgr-rep-att-emp').value;
    const status = document.getElementById('mgr-rep-att-status').value;

    let logs = [];
    if(db.attendance) {
        logs = db.attendance.filter(log => {
            if(!teamIds.includes(log.employeeId)) return false;
            if(emp !== 'All' && log.employeeId !== emp) return false;
            if(start && log.date < start) return false;
            if(end && log.date > end) return false;
            if(status !== 'All' && log.status !== status) return false;
            return true;
        });
    }
    
    logs.sort((a,b) => new Date(b.date) - new Date(a.date));
    const tbody = document.getElementById('mgr-rep-body-attendance');
    tbody.innerHTML = '';
    if(logs.length === 0) tbody.innerHTML = '<tr><td colspan=\"5\" class=\"text-center text-muted\">No records found</td></tr>';
    else {
        logs.forEach(log => {
            const u = db.users.find(u => u.id === log.employeeId);
            tbody.innerHTML += '<tr><td>'+log.date+'</td><td><strong>'+(u?u.name:'Unknown')+'</strong></td><td>'+(log.timeIn||'-')+'</td><td>'+(log.timeOut||'-')+'</td><td><span class=\"status-badge status-'+(log.status?log.status.toLowerCase().replace(' ','-'):'present')+'\">'+log.status+'</span></td></tr>';
        });
    }
    document.getElementById('print-subtitle-manager-attendance').innerText = 'Date Range: ' + start + ' to ' + end;
}

function generateMgrLeaveReport(db, teamIds) {
    const start = document.getElementById('mgr-rep-leave-start').value;
    const end = document.getElementById('mgr-rep-leave-end').value;
    const emp = document.getElementById('mgr-rep-leave-emp').value;
    const type = document.getElementById('mgr-rep-leave-type').value;
    const status = document.getElementById('mgr-rep-leave-status').value;

    let logs = [];
    if(db.leaves) {
        logs = db.leaves.filter(l => {
            if(!teamIds.includes(l.employeeId)) return false;
            if(emp !== 'All' && l.employeeId !== emp) return false;
            if(type !== 'All' && l.type !== type) return false;
            if(status !== 'All' && l.status !== status) return false;
            if(start && new Date(l.startDate) < new Date(start)) return false;
            if(end && new Date(l.endDate) > new Date(end)) return false;
            return true;
        });
    }

    const tbody = document.getElementById('mgr-rep-body-leave');
    tbody.innerHTML = '';
    if(logs.length === 0) tbody.innerHTML = '<tr><td colspan=\"6\" class=\"text-center text-muted\">No records found</td></tr>';
    else {
        logs.forEach(l => {
            const u = db.users.find(u => u.id === l.employeeId);
            const uname = u ? u.name : (l.employeeName || 'Unknown');
            const appliedOn = l.submittedAt ? l.submittedAt.split('T')[0] : l.startDate;
            const duration = Math.ceil((new Date(l.endDate) - new Date(l.startDate)) / (1000 * 60 * 60 * 24)) + 1;
            tbody.innerHTML += '<tr><td>'+appliedOn+'</td><td><strong>'+uname+'</strong></td><td>'+l.type+'</td><td>'+duration+' Days</td><td>'+l.startDate+' to '+l.endDate+'</td><td><span class=\"status-badge status-'+l.status.toLowerCase()+'\">'+l.status+'</span></td></tr>';
        });
    }
    document.getElementById('print-subtitle-manager-leave').innerText = 'Date Range: ' + start + ' to ' + end;
}

function generateMgrProductivityReport(db, teamIds) {
    const start = document.getElementById('mgr-rep-prod-start').value;
    const end = document.getElementById('mgr-rep-prod-end').value;
    const emp = document.getElementById('mgr-rep-prod-emp').value;
    const status = document.getElementById('mgr-rep-prod-status').value;

    let logs = [];
    if(db.productivity) {
        logs = db.productivity.filter(l => {
            const uid = l.employee_id || l.employeeId;
            if(!teamIds.includes(uid)) return false;
            if(emp !== 'All' && uid !== emp) return false;
            if(status !== 'All' && l.status !== status) return false;
            if(start && l.date < start) return false;
            if(end && l.date > end) return false;
            return true;
        });
    }

    const tbody = document.getElementById('mgr-rep-body-productivity');
    tbody.innerHTML = '';
    if(logs.length === 0) tbody.innerHTML = '<tr><td colspan=\"6\" class=\"text-center text-muted\">No records found</td></tr>';
    else {
        logs.forEach(l => {
            const uid = l.employee_id || l.employeeId;
            const u = db.users.find(u => u.id === uid);
            tbody.innerHTML += '<tr><td>'+l.date+'</td><td><strong>'+(u?u.name:'Unknown')+'</strong></td><td>'+(l.taskCount||0)+'</td><td>'+(l.durationHours||0)+'</td><td><strong>'+(l.score||0)+'/10</strong></td><td><span class=\"status-badge status-'+(l.status||'pending').toLowerCase()+'\">'+(l.status||'Pending')+'</span></td></tr>';
        });
    }
    document.getElementById('print-subtitle-manager-productivity').innerText = 'Date Range: ' + start + ' to ' + end;
}

function generateMgrLoansReport(db, teamIds) {
    const emp = document.getElementById('mgr-rep-loan-emp').value;
    const status = document.getElementById('mgr-rep-loan-status').value;

    let loans = db.loans || [];
    let filtered = loans.filter(l => {
        if (!teamIds.includes(l.userId)) return false;
        if (emp !== 'All' && String(l.userId) !== String(emp)) return false;
        const isCleared = (parseFloat(l.remainingAmount) || 0) <= 0;
        const currentStatus = isCleared ? 'Cleared' : 'Active';
        if (status !== 'All' && currentStatus !== status) return false;
        return true;
    });

    const tbody = document.getElementById('mgr-rep-body-loans');
    tbody.innerHTML = '';

    let totalIssued = 0;
    let totalEmi = 0;
    let totalRemaining = 0;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No loan records found</td></tr>';
    } else {
        filtered.forEach(l => {
            const u = db.users.find(user => user.id === l.userId);
            const uname = u ? u.name : 'Unknown Employee';
            const tot = parseFloat(l.totalAmount) || 0;
            const emi = parseFloat(l.monthlyInstallment) || 0;
            const rem = parseFloat(l.remainingAmount) || 0;
            const isCleared = rem <= 0;
            const statusBadge = isCleared ? '<span class="status-badge status-approved">Cleared</span>' : '<span class="status-badge status-pending">Active</span>';
            const issueDate = l.issuedAt ? l.issuedAt.split('T')[0] : '-';

            totalIssued += tot;
            totalEmi += emi;
            totalRemaining += rem;

            tbody.innerHTML += `<tr><td>${l.id || '-'}</td><td><strong>${uname}</strong><br><span class="text-secondary" style="font-size:11px">${l.userId}</span></td><td>${l.type || '-'}</td><td>Rs ${tot.toLocaleString()}</td><td>Rs ${emi.toLocaleString()}</td><td class="bold ${rem > 0 ? 'text-danger' : 'text-success'}">Rs ${rem.toLocaleString()}</td><td>${statusBadge}</td><td>${issueDate}</td></tr>`;
        });
    }

    const elIssued = document.getElementById('mgr-rep-loans-total-issued');
    const elEmi = document.getElementById('mgr-rep-loans-total-emi');
    const elRem = document.getElementById('mgr-rep-loans-total-remaining');
    if (elIssued) elIssued.innerText = 'Rs ' + totalIssued.toLocaleString();
    if (elEmi) elEmi.innerText = 'Rs ' + totalEmi.toLocaleString();
    if (elRem) elRem.innerText = 'Rs ' + totalRemaining.toLocaleString();

    document.getElementById('print-subtitle-manager-loans').innerText = 'Team Filter: ' + (emp === 'All' ? 'All Team Members' : emp) + ' | Status: ' + status + ' | Records: ' + filtered.length;
}

// Employee functions
window.initEmployeeReportsTab = function() {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    ['emp-rep-att-start', 'emp-rep-leave-start', 'emp-rep-prod-start'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = startStr;
    });
    ['emp-rep-att-end', 'emp-rep-leave-end', 'emp-rep-prod-end'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = endStr;
    });

    const currentMonthStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`;
    const empRegMonthEl = document.getElementById('emp-rep-att-reg-month');
    if (empRegMonthEl) empRegMonthEl.value = currentMonthStr;

    // Default load attendance
    window.renderEmployeeReportsTab('attendance');
};

window.renderEmployeeReportsTab = function(type) {
    document.querySelectorAll('#employee-tab-reports .btn-sub-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#employee-tab-reports .sub-tab-content').forEach(c => c.classList.add('hidden'));

    document.querySelector(`#employee-tab-reports .btn-sub-tab[data-subtab="employee-report-${type}"]`).classList.add('active');
    document.getElementById(`subtab-content-employee-report-${type}`).classList.remove('hidden');

    window.generateEmployeeReport(type);
};

window.generateEmployeeReport = function(type) {
    const db = getDb();
    if (!currentUser) return;
    const empId = currentUser.id;

    if (type === 'attendance') generateEmpAttendanceReport(db, empId);
    else if (type === 'attendance-register') generateAttendanceRegister('employee');
    else if (type === 'leave') generateEmpLeaveReport(db, empId);
    else if (type === 'productivity') generateEmpProductivityReport(db, empId);
    else if (type === 'loans') generateEmpLoansReport(db, empId);
};

function generateEmpAttendanceReport(db, empId) {
    const start = document.getElementById('emp-rep-att-start').value;
    const end = document.getElementById('emp-rep-att-end').value;
    const status = document.getElementById('emp-rep-att-status').value;

    let logs = [];
    if(db.attendance) {
        logs = db.attendance.filter(log => {
            if(String(log.employeeId) !== String(empId)) return false;
            if(start && log.date < start) return false;
            if(end && log.date > end) return false;
            if(status !== 'All' && log.status !== status) return false;
            return true;
        });
    }
    
    logs.sort((a,b) => new Date(b.date) - new Date(a.date));
    const tbody = document.getElementById('emp-rep-body-attendance');
    tbody.innerHTML = '';
    if(logs.length === 0) tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No records found</td></tr>';
    else {
        logs.forEach(log => {
            tbody.innerHTML += '<tr><td>'+log.date+'</td><td>'+(log.timeIn||'-')+'</td><td>'+(log.timeOut||'-')+'</td><td><span class="status-badge status-'+(log.status?log.status.toLowerCase().replace(' ','-'):'present')+'">'+log.status+'</span></td></tr>';
        });
    }
    document.getElementById('print-subtitle-employee-attendance').innerText = 'Date Range: ' + start + ' to ' + end;
}

function generateEmpLeaveReport(db, empId) {
    const start = document.getElementById('emp-rep-leave-start').value;
    const end = document.getElementById('emp-rep-leave-end').value;
    const type = document.getElementById('emp-rep-leave-type').value;
    const status = document.getElementById('emp-rep-leave-status').value;

    let logs = [];
    if(db.leaves) {
        logs = db.leaves.filter(l => {
            if(l.employeeId !== empId) return false;
            if(type !== 'All' && l.type !== type) return false;
            if(status !== 'All' && l.status !== status) return false;
            if(start && new Date(l.startDate) < new Date(start)) return false;
            if(end && new Date(l.endDate) > new Date(end)) return false;
            return true;
        });
    }

    const tbody = document.getElementById('emp-rep-body-leave');
    tbody.innerHTML = '';
    if(logs.length === 0) tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No records found</td></tr>';
    else {
        logs.forEach(l => {
            const appliedOn = l.submittedAt ? l.submittedAt.split('T')[0] : l.startDate;
            const duration = Math.ceil((new Date(l.endDate) - new Date(l.startDate)) / (1000 * 60 * 60 * 24)) + 1;
            tbody.innerHTML += '<tr><td>'+appliedOn+'</td><td>'+l.type+'</td><td>'+duration+' Days</td><td>'+l.startDate+' to '+l.endDate+'</td><td><span class="status-badge status-'+l.status.toLowerCase()+'">'+l.status+'</span></td></tr>';
        });
    }
    document.getElementById('print-subtitle-employee-leave').innerText = 'Date Range: ' + start + ' to ' + end;
}

function generateEmpProductivityReport(db, empId) {
    const start = document.getElementById('emp-rep-prod-start').value;
    const end = document.getElementById('emp-rep-prod-end').value;
    const status = document.getElementById('emp-rep-prod-status').value;

    let logs = [];
    if(db.productivity) {
        logs = db.productivity.filter(l => {
            const uid = l.employee_id || l.employeeId;
            if(uid !== empId) return false;
            if(status !== 'All' && l.status !== status) return false;
            if(start && l.date < start) return false;
            if(end && l.date > end) return false;
            return true;
        });
    }

    const tbody = document.getElementById('emp-rep-body-productivity');
    tbody.innerHTML = '';
    if(logs.length === 0) tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No records found</td></tr>';
    else {
        logs.forEach(l => {
            tbody.innerHTML += '<tr><td>'+l.date+'</td><td>'+(l.taskCount||0)+'</td><td>'+(l.durationHours||0)+'</td><td><strong>'+(l.score||0)+'/10</strong></td><td><span class="status-badge status-'+(l.status||'pending').toLowerCase()+'">'+(l.status||'Pending')+'</span></td></tr>';
        });
    }
    document.getElementById('print-subtitle-employee-productivity').innerText = 'Date Range: ' + start + ' to ' + end;
}

function generateEmpLoansReport(db, empId) {
    const status = document.getElementById('emp-rep-loan-status').value;

    let loans = db.loans || [];
    let filtered = loans.filter(l => {
        if (l.userId !== empId) return false;
        const isCleared = (parseFloat(l.remainingAmount) || 0) <= 0;
        const currentStatus = isCleared ? 'Cleared' : 'Active';
        if (status !== 'All' && currentStatus !== status) return false;
        return true;
    });

    const tbody = document.getElementById('emp-rep-body-loans');
    tbody.innerHTML = '';

    let totalIssued = 0;
    let totalEmi = 0;
    let totalRemaining = 0;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No loan records found</td></tr>';
    } else {
        filtered.forEach(l => {
            const tot = parseFloat(l.totalAmount) || 0;
            const emi = parseFloat(l.monthlyInstallment) || 0;
            const rem = parseFloat(l.remainingAmount) || 0;
            const isCleared = rem <= 0;
            const statusBadge = isCleared ? '<span class="status-badge status-approved">Cleared</span>' : '<span class="status-badge status-pending">Active</span>';
            const issueDate = l.issuedAt ? l.issuedAt.split('T')[0] : '-';

            totalIssued += tot;
            totalEmi += emi;
            totalRemaining += rem;

            tbody.innerHTML += `<tr><td>${l.id || '-'}</td><td>${l.type || '-'}</td><td>Rs ${tot.toLocaleString()}</td><td>Rs ${emi.toLocaleString()}</td><td class="bold ${rem > 0 ? 'text-danger' : 'text-success'}">Rs ${rem.toLocaleString()}</td><td>${statusBadge}</td><td>${issueDate}</td></tr>`;
        });
    }

    const elIssued = document.getElementById('emp-rep-loans-total-issued');
    const elEmi = document.getElementById('emp-rep-loans-total-emi');
    const elRem = document.getElementById('emp-rep-loans-total-remaining');
    if (elIssued) elIssued.innerText = 'Rs ' + totalIssued.toLocaleString();
    if (elEmi) elEmi.innerText = 'Rs ' + totalEmi.toLocaleString();
    if (elRem) elRem.innerText = 'Rs ' + totalRemaining.toLocaleString();

    document.getElementById('print-subtitle-employee-loans').innerText = 'Status: ' + status + ' | Records: ' + filtered.length;
}

window.generateAttendanceRegister = function(role) {
    const db = window.getDb ? window.getDb() : {};
    let monthInput;
    let tbodyId;
    let theadId;
    let subtitleId;
    let usersToProcess = [];

    const activeUser = window.currentUser || JSON.parse(localStorage.getItem('current_user'));

    if (role === 'admin') {
        monthInput = document.getElementById('admin-rep-att-reg-month').value;
        tbodyId = 'admin-rep-body-attendance-register';
        theadId = 'admin-rep-head-attendance-register';
        subtitleId = 'print-subtitle-admin-attendance-register';
        usersToProcess = db.users.filter(u => u.status === 'Active');
        
        const empFilter = document.getElementById('admin-rep-att-reg-emp').value;
        if (empFilter !== 'All') {
            usersToProcess = usersToProcess.filter(u => String(u.id) === String(empFilter));
        }
    } else if (role === 'manager') {
        monthInput = document.getElementById('mgr-rep-att-reg-month').value;
        tbodyId = 'mgr-rep-body-attendance-register';
        theadId = 'mgr-rep-head-attendance-register';
        subtitleId = 'print-subtitle-manager-attendance-register';
        const teamMembers = db.users.filter(u => u.managerId === activeUser.id || u.managerId === activeUser.name || u.managerId === activeUser.email);
        usersToProcess = [activeUser, ...teamMembers].filter(u => u.status === 'Active');
        
        const empFilter = document.getElementById('mgr-rep-att-reg-emp').value;
        if (empFilter !== 'All') {
            usersToProcess = usersToProcess.filter(u => String(u.id) === String(empFilter));
        }
    } else if (role === 'employee') {
        monthInput = document.getElementById('emp-rep-att-reg-month').value;
        tbodyId = 'emp-rep-body-attendance-register';
        theadId = 'emp-rep-head-attendance-register';
        subtitleId = 'print-subtitle-employee-attendance-register';
        usersToProcess = [activeUser];
    }

    if (!monthInput) {
        if (window.showToast) window.showToast('Notice', 'Please select a month first.', 'info');
        return;
    }

    const [yearStr, monthStr] = monthInput.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1; // 0-indexed month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const todayObj = new Date();
    // Adjust for local timezone if needed, or simply use local date parts
    const todayYear = todayObj.getFullYear();
    const todayMonth = todayObj.getMonth();
    const todayDate = todayObj.getDate();

    // Rebuild Table Header
    const thead = document.getElementById(theadId);
    let headHTML = '<tr><th style="min-width: 150px;">Employee</th>';
    for (let d = 1; d <= daysInMonth; d++) {
        headHTML += `<th style="text-align:center; min-width:25px; padding: 4px;">${d}</th>`;
    }
    headHTML += '<th style="font-size: 10px; padding: 4px; width: 45px; text-align:center;">Total Present</th><th style="font-size: 10px; padding: 4px; width: 45px; text-align:center;">Total Absent</th><th style="font-size: 10px; padding: 4px; width: 45px; text-align:center;">Total Leave</th><th style="font-size: 10px; padding: 4px; width: 45px; text-align:center;">Total Rest</th><th style="font-size: 10px; padding: 4px; width: 45px; text-align:center;">Total Holiday</th><th style="font-size: 10px; padding: 4px; width: 45px; text-align:center;">Paid Days</th></tr>';
    thead.innerHTML = headHTML;

    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '';

    if (usersToProcess.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${daysInMonth + 7}" class="text-center text-muted">No employees found.</td></tr>`;
        return;
    }

    const sysSettings = db.systemSettings || {};
    const paidRestDays = sysSettings.paidRestDays !== false && sysSettings.paidRestDays !== 'false';

    usersToProcess.forEach(user => {
        // Fast lookup maps for user specific data in the selected month
        const myAtts = {};
        if (db.attendance) {
            db.attendance.forEach(att => {
                if (String(att.userId || att.employeeId) === String(user.id)) {
                    myAtts[att.date] = att.status;
                }
            });
        }

        const myLeaves = [];
        if (db.leaves) {
            db.leaves.forEach(l => {
                if (String(l.employeeId) === String(user.id) && l.status === 'Approved') {
                    // Pre-generate all dates within the leave period for easy lookup
                    let curr = new Date(l.startDate);
                    const end = new Date(l.endDate);
                    while (curr <= end) {
                        myLeaves.push(curr.toISOString().split('T')[0]);
                        curr.setDate(curr.getDate() + 1);
                    }
                }
            });
        }

        let rowHTML = `<tr><td style="white-space: nowrap;"><strong>${user.name}</strong> <small class="text-secondary">(${user.designation || 'Emp'})</small></td>`;
        
        let tPresent = 0, tAbsent = 0, tLeave = 0, tRest = 0, tHoliday = 0, tHalfDay = 0;

        for (let d = 1; d <= daysInMonth; d++) {
            const dateCursor = new Date(year, month, d);
            const dateStr = dateCursor.toISOString().split('T')[0];
            
            // Priority 1: Leave
            const onLeave = myLeaves.includes(dateStr);
            // Priority 2: Holiday
            const isHoliday = window.isPublicHoliday && window.isPublicHoliday(dateStr);
            // Priority 3: Rest Day
            const isRest = window.isEmployeeOnRest && window.isEmployeeOnRest(user, dateStr);
            // Priority 4: Attendance Log
            const attStatus = myAtts[dateStr];

            let cellClass = '';
            let cellText = '';
            
            // Future dates are skipped
            if (year > todayYear || (year === todayYear && month > todayMonth) || (year === todayYear && month === todayMonth && d > todayDate)) {
                // Do not mark absent or anything for future dates
                cellClass = ''; cellText = '';
            } else {
                if (onLeave) {
                    cellClass = 'bg-leave'; cellText = 'L'; tLeave++;
                } else if (isHoliday) {
                    cellClass = 'bg-holiday'; cellText = 'H'; tHoliday++;
                } else if (isRest) {
                    cellClass = 'bg-rest'; cellText = 'R'; tRest++;
                } else if (attStatus === 'Absent') {
                    cellClass = 'bg-absent'; cellText = 'A'; tAbsent++;
                } else if (attStatus === 'Half Day') {
                    cellClass = 'bg-halfday'; cellText = 'HD'; tHalfDay++;
                } else if (attStatus === 'Present' || attStatus === 'Late') {
                    cellClass = 'bg-present'; cellText = 'P'; tPresent++;
                } else {
                    // No record found, not a leave, not a holiday, not a rest day.
                    // It means absent.
                    cellClass = 'bg-absent'; cellText = 'A'; tAbsent++;
                }
            }

            rowHTML += `<td class="${cellClass}" style="text-align:center; font-weight:bold; font-size:12px; padding:4px; vertical-align:middle;">${cellText}</td>`;
        }

        const totalAbsentEquivalent = tAbsent + (tHalfDay * 0.5);
        let paidDays = tPresent + tHoliday + tLeave + (tHalfDay * 0.5);
        if (paidRestDays) {
            paidDays += tRest;
        } else {
            // If rest days are not paid, they deduct from total salary similar to absent
            // The display logic can just omit them from paidDays
        }

        rowHTML += `<td style="text-align:center; font-weight:600;">${tPresent + tHalfDay}</td>`;
        rowHTML += `<td style="text-align:center; font-weight:600; color:var(--danger);">${tAbsent}</td>`;
        rowHTML += `<td style="text-align:center; font-weight:600; color:var(--warning);">${tLeave}</td>`;
        rowHTML += `<td style="text-align:center; font-weight:600; color:var(--info);">${tRest}</td>`;
        rowHTML += `<td style="text-align:center; font-weight:600; color:purple;">${tHoliday}</td>`;
        rowHTML += `<td style="text-align:center; font-weight:bold; color:var(--primary);">${paidDays}</td>`;

        rowHTML += '</tr>';
        tbody.innerHTML += rowHTML;
    });

    const monthName = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });
    document.getElementById(subtitleId).innerText = `Month: ${monthName} | Employees: ${usersToProcess.length}`;
};

