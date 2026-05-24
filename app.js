/**
 * HRMS - Employee Management & Productivity Tracker
 * Core Application Script
 */

// Global State
let currentUser = null;
let activeTab = 'dashboard';
let inactivityTimeout = null;
const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes in milliseconds

// Task Subcategories Database mapping
const TASK_SUBCATEGORIES = {
    "Billing": ["Invoicing", "Coding Review", "Claim Submission", "Claim Status Tracking"],
    "Follow-up": ["Insurance Follow-up", "Patient Follow-up", "Denial Management", "Appeals Processing"],
    "Payment Posting": ["ERA Posting", "Manual Posting", "EOB Reconciliation", "Refund Checks Processing"],
    "Eligibility Check": ["Prior Authorization", "Active Coverage Verification", "Deductible Status Checking"],
    "Report Preparation": ["Daily Performance Reports", "Monthly AR Reports", "Gap Analysis Reports", "Executive Summaries"]
};

// ==================== DATABASE ENGINE (Hostinger PHP Backend) ====================
const API_URL = 'backend/api.php';
window.hrmsDatabase = { users: [], weights: {}, leaves: [], productivity: [], attendance: [], announcements: [], auditLogs: [], notifications: [] };

async function syncServer() {
    let success = false;
    try {
        const response = await fetch(API_URL + '?action=load_all');
        const result = await response.json();
        if (result.status === 'success' && result.data.users && result.data.users.length > 0) {
            // Dynamic correction: ensure "Syed Admin" is shown/logged in as "admin" with "admin123"
            result.data.users.forEach(u => {
                if (u.name === 'Syed Admin' || u.name === 'admin') {
                    u.name = 'admin';
                    u.password = 'admin123';
                }
            });
            window.hrmsDatabase = result.data;
            success = true;
        } else {
            console.error("Failed to load DB state or DB is empty:", result.message);
        }
    } catch (e) {
        console.error("Network error loading DB:", e);
    }

    // Fallback Mock Database if API fails or DB is empty (Allows local demo to work)
    if (!success) {
        console.warn("Using Fallback Mock Database...");
        let localData = localStorage.getItem('hrms_fallback_db');
        if (localData) {
            try {
                window.hrmsDatabase = JSON.parse(localData);
                return;
            } catch (e) {
                console.error("Local DB parse error:", e);
            }
        }
        
        window.hrmsDatabase = {
            login_bg: 'assets/images/login/login_bg.png',
            users: [
                { id: "U1", email: "admin@hrms.com", password: "admin123", name: "admin", role: "Admin", managerId: "", status: "Active" },
                { id: "U2", email: "sarah.manager@hrms.com", password: "manager123", name: "Sarah Jenkins", role: "Manager", managerId: "", status: "Active" },
                { id: "U3", email: "alex.manager@hrms.com", password: "manager123", name: "Alex Mercer", role: "Manager", managerId: "", status: "Active" },
                { id: "U4", email: "john.emp@hrms.com", password: "employee123", name: "John Doe", role: "Employee", managerId: "U2", status: "Active" },
                { id: "U5", email: "emma.emp@hrms.com", password: "employee123", name: "Emma Watson", role: "Employee", managerId: "U2", status: "Active" },
                { id: "U6", email: "ryan.emp@hrms.com", password: "employee123", name: "Ryan Gosling", role: "Employee", managerId: "U3", status: "Active" }
            ],
            weights: {
                "Billing": 2.0,
                "Follow-up": 1.0,
                "Payment Posting": 1.5,
                "Eligibility Check": 1.0,
                "Report Preparation": 2.0
            },
            leaves: [
                { id: "L1", employeeId: "U4", employeeName: "John Doe", type: "Annual", startDate: "2026-06-01", endDate: "2026-06-05", reason: "Family Vacation", status: "Approved" },
                { id: "L2", employeeId: "U5", employeeName: "Emma Watson", type: "Sick", startDate: "2026-05-25", endDate: "2026-05-26", reason: "Fever", status: "Pending" }
            ],
            productivity: [
                { id: "P1", employeeId: "U4", employeeName: "John Doe", date: "2026-05-20", tasks: ["Billing", "Follow-up"], subcategories: ["Demographics Entry", "Patient Follow-up"], counts: ["45", "12"], notes: "Completed daily quota.", score: 102.00, status: "Approved" }
            ],
            attendance: [
                { date: "2026-05-20", employeeId: "U4", employeeName: "John Doe", status: "Present", markedBy: "Auto Login" }
            ],
            announcements: [
                { id: "A1", title: "Welcome to HRMS", content: "This is a demo announcement.", target: "All", date: "2026-05-20", author: "Syed Admin" }
            ],
            auditLogs: [],
            notifications: []
        };
    }
}

function getDb() {
    return window.hrmsDatabase;
}

async function saveDb(data) {
    window.hrmsDatabase = data; // Immediate local update for UI speed
    try {
        localStorage.setItem('hrms_fallback_db', JSON.stringify(data));
    } catch (e) {
        console.warn("Could not save to localStorage. Quota exceeded?", e);
    }
    
    try {
        const response = await fetch(API_URL + '?action=save_all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.status !== 'success') {
            console.error("Sync Error:", result.message);
            // showToast("Server Sync Error", "Failed to backup data to server.", "error");
        }
    } catch (err) {
        console.error("Network Error:", err);
        // showToast("Network Error", "Could not connect to database server.", "error");
    }
}

// Log audit events
function logAudit(details) {
    const db = getDb();
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    db.auditLogs.unshift({
        timestamp,
        userId: currentUser ? currentUser.id : "System",
        userName: currentUser ? currentUser.name : "System",
        details
    });
    saveDb(db);
}

// Add user notification
function addNotification(userId, message) {
    const db = getDb();
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    db.notifications.unshift({
        id: "N_" + Date.now(),
        userId,
        message,
        read: false,
        time: timestamp
    });
    saveDb(db);
    
    // If the active user matches, refresh notifications
    if (currentUser && currentUser.id === userId) {
        renderNotifications();
    }
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(title, message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-exclamation';
    if (type === 'warning') iconClass = 'fa-triangle-exclamation';
    
    toast.innerHTML = `
        <i class="fa-solid ${iconClass}"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close"><i class="fa-solid fa-xmark"></i></button>
    `;
    
    container.appendChild(toast);
    
    // Close button event
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.style.animation = 'slideOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    });
    
    // Auto remove
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, 4500);
}

// Add keyframe for slide out dynamic style check
if (!document.getElementById('toast-keyframes')) {
    const style = document.createElement('style');
    style.id = 'toast-keyframes';
    style.innerHTML = `
        @keyframes slideOut {
            to { transform: translateX(120%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// ==================== AUTHENTICATION & SESSIONS ====================

// Open base64/dataURL file in a new tab
window.openDocument = function(dataUrl, name) {
    if (!dataUrl) return;
    try {
        const arr = dataUrl.split(',');
        if (arr.length < 2) return;
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000); // Cleanup after 10s
    } catch(e) {
        console.error("Failed to open document", e);
        // Fallback for image types
        const win = window.open();
        if (win) {
            win.document.write('<iframe src="' + dataUrl + '" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>');
        }
    }
};

function applyCompanyProfile(db) {
    if (!db) return;
    
    // Check our new companyProfile object first, fallback to old weights
    const cp = db.companyProfile || {};
    const companyName = cp.name || (db.weights && db.weights['company_name']) || 'OceanStack';
    const companyLogo = cp.logoBase64 || (db.weights && db.weights['company_logo']) || '';
    
    document.getElementById('sidebar-company-name').innerHTML = `${companyName}`;
    const logoIcon = document.getElementById('sidebar-company-icon');
    if (companyLogo) {
        logoIcon.innerHTML = `<img src="${companyLogo}" alt="Logo" style="max-height:28px; max-width:100%; object-fit:contain;">`;
    } else {
        logoIcon.innerHTML = `
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 8C10 4 22 4 28 8C22 12 10 12 4 8Z" fill="#00e5ff" opacity="0.8"/>
                <path d="M4 14C10 10 22 10 28 14C22 18 10 18 4 14Z" fill="#00b0ff" opacity="0.9"/>
                <path d="M4 20C10 16 22 16 28 20C22 24 10 24 4 20Z" fill="#2979ff"/>
            </svg>
        `;
    }
}

function populateLoginDropdown() {
    try {
        const db = getDb();
        const select = document.getElementById('login-username');
        if (!select || select.tagName !== 'SELECT') return;
        select.innerHTML = '';
        const usersList = (db && db.users && Array.isArray(db.users)) ? db.users : [];
        const activeUsers = usersList.filter(u => u && u.status === 'Active');
        activeUsers.forEach(u => {
            if (u && u.name) {
                const op = new Option(u.name, u.name);
                select.add(op);
            }
        });
    } catch (e) {
        console.error("populateLoginDropdown error: ", e);
    }
}

function handleLogin(usernameOrEmail, password) {
    try {
        const db = getDb();
        const usersList = (db && db.users && Array.isArray(db.users)) ? db.users : [];
        // Match by name (dropdown) OR email (legacy fallback) - case-insensitive
        const user = usersList.find(u =>
            u && ((u.name && u.name.toLowerCase() === usernameOrEmail.toLowerCase()) || (u.email && u.email.toLowerCase() === usernameOrEmail.toLowerCase()))
            && u.password === password
        );
        
        if (!user) {
            showToast("Login Failed", "Invalid username or password.", "error");
            // Shake the form
            const card = document.querySelector('.auth-card');
            if (card) { card.style.animation = 'none'; setTimeout(() => { card.style.animation = 'shake 0.4s ease'; }, 10); }
            return;
        }
        
        if (user.status !== 'Active') {
            showToast("Access Denied", "Your account is currently inactive. Please contact Admin.", "warning");
            return;
        }
        
        // Set Session
        currentUser = user;
        sessionStorage.setItem('current_user', JSON.stringify(user));
        
        // Auto Mark Attendance for Employee on Login
        if (user.role === 'User') {
            markAutoAttendance(user);
        }
        
        logAudit(`Logged in successfully to ${user.role} Portal.`);
        
        // Transition UI
        const authPanel = document.getElementById('auth-panel');
        const appShell = document.getElementById('app-shell');
        if (authPanel) {
            authPanel.classList.add('hidden');
            authPanel.style.setProperty('display', 'none', 'important');
        }
        if (appShell) {
            appShell.classList.remove('hidden');
            appShell.style.setProperty('display', 'flex', 'important');
        }
        document.body.classList.remove('login-view');
        
        // Clear search if exists
        const searchBox = document.getElementById('global-search');
        if (searchBox) searchBox.value = "";
        
        // Reset Navigation
        activeTab = 'dashboard';
        renderSidebar();
        applyCompanyProfile(db);
        switchTab('dashboard');
        setupSessionTimer();
        
        showToast("Welcome Back", `Successfully signed in as ${user.name}.`);
    } catch (e) {
        console.error("handleLogin error: ", e);
        showToast("Error", "An unexpected login error occurred.", "error");
    }
}

function handleLogout() {
    if (!currentUser) return;
    
    logAudit(`Logged out of the system.`);
    
    currentUser = null;
    sessionStorage.removeItem('current_user');
    clearTimeout(inactivityTimeout);
    
    // Reset views
    const authPanel = document.getElementById('auth-panel');
    const appShell = document.getElementById('app-shell');
    if (appShell) {
        appShell.classList.add('hidden');
        appShell.style.setProperty('display', 'none', 'important');
    }
    if (authPanel) {
        authPanel.classList.remove('hidden');
        authPanel.style.setProperty('display', 'flex', 'important');
        document.body.classList.add('login-view');
        const db = getDb();
        if (db && db.login_bg) {
            authPanel.style.setProperty('background-image', `url('${db.login_bg}')`, 'important');
        }
    }
    document.getElementById('login-form').reset();
    
    showToast("Signed Out", "You have been securely logged out.");
}

// Auto Logout Inactivity Engine
function setupSessionTimer() {
    clearTimeout(inactivityTimeout);
    
    const resetTimer = () => {
        if (!currentUser) return;
        clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(() => {
            showToast("Session Expired", "Logged out automatically due to 5 minutes of inactivity.", "warning");
            handleLogout();
        }, INACTIVITY_LIMIT);
    };

    // User activities events
    window.onload = resetTimer;
    document.onmousemove = resetTimer;
    document.onkeypress = resetTimer;
    document.onclick = resetTimer;
    document.onscroll = resetTimer;
    
    resetTimer();
}

// Attendance auto logger
function markAutoAttendance(employee) {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    
    const alreadyMarked = db.attendance.find(a => a.employeeId === employee.id && a.date === today);
    if (!alreadyMarked) {
        db.attendance.push({
            date: today,
            employeeId: employee.id,
            employeeName: employee.name,
            status: "Present",
            markedBy: "Auto Login"
        });
        saveDb(db);
        logAudit(`Auto attendance marked Present for ${employee.name} via login.`);
        addNotification(employee.id, "Your attendance has been automatically marked as Present for today.");
    }
}

// ==================== SIDEBAR & VIEW ROUTING ====================
function renderSidebar() {
    const sidebarMenu = document.getElementById('sidebar-menu');
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    const avatarEl = document.getElementById('sidebar-avatar');
    
    const dropdownNameEl = document.getElementById('dropdown-user-name');
    const dropdownEmailEl = document.getElementById('dropdown-user-email');
    const topbarAvatarEl = document.getElementById('topbar-avatar');
    
    if (!currentUser) return;
    
    // Profile information (with null checks since they are removed from sidebar header)
    if (nameEl) nameEl.textContent = currentUser.name;
    if (roleEl) {
        roleEl.textContent = currentUser.role;
        roleEl.className = `role-badge badge-role ${currentUser.role.toLowerCase()}`;
    }
    if (avatarEl) avatarEl.textContent = currentUser.name.charAt(0).toUpperCase();
    
    dropdownNameEl.textContent = currentUser.name;
    dropdownEmailEl.textContent = currentUser.email;
    topbarAvatarEl.textContent = currentUser.name.charAt(0).toUpperCase();
    
    const topbarNameLabel = document.getElementById('topbar-user-name-label');
    const topbarRoleLabel = document.getElementById('topbar-user-role-label');
    if (topbarNameLabel) topbarNameLabel.textContent = currentUser.name;
    if (topbarRoleLabel) topbarRoleLabel.textContent = currentUser.role === 'Admin' ? 'HR Admin' : currentUser.role;
    
    const quickActionsEl = document.getElementById('sidebar-quick-actions');
    if (quickActionsEl) {
        if (currentUser.role === 'User') {
            quickActionsEl.style.display = 'none';
        } else {
            quickActionsEl.style.display = 'grid';
        }
    }
    
    let menuHTML = '';
    
    if (currentUser.role === 'Admin') {
        menuHTML = `
            <a class="sidebar-link active" data-tab="dashboard"><i class="fa-solid fa-chart-line"></i> Dashboard</a>
            <a class="sidebar-link" data-tab="employees"><i class="fa-solid fa-users"></i> Employees</a>
            <a class="sidebar-link" data-tab="attendance"><i class="fa-solid fa-calendar-days"></i> Attendance</a>
            <a class="sidebar-link" data-tab="productivity"><i class="fa-solid fa-bolt"></i> Productivity</a>
            <a class="sidebar-link" data-tab="leave"><i class="fa-solid fa-umbrella-beach"></i> Leave Management</a>
            <a class="sidebar-link" data-tab="reports"><i class="fa-solid fa-file-invoice-dollar"></i> Reports</a>
            <a class="sidebar-link" data-tab="announcements"><i class="fa-solid fa-bullhorn"></i> Announcements</a>
            <a class="sidebar-link" data-tab="settings"><i class="fa-solid fa-sliders"></i> Settings</a>
        `;
    } else if (currentUser.role === 'Manager') {
        menuHTML = `
            <a class="sidebar-link active" data-tab="dashboard"><i class="fa-solid fa-chart-line"></i> Dashboard</a>
            <a class="sidebar-link" data-tab="team"><i class="fa-solid fa-users-viewfinder"></i> My Team</a>
            <a class="sidebar-link" data-tab="attendance"><i class="fa-solid fa-calendar-check"></i> Attendance</a>
            <a class="sidebar-link" data-tab="productivity"><i class="fa-solid fa-bolt"></i> Productivity Review</a>
            <a class="sidebar-link" data-tab="leave"><i class="fa-solid fa-code-pull-request"></i> Leave Requests</a>
            <a class="sidebar-link" data-tab="reports"><i class="fa-solid fa-file-invoice-dollar"></i> Team Reports</a>
        `;
    } else { // Employee
        menuHTML = `
            <a class="sidebar-link active" data-tab="dashboard"><i class="fa-solid fa-chart-line"></i> Dashboard</a>
            <a class="sidebar-link" data-tab="attendance"><i class="fa-solid fa-calendar-days"></i> My Attendance</a>
            <a class="sidebar-link" data-tab="productivity"><i class="fa-solid fa-bolt"></i> My Productivity</a>
            <a class="sidebar-link" data-tab="leave"><i class="fa-solid fa-umbrella-beach"></i> Leave Request</a>
        `;
    }
    
    sidebarMenu.innerHTML = menuHTML;
    
    // Add Click Listeners to Sidebar Items
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            switchTab(tabId);
            
            // Close mobile sidebar if active
            document.getElementById('app-shell').querySelector('.sidebar').classList.remove('active');
        });
    });
}

function switchTab(tabId) {
    activeTab = tabId;
    
    // Update Sidebar Selection active state
    document.querySelectorAll('.sidebar-link').forEach(link => {
        if (link.getAttribute('data-tab') === tabId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Toggle role outer views
    const views = ['admin-view', 'manager-view', 'employee-view'];
    views.forEach(v => {
        const role = currentUser.role.toLowerCase();
        if (v === `${role}-view`) {
            document.getElementById(v).classList.remove('hidden');
        } else {
            document.getElementById(v).classList.add('hidden');
        }
    });
    
    // Toggle tab sub-views
    const rolePrefix = currentUser.role.toLowerCase();
    const tabSelector = `${rolePrefix}-tab-${tabId}`;
    
    document.querySelectorAll(`#${rolePrefix}-view .tab-view`).forEach(tab => {
        if (tab.id === tabSelector) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Render dynamic updates on tab select
    refreshTabContent(tabId);
}

function refreshTabContent(tabId) {
    const role = currentUser.role;
    
    if (role === 'Admin') {
        if (tabId === 'dashboard') renderAdminDashboard();
        else if (tabId === 'employees') renderAdminEmployeesTab();
        else if (tabId === 'attendance') renderAdminAttendanceTab();
        else if (tabId === 'productivity') renderAdminProductivityTab();
        else if (tabId === 'leave') renderAdminLeaveTab();
        else if (tabId === 'announcements') renderAdminAnnouncementsTab();
        else if (tabId === 'settings') renderAdminSettingsTab();
        else if (tabId === 'reports') initAdminReportsTab();
    } else if (role === 'Manager') {
        if (tabId === 'dashboard') renderManagerDashboard();
        else if (tabId === 'team') renderManagerTeamTab();
        else if (tabId === 'attendance') renderManagerAttendanceTab();
        else if (tabId === 'productivity') renderManagerProductivityTab();
        else if (tabId === 'leave') renderManagerLeaveTab();
        else if (tabId === 'reports') initManagerReportsTab();
    } else { // Employee
        if (tabId === 'dashboard') renderEmployeeDashboard();
        else if (tabId === 'attendance') renderEmployeeAttendanceTab();
        else if (tabId === 'productivity') renderEmployeeProductivityTab();
        else if (tabId === 'leave') renderEmployeeLeaveTab();
    }
}

// ==================== RENDERING: ADMIN VIEWS ====================
window.quickApproveTask = function(id, status) {
    const db = getDb();
    const sub = db.productivity.find(p => p.id === id);
    if (sub) {
        sub.status = status;
        saveDb(db);
        showToast("Review Complete", `Productivity log has been marked as ${status}.`);
        logAudit(`Productivity log for ${sub.employeeName} reviewed: ${status} (Final Score: ${sub.score}).`);
        addNotification(sub.employeeId, `Your productivity log for ${sub.date} has been ${status}.`);
        refreshTabContent(activeTab);
    }
};

function renderAdminDashboard() {
    const db = getDb();
    
    // Set current date
    const dateDisplay = document.getElementById('dashboard-date-display');
    if (dateDisplay) {
        dateDisplay.textContent = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    
    // Aggregate calculations
    const employees = db.users.filter(u => u.role === 'User');
    const managers = db.users.filter(u => u.role === 'Manager');
    const pendingLeaves = db.leaves.filter(l => l.status === 'Pending').length;
    const pendingProductivity = db.productivity.filter(p => p.status === 'Pending').length;
    const totalPendingApprovals = pendingLeaves + pendingProductivity;
    
    // Attendance % Today
    const today = new Date().toISOString().split('T')[0];
    const totalEmpCount = employees.length;
    const presentTodayCount = db.attendance.filter(a => a.date === today && a.status === 'Present').length;
    const absentTodayCount = db.attendance.filter(a => a.date === today && a.status === 'Absent').length;
    const lateTodayCount = db.attendance.filter(a => a.date === today && a.status === 'Late').length;
    const leaveTodayCount = db.attendance.filter(a => a.date === today && a.status === 'On Leave').length;
    const attendancePct = totalEmpCount > 0 ? Math.round((presentTodayCount / totalEmpCount) * 100) : 0;
    
    // Tasks Submitted / Completed
    const tasksSubmitted = db.productivity.length;
    const tasksCompleted = db.productivity.filter(p => p.status === 'Approved').length;
    const completionRate = tasksSubmitted > 0 ? Math.round((tasksCompleted / tasksSubmitted) * 100) : 0;
        
    // Apply Metrics to Cards
    document.getElementById('admin-metric-total-emp').textContent = totalEmpCount;
    document.getElementById('admin-metric-attendance').textContent = `${presentTodayCount} (${attendancePct}%)`;
    document.getElementById('admin-metric-pending-leaves').textContent = totalPendingApprovals;
    document.getElementById('admin-metric-tasks-submitted').textContent = tasksSubmitted;
    document.getElementById('admin-metric-tasks-completed').textContent = tasksCompleted;
    
    const rateEl = document.getElementById('admin-metric-completion-rate');
    if (rateEl) rateEl.textContent = `${completionRate}% completion rate`;
    
    // 1. Daily Attendance Doughnut Chart
    let present = presentTodayCount;
    let absent = absentTodayCount;
    let late = lateTodayCount;
    let leave = leaveTodayCount;
    let total = present + absent + late + leave;
    if (total === 0) {
        // Fallback default stats for gorgeous initial view
        present = Math.max(1, Math.round(totalEmpCount * 0.8));
        absent = Math.max(0, Math.round(totalEmpCount * 0.1));
        late = Math.max(0, Math.round(totalEmpCount * 0.07));
        leave = Math.max(0, totalEmpCount - present - absent - late);
        total = present + absent + late + leave;
        if (total === 0) { total = 10; present = 8; absent = 1; late = 1; leave = 0; }
    }
    const presentPct = Math.round((present / total) * 100);
    const absentPct = Math.round((absent / total) * 100);
    const latePct = Math.round((late / total) * 100);
    const leavePct = Math.round((leave / total) * 100);
    
    const absStart = presentPct;
    const lateStart = absStart + absentPct;
    const leaveStart = lateStart + latePct;
    
    const doughnutEl = document.getElementById('attendance-doughnut-chart');
    if (doughnutEl) {
        doughnutEl.style.background = `conic-gradient(var(--success) 0% ${absStart}%, var(--danger) ${absStart}% ${lateStart}%, var(--warning) ${lateStart}% ${leaveStart}%, var(--primary) ${leaveStart}% 100%)`;
    }
    
    const doughnutTotalEl = document.getElementById('attendance-doughnut-total');
    if (doughnutTotalEl) doughnutTotalEl.textContent = total;
    
    const lPres = document.getElementById('legend-present-val');
    const lAbs = document.getElementById('legend-absent-val');
    const lLate = document.getElementById('legend-late-val');
    const lLeave = document.getElementById('legend-leave-val');
    if (lPres) lPres.textContent = `${present} (${presentPct}%)`;
    if (lAbs) lAbs.textContent = `${absent} (${absentPct}%)`;
    if (lLate) lLate.textContent = `${late} (${latePct}%)`;
    if (lLeave) lLeave.textContent = `${leave} (${leavePct}%)`;

    // 2. Tasks Overview SVG Line Chart (Dynamic from DB)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7Days.push(d.toISOString().split('T')[0]);
    }
    const dailySubmitted = last7Days.map(day => db.productivity.filter(p => p.date === day).length);
    const dailyCompleted = last7Days.map(day => db.productivity.filter(p => p.date === day && p.status === 'Approved').length);
    
    const maxVal = Math.max(5, ...dailySubmitted, ...dailyCompleted);
    const getSvgY = (val) => 95 - (val / maxVal) * 80;
    
    const subCoords = dailySubmitted.map((val, idx) => ({ x: idx * 50, y: getSvgY(val) }));
    const compCoords = dailyCompleted.map((val, idx) => ({ x: idx * 50, y: getSvgY(val) }));
    
    const buildPath = (coords) => {
        if (coords.length === 0) return '';
        let path = `M ${coords[0].x} ${coords[0].y}`;
        for (let i = 1; i < coords.length; i++) {
            const cpX = coords[i-1].x + 25;
            const cpY1 = coords[i-1].y;
            const cpY2 = coords[i].y;
            path += ` C ${cpX} ${cpY1}, ${cpX} ${cpY2}, ${coords[i].x} ${coords[i].y}`;
        }
        return path;
    };
    
    const buildAreaPath = (coords, linePath) => {
        if (!linePath) return '';
        return `${linePath} L 300 100 L 0 100 Z`;
     };
     
     const subLine = buildPath(subCoords);
     const subArea = buildAreaPath(subCoords, subLine);
     const compLine = buildPath(compCoords);
     const compArea = buildAreaPath(compCoords, compLine);
     
     const subLineEl = document.querySelector('.svg-chart-line.submitted');
     const subAreaEl = document.querySelector('.svg-chart-area.submitted');
     const compLineEl = document.querySelector('.svg-chart-line.completed');
     const compAreaEl = document.querySelector('.svg-chart-area.completed');
     
     if (subLineEl) subLineEl.setAttribute('d', subLine);
     if (subAreaEl) subAreaEl.setAttribute('d', subArea);
     if (compLineEl) compLineEl.setAttribute('d', compLine);
     if (compAreaEl) compAreaEl.setAttribute('d', compArea);
     
     const subDots = document.querySelectorAll('.svg-chart-dot.submitted');
     const compDots = document.querySelectorAll('.svg-chart-dot.completed');
     
     subCoords.forEach((coord, idx) => {
         if (subDots[idx]) {
             subDots[idx].setAttribute('cx', coord.x);
             subDots[idx].setAttribute('cy', coord.y);
         }
     });
     compCoords.forEach((coord, idx) => {
         if (compDots[idx]) {
             compDots[idx].setAttribute('cx', coord.x);
             compDots[idx].setAttribute('cy', coord.y);
         }
     });

    // 3. Recent Task Approvals Cards
    const approvalsListEl = document.getElementById('admin-task-approvals-list');
    if (approvalsListEl) {
        approvalsListEl.innerHTML = '';
        const pendingTasks = db.productivity.filter(p => p.status === 'Pending');
        const approvedTasks = db.productivity.filter(p => p.status === 'Approved');
        const displayTasks = [...pendingTasks, ...approvedTasks].slice(0, 3);
        
        if (displayTasks.length === 0) {
            approvalsListEl.innerHTML = '<div class="empty-state">No tasks to display</div>';
        } else {
            displayTasks.forEach(task => {
                const initials = task.employeeName ? task.employeeName.charAt(0).toUpperCase() : 'E';
                const statusClass = task.status === 'Approved' ? 'approved' : (task.status === 'Rejected' ? 'rejected' : 'pending');
                
                let actionButtons = '';
                if (task.status === 'Pending') {
                    actionButtons = `
                        <div class="card-action-btns" style="display: flex; gap: 6px;">
                            <button class="action-btn-mini approve" onclick="window.quickApproveTask('${task.id}', 'Approved')" title="Approve"><i class="fa-solid fa-check"></i></button>
                            <button class="action-btn-mini reject" onclick="window.quickApproveTask('${task.id}', 'Rejected')" title="Reject"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                    `;
                } else {
                    actionButtons = `<span class="badge-status ${statusClass}">${task.status}</span>`;
                }
                
                approvalsListEl.innerHTML += `
                    <div class="approval-card bg-glass-card" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: rgba(255,255,255,0.01);">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="avatar-small" style="background: rgba(95, 59, 246, 0.15); color: #5f3bf6; width: 32px; height: 32px; font-weight: 700; border-radius: 50%; display: flex; align-items: center; justify-content: center;">${initials}</div>
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 13px; font-weight: 700; color: #fff;">${task.employeeName}</span>
                                <span style="font-size: 11px; color: var(--text-secondary);">${task.tasks.join(', ')} • Score: <strong>${task.score}</strong></span>
                            </div>
                        </div>
                        ${actionButtons}
                    </div>
                `;
            });
        }
    }

    // 4. Recent Tasks Table & Filter Pills
    const pillsContainer = document.getElementById('recent-tasks-filter-pills');
    if (pillsContainer && !pillsContainer.dataset.bound) {
        pillsContainer.dataset.bound = 'true';
        pillsContainer.querySelectorAll('.pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                pillsContainer.querySelectorAll('.pill-btn').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                renderAdminDashboard();
            });
        });
    }
    
    const recentTasksTableBody = document.getElementById('admin-recent-tasks-table-body');
    if (recentTasksTableBody) {
        recentTasksTableBody.innerHTML = '';
        let list = [...db.productivity];
        const activeFilter = pillsContainer ? pillsContainer.querySelector('.pill-btn.active').dataset.filter : 'All';
        if (activeFilter !== 'All') {
            list = list.filter(item => item.status === activeFilter);
        }
        list.sort((a,b) => new Date(b.date) - new Date(a.date));
        
        if (list.length === 0) {
            recentTasksTableBody.innerHTML = `<tr><td colspan="6" class="empty-state">No tasks found.</td></tr>`;
        } else {
            list.slice(0, 10).forEach(task => {
                const emp = db.users.find(u => u.id === task.employeeId);
                const dept = emp ? (emp.managerId === 'U2' ? 'Operations' : (emp.managerId === 'U3' ? 'Billing' : 'Support')) : 'Support';
                const statusClass = task.status === 'Approved' ? 'approved' : (task.status === 'Rejected' ? 'rejected' : 'pending');
                
                let actionBtn = '';
                if (task.status === 'Pending') {
                    actionBtn = `
                        <div style="display: flex; gap: 6px; justify-content: center;">
                            <button class="btn-action-circle approve-green" onclick="window.quickApproveTask('${task.id}', 'Approved')" tooltip="Approve"><i class="fa-solid fa-check"></i></button>
                            <button class="btn-action-circle reject-red" onclick="window.quickApproveTask('${task.id}', 'Rejected')" tooltip="Reject"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                    `;
                } else {
                    actionBtn = `<div style="text-align: center; color: var(--text-muted); font-size: 11px;">Processed</div>`;
                }
                
                recentTasksTableBody.innerHTML += `
                    <tr>
                        <td class="bold">${task.tasks.join(', ')}</td>
                        <td>${task.employeeName}</td>
                        <td><span style="font-size: 11px; font-weight: 700; color: #38bdf8;">${dept}</span></td>
                        <td>${task.date}</td>
                        <td><span class="badge-status ${statusClass}">${task.status}</span></td>
                        <td>${actionBtn}</td>
                    </tr>
                `;
            });
        }
    }

    // 5. Department Wise Progress Bars
    const deptListEl = document.getElementById('dept-status-list');
    if (deptListEl) {
        deptListEl.innerHTML = '';
        const depts = [
            { name: 'Operations', managerId: 'U2', icon: 'fa-gears', color: '#38bdf8' },
            { name: 'Billing', managerId: 'U3', icon: 'fa-file-invoice-dollar', color: '#c084fc' },
            { name: 'Customer Support', managerId: '', icon: 'fa-headset', color: '#4ade80' }
        ];
        
        depts.forEach(d => {
            const deptUsers = db.users.filter(u => u.role === 'User' && (d.managerId ? u.managerId === d.managerId : (!u.managerId || u.managerId === 'U1')));
            const deptUserIds = deptUsers.map(u => u.id);
            const deptTasks = db.productivity.filter(p => deptUserIds.includes(p.employeeId));
            
            const completed = deptTasks.filter(p => p.status === 'Approved').length;
            const pending = deptTasks.filter(p => p.status === 'Pending').length;
            const rejected = deptTasks.filter(p => p.status === 'Rejected').length;
            const totalTasks = deptTasks.length;
            
            let c = completed, p = pending, r = rejected;
            if (totalTasks === 0) {
                // Mock stats to guarantee dashboard looks live/rich initially
                c = d.name === 'Operations' ? 8 : (d.name === 'Billing' ? 5 : 3);
                p = d.name === 'Operations' ? 2 : (d.name === 'Billing' ? 3 : 1);
                r = d.name === 'Operations' ? 1 : (d.name === 'Billing' ? 0 : 0);
            }
            const sum = c + p + r;
            const maxCap = Math.max(12, sum + 2);
            const remaining = maxCap - sum;
            
            const pctCompleted = (c / maxCap) * 100;
            const pctPending = (p / maxCap) * 100;
            const pctRejected = (r / maxCap) * 100;
            const pctRemaining = (remaining / maxCap) * 100;
            
            deptListEl.innerHTML += `
                <div class="department-status-item" style="margin-bottom: 12px;">
                    <div class="dept-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span class="dept-name" style="font-size: 12px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 6px;"><i class="fa-solid ${d.icon}" style="color: ${d.color}; font-size: 10px;"></i> ${d.name}</span>
                        <span class="dept-count" style="font-size: 11px; color: var(--text-secondary); font-weight: 600;">${c} / ${maxCap} Done</span>
                    </div>
                    <div class="stacked-progress-bar" style="height: 6px; border-radius: 3px; display: flex; overflow: hidden; background: rgba(255,255,255,0.05);">
                        <div class="progress-segment completed" style="width: ${pctCompleted}%; background: var(--success);" title="Completed: ${c}"></div>
                        <div class="progress-segment pending" style="width: ${pctPending}%; background: var(--warning);" title="Pending: ${p}"></div>
                        <div class="progress-segment rejected" style="width: ${pctRejected}%; background: var(--danger);" title="Rejected: ${r}"></div>
                        <div class="progress-segment remaining" style="width: ${pctRemaining}%; background: rgba(255,255,255,0.08);" title="Remaining: ${remaining}"></div>
                    </div>
                </div>
            `;
        });
    }

    // 6. Upcoming Approvals counts
    const taskCountEl = document.getElementById('upcoming-task-count');
    const leaveCountEl = document.getElementById('upcoming-leave-count');
    const timesheetCountEl = document.getElementById('upcoming-timesheet-count');
    
    if (taskCountEl) taskCountEl.textContent = pendingProductivity;
    if (leaveCountEl) leaveCountEl.textContent = pendingLeaves;
    if (timesheetCountEl) timesheetCountEl.textContent = db.attendance.filter(a => a.date === today && a.status === 'Late').length || 2;
}

function renderAdminEmployeesTab() {
    const db = getDb();
    const empTableBody = document.getElementById('admin-tab-employees-table-body');
    const salariesTableBody = document.getElementById('admin-tab-salaries-table-body');
    const cardsContainer = document.getElementById('admin-tab-cards-container');
    const inactiveTableBody = document.getElementById('admin-tab-inactive-table-body');

    // 1. Populate Employees Sub-tab Table (All Active Users, Sorted)
    if (empTableBody) {
        empTableBody.innerHTML = '';
        
        // Filter out inactive users and sort: Admin > Manager > Employee
        let activeUsers = db.users.filter(user => user.status === 'Active');
        const roleOrder = { 'Admin': 1, 'Manager': 2, 'Employee': 3 };
        activeUsers.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
        
        if (activeUsers.length === 0) {
            empTableBody.innerHTML = `<tr><td colspan="6" class="empty-state">No active employees found.</td></tr>`;
        } else {
            activeUsers.forEach(user => {
                const mgr = db.users.find(u => u.id === user.managerId);
                const mgrName = mgr ? mgr.name : '<span class="text-muted">None</span>';
                const roleClass = user.role.toLowerCase();
                const statusClass = 'badge-active';
                
                empTableBody.innerHTML += `
                    <tr>
                        <td class="bold">${user.name}</td>
                        <td>${user.email}</td>
                        <td>${mgrName}</td>
                        <td><span class="badge-role ${roleClass}">${user.role}</span></td>
                        <td><span class="${statusClass}">${user.status}</span></td>
                        <td>
                            <div class="btn-action-group">
                                <button class="btn-action-circle" onclick="viewUserProfile('${user.id}')" tooltip="View Profile"><i class="fa-regular fa-eye"></i></button>
                                <button class="btn-action-circle" onclick="openEditEmployeeModal('${user.id}')" tooltip="Edit"><i class="fa-regular fa-pen-to-square"></i></button>
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
        const managers = db.users.filter(user => user.role === 'Manager' && user.status === 'Active');
        
        managers.forEach(manager => {
            const mgrInitials = getInitials(manager.name);
            const teamEmployees = db.users.filter(u => u.role === 'User' && u.managerId === manager.id && u.status === 'Active');
            
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

    // 4. Populate Salaries Sub-tab Table
    if (salariesTableBody) {
        salariesTableBody.innerHTML = '';
        let activeUsers = db.users.filter(user => user.status === 'Active');
        
        if (activeUsers.length === 0) {
            salariesTableBody.innerHTML = `<tr><td colspan="4" class="empty-state">No active staff found.</td></tr>`;
        } else {
            activeUsers.forEach(user => {
                const roleClass = user.role.toLowerCase();
                const salary = user.salary ? '$' + parseFloat(user.salary).toLocaleString(undefined, {minimumFractionDigits: 2}) : '$0.00';
                salariesTableBody.innerHTML += `
                    <tr>
                        <td class="text-muted">${user.id}</td>
                        <td class="bold">${user.name}</td>
                        <td><span class="badge-role ${roleClass}">${user.role}</span></td>
                        <td class="bold" style="color: var(--success);">${salary}</td>
                    </tr>
                `;
            });
        }
    }

    // 5. Populate Employee Cards Sub-tab
    if (cardsContainer) {
        cardsContainer.innerHTML = '';
        let activeUsers = db.users.filter(user => user.status === 'Active');
        
        if (activeUsers.length === 0) {
            cardsContainer.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">No active staff found.</div>`;
        } else {
            activeUsers.forEach(user => {
                const initials = getInitials(user.name);
                const roleClass = user.role.toLowerCase();
                const dateJoined = user.startDate ? new Date(user.startDate).toLocaleDateString() : 'N/A';
                
                cardsContainer.innerHTML += `
                    <div class="team-card bg-glass" style="display: flex; flex-direction: column; align-items: center; text-align: center;">
                        <div class="avatar" style="width: 80px; height: 80px; font-size: 30px; margin-bottom: 10px;">${initials}</div>
                        <h3 style="font-size: 18px; margin-bottom: 5px;">${user.name}</h3>
                        <span class="badge-role ${roleClass}" style="margin-bottom: 15px;">${user.role}</span>
                        <div style="font-size: 13px; color: var(--text-muted); width: 100%; text-align: left; background: rgba(0,0,0,0.1); padding: 10px; border-radius: 8px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span>Employee ID:</span>
                                <span class="bold text-primary">${user.id}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span>Email:</span>
                                <span>${user.email}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>Joined:</span>
                                <span>${dateJoined}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
        }
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

function renderAdminAttendanceTab() {
    const db = getDb();
    const filterDate = document.getElementById('admin-attendance-filter-date').value;
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
    logs.sort((a,b) => new Date(b.date) - new Date(a.date));
    
    if (logs.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="empty-state">No attendance records found.</td></tr>`;
    } else {
        logs.forEach(log => {
            const emp = db.users.find(u => u.id === log.employeeId);
            const empRole = emp ? emp.role : 'Employee';
            const mgr = emp ? db.users.find(u => u.id === emp.managerId) : null;
            const mgrName = mgr ? mgr.name : '<span class="text-muted">None</span>';
            
            tableBody.innerHTML += `
                <tr>
                    <td>${log.date}</td>
                    <td class="bold">${log.employeeName}</td>
                    <td><span class="badge-role ${empRole.toLowerCase()}">${empRole}</span></td>
                    <td>${mgrName}</td>
                    <td><span class="badge-status ${log.status === 'Present' ? 'approved' : 'rejected'}">${log.status}</span></td>
                    <td>${log.markedBy || 'System'}</td>
                </tr>
            `;
        });
    }
}

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
    submissions.sort((a,b) => new Date(b.date) - new Date(a.date));
    
    if (submissions.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="empty-state">No productivity logs found.</td></tr>`;
    } else {
        submissions.forEach(sub => {
            const statusClass = sub.status === 'Approved' ? 'approved' : (sub.status === 'Rejected' ? 'rejected' : 'pending');
            tableBody.innerHTML += `
                <tr>
                    <td>${sub.date}</td>
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

function renderAdminLeaveTab() {
    const db = getDb();
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
                    <td class="bold">${l.employeeName}</td>
                    <td><span class="badge-role employee">${l.type}</span></td>
                    <td>${l.startDate} to ${l.endDate}</td>
                    <td class="italic">"${l.reason}"</td>
                    <td><span class="badge-status ${statusClass}">${l.status}</span></td>
                    <td><span class="text-muted italic">${l.comments || '—'}</span></td>
                    <td>${actionBtnHTML}</td>
                </tr>
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

// ==================== RENDERING: MANAGER VIEWS ====================
function renderManagerDashboard() {
    const db = getDb();
    const teamMembers = db.users.filter(u => u.role === 'User' && u.managerId === currentUser.id);
    const teamSize = teamMembers.length;
    
    document.getElementById('manager-team-name-sub').textContent = `${currentUser.name}'s Reporting Team`;
    
    // Team pending leaves
    const teamEmails = teamMembers.map(t => t.id);
    const pendingLeaves = db.leaves.filter(l => teamEmails.includes(l.employeeId) && l.status === 'Pending').length;
    
    // Team attendance today
    const today = new Date().toISOString().split('T')[0];
    const presentCount = db.attendance.filter(a => a.date === today && a.status === 'Present' && teamEmails.includes(a.employeeId)).length;
    const attendancePct = teamSize > 0 ? Math.round((presentCount / teamSize) * 100) : 0;
    
    // Average Team Productivity Score
    const teamProd = db.productivity.filter(p => teamEmails.includes(p.employeeId) && p.status === 'Approved');
    const avgScore = teamProd.length > 0 
        ? Math.round(teamProd.reduce((sum, p) => sum + p.score, 0) / teamProd.length) 
        : 0;
        
    document.getElementById('manager-metric-team-size').textContent = teamSize;
    document.getElementById('manager-metric-pending-leaves').textContent = pendingLeaves;
    document.getElementById('manager-metric-today-attendance').textContent = attendancePct + "%";
    document.getElementById('manager-metric-avg-score').textContent = avgScore;
    
    // Team list table
    const tableBody = document.getElementById('manager-team-table-body');
    tableBody.innerHTML = '';
    
    if (teamMembers.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="empty-state">No employees assigned to you yet.</td></tr>`;
    } else {
        teamMembers.forEach(emp => {
            // Find today activity notes
            const todayProd = db.productivity.find(p => p.employeeId === emp.id && p.date === today);
            const todayActivity = todayProd ? todayProd.notes : '<span class="text-muted">No activity submitted today</span>';
            
            // Total overall productivity score
            const empProdSubmissions = db.productivity.filter(p => p.employeeId === emp.id && p.status === 'Approved');
            const totalScore = empProdSubmissions.reduce((sum, p) => sum + p.score, 0);
            
            const statusClass = emp.status === 'Active' ? 'badge-active' : 'badge-inactive';
            
            tableBody.innerHTML += `
                <tr>
                    <td class="bold">${emp.name}</td>
                    <td><span class="${statusClass}">${emp.status}</span></td>
                    <td style="max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${todayActivity}</td>
                    <td><strong class="text-info">${totalScore}</strong></td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick="viewUserProfile('${emp.id}')">View Details</button>
                    </td>
                </tr>
            `;
        });
    }
    
    // Team pending leaves panel
    const leavesList = document.getElementById('manager-pending-leaves-list');
    leavesList.innerHTML = '';
    const pendingList = db.leaves.filter(l => teamEmails.includes(l.employeeId) && l.status === 'Pending');
    if (pendingList.length === 0) {
        leavesList.innerHTML = `<div class="empty-state">No pending leave requests.</div>`;
    } else {
        pendingList.forEach(l => {
            leavesList.innerHTML += `
                <div class="leave-mini-card">
                    <div class="leave-mini-card-header">
                        <h5>${l.employeeName}</h5>
                        <span class="badge-status pending">${l.type}</span>
                    </div>
                    <p class="text-muted">"${l.reason}"</p>
                    <div class="dates">${l.startDate} to ${l.endDate}</div>
                    <div class="footer-actions">
                        <button class="btn btn-sm btn-outline" onclick="reviewLeaveRequest('${l.id}')">Review</button>
                    </div>
                </div>
            `;
        });
    }
    
    // Team Pending Productivity Reviews Panel
    const reviewsList = document.getElementById('manager-pending-prod-list');
    reviewsList.innerHTML = '';
    const pendingProdList = db.productivity.filter(p => teamEmails.includes(p.employeeId) && p.status === 'Pending');
    if (pendingProdList.length === 0) {
        reviewsList.innerHTML = `<div class="empty-state">All team productivity logs reviewed.</div>`;
    } else {
        pendingProdList.forEach(p => {
            reviewsList.innerHTML += `
                <div class="prod-review-card">
                    <div class="prod-review-card-header">
                        <h5>${p.employeeName}</h5>
                        <span class="text-info font-heading bold">Est. Score: ${p.score}</span>
                    </div>
                    <p class="text-muted italic">"${p.notes}"</p>
                    <div class="date">${p.date} • Tasks: ${p.tasks.join(', ')}</div>
                    <div class="footer-actions">
                        <button class="btn btn-sm btn-outline" onclick="reviewProductivitySubmission('${p.id}')">Review</button>
                    </div>
                </div>
            `;
        });
    }
}

function renderManagerTeamTab() {
    const db = getDb();
    const teamMembers = db.users.filter(u => u.role === 'User' && u.managerId === currentUser.id);
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

function renderManagerAttendanceTab() {
    const db = getDb();
    const team = db.users.filter(u => u.role === 'User' && u.managerId === currentUser.id);
    const teamEmails = team.map(t => t.id);
    const filterDate = document.getElementById('manager-attendance-filter-date').value;
    
    const tableBody = document.getElementById('manager-attendance-table-body');
    tableBody.innerHTML = '';
    
    let logs = db.attendance.filter(a => teamEmails.includes(a.employeeId));
    if (filterDate) logs = logs.filter(l => l.date === filterDate);
    
    logs.sort((a,b) => new Date(b.date) - new Date(a.date));
    
    if (logs.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="empty-state">No team attendance logs found.</td></tr>`;
    } else {
        logs.forEach(log => {
            tableBody.innerHTML += `
                <tr>
                    <td>${log.date}</td>
                    <td class="bold">${log.employeeName}</td>
                    <td><span class="badge-status ${log.status === 'Present' ? 'approved' : 'rejected'}">${log.status}</span></td>
                    <td>${log.markedBy || 'System'}</td>
                </tr>
            `;
        });
    }
}

function renderManagerProductivityTab() {
    const db = getDb();
    const team = db.users.filter(u => u.role === 'User' && u.managerId === currentUser.id);
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
    
    submissions.sort((a,b) => new Date(b.date) - new Date(a.date));
    
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

function renderManagerLeaveTab() {
    const db = getDb();
    const team = db.users.filter(u => u.role === 'User' && u.managerId === currentUser.id);
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
                    <td class="bold">${l.employeeName}</td>
                    <td><span class="badge-role employee">${l.type}</span></td>
                    <td>${l.startDate} to ${l.endDate}</td>
                    <td class="italic">"${l.reason}"</td>
                    <td><span class="badge-status ${statusClass}">${l.status}</span></td>
                    <td><span class="text-muted italic">${l.comments || '—'}</span></td>
                    <td>${actionsHTML}</td>
                </tr>
            `;
        });
    }
}

// ==================== RENDERING: EMPLOYEE VIEWS ====================
function renderEmployeeDashboard() {
    const db = getDb();
    document.getElementById('employee-welcome-title').textContent = `Welcome Back, ${currentUser.name}!`;
    
    // Attendance Today Card
    const today = new Date().toISOString().split('T')[0];
    const todayAtt = db.attendance.find(a => a.employeeId === currentUser.id && a.date === today);
    const attendanceVal = todayAtt ? todayAtt.status : 'Absent';
    
    const attEl = document.getElementById('employee-metric-attendance');
    attEl.textContent = attendanceVal;
    
    const iconContainer = document.getElementById('employee-attendance-icon');
    if (attendanceVal === 'Present') {
        attEl.className = 'value text-success';
        iconContainer.className = 'card-icon bg-success-light text-success';
    } else {
        attEl.className = 'value text-danger';
        iconContainer.className = 'card-icon bg-danger-light text-danger';
    }
    
    // Total Leaves Taken approved
    const totalLeaves = db.leaves.filter(l => l.employeeId === currentUser.id && l.status === 'Approved').length;
    document.getElementById('employee-metric-leaves').textContent = totalLeaves;
    
    // Pending requests Count (leaves + productivity)
    const pendingLeaves = db.leaves.filter(l => l.employeeId === currentUser.id && l.status === 'Pending').length;
    const pendingProd = db.productivity.filter(p => p.employeeId === currentUser.id && p.status === 'Pending').length;
    document.getElementById('employee-metric-pending').textContent = pendingLeaves + pendingProd;
    
    // Productivity Score Today (approved or adjusted)
    const todayProd = db.productivity.find(p => p.employeeId === currentUser.id && p.date === today);
    const scoreVal = todayProd ? todayProd.score : 0;
    document.getElementById('employee-metric-score').textContent = scoreVal;
    
    // Dashboard personal productivity table
    const tableBody = document.getElementById('employee-dashboard-prod-table');
    tableBody.innerHTML = '';
    
    const myProd = db.productivity.filter(p => p.employeeId === currentUser.id);
    myProd.sort((a,b) => new Date(b.date) - new Date(a.date));
    
    if (myProd.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="empty-state">No productivity logs submitted yet.</td></tr>`;
    } else {
        myProd.slice(0, 5).forEach(sub => {
            const statusClass = sub.status === 'Approved' ? 'approved' : (sub.status === 'Rejected' ? 'rejected' : 'pending');
            tableBody.innerHTML += `
                <tr>
                    <td>${sub.date}</td>
                    <td class="bold">${sub.tasks.join(', ')}</td>
                    <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${sub.notes}</td>
                    <td>${Object.values(sub.counts).reduce((s, c) => s + c, 0)}</td>
                    <td><strong class="text-info">${sub.score}</strong></td>
                    <td><span class="badge-status ${statusClass}">${sub.status}</span></td>
                </tr>
            `;
        });
    }
    
    // Dashboard leave status
    const leavesList = document.getElementById('employee-dashboard-leaves-list');
    leavesList.innerHTML = '';
    
    const myLeaves = db.leaves.filter(l => l.employeeId === currentUser.id);
    myLeaves.sort((a,b) => new Date(b.startDate) - new Date(a.startDate));
    
    if (myLeaves.length === 0) {
        leavesList.innerHTML = `<div class="empty-state">No leave applications submitted.</div>`;
    } else {
        myLeaves.slice(0, 4).forEach(l => {
            const statusClass = l.status === 'Approved' ? 'approved' : (l.status === 'Rejected' ? 'rejected' : 'pending');
            const commentHTML = l.comments ? `<p class="comment mt-1">Comment: <strong class="text-primary">${l.comments}</strong></p>` : '';
            
            leavesList.innerHTML += `
                <div class="leave-mini-card">
                    <div class="leave-mini-card-header">
                        <h5>${l.type}</h5>
                        <span class="badge-status ${statusClass}">${l.status}</span>
                    </div>
                    <div class="dates">${l.startDate} to ${l.endDate}</div>
                    ${commentHTML}
                </div>
            `;
        });
    }
    
    // Dashboard announcements
    const announceList = document.getElementById('employee-announcements-list');
    announceList.innerHTML = '';
    const filteredAnnouncements = db.announcements.filter(a => a.target === 'All' || a.target === 'User');
    
    if (filteredAnnouncements.length === 0) {
        announceList.innerHTML = `<div class="empty-state">No announcements.</div>`;
    } else {
        filteredAnnouncements.forEach(ann => {
            announceList.innerHTML += `
                <div class="announcement-mini-card">
                    <h4>${ann.title}</h4>
                    <p>${ann.content}</p>
                    <div class="meta">
                        <span>By: <strong>${ann.author}</strong></span>
                        <span>${ann.date}</span>
                    </div>
                </div>
            `;
        });
    }
}

function renderEmployeeAttendanceTab() {
    const db = getDb();
    const tableBody = document.getElementById('employee-tab-attendance-table');
    tableBody.innerHTML = '';
    
    const myAtt = db.attendance.filter(a => a.employeeId === currentUser.id);
    myAtt.sort((a,b) => new Date(b.date) - new Date(a.date));
    
    if (myAtt.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="3" class="empty-state">No attendance records.</td></tr>`;
    } else {
        myAtt.forEach(att => {
            tableBody.innerHTML += `
                <tr>
                    <td>${att.date}</td>
                    <td><span class="badge-status ${att.status === 'Present' ? 'approved' : 'rejected'}">${att.status}</span></td>
                    <td>${att.markedBy || 'System'}</td>
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
    myProd.sort((a,b) => new Date(b.date) - new Date(a.date));
    
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
                    <td><span class="text-muted italic">${p.comments || '—'}</span></td>
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
    myLeaves.sort((a,b) => new Date(b.startDate) - new Date(a.startDate));
    
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
                    <td><span class="text-muted italic">${l.comments || '—'}</span></td>
                </tr>
            `;
        });
    }
}

// ==================== RENDERING: NOTIFICATIONS SYSTEM ====================
function renderNotifications() {
    const db = getDb();
    const panelList = document.getElementById('notifications-list');
    const badgeEl = document.getElementById('notification-badge-count');
    
    if (!currentUser) return;
    
    const myNotifications = db.notifications.filter(n => n.userId === currentUser.id);
    const unreadCount = myNotifications.filter(n => !n.read).length;
    
    // Badge pulse handler
    if (unreadCount > 0) {
        badgeEl.textContent = unreadCount;
        badgeEl.classList.remove('hidden');
    } else {
        badgeEl.classList.add('hidden');
    }
    
    panelList.innerHTML = '';
    if (myNotifications.length === 0) {
        panelList.innerHTML = `<div class="empty-state">No notifications.</div>`;
    } else {
        myNotifications.forEach(notif => {
            const unreadClass = notif.read ? '' : 'unread';
            panelList.innerHTML += `
                <div class="notification-item ${unreadClass}" onclick="markNotificationRead('${notif.id}')">
                    <p>${notif.message}</p>
                    <span class="time">${notif.time}</span>
                </div>
            `;
        });
    }
}

function markNotificationRead(notifId) {
    const db = getDb();
    const notif = db.notifications.find(n => n.id === notifId);
    if (notif) {
        notif.read = true;
        saveDb(db);
        renderNotifications();
    }
}

// ==================== DIALOGS & ACTIONS ====================

// Modal close general function
function closeAllModals() {
    document.getElementById('modal-backdrop').classList.add('hidden');
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

function openModal(modalId) {
    document.getElementById('modal-backdrop').classList.remove('hidden');
    document.getElementById(modalId).classList.remove('hidden');
}

// 1. Employee Profiles Modal
window.viewUserProfile = function(userId) {
    const db = getDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) return;
    
    document.getElementById('profile-name').textContent = user.name;
    document.getElementById('profile-role').textContent = user.role;
    document.getElementById('profile-role').className = `role-badge badge-role ${user.role.toLowerCase()}`;
    document.getElementById('profile-email').textContent = user.email;
    const avatarEl = document.getElementById('profile-avatar');
    if (user.profilePic) {
        avatarEl.innerHTML = `<a href="${user.profilePic}" target="_blank" title="Click to view full image"><img src="${user.profilePic}" style="width:100%;height:100%;object-fit:cover;" alt="Profile Picture"></a>`;
    } else {
        avatarEl.textContent = user.name.charAt(0).toUpperCase();
    }
    
    document.getElementById('profile-status').textContent = user.status;
    document.getElementById('profile-designation').textContent = user.designation || 'N/A';
    document.getElementById('profile-blood-group').textContent = user.bloodGroup || 'N/A';
    
    const docSection = document.getElementById('profile-documents-section');
    const docList = document.getElementById('profile-documents-list');
    if (user.documents && user.documents.length > 0) {
        docSection.style.display = 'block';
        docList.innerHTML = user.documents.map(d => `
            <div><i class="fa-regular fa-file-lines" style="color:var(--primary); margin-right:5px;"></i>
            <a href="javascript:void(0)" onclick="window.openDocument('${d.data}', '${d.name}')" style="color:var(--primary); text-decoration:none; font-weight:600;">${d.name}</a></div>
        `).join('');
    } else {
        docSection.style.display = 'none';
        docList.innerHTML = '';
    }
    
    const mgrRow = document.getElementById('profile-row-manager');
    if (user.role === 'User') {
        const mgr = db.users.find(u => u.id === user.managerId);
        document.getElementById('profile-manager').textContent = mgr ? mgr.name : 'Unassigned';
        mgrRow.style.display = 'flex';
    } else {
        mgrRow.style.display = 'none';
    }
    
    openModal('modal-profile');
};

// 1b. Company Profile Modal
window.openCompanyProfileModal = function() {
    const db = getDb();
    const cp = db.companyProfile || {};
    
    document.getElementById('comp-name').value = cp.name || '';
    document.getElementById('comp-email').value = cp.email || '';
    document.getElementById('comp-phone').value = cp.phone || '';
    document.getElementById('comp-website').value = cp.website || '';
    document.getElementById('comp-address').value = cp.address || '';
    document.getElementById('comp-reg').value = cp.reg || '';
    document.getElementById('comp-slogan').value = cp.slogan || '';
    document.getElementById('comp-industry').value = cp.industry || '';
    document.getElementById('comp-size').value = cp.size || '';
    document.getElementById('comp-type').value = cp.type || '';
    
    // Clear logo input just in case
    document.getElementById('comp-logo-input').value = '';
    const dropzone = document.getElementById('dropzone-company-logo');
    if (dropzone) {
        if (cp.logoBase64) {
            dropzone.innerHTML = `
                <img src="${cp.logoBase64}" alt="Company Logo" style="max-height: 80px; max-width: 100%; object-fit: contain; margin-bottom: 5px;">
                <div style="font-size: 11px; color: var(--text-muted);">Click to change logo</div>
                <input type="file" id="comp-logo-input" accept="image/*" style="display:none;">
            `;
            // Re-attach listener
            const newInput = dropzone.querySelector('#comp-logo-input');
            if (newInput) {
                newInput.addEventListener('change', () => {
                    if (newInput.files.length) window.onCompLogoSelected(dropzone, newInput.files);
                });
                dropzone.addEventListener('click', () => newInput.click(), { once: true });
            }
        } else {
            dropzone.innerHTML = `
                <i class="fa-solid fa-cloud-arrow-up" style="font-size: 24px; color: var(--primary);"></i>
                <div style="font-weight: 600;">Upload Company Logo</div>
                <div style="font-size: 11px; color: var(--text-muted);">Click or drag image here (Max 2MB)</div>
                <input type="file" id="comp-logo-input" accept="image/*" style="display:none;">
            `;
            const newInput = dropzone.querySelector('#comp-logo-input');
            if (newInput) {
                newInput.addEventListener('change', () => {
                    if (newInput.files.length) window.onCompLogoSelected(dropzone, newInput.files);
                });
                dropzone.addEventListener('click', () => newInput.click(), { once: true });
            }
        }
    }
    
    openModal('modal-company-profile');
};

// 2. Add / Edit Employees Form (Admin & Manager)
window.tempProfilePic = null;
window.tempDocuments = [];

window.openEditEmployeeModal = function(userId) {
    const db = getDb();
    const user = db.users.find(u => u.id === userId);
    
    const modalEl = document.getElementById('modal-employee');
    if (modalEl) modalEl.classList.remove('modal-maximized', 'modal-minimized');
    
    document.getElementById('modal-employee-title').textContent = user ? "Edit Profile" : "Add Employee";
    
    let displayId = "";
    if (user && user.displayId) {
        displayId = user.displayId;
    } else if (user && user.id) {
        displayId = user.id;
    }
    
    document.getElementById('emp-display-id').value = displayId;
    document.getElementById('emp-form-id').value = user ? user.id : "";
    document.getElementById('emp-name').value = user ? user.name : "";
    document.getElementById('emp-email').value = user ? user.email : "";
    document.getElementById('emp-start-date').value = (user && user.startDate) ? user.startDate : new Date().toISOString().split('T')[0];
    document.getElementById('emp-salary').value = (user && user.salary) ? user.salary : "";
    
    // Additional Optional Fields
    document.getElementById('emp-father-name').value = user && user.fatherName ? user.fatherName : "";
    document.getElementById('emp-gender').value = user && user.gender ? user.gender : "Male";
    document.getElementById('emp-dob').value = user && user.dob ? user.dob : "";
    document.getElementById('emp-cnic').value = user && user.cnic ? user.cnic : "";
    document.getElementById('emp-marital-status').value = user && user.maritalStatus ? user.maritalStatus : "Single";
    document.getElementById('emp-blood-group').value = user && user.bloodGroup ? user.bloodGroup : "";
    
    document.getElementById('emp-phone').value = user && user.phone ? user.phone : "";
    document.getElementById('emp-emergency-contact').value = user && user.emergencyContact ? user.emergencyContact : "";
    document.getElementById('emp-designation').value = user && user.designation ? user.designation : "";
    
    if (user && user.endDate) {
        document.getElementById('emp-end-date').value = user.endDate;
    } else {
        document.getElementById('emp-end-date').value = "";
    }
    
    // Read-only logic for Inactive users
    const isInactive = user && user.status === 'Inactive';
    const formElements = document.getElementById('employee-form').querySelectorAll('input, select');
    formElements.forEach(el => {
        if (el.id !== 'emp-form-id' && el.id !== 'emp-display-id') {
            el.disabled = isInactive;
        }
    });
    const submitBtn = document.querySelector('#employee-form button[type="submit"]');
    if (submitBtn) {
        submitBtn.style.display = isInactive ? 'none' : 'block';
    }
    
    document.getElementById('emp-father-name').value = (user && user.fatherName) ? user.fatherName : "";
    document.getElementById('emp-gender').value = (user && user.gender) ? user.gender : "Male";
    document.getElementById('emp-dob').value = (user && user.dob) ? user.dob : "";
    document.getElementById('emp-cnic').value = (user && user.cnic) ? user.cnic : "";
    document.getElementById('emp-marital-status').value = (user && user.maritalStatus) ? user.maritalStatus : "Single";
    document.getElementById('emp-phone').value = (user && user.phone) ? user.phone : "";
    document.getElementById('emp-emergency-contact').value = (user && user.emergencyContact) ? user.emergencyContact : "";
    
    // Password mandatory for new users only
    const passInput = document.getElementById('emp-password');
    if (user) {
        passInput.removeAttribute('required');
        document.getElementById('emp-pass-group').style.display = 'none';
    } else {
        passInput.setAttribute('required', 'true');
        document.getElementById('emp-pass-group').style.display = 'block';
        passInput.value = "";
    }
    
    // Dynamically inject roles based on active user
    const roleSelect = document.getElementById('emp-role');
    roleSelect.innerHTML = '';
    if (currentUser && currentUser.role === 'Admin') {
        roleSelect.innerHTML += '<option value="Admin">Admin</option>';
        roleSelect.innerHTML += '<option value="Manager">Manager</option>';
    }
    roleSelect.innerHTML += '<option value="User">User</option>';
    
    document.getElementById('emp-role').value = user ? user.role : "User";
    document.getElementById('emp-status').value = user ? user.status : "Active";
    
    // Fill reporting managers dropdown
    const managerSelect = document.getElementById('emp-manager');
    managerSelect.innerHTML = '<option value="">None / Unassigned</option>';
    db.users.filter(u => u.role === 'Manager' || u.role === 'Admin').forEach(mgr => {
        managerSelect.innerHTML += `<option value="${mgr.id}">${mgr.name}</option>`;
    });
    
    document.getElementById('emp-manager').value = (user && user.managerId) ? user.managerId : "";
    
    // Role-based restrictions for Manager
    if (currentUser && currentUser.role === 'Manager') {
        document.getElementById('emp-role').value = "User";
        document.getElementById('emp-role').style.pointerEvents = 'none';
        document.getElementById('emp-role').style.opacity = '0.7';
        
        document.getElementById('emp-manager').value = currentUser.id;
        document.getElementById('emp-manager').style.pointerEvents = 'none';
        document.getElementById('emp-manager').style.opacity = '0.7';
    } else {
        document.getElementById('emp-role').style.pointerEvents = 'auto';
        document.getElementById('emp-role').style.opacity = '1';
        document.getElementById('emp-manager').style.pointerEvents = 'auto';
        document.getElementById('emp-manager').style.opacity = '1';
    }
    
    // Reset or populate temp files
    window.tempProfilePic = user && user.profilePic ? user.profilePic : null;
    window.tempDocuments = user && user.documents ? user.documents : [];
    
    // Refresh dropzone visuals
    const picDropzone = document.getElementById('dropzone-profile-pic');
    if (picDropzone) {
        if (window.tempProfilePic) {
            picDropzone.innerHTML = `
                <div style="position:relative; display:inline-block;">
                    <img src="${window.tempProfilePic}" alt="Profile Preview" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid var(--primary);">
                    <button type="button" class="delete-doc-btn" onclick="window.deleteTempProfilePic('${picDropzone.id}')" style="position:absolute;top:-5px;right:-10px;background:var(--danger);color:white;border:none;border-radius:50%;width:20px;height:20px;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div style="font-weight:600;font-size:12px;">Existing Photo</div>
                <div style="font-size:11px;color:var(--text-muted);">Click to change</div>
                <input type="file" id="emp-profile-pic-input" accept="image/*" style="display:none;">
            `;
            const picInput = picDropzone.querySelector('#emp-profile-pic-input');
            if(picInput) {
                picInput.addEventListener('change', () => { if (picInput.files.length) onProfilePicSelected(picDropzone, picInput.files); });
            }
        } else {
            picDropzone.innerHTML = `
                <i class="fa-regular fa-image"></i>
                <div style="font-weight: 600;">Upload Profile Picture</div>
                <div style="font-size: 11px;">Drag & Drop or Click to browse (JPG, PNG)</div>
                <input type="file" id="emp-profile-pic-input" accept="image/*" style="display: none;">
            `;
            const picInput = picDropzone.querySelector('#emp-profile-pic-input');
            if(picInput) {
                picInput.addEventListener('change', () => { if (picInput.files.length) onProfilePicSelected(picDropzone, picInput.files); });
            }
        }
    }
    
    const docDropzone = document.getElementById('dropzone-documents');
    if (docDropzone) {
        window.renderDocumentsDropzone(docDropzone);
    }

    toggleManagerGroup();
    
    openModal('modal-employee');
};

function toggleManagerGroup() {
    const role = document.getElementById('emp-role').value;
    const mgrGroup = document.getElementById('emp-manager-group');
    if (role === 'User') {
        mgrGroup.style.display = 'block';
    } else {
        mgrGroup.style.display = 'none';
        // Admin or Manager doesn't need a manager usually
        document.getElementById('emp-manager').value = "";
    }
}

// Submit user save Form
document.getElementById('employee-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const db = getDb();
    
    const id = document.getElementById('emp-form-id').value;
    const displayId = document.getElementById('emp-display-id').value;
    const name = document.getElementById('emp-name').value.trim();
    const email = document.getElementById('emp-email').value.trim();
    const password = document.getElementById('emp-password').value;
    const role = document.getElementById('emp-role').value;
    const managerId = document.getElementById('emp-manager').value;
    const status = document.getElementById('emp-status').value;
    const startDate = document.getElementById('emp-start-date').value;
    const endDate = document.getElementById('emp-end-date').value;
    const salary = document.getElementById('emp-salary').value;
    
    const fatherName = document.getElementById('emp-father-name').value.trim();
    const gender = document.getElementById('emp-gender').value;
    const dob = document.getElementById('emp-dob').value;
    const cnic = document.getElementById('emp-cnic').value.trim();
    const maritalStatus = document.getElementById('emp-marital-status').value;
    const bloodGroup = document.getElementById('emp-blood-group').value;
    const phone = document.getElementById('emp-phone').value.trim();
    const emergencyContact = document.getElementById('emp-emergency-contact').value.trim();
    const designation = document.getElementById('emp-designation').value.trim();
    
    // Validation
    if (!name || !email || !cnic || !phone) {
        showToast("Validation Error", "Name, Email, CNIC and Phone are required.", "error");
        return;
    }
    
    // Email conflict check
    const emailConflict = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.id !== id);
    if (emailConflict) {
        showToast("Conflict Error", "Email address already assigned to another user.", "error");
        return;
    }
    
    if (id) {
        // Edit Mode
        const user = db.users.find(u => u.id === id);
        if (user) {
            user.name = name;
            user.email = email;
            user.role = role;
            user.managerId = managerId;
            user.status = status;
            user.displayId = displayId;
            user.fatherName = fatherName;
            user.gender = gender;
            user.dob = dob;
            user.cnic = cnic;
            user.maritalStatus = maritalStatus;
            user.phone = phone;
            user.emergencyContact = emergencyContact;
            user.startDate = startDate;
            user.salary = salary;
            user.bloodGroup = bloodGroup;
            user.designation = designation;
            
            // Keep existing endDate if typed manually, else calculate if Inactive
            if (endDate) {
                user.endDate = endDate;
            } else if (status === 'Inactive' && (!user.endDate || user.endDate === '')) {
                user.endDate = new Date().toISOString().split('T')[0];
            } else if (status === 'Active') {
                user.endDate = null;
            }
            
            user.profilePic = window.tempProfilePic;
            user.documents = window.tempDocuments;
            
            saveDb(db);
            showToast("Success", `Profile updated successfully for ${name}.`);
            logAudit(`Updated profile details for employee: ${name} (${role}).`);
        }
    } else {
        // Create Mode
        if (password.length < 6) {
            showToast("Password Error", "Password must be at least 6 characters.", "error");
            return;
        }
        
        const newId = "U_" + Date.now();
        db.users.push({
            id: newId,
            displayId,
            name,
            email,
            password,
            role,
            managerId,
            status,
            fatherName,
            gender,
            dob,
            cnic,
            maritalStatus,
            phone,
            emergencyContact,
            startDate,
            salary,
            bloodGroup,
            designation,
            endDate: endDate ? endDate : (status === 'Inactive' ? new Date().toISOString().split('T')[0] : null),
            profilePic: window.tempProfilePic,
            documents: window.tempDocuments
        });
        
        saveDb(db);
        showToast("Created", `New user profile created for ${name}.`);
        logAudit(`Created new employee profile: ${name} (${role}).`);
    }
    
    closeAllModals();
    refreshTabContent(activeTab);
});

// Delete Employee Profile
window.deleteEmployee = function(userId) {
    if (confirm("Are you sure you want to delete this employee profile? All submissions will remain logged.")) {
        const db = getDb();
        const userIndex = db.users.findIndex(u => u.id === userId);
        if (userIndex > -1) {
            const userName = db.users[userIndex].name;
            db.users.splice(userIndex, 1);
            saveDb(db);
            
            showToast("Deleted", `Employee ${userName} removed from system.`);
            logAudit(`Deleted employee profile: ${userName}.`);
            refreshTabContent(activeTab);
        }
    }
};

// 3. Review Leaves Request Modal (Manager / Admin View)
window.reviewLeaveRequest = function(leaveId) {
    const db = getDb();
    const leave = db.leaves.find(l => l.id === leaveId);
    if (!leave) return;
    
    document.getElementById('leave-review-id').value = leave.id;
    document.getElementById('leave-review-emp').textContent = leave.employeeName;
    document.getElementById('leave-review-type').textContent = leave.type;
    document.getElementById('leave-review-dates').textContent = `${leave.startDate} to ${leave.endDate}`;
    document.getElementById('leave-review-reason').textContent = `"${leave.reason}"`;
    document.getElementById('leave-review-comment').value = leave.comments || "";
    
    openModal('modal-leave-review');
};

// Leaves Review Actions: Approve / Reject
document.getElementById('btn-leave-approve').addEventListener('click', () => {
    processLeaveReview('Approved');
});

document.getElementById('btn-leave-reject').addEventListener('click', () => {
    processLeaveReview('Rejected');
});

function processLeaveReview(status) {
    const db = getDb();
    const id = document.getElementById('leave-review-id').value;
    const comments = document.getElementById('leave-review-comment').value.trim();
    
    const leave = db.leaves.find(l => l.id === id);
    if (leave) {
        leave.status = status;
        leave.comments = comments;
        
        saveDb(db);
        
        showToast("Leave Evaluation", `Leave request marked as ${status}.`);
        logAudit(`Leave request (${leave.type}) for ${leave.employeeName} marked as ${status}.`);
        addNotification(leave.employeeId, `Your leave request for ${leave.startDate} has been ${status}. Manager Remarks: ${comments || 'None'}`);
        
        // If approved, update attendance register as Leave for those dates
        if (status === 'Approved') {
            logLeaveAttendance(leave);
        }
    }
    
    closeAllModals();
    refreshTabContent(activeTab);
}

// Log attendance entries for approved leave dates
function logLeaveAttendance(leave) {
    const db = getDb();
    let start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    
    while (start <= end) {
        const dateStr = start.toISOString().split('T')[0];
        // Check if attendance already logged for that date, update to "On Leave"
        const existing = db.attendance.find(a => a.employeeId === leave.employeeId && a.date === dateStr);
        if (existing) {
            existing.status = "On Leave";
            existing.markedBy = currentUser.name;
        } else {
            db.attendance.push({
                date: dateStr,
                employeeId: leave.employeeId,
                employeeName: leave.employeeName,
                status: "On Leave",
                markedBy: currentUser.name
            });
        }
        start.setDate(start.getDate() + 1);
    }
    saveDb(db);
}

// 4. Apply Leave Request Modal (Employee view)
document.getElementById('leave-request-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const db = getDb();
    
    const type = document.getElementById('leave-type').value;
    const startStr = document.getElementById('leave-start-date').value;
    const endStr = document.getElementById('leave-end-date').value;
    const reason = document.getElementById('leave-reason').value.trim();
    
    if (!startStr || !endStr || !reason) {
        showToast("Validation Error", "All fields are required.", "error");
        return;
    }
    
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    if (end < start) {
        showToast("Date Conflict", "End Date cannot be before Start Date.", "error");
        return;
    }
    
    const newLeave = {
        id: "L_" + Date.now(),
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        type,
        startDate: startStr,
        endDate: endStr,
        reason,
        status: "Pending",
        comments: ""
    };
    
    db.leaves.push(newLeave);
    saveDb(db);
    
    showToast("Submitted", "Leave application submitted to your manager.");
    logAudit(`Submitted leave request (${type}) from ${startStr} to ${endStr}.`);
    
    // Notify manager if manager exists
    if (currentUser.managerId) {
        addNotification(currentUser.managerId, `${currentUser.name} has submitted a leave application for your review.`);
    }
    
    closeAllModals();
    refreshTabContent(activeTab);
});

// 5. Review Productivity Submissions Modal (Manager view)
window.reviewProductivitySubmission = function(prodId) {
    const db = getDb();
    const sub = db.productivity.find(p => p.id === prodId);
    if (!sub) return;
    
    document.getElementById('prod-review-id').value = sub.id;
    document.getElementById('prod-review-emp').textContent = sub.employeeName;
    document.getElementById('prod-review-date').textContent = sub.date;
    document.getElementById('prod-review-tasks').textContent = sub.tasks.join(', ');
    document.getElementById('prod-review-subcats').textContent = sub.subcategories.join(', ');
    
    // Calculate total count
    const totalCount = Object.values(sub.counts).reduce((s, c) => s + c, 0);
    document.getElementById('prod-review-count').textContent = totalCount;
    document.getElementById('prod-review-calc-score').textContent = sub.score;
    document.getElementById('prod-review-calc-score-hint').textContent = sub.score;
    document.getElementById('prod-review-notes').textContent = `"${sub.notes}"`;
    document.getElementById('prod-review-adjust-score').value = "";
    document.getElementById('prod-review-comment').value = sub.comments || "";
    
    openModal('modal-productivity-review');
};

document.getElementById('btn-prod-approve').addEventListener('click', () => {
    processProductivityReview('Approved');
});

document.getElementById('btn-prod-reject').addEventListener('click', () => {
    processProductivityReview('Rejected');
});

function processProductivityReview(status) {
    const db = getDb();
    const id = document.getElementById('prod-review-id').value;
    const adjustScoreVal = document.getElementById('prod-review-adjust-score').value;
    const comments = document.getElementById('prod-review-comment').value.trim();
    
    const sub = db.productivity.find(p => p.id === id);
    if (sub) {
        sub.status = status;
        sub.comments = comments;
        if (status === 'Approved' && adjustScoreVal) {
            const finalScore = parseFloat(adjustScoreVal);
            if (!isNaN(finalScore)) {
                sub.score = finalScore;
            }
        }
        
        saveDb(db);
        
        showToast("Review Complete", `Productivity log has been marked as ${status}.`);
        logAudit(`Productivity log for ${sub.employeeName} reviewed: ${status} (Final Score: ${sub.score}).`);
        addNotification(sub.employeeId, `Your productivity log for ${sub.date} has been ${status}. Review Remarks: ${comments || 'None'}`);
    }
    
    closeAllModals();
    refreshTabContent(activeTab);
}

// 6. Manual Attendance Logger Form
window.openManualAttendanceModal = function() {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('att-log-date').value = today;
    
    const empSelect = document.getElementById('att-log-emp');
    empSelect.innerHTML = '';
    
    let targetUsers = [];
    if (currentUser.role === 'Admin') {
        targetUsers = db.users.filter(u => u.role === 'User');
    } else if (currentUser.role === 'Manager') {
        targetUsers = db.users.filter(u => u.role === 'User' && u.managerId === currentUser.id);
    }
    
    targetUsers.forEach(emp => {
        empSelect.innerHTML += `<option value="${emp.id}">${emp.name}</option>`;
    });
    
    openModal('modal-attendance-log');
};

document.getElementById('attendance-log-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const db = getDb();
    
    const date = document.getElementById('att-log-date').value;
    const empId = document.getElementById('att-log-emp').value;
    const status = document.getElementById('att-log-status').value;
    
    if (!date || !empId || !status) {
        showToast("Validation Error", "All fields are required.", "error");
        return;
    }
    
    const emp = db.users.find(u => u.id === empId);
    if (!emp) return;
    
    const existing = db.attendance.find(a => a.employeeId === empId && a.date === date);
    if (existing) {
        existing.status = status;
        existing.markedBy = currentUser.name;
    } else {
        db.attendance.push({
            date,
            employeeId: empId,
            employeeName: emp.name,
            status,
            markedBy: currentUser.name
        });
    }
    
    saveDb(db);
    showToast("Attendance Saved", `Marked ${emp.name} as ${status} on ${date}.`);
    logAudit(`Logged attendance: ${emp.name} marked ${status} for ${date} by ${currentUser.name}.`);
    addNotification(empId, `Your attendance for ${date} was marked as ${status} manually by your manager/admin.`);
    
    closeAllModals();
    refreshTabContent(activeTab);
});

// 7. Announcements Modal Form (Admin only)
document.getElementById('announcement-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const db = getDb();
    
    const title = document.getElementById('announce-title').value.trim();
    const target = document.getElementById('announce-target').value;
    const content = document.getElementById('announce-content').value.trim();
    
    if (!title || !content) {
        showToast("Validation Error", "Please fill in all announcement fields.", "error");
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    const newAnn = {
        id: "A_" + Date.now(),
        title,
        content,
        target,
        date: today,
        author: currentUser.name
    };
    
    db.announcements.unshift(newAnn);
    saveDb(db);
    
    showToast("Broadcasted", `Announcement broadcasted to target audience: ${target}.`);
    logAudit(`Broadcasted company announcement: "${title}" to ${target}.`);
    
    // Send notifications to target users
    db.users.forEach(u => {
        if (target === 'All' || u.role === target) {
            addNotification(u.id, `New Announcement: "${title}" posted by Admin.`);
        }
    });
    
    closeAllModals();
    refreshTabContent(activeTab);
});

window.deleteAnnouncement = function(annId) {
    if (confirm("Delete this announcement? This will remove it from all employee panels.")) {
        const db = getDb();
        const index = db.announcements.findIndex(a => a.id === annId);
        if (index > -1) {
            const title = db.announcements[index].title;
            db.announcements.splice(index, 1);
            saveDb(db);
            
            showToast("Deleted", "Announcement removed.");
            logAudit(`Deleted announcement: "${title}".`);
            refreshTabContent(activeTab);
        }
    }
};

// 8. Settings Weights Modification Form
document.getElementById('settings-weights-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const db = getDb();
    
    const wBilling = parseFloat(document.getElementById('weight-billing').value);
    const wFollowup = parseFloat(document.getElementById('weight-followup').value);
    const wPosting = parseFloat(document.getElementById('weight-posting').value);
    const wEligibility = parseFloat(document.getElementById('weight-eligibility').value);
    const wReporting = parseFloat(document.getElementById('weight-reporting').value);
    
    if (isNaN(wBilling) || isNaN(wFollowup) || isNaN(wPosting) || isNaN(wEligibility) || isNaN(wReporting)) {
        showToast("Calculation Error", "Weights must be valid numeric values.", "error");
        return;
    }
    
    db.weights["Billing"] = wBilling;
    db.weights["Follow-up"] = wFollowup;
    db.weights["Payment Posting"] = wPosting;
    db.weights["Eligibility Check"] = wEligibility;
    db.weights["Report Preparation"] = wReporting;
    
    saveDb(db);
    
    showToast("Weights Configured", "Evaluating formula weights saved successfully.");
    logAudit(`Modified task evaluation weights configuration.`);
    
    refreshTabContent(activeTab);
});

document.getElementById('btn-admin-clear-audit-logs').addEventListener('click', () => {
    if (confirm("Reset system audit logs? All past events data will be cleared.")) {
        const db = getDb();
        db.auditLogs = [];
        saveDb(db);
        logAudit("Cleared all system logs history.");
        showToast("Reset Complete", "Audit trail logs cleared.");
        refreshTabContent(activeTab);
    }
});

// ==================== DYNAMIC MULTI-SELECT DROPDOWNS (Productivity Submission) ====================
function initMultiSelect() {
    const tasksSelectBox = document.querySelector('#tasks-multiselect .multiselect-select-box');
    const tasksOptions = document.querySelector('#tasks-multiselect .multiselect-options-container');
    
    const subcatsSelectBox = document.querySelector('#subcats-multiselect .multiselect-select-box');
    const subcatsOptions = document.querySelector('#subcats-multiselect .multiselect-options-container');
    
    // Toggle drop down displays
    tasksSelectBox.addEventListener('click', (e) => {
        e.stopPropagation();
        tasksOptions.classList.toggle('hidden');
        subcatsOptions.classList.add('hidden');
    });
    
    subcatsSelectBox.addEventListener('click', (e) => {
        e.stopPropagation();
        subcatsOptions.classList.toggle('hidden');
        tasksOptions.classList.add('hidden');
    });
    
    // Close dropdowns on outside click
    document.addEventListener('click', () => {
        tasksOptions.classList.add('hidden');
        subcatsOptions.classList.add('hidden');
    });
    
    tasksOptions.addEventListener('click', (e) => e.stopPropagation());
    subcatsOptions.addEventListener('click', (e) => e.stopPropagation());
    
    // Task selections changes
    const taskCheckboxes = tasksOptions.querySelectorAll('input[type="checkbox"]');
    taskCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            updateSelectedTasksUI();
            updateSubcategoriesOptions();
            renderDynamicCountInputs();
            calculateLiveProductivityScore();
        });
    });
}

function updateSelectedTasksUI() {
    const selectBoxSpan = document.querySelector('#tasks-multiselect .selected-text');
    const checked = Array.from(document.querySelectorAll('#tasks-multiselect input[type="checkbox"]:checked'));
    
    if (checked.length === 0) {
        selectBoxSpan.textContent = "Select Tasks";
    } else {
        selectBoxSpan.textContent = checked.map(c => c.getAttribute('data-text')).join(', ');
    }
}

function updateSubcategoriesOptions() {
    const subcatsContainer = document.getElementById('subcats-options-list');
    const checkedTasks = Array.from(document.querySelectorAll('#tasks-multiselect input[type="checkbox"]:checked')).map(c => c.value);
    
    subcatsContainer.innerHTML = '';
    
    if (checkedTasks.length === 0) {
        subcatsContainer.innerHTML = '<div class="placeholder-msg">Select a task first</div>';
        document.querySelector('#subcats-multiselect .selected-text').textContent = "Select Subcategories";
        return;
    }
    
    checkedTasks.forEach(task => {
        const subs = TASK_SUBCATEGORIES[task] || [];
        if (subs.length > 0) {
            subcatsContainer.innerHTML += `<div class="placeholder-msg" style="text-align:left; font-weight:bold; padding-bottom:2px; border-bottom: 1px solid var(--border-color);">${task}</div>`;
            subs.forEach(s => {
                subcatsContainer.innerHTML += `
                    <label>
                        <input type="checkbox" name="subcategories" value="${s}" data-text="${s}"> ${s}
                    </label>
                `;
            });
        }
    });
    
    // Add change listeners to subcat checkboxes
    const subCheckboxes = subcatsContainer.querySelectorAll('input[type="checkbox"]');
    subCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            const selectBoxSpan = document.querySelector('#subcats-multiselect .selected-text');
            const checked = Array.from(subcatsContainer.querySelectorAll('input[type="checkbox"]:checked'));
            if (checked.length === 0) {
                selectBoxSpan.textContent = "Select Subcategories";
            } else {
                selectBoxSpan.textContent = checked.map(c => c.getAttribute('data-text')).join(', ');
            }
        });
    });
}

// Generate separate numeric inputs for each selected task
function renderDynamicCountInputs() {
    const form = document.getElementById('productivity-submission-form');
    const countFormGroup = document.getElementById('prod-count').closest('.form-group');
    
    // Clean old dynamic count wrappers
    const oldInputs = form.querySelectorAll('.dynamic-count-row');
    oldInputs.forEach(el => el.remove());
    
    const checkedTasks = Array.from(document.querySelectorAll('#tasks-multiselect input[type="checkbox"]:checked')).map(c => c.value);
    
    if (checkedTasks.length <= 1) {
        // Show default count block
        document.getElementById('prod-count').closest('.form-group').style.display = 'block';
        document.getElementById('prod-count').setAttribute('required', 'true');
    } else {
        // Hide default count block and render individual ones
        countFormGroup.style.display = 'none';
        document.getElementById('prod-count').removeAttribute('required');
        
        // Create input for each task
        checkedTasks.forEach(task => {
            const row = document.createElement('div');
            row.className = 'form-group dynamic-count-row';
            row.innerHTML = `
                <label for="count-${task}">${task} Count / Quantity <span class="required">*</span></label>
                <input type="number" id="count-${task}" min="1" class="form-control task-count-input" data-task="${task}" required placeholder="Enter quantity completed for ${task}">
            `;
            countFormGroup.parentNode.insertBefore(row, countFormGroup);
            
            // Re-calculate live score on input
            row.querySelector('input').addEventListener('input', calculateLiveProductivityScore);
        });
    }
}

function calculateLiveProductivityScore() {
    const db = getDb();
    const weights = db.weights;
    const scoreText = document.getElementById('prod-score-live');
    
    const checkedTasks = Array.from(document.querySelectorAll('#tasks-multiselect input[type="checkbox"]:checked')).map(c => c.value);
    
    if (checkedTasks.length === 0) {
        scoreText.textContent = "0";
        return;
    }
    
    let totalScore = 0;
    
    if (checkedTasks.length === 1) {
        const task = checkedTasks[0];
        const count = parseInt(document.getElementById('prod-count').value) || 0;
        const weight = weights[task] || 0;
        totalScore = count * weight;
    } else {
        checkedTasks.forEach(task => {
            const inputEl = document.getElementById(`count-${task}`);
            const count = inputEl ? (parseInt(inputEl.value) || 0) : 0;
            const weight = weights[task] || 0;
            totalScore += count * weight;
        });
    }
    
    scoreText.textContent = totalScore;
}

// Reset form elements
function resetProductivityForm() {
    const form = document.getElementById('productivity-submission-form');
    form.reset();
    
    // Deselect multiselect dropdowns
    document.querySelectorAll('#tasks-multiselect input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateSelectedTasksUI();
    updateSubcategoriesOptions();
    renderDynamicCountInputs();
    calculateLiveProductivityScore();
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('prod-form-date').value = today;
}

// Submit Productivity Submission form
document.getElementById('productivity-submission-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const database = getDb();
    
    const checkedTasks = Array.from(document.querySelectorAll('#tasks-multiselect input[type="checkbox"]:checked')).map(c => c.value);
    const checkedSubcategories = Array.from(document.querySelectorAll('#subcats-multiselect input[type="checkbox"]:checked')).map(c => c.value);
    const notes = document.getElementById('prod-notes').value.trim();
    const today = new Date().toISOString().split('T')[0];
    
    // Validation
    if (checkedTasks.length === 0) {
        showToast("Validation Error", "Please select at least one Task/Practice.", "error");
        return;
    }
    if (checkedSubcategories.length === 0) {
        showToast("Validation Error", "Please select at least one Subcategory.", "error");
        return;
    }
    if (!notes) {
        showToast("Validation Error", "Notes detail is required.", "error");
        return;
    }
    
    // Gather Counts
    const counts = {};
    let score = 0;
    
    if (checkedTasks.length === 1) {
        const task = checkedTasks[0];
        const count = parseInt(document.getElementById('prod-count').value);
        if (isNaN(count) || count < 1) {
            showToast("Validation Error", "Count must be a positive numeric value.", "error");
            return;
        }
        counts[task] = count;
        score = count * (database.weights[task] || 0);
    } else {
        let hasCountError = false;
        checkedTasks.forEach(task => {
            const inputEl = document.getElementById(`count-${task}`);
            const count = inputEl ? parseInt(inputEl.value) : NaN;
            if (isNaN(count) || count < 1) {
                hasCountError = true;
            }
            counts[task] = count;
            score += count * (database.weights[task] || 0);
        });
        
        if (hasCountError) {
            showToast("Validation Error", "Please enter positive numeric counts for all selected tasks.", "error");
            return;
        }
    }
    
    const newSubmission = {
        id: "P_" + Date.now(),
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        date: today,
        tasks: checkedTasks,
        subcategories: checkedSubcategories,
        counts,
        notes,
        score,
        status: "Pending",
        comments: ""
    };
    
    database.productivity.push(newSubmission);
    saveDb(database);
    
    showToast("Submitted", "Daily productivity submission recorded successfully!");
    logAudit(`Submitted productivity log details (Score: ${score}).`);
    
    // Notify manager
    if (currentUser.managerId) {
        addNotification(currentUser.managerId, `${currentUser.name} submitted a daily productivity log for review.`);
    }
    
    closeAllModals();
    refreshTabContent(activeTab);
});

// Add key listeners to default count field to update live preview
document.getElementById('prod-count').addEventListener('input', calculateLiveProductivityScore);

// ==================== REPORTS & EXPORT SHEETS ====================

// 1. ADMIN REPORTS
function initAdminReportsTab() {
    const db = getDb();
    
    // Fill Employee Filter Options
    const empSelect = document.getElementById('admin-report-employee');
    empSelect.innerHTML = '<option value="">All Employees</option>';
    db.users.filter(u => u.role === 'User').forEach(e => {
        empSelect.innerHTML += `<option value="${e.id}">${e.name}</option>`;
    });
    
    // Fill Manager Filter Options
    const mgrSelect = document.getElementById('admin-report-manager');
    mgrSelect.innerHTML = '<option value="">All Managers</option>';
    db.users.filter(u => u.role === 'Manager').forEach(m => {
        mgrSelect.innerHTML += `<option value="${m.id}">${m.name}</option>`;
    });
    
    // Default dates (past month)
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    
    document.getElementById('admin-report-start-date').value = start.toISOString().split('T')[0];
    document.getElementById('admin-report-end-date').value = end.toISOString().split('T')[0];
}

document.getElementById('btn-admin-report-generate').addEventListener('click', () => {
    generateReport('Admin');
});

// 2. MANAGER REPORTS
function initManagerReportsTab() {
    const db = getDb();
    const team = db.users.filter(u => u.role === 'User' && u.managerId === currentUser.id);
    
    const empSelect = document.getElementById('manager-report-employee');
    empSelect.innerHTML = '<option value="">All Team Members</option>';
    team.forEach(e => {
        empSelect.innerHTML += `<option value="${e.id}">${e.name}</option>`;
    });
    
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    
    document.getElementById('manager-report-start-date').value = start.toISOString().split('T')[0];
    document.getElementById('manager-report-end-date').value = end.toISOString().split('T')[0];
}

document.getElementById('btn-manager-report-generate').addEventListener('click', () => {
    generateReport('Manager');
});

// Generate Reports Render Handler
let generatedReportData = null; // Store active generated records globally

function generateReport(roleContext) {
    const db = getDb();
    
    // Read Filter parameters
    const prefix = roleContext.toLowerCase();
    const reportType = document.getElementById(`${prefix}-report-type`).value;
    const startDateStr = document.getElementById(`${prefix}-report-start-date`).value;
    const endDateStr = document.getElementById(`${prefix}-report-end-date`).value;
    const employeeId = document.getElementById(`${prefix}-report-employee`).value;
    const managerId = roleContext === 'Admin' ? document.getElementById('admin-report-manager').value : "";
    
    const previewContainer = document.getElementById(`${prefix}-report-preview-container`);
    
    if (!startDateStr || !endDateStr) {
        showToast("Filter Error", "Please select both start and end date range.", "error");
        return;
    }
    
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    
    if (end < start) {
        showToast("Filter Error", "End date must be greater than start date.", "error");
        return;
    }
    
    // Filter employees set based on parameters
    let filteredEmployees = db.users.filter(u => u.role === 'User');
    if (roleContext === 'Manager') {
        filteredEmployees = filteredEmployees.filter(e => e.managerId === currentUser.id);
    } else { // Admin
        if (managerId) {
            filteredEmployees = filteredEmployees.filter(e => e.managerId === managerId);
        }
    }
    
    if (employeeId) {
        filteredEmployees = filteredEmployees.filter(e => e.id === employeeId);
    }
    
    const empIds = filteredEmployees.map(e => e.id);
    
    let html = '';
    
    // Report Metadata sheet details
    const timestamp = new Date().toLocaleString();
    const activeRangeDesc = `${startDateStr} to ${endDateStr}`;
    
    if (reportType === 'productivity') {
        // Filter submissions
        let logs = db.productivity.filter(p => empIds.includes(p.employeeId));
        logs = logs.filter(p => {
            const pDate = new Date(p.date);
            return pDate >= start && pDate <= end;
        });
        
        generatedReportData = {
            type: 'productivity',
            range: activeRangeDesc,
            logs: logs
        };
        
        if (logs.length === 0) {
            previewContainer.innerHTML = `<div class="empty-state">No productivity records found for specified parameters.</div>`;
            return;
        }
        
        // Sum total score
        const totalScoreSum = logs.reduce((s, l) => s + l.score, 0);
        
        html = `
            <div class="report-print-sheet">
                <div class="report-print-header">
                    <h2>HRMS - Employee Productivity Audit Report</h2>
                    <p>Generated on: ${timestamp} | Context: ${roleContext} Portal</p>
                </div>
                <div class="report-print-meta">
                    <div>Date Range: <strong>${activeRangeDesc}</strong></div>
                    <div>Total Submissions: <strong>${logs.length}</strong> | Total Score: <strong>${totalScoreSum}</strong></div>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Employee</th>
                            <th>Tasks Checked</th>
                            <th>Total Count</th>
                            <th>Status</th>
                            <th>Productivity Score</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        logs.forEach(log => {
            const statusClass = log.status === 'Approved' ? 'approved' : (log.status === 'Rejected' ? 'rejected' : 'pending');
            const totalCount = Object.values(log.counts).reduce((s, c) => s + c, 0);
            html += `
                <tr>
                    <td>${log.date}</td>
                    <td class="bold">${log.employeeName}</td>
                    <td>${log.tasks.join(', ')}</td>
                    <td>${totalCount}</td>
                    <td><span class="badge-status ${statusClass}">${log.status}</span></td>
                    <td><strong class="text-info">${log.score}</strong></td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
    } else if (reportType === 'attendance') {
        let logs = db.attendance.filter(a => empIds.includes(a.employeeId));
        logs = logs.filter(a => {
            const aDate = new Date(a.date);
            return aDate >= start && aDate <= end;
        });
        
        generatedReportData = {
            type: 'attendance',
            range: activeRangeDesc,
            logs: logs
        };
        
        if (logs.length === 0) {
            previewContainer.innerHTML = `<div class="empty-state">No attendance records found for specified parameters.</div>`;
            return;
        }
        
        const presentCount = logs.filter(l => l.status === 'Present').length;
        const absentCount = logs.filter(l => l.status === 'Absent').length;
        
        html = `
            <div class="report-print-sheet">
                <div class="report-print-header">
                    <h2>HRMS - Employee Attendance History Sheet</h2>
                    <p>Generated on: ${timestamp}</p>
                </div>
                <div class="report-print-meta">
                    <div>Date Range: <strong>${activeRangeDesc}</strong></div>
                    <div>Present Days: <strong class="text-success">${presentCount}</strong> | Absent Days: <strong class="text-danger">${absentCount}</strong></div>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Employee Name</th>
                            <th>Status</th>
                            <th>Marked By</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        logs.forEach(log => {
            html += `
                <tr>
                    <td>${log.date}</td>
                    <td class="bold">${log.employeeName}</td>
                    <td><span class="badge-status ${log.status === 'Present' ? 'approved' : 'rejected'}">${log.status}</span></td>
                    <td>${log.markedBy || 'System'}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
    } else { // Leaves
        let logs = db.leaves.filter(l => empIds.includes(l.employeeId));
        logs = logs.filter(l => {
            const lStart = new Date(l.startDate);
            return lStart >= start && lStart <= end;
        });
        
        generatedReportData = {
            type: 'leaves',
            range: activeRangeDesc,
            logs: logs
        };
        
        if (logs.length === 0) {
            previewContainer.innerHTML = `<div class="empty-state">No leave applications found for specified parameters.</div>`;
            return;
        }
        
        html = `
            <div class="report-print-sheet">
                <div class="report-print-header">
                    <h2>HRMS - Employee Leave Applications Summary</h2>
                    <p>Generated on: ${timestamp}</p>
                </div>
                <div class="report-print-meta">
                    <div>Date Range: <strong>${activeRangeDesc}</strong></div>
                    <div>Approved Requests: <strong>${logs.filter(l=>l.status==='Approved').length}</strong> | Pending: <strong>${logs.filter(l=>l.status==='Pending').length}</strong></div>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Employee Name</th>
                            <th>Leave Type</th>
                            <th>Duration Range</th>
                            <th>Status</th>
                            <th>Comments / Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        logs.forEach(log => {
            const statusClass = log.status === 'Approved' ? 'approved' : (log.status === 'Rejected' ? 'rejected' : 'pending');
            html += `
                <tr>
                    <td class="bold">${log.employeeName}</td>
                    <td><span class="badge-role employee">${log.type}</span></td>
                    <td>${log.startDate} to ${log.endDate}</td>
                    <td><span class="badge-status ${statusClass}">${log.status}</span></td>
                    <td class="italic">${log.comments || '—'}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
    }
    
    previewContainer.innerHTML = html;
    showToast("Report Rendered", `Successfully generated ${reportType} report sheet.`);
}

// PDF Export (Print Page)
document.getElementById('btn-admin-report-pdf').addEventListener('click', printActiveReport);
if (document.getElementById('btn-manager-report-pdf')) {
    document.getElementById('btn-manager-report-pdf').addEventListener('click', printActiveReport);
}

function printActiveReport() {
    if (!generatedReportData) {
        showToast("Print Error", "Please generate a report view first.", "warning");
        return;
    }
    window.print();
}

// CSV Export (Excel Format)
document.getElementById('btn-admin-report-excel').addEventListener('click', exportCSV);
if (document.getElementById('btn-manager-report-excel')) {
    document.getElementById('btn-manager-report-excel').addEventListener('click', exportCSV);
}

function exportCSV() {
    if (!generatedReportData) {
        showToast("Export Error", "Please generate a report view first.", "warning");
        return;
    }
    
    let csvContent = "";
    const type = generatedReportData.type;
    const logs = generatedReportData.logs;
    
    if (type === 'productivity') {
        csvContent += "Date,Employee Name,Tasks,Count,Estimated Score,Status,Manager Comments\n";
        logs.forEach(l => {
            const totalCount = Object.values(l.counts).reduce((s, c) => s + c, 0);
            csvContent += `"${l.date}","${l.employeeName}","${l.tasks.join('|')}","${totalCount}","${l.score}","${l.status}","${l.comments || ''}"\n`;
        });
    } else if (type === 'attendance') {
        csvContent += "Date,Employee Name,Status,Marked By\n";
        logs.forEach(l => {
            csvContent += `"${l.date}","${l.employeeName}","${l.status}","${l.markedBy || ''}"\n`;
        });
    } else {
        csvContent += "Employee Name,Leave Type,Start Date,End Date,Reason,Status,Comments\n";
        logs.forEach(l => {
            csvContent += `"${l.employeeName}","${l.type}","${l.startDate}","${l.endDate}","${l.reason}","${l.status}","${l.comments || ''}"\n`;
        });
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `HRMS_${type}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Downloaded", "Excel CSV spreadsheet exported successfully.");
}

// ==================== GLOBAL EVENT LISTENERS & ROUTERS ====================

// Initialization Flow
document.addEventListener('DOMContentLoaded', async () => {
    await syncServer();
    
    // Set background image from DB state if available
    const db = getDb();
    if (db && db.login_bg) {
        const authPanel = document.getElementById('auth-panel');
        if (authPanel) {
            authPanel.style.setProperty('background-image', `url('${db.login_bg}')`, 'important');
        }
    }
    
    // Populate username dropdown after data loads
    populateLoginDropdown();
    
    try {
        // Yeti eye tracking & arm animation (GSAP calibration)
        const armL   = document.querySelector('.armL');
        const armR   = document.querySelector('.armR');
        const pupilL = document.querySelector('.pupil-L');
        const pupilR = document.querySelector('.pupil-R');
        const passInput = document.getElementById('login-password');
        
        if (typeof gsap !== 'undefined') {
            if (armL && armR) {
                gsap.set(armL, { x: -93, y: 10 });
                gsap.set(armR, { x: -93, y: 10 });
            }
            
            if (passInput) {
                passInput.addEventListener('focus', () => {
                    gsap.to(armL, { x: -10, y: 2, ease: "power2.out", duration: 0.6 });
                    gsap.to(armR, { x: -178, y: 2, ease: "power2.out", duration: 0.6 });
                });
                passInput.addEventListener('blur', () => {
                    gsap.to(armL, { x: -93, y: 10, ease: "power2.in", duration: 0.5 });
                    gsap.to(armR, { x: -93, y: 10, ease: "power2.in", duration: 0.5 });
                });
            }
            
            document.addEventListener('mousemove', (e) => {
                if (document.activeElement === passInput) return;
                const x = (e.clientX / window.innerWidth - 0.5) * 12;
                const y = (e.clientY / window.innerHeight - 0.5) * 12;
                gsap.to([pupilL, pupilR], { x: x, y: y, duration: 0.2 });
            });
        } else {
            console.warn("GSAP is not loaded. Using CSS transforms fallback.");
            if (armL && armR) {
                armL.style.transform = 'translate(-93px, 10px)';
                armR.style.transform = 'translate(-93px, 10px)';
            }
            if (passInput) {
                passInput.addEventListener('focus', () => {
                    if (armL) armL.style.transform = 'translate(-10px, 2px)';
                    if (armR) armR.style.transform = 'translate(-178px, 2px)';
                });
                passInput.addEventListener('blur', () => {
                    if (armL) armL.style.transform = 'translate(-93px, 10px)';
                    if (armR) armR.style.transform = 'translate(-93px, 10px)';
                });
            }
        }
    } catch (e) {
        console.error("Yeti initialization failed: ", e);
    }
    
    // Login form submit
    try {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const usernameSelect = document.getElementById('login-username');
                const passwordInput = document.getElementById('login-password');
                if (usernameSelect && passwordInput) {
                    handleLogin(usernameSelect.value.trim(), passwordInput.value);
                }
            });
        }
    } catch (e) {
        console.error("Login form listener failed: ", e);
    }
    
    // Helper to safely add event listeners without crashing if element doesn't exist
    const safeAddListener = (id, event, callback) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, callback);
    };

    // Logout buttons
    safeAddListener('btn-logout', 'click', handleLogout);
    safeAddListener('btn-profile-logout', 'click', handleLogout);
    
    // Modals close triggers
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    safeAddListener('modal-backdrop', 'click', closeAllModals);
    
    // Modal Window Controls (Maximize / Minimize)
    safeAddListener('btn-modal-maximize', 'click', () => {
        const modal = document.getElementById('modal-employee');
        if (modal) {
            modal.classList.toggle('modal-maximized');
            modal.classList.remove('modal-minimized');
            const icon = document.querySelector('#btn-modal-maximize i');
            if (modal.classList.contains('modal-maximized')) {
                icon.className = 'fa-regular fa-window-restore';
            } else {
                icon.className = 'fa-regular fa-window-maximize';
            }
        }
    });

    safeAddListener('btn-modal-minimize', 'click', () => {
        const modal = document.getElementById('modal-employee');
        if (modal) {
            modal.classList.toggle('modal-minimized');
            modal.classList.remove('modal-maximized');
            const maxIcon = document.querySelector('#btn-modal-maximize i');
            if (maxIcon) maxIcon.className = 'fa-regular fa-window-maximize';
        }
    });
    
    // Admin dashboard specific buttons
    safeAddListener('btn-admin-add-emp', 'click', () => openEditEmployeeModal(""));
    safeAddListener('btn-admin-add-emp-tab', 'click', () => openEditEmployeeModal(""));
    
    // Salary Increment Logic
    safeAddListener('btn-apply-salary-increment', 'click', () => {
        const percentInput = document.getElementById('salary-increment-percent').value;
        const percent = parseFloat(percentInput);
        
        if (!percent || isNaN(percent) || percent <= 0) {
            showToast("Invalid Input", "Please enter a valid positive percentage.", "error");
            return;
        }
        
        if (confirm(`Are you sure you want to increase the salary of all active staff by ${percent}%?`)) {
            const db = getDb();
            let count = 0;
            db.users.forEach(user => {
                if (user.status === 'Active' && user.salary) {
                    const currentSalary = parseFloat(user.salary) || 0;
                    if (currentSalary > 0) {
                        const newSalary = currentSalary + (currentSalary * (percent / 100));
                        user.salary = newSalary.toFixed(2);
                        count++;
                    }
                }
            });
            
            if (count > 0) {
                saveDb(db);
                showToast("Success", `Salaries increased by ${percent}% for ${count} employees.`);
                logAudit(`Applied a ${percent}% salary increment to ${count} active staff members.`);
                renderAdminEmployeesTab();
            } else {
                showToast("Info", "No active employees with valid salaries found to update.", "info");
            }
            document.getElementById('salary-increment-percent').value = '';
        }
    });
    safeAddListener('btn-admin-mark-attendance', 'click', openManualAttendanceModal);
    
    safeAddListener('btn-admin-add-announcement', 'click', () => openModal('modal-announcement'));
    safeAddListener('btn-admin-create-announcement-dash', 'click', () => openModal('modal-announcement'));
    
    // Manager dashboard attendance log trigger
    safeAddListener('btn-manager-log-attendance', 'click', openManualAttendanceModal);
    
    // Employee actions
    safeAddListener('btn-employee-update-prod-dash', 'click', () => {
        resetProductivityForm();
        openModal('modal-productivity-form');
    });
    safeAddListener('btn-employee-update-prod-sub', 'click', () => {
        resetProductivityForm();
        openModal('modal-productivity-form');
    });
    safeAddListener('btn-employee-add-prod-tab', 'click', () => {
        resetProductivityForm();
        openModal('modal-productivity-form');
    });
    
    safeAddListener('btn-employee-apply-leave-dash', 'click', () => {
        const form = document.getElementById('leave-request-form');
        if (form) form.reset();
        openModal('modal-leave-form');
    });
    safeAddListener('btn-employee-apply-leave-sub', 'click', () => {
        const form = document.getElementById('leave-request-form');
        if (form) form.reset();
        openModal('modal-leave-form');
    });
    safeAddListener('btn-employee-add-leave-tab', 'click', () => {
        const form = document.getElementById('leave-request-form');
        if (form) form.reset();
        openModal('modal-leave-form');
    });
    
    // Profile drop down toggle
    const profileBtn = document.getElementById('btn-profile-dropdown');
    const profileMenu = document.getElementById('profile-dropdown');
    if (profileBtn && profileMenu) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileMenu.classList.toggle('hidden');
            const notifPanel = document.getElementById('notifications-panel');
            if (notifPanel) notifPanel.classList.add('hidden');
        });
    }
    
    // Navigation / profile quick views
    safeAddListener('btn-view-profile', 'click', () => {
        if (profileMenu) profileMenu.classList.add('hidden');
        viewUserProfile(currentUser.id);
    });
    safeAddListener('btn-go-settings', 'click', () => {
        if (profileMenu) profileMenu.classList.add('hidden');
        if (currentUser.role === 'Admin') {
            switchTab('settings');
        } else {
            showToast("Permissions", "Settings panels are restricted to Admin role.", "warning");
        }
    });
    
    // Close dropdowns on global click
    document.addEventListener('click', () => {
        if (profileMenu) profileMenu.classList.add('hidden');
        const notifPanel = document.getElementById('notifications-panel');
        if (notifPanel) notifPanel.classList.add('hidden');
    });
    
    // Notifications panel toggle
    const notifBtn = document.getElementById('btn-notifications');
    const notifPanel = document.getElementById('notifications-panel');
    if (notifBtn && notifPanel) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifPanel.classList.toggle('hidden');
            if (profileMenu) profileMenu.classList.add('hidden');
            
            // Re-render to clear pulses
            renderNotifications();
        });
    }
    if (notifPanel) {
        notifPanel.addEventListener('click', (e) => e.stopPropagation());
    }
    
    safeAddListener('btn-clear-notifications', 'click', () => {
        const db = getDb();
        db.notifications.forEach(n => {
            if (n.userId === currentUser.id) n.read = true;
        });
        saveDb(db);
        renderNotifications();
        showToast("Notifications Read", "All alerts marked as read.");
    });
    
    // Theme Toggle Handler
    const themeBtn = document.getElementById('btn-theme-toggle');
    const darkIcon = document.getElementById('theme-icon-dark');
    const lightIcon = document.getElementById('theme-icon-light');
    
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            document.body.classList.toggle('dark-mode');
            const isLight = document.body.classList.contains('light-mode');
            
            if (isLight) {
                if (lightIcon) lightIcon.classList.add('hidden');
                if (darkIcon) darkIcon.classList.remove('hidden');
                showToast("Light Mode Activated", "Subtle color scheme settings updated.");
            } else {
                if (lightIcon) lightIcon.classList.remove('hidden');
                if (darkIcon) darkIcon.classList.add('hidden');
                showToast("Dark Mode Activated", "Deep visual glow settings updated.");
            }
        });
    }
    
    // Mobile Sidebar toggle menu
    const btnSidebarToggle = document.getElementById('btn-sidebar-toggle');
    if (btnSidebarToggle) {
        btnSidebarToggle.addEventListener('click', () => {
            const shell = document.getElementById('app-shell');
            if (shell) {
                const sidebar = shell.querySelector('.sidebar');
                if (sidebar) sidebar.classList.add('active');
            }
        });
    }
    safeAddListener('btn-sidebar-close', 'click', () => {
        const shell = document.getElementById('app-shell');
        if (shell) {
            const sidebar = shell.querySelector('.sidebar');
            if (sidebar) sidebar.classList.remove('active');
        }
    });
    
    // Admin filter changes listener
    safeAddListener('admin-filter-manager', 'change', renderAdminDashboard);
    safeAddListener('admin-filter-status', 'change', renderAdminDashboard);
    safeAddListener('admin-attendance-filter-date', 'change', renderAdminAttendanceTab);
    safeAddListener('admin-attendance-filter-employee', 'change', renderAdminAttendanceTab);
    safeAddListener('admin-prod-filter-date', 'change', renderAdminProductivityTab);
    safeAddListener('admin-prod-filter-task', 'change', renderAdminProductivityTab);
    
    // Manager filter changes listener
    safeAddListener('manager-prod-filter-emp', 'change', renderManagerProductivityTab);
    safeAddListener('manager-prod-filter-status', 'change', renderManagerProductivityTab);
    safeAddListener('manager-attendance-filter-date', 'change', renderManagerAttendanceTab);
    
    // Add manager select toggle to employee addition role change
    safeAddListener('emp-role', 'change', toggleManagerGroup);
    
    // Company Profile click listener
    safeAddListener('btn-company-profile', 'click', () => {
        openCompanyProfileModal();
    });
    
    // Company Profile logo selection handler
    window.onCompLogoSelected = function(dropzone, files) {
        if (!files.length) return;
        const file = files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            const dataURL = e.target.result;
            dropzone.innerHTML = `
                <img src="${dataURL}" alt="Company Logo" style="max-height: 80px; max-width: 100%; object-fit: contain; margin-bottom: 5px;">
                <div style="font-size: 11px; color: var(--text-muted);">Click to change logo</div>
                <input type="file" id="comp-logo-input" accept="image/*" style="display:none;">
            `;
            // Attach logo data to the form dataset for saving
            document.getElementById('company-profile-form').dataset.logoBase64 = dataURL;
            
            // Reattach listener
            const newInput = dropzone.querySelector('#comp-logo-input');
            if (newInput) {
                newInput.addEventListener('change', () => {
                    if (newInput.files.length) window.onCompLogoSelected(dropzone, newInput.files);
                });
                dropzone.addEventListener('click', () => newInput.click(), { once: true });
            }
        };
        reader.readAsDataURL(file);
    };

    // Save Company Profile form
    const cpForm = document.getElementById('company-profile-form');
    if (cpForm) {
        cpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const db = getDb();
            const cp = db.companyProfile || {};
            
            cp.name = document.getElementById('comp-name').value;
            cp.email = document.getElementById('comp-email').value;
            cp.phone = document.getElementById('comp-phone').value;
            cp.website = document.getElementById('comp-website').value;
            cp.address = document.getElementById('comp-address').value;
            cp.reg = document.getElementById('comp-reg').value;
            cp.slogan = document.getElementById('comp-slogan').value;
            cp.industry = document.getElementById('comp-industry').value;
            cp.size = document.getElementById('comp-size').value;
            cp.type = document.getElementById('comp-type').value;
            
            if (cpForm.dataset.logoBase64) {
                cp.logoBase64 = cpForm.dataset.logoBase64;
            }
            
            db.companyProfile = cp;
            await saveDb(db);
            
            // Update Dashboard Logo immediately
            applyCompanyProfile(db);
            
            closeAllModals();
            showToast("Company Profile", "Company profile updated successfully.");
        });
    }

    // Init productivity form multiselect dropdown logic
    initMultiSelect();
    
    // Sub-tab switching handler for employee management view
    document.querySelectorAll('.btn-sub-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const subtab = btn.dataset.subtab;
            const parent = btn.closest('.tab-view');
            
            // Toggle active classes on buttons
            parent.querySelectorAll('.btn-sub-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Toggle visibility of subtab content panels
            parent.querySelectorAll('.sub-tab-content').forEach(c => c.classList.add('hidden'));
            const targetContent = document.getElementById(`subtab-content-${subtab}`);
            if (targetContent) targetContent.classList.remove('hidden');
        });
    });

    // ===== DROPZONE LOGIC (Profile Picture & Documents) =====
    function setupDropzone(dropzoneId, inputId, onFilesSelected) {
        const zone = document.getElementById(dropzoneId);
        const input = document.getElementById(inputId);
        if (!zone || !input) return;

        // Click to open file browser (ignore clicks on links or buttons)
        zone.addEventListener('click', (e) => {
            if (e.target.tagName.toLowerCase() === 'a' || e.target.closest('.delete-doc-btn')) {
                return; // Let the link or button handle it
            }
            const currentInput = zone.querySelector('input[type="file"]');
            if (currentInput) currentInput.click();
        });

        // Show file name(s) after selection via browser
        input.addEventListener('change', () => {
            if (input.files.length > 0) {
                onFilesSelected(zone, input.files);
            }
        });

        // Drag and drop events
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
        });
        zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const currentInput = zone.querySelector('input[type="file"]');
                if (currentInput) {
                    try { currentInput.files = files; } catch (err) { }
                }
                onFilesSelected(zone, files);
            }
        });
    }

    window.deleteTempProfilePic = function(zoneId) {
        window.tempProfilePic = null;
        const zone = document.getElementById(zoneId);
        if (zone) {
            zone.innerHTML = `
                <i class="fa-regular fa-image"></i>
                <div style="font-weight: 600;">Upload Profile Picture</div>
                <div style="font-size: 11px;">Drag & Drop or Click to browse (JPG, PNG)</div>
                <input type="file" id="emp-profile-pic-input" accept="image/*" style="display: none;">
            `;
            const newInput = zone.querySelector('#emp-profile-pic-input');
            if (newInput) {
                newInput.addEventListener('change', () => {
                    if (newInput.files.length) onProfilePicSelected(zone, newInput.files);
                });
            }
        }
    };

    const onProfilePicSelected = (zone, files) => {
        const file = files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
            zone.innerHTML = `
                <div style="position:relative; display:inline-block;">
                    <img src="${ev.target.result}" alt="Profile Preview"
                         style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid var(--primary);">
                    <button type="button" class="delete-doc-btn" onclick="window.deleteTempProfilePic('${zone.id}')" style="position:absolute;top:-5px;right:-10px;background:var(--danger);color:white;border:none;border-radius:50%;width:20px;height:20px;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div style="font-weight:600;font-size:12px;">${file.name}</div>
                <div style="font-size:11px;color:var(--text-muted);">Click to change</div>
                <input type="file" id="emp-profile-pic-input" accept="image/*" style="display:none;">
            `;
            const newInput = zone.querySelector('#emp-profile-pic-input');
            if (newInput) {
                newInput.addEventListener('change', () => {
                    if (newInput.files.length) onProfilePicSelected(zone, newInput.files);
                });
            }
            window.tempProfilePic = ev.target.result;
        };
        reader.readAsDataURL(file);
    };
    window.onProfilePicSelected = onProfilePicSelected;
    setupDropzone('dropzone-profile-pic', 'emp-profile-pic-input', onProfilePicSelected);

    window.deleteTempDocument = function(index, zoneId) {
        window.tempDocuments.splice(index, 1);
        const zone = document.getElementById(zoneId);
        if (zone) window.renderDocumentsDropzone(zone);
    };

    window.renderDocumentsDropzone = function(zone) {
        if (!window.tempDocuments) window.tempDocuments = [];
        if (window.tempDocuments.length > 0) {
            const fileListHTML = window.tempDocuments.map((d, idx) => `
                <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
                    <div style="display:flex;align-items:center;gap:6px;overflow:hidden;">
                        <i class="fa-regular fa-file-lines" style="color:var(--primary);flex-shrink:0;"></i>
                        <a href="javascript:void(0)" onclick="window.openDocument('${d.data}', '${d.name}')" style="color:inherit;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${d.name}">${d.name}</a>
                    </div>
                    <button type="button" class="delete-doc-btn" onclick="window.deleteTempDocument(${idx}, '${zone.id}')" style="background:none;border:none;color:#ef4444;cursor:pointer;padding:2px 5px;"><i class="fa-solid fa-trash"></i></button>
                </div>
            `).join('');
            
            zone.innerHTML = `
                <i class="fa-regular fa-folder-open"></i>
                <div style="font-weight:600;">${window.tempDocuments.length} File(s) Saved</div>
                <div style="text-align:left;width:100%;max-height:80px;overflow-y:auto;margin:5px 0;">${fileListHTML}</div>
                <div style="font-size:11px;color:var(--text-muted);">Click or drag to add more</div>
                <input type="file" id="emp-documents-input" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style="display:none;">
            `;
        } else {
            zone.innerHTML = `
                <i class="fa-regular fa-folder-open"></i>
                <div style="font-weight: 600;">Upload Documents</div>
                <div style="font-size: 11px;">CNIC, CV, Certificates (PDF, DOCX)</div>
                <input type="file" id="emp-documents-input" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style="display: none;">
            `;
        }
        
        const newInput = zone.querySelector('#emp-documents-input');
        if (newInput) {
            newInput.addEventListener('change', () => {
                if (newInput.files.length) window.onDocumentsSelected(zone, newInput.files);
            });
        }
    };

    // Document dropzone – handle new files and append
    window.onDocumentsSelected = async (zone, files) => {
        if (!window.tempDocuments) window.tempDocuments = [];
        
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            const dataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(f);
            });
            window.tempDocuments.push({ name: f.name, data: dataUrl });
        }
        
        window.renderDocumentsDropzone(zone);
    };
    setupDropzone('dropzone-documents', 'emp-documents-input', window.onDocumentsSelected);



    const prevSession = sessionStorage.getItem('current_user');
    if (prevSession) {

        currentUser = JSON.parse(prevSession);
        const authPanel = document.getElementById('auth-panel');
        const appShell = document.getElementById('app-shell');
        if (authPanel) {
            authPanel.classList.add('hidden');
            authPanel.style.setProperty('display', 'none', 'important');
        }
        if (appShell) {
            appShell.classList.remove('hidden');
            appShell.style.setProperty('display', 'flex', 'important');
        }
        renderSidebar();
        switchTab('dashboard');
        setupSessionTimer();
        showToast("Session Restored", `Welcome back, ${currentUser.name}.`);
    }
});
