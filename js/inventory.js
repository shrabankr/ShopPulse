'use strict';

/* ─────────────────────────────────────────────
   Inventory Module
───────────────────────────────────────────── */
const Inventory = {
  render(container) {
    const products = DB.getProducts();
    const categories = DB.getCategories();
    const lowStock = products.filter(p => p.reorderLevel > 0 && p.stock <= p.reorderLevel);

    let activeFilter = 'All';
    let viewMode = 'table';
    let search = '';

    const renderContent = () => {
      const filtered = products.filter(p => {
        const matchCat = activeFilter === 'All' || p.category === activeFilter;
        const matchSearch = !search || (p.name + p.sku + p.hsn + p.category).toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
      });

      const listEl = container.querySelector('#inv-list');
      if (!listEl) return;

      if (!filtered.length) {
        listEl.innerHTML = `<div class="empty-state"><span class="material-icons">inventory_2</span><h3>No products found</h3><p>Add your first product to get started.</p><button class="btn btn-primary" onclick="Inventory.openForm()"><span class="material-icons">add</span> Add Product</button></div>`;
        return;
      }

      listEl.innerHTML = `
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>HSN/SAC</th>
                <th>Category</th>
                <th>GST%</th>
                <th class="text-right">Purchase Price</th>
                <th class="text-right">Selling Price</th>
                <th class="text-right">Stock</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(p => {
        const isLow = p.reorderLevel > 0 && p.stock <= p.reorderLevel;
        const isOut = p.stock === 0;
        const stockClass = isOut ? 'stock-out' : isLow ? 'stock-low' : 'stock-ok';
        const stockLabel = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock';
        return `
                  <tr>
                    <td>
                      <div style="font-weight:600">${p.name}</div>
                      ${p.unit ? `<div style="font-size:.75rem;color:var(--text-secondary)">${p.unit}</div>` : ''}
                    </td>
                    <td><span class="mono">${p.sku || '—'}</span></td>
                    <td><span class="mono">${p.hsn || '—'}</span></td>
                    <td>${p.category || '—'}</td>
                    <td><span class="badge badge-primary">${p.gstRate || 0}%</span></td>
                    <td class="text-right">${DB.getRole() === 'staff' ? '<span class="text-muted">🔒 Hidden</span>' : fmtCurrency(p.purchasePrice)}</td>
                    <td class="text-right font-bold">${fmtCurrency(p.sellingPrice)}</td>
                    <td class="text-right">
                      <span style="font-weight:700;font-size:.95rem">${p.stock}</span>
                      <span style="font-size:.75rem;color:var(--text-secondary)"> / min ${p.reorderLevel}</span>
                    </td>
                    <td><span class="stock-badge ${stockClass}">${stockLabel}</span></td>
                    <td class="action-col">
                      <button class="btn btn-xs btn-secondary" onclick="Inventory.adjustStock('${p.id}')" title="Adjust Stock"><span class="material-icons" style="font-size:14px">tune</span></button>
                      <button class="btn btn-xs btn-secondary" onclick="Inventory.openForm('${p.id}')" title="Edit"><span class="material-icons" style="font-size:14px">edit</span></button>
                      ${DB.getRole() !== 'staff' ? `<button class="btn btn-xs btn-ghost" onclick="Inventory.deleteProduct('${p.id}')" title="Delete"><span class="material-icons" style="font-size:14px;color:var(--danger)">delete</span></button>` : ''}
                    </td>
                  </tr>`;
      }).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5"></td>
                <td class="text-right">${DB.getRole() === 'staff' ? '' : 'Total Value (Purchase)'}</td>
                <td class="text-right">${DB.getRole() === 'staff' ? '' : fmtCurrency(filtered.reduce((s, p) => s + p.stock * p.purchasePrice, 0))}</td>
                <td colspan="3"></td>
              </tr>
            </tfoot>
          </table>
        </div>`;
    };

    container.innerHTML = `
      <div class="page-header-row">
        <h2>Inventory</h2>
        <div class="actions">
          <button class="btn btn-secondary" onclick="Inventory.openAdjustAll()"><span class="material-icons">tune</span> Bulk Adjust</button>
          <button class="btn btn-primary" onclick="Inventory.openForm()"><span class="material-icons">add</span> Add Product</button>
        </div>
      </div>

      ${lowStock.length ? `
      <div class="alert-card alert-warning" style="margin-bottom:16px">
        <span class="material-icons">warning_amber</span>
        <div>
          <strong>${lowStock.length} item${lowStock.length > 1 ? 's' : ''} below reorder level</strong>
          <p>${lowStock.map(p => `${p.name} (${p.stock} left)`).slice(0, 3).join(' · ')}${lowStock.length > 3 ? '...' : ''}</p>
        </div>
        <button class="alert-action" onclick="AI.renderReorderAlert()">Reorder →</button>
      </div>` : ''}

      <div class="filter-bar">
        <div class="search-box">
          <span class="material-icons">search</span>
          <input id="inv-search" placeholder="Search by name, SKU, HSN…" oninput="window._invSearch=this.value;window._invRender()">
        </div>
        <div id="cat-filters" style="display:flex;gap:6px;flex-wrap:wrap"></div>
      </div>

      <!-- Summary Cards -->
      <div class="kpi-grid" style="margin-bottom:16px">
        <div class="kpi-card kpi-primary">
          <div class="kpi-icon"><span class="material-icons">inventory_2</span></div>
          <div class="kpi-content">
            <div class="kpi-label">Total Products</div>
            <div class="kpi-value">${products.length}</div>
          </div>
        </div>
        <div class="kpi-card kpi-success">
          <div class="kpi-icon"><span class="material-icons">attach_money</span></div>
          <div class="kpi-content">
            <div class="kpi-label">Stock Value</div>
            <div class="kpi-value">${fmtCurrency(products.reduce((s, p) => s + p.stock * p.purchasePrice, 0))}</div>
          </div>
        </div>
        <div class="kpi-card kpi-warning">
          <div class="kpi-icon"><span class="material-icons">warning</span></div>
          <div class="kpi-content">
            <div class="kpi-label">Low Stock Items</div>
            <div class="kpi-value">${lowStock.length}</div>
          </div>
        </div>
        <div class="kpi-card kpi-danger">
          <div class="kpi-icon"><span class="material-icons">block</span></div>
          <div class="kpi-content">
            <div class="kpi-label">Out of Stock</div>
            <div class="kpi-value">${products.filter(p => p.stock === 0).length}</div>
          </div>
        </div>
      </div>

      <div id="inv-list"></div>
    `;

    // Category filters
    const catFiltersEl = container.querySelector('#cat-filters');
    const allCats = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];
    allCats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `btn btn-xs ${cat === 'All' ? 'btn-primary' : 'btn-secondary'}`;
      btn.textContent = cat;
      btn.onclick = () => {
        activeFilter = cat;
        catFiltersEl.querySelectorAll('button').forEach(b => {
          b.className = `btn btn-xs ${b.textContent === cat ? 'btn-primary' : 'btn-secondary'}`;
        });
        renderContent();
      };
      catFiltersEl.appendChild(btn);
    });

    window._invSearch = '';
    window._invRender = () => { search = window._invSearch; renderContent(); };
    renderContent();
  },

  openForm(productId = null) {
    const p = productId ? DB.getProductById(productId) : null;
    const cats = DB.getCategories();
    const catOpts = cats.map(c => `<option ${c === (p?.category || 'Computers & Laptops') ? 'selected' : ''}>${c}</option>`).join('');
    const gstOpts = GST_RATES.map(r => `<option value="${r}" ${parseFloat(p?.gstRate) === r ? 'selected' : ''}>${r}%</option>`).join('');
    const unitOpts = UNITS.map(u => `<option ${u === (p?.unit || 'Nos') ? 'selected' : ''}>${u}</option>`).join('');

    App.modal(p ? 'Edit Product / Service' : 'Add Product / Service',
      `<div class="form-grid">
        <div class="form-group form-full">
          <label>Product or Service Name <span class="required">*</span></label>
          <input id="p-name" value="${p?.name || ''}" placeholder="e.g. Hikvision 4MP Camera or Annual Maintenance Contract (AMC)">
        </div>
        <div class="form-group">
          <label>Category</label>
          <select id="p-cat" onchange="Inventory._onCatChange(this)">${catOpts}</select>
        </div>
        <div class="form-group">
          <label>HSN / SAC Code <span class="required">*</span></label>
          <input id="p-hsn" value="${p?.hsn || ''}" placeholder="e.g. 8471 / 8525 / 998314">
        </div>
        <div class="form-group">
          <label>SKU / Item Code</label>
          <input id="p-sku" value="${p?.sku || ''}" placeholder="e.g. CAM-001 or AMC-01">
        </div>
        <div class="form-group">
          <label>Unit of Measurement</label>
          <select id="p-unit">${unitOpts}</select>
        </div>
        <div class="form-group">
          <label>GST Rate <span class="required">*</span></label>
          <select id="p-gst">${gstOpts}</select>
        </div>
        <div class="form-group">
          <label>Selling Price (₹) <span class="required">*</span></label>
          <input id="p-sp" type="number" value="${p?.sellingPrice || ''}" min="0" step="0.01" placeholder="0.00">
        </div>
        <div class="form-group">
          <label>Purchase / Cost Price (₹)</label>
          <input id="p-pp" type="number" value="${p?.purchasePrice || ''}" min="0" step="0.01" placeholder="0.00">
        </div>
        <div class="form-group" id="p-stock-group">
          <label>Current Stock Quantity</label>
          <input id="p-stock" type="number" value="${p?.stock ?? 0}" min="0" step="1">
        </div>
        <div class="form-group" id="p-reorder-group">
          <label>Reorder Alert Level</label>
          <input id="p-reorder" type="number" value="${p?.reorderLevel ?? 0}" min="0" step="1">
        </div>
        <div class="form-group form-full">
          <label>Description / Specifications</label>
          <textarea id="p-desc" placeholder="Technical specifications, warranty details, or service terms...">${p?.description || ''}</textarea>
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
       <button class="btn btn-primary" onclick="Inventory.saveProduct('${productId || ''}')"><span class="material-icons">save</span> ${p ? 'Update' : 'Save'} Item</button>`,
      'modal-lg'
    );
  },

  _onCatChange(sel) {
    const isService = sel.value.includes('Services') || sel.value.includes('Software');
    const hsnInput = document.getElementById('p-hsn');
    const unitSel = document.getElementById('p-unit');
    if (isService) {
      if (hsnInput && !hsnInput.value) hsnInput.value = '998314';
      if (unitSel) unitSel.value = 'Job';
    }
  },

  saveProduct(existingId) {
    const name = document.getElementById('p-name')?.value?.trim();
    const hsn = document.getElementById('p-hsn')?.value?.trim();
    const sp = parseFloat(document.getElementById('p-sp')?.value);

    if (!name) { App.toast('Product name is required', 'error'); return; }
    if (!hsn) { App.toast('HSN/SAC code is required for GST compliance', 'error'); return; }
    if (!sp || sp < 0) { App.toast('Selling price is required', 'error'); return; }

    const data = {
      id: existingId || null,
      name, sku: document.getElementById('p-sku')?.value?.trim() || '',
      hsn, category: document.getElementById('p-cat')?.value || 'Other',
      unit: document.getElementById('p-unit')?.value || 'Nos',
      gstRate: parseFloat(document.getElementById('p-gst')?.value) || 0,
      purchasePrice: parseFloat(document.getElementById('p-pp')?.value) || 0,
      sellingPrice: sp,
      stock: parseInt(document.getElementById('p-stock')?.value) || 0,
      reorderLevel: parseInt(document.getElementById('p-reorder')?.value) || 0,
      description: document.getElementById('p-desc')?.value?.trim() || '',
    };

    DB.saveProduct(data);
    App.toast(`Product "${name}" ${existingId ? 'updated' : 'added'}!`);
    App.closeModal();
    App.refreshSidebar();
    Inventory.render(document.getElementById('page-content'));
  },

  deleteProduct(id) {
    if (DB.getRole() === 'staff') {
      App.toast('🔒 Staff cannot delete products. Owner Mode required.', 'error');
      App.toggleRoleModal();
      return;
    }
    const p = DB.getProductById(id);
    App.modal('Delete Product',
      `<div class="confirm-body">
        <span class="material-icons">delete_forever</span>
        <h3>Delete "${p?.name}"?</h3>
        <p>Stock movements history will be preserved. This cannot be undone.</p>
      </div>`,
      `<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
       <button class="btn btn-danger" onclick="DB.deleteProduct('${id}');App.toast('Product deleted');App.closeModal();Inventory.render(document.getElementById('page-content'))">Delete</button>`,
      'modal-sm'
    );
  },

  adjustStock(productId) {
    const p = DB.getProductById(productId);
    if (!p) return;
    App.modal(`Adjust Stock — ${p.name}`,
      `<div style="margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--bg);border-radius:var(--radius);border:1px solid var(--border)">
          <div>
            <div style="font-size:.8rem;color:var(--text-secondary)">Current Stock</div>
            <div style="font-size:1.5rem;font-weight:800">${p.stock} <span style="font-size:.9rem;font-weight:400;color:var(--text-secondary)">${p.unit}</span></div>
          </div>
          <span class="material-icons" style="font-size:32px;color:var(--text-tertiary)">inventory</span>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Adjustment Type</label>
          <select id="adj-type">
            <option value="add">Add Stock (+)</option>
            <option value="subtract">Remove Stock (−)</option>
            <option value="set">Set Exact Quantity (=)</option>
          </select>
        </div>
        <div class="form-group"><label>Quantity <span class="required">*</span></label><input id="adj-qty" type="number" min="0" step="1" placeholder="Enter quantity"></div>
        <div class="form-group form-full"><label>Reason / Note</label><input id="adj-note" placeholder="e.g. Received from supplier, Stock count correction…"></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
       <button class="btn btn-primary" onclick="Inventory._doAdjust('${productId}')"><span class="material-icons">tune</span> Adjust</button>`,
      'modal-sm'
    );
  },

  _doAdjust(productId) {
    const type = document.getElementById('adj-type')?.value;
    const qty = parseInt(document.getElementById('adj-qty')?.value);
    const note = document.getElementById('adj-note')?.value || '';

    if (!qty || qty < 0) { App.toast('Enter a valid quantity', 'error'); return; }

    const p = DB.getProductById(productId);
    let delta = 0;
    if (type === 'add') delta = qty;
    else if (type === 'subtract') delta = -qty;
    else if (type === 'set') delta = qty - p.stock;

    DB.adjustStock(productId, delta);
    DB._addMov({ productId, type: delta >= 0 ? 'in' : 'out', qty: Math.abs(delta), reference: 'Manual', date: new Date().toISOString().split('T')[0], note: note || 'Manual adjustment' });

    App.toast(`Stock updated: ${p.name} → ${p.stock + delta} units`);
    App.closeModal();
    App.refreshSidebar();
    Inventory.render(document.getElementById('page-content'));
  },

  openAdjustAll() {
    App.toast('Use individual product "Adjust" buttons for now', 'info');
  }
};
