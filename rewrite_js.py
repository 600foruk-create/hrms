import sys

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add new functions for Admin Attendance
new_funcs = '''
function renderAdminMyAttendance() {
    const db = getDb();
    const tableBody = document.getElementById('admin-my-attendance-table-body');
    tableBody.innerHTML = '';
    
    let logs = db.attendance.filter(l => l.employeeId === currentUser.id);
    logs.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (logs.length === 0) {
        tableBody.innerHTML = <tr><td colspan="4" class="empty-state">No attendance records found.</td></tr>;
    } else {
        logs.forEach(log => {
            const cleanTimeIn = (log.timeIn && log.timeIn.includes(':')) ? log.timeIn : '-';
            const cleanTimeOut = (log.timeOut && log.timeOut.includes(':')) ? log.timeOut : '-';
            tableBody.innerHTML += 
                <tr>
                    <td></td>
                    <td><span class="badge-status "></span></td>
                    <td class="text-center"></td>
                    <td class="text-center"></td>
                </tr>
            ;
        });
    }
}

function renderAdminAttendanceSlab() {
    const db = getDb();
    const dateInput = document.getElementById('admin-slab-filter-date');
    if (!dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    const filterDate = dateInput.value;
    
    const tableBody = document.getElementById('admin-attendance-slab-table-body');
    tableBody.innerHTML = '';
    
    // Get all users except admin (or include admin too, but usually employees)
    const users = db.users.filter(u => u.status !== 'Inactive');
    
    let defaulters = [];
    
    users.forEach(u => {
        const log = db.attendance.find(l => l.employeeId === u.id && l.date === filterDate);
        let status = 'Absent';
        if (log) {
            status = log.status;
        }
        
        if (status === 'Absent' || status === 'Half Day' || status === 'Late') {
            defaulters.push({
                employeeId: u.displayId || u.id,
                employeeName: u.name,
                role: u.role,
                status: status,
                contact: u.phone || u.email
            });
        }
    });
    
    if (defaulters.length === 0) {
        tableBody.innerHTML = <tr><td colspan="5" class="empty-state">No defaulters found for this date.</td></tr>;
    } else {
        defaulters.forEach(d => {
            tableBody.innerHTML += 
                <tr>
                    <td class="text-secondary"></td>
                    <td class="bold"></td>
                    <td><span class="badge-role "></span></td>
                    <td><span class="badge-status rejected"></span></td>
                    <td class="italic"></td>
                </tr>
            ;
        });
    }
}
'''

# We need to insert these functions before unction renderAdminLeaveTab
idx = content.find('function renderAdminLeaveTab()')
if idx != -1:
    content = content[:idx] + new_funcs + content[idx:]
else:
    print("Could not find renderAdminLeaveTab")
    sys.exit(1)


# Update renderAdminLeaveTab to use admin-leave-requests-table-body and correct columns
old_leave_tab = '''function renderAdminLeaveTab() {
    renderLeaveTypes();
    const db = getDb();

    if (window.renderAdminLeaveBalancesList) {
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
        tableBody.innerHTML = <tr><td colspan="8" class="empty-state">No leave applications found.</td></tr>;
    } else {
        leaves.forEach(l => {
            const statusClass = l.status === 'Approved' ? 'approved' : (l.status === 'Rejected' ? 'rejected' : 'pending');
            let actionBtnHTML = '';
            if (l.status === 'Pending') {
                actionBtnHTML = <button class="btn btn-sm btn-outline" onclick="reviewLeaveRequest('')">Review</button>;
            } else {
                actionBtnHTML = <span class="text-muted">Reviewed</span>;
            }

            tableBody.innerHTML += 
                <tr>
                    <td class="bold"></td>
                    <td><span class="badge-role employee"></span></td>
                    <td> to </td>
                    <td class="italic">""</td>
                    <td><span class="badge-status "></span></td>
                    <td><span class="text-muted italic"></span></td>
                    <td></td>
                </tr>
            ;
        });
    }
}'''

new_leave_tab = '''function renderAdminLeaveTab() {
    renderLeaveTypes();
    const db = getDb();

    if (window.renderAdminLeaveBalancesList) {
        window.renderAdminLeaveBalancesList();
    }

    const tableBody = document.getElementById('admin-leave-requests-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const leaves = db.leaves;
    leaves.sort((a, b) => {
        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
        if (a.status !== 'Pending' && b.status === 'Pending') return 1;
        return new Date(b.startDate) - new Date(a.startDate);
    });

    if (leaves.length === 0) {
        tableBody.innerHTML = <tr><td colspan="8" class="empty-state">No leave applications found.</td></tr>;
    } else {
        leaves.forEach(l => {
            const statusClass = l.status === 'Approved' ? 'approved' : (l.status === 'Rejected' ? 'rejected' : 'pending');
            let actionBtnHTML = '';
            if (l.status === 'Pending') {
                actionBtnHTML = <button class="btn btn-sm btn-outline" onclick="reviewLeaveRequest('')">Review</button>;
            } else {
                actionBtnHTML = <span class="text-muted">Reviewed</span>;
            }
            
            const emp = db.users.find(u => u.id === l.employeeId);
            const empRole = emp ? emp.role : 'Employee';

            tableBody.innerHTML += 
                <tr>
                    <td class="text-secondary"></td>
                    <td class="bold"></td>
                    <td><span class="badge-role "></span></td>
                    <td><span class="badge-role" style="background:var(--primary-light); color:var(--primary);"></span></td>
                    <td> to </td>
                    <td class="italic">""</td>
                    <td><span class="badge-status "></span></td>
                    <td></td>
                </tr>
            ;
        });
    }
}'''

content = content.replace(old_leave_tab, new_leave_tab)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("JS modifications applied successfully")
