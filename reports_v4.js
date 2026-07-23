
window.openFullLeaveReport = function(type) {
    const thead = document.getElementById('full-leave-report-thead');
    const tbody = document.getElementById('full-leave-report-tbody');
    const title = document.getElementById('full-leave-report-title');
    
    thead.innerHTML = '';
    tbody.innerHTML = '';
    
    const db = typeof getDb === 'function' ? getDb() : (window.db || {});
    
    // Correctly fetch filters from the Admin Leave Reports tab
    const startObj = document.getElementById('admin-rep-leave-start');
    const endObj = document.getElementById('admin-rep-leave-end');
    const deptObj = document.getElementById('admin-rep-leave-dept');
    const empObj = document.getElementById('admin-rep-leave-emp');
    
    let start = startObj ? startObj.value : '';
    let end = endObj ? endObj.value : '';
    const dept = deptObj ? deptObj.value : 'All';
    const empId = empObj ? empObj.value : 'All';

    if (!start || !end) {
        start = '2000-01-01';
        end = '2100-12-31';
    }

    const allUsers = db.users || [];
    const empStats = {};

    allUsers.forEach(u => {
        if (dept !== 'All' && u.department !== dept) return;
        if (empId !== 'All' && String(u.id) !== String(empId)) return;
        
        let casualAlloc = 10, medicalAlloc = 8, annualAlloc = 14;
        
        if (db.companyProfile && Array.isArray(db.companyProfile.leaveTypes)) {
            const getGlb = (k) => {
                let match = db.companyProfile.leaveTypes.find(lt => String(lt.name || lt.id || '').toLowerCase().includes(k));
                return match ? parseInt(match.days) : null;
            };
            let gc = getGlb('casual'); if(gc !== null && !isNaN(gc)) casualAlloc = gc;
            let gm = getGlb('medical'); if(gm !== null && !isNaN(gm)) medicalAlloc = gm;
            let ga = getGlb('annual'); if(ga !== null && !isNaN(ga)) annualAlloc = ga;
        }

        if ((u.hasCustomLeaveBalances === true || String(u.hasCustomLeaveBalances) === 'true') && Array.isArray(u.leaveBalances)) {
            let cId = 'L1', mId = 'L2', aId = 'L3';
            if (db.companyProfile && Array.isArray(db.companyProfile.leaveTypes)) {
                let clt = db.companyProfile.leaveTypes.find(lt => String(lt.name).toLowerCase().includes('casual'));
                if (clt) cId = clt.id;
                let mlt = db.companyProfile.leaveTypes.find(lt => String(lt.name).toLowerCase().includes('medical'));
                if (mlt) mId = mlt.id;
                let alt = db.companyProfile.leaveTypes.find(lt => String(lt.name).toLowerCase().includes('annual'));
                if (alt) aId = alt.id;
            }

            const getBal = (k, gId, idx) => {
                let match = u.leaveBalances.find((b, i) => {
                    let nm = String(b.name || b.leaveType || b.type || b.leave_type || b.title || '');
                    if (nm.toLowerCase().includes(k)) return true;
                    if (b.id && String(b.id) === String(gId)) return true;
                    if (i === idx) return true; // Ultimate fallback
                    return false;
                });
                return match ? parseInt(typeof match.total !== 'undefined' ? match.total : match.balance) : null;
            };
            let c = getBal('casual', cId, 0); if (c !== null && !isNaN(c)) casualAlloc = c;
            let m = getBal('medical', mId, 1); if (m !== null && !isNaN(m)) medicalAlloc = m;
            let a = getBal('annual', aId, 2); if (a !== null && !isNaN(a)) annualAlloc = a;
        }

        empStats[u.id] = {
            id: u.id,
            name: u.name,
            dept: u.department || 'N/A',
            casual: 0, medical: 0, annual: 0, unpaid: 0, totalUsed: 0,
            annualAlloc: annualAlloc, casualAlloc: casualAlloc, medicalAlloc: medicalAlloc, annualBal: annualAlloc, casualBal: casualAlloc, medicalBal: medicalAlloc
        };
    });

    let filtered = db.leaves || [];
    if (start) { filtered = filtered.filter(r => new Date(r.startDate || r.start || r.date) >= new Date(start)); }
    if (end) { 
        const eDate = new Date(end);
        eDate.setHours(23, 59, 59);
        filtered = filtered.filter(r => new Date(r.endDate || r.end || r.date) <= eDate); 
    }

    filtered.forEach(req => {
        if (req.status === 'Approved' && empStats[req.employeeId]) {
            const st = empStats[req.employeeId];
            const lType = req.leaveType || req.type;
            const startD = new Date(req.startDate || req.start);
            const endD = new Date(req.endDate || req.end);
            let calculatedDays = Math.max(1, Math.round((endD - startD) / (1000 * 60 * 60 * 24)) + 1);

            const typeStr = String(lType).toLowerCase();
            if (typeStr.includes('casual')) { st.casual += calculatedDays; st.casualBal -= calculatedDays; }
            else if (typeStr.includes('medical')) { st.medical += calculatedDays; st.medicalBal -= calculatedDays; }
            else if (typeStr.includes('annual')) { st.annual += calculatedDays; st.annualBal -= calculatedDays; }
            else { st.unpaid += calculatedDays; }

            st.totalUsed += calculatedDays;
        }
    });

    const validEmps = Object.values(empStats);

    if (type === 'emp') {
        title.innerText = 'Employee Leave Summary (All)';
        thead.innerHTML = `
            <tr>
                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569;">Employee</th>
                <th class="text-center" style="text-align: center !important; padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569;">Casual Leave</th>
                <th class="text-center" style="text-align: center !important; padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569;">Medical Leave</th>
                <th class="text-center" style="text-align: center !important; padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569;">Annual Leave</th>
                <th class="text-center" style="text-align: center !important; padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569;">Unpaid Leave</th>
                <th class="text-center" style="text-align: center !important; padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569;">Total Used</th>
                <th class="text-center" style="text-align: center !important; padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569;">Remaining Balance</th>
            </tr>
        `;
        let html = '';
        validEmps.sort((a,b) => b.totalUsed - a.totalUsed).forEach(st => {
            const totalAlloc = (st.annualAlloc || 0) + (st.casualAlloc || 0) + (st.medicalAlloc || 0);
            html += `
                <tr>
                    <td style="padding: 12px 10px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${st.name}</td>
                    <td class="text-center" style="text-align: center !important; padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">${st.casual}</td>
                    <td class="text-center" style="text-align: center !important; padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">${st.medical}</td>
                    <td class="text-center" style="text-align: center !important; padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">${st.annual}</td>
                    <td class="text-center" style="text-align: center !important; padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">${st.unpaid}</td>
                    <td class="text-center" style="text-align: center !important; padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">${st.totalUsed}</td>
                    <td class="text-center" style="text-align: center !important; padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">${totalRem}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } else if (type === 'bal') {
        title.innerText = 'Leave Balance Report (All)';
        thead.innerHTML = `
            <tr>
                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569;">Employee</th>
                <th class="text-center" style="text-align: center !important; padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569;">Annual Leave Allocated</th>
                <th class="text-center" style="text-align: center !important; padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569;">Casual Leave Allocated</th>
                <th class="text-center" style="text-align: center !important; padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569;">Medical Leave Allocated</th>
                <th class="text-center" style="text-align: center !important; padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569;">Total Allocated</th>
            </tr>
        `;
        let html = '';
        validEmps.sort((a,b) => b.totalUsed - a.totalUsed).forEach(st => {
            const totalAlloc = (st.annualAlloc || 0) + (st.casualAlloc || 0) + (st.medicalAlloc || 0);
            html += `
                <tr>
                    <td style="padding: 12px 10px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${st.name}</td>
                    <td class="text-center" style="text-align: center !important; padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">${st.annualAlloc}</td>
                    <td class="text-center" style="text-align: center !important; padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">${st.casualAlloc}</td>
                    <td class="text-center" style="text-align: center !important; padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">${st.medicalAlloc}</td>
                    <td class="text-center" style="text-align: center !important; padding: 12px 10px; border-bottom: 1px solid #f1f5f9;"><span class="badge-pill-green">${totalAlloc}</span></td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } else if (type === 'dept') {
        title.innerText = 'Department Leave Analysis (All)';
        thead.innerHTML = `
            <tr>
                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569;">Department</th>
                <th class="text-center" style="text-align: center !important; padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569;">Total Employees</th>
                <th class="text-center" style="text-align: center !important; padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569;">Total Requests</th>
                <th class="text-center" style="text-align: center !important; padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569;">Approved</th>
                <th class="text-center" style="text-align: center !important; padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569;">Leave Days Used</th>
                <th class="text-center" style="text-align: center !important; padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569;">Avg Leave / Employee</th>
            </tr>
        `;
        let html = '';
        
        let deptStats = {};
        validEmps.forEach(st => {
            if (!deptStats[st.dept]) {
                deptStats[st.dept] = { emps: 0, reqs: 0, approved: 0, daysUsed: 0 };
            }
            deptStats[st.dept].emps++;
            deptStats[st.dept].daysUsed += st.totalUsed;
        });

        filtered.forEach(req => {
            const u = allUsers.find(user => user.id === req.employeeId);
            if (u && deptStats[u.department || 'N/A']) {
                deptStats[u.department || 'N/A'].reqs++;
                if (req.status === 'Approved') deptStats[u.department || 'N/A'].approved++;
            }
        });

        const sortedDepts = Object.keys(deptStats).sort((a, b) => deptStats[b].daysUsed - deptStats[a].daysUsed);
        
        sortedDepts.forEach(d => {
            const ds = deptStats[d];
            const avg = ds.emps > 0 ? (ds.daysUsed / ds.emps).toFixed(2) : '0.00';
            html += `
                <tr>
                    <td style="padding: 12px 10px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${d}</td>
                    <td class="text-center" style="text-align: center !important; padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">${ds.emps}</td>
                    <td class="text-center" style="text-align: center !important; padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">${ds.reqs}</td>
                    <td class="text-center" style="text-align: center !important; padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">${ds.approved}</td>
                    <td class="text-center" style="text-align: center !important; padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">${ds.daysUsed}</td>
                    <td class="text-center" style="text-align: center !important; padding: 12px 10px; border-bottom: 1px solid #f1f5f9;">${avg}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }
    const m = document.getElementById('modal-full-leave-report');
    if (m) {
        if (typeof window.openModal === 'function') {
            window.openModal('modal-full-leave-report');
        } else {
            const backdrop = document.getElementById('modal-backdrop');
            if (backdrop) backdrop.classList.remove('hidden');
            m.classList.remove('hidden');
            m.style.display = '';
        }
    }
};
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
                const logoHtml = cp.logoBase64 ? `<img src="${cp.logoBase64}" style="height: 55px; width: auto; object-fit: contain; margin-right: 12px; display: inline-block !important; -webkit-print-color-adjust: exact; print-color-adjust: exact;">` : '';
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
                    const currentUser = window.currentUser || JSON.parse(localStorage.getItem('current_user')) || {};
                    const generatedByName = currentUser.name || currentUser.username || 'HR System';
                    
                    const footerHtml = `
                        <div class="print-footer-report" style="margin-top: 50px; padding-top: 15px; border-top: 2px solid #0f2e53; display: flex; justify-content: space-between; font-size: 11px; font-family: 'Inter', sans-serif; color: #333;">
                            <div style="line-height: 1.6;">
                                <p style="margin:0;"><strong>Generated By:</strong> ${generatedByName}</p>
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
    const empSelectsAdmin = ['admin-rep-att-sum-emp', 'admin-rep-att-emp', 'admin-rep-att-reg-emp', 'admin-rep-leave-emp', 'admin-rep-pay-emp', 'admin-rep-prod-emp', 'admin-rep-loan-emp', 'admin-rep-assets-filter-emp'];
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
    const deptSelects = ['admin-rep-att-sum-dept', 'admin-rep-emp-dept', 'admin-rep-leave-dept'];
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

    // Populate Shifts
    const shiftSelects = ['admin-rep-leave-shift'];
    const shifts = db.shifts || [];
    shiftSelects.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.innerHTML = '<option value="All">All Shifts</option>';
            shifts.forEach(s => {
                el.innerHTML += `<option value="${s.id}">${s.name}</option>`;
            });
        }
    });

    // Default dates
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    
    ['admin-rep-att-sum-start', 'admin-rep-att-start', 'admin-rep-prod-start'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = startStr;
    });
    ['admin-rep-att-sum-end', 'admin-rep-att-end', 'admin-rep-prod-end'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = endStr;
    });

        const firstDay = new Date(end.getFullYear(), end.getMonth(), 1);
    const lastDay = new Date(end.getFullYear(), end.getMonth() + 1, 0);
    const leaveStartStr = firstDay.getFullYear() + '-' + String(firstDay.getMonth() + 1).padStart(2, '0') + '-01';
    const leaveEndStr = lastDay.getFullYear() + '-' + String(lastDay.getMonth() + 1).padStart(2, '0') + '-' + String(lastDay.getDate()).padStart(2, '0');
    if(document.getElementById('admin-rep-leave-start')) document.getElementById('admin-rep-leave-start').value = leaveStartStr;
    if(document.getElementById('admin-rep-leave-end')) document.getElementById('admin-rep-leave-end').value = leaveEndStr;

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

    // Populate Shifts
    const shiftSelects = ['admin-rep-leave-shift'];
    const shifts = db.shifts || [];
    shiftSelects.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.innerHTML = '<option value="All">All Shifts</option>';
            shifts.forEach(s => {
                el.innerHTML += `<option value="${s.id}">${s.name}</option>`;
            });
        }
    });

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

            const firstDay = new Date(end.getFullYear(), end.getMonth(), 1);
    const lastDay = new Date(end.getFullYear(), end.getMonth() + 1, 0);
    const leaveStartStr = firstDay.getFullYear() + '-' + String(firstDay.getMonth() + 1).padStart(2, '0') + '-01';
    const leaveEndStr = lastDay.getFullYear() + '-' + String(lastDay.getMonth() + 1).padStart(2, '0') + '-' + String(lastDay.getDate()).padStart(2, '0');
    if(document.getElementById('admin-rep-leave-start')) document.getElementById('admin-rep-leave-start').value = leaveStartStr;
    if(document.getElementById('admin-rep-leave-end')) document.getElementById('admin-rep-leave-end').value = leaveEndStr;

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
    const sDate = new Date(start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    const eDate = new Date(end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    
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


window.applyLeaveDatePreset = function(preset) {
    const today = new Date();
    let start, end = new Date(today);
    
    if (preset === 'Today') {
        start = new Date(today);
    } else if (preset === 'This Week') {
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(today.setDate(diff));
        end = new Date();
    } else if (preset === 'Last 15 Days') {
        start = new Date(today);
        start.setDate(today.getDate() - 15);
        end = new Date();
    } else if (preset === 'This Month') {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }
    
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    
    if(document.getElementById('admin-rep-leave-start')) document.getElementById('admin-rep-leave-start').value = startStr;
    if(document.getElementById('admin-rep-leave-end')) document.getElementById('admin-rep-leave-end').value = endStr;
};

function generateAdminLeaveReport(db) {
    db = typeof getDb === 'function' ? getDb() : (window.db || {});
    const start = document.getElementById('admin-rep-leave-start').value;
    const end = document.getElementById('admin-rep-leave-end').value;
    const empId = document.getElementById('admin-rep-leave-emp').value;
    const dept = document.getElementById('admin-rep-leave-dept').value;
    
    const status = document.getElementById('admin-rep-leave-status').value;
    const shift = document.getElementById('admin-rep-leave-shift').value;

    if (!start || !end) {
        // Default to current month
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        start = firstDay.getFullYear() + '-' + String(firstDay.getMonth() + 1).padStart(2, '0') + '-01';
        end = lastDay.getFullYear() + '-' + String(lastDay.getMonth() + 1).padStart(2, '0') + '-' + String(lastDay.getDate()).padStart(2, '0');
        
        // Also update the UI inputs so the user sees the active filter
        if(document.getElementById('admin-rep-leave-start')) document.getElementById('admin-rep-leave-start').value = start;
        if(document.getElementById('admin-rep-leave-end')) document.getElementById('admin-rep-leave-end').value = end;
    }

    const tbodyRequests = document.getElementById('admin-rep-body-leave-requests');
    const tbodyEmpSummary = document.getElementById('admin-rep-body-leave-emp-summary');
    const tbodyBalance = document.getElementById('admin-rep-body-leave-balance');
    const tbodyDept = document.getElementById('admin-rep-body-leave-dept-analysis');
    
    if (!tbodyRequests) return;
    
    const allLeaves = db.leaves || [];
    const allUsers = db.users || [];

    const sDate = new Date(start);
    const eDate = new Date(end);
    eDate.setHours(23, 59, 59);

    let filtered = allLeaves.filter(req => {
        const reqStart = req.startDate || req.fromDate || req.date;
        if(!reqStart) return false;
        const d = new Date(reqStart);
        let match = d >= sDate && d <= eDate;
        
        const emp = allUsers.find(u => u.id === req.employeeId) || {};
        if (empId !== 'All' && req.employeeId != empId) match = false;
        
        if (status !== 'All' && req.status !== status) match = false;
        if (dept !== 'All' && emp.department !== dept) match = false;
        if (shift !== 'All' && (emp.shiftId || 'shift_general') !== shift) match = false; 

        return match;
    });
    
    // 1. TOP SUMMARY CARDS
    let totalReq = filtered.length;
    let approved = filtered.filter(r => r.status === 'Approved').length;
    let pending = filtered.filter(r => r.status === 'Pending').length;
    let rejected = filtered.filter(r => r.status === 'Rejected').length;
    
    let appPct = totalReq > 0 ? ((approved/totalReq)*100).toFixed(2) : 0;
    let penPct = totalReq > 0 ? ((pending/totalReq)*100).toFixed(2) : 0;
    let rejPct = totalReq > 0 ? ((rejected/totalReq)*100).toFixed(2) : 0;
    
    let daysConsumed = 0;
    let currentlyOnLeave = new Set();
    const todayStr = new Date().toISOString().split('T')[0];
    
    filtered.forEach(r => {
        if (r.status === 'Approved') {
            let fromDate = r.startDate || r.fromDate || r.date || '-';
            let toDate = r.endDate || r.toDate || r.date || '-';
            let calculatedDays = r.days;
            if(!calculatedDays) {
                if(fromDate !== '-' && toDate !== '-') {
                    const diffTime = Math.abs(new Date(toDate) - new Date(fromDate));
                    calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                } else calculatedDays = 1;
            }
            daysConsumed += calculatedDays;
            if (fromDate <= todayStr && toDate >= todayStr) {
                currentlyOnLeave.add(r.employeeId);
            }
        }
    });
    
    document.getElementById('leave-sum-total').innerText = totalReq;
    document.getElementById('leave-sum-approved').innerText = approved;
    document.getElementById('leave-sum-pct-app').innerText = appPct + '%';
    document.getElementById('leave-sum-pending').innerText = pending;
    document.getElementById('leave-sum-pct-pen').innerText = penPct + '%';
    document.getElementById('leave-sum-rejected').innerText = rejected;
    document.getElementById('leave-sum-pct-rej').innerText = rejPct + '%';
    document.getElementById('leave-sum-onleave').innerText = currentlyOnLeave.size;
    document.getElementById('leave-sum-consumed').innerText = daysConsumed;

    // BADGE HELPERS
    const badgeMap = {
        'Casual Leave': 'badge-soft-blue',
        'Casual Leaves': 'badge-soft-blue',
        'Medical Leave': 'badge-soft-teal',
        'Medical Leaves': 'badge-soft-teal',
        'Annual Leave': 'badge-soft-purple',
        'Unpaid Leave': 'badge-soft-orange'
    };
    const statusMap = {
        'Approved': 'badge-out-green',
        'Pending': 'badge-out-orange',
        'Rejected': 'badge-out-red'
    };

    // 2. LEAVE REQUEST REPORT (TABLE 1)
    let htmlRequests = '';
    // Show top 10 for UI mock
    let displayReqs = filtered.slice(0, 10);
    if (displayReqs.length === 0) {
        htmlRequests = '<tr><td colspan="12" class="text-center text-muted" style="padding: 30px;">No leave requests found for selected criteria</td></tr>';
    } else {
        displayReqs.forEach((req, idx) => {
            const emp = allUsers.find(u => u.id === req.employeeId) || {name: 'Unknown', department: 'Unknown'};
            
            let applyDate = req.submittedAt || req.startDate || req.fromDate || req.date || '-';
            if(applyDate.includes('T')) applyDate = applyDate.split('T')[0];
            const displayApplyDate = applyDate !== '-' && !isNaN(new Date(applyDate)) ? new Date(applyDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : '-';

            let fromDate = req.startDate || req.fromDate || req.date || '-';
            let toDate = req.endDate || req.toDate || req.date || '-';
            let calculatedDays = req.days;
            if(!calculatedDays) {
                if(fromDate !== '-' && toDate !== '-') {
                    const diffTime = Math.abs(new Date(toDate) - new Date(fromDate));
                    calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                } else calculatedDays = 1;
            }
            
            const displayFrom = fromDate !== '-' && !isNaN(new Date(fromDate)) ? new Date(fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : '-';
            const displayTo = toDate !== '-' && !isNaN(new Date(toDate)) ? new Date(toDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : '-';

            const lType = req.type || req.leaveType || '-';
            const displayType = lType.replace('Leaves', 'Leave');
            const bClass = badgeMap[displayType] || badgeMap[lType] || 'badge-soft-blue';
            const sClass = statusMap[req.status] || 'badge-out-orange';

            htmlRequests += `
                <tr>
                    <td>${idx + 1}</td>
                    <td>${displayApplyDate}</td>
                    <td>EMP-${req.employeeId}</td>
                    <td style="font-weight: 600; color: #0f172a;">${emp.name}</td>
                    <td>${emp.department || 'N/A'}</td>
                    <td><span class="${bClass}">${displayType}</span></td>
                    <td>${displayFrom}</td>
                    <td>${displayTo}</td>
                    <td class="text-center" style="text-align: center !important;">${calculatedDays}</td>
                    <td class="text-center" style="text-align: center !important;"><span class="${sClass}">${req.status || 'Pending'}</span></td>
                    <td>${req.approvedBy || '-'}</td>
                    <td><div style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${req.reason || ''}">${req.reason || '-'}</div></td>
                </tr>
            `;
        });
    }
    tbodyRequests.innerHTML = htmlRequests;
    document.getElementById('leave-req-footer-text').innerText = `Showing 1 to ${displayReqs.length} of ${filtered.length} entries`;

    // Analyze data per employee for Table 2 and Table 3
    let empStats = {};
    allUsers.forEach(u => {
        if (dept !== 'All' && u.department !== dept) return;
        if (empId !== 'All' && u.id != empId) return;
        
                        let casualAlloc = 10, medicalAlloc = 8, annualAlloc = 14;
        
        // 1. Get global defaults
        if (db.companyProfile && Array.isArray(db.companyProfile.leaveTypes)) {
            const getGlb = (k) => {
                let match = db.companyProfile.leaveTypes.find(lt => String(lt.name || lt.id || '').toLowerCase().includes(k));
                return match ? parseInt(match.days) : null;
            };
            let gc = getGlb('casual'); if(gc !== null && !isNaN(gc)) casualAlloc = gc;
            let gm = getGlb('medical'); if(gm !== null && !isNaN(gm)) medicalAlloc = gm;
            let ga = getGlb('annual'); if(ga !== null && !isNaN(ga)) annualAlloc = ga;
        }

        // 2. Override with custom balances if enabled
        if ((u.hasCustomLeaveBalances === true || String(u.hasCustomLeaveBalances) === 'true') && Array.isArray(u.leaveBalances)) {
            let cId = 'L1', mId = 'L2', aId = 'L3';
            if (db.companyProfile && Array.isArray(db.companyProfile.leaveTypes)) {
                let clt = db.companyProfile.leaveTypes.find(lt => String(lt.name).toLowerCase().includes('casual'));
                if (clt) cId = clt.id;
                let mlt = db.companyProfile.leaveTypes.find(lt => String(lt.name).toLowerCase().includes('medical'));
                if (mlt) mId = mlt.id;
                let alt = db.companyProfile.leaveTypes.find(lt => String(lt.name).toLowerCase().includes('annual'));
                if (alt) aId = alt.id;
            }

            const getBal = (k, gId, idx) => {
                let match = u.leaveBalances.find((b, i) => {
                    let nm = String(b.name || b.leaveType || b.type || b.leave_type || b.title || '');
                    if (nm.toLowerCase().includes(k)) return true;
                    if (b.id && String(b.id) === String(gId)) return true;
                    if (i === idx) return true; // Ultimate fallback
                    return false;
                });
                return match ? parseInt(typeof match.total !== 'undefined' ? match.total : match.balance) : null;
            };
            let c = getBal('casual', cId, 0); if (c !== null && !isNaN(c)) casualAlloc = c;
            let m = getBal('medical', mId, 1); if (m !== null && !isNaN(m)) medicalAlloc = m;
            let a = getBal('annual', aId, 2); if (a !== null && !isNaN(a)) annualAlloc = a;
        }

        empStats[u.id] = {
            id: u.id,
            name: u.name,
            dept: u.department || 'N/A',
            casual: 0, medical: 0, annual: 0, unpaid: 0, totalUsed: 0,
            annualAlloc: annualAlloc, casualAlloc: casualAlloc, medicalAlloc: medicalAlloc, annualBal: annualAlloc, casualBal: casualAlloc, medicalBal: medicalAlloc
        };
    });
    


    filtered.forEach(req => {
        if (req.status === 'Approved' && empStats[req.employeeId]) {
            const st = empStats[req.employeeId];
            let fromDate = req.startDate || req.fromDate || req.date || '-';
            let toDate = req.endDate || req.toDate || req.date || '-';
            let calculatedDays = req.days;
            if(!calculatedDays) {
                if(fromDate !== '-' && toDate !== '-') {
                    const diffTime = Math.abs(new Date(toDate) - new Date(fromDate));
                    calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                } else calculatedDays = 1;
            }

            st.totalUsed += calculatedDays;
            const lType = req.type || req.leaveType;
            const typeStr = String(lType).toLowerCase();
            if (typeStr.includes('casual')) { st.casual += calculatedDays; st.casualBal -= calculatedDays; }
            else if (typeStr.includes('medical')) { st.medical += calculatedDays; st.medicalBal -= calculatedDays; }
            else if (typeStr.includes('annual')) { st.annual += calculatedDays; st.annualBal -= calculatedDays; }
            else { st.unpaid += calculatedDays; }
        }
    });

    const validEmps = Object.values(empStats);
    
    // 3. EMPLOYEE LEAVE SUMMARY (TABLE 2)
    let htmlEmpSummary = '';
    const topEmps = validEmps.sort((a,b) => b.totalUsed - a.totalUsed).slice(0, 5);
    if (topEmps.length === 0) {
        htmlEmpSummary = '<tr><td colspan="7" class="text-center text-muted py-3">No data found</td></tr>';

    } else {
        topEmps.forEach(st => {
            const rem = st.annualBal + st.casualBal + st.medicalBal;
            htmlEmpSummary += `
                <tr>
                    <td style="font-weight: 600; color: #0f172a;">${st.name}</td>
                    <td class="text-center" style="text-align: center !important;">${st.casual}</td>
                    <td class="text-center" style="text-align: center !important;">${st.medical}</td>
                    <td class="text-center" style="text-align: center !important;">${st.annual}</td>
                    <td class="text-center" style="text-align: center !important;">${st.unpaid}</td>
                    <td class="text-center" style="text-align: center !important;">${st.totalUsed}</td>
                    <td class="text-center" style="text-align: center !important; font-weight: 600;">${rem}</td>
                </tr>
            `;
        });
    }
    tbodyEmpSummary.innerHTML = htmlEmpSummary;
      if(topEmps.length > 0) { document.getElementById('leave-emp-footer-text').innerText = `Showing ${topEmps.length} of ${validEmps.length} entries`; }

    // 4. LEAVE BALANCE REPORT (TABLE 3)
    
    const balEmps = validEmps.slice().sort((a,b) => b.totalUsed - a.totalUsed).slice(0, 5);
    let htmlBalance = '';
    let lowBalEmps = [];
    if (balEmps.length === 0) {

        htmlBalance = '<tr><td colspan="5" class="text-center text-muted py-3">No data found</td></tr>';

    } else {
        balEmps.forEach(st => {
            const totalAlloc = (st.annualAlloc || 0) + (st.casualAlloc || 0) + (st.medicalAlloc || 0);
            
            htmlBalance += `
                <tr>
                    <td style="font-weight: 600; color: #0f172a;">${st.name}</td>
                    <td class="text-center" style="text-align: center !important;">${st.annualAlloc}</td>
                    <td class="text-center" style="text-align: center !important;">${st.casualAlloc}</td>
                    <td class="text-center" style="text-align: center !important;">${st.medicalAlloc}</td>
                    <td class="text-center" style="text-align: center !important;"><span class="badge-pill-green">${totalAlloc}</span></td>
                </tr>
            `;
        });
    }
    // Collect all low balances
    validEmps.forEach(st => {
        const totalRem = Math.max(0, st.annualBal) + Math.max(0, st.casualBal) + Math.max(0, st.medicalBal);
        if (totalRem < 10) lowBalEmps.push({name: st.name, bal: totalRem});
    });
    tbodyBalance.innerHTML = htmlBalance;
      if(balEmps.length > 0) { document.getElementById('leave-bal-footer-text').innerText = `Showing ${balEmps.length} of ${validEmps.length} entries`; }

    // 5. DEPARTMENT LEAVE ANALYSIS (TABLE 4)
    let deptStats = {};
    validEmps.forEach(st => {
        if (!deptStats[st.dept]) {
            deptStats[st.dept] = { emps: 0, reqs: 0, approved: 0, daysUsed: 0 };
        }
        deptStats[st.dept].emps++;
        deptStats[st.dept].daysUsed += st.totalUsed;
    });
    
    filtered.forEach(req => {
        const emp = allUsers.find(u => u.id === req.employeeId) || {};
        const dpt = emp.department || 'N/A';
        if (deptStats[dpt]) {
            deptStats[dpt].reqs++;
            if (req.status === 'Approved') deptStats[dpt].approved++;
        }
    });

    let htmlDept = '';
    let maxUsedDept = { name: '-', val: 0 };
    const deptKeys = Object.keys(deptStats).slice(0, 5);
    if (deptKeys.length === 0) {
        htmlDept = '<tr><td colspan="6" class="text-center text-muted py-3">No data found</td></tr>';

    } else {
        Object.keys(deptStats).forEach(d => {
            const ds = deptStats[d];
            if (ds.daysUsed > maxUsedDept.val) {
                maxUsedDept = { name: d, val: ds.daysUsed };
            }
        });
        
        deptKeys.forEach(d => {
            const ds = deptStats[d];
            const avg = ds.emps > 0 ? (ds.daysUsed / ds.emps).toFixed(2) : 0;
            htmlDept += `
                <tr>
                    <td style="font-weight: 600; color: #0f172a;">${d}</td>
                    <td class="text-center" style="text-align: center !important;">${ds.emps}</td>
                    <td class="text-center" style="text-align: center !important;">${ds.reqs}</td>
                    <td class="text-center" style="text-align: center !important;">${ds.approved}</td>
                    <td class="text-center" style="text-align: center !important;">${ds.daysUsed}</td>
                    <td class="text-center" style="text-align: center !important;">${avg}</td>
                </tr>
            `;
        });
    }
    tbodyDept.innerHTML = htmlDept;
      if(deptKeys.length > 0) { document.getElementById('leave-dept-footer-text').innerText = `Showing ${deptKeys.length} of ${Object.keys(deptStats).length} entries`; }

    // 6. INSIGHTS
    // 6.1 Most Leave Taken
    let mostLeavesHtml = '';
    validEmps.sort((a,b) => b.totalUsed - a.totalUsed).slice(0,3).forEach((st, idx) => { 
        if(st.totalUsed > 0) {
            mostLeavesHtml += `
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px;">
                    <div style="display: flex; align-items: center;"><span class="num-badge">${idx+1}</span> <span style="font-weight: 600; color: #0f172a;">${st.name}</span></div>
                    <span style="color: #64748b;">${st.totalUsed} Days</span>
                </div>
            `;
        }
    });
    document.getElementById('leave-insight-most-leaves').innerHTML = mostLeavesHtml || '<div class="text-muted" style="font-size: 11px;">No leaves taken</div>';
    
    // 6.2 Donut Chart
    let typesFreq = {};
    let totApp = 0;
    filtered.forEach(r => { 
        if(r.status === 'Approved') { 
            const lt = r.type || r.leaveType; 
            if(lt) {
                typesFreq[lt] = (typesFreq[lt] || 0) + 1; 
                totApp++;
            }
        } 
    });
    const cMap = {'Casual Leave': '#3b82f6', 'Casual Leaves': '#3b82f6', 'Annual Leave': '#a855f7', 'Annual Leaves': '#a855f7', 'Medical Leave': '#22c55e', 'Medical Leaves': '#22c55e', 'Unpaid Leave': '#eab308', 'Unpaid Leaves': '#eab308'};
    let legendHtml = '';
    let conicStr = [];
    let currentPct = 0;
    
    Object.keys(typesFreq).forEach(k => {
        const val = typesFreq[k];
        const pct = totApp > 0 ? Math.round((val/totApp)*100) : 0;
        const color = cMap[k] || '#94a3b8';
        
        legendHtml += `
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <div style="display: flex; align-items: center;"><span class="legend-dot" style="background: ${color};"></span> ${k}</div>
                <div style="font-weight: 600;">${val} <span style="color: #94a3b8; font-weight: 400;">(${pct}%)</span></div>
            </div>
        `;
        
        conicStr.push(`${color} ${currentPct}% ${currentPct + pct}%`);
        currentPct += pct;
    });
    
    if(totApp === 0) {
        legendHtml = '<div class="text-muted">No data</div>';
        document.getElementById('leave-donut-chart').style.background = '#e2e8f0';
    } else {
        document.getElementById('leave-donut-chart').style.background = `conic-gradient(${conicStr.join(', ')})`;
    }
    document.getElementById('leave-donut-legend').innerHTML = legendHtml;
    
    // 6.3 Dept Usage
    document.getElementById('leave-insight-high-dept-name').innerText = maxUsedDept.name;
    document.getElementById('leave-insight-high-dept-days').innerText = maxUsedDept.val;
    // mock trend
    document.getElementById('leave-insight-high-dept-trend').innerHTML = maxUsedDept.val > 0 ? `<i class="fa-solid fa-arrow-up"></i> 12.5% <span style="font-weight: 400; color: #94a3b8;">vs Last Month</span>` : '-';
    
    // 6.4 On Leave Today
    let onLeaveHtml = '';
    let onLeaveArr = Array.from(currentlyOnLeave).slice(0, 3);
    onLeaveArr.forEach((empId, idx) => {
        const emp = allUsers.find(u => u.id === empId);
        if(emp) {
            // Find active leave type
            let lReq = filtered.find(r => r.employeeId === empId && r.status === 'Approved' && (r.startDate || r.fromDate || r.date) <= todayStr && (r.endDate || r.toDate || r.date) >= todayStr);
            let lt = lReq ? (lReq.type || lReq.leaveType) : 'Leave';
            onLeaveHtml += `
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px;">
                    <div style="display: flex; align-items: center;">
                        <div style="width: 15px; font-weight: 600; color: #0f172a;">${idx+1}</div>
                        <img src="${(emp.profilePic || emp.profileImageBase64 || emp.photo) || ('https://ui-avatars.com/api/?name=' + encodeURIComponent(emp.name) + '&background=e2e8f0&color=475569')}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover; margin: 0 8px;">
                        <span style="font-weight: 600; color: #0f172a;">${emp.name}</span>
                    </div>
                    <span style="color: #64748b;">${lt}</span>
                </div>
            `;
        }
    });
    document.getElementById('leave-insight-onleave-list').innerHTML = onLeaveHtml || '<div class="text-muted" style="font-size: 11px;">None</div>';

    // 6.5 Low Balance
    let lowBalHtml = '';
    lowBalEmps.sort((a,b) => a.bal - b.bal).slice(0,3).forEach((lb, idx) => {
        const bClass = lb.bal < 5 ? 'badge-out-orange' : 'badge-out-orange'; // mock logic
        const tText = lb.bal < 5 ? 'Low' : 'Medium';
        lowBalHtml += `
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px;">
                <div style="display: flex; align-items: center;"><div style="width: 15px; font-weight: 600; color: #0f172a;">${idx+1}</div> <span style="font-weight: 600; color: #0f172a; margin-left: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80px;">${lb.name}</span></div>
                <div style="display: flex; align-items: center; gap: 8px; white-space: nowrap;">
                    <span style="color: #94a3b8;">Total Balance: ${lb.bal} Days</span>
                    <span class="${bClass}" style="padding: 2px 8px;">${tText}</span>
                </div>
            </div>
        `;
    });
    let lbList = document.getElementById('leave-insight-low-bal-list'); if(lbList) lbList.innerHTML = lowBalHtml || '<div class="text-muted" style="font-size: 11px;">All healthy</div>';

    // Print Header Setup
    const activeUser = window.currentUser || JSON.parse(localStorage.getItem('current_user')) || {name: 'Admin'};
    const printStartStr = new Date(start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    const printEndStr = new Date(end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    const printSubtitle = document.getElementById('print-subtitle-admin-report-leave');
    if(printSubtitle) {
        printSubtitle.innerText = `Date Range: ${printStartStr} - ${printEndStr} | Department: ${dept} | Status: ${status} | Generated By: ${activeUser.name}`;
    }
}


function resetLeaveSummaryFilters() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const startStr = firstDay.getFullYear() + '-' + String(firstDay.getMonth() + 1).padStart(2, '0') + '-01';
    const endStr = lastDay.getFullYear() + '-' + String(lastDay.getMonth() + 1).padStart(2, '0') + '-' + String(lastDay.getDate()).padStart(2, '0');
    
    if(document.getElementById('admin-rep-leave-start')) document.getElementById('admin-rep-leave-start').value = startStr;
    if(document.getElementById('admin-rep-leave-end')) document.getElementById('admin-rep-leave-end').value = endStr;
    if(document.getElementById('admin-rep-leave-dept')) document.getElementById('admin-rep-leave-dept').value = 'All';
    if(document.getElementById('admin-rep-leave-emp')) {
        const el = document.getElementById('admin-rep-leave-emp');
        el.value = 'All';
        if(window.jQuery) $(el).trigger('change.select2');
    }
    
    if(document.getElementById('admin-rep-leave-status')) document.getElementById('admin-rep-leave-status').value = 'All';
    if(document.getElementById('admin-rep-leave-shift')) document.getElementById('admin-rep-leave-shift').value = 'All';
    
    if(window.generateAdminReport) window.generateAdminReport('leave');
}

window.openEmployeeLeaveModal = function(empId) {
    const db = typeof getDb === 'function' ? getDb() : (window.db || {});
    if (!db.users) return;
    const emp = db.users.find(u => u.id == empId || u.employeeId == empId);
    if (!emp) return;
    
    document.getElementById('emp-leave-detail-id').innerText = 'EMP-' + emp.id;
    document.getElementById('emp-leave-detail-name').innerText = emp.name;
    document.getElementById('emp-leave-detail-dept').innerText = emp.department || 'N/A';
    document.getElementById('emp-leave-detail-desig').innerText = emp.designation || 'N/A';
    document.getElementById('emp-leave-detail-manager').innerText = emp.manager || 'N/A';
    
    let casual = 0, medical = 0, annual = 0, unpaid = 0;
    let historyHtml = '';
    
    const reqs = (db.leaves || []).filter(r => r.employeeId == emp.id);
    reqs.forEach(r => {
        const lType = r.type || r.leaveType;
        
        let fromDate = r.startDate || r.fromDate || r.date || '-';
        let toDate = r.endDate || r.toDate || r.date || '-';
        let calculatedDays = r.days;
        if(!calculatedDays) {
            if(fromDate !== '-' && toDate !== '-') {
                const diffTime = Math.abs(new Date(toDate) - new Date(fromDate));
                calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            } else {
                calculatedDays = 1;
            }
        }
        
        if (r.status === 'Approved') {
            const typeStr = String(lType).toLowerCase();
            if (typeStr.includes('casual')) casual += calculatedDays;
            else if (typeStr.includes('medical')) medical += calculatedDays;
            else if (typeStr.includes('annual')) annual += calculatedDays;
            else unpaid += calculatedDays;
        }
        
        const sc = r.status === 'Approved' ? 'success' : (r.status === 'Pending' ? 'warning' : 'danger');
        historyHtml += `<tr>
            <td>${lType || '-'}</td>
            <td>${fromDate}</td>
            <td>${toDate}</td>
            <td>${calculatedDays}</td>
            <td><span class="badge bg-${sc}">${r.status}</span></td>
            <td>${r.reason || '-'}</td>
        </tr>`;
    });
    
    document.getElementById('emp-leave-detail-casual').innerText = casual;
    document.getElementById('emp-leave-detail-medical').innerText = medical;
    document.getElementById('emp-leave-detail-annual').innerText = annual;
    document.getElementById('emp-leave-detail-unpaid').innerText = unpaid;
    
    let allocated = { casual: 10, medical: 8, annual: 14 };
    if (db.companyProfile && Array.isArray(db.companyProfile.leaveTypes)) {
        const getGlb = (k) => { let match = db.companyProfile.leaveTypes.find(lt => String(lt.name||lt.id||'').toLowerCase().includes(k)); return match ? parseInt(match.days) : null; };
        let gc = getGlb('casual'); if(gc !== null && !isNaN(gc)) allocated.casual = gc;
        let gm = getGlb('medical'); if(gm !== null && !isNaN(gm)) allocated.medical = gm;
        let ga = getGlb('annual'); if(ga !== null && !isNaN(ga)) allocated.annual = ga;
    }
    if ((emp.hasCustomLeaveBalances === true || String(emp.hasCustomLeaveBalances) === 'true') && Array.isArray(emp.leaveBalances)) {
        let cId = 'L1', mId = 'L2', aId = 'L3';
        if (db.companyProfile && Array.isArray(db.companyProfile.leaveTypes)) {
            let clt = db.companyProfile.leaveTypes.find(lt => String(lt.name).toLowerCase().includes('casual'));
            if (clt) cId = clt.id;
            let mlt = db.companyProfile.leaveTypes.find(lt => String(lt.name).toLowerCase().includes('medical'));
            if (mlt) mId = mlt.id;
            let alt = db.companyProfile.leaveTypes.find(lt => String(lt.name).toLowerCase().includes('annual'));
            if (alt) aId = alt.id;
        }

        const getBal = (k, gId, idx) => {
            let match = emp.leaveBalances.find((b, i) => {
                let nm = String(b.name || b.leaveType || b.type || b.leave_type || b.title || '');
                if (nm.toLowerCase().includes(k)) return true;
                if (b.id && String(b.id) === String(gId)) return true;
                if (i === idx) return true;
                return false;
            });
            return match ? parseInt(typeof match.total !== 'undefined' ? match.total : match.balance) : null;
        };
        let c = getBal('casual', cId, 0); if(c !== null && !isNaN(c)) allocated.casual = c;
        let m = getBal('medical', mId, 1); if(m !== null && !isNaN(m)) allocated.medical = m;
        let a = getBal('annual', aId, 2); if(a !== null && !isNaN(a)) allocated.annual = a;
    }
    
    let bal = (allocated.casual - casual) + (allocated.medical - medical) + (allocated.annual - annual);
    document.getElementById('emp-leave-detail-balance').innerText = bal + ' Days';
    document.getElementById('emp-leave-detail-history').innerHTML = historyHtml || '<tr><td colspan="6" class="text-center text-muted">No history</td></tr>';
    
    document.getElementById('modal-employee-leave-detail').classList.remove('hidden');
};




// ==========================================
// PAYROLL REPORTS & ANALYTICS MODULE
// ==========================================

window.switchPayrollTab = function(tabId) {
    document.querySelectorAll('.payroll-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.payroll-tab-btn[data-tab="' + tabId + '"]').classList.add('active');
    
    document.querySelectorAll('.payroll-tab-content').forEach(content => content.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
};

window.generatePayrollReport = function() {
    if(typeof generateAdminPayrollReport === 'function') {
        const db = typeof getDb === 'function' ? getDb() : (window.db || {});
        generateAdminPayrollReport(db);
    }
};

window.resetPayrollFilters = function() {
    if(document.getElementById('payroll-filter-month')) document.getElementById('payroll-filter-month').value = 'All';
    if(document.getElementById('payroll-filter-year')) document.getElementById('payroll-filter-year').value = new Date().getFullYear().toString();
    if(document.getElementById('payroll-filter-dept')) document.getElementById('payroll-filter-dept').value = 'All';
    if(document.getElementById('payroll-filter-emp')) document.getElementById('payroll-filter-emp').value = 'All';
    if(document.getElementById('payroll-filter-status')) document.getElementById('payroll-filter-status').value = 'All';
    window.generatePayrollReport();
};

let payrollTrendChartInst = null;
let payrollDistChartInst = null;

function generateAdminPayrollReport(db) {
    // 1. Get Filters
    const month = document.getElementById('payroll-filter-month') ? document.getElementById('payroll-filter-month').value : 'All';
    const year = document.getElementById('payroll-filter-year') ? document.getElementById('payroll-filter-year').value : new Date().getFullYear().toString();
    const dept = document.getElementById('payroll-filter-dept') ? document.getElementById('payroll-filter-dept').value : 'All';
    const empFilter = document.getElementById('payroll-filter-emp') ? document.getElementById('payroll-filter-emp').value : 'All';
    const status = document.getElementById('payroll-filter-status') ? document.getElementById('payroll-filter-status').value : 'All';

    // Populate dropdowns if empty
    const deptDropdown = document.getElementById('payroll-filter-dept');
    if(deptDropdown && deptDropdown.options.length <= 1) {
        const uniqueDepts = [...new Set(db.users.map(u => u.department).filter(Boolean))];
        uniqueDepts.forEach(d => deptDropdown.insertAdjacentHTML('beforeend', `<option value="${d}">${d}</option>`));
    }
    const empDropdown = document.getElementById('payroll-filter-emp');
    if(empDropdown && empDropdown.options.length <= 1) {
        db.users.forEach(u => empDropdown.insertAdjacentHTML('beforeend', `<option value="${u.id}">${u.name}</option>`));
    }

    // 2. Extract Data from actual database (db.payrollHistory)
    let payrollData = [];
    const history = db.payrollHistory || [];
    
    history.forEach(record => {
        let rDate = new Date(record.startDate || record.processedAt);
        let rMonth = rDate.getMonth() + 1;
        let rYear = rDate.getFullYear();
        
        if (month !== 'All' && rMonth !== parseInt(month)) return;
        if (year !== 'All' && rYear !== parseInt(year)) return;
        
        let user = db.users.find(u => String(u.id) === String(record.userId)) || {};
        
        if (dept !== 'All' && user.department !== dept) return;
        if (empFilter !== 'All' && String(user.id) !== String(empFilter)) return;
        
        let pStatus = 'Paid'; // History records are already processed/paid
        if (status !== 'All' && pStatus !== status) return;
        
        let basic = parseFloat(user.salary) || 0;
        let allowances = parseFloat(record.fixedAllowances) || 0;
        let hra = Math.floor(allowances * 0.5);
        let med = Math.floor(allowances * 0.3);
        let trans = Math.floor(allowances * 0.1);
        let otherAllw = allowances - (hra + med + trans);
        
        let overtime = parseFloat(record.otPay) || 0;
        let bonus = parseFloat(record.bonus) || 0;
        
        let taxDed = parseFloat(record.fixedDeductions) || 0;
        let absentDed = parseFloat(record.absencyDeduction) || 0;
        let loanDed = parseFloat(record.loanDeduction) || 0;
        let otherDed = parseFloat(record.otherDeduction) || 0;
        let deductions = taxDed + absentDed + loanDed + otherDed;
        
        let gross = basic + allowances + overtime + bonus;
        let net = parseFloat(record.netPay) || 0;
        
        payrollData.push({
            id: user.id || record.userId, name: user.name || 'Unknown', dept: user.department || 'N/A', desig: user.designation || 'N/A',
            joinDate: user.startDate || 'N/A', photo: user.profilePic || user.profileImageBase64 || user.photo || user.profilePhoto || '', profilePic: user.profilePic, profileImageBase64: user.profileImageBase64, basic: basic,
            hra: hra, med: med, trans: trans, otherAllw: otherAllw, allowances: allowances,
            overtime: overtime, bonus: bonus, gross: gross,
            lateDed: 0, absentDed: absentDed, loanDed: loanDed, taxDed: taxDed, otherDed: otherDed, deductions: deductions, net: net,
            status: pStatus, month: rMonth, year: rYear
        });
    });

    const totalEmp = payrollData.length;
    const processed = payrollData.filter(p => p.status === 'Paid').length;
    const pending = 0; // History only contains processed payrolls
    const totalGross = payrollData.reduce((sum, p) => sum + p.gross, 0);
    const totalDed = payrollData.reduce((sum, p) => sum + p.deductions, 0);
    const totalNet = payrollData.reduce((sum, p) => sum + p.net, 0);

    if(document.getElementById('pr-card-emp')) document.getElementById('pr-card-emp').innerText = totalEmp;
    if(document.getElementById('pr-card-processed')) document.getElementById('pr-card-processed').innerText = processed;
    if(document.getElementById('pr-card-pending')) document.getElementById('pr-card-pending').innerText = pending;
    if(document.getElementById('pr-card-gross')) document.getElementById('pr-card-gross').innerText = 'Rs. ' + totalGross.toLocaleString();
    if(document.getElementById('pr-card-deductions')) document.getElementById('pr-card-deductions').innerText = 'Rs. ' + totalDed.toLocaleString();
    if(document.getElementById('pr-card-net')) document.getElementById('pr-card-net').innerText = 'Rs. ' + totalNet.toLocaleString();

    window._currentPayrollData = payrollData;

    let summaryHtml = '';
    let registerHtml = '';
    let breakHtml = '';
    
    if(payrollData.length === 0) {
        summaryHtml = '<tr><td colspan="10" class="text-center text-muted py-4">No payroll data found.</td></tr>';
        registerHtml = summaryHtml;
        breakHtml = summaryHtml;
    } else {
        payrollData.forEach((p, idx) => {
            let statusBadge = p.status === 'Paid' ? `<span class="badge bg-success bg-opacity-10 text-success">Paid</span>` :
                              p.status === 'Processing' ? `<span class="badge bg-warning bg-opacity-10 text-warning">Processing</span>` :
                              p.status === 'Pending' ? `<span class="badge bg-secondary bg-opacity-10 text-secondary">Pending</span>` :
                              `<span class="badge bg-danger bg-opacity-10 text-danger">On Hold</span>`;

            summaryHtml += `<tr style="cursor:pointer; transition: all 0.2s;" onclick="viewPayrollDetail('${p.id}')" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                <td>${p.id}</td>
                <td style="font-weight: 600;">${p.name}</td>
                <td>${p.dept}</td>
                <td class="text-end">${p.basic.toLocaleString()}</td>
                <td class="text-end">${p.allowances.toLocaleString()}</td>
                <td class="text-end">${p.overtime.toLocaleString()}</td>
                <td class="text-end">${p.bonus.toLocaleString()}</td>
                <td class="text-end" style="background: rgba(59, 130, 246, 0.05); font-weight: 600;">${p.gross.toLocaleString()}</td>
                <td class="text-end text-danger">${p.deductions.toLocaleString()}</td>
                <td class="text-end" style="background: rgba(16, 185, 129, 0.05); color: #10b981; font-weight: 700;">${p.net.toLocaleString()}</td>
                
            </tr>`;

            let mName = new Date(p.year, p.month - 1).toLocaleString('default', { month: 'short' });
            registerHtml += `<tr>
                <td>${mName} ${p.year}</td>
                <td>${p.id}</td>
                <td style="font-weight: 600;">${p.name}</td>
                <td>${p.dept}</td>
                <td class="text-end">${p.gross.toLocaleString()}</td>
                <td class="text-end text-danger">${p.deductions.toLocaleString()}</td>
                <td class="text-end text-success" style="font-weight:700;">${p.net.toLocaleString()}</td>
                <td>${p.status==='Paid' ? '28-'+mName+'-'+p.year : '-'}</td>
                <td>${statusBadge}</td>
                <td>System Auto</td>
            </tr>`;

            breakHtml += `<tr>
                <td style="font-weight: 600;">${p.name}</td>
                <td class="text-end">${p.basic.toLocaleString()}</td>
                <td class="text-end">${p.hra.toLocaleString()}</td>
                <td class="text-end">${p.med.toLocaleString()}</td>
                <td class="text-end">${p.trans.toLocaleString()}</td>
                <td class="text-end">${p.otherAllw.toLocaleString()}</td>
                <td class="text-end">${p.overtime.toLocaleString()}</td>
                <td class="text-end">${p.bonus.toLocaleString()}</td>
                <td class="text-end" style="background: rgba(59, 130, 246, 0.05); font-weight: 600;">${p.gross.toLocaleString()}</td>
                <td class="text-end text-danger">${p.deductions.toLocaleString()}</td>
                <td class="text-end" style="background: rgba(16, 185, 129, 0.05); color: #10b981; font-weight: 700;">${p.net.toLocaleString()}</td>
            </tr>`;
        });
    }

    if(document.getElementById('tbody-payroll-summary')) document.getElementById('tbody-payroll-summary').innerHTML = summaryHtml;
    if(document.getElementById('tbody-payroll-register')) document.getElementById('tbody-payroll-register').innerHTML = registerHtml;
    if(document.getElementById('tbody-salary-breakdown')) document.getElementById('tbody-salary-breakdown').innerHTML = breakHtml;

    let deptMap = {};
    payrollData.forEach(p => {
        if(!deptMap[p.dept]) deptMap[p.dept] = { emp:0, gross:0, ded:0, net:0 };
        deptMap[p.dept].emp++;
        deptMap[p.dept].gross += p.gross;
        deptMap[p.dept].ded += p.deductions;
        deptMap[p.dept].net += p.net;
    });
    
    let deptHtml = '';
    for(let d in deptMap) {
        let avg = deptMap[d].gross / deptMap[d].emp;
        deptHtml += `<tr>
            <td>${d}</td>
            <td class="text-center">${deptMap[d].emp}</td>
            <td class="text-end">${deptMap[d].gross.toLocaleString()}</td>
            <td class="text-end text-danger">${deptMap[d].ded.toLocaleString()}</td>
            <td class="text-end text-success">${deptMap[d].net.toLocaleString()}</td>
            <td class="text-end">${avg.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
        </tr>`;
    }
    if(document.getElementById('tbody-dept-analysis')) document.getElementById('tbody-dept-analysis').innerHTML = deptHtml;
    if(document.getElementById('tfoot-dept-analysis')) {
        let tfoot = `<tr>
            <td>Total</td>
            <td class="text-center">${totalEmp}</td>
            <td class="text-end">${totalGross.toLocaleString()}</td>
            <td class="text-end text-danger">${totalDed.toLocaleString()}</td>
            <td class="text-end text-success">${totalNet.toLocaleString()}</td>
            <td class="text-end">${totalEmp > 0 ? (totalGross/totalEmp).toLocaleString(undefined, {maximumFractionDigits:0}) : 0}</td>
        </tr>`;
        document.getElementById('tfoot-dept-analysis').innerHTML = tfoot;
    }

    renderPayrollCharts(payrollData, db);
    renderPayrollInsights(payrollData);
}

function renderPayrollCharts(data, db) {
    if(!window.Chart) return;
    
    let ranges = { '< 30k': 0, '30k - 50k': 0, '50k - 100k': 0, '> 100k': 0 };
    data.forEach(p => {
        if(p.gross < 30000) ranges['< 30k']++;
        else if(p.gross <= 50000) ranges['30k - 50k']++;
        else if(p.gross <= 100000) ranges['50k - 100k']++;
        else ranges['> 100k']++;
    });
    
    const ctxDist = document.getElementById('payrollDistributionChart');
    if(ctxDist) {
        if(payrollDistChartInst) payrollDistChartInst.destroy();
        payrollDistChartInst = new Chart(ctxDist, {
            type: 'doughnut',
            data: {
                labels: Object.keys(ranges),
                datasets: [{
                    data: Object.values(ranges),
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
                    borderWidth: 0
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
    }

    const ctxTrend = document.getElementById('payrollTrendChart');
    if(ctxTrend) {
        if(payrollTrendChartInst) payrollTrendChartInst.destroy();
        
        let months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let gData = Array(12).fill(0);
        let nData = Array(12).fill(0);
        let dData = Array(12).fill(0);
        
        // Ensure trend chart shows all data for the selected year, not just the selected month filter!
        // We need to fetch from db.payrollHistory directly for the trend chart to ignore the month filter.
        const year = document.getElementById('payroll-filter-year') ? document.getElementById('payroll-filter-year').value : new Date().getFullYear().toString();
        const dept = document.getElementById('payroll-filter-dept') ? document.getElementById('payroll-filter-dept').value : 'All';
        const empFilter = document.getElementById('payroll-filter-emp') ? document.getElementById('payroll-filter-emp').value : 'All';

        const history = db ? (db.payrollHistory || []) : [];
        history.forEach(record => {
            let rDate = new Date(record.startDate || record.processedAt);
            let rMonth = rDate.getMonth(); // 0-11
            let rYear = rDate.getFullYear();
            
            if (year !== 'All' && rYear !== parseInt(year)) return;
            
            let user = db.users.find(u => String(u.id) === String(record.userId)) || {};
            if (dept !== 'All' && user.department !== dept) return;
            if (empFilter !== 'All' && String(user.id) !== String(empFilter)) return;
            
            let basic = parseFloat(user.salary) || 0;
            let allowances = parseFloat(record.fixedAllowances) || 0;
            let overtime = parseFloat(record.otPay) || 0;
            let bonus = parseFloat(record.bonus) || 0;
            let gross = basic + allowances + overtime + bonus;
            
            let taxDed = parseFloat(record.fixedDeductions) || 0;
            let absentDed = parseFloat(record.absencyDeduction) || 0;
            let loanDed = parseFloat(record.loanDeduction) || 0;
            let otherDed = parseFloat(record.otherDeduction) || 0;
            let deductions = taxDed + absentDed + loanDed + otherDed;
            
            let net = parseFloat(record.netPay) || 0;

            if (rMonth >= 0 && rMonth < 12) {
                gData[rMonth] += gross;
                nData[rMonth] += net;
                dData[rMonth] += deductions;
            }
        });

        payrollTrendChartInst = new Chart(ctxTrend, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    { type: 'line', label: 'Gross Salary', data: gData, borderColor: '#3b82f6', backgroundColor: '#3b82f6', tension: 0.3 },
                    { type: 'bar', label: 'Net Salary', data: nData, backgroundColor: '#10b981' },
                    { type: 'bar', label: 'Deductions', data: dData, backgroundColor: '#ef4444' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    }
}
function renderPayrollInsights(data) {
    if(data.length === 0) return;
    
    let highestSalary = data.reduce((max, p) => p.gross > max.gross ? p : max, data[0]);
    let highestOvertime = data.reduce((max, p) => p.overtime > max.overtime ? p : max, data[0]);
    let highestDed = data.reduce((max, p) => p.deductions > max.deductions ? p : max, data[0]);
    let onHold = data.filter(p => p.status === 'On Hold').length;
    
    let html = `
        <div class="col">
            <div class="premium-card p-2 h-100 d-flex flex-column justify-content-center align-items-start" style="margin-bottom:0; min-height: 80px;">
                
                <div style="overflow: hidden;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 500;">Highest Salary</div>
                    <div style="font-weight: 600; font-size: 13px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${highestSalary.name}</div>
                    <div style="font-weight: 700; font-size: 14px; color: #10b981;">Rs. ${highestSalary.gross.toLocaleString()}</div>
                </div>
            </div>
        </div>
        <div class="col">
            <div class="premium-card p-2 h-100 d-flex flex-column justify-content-center align-items-start" style="margin-bottom:0; min-height: 80px;">
                
                <div style="overflow: hidden;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 500;">Highest Overtime</div>
                    <div style="font-weight: 600; font-size: 13px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${highestOvertime.name}</div>
                    <div style="font-weight: 700; font-size: 14px; color: #3b82f6;">Rs. ${highestOvertime.overtime.toLocaleString()}</div>
                </div>
            </div>
        </div>
        <div class="col">
            <div class="premium-card p-2 h-100 d-flex flex-column justify-content-center align-items-start" style="margin-bottom:0; min-height: 80px;">
                
                <div style="overflow: hidden;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 500;">Highest Deductions</div>
                    <div style="font-weight: 600; font-size: 13px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${highestDed.name}</div>
                    <div style="font-weight: 700; font-size: 14px; color: #ef4444;">Rs. ${highestDed.deductions.toLocaleString()}</div>
                </div>
            </div>
        </div>
        <div class="col">
            <div class="premium-card p-2 h-100 d-flex flex-column justify-content-center align-items-start" style="margin-bottom:0; min-height: 80px;">
                
                <div style="overflow: hidden;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 500;">Employees On Hold</div>
                      <div style="font-weight: 600; font-size: 13px; color: transparent;">-</div>
                    <div style="font-weight: 700; font-size: 16px; margin-top: 4px; color: #f59e0b;">${onHold} Emp</div>
                </div>
            </div>
        </div>
    `;
    if(document.getElementById('payroll-insights-horizontal-container')) document.getElementById('payroll-insights-horizontal-container').innerHTML = html;
}

window.viewPayrollDetail = function(empId) {
    let data = window._currentPayrollData || [];
    let emp = data.find(p => p.id === empId);
    if(!emp) { alert('Data mismatch. Employee ID: ' + empId); return; }

    document.getElementById('panel-emp-name').innerText = emp.name;
    document.getElementById('panel-emp-id').innerText = emp.id;
    document.getElementById('panel-emp-dept').innerText = emp.dept;
    
    document.getElementById('panel-emp-desig').innerText = emp.desig;
    document.getElementById('panel-emp-join').innerText = emp.joinDate;
    
    let profileImage = emp.profilePic || emp.profileImageBase64 || emp.photo;
    try {
        let cu = JSON.parse(localStorage.getItem('current_user'));
        if (!profileImage && cu && String(emp.id) === String(cu.id)) {
            profileImage = cu.profilePic || cu.profileImageBase64 || cu.photo;
        }
    } catch(e) {}
    let imgHtml = profileImage 
        ? `<img src="${profileImage}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` 
        : `<img src="https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=e2e8f0&color=475569" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    document.getElementById('panel-emp-img').innerHTML = imgHtml;

    document.getElementById('panel-basic').innerText = emp.basic.toLocaleString();
    document.getElementById('panel-hra').innerText = emp.hra.toLocaleString();
    document.getElementById('panel-medical').innerText = emp.med.toLocaleString();
    document.getElementById('panel-transport').innerText = emp.trans.toLocaleString();
    document.getElementById('panel-other-allow').innerText = emp.otherAllw.toLocaleString();
    document.getElementById('panel-overtime').innerText = emp.overtime.toLocaleString();
    document.getElementById('panel-bonus').innerText = emp.bonus.toLocaleString();
    document.getElementById('panel-gross').innerText = emp.gross.toLocaleString();

    document.getElementById('panel-late-ded').innerText = emp.lateDed.toLocaleString();
    document.getElementById('panel-absent-ded').innerText = emp.absentDed.toLocaleString();
    document.getElementById('panel-loan-ded').innerText = emp.loanDed.toLocaleString();
    document.getElementById('panel-tax-ded').innerText = emp.taxDed.toLocaleString();
    document.getElementById('panel-other-ded').innerText = emp.otherDed.toLocaleString();
    document.getElementById('panel-total-ded').innerText = emp.deductions.toLocaleString();

    document.getElementById('panel-net').innerText = emp.net.toLocaleString();

    

    
    
};

window.closePayrollPanel = function() {
    document.getElementById('payroll-slide-panel').classList.remove('open');
    document.getElementById('payroll-panel-overlay').classList.add('hidden');
};

window.printPayrollReport = function() {
    let printArea = document.getElementById('print-area-admin-payroll');
    if(!printArea) return;
    
    let m = document.getElementById('payroll-filter-month').value;
    let y = document.getElementById('payroll-filter-year').value;
    let d = document.getElementById('payroll-filter-dept').value;

    let mName = m === 'All' ? 'All Months' : new Date(y, parseInt(m) - 1).toLocaleString('default', { month: 'long' });
    let subtitle = `Period: ${mName} ${y} | Department: ${d}`;

    let html = `
        <div class="print-header hidden">
            <h2>Payroll Report</h2>
            <p id="print-subtitle-admin-payroll">${subtitle}</p>
        </div>
        <div class="table-container" style="margin-bottom: 30px;">
            ${document.getElementById('table-payroll-summary').outerHTML}
        </div>
    `;
    printArea.innerHTML = html;
    
    if (window.printReport) {
        window.printReport('admin-payroll');
    } else {
        document.body.classList.add('printing-report');
        window.print();
        setTimeout(() => {
            document.body.classList.remove('printing-report');
            printArea.innerHTML = '';
        }, 1000);
    }
};

window.exportPayrollExcel = function() {
    let table = document.getElementById('table-payroll-summary');
    if(!table) return;
    
    let html = table.outerHTML;
    let url = 'data:application/vnd.ms-excel;charset=utf-8,' + encodeURIComponent(html);
    let link = document.createElement('a');
    link.href = url;
    link.download = 'Payroll_Report.xls';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


// ==================== TASKS & PRODUCTIVITY REPORT LOGIC ====================

window.switchProdTab = function(tabId) {
    document.querySelectorAll('.prod-dash-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.prod-tab-content').forEach(c => c.classList.add('hidden'));
    
    document.getElementById('tab-btn-prod-' + tabId).classList.add('active');
    document.getElementById('prod-tab-' + tabId).classList.remove('hidden');
};

let prodStatusChartInstance = null;
window.prodActualData = []; // Store globally for modal access

window.generateAdminProductivityReport = function(db) {
    db = typeof getDb === "function" ? getDb() : (window.db || window.hrmsDatabase || {});
    
    // Populate Department Filter if empty
    const deptSelect = document.getElementById('admin-rep-prod-dept');
    if (deptSelect && deptSelect.options.length <= 1) {
        const prodSettings = typeof getProdSettings === 'function' ? getProdSettings() : (db.productivityCategories || { businessUnits: [] });
        (prodSettings.businessUnits || []).forEach(bu => {
            const opt = document.createElement('option');
            opt.value = bu.name;
            opt.innerText = bu.name;
            deptSelect.appendChild(opt);
        });
    }

    // Populate Employee Filter if empty
    const empSelect = document.getElementById('admin-rep-prod-emp');
    if (empSelect && empSelect.options.length <= 1) {
        (db.users || []).forEach(u => {
            if(u.role !== 'Admin') {
                const opt = document.createElement('option');
                opt.value = u.id;
                opt.innerText = u.name;
                empSelect.appendChild(opt);
            }
        });
    }

    // Get filter values
    const startInput = document.getElementById('admin-rep-prod-start');
    const endInput = document.getElementById('admin-rep-prod-end');
    const startDate = startInput ? startInput.value : '';
    const endDate = endInput ? endInput.value : '';
    
    const empInput = document.getElementById('admin-rep-prod-emp');
    const selectedEmp = empInput ? empInput.value : 'All';
    
    const deptInput = document.getElementById('admin-rep-prod-dept');
    const selectedDept = deptInput ? deptInput.value : 'All';

    let filteredUsers = db.users || [];
    if(selectedEmp !== 'All' && selectedEmp !== '') filteredUsers = filteredUsers.filter(u => u.id === selectedEmp);
    if(selectedDept !== 'All' && selectedDept !== '') filteredUsers = filteredUsers.filter(u => u.department === selectedDept);

    let allProductivity = db.productivity || [];
    if (startDate) allProductivity = allProductivity.filter(p => p.date >= startDate);
    if (endDate) allProductivity = allProductivity.filter(p => p.date <= endDate);

    const actualData = [];
    let globalTotal = 0, globalCompleted = 0, globalPending = 0, globalOverdue = 0;
    const allTaskRows = [];

    filteredUsers.forEach(user => {
        if(user.role === 'Admin') return;
        
        const userTasks = allProductivity.filter(p => (p.employee_id === user.id || p.employeeId === user.id));
        
        const totalAssigned = userTasks.length || 0;
        const completed = userTasks.filter(p => p.status === 'Approved').length;
        const pending = userTasks.filter(p => p.status === 'Pending').length;
        const overdue = userTasks.filter(p => p.status === 'Rejected').length;

        globalTotal += totalAssigned;
        globalCompleted += completed;
        globalPending += pending;
        globalOverdue += overdue;

        const compPct = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;
        
        let statusText = 'Needs Improvement';
        let statusClass = 'prod-badge-poor';
        if (compPct >= 90) { statusText = 'Good'; statusClass = 'prod-badge-good'; }
        else if (compPct >= 70) { statusText = 'Average'; statusClass = 'prod-badge-avg'; }
        else if (totalAssigned === 0) { statusText = 'No Tasks'; statusClass = 'prod-badge-avg'; }

        actualData.push({
            name: user.name || 'Unknown',
            empId: user.id,
            dept: user.department || 'N/A',
            mgr: user.managerId || 'N/A',
            assigned: totalAssigned,
            completed: completed,
            pending: pending,
            overdue: overdue,
            compPct: compPct,
            status: statusText,
            statusClass: statusClass,
            tasks: userTasks
        });

        userTasks.forEach(t => {
            allTaskRows.push({
                id: t.id || 'TSK-'+Math.floor(Math.random()*1000),
                name: t.description || 'Productivity Log',
                empName: user.name || 'Unknown',
                empId: user.id,
                dept: user.department || 'N/A',
                priority: 'Normal',
                date: t.date,
                status: t.status
            });
        });
    });

    window.prodActualData = actualData;

    // Update Summary Cards
    const elSumTot = document.getElementById('prod-sum-total');
    if (elSumTot) elSumTot.innerText = globalTotal;
    
    const elSumComp = document.getElementById('prod-sum-completed');
    if (elSumComp) elSumComp.innerText = globalCompleted;
    
    const elSumPend = document.getElementById('prod-sum-pending');
    if (elSumPend) elSumPend.innerText = globalPending;
    
    const elSumOver = document.getElementById('prod-sum-overdue');
    if (elSumOver) elSumOver.innerText = globalOverdue;
    
    const pctComp = document.getElementById('prod-pct-completed');
    if (pctComp) pctComp.innerText = globalTotal > 0 ? Math.round((globalCompleted/globalTotal)*100)+'%' : '0%';
    
    const pctPend = document.getElementById('prod-pct-pending');
    if (pctPend) pctPend.innerText = globalTotal > 0 ? Math.round((globalPending/globalTotal)*100)+'%' : '0%';
    
    const pctOver = document.getElementById('prod-pct-overdue');
    if (pctOver) pctOver.innerText = globalTotal > 0 ? Math.round((globalOverdue/globalTotal)*100)+'%' : '0%';

    // Populate Overview Table
    const tbody = document.getElementById('prod-tbody-overview');
    if (tbody) {
        tbody.innerHTML = '';
        if(actualData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">No data found</td></tr>`;
        } else {
            actualData.forEach((row, index) => {
                let barColor = row.compPct >= 90 ? '#22c55e' : (row.compPct >= 70 ? '#f59e0b' : '#ef4444');
                let initial = row.name ? row.name.substring(0, 2).toUpperCase() : 'U';
                tbody.innerHTML += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div class="print-hide" style="width: 28px; height: 28px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #64748b;">${initial}</div>
                                <div>
                                    <div style="font-weight: 600; color: #0f172a; font-size: 13px;">${row.name}</div>
                                    <div style="font-size: 11px; color: #64748b;">${row.empId}</div>
                                </div>
                            </div>
                        </td>
                        <td class="text-center font-weight-bold">${row.assigned}</td>
                        <td class="text-center font-weight-bold" style="color:#22c55e">${row.completed}</td>
                        <td class="text-center font-weight-bold" style="color:#f59e0b">${row.pending}</td>
                        <td class="text-center font-weight-bold" style="color:#ef4444">${row.overdue}</td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-weight: 700; font-size: 12px; width: 35px;">${row.compPct}%</span>
                                <div class="prod-progress-wrapper print-hide">
                                    <div class="prod-progress-bg"><div class="prod-progress-bar" style="width: ${row.compPct}%; background: ${barColor};"></div></div>
                                </div>
                            </div>
                        </td>
                        <td class="text-center"><span class="prod-badge ${row.statusClass} print-plain">${row.status}</span></td>
                        <td class="text-center print-hide">
                            <button type="button" class="prod-action-btn" data-empid="${row.empId}" onclick="if(window.viewProductivityDetails) { window.viewProductivityDetails('${row.empId}'); } else { alert('Wait for scripts to load'); }"><i class="fa-regular fa-eye"></i> View Details</button>
                        </td>
                    </tr>
                `;
            });
        }
    }

    // Populate Top Performers
    const topPerfContainer = document.getElementById('prod-top-performers');
    if (topPerfContainer) {
        topPerfContainer.innerHTML = '';
        const sortedPerf = [...actualData].sort((a,b) => b.compPct - a.compPct).slice(0,5);
        if(sortedPerf.length === 0) topPerfContainer.innerHTML = `<div class="text-muted text-center" style="font-size:12px;">No data</div>`;
        sortedPerf.forEach((row, index) => {
            let barColor = row.compPct >= 90 ? '#22c55e' : (row.compPct >= 70 ? '#f59e0b' : '#ef4444');
            topPerfContainer.innerHTML += `
                <div class="prod-rank-item">
                    <div class="prod-rank-num">${index + 1}</div>
                    <div class="prod-rank-name">${row.name}</div>
                    <div class="prod-rank-bar">
                        <div class="prod-progress-bg"><div class="prod-progress-bar" style="width: ${row.compPct}%; background: ${barColor};"></div></div>
                    </div>
                    <div class="prod-rank-val">${row.compPct}%</div>
                </div>
            `;
        });
        // View All link removed per user request
    }

    // Populate Attention Required
    const attReqContainer = document.getElementById('prod-attention-required');
    if (attReqContainer) {
        attReqContainer.innerHTML = '';
        const attData = actualData.filter(r => r.pending > 0 || r.overdue > 0).sort((a,b) => (b.pending + b.overdue) - (a.pending + a.overdue)).slice(0,3);
        if(attData.length === 0) attReqContainer.innerHTML = `<div class="text-muted text-center" style="font-size:12px;">All good!</div>`;
        attData.forEach((row, index) => {
            attReqContainer.innerHTML += `
                <div class="prod-warn-item">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div class="prod-rank-num">${index + 1}</div>
                        <div class="prod-warn-name">${row.name}</div>
                    </div>
                    <div class="prod-warn-badge">${row.pending} Pending / ${row.overdue} Overdue</div>
                </div>
            `;
        });
        // View All link removed per user request
    }

    // Initialize Chart
    const ctx = document.getElementById('prodStatusChart');
    if (ctx && typeof Chart !== 'undefined') {
        if (prodStatusChartInstance) {
            prodStatusChartInstance.destroy();
        }
        
        const chartCen = document.getElementById('prod-chart-center-val');
        if (chartCen) chartCen.innerText = globalTotal;
        
        const lgComp = document.getElementById('prod-legend-comp');
        if (lgComp) lgComp.innerText = globalCompleted;
        
        const lgPend = document.getElementById('prod-legend-pend');
        if (lgPend) lgPend.innerText = globalPending;
        
        const lgOver = document.getElementById('prod-legend-over');
        if (lgOver) lgOver.innerText = globalOverdue;

        prodStatusChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'Pending', 'Overdue'],
                datasets: [{
                    data: [globalCompleted, globalPending, globalOverdue],
                    backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ' ' + context.label + ': ' + context.raw;
                            }
                        }
                    }
                }
            }
        });
    }

    // Populate Task Register Tab
    const tbReg = document.getElementById('prod-tbody-register');
    if(tbReg) {
        tbReg.innerHTML = '';
        if(allTaskRows.length === 0) {
            tbReg.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">No tasks found</td></tr>`;
        } else {
            allTaskRows.forEach(t => {
                let badgeClass = 'prod-badge-avg';
                let st = t.status || 'Pending';
                if(st === 'Approved') badgeClass = 'prod-badge-good';
                if(st === 'Rejected') badgeClass = 'prod-badge-poor';

                tbReg.innerHTML += `
                    <tr>
                        <td>${t.id}</td><td>${t.name}</td><td>${t.empName}</td><td>${t.dept}</td><td>${t.priority}</td><td>${t.date || '-'}</td><td>${t.date || '-'}</td>
                        <td class="text-center"><span class="prod-badge ${badgeClass}">${st}</span></td>
                        <td class="text-center print-hide"><button type="button" class="prod-action-btn" data-empid="${t.empId}" onclick="if(window.viewProductivityDetails) { window.viewProductivityDetails('${t.empId}'); }"><i class="fa-regular fa-eye"></i> View</button></td>
                    </tr>
                `;
            });
        }
    }

    // Populate Performance Tab
    const tbPerf = document.getElementById('prod-tbody-performance');
    if(tbPerf) {
        tbPerf.innerHTML = '';
        if(actualData.length === 0) {
            tbPerf.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No data found</td></tr>`;
        } else {
            actualData.forEach(row => {
                tbPerf.innerHTML += `
                    <tr>
                        <td><div style="font-weight: 600;">${row.name}</div><div style="font-size:11px; color:#64748b;">${row.empId}</div></td>
                        <td class="text-center">${row.assigned}</td>
                        <td class="text-center text-success">${row.completed}</td>
                        <td class="text-center text-warning">${row.pending}</td>
                        <td class="text-center text-danger">${row.overdue}</td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-weight: 700; font-size: 12px; width: 35px;">${row.compPct}%</span>
                                <div class="prod-progress-wrapper print-hide" style="max-width:80px;">
                                    <div class="prod-progress-bg"><div class="prod-progress-bar" style="width: ${row.compPct}%; background: #2563EB;"></div></div>
                                </div>
                            </div>
                        </td>
                        <td class="text-center font-weight-bold"><button type="button" class="prod-action-btn" data-empid="${row.empId}" onclick="if(window.viewProductivityDetails) { window.viewProductivityDetails('${row.empId}'); }"><i class="fa-regular fa-eye"></i> View</button></td>
                    </tr>
                `;
            });
        }
    }
};

// Bind click events using event delegation for robustness (Vanilla JS)
document.addEventListener('click', function(e) {
    let btn = e.target.closest('.prod-action-btn');
    if(btn) {
        e.preventDefault();
        let empid = btn.getAttribute('data-empid');
        console.log('View Details clicked for empId:', empid);
        if(empid && window.viewProductivityDetails) {
            window.viewProductivityDetails(empid);
        }
    }
});

window.viewProductivityDetails = function(empId) {
    try {
        const emp = (window.prodActualData || []).find(e => String(e.empId) === String(empId));
        if(!emp) { alert('Employee not found in data for ID: ' + empId); return; }
        
        let db = typeof window.getDb === "function" ? window.getDb() : (window.db || window.hrmsDatabase || {});
        let user = (db.users || []).find(u => String(u.id) === String(empId)) || {};

        // Dynamically create or find the popup
        let overlay = document.getElementById('prod-popup-overlay-dynamic');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'prod-popup-overlay-dynamic';
            overlay.style.cssText = 'display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.55); z-index: 99999999; align-items: center; justify-content: center;';
            overlay.innerHTML = `
                <div style="width: 1000px; max-width: 95vw; max-height: 90vh; background: #f8fafc; border-radius: 12px; font-family: 'Inter', sans-serif; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
                    
                    <!-- Header -->
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: var(--primary, #0c8297); border-bottom: none;">
                        <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff; font-family: 'Inter', sans-serif;">Employee Task Details</h3>
                        <button onclick="document.getElementById('prod-popup-overlay-dynamic').style.display = 'none';" style="background: transparent; border: none; font-size: 18px; color: #ffffff; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <!-- Scrollable Body -->
                    <div style="flex: 1; overflow-y: auto; padding: 24px;">
                        
                        <!-- Top Section: Profile and Task Summary -->
                        <div style="display: flex; gap: 24px; margin-bottom: 24px; flex-wrap: wrap;">
                            <!-- Profile Info -->
                            <div style="flex: 1; min-width: 300px; display: flex; gap: 20px; align-items: flex-start; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                                <!-- Avatar -->
                                <div id="dyn-popup-avatar-box" style="width: 80px; height: 80px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; color: #64748b; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                                   <div id="dyn-popup-initial">U</div>
                                </div>
                                <!-- Details -->
                                <div style="flex: 1;">
                                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                                        <h3 id="dyn-popup-name" style="margin: 0; font-size: 18px; color: #0f172a; font-weight: 700;">Employee Name</h3>
                                        <span style="background: #dcfce7; color: #16a34a; font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600;">Active</span>
                                    </div>
                                    <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; font-size: 13px; color: #475569;">
                                        <div style="color: #64748b; white-space: nowrap;">Employee ID :</div> <div id="dyn-popup-empid" style="font-weight: 500; color: #0f172a;">EMP-000</div>
                                        <div style="color: #64748b; white-space: nowrap;">Department :</div> <div id="dyn-popup-dept" style="font-weight: 500; color: #0f172a;">Department</div>
                                        <div style="color: #64748b; white-space: nowrap;">Designation :</div> <div id="dyn-popup-desig" style="font-weight: 500; color: #0f172a;">Designation</div>
                                        <div style="color: #64748b; white-space: nowrap;">Reporting To :</div> <div id="dyn-popup-mgr" style="font-weight: 500; color: #0f172a;">Manager</div>
                                        <div style="color: #64748b; white-space: nowrap;">Email :</div> <div id="dyn-popup-email" style="font-weight: 500; color: #0f172a; word-break: break-all;">email@company.com</div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Task Summary Box -->
                            <div style="flex: 1; min-width: 350px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                                <h4 style="margin: 0 0 20px 0; font-size: 14px; color: #0f172a; font-weight: 700;">Task Summary</h4>
                                <div style="display: flex; justify-content: space-between;">
                                    <div style="text-align: center;">
                                        <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">Assigned</div>
                                        <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                                            <div style="width: 28px; height: 28px; border-radius: 6px; background: #e0f2fe; color: #0ea5e9; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-briefcase" style="font-size: 14px;"></i></div>
                                            <span id="dyn-popup-stat-assigned" style="font-size: 20px; font-weight: 700; color: #0f172a;">0</span>
                                        </div>
                                    </div>
                                    <div style="text-align: center;">
                                        <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">Completed</div>
                                        <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                                            <div style="width: 28px; height: 28px; border-radius: 6px; background: #dcfce7; color: #22c55e; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-check-circle" style="font-size: 14px;"></i></div>
                                            <span id="dyn-popup-stat-completed" style="font-size: 20px; font-weight: 700; color: #0f172a;">0</span>
                                        </div>
                                    </div>
                                    <div style="text-align: center;">
                                        <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">Pending</div>
                                        <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                                            <div style="width: 28px; height: 28px; border-radius: 6px; background: #fef3c7; color: #f59e0b; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-clock" style="font-size: 14px;"></i></div>
                                            <span id="dyn-popup-stat-pending" style="font-size: 20px; font-weight: 700; color: #0f172a;">0</span>
                                        </div>
                                    </div>
                                    <div style="text-align: center;">
                                        <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">Overdue</div>
                                        <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                                            <div style="width: 28px; height: 28px; border-radius: 6px; background: #fee2e2; color: #ef4444; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-triangle-exclamation" style="font-size: 14px;"></i></div>
                                            <span id="dyn-popup-stat-overdue" style="font-size: 20px; font-weight: 700; color: #0f172a;">0</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Middle Stats Row -->
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">
                            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center;">
                                <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">Productivity Score</div>
                                <div id="dyn-popup-score" style="font-size: 24px; font-weight: 700; color: #0f172a;">0%</div>
                            </div>
                            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center;">
                                <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">Completion Rate</div>
                                <div id="dyn-popup-comprate" style="font-size: 24px; font-weight: 700; color: #0f172a;">0%</div>
                            </div>
                            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center;">
                                <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">On Time Completion</div>
                                <div id="dyn-popup-ontime" style="font-size: 24px; font-weight: 700; color: #0f172a;">0%</div>
                            </div>
                            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center;">
                                <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">Total Hours Logged</div>
                                <div id="dyn-popup-hours" style="font-size: 24px; font-weight: 700; color: #0f172a;">0 <span style="font-size: 14px; font-weight: 500; color: #64748b;">hrs</span></div>
                            </div>
                        </div>

                        <!-- Task Details -->
                        <h4 style="margin: 0 0 16px 0; font-size: 16px; color: #0f172a; font-weight: 700;">Task Details</h4>
                        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
                                <thead style="background: #f8fafc; color: #0f172a; font-weight: 600; font-size: 12px; border-bottom: 1px solid #e2e8f0;">
                                    <tr>
                                        <th style="padding: 16px 20px;">#</th>
                                        <th style="padding: 16px 20px;">Task Name</th>
                                        <th style="padding: 16px 20px;">Project</th>
                                        <th style="padding: 16px 20px;">Priority</th>
                                        <th style="padding: 16px 20px;">Assigned Date</th>
                                        <th style="padding: 16px 20px;">Due Date</th>
                                        <th style="padding: 16px 20px;">Status</th>
                                        <th style="padding: 16px 20px;">Completed Date</th>
                                    </tr>
                                </thead>
                                <tbody id="dyn-popup-tasks">
                                    <!-- Tasks go here -->
                                </tbody>
                            </table>
                        </div>

                        <!-- Task Status Explanation -->
                        <div style="background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px;">
                            <h4 style="margin: 0 0 16px 0; font-size: 14px; color: #0f172a; font-weight: 700;">Task Status Explanation</h4>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                                <div>
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                                        <div style="width: 8px; height: 8px; border-radius: 50%; background: #22c55e;"></div>
                                        <span style="font-weight: 700; font-size: 13px; color: #0f172a;">Completed</span>
                                    </div>
                                    <div style="font-size: 12px; color: #64748b;">Task has been completed successfully.</div>
                                </div>
                                <div>
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                                        <div style="width: 8px; height: 8px; border-radius: 50%; background: #f59e0b;"></div>
                                        <span style="font-weight: 700; font-size: 13px; color: #0f172a;">Pending</span>
                                    </div>
                                    <div style="font-size: 12px; color: #64748b;">Task is in progress and not yet completed.</div>
                                </div>
                                <div>
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                                        <div style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444;"></div>
                                        <span style="font-weight: 700; font-size: 13px; color: #0f172a;">Overdue</span>
                                    </div>
                                    <div style="font-size: 12px; color: #64748b;">Task is not completed and past the due date.</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="padding: 16px 24px; background: #ffffff; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end;">
                        <button onclick="document.getElementById('prod-popup-overlay-dynamic').style.display = 'none';" style="padding: 8px 24px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 600; color: #0f172a; cursor: pointer; transition: all 0.2s;">Close</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        }

        const setEl = (id, val) => { const el = document.getElementById(id); if(el) el.innerHTML = val; };
        
        let initial = emp.name ? emp.name.substring(0,2).toUpperCase() : 'U';
        let avatarImg = user.profilePic || user.profileImageBase64 || user.photo || '';
        
        const avatarBox = document.getElementById('dyn-popup-avatar-box');
        if (avatarBox) {
            if (avatarImg) {
                avatarBox.style.backgroundImage = `url(${avatarImg})`;
                avatarBox.style.backgroundSize = 'cover';
                avatarBox.style.backgroundPosition = 'center';
                document.getElementById('dyn-popup-initial').style.display = 'none';
            } else {
                avatarBox.style.backgroundImage = 'none';
                document.getElementById('dyn-popup-initial').style.display = 'block';
                document.getElementById('dyn-popup-initial').innerText = initial;
            }
        }
        
        setEl('dyn-popup-name', emp.name || 'Unknown User');
        setEl('dyn-popup-empid', emp.empId || 'N/A');
        setEl('dyn-popup-dept', emp.dept || 'General');
        setEl('dyn-popup-desig', user.designation || 'Employee');
        setEl('dyn-popup-mgr', emp.mgr || 'Manager');
        setEl('dyn-popup-email', user.email || 'employee@company.com');
        
        setEl('dyn-popup-stat-assigned', emp.assigned || 0);
        setEl('dyn-popup-stat-completed', emp.completed || 0);
        setEl('dyn-popup-stat-pending', emp.pending || 0);
        setEl('dyn-popup-stat-overdue', emp.overdue || 0);
        
        let compRate = emp.assigned > 0 ? Math.round((emp.completed / emp.assigned) * 100) : 0;
        let onTimeRate = emp.assigned > 0 ? Math.round(((emp.completed) / (emp.assigned)) * 100) : 0; // Simplified
        let totalHours = (emp.completed * 8) || 0; 
        
        setEl('dyn-popup-score', (emp.compPct || 0) + '%');
        setEl('dyn-popup-comprate', compRate + '%');
        setEl('dyn-popup-ontime', onTimeRate + '%');
        setEl('dyn-popup-hours', totalHours + ' <span style="font-size:14px;font-weight:500;color:#64748b;">hrs</span>');

        const tasksEl = document.getElementById('dyn-popup-tasks');
        if(tasksEl) {
            const tasks = emp.tasks || [];
            if(tasks.length === 0) {
                tasksEl.innerHTML = '<tr><td colspan="8" style="padding:24px;text-align:center;color:#64748b;">No tasks found</td></tr>';
            } else {
                tasksEl.innerHTML = tasks.map((t, idx) => {
                    if(!t) return '';
                    let st = t.status || 'Pending';
                    let stColor = st === 'Approved' || st === 'Completed' ? '#22c55e' : (st === 'Rejected' || st === 'Overdue' ? '#ef4444' : '#f59e0b');
                    
                    let priority = t.priority || 'Normal';
                    let pColor = priority === 'High' ? '#ef4444' : (priority === 'Medium' ? '#f59e0b' : '#3b82f6');
                    
                    let compDate = st === 'Approved' || st === 'Completed' ? (t.date || '-') : '-';
                    let dueDate = t.date || '-'; 
                    let assignedDate = t.date || '-';

                    return `<tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding:16px 20px;color:#475569;">${idx + 1}</td>
                        <td style="padding:16px 20px;color:#0f172a;font-weight:500;">${t.description || 'Productivity Log'}</td>
                        <td style="padding:16px 20px;color:#64748b;">${t.project || 'General'}</td>
                        <td style="padding:16px 20px;"><span style="border: 1px solid ${pColor}; color:${pColor}; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600;">${priority}</span></td>
                        <td style="padding:16px 20px;color:#64748b;">${assignedDate}</td>
                        <td style="padding:16px 20px;color:#64748b;">${dueDate}</td>
                        <td style="padding:16px 20px;"><span style="border: 1px solid ${stColor}; color:${stColor}; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600;">${st === 'Approved' ? 'Completed' : (st === 'Rejected' ? 'Overdue' : st)}</span></td>
                        <td style="padding:16px 20px;color:#16a34a;font-weight:500;">${compDate}</td>
                    </tr>`;
                }).join('');
            }
        }

        // Show the newly generated standalone popup overlay
        overlay.style.display = 'flex';
        overlay.style.setProperty('display', 'flex', 'important');
        overlay.style.setProperty('visibility', 'visible', 'important');
        overlay.style.setProperty('opacity', '1', 'important');
        overlay.style.setProperty('z-index', '99999999', 'important');
    } catch(e) {
        console.error('Error in viewProductivityDetails:', e);
        alert('Error showing details: ' + e.message);
    }
};
// ==========================================
// ASSETS REPORT LOGIC
// ==========================================

window.generateAdminAssetsReport = function(passedDb) {
    const db = passedDb || getDb();
    const assets = db.assets || [];
    const users = db.users || [];
    const departments = [...new Set(users.map(u => u.department).filter(Boolean))].sort();

    // Setup filter dropdowns if not populated
    const catSelect = document.getElementById('admin-rep-assets-filter-cat');
    if (catSelect && catSelect.options.length <= 1) {
        const cats = [...new Set(assets.map(a => a.category).filter(Boolean))].sort();
        cats.forEach(c => catSelect.innerHTML += `<option value="${c}">${c}</option>`);
    }

    const deptSelect = document.getElementById('admin-rep-assets-filter-dept');
    if (deptSelect && deptSelect.options.length <= 1) {
        departments.forEach(d => deptSelect.innerHTML += `<option value="${d}">${d}</option>`);
    }

    // Get filter values
    const filterCat = catSelect ? catSelect.value : 'All';
    const filterDept = deptSelect ? deptSelect.value : 'All';
    const filterEmp = document.getElementById('admin-rep-assets-filter-emp') ? document.getElementById('admin-rep-assets-filter-emp').value : 'All';
    const filterStatus = document.getElementById('admin-rep-assets-filter-status') ? document.getElementById('admin-rep-assets-filter-status').value : 'All';

    // Map user data for fast lookup
    const userMap = {};
    users.forEach(u => userMap[u.id] = u);

    // Map active asset issues for assignment info
    const issueMap = {};
    (db.assetIssues || []).forEach(ai => {
        if (ai.status === 'Active') {
            issueMap[ai.asset_id] = ai.employee_id;
        }
    });

    // Decorate assets with their assigned_to value
    assets.forEach(a => {
        a.assigned_to = issueMap[a.id];
    });

    // Apply Filters
    const filteredAssets = assets.filter(a => {
        let matchCat = filterCat === 'All' || a.category === filterCat;
        
        let aStatus = a.status || 'Available';
        let matchStatus = filterStatus === 'All' || aStatus === filterStatus;
        if (filterStatus === 'Assigned' && aStatus === 'Issued') matchStatus = true;
        if (filterStatus === 'Damaged' && aStatus === 'Lost') matchStatus = true;
        
        let assignedUser = userMap[a.assigned_to];
        let assetDeptId = assignedUser ? assignedUser.department : null;

        let matchEmp = filterEmp === 'All' || a.assigned_to === filterEmp;
        let matchDept = filterDept === 'All' || assetDeptId == filterDept;

        return matchCat && matchStatus && matchEmp && matchDept;
    });

    // Cards
    let total = filteredAssets.length;
    let assigned = filteredAssets.filter(a => a.status === 'Assigned' || a.status === 'Issued').length;
    let available = filteredAssets.filter(a => !a.status || a.status === 'Available').length;
    let maintenance = filteredAssets.filter(a => a.status === 'Maintenance').length;
    let damaged = filteredAssets.filter(a => a.status === 'Damaged' || a.status === 'Lost').length;

    if (document.getElementById('ast-card-total')) {
        document.getElementById('ast-card-total').innerText = total;
        document.getElementById('ast-card-assigned').innerText = assigned;
        document.getElementById('ast-card-available').innerText = available;
    }

    // Populate Section 1: Company Assets Overview
    const summaryTbody = document.getElementById('admin-rep-assets-tbody-summary');
    if (summaryTbody) {
        const catStats = {};
        filteredAssets.forEach(a => {
            let cat = a.category || 'Uncategorized';
            if (!catStats[cat]) catStats[cat] = { total: 0, assigned: 0, available: 0, maintenance: 0, damaged: 0 };
            catStats[cat].total++;
            if (a.status === 'Assigned' || a.status === 'Issued') catStats[cat].assigned++;
            else if (!a.status || a.status === 'Available') catStats[cat].available++;
            else if (a.status === 'Maintenance') catStats[cat].maintenance++;
            else catStats[cat].damaged++;
        });

        const rows = Object.keys(catStats).sort().map((cat, i) => `
            <tr>
                <td>${i+1}</td>
                <td>${cat}</td>
                <td class="text-center">${catStats[cat].total}</td>
                <td class="text-center">${catStats[cat].assigned}</td>
                <td class="text-center">${catStats[cat].available}</td>
            </tr>
        `).join('');

        summaryTbody.innerHTML = rows + `
            <tr style="background: #f8fafc; font-weight: 700;">
                <td colspan="2">Total</td>
                <td class="text-center">${total}</td>
                <td class="text-center">${assigned}</td>
                <td class="text-center">${available}</td>
            </tr>
        `;
    }

    // Populate Section 2: Employee Asset Summary
    const empSummaryTbody = document.getElementById('admin-rep-assets-tbody-employee');
    if (empSummaryTbody) {
        const empAssetCount = {};
        filteredAssets.forEach(a => {
            if (a.status === 'Assigned' || a.status === 'Issued') {
                const empId = a.assigned_to;
                if (!empId || !userMap[empId]) return; // Skip if no assigned employee is mapped or user is deleted
                if (!empAssetCount[empId]) {
                    empAssetCount[empId] = { count: 0, val: 0, user: userMap[empId] };
                }
                empAssetCount[empId].count++;
                empAssetCount[empId].val += parseFloat(a.purchase_cost || 0);
            }
        });

        const empRows = Object.values(empAssetCount).map((data, i) => {
            const u = data.user || { name: 'Unknown', id: 'Unknown', department: 'Unknown' };
            return `<tr>
                <td>${i+1}</td>
                <td><strong style="color: #0f172a;">${u.name || '-'}</strong></td>
                <td class="text-center">${data.count}</td>
                <td class="text-right">${data.val ? data.val.toLocaleString() : '0'}</td>
                <td class="print-hide text-center"><button class="btn btn-outline btn-sm" onclick="viewEmployeeAssignedAssetsReport('${u.id}')" style="font-size: 11px; padding: 4px 10px; color:#2563eb; border-color:#2563eb;"><i class="fa-solid fa-eye"></i> View Assets</button></td>
            </tr>`;
        }).join('');

        empSummaryTbody.innerHTML = empRows || '<tr><td colspan="5" class="text-center text-muted py-4">No employees assigned assets with current filters.</td></tr>';
    }

    // Populate Section 3: Asset Register
    const regTbody = document.getElementById('admin-rep-assets-tbody-register');
    if (regTbody) {
        const regRows = filteredAssets.map((a, i) => {
            const u = userMap[a.assigned_to] || {};
            const deptName = u.department || '-';
            const status = a.status || 'Available';
            const assignName = u.name || (status === 'Available' ? 'Store / Available' : '-');
            const cost = a.purchase_cost ? parseFloat(a.purchase_cost).toLocaleString() : '-';
            
            return `<tr>
                <td>${i+1}</td>
                <td>${a.id}</td>
                <td><strong style="color: #0f172a;">${a.name || '-'}</strong></td>
                <td>${a.category || '-'}</td>
                <td>${a.serial_number || '-'}</td>
                <td>${assignName}</td>
                <td>${status === 'Available' ? '-' : deptName}</td>
                <td><span class="ast-badge ${status}">${status}</span></td>
                <td>${a.purchase_date || '-'}</td>
                <td class="text-right">${cost}</td>
                <td class="print-hide text-center"><button class="btn btn-outline btn-sm" onclick="viewAssetDetailsReport('${a.id}')" style="font-size: 11px; padding: 4px 10px; color:#2563eb; border-color:#2563eb;">View</button></td>
            </tr>`;
        }).join('');

        regTbody.innerHTML = regRows || '<tr><td colspan="11" class="text-center text-muted py-4">No assets found matching criteria.</td></tr>';
    }
};


window.viewEmployeeAssignedAssetsReport = function(empId) {
    const db = getDb();
    const user = db.users.find(u => u.id == empId);
    if (!user) return;

    if (document.getElementById('rep-ast-emp-id-val')) document.getElementById('rep-ast-emp-id-val').innerText = user.employee_id || user.id || '-';
    if (document.getElementById('rep-ast-emp-name')) document.getElementById('rep-ast-emp-name').innerText = user.name || '-';
    if (document.getElementById('rep-ast-emp-dept')) document.getElementById('rep-ast-emp-dept').innerText = user.department || '-';
    if (document.getElementById('rep-ast-emp-desig')) document.getElementById('rep-ast-emp-desig').innerText = user.designation || '-';

    const myIssues = (db.assetIssues || []).filter(ai => ai.employee_id === empId && ai.status === 'Active');
    const myAssetIds = myIssues.map(ai => ai.asset_id);
    const empAssets = (db.assets || []).filter(a => myAssetIds.includes(a.id));
    
    if (document.getElementById('rep-ast-emp-total-qty')) document.getElementById('rep-ast-emp-total-qty').innerText = empAssets.length;
    let totalVal = 0;
    empAssets.forEach(a => totalVal += parseFloat(a.purchase_cost || 0));
    if (document.getElementById('rep-ast-emp-total-val')) document.getElementById('rep-ast-emp-total-val').innerText = totalVal.toLocaleString();

    const tbody = document.getElementById('rep-ast-emp-tbody');
    tbody.innerHTML = empAssets.map((a, i) => {
        const status = a.status || 'Available';
        const issueRec = myIssues.find(ai => ai.asset_id === a.id);
        const assignDate = issueRec ? (issueRec.issue_date || '-') : '-';
        return `<tr>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0;">${i+1}</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0;">${a.id}</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0;"><strong style="color: #0f172a;">${a.name || '-'}</strong></td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0;">${a.category || '-'}</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0;">${assignDate}</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0;"><span class="ast-badge ${status}" style="background: #dcfce7; color: #16a34a; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600;">${status}</span></td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0;"><span style="color: #16a34a; font-weight: 600;">Good</span></td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #e2e8f0;" class="text-center"><button class="btn btn-outline btn-sm" onclick="viewAssetDetailsReport('${a.id}')" style="font-size: 11px; padding: 4px 10px; color:#2563eb; border-color:#bfdbfe; background: #eff6ff; font-weight:600;"><i class="fa-solid fa-eye"></i> View Details</button></td>
        </tr>`;
    }).join('') || '<tr><td colspan="8" class="text-center text-muted" style="padding: 15px;">No assets assigned</td></tr>';

    openModal('modal-employee-assigned-assets');
};

window.viewAssetDetailsReport = function(assetId) {
    const db = getDb();
    const asset = (db.assets || []).find(a => a.id == assetId);
    if (!asset) return;

    const user = db.users.find(u => u.id == asset.assigned_to) || {};
    const deptName = (db.departments || []).find(d => d.id == user.department)?.name || '-';

    document.getElementById('rep-ast-det-id').innerText = asset.id || '-';
    document.getElementById('rep-ast-det-name').innerText = asset.name || '-';
    document.getElementById('rep-ast-det-cat').innerText = asset.category || '-';
    document.getElementById('rep-ast-det-brand').innerText = asset.brand || '-';
    document.getElementById('rep-ast-det-serial').innerText = asset.serial_number || '-';
    document.getElementById('rep-ast-det-pdate').innerText = asset.purchase_date || '-';
    document.getElementById('rep-ast-det-pcost').innerText = asset.purchase_cost ? 'Rs ' + parseFloat(asset.purchase_cost).toLocaleString() : '-';

    document.getElementById('rep-ast-det-emp').innerText = user.name || '-';
    document.getElementById('rep-ast-det-edept').innerText = deptName;
    document.getElementById('rep-ast-det-adate').innerText = asset.assigned_date || '-';
    document.getElementById('rep-ast-det-status').innerText = asset.status || 'Available';

    openModal('modal-asset-details-report');
};

window.resetAdminAssetsFilters = function() {
    ['admin-rep-assets-filter-cat', 'admin-rep-assets-filter-dept', 'admin-rep-assets-filter-emp', 'admin-rep-assets-filter-status'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = 'All';
    });
    generateAdminAssetsReport();
};

window.exportAdminAssetsExcel = function() {
    if (typeof XLSX === 'undefined') {
        alert("Excel export library is not loaded.");
        return;
    }
    const wb = XLSX.utils.book_new();
    
    // Summary Tab
    const sumTable = document.querySelector('#admin-rep-assets-tbody-summary').parentElement;
    XLSX.utils.book_append_sheet(wb, XLSX.utils.table_to_sheet(sumTable), "Company Summary");

    // Employees Tab
    const empTable = document.querySelector('#admin-rep-assets-tbody-employee').parentElement;
    XLSX.utils.book_append_sheet(wb, XLSX.utils.table_to_sheet(empTable), "Employee Summary");

    // Register Tab
    const regTable = document.querySelector('#admin-rep-assets-tbody-register').parentElement;
    XLSX.utils.book_append_sheet(wb, XLSX.utils.table_to_sheet(regTable), "Asset Register");

    // Available Tab
    const availTable = document.querySelector('#admin-rep-assets-tbody-available').parentElement;
    XLSX.utils.book_append_sheet(wb, XLSX.utils.table_to_sheet(availTable), "Available Assets");

    XLSX.writeFile(wb, `Assets_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
};

window.exportAdminAssetsPDF = function() {
    alert("Please use the 'Print Report' button and select 'Save as PDF' to generate the professional report.");
};

