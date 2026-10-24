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
                      <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;margin-top:2px">
                        ${p.unit ? `<span style="font-size:.72rem;color:var(--text-secondary)">${p.unit}</span>` : ''}
                        ${p.warranty ? `<span class="badge" style="background:hsl(217,91%,95%);color:hsl(217,91%,35%);font-size:.68rem;padding:1px 5px">🛡️ ${p.warranty}</span>` : ''}
                        ${p.barcode ? `<span class="badge" style="background:var(--bg);border:1px solid var(--border);color:var(--text-secondary);font-size:.68rem;font-family:monospace">||| ${p.barcode}</span>` : ''}
                      </div>
                    </td>
                    <td><span class="mono">${p.sku || '—'}</span></td>
                    <td><span class="mono">${p.hsn || '—'}</span></td>
                    <td>${p.category || '—'}</td>
                    <td><span class="badge badge-primary">${p.gstRate || 0}%</span></td>
                    <td class="text-right">${DB.getRole() === 'staff' ? '<span class="text-muted">🔒 Hidden</span>' : fmtCurrency(p.purchasePrice)}</td>
                    <td class="text-right">
                      <div class="font-bold">${fmtCurrency(p.sellingPrice)}</div>
                      ${p.dealerPrice ? `<div style="font-size:.72rem;color:var(--text-secondary)" title="Wholesale / Technician Rate">Dealer: ${fmtCurrency(p.dealerPrice)}</div>` : ''}
                    </td>
                    <td class="text-right">
                      <span style="font-weight:700;font-size:.95rem">${p.stock}</span>
                      <span style="font-size:.75rem;color:var(--text-secondary)"> / min ${p.reorderLevel}</span>
                    </td>
                    <td><span class="stock-badge ${stockClass}">${stockLabel}</span></td>
                    <td class="action-col">
                      <button class="btn btn-xs btn-secondary" onclick="Inventory.openBarcodeStudio('${p.id}')" title="Print Barcode &amp; Price Tag Stickers"><span class="material-icons" style="font-size:14px">qr_code_2</span></button>
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
        <div class="actions" style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-secondary" onclick="Inventory.openBarcodeStudio()" title="Design and print barcode &amp; price tag stickers for thermal rolls or A4 sheets"><span class="material-icons">qr_code_2</span> Barcode Studio</button>
          <button class="btn btn-secondary" onclick="Inventory.exportCSV()" title="Export entire product catalog to CSV"><span class="material-icons">file_download</span> Export CSV</button>
          <button class="btn btn-secondary" onclick="Inventory.openImportModal()" title="Bulk import products and stock from CSV"><span class="material-icons">file_upload</span> Import CSV</button>
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
          <label>Selling / Retail Price (₹) <span class="required">*</span></label>
          <input id="p-sp" type="number" value="${p?.sellingPrice || ''}" min="0" step="0.01" placeholder="0.00">
        </div>
        <div class="form-group">
          <label>Dealer / Wholesale Price (₹)</label>
          <input id="p-dp" type="number" value="${p?.dealerPrice || ''}" min="0" step="0.01" placeholder="Optional discount rate for installers">
        </div>
        <div class="form-group">
          <label>Purchase / Cost Price (₹)</label>
          <input id="p-pp" type="number" value="${p?.purchasePrice || ''}" min="0" step="0.01" placeholder="0.00">
        </div>
        <div class="form-group">
          <label>Warranty Period</label>
          <select id="p-warranty">
            <option value="No Warranty" ${p?.warranty === 'No Warranty' ? 'selected' : ''}>No Warranty</option>
            <option value="7 Days Replacement" ${p?.warranty === '7 Days Replacement' ? 'selected' : ''}>7 Days Replacement</option>
            <option value="1 Month" ${p?.warranty === '1 Month' ? 'selected' : ''}>1 Month Testing</option>
            <option value="6 Months" ${p?.warranty === '6 Months' ? 'selected' : ''}>6 Months</option>
            <option value="1 Year" ${!p || p?.warranty === '1 Year' ? 'selected' : ''}>1 Year Manufacturer</option>
            <option value="2 Years" ${p?.warranty === '2 Years' ? 'selected' : ''}>2 Years Manufacturer</option>
            <option value="3 Years" ${p?.warranty === '3 Years' ? 'selected' : ''}>3 Years Manufacturer</option>
            <option value="5 Years" ${p?.warranty === '5 Years' ? 'selected' : ''}>5 Years Manufacturer</option>
            <option value="Lifetime" ${p?.warranty === 'Lifetime' ? 'selected' : ''}>Lifetime Limited</option>
          </select>
        </div>
        <div class="form-group">
          <label>Barcode / EAN (Optional)</label>
          <input id="p-barcode" value="${p?.barcode || ''}" placeholder="Scan or enter barcode number" style="font-family:monospace">
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
      barcode: document.getElementById('p-barcode')?.value?.trim() || '',
      hsn, category: document.getElementById('p-cat')?.value || 'Other',
      unit: document.getElementById('p-unit')?.value || 'Nos',
      gstRate: parseFloat(document.getElementById('p-gst')?.value) || 0,
      purchasePrice: parseFloat(document.getElementById('p-pp')?.value) || 0,
      sellingPrice: sp,
      dealerPrice: parseFloat(document.getElementById('p-dp')?.value) || 0,
      warranty: document.getElementById('p-warranty')?.value || '1 Year',
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
    App.toast('Use individual product "Adjust" buttons or use Bulk CSV Import to update quantities', 'info');
  },

  /* ═══════════════════════════════════════════
     BULK CSV IMPORT & EXPORT ENGINE
  ═══════════════════════════════════════════ */
  exportCSV() {
    const products = DB.getProducts();
    if (!products.length) {
      App.toast('No products to export.', 'info');
      return;
    }

    const headers = [
      'Product Name', 'Category', 'HSN/SAC', 'Unit', 'Purchase Rate', 
      'Selling Rate', 'Dealer Rate', 'GST %', 'Stock Quantity', 
      'Reorder Level', 'SKU', 'Barcode', 'Warranty', 'Description'
    ];

    const rows = [headers];
    products.forEach(p => {
      rows.push([
        p.name || '',
        p.category || '',
        p.hsn || '',
        p.unit || 'Nos',
        p.purchasePrice != null ? p.purchasePrice : 0,
        p.sellingPrice != null ? p.sellingPrice : 0,
        p.dealerPrice != null ? p.dealerPrice : 0,
        p.gstRate != null ? p.gstRate : 18,
        p.stock != null ? p.stock : 0,
        p.reorderLevel != null ? p.reorderLevel : 0,
        p.sku || '',
        p.barcode || '',
        p.warranty || '1 Year',
        p.description || ''
      ]);
    });

    const csvContent = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `ShopPulse_Products_${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    App.toast(`Exported ${products.length} products to CSV!`, 'success');
  },

  downloadSampleCSV() {
    const headers = [
      'Product Name', 'Category', 'HSN/SAC', 'Unit', 'Purchase Rate', 
      'Selling Rate', 'Dealer Rate', 'GST %', 'Stock Quantity', 
      'Reorder Level', 'SKU', 'Barcode', 'Warranty', 'Description'
    ];

    const samples = [
      [
        'HP ProBook 450 G10 Laptop (i5/8GB/512GB SSD)',
        'Computers & Laptops',
        '84713010',
        'Nos',
        '54000',
        '62500',
        '58000',
        '18',
        '5',
        '2',
        'HP-PB450-G10',
        '8901234567890',
        '1 Year',
        '15.6 inch FHD, Intel Core i5 13th Gen, 8GB DDR4, 512GB NVMe SSD'
      ],
      [
        'Hikvision 4MP IP Dome Camera',
        'CCTV & Surveillance',
        '85258900',
        'Nos',
        '2800',
        '3600',
        '3100',
        '18',
        '20',
        '5',
        'HKV-4MP-DOME',
        '8901234567891',
        '2 Years',
        '4MP IR Fixed Network Dome Camera with built-in mic'
      ],
      [
        'CAT6 UTP Network Cable (305m Box)',
        'Networking',
        '85444990',
        'Box',
        '5200',
        '6800',
        '6000',
        '18',
        '10',
        '3',
        'CAT6-305M-DLK',
        '8901234567892',
        'No Warranty',
        'Solid Copper 24AWG 4-Pair UTP Cable box'
      ],
      [
        'Kingston 16GB DDR4 3200MHz RAM',
        'Components & Parts',
        '84733020',
        'Nos',
        '2400',
        '3200',
        '2800',
        '18',
        '15',
        '4',
        'KNG-16G-DDR4',
        '8901234567893',
        '3 Years',
        'High speed DDR4 desktop memory module'
      ],
      [
        'Epson EcoTank L3210 All-in-One Ink Tank Printer',
        'Printers & Scanners',
        '84433100',
        'Nos',
        '10500',
        '12999',
        '11800',
        '18',
        '4',
        '1',
        'EPS-L3210',
        '8901234567894',
        '1 Year',
        'Print, Scan, Copy with ultra-low cost per print'
      ],
      [
        'Annual Maintenance Contract (AMC) - Computer Systems',
        'AMC & Services',
        '998314',
        'Job',
        '0',
        '2500',
        '2500',
        '18',
        '0',
        '0',
        'AMC-PC-01',
        '',
        'No Warranty',
        'Preventive maintenance and on-call breakdown IT support'
      ]
    ];

    const rows = [headers, ...samples];
    const csvContent = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ShopPulse_Product_Import_Template.csv';
    a.click();
    URL.revokeObjectURL(url);
    App.toast('Template CSV downloaded!', 'info');
  },

  openImportModal() {
    if (DB.getRole() === 'staff') {
      App.toast('🔒 Staff cannot import inventory. Owner Mode required.', 'error');
      App.toggleRoleModal();
      return;
    }

    App.modal('Import Products & Opening Stock from CSV',
      `
      <div style="padding:6px 0">
        <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg);padding:14px;border-radius:var(--radius-sm);border:1px solid var(--border);margin-bottom:18px">
          <div>
            <div style="font-weight:700;font-size:.9rem;color:var(--text-primary);display:flex;align-items:center;gap:6px">
              <span class="material-icons" style="font-size:18px;color:var(--primary)">description</span>
              Download Sample Import Template
            </div>
            <div style="font-size:.8rem;color:var(--text-secondary);margin-top:2px">
              Includes pre-filled sample rows for Laptops, CCTV Cameras, Cables, RAM, and AMC Services.
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="Inventory.downloadSampleCSV()">
            <span class="material-icons" style="font-size:16px">file_download</span> Download Template (.csv)
          </button>
        </div>

        <div id="import-drop-zone" style="border:2px dashed var(--border);border-radius:var(--radius);padding:32px 20px;text-align:center;background:var(--bg);cursor:pointer;transition:all .2s"
             onclick="document.getElementById('csv-file-input').click()"
             ondragover="event.preventDefault();this.style.borderColor='var(--primary)';this.style.background='hsl(217,91%,98%)'"
             ondragleave="this.style.borderColor='var(--border)';this.style.background='var(--bg)'"
             ondrop="event.preventDefault();this.style.borderColor='var(--border)';this.style.background='var(--bg)';Inventory._handleFileSelect(event.dataTransfer.files[0])">
          <span class="material-icons" style="font-size:44px;color:var(--primary);margin-bottom:8px">cloud_upload</span>
          <div style="font-weight:700;font-size:1rem;color:var(--text-primary);margin-bottom:4px">
            Click to Browse or Drag &amp; Drop CSV File Here
          </div>
          <div style="font-size:.8rem;color:var(--text-secondary)">
            Supports comma-separated <code>.csv</code> files exported from Excel, Google Sheets, or Tally.
          </div>
          <input type="file" id="csv-file-input" accept=".csv,text/csv" style="display:none" onchange="Inventory._handleFileSelect(this.files[0])">
        </div>

        <div style="margin-top:16px;font-size:.8rem;color:var(--text-secondary);line-height:1.5">
          <strong>Required Columns:</strong> <code>Product Name</code>, <code>HSN/SAC</code>, <code>Selling Rate</code>.<br>
          <strong>Optional Columns:</strong> <code>Purchase Rate</code>, <code>Dealer Rate</code>, <code>GST %</code> (defaults to 18%), <code>Stock Quantity</code>, <code>Unit</code> (defaults to Nos), <code>Category</code>, <code>SKU</code>, <code>Barcode</code>, <code>Warranty</code>, <code>Description</code>.
        </div>
      </div>
      `,
      `
      <button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
      `,
      'modal-lg'
    );
  },

  _handleFileSelect(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      App.toast('Please select a valid CSV file (.csv)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const parsedLines = this._parseCSV(text);
        const processed = this._processImportRows(parsedLines);

        if (processed.error) {
          App.toast(processed.error, 'error');
          return;
        }

        if (!processed.results || !processed.results.length) {
          App.toast('No readable data rows found in the CSV file.', 'warning');
          return;
        }

        this._renderImportPreview(processed.results, file.name);
      } catch (err) {
        console.error('CSV Parsing Error:', err);
        App.toast('Failed to parse CSV file: ' + err.message, 'error');
      }
    };
    reader.readAsText(file, 'utf-8');
  },

  _parseCSV(text) {
    if (!text || !text.trim()) return [];
    const lines = [];
    let row = [''];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];

      if (c === '"') {
        if (inQuotes && next === '"') {
          row[row.length - 1] += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        row.push('');
      } else if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && next === '\n') i++;
        if (row.length > 1 || row[0].trim()) {
          lines.push(row);
        }
        row = [''];
      } else {
        row[row.length - 1] += c;
      }
    }
    if (row.length > 1 || row[0].trim()) {
      lines.push(row);
    }
    return lines;
  },

  _mapHeaders(headerRow) {
    const map = {};
    const norm = str => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    headerRow.forEach((col, idx) => {
      const n = norm(col);
      if (['name', 'productname', 'itemname', 'product', 'item'].includes(n)) map.name = idx;
      else if (['category', 'cat', 'group'].includes(n)) map.category = idx;
      else if (['hsn', 'sac', 'hsnsac', 'hsncode', 'saccode'].includes(n)) map.hsn = idx;
      else if (['unit', 'uom', 'measurement', 'measure'].includes(n)) map.unit = idx;
      else if (['purchaserate', 'purchaseprice', 'purchase', 'cost', 'costprice', 'buyingprice'].includes(n)) map.purchasePrice = idx;
      else if (['sellingrate', 'sellingprice', 'selling', 'retail', 'retailrate', 'retailprice', 'price', 'mrp', 'rate'].includes(n)) map.sellingPrice = idx;
      else if (['dealerrate', 'dealerprice', 'dealer', 'wholesale', 'wholesalerate', 'wholesaleprice', 'technician'].includes(n)) map.dealerPrice = idx;
      else if (['gst', 'tax', 'gstpercentage', 'gstrate', 'taxrate', 'gstper'].includes(n)) map.gstRate = idx;
      else if (['stock', 'stockquantity', 'qty', 'quantity', 'openingstock', 'openingqty', 'curstock'].includes(n)) map.stock = idx;
      else if (['reorderlevel', 'reorder', 'minstock', 'alertlevel', 'alert', 'minqty'].includes(n)) map.reorderLevel = idx;
      else if (['sku', 'itemcode', 'code', 'partno', 'partnumber'].includes(n)) map.sku = idx;
      else if (['barcode', 'upc', 'ean'].includes(n)) map.barcode = idx;
      else if (['warranty', 'warrantyperiod', 'guarantee'].includes(n)) map.warranty = idx;
      else if (['description', 'desc', 'specs', 'notes', 'details'].includes(n)) map.description = idx;
    });

    return map;
  },

  _processImportRows(parsedLines) {
    if (parsedLines.length < 2) {
      return { error: 'CSV file contains no data rows.' };
    }

    const headerMap = this._mapHeaders(parsedLines[0]);
    if (headerMap.name == null) {
      return { error: 'Could not find a "Product Name" column. Please verify headers or download sample template.' };
    }

    const existingProducts = DB.getProducts();
    const existingSkuMap = new Map();
    const existingNameMap = new Map();
    existingProducts.forEach(p => {
      if (p.sku) existingSkuMap.set(p.sku.trim().toLowerCase(), p);
      if (p.name) existingNameMap.set(p.name.trim().toLowerCase(), p);
    });

    const results = [];
    for (let i = 1; i < parsedLines.length; i++) {
      const row = parsedLines[i];
      if (!row || row.every(cell => !cell.trim())) continue;

      const getVal = key => (headerMap[key] != null && row[headerMap[key]] != null) ? row[headerMap[key]].trim() : '';

      const rawName = getVal('name');
      const rawHsn = getVal('hsn');
      const rawSP = getVal('sellingPrice');
      const rawPP = getVal('purchasePrice');
      const rawDP = getVal('dealerPrice');
      const rawGst = getVal('gstRate');
      const rawStock = getVal('stock');
      const rawReorder = getVal('reorderLevel');
      const rawSku = getVal('sku');
      const rawBarcode = getVal('barcode');
      const rawUnit = getVal('unit');
      const rawCategory = getVal('category');
      const rawWarranty = getVal('warranty');
      const rawDesc = getVal('description');

      const errors = [];
      if (!rawName) errors.push('Missing Name');
      if (!rawHsn) errors.push('Missing HSN');

      const sp = parseFloat(rawSP);
      if (isNaN(sp) || sp < 0) errors.push('Invalid Selling Rate');

      let gst = parseFloat(rawGst.replace('%', ''));
      if (isNaN(gst) || !GST_RATES.includes(gst)) gst = 18;

      const pp = parseFloat(rawPP) || 0;
      const dp = parseFloat(rawDP) || 0;
      const stock = parseInt(rawStock, 10) || 0;
      const reorder = parseInt(rawReorder, 10) || 0;

      let matchedExisting = null;
      if (rawSku && existingSkuMap.has(rawSku.toLowerCase())) {
        matchedExisting = existingSkuMap.get(rawSku.toLowerCase());
      } else if (rawName && existingNameMap.has(rawName.toLowerCase())) {
        matchedExisting = existingNameMap.get(rawName.toLowerCase());
      }

      const item = {
        id: matchedExisting ? matchedExisting.id : null,
        name: rawName,
        hsn: rawHsn,
        category: rawCategory || (matchedExisting ? matchedExisting.category : 'Computers & Laptops'),
        unit: rawUnit || (matchedExisting ? matchedExisting.unit : 'Nos'),
        sellingPrice: sp || 0,
        purchasePrice: pp,
        dealerPrice: dp,
        gstRate: gst,
        stock: Math.max(0, stock),
        reorderLevel: Math.max(0, reorder),
        sku: rawSku || (matchedExisting ? matchedExisting.sku : ''),
        barcode: rawBarcode || (matchedExisting ? matchedExisting.barcode : ''),
        warranty: rawWarranty || (matchedExisting ? matchedExisting.warranty : '1 Year'),
        description: rawDesc || (matchedExisting ? matchedExisting.description : ''),
        _isExisting: !!matchedExisting,
        _existingName: matchedExisting ? matchedExisting.name : null,
        _existingStock: matchedExisting ? (matchedExisting.stock || 0) : 0,
        _rowNum: i + 1,
        _errors: errors
      };

      results.push(item);
    }

    return { results };
  },

  _renderImportPreview(results, filename) {
    this._importCache = results;
    this._activeImportFilter = 'all';

    const total = results.length;
    const errorsCount = results.filter(r => r._errors.length > 0).length;
    const updateCount = results.filter(r => r._isExisting && r._errors.length === 0).length;
    const newCount = results.filter(r => !r._isExisting && r._errors.length === 0).length;
    const validCount = newCount + updateCount;

    App.modal(`Verify CSV Import — ${filename}`,
      `
      <div style="margin-bottom:14px">
        <!-- Summary Cards -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;margin-bottom:14px">
          <div style="background:var(--bg);padding:10px;border-radius:var(--radius-sm);border:1px solid var(--border);text-align:center">
            <div style="font-size:.75rem;color:var(--text-secondary)">Total Rows</div>
            <div style="font-size:1.3rem;font-weight:800;color:var(--text-primary)">${total}</div>
          </div>
          <div style="background:hsl(142,76%,96%);padding:10px;border-radius:var(--radius-sm);border:1px solid hsl(142,76%,85%);text-align:center">
            <div style="font-size:.75rem;color:hsl(142,76%,30%)">New Items</div>
            <div style="font-size:1.3rem;font-weight:800;color:hsl(142,76%,25%)">${newCount}</div>
          </div>
          <div style="background:hsl(217,91%,96%);padding:10px;border-radius:var(--radius-sm);border:1px solid hsl(217,91%,85%);text-align:center">
            <div style="font-size:.75rem;color:hsl(217,91%,35%)">Updates</div>
            <div style="font-size:1.3rem;font-weight:800;color:hsl(217,91%,30%)">${updateCount}</div>
          </div>
          <div style="background:${errorsCount > 0 ? 'hsl(0,84%,97%)' : 'var(--bg)'};padding:10px;border-radius:var(--radius-sm);border:1px solid ${errorsCount > 0 ? 'hsl(0,84%,85%)' : 'var(--border)'};text-align:center">
            <div style="font-size:.75rem;color:${errorsCount > 0 ? 'hsl(0,84%,35%)' : 'var(--text-secondary)'}">Errors (Skipped)</div>
            <div style="font-size:1.3rem;font-weight:800;color:${errorsCount > 0 ? 'hsl(0,84%,40%)' : 'var(--text-secondary)'}">${errorsCount}</div>
          </div>
        </div>

        <!-- Options row -->
        <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg);padding:10px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);margin-bottom:12px;flex-wrap:wrap;gap:12px">
          <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
            <label style="display:inline-flex;align-items:center;gap:6px;font-size:.85rem;cursor:pointer;margin:0">
              <input type="checkbox" id="imp-opt-update" checked onchange="Inventory._onImportOptionChange()">
              <span>Update existing products matching SKU or Name</span>
            </label>
            <div style="height:18px;width:1px;background:var(--border)"></div>
            <div style="display:inline-flex;align-items:center;gap:12px;font-size:.85rem">
              <span style="color:var(--text-secondary)">Opening Stock:</span>
              <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;margin:0">
                <input type="radio" name="imp-stock-mode" value="set" checked> Set as current stock
              </label>
              <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;margin:0">
                <input type="radio" name="imp-stock-mode" value="add"> Add to existing stock
              </label>
            </div>
          </div>

          <!-- Filter buttons -->
          <div style="display:flex;gap:4px">
            <button class="btn btn-xs btn-primary" id="btn-imp-filter-all" onclick="Inventory._filterImportPreview('all')">All (${total})</button>
            <button class="btn btn-xs btn-secondary" id="btn-imp-filter-new" onclick="Inventory._filterImportPreview('new')">New (${newCount})</button>
            <button class="btn btn-xs btn-secondary" id="btn-imp-filter-update" onclick="Inventory._filterImportPreview('update')">Updates (${updateCount})</button>
            ${errorsCount > 0 ? `<button class="btn btn-xs btn-secondary" id="btn-imp-filter-error" onclick="Inventory._filterImportPreview('error')" style="color:var(--danger)">Errors (${errorsCount})</button>` : ''}
          </div>
        </div>

        <!-- Preview Table -->
        <div class="table-wrap" style="max-height:360px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm)">
          <table class="table" style="font-size:.82rem;margin-bottom:0">
            <thead style="position:sticky;top:0;background:var(--surface);z-index:10;box-shadow:0 1px 2px rgba(0,0,0,0.06)">
              <tr>
                <th style="width:40px">#</th>
                <th>Status</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>HSN</th>
                <th class="text-right">Selling Rate</th>
                <th class="text-right">Purchase Rate</th>
                <th class="text-right">Dealer Rate</th>
                <th>GST%</th>
                <th class="text-right">Opening Stock</th>
                <th>SKU</th>
              </tr>
            </thead>
            <tbody id="import-preview-tbody">
              ${this._buildPreviewTableRows(results, 'all')}
            </tbody>
          </table>
        </div>
      </div>
      `,
      `
      <button class="btn btn-ghost" onclick="Inventory.openImportModal()"><span class="material-icons">arrow_back</span> Select Different File</button>
      <button class="btn btn-primary" id="btn-commit-import" onclick="Inventory._commitImport()" ${validCount === 0 ? 'disabled' : ''}>
        <span class="material-icons">check_circle</span> Commit Import (${validCount} Products)
      </button>
      `,
      'modal-xl'
    );
  },

  _buildPreviewTableRows(results, filterType) {
    const filtered = results.filter(r => {
      if (filterType === 'new') return !r._isExisting && r._errors.length === 0;
      if (filterType === 'update') return r._isExisting && r._errors.length === 0;
      if (filterType === 'error') return r._errors.length > 0;
      return true;
    });

    if (!filtered.length) {
      return `<tr><td colspan="11" class="text-center" style="padding:24px;color:var(--text-secondary)">No items match this filter</td></tr>`;
    }

    return filtered.map(r => {
      const hasError = r._errors.length > 0;
      let badge = '';
      if (hasError) {
        badge = `<span class="badge badge-danger" title="${r._errors.join(', ')}">⚠️ ${r._errors.join(', ')}</span>`;
      } else if (r._isExisting) {
        badge = `<span class="badge" style="background:hsl(217,91%,94%);color:hsl(217,91%,35%)">Update</span>`;
      } else {
        badge = `<span class="badge badge-paid">New Item</span>`;
      }

      return `
        <tr style="${hasError ? 'background:hsl(0,84%,99%)' : ''}">
          <td class="mono" style="color:var(--text-secondary);font-size:.75rem">${r._rowNum}</td>
          <td>${badge}</td>
          <td>
            <div style="font-weight:600;color:var(--text-primary)">${r.name || '<span class="text-danger">Missing</span>'}</div>
            ${r._isExisting ? `<div style="font-size:.7rem;color:var(--text-secondary)">Matches existing: ${r._existingName} (Curr Stock: ${r._existingStock})</div>` : ''}
          </td>
          <td><span style="font-size:.78rem;color:var(--text-secondary)">${r.category}</span></td>
          <td><span class="mono">${r.hsn || '<span class="text-danger">—</span>'}</span></td>
          <td class="text-right font-bold" style="color:var(--primary)">${fmtCurrency(r.sellingPrice)}</td>
          <td class="text-right" style="color:var(--text-secondary)">${fmtCurrency(r.purchasePrice)}</td>
          <td class="text-right" style="color:var(--text-secondary)">${r.dealerPrice ? fmtCurrency(r.dealerPrice) : '—'}</td>
          <td><span class="badge badge-primary">${r.gstRate}%</span></td>
          <td class="text-right"><strong style="font-size:.9rem">${r.stock}</strong> <span style="font-size:.72rem;color:var(--text-secondary)">${r.unit}</span></td>
          <td><span class="mono" style="font-size:.75rem">${r.sku || '—'}</span></td>
        </tr>
      `;
    }).join('');
  },

  _filterImportPreview(filterType) {
    this._activeImportFilter = filterType;
    ['all', 'new', 'update', 'error'].forEach(type => {
      const btn = document.getElementById(`btn-imp-filter-${type}`);
      if (btn) {
        btn.className = `btn btn-xs ${type === filterType ? 'btn-primary' : 'btn-secondary'}`;
      }
    });

    const tbody = document.getElementById('import-preview-tbody');
    if (tbody && this._importCache) {
      tbody.innerHTML = this._buildPreviewTableRows(this._importCache, filterType);
    }
  },

  _onImportOptionChange() {
    const updateChecked = document.getElementById('imp-opt-update')?.checked;
    const validCount = this._importCache ? this._importCache.filter(r => {
      if (r._errors.length > 0) return false;
      if (!updateChecked && r._isExisting) return false;
      return true;
    }).length : 0;

    const commitBtn = document.getElementById('btn-commit-import');
    if (commitBtn) {
      commitBtn.disabled = validCount === 0;
      commitBtn.innerHTML = `<span class="material-icons">check_circle</span> Commit Import (${validCount} Products)`;
    }
  },

  _commitImport() {
    if (!this._importCache || !this._importCache.length) return;

    const updateExisting = document.getElementById('imp-opt-update')?.checked !== false;
    const stockModeRadio = document.querySelector('input[name="imp-stock-mode"]:checked');
    const isAddStock = stockModeRadio ? stockModeRadio.value === 'add' : false;

    // Filter items to save
    const itemsToSave = [];
    let addedCount = 0;
    let updatedCount = 0;
    const today = new Date().toISOString().split('T')[0];

    this._importCache.forEach(r => {
      if (r._errors.length > 0) return; // Skip invalid rows
      if (r._isExisting && !updateExisting) return; // Skip existing if user unchecked update option

      const itemData = {
        name: r.name,
        hsn: r.hsn,
        category: r.category,
        unit: r.unit,
        sellingPrice: r.sellingPrice,
        purchasePrice: r.purchasePrice,
        dealerPrice: r.dealerPrice,
        gstRate: r.gstRate,
        reorderLevel: r.reorderLevel,
        sku: r.sku,
        barcode: r.barcode,
        warranty: r.warranty,
        description: r.description
      };

      if (r._isExisting && r.id) {
        itemData.id = r.id;
        itemData.stock = isAddStock ? (r._existingStock + r.stock) : r.stock;
        updatedCount++;
      } else {
        itemData.stock = r.stock;
        addedCount++;
      }

      itemsToSave.push(itemData);
    });

    if (!itemsToSave.length) {
      App.toast('No valid products to import.', 'warning');
      return;
    }

    // Bulk save products to database
    DB.saveProductsBulk(itemsToSave);

    // Record stock movements for products with stock
    itemsToSave.forEach(p => {
      if (p.stock > 0) {
        DB._addMov({
          productId: p.id,
          type: 'in',
          qty: p.stock,
          reference: 'CSV-IMPORT',
          date: today,
          note: `Bulk CSV Import: Initial / Opening Stock (${p.stock} ${p.unit || 'Nos'})`
        });
      }
    });

    // Auto backup snapshot
    DB.saveSnapshot(`Bulk CSV Import (${itemsToSave.length} Products)`);

    App.closeModal();
    App.toast(`🎉 Successfully imported ${itemsToSave.length} products (${addedCount} added, ${updatedCount} updated)!`, 'success');
    App.refreshSidebar();
    Inventory.render(document.getElementById('page-content'));
  },

  /* ─────────────────────────────────────────────
     Barcode & Price Tag Studio (Thermal & A4)
  ───────────────────────────────────────────── */
  openBarcodeStudio(productId = null) {
    const products = DB.getProducts();
    const biz = DB.getBiz();
    const selectedProd = productId ? DB.getProductById(productId) : (products[0] || null);

    const initialTitle = selectedProd ? selectedProd.name : '';
    const initialBarcode = selectedProd ? (selectedProd.barcode || selectedProd.sku || genBarcodeEAN()) : genBarcodeEAN();
    const initialPrice = selectedProd ? (selectedProd.sellingPrice || 0) : '';
    const initialWarranty = selectedProd ? (selectedProd.warranty || '1 Year') : '1 Year';
    const initialCopies = selectedProd ? Math.max(1, Math.min(100, selectedProd.stock || 24)) : 24;

    const bodyHtml = `
      <div style="display:grid;grid-template-columns:1.2fr 0.8fr;gap:20px;align-items:start">
        <!-- Controls Column -->
        <div>
          <div class="form-group" style="margin-bottom:12px">
            <label style="font-weight:700;font-size:.85rem">Select Product</label>
            <select id="bc-product-sel" class="form-control" onchange="Inventory._onBarcodeProdChange(this)">
              <option value="">-- Custom / Manual Item --</option>
              ${products.map(p => `<option value="${p.id}" ${selectedProd && selectedProd.id === p.id ? 'selected' : ''}>${p.name} (Stock: ${p.stock})</option>`).join('')}
            </select>
          </div>

          <div class="form-group" style="margin-bottom:12px">
            <label style="font-weight:700;font-size:.85rem">Product Name / Title</label>
            <input type="text" id="bc-title" class="form-control" value="${initialTitle.replace(/"/g, '&quot;')}" oninput="Inventory._renderBarcodePreview()">
          </div>

          <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end;margin-bottom:12px">
            <div class="form-group" style="margin:0">
              <label style="font-weight:700;font-size:.85rem">Barcode / SKU (Code 128 / EAN)</label>
              <input type="text" id="bc-barcode" class="form-control" value="${initialBarcode.replace(/"/g, '&quot;')}" oninput="Inventory._renderBarcodePreview()">
            </div>
            <button type="button" class="btn btn-secondary" onclick="Inventory._generateNewBarcodeForStudio()" title="Generate Random Indian 12-digit EAN Barcode" style="height:38px;padding:0 12px">
              🎲 Auto EAN
            </button>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div class="form-group" style="margin:0">
              <label style="font-weight:700;font-size:.85rem">Selling Price (₹)</label>
              <input type="number" id="bc-price" class="form-control" value="${initialPrice}" min="0" step="1" oninput="Inventory._renderBarcodePreview()">
            </div>
            <div class="form-group" style="margin:0">
              <label style="font-weight:700;font-size:.85rem">Warranty / Subtext</label>
              <input type="text" id="bc-warranty" class="form-control" value="${initialWarranty.replace(/"/g, '&quot;')}" oninput="Inventory._renderBarcodePreview()">
            </div>
          </div>

          <div class="form-group" style="margin-bottom:12px">
            <label style="font-weight:700;font-size:.85rem">Printer Layout</label>
            <select id="bc-layout" class="form-control" onchange="Inventory._renderBarcodePreview()">
              <option value="thermal_50x25">🏷️ 50mm × 25mm Thermal Roll (2" × 1" — TVS / TSC / Zebra / Xprinter)</option>
              <option value="a4_24">📄 A4 Sheet — 24 Labels (3 cols × 8 rows, 70 × 37mm)</option>
              <option value="a4_48">📄 A4 Sheet — 48 Mini Labels (4 cols × 12 rows, 48.5 × 25.4mm)</option>
              <option value="qr_35x35">🔳 35mm × 35mm 2D QR Code Sticker</option>
            </select>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
            <div class="form-group" style="margin:0">
              <label style="font-weight:700;font-size:.85rem">Label Copies</label>
              <input type="number" id="bc-copies" class="form-control" value="${initialCopies}" min="1" max="1000">
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;justify-content:center;padding-top:14px">
              <label style="display:flex;align-items:center;gap:6px;font-size:.82rem;cursor:pointer">
                <input type="checkbox" id="bc-show-shop" checked onchange="Inventory._renderBarcodePreview()"> Include Shop Name
              </label>
              <label style="display:flex;align-items:center;gap:6px;font-size:.82rem;cursor:pointer">
                <input type="checkbox" id="bc-show-price" checked onchange="Inventory._renderBarcodePreview()"> Include Price Tag
              </label>
            </div>
          </div>
        </div>

        <!-- Live Visual Preview Column -->
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:16px;text-align:center">
          <div style="font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);margin-bottom:12px">
            Live Sticker Preview
          </div>
          <div id="bc-preview-box" style="display:flex;justify-content:center;align-items:center;min-height:160px;margin-bottom:12px">
            <!-- Rendered by _renderBarcodePreview() -->
          </div>
          <div style="font-size:.75rem;color:var(--text-secondary);line-height:1.4">
            Supports all thermal sticker barcode printers (ESC/POS &amp; TSPL) and standard desktop laser/inkjet A4 label sheets.
          </div>
          <div id="bc-save-btn-wrap" style="margin-top:12px">
            ${selectedProd ? `
            <button type="button" class="btn btn-xs btn-secondary" onclick="Inventory._saveBarcodeToSelectedProduct()">
              💾 Save Barcode to Product Record
            </button>` : ''}
          </div>
        </div>
      </div>
    `;

    App.modal('🏷️ Barcode & Price Tag Studio', bodyHtml, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
      <button class="btn btn-primary" onclick="Inventory.printBarcodeSheet()">
        <span class="material-icons" style="font-size:16px">print</span> Print Label Sheet
      </button>
    `, 'modal-lg');

    setTimeout(() => this._renderBarcodePreview(), 50);
  },

  _getBarcodeStudioConfig() {
    const biz = DB.getBiz();
    return {
      title: document.getElementById('bc-title')?.value.trim() || 'Sample Product',
      barcode: document.getElementById('bc-barcode')?.value.trim() || '890100100001',
      price: document.getElementById('bc-price')?.value.trim() || '',
      warranty: document.getElementById('bc-warranty')?.value.trim() || '',
      shopName: biz.name || 'ShopPulse Electronics',
      showShopName: document.getElementById('bc-show-shop')?.checked ?? true,
      showPrice: document.getElementById('bc-show-price')?.checked ?? true,
      layout: document.getElementById('bc-layout')?.value || 'thermal_50x25',
      copies: parseInt(document.getElementById('bc-copies')?.value, 10) || 1
    };
  },

  _renderBarcodePreview() {
    const box = document.getElementById('bc-preview-box');
    if (!box) return;
    const cfg = this._getBarcodeStudioConfig();
    const isQR = cfg.layout === 'qr_35x35';

    let graphic = '';
    if (isQR) {
      const qrData = genUPIQrDataUrl(cfg.barcode || cfg.title, 4);
      graphic = qrData ? `<img src="${qrData}" style="width:75px;height:75px;object-fit:contain;margin:4px auto;display:block">` : `<div style="font-size:10px;color:#999;padding:15px">QR Generator Ready</div>`;
    } else {
      graphic = generateBarcodeSVG(cfg.barcode, 34, 1.4);
    }

    box.innerHTML = `
      <div style="background:#fff;color:#000;border:1px solid #999;box-shadow:0 3px 8px rgba(0,0,0,0.12);border-radius:4px;padding:8px 12px;width:240px;box-sizing:border-box;text-align:center">
        ${cfg.showShopName && cfg.shopName ? `<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#222;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${cfg.shopName}</div>` : ''}
        <div style="font-size:11px;font-weight:700;line-height:1.2;margin:2px 0 4px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${cfg.title}</div>
        <div style="margin:4px 0">
          ${graphic}
          <div style="font-family:monospace;font-size:9px;font-weight:600;letter-spacing:1px;margin-top:2px">${cfg.barcode}</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;padding-top:4px;border-top:1px dashed #ccc">
          ${cfg.showPrice && cfg.price ? `<div style="font-size:12px;font-weight:900;color:#000">₹${cfg.price}</div>` : '<div></div>'}
          ${cfg.warranty ? `<div style="font-size:9px;font-weight:600;color:#555">${cfg.warranty}</div>` : ''}
        </div>
      </div>
    `;
  },

  _onBarcodeProdChange(sel) {
    const saveWrap = document.getElementById('bc-save-btn-wrap');
    if (!sel || !sel.value) {
      if (saveWrap) saveWrap.innerHTML = '';
      return;
    }
    const p = DB.getProductById(sel.value);
    if (!p) return;
    const titleInput = document.getElementById('bc-title');
    const barcodeInput = document.getElementById('bc-barcode');
    const priceInput = document.getElementById('bc-price');
    const warrantyInput = document.getElementById('bc-warranty');
    const copiesInput = document.getElementById('bc-copies');

    if (titleInput) titleInput.value = p.name || '';
    if (barcodeInput) barcodeInput.value = p.barcode || p.sku || genBarcodeEAN();
    if (priceInput) priceInput.value = p.sellingPrice || 0;
    if (warrantyInput) warrantyInput.value = p.warranty || '1 Year';
    if (copiesInput) copiesInput.value = Math.max(1, Math.min(100, p.stock || 24));

    if (saveWrap) {
      saveWrap.innerHTML = `
        <button type="button" class="btn btn-xs btn-secondary" onclick="Inventory._saveBarcodeToSelectedProduct()">
          💾 Save Barcode to Product Record
        </button>
      `;
    }

    this._renderBarcodePreview();
  },

  _generateNewBarcodeForStudio() {
    const input = document.getElementById('bc-barcode');
    if (input) {
      input.value = genBarcodeEAN();
      this._renderBarcodePreview();
    }
  },

  _saveBarcodeToSelectedProduct() {
    const sel = document.getElementById('bc-product-sel');
    if (!sel || !sel.value) {
      App.toast('Select a product to update its barcode.', 'warning');
      return;
    }
    const p = DB.getProductById(sel.value);
    if (!p) return;
    const barcode = (document.getElementById('bc-barcode')?.value || '').trim();
    if (!barcode) {
      App.toast('Barcode cannot be empty.', 'warning');
      return;
    }
    p.barcode = barcode;
    DB.saveProduct(p);
    App.toast(`✅ Barcode "${barcode}" saved to ${p.name}!`, 'success');
  },

  generateBarcodeSheetHtml(config) {
    const {
      title,
      barcode,
      price,
      warranty,
      shopName,
      showShopName,
      showPrice,
      layout,
      copies
    } = config;

    const isQR = layout === 'qr_35x35';
    let codeGraphic = '';
    if (isQR) {
      const qrDataUrl = genUPIQrDataUrl(barcode || title, 4);
      codeGraphic = `<img src="${qrDataUrl}" style="width:24mm;height:24mm;object-fit:contain;margin:0 auto;display:block">`;
    } else {
      const svgHeight = layout === 'a4_48' ? 22 : 28;
      const svgWidth = layout === 'a4_48' ? 1.2 : 1.5;
      codeGraphic = generateBarcodeSVG(barcode || '000000', svgHeight, svgWidth);
    }

    const singleStickerHtml = `
      <div class="sticker sticker-${layout}">
        ${showShopName && shopName ? `<div class="sticker-shop">${shopName}</div>` : ''}
        <div class="sticker-title">${title}</div>
        <div class="sticker-code-wrap">
          ${codeGraphic}
          <div class="sticker-code-num">${barcode}</div>
        </div>
        <div class="sticker-footer">
          ${showPrice && price ? `<div class="sticker-price">₹${price}</div>` : '<div></div>'}
          ${warranty ? `<div class="sticker-warranty">${warranty}</div>` : ''}
        </div>
      </div>
    `;

    const stickers = Array(copies).fill(singleStickerHtml).join('\n');

    let pageStyles = '';
    if (layout === 'thermal_50x25') {
      pageStyles = `
        @page {
          size: 50mm 25mm;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          background: #fff;
          color: #000;
        }
        .sheet {
          display: block;
        }
        .sticker-thermal_50x25 {
          width: 50mm;
          height: 25mm;
          box-sizing: border-box;
          padding: 1.5mm 2mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: center;
          page-break-after: always;
          overflow: hidden;
        }
        .sticker-shop {
          font-size: 7pt;
          font-weight: 800;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.1;
        }
        .sticker-title {
          font-size: 7.5pt;
          font-weight: 700;
          line-height: 1.1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sticker-code-wrap {
          margin: 0.5mm 0;
        }
        .sticker-code-num {
          font-size: 6pt;
          font-family: monospace;
          font-weight: 600;
          letter-spacing: 1px;
        }
        .sticker-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          line-height: 1;
        }
        .sticker-price {
          font-size: 8pt;
          font-weight: 900;
        }
        .sticker-warranty {
          font-size: 6pt;
          font-weight: 600;
          color: #333;
        }
      `;
    } else if (layout === 'a4_24') {
      pageStyles = `
        @page {
          size: A4 portrait;
          margin: 8mm 6mm;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          background: #fff;
          color: #000;
        }
        .sheet {
          display: grid;
          grid-template-columns: repeat(3, 68mm);
          grid-auto-rows: 35mm;
          gap: 2mm 3mm;
          justify-content: center;
        }
        .sticker-a4_24 {
          width: 68mm;
          height: 35mm;
          box-sizing: border-box;
          padding: 2mm 3mm;
          border: 1px dashed #e0e0e0;
          border-radius: 3px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: center;
          overflow: hidden;
          page-break-inside: avoid;
        }
        @media print {
          .sticker-a4_24 { border: 1px solid transparent; }
        }
        .sticker-shop {
          font-size: 7.5pt;
          font-weight: 800;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sticker-title {
          font-size: 8.5pt;
          font-weight: 700;
          line-height: 1.15;
          max-height: 2.3em;
          overflow: hidden;
        }
        .sticker-code-wrap {
          margin: 1mm 0;
        }
        .sticker-code-num {
          font-size: 6.5pt;
          font-family: monospace;
          font-weight: 600;
          letter-spacing: 1px;
        }
        .sticker-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1mm;
          border-top: 0.5px solid #eee;
        }
        .sticker-price {
          font-size: 9.5pt;
          font-weight: 900;
        }
        .sticker-warranty {
          font-size: 7pt;
          font-weight: 600;
          color: #444;
        }
      `;
    } else if (layout === 'a4_48') {
      pageStyles = `
        @page {
          size: A4 portrait;
          margin: 6mm 4mm;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          background: #fff;
          color: #000;
        }
        .sheet {
          display: grid;
          grid-template-columns: repeat(4, 48.5mm);
          grid-auto-rows: 23.5mm;
          gap: 1.5mm 1.5mm;
          justify-content: center;
        }
        .sticker-a4_48 {
          width: 48.5mm;
          height: 23.5mm;
          box-sizing: border-box;
          padding: 1mm 1.5mm;
          border: 1px dashed #e0e0e0;
          border-radius: 2px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: center;
          overflow: hidden;
          page-break-inside: avoid;
        }
        @media print {
          .sticker-a4_48 { border: 1px solid transparent; }
        }
        .sticker-shop {
          font-size: 6pt;
          font-weight: 800;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sticker-title {
          font-size: 6.5pt;
          font-weight: 700;
          line-height: 1.1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sticker-code-wrap {
          margin: 0.5mm 0;
        }
        .sticker-code-num {
          font-size: 5.5pt;
          font-family: monospace;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .sticker-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .sticker-price {
          font-size: 7pt;
          font-weight: 900;
        }
        .sticker-warranty {
          font-size: 5.5pt;
          font-weight: 600;
          color: #444;
        }
      `;
    } else {
      pageStyles = `
        @page {
          size: 35mm 35mm;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          background: #fff;
          color: #000;
        }
        .sheet {
          display: block;
        }
        .sticker-qr_35x35 {
          width: 35mm;
          height: 35mm;
          box-sizing: border-box;
          padding: 1.5mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          text-align: center;
          page-break-after: always;
          overflow: hidden;
        }
        .sticker-shop {
          font-size: 6.5pt;
          font-weight: 800;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        .sticker-title {
          font-size: 6.5pt;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        .sticker-footer {
          font-size: 7.5pt;
          font-weight: 900;
        }
      `;
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} - Barcode Labels</title>
  <style>
    ${pageStyles}
  </style>
</head>
<body>
  <div class="sheet">
    ${stickers}
  </div>
</body>
</html>`;
  },

  printBarcodeSheet() {
    const config = this._getBarcodeStudioConfig();
    if (!config.title) {
      App.toast('Please enter or select a product title', 'warning');
      return;
    }
    if (!config.barcode) {
      App.toast('Please provide a barcode or generate one', 'warning');
      return;
    }

    const html = this.generateBarcodeSheetHtml(config);
    const title = `${config.barcode}_Labels_${config.layout}`;

    // 1. Electron desktopApp print bridge
    if (window.desktopApp && typeof window.desktopApp.printHtml === 'function') {
      window.desktopApp.printHtml({ html, title });
      return;
    }

    // 2. Web popup print fallback
    try {
      const w = window.open('', '_blank');
      if (w) {
        w.document.open();
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => {
          w.print();
        }, 300);
      }
    } catch (err) {
      console.error('Print popup error:', err);
      App.toast('Popup blocked. Please allow popups to print barcode sheets.', 'error');
    }
  }
};
