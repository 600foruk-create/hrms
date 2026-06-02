// settings.js

function renderAdminSettingsTab() {
    const db = getDb();
    const weights = db.weights;

    // Fill Weights form fields
    document.getElementById('weight-billing').value = weights["Billing"];
    document.getElementById('weight-followup').value = weights["Follow-up"];
    document.getElementById('weight-posting').value = weights["Payment Posting"];
    document.getElementById('weight-eligibility').value = weights["Eligibility Check"];
    document.getElementById('weight-reporting').value = weights["Report Preparation"];

    renderAuditLogs();
}

function renderAuditLogs() {
    const db = getDb();
    const logList = document.getElementById('admin-audit-log-list');
    logList.innerHTML = '';

    if (db.auditLogs.length === 0) {
        logList.innerHTML = `<div class="empty-state">No system logs recorded.</div>`;
    } else {
        db.auditLogs.slice(0, 100).forEach(log => {
            let logIcon = '<i class="fa-solid fa-circle-info text-info"></i>';
            if (log.details.includes('Logged in')) logIcon = '<i class="fa-solid fa-arrow-right-to-bracket text-success"></i>';
            if (log.details.includes('Logged out')) logIcon = '<i class="fa-solid fa-arrow-right-from-bracket text-muted"></i>';
            if (log.details.includes('Approved') || log.details.includes('Save')) logIcon = '<i class="fa-solid fa-circle-check text-success"></i>';
            if (log.details.includes('Rejected') || log.details.includes('Delete')) logIcon = '<i class="fa-solid fa-triangle-exclamation text-danger"></i>';
            if (log.details.includes('weights') || log.details.includes('configuration')) logIcon = '<i class="fa-solid fa-sliders text-warning"></i>';

            logList.innerHTML += `
                <div class="audit-log-item">
                    ${logIcon}
                    <span class="time">${log.timestamp.substring(11, 19)}</span>
                    <div class="details">
                        <strong>${log.userName}</strong>: ${log.details}
                    </div>
                </div>
            `;
        });
    }
}

function renderAdminAnnouncementsTab() {
    const db = getDb();
    const container = document.getElementById('admin-tab-announcements-list');
    container.innerHTML = '';

    if (db.announcements.length === 0) {
        container.innerHTML = `<div class="empty-state">No company announcements found. Create one above.</div>`;
    } else {
        db.announcements.forEach(ann => {
            container.innerHTML += `
                <div class="announcement-mini-card announcement-admin-card bg-glass">
                    <div class="leave-mini-card-header mb-3">
                        <h3 class="text-primary font-heading">${ann.title}</h3>
                        <div class="btn-action-group">
                            <span class="badge-role manager">Target: ${ann.target}</span>
                            <button class="btn-action-circle text-danger" onclick="deleteAnnouncement('${ann.id}')" tooltip="Delete Announcement"><i class="fa-regular fa-trash-can"></i></button>
                        </div>
                    </div>
                    <p class="text-primary font-body" style="font-size:14.5px; margin-bottom:15px;">${ann.content}</p>
                    <div class="meta text-muted">
                        <span>Posted By: <strong>${ann.author}</strong></span>
                        <span>Date: <strong>${ann.date}</strong></span>
                    </div>
                </div>
            `;
        });
    }
}

