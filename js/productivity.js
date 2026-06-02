// productivity.js

function renderAdminProductivityTab() {
    const db = getDb();
    const filterDate = document.getElementById('admin-prod-filter-date').value;
    const filterTask = document.getElementById('admin-prod-filter-task').value;

    const tableBody = document.getElementById('admin-prod-table-body');
    tableBody.innerHTML = '';

    let submissions = db.productivity;
    if (filterDate) submissions = submissions.filter(s => s.date === filterDate);
    if (filterTask) submissions = submissions.filter(s => s.tasks.includes(filterTask));

    // Sort date desc
    submissions.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (submissions.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="empty-state">No productivity logs found.</td></tr>`;
    } else {
        submissions.forEach(sub => {
            const statusClass = sub.status === 'Approved' ? 'approved' : (sub.status === 'Rejected' ? 'rejected' : 'pending');
            tableBody.innerHTML += `
                <tr>
                    <td>${sub.date}</td>
                    <td>${sub.employeeId}</td>
                    <td class="bold">${sub.employeeName}</td>
                    <td>${sub.tasks.join(', ')}</td>
                    <td>${sub.subcategories.join(', ')}</td>
                    <td>${Object.values(sub.counts).reduce((s, c) => s + c, 0)}</td>
                    <td><strong class="text-info">${sub.score}</strong></td>
                    <td><span class="badge-status ${statusClass}">${sub.status}</span></td>
                    <td><span class="text-muted italic">${sub.comments || 'No comment'}</span></td>
                </tr>
            `;
        });
    }
}

function renderManagerProductivityTab() {
    const db = getDb();
    const team = db.users.filter(u => (u.role === 'User' || u.role === 'Employee') && (u.managerId === currentUser.id || u.managerId === currentUser.name || u.managerId === currentUser.email));
    const teamEmails = team.map(t => t.id);

    // Fill employee filter select options
    const empSelect = document.getElementById('manager-prod-filter-emp');
    const selectedEmp = empSelect.value;
    empSelect.innerHTML = '<option value="">All Team Members</option>';
    team.forEach(e => {
        empSelect.innerHTML += `<option value="${e.id}" ${selectedEmp === e.id ? 'selected' : ''}>${e.name}</option>`;
    });

    const filterStatus = document.getElementById('manager-prod-filter-status').value;

    const tableBody = document.getElementById('manager-prod-table-body');
    tableBody.innerHTML = '';

    let submissions = db.productivity.filter(p => teamEmails.includes(p.employeeId));
    if (selectedEmp) submissions = submissions.filter(s => s.employeeId === selectedEmp);
    if (filterStatus) submissions = submissions.filter(s => s.status === filterStatus);

    submissions.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (submissions.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" class="empty-state">No productivity logs found.</td></tr>`;
    } else {
        submissions.forEach(sub => {
            const statusClass = sub.status === 'Approved' ? 'approved' : (sub.status === 'Rejected' ? 'rejected' : 'pending');
            let actionsHTML = '';
            if (sub.status === 'Pending') {
                actionsHTML = `<button class="btn btn-sm btn-outline" onclick="reviewProductivitySubmission('${sub.id}')">Review</button>`;
            } else {
                actionsHTML = `<span class="text-muted italic">${sub.comments || 'Reviewed'}</span>`;
            }

            tableBody.innerHTML += `
                <tr>
                    <td>${sub.date}</td>
                    <td>${sub.employeeId}</td>
                    <td class="bold">${sub.employeeName}</td>
                    <td>${sub.tasks.join(', ')}</td>
                    <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${sub.notes}">${sub.notes}</td>
                    <td>${Object.values(sub.counts).reduce((s, c) => s + c, 0)}</td>
                    <td>${sub.score}</td>
                    <td><strong class="text-info">${sub.score}</strong></td>
                    <td><span class="badge-status ${statusClass}">${sub.status}</span></td>
                    <td>${actionsHTML}</td>
                </tr>
            `;
        });
    }
}

function renderEmployeeProductivityTab() {
    const db = getDb();
    const tableBody = document.getElementById('employee-tab-productivity-table');
    tableBody.innerHTML = '';

    const myProd = db.productivity.filter(p => p.employeeId === currentUser.id);
    myProd.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (myProd.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="empty-state">No productivity entries recorded.</td></tr>`;
    } else {
        myProd.forEach(p => {
            const statusClass = p.status === 'Approved' ? 'approved' : (p.status === 'Rejected' ? 'rejected' : 'pending');
            tableBody.innerHTML += `
                <tr>
                    <td>${p.date}</td>
                    <td class="bold">${p.tasks.join(', ')}</td>
                    <td>${p.subcategories.join(', ')}</td>
                    <td title="${p.notes}" style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.notes}</td>
                    <td>${Object.values(p.counts).reduce((s, c) => s + c, 0)}</td>
                    <td><strong class="text-info">${p.score}</strong></td>
                    <td><span class="badge-status ${statusClass}">${p.status}</span></td>
                    <td><span class="text-muted italic">${p.comments || 'â€”'}</span></td>
                </tr>
            `;
        });
    }
}

