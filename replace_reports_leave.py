import re

with open('reports.js', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to find initAdminReportsTab and update the leave filters
init_patch = '''    // Leave Report Filters
    const leaveEmpSelect = document.getElementById('admin-rep-leave-emp');
    const leaveManagerSelect = document.getElementById('admin-rep-leave-manager');
    const leaveDeptSelect = document.getElementById('admin-rep-leave-dept');
    
    if (leaveEmpSelect && window.db && window.db.users) {
        leaveEmpSelect.innerHTML = '<option value="All">All Employees</option>';
        leaveManagerSelect.innerHTML = '<option value="All">All Managers</option>';
        leaveDeptSelect.innerHTML = '<option value="All">All Departments</option>';
        
        const managers = new Set();
        const depts = new Set();
        
        window.db.users.filter(u => u.role === 'employee' || u.role === 'manager').forEach(u => {
            leaveEmpSelect.innerHTML += `<option value="${u.id}">${u.name}</option>`;
            if (u.department) depts.add(u.department);
            if (u.role === 'manager') managers.add(u.name);
        });
        
        depts.forEach(d => {
            leaveDeptSelect.innerHTML += `<option value="${d}">${d}</option>`;
        });
        managers.forEach(m => {
            leaveManagerSelect.innerHTML += `<option value="${m}">${m}</option>`;
        });
    }
'''

content = re.sub(
    r"// Leave Report Filters\s+const leaveEmpSelect = document\.getElementById\('admin-rep-leave-emp'\);\s+if\s*\(leaveEmpSelect && window\.db\.users\)\s*\{\s*leaveEmpSelect\.innerHTML = '<option value=\"All\">All Employees</option>';\s*window\.db\.users\.filter\(u => u\.role === 'employee' \|\| u\.role === 'manager'\)\.forEach\(u => \{\s*leaveEmpSelect\.innerHTML \+= `<option value=\"\$\{u\.id\}\">\$\{u\.name\}</option>`;\s*\}\);\s*\}",
    init_patch,
    content
)

# Now replace generateAdminLeaveReport()
new_generate_leave = '''function generateAdminLeaveReport() {
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
    
    if (!tbodyRequests || !window.db || !window.db.leaveRequests) return;

    const sDate = new Date(start);
    const eDate = new Date(end);
    eDate.setHours(23, 59, 59);

    let filtered = window.db.leaveRequests.filter(req => {
        const d = new Date(req.appliedOn || req.fromDate);
        let match = d >= sDate && d <= eDate;
        
        const emp = window.db.users.find(u => u.id === req.employeeId) || {};
        if (empId !== 'All' && req.employeeId != empId) match = false;
        if (type !== 'All' && req.type !== type) match = false;
        if (status !== 'All' && req.status !== status) match = false;
        if (dept !== 'All' && emp.department !== dept) match = false;
        // Mock manager filter - assuming managers are known by role
        if (manager !== 'All' && emp.manager !== manager && manager !== emp.name) match = false; 

        return match;
    });
    
    // 1. TOP SUMMARY CARDS
    let totalReq = filtered.length;
    let approved = filtered.filter(r => r.status === 'Approved').length;
    let pending = filtered.filter(r => r.status === 'Pending').length;
    let rejected = filtered.filter(r => r.status === 'Rejected').length;
    
    let daysConsumed = 0;
    let currentlyOnLeave = new Set();
    const todayStr = new Date().toISOString().split('T')[0];
    
    filtered.forEach(r => {
        if (r.status === 'Approved') {
            daysConsumed += (r.days || 0);
            if (r.fromDate <= todayStr && r.toDate >= todayStr) {
                currentlyOnLeave.add(r.employeeId);
            }
        }
    });
    
    document.getElementById('leave-sum-total').innerText = totalReq;
    document.getElementById('leave-sum-approved').innerText = approved;
    document.getElementById('leave-sum-pending').innerText = pending;
    document.getElementById('leave-sum-rejected').innerText = rejected;
    document.getElementById('leave-sum-onleave').innerText = currentlyOnLeave.size;
    document.getElementById('leave-sum-consumed').innerText = daysConsumed;

    // 2. LEAVE REQUEST REPORT (TABLE 1)
    let htmlRequests = '';
    if (filtered.length === 0) {
        htmlRequests = '<tr><td colspan="11" class="text-center text-muted">No leave requests found for selected criteria</td></tr>';
    } else {
        filtered.forEach(req => {
            const emp = window.db.users.find(u => u.id === req.employeeId) || {name: 'Unknown', department: 'Unknown'};
            const statusColor = req.status === 'Approved' ? 'success' : (req.status === 'Pending' ? 'warning' : (req.status === 'Rejected' ? 'danger' : 'secondary'));
            
            htmlRequests += `
                <tr>
                    <td>${req.appliedOn || req.fromDate}</td>
                    <td>EMP-${req.employeeId}</td>
                    <td style="font-weight: 600; cursor: pointer; color: #0f2e53;" onclick="openEmployeeLeaveModal(${req.employeeId})"><u>${emp.name}</u></td>
                    <td>${emp.department || 'N/A'}</td>
                    <td>${req.type}</td>
                    <td>${req.fromDate}</td>
                    <td>${req.toDate}</td>
                    <td class="text-center"><b>${req.days || 1}</b></td>
                    <td class="text-center"><span class="badge bg-${statusColor}">${req.status}</span></td>
                    <td>${req.approvedBy || '-'}</td>
                    <td><div style="max-width: 150px; overflow: hidden; text-overflow: ellipsis;" title="${req.reason}">${req.reason || '-'}</div></td>
                </tr>
            `;
        });
    }
    tbodyRequests.innerHTML = htmlRequests;

    // Analyze data per employee for Table 2 and Table 3
    let empStats = {};
    window.db.users.filter(u => u.role === 'employee' || u.role === 'manager').forEach(u => {
        // filter by dept/manager for the summary tables as well
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
    
    // Add leave balances from db if available
    if (window.db.leaveBalances) {
        window.db.leaveBalances.forEach(lb => {
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
            st.totalUsed += (req.days || 1);
            if (req.type === 'Casual Leave') { st.casual += (req.days || 1); st.casualBal -= (req.days || 1); }
            else if (req.type === 'Medical Leave') { st.medical += (req.days || 1); st.medicalBal -= (req.days || 1); }
            else if (req.type === 'Annual Leave') { st.annual += (req.days || 1); st.annualBal -= (req.days || 1); }
            else { st.unpaid += (req.days || 1); }
        }
    });

    // 3. EMPLOYEE LEAVE SUMMARY (TABLE 2)
    let htmlEmpSummary = '';
    const validEmps = Object.values(empStats);
    if (validEmps.length === 0) {
        htmlEmpSummary = '<tr><td colspan="8" class="text-center text-muted">No data found</td></tr>';
    } else {
        validEmps.forEach(st => {
            const rem = st.annualBal + st.casualBal + st.medicalBal;
            htmlEmpSummary += `
                <tr>
                    <td style="font-weight: 600;" onclick="openEmployeeLeaveModal(${st.id})"><u>${st.name}</u></td>
                    <td>${st.dept}</td>
                    <td class="text-center">${st.casual}</td>
                    <td class="text-center">${st.medical}</td>
                    <td class="text-center">${st.annual}</td>
                    <td class="text-center">${st.unpaid}</td>
                    <td class="text-center"><b>${st.totalUsed}</b></td>
                    <td class="text-center"><span class="badge ${rem <= 0 ? 'bg-danger' : (rem < 5 ? 'bg-warning' : 'bg-success')}">${rem} Days</span></td>
                </tr>
            `;
        });
    }
    tbodyEmpSummary.innerHTML = htmlEmpSummary;

    // 4. LEAVE BALANCE REPORT (TABLE 3)
    let htmlBalance = '';
    let lowBalEmps = [];
    if (validEmps.length === 0) {
        htmlBalance = '<tr><td colspan="5" class="text-center text-muted">No data found</td></tr>';
    } else {
        validEmps.forEach(st => {
            const totalRem = Math.max(0, st.annualBal) + Math.max(0, st.casualBal) + Math.max(0, st.medicalBal);
            if (totalRem < 3) lowBalEmps.push(st.name + ` (${totalRem} days)`);
            
            htmlBalance += `
                <tr>
                    <td style="font-weight: 600;">${st.name}</td>
                    <td class="text-center"><span class="badge ${st.annualBal <= 0 ? 'bg-danger text-white' : (st.annualBal < 3 ? 'bg-warning text-dark' : 'bg-light text-dark')}">${st.annualBal}</span></td>
                    <td class="text-center"><span class="badge ${st.casualBal <= 0 ? 'bg-danger text-white' : (st.casualBal < 3 ? 'bg-warning text-dark' : 'bg-light text-dark')}">${st.casualBal}</span></td>
                    <td class="text-center"><span class="badge ${st.medicalBal <= 0 ? 'bg-danger text-white' : (st.medicalBal < 3 ? 'bg-warning text-dark' : 'bg-light text-dark')}">${st.medicalBal}</span></td>
                    <td class="text-center"><span class="badge ${totalRem <= 0 ? 'bg-danger' : (totalRem < 5 ? 'bg-warning text-dark' : 'bg-success')}">${totalRem} Days</span></td>
                </tr>
            `;
        });
    }
    tbodyBalance.innerHTML = htmlBalance;

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
        const emp = window.db.users.find(u => u.id === req.employeeId) || {};
        const dpt = emp.department || 'N/A';
        if (deptStats[dpt]) {
            deptStats[dpt].reqs++;
            if (req.status === 'Approved') deptStats[dpt].approved++;
        }
    });

    let htmlDept = '';
    let maxUsedDept = { name: '-', val: 0 };
    if (Object.keys(deptStats).length === 0) {
        htmlDept = '<tr><td colspan="6" class="text-center text-muted">No data found</td></tr>';
    } else {
        Object.keys(deptStats).forEach(d => {
            const ds = deptStats[d];
            const avg = ds.emps > 0 ? (ds.daysUsed / ds.emps).toFixed(1) : 0;
            
            if (ds.daysUsed > maxUsedDept.val) {
                maxUsedDept = { name: d, val: ds.daysUsed };
            }
            
            htmlDept += `
                <tr>
                    <td style="font-weight: 600;">${d}</td>
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

    // 6. INSIGHTS
    const sortedByUsed = [...validEmps].sort((a,b) => b.totalUsed - a.totalUsed).slice(0,3);
    let mostLeavesHtml = '';
    sortedByUsed.forEach(st => { if(st.totalUsed > 0) mostLeavesHtml += `<li>${st.name} (${st.totalUsed} days)</li>`; });
    document.getElementById('leave-insight-most-leaves').innerHTML = mostLeavesHtml || '<li>No leaves taken</li>';
    
    // Freq type
    let typesFreq = {};
    filtered.forEach(r => { if(r.status === 'Approved') typesFreq[r.type] = (typesFreq[r.type] || 0) + 1; });
    let maxType = '-'; let maxVal = 0;
    Object.keys(typesFreq).forEach(k => { if(typesFreq[k] > maxVal) { maxVal = typesFreq[k]; maxType = k; } });
    document.getElementById('leave-insight-freq-type').innerText = maxType;
    
    document.getElementById('leave-insight-high-dept').innerText = maxUsedDept.name;
    
    let lowBalHtml = '';
    lowBalEmps.forEach(le => lowBalHtml += `<li>${le}</li>`);
    document.getElementById('leave-insight-low-bal').innerHTML = lowBalHtml || '<li>All balances healthy</li>';

    // Print Header Setup
    const activeUser = window.currentUser || JSON.parse(localStorage.getItem('current_user')) || {name: 'Admin'};
    const printStartStr = new Date(start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const printEndStr = new Date(end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const printSubtitle = document.getElementById('print-subtitle-admin-report-leave');
    if(printSubtitle) {
        printSubtitle.innerText = `Date Range: ${printStartStr} - ${printEndStr} | Department: ${dept} | Status: ${status} | Generated By: ${activeUser.name}`;
    }
}

function resetLeaveSummaryFilters() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    if(document.getElementById('admin-rep-leave-start')) document.getElementById('admin-rep-leave-start').value = thirtyDaysAgo.toISOString().split('T')[0];
    if(document.getElementById('admin-rep-leave-end')) document.getElementById('admin-rep-leave-end').value = today.toISOString().split('T')[0];
    if(document.getElementById('admin-rep-leave-dept')) document.getElementById('admin-rep-leave-dept').value = 'All';
    if(document.getElementById('admin-rep-leave-emp')) document.getElementById('admin-rep-leave-emp').value = 'All';
    if(document.getElementById('admin-rep-leave-type')) document.getElementById('admin-rep-leave-type').value = 'All';
    if(document.getElementById('admin-rep-leave-status')) document.getElementById('admin-rep-leave-status').value = 'All';
    if(document.getElementById('admin-rep-leave-manager')) document.getElementById('admin-rep-leave-manager').value = 'All';
    
    generateAdminLeaveReport();
}

window.openEmployeeLeaveModal = function(empId) {
    if (!window.db || !window.db.users) return;
    const emp = window.db.users.find(u => u.id == empId);
    if (!emp) return;
    
    document.getElementById('emp-leave-detail-id').innerText = 'EMP-' + emp.id;
    document.getElementById('emp-leave-detail-name').innerText = emp.name;
    document.getElementById('emp-leave-detail-dept').innerText = emp.department || 'N/A';
    document.getElementById('emp-leave-detail-desig').innerText = emp.designation || 'N/A';
    document.getElementById('emp-leave-detail-manager').innerText = emp.manager || 'N/A';
    
    let casual = 0, medical = 0, annual = 0, unpaid = 0;
    let historyHtml = '';
    
    const reqs = (window.db.leaveRequests || []).filter(r => r.employeeId == emp.id);
    reqs.forEach(r => {
        if (r.status === 'Approved') {
            if (r.type === 'Casual Leave') casual += (r.days||1);
            else if (r.type === 'Medical Leave') medical += (r.days||1);
            else if (r.type === 'Annual Leave') annual += (r.days||1);
            else unpaid += (r.days||1);
        }
        
        const sc = r.status === 'Approved' ? 'success' : (r.status === 'Pending' ? 'warning' : 'danger');
        historyHtml += `<tr>
            <td>${r.type}</td>
            <td>${r.fromDate}</td>
            <td>${r.toDate}</td>
            <td>${r.days||1}</td>
            <td><span class="badge bg-${sc}">${r.status}</span></td>
            <td>${r.reason || '-'}</td>
        </tr>`;
    });
    
    document.getElementById('emp-leave-detail-casual').innerText = casual;
    document.getElementById('emp-leave-detail-medical').innerText = medical;
    document.getElementById('emp-leave-detail-annual').innerText = annual;
    document.getElementById('emp-leave-detail-unpaid').innerText = unpaid;
    
    // Calculate balance based on default allocation or db
    let allocated = { casual: 10, medical: 8, annual: 14 };
    if (window.db.leaveBalances) {
        window.db.leaveBalances.filter(lb => lb.employeeId == emp.id).forEach(lb => {
            if (lb.type === 'Annual Leave') allocated.annual = lb.allocated || allocated.annual;
            if (lb.type === 'Casual Leave') allocated.casual = lb.allocated || allocated.casual;
            if (lb.type === 'Medical Leave') allocated.medical = lb.allocated || allocated.medical;
        });
    }
    
    let bal = (allocated.casual - casual) + (allocated.medical - medical) + (allocated.annual - annual);
    document.getElementById('emp-leave-detail-balance').innerText = bal + ' Days';
    document.getElementById('emp-leave-detail-history').innerHTML = historyHtml || '<tr><td colspan="6" class="text-center">No history</td></tr>';
    
    document.getElementById('modal-employee-leave-detail').classList.remove('hidden');
};
'''

content = re.sub(
    r"function generateAdminLeaveReport\(\) \{[\s\S]*?(?=function generateAdminPayrollReport\(\) \{)",
    new_generate_leave + "\n\n",
    content
)

# And add the initialization of dates in initAdminReportsTab (if not already there)
# Actually, the user might want resetLeaveSummaryFilters to run on init.
init_call_patch = '''function initAdminReportsTab() {
    console.log("Initializing Admin Reports Tab...");
'''
if "resetLeaveSummaryFilters();" not in content:
    content = content.replace("console.log(\"Initializing Admin Reports Tab...\");", "console.log(\"Initializing Admin Reports Tab...\");\n    if(window.resetLeaveSummaryFilters) resetLeaveSummaryFilters();")


with open('reports.js', 'w', encoding='utf-8') as f:
    f.write(content)
    
print("Updated reports.js")
