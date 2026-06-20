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

    document.body.classList.add('printing-modal');
    window.print();
    
    document.body.classList.remove('printing-modal');
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
    const empSelectsAdmin = ['admin-rep-att-emp', 'admin-rep-leave-emp', 'admin-rep-pay-emp', 'admin-rep-prod-emp'];
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
        const mgrSelects = ['mgr-rep-att-emp', 'mgr-rep-leave-emp', 'mgr-rep-prod-emp'];
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
    }
}

window.generateAdminReport = function(type) {
    const db = getDb();
    if (type === 'employees') generateAdminEmployeesReport(db);
    else if (type === 'attendance') generateAdminAttendanceReport(db);
    else if (type === 'leave') generateAdminLeaveReport(db);
    else if (type === 'payroll') generateAdminPayrollReport(db);
    else if (type === 'productivity') generateAdminProductivityReport(db);
    else if (type === 'assets') generateAdminAssetsReport(db);
};

window.generateManagerReport = function(type) {
    const db = getDb();
    const activeUser = window.currentUser || JSON.parse(localStorage.getItem('current_user'));
    if (!activeUser || activeUser.role !== 'Manager') return;
    
    const teamMembers = db.users.filter(u => u.managerId === activeUser.id || u.managerId === activeUser.name || u.managerId === activeUser.email);
    const teamIds = [activeUser.id, ...teamMembers.map(u => u.id)];
    
    if (type === 'employees') generateMgrEmployeesReport(db, teamIds);
    else if (type === 'attendance') generateMgrAttendanceReport(db, teamIds);
    else if (type === 'leave') generateMgrLeaveReport(db, teamIds);
    else if (type === 'productivity') generateMgrProductivityReport(db, teamIds);
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
            if(emp !== 'All' && log.employeeId !== emp) return;
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
            
            tbody.innerHTML += '<tr><td>'+slipMonth+'/'+slipYear+'</td><td><strong>'+uname+'</strong></td><td>'+(window.appCurrency||'$')+' '+Math.round(basic).toLocaleString()+'</td><td>'+(window.appCurrency||'$')+' '+Math.round(totalAdd).toLocaleString()+'</td><td>'+(window.appCurrency||'$')+' '+Math.round(totalDed).toLocaleString()+'</td><td><strong>'+(window.appCurrency||'$')+' '+Math.round(netPay).toLocaleString()+'</strong></td><td><span class=\"status-badge status-approved\">Paid</span></td></tr>';
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
