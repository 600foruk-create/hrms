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

window.selectedMainCategory = null;
window.selectedSubCategory = null;

window.renderAssetsInventory = function() {
    const db = window.getDb ? window.getDb() : window.db;
    
    // Auto-select first Main Category if none selected
    if (!window.selectedMainCategory && db.systemSettings && db.systemSettings.assetCategories && db.systemSettings.assetCategories.length > 0) {
        window.selectedMainCategory = db.systemSettings.assetCategories[0].name;
    }
    
    // Auto-select first Sub Category if Main is selected but Sub is not
    if (window.selectedMainCategory && !window.selectedSubCategory) {
        const category = db.systemSettings.assetCategories.find(c => c.name === window.selectedMainCategory);
        if (category && category.subCategories && category.subCategories.length > 0) {
            window.selectedSubCategory = category.subCategories[0];
        }
    }

    renderMainPane();
    renderSubPane();
    renderAssetsPane();
}

function renderMainPane() {
    const db = window.getDb ? window.getDb() : window.db;
    const mainPane = document.getElementById('inventory-pane-main-cat');
    if (!mainPane) return;
    
    let html = '';
    if (db.systemSettings.assetCategories && db.systemSettings.assetCategories.length > 0) {
        db.systemSettings.assetCategories.forEach(c => {
            const isActive = window.selectedMainCategory === c.name;
            const bg = isActive ? 'var(--primary)' : '';
            const color = isActive ? '#fff' : 'var(--text-primary)';
            const iconColor = isActive ? '#fff' : 'var(--text-secondary)';
            const hover = isActive ? '' : `onmouseover="this.style.background='rgba(0,0,0,0.02)'" onmouseout="this.style.background=''"`;
            
            html += `<li style="padding: 8px 12px; border-bottom: 1px solid rgba(0,0,0,0.05); cursor: pointer; transition: background 0.2s; background: ${bg}; color: ${color}; display: flex; justify-content: space-between; align-items: center;" ${hover} onclick="selectMainCategoryBox('${c.name}')"><div><i class="fa-solid fa-folder" style="color: ${iconColor}; margin-right: 8px;"></i> <strong>${c.name}</strong></div></li>`;
        });
    } else {
        html = '<li style="padding: 15px; text-align: center; color: #999;">No categories found</li>';
    }
    mainPane.innerHTML = html;
}

function renderSubPane() {
    const db = window.getDb ? window.getDb() : window.db;
    const subPane = document.getElementById('inventory-pane-sub-cat');
    if (!subPane) return;
    
    if (!window.selectedMainCategory) {
        subPane.innerHTML = '<li style="padding: 15px; text-align: center; color: #999; font-style: italic;">Select a Main Category</li>';
        return;
    }

    const category = db.systemSettings.assetCategories.find(c => c.name === window.selectedMainCategory);
    let html = '';
    if (category && category.subCategories && category.subCategories.length > 0) {
        category.subCategories.forEach(sub => {
            const isActive = window.selectedSubCategory === sub;
            const bg = isActive ? 'var(--primary)' : '';
            const color = isActive ? '#fff' : 'var(--text-primary)';
            const iconColor = isActive ? '#fff' : 'var(--text-secondary)';
            const hover = isActive ? '' : `onmouseover="this.style.background='rgba(0,0,0,0.02)'" onmouseout="this.style.background=''"`;

            let availableCount = 0;
            if (db.assets) {
                availableCount = db.assets.filter(a => a.category === window.selectedMainCategory && a.sub_category === sub && a.status === 'Available').length;
            }
            const countBadge = `<span style="background: ${isActive ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}; color: ${isActive ? '#fff' : 'var(--text-primary)'}; font-size: 10px; padding: 2px 8px; border-radius: 12px; font-weight: 700;" title="Available Quantity">${availableCount}</span>`;

            html += `<li style="padding: 8px 12px; border-bottom: 1px solid rgba(0,0,0,0.05); cursor: pointer; transition: background 0.2s; background: ${bg}; color: ${color}; display: flex; justify-content: space-between; align-items: center;" ${hover} onclick="selectSubCategoryBox('${window.selectedMainCategory}', '${sub}')"><div><i class="fa-solid fa-folder-open" style="color: ${iconColor}; margin-right: 8px;"></i> ${sub}</div>${countBadge}</li>`;
        });
    } else {
        html = '<li style="padding: 15px; text-align: center; color: #999;">No sub-categories</li>';
    }
    subPane.innerHTML = html;
}

function renderAssetsPane() {
    const db = window.getDb ? window.getDb() : window.db;
    const assetsPane = document.getElementById('inventory-pane-assets-content');
    const title = document.getElementById('inventory-pane-assets-title');
    if (!assetsPane) return;
    
    if (!window.selectedMainCategory || !window.selectedSubCategory) {
        if (title) title.innerText = 'Assets';
        assetsPane.innerHTML = '<div style="text-align: center; color: #999; font-style: italic; margin-top: 20px;">Select a Sub Category to view assets</div>';
        return;
    }

    if (title) title.innerHTML = `Assets`;
    
    if (!db.assets) db.assets = [];
    const filteredAssets = db.assets.filter(a => a.category === window.selectedMainCategory && a.sub_category === window.selectedSubCategory);
    
    if (filteredAssets.length === 0) {
        assetsPane.innerHTML = '<div style="text-align: center; color: #999; margin-top: 20px;">No assets found in this sub-category</div>';
        return;
    }
    
    // Group by Name
    const grouped = {};
    filteredAssets.forEach(a => {
        const name = a.name || 'Unnamed Asset';
        if (!grouped[name]) grouped[name] = [];
        grouped[name].push(a);
    });
    
    let html = '';
    for (const [name, items] of Object.entries(grouped)) {
        const availableCount = items.filter(i => i.status === 'Available').length;
        
        html += `
        <div style="border: 1px solid var(--border-color, rgba(0,0,0,0.1)); border-radius: 6px; margin-bottom: 10px; overflow: hidden;">
            <div style="padding: 8px 12px; background: var(--bg-hover, rgba(0,0,0,0.02)); display: flex; justify-content: space-between; align-items: center; cursor: pointer; color: var(--text-primary);" onclick="this.nextElementSibling.classList.toggle('hidden')">
                <div style="font-weight: 600;"><i class="fa-solid fa-box" style="color: var(--primary); margin-right: 8px;"></i> ${name}</div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="background: var(--bg-surface, rgba(0,0,0,0.1)); color: var(--text-primary); font-size: 10px; padding: 2px 8px; border-radius: 12px; font-weight: 700;" title="Available Quantity">${availableCount}</span>
                    <button class="btn btn-sm btn-icon" style="padding: 2px 6px; color: var(--primary);" onclick="event.stopPropagation(); addInlineAsset('${name.replace(/'/g, "\\'")}')" title="Add More"><i class="fa-solid fa-plus" style="font-size: 10px;"></i></button>
                </div>
            </div>`;
            
        const noSerialItems = items.filter(i => !i.serial_number || i.serial_number.trim() === '');
        const serialItems = items.filter(i => i.serial_number && i.serial_number.trim() !== '');
        
        if (serialItems.length > 0 || noSerialItems.length > 0) {
            html += `<div class="hidden" style="padding: 0; border-top: 1px solid var(--border-color, rgba(0,0,0,0.05));">
                <table class="data-table" style="margin: 0; box-shadow: none;">
                    <thead><tr><th>ID</th><th>Serial No</th><th>Status</th><th style="width: 50px;"></th></tr></thead>
                    <tbody>`;
            
            if (noSerialItems.length > 0) {
                const noSerialGroups = {};
                noSerialItems.forEach(i => {
                    if (!noSerialGroups[i.status]) noSerialGroups[i.status] = [];
                    noSerialGroups[i.status].push(i);
                });
                
                for (const [status, groupItems] of Object.entries(noSerialGroups)) {
                    let statusBadge = '';
                    if (status === 'Available') statusBadge = `<span class="role-badge bg-success" style="font-size: 10px;">Available (Qty: ${groupItems.length})</span>`;
                    else if (status === 'Issued') statusBadge = `<span class="role-badge bg-warning text-dark" style="font-size: 10px;">Issued (Qty: ${groupItems.length})</span>`;
                    else statusBadge = `<span class="role-badge bg-secondary" style="font-size: 10px;">${status} (Qty: ${groupItems.length})</span>`;
                    
                    html += `<tr>
                        <td style="font-size: 12px; color: #999; font-style: italic;">Auto</td>
                        <td style="font-size: 12px; color: #999; font-style: italic;">N/A</td>
                        <td>${statusBadge}</td>
                        <td>
                            ${status === 'Available' ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteAsset('${groupItems[0].id}')" style="padding: 2px 6px;" title="Delete 1 Unit"><i class="fa-solid fa-trash" style="font-size: 10px;"></i></button>` : `<span style="font-size: 10px; color: #999;">-</span>`}
                        </td>
                    </tr>`;
                }
            }
            
            serialItems.forEach(a => {
                let statusBadge = '';
                if (a.status === 'Available') statusBadge = '<span class="role-badge bg-success" style="font-size: 10px;">Available</span>';
                else if (a.status === 'Issued') statusBadge = '<span class="role-badge bg-warning text-dark" style="font-size: 10px;">Issued</span>';
                else statusBadge = `<span class="role-badge bg-secondary" style="font-size: 10px;">${a.status}</span>`;
                
                html += `<tr>
                    <td style="font-size: 12px;">${a.id}</td>
                    <td style="font-size: 12px;">${a.serial_number}</td>
                    <td>${statusBadge}</td>
                    <td><button class="btn btn-sm btn-outline-danger" onclick="deleteAsset('${a.id}')" style="padding: 2px 6px;"><i class="fa-solid fa-trash" style="font-size: 10px;"></i></button></td>
                </tr>`;
            });
            
            html += `</tbody></table></div>`;
        }
        
        html += `</div>`;
    }
    
    assetsPane.innerHTML = html;
}

window.selectMainCategoryBox = function(mainCat) {
    window.selectedMainCategory = mainCat;
    window.selectedSubCategory = null;
    window.renderAssetsInventory();
};

window.selectSubCategoryBox = function(mainCat, subCat) {
    window.selectedMainCategory = mainCat;
    window.selectedSubCategory = subCat;
    window.renderAssetsInventory();
};

// --- Inline Management Functions ---

window.addInlineMainCat = function() {
    const db = window.getDb ? window.getDb() : window.db;
    const name = prompt('Enter new Main Category name:');
    if (!name || !name.trim()) return;
    if (!db.systemSettings.assetCategories) db.systemSettings.assetCategories = [];
    if (db.systemSettings.assetCategories.find(c => c.name.toLowerCase() === name.trim().toLowerCase())) {
        if (window.showToast) window.showToast('Main Category already exists', 'error');
        return;
    }
    db.systemSettings.assetCategories.push({ name: name.trim(), subCategories: [] });
    if (window.saveDb) window.saveDb(db);
    if (window.showToast) window.showToast('Main Category created', 'success');
    window.selectedMainCategory = name.trim();
    window.selectedSubCategory = null;
    window.renderAssetsInventory();
};

window.editInlineMainCat = function() {
    if (!window.selectedMainCategory) {
        if (window.showToast) window.showToast('Please select a Main Category to edit', 'warning');
        return;
    }
    const db = window.getDb ? window.getDb() : window.db;
    const category = db.systemSettings.assetCategories.find(c => c.name === window.selectedMainCategory);
    if (!category) return;
    
    const newName = prompt('Enter new name for Main Category:', category.name);
    if (!newName || !newName.trim() || newName.trim() === category.name) return;
    
    if (db.systemSettings.assetCategories.find(c => c.name.toLowerCase() === newName.trim().toLowerCase())) {
        if (window.showToast) window.showToast('A Main Category with this name already exists', 'error');
        return;
    }
    
    category.name = newName.trim();
    // Also update all assets
    if (db.assets) {
        db.assets.forEach(a => {
            if (a.category === window.selectedMainCategory) a.category = newName.trim();
        });
    }
    
    if (window.saveDb) window.saveDb(db);
    if (window.showToast) window.showToast('Main Category renamed', 'success');
    window.selectedMainCategory = newName.trim();
    window.renderAssetsInventory();
};

window.deleteInlineMainCat = function() {
    if (!window.selectedMainCategory) {
        if (window.showToast) window.showToast('Please select a Main Category to delete', 'warning');
        return;
    }
    if (!confirm(`Are you sure you want to delete "${window.selectedMainCategory}" and all its sub-categories? (Assets will not be deleted)`)) return;
    
    const db = window.getDb ? window.getDb() : window.db;
    db.systemSettings.assetCategories = db.systemSettings.assetCategories.filter(c => c.name !== window.selectedMainCategory);
    if (window.saveDb) window.saveDb(db);
    if (window.showToast) window.showToast('Main Category deleted', 'success');
    window.selectedMainCategory = null;
    window.selectedSubCategory = null;
    window.renderAssetsInventory();
};

window.addInlineSubCat = function() {
    if (!window.selectedMainCategory) {
        if (window.showToast) window.showToast('Please select a Main Category first', 'warning');
        return;
    }
    const db = window.getDb ? window.getDb() : window.db;
    const category = db.systemSettings.assetCategories.find(c => c.name === window.selectedMainCategory);
    if (!category) return;
    
    const name = prompt(`Enter new Sub Category name under "${window.selectedMainCategory}":`);
    if (!name || !name.trim()) return;
    
    if (!category.subCategories) category.subCategories = [];
    if (category.subCategories.find(s => s.toLowerCase() === name.trim().toLowerCase())) {
        if (window.showToast) window.showToast('Sub Category already exists', 'error');
        return;
    }
    category.subCategories.push(name.trim());
    if (window.saveDb) window.saveDb(db);
    if (window.showToast) window.showToast('Sub Category created', 'success');
    window.selectedSubCategory = name.trim();
    window.renderAssetsInventory();
};

window.editInlineSubCat = function() {
    if (!window.selectedMainCategory || !window.selectedSubCategory) {
        if (window.showToast) window.showToast('Please select a Sub Category to edit', 'warning');
        return;
    }
    const db = window.getDb ? window.getDb() : window.db;
    const category = db.systemSettings.assetCategories.find(c => c.name === window.selectedMainCategory);
    if (!category || !category.subCategories) return;
    
    const newName = prompt('Enter new name for Sub Category:', window.selectedSubCategory);
    if (!newName || !newName.trim() || newName.trim() === window.selectedSubCategory) return;
    
    if (category.subCategories.find(s => s.toLowerCase() === newName.trim().toLowerCase())) {
        if (window.showToast) window.showToast('A Sub Category with this name already exists', 'error');
        return;
    }
    
    const idx = category.subCategories.indexOf(window.selectedSubCategory);
    if (idx !== -1) category.subCategories[idx] = newName.trim();
    
    // Update assets
    if (db.assets) {
        db.assets.forEach(a => {
            if (a.category === window.selectedMainCategory && a.sub_category === window.selectedSubCategory) {
                a.sub_category = newName.trim();
            }
        });
    }
    
    if (window.saveDb) window.saveDb(db);
    if (window.showToast) window.showToast('Sub Category renamed', 'success');
    window.selectedSubCategory = newName.trim();
    window.renderAssetsInventory();
};

window.deleteInlineSubCat = function() {
    if (!window.selectedMainCategory || !window.selectedSubCategory) {
        if (window.showToast) window.showToast('Please select a Sub Category to delete', 'warning');
        return;
    }
    if (!confirm(`Are you sure you want to delete "${window.selectedSubCategory}"?`)) return;
    
    const db = window.getDb ? window.getDb() : window.db;
    const category = db.systemSettings.assetCategories.find(c => c.name === window.selectedMainCategory);
    if (category && category.subCategories) {
        category.subCategories = category.subCategories.filter(s => s !== window.selectedSubCategory);
    }
    if (window.saveDb) window.saveDb(db);
    if (window.showToast) window.showToast('Sub Category deleted', 'success');
    window.selectedSubCategory = null;
    window.renderAssetsInventory();
};

window.addInlineAsset = function(prefillName = null) {
    if (!window.selectedMainCategory || !window.selectedSubCategory) {
        if (window.showToast) window.showToast('Please select a Main and Sub Category first to add an asset', 'warning');
        return;
    }
    
    if (window.openAddAssetModal) window.openAddAssetModal();
    setTimeout(() => {
        const mainSel = document.getElementById('add-asset-category');
        if (mainSel) {
            mainSel.value = window.selectedMainCategory;
            // trigger change to populate sub categories
            const ev = new Event('change');
            mainSel.dispatchEvent(ev);
            
            setTimeout(() => {
                const subSel = document.getElementById('add-asset-sub-category');
                if (subSel) subSel.value = window.selectedSubCategory;
                
                if (prefillName) {
                    const nameInput = document.getElementById('add-asset-name');
                    if (nameInput) nameInput.value = prefillName;
                }
            }, 50);
        }
    }, 100);
};

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
    document.getElementById('issue-asset-request-id').value = '';
    
    // Render Pending Requests
    const reqBody = document.getElementById('admin-asset-requests-body');
    if (reqBody) {
        if (!db.assetRequests || db.assetRequests.length === 0) {
            reqBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No pending requests</td></tr>';
            return;
        }
        
        let pending = db.assetRequests.filter(r => r.status === 'Pending');
        pending.sort((a, b) => new Date(a.request_date) - new Date(b.request_date));
        
        if (pending.length === 0) {
            reqBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No pending requests</td></tr>';
            return;
        }
        
        let html = '';
        pending.forEach(r => {
            const emp = db.users ? db.users.find(u => u.id === r.employee_id) : null;
            const empName = emp ? emp.name : r.employee_id;
            
            html += `
                <tr>
                    <td>${window.formatDate ? window.formatDate(r.request_date) : r.request_date}</td>
                    <td><strong>${empName}</strong></td>
                    <td>${r.requested_category}</td>
                    <td>${r.requested_sub_category}</td>
                    <td>${r.requested_asset || '-'}</td>
                    <td>${r.reason}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-success" onclick="window.approveAssetRequest('${r.id}')"><i class="fa-solid fa-check"></i> Approve</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="window.rejectAssetRequest('${r.id}')"><i class="fa-solid fa-xmark"></i> Reject</button>
                    </td>
                </tr>
            `;
        });
        reqBody.innerHTML = html;
    }
}

window.approveAssetRequest = function(reqId) {
    const db = window.getDb ? window.getDb() : window.db;
    const req = (db.assetRequests || []).find(r => r.id === reqId);
    if (!req) return;
    
    document.getElementById('issue-asset-request-id').value = req.id;
    document.getElementById('issue-asset-employee').value = req.employee_id;
    document.getElementById('issue-asset-category').value = req.requested_category;
    let notes = "Fulfilling request: " + req.reason;
    if (req.requested_asset) {
        notes += "\nRequested Specific Asset: " + req.requested_asset;
    }
    document.getElementById('issue-asset-notes').value = notes;
    
    // Scroll to the issue form
    document.getElementById('form-issue-asset').scrollIntoView({ behavior: 'smooth' });
    
    // Trigger category change to load available assets
    if (window.filterAvailableAssets) window.filterAvailableAssets();
    
    // Auto-select requested asset if available
    if (req.requested_asset) {
        const itemSelect = document.getElementById('issue-asset-item');
        if (itemSelect) {
            let matchedOption = Array.from(itemSelect.options).find(opt => opt.text === req.requested_asset);
            
            // If it's a grouped no-serial request, match by name prefix
            if (!matchedOption && req.requested_asset.includes('[No Serial]')) {
                const requestedName = req.requested_asset.split(' [No Serial]')[0];
                matchedOption = Array.from(itemSelect.options).find(opt => opt.text.startsWith(requestedName + ' [No Serial]'));
            }
            
            if (matchedOption) {
                itemSelect.value = matchedOption.value;
            }
        }
    }
    
    if (window.showToast) window.showToast('Form pre-filled. Please verify the specific asset to issue.', 'info');
};

window.rejectAssetRequest = function(reqId) {
    if (!confirm('Are you sure you want to reject this asset request?')) return;
    const db = window.getDb ? window.getDb() : window.db;
    const req = (db.assetRequests || []).find(r => r.id === reqId);
    if (!req) return;
    
    req.status = 'Rejected';
    
    if (window.saveDb) window.saveDb(db);
    if (window.showToast) window.showToast('Asset request rejected.', 'success');
    
    if (window.addNotification) {
        window.addNotification(req.employee_id, `Your asset request for ${req.requested_sub_category} was rejected.`);
    }
    
    renderAssetsIssueForm();
};

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
        const serialText = (a.serial_number && a.serial_number.trim() !== '') ? a.serial_number : 'No Serial';
        itemSelect.innerHTML += `<option value="${a.id}">${a.name} [${serialText}]</option>`;
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
    
    // Handle Request Fulfilling
    const reqId = document.getElementById('issue-asset-request-id').value;
    if (reqId && db.assetRequests) {
        const req = db.assetRequests.find(r => r.id === reqId);
        if (req) {
            req.status = 'Approved';
            if (window.addNotification) {
                window.addNotification(empId, `Your asset request for ${req.requested_sub_category} has been approved and issued.`);
            }
        }
    } else {
        if (window.addNotification) {
            const assetInfo = db.assets.find(a => a.id === assetId);
            window.addNotification(empId, `A new asset (${assetInfo ? assetInfo.name : 'Device'}) has been issued to you.`);
        }
    }
    
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
            ? '<span class="role-badge bg-warning text-dark">Issued</span>' 
            : '<span class="role-badge bg-success">Returned</span>';
            
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

window.renderEmployeeAssetsTab = function(subTabId = 'my_assets') {
    initAssetsDB();
    const db = window.getDb ? window.getDb() : window.db;
    
    if (!currentUser) return;
    
    const pfx = (currentUser.role === 'Manager') ? 'mgr' : 'emp';
    const tabContainer = document.getElementById(currentUser.role === 'Manager' ? 'manager-tab-assets' : 'employee-tab-assets');
    if (!tabContainer) return;
    
    const subTabBtns = tabContainer.querySelectorAll('.btn-sub-tab');
    subTabBtns.forEach(btn => btn.classList.remove('active'));
    
    const subViews = tabContainer.querySelectorAll('.asset-sub-view');
    subViews.forEach(v => v.classList.add('hidden'));

    if(subTabId === 'my_assets') {
        const btn = tabContainer.querySelector(`[data-subtab="${pfx}-assets-my"]`);
        if (btn) btn.classList.add('active');
        document.getElementById(`${pfx}-assets-my`)?.classList.remove('hidden');
        renderMyAssetsList(db, pfx);
    } else if(subTabId === 'request') {
        const btn = tabContainer.querySelector(`[data-subtab="${pfx}-assets-request"]`);
        if (btn) btn.classList.add('active');
        document.getElementById(`${pfx}-assets-request`)?.classList.remove('hidden');
        renderAssetRequestForm(db, pfx);
    } else if(subTabId === 'history') {
        const btn = tabContainer.querySelector(`[data-subtab="${pfx}-assets-history"]`);
        if (btn) btn.classList.add('active');
        document.getElementById(`${pfx}-assets-history`)?.classList.remove('hidden');
        renderMyRequestsHistory(db, pfx);
    }
};

function renderMyAssetsList(db, pfx) {
    const tbody = document.getElementById(`${pfx}-assets-body`);
    if (!tbody) return;
    
    if (!db.assetIssues || db.assetIssues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">You have no assets assigned</td></tr>';
        return;
    }
    
    let myIssues = db.assetIssues.filter(ai => ai.employee_id === currentUser.id && ai.status === 'Active');
    myIssues.sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date));
    
    if (myIssues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">You have no active assets assigned</td></tr>';
        return;
    }
    
    let html = '';
    myIssues.forEach(ai => {
        const asset = db.assets ? db.assets.find(a => a.id === ai.asset_id) : null;
        const catName = asset ? asset.category : 'Unknown';
        const assetName = asset ? asset.name : 'Unknown';
        const serialNo = asset ? asset.serial_number : 'Unknown';
        
        html += `
            <tr>
                <td>${catName}</td>
                <td><strong>${assetName}</strong></td>
                <td>${serialNo}</td>
                <td>${window.formatDate ? window.formatDate(ai.issue_date) : ai.issue_date}</td>
                <td>${ai.notes || '-'}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function renderAssetRequestForm(db, pfx) {
    const mainCatSelect = document.getElementById(`${pfx}-req-main-cat`);
    if (!mainCatSelect) return;
    
    mainCatSelect.innerHTML = '<option value="">-- Select Category --</option>';
    if (db.systemSettings && db.systemSettings.assetCategories) {
        db.systemSettings.assetCategories.forEach(c => {
            mainCatSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
        });
    }
    document.getElementById(`${pfx}-req-sub-cat`).innerHTML = '<option value="">-- Select Sub Category --</option>';
    const assetSelect = document.getElementById(`${pfx}-req-asset`);
    if (assetSelect) assetSelect.innerHTML = '<option value="">-- Any Available Asset --</option>';
    document.getElementById(`${pfx}-req-reason`).value = '';
}

window.updateEmpReqSubCat = function() {
    const db = window.getDb ? window.getDb() : window.db;
    const pfx = (currentUser.role === 'Manager') ? 'mgr' : 'emp';
    const mainCat = document.getElementById(`${pfx}-req-main-cat`).value;
    const subCatSelect = document.getElementById(`${pfx}-req-sub-cat`);
    const assetSelect = document.getElementById(`${pfx}-req-asset`);
    
    subCatSelect.innerHTML = '<option value="">-- Select Sub Category --</option>';
    if (assetSelect) assetSelect.innerHTML = '<option value="">-- Any Available Asset --</option>';
    
    if (!mainCat) return;
    
    const category = db.systemSettings.assetCategories.find(c => c.name === mainCat);
    if (category && category.subCategories) {
        category.subCategories.forEach(sub => {
            subCatSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
        });
    }
};

window.updateEmpReqAsset = function() {
    const db = window.getDb ? window.getDb() : window.db;
    const pfx = (currentUser.role === 'Manager') ? 'mgr' : 'emp';
    const mainCat = document.getElementById(`${pfx}-req-main-cat`).value;
    const subCat = document.getElementById(`${pfx}-req-sub-cat`).value;
    const assetSelect = document.getElementById(`${pfx}-req-asset`);
    
    if (!assetSelect) return;
    assetSelect.innerHTML = '<option value="">-- Any Available Asset --</option>';
    
    if (!mainCat || !subCat || !db.assets) return;
    
    const available = db.assets.filter(a => a.category === mainCat && a.sub_category === subCat && a.status === 'Available');
    if (available.length > 0) {
        const uniqueGroups = {};
        
        available.forEach(a => {
            const hasSerial = a.serial_number && a.serial_number.trim() !== '';
            if (hasSerial) {
                assetSelect.innerHTML += `<option value="${a.name} [${a.serial_number}]">${a.name} [${a.serial_number}]</option>`;
            } else {
                const name = a.name || 'Unnamed Asset';
                if (!uniqueGroups[name]) {
                    uniqueGroups[name] = 1;
                } else {
                    uniqueGroups[name]++;
                }
            }
        });
        
        for (const [name, count] of Object.entries(uniqueGroups)) {
            assetSelect.innerHTML += `<option value="${name} [No Serial]">${name} [No Serial]</option>`;
        }
    }
};

window.submitAssetRequest = function() {
    const db = window.getDb ? window.getDb() : window.db;
    const pfx = (currentUser.role === 'Manager') ? 'mgr' : 'emp';
    const mainCat = document.getElementById(`${pfx}-req-main-cat`).value;
    const subCat = document.getElementById(`${pfx}-req-sub-cat`).value;
    const specificAsset = document.getElementById(`${pfx}-req-asset`) ? document.getElementById(`${pfx}-req-asset`).value : '';
    const reason = document.getElementById(`${pfx}-req-reason`).value.trim();
    
    if (!mainCat || !subCat || !reason) {
        if (window.showToast) window.showToast("Please fill all required fields", "error");
        return;
    }
    
    if (!db.assetRequests) db.assetRequests = [];
    
    const requestRecord = {
        id: 'ASR-' + new Date().getTime().toString().slice(-6),
        employee_id: currentUser.id,
        requested_category: mainCat,
        requested_sub_category: subCat,
        requested_asset: specificAsset,
        reason: reason,
        request_date: new Date().toISOString().split('T')[0],
        status: 'Pending'
    };
    
    db.assetRequests.push(requestRecord);
    
    if (window.saveDb) window.saveDb(db);
    if (window.showToast) window.showToast("Asset Request Submitted Successfully", "success");
    
    // Notify Admin
    if (window.addNotification) {
        window.addNotification('Admin', `New asset request from ${currentUser.name} for ${subCat}${specificAsset ? ` (${specificAsset})` : ''}.`);
    }
    
    // Switch to history tab
    window.renderEmployeeAssetsTab('history');
};

function renderMyRequestsHistory(db, pfx) {
    const tbody = document.getElementById(`${pfx}-asset-requests-body`);
    if (!tbody) return;
    
    if (!db.assetRequests || db.assetRequests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No asset requests found</td></tr>';
        return;
    }
    
    let myReqs = db.assetRequests.filter(r => r.employee_id === currentUser.id);
    myReqs.sort((a, b) => new Date(b.request_date) - new Date(a.request_date));
    
    if (myReqs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No asset requests found</td></tr>';
        return;
    }
    
    let html = '';
    myReqs.forEach(r => {
        let statusBadge = '';
        if (r.status === 'Pending') statusBadge = '<span class="role-badge bg-warning text-dark">Pending</span>';
        else if (r.status === 'Approved') statusBadge = '<span class="role-badge bg-success">Approved (Issued)</span>';
        else if (r.status === 'Rejected') statusBadge = '<span class="role-badge bg-danger">Rejected</span>';
        
        html += `
            <tr>
                <td>${window.formatDate ? window.formatDate(r.request_date) : r.request_date}</td>
                <td>${r.requested_category}</td>
                <td>${r.requested_sub_category}</td>
                <td>${r.requested_asset || '-'}</td>
                <td>${r.reason}</td>
                <td>${statusBadge}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

window.openManageAssetCategoriesModal = function() {
    try {
        const modal = document.getElementById('modal-manage-asset-categories');
        const overlay = document.getElementById('modal-overlay');
        if (modal) modal.classList.remove('hidden');
        if (overlay) overlay.classList.remove('hidden');
        renderAssetCategoriesTable();
    } catch (e) { console.error(e); }
};

window.saveAssetMainCategory = function(e) {
    if (e) e.preventDefault();
    const db = window.getDb ? window.getDb() : window.db;
    const mainCat = document.getElementById('new-asset-main-cat').value.trim();

    if (!mainCat) return;
    if (!db.systemSettings.assetCategories) db.systemSettings.assetCategories = [];

    let category = db.systemSettings.assetCategories.find(c => c.name.toLowerCase() === mainCat.toLowerCase());
    if (!category) {
        category = { name: mainCat, subCategories: [] };
        db.systemSettings.assetCategories.push(category);
        
        if (window.saveDb) window.saveDb(db);
        if (window.showToast) window.showToast('Main Category created', 'success');
        document.getElementById('new-asset-main-cat').value = '';
        renderAssetCategoriesTable();
    } else {
        if (window.showToast) window.showToast('This Main Category already exists', 'error');
    }
};

window.saveAssetSubCategory = function(e) {
    if (e) e.preventDefault();
    const db = window.getDb ? window.getDb() : window.db;
    const mainCat = document.getElementById('select-asset-main-cat').value;
    const subCat = document.getElementById('new-asset-sub-cat').value.trim();

    if (!mainCat || !subCat) return;

    let category = db.systemSettings.assetCategories.find(c => c.name === mainCat);
    if (category) {
        if (!category.subCategories) category.subCategories = [];
        if (!category.subCategories.find(s => s.toLowerCase() === subCat.toLowerCase())) {
            category.subCategories.push(subCat);
            if (window.saveDb) window.saveDb(db);
            if (window.showToast) window.showToast('Sub Category added', 'success');
            document.getElementById('new-asset-sub-cat').value = '';
            renderAssetCategoriesTable();
        } else {
            if (window.showToast) window.showToast('Sub Category already exists under this Main Category', 'error');
        }
    }
};

window.renderAssetCategoriesTable = function() {
    const db = window.getDb ? window.getDb() : window.db;
    const tbody = document.getElementById('asset-categories-tbody');
    const selectMainCat = document.getElementById('select-asset-main-cat');
    
    if (selectMainCat) {
        selectMainCat.innerHTML = '<option value="">-- Select Main Category --</option>';
    }

    if (!tbody) return;

    let html = '';
    if (db.systemSettings.assetCategories && db.systemSettings.assetCategories.length > 0) {
        db.systemSettings.assetCategories.forEach(c => {
            if (selectMainCat) {
                selectMainCat.innerHTML += `<option value="${c.name}">${c.name}</option>`;
            }
            html += `<tr><td style="vertical-align: top; width: 30%;"><strong>${c.name}</strong></td><td style="vertical-align: top;">`;
            if (c.subCategories && c.subCategories.length > 0) {
                c.subCategories.forEach(sub => {
                    html += `<span class='role-badge bg-secondary' style='margin-right:5px; margin-bottom:5px; display:inline-block; font-weight: 500;'>${sub} <i class='fa-solid fa-xmark' style='cursor:pointer; margin-left:5px; color: #ffcccc;' onclick='deleteAssetSubCategory("${c.name}", "${sub}")'></i></span>`;
                });
            } else {
                html += `<span class="text-muted" style="font-size: 12px;">No sub-categories</span>`;
            }
            html += `</td><td style="vertical-align: top;"><button class='btn btn-sm btn-outline-danger' onclick='deleteAssetMainCategory("${c.name}")'><i class='fa-solid fa-trash'></i></button></td></tr>`;
        });
    }
    tbody.innerHTML = html || '<tr><td colspan="3" class="text-center text-muted">No categories found. Create a Main Category first.</td></tr>';
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

// --- Bulk Add Assets Logic ---

window.openBulkAddAssetModal = function() {
    const db = window.getDb ? window.getDb() : window.db;
    const modal = document.getElementById('modal-bulk-add-asset');
    const overlay = document.getElementById('modal-overlay');
    
    if (modal) modal.classList.remove('hidden');
    if (overlay) overlay.classList.remove('hidden');
    
    // Set default date to today
    const dateInput = document.getElementById('bulk-asset-purchase-date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }
    
    document.getElementById('bulk-asset-invoice').value = '';
    
    // Clear grid and add one empty row
    const tbody = document.getElementById('bulk-asset-grid-body');
    if (tbody) {
        tbody.innerHTML = '';
        window.addBulkAssetRow();
    }
};

window.generateMainCatOptions = function(selectedValue = '') {
    const db = window.getDb ? window.getDb() : window.db;
    let html = '<option value="">-- Select --</option>';
    if (db.systemSettings && db.systemSettings.assetCategories) {
        db.systemSettings.assetCategories.forEach(c => {
            html += `<option value="${c.name}" ${selectedValue === c.name ? 'selected' : ''}>${c.name}</option>`;
        });
    }
    return html;
};

window.generateSubCatOptions = function(mainCatName, selectedValue = '') {
    const db = window.getDb ? window.getDb() : window.db;
    let html = '<option value="">-- Select --</option>';
    if (!mainCatName) return html;
    
    const category = db.systemSettings.assetCategories.find(c => c.name === mainCatName);
    if (category && category.subCategories) {
        category.subCategories.forEach(sub => {
            html += `<option value="${sub}" ${selectedValue === sub ? 'selected' : ''}>${sub}</option>`;
        });
    }
    return html;
};

window.addBulkAssetRow = function(data = {}) {
    const tbody = document.getElementById('bulk-asset-grid-body');
    if (!tbody) return;
    
    const rowId = 'row_' + Math.random().toString(36).substr(2, 9);
    const tr = document.createElement('tr');
    tr.id = rowId;
    
    tr.innerHTML = `
        <td style="padding: 4px;">
            <select class="form-control" style="font-size: 12px; padding: 4px;" onchange="window.updateBulkSubCat('${rowId}')">
                ${window.generateMainCatOptions(data.mainCat)}
            </select>
        </td>
        <td style="padding: 4px;">
            <select class="form-control sub-cat-select" style="font-size: 12px; padding: 4px;" onchange="window.populateBulkAssetNames('${rowId}')">
                ${window.generateSubCatOptions(data.mainCat, data.subCat)}
            </select>
        </td>
        <td style="padding: 4px; position: relative;">
            <select class="form-control asset-name-select" style="font-size: 12px; padding: 4px;" onchange="window.handleBulkAssetNameChange('${rowId}')">
                <option value="">-- Select Brand --</option>
            </select>
            <input type="text" class="form-control asset-name-input hidden" style="font-size: 12px; padding: 4px;" value="${data.name || ''}" placeholder="Type new brand..." onblur="window.handleBulkAssetNameBlur('${rowId}')">
        </td>
        <td style="padding: 4px;">
            <input type="text" class="form-control asset-serial" style="font-size: 12px; padding: 4px;" value="${data.serial || ''}" placeholder="Comma separated" oninput="window.checkBulkQtyLock('${rowId}')">
        </td>
        <td style="padding: 4px;">
            <input type="number" class="form-control asset-qty" style="font-size: 12px; padding: 4px;" value="${data.qty || 1}" min="1">
        </td>
        <td style="padding: 4px; text-align: center;">
            <button class="btn btn-sm btn-icon" style="color: var(--primary);" onclick="window.duplicateBulkAssetRow('${rowId}')" title="Duplicate Row"><i class="fa-solid fa-copy"></i></button>
            <button class="btn btn-sm btn-icon" style="color: var(--danger);" onclick="window.removeBulkAssetRow('${rowId}')" title="Remove Row"><i class="fa-solid fa-xmark"></i></button>
        </td>
    `;
    
    tbody.appendChild(tr);
    window.checkBulkQtyLock(rowId);
    window.populateBulkAssetNames(rowId);
};

window.updateBulkSubCat = function(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    const mainCatSelect = row.querySelector('select:first-child');
    const subCatSelect = row.querySelector('.sub-cat-select');
    
    subCatSelect.innerHTML = window.generateSubCatOptions(mainCatSelect.value);
    window.populateBulkAssetNames(rowId);
};

window.populateBulkAssetNames = function(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    const mainCat = row.querySelector('select:first-child').value;
    const subCat = row.querySelector('.sub-cat-select').value;
    const select = row.querySelector('.asset-name-select');
    const input = row.querySelector('.asset-name-input');
    
    if (!select) return;
    
    const db = window.getDb ? window.getDb() : window.db;
    
    const names = new Set();
    if (db.assets) {
        db.assets.forEach(a => {
            if (a.category === mainCat && a.sub_category === subCat && a.name) {
                names.add(a.name);
            }
        });
    }
    
    let currentVal = select.value;
    if (select.classList.contains('hidden')) {
        currentVal = input.value.trim();
    }
    
    let html = '<option value="">-- Select Brand --</option>';
    Array.from(names).forEach(name => {
        html += `<option value="${name.replace(/"/g, '&quot;')}">${name}</option>`;
    });
    html += '<option value="__NEW__" style="font-weight:bold; color:var(--primary);">+ Type New Brand...</option>';
    
    select.innerHTML = html;
    
    if (names.has(currentVal) || currentVal === '') {
        select.value = currentVal;
        select.classList.remove('hidden');
        input.classList.add('hidden');
    } else {
        select.classList.add('hidden');
        input.classList.remove('hidden');
        input.value = currentVal;
    }
};

window.handleBulkAssetNameChange = function(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    const select = row.querySelector('.asset-name-select');
    const input = row.querySelector('.asset-name-input');
    
    if (select.value === '__NEW__') {
        select.classList.add('hidden');
        input.classList.remove('hidden');
        input.value = '';
        input.focus();
    }
};

window.handleBulkAssetNameBlur = function(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    const select = row.querySelector('.asset-name-select');
    const input = row.querySelector('.asset-name-input');
    
    if (input.value.trim() === '') {
        input.classList.add('hidden');
        select.classList.remove('hidden');
        select.value = '';
    }
};

window.checkBulkQtyLock = function(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    const serialInput = row.querySelector('.asset-serial');
    const qtyInput = row.querySelector('.asset-qty');
    
    const serials = serialInput.value.split(/[\n,]+/).map(s => s.trim()).filter(s => s !== '');
    
    if (serials.length > 0) {
        qtyInput.value = serials.length;
        qtyInput.setAttribute('readonly', 'true');
        qtyInput.style.backgroundColor = 'var(--bg-hover)';
    } else {
        qtyInput.removeAttribute('readonly');
        qtyInput.style.backgroundColor = '';
    }
};

window.duplicateBulkAssetRow = function(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    
    const mainCat = row.querySelector('select:first-child').value;
    const subCat = row.querySelector('.sub-cat-select').value;
    
    const select = row.querySelector('.asset-name-select');
    const input = row.querySelector('.asset-name-input');
    let name = '';
    if (!select.classList.contains('hidden')) {
        name = select.value;
    } else {
        name = input.value;
    }
    
    window.addBulkAssetRow({
        mainCat: mainCat,
        subCat: subCat,
        name: name,
        serial: '',
        qty: 1
    });
};

window.removeBulkAssetRow = function(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
        // If grid is empty, add one row back
        const tbody = document.getElementById('bulk-asset-grid-body');
        if (tbody && tbody.children.length === 0) {
            window.addBulkAssetRow();
        }
    }
};

window.saveBulkAssets = function() {
    const db = window.getDb ? window.getDb() : window.db;
    const tbody = document.getElementById('bulk-asset-grid-body');
    const rows = tbody.querySelectorAll('tr');
    
    const purchaseDate = document.getElementById('bulk-asset-purchase-date').value;
    const invoiceNumber = document.getElementById('bulk-asset-invoice').value.trim();
    
    if (!purchaseDate) {
        if (window.showToast) window.showToast('Please select a purchase date.', 'error');
        return;
    }
    
    let hasErrors = false;
    let assetsToAdd = [];
    
    rows.forEach(row => {
        const mainCat = row.querySelector('select:first-child').value;
        const subCat = row.querySelector('.sub-cat-select').value;
        
        const select = row.querySelector('.asset-name-select');
        const input = row.querySelector('.asset-name-input');
        let name = '';
        if (!select.classList.contains('hidden')) {
            name = select.value;
        } else {
            name = input.value.trim();
        }
        
        const serialStr = row.querySelector('.asset-serial').value.trim();
        const serials = serialStr.split(/[\n,]+/).map(s => s.trim()).filter(s => s !== '');
        const qty = parseInt(row.querySelector('.asset-qty').value) || 1;
        
        if (!mainCat || !subCat || !name) {
            row.style.border = '1px solid var(--danger)';
            hasErrors = true;
            return;
        } else {
            row.style.border = '';
        }
        
        if (serials.length > 0) {
            // Using parsed serials, exact quantity matched above
            for (let i = 0; i < serials.length; i++) {
                assetsToAdd.push({
                    id: 'AST-' + Date.now() + '-' + Math.floor(Math.random() * 100000) + '-' + i,
                    name: name,
                    category: mainCat,
                    sub_category: subCat,
                    serial_number: serials[i],
                    purchase_date: purchaseDate,
                    invoice_number: invoiceNumber,
                    status: 'Available',
                    issue_history: []
                });
            }
        } else {
            // No serial numbers, add empty serial generic items
            for (let i = 0; i < qty; i++) {
                assetsToAdd.push({
                    id: 'AST-' + Date.now() + '-' + Math.floor(Math.random() * 100000) + '-' + i,
                    name: name,
                    category: mainCat,
                    sub_category: subCat,
                    serial_number: '',
                    purchase_date: purchaseDate,
                    invoice_number: invoiceNumber,
                    status: 'Available',
                    issue_history: []
                });
            }
        }
    });
    
    if (hasErrors) {
        if (window.showToast) window.showToast('Please fill all required fields (Category, Sub Category, Name).', 'error');
        return;
    }
    
    if (assetsToAdd.length === 0) {
        if (window.showToast) window.showToast('No valid assets to add.', 'warning');
        return;
    }
    
    if (!db.assets) db.assets = [];
    db.assets.push(...assetsToAdd);
    
    if (window.saveDb) window.saveDb(db);
    if (window.showToast) window.showToast(`${assetsToAdd.length} assets added successfully!`, 'success');
    
    const modal = document.getElementById('modal-bulk-add-asset');
    const overlay = document.getElementById('modal-overlay');
    if (modal) modal.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');
    
    if (window.renderAssetsInventory) window.renderAssetsInventory();
};

