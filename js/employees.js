// employees.js

function renderAdminEmployeesTab() {
    const db = getDb();
    const empTableBody = document.getElementById('admin-tab-employees-table-body');
    const salariesTableBody = document.getElementById('admin-tab-salaries-table-body');
    const cardsContainer = document.getElementById('admin-tab-cards-container');
    const inactiveTableBody = document.getElementById('admin-tab-inactive-table-body');
    const teamsContainer = document.getElementById('admin-tab-teams-container');

    // 1. Populate Employees Sub-tab Table (All Active Users, Sorted)
    if (empTableBody) {
        empTableBody.innerHTML = '';

        // Filter out inactive users and sort: Admin > Manager > User
        let activeUsers = db.users.filter(user => user.status === 'Active');
        const roleOrder = { 'Admin': 1, 'Manager': 2, 'User': 3, 'Employee': 4 };
        activeUsers.sort((a, b) => (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99));

        if (activeUsers.length === 0) {
            empTableBody.innerHTML = `<tr><td colspan="6" class="empty-state">No active employees found.</td></tr>`;
        } else {
            activeUsers.forEach(user => {
                const mgr = db.users.find(u => u.id === user.managerId || u.name === user.managerId || u.email === user.managerId);
                const mgrName = mgr ? mgr.name : '<span class="text-muted">None</span>';
                const role = user.role || 'User';
                const roleClass = role.toLowerCase();
                const statusClass = 'badge-active';

                empTableBody.innerHTML += `
                    <tr>
                        <td class="bold">${user.name}</td>
                        <td>${user.email}</td>
                        <td>${mgrName}</td>
                        <td><span class="badge-role ${roleClass}">${role}</span></td>
                        <td><span class="${statusClass}">${user.status}</span></td>
                        <td>
                            <div class="btn-action-group">
                                <button class="btn-action-circle" onclick="viewUserProfile('${user.id}')" tooltip="View Profile"><i class="fa-regular fa-eye"></i></button>
                                <button class="btn-action-circle" onclick="openEditEmployeeModal('${user.id}')" tooltip="Edit"><i class="fa-regular fa-pen-to-square"></i></button>
                                <button class="btn-action-circle btn-delete" onclick="deleteEmployee('${user.id}')" tooltip="Delete" style="color: var(--danger);"><i class="fa-regular fa-trash-can"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }
    }

    // 3. Populate Teams Sub-tab Cards Grid
    if (teamsContainer) {
        teamsContainer.innerHTML = '';
        const managers = db.users.filter(user => (user.role === 'Manager' || user.role === 'Admin') && user.status === 'Active');

        if (managers.length === 0) {
            teamsContainer.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">No team managers or admins found. Create a Manager to build a team.</div>`;
        }

        managers.forEach(manager => {
            const mgrInitials = getInitials(manager.name);
            const teamEmployees = db.users.filter(u => (u.role === 'User' || u.role === 'Employee') && (u.managerId === manager.id || u.managerId === manager.name || u.managerId === manager.email) && u.status === 'Active');

            let membersHTML = '';
            if (teamEmployees.length === 0) {
                membersHTML = `<div style="color: var(--text-muted); font-size: 12px; font-style: italic; text-align: center; padding: 15px 0;">No team members assigned</div>`;
            } else {
                teamEmployees.forEach(emp => {
                    const empInitials = getInitials(emp.name);
                    const statusClass = emp.status === 'Active' ? 'active' : 'inactive';
                    membersHTML += `
                        <div class="team-member-item">
                            <div class="team-member-left">
                                <div class="team-member-avatar" style="background: rgba(95, 59, 246, 0.1); color: #5f3bf6;">${empInitials}</div>
                                <div class="team-member-info">
                                    <span class="team-member-name">${emp.name}</span>
                                    <span class="team-member-email">${emp.email}</span>
                                </div>
                            </div>
                            <span class="team-member-status ${statusClass}">${emp.status}</span>
                        </div>
                    `;
                });
            }

            teamsContainer.innerHTML += `
                <div class="team-card bg-glass">
                    <div class="team-leader">
                        <div class="avatar">${mgrInitials}</div>
                        <div class="team-leader-info">
                            <h4>${manager.name}</h4>
                            <span>Team Lead / Manager</span>
                        </div>
                    </div>
                    <div class="team-members-list">
                        ${membersHTML}
                    </div>
                </div>
            `;
        });

        // Unassigned employees are intentionally hidden from Teams view
        // They appear in the Employees tab with no manager label
    }

    // 5. Populate Employee Cards Sub-tab
    if (cardsContainer) {
        cardsContainer.innerHTML = '';
    }

    // 6. Populate Inactive Sub-tab Table
    if (inactiveTableBody) {
        inactiveTableBody.innerHTML = '';
        let inactiveUsers = db.users.filter(user => user.status === 'Inactive');

        if (inactiveUsers.length === 0) {
            inactiveTableBody.innerHTML = `<tr><td colspan="4" class="empty-state">No inactive staff.</td></tr>`;
        } else {
            inactiveUsers.forEach(user => {
                const roleClass = user.role.toLowerCase();

                inactiveTableBody.innerHTML += `
                    <tr style="opacity: 0.7;">
                        <td class="bold">${user.name}</td>
                        <td><span class="badge-role ${roleClass}">${user.role}</span></td>
                        <td>${user.startDate || '-'}</td>
                        <td class="text-danger bold">${user.endDate || '-'}</td>
                    </tr>
                `;
            });
        }
    }
}

function renderManagerTeamTab() {
    const db = getDb();
    const teamMembers = db.users.filter(u => (u.role === 'User' || u.role === 'Employee') && (u.managerId === currentUser.id || u.managerId === currentUser.name || u.managerId === currentUser.email));
    const tableBody = document.getElementById('manager-tab-team-table-body');
    tableBody.innerHTML = '';

    const today = new Date().toISOString().split('T')[0];

    if (teamMembers.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="empty-state">No assigned team members.</td></tr>`;
    } else {
        teamMembers.forEach(emp => {
            // Attendance today status
            const attToday = db.attendance.find(a => a.employeeId === emp.id && a.date === today);
            const attStatus = attToday ? attToday.status : 'Absent';

            // Score
            const totalScore = db.productivity.filter(p => p.employeeId === emp.id && p.status === 'Approved').reduce((s, p) => s + p.score, 0);
            const statusClass = emp.status === 'Active' ? 'badge-active' : 'badge-inactive';
            const attClass = attStatus === 'Present' ? 'approved' : 'rejected';

            tableBody.innerHTML += `
                <tr>
                    <td class="bold">${emp.name}</td>
                    <td>${emp.email}</td>
                    <td><span class="badge-status ${attClass}">${attStatus}</span></td>
                    <td><strong class="text-info">${totalScore}</strong></td>
                    <td><span class="${statusClass}">${emp.status}</span></td>
                    <td>
                        <button class="btn btn-action-circle" onclick="viewUserProfile('${emp.id}')" tooltip="View Profile"><i class="fa-regular fa-eye"></i></button>
                    </td>
                </tr>
            `;
        });
    }
}

