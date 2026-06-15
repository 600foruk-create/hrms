// assets.js - Module for handling Company Assets

// Ensure db properties exist
function initAssetsDB() {
    const db = window.getDb ? window.getDb() : window.db;
    if (!db) return;
    
    if (!db.assets) db.assets = [];
    if (!db.assetIssues) db.assetIssues = [];
    if (!db.systemSettings) db.systemSettings = {};
    if (!db.systemSettings.assetCategories) {
        db.systemSettings.assetCategories = ['Laptops', 'Mobile Phones', 'Vehicles', 'Furniture', 'Accessories'];
    }
}

// Ensure init is run when db is ready or window loads
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(initAssetsDB, 1000); // Give app.js time to load db
});

// Render the Assets Main Tab
window.renderAdminAssetsTab = function(subtab = 'inventory') {
    initAssetsDB();
    
    // Switch tabs
    document.querySelectorAll('.btn-sub-tab[data-subtab^="admin-assets-"]').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.btn-sub-tab[data-subtab="admin-assets-${subtab}"]`)?.classList.add('active');
    
    document.querySelectorAll('.sub-tab-content[id^="subtab-content-admin-assets-"]').forEach(el => el.classList.remove('active'));
    document.getElementById(`subtab-content-admin-assets-${subtab}`)?.classList.add('active');
    
    if (subtab === 'inventory') {
        renderAssetsInventory();
    } else if (subtab === 'issue') {
        renderAssetsIssueForm();
    } else if (subtab === 'report') {
        renderAssetsReport();
    }
};

function renderAssetsInventory() {
    const db = window.getDb ? window.getDb() : window.db;
    const tbody = document.getElementById('admin-assets-inventory-body');
    if (!tbody) return;
    
    if (!db.assets || db.assets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No assets found</td></tr>';
        return;
    }
    
    let html = '';
    db.assets.forEach(a => {
        let statusBadge = '';
        if (a.status === 'Available') statusBadge = '<span class="badge bg-success">Available</span>';
        else if (a.status === 'Issued') statusBadge = '<span class="badge bg-warning text-dark">Issued</span>';
        else statusBadge = `<span class="badge bg-secondary">${a.status}</span>`;
        
        html += `
            <tr>
                <td><strong>${a.id}</strong></td>
                <td>${a.category || '-'}</td>
                <td>${a.name || '-'}</td>
                <td>${a.serial_number || '-'}</td>
                <td>${a.purchase_date ? window.formatDate ? window.formatDate(a.purchase_date) : a.purchase_date : '-'}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteAsset('${a.id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

window.openAddAssetModal = function() {
    const db = window.getDb ? window.getDb() : window.db;
    const catList = document.getElementById('asset-categories-list');
    
    if (catList) {
        catList.innerHTML = '';
        if (db.systemSettings.assetCategories) {
            db.systemSettings.assetCategories.forEach(c => {
                catList.innerHTML += `<option value="${c}">`;
            });
        }
    }
    
    document.getElementById('form-add-asset').reset();
    document.getElementById('modal-add-asset').classList.remove('hidden');
    document.getElementById('modal-overlay').classList.remove('hidden');
};

document.addEventListener('DOMContentLoaded', () => {
    const formAddAsset = document.getElementById('form-add-asset');
    if (formAddAsset) {
        formAddAsset.addEventListener('submit', function(e) {
            e.preventDefault();
            const db = window.getDb ? window.getDb() : window.db;
            
            const categoryInput = document.getElementById('add-asset-category').value.trim();
            
            const newAsset = {
                id: 'AST-' + new Date().getTime().toString().slice(-6),
                category: categoryInput,
                purchase_date: document.getElementById('add-asset-purchase-date').value,
                name: document.getElementById('add-asset-name').value,
                serial_number: document.getElementById('add-asset-serial').value,
                status: 'Available'
            };
            
            if (!db.assets) db.assets = [];
            db.assets.push(newAsset);
            
            if (categoryInput && !db.systemSettings.assetCategories.includes(categoryInput)) {
                db.systemSettings.assetCategories.push(categoryInput);
            }
            
            if (window.saveDb) window.saveDb();
            if (window.showToast) window.showToast('Asset added successfully', 'success');
            
            document.getElementById('modal-add-asset').classList.add('hidden');
            document.getElementById('modal-overlay').classList.add('hidden');
            
            renderAssetsInventory();
        });
    }
});

window.deleteAsset = function(id) {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    const db = window.getDb ? window.getDb() : window.db;
    
    // Check if issued
    const isIssued = db.assetIssues && db.assetIssues.some(ai => ai.asset_id === id && ai.status === 'Active');
    if (isIssued) {
        if (window.showToast) window.showToast('Cannot delete an asset that is currently issued.', 'error');
        return;
    }
    
    db.assets = db.assets.filter(a => a.id !== id);
    if (window.saveDb) window.saveDb();
    if (window.showToast) window.showToast('Asset deleted', 'success');
    renderAssetsInventory();
};

function renderAssetsIssueForm() {
    const db = window.getDb ? window.getDb() : window.db;
    
    // Populate Employees
    const empSelect = document.getElementById('issue-asset-employee');
    empSelect.innerHTML = '<option value="">-- Select Employee --</option>';
    if (db.users) {
        db.users.filter(u => u.role !== 'Admin').forEach(u => {
            empSelect.innerHTML += `<option value="${u.id}">${u.name} (${u.id})</option>`;
        });
    }
    
    // Populate Categories
    const catSelect = document.getElementById('issue-asset-category');
    catSelect.innerHTML = '<option value="">-- Select Category --</option>';
    if (db.systemSettings.assetCategories) {
        db.systemSettings.assetCategories.forEach(c => {
            catSelect.innerHTML += `<option value="${c}">${c}</option>`;
        });
    }
    
    // Reset Asset Dropdown
    document.getElementById('issue-asset-item').innerHTML = '<option value="">-- Select Category First --</option>';
    
    // Set Date to Today
    document.getElementById('issue-asset-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('issue-asset-notes').value = '';
}

window.filterAvailableAssets = function() {
    const db = window.getDb ? window.getDb() : window.db;
    const cat = document.getElementById('issue-asset-category').value;
    const itemSelect = document.getElementById('issue-asset-item');
    
    itemSelect.innerHTML = '<option value="">-- Select Available Asset --</option>';
    
    if (!cat || !db.assets) return;
    
    const available = db.assets.filter(a => a.category === cat && a.status === 'Available');
    if (available.length === 0) {
        itemSelect.innerHTML = '<option value="">No available assets in this category</option>';
        return;
    }
    
    available.forEach(a => {
        itemSelect.innerHTML += `<option value="${a.id}">${a.name} [${a.serial_number}]</option>`;
    });
};

window.submitIssueAsset = function() {
    const db = window.getDb ? window.getDb() : window.db;
    
    const empId = document.getElementById('issue-asset-employee').value;
    const assetId = document.getElementById('issue-asset-item').value;
    const issueDate = document.getElementById('issue-asset-date').value;
    const notes = document.getElementById('issue-asset-notes').value;
    
    if (!empId || !assetId || !issueDate) {
        if (window.showToast) window.showToast('Please fill all required fields', 'error');
        return;
    }
    
    // Mark Asset as Issued
    const asset = db.assets.find(a => a.id === assetId);
    if (asset) {
        asset.status = 'Issued';
    }
    
    // Create Issue Record
    const issueRecord = {
        id: 'ASI-' + new Date().getTime().toString().slice(-6),
        asset_id: assetId,
        employee_id: empId,
        issue_date: issueDate,
        return_date: null,
        notes: notes,
        status: 'Active'
    };
    
    if (!db.assetIssues) db.assetIssues = [];
    db.assetIssues.push(issueRecord);
    
    if (window.saveDb) window.saveDb();
    if (window.showToast) window.showToast('Asset Issued Successfully', 'success');
    
    // Refresh Form and jump to tracker
    renderAssetsIssueForm();
    renderAdminAssetsTab('report');
};

function renderAssetsReport() {
    const db = window.getDb ? window.getDb() : window.db;
    const tbody = document.getElementById('admin-assets-report-body');
    const filterStatus = document.getElementById('filter-asset-status').value; // Active, Returned, All
    
    if (!tbody) return;
    
    if (!db.assetIssues || db.assetIssues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No records found</td></tr>';
        return;
    }
    
    let filteredIssues = db.assetIssues;
    if (filterStatus !== 'All') {
        filteredIssues = db.assetIssues.filter(ai => ai.status === filterStatus);
    }
    
    // Sort by latest issue date
    filteredIssues.sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date));
    
    if (filteredIssues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No records found for selected filter</td></tr>';
        return;
    }
    
    let html = '';
    filteredIssues.forEach(ai => {
        const emp = db.users ? db.users.find(u => u.id === ai.employee_id) : null;
        const empName = emp ? emp.name : ai.employee_id;
        
        const asset = db.assets ? db.assets.find(a => a.id === ai.asset_id) : null;
        const catName = asset ? asset.category : 'Unknown';
        const assetName = asset ? asset.name : 'Unknown';
        const serialNo = asset ? asset.serial_number : 'Unknown';
        
        let statusBadge = ai.status === 'Active' 
            ? '<span class="badge bg-warning text-dark">Issued</span>' 
            : '<span class="badge bg-success">Returned</span>';
            
        let actionBtn = '';
        if (ai.status === 'Active') {
            actionBtn = `<button class="btn btn-sm btn-outline" style="color:var(--success); border-color:var(--success);" onclick="returnAsset('${ai.id}')"><i class="fa-solid fa-rotate-left"></i> Return</button>`;
        }
        
        html += `
            <tr>
                <td><strong>${empName}</strong></td>
                <td>${catName}</td>
                <td>${assetName}</td>
                <td>${serialNo}</td>
                <td>${window.formatDate ? window.formatDate(ai.issue_date) : ai.issue_date}</td>
                <td>${ai.return_date ? (window.formatDate ? window.formatDate(ai.return_date) : ai.return_date) : '-'}</td>
                <td>${statusBadge}</td>
                <td>${actionBtn}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

window.returnAsset = function(issueId) {
    if (!confirm('Are you sure you want to mark this asset as returned?')) return;
    
    const db = window.getDb ? window.getDb() : window.db;
    const issueRecord = db.assetIssues.find(ai => ai.id === issueId);
    
    if (!issueRecord) return;
    
    // Mark Issue Record as Returned
    issueRecord.status = 'Returned';
    issueRecord.return_date = new Date().toISOString().split('T')[0];
    
    // Mark Asset as Available again
    const asset = db.assets.find(a => a.id === issueRecord.asset_id);
    if (asset) {
        asset.status = 'Available';
    }
    
    if (window.saveDb) window.saveDb();
    if (window.showToast) window.showToast('Asset marked as returned', 'success');
    
    renderAssetsReport();
};

window.renderEmployeeAssetsTab = function() {
    initAssetsDB();
    const db = window.getDb ? window.getDb() : window.db;
    const tbody = document.getElementById('employee-assets-body');
    if (!tbody || !currentUser) return;
    
    if (!db.assetIssues || db.assetIssues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">You have no assets assigned</td></tr>';
        return;
    }
    
    // Find assets issued to the current user
    let myIssues = db.assetIssues.filter(ai => ai.employee_id === currentUser.id);
    myIssues.sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date));
    
    if (myIssues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">You have no assets assigned</td></tr>';
        return;
    }
    
    let html = '';
    myIssues.forEach(ai => {
        const asset = db.assets ? db.assets.find(a => a.id === ai.asset_id) : null;
        const catName = asset ? asset.category : 'Unknown';
        const assetName = asset ? asset.name : 'Unknown';
        const serialNo = asset ? asset.serial_number : 'Unknown';
        
        let statusBadge = ai.status === 'Active' 
            ? '<span class="badge bg-warning text-dark">Currently Assigned</span>' 
            : '<span class="badge bg-success">Returned</span>';
        
        html += `
            <tr>
                <td>${catName}</td>
                <td><strong>${assetName}</strong></td>
                <td>${serialNo}</td>
                <td>${window.formatDate ? window.formatDate(ai.issue_date) : ai.issue_date}</td>
                <td>${ai.return_date ? (window.formatDate ? window.formatDate(ai.return_date) : ai.return_date) : '-'}</td>
                <td>${statusBadge}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
};
