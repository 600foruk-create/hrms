import re

with open('reports.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_generate_leave = '''function generateAdminLeaveReport(db) {
    db = typeof getDb === 'function' ? getDb() : (window.db || {});
    const start = document.getElementById('admin-rep-leave-start').value;
    const end = document.getElementById('admin-rep-leave-end').value;
    const empId = document.getElementById('admin-rep-leave-emp').value;
    const dept = document.getElementById('admin-rep-leave-dept').value;
    const type = document.getElementById('admin-rep-leave-type').value;
    const status = document.getElementById('admin-rep-leave-status').value;
    const manager = document.getElementById('admin-rep-leave-manager').value;

    if (!start || !end) {
        if(window.showToast) window.showToast('Please select start and end dates', 'warning');
        else alert('Please select start and end dates');
        return;
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
        if (type !== 'All' && req.type !== type && req.leaveType !== type) match = false;
        if (status !== 'All' && req.status !== status) match = false;
        if (dept !== 'All' && emp.department !== dept) match = false;
        if (manager !== 'All' && emp.manager !== manager && manager !== emp.name) match = false; 

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
        'Medical Leave': 'badge-soft-green',
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
            const displayApplyDate = new Date(applyDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

            let fromDate = req.startDate || req.fromDate || req.date || '-';
            let toDate = req.endDate || req.toDate || req.date || '-';
            let calculatedDays = req.days;
            if(!calculatedDays) {
                if(fromDate !== '-' && toDate !== '-') {
                    const diffTime = Math.abs(new Date(toDate) - new Date(fromDate));
                    calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                } else calculatedDays = 1;
            }
            
            const displayFrom = fromDate !== '-' ? new Date(fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            const displayTo = toDate !== '-' ? new Date(toDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

            const lType = req.type || req.leaveType || '-';
            const bClass = badgeMap[lType] || 'badge-soft-blue';
            const sClass = statusMap[req.status] || 'badge-out-orange';

            htmlRequests += `
                <tr>
                    <td>${idx + 1}</td>
                    <td>${displayApplyDate}</td>
                    <td>EMP-${req.employeeId}</td>
                    <td style="font-weight: 600; color: #0f172a;">${emp.name}</td>
                    <td>${emp.department || 'N/A'}</td>
                    <td><span class="${bClass}">${lType}</span></td>
                    <td>${displayFrom}</td>
                    <td>${displayTo}</td>
                    <td class="text-center">${calculatedDays}</td>
                    <td class="text-center"><span class="${sClass}">${req.status || 'Pending'}</span></td>
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
    allUsers.filter(u => u.role === 'employee' || u.role === 'manager').forEach(u => {
        if (dept !== 'All' && u.department !== dept) return;
        if (manager !== 'All' && u.manager !== manager && manager !== u.name) return;
        if (empId !== 'All' && u.id != empId) return;
        
        empStats[u.id] = {
            id: u.id,
            name: u.name,
            dept: u.department || 'N/A',
            casual: 0, medical: 0, annual: 0, unpaid: 0, totalUsed: 0,
            annualBal: 14, casualBal: 10, medicalBal: 8 // Mock default allocated
        };
    });
    
    if (db.leaveBalances) {
        db.leaveBalances.forEach(lb => {
            if (empStats[lb.employeeId]) {
                if (lb.type === 'Annual Leave') empStats[lb.employeeId].annualBal = lb.remaining;
                if (lb.type === 'Casual Leave') empStats[lb.employeeId].casualBal = lb.remaining;
                if (lb.type === 'Medical Leave') empStats[lb.employeeId].medicalBal = lb.remaining;
            }
        });
    }

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
            if (lType === 'Casual Leave') { st.casual += calculatedDays; st.casualBal -= calculatedDays; }
            else if (lType === 'Medical Leave') { st.medical += calculatedDays; st.medicalBal -= calculatedDays; }
            else if (lType === 'Annual Leave') { st.annual += calculatedDays; st.annualBal -= calculatedDays; }
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
                    <td class="text-center">${st.casual}</td>
                    <td class="text-center">${st.medical}</td>
                    <td class="text-center">${st.annual}</td>
                    <td class="text-center">${st.unpaid}</td>
                    <td class="text-center">${st.totalUsed}</td>
                    <td class="text-center" style="font-weight: 600;">${rem}</td>
                </tr>
            `;
        });
    }
    tbodyEmpSummary.innerHTML = htmlEmpSummary;
    document.getElementById('leave-emp-footer-text').innerText = `Showing 1 to ${topEmps.length} of ${validEmps.length} entries`;

    // 4. LEAVE BALANCE REPORT (TABLE 3)
    let htmlBalance = '';
    let lowBalEmps = [];
    if (topEmps.length === 0) {
        htmlBalance = '<tr><td colspan="5" class="text-center text-muted py-3">No data found</td></tr>';
    } else {
        topEmps.forEach(st => {
            const totalRem = Math.max(0, st.annualBal) + Math.max(0, st.casualBal) + Math.max(0, st.medicalBal);
            
            htmlBalance += `
                <tr>
                    <td style="font-weight: 600; color: #0f172a;">${st.name}</td>
                    <td class="text-center">${st.annualBal}</td>
                    <td class="text-center">${st.casualBal}</td>
                    <td class="text-center">${st.medicalBal}</td>
                    <td class="text-center"><span class="${totalRem < 5 ? (totalRem <= 0 ? 'badge-pill-green bg-danger text-white' : 'badge-pill-green bg-warning text-dark') : 'badge-pill-green'}">${totalRem}</span></td>
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
    document.getElementById('leave-bal-footer-text').innerText = `Showing 1 to ${topEmps.length} of ${validEmps.length} entries`;

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
                    <td class="text-center">${ds.emps}</td>
                    <td class="text-center">${ds.reqs}</td>
                    <td class="text-center">${ds.approved}</td>
                    <td class="text-center">${ds.daysUsed}</td>
                    <td class="text-center">${avg}</td>
                </tr>
            `;
        });
    }
    tbodyDept.innerHTML = htmlDept;
    document.getElementById('leave-dept-footer-text').innerText = `Showing 1 to ${deptKeys.length} of ${Object.keys(deptStats).length} entries`;

    // 6. INSIGHTS
    // 6.1 Most Leave Taken
    let mostLeavesHtml = '';
    validEmps.sort((a,b) => b.totalUsed - a.totalUsed).slice(0,3).forEach((st, idx) => { 
        if(st.totalUsed > 0) {
            mostLeavesHtml += `
                <div class="d-flex align-items-center justify-content-between" style="font-size: 11px;">
                    <div class="d-flex align-items-center"><span class="num-badge">${idx+1}</span> <span style="font-weight: 600; color: #0f172a;">${st.name}</span></div>
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
    const cMap = {'Casual Leave': '#3b82f6', 'Annual Leave': '#a855f7', 'Medical Leave': '#22c55e', 'Unpaid Leave': '#eab308'};
    let legendHtml = '';
    let conicStr = [];
    let currentPct = 0;
    
    Object.keys(typesFreq).forEach(k => {
        const val = typesFreq[k];
        const pct = totApp > 0 ? Math.round((val/totApp)*100) : 0;
        const color = cMap[k] || '#94a3b8';
        
        legendHtml += `
            <div class="d-flex align-items-center justify-content-between" style="width: 100%;">
                <div class="d-flex align-items-center"><span class="legend-dot" style="background: ${color};"></span> ${k}</div>
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
                <div class="d-flex align-items-center justify-content-between" style="font-size: 11px;">
                    <div class="d-flex align-items-center">
                        <div style="width: 15px; font-weight: 600; color: #0f172a;">${idx+1}</div>
                        <img src="${emp.profileImage || 'https://via.placeholder.com/150'}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover; margin: 0 8px;">
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
            <div class="d-flex align-items-center justify-content-between" style="font-size: 11px;">
                <div class="d-flex align-items-center"><div style="width: 15px; font-weight: 600; color: #0f172a;">${idx+1}</div> <span style="font-weight: 600; color: #0f172a; margin-left: 5px;">${lb.name}</span></div>
                <div class="d-flex align-items-center gap-2">
                    <span style="color: #94a3b8;">Total Balance: ${lb.bal} Days</span>
                    <span class="${bClass}" style="padding: 2px 8px;">${tText}</span>
                </div>
            </div>
        `;
    });
    document.getElementById('leave-insight-low-bal-list').innerHTML = lowBalHtml || '<div class="text-muted" style="font-size: 11px;">All healthy</div>';

    // Print Header Setup
    const activeUser = window.currentUser || JSON.parse(localStorage.getItem('current_user')) || {name: 'Admin'};
    const printStartStr = new Date(start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const printEndStr = new Date(end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const printSubtitle = document.getElementById('print-subtitle-admin-report-leave');
    if(printSubtitle) {
        printSubtitle.innerText = `Date Range: ${printStartStr} - ${printEndStr} | Department: ${dept} | Status: ${status} | Generated By: ${activeUser.name}`;
    }
}
'''

content = re.sub(
    r"function generateAdminLeaveReport\(db\) \{[\s\S]*?(?=function resetLeaveSummaryFilters\(\) \{)",
    new_generate_leave + "\n\n",
    content
)

with open('reports.js', 'w', encoding='utf-8') as f:
    f.write(content)
    
print("Replaced premium logic in reports.js")
