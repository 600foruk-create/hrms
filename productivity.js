/**
 * Employee Productivity Tracker (EPT) Module
 * Handles UI logic for Admin, Manager, and Employee productivity views.
 */

const EPT_TASK_TYPES = {
    'Billing': {
        fields: [
            { id: 'claims_processed', label: 'Claims Processed', type: 'number' }
        ]
    },
    'Payment Posting': {
        fields: [
            { id: 'era_eob_count', label: 'ERA/EOB Count', type: 'number' },
            { id: 'amount_posted', label: 'Amount Posted ($)', type: 'number' }
        ]
    },
    'Authorizations': {
        fields: [
            { id: 'cases_handled', label: 'Cases Handled', type: 'number' }
        ]
    },
    'Follow-up': {
        fields: [
            { id: 'accounts_touched', label: 'Accounts Touched', type: 'number' }
        ]
    },
    'Other': {
        fields: [
            { id: 'description', label: 'Description', type: 'text' }
        ]
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Admin filters
    safeAddListener('admin-ept-filter-date', 'change', renderAdminProductivityTab);
    safeAddListener('admin-ept-filter-manager', 'change', renderAdminProductivityTab);
    safeAddListener('admin-ept-filter-practice', 'change', renderAdminProductivityTab);
    
    // Manager filters
    safeAddListener('manager-ept-filter-date', 'change', renderManagerProductivityTab);
    safeAddListener('manager-ept-filter-emp', 'change', renderManagerProductivityTab);
    safeAddListener('manager-ept-filter-practice', 'change', renderManagerProductivityTab);
    safeAddListener('manager-ept-filter-status', 'change', renderManagerProductivityTab);
    
    // Employee buttons
    safeAddListener('btn-ept-add-task', 'click', () => addEPTTaskRow());
    
    const eptLogForm = document.getElementById('ept-log-form');
    if (eptLogForm) eptLogForm.addEventListener('submit', handleEPTLogSubmit);

    const practiceForm = document.getElementById('ept-practice-form');
    if (practiceForm) practiceForm.addEventListener('submit', handlePracticeSubmit);

    // Review Actions
    safeAddListener('btn-ept-approve', 'click', () => processEPTReview('Approved'));
    safeAddListener('btn-ept-flag', 'click', () => processEPTReview('Flagged'));
});

// ==========================================
// ADMIN VIEW
// ==========================================
window.renderAdminProductivityTab = function() {
    const db = getDb();
    const filterDate = document.getElementById('admin-ept-filter-date').value;
    const filterManager = document.getElementById('admin-ept-filter-manager').value;
    const filterPractice = document.getElementById('admin-ept-filter-practice').value;
    
    // Populate Managers Filter
    const managerSelect = document.getElementById('admin-ept-filter-manager');
    if (managerSelect.options.length <= 1) {
        db.users.filter(u => u.role === 'Manager').forEach(m => {
            managerSelect.innerHTML += `<option value="${m.id}">${m.name}</option>`;
        });
    }

    // Populate Practices Filter
    const practiceSelect = document.getElementById('admin-ept-filter-practice');
    if (practiceSelect.options.length <= 1) {
        db.practices.forEach(p => {
            practiceSelect.innerHTML += `<option value="${p.id}">${p.practice_name} (${p.practice_code})</option>`;
        });
    }

    const tableBody = document.getElementById('admin-ept-table-body');
    tableBody.innerHTML = '';

    let logs = db.productivity_logs;
    if (filterDate) logs = logs.filter(l => l.log_date === filterDate);
    if (filterPractice) logs = logs.filter(l => l.practice_id === filterPractice);
    
    if (filterManager) {
        const teamIds = db.users.filter(u => u.managerId === filterManager).map(u => u.id);
        logs = logs.filter(l => teamIds.includes(l.employee_id));
    }

    logs.sort((a, b) => new Date(b.log_date) - new Date(a.log_date));

    if (logs.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="empty-state">No productivity logs found.</td></tr>`;
    } else {
        logs.forEach(log => {
            const emp = db.users.find(u => u.id === log.employee_id) || {};
            const practice = db.practices.find(p => p.id === log.practice_id) || {};
            const manager = db.users.find(u => u.id === emp.managerId) || { name: 'None' };
            const tasks = db.productivity_tasks.filter(t => t.log_id === log.id);
            
            const totalTime = tasks.reduce((sum, t) => sum + parseInt(t.time_minutes || 0), 0);
            
            tableBody.innerHTML += `
                <tr>
                    <td>${log.log_date}</td>
                    <td class="bold">${emp.name || log.employee_id}</td>
                    <td>${manager.name}</td>
                    <td>${practice.practice_name || 'Unknown'}</td>
                    <td>${tasks.length}</td>
                    <td>${totalTime}m</td>
                    <td><button class="btn btn-sm btn-outline" onclick="viewEPTLog('${log.id}')">View</button></td>
                </tr>
            `;
        });
    }
};

window.openPracticeManagerModal = function() {
    const db = getDb();
    document.getElementById('ept-practice-id').value = '';
    document.getElementById('ept-practice-name').value = '';
    document.getElementById('ept-practice-code').value = '';
    
    const managerList = document.getElementById('ept-practice-manager-list');
    managerList.innerHTML = '';
    db.users.filter(u => u.role === 'Manager').forEach(m => {
        managerList.innerHTML += `<label><input type="checkbox" value="${m.id}"> ${m.name}</label>`;
    });

    openModal('modal-ept-practice');
};

function handlePracticeSubmit(e) {
    e.preventDefault();
    const db = getDb();
    const id = document.getElementById('ept-practice-id').value || `PRAC-${Date.now()}`;
    const name = document.getElementById('ept-practice-name').value;
    const code = document.getElementById('ept-practice-code').value;
    
    // Get selected managers
    const selectedManagers = Array.from(document.querySelectorAll('#ept-practice-manager-list input:checked')).map(cb => cb.value);
    
    // Save Practice
    const existingIndex = db.practices.findIndex(p => p.id === id);
    if (existingIndex >= 0) {
        db.practices[existingIndex] = { id, practice_name: name, practice_code: code };
    } else {
        db.practices.push({ id, practice_name: name, practice_code: code });
    }

    // Update manager_practices
    db.manager_practices = db.manager_practices.filter(mp => mp.practice_id !== id);
    selectedManagers.forEach(mId => {
        db.manager_practices.push({ id: `MP-${Date.now()}-${Math.random()}`, manager_id: mId, practice_id: id });
    });

    saveDb(db);
    closeAllModals();
    showToast('Success', 'Practice saved successfully');
    renderAdminProductivityTab();
}


// ==========================================
// MANAGER VIEW
// ==========================================
window.renderManagerProductivityTab = function() {
    const db = getDb();
    const team = db.users.filter(u => u.managerId === currentUser.id || u.managerId === currentUser.name || u.managerId === currentUser.email);
    const teamIds = team.map(t => t.id);

    const filterDate = document.getElementById('manager-ept-filter-date').value;
    const filterEmp = document.getElementById('manager-ept-filter-emp').value;
    const filterPractice = document.getElementById('manager-ept-filter-practice').value;
    const filterStatus = document.getElementById('manager-ept-filter-status').value;

    const empSelect = document.getElementById('manager-ept-filter-emp');
    if (empSelect.options.length <= 1) {
        team.forEach(e => {
            empSelect.innerHTML += `<option value="${e.id}">${e.name}</option>`;
        });
    }

    const practiceSelect = document.getElementById('manager-ept-filter-practice');
    if (practiceSelect.options.length <= 1) {
        // Manager can only see practices assigned to them
        const myPracticeIds = db.manager_practices.filter(mp => mp.manager_id === currentUser.id).map(mp => mp.practice_id);
        db.practices.filter(p => myPracticeIds.includes(p.id)).forEach(p => {
            practiceSelect.innerHTML += `<option value="${p.id}">${p.practice_name}</option>`;
        });
    }

    const tableBody = document.getElementById('manager-ept-table-body');
    tableBody.innerHTML = '';

    let logs = db.productivity_logs.filter(l => teamIds.includes(l.employee_id));
    if (filterDate) logs = logs.filter(l => l.log_date === filterDate);
    if (filterEmp) logs = logs.filter(l => l.employee_id === filterEmp);
    if (filterPractice) logs = logs.filter(l => l.practice_id === filterPractice);

    logs.sort((a, b) => new Date(b.log_date) - new Date(a.log_date));

    if (logs.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="empty-state">No productivity logs found.</td></tr>`;
    } else {
        logs.forEach(log => {
            const emp = db.users.find(u => u.id === log.employee_id) || {};
            const practice = db.practices.find(p => p.id === log.practice_id) || {};
            let tasks = db.productivity_tasks.filter(t => t.log_id === log.id);
            
            if (filterStatus) {
                tasks = tasks.filter(t => t.status === filterStatus);
            }
            if (tasks.length === 0 && filterStatus) return; // Hide if no tasks match status

            const totalTime = tasks.reduce((sum, t) => sum + parseInt(t.time_minutes || 0), 0);
            const taskTypes = [...new Set(tasks.map(t => t.task_type))].join(', ');
            
            // Determine overall status for row visually
            let overallStatus = 'Pending';
            if (tasks.every(t => t.status === 'Approved')) overallStatus = 'Approved';
            else if (tasks.some(t => t.status === 'Flagged')) overallStatus = 'Flagged';

            const statusClass = overallStatus === 'Approved' ? 'approved' : (overallStatus === 'Flagged' ? 'rejected' : 'pending');

            tableBody.innerHTML += `
                <tr>
                    <td>${log.log_date}</td>
                    <td class="bold">${emp.name}</td>
                    <td>${practice.practice_name || 'Unknown'}</td>
                    <td>${taskTypes}</td>
                    <td>${totalTime}m</td>
                    <td><span class="badge-status ${statusClass}">${overallStatus}</span></td>
                    <td><button class="btn btn-sm btn-outline" onclick="reviewEPTLog('${log.id}')">Review Tasks</button></td>
                </tr>
            `;
        });
    }
};

window.reviewEPTLog = function(logId) {
    const db = getDb();
    const log = db.productivity_logs.find(l => l.id === logId);
    if (!log) return;

    const emp = db.users.find(u => u.id === log.employee_id) || {};
    const practice = db.practices.find(p => p.id === log.practice_id) || {};
    const tasks = db.productivity_tasks.filter(t => t.log_id === log.id);

    document.getElementById('ept-review-id').value = log.id;
    document.getElementById('ept-review-emp').textContent = emp.name;
    document.getElementById('ept-review-practice').textContent = practice.practice_name;
    document.getElementById('ept-review-date').textContent = log.log_date;
    document.getElementById('ept-review-comment').value = '';

    const container = document.getElementById('ept-review-tasks-container');
    container.innerHTML = '';

    tasks.forEach((t, i) => {
        let extraHtml = '';
        if (t.extra_data) {
            try {
                const parsed = typeof t.extra_data === 'string' ? JSON.parse(t.extra_data) : t.extra_data;
                for (let key in parsed) {
                    extraHtml += `<span class="badge-role employee">${key}: ${parsed[key]}</span> `;
                }
            } catch(e) {}
        }
        
        container.innerHTML += `
            <div class="task-review-block bg-light" style="padding:10px; margin-bottom:10px; border-radius:5px;">
                <strong>Task ${i+1}: ${t.task_type}</strong> <span class="badge-status ${t.status === 'Approved' ? 'approved' : (t.status === 'Flagged' ? 'rejected' : 'pending')}">${t.status}</span><br>
                <div style="font-size:13px; margin:5px 0;">
                    ${extraHtml}
                    <span class="badge-role manager">Time: ${t.time_minutes}m</span>
                </div>
                <div style="font-size:13px; font-style:italic;">"${t.notes || 'No notes'}"</div>
            </div>
        `;
    });

    openModal('modal-ept-review');
};

function processEPTReview(status) {
    const db = getDb();
    const logId = document.getElementById('ept-review-id').value;
    const comments = document.getElementById('ept-review-comment').value;

    const tasks = db.productivity_tasks.filter(t => t.log_id === logId);
    tasks.forEach(t => {
        t.status = status;
        t.comments = comments;
    });

    saveDb(db);
    closeAllModals();
    showToast("Review Complete", `Tasks marked as ${status}`);
    
    if (currentUser.role === 'Manager') renderManagerProductivityTab();
    else if (currentUser.role === 'Admin') renderAdminProductivityTab();
}

window.viewEPTLog = window.reviewEPTLog;

// ==========================================
// EMPLOYEE VIEW
// ==========================================
window.renderEmployeeProductivityTab = function() {
    const db = getDb();
    const tableBody = document.getElementById('employee-ept-table-body');
    tableBody.innerHTML = '';

    let logs = db.productivity_logs.filter(l => l.employee_id === currentUser.id);
    logs.sort((a, b) => new Date(b.log_date) - new Date(a.log_date));

    if (logs.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="empty-state">No productivity logs found.</td></tr>`;
    } else {
        logs.forEach(log => {
            const practice = db.practices.find(p => p.id === log.practice_id) || {};
            const tasks = db.productivity_tasks.filter(t => t.log_id === log.id);
            const totalTime = tasks.reduce((sum, t) => sum + parseInt(t.time_minutes || 0), 0);
            const taskTypes = [...new Set(tasks.map(t => t.task_type))].join(', ');
            
            let overallStatus = 'Pending';
            if (tasks.every(t => t.status === 'Approved')) overallStatus = 'Approved';
            else if (tasks.some(t => t.status === 'Flagged')) overallStatus = 'Flagged';

            const statusClass = overallStatus === 'Approved' ? 'approved' : (overallStatus === 'Flagged' ? 'rejected' : 'pending');
            const comments = tasks.map(t => t.comments).filter(c => c).join('; ') || '—';

            tableBody.innerHTML += `
                <tr>
                    <td>${log.log_date}</td>
                    <td class="bold">${practice.practice_name || 'Unknown'}</td>
                    <td>${taskTypes}</td>
                    <td>${totalTime}m</td>
                    <td><span class="badge-status ${statusClass}">${overallStatus}</span></td>
                    <td class="text-muted italic">${comments}</td>
                </tr>
            `;
        });
    }
};

window.openEmployeeProductivityModal = function() {
    const db = getDb();
    document.getElementById('ept-log-date').value = new Date().toISOString().split('T')[0];
    
    // Fetch practices for this employee's manager
    const myManager = currentUser.managerId;
    const practiceSelect = document.getElementById('ept-log-practice');
    practiceSelect.innerHTML = '<option value="">Select Practice</option>';
    
    if (myManager) {
        const allowedPracticeIds = db.manager_practices.filter(mp => mp.manager_id === myManager).map(mp => mp.practice_id);
        db.practices.filter(p => allowedPracticeIds.includes(p.id)).forEach(p => {
            practiceSelect.innerHTML += `<option value="${p.id}">${p.practice_name}</option>`;
        });
    }

    document.getElementById('ept-tasks-container').innerHTML = '';
    addEPTTaskRow(); // Add first default row

    openModal('modal-ept-log');
};

let eptTaskCounter = 0;
function addEPTTaskRow() {
    eptTaskCounter++;
    const id = eptTaskCounter;
    
    const container = document.getElementById('ept-tasks-container');
    const block = document.createElement('div');
    block.className = 'ept-task-block bg-light';
    block.style.padding = '15px';
    block.style.marginBottom = '15px';
    block.style.borderRadius = '8px';
    block.style.border = '1px solid var(--border-color)';
    block.style.position = 'relative';
    
    let typeOptions = '<option value="">Select Task Type</option>';
    for (let t in EPT_TASK_TYPES) {
        typeOptions += `<option value="${t}">${t}</option>`;
    }

    block.innerHTML = `
        <button type="button" class="btn-action-circle text-danger" style="position:absolute; top:10px; right:10px;" onclick="this.parentElement.remove()">
            <i class="fa-solid fa-trash"></i>
        </button>
        <div class="form-row">
            <div class="form-group col">
                <label>Task Type <span class="required">*</span></label>
                <select class="form-control ept-task-type" required onchange="updateEPTTaskFields(this, ${id})">
                    ${typeOptions}
                </select>
            </div>
            <div class="form-group col">
                <label>Time Spent (Minutes) <span class="required">*</span></label>
                <input type="number" class="form-control ept-task-time" required min="1" placeholder="e.g. 60">
            </div>
        </div>
        <div id="ept-dynamic-fields-${id}" class="form-row"></div>
        <div class="form-group mb-0 mt-2">
            <label>Notes / Comments</label>
            <input type="text" class="form-control ept-task-notes" placeholder="Optional notes...">
        </div>
    `;
    container.appendChild(block);
}

window.updateEPTTaskFields = function(selectElem, blockId) {
    const type = selectElem.value;
    const container = document.getElementById(`ept-dynamic-fields-${blockId}`);
    container.innerHTML = '';
    
    if (type && EPT_TASK_TYPES[type]) {
        EPT_TASK_TYPES[type].fields.forEach(field => {
            container.innerHTML += `
                <div class="form-group col">
                    <label>${field.label} <span class="required">*</span></label>
                    <input type="${field.type}" class="form-control ept-dynamic-input" data-key="${field.id}" required>
                </div>
            `;
        });
    }
};

function handleEPTLogSubmit(e) {
    e.preventDefault();
    const db = getDb();
    
    const date = document.getElementById('ept-log-date').value;
    const practiceId = document.getElementById('ept-log-practice').value;
    
    // Date validations
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = today - selectedDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        showToast("Error", "You cannot log productivity for future dates.");
        return;
    }
    if (diffDays > 3) {
        showToast("Error", "You cannot log productivity for more than 3 days in the past without admin approval.");
        return;
    }
    
    const taskBlocks = document.querySelectorAll('.ept-task-block');
    if (taskBlocks.length === 0) {
        showToast("Error", "Please add at least one task.");
        return;
    }

    const logId = `LOG-${Date.now()}`;
    db.productivity_logs.push({
        id: logId,
        employee_id: currentUser.id,
        practice_id: practiceId,
        log_date: date,
        created_at: new Date().toISOString()
    });

    taskBlocks.forEach(block => {
        const type = block.querySelector('.ept-task-type').value;
        const time = block.querySelector('.ept-task-time').value;
        const notes = block.querySelector('.ept-task-notes').value;
        
        const extraData = {};
        let totalCount = 0; // Legacy / general count
        
        block.querySelectorAll('.ept-dynamic-input').forEach(input => {
            extraData[input.getAttribute('data-key')] = input.value;
            // Best effort generic count
            if (input.type === 'number') totalCount += parseInt(input.value || 0);
        });

        db.productivity_tasks.push({
            id: `TASK-${Date.now()}-${Math.random()}`,
            log_id: logId,
            task_type: type,
            total_count: totalCount,
            time_minutes: time,
            extra_data: JSON.stringify(extraData),
            notes: notes,
            status: 'Pending',
            comments: ''
        });
    });

    saveDb(db);
    closeAllModals();
    showToast("Submitted", "Work log submitted successfully!");
    renderEmployeeProductivityTab();
}
