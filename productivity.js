// productivity.js
// Handles all Employee Productivity Tracker (EPT) Module logic

const TASK_FIELDS = {
    "Eligibilities": [
        { name: "total_count", label: "Total Count", type: "number" },
        { name: "time_minutes", label: "Time Spent (minutes)", type: "number" }
    ],
    "Authorizations": [
        { name: "total_count", label: "Total Count", type: "number" },
        { name: "time_minutes", label: "Time Spent (minutes)", type: "number" },
        { name: "approved_count", label: "Approved Count", type: "number" },
        { name: "denied_count", label: "Denied Count", type: "number" },
        { name: "pending_count", label: "Pending Count", type: "number" }
    ],
    "Claims": [
        { name: "total_count", label: "Total Count", type: "number" },
        { name: "time_minutes", label: "Time Spent (minutes)", type: "number" },
        { name: "accepted_count", label: "Accepted Count", type: "number" },
        { name: "rejected_count", label: "Rejected Count", type: "number" },
        { name: "resubmitted_count", label: "Corrected & Resubmitted", type: "number" }
    ],
    "Payment Posting": [
        { name: "total_count", label: "Total Count", type: "number" },
        { name: "time_minutes", label: "Time Spent (minutes)", type: "number" },
        { name: "total_amount", label: "Total Amount Posted", type: "number" }
    ],
    "Follow Up": [
        { name: "total_count", label: "Total Count", type: "number" },
        { name: "time_minutes", label: "Time Spent (minutes)", type: "number" },
        { name: "resolved_count", label: "Resolved Count", type: "number" },
        { name: "pending_count", label: "Pending Count", type: "number" }
    ],
    "Reports": [
        { name: "report_name", label: "Report Name/Type", type: "text" },
        { name: "time_minutes", label: "Time Spent (minutes)", type: "number" }
    ],
    "Others": [
        { name: "task_description", label: "Task Description", type: "text" },
        { name: "time_minutes", label: "Time Spent (minutes)", type: "number" }
    ]
};

// Override app.js tabs
window.renderAdminProductivityTab = function() {
    const db = getDb();
    
    // Fill Practices table
    const tableBody = document.getElementById('admin-practice-table-body');
    if (tableBody) {
        tableBody.innerHTML = '';
        if (!db.practices || db.practices.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="empty-state">No practices found.</td></tr>`;
        } else {
            db.practices.forEach(p => {
                tableBody.innerHTML += `
                    <tr>
                        <td>${p.practice_code}</td>
                        <td class="bold">${p.practice_name}</td>
                        <td>
                            <button class="btn btn-sm btn-outline text-danger" onclick="deletePractice('${p.id}')"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
        }
    }

    // Fill Practice Assignments
    const assignBody = document.getElementById('admin-assignment-table-body');
    if (assignBody) {
        assignBody.innerHTML = '';
        if (!db.manager_practices || db.manager_practices.length === 0) {
            assignBody.innerHTML = `<tr><td colspan="4" class="empty-state">No assignments found.</td></tr>`;
        } else {
            db.manager_practices.forEach(mp => {
                const manager = db.users.find(u => u.id === mp.manager_id);
                const practice = db.practices.find(p => p.id === mp.practice_id);
                if (manager && practice) {
                    assignBody.innerHTML += `
                        <tr>
                            <td>${manager.name}</td>
                            <td>${practice.practice_name}</td>
                            <td>
                                <button class="btn btn-sm btn-outline text-danger" onclick="deleteAssignment('${mp.id}')"><i class="fa-solid fa-trash"></i></button>
                            </td>
                        </tr>
                    `;
                }
            });
        }
    }
};

window.renderManagerProductivityTab = function() {
    const db = getDb();
    const tableBody = document.getElementById('manager-team-prod-body');
    if (!tableBody) return;
    
    // Find all employees reporting to this manager
    const teamIds = db.users.filter(u => u.managerId === currentUser.id).map(u => u.id);
    
    const logs = db.productivity_logs ? db.productivity_logs.filter(l => teamIds.includes(l.employee_id)) : [];
    logs.sort((a, b) => new Date(b.log_date) - new Date(a.log_date));

    tableBody.innerHTML = '';
    if (logs.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="empty-state">No productivity logs from your team yet.</td></tr>`;
    } else {
        logs.forEach(log => {
            const emp = db.users.find(u => u.id === log.employee_id);
            const practice = db.practices.find(p => p.id === log.practice_id);
            const tasks = db.productivity_tasks.filter(t => t.log_id === log.id);
            const totalMinutes = tasks.reduce((sum, t) => sum + parseInt(t.time_minutes || 0), 0);

            tableBody.innerHTML += `
                <tr>
                    <td>${log.log_date}</td>
                    <td class="bold">${emp ? emp.name : 'Unknown'}</td>
                    <td>${practice ? practice.practice_name : 'Unknown'}</td>
                    <td>${tasks.length} tasks (${totalMinutes} mins)</td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick="viewLogDetails('${log.id}')">View Details</button>
                    </td>
                </tr>
            `;
        });
    }
};

window.renderEmployeeProductivityTab = function() {
    const db = getDb();
    
    // Fill practices dropdown for the employee
    const practiceSelect = document.getElementById('ept-practice-select');
    if (practiceSelect) {
        practiceSelect.innerHTML = '<option value="">Select a Practice...</option>';
        const managerId = currentUser.managerId;
        const assignedPractices = db.manager_practices ? db.manager_practices.filter(mp => mp.manager_id === managerId).map(mp => mp.practice_id) : [];
        const availablePractices = db.practices ? db.practices.filter(p => assignedPractices.includes(p.id)) : [];
        
        availablePractices.forEach(p => {
            practiceSelect.add(new Option(`${p.practice_name} (${p.practice_code})`, p.id));
        });
    }

    // Set default date to today
    const dateSelect = document.getElementById('ept-date');
    if (dateSelect && !dateSelect.value) {
        const today = new Date().toISOString().split('T')[0];
        dateSelect.value = today;
    }

    renderEmployeeLogsList();
};

window.renderEmployeeLogsList = function() {
    const db = getDb();
    const listBody = document.getElementById('ept-my-logs-body');
    if (!listBody) return;

    const myLogs = db.productivity_logs ? db.productivity_logs.filter(l => l.employee_id === currentUser.id) : [];
    myLogs.sort((a, b) => new Date(b.log_date) - new Date(a.log_date));

    listBody.innerHTML = '';
    if (myLogs.length === 0) {
        listBody.innerHTML = `<tr><td colspan="4" class="empty-state">No productivity logs recorded yet.</td></tr>`;
    } else {
        myLogs.forEach(log => {
            const practice = db.practices.find(p => p.id === log.practice_id);
            const tasks = db.productivity_tasks.filter(t => t.log_id === log.id);
            const totalMinutes = tasks.reduce((sum, t) => sum + parseInt(t.time_minutes || 0), 0);

            listBody.innerHTML += `
                <tr>
                    <td>${log.log_date}</td>
                    <td class="bold">${practice ? practice.practice_name : 'Unknown'}</td>
                    <td>${tasks.length} tasks</td>
                    <td>${totalMinutes} mins</td>
                </tr>
            `;
        });
    }
};

window.onEptTaskTypeChange = function() {
    const taskType = document.getElementById('ept-task-type').value;
    const fieldsContainer = document.getElementById('ept-dynamic-fields');
    fieldsContainer.innerHTML = '';

    if (taskType && TASK_FIELDS[taskType]) {
        let html = '';
        TASK_FIELDS[taskType].forEach(field => {
            html += `
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="font-size:12px; font-weight:600; color:var(--text-secondary); margin-bottom:5px; display:block;">${field.label}</label>
                    <input type="${field.type}" id="ept_f_${field.name}" class="form-control" placeholder="Enter ${field.label}" required style="width:100%; height:36px; border-radius:6px; border:1px solid var(--border-color); padding:0 10px; background:var(--bg-input); color:var(--text-primary);">
                </div>
            `;
        });
        
        // Always add notes
        html += `
            <div class="form-group" style="margin-bottom: 15px;">
                <label style="font-size:12px; font-weight:600; color:var(--text-secondary); margin-bottom:5px; display:block;">Notes (Optional)</label>
                <textarea id="ept_f_notes" class="form-control" rows="2" style="width:100%; border-radius:6px; border:1px solid var(--border-color); padding:10px; background:var(--bg-input); color:var(--text-primary);"></textarea>
            </div>
        `;
        fieldsContainer.innerHTML = html;
    }
};

window.addPractice = function() {
    const name = document.getElementById('new-practice-name').value;
    const code = document.getElementById('new-practice-code').value;
    if (!name || !code) return showToast("Error", "Please fill all fields", "error");

    const db = getDb();
    if(!db.practices) db.practices = [];
    db.practices.push({
        id: 'PRC_' + Date.now(),
        practice_name: name,
        practice_code: code
    });
    saveDb(db);
    document.getElementById('new-practice-name').value = '';
    document.getElementById('new-practice-code').value = '';
    renderAdminProductivityTab();
    showToast("Success", "Practice added successfully");
};

window.assignPractice = function() {
    const managerId = document.getElementById('assign-manager-select').value;
    const practiceId = document.getElementById('assign-practice-select').value;
    if (!managerId || !practiceId) return showToast("Error", "Please select both Manager and Practice", "error");

    const db = getDb();
    if(!db.manager_practices) db.manager_practices = [];
    
    // Check duplicate
    if(db.manager_practices.find(mp => mp.manager_id === managerId && mp.practice_id === practiceId)) {
        return showToast("Error", "Assignment already exists", "error");
    }

    db.manager_practices.push({
        id: 'MP_' + Date.now(),
        manager_id: managerId,
        practice_id: practiceId
    });
    saveDb(db);
    renderAdminProductivityTab();
    showToast("Success", "Practice assigned successfully");
};

window.deletePractice = function(id) {
    if(!confirm("Are you sure?")) return;
    const db = getDb();
    db.practices = db.practices.filter(p => p.id !== id);
    // Also remove assignments
    db.manager_practices = db.manager_practices.filter(mp => mp.practice_id !== id);
    saveDb(db);
    renderAdminProductivityTab();
};

window.deleteAssignment = function(id) {
    if(!confirm("Are you sure?")) return;
    const db = getDb();
    db.manager_practices = db.manager_practices.filter(mp => mp.id !== id);
    saveDb(db);
    renderAdminProductivityTab();
};

window.saveTaskEntry = function() {
    const practiceId = document.getElementById('ept-practice-select').value;
    const date = document.getElementById('ept-date').value;
    const taskType = document.getElementById('ept-task-type').value;

    if (!practiceId || !date || !taskType) {
        return showToast("Error", "Please select Practice, Date, and Task Type", "error");
    }

    const db = getDb();
    if (!db.productivity_logs) db.productivity_logs = [];
    if (!db.productivity_tasks) db.productivity_tasks = [];

    // Find or create log
    let log = db.productivity_logs.find(l => l.employee_id === currentUser.id && l.log_date === date && l.practice_id === practiceId);
    if (!log) {
        log = {
            id: 'LOG_' + Date.now(),
            employee_id: currentUser.id,
            practice_id: practiceId,
            log_date: date,
            created_at: new Date().toISOString()
        };
        db.productivity_logs.push(log);
    }

    // Build extra data
    let extraData = {};
    let totalCount = 0;
    let timeMinutes = 0;
    let notes = document.getElementById('ept_f_notes') ? document.getElementById('ept_f_notes').value : '';

    TASK_FIELDS[taskType].forEach(field => {
        const val = document.getElementById('ept_f_' + field.name).value;
        if (field.name === 'total_count') totalCount = parseInt(val) || 0;
        else if (field.name === 'time_minutes') timeMinutes = parseInt(val) || 0;
        else extraData[field.name] = val;
    });

    const task = {
        id: 'TSK_' + Date.now(),
        log_id: log.id,
        task_type: taskType,
        total_count: totalCount,
        time_minutes: timeMinutes,
        extra_data: extraData,
        notes: notes
    };

    db.productivity_tasks.push(task);
    saveDb(db);
    showToast("Task Saved", "Your productivity task has been logged.", "success");
    
    // Reset fields
    document.getElementById('ept-task-type').value = '';
    document.getElementById('ept-dynamic-fields').innerHTML = '';
    
    renderEmployeeLogsList();
};

window.viewLogDetails = function(logId) {
    const db = getDb();
    const tasks = db.productivity_tasks.filter(t => t.log_id === logId);
    let html = '<ul style="list-style:none; padding:0; margin:0;">';
    tasks.forEach(t => {
        html += `
            <li style="margin-bottom: 10px; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px;">
                <strong>${t.task_type}</strong><br>
                <span class="text-secondary" style="font-size:12px;">Count: ${t.total_count} | Time: ${t.time_minutes} mins</span><br>
                <span style="font-size:11px; color:#666;">Notes: ${t.notes || 'None'}</span>
            </li>
        `;
    });
    html += '</ul>';
    
    // Create a temporary modal
    const modalHtml = `
        <div id="temp-modal" class="modal" style="display:flex; max-width: 500px; width: 90%; background: var(--bg-card); z-index:9999;">
            <div class="modal-header">
                <h3>Log Details</h3>
                <button class="modal-close" onclick="document.getElementById('temp-modal').remove(); document.getElementById('modal-overlay').classList.add('hidden');"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="modal-body" style="padding:20px;">
                ${html}
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('modal-overlay').classList.remove('hidden');
};

// Hook into app loading
document.addEventListener("DOMContentLoaded", () => {
    // Populate dropdowns in Admin tab dynamically after load if needed
    document.getElementById('btn-add-practice')?.addEventListener('click', addPractice);
    document.getElementById('btn-assign-practice')?.addEventListener('click', assignPractice);
});
