// ==========================================
// PAYROLL & SALARY MANAGEMENT SYSTEM
// Phase 1: Salary Profiles & Loans
// ==========================================

// --- Navigation & Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // We attach rendering to the global switchTab function dynamically by hooking into the tab click
});

window.switchPayrollSubTab = function(subTab) {
    // Hide all sub-sections
    document.querySelectorAll('.payroll-sub-section').forEach(el => el.classList.add('hidden'));
    
    // Reset all buttons
    document.querySelectorAll('#admin-tab-payroll .btn-sub-tab').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show target section & highlight button
    const targetEl = document.getElementById('payroll-sub-' + subTab);
    const targetBtn = document.getElementById('btn-sub-payroll-' + subTab);
    
    if (targetEl) targetEl.classList.remove('hidden');
    if (targetBtn) {
        targetBtn.classList.add('active');
    }

    // Trigger rendering logic
    if (subTab === 'profiles') window.renderSalaryProfilesList();
    if (subTab === 'loans') window.renderLoansList();
    if (subTab === 'process') window.initPayrollProcessView();
};

// --- 1. Salary Profiles Management ---

window.renderSalaryProfilesList = function() {
    const db = getDb();
    const tbody = document.getElementById('payroll-profiles-table-body');
    const searchInput = document.getElementById('payroll-profile-search');
    
    if (!tbody || !db) return;

    let filterTxt = searchInput ? searchInput.value.toLowerCase().trim() : '';
    let users = db.users.filter(u => u.status === 'Active');
    
    if (filterTxt) {
        users = users.filter(u => 
            u.name.toLowerCase().includes(filterTxt) || 
            String(u.id).toLowerCase().includes(filterTxt)
        );
    }

    tbody.innerHTML = '';

    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No employees found.</td></tr>`;
        return;
    }

    const globalSlab = db.globalSalarySettings || { allowances: [], deductions: [] };

    users.forEach(user => {
        const basicSalary = parseInt(user.salary) || 0;
        let profile = db.salaryProfiles?.find(p => p.userId === user.id);
        
        let allowances = profile && profile.isCustomSlab ? (profile.allowances || []) : (globalSlab.allowances || []);
        let deductions = profile && profile.isCustomSlab ? (profile.deductions || []) : (globalSlab.deductions || []);

        let totalAllowances = 0;
        allowances.forEach(a => {
            const val = parseFloat(a.value) || 0;
            if (a.type === 'percentage') {
                totalAllowances += (basicSalary * val) / 100;
            } else {
                totalAllowances += val;
            }
        });

        let totalDeductions = 0;
        deductions.forEach(d => {
            const val = parseFloat(d.value) || 0;
            if (d.type === 'percentage') {
                totalDeductions += (basicSalary * val) / 100;
            } else {
                totalDeductions += val;
            }
        });

        const netFixed = (basicSalary + totalAllowances) - totalDeductions;

        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td class="text-secondary">${user.id}</td>
                <td class="bold">
                    ${user.name} 
                    ${profile && profile.isCustomSlab ? '<span class="badge badge-primary" style="font-size:10px; margin-left:5px;">Custom Slab</span>' : '<span class="badge badge-secondary" style="font-size:10px; margin-left:5px;">Global Slab</span>'}
                </td>
                <td>Rs ${basicSalary.toLocaleString()}</td>
                <td class="text-primary">Rs ${Math.round(netFixed).toLocaleString()}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline" onclick="openEditSalaryProfileModal('${user.id}')" style="font-size: 12px; padding: 4px 8px;">
                        <i class="fa-solid fa-pen"></i> Setup
                    </button>
                </td>
            </tr>
        `;
    });
};

function renderDynamicRows(containerId, dataArray, append = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!append) container.innerHTML = '';
    
    dataArray.forEach(item => {
        const row = document.createElement('div');
        row.className = 'form-row dynamic-salary-row';
        row.style.alignItems = 'flex-end';
        row.dataset.id = item.id || ('id_' + Date.now() + Math.random());
        row.innerHTML = `
            <div class="form-group" style="flex: 2; margin-bottom: 0;">
                <label>Name</label>
                <input type="text" class="form-control row-name" value="${item.name || ''}" placeholder="e.g. House Rent">
            </div>
            <div class="form-group" style="flex: 1.5; margin-bottom: 0;">
                <label>Type</label>
                <select class="form-control row-type">
                    <option value="percentage" ${item.type === 'percentage' ? 'selected' : ''}>% of Basic</option>
                    <option value="fixed" ${item.type === 'fixed' ? 'selected' : ''}>Fixed (Rs)</option>
                </select>
            </div>
            <div class="form-group" style="flex: 1.5; margin-bottom: 0;">
                <label>Value</label>
                <input type="number" class="form-control row-val" value="${item.value || 0}" min="0" step="any">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
                <button type="button" class="btn btn-outline text-danger" onclick="this.parentElement.parentElement.remove()" style="padding: 8px 12px;"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        container.appendChild(row);
    });
}

function extractDynamicRows(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    const rows = container.querySelectorAll('.dynamic-salary-row');
    const data = [];
    rows.forEach(row => {
        data.push({
            id: row.dataset.id,
            name: row.querySelector('.row-name').value.trim() || 'Unnamed',
            type: row.querySelector('.row-type').value,
            value: parseFloat(row.querySelector('.row-val').value) || 0
        });
    });
    return data;
}

window.addGlobalAllowanceRow = function() {
    renderDynamicRows('global-allowances-container', [{ name: '', type: 'fixed', value: 0 }], true);
};
window.addGlobalDeductionRow = function() {
    renderDynamicRows('global-deductions-container', [{ name: '', type: 'fixed', value: 0 }], true);
};
window.addCustomAllowanceRow = function() {
    renderDynamicRows('custom-allowances-container', [{ name: '', type: 'fixed', value: 0 }], true);
};
window.addCustomDeductionRow = function() {
    renderDynamicRows('custom-deductions-container', [{ name: '', type: 'fixed', value: 0 }], true);
};

window.openGlobalSalarySlabModal = function() {
    const db = getDb();
    const globalSlab = db.globalSalarySettings || { allowances: [], deductions: [] };

    renderDynamicRows('global-allowances-container', globalSlab.allowances || []);
    renderDynamicRows('global-deductions-container', globalSlab.deductions || []);

    document.getElementById('modal-global-salary-slab').classList.remove('hidden');
};

window.saveGlobalSalarySlab = function() {
    const db = getDb();
    
    db.globalSalarySettings = {
        allowances: extractDynamicRows('global-allowances-container'),
        deductions: extractDynamicRows('global-deductions-container')
    };

    saveDb(db);
    if(window.showToast) showToast("Global Slab Updated", "Default allowances and deductions saved.");
    document.getElementById('modal-global-salary-slab').classList.add('hidden');
    window.renderSalaryProfilesList();
};

window.openEditSalaryProfileModal = function(userId) {
    const db = getDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) return;

    const globalSlab = db.globalSalarySettings || { allowances: [], deductions: [] };

    const profile = db.salaryProfiles?.find(p => p.userId === userId) || {
        isCustomSlab: false,
        allowances: JSON.parse(JSON.stringify(globalSlab.allowances || [])),
        deductions: JSON.parse(JSON.stringify(globalSlab.deductions || []))
    };

    document.getElementById('edit-salary-emp-name').textContent = `Employee: ${user.name} (${user.id})`;
    document.getElementById('edit-salary-emp-id').value = user.id;
    document.getElementById('salary-basic').value = user.salary || 0;
    
    let allowances = profile.isCustomSlab ? (profile.allowances || []) : (globalSlab.allowances || []);
    let deductions = profile.isCustomSlab ? (profile.deductions || []) : (globalSlab.deductions || []);

    renderDynamicRows('custom-allowances-container', JSON.parse(JSON.stringify(allowances)));
    renderDynamicRows('custom-deductions-container', JSON.parse(JSON.stringify(deductions)));

    const toggleBtn = document.getElementById('salary-override-toggle');
    if (toggleBtn) {
        toggleBtn.checked = profile.isCustomSlab;
        window.toggleSalaryOverride(toggleBtn);
    }

    document.getElementById('modal-edit-salary-profile').classList.remove('hidden');
};

window.toggleSalaryOverride = function(checkbox) {
    const container = document.getElementById('salary-custom-slab-container');
    if (!container) return;

    if (checkbox.checked) {
        container.style.opacity = '1';
        container.style.pointerEvents = 'auto';
    } else {
        container.style.opacity = '0.5';
        container.style.pointerEvents = 'none';
        
        const db = getDb();
        const globalSlab = db.globalSalarySettings || { allowances: [], deductions: [] };
        renderDynamicRows('custom-allowances-container', JSON.parse(JSON.stringify(globalSlab.allowances || [])));
        renderDynamicRows('custom-deductions-container', JSON.parse(JSON.stringify(globalSlab.deductions || [])));
    }
};

window.saveSalaryProfile = function() {
    const db = getDb();
    if (!db.salaryProfiles) db.salaryProfiles = [];

    const userId = document.getElementById('edit-salary-emp-id').value;
    const toggleBtn = document.getElementById('salary-override-toggle');
    const isCustomSlab = toggleBtn ? toggleBtn.checked : false;
    
    
    let profile = db.salaryProfiles.find(p => p.userId === userId);
    if (!profile) {
        profile = { userId };
        db.salaryProfiles.push(profile);
    }

    profile.isCustomSlab = isCustomSlab;

    if (isCustomSlab) {
        profile.allowances = extractDynamicRows('custom-allowances-container');
        profile.deductions = extractDynamicRows('custom-deductions-container');
    } else {
        delete profile.allowances;
        delete profile.deductions;
    }

    saveDb(db);
    if(window.showToast) showToast("Profile Updated", "Employee salary structure saved.");
    document.getElementById('modal-edit-salary-profile').classList.add('hidden');
    window.renderSalaryProfilesList();
};

// --- 2. Loans & Advances Management ---

window.renderLoansList = function() {
    const db = getDb();
    const tbody = document.getElementById('payroll-loans-table-body');
    if (!tbody || !db) return;

    const loans = db.loans || [];
    
    tbody.innerHTML = '';
    
    if (loans.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No active loans or advances found.</td></tr>`;
        return;
    }

    loans.forEach(loan => {
        const user = db.users.find(u => u.id === loan.userId);
        const name = user ? user.name : "Unknown Employee";
        const statusBadge = loan.remainingAmount <= 0 
            ? `<span class="badge-role approved">Cleared</span>`
            : `<span class="badge-role pending">Active</span>`;

        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td class="bold">${name} <br><span class="text-secondary" style="font-size:11px">${loan.userId}</span></td>
                <td>${loan.type}</td>
                <td>Rs ${loan.totalAmount.toLocaleString()}</td>
                <td>Rs ${loan.monthlyInstallment.toLocaleString()}</td>
                <td class="text-danger bold">Rs ${loan.remainingAmount.toLocaleString()}</td>
                <td>${statusBadge}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline" onclick="deleteLoan('${loan.id}')" title="Delete Loan"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
};

window.openIssueLoanModal = function() {
    const db = getDb();
    const select = document.getElementById('loan-emp-id');
    if (!select || !db) return;

    select.innerHTML = '';
    const activeUsers = db.users.filter(u => u.status === 'Active');
    activeUsers.forEach(u => {
        select.add(new Option(`${u.name} (${u.id})`, u.id));
    });

    document.getElementById('issue-loan-form').reset();
    document.getElementById('modal-issue-loan').classList.remove('hidden');
};

window.saveIssueLoan = function() {
    const db = getDb();
    if (!db.loans) db.loans = [];

    const userId = document.getElementById('loan-emp-id').value;
    const type = document.getElementById('loan-type').value;
    const totalAmount = parseInt(document.getElementById('loan-total').value) || 0;
    const monthlyInstallment = parseInt(document.getElementById('loan-installment').value) || 0;

    if (totalAmount <= 0 || monthlyInstallment <= 0) {
        showToast("Error", "Amounts must be greater than zero.", "error");
        return;
    }

    const newLoan = {
        id: 'LN-' + Date.now(),
        userId: userId,
        type: type,
        totalAmount: totalAmount,
        monthlyInstallment: monthlyInstallment,
        remainingAmount: totalAmount,
        issuedAt: new Date().toISOString()
    };

    db.loans.push(newLoan);
    saveDb(db);
    
    showToast("Loan Issued", `Successfully issued ${type} to employee.`);
    document.getElementById('modal-issue-loan').classList.add('hidden');
    window.renderLoansList();
};

window.deleteLoan = function(loanId) {
    if (!confirm("Are you sure you want to delete this loan record? This cannot be undone.")) return;
    
    const db = getDb();
    if (!db.loans) return;
    
    db.loans = db.loans.filter(l => l.id !== loanId);
    saveDb(db);
    showToast("Deleted", "Loan record deleted.");
    window.renderLoansList();
};

// --- 3. Process Payroll (Placeholder for Phase 2) ---
window.initPayrollProcessView = function() {
    const monthInput = document.getElementById('payroll-process-month');
    if (monthInput && !monthInput.value) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        monthInput.value = `${yyyy}-${mm}`;
    }
};

window.generatePayrollPreview = function() {
    showToast("Info", "Payroll processing logic is scheduled for Phase 2.", "info");
};

// Hook into existing switchTab
const _originalSwitchTab = window.switchTab;
window.switchTab = function(tabId) {
    if (_originalSwitchTab) _originalSwitchTab(tabId);
    if (tabId === 'payroll') {
        window.switchPayrollSubTab('profiles');
    }
};
