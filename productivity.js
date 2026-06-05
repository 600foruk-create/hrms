/**
 * Employee Productivity Tracker (EPT) Module
 */

const EPT_TASK_TYPES = [
    { id: 'claims', label: 'Claims/Billing', icon: 'fa-file-invoice-dollar' },
    { id: 'eligibility', label: 'Eligibility', icon: 'fa-user-check' },
    { id: 'posting', label: 'Payment Posting', icon: 'fa-money-check-dollar' },
    { id: 'general', label: 'General / Other', icon: 'fa-list-check' }
];

// Helper to get db safely
function getEptDb() {
    return window.hrmsDatabase || {};
}

// ==================== GLOBAL UI INITIALIZERS ====================

window.renderAdminProductivityTab = function() {
    window.switchAdminProdSubTab('logs');
};

window.switchAdminProdSubTab = function(subTab) {
    document.querySelectorAll('.admin-prod-sub-section').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('#admin-tab-productivity .btn-sub-tab').forEach(el => el.classList.remove('active'));
    
    document.getElementById('admin-prod-sub-' + subTab).classList.remove('hidden');
    document.getElementById('btn-admin-prod-' + subTab).classList.add('active');
    
    if (subTab === 'logs') {
        renderAdminEptLogs();
    } else if (subTab === 'practices') {
        renderAdminEptPractices();
    }
};

window.renderManagerProductivityTab = function() {
    renderManagerEptDashboard();
};

window.renderEmployeeProductivityTab = function() {
    renderEmployeeEptLogs();
};

// ==================== ADMIN: PRACTICE MANAGEMENT ====================

function renderAdminEptPractices() {
    const db = getEptDb();
    const tbody = document.getElementById('admin-ept-practices-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const practices = db.practices || [];
    const managerPractices = db.managerPractices || [];
    
    if (practices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary">No practices defined.</td></tr>';
        return;
    }
    
    practices.forEach(prac => {
        // Find assigned managers
        const assignments = managerPractices.filter(mp => mp.practice_id == prac.id);
        const managerNames = assignments.map(a => {
            const m = (db.users || []).find(u => u.id == a.manager_id);
            return m ? m.name : 'Unknown';
        }).join(', ');
        
        tbody.innerHTML += `
            <tr>
                <td>${prac.practice_code || '-'}</td>
                <td><strong>${prac.practice_name}</strong></td>
                <td>${managerNames || '<span class="text-secondary italic">Unassigned</span>'}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline text-danger" onclick="deletePractice('${prac.id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

window.openAddPracticeModal = function() {
    const db = getEptDb();
    document.getElementById('prac-code').value = '';
    document.getElementById('prac-name').value = '';
    
    const mgrSelect = document.getElementById('prac-managers');
    mgrSelect.innerHTML = '';
    const managers = (db.users || []).filter(u => u.role === 'Manager');
    managers.forEach(m => {
        mgrSelect.innerHTML += `<option value="${m.id}">${m.name}</option>`;
    });
    
    document.getElementById('modal-add-practice').classList.remove('hidden');
};

document.getElementById('add-practice-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const db = getEptDb();
    if (!db.practices) db.practices = [];
    if (!db.managerPractices) db.managerPractices = [];
    
    const newId = 'PRAC-' + Date.now();
    const practice = {
        id: newId,
        practice_code: document.getElementById('prac-code').value,
        practice_name: document.getElementById('prac-name').value
    };
    db.practices.push(practice);
    
    const mgrSelect = document.getElementById('prac-managers');
    for (let opt of mgrSelect.selectedOptions) {
        db.managerPractices.push({
            id: 'MP-' + Date.now() + Math.random(),
            manager_id: opt.value,
            practice_id: newId
        });
    }
    
    window.saveDb(db);
    document.getElementById('modal-add-practice').classList.add('hidden');
    renderAdminEptPractices();
    showToast('Success', 'Practice added successfully', 'success');
});

// Admin deletes practice (UI only simulation for now)
window.deletePractice = function(id) {
    if(!confirm("Are you sure you want to delete this practice?")) return;
    const db = getEptDb();
    db.practices = db.practices.filter(p => p.id != id);
    db.managerPractices = db.managerPractices.filter(mp => mp.practice_id != id);
    window.saveDb(db);
    renderAdminEptPractices();
    showToast('Deleted', 'Practice removed', 'info');
};

// ==================== ADMIN / MANAGER LOGS ====================

function renderAdminEptLogs() {
    const db = getEptDb();
    const tbody = document.getElementById('admin-ept-logs-table-body');
    if(!tbody) return;
    
    const logs = db.productivityLogs || [];
    tbody.innerHTML = '';
    
    if(logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-secondary">No logs found.</td></tr>';
        return;
    }
    
    // Sort by date desc
    logs.sort((a,b) => new Date(b.log_date) - new Date(a.log_date)).forEach(log => {
        const emp = (db.users || []).find(u => u.id == log.employee_id) || {name: 'Unknown'};
        const prac = (db.practices || []).find(p => p.id == log.practice_id) || {practice_name: 'Unknown'};
        const tasks = (db.productivityTasks || []).filter(t => t.log_id == log.id);
        const totalTime = tasks.reduce((sum, t) => sum + parseInt(t.time_minutes||0), 0);
        
        tbody.innerHTML += `
            <tr>
                <td>${log.log_date}</td>
                <td>${emp.name}</td>
                <td>${emp.assignedManager || '-'}</td>
                <td>${prac.practice_name}</td>
                <td>${tasks.length} task(s)</td>
                <td>${totalTime}</td>
                <td><button class="btn btn-sm btn-outline" onclick="alert('Admin detailed view to be implemented')">View</button></td>
            </tr>
        `;
    });
}

function renderManagerEptDashboard() {
    const db = getEptDb();
    const myEmpIds = (db.users || []).filter(u => u.assignedManager == currentUser.name).map(u => u.id);
    
    const logs = (db.productivityLogs || []).filter(l => myEmpIds.includes(l.employee_id));
    const tasks = db.productivityTasks || [];
    
    // Metrics
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = logs.filter(l => l.log_date === today);
    document.getElementById('manager-ept-metric-today').innerText = todayLogs.length;
    
    // Pending
    let pendingCount = 0;
    logs.forEach(l => {
        const myTasks = tasks.filter(t => t.log_id == l.id && t.status === 'Pending');
        pendingCount += myTasks.length;
    });
    document.getElementById('manager-ept-metric-pending').innerText = pendingCount;
    
    // Render Table
    const tbody = document.getElementById('manager-ept-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    let renderedCount = 0;
    logs.sort((a,b) => new Date(b.log_date) - new Date(a.log_date)).forEach(log => {
        const emp = (db.users || []).find(u => u.id == log.employee_id) || {name: 'Unknown'};
        const prac = (db.practices || []).find(p => p.id == log.practice_id) || {practice_name: 'Unknown'};
        const logTasks = tasks.filter(t => t.log_id == log.id);
        
        logTasks.forEach(task => {
            renderedCount++;
            let statusBadge = `<span class="badge badge-warning">Pending</span>`;
            if(task.status === 'Approved') statusBadge = `<span class="badge badge-success">Approved</span>`;
            if(task.status === 'Flagged') statusBadge = `<span class="badge badge-danger">Flagged</span>`;
            
            tbody.innerHTML += `
                <tr>
                    <td>${log.log_date}</td>
                    <td>${emp.name}</td>
                    <td>${prac.practice_name}</td>
                    <td>${task.task_type}</td>
                    <td>${task.time_minutes}</td>
                    <td><button class="btn btn-sm btn-outline" onclick="window.openEptReviewModal('${task.id}', '${log.id}')">Review</button></td>
                    <td>${statusBadge}</td>
                    <td>
                        ${task.status === 'Pending' ? `
                            <button class="btn btn-sm btn-success" onclick="quickApproveEpt('${task.id}')"><i class="fa-solid fa-check"></i></button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });
    });
    
    if(renderedCount === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-secondary">No submissions from your team yet.</td></tr>';
    }
}

// ==================== EMPLOYEE VIEWS & MODALS ====================

function renderEmployeeEptLogs() {
    const db = getEptDb();
    const container = document.getElementById('employee-ept-logs-container');
    if(!container) return;
    
    const myLogs = (db.productivityLogs || []).filter(l => l.employee_id == currentUser.id);
    const allTasks = db.productivityTasks || [];
    
    container.innerHTML = '';
    if(myLogs.length === 0) {
        container.innerHTML = '<div class="text-center text-secondary p-4">No productivity logs recorded yet.</div>';
        return;
    }
    
    // Group by Date
    myLogs.sort((a,b) => new Date(b.log_date) - new Date(a.log_date)).forEach(log => {
        const prac = (db.practices || []).find(p => p.id == log.practice_id) || {practice_name: 'Unknown'};
        const logTasks = allTasks.filter(t => t.log_id == log.id);
        
        let tasksHtml = '';
        logTasks.forEach(t => {
            let sColor = 'var(--warning)';
            if(t.status==='Approved') sColor = 'var(--success)';
            if(t.status==='Flagged') sColor = 'var(--danger)';
            
            tasksHtml += `
                <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(255,255,255,0.02); margin-top: 5px; border-radius: 4px; border-left: 3px solid ${sColor}">
                    <div><strong>${t.task_type}</strong> - ${t.total_count || 1} items</div>
                    <div><span class="text-secondary">${t.time_minutes} min</span> &nbsp; <span style="color: ${sColor}; font-weight: bold; font-size: 0.8rem;">${t.status || 'Pending'}</span></div>
                </div>
            `;
        });
        
        container.innerHTML += `
            <div style="border: 1px solid var(--border-color); border-radius: 8px; padding: 15px; background: rgba(0,0,0,0.2);">
                <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h4 class="text-primary"><i class="fa-regular fa-calendar"></i> ${log.log_date}</h4>
                    <span class="badge badge-info">${prac.practice_name}</span>
                </div>
                ${tasksHtml || '<div class="text-secondary italic">No tasks.</div>'}
            </div>
        `;
    });
}

let currentEptTaskType = 'claims';

window.openEptFormModal = function() {
    const db = getEptDb();
    // Populate practices (filtered by manager if needed)
    const practiceSelect = document.getElementById('ept-form-practice');
    practiceSelect.innerHTML = '<option value="">Choose a practice...</option>';
    
    // Find my manager's ID
    const myManager = (db.users || []).find(u => u.name === currentUser.assignedManager);
    
    let availablePractices = [];
    if (myManager) {
        const myManagerPractices = (db.managerPractices || []).filter(mp => mp.manager_id == myManager.id).map(mp => mp.practice_id);
        availablePractices = (db.practices || []).filter(p => myManagerPractices.includes(p.id));
    } else {
        availablePractices = db.practices || [];
    }
    
    availablePractices.forEach(p => {
        practiceSelect.innerHTML += `<option value="${p.id}">${p.practice_name} (${p.practice_code})</option>`;
    });
    
    document.getElementById('ept-form-date').value = new Date().toISOString().split('T')[0];
    
    // Render task tabs
    const tabsContainer = document.getElementById('ept-task-tabs');
    tabsContainer.innerHTML = '';
    EPT_TASK_TYPES.forEach(t => {
        tabsContainer.innerHTML += `
            <button type="button" class="btn-sub-tab ${t.id === currentEptTaskType ? 'active' : ''}" onclick="window.switchEptTaskType('${t.id}')">
                <i class="fa-solid ${t.icon}"></i> ${t.label}
            </button>
        `;
    });
    
    window.switchEptTaskType(currentEptTaskType);
    document.getElementById('modal-ept-form').classList.remove('hidden');
};

window.switchEptTaskType = function(typeId) {
    currentEptTaskType = typeId;
    
    // Update tabs UI
    document.querySelectorAll('#ept-task-tabs .btn-sub-tab').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`#ept-task-tabs .btn-sub-tab[onclick*="${typeId}"]`);
    if(btn) btn.classList.add('active');
    
    // Update Fields
    const container = document.getElementById('ept-dynamic-task-fields');
    let html = '';
    
    if (typeId === 'claims') {
        html = `
            <div class="form-group"><label>Claim Status</label>
                <select class="form-control" name="claim_status">
                    <option>Submitted</option><option>Followed-up</option><option>Denied</option>
                </select>
            </div>
            <div class="form-group"><label>Number of Claims</label><input type="number" class="form-control" name="count" required min="1" value="1"></div>
            <div class="form-group"><label>Comments</label><textarea class="form-control" name="comments" rows="2"></textarea></div>
        `;
    } else if (typeId === 'eligibility') {
        html = `
            <div class="form-group"><label>Verification Type</label>
                <select class="form-control" name="verification_type">
                    <option>Portal</option><option>Call</option>
                </select>
            </div>
            <div class="form-group"><label>Number of Patients Checked</label><input type="number" class="form-control" name="count" required min="1" value="1"></div>
            <div class="form-group"><label>Issues Found</label><textarea class="form-control" name="issues"></textarea></div>
        `;
    } else if (typeId === 'posting') {
        html = `
            <div class="form-group"><label>Posting Type</label>
                <select class="form-control" name="posting_type">
                    <option>ERA</option><option>Manual/Paper</option>
                </select>
            </div>
            <div class="form-group"><label>Total Amount Posted ($)</label><input type="number" class="form-control" name="amount" required min="0"></div>
            <div class="form-group"><label>Number of Checks/Batches</label><input type="number" class="form-control" name="count" required min="1" value="1"></div>
        `;
    } else {
        html = `
            <div class="form-group"><label>Task Name</label><input type="text" class="form-control" name="task_name" required></div>
            <div class="form-group"><label>Items Completed</label><input type="number" class="form-control" name="count" required min="1" value="1"></div>
            <div class="form-group"><label>Description</label><textarea class="form-control" name="description"></textarea></div>
        `;
    }
    
    container.innerHTML = html;
};

document.getElementById('ept-submission-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const db = getEptDb();
    if(!db.productivityLogs) db.productivityLogs = [];
    if(!db.productivityTasks) db.productivityTasks = [];
    
    const practiceId = document.getElementById('ept-form-practice').value;
    const logDate = document.getElementById('ept-form-date').value;
    const timeSpent = document.getElementById('ept-form-time').value;
    
    // Find or create Log for this day+practice+employee
    let log = db.productivityLogs.find(l => l.employee_id == currentUser.id && l.practice_id == practiceId && l.log_date == logDate);
    
    if(!log) {
        log = {
            id: 'LOG-' + Date.now(),
            employee_id: currentUser.id,
            practice_id: practiceId,
            log_date: logDate,
            created_at: new Date().toISOString()
        };
        db.productivityLogs.push(log);
    }
    
    // Extract dynamic JSON data
    const container = document.getElementById('ept-dynamic-task-fields');
    const inputs = container.querySelectorAll('input, select, textarea');
    const extraData = {};
    let totalCount = 1;
    
    inputs.forEach(inp => {
        if(inp.name === 'count') totalCount = parseInt(inp.value) || 1;
        else if(inp.name) extraData[inp.name] = inp.value;
    });
    
    const taskTypeObj = EPT_TASK_TYPES.find(t => t.id === currentEptTaskType);
    
    const task = {
        id: 'TSK-' + Date.now() + Math.random(),
        log_id: log.id,
        task_type: taskTypeObj ? taskTypeObj.label : 'Unknown',
        total_count: totalCount,
        time_minutes: timeSpent,
        extra_data: extraData,
        status: 'Pending',
        comments: ''
    };
    
    db.productivityTasks.push(task);
    window.saveDb(db);
    
    document.getElementById('modal-ept-form').classList.add('hidden');
    renderEmployeeEptLogs();
    showToast('Success', 'Task logged successfully', 'success');
});

// ==================== MANAGER REVIEW & APPROVAL ====================

window.openEptReviewModal = function(taskId, logId) {
    const db = getEptDb();
    const task = (db.productivityTasks || []).find(t => t.id === taskId);
    const log = (db.productivityLogs || []).find(l => l.id === logId);
    if(!task || !log) return;
    
    const emp = (db.users || []).find(u => u.id == log.employee_id) || {name:'Unknown'};
    const prac = (db.practices || []).find(p => p.id == log.practice_id) || {practice_name:'Unknown'};
    
    document.getElementById('ept-review-id').value = taskId;
    document.getElementById('ept-review-emp').innerText = emp.name;
    document.getElementById('ept-review-date').innerText = log.log_date;
    document.getElementById('ept-review-practice').innerText = prac.practice_name;
    document.getElementById('ept-review-type').innerText = task.task_type;
    document.getElementById('ept-review-time').innerText = task.time_minutes;
    
    // Render JSON details nicely
    let detailsHtml = '';
    for(let key in (task.extra_data || {})) {
        detailsHtml += `<div><strong>${key.replace('_',' ').toUpperCase()}:</strong> ${task.extra_data[key]}</div>`;
    }
    detailsHtml += `<div><strong>COUNT:</strong> ${task.total_count}</div>`;
    document.getElementById('ept-review-details').innerHTML = detailsHtml;
    
    document.getElementById('ept-review-comment').value = task.comments || '';
    
    document.getElementById('modal-ept-review').classList.remove('hidden');
};

document.getElementById('btn-ept-approve')?.addEventListener('click', function() {
    processEptReview('Approved');
});
document.getElementById('btn-ept-reject')?.addEventListener('click', function() {
    processEptReview('Flagged');
});

function processEptReview(status) {
    const taskId = document.getElementById('ept-review-id').value;
    const db = getEptDb();
    const task = (db.productivityTasks || []).find(t => t.id === taskId);
    if(task) {
        task.status = status;
        task.comments = document.getElementById('ept-review-comment').value;
        window.saveDb(db);
        
        // Push notification
        const log = db.productivityLogs.find(l=>l.id == task.log_id);
        if(!db.notifications) db.notifications = [];
        db.notifications.push({
            id: Date.now(),
            userId: log.employee_id,
            title: 'Task ' + status,
            message: `Your ${task.task_type} task was ${status}.`,
            type: status === 'Approved' ? 'success' : 'danger',
            read: false,
            timestamp: new Date().toISOString()
        });
    }
    document.getElementById('modal-ept-review').classList.add('hidden');
    renderManagerEptDashboard();
    showToast('Updated', `Task marked as ${status}`, 'success');
}

window.quickApproveEpt = function(taskId) {
    const db = getEptDb();
    const task = (db.productivityTasks || []).find(t => t.id === taskId);
    if(task) {
        task.status = 'Approved';
        window.saveDb(db);
        renderManagerEptDashboard();
        showToast('Success', 'Task Approved', 'success');
    }
};
