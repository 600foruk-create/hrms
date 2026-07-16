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
    const tabs = ['summary', 'log', 'register'];
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
    let targetArea = document.getElementById(reportId);
    if (!targetArea) targetArea = document.getElementById('print-area-' + reportId);
    if (!targetArea) targetArea = document.getElementById('print-area-' + reportId.replace('-report-', '-'));

    if (!targetArea) {
        showToast("Error", "Print area not found", "error");
        return;
    }

    const printAreas = document.querySelectorAll('.printable-area');
    printAreas.forEach(area => {
        if (area.id !== targetArea.id) {
            area.classList.add('no-print-temp');
            area.style.display = 'none';
        } else {
            const header = area.querySelector('.print-header');
            if (header) {
                header.classList.remove('hidden');
                
                // Add company branding (remove old one if exists to ensure up to date)
                const existingBranding = header.querySelector('.company-branding');
                if (existingBranding) existingBranding.remove();
                const existingTitle = header.querySelector('.dynamic-print-title');
                if (existingTitle) existingTitle.remove();

                const db = typeof getDb === 'function' ? getDb() : (window.db || {});
                const cp = (!db.companyProfile || Array.isArray(db.companyProfile)) ? {} : db.companyProfile;
                const logoHtml = cp.logoBase64 ? `<img src="${cp.logoBase64}" style="height: 60px; width: auto; object-fit: contain; margin-right: 15px; display: block !important;">` : '';
                const compName = cp.name || 'Your Company Name';
                const tagLine = cp.slogan || 'Beyond The Ocean';
                const addr = cp.address || 'Company Address';
                const phone = cp.phone || 'Phone Number';
                const email = cp.email || 'Email Address';
                const website = cp.website || 'www.company.com';
                
                // Construct Professional A4 Header
                const brandingHtml = `
                    <div class="company-branding" style="width: 100%; font-family: 'Inter', sans-serif; margin-bottom: 10px;">
                        <!-- Header Top Split -->
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <!-- Left: Logo & Title -->
                            <div style="display: flex; align-items: center; gap: 10px;">
                                ${logoHtml}
                                <div style="text-align: left;">
                                    <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #0f2e53; letter-spacing: 0.5px;">${compName.toUpperCase()}</h1>
                                    <div style="display:flex; align-items:center; gap: 8px; margin-top: 2px;">
                                        <div style="flex:1; height:1px; background:#ccc;"></div>
                                        <span style="font-size: 9px; color: #666; letter-spacing: 1px; text-transform: uppercase; white-space:nowrap;">${tagLine}</span>
                                        <div style="flex:1; height:1px; background:#ccc;"></div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Right: Contact Details -->
                            <div style="text-align: left; font-size: 9px; color: #333; line-height: 1.5; display: flex; gap: 15px;">
                                <div>
                                    <div style="display:flex; align-items: flex-start; gap: 5px;"><i class="fa-solid fa-location-dot" style="color: #0ea5e9; margin-top:2px; width: 12px; text-align:center;"></i> <span style="max-width: 150px; display:inline-block;">${addr}</span></div>
                                </div>
                                <div>
                                    <div style="display:flex; align-items: center; gap: 5px;"><i class="fa-solid fa-phone" style="color: #0ea5e9; width: 12px; text-align:center;"></i> <span>${phone}</span></div>
                                    <div style="display:flex; align-items: center; gap: 5px;"><i class="fa-solid fa-envelope" style="color: #0ea5e9; width: 12px; text-align:center;"></i> <span>${email}</span></div>
                                    <div style="display:flex; align-items: center; gap: 5px;"><i class="fa-solid fa-globe" style="color: #0ea5e9; width: 12px; text-align:center;"></i> <span>${website}</span></div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Divider Line -->
                        <div style="width: 100%; height: 2px; background-color: #0f2e53; margin-bottom: 10px;"></div>
                    </div>
                `;

                // Build the new specific Report Title and Subtitle Area
                const reportTitleEl = area.querySelector('h2');
                let reportTitleStr = reportTitleEl ? reportTitleEl.innerText.toUpperCase() : 'REPORT';
                if (reportTitleEl) reportTitleEl.style.display = 'none'; // hide the default h2

                const subtitleEl = area.querySelector('p[id^="print-subtitle"]');
                let subTitleStr = subtitleEl ? subtitleEl.innerText : '';
                if (subtitleEl) subtitleEl.style.display = 'none';

                let filterHtml = '';
                const today = new Date();
                const dateStr = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

                if (subTitleStr) {
                    const parts = subTitleStr.split('|').map(p => p.trim());
                    // First part is usually "Total Displayed: X", add Date first
                    filterHtml += `<div style="display:flex; align-items:center; gap:4px;"><i class="fa-solid fa-calendar-days" style="color: #0f2e53;"></i> <span>Report Date: ${dateStr}</span></div>`;
                    
                    parts.forEach(part => {
                        let icon = 'fa-circle-info';
                        if (part.toLowerCase().includes('date') || part.toLowerCase().includes('range')) icon = 'fa-calendar-days';
                        if (part.toLowerCase().includes('total')) icon = 'fa-users';
                        if (part.toLowerCase().includes('status')) icon = 'fa-list-check';
                        if (part.toLowerCase().includes('role')) icon = 'fa-user-tie';
                        if (part.toLowerCase().includes('emp')) icon = 'fa-user-tie';
                        
                        filterHtml += `<div style="width:1px; height:10px; background:#ccc;"></div>`;
                        filterHtml += `<div style="display:flex; align-items:center; gap:4px;"><i class="fa-solid ${icon}" style="color: #0f2e53;"></i> <span>${part}</span></div>`;
                    });
                } else {
                    filterHtml = `<div style="display:flex; align-items:center; gap:4px;"><i class="fa-solid fa-calendar-days" style="color: #0f2e53;"></i> <span>Report Date: ${dateStr}</span></div>`;
                }

                const titleHtml = `
                    <div class="dynamic-print-title" style="margin-bottom: 15px; width: 100%;">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 10px;">
                            <div style="height: 1px; flex: 1; max-width: 150px; background: #0ea5e9;"></div>
                            <h2 style="margin: 0; font-size: 16px; font-weight: 700; color: #0f2e53; letter-spacing: 1px;">${reportTitleStr}</h2>
                            <div style="height: 1px; flex: 1; max-width: 150px; background: #0ea5e9;"></div>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 9px; color: #444; font-weight: 500;">
                            ${filterHtml}
                        </div>
                    </div>
                `;

                header.insertAdjacentHTML('afterbegin', brandingHtml + titleHtml);
                
                // Add Footer if not present
                const printContainer = area;
                if (!printContainer.querySelector('.print-footer-report')) {
                    const today = new Date();
                    const dateStr = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                    const timeStr = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    
                    const footerHtml = `
                        <div class="print-footer-report" style="margin-top: 50px; padding-top: 15px; border-top: 2px solid #0f2e53; display: flex; justify-content: space-between; font-size: 11px; font-family: 'Inter', sans-serif; color: #333;">
                            <div style="line-height: 1.6;">
                                <p style="margin:0;"><strong>Generated By:</strong> HR System</p>
                                <p style="margin:0;"><strong>Generated On:</strong> ${dateStr} &nbsp;&nbsp;&nbsp; <strong>Time:</strong> ${timeStr}</p>
                            </div>
                            <div style="text-align: center; width: 250px;">
                                <div style="border-bottom: 1px solid #333; height: 30px; margin-bottom: 5px;"></div>
                                <span>Authorized Signature</span>
                            </div>
                        </div>
                    `;
                    printContainer.insertAdjacentHTML('beforeend', footerHtml);
                }
            }
        }
    });

    // Enforce hiding of elements that should not print
    const dPrintNones = document.querySelectorAll('.d-print-none');
    dPrintNones.forEach(el => {
        el.classList.add('no-print-temp-d-print-none');
        el.dataset.oldDisplay = el.style.display;
        el.style.setProperty('display', 'none', 'important');
    });

    document.body.classList.add('printing-report');
    window.print();
    
    document.body.classList.remove('printing-report');
    
    // Restore hidden elements
    const restoredDPrintNones = document.querySelectorAll('.no-print-temp-d-print-none');
    restoredDPrintNones.forEach(el => {
        el.style.display = el.dataset.oldDisplay || '';
        el.classList.remove('no-print-temp-d-print-none');
    });

    printAreas.forEach(area => {
        area.classList.remove('no-print-temp');
        area.style.display = '';
        if (area.id === targetArea.id) {
            const header = area.querySelector('.print-header');
            if (header) header.classList.add('hidden');
        }
    });
};

window.initAdminReportsTab = function() {
    const db = getDb();
    const activeUser = window.currentUser || JSON.parse(localStorage.getItem('current_user'));
    
    // Fill Employee Selects (for Admin)
    const empSelectsAdmin = ['admin-rep-att-sum-emp', 'admin-rep-att-emp', 'admin-rep-att-reg-emp', 'admin-rep-leave-emp', 'admin-rep-pay-emp', 'admin-rep-prod-emp', 'admin-rep-loan-emp'];
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

    // Populate Departments
    const deptSelects = ['admin-rep-att-sum-dept', 'admin-rep-emp-dept'];
    const departments = [...new Set(db.users.map(u => u.department).filter(d => d))];
    deptSelects.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.innerHTML = '<option value=\"All\">All Departments</option>';
            departments.forEach(d => {
                el.innerHTML += `<option value="${d}">${d}</option>`;
            });
        }
    });

    // Default dates
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    
    ['admin-rep-att-sum-start', 'admin-rep-att-start', 'admin-rep-leave-start', 'admin-rep-prod-start'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = startStr;
    });
    ['admin-rep-att-sum-end', 'admin-rep-att-end', 'admin-rep-leave-end', 'admin-rep-prod-end'].forEach(id => {
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
    else if (type === 'attendance-summary') generateAdminAttendanceSummaryReport(db);
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
    // Populate filter dropdowns dynamically
    const deptSelect = document.getElementById('admin-rep-emp-dept');
    if (deptSelect && deptSelect.options.length <= 1) {
        const prodSettings = typeof getProdSettings === 'function' ? getProdSettings() : (db.productivityCategories || { businessUnits: [] });
        (prodSettings.businessUnits || []).forEach(bu => {
            const opt = document.createElement('option');
            opt.value = bu.name;
            opt.innerText = bu.name;
            deptSelect.appendChild(opt);
        });
    }

    const search = (document.getElementById('admin-rep-emp-search')?.value || '').toLowerCase();
    const status = document.getElementById('admin-rep-emp-status')?.value || 'All';
    const role = document.getElementById('admin-rep-emp-role')?.value || 'All';
    const dept = document.getElementById('admin-rep-emp-dept')?.value || 'All';
    const type = document.getElementById('admin-rep-emp-type')?.value || 'All';

    // Calculate Summary Metrics based on ALL users (or just active ones)
    let total = db.users.length;
    let active = db.users.filter(u => u.status === 'Active' || !u.status).length;
    let inactive = db.users.filter(u => u.status === 'Inactive' || u.status === 'Terminated').length;
    
    // New hires this month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    let newHires = db.users.filter(u => {
        const jd = u.joiningDate || u.startDate;
        return jd && jd >= firstDay;
    }).length;

    const elTotal = document.getElementById('admin-rep-emp-total');
    if(elTotal) elTotal.innerText = total;
    const elActive = document.getElementById('admin-rep-emp-active');
    if(elActive) elActive.innerText = active;
    const elInactive = document.getElementById('admin-rep-emp-inactive');
    if(elInactive) elInactive.innerText = inactive;
    const elNew = document.getElementById('admin-rep-emp-new');
    if(elNew) elNew.innerText = newHires;

    let filtered = db.users.filter(u => {
        const uEmpType = u.employmentType || 'Permanent';

        if(status !== 'All' && u.status !== status && !(status==='Active' && !u.status)) return false;
        if(role !== 'All' && u.role !== role) return false;
        if(dept !== 'All' && u.department !== dept) return false;
        if(type !== 'All' && uEmpType !== type) return false;
        if(search) {
            const matchesId = (u.id||'').toLowerCase().includes(search);
            const matchesName = (u.name||'').toLowerCase().includes(search);
            const matchesEmail = (u.email||'').toLowerCase().includes(search);
            if(!matchesId && !matchesName && !matchesEmail) return false;
        }
        return true;
    });

    const tbody = document.getElementById('admin-rep-body-employees');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    if(filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">No employees found</td></tr>';
    } else {
        filtered.forEach(u => {
            const mgrName = u.managerId ? (db.users.find(m => m.id === u.managerId)?.name || 'Unknown') : '-';
            const stat = u.status || 'Active';
            let statClass = 'status-approved';
            if (stat === 'Inactive') statClass = 'status-pending';
            if (stat === 'Terminated') statClass = 'status-rejected';
            
            const initials = (u.name || '').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            let avatarContent = initials;
            let avatarStyle = "width:36px;height:36px;font-size:14px;margin-right:12px;border:none;";
            if (u.profilePic) {
                avatarContent = `<img src="${u.profilePic}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="Pic">`;
                avatarStyle += "padding:0;background:none;";
            }
            const avatarHtml = `<div style="display:flex;align-items:center;"><div class="team-member-avatar" style="${avatarStyle}">${avatarContent}</div><div><div style="font-size:13px;font-weight:700;">${u.name}</div><div class="text-secondary" style="font-size:11px;">${u.email}</div></div></div>`;

            const uJoinDate = u.joiningDate || u.startDate || '-';
            const uEmpType = u.employmentType || 'Permanent';
            
            tbody.innerHTML += `<tr>
                <td>${u.id}</td>
                <td>${avatarHtml}</td>
                <td>${u.department || '-'}</td>
                <td>${u.role}</td>
                <td>${mgrName}</td>
                <td>${u.phone || '-'}</td>
                <td>${uJoinDate}</td>
                <td>${uEmpType}</td>
                <td><span class="status-badge ${statClass}">${stat}</span></td>
                <td class="text-center no-print">
                    <button class="btn btn-sm btn-outline" style="padding:4px 8px; font-size:12px;" onclick="window.viewEmployeeReportDetail('${u.id}')">View</button>
                </td>
            </tr>`;
        });
    }
    const printSubtitle = document.getElementById('print-subtitle-admin-employees');
    if(printSubtitle) {
        printSubtitle.innerText = 'Total Displayed: ' + filtered.length + ' | Status: ' + status + ' | Role: ' + role;
    }
}

window.viewEmployeeReportDetail = function(empId) {
    const db = getDb();
    const user = db.users.find(u => String(u.id) === String(empId));
    if(!user) return;
    
    document.getElementById('print-emp-detail-date').innerText = 'Generated on: ' + new Date().toLocaleString();
    
    // Personal Info
    const initials = (user.name || '').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const avatarEl = document.getElementById('emp-det-avatar');
    if (user.profilePic) {
        avatarEl.innerHTML = `<img src="${user.profilePic}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="Pic">`;
        avatarEl.style.background = 'transparent';
    } else {
        avatarEl.innerHTML = initials;
        avatarEl.style.background = '';
    }
    document.getElementById('emp-det-name').innerText = user.name || '-';
    
    const stat = user.status || 'Active';
    const statEl = document.getElementById('emp-det-status');
    statEl.innerText = stat;
    statEl.className = 'status-badge ' + (stat === 'Active' ? 'status-approved' : stat === 'Inactive' ? 'status-pending' : 'status-rejected');

    document.getElementById('emp-det-id').innerText = user.id || '-';
    document.getElementById('emp-det-email').innerText = user.email || '-';
    document.getElementById('emp-det-phone').innerText = user.phone || '-';
    document.getElementById('emp-det-cnic').innerText = user.cnic || '-';
    document.getElementById('emp-det-gender').innerText = user.gender || '-';

    // Employment Info
    const mgrName = user.managerId ? (db.users.find(m => m.id === user.managerId)?.name || 'Unknown') : '-';
    document.getElementById('emp-det-role').innerText = user.role || '-';
    document.getElementById('emp-det-dept').innerText = user.department || '-';
    document.getElementById('emp-det-desig').innerText = user.designation || '-';
    document.getElementById('emp-det-manager').innerText = mgrName;
    document.getElementById('emp-det-type').innerText = user.employmentType || '-';
    document.getElementById('emp-det-join').innerText = user.joiningDate || user.startDate || '-';

    // Calculate Quick Stats
    let totalPresent = 0, totalLeaves = 0, totalOt = 0, totalAssets = 0;
    
    if(db.attendance) {
        const myLogs = db.attendance.filter(log => String(log.employeeId) === String(empId));
        totalPresent = myLogs.filter(log => log.status === 'Present' || log.status === 'Late' || log.status === 'Half-Day').length;
    }
    
    if(db.leaves) {
        totalLeaves = db.leaves.filter(l => String(l.employeeId) === String(empId) && l.status === 'Approved').reduce((acc, curr) => acc + (curr.totalDays || 1), 0);
    }
    
    if(db.overtime) {
        totalOt = db.overtime.filter(ot => String(ot.employeeId) === String(empId) && ot.status === 'Approved').reduce((acc, curr) => acc + (curr.hours || 0), 0);
    }
    
    if(db.assets_requests) {
        totalAssets = db.assets_requests.filter(req => String(req.employeeId) === String(empId) && req.status === 'Assigned').length;
    }

    // Attendance Rate (Rough approx based on total days tracked if we wanted, but we'll show raw present count if join date unknown, else percentage)
    let attRateDisplay = totalPresent + ' Days';
    if(user.joiningDate) {
        const jDate = new Date(user.joiningDate);
        const today = new Date();
        const diffTime = Math.abs(today - jDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if(diffDays > 0) {
            const workingDaysApprox = diffDays * (5/7); // roughly 5 days a week
            if(workingDaysApprox > 0) {
                const rate = Math.min(100, Math.round((totalPresent / workingDaysApprox) * 100));
                attRateDisplay = rate + '%';
            }
        }
    }
    
    document.getElementById('emp-det-stat-attendance').innerText = attRateDisplay;
    document.getElementById('emp-det-stat-leaves').innerText = totalLeaves;
    document.getElementById('emp-det-stat-ot').innerText = totalOt.toFixed(1);
    document.getElementById('emp-det-stat-assets').innerText = totalAssets;

    const modal = document.getElementById('modal-employee-report-detail');
    modal.classList.remove('hidden');
}

window.exportEmployeeReportCSV = function() {
    const db = getDb();
    let csv = 'Emp ID,Name,Department,Role,Manager,Email,Phone,Join Date,Emp Type,Status\n';
    
    // Use same filters as current view
    const search = (document.getElementById('admin-rep-emp-search')?.value || '').toLowerCase();
    const status = document.getElementById('admin-rep-emp-status')?.value || 'All';
    const role = document.getElementById('admin-rep-emp-role')?.value || 'All';
    const dept = document.getElementById('admin-rep-emp-dept')?.value || 'All';
    const type = document.getElementById('admin-rep-emp-type')?.value || 'All';
    
    let filtered = db.users.filter(u => {
        const uEmpType = u.employmentType || 'Permanent';

        if(status !== 'All' && u.status !== status && !(status==='Active' && !u.status)) return false;
        if(role !== 'All' && u.role !== role) return false;
        if(dept !== 'All' && u.department !== dept) return false;
        if(type !== 'All' && uEmpType !== type) return false;
        if(search) {
            const matchesId = (u.id||'').toLowerCase().includes(search);
            const matchesName = (u.name||'').toLowerCase().includes(search);
            const matchesEmail = (u.email||'').toLowerCase().includes(search);
            if(!matchesId && !matchesName && !matchesEmail) return false;
        }
        return true;
    });

    filtered.forEach(u => {
        const mgrName = u.managerId ? (db.users.find(m => m.id === u.managerId)?.name || 'Unknown') : 'None';
        const uStatus = u.status || 'Active';
        const uJoinDate = u.joiningDate || u.startDate || 'N/A';
        const uEmpType = u.employmentType || 'Permanent';
        csv += `${u.id},"${u.name}",${u.department||'N/A'},${u.role},${mgrName},${u.email},${u.phone||'N/A'},${uJoinDate},${uEmpType},${uStatus}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'Employee_Report_' + new Date().toISOString().split('T')[0] + '.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function resetAttSummaryFilters() {
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    document.getElementById('admin-rep-att-sum-start').value = firstDay;
    document.getElementById('admin-rep-att-sum-end').value = today;
    document.getElementById('admin-rep-att-sum-dept').value = 'All';
    document.getElementById('admin-rep-att-sum-emp').value = 'All';
    document.getElementById('admin-rep-att-sum-status').value = 'All';
    if(window.generateAdminReport) window.generateAdminReport('attendance-summary');
}

function generateAdminAttendanceSummaryReport(db) {
    const start = document.getElementById('admin-rep-att-sum-start').value;
    const end = document.getElementById('admin-rep-att-sum-end').value;
    const emp = document.getElementById('admin-rep-att-sum-emp').value;
    const dept = document.getElementById('admin-rep-att-sum-dept').value;
    const statusFilter = document.getElementById('admin-rep-att-sum-status').value;

    if (!start || !end) {
        if (window.showToast) window.showToast('Notice', 'Please select both Start Date and End Date.', 'info');
        return;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (startDate > endDate) {
        if (window.showToast) window.showToast('Error', 'Start Date must be before End Date.', 'error');
        return;
    }

    let filteredUsers = db.users;
    if (emp !== 'All') {
        filteredUsers = filteredUsers.filter(u => String(u.id) === String(emp));
    }
    if (dept !== 'All') {
        filteredUsers = filteredUsers.filter(u => String(u.department) === String(dept));
    }

    let summaryData = [];
    let globalWorkDays = 0, globalWeekends = 0, globalHolidays = 0, globalLeaves = 0, globalOvertime = 0;
    
    filteredUsers.forEach(u => {
        let presentCount = 0, absentCount = 0, lateCount = 0, halfDayCount = 0;
        let workHrs = 0, lateHrs = 0, earlyHrs = 0, overtimeHrs = 0, holidayCount = 0, restCount = 0, leaveCount = 0;

        const defaultShift = { start: '09:00', end: '17:00' };
        let userShift = defaultShift;
        if (db.shifts && u.shiftId) {
            const shift = db.shifts.find(s => String(s.id) === String(u.shiftId));
            if (shift && shift.start !== 'Manual') {
                userShift = shift;
            }
        }

        const parseTimeStr = (t) => {
            if (!t || typeof t !== 'string') return null;
            const isPM = t.toUpperCase().includes('PM');
            const isAM = t.toUpperCase().includes('AM');
            const cleanT = t.replace(/[A-Za-z\s]/g, '');
            if (!cleanT.includes(':')) return null;
            let [h, m] = cleanT.split(':').map(Number);
            if (isNaN(h) || isNaN(m)) return null;
            if (isPM && h !== 12) h += 12;
            if (isAM && h === 12) h = 0;
            return h + (m || 0)/60;
        };

        const shiftStartHr = parseTimeStr(userShift.start) || 9;
        const shiftEndHr = parseTimeStr(userShift.end) || 17;

        const myLogs = {};
        if (db.attendance) {
            db.attendance.forEach(log => {
                if (String(log.employeeId) === String(u.id)) {
                    myLogs[log.date] = log;
                }
            });
        }

        const myLeaves = {};
        if (db.leaves) {
            db.leaves.forEach(l => {
                if (String(l.employeeId) === String(u.id) && l.status === 'Approved') {
                    let curr = new Date(l.startDate);
                    const lEnd = new Date(l.endDate);
                    while (curr <= lEnd) {
                        myLeaves[curr.toISOString().split('T')[0]] = true;
                        curr.setDate(curr.getDate() + 1);
                    }
                }
            });
        }

        let currentDate = new Date(startDate);
        const todayStr = new Date().toISOString().split('T')[0];
        
        while (currentDate <= endDate) {
            const dStr = currentDate.toISOString().split('T')[0];
            const isHol = window.isPublicHoliday && window.isPublicHoliday(dStr);
            const isRest = window.isEmployeeOnRest && window.isEmployeeOnRest(u, dStr);
            const isLeave = myLeaves[dStr];
            const log = myLogs[dStr];

            if (log) {
                if (log.status === 'Present') presentCount++;
                else if (log.status === 'Absent') absentCount++;
                else if (log.status === 'Late') { lateCount++; presentCount++; }
                else if (log.status === 'Half-Day') halfDayCount++;
                
                if (log.timeIn && log.timeOut) {
                    const tInHr = parseTimeStr(log.timeIn);
                    const tOutHr = parseTimeStr(log.timeOut);
                    const dailyWorkHrs = Math.max(0, tOutHr - tInHr);
                    workHrs += dailyWorkHrs;
                    if (tInHr > shiftStartHr) lateHrs += (tInHr - shiftStartHr);
                    if (tOutHr < shiftEndHr) earlyHrs += (shiftEndHr - tOutHr);
                    if (tOutHr > shiftEndHr) overtimeHrs += (tOutHr - shiftEndHr);
                }
                
                // Track global
                if(!isHol && !isRest) globalWorkDays++;
                
            } else {
                if (isLeave) {
                    leaveCount++;
                    globalLeaves++;
                } else if (isHol) {
                    holidayCount++;
                } else if (isRest) {
                    restCount++;
                } else {
                    if (dStr <= todayStr) { 
                        absentCount++;
                        globalWorkDays++;
                    }
                }
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Add user totals to global
        globalHolidays += holidayCount;
        globalWeekends += restCount;
        globalOvertime += overtimeHrs;

        const totalWorkingDays = presentCount + absentCount + leaveCount;
        const attendanceRate = totalWorkingDays > 0 ? ((presentCount) / totalWorkingDays) * 100 : 0;
        
        // Status Badge Logic
        let statusBadge = '<span style="display:inline-block; border: 1px solid #dc2626; color: #dc2626; background: #fff; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 600;">Poor</span>';
        let pgColor = '#dc2626';
        if (attendanceRate >= 95) {
            statusBadge = '<span style="display:inline-block; border: 1px solid #16a34a; color: #16a34a; background: #fff; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 600;">Excellent</span>';
            pgColor = '#16a34a';
        } else if (attendanceRate >= 85) {
            statusBadge = '<span style="display:inline-block; border: 1px solid #3b82f6; color: #3b82f6; background: #fff; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 600;">Good</span>';
            pgColor = '#3b82f6';
        } else if (attendanceRate >= 75) {
            statusBadge = '<span style="display:inline-block; border: 1px solid #f97316; color: #f97316; background: #fff; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 600;">Warning</span>';
            pgColor = '#f97316';
        }

        summaryData.push({ 
            u, presentCount, absentCount, leaveCount, lateCount, workHrs, overtimeHrs, attendanceRate, statusBadge, pgColor, totalWorkingDays
        });
    });

    // Apply Status Filter
    if (statusFilter !== 'All') {
        summaryData = summaryData.filter(row => {
            if (statusFilter === 'Present') return row.presentCount > 0;
            if (statusFilter === 'Absent') return row.absentCount > 0;
            if (statusFilter === 'Late') return row.lateCount > 0;
            if (statusFilter === 'Leave') return row.leaveCount > 0;
            return true;
        });
    }

    const tbody = document.getElementById('admin-rep-body-attendance-summary');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    let totalEmpCount = 0, totalP = 0, totalA = 0, totalL = 0, totalLate = 0, sumRate = 0;

    const formatHrs = (hrs) => {
        if(hrs === 0) return '-';
        const h = Math.floor(hrs);
        const m = Math.round((hrs - h) * 60);
        if (m === 0) return `${h}h`;
        return `${h}h ${m}m`;
    };

    if(summaryData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="text-center text-muted" style="padding: 40px;">No attendance data found in this period</td></tr>';
    } else {
        summaryData.forEach((row, idx) => {
            totalEmpCount++;
            totalP += row.presentCount;
            totalA += row.absentCount;
            totalL += row.leaveCount;
            totalLate += row.lateCount;
            sumRate += row.attendanceRate;

            const progressHtml = `
            <div style="display: flex; flex-direction: column; width: 100%; max-width: 120px;">
                <div style="font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 4px;">${row.attendanceRate.toFixed(2)}%</div>
                <div style="height: 4px; background: #e5e7eb; border-radius: 4px; width: 100%; overflow: hidden;">
                    <div style="width: ${row.attendanceRate}%; height: 100%; background-color: ${row.pgColor}; border-radius: 4px;"></div>
                </div>
            </div>`;

            tbody.innerHTML += `<tr>
                <td style="font-size:12px; font-weight:600; color:#6b7280; padding: 10px 15px;" class="ps-4">${idx + 1}</td>
                <td style="padding: 10px 15px;">
                    <div style="cursor:pointer;" onclick="window.openAttendanceDetailModal('${row.u.id}')">
                        <div style="font-size:13px;font-weight:600;color:#111827;">${row.u.name}</div>
                        <div style="font-size:11px;color:#6b7280;margin-top:2px;">EMP-${row.u.id}</div>
                    </div>
                </td>
                <td style="font-size:12px; color:#4b5563; padding: 10px 15px;">${row.u.department || 'N/A'}</td>
                <td style="text-align: center; font-size:13px; color:#4b5563; padding: 10px 15px;">${row.presentCount}</td>
                <td style="text-align: center; font-size:13px; color:#4b5563; padding: 10px 15px;">${row.absentCount}</td>
                <td style="text-align: center; font-size:13px; color:#4b5563; padding: 10px 15px;">${row.leaveCount}</td>
                <td style="text-align: center; font-size:13px; color:#4b5563; padding: 10px 15px;">${row.lateCount}</td>
                <td style="text-align: center; font-size:13px; color:#4b5563; padding: 10px 15px;">${formatHrs(row.workHrs)}</td>
                <td style="text-align: center; font-size:13px; color:#4b5563; padding: 10px 15px;">${formatHrs(row.overtimeHrs)}</td>
                <td style="padding: 10px 15px;">${progressHtml}</td>
                <td style="text-align: center; padding: 10px 15px;">${row.statusBadge}</td>
            </tr>`;
        });
    }

    // Update Summary Cards with Percentages based on Total Possible Work Days
    // If no explicit work days are available, use global avg
    document.getElementById('att-sum-total-emp').innerText = totalEmpCount;
    document.getElementById('att-sum-present').innerText = totalP;
    document.getElementById('att-sum-absent').innerText = totalA;
    document.getElementById('att-sum-leave').innerText = totalL;
    document.getElementById('att-sum-late').innerText = totalLate;
    const avgRate = totalEmpCount > 0 ? (sumRate / totalEmpCount).toFixed(2) : '0.00';
    document.getElementById('att-sum-rate').innerText = avgRate + '%';
    
    // Percentages at bottom of cards
    const grandTotalDays = totalP + totalA + totalL;
    const pPerc = grandTotalDays > 0 ? ((totalP / grandTotalDays) * 100).toFixed(2) : '0.00';
    const aPerc = grandTotalDays > 0 ? ((totalA / grandTotalDays) * 100).toFixed(2) : '0.00';
    const lPerc = grandTotalDays > 0 ? ((totalL / grandTotalDays) * 100).toFixed(2) : '0.00';
    const latePerc = grandTotalDays > 0 ? ((totalLate / grandTotalDays) * 100).toFixed(2) : '0.00';
    
    document.getElementById('att-sum-present-perc').innerText = pPerc + '%';
    document.getElementById('att-sum-absent-perc').innerText = aPerc + '%';
    document.getElementById('att-sum-leave-perc').innerText = lPerc + '%';
    document.getElementById('att-sum-late-perc').innerText = latePerc + '%';
    
    document.getElementById('att-sum-rate-trend').innerHTML = `<i class="fa-solid fa-arrow-up"></i> 5.2%`; // Static placeholder to match UI

    // Analytics: Top Performers (By Attendance %)
    const topAttList = [...summaryData].sort((a,b) => b.attendanceRate - a.attendanceRate).slice(0, 5);
    const topAttEl = document.getElementById('att-sum-top-att');
    if (topAttList.length) {
        topAttEl.innerHTML = topAttList.map((x, i) => `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div style="width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px;">
                    <strong style="color:#111827; margin-right: 8px;">${i+1}</strong> <span style="font-weight: 600; color:#111827;">${x.u.name}</span>
                </div>
                <div style="flex-grow: 1; margin: 0 16px; height: 6px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${x.attendanceRate}%; height: 100%; background-color: ${x.pgColor}; border-radius: 4px;"></div>
                </div>
                <div style="width: 55px; text-align: right; font-weight: 600; color: #4b5563; font-size: 12px;">
                    ${x.attendanceRate.toFixed(2)}%
                </div>
            </div>
        `).join('');
    } else {
        topAttEl.innerHTML = '<div class="text-center text-muted" style="padding: 20px 0; font-size: 13px;">No data</div>';
    }

    // Analytics: Attendance Issues
    const issuesEl = document.getElementById('att-sum-issues');
    if (summaryData.length) {
        const mostAbsent = [...summaryData].sort((a,b) => b.absentCount - a.absentCount)[0];
        const mostLate = [...summaryData].sort((a,b) => b.lateCount - a.lateCount)[0];
        const lowestAtt = [...summaryData].sort((a,b) => a.attendanceRate - b.attendanceRate)[0];
        const leastWork = [...summaryData].sort((a,b) => a.workHrs - b.workHrs)[0];

        issuesEl.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 12px; width: 160px;">
                    <i class="fa-solid fa-user-xmark" style="color: #ef4444; width: 16px; text-align: center;"></i> 
                    <span style="font-size: 13px; font-weight: 600; color: #4b5563;">Most Absent</span>
                </div>
                <div style="font-size: 13px; color: #111827;">${mostAbsent.u.name} <span class="text-muted" style="color: #64748b;">(${mostAbsent.absentCount} Days)</span></div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 12px; width: 160px;">
                    <i class="fa-regular fa-clock" style="color: #f97316; width: 16px; text-align: center;"></i> 
                    <span style="font-size: 13px; font-weight: 600; color: #4b5563;">Most Late</span>
                </div>
                <div style="font-size: 13px; color: #111827;">${mostLate.u.name} <span class="text-muted" style="color: #64748b;">(${mostLate.lateCount} Days)</span></div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 12px; width: 160px;">
                    <i class="fa-solid fa-chart-pie" style="color: #f59e0b; width: 16px; text-align: center;"></i> 
                    <span style="font-size: 13px; font-weight: 600; color: #4b5563;">Lowest Attendance</span>
                </div>
                <div style="font-size: 13px; color: #111827;">${lowestAtt.u.name} <span class="text-muted" style="color: #64748b;">(${lowestAtt.attendanceRate.toFixed(0)}%)</span></div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 12px; width: 160px;">
                    <i class="fa-solid fa-clock-rotate-left" style="color: #3b82f6; width: 16px; text-align: center;"></i> 
                    <span style="font-size: 13px; font-weight: 600; color: #4b5563;">Least Work Hours</span>
                </div>
                <div style="font-size: 13px; color: #111827;">${leastWork.u.name} <span class="text-muted" style="color: #64748b;">(${formatHrs(leastWork.workHrs)})</span></div>
            </div>
        `;
    } else {
        issuesEl.innerHTML = '<div class="text-center text-muted" style="padding: 20px 0; font-size: 13px;">No data</div>';
    }

    // Period Global Summary
    document.getElementById('att-sum-g-workdays').innerText = Math.round(globalWorkDays / Math.max(1, filteredUsers.length));
    document.getElementById('att-sum-g-weekends').innerText = Math.round(globalWeekends / Math.max(1, filteredUsers.length));
    document.getElementById('att-sum-g-holidays').innerText = Math.round(globalHolidays / Math.max(1, filteredUsers.length));
    document.getElementById('att-sum-g-leaves').innerText = globalLeaves;
    document.getElementById('att-sum-g-overtime').innerText = formatHrs(globalOvertime);
    
    // Print logic (Custom Header)
    const activeUser = window.currentUser || JSON.parse(localStorage.getItem('current_user')) || {name: 'Admin'};
    const sDate = new Date(start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const eDate = new Date(end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    
    const subtitle = document.getElementById('print-subtitle-admin-attendance-summary');
    if(subtitle) subtitle.innerText = `Date Range: ${sDate} - ${eDate} | Department: ${dept} | Generated By: ${activeUser.name}`;
}


// Global scope for modal
window.currentAttModalEmpId = null;
window.currentAttModalDate = new Date();

window.openAttendanceDetailModal = function(empId) {
    window.currentAttModalEmpId = empId;
    window.currentAttModalDate = new Date(); // reset to current month
    renderAttendanceDetailModal();
    document.getElementById('modal-attendance-detail').classList.remove('hidden');
}

window.changeAttCalMonth = function(dir) {
    window.currentAttModalDate.setMonth(window.currentAttModalDate.getMonth() + dir);
    renderAttendanceDetailModal();
}

function renderAttendanceDetailModal() {
    const db = typeof getDb === 'function' ? getDb() : (window.db || {});
    const empId = window.currentAttModalEmpId;
    const u = db.users ? db.users.find(u => String(u.id) === String(empId)) : null;
    if(!u) return;

    // Set Info
    document.getElementById('att-det-name').innerText = u.name;
    document.getElementById('att-det-status').innerText = u.status || 'Active';
    document.getElementById('att-det-status').className = 'badge ' + (u.status==='Inactive'?'bg-danger':'bg-success');
    document.getElementById('att-det-id').innerText = u.id;
    document.getElementById('att-det-dept').innerText = u.department || 'N/A';
    document.getElementById('att-det-desig').innerText = u.designation || 'N/A';
    
    let mgrName = 'N/A';
    if(u.managerId && db.users) {
        const mgr = db.users.find(m => String(m.id) === String(u.managerId));
        if(mgr) mgrName = mgr.name;
    }
    document.getElementById('att-det-manager').innerText = mgrName;

    // Calculate Stats for current month view
    const year = window.currentAttModalDate.getFullYear();
    const month = window.currentAttModalDate.getMonth();
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    document.getElementById('att-det-month-label').innerText = `${monthNames[month]} ${year}`;

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // last day
    const todayStr = new Date().toISOString().split('T')[0];

    // Get leaves
    const myLeaves = {};
    if (db.leaves) {
        db.leaves.forEach(l => {
            if (String(l.employeeId) === String(u.id) && l.status === 'Approved') {
                let curr = new Date(l.startDate);
                const lEnd = new Date(l.endDate);
                while (curr <= lEnd) {
                    myLeaves[curr.toISOString().split('T')[0]] = true;
                    curr.setDate(curr.getDate() + 1);
                }
            }
        });
    }

    // Get Logs
    const myLogs = {};
    if (db.attendance) {
        db.attendance.forEach(log => {
            if (String(log.employeeId) === String(u.id)) {
                myLogs[log.date] = log;
            }
        });
    }

    let p=0, a=0, l=0, late=0, wh=0;

    let calHtml = '';
    // empty slots for first day
    const firstDayIndex = startDate.getDay();
    for(let i=0; i<firstDayIndex; i++) {
        calHtml += '<div style="padding: 10px; border-radius: 4px; background: rgba(0,0,0,0.02);"></div>';
    }

    let curr = new Date(startDate);
    while (curr <= endDate) {
        const dStr = curr.toISOString().split('T')[0];
        const dayNum = curr.getDate();
        
        let code = '';
        let bgColor = '';
        let color = '';

        const isHol = window.isPublicHoliday && window.isPublicHoliday(dStr);
        const isRest = window.isEmployeeOnRest && window.isEmployeeOnRest(u, dStr);
        const isLeave = myLeaves[dStr];
        const log = myLogs[dStr];

        if (log) {
            if(log.status === 'Present') { code = 'P'; bgColor = 'rgba(16, 185, 129, 0.15)'; color = '#10b981'; p++; }
            if(log.status === 'Late') { code = 'L'; bgColor = 'rgba(245, 158, 11, 0.15)'; color = '#f59e0b'; late++; p++; }
            if(log.status === 'Half-Day') { code = 'H/D'; bgColor = 'rgba(14, 165, 233, 0.15)'; color = '#0ea5e9'; p+=0.5; }
            if(log.status === 'Absent') { code = 'A'; bgColor = 'rgba(239, 68, 68, 0.15)'; color = '#ef4444'; a++; }
            
            // Just rough work hours
            if (log.timeIn && log.timeOut) {
                const parseTimeStr = (t) => {
                    const isPM = t.toUpperCase().includes('PM');
                    const cleanT = t.replace(/[A-Za-z\s]/g, '');
                    if (!cleanT.includes(':')) return 0;
                    let [hr, m] = cleanT.split(':').map(Number);
                    if (isPM && hr !== 12) hr += 12;
                    return hr + (m || 0)/60;
                };
                wh += Math.max(0, parseTimeStr(log.timeOut) - parseTimeStr(log.timeIn));
            }

        } else {
            if (isLeave) { code = 'V'; bgColor = 'rgba(139, 92, 246, 0.15)'; color = '#8b5cf6'; l++; }
            else if (isHol) { code = 'H'; bgColor = 'rgba(0, 0, 0, 0.05)'; color = '#666'; }
            else if (isRest) { code = 'W'; bgColor = 'rgba(226, 232, 240, 0.8)'; color = '#64748b'; }
            else {
                if (dStr <= todayStr) { 
                    code = 'A'; bgColor = 'rgba(239, 68, 68, 0.15)'; color = '#ef4444'; a++; 
                } else {
                    code = '-'; bgColor = 'transparent'; color = '#ccc';
                }
            }
        }

        calHtml += `<div style="padding: 8px 0; border-radius: 6px; background: ${bgColor}; border: 1px solid rgba(0,0,0,0.05); text-align: center; position:relative;">
            <div style="font-size: 10px; color: #999; margin-bottom: 2px;">${dayNum}</div>
            <div style="font-size: 14px; font-weight: 700; color: ${color};">${code}</div>
        </div>`;

        curr.setDate(curr.getDate() + 1);
    }
    
    document.getElementById('att-det-calendar-grid').innerHTML = calHtml;

    document.getElementById('att-det-present').innerText = p;
    document.getElementById('att-det-absent').innerText = a;
    document.getElementById('att-det-leave').innerText = l;
    document.getElementById('att-det-late').innerText = late;
    document.getElementById('att-det-workhrs').innerText = wh.toFixed(1);
    const wrate = (p+a+l) > 0 ? (p/(p+a+l))*100 : 0;
    document.getElementById('att-det-rate').innerText = wrate.toFixed(1) + '%';
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
            const initials = uname !== 'Unknown' ? uname.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
            const avatarHtml = `<div style="display:flex;align-items:center;"><div class="team-member-avatar" style="width:28px;height:28px;font-size:11px;margin-right:8px;margin-bottom:0;border:none;">${initials}</div><strong style="font-size:12px;">${uname}</strong></div>`;
            tbody.innerHTML += '<tr><td>'+log.date+'</td><td>'+log.employeeId+'</td><td>'+avatarHtml+'</td><td>'+(log.timeIn || '-')+'</td><td>'+(log.timeOut || '-')+'</td><td><span class=\"status-badge status-'+(log.status?log.status.toLowerCase().replace(' ','-'):'present')+'\">'+log.status+'</span></td></tr>';
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

        const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        let rowHTML = `<tr><td style="white-space: nowrap; display:flex; align-items:center;"><div class="team-member-avatar" style="width:28px;height:28px;font-size:11px;margin-right:8px;margin-bottom:0;border:none;">${initials}</div><div style="line-height:1.2;"><strong>${user.name}</strong><br><small class="text-secondary" style="font-size:10px;">${user.designation || 'Emp'}</small></div></td>`;
        
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



window.exportAttSummaryExcel = function() {
    exportTableToCSV('table-admin-attendance-summary', 'Attendance_Summary_Report_' + new Date().toISOString().split('T')[0] + '.csv');
}

window.exportAttSummaryPDF = function() {
    if(window.printReport) window.printReport('admin-report-attendance-summary');
}
window.exportTableToCSV = function(tableId, filename) {
    var csv = [];
    var rows = document.querySelectorAll('#' + tableId + ' tr');
    
    for (var i = 0; i < rows.length; i++) {
        var row = [], cols = rows[i].querySelectorAll('td, th');
        for (var j = 0; j < cols.length; j++) 
            row.push('"' + cols[j].innerText.replace(/"/g, '""').trim() + '"');
        csv.push(row.join(','));
    }

    var csvFile = new Blob([csv.join('\n')], {type: 'text/csv'});
    var downloadLink = document.createElement('a');
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}


