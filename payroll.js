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
    document.querySelectorAll('.sub-nav-tabs button').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline');
    });

    // Show target section & highlight button
    const targetEl = document.getElementById('payroll-sub-' + subTab);
    const targetBtn = document.getElementById('btn-sub-payroll-' + subTab);
    
    if (targetEl) targetEl.classList.remove('hidden');
    if (targetBtn) {
        targetBtn.classList.remove('btn-outline');
        targetBtn.classList.add('btn-primary');
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

    users.forEach(user => {
        // Find existing profile or use defaults
        const profile = db.salaryProfiles?.find(p => p.userId === user.id) || {
            basic: 0,
            allowances: { rent: 0, medical: 0, fuel: 0, special: 0 },
            deductions: { fine: 0 }
        };

        const totalAllowances = profile.allowances.rent + profile.allowances.medical + profile.allowances.fuel + profile.allowances.special;
        const netFixed = (profile.basic + totalAllowances) - profile.deductions.fine;

        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td class="text-secondary">${user.id}</td>
                <td class="bold">${user.name}</td>
                <td>Rs ${profile.basic.toLocaleString()}</td>
                <td class="text-primary">Rs ${netFixed.toLocaleString()}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline" onclick="openEditSalaryProfileModal('${user.id}')" style="font-size: 12px; padding: 4px 8px;">
                        <i class="fa-solid fa-pen"></i> Setup
                    </button>
                </td>
            </tr>
        `;
    });
};

window.openEditSalaryProfileModal = function(userId) {
    const db = getDb();
    const user = db.users.find(u => u.id === userId);
    if (!user) return;

    const profile = db.salaryProfiles?.find(p => p.userId === userId) || {
        basic: 0,
        allowances: { rent: 0, medical: 0, fuel: 0, special: 0 },
        deductions: { fine: 0 }
    };

    document.getElementById('edit-salary-emp-name').textContent = `Employee: ${user.name} (${user.id})`;
    document.getElementById('edit-salary-emp-id').value = user.id;
    
    document.getElementById('salary-basic').value = profile.basic;
    document.getElementById('salary-allow-rent').value = profile.allowances.rent;
    document.getElementById('salary-allow-medical').value = profile.allowances.medical;
    document.getElementById('salary-allow-fuel').value = profile.allowances.fuel;
    document.getElementById('salary-allow-special').value = profile.allowances.special;
    document.getElementById('salary-deduct-fine').value = profile.deductions.fine;

    document.getElementById('modal-edit-salary-profile').classList.remove('hidden');
};

window.saveSalaryProfile = function() {
    const db = getDb();
    if (!db.salaryProfiles) db.salaryProfiles = [];

    const userId = document.getElementById('edit-salary-emp-id').value;
    const basic = parseInt(document.getElementById('salary-basic').value) || 0;
    const rent = parseInt(document.getElementById('salary-allow-rent').value) || 0;
    const medical = parseInt(document.getElementById('salary-allow-medical').value) || 0;
    const fuel = parseInt(document.getElementById('salary-allow-fuel').value) || 0;
    const special = parseInt(document.getElementById('salary-allow-special').value) || 0;
    const fine = parseInt(document.getElementById('salary-deduct-fine').value) || 0;

    let profile = db.salaryProfiles.find(p => p.userId === userId);
    if (!profile) {
        profile = { userId };
        db.salaryProfiles.push(profile);
    }

    profile.basic = basic;
    profile.allowances = { rent, medical, fuel, special };
    profile.deductions = { fine };

    saveDb(db);
    showToast("Profile Updated", "Salary structure saved successfully.");
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
