// ==========================================
// PAYROLL & SALARY MANAGEMENT SYSTEM
// Phase 1: Salary Profiles & Loans
// ==========================================

// --- Navigation & Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // We attach rendering to the global switchTab function dynamically by hooking into the tab click
    
    // Set default payroll history filters to current month and year
    const mFilter = document.getElementById('history-filter-month');
    const yFilter = document.getElementById('history-filter-year');
    const now = new Date();
    if (mFilter) mFilter.value = String(now.getMonth() + 1).padStart(2, '0');
    if (yFilter) {
        let yearExists = Array.from(yFilter.options).some(opt => opt.value === String(now.getFullYear()));
        if (!yearExists) {
            yFilter.innerHTML += `<option value="${now.getFullYear()}">${now.getFullYear()}</option>`;
        }
        yFilter.value = String(now.getFullYear());
    }
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
    if (subTab === 'history') window.renderPayrollHistory();
};

window.renderPayrollHistory = function() {
    const db = getDb();
    const tbody = document.getElementById('payroll-history-tbody');
    if (!tbody || !db) return;

    tbody.innerHTML = '';
    let history = db.payrollHistory || [];
    
    // Apply filters
    const monthFilter = document.getElementById('history-filter-month')?.value || 'All';
    const yearFilter = document.getElementById('history-filter-year')?.value || 'All';
    const searchFilter = document.getElementById('history-filter-search')?.value.toLowerCase().trim() || '';

    if (monthFilter !== 'All') {
        history = history.filter(h => {
            const d = new Date(h.endDate);
            return String(d.getMonth() + 1).padStart(2, '0') === monthFilter;
        });
    }
    if (yearFilter !== 'All') {
        history = history.filter(h => {
            const d = new Date(h.endDate);
            return String(d.getFullYear()) === yearFilter;
        });
    }
    
    // Sort by most recent
    history.sort((a, b) => new Date(b.processedAt) - new Date(a.processedAt));

    let visibleCount = 0;

    history.forEach(record => {
        const user = db.users.find(u => u.id === record.userId);
        const name = user ? user.name : "Unknown Employee";
        
        if (searchFilter) {
            if (!name.toLowerCase().includes(searchFilter) && !record.userId.toLowerCase().includes(searchFilter)) {
                return;
            }
        }
        
        visibleCount++;
        
        const basic = parseInt(user?.salary) || 0;
        let fixedDed = record.fixedDeductions;
        let fixedAll = record.fixedAllowances;
        
        if (fixedDed === undefined || fixedAll === undefined) {
            const globalSlab = db.globalSalarySettings || { allowances: [], deductions: [] };
            let profile = db.salaryProfiles?.find(p => p.userId === record.userId);
            let allowances = profile && profile.isCustomSlab ? (profile.allowances || []) : (globalSlab.allowances || []);
            let deductions = profile && profile.isCustomSlab ? (profile.deductions || []) : (globalSlab.deductions || []);
            
            fixedAll = 0;
            allowances.forEach(a => { fixedAll += (a.type === 'percentage') ? (basic * (parseFloat(a.value)||0)) / 100 : (parseFloat(a.value)||0); });
            fixedDed = 0;
            deductions.forEach(d => { fixedDed += (d.type === 'percentage') ? (basic * (parseFloat(d.value)||0)) / 100 : (parseFloat(d.value)||0); });
        }

        const totalDed = fixedDed + (record.absencyDeduction || 0) + (record.loanDeduction || 0) + (record.otherDeduction || 0);
        const totalAdd = fixedAll + (record.bonus || 0);
        
        const processedDate = new Date(record.processedAt).toLocaleDateString();

        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td class="text-secondary" style="font-size: 11px;">${record.batchId}</td>
                <td class="bold">${name} <br><span class="text-secondary" style="font-size:10px;">${user?.displayId || record.userId}</span></td>
                <td>${record.startDate} to ${record.endDate}</td>
                <td>Rs ${Math.round(basic).toLocaleString()}</td>
                <td class="text-danger">-Rs ${Math.round(totalDed).toLocaleString()}</td>
                <td class="text-success">+Rs ${Math.round(totalAdd).toLocaleString()}</td>
                <td class="text-primary bold">Rs ${Math.round(record.netPay).toLocaleString()}</td>
                <td class="text-secondary">${processedDate}</td>
                <td>
                    <button class="btn btn-outline" style="padding: 4px 8px; font-size: 11px;" onclick="window.openPayslipModal('${record.id}')">
                        <i class="fa-solid fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `;
    });
    
    if (visibleCount === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="empty-state">No payroll records match your filters.</td></tr>`;
    }
};

window.openMonthlySummaryModal = function() {
    const db = getDb();
    if (!db) return;

    let history = db.payrollHistory || [];
    
    // Apply filters to get the current list
    const monthFilter = document.getElementById('history-filter-month')?.value || 'All';
    const yearFilter = document.getElementById('history-filter-year')?.value || 'All';
    const searchFilter = document.getElementById('history-filter-search')?.value.toLowerCase().trim() || '';

    if (monthFilter !== 'All') {
        history = history.filter(h => {
            const d = new Date(h.endDate);
            return String(d.getMonth() + 1).padStart(2, '0') === monthFilter;
        });
    }
    if (yearFilter !== 'All') {
        history = history.filter(h => {
            const d = new Date(h.endDate);
            return String(d.getFullYear()) === yearFilter;
        });
    }
    
    // Sort by most recent
    history.sort((a, b) => new Date(b.processedAt) - new Date(a.processedAt));

    let visibleCount = 0;
    
    let tableRows = '';
    let grandTotalBasic = 0;
    let grandTotalAllowances = 0;
    let grandTotalDeductions = 0;
    let grandTotalNet = 0;

    history.forEach(record => {
        const user = db.users.find(u => u.id === record.userId);
        const name = user ? user.name : "Unknown";
        const designation = user?.designation || "-";
        
        if (searchFilter) {
            if (!name.toLowerCase().includes(searchFilter) && !record.userId.toLowerCase().includes(searchFilter)) {
                return;
            }
        }
        
        visibleCount++;
        
        const basic = parseInt(user?.salary) || 0;
        
        let fixedDed = record.fixedDeductions;
        let fixedAll = record.fixedAllowances;
        
        if (fixedDed === undefined || fixedAll === undefined) {
            const globalSlab = db.globalSalarySettings || { allowances: [], deductions: [] };
            let profile = db.salaryProfiles?.find(p => p.userId === record.userId);
            let allowances = profile && profile.isCustomSlab ? (profile.allowances || []) : (globalSlab.allowances || []);
            let deductions = profile && profile.isCustomSlab ? (profile.deductions || []) : (globalSlab.deductions || []);
            
            fixedAll = 0;
            allowances.forEach(a => { fixedAll += (a.type === 'percentage') ? (basic * (parseFloat(a.value)||0)) / 100 : (parseFloat(a.value)||0); });
            fixedDed = 0;
            deductions.forEach(d => { fixedDed += (d.type === 'percentage') ? (basic * (parseFloat(d.value)||0)) / 100 : (parseFloat(d.value)||0); });
        }

        const totalDed = fixedDed + (record.absencyDeduction || 0) + (record.loanDeduction || 0) + (record.otherDeduction || 0);
        const totalAdd = fixedAll + (record.bonus || 0); 
        
        grandTotalBasic += basic;
        grandTotalAllowances += totalAdd;
        grandTotalDeductions += totalDed;
        grandTotalNet += record.netPay;

        tableRows += `
            <tr>
                <td class="text-secondary" style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${user?.displayId || record.userId}</td>
                <td class="bold" style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${name}</td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 11px;">Rs ${basic.toLocaleString()}</td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; color: #059669; font-size: 11px;">Rs ${Math.round(totalAdd).toLocaleString()}</td>
                <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; color: #dc2626; font-size: 11px;">Rs ${Math.round(totalDed).toLocaleString()}</td>
                <td class="bold text-primary" style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px;">Rs ${Math.round(record.netPay).toLocaleString()}</td>
            </tr>
        `;
    });
    
    if (visibleCount === 0) {
        showToast("No records found for the selected filters to print.", "warning");
        return;
    }

    const company = db.companyProfile || {};
    const cName = company.name || 'Company Name';
    const cAddress = company.address || '';
    const cPhone = company.phone || '';
    const cEmail = company.email || '';
    const cLogo = company.logoBase64 || '';
    const cLetterhead = company.letterheadBase64 || '';
    const printArea = document.getElementById('summary-print-area');
    
    let periodText = "";
    if (history.length > 0) {
        const d = new Date(history[0].endDate || history[0].processedAt || new Date());
        const mNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        periodText = `${mNames[d.getMonth()]}-${d.getFullYear()}`;
    } else {
        periodText = "N-A";
    }
    window.currentSummaryFilename = `All-Employee-List-${periodText}`;

    const letterheadHeader = `
        <tr>
            <td colspan="6" style="padding: 0; border: none;">
                ${cLetterhead ? `
                <div style="margin: -5mm -10mm 15px -10mm; text-align: center;">
                    <img src="${cLetterhead}" style="width: 100%; height: auto; display: block;" alt="Letterhead Banner">
                </div>
                ` : `
                <div style="position: relative; padding-bottom: 15px; margin-bottom: 15px; border-bottom: 1px solid #1e293b; text-align: center; min-height: 70px; display: flex; flex-direction: column; justify-content: center;">
                    ${cLogo ? `<div style="position: absolute; left: 0; top: 50%; transform: translateY(-50%);"><img src="${cLogo}" style="max-height: 70px; max-width: 180px; object-fit: contain;"></div>` : ''}
                    <div style="margin: 0 auto; max-width: 60%; padding-left: ${cLogo ? '150px' : '0'};">
                        <div style="font-size: 26px; font-weight: bold; font-style: italic; color: #1e293b; margin-bottom: 5px; font-family: 'Times New Roman', Times, serif;">${cName}</div>
                        <div style="font-size: 12px; color: #334155; margin-bottom: 3px;">${cAddress}</div>
                        <div style="font-size: 12px; color: #334155;">
                            ${cPhone ? `Tel: ${cPhone}` : ''} ${cPhone && cEmail ? ' | ' : ''} ${cEmail ? `Email: ${cEmail}` : ''}
                        </div>
                    </div>
                </div>
                `}
                
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="font-size: 16px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px 0;">Monthly Payroll Summary</h2>
                    <div style="font-size: 13px; color: #475569; font-weight: 600;">
                        For the Month of <span style="color: #2563eb;">${periodText}</span>
                    </div>
                </div>
            </td>
        </tr>
    `;



    printArea.innerHTML = `
        <div style="width: 100%;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead style="display: table-header-group;">
                    ${letterheadHeader}
                    <tr>
                        <th style="padding: 8px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; background-color: #f8fafc;">ID</th>
                        <th style="padding: 8px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; background-color: #f8fafc;">Employee</th>
                        <th style="padding: 8px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; background-color: #f8fafc;">Basic</th>
                        <th style="padding: 8px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; background-color: #f8fafc;">Allowances</th>
                        <th style="padding: 8px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; background-color: #f8fafc;">Deductions</th>
                        <th style="padding: 8px 10px; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; background-color: #f8fafc;">Net Pay</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                    <tr>
                        <td colspan="2" style="padding: 12px 10px; text-align: right; border-top: 2px solid #cbd5e1; color: #334155; font-size: 11px;">GRAND TOTALS:</td>
                        <td style="padding: 12px 10px; border-top: 2px solid #cbd5e1; color: #334155; font-size: 11px;">Rs ${Math.round(grandTotalBasic).toLocaleString()}</td>
                        <td style="padding: 12px 10px; color: #059669; border-top: 2px solid #cbd5e1; font-size: 11px;">Rs ${Math.round(grandTotalAllowances).toLocaleString()}</td>
                        <td style="padding: 12px 10px; color: #dc2626; border-top: 2px solid #cbd5e1; font-size: 11px;">Rs ${Math.round(grandTotalDeductions).toLocaleString()}</td>
                        <td style="padding: 12px 10px; font-size: 12px; color: #0f172a; border-top: 2px solid #cbd5e1;">Rs ${Math.round(grandTotalNet).toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td colspan="6" style="padding: 0; border: none;">
                            <div style="display: flex; justify-content: space-between; margin-top: 40px; margin-bottom: 0px;">
                                <div style="text-align: center;">
                                    <div style="width: 200px; border-top: 1px solid #374151; margin-bottom: 10px;"></div>
                                    <div style="font-size: 12px; font-weight: 600;">Prepared By</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="width: 200px; border-top: 1px solid #374151; margin-bottom: 10px;"></div>
                                    <div style="font-size: 12px; font-weight: 600;">Approved By</div>
                                </div>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    
    document.getElementById('modal-view-summary').classList.remove('hidden');
    document.getElementById('modal-overlay').classList.remove('hidden');
    
    // Set title for PDF saving
    if (!window.originalDocumentTitle) {
        window.originalDocumentTitle = document.title;
    }
    document.title = window.currentSummaryFilename;
};

window.openPayslipModal = function(recordId) {
    const db = getDb();
    const record = (db.payrollHistory || []).find(r => r.id === recordId);
    if (!record) return;
    
    const user = (db.users || []).find(u => u.id === record.userId);
    const company = db.companyProfile || {};
    
    const cName = company.name || 'Company Name';
    const cAddress = company.address || 'Company Address';
    const cPhone = company.phone || 'Phone Number';
    const cEmail = company.email || 'Email Address';
    const cLogo = company.logoBase64 || '';
    
    // Reconstruct allowances/deductions for the payslip print view
    const basicSalary = parseInt(user?.salary) || 0;
    const globalSlab = db.globalSalarySettings || { allowances: [], deductions: [] };
    let profile = db.salaryProfiles?.find(p => p.userId === record.userId);
    let allowances = profile && profile.isCustomSlab ? (profile.allowances || []) : (globalSlab.allowances || []);
    let deductions = profile && profile.isCustomSlab ? (profile.deductions || []) : (globalSlab.deductions || []);
    
    let allowHtml = `<tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 5px 15px; border-right: 1px solid #e2e8f0;">Basic Salary</td>
        <td style="padding: 5px 15px; font-weight: 600; text-align: right; width: 130px;">Rs ${basicSalary.toLocaleString()}</td>
    </tr>`;
    let totalAllow = basicSalary;
    
    allowances.forEach(a => {
        const val = parseFloat(a.value) || 0;
        const computed = (a.type === 'percentage') ? (basicSalary * val) / 100 : val;
        allowHtml += `<tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 5px 15px; border-right: 1px solid #e2e8f0;">${a.name}</td>
            <td style="padding: 5px 15px; font-weight: 600; text-align: right; width: 130px;">Rs ${Math.round(computed).toLocaleString()}</td>
        </tr>`;
        totalAllow += computed;
    });
    
    if (record.bonus > 0) {
        allowHtml += `<tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 5px 15px; border-right: 1px solid #e2e8f0;">Bonus / Arrears</td>
            <td style="padding: 5px 15px; font-weight: 600; text-align: right; width: 130px;">Rs ${Math.round(record.bonus).toLocaleString()}</td>
        </tr>`;
        totalAllow += record.bonus;
    }
    
    // Days Calculation
    const startDateObj = new Date(record.startDate);
    const endDateObj = new Date(record.endDate);
    const diffTime = Math.abs(endDateObj - startDateObj);
    const daysInMonth = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    // If absencyDeduction > 0, calculate absent days based on (Basic / daysInMonth)
    const perDaySalary = basicSalary / daysInMonth;
    const absentDays = record.absencyDeduction > 0 && perDaySalary > 0 ? Math.round(record.absencyDeduction / perDaySalary) : 0;
    const presentDays = daysInMonth - absentDays;
    
    let dedHtml = ``;
    let totalDed = 0;
    
    deductions.forEach(d => {
        const val = parseFloat(d.value) || 0;
        const computed = (d.type === 'percentage') ? (basicSalary * val) / 100 : val;
        dedHtml += `<tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 5px 15px; border-right: 1px solid #e2e8f0;">${d.name}</td>
            <td style="padding: 5px 15px; font-weight: 600; text-align: right; width: 130px;">Rs ${Math.round(computed).toLocaleString()}</td>
        </tr>`;
        totalDed += computed;
    });
    
    if (record.absencyDeduction > 0) {
        dedHtml += `<tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 5px 15px; border-right: 1px solid #e2e8f0;">Absents (${absentDays} Days) <span style="font-size: 10px; color: #94a3b8;"><br/>(Basic / ${daysInMonth} * ${absentDays})</span></td>
            <td style="padding: 5px 15px; font-weight: 600; text-align: right; width: 130px;">Rs ${Math.round(record.absencyDeduction).toLocaleString()}</td>
        </tr>`;
        totalDed += record.absencyDeduction;
    }
    if (record.loanDeduction > 0) {
        dedHtml += `<tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 5px 15px; border-right: 1px solid #e2e8f0;">Loan Installment</td>
            <td style="padding: 5px 15px; font-weight: 600; text-align: right; width: 130px;">Rs ${Math.round(record.loanDeduction).toLocaleString()}</td>
        </tr>`;
        totalDed += record.loanDeduction;
    }
    if (record.otherDeduction > 0) {
        dedHtml += `<tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 5px 15px; border-right: 1px solid #e2e8f0;">Other Deductions</td>
            <td style="padding: 5px 15px; font-weight: 600; text-align: right; width: 130px;">Rs ${Math.round(record.otherDeduction).toLocaleString()}</td>
        </tr>`;
        totalDed += record.otherDeduction;
    }

    const empStatus = user?.status || 'Active';
    const empDept = user?.department || 'N/A';
    const doj = user?.startDate ? new Date(user.startDate).toLocaleDateString() : 'N/A';

    const empName = user ? user.name : 'Unknown';
    const monthStr = new Date(record.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).replace(' ', '-');
    window.currentPayslipFilename = `Payslip-${empName.replace(/\s+/g, '-')}-${monthStr}`;

    const printArea = document.getElementById('payslip-print-area');
    printArea.innerHTML = `
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 30px; background: #ffffff;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 20px;">
                <div style="display: flex; gap: 15px; align-items: center;">
                    ${cLogo ? `<img src="${cLogo}" alt="Company Logo" style="max-height: 70px; max-width: 150px; object-fit: contain;">` : `<div style="width: 70px; height: 70px; background: #eff6ff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #3b82f6;">LOGO</div>`}
                    <div>
                        <h2 style="margin: 0; font-size: 22px; font-weight: 800; color: #1e293b;">${cName}</h2>
                        <div style="font-size: 12px; color: #64748b; margin-top: 4px; max-width: 300px; line-height: 1.4;">${cAddress}</div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 4px;"><i class="fa-solid fa-phone" style="font-size: 10px; margin-right: 4px;"></i> ${cPhone} &nbsp;|&nbsp; <i class="fa-solid fa-envelope" style="font-size: 10px; margin-right: 4px;"></i> ${cEmail}</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #3b82f6; text-transform: uppercase; letter-spacing: 1px;">PAYSLIP</h1>
                    <div style="font-size: 14px; font-weight: 600; color: #475569; margin-top: 5px; background: #eff6ff; padding: 4px 10px; border-radius: 4px; display: inline-block;">${new Date(record.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 6px;">Ref: ${record.batchId}</div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Processed: ${new Date(record.processedAt).toLocaleDateString()}</div>
                </div>
            </div>
            
            <!-- Employee Details -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px 20px; margin-bottom: 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px;">
                        <span style="color: #64748b; font-weight: 500;">Employee ID:</span>
                        <span style="color: #1e293b; font-weight: 700;">${user?.displayId || record.userId}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px;">
                        <span style="color: #64748b; font-weight: 500;">Employee Name:</span>
                        <span style="color: #1e293b; font-weight: 700;">${user ? user.name : 'Unknown'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px;">
                        <span style="color: #64748b; font-weight: 500;">Employee Status:</span>
                        <span style="color: #1e293b; font-weight: 700;">${empStatus}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px;">
                        <span style="color: #64748b; font-weight: 500;">Designation:</span>
                        <span style="color: #1e293b; font-weight: 700;">${user && user.designation ? user.designation : 'N/A'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px;">
                        <span style="color: #64748b; font-weight: 500;">Department:</span>
                        <span style="color: #1e293b; font-weight: 700;">${empDept}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px;">
                        <span style="color: #64748b; font-weight: 500;">Date of Joining:</span>
                        <span style="color: #1e293b; font-weight: 700;">${doj}</span>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px;">
                        <span style="color: #64748b; font-weight: 500;">Date:</span>
                        <span style="color: #1e293b; font-weight: 700;">${new Date(record.processedAt).toLocaleDateString()}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px;">
                        <span style="color: #64748b; font-weight: 500;">Month:</span>
                        <span style="color: #1e293b; font-weight: 700;">${new Date(record.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px;">
                        <span style="color: #64748b; font-weight: 500;">Period:</span>
                        <span style="color: #1e293b; font-weight: 700;">${new Date(record.startDate).toLocaleDateString()} - ${new Date(record.endDate).toLocaleDateString()}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px;">
                        <span style="color: #64748b; font-weight: 500;">Days in Month:</span>
                        <span style="color: #1e293b; font-weight: 700;">${daysInMonth}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px;">
                        <span style="color: #64748b; font-weight: 500;">Days Present:</span>
                        <span style="color: #1e293b; font-weight: 700;">${presentDays}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px;">
                        <span style="color: #64748b; font-weight: 500;">Days Absent:</span>
                        <span style="color: #1e293b; font-weight: 700;">${absentDays}</span>
                    </div>
                </div>
            </div>
            
            <!-- Salary Details Table -->
            <div style="display: flex; gap: 20px; margin-bottom: 25px;">
                <!-- Allowances -->
                <div style="flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; color: #475569;">
                        <thead>
                            <tr style="background: #f1f5f9; font-weight: 700; color: #334155; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px;">
                                <th style="padding: 8px 15px; border-right: 1px solid #e2e8f0; font-weight: 700;">Allowances</th>
                                <th style="padding: 8px 15px; text-align: right; width: 130px; font-weight: 700;">Amount(Rs.)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allowHtml}
                        </tbody>
                        <tfoot>
                            <tr style="background: #f8fafc; border-top: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">
                                <td style="padding: 10px 15px; border-right: 1px solid #e2e8f0;">Gross Earnings</td>
                                <td style="padding: 10px 15px; text-align: right;">Rs ${Math.round(totalAllow).toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                
                <!-- Deductions -->
                <div style="flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; color: #475569;">
                        <thead>
                            <tr style="background: #f1f5f9; font-weight: 700; color: #334155; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px;">
                                <th style="padding: 8px 15px; border-right: 1px solid #e2e8f0; font-weight: 700;">Deductions</th>
                                <th style="padding: 8px 15px; text-align: right; width: 130px; font-weight: 700;">Amount(Rs.)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dedHtml || '<tr><td colspan="2" style="padding: 10px 15px; color:#9ca3af; font-style:italic; text-align: center;">No Deductions</td></tr>'}
                        </tbody>
                        <tfoot>
                            <tr style="background: #f8fafc; border-top: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">
                                <td style="padding: 10px 15px; border-right: 1px solid #e2e8f0;">Total Deductions</td>
                                <td style="padding: 10px 15px; text-align: right;">Rs ${Math.round(totalDed).toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
            
            <!-- Net Pay Box -->
            <div style="background: #f0fdfa; border: 1px solid #14b8a6; border-radius: 8px; padding: 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                <div>
                    <div style="font-size: 14px; color: #0f766e; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Net Payable Salary</div>
                    <div style="font-size: 12px; color: #134e4a; margin-top: 4px; opacity: 0.8;">(Gross Earnings - Total Deductions)</div>
                </div>
                <div style="font-size: 28px; font-weight: 900; color: #0f766e;">Rs ${Math.round(record.netPay).toLocaleString()}</div>
            </div>
            
            <!-- Disclaimer -->
            <div style="border-top: 1px dashed #cbd5e1; padding-top: 20px; text-align: center;">
                <div style="font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 4px;">DISCLAIMER</div>
                <div style="font-size: 11px; color: #94a3b8; font-style: italic;">This is a computer-generated document. No signature is required.</div>
            </div>
        </div>
    `;
    
    const payslipModal = document.getElementById('modal-view-payslip');
    payslipModal.style.maxWidth = '900px';
    payslipModal.style.width = '95%';
    payslipModal.classList.remove('hidden');
    
    document.getElementById('modal-overlay').classList.remove('hidden');
    
    // Set title for PDF saving
    if (!window.originalDocumentTitle) {
        window.originalDocumentTitle = document.title;
    }
    document.title = window.currentPayslipFilename;
};

window.printIndividualPayslip = function() {
    window.print();
};

window.openBankLetterModal = function() {
    const db = getDb();
    if (!db) return;

    let history = db.payrollHistory || [];
    
    // Apply filters to get the current list
    const monthFilter = document.getElementById('history-filter-month')?.value || 'All';
    const yearFilter = document.getElementById('history-filter-year')?.value || 'All';

    if (monthFilter !== 'All') {
        history = history.filter(h => {
            const d = new Date(h.endDate);
            return String(d.getMonth() + 1).padStart(2, '0') === monthFilter;
        });
    }
    if (yearFilter !== 'All') {
        history = history.filter(h => {
            const d = new Date(h.endDate);
            return String(d.getFullYear()) === yearFilter;
        });
    }
    
    // Sort by most recent
    history.sort((a, b) => new Date(b.processedAt) - new Date(a.processedAt));

    // Store the filtered history for the preview update
    window.currentBankLetterHistory = history;

    // Reset inputs
    document.getElementById('bank-letter-cheque-no').value = '';
    
    const today = new Date();
    document.getElementById('bank-letter-date').value = today.toISOString().split('T')[0];

    updateBankLetterPreview();

    document.getElementById('modal-bank-letter').classList.remove('hidden');
    document.getElementById('modal-overlay').classList.remove('hidden');
    
    if (!window.originalDocumentTitle) {
        window.originalDocumentTitle = document.title;
    }
    document.title = `Bank_Letter_${monthFilter}_${yearFilter}`;
};

window.updateBankLetterPreview = function() {
    const db = getDb();
    const history = window.currentBankLetterHistory || [];
    const cp = db.companyProfile || {};
    
    const monthFilter = document.getElementById('history-filter-month')?.value || 'All';
    const yearFilter = document.getElementById('history-filter-year')?.value || 'All';
    let monthName = monthFilter !== 'All' ? new Date(2000, parseInt(monthFilter)-1, 1).toLocaleString('default', { month: 'long' }) : 'All Months';
    let periodText = monthFilter !== 'All' ? `${monthName.toUpperCase()}-${yearFilter}` : `ALL PERIODS`;

    const chequeNo = document.getElementById('bank-letter-cheque-no').value.trim() || '_________________';
    const chequeDateStr = document.getElementById('bank-letter-date').value;
    const chequeDate = chequeDateStr ? new Date(chequeDateStr).toLocaleDateString('en-GB').replace(/\//g, '-') : '_____________';

    const bankName = cp.bankName || '[Bank Name]';
    const branchCode = cp.bankBranchCode || '[Branch Code]';
    const companyAccount = cp.bankAccountNo || '[Company Account No]';
    const signatory = cp.signatory || '[Signatory Name & Title]';

    let customHeader = cp.bankLetterHeader || 'We, M/s [COMPANY_NAME], kindly request you to transfer the monthly salaries from our company account No. [ACCOUNT_NO] to the individual accounts of our employees as per the details mentioned below:';
    let customFooter = cp.bankLetterFooter || 'We authorize the bank to debit our Company Account No. [ACCOUNT_NO] for the total salary disbursement and transfer the respective net amounts into the employees\' individual bank accounts mentioned above.\nIf any further information or documentation is required, please let us know.\nThank you for your cooperation.\nSincerely,';

    const compName = cp.name || 'Company';
    customHeader = customHeader.replace(/\[COMPANY_NAME\]/g, `<strong>${compName}</strong>`).replace(/\[ACCOUNT_NO\]/g, `<strong>${companyAccount}</strong>`).replace(/\n/g, '<br>');
    customFooter = customFooter.replace(/\[COMPANY_NAME\]/g, `<strong>${compName}</strong>`).replace(/\[ACCOUNT_NO\]/g, `<strong>${companyAccount}</strong>`).replace(/\n/g, '<br>');

    let tableRows = '';
    let sno = 1;
    let grandGross = 0;
    let grandDeduction = 0;
    let grandNet = 0;

    history.forEach(h => {
        const emp = db.employees.find(e => e.id === h.empId) || {};
        
        let basic = h.netFixedPay || 0;
        let additions = 0;
        if (h.allowances) additions += Object.values(h.allowances).reduce((sum, v) => sum + v, 0);
        if (h.bonus) additions += h.bonus;
        
        if (typeof h.fixedAllowancesTotal === 'undefined') {
            const slab = db.globalSalarySlab || { allowances: [], deductions: [] };
            const fixedAllow = slab.allowances.reduce((sum, item) => {
                if (item.type === 'Percentage') return sum + (basic * (item.amount / 100));
                return sum + item.amount;
            }, 0);
            additions += fixedAllow;
        } else {
            additions += h.fixedAllowancesTotal || 0;
        }

        let grossSalary = basic + additions;
        
        let deductions = 0;
        if (h.deductions) deductions += Object.values(h.deductions).reduce((sum, v) => sum + v, 0);
        if (h.loanEmi) deductions += h.loanEmi;
        if (typeof h.fixedDeductionsTotal === 'undefined') {
            const slab = db.globalSalarySlab || { allowances: [], deductions: [] };
            const fixedDeduct = slab.deductions.reduce((sum, item) => {
                if (item.type === 'Percentage') return sum + (basic * (item.amount / 100));
                return sum + item.amount;
            }, 0);
            deductions += fixedDeduct;
        } else {
            deductions += h.fixedDeductionsTotal || 0;
        }

        let netSalary = h.finalNetPay;

        grandGross += grossSalary;
        grandDeduction += deductions;
        grandNet += netSalary;

        const empName = emp.name || h.empName;
        const fatherName = emp.fatherName ? `<br><small style="color: #555;">S/O ${emp.fatherName}</small>` : '';
        const cnic = emp.cnic || 'N/A';
        const dobStr = emp.startDate ? new Date(emp.startDate).toLocaleDateString('en-GB').replace(/\//g, '-') : 'N/A';
        const accountNo = emp.accountNumber || 'N/A';

        tableRows += `
            <tr style="border-bottom: 1px solid #000;">
                <td style="padding: 6px 4px; text-align: center;">${sno++}</td>
                <td style="padding: 6px 4px;">${empName}${fatherName}</td>
                <td style="padding: 6px 4px; text-align: center;">${cnic}</td>
                <td style="padding: 6px 4px; text-align: center;">${dobStr}</td>
                <td style="padding: 6px 4px; text-align: right;">${Math.round(grossSalary)}</td>
                <td style="padding: 6px 4px; text-align: right;">${Math.round(deductions)}</td>
                <td style="padding: 6px 4px; text-align: right;">${Math.round(netSalary)}</td>
                <td style="padding: 6px 4px; text-align: center;">${accountNo}</td>
            </tr>
        `;
    });

    const html = `
        <div class="report-print-sheet" style="color: black !important; font-size: 13px !important; font-family: Arial, sans-serif;">
            ${cp.letterheadBase64 ? `<img src="${cp.letterheadBase64}" style="width: 100%; max-height: 150px; object-fit: contain; margin-bottom: 20px;">` : `
            <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
                ${cp.logoBase64 ? `<img src="${cp.logoBase64}" style="max-height: 80px; margin-bottom: 10px;">` : ''}
                <h1 style="margin: 0; font-size: 24px; text-transform: uppercase;">${cp.name || 'COMPANY NAME'}</h1>
                <p style="margin: 5px 0 0 0; font-size: 14px;">${cp.address || ''} | ${cp.email || ''} | ${cp.phone || ''}</p>
            </div>`}

            <div style="margin-bottom: 20px;">
                <p style="margin: 0;">The Manager</p>
                <p style="margin: 0;">${bankName}</p>
                <p style="margin: 0;">Branch Code: ${branchCode}</p>
            </div>

            <p style="font-weight: bold; margin-bottom: 10px;">Subject: Request for Transfer of Salaries to Employees' Individual Accounts For ${periodText}</p>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <div>Cheque No. <span style="font-weight: bold;">${chequeNo}</span></div>
                <div>Dated: <span style="font-weight: bold;">${chequeDate}</span></div>
                <div>for Rs. <span style="font-weight: bold;">${Math.round(grandNet)}</span></div>
            </div>

            <p style="margin-bottom: 15px;">Dear Sir,</p>
            <p style="margin-bottom: 20px; text-align: justify; line-height: 1.5;">
                ${customHeader}
            </p>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
                <thead>
                    <tr style="border-top: 1px solid #000; border-bottom: 1px solid #000;">
                        <th style="padding: 8px 4px; text-align: center;">S.No.</th>
                        <th style="padding: 8px 4px; text-align: left;">Employee Name<br><small>Father Name</small></th>
                        <th style="padding: 8px 4px; text-align: center;">CNIC</th>
                        <th style="padding: 8px 4px; text-align: center;">Date of<br>Appointment</th>
                        <th style="padding: 8px 4px; text-align: right;">Gross<br>Salary</th>
                        <th style="padding: 8px 4px; text-align: right;">Deductions</th>
                        <th style="padding: 8px 4px; text-align: right;">Net Salary<br>Paid</th>
                        <th style="padding: 8px 4px; text-align: center;">Employee A/C Number</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
                <tfoot>
                    <tr style="border-top: 2px solid #000; border-bottom: 2px solid #000; font-weight: bold;">
                        <td colspan="4" style="padding: 10px 4px; text-align: right;">Total :-</td>
                        <td style="padding: 10px 4px; text-align: right;">${Math.round(grandGross)}</td>
                        <td style="padding: 10px 4px; text-align: right;">${Math.round(grandDeduction)}</td>
                        <td style="padding: 10px 4px; text-align: right;">${Math.round(grandNet)}</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>

            <p style="margin-bottom: 30px; text-align: justify; line-height: 1.5;">
                ${customFooter}
            </p>

            <div style="margin-top: 50px;">
                <p style="font-weight: bold; margin: 0;">${signatory.split('-')[0]?.trim() || '[Name]'}</p>
                <p style="margin: 0;">${signatory.split('-')[1]?.trim() || '[Designation]'}</p>
                <p style="margin: 0;">M/s ${cp.name || 'Company'}</p>
            </div>
        </div>
    `;

    document.getElementById('bank-letter-print-area').innerHTML = html;
};

window.printBankLetter = function() {
    document.body.classList.add('printing-modal');
    // Hide summary modal if it somehow overlaps
    const otherModals = document.querySelectorAll('.modal:not(#modal-bank-letter)');
    otherModals.forEach(m => m.style.display = 'none');
    
    // Quick timeout to let DOM settle
    setTimeout(() => {
        window.print();
        document.body.classList.remove('printing-modal');
        otherModals.forEach(m => m.style.display = '');
    }, 100);
};


window.printSummary = function() {
    window.print();
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
    const startInput = document.getElementById('payroll-process-start');
    const endInput = document.getElementById('payroll-process-end');
    
    if (startInput && !startInput.value) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        startInput.value = `${yyyy}-${mm}-01`;
        
        // Default end date to last day of the month
        const lastDay = new Date(yyyy, today.getMonth() + 1, 0).getDate();
        endInput.value = `${yyyy}-${mm}-${lastDay}`;
    }
};

window.generatePayrollPreview = function() {
    const db = getDb();
    const startInput = document.getElementById('payroll-process-start').value;
    const endInput = document.getElementById('payroll-process-end').value;
    const deptFilter = document.getElementById('payroll-process-dept').value;

    if (!startInput || !endInput) {
        if(window.showToast) showToast("Error", "Please select both Start and End dates.", "error");
        return;
    }

    const startDate = new Date(startInput);
    const endDate = new Date(endInput);
    
    if (startDate > endDate) {
        if(window.showToast) showToast("Error", "Start date cannot be after end date.", "error");
        return;
    }

    let users = db.users.filter(u => u.status === 'Active');
    
    if (deptFilter !== 'All') {
        // Implement department filter if added later
    }

    const tbody = document.getElementById('payroll-preview-tbody');
    tbody.innerHTML = '';
    
    const globalSlab = db.globalSalarySettings || { allowances: [], deductions: [] };
    let grandTotal = 0;

    users.forEach(user => {
        const basicSalary = parseInt(user.salary) || 0;
        const dailyWage = basicSalary / 30; // Standard 30 day divisor

        // 1. Calculate Fixed Slab
        let profile = db.salaryProfiles?.find(p => p.userId === user.id);
        let allowances = profile && profile.isCustomSlab ? (profile.allowances || []) : (globalSlab.allowances || []);
        let deductions = profile && profile.isCustomSlab ? (profile.deductions || []) : (globalSlab.deductions || []);

        let totalAllowances = 0;
        allowances.forEach(a => {
            const val = parseFloat(a.value) || 0;
            totalAllowances += (a.type === 'percentage') ? (basicSalary * val) / 100 : val;
        });

        let totalDeductions = 0;
        deductions.forEach(d => {
            const val = parseFloat(d.value) || 0;
            totalDeductions += (d.type === 'percentage') ? (basicSalary * val) / 100 : val;
        });

        const netFixed = (basicSalary + totalAllowances) - totalDeductions;

        // 2. Fetch Attendance (Absents & Half Days)
        let absentCount = 0;
        let halfDayCount = 0;
        if (db.attendance) {
            db.attendance.forEach(att => {
                if (att.userId === user.id) {
                    const attDate = new Date(att.date);
                    if (attDate >= startDate && attDate <= endDate) {
                        if (att.status === 'Absent') absentCount += 1;
                        if (att.status === 'Half Day') halfDayCount += 1;
                    }
                }
            });
        }
        
        // 2 Half days = 1 Absent
        const totalAbsentEquivalent = absentCount + (halfDayCount * 0.5);
        const absencyDeduction = totalAbsentEquivalent * dailyWage;

        // 3. Fetch Active Loans
        let loanEMI = 0;
        let activeLoanId = null;
        if (db.loans) {
            const activeLoan = db.loans.find(l => l.userId === user.id && l.remainingAmount > 0);
            if (activeLoan) {
                activeLoanId = activeLoan.id;
                loanEMI = activeLoan.monthlyInstallment;
                if (loanEMI > activeLoan.remainingAmount) {
                    loanEMI = activeLoan.remainingAmount; // Can't deduct more than what's left
                }
            }
        }

        // 4. Initial Net Payable
        const netPayable = netFixed - absencyDeduction - loanEMI;
        grandTotal += netPayable;

        tbody.innerHTML += `
            <tr class="payroll-preview-row" data-user-id="${user.id}" data-net-fixed="${netFixed}" data-absent-deduct="${absencyDeduction}" data-loan-emi="${loanEMI}" data-loan-id="${activeLoanId || ''}" data-fixed-allow="${totalAllowances}" data-fixed-deduct="${totalDeductions}">
                <td class="text-secondary">${user.id}</td>
                <td class="bold">${user.name}</td>
                <td>Rs ${Math.round(netFixed).toLocaleString()}</td>
                <td>${totalAbsentEquivalent}</td>
                <td class="text-danger">-Rs ${Math.round(absencyDeduction).toLocaleString()}</td>
                <td class="text-warning">-Rs ${Math.round(loanEMI).toLocaleString()}</td>
                <td>
                    <input type="number" class="form-control bonus-input" style="width: 80px; padding: 4px; font-size: 12px; height: 28px;" value="0" min="0" onchange="window.recalculatePayrollRow(this)">
                </td>
                <td>
                    <input type="number" class="form-control ded-input" style="width: 80px; padding: 4px; font-size: 12px; height: 28px;" value="0" min="0" onchange="window.recalculatePayrollRow(this)">
                </td>
                <td class="text-primary bold net-payable-cell">Rs ${Math.round(netPayable).toLocaleString()}</td>
            </tr>
        `;
    });

    document.getElementById('payroll-grand-total').textContent = `Rs ${Math.round(grandTotal).toLocaleString()}`;
    
    document.getElementById('payroll-preview-meta').textContent = `Showing calculations from ${startDate.toDateString()} to ${endDate.toDateString()}`;
    document.getElementById('payroll-preview-container').classList.remove('hidden');
};

window.recalculatePayrollRow = function(inputElem) {
    const row = inputElem.closest('tr');
    
    const netFixed = parseFloat(row.dataset.netFixed) || 0;
    const absDeduct = parseFloat(row.dataset.absentDeduct) || 0;
    const loanEmi = parseFloat(row.dataset.loanEmi) || 0;
    
    const bonus = parseFloat(row.querySelector('.bonus-input').value) || 0;
    const otherDed = parseFloat(row.querySelector('.ded-input').value) || 0;
    
    const newNetPayable = netFixed - absDeduct - loanEmi + bonus - otherDed;
    
    row.querySelector('.net-payable-cell').textContent = `Rs ${Math.round(newNetPayable).toLocaleString()}`;
    
    // Recalculate Grand Total
    let grandTotal = 0;
    document.querySelectorAll('.payroll-preview-row').forEach(tr => {
        const nF = parseFloat(tr.dataset.netFixed) || 0;
        const aD = parseFloat(tr.dataset.absentDeduct) || 0;
        const lE = parseFloat(tr.dataset.loanEmi) || 0;
        const b = parseFloat(tr.querySelector('.bonus-input').value) || 0;
        const od = parseFloat(tr.querySelector('.ded-input').value) || 0;
        grandTotal += (nF - aD - lE + b - od);
    });
    
    document.getElementById('payroll-grand-total').textContent = `Rs ${Math.round(grandTotal).toLocaleString()}`;
};

window.confirmAndProcessPayroll = function() {
    if (!confirm("Are you sure you want to finalize this payroll? This will deduct loan EMI balances and generate official history logs.")) return;

    const db = getDb();
    if (!db.payrollHistory) db.payrollHistory = [];
    
    const startInput = document.getElementById('payroll-process-start').value;
    const endInput = document.getElementById('payroll-process-end').value;
    
    const batchId = 'PRL-' + Date.now();
    let totalProcessed = 0;
    let totalPaid = 0;

    const rows = document.querySelectorAll('.payroll-preview-row');
    rows.forEach(row => {
        const userId = row.dataset.userId;
        const netFixed = parseFloat(row.dataset.netFixed) || 0;
        const absDeduct = parseFloat(row.dataset.absentDeduct) || 0;
        const loanEmi = parseFloat(row.dataset.loanEmi) || 0;
        const loanId = row.dataset.loanId;
        const fixedAllow = parseFloat(row.dataset.fixedAllow) || 0;
        const fixedDeduct = parseFloat(row.dataset.fixedDeduct) || 0;
        const bonus = parseFloat(row.querySelector('.bonus-input').value) || 0;
        const otherDed = parseFloat(row.querySelector('.ded-input').value) || 0;
        
        const finalNetPay = netFixed - absDeduct - loanEmi + bonus - otherDed;

        // Deduct EMI from active loan
        if (loanId && loanEmi > 0 && db.loans) {
            const loan = db.loans.find(l => l.id === loanId);
            if (loan) {
                loan.remainingAmount -= loanEmi;
            }
        }

        // Create individual payslip record
        db.payrollHistory.push({
            id: 'SLP-' + Math.floor(Math.random() * 1000000),
            batchId: batchId,
            userId: userId,
            startDate: startInput,
            endDate: endInput,
            netFixed: netFixed,
            fixedAllowances: fixedAllow,
            fixedDeductions: fixedDeduct,
            absencyDeduction: absDeduct,
            loanDeduction: loanEmi,
            bonus: bonus,
            otherDeduction: otherDed,
            netPay: finalNetPay,
            processedAt: new Date().toISOString()
        });

        totalProcessed++;
        totalPaid += finalNetPay;
    });

    saveDb(db);
    
    if(window.showToast) showToast("Payroll Processed", `Successfully generated payroll for ${totalProcessed} employees. Total: Rs ${Math.round(totalPaid).toLocaleString()}`);
    
    // Hide preview
    document.getElementById('payroll-preview-container').classList.add('hidden');
    
    // Auto-switch to history tab (Phase 3)
    if (window.switchPayrollSubTab) window.switchPayrollSubTab('history');
};

// --- 4. Employee/Manager My Payslips ---
window.renderMyPayslips = function() {
    const db = getDb();
    if (!db || !window.currentUser) return;

    let targetTbody;
    if (window.currentUser.role === 'Manager') {
        targetTbody = document.getElementById('manager-mypayslips-tbody');
    } else {
        targetTbody = document.getElementById('employee-mypayslips-tbody');
    }
    
    if (!targetTbody) return;
    targetTbody.innerHTML = '';

    const history = (db.payrollHistory || []).filter(r => String(r.userId) === String(window.currentUser.id));
    history.sort((a, b) => new Date(b.processedAt) - new Date(a.processedAt));

    if (history.length === 0) {
        targetTbody.innerHTML = `<tr><td colspan="4" class="empty-state">No processed salary slips found yet.</td></tr>`;
        return;
    }

    history.forEach(record => {
        const d = new Date(record.endDate || record.processedAt || new Date());
        const monthName = d.toLocaleString('default', { month: 'long', year: 'numeric' });
        const netPay = Math.round(record.netPay).toLocaleString();
        
        targetTbody.innerHTML += `
            <tr>
                <td>${monthName}</td>
                <td><span class="badge-role approved">Processed</span></td>
                <td style="font-weight: 700;">Rs ${netPay}</td>
                <td>
                    <button class="btn btn-outline" style="padding: 4px 10px; font-size: 12px;" onclick="window.openPayslipModal('${record.id}')">
                        <i class="fa-solid fa-file-invoice"></i> View Slip
                    </button>
                </td>
            </tr>
        `;
    });
};

// Hook into existing switchTab
const _originalSwitchTab = window.switchTab;
window.switchTab = function(tabId) {
    if (_originalSwitchTab) _originalSwitchTab(tabId);
    if (tabId === 'payroll') {
        window.switchPayrollSubTab('profiles');
    }
};
