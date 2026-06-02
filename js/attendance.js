// attendance.js

function renderAdminAttendanceTab() {
    renderLeaveTypes();
    const db = getDb();
    
    const dateInput = document.getElementById('admin-attendance-filter-date');
    if (!dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    const filterDate = dateInput.value;
    
    const filterEmp = document.getElementById('admin-attendance-filter-employee').value;

    // Fill Employee options
    const empSelect = document.getElementById('admin-attendance-filter-employee');
    const prevEmpVal = empSelect.value;
    empSelect.innerHTML = '<option value="">All Employees</option>';
    db.users.filter(u => u.role === 'User').forEach(e => {
        empSelect.innerHTML += `<option value="${e.id}" ${prevEmpVal === e.id ? 'selected' : ''}>${e.name}</option>`;
    });

    const tableBody = document.getElementById('admin-attendance-table-body');
    tableBody.innerHTML = '';

    let logs = db.attendance;
    if (filterDate) logs = logs.filter(l => l.date === filterDate);
    if (filterEmp) logs = logs.filter(l => l.employeeId === filterEmp);

    // Sort by date desc
    logs.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (logs.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="empty-state">No attendance records found.</td></tr>`;
    } else {
        logs.forEach(log => {
            const emp = db.users.find(u => u.id === log.employeeId);
            const empRole = emp ? emp.role : 'Employee';
            const mgr = emp ? db.users.find(u => u.id === emp.managerId) : null;
            const mgrName = mgr ? mgr.name : '<span class="text-muted">None</span>';

            const cleanTimeIn = (log.timeIn && log.timeIn.includes(':')) ? log.timeIn : '-';
            const cleanTimeOut = (log.timeOut && log.timeOut.includes(':')) ? log.timeOut : '-';
            const cleanMarkedBy = (log.markedBy && log.markedBy.trim() !== '') ? log.markedBy : 'System';

            tableBody.innerHTML += `
                <tr>
                    <td>${log.date}</td>
                    <td class="bold">${log.employeeName} <span style="font-size: 0.85em; color: var(--text-muted); font-weight: normal;">(${log.employeeId})</span></td>
                    <td><span class="badge-role ${empRole.toLowerCase()}">${empRole}</span></td>
                    <td>${mgrName}</td>
                    <td><span class="badge-status ${log.status === 'Present' ? 'approved' : 'rejected'}">${log.status}</span></td>
                    <td class="text-center">${cleanTimeIn}</td>
                    <td class="text-center">${cleanTimeOut}</td>
                    <td class="text-center">${cleanMarkedBy}</td>
                </tr>
            `;
        });
    }
}

function renderManagerAttendanceTab() {
    const db = getDb();
    const team = db.users.filter(u => (u.role === 'User' || u.role === 'Employee') && (u.managerId === currentUser.id || u.managerId === currentUser.name || u.managerId === currentUser.email));
    const teamEmails = team.map(t => t.id);
    const filterDate = document.getElementById('manager-attendance-filter-date').value;

    const tableBody = document.getElementById('manager-attendance-table-body');
    tableBody.innerHTML = '';

    let logs = db.attendance.filter(a => teamEmails.includes(a.employeeId));
    if (filterDate) logs = logs.filter(l => l.date === filterDate);

    logs.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (logs.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="empty-state">No team attendance logs found.</td></tr>`;
    } else {
        logs.forEach(log => {
            const cleanTimeIn = (log.timeIn && log.timeIn.includes(':')) ? log.timeIn : '-';
            const cleanTimeOut = (log.timeOut && log.timeOut.includes(':')) ? log.timeOut : '-';
            const cleanMarkedBy = (log.markedBy && log.markedBy.trim() !== '') ? log.markedBy : 'System';

            tableBody.innerHTML += `
                <tr>
                    <td>${log.date}</td>
                    <td class="bold">${log.employeeName} <span style="font-size: 0.85em; color: var(--text-muted); font-weight: normal;">(${log.employeeId})</span></td>
                    <td><span class="badge-status ${log.status === 'Present' ? 'approved' : 'rejected'}">${log.status}</span></td>
                    <td class="text-center">${cleanTimeIn}</td>
                    <td class="text-center">${cleanTimeOut}</td>
                    <td class="text-center">${cleanMarkedBy}</td>
                </tr>
            `;
        });
    }
}

function renderEmployeeAttendanceTab() {
    const db = getDb();
    const tableBody = document.getElementById('employee-tab-attendance-table');
    tableBody.innerHTML = '';

    const myAtt = db.attendance.filter(a => a.employeeId === currentUser.id);
    myAtt.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (myAtt.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="3" class="empty-state">No attendance records.</td></tr>`;
    } else {
        myAtt.forEach(att => {
            tableBody.innerHTML += `
                <tr>
                    <td>${att.date}</td>
                    <td><span class="badge-status ${att.status === 'Present' ? 'approved' : 'rejected'}">${att.status}</span></td>
                    <td>${att.timeIn || '-'}</td>
                    <td>${att.timeOut || '-'}</td>
                    <td>${att.markedBy || 'System'}</td>
                </tr>
            `;
        });
    }
}

function renderAdminLeaveTab() {
    renderLeaveTypes();
    const db = getDb();
    
    if(window.renderAdminLeaveBalancesList) {
        window.renderAdminLeaveBalancesList();
    }

    const tableBody = document.getElementById('admin-leave-table-body');
    tableBody.innerHTML = '';

    // Sort leaves status: pending first, then by date
    const leaves = db.leaves;
    leaves.sort((a, b) => {
        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
        if (a.status !== 'Pending' && b.status === 'Pending') return 1;
        return new Date(b.startDate) - new Date(a.startDate);
    });

    if (leaves.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="empty-state">No leave applications found.</td></tr>`;
    } else {
        leaves.forEach(l => {
            const statusClass = l.status === 'Approved' ? 'approved' : (l.status === 'Rejected' ? 'rejected' : 'pending');
            let actionBtnHTML = '';
            if (l.status === 'Pending') {
                actionBtnHTML = `<button class="btn btn-sm btn-outline" onclick="reviewLeaveRequest('${l.id}')">Review</button>`;
            } else {
                actionBtnHTML = `<span class="text-muted">Reviewed</span>`;
            }

            tableBody.innerHTML += `
                <tr>
                    <td class="bold">${l.employeeName} <span style="font-size: 0.85em; color: var(--text-muted); font-weight: normal;">(${l.employeeId})</span></td>
                    <td><span class="badge-role employee">${l.type}</span></td>
                    <td>${l.startDate} to ${l.endDate}</td>
                    <td class="italic">"${l.reason}"</td>
                    <td><span class="badge-status ${statusClass}">${l.status}</span></td>
                    <td><span class="text-muted italic">${l.comments || 'â€”'}</span></td>
                    <td>${actionBtnHTML}</td>
                </tr>
            `;
        });
    }
}

function renderManagerLeaveTab() {
    const db = getDb();
    const team = db.users.filter(u => (u.role === 'User' || u.role === 'Employee') && (u.managerId === currentUser.id || u.managerId === currentUser.name || u.managerId === currentUser.email));
    const teamEmails = team.map(t => t.id);

    const tableBody = document.getElementById('manager-leave-table-body');
    tableBody.innerHTML = '';

    const leaves = db.leaves.filter(l => teamEmails.includes(l.employeeId));
    leaves.sort((a, b) => {
        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
        if (a.status !== 'Pending' && b.status === 'Pending') return 1;
        return new Date(b.startDate) - new Date(a.startDate);
    });

    if (leaves.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="empty-state">No team leave requests found.</td></tr>`;
    } else {
        leaves.forEach(l => {
            const statusClass = l.status === 'Approved' ? 'approved' : (l.status === 'Rejected' ? 'rejected' : 'pending');
            let actionsHTML = '';
            if (l.status === 'Pending') {
                actionsHTML = `<button class="btn btn-sm btn-outline" onclick="reviewLeaveRequest('${l.id}')">Review</button>`;
            } else {
                actionsHTML = `<span class="text-muted">Reviewed</span>`;
            }

            tableBody.innerHTML += `
                <tr>
                    <td class="bold">${l.employeeName} <span style="font-size: 0.85em; color: var(--text-muted); font-weight: normal;">(${l.employeeId})</span></td>
                    <td><span class="badge-role employee">${l.type}</span></td>
                    <td>${l.startDate} to ${l.endDate}</td>
                    <td class="italic">"${l.reason}"</td>
                    <td><span class="badge-status ${statusClass}">${l.status}</span></td>
                    <td><span class="text-muted italic">${l.comments || 'â€”'}</span></td>
                    <td>${actionsHTML}</td>
                </tr>
            `;
        });
    }
}

function renderEmployeeLeaveTab() {
    const db = getDb();
    const tableBody = document.getElementById('employee-tab-leave-table');
    tableBody.innerHTML = '';

    const myLeaves = db.leaves.filter(l => l.employeeId === currentUser.id);
    myLeaves.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    if (myLeaves.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="empty-state">No leave applications submitted.</td></tr>`;
    } else {
        myLeaves.forEach(l => {
            const statusClass = l.status === 'Approved' ? 'approved' : (l.status === 'Rejected' ? 'rejected' : 'pending');
            tableBody.innerHTML += `
                <tr>
                    <td><span class="badge-role employee">${l.type}</span></td>
                    <td>${l.startDate}</td>
                    <td>${l.endDate}</td>
                    <td class="italic">"${l.reason}"</td>
                    <td><span class="badge-status ${statusClass}">${l.status}</span></td>
                    <td><span class="text-muted italic">${l.comments || 'â€”'}</span></td>
                </tr>
            `;
        });
    }
}

function renderLeaveTypes() {
    const db = getDb();
    const tbody = document.getElementById('settings-leave-types-body');
    tbody.innerHTML = '';
    
    let leaveTypes = db.companyProfile?.leaveTypes;
    if (!leaveTypes || !Array.isArray(leaveTypes)) {
        leaveTypes = [
            { id: 'L1', name: 'Casual Leave', days: 5 },
            { id: 'L2', name: 'Medical Leave', days: 5 },
            { id: 'L3', name: 'Annual Leave', days: 15 }
        ];
        if (!db.companyProfile) db.companyProfile = {};
        db.companyProfile.leaveTypes = leaveTypes;
        saveDb(db);
    }
    
    if (leaveTypes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="empty-state">No leave types configured.</td></tr>`;
    } else {
        leaveTypes.forEach(lt => {
            tbody.innerHTML += `
                <tr>
                    <td><input type="text" class="form-control form-control-sm" id="lt-name-${lt.id}" value="${lt.name}"></td>
                    <td><input type="number" class="form-control form-control-sm" id="lt-days-${lt.id}" value="${lt.days}"></td>
                    <td>
                        <button type="button" class="btn-action-circle text-success" onclick="saveLeaveType('${lt.id}')" tooltip="Save">
                            <i class="fa-solid fa-save"></i>
                        </button>
                        <button type="button" class="btn-action-circle text-danger" onclick="deleteLeaveType('${lt.id}')" tooltip="Delete">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    }
}

