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
                    <td>${log.employeeId}</td>
                    <td class="bold">${log.employeeName}</td>
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
                    <td>${log.employeeId}</td>
                    <td class="bold">${log.employeeName}</td>
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
                    <td>${l.employeeId}</td>
                    <td class="bold">${l.employeeName}</td>
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
                    <td>${l.employeeId}</td>
                    <td class="bold">${l.employeeName}</td>
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
    const container = document.getElementById('settings-leave-types-accordion');
    if (!container) return;
    
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
    
    let rowsHTML = '';
    if (leaveTypes.length === 0) {
        rowsHTML = `<tr><td colspan="3" class="empty-state">No leave types configured.</td></tr>`;
    } else {
        leaveTypes.forEach(lt => {
            rowsHTML += `
                <tr>
                    <td>
                        <input type="text" class="form-control" id="lt-name-${lt.id}" value="${lt.name}" disabled style="background: transparent; border: 1px solid transparent; color: var(--text-color); box-shadow: none; padding: 5px;">
                    </td>
                    <td>
                        <input type="number" class="form-control" id="lt-days-${lt.id}" value="${lt.days}" disabled style="background: transparent; border: 1px solid transparent; color: var(--text-color); box-shadow: none; padding: 5px;">
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline" id="btn-edit-${lt.id}" onclick="enableEditLeaveType('${lt.id}')"><i class="fa-solid fa-edit"></i> Edit</button>
                        <button class="btn btn-sm btn-primary" id="btn-save-${lt.id}" onclick="saveLeaveType('${lt.id}')" style="display:none;"><i class="fa-solid fa-save"></i> Save</button>
                        <button class="btn btn-sm btn-outline" style="color: var(--danger); border-color: var(--danger);" onclick="deleteLeaveType('${lt.id}')"><i class="fa-solid fa-trash"></i> Delete</button>
                    </td>
                </tr>
            `;
        });
    }

    const masterAccordion = document.getElementById('accordion-saved-policies');
    const isExpanded = masterAccordion ? masterAccordion.classList.contains('expanded') : false;
    
    container.innerHTML = `
        <div class="accordion-item ${isExpanded ? 'expanded' : ''}" id="accordion-saved-policies">
            <div class="accordion-header" onclick="this.parentElement.classList.toggle('expanded')">
                <div style="display: flex; align-items: center;">
                    <h4>Saved Policies</h4>
                </div>
                <div style="display: flex; align-items: center;">
                    <span class="accordion-badge">${leaveTypes.length} Policies</span>
                    <i class="fa-solid fa-chevron-down accordion-toggle-icon"></i>
                </div>
            </div>
            <div class="accordion-body" style="padding: 0;">
                <table class="data-table" style="margin: 0; border-radius: 0 0 10px 10px;">
                    <thead>
                        <tr>
                            <th style="width: 40%;">Leave Type</th>
                            <th style="width: 30%;">Yearly Allowance (Days)</th>
                            <th style="width: 30%;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHTML}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
