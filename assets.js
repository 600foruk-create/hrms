// assets.js - Module for handling Company Assets

// Ensure db properties exist
function initAssetsDB() {
    const db = window.getDb ? window.getDb() : window.db;
    if (!db) return;
    
    if (!db.assets) db.assets = [];
    if (!db.assetIssues) db.assetIssues = [];
    if (!db.systemSettings) db.systemSettings = {};
    
    // Migrate old flat categories to new structured format
    if (!db.systemSettings.assetCategories || !Array.isArray(db.systemSettings.assetCategories)) {
        db.systemSettings.assetCategories = [
            { name: 'Laptops', subCategories: ['Standard', 'High Performance'] },
            { name: 'Mobile Phones', subCategories: ['Android', 'iOS'] },
            { name: 'Vehicles', subCategories: ['Car', 'Bike'] },
            { name: 'Furniture', subCategories: ['Desk', 'Chair'] },
            { name: 'Accessories', subCategories: ['Mouse', 'Keyboard', 'Headset'] }
        ];
    } else if (db.systemSettings.assetCategories.length > 0 && typeof db.systemSettings.assetCategories[0] === 'string') {
        // Convert array of strings to array of objects
        const newCats = db.systemSettings.assetCategories.map(cat => {
            return { name: cat, subCategories: ['General'] };
        });
        db.systemSettings.assetCategories = newCats;
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
    
    document.querySelectorAll('.sub-tab-content[id^="subtab-content-admin-assets-"]').forEach(el => el.classList.add('hidden'));
    document.getElementById(`subtab-content-admin-assets-${subtab}`)?.classList.remove('hidden');
    
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
        
        const catDisplay = a.sub_category ? `${a.category} > ${a.sub_category}` : (a.category || '-');
        
        html += `
            <tr>
                <td><strong>${a.id}</strong></td>
                <td>${catDisplay}</td>
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
    try {
        const db = window.getDb ? window.getDb() : window.db;
        const catList = document.getElementById('add-asset-category');
        const subCatList = document.getElementById('add-asset-sub-category');
        
        if (catList) {
            catList.innerHTML = '<option value="">-- Select Main Category --</option>';
            if (db && db.systemSettings && db.systemSettings.assetCategories && Array.isArray(db.systemSettings.assetCategories)) {
                db.systemSettings.assetCategories.forEach(c => {
                    catList.innerHTML += `<option value="${c.name}">${c.name}</option>`;
                });
            }
        }
        if (subCatList) {
            subCatList.innerHTML = '<option value="">-- Select Sub Category --</option>';
        }
        
        const form = document.getElementById('form-add-asset');
        if (form) form.reset();
        document.getElementById('add-asset-quantity').value = 1;
        
        const modal = document.getElementById('modal-add-asset');
        const overlay = document.getElementById('modal-overlay');
        
        if (modal) modal.classList.remove('hidden');
        if (overlay) overlay.classList.remove('hidden');
    } catch (error) {
        console.error('Error opening Add Asset modal:', error);
        alert('Could not open modal: ' + error.message);
    }
};

window.populateAssetSubCategories = function(mainCat, subCatElementId) {
    const db = window.getDb ? window.getDb() : window.db;
    const subCatList = document.getElementById(subCatElementId);
    if (!subCatList) return;
    
    subCatList.innerHTML = '<option value="">-- Select Sub Category --</option>';
    if (!mainCat) return;
    
    const category = db.systemSettings.assetCategories.find(c => c.name === mainCat);
    if (category && category.subCategories) {
        category.subCategories.forEach(sub => {
            subCatList.innerHTML += `<option value="${sub}">${sub}</option>`;
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const formAddAsset = document.getElementById('form-add-asset');
    if (formAddAsset) {
        formAddAsset.addEventListener('submit', function(e) {
            e.preventDefault();
            const db = window.getDb ? window.getDb() : window.db;
            
            const categoryInput = document.getElementById('add-asset-category').value.trim();
            const subCategoryInput = document.getElementById('add-asset-sub-category').value.trim();
            const quantity = parseInt(document.getElementById('add-asset-quantity').value) || 1;
            
            if (!db.assets) db.assets = [];
            
            for (let i = 0; i < quantity; i++) {
                const newAsset = {
                    id: 'AST-' + new Date().getTime().toString().slice(-6) + (quantity > 1 ? `-${i+1}` : ''),
                    category: categoryInput,
                    sub_category: subCategoryInput,
                    purchase_date: document.getElementById('add-asset-purchase-date').value,
                    name: document.getElementById('add-asset-name').value,
                    serial_number: document.getElementById('add-asset-serial').value,
                    status: 'Available'
                };
                db.assets.push(newAsset);
            }
            
            if (window.saveDb) window.saveDb(db);
            if (window.showToast) window.showToast(`${quantity} Asset(s) added successfully`, 'success');
            
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
    if (window.saveDb) window.saveDb(db);
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
            catSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
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
    
    if (window.saveDb) window.saveDb(db);
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
    
    if (window.saveDb) window.saveDb(db);
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

window.openManageAssetCategoriesModal = function() {
    try {
        const modal = document.getElementById('modal-manage-asset-categories');
        const overlay = document.getElementById('modal-overlay');
        if (modal) modal.classList.remove('hidden');
        if (overlay) overlay.classList.remove('hidden');
        renderAssetCategoriesTable();
    } catch (e) { console.error(e); }
};

window.saveAssetCategory = function(e) {
    if (e) e.preventDefault();
    const db = window.getDb ? window.getDb() : window.db;
    const mainCat = document.getElementById('new-asset-main-cat').value.trim();
    const subCat = document.getElementById('new-asset-sub-cat').value.trim();

    if (!mainCat || !subCat) return;

    if (!db.systemSettings.assetCategories) db.systemSettings.assetCategories = [];

    let category = db.systemSettings.assetCategories.find(c => c.name.toLowerCase() === mainCat.toLowerCase());
    if (!category) {
        category = { name: mainCat, subCategories: [] };
        db.systemSettings.assetCategories.push(category);
    }

    if (!category.subCategories.find(s => s.toLowerCase() === subCat.toLowerCase())) {
        category.subCategories.push(subCat);
    }

    if (window.saveDb) window.saveDb(db);
    if (window.showToast) window.showToast('Category saved successfully', 'success');
    document.getElementById('new-asset-sub-cat').value = '';
    renderAssetCategoriesTable();
    
    // Refresh dropdowns if Add Asset modal is open
    const catList = document.getElementById('add-asset-category');
    if (catList && catList.options.length > 0) {
        let hasIt = false;
        for (let i = 0; i < catList.options.length; i++) {
            if (catList.options[i].value === category.name) hasIt = true;
        }
        if (!hasIt) catList.innerHTML += `<option value="${category.name}">${category.name}</option>`;
    }
};

window.renderAssetCategoriesTable = function() {
    const db = window.getDb ? window.getDb() : window.db;
    const tbody = document.getElementById('asset-categories-tbody');
    if (!tbody) return;

    let html = '';
    if (db.systemSettings.assetCategories) {
        db.systemSettings.assetCategories.forEach(c => {
            html += `<tr><td><strong>${c.name}</strong></td><td>`;
            c.subCategories.forEach(sub => {
                html += `<span class='badge bg-secondary' style='margin-right:5px; margin-bottom:5px; display:inline-block;'>${sub} <i class='fa-solid fa-xmark' style='cursor:pointer; margin-left:3px;' onclick='deleteAssetSubCategory("${c.name}", "${sub}")'></i></span>`;
            });
            html += `</td><td><button class='btn btn-sm btn-outline-danger' onclick='deleteAssetMainCategory("${c.name}")'><i class='fa-solid fa-trash'></i></button></td></tr>`;
        });
    }
    tbody.innerHTML = html || '<tr><td colspan="3" class="text-center text-muted">No categories found</td></tr>';
};

window.deleteAssetMainCategory = function(mainCat) {
    if (!confirm('Delete this main category and all its sub-categories?')) return;
    const db = window.getDb ? window.getDb() : window.db;
    db.systemSettings.assetCategories = db.systemSettings.assetCategories.filter(c => c.name !== mainCat);
    if (window.saveDb) window.saveDb(db);
    if (window.showToast) window.showToast('Category deleted', 'success');
    renderAssetCategoriesTable();
};

window.deleteAssetSubCategory = function(mainCat, subCat) {
    if (!confirm('Delete this sub-category?')) return;
    const db = window.getDb ? window.getDb() : window.db;
    const category = db.systemSettings.assetCategories.find(c => c.name === mainCat);
    if (category) {
        category.subCategories = category.subCategories.filter(s => s !== subCat);
    }
    if (window.saveDb) window.saveDb(db);
    if (window.showToast) window.showToast('Sub-category deleted', 'success');
    renderAssetCategoriesTable();
};
