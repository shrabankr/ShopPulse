'use strict';

/* ─────────────────────────────────────────────
   Billing Module — Sales Invoices & Purchase Bills
───────────────────────────────────────────── */
const Billing = {

  /* ═══════════════════════════════════════════
     LIST VIEW
  ═══════════════════════════════════════════ */
  render(container, type = 'sales') {
    const isSales = type === 'sales';
    const docs = isSales ? DB.getSales() : DB.getPurchases();
    this._renderList(container, docs, type);
  },

  _renderList(container, docs, type) {
    const isSales = type === 'sales';
    const filters = ['all', 'paid', 'unpaid', 'overdue', 'sent', 'draft'];
    const filterCounts = {};
    filters.forEach(f => { filterCounts[f] = f === 'all' ? docs.length : docs.filter(d => d.status === f).length; });

    let activeFilter = 'all';
    let search = '';

    const render = () => {
      const filtered = docs.filter(d => {
        const matchFilter = activeFilter === 'all' || d.status === activeFilter;
        const term = search.toLowerCase();
        const matchSearch = !term || (isSales
          ? (d.invoiceNo + d.customerName + (d.customerGstin || '')).toLowerCase().includes(term)
          : (d.billNo + d.supplierName + (d.supplierGstin || '')).toLowerCase().includes(term));
        return matchFilter && matchSearch;
      }).sort((a, b) => new Date(b.date) - new Date(a.date));

      const total = filtered.reduce((s, d) => s + d.total, 0);
      const paidTotal = filtered.filter(d => d.status === 'paid').reduce((s, d) => s + d.total, 0);
      const unpaidTotal = filtered.filter(d => d.status !== 'paid').reduce((s, d) => s + d.total, 0);

      const tbody = container.querySelector('#bill-tbody');
      if (!tbody) return;

      const summary = container.querySelector('#bill-summary');
      if (summary) {
        summary.innerHTML = `
          <span>Total: <strong>${fmtCurrency(total)}</strong></span>
          <span class="text-success" style="margin-left:16px">Paid: <strong>${fmtCurrency(paidTotal)}</strong></span>
          <span class="text-danger" style="margin-left:16px">Pending: <strong>${fmtCurrency(unpaidTotal)}</strong></span>`;
      }

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8"><div class="table-empty"><span class="material-icons">${isSales ? 'receipt_long' : 'shopping_bag'}</span><p>No ${type === 'sales' ? 'invoices' : 'bills'} found</p><button class="btn btn-primary btn-sm" onclick="Billing.openNew('${type}')"><span class="material-icons">add</span> Create ${isSales ? 'Invoice' : 'Bill'}</button></div></td></tr>`;
        return;
      }

      tbody.innerHTML = filtered.map(d => {
        const isSalesDoc = isSales;
        const no = isSalesDoc ? d.invoiceNo : d.billNo;
        const party = isSalesDoc ? d.customerName : d.supplierName;
        const gstin = isSalesDoc ? d.customerGstin : d.supplierGstin;
        const taxType = d.isIntra ? 'CGST+SGST' : 'IGST';
        const today = new Date();
        const due = new Date(d.dueDate);
        const isOverdueStyle = d.status === 'overdue' || (d.status !== 'paid' && due < today);

        const paidAmount = DB.getDocPaidAmount(d);
        const dueAmount = DB.getDocDueAmount(d);
        let statusBadge = `<span class="badge badge-${d.status}">${d.status.charAt(0).toUpperCase() + d.status.slice(1)}</span>`;
        if (d.status === 'partial') {
          statusBadge = `<span class="badge badge-partial" title="Paid: ${fmtCurrency(paidAmount)}">Partial (${fmtCurrency(paidAmount)})</span>`;
        }

        return `
          <tr onclick="Billing.viewDoc('${d.id}','${type}')" style="cursor:pointer">
            <td><span class="mono">${no}</span></td>
            <td>
              <div style="font-weight:600;font-size:.875rem">${party}</div>
              ${gstin ? `<div style="font-size:.72rem;color:var(--text-secondary);font-family:monospace">${gstin}</div>` : '<div style="font-size:.72rem;color:var(--text-tertiary)">Unregistered</div>'}
            </td>
            <td style="white-space:nowrap">${fmtDate(d.date)}</td>
            <td style="white-space:nowrap;${isOverdueStyle ? 'color:var(--danger)' : ''}">${fmtDate(d.dueDate)}</td>
            <td class="text-right">
              <div class="amount-cell">${fmtCurrency(d.total)}</div>
              ${d.status === 'partial' ? `<div style="font-size:.72rem;color:var(--danger);font-weight:700">Due: ${fmtCurrency(dueAmount)}</div>` : `<div class="tax-cell">${taxType}: ${fmtCurrency(d.totalTax || 0)}</div>`}
            </td>
            <td>${statusBadge}</td>
            <td class="action-col" onclick="event.stopPropagation()">
              <button class="btn btn-xs btn-secondary" onclick="Billing.viewDoc('${d.id}','${type}')" title="View Details"><span class="material-icons" style="font-size:14px">visibility</span></button>
              <button class="btn btn-xs btn-secondary" onclick="Billing.printDoc('${d.id}','${type}')" title="Print Invoice"><span class="material-icons" style="font-size:14px">print</span></button>
              <button class="btn btn-xs btn-secondary" onclick="Billing.shareWhatsApp('${d.id}','${type}')" title="Share WhatsApp"><span class="material-icons" style="font-size:14px;color:#25d366">chat</span></button>
              ${d.status !== 'paid' ? `<button class="btn btn-xs btn-success" onclick="Billing.markPaid('${d.id}','${type}')" title="Record / Manage Payment"><span class="material-icons" style="font-size:14px">add_card</span></button>` : ''}
              ${DB.getRole() !== 'staff' ? `<button class="btn btn-xs btn-ghost" onclick="Billing.deleteDoc('${d.id}','${type}')" title="Delete"><span class="material-icons" style="font-size:14px;color:var(--danger)">delete</span></button>` : ''}
            </td>
          </tr>`;
      }).join('');
    };

    container.innerHTML = `
      <div class="page-header-row">
        <h2>${isSales ? 'Sales Invoices' : 'Purchase Bills'}</h2>
        <div class="actions">
          <button class="btn btn-primary" onclick="Billing.openNew('${type}')"><span class="material-icons">add</span> New ${isSales ? 'Invoice' : 'Bill'}</button>
        </div>
      </div>

      <div class="invoice-list-header">
        <div class="tabs" id="status-tabs">
          ${['all', 'paid', 'unpaid', 'overdue', 'sent'].map(f => `
            <button class="tab-btn ${f === 'all' ? 'active' : ''}" onclick="document.querySelectorAll('#status-tabs .tab-btn').forEach(b=>b.classList.remove('active'));this.classList.add('active');window._bf='${f}';window._bf_render()">
              ${f.charAt(0).toUpperCase() + f.slice(1)}
              <span class="tab-count">${filterCounts[f]}</span>
            </button>`).join('')}
        </div>
      </div>

      <div class="filter-bar">
        <div class="search-box">
          <span class="material-icons">search</span>
          <input id="bill-search" placeholder="Search by ${isSales ? 'invoice no, customer, GSTIN' : 'bill no, supplier, GSTIN'}…" oninput="window._bs=this.value;window._bf_render()">
        </div>
        <div id="bill-summary" style="font-size:.84rem;color:var(--text-secondary);white-space:nowrap"></div>
      </div>

      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>${isSales ? 'Invoice No' : 'Bill No'}</th>
              <th>${isSales ? 'Customer' : 'Supplier'}</th>
              <th>Date</th>
              <th>Due Date</th>
              <th class="text-right">Amount / Tax</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="bill-tbody"></tbody>
        </table>
      </div>
    `;

    window._bf = 'all';
    window._bs = '';
    window._bf_render = () => { activeFilter = window._bf; search = window._bs; render(); };
    render();
  },

  /* ═══════════════════════════════════════════
     NEW / EDIT INVOICE FORM
  ═══════════════════════════════════════════ */
  openNew(type = 'sales') {
    const limits = DB.getTrialLimits();
    if (limits.isTrial && !limits.canCreateBill) {
      if (limits.isExpired) {
        App.toast('⏳ Your 60-day free trial has expired. Please activate your license to continue billing.', 'warning');
      } else {
        App.toast(`⏳ Trial Limit Reached: Maximum ${limits.maxTotalBills} bills (30 clean + 50 trial). Please activate your license to create more invoices.`, 'warning');
      }
      App.openLicenseModal();
      return;
    }
    this._openForm(null, type);
  },

  _openForm(existingDoc, type) {
    const isSales = type === 'sales';
    const biz = DB.getBiz();
    const parties = isSales ? DB.getCustomers() : DB.getSuppliers();
    const products = DB.getProducts();
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + (biz.defaultPaymentTerms || 30) * 86400000).toISOString().split('T')[0];

    const stateOpts = INDIAN_STATES.map(s => `<option value="${s.code}">${s.name}</option>`).join('');
    const partyOpts = parties.map(p => `<option value="${p.id}">${p.name}${p.gstin ? ' — ' + p.gstin : ''}</option>`).join('');
    const gstOpts = GST_RATES.map(r => `<option value="${r}">${r}%</option>`).join('');
    const unitOpts = UNITS.map(u => `<option>${u}</option>`).join('');
    const productOpts = products.map(p => `<option value="${p.id}" data-rate="${p.sellingPrice}" data-hsn="${p.hsn}" data-gst="${p.gstRate}" data-unit="${p.unit}">${p.name} (${p.sku})</option>`).join('');

    const doc = existingDoc;
    const items = doc ? doc.items : [{ productId: '', name: '', hsn: '', unit: 'Nos', qty: 1, rate: 0, discount: 0, gstRate: 18 }];

    App.modal(doc ? `Edit ${isSales ? 'Invoice' : 'Bill'}` : `New ${isSales ? 'Sales Invoice' : 'Purchase Bill'}`,
      `
      <div id="invoice-form">
        <!-- Invoice Meta -->
        <div class="invoice-section-title"><span class="material-icons">receipt</span> Invoice Details</div>
        <div class="form-grid" style="margin-bottom:20px">
          <div class="form-group">
            <label>Invoice No <span class="required">*</span></label>
            <input id="if-no" value="${doc ? (isSales ? doc.invoiceNo : doc.billNo) : '(Auto-generated)'}" ${doc ? '' : 'readonly style="background:var(--bg);color:var(--text-secondary)"'}>
          </div>
          <div class="form-group">
            <label>Date <span class="required">*</span></label>
            <input id="if-date" type="date" value="${doc ? doc.date : today}">
          </div>
          <div class="form-group">
            <label>Due Date</label>
            <input id="if-due" type="date" value="${doc ? doc.dueDate : dueDate}">
          </div>
          <div class="form-group">
            <label>Place of Supply <span class="required">*</span></label>
            <select id="if-pos">${stateOpts}</select>
          </div>
          <div class="form-group">
            <label>Reverse Charge</label>
            <select id="if-rc"><option value="false">No</option><option value="true">Yes</option></select>
          </div>
        </div>

        <!-- Party Selection -->
        <div class="invoice-section-title" style="display:flex;justify-content:space-between;align-items:center">
          <span><span class="material-icons">person</span>${isSales ? 'Bill To (Customer)' : 'Bill From (Supplier)'}</span>
          <button type="button" class="btn btn-xs btn-secondary" onclick="Billing.toggleQuickParty(true)" style="display:inline-flex;align-items:center;gap:4px">
            <span class="material-icons" style="font-size:14px">person_add</span> + New ${isSales ? 'Customer' : 'Supplier'}
          </button>
        </div>
        <div class="form-grid" style="margin-bottom:12px">
          <div class="form-group form-full autocomplete-wrap">
            <div style="display:flex;gap:8px">
              <select id="if-party" onchange="Billing._onPartyChange()" style="flex:1">
                <option value="">— Select ${isSales ? 'Customer' : 'Supplier'} —</option>
                <option value="__NEW__" style="font-weight:700;color:var(--primary)">➕ + Add New ${isSales ? 'Customer' : 'Supplier'}...</option>
                ${partyOpts}
              </select>
              <button type="button" class="btn btn-secondary btn-sm" onclick="Billing.toggleQuickParty(true)" title="Create New ${isSales ? 'Customer' : 'Supplier'}">
                <span class="material-icons" style="font-size:16px">person_add</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Inline Quick Add Party Drawer -->
        <div id="quick-party-drawer" style="display:none;margin-bottom:16px;padding:14px;background:var(--primary-light);border:1px solid hsl(221,60%,85%);border-radius:var(--radius)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <strong style="color:var(--primary-dark);font-size:.9rem"><span class="material-icons" style="font-size:16px;vertical-align:middle">person_add</span> Quick Add ${isSales ? 'Customer' : 'Supplier'}</strong>
            <button type="button" class="btn btn-xs btn-ghost" onclick="Billing.toggleQuickParty(false)">✕ Close</button>
          </div>
          <div class="form-grid" style="margin-bottom:10px">
            <div class="form-group form-full">
              <label>${isSales ? 'Customer' : 'Supplier'} Name <span class="required">*</span></label>
              <input id="qp-name" placeholder="e.g. Acme Enterprises or Rahul Sharma">
            </div>
            <div class="form-group">
              <label>Phone / Mobile</label>
              <input id="qp-phone" placeholder="98XXXXXXXX">
            </div>
            <div class="form-group">
              <label>GSTIN (Optional)</label>
              <input id="qp-gstin" placeholder="27AAAAA0000A1Z5" maxlength="15" style="text-transform:uppercase;font-family:monospace">
            </div>
            <div class="form-group">
              <label>State</label>
              <select id="qp-state">${stateOpts}</select>
            </div>
            <div class="form-group">
              <label>City / Location</label>
              <input id="qp-city" placeholder="e.g. Pune">
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:8px">
            <button type="button" class="btn btn-sm btn-ghost" onclick="Billing.toggleQuickParty(false)">Cancel</button>
            <button type="button" class="btn btn-sm btn-primary" onclick="Billing.saveQuickParty()"><span class="material-icons">check</span> Save &amp; Select</button>
          </div>
        </div>
        <div class="invoice-parties-grid" id="party-preview">
          ${isSales ? `
          <div class="invoice-party-box">
            <h4>From (Seller / Supplier)</h4>
            <div class="party-detail-name">${biz.name}</div>
            <div class="party-detail-line">${biz.address}${biz.city ? ', ' + biz.city : ''}${biz.pincode ? ' — ' + biz.pincode : ''}</div>
            <div class="party-detail-gstin">GSTIN: ${biz.gstin || 'Not Set'}</div>
          </div>
          <div class="invoice-party-box" id="buyer-preview">
            <h4>To (Buyer / Recipient)</h4>
            <div class="party-detail-line text-muted">Select a customer above…</div>
          </div>` : `
          <div class="invoice-party-box" id="buyer-preview">
            <h4>From (Seller / Supplier)</h4>
            <div class="party-detail-line text-muted">Select a supplier above…</div>
          </div>
          <div class="invoice-party-box">
            <h4>To (Buyer / Recipient)</h4>
            <div class="party-detail-name">${biz.name}</div>
            <div class="party-detail-line">${biz.address}${biz.city ? ', ' + biz.city : ''}${biz.pincode ? ' — ' + biz.pincode : ''}</div>
            <div class="party-detail-gstin">GSTIN: ${biz.gstin || 'Not Set'}</div>
          </div>`}
        </div>

        <!-- Optional Separate Shipping / Delivery Address Section -->
        <div style="margin-top:14px;margin-bottom:16px;padding:12px 14px;background:#f8fafc;border:1px solid var(--border);border-radius:var(--radius-sm)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:8px">
            <strong style="font-size:.88rem;color:var(--text-primary);display:flex;align-items:center;gap:6px">
              <span class="material-icons" style="font-size:18px;color:var(--primary)">local_shipping</span> Shipping &amp; Delivery Address (Consignee)
            </strong>
            <div style="display:flex;gap:16px;align-items:center;font-size:.84rem">
              <label style="display:inline-flex;align-items:center;gap:5px;cursor:pointer;font-weight:600">
                <input type="radio" name="shipping-mode" id="ship-mode-same" value="same" ${!doc || !doc.hasShippingAddress ? 'checked' : ''} onchange="Billing._toggleShippingAddress(false)">
                Same as Billing Address
              </label>
              <label style="display:inline-flex;align-items:center;gap:5px;cursor:pointer;font-weight:600;color:var(--primary)">
                <input type="radio" name="shipping-mode" id="ship-mode-diff" value="diff" ${doc && doc.hasShippingAddress ? 'checked' : ''} onchange="Billing._toggleShippingAddress(true)">
                Different Shipping / Delivery Address
              </label>
            </div>
          </div>

          <!-- Collapsible Separate Shipping Fields -->
          <div id="shipping-address-container" style="display:${doc && doc.hasShippingAddress ? 'block' : 'none'};padding-top:10px;border-top:1px dashed var(--border)">
            <div class="form-grid" style="font-size:.84rem">
              <div class="form-group form-full">
                <label>Consignee / Recipient Name <span class="required">*</span></label>
                <input id="ship-name" value="${doc?.shippingName || ''}" placeholder="e.g. Site Office / Branch Warehouse / Mr. Rahul">
              </div>
              <div class="form-group form-full">
                <label>Shipping / Delivery Street Address <span class="required">*</span></label>
                <textarea id="ship-addr" rows="2" placeholder="Building, Street, Plot No., Industrial Area">${doc?.shippingAddress || ''}</textarea>
              </div>
              <div class="form-group">
                <label>Shipping City</label>
                <input id="ship-city" value="${doc?.shippingCity || ''}" placeholder="e.g. Mumbai">
              </div>
              <div class="form-group">
                <label>Shipping State</label>
                <select id="ship-state">${stateOpts}</select>
              </div>
              <div class="form-group">
                <label>Shipping Pincode</label>
                <input id="ship-pin" value="${doc?.shippingPincode || ''}" placeholder="e.g. 400001" maxlength="6">
              </div>
              <div class="form-group">
                <label>Consignee GSTIN (Optional)</label>
                <input id="ship-gstin" value="${doc?.shippingGstin || ''}" placeholder="15-digit GSTIN (if registered)" maxlength="15" style="text-transform:uppercase;font-family:monospace">
              </div>
            </div>
          </div>
        </div>

        <!-- Line Items -->
        <div class="invoice-section-title" style="margin-top:20px"><span class="material-icons">list</span> Line Items</div>
        <div class="line-items-wrap">
          <table class="line-items-table">
            <thead>
              <tr>
                <th style="width:28px">#</th>
                <th style="min-width:220px">Description / Product</th>
                <th style="width:95px">HSN/SAC</th>
                <th style="width:75px">Qty</th>
                <th style="width:85px">Unit</th>
                <th style="width:105px">Rate (₹)</th>
                <th style="width:75px">Disc%</th>
                <th style="width:85px">GST%</th>
                <th class="text-right" style="width:100px">Taxable</th>
                <th class="text-right" style="width:110px">Total</th>
                <th style="width:36px"></th>
              </tr>
            </thead>
            <tbody id="items-tbody">
            </tbody>
          </table>
          <button class="add-line-btn" onclick="Billing._addRow()"><span class="material-icons">add</span> Add Item</button>
        </div>

        <!-- Totals & Notes -->
        <div class="invoice-summary-wrap">
          <div class="invoice-notes">
            <div class="form-group">
              <label>Notes / Narration</label>
              <textarea id="if-notes" rows="3">${doc ? doc.notes || '' : ''}</textarea>
            </div>
          </div>
          <div class="invoice-totals-table" id="inv-totals">
          </div>
        </div>
      </div>
      `,
      `<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
       <button class="btn btn-secondary" onclick="Billing._saveDoc('${type}',true)"><span class="material-icons">save</span> Save as Draft</button>
       <button class="btn btn-primary" onclick="Billing._saveDoc('${type}',false)"><span class="material-icons">send</span> ${doc ? 'Update' : 'Create'} ${isSales ? 'Invoice' : 'Bill'}</button>`,
      'modal-xl'
    );

    // Set Place of Supply
    const posEl = document.getElementById('if-pos');
    const initialPOS = doc ? doc.placeOfSupply : biz.stateCode;
    if (posEl) {
      posEl.value = initialPOS || biz.stateCode;
      posEl.addEventListener('change', () => this._recalc(biz.stateCode));
    }

    // Pre-fill party
    if (doc) {
      const partyEl = document.getElementById('if-party');
      if (partyEl) {
        partyEl.value = isSales ? doc.customerId : doc.supplierId;
        this._onPartyChange();
      }
    }

    // Render items
    this._rowCount = 0;
    window._iItems = JSON.parse(JSON.stringify(items));
    window._iBiz = biz;
    window._iType = type;
    window._iDoc = doc;

    this._renderRows();
    this._recalc(biz.stateCode);
  },

  _getProductOptions(selectedId = '') {
    const products = DB.getProducts();
    const isSales = window._iType === 'sales';
    return products.map(p => {
      const price = isSales ? p.sellingPrice : p.purchasePrice;
      const sel = p.id === selectedId ? 'selected' : '';
      return `<option value="${p.id}" ${sel}>${p.name}${p.sku ? ' (' + p.sku + ')' : ''} — ${fmtCurrency(price)}</option>`;
    }).join('');
  },

  _renderRows() {
    const tbody = document.getElementById('items-tbody');
    if (!tbody) return;
    const biz = DB.getBiz();
    const items = window._iItems && window._iItems.length ? window._iItems : [{ productId: '', name: '', hsn: '', unit: 'Nos', qty: 1, rate: 0, discount: 0, gstRate: 18 }];
    tbody.innerHTML = '';
    items.forEach((item, i) => this._appendRow(i, item));
    this._recalc(biz.stateCode);
  },

  _appendRow(idx, item) {
    const tbody = document.getElementById('items-tbody');
    if (!tbody) return;
    const biz = DB.getBiz();
    const unit = item.unit || 'Nos';
    const allowDecimal = isDecimalUnit(unit);
    const formattedQty = allowDecimal ? (parseFloat(item.qty) || 1) : Math.max(1, Math.round(parseFloat(item.qty) || 1));

    const tr = document.createElement('tr');
    tr.dataset.idx = idx;
    tr.innerHTML = `
      <td style="text-align:center;color:var(--text-secondary);font-size:.8rem;padding-top:10px">${idx + 1}</td>
      <td>
        <select class="item-product" onchange="Billing._onProductSelect(${idx},this)">
          <option value="">— Select Product or Type Below —</option>
          ${this._getProductOptions(item.productId)}
        </select>
        <input class="item-name" value="${item.name || ''}" placeholder="Product description…" style="margin-top:4px" oninput="Billing._recalc('${biz.stateCode}')">
      </td>
      <td><input class="item-hsn" value="${item.hsn || ''}" placeholder="HSN/SAC" oninput="Billing._recalc('${biz.stateCode}')"></td>
      <td><input class="item-qty" type="number" value="${formattedQty}" min="${allowDecimal ? '0.01' : '1'}" step="${allowDecimal ? '0.01' : '1'}" oninput="Billing._onQtyInput(this)"></td>
      <td><select class="item-unit" onchange="Billing._onUnitChange(this)">${UNITS.map(u => `<option value="${u}" ${u === unit ? 'selected' : ''}>${u}</option>`).join('')}</select></td>
      <td><input class="item-rate" type="number" value="${item.rate || 0}" min="0" step="0.01" oninput="Billing._recalc('${biz.stateCode}')"></td>
      <td><input class="item-disc" type="number" value="${item.discount || 0}" min="0" max="100" step="0.01" oninput="Billing._recalc('${biz.stateCode}')"></td>
      <td><select class="item-gst" onchange="Billing._recalc('${biz.stateCode}')">${GST_RATES.map(r => `<option value="${r}" ${parseFloat(item.gstRate) === r ? 'selected' : ''}>${r}%</option>`).join('')}</select></td>
      <td class="td-total item-taxable">₹0.00</td>
      <td class="td-total item-total">₹0.00</td>
      <td class="td-action"><button class="remove-row-btn" onclick="Billing._removeRow(${idx})"><span class="material-icons">close</span></button></td>
    `;

    // Pre-select product in dropdown
    if (item.productId) {
      const sel = tr.querySelector('.item-product');
      if (sel) sel.value = item.productId;
    }

    tbody.appendChild(tr);
  },

  _onUnitChange(sel) {
    const row = sel.closest('tr');
    if (!row) return;
    const unit = sel.value;
    const qtyInput = row.querySelector('.item-qty');
    const allowDecimal = isDecimalUnit(unit);

    if (qtyInput) {
      qtyInput.step = allowDecimal ? '0.01' : '1';
      qtyInput.min = allowDecimal ? '0.01' : '1';
      if (!allowDecimal) {
        const curVal = parseFloat(qtyInput.value) || 1;
        qtyInput.value = Math.max(1, Math.round(curVal));
      }
    }
    this._recalc(DB.getBiz().stateCode);
  },

  _onQtyInput(input) {
    const row = input.closest('tr');
    const unit = row?.querySelector('.item-unit')?.value || 'Nos';
    const allowDecimal = isDecimalUnit(unit);

    if (!allowDecimal) {
      // Discrete units (Nos, Pcs, Box, Set, Job...) — strictly whole numbers
      input.value = input.value.replace(/[^0-9]/g, '');
      if (input.value && parseInt(input.value, 10) < 1) input.value = 1;
    } else {
      // Continuous units (Mtr, Kg, Gm, Ltr, Roll...) — decimals allowed
      input.value = input.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
    }
    this._recalc(DB.getBiz().stateCode);
  },

  _addRow(itemData = null) {
    const biz = DB.getBiz();
    if (!window._iItems) window._iItems = [];
    const newItem = itemData || { productId: '', name: '', hsn: '', unit: 'Nos', qty: 1, rate: 0, discount: 0, gstRate: 18 };
    window._iItems.push(newItem);
    const idx = window._iItems.length - 1;
    this._appendRow(idx, newItem);
    this._recalc(biz.stateCode);
  },

  _removeRow(idx) {
    const tbody = document.getElementById('items-tbody');
    if (!tbody || tbody.rows.length <= 1) { App.toast('At least one item is required', 'warning'); return; }
    const row = tbody.querySelector(`tr[data-idx="${idx}"]`);
    if (row) row.remove();
    // Re-index
    Array.from(tbody.querySelectorAll('tr')).forEach((tr, i) => {
      tr.dataset.idx = i;
      const srCell = tr.cells[0];
      if (srCell) srCell.textContent = i + 1;
    });
    this._recalc(DB.getBiz().stateCode);
  },

  _onProductSelect(idx, sel) {
    const productId = sel.value;
    const row = sel.closest('tr');
    if (!row) return;

    if (!productId) {
      row.querySelector('.item-name')?.focus();
      return;
    }

    const p = DB.getProductById(productId);
    if (!p) return;

    // Check if this product is already selected in another row
    const tbody = document.getElementById('items-tbody');
    if (tbody) {
      const allRows = Array.from(tbody.querySelectorAll('tr'));
      const duplicateRow = allRows.find(r => r !== row && r.querySelector('.item-product')?.value === productId);

      if (duplicateRow) {
        // Product already in another row — increment its quantity
        const dupIdx = parseInt(duplicateRow.dataset.idx, 10) + 1;
        const qtyInput = duplicateRow.querySelector('.item-qty');
        const currentQty = parseFloat(qtyInput?.value) || 0;
        const newQty = currentQty + 1;
        if (qtyInput) qtyInput.value = newQty;

        // Flash green highlight on the existing row
        duplicateRow.style.transition = 'background 0.3s';
        duplicateRow.style.background = 'hsl(142,76%,90%)';
        setTimeout(() => { duplicateRow.style.background = ''; }, 1400);

        // Reset the current duplicate selection
        sel.value = '';
        const nameInput = row.querySelector('.item-name');
        if (nameInput) nameInput.value = '';
        const hsnInput = row.querySelector('.item-hsn');
        if (hsnInput) hsnInput.value = '';
        const rateInput = row.querySelector('.item-rate');
        if (rateInput) rateInput.value = 0;

        App.toast(`"${p.name}" is already in Row #${dupIdx}! Incremented quantity to ${newQty} 📦`, 'info');
        this._recalc(DB.getBiz().stateCode);
        return;
      }
    }

    const isSales = window._iType === 'sales';
    row.querySelector('.item-name').value = p.name || '';
    row.querySelector('.item-hsn').value = p.hsn || '';
    row.querySelector('.item-rate').value = isSales ? (p.sellingPrice || 0) : (p.purchasePrice || 0);

    const gstSel = row.querySelector('.item-gst');
    if (gstSel && p.gstRate !== undefined) gstSel.value = p.gstRate;

    const unitSel = row.querySelector('.item-unit');
    if (unitSel && p.unit) {
      unitSel.value = p.unit;
      this._onUnitChange(unitSel);
    }

    this._recalc(DB.getBiz().stateCode);
  },

  toggleQuickParty(show) {
    const drawer = document.getElementById('quick-party-drawer');
    if (!drawer) return;
    drawer.style.display = show ? 'block' : 'none';
    if (show) {
      const biz = DB.getBiz();
      const stateEl = document.getElementById('qp-state');
      if (stateEl && biz.stateCode) stateEl.value = biz.stateCode;
      setTimeout(() => document.getElementById('qp-name')?.focus(), 100);
    }
  },

  saveQuickParty() {
    const isSales = window._iType === 'sales';
    const limits = DB.getTrialLimits();

    if (isSales && !limits.canAddCustomer) {
      App.toast(`⏳ Trial Limit Reached: Maximum ${limits.maxCustomers} customers allowed in 60-day trial mode. Activate license to add unlimited.`, 'warning');
      App.openLicenseModal();
      return;
    }
    if (!isSales && !limits.canAddSupplier) {
      App.toast(`⏳ Trial Limit Reached: Maximum ${limits.maxSuppliers} suppliers allowed in 60-day trial mode. Activate license to add unlimited.`, 'warning');
      App.openLicenseModal();
      return;
    }

    const name = document.getElementById('qp-name')?.value.trim();
    if (!name) {
      App.toast('Name is required', 'error');
      document.getElementById('qp-name')?.focus();
      return;
    }
    const gstin = document.getElementById('qp-gstin')?.value.toUpperCase().trim() || '';
    if (gstin && !validateGSTIN(gstin)) {
      App.toast('Invalid GSTIN format (must be 15 alphanumeric characters)', 'error');
      return;
    }
    const phone = document.getElementById('qp-phone')?.value.trim() || '';
    const city = document.getElementById('qp-city')?.value.trim() || '';
    const stateEl = document.getElementById('qp-state');
    const state = INDIAN_STATES.find(s => s.code === stateEl?.value);

    const contact = {
      name,
      gstin,
      phone,
      city,
      state: state?.name || '',
      stateCode: stateEl?.value || '',
      address: city,
      pincode: '',
      email: '',
      pan: gstin ? gstin.slice(2, 12) : '',
      contactPerson: name,
      notes: 'Created from Billing screen'
    };

    const saved = isSales ? DB.saveCustomer(contact) : DB.saveSupplier(contact);

    // Refresh party dropdown in invoice form
    const parties = isSales ? DB.getCustomers() : DB.getSuppliers();
    const partyOpts = parties.map(p => `<option value="${p.id}">${p.name}${p.gstin ? ' — ' + p.gstin : ''}</option>`).join('');
    const partySelect = document.getElementById('if-party');
    if (partySelect) {
      partySelect.innerHTML = `
        <option value="">— Select ${isSales ? 'Customer' : 'Supplier'} —</option>
        <option value="__NEW__" style="font-weight:700;color:var(--primary)">➕ + Add New ${isSales ? 'Customer' : 'Supplier'}...</option>
        ${partyOpts}
      `;
      partySelect.value = saved.id;
    }

    // Hide drawer & trigger party preview update
    this.toggleQuickParty(false);
    this._onPartyChange();
    App.toast(`${isSales ? 'Customer' : 'Supplier'} "${name}" added & selected! 🎯`, 'success');
  },

  _onPartyChange() {
    const partyEl = document.getElementById('if-party');
    if (!partyEl) return;
    const partyId = partyEl.value;
    if (partyId === '__NEW__') {
      partyEl.value = '';
      this.toggleQuickParty(true);
      return;
    }
    const isSales = window._iType === 'sales';
    const party = isSales ? DB.getCustomerById(partyId) : DB.getSupplierById(partyId);
    const preview = document.getElementById('buyer-preview');
    if (!preview) return;

    const biz = DB.getBiz();
    if (party) {
      preview.innerHTML = `
        <h4>${isSales ? 'To (Buyer / Recipient)' : 'From (Seller / Supplier)'}</h4>
        <div class="party-detail-name">${party.name}</div>
        <div class="party-detail-line">${party.address || ''}${party.city ? ', ' + party.city : ''}${party.pincode ? ' — ' + party.pincode : ''}</div>
        ${party.gstin ? `<div class="party-detail-gstin">GSTIN: ${party.gstin}</div>` : '<div class="party-detail-line text-muted">Unregistered (B2C)</div>'}
        <div class="party-detail-line">${party.state || ''}</div>`;

      // Auto-set place of supply
      const posEl = document.getElementById('if-pos');
      if (posEl) {
        posEl.value = isSales ? (party.stateCode || biz.stateCode) : (biz.stateCode);
      }
      this._recalc();
    } else {
      preview.innerHTML = `<h4>${isSales ? 'To (Buyer / Recipient)' : 'From (Seller / Supplier)'}</h4><div class="party-detail-line text-muted">Select a ${isSales ? 'customer' : 'supplier'} above…</div>`;
    }
  },

  _toggleShippingAddress(isDifferent) {
    const container = document.getElementById('shipping-address-container');
    if (container) {
      container.style.display = isDifferent ? 'block' : 'none';
      if (isDifferent) {
        // Pre-fill defaults from selected customer/supplier if shipping fields are empty
        const partyEl = document.getElementById('if-party');
        const isSales = window._iType === 'sales';
        const party = partyEl?.value ? (isSales ? DB.getCustomerById(partyEl.value) : DB.getSupplierById(partyEl.value)) : null;
        const nameInput = document.getElementById('ship-name');
        if (nameInput && !nameInput.value && party) nameInput.value = party.name || '';
        const addrInput = document.getElementById('ship-addr');
        if (addrInput && !addrInput.value && party) addrInput.value = party.address || '';
        const cityInput = document.getElementById('ship-city');
        if (cityInput && !cityInput.value && party) cityInput.value = party.city || '';
        const pinInput = document.getElementById('ship-pin');
        if (pinInput && !pinInput.value && party) pinInput.value = party.pincode || '';
        const stateSelect = document.getElementById('ship-state');
        if (stateSelect && party?.stateCode) stateSelect.value = party.stateCode;
      }
    }
  },

  _getRows() {
    const rows = [];
    const tbody = document.getElementById('items-tbody');
    if (!tbody) return rows;
    Array.from(tbody.querySelectorAll('tr')).forEach(tr => {
      const unit = tr.querySelector('.item-unit')?.value || 'Nos';
      const rawQty = parseFloat(tr.querySelector('.item-qty')?.value) || 1;
      const allowDecimal = isDecimalUnit(unit);
      const qty = allowDecimal ? (parseFloat(rawQty.toFixed(3)) || 1) : Math.max(1, Math.round(rawQty));

      rows.push({
        productId: tr.querySelector('.item-product')?.value || '',
        name: tr.querySelector('.item-name')?.value || '',
        hsn: tr.querySelector('.item-hsn')?.value || '',
        unit: unit,
        qty: qty,
        rate: parseFloat(tr.querySelector('.item-rate')?.value) || 0,
        discount: parseFloat(tr.querySelector('.item-disc')?.value) || 0,
        gstRate: parseFloat(tr.querySelector('.item-gst')?.value) || 0,
      });
    });
    return rows;
  },

  _recalc(overrideSellerCode = null) {
    const biz = DB.getBiz();
    const isSales = window._iType === 'sales';
    const partyEl = document.getElementById('if-party');
    const partyId = partyEl?.value;
    const party = isSales ? DB.getCustomerById(partyId) : DB.getSupplierById(partyId);

    const posEl = document.getElementById('if-pos');
    const sellerCode = overrideSellerCode || (isSales ? biz.stateCode : (party?.stateCode || biz.stateCode));
    const buyerCode = isSales ? (posEl ? posEl.value : (party?.stateCode || biz.stateCode)) : biz.stateCode;

    const rows = this._getRows();
    const t = calcTotals(rows, sellerCode, buyerCode);

    // Update row totals
    const tbody = document.getElementById('items-tbody');
    if (tbody) {
      Array.from(tbody.querySelectorAll('tr')).forEach((tr, i) => {
        const item = t.items[i];
        if (!item) return;
        const taxEl = tr.querySelector('.item-taxable');
        const totEl = tr.querySelector('.item-total');
        if (taxEl) taxEl.textContent = fmtCurrency(item.taxableValue);
        if (totEl) totEl.textContent = fmtCurrency(item.totalAmt);
      });
    }

    // Update summary
    const totalsEl = document.getElementById('inv-totals');
    if (!totalsEl) return;

    const taxTypeLabel = t.isIntra ? 'CGST + SGST' : 'IGST';
    const taxBadge = `<span class="tax-type-badge">${taxTypeLabel}</span>`;

    let taxRows = '';
    if (t.isIntra) {
      taxRows = `
        <div class="totals-row"><span class="totals-label">CGST</span><span class="totals-value">${fmtCurrency(t.totalCgst)}</span></div>
        <div class="totals-row"><span class="totals-label">SGST</span><span class="totals-value">${fmtCurrency(t.totalSgst)}</span></div>`;
    } else {
      taxRows = `<div class="totals-row"><span class="totals-label">IGST</span><span class="totals-value">${fmtCurrency(t.totalIgst)}</span></div>`;
    }

    totalsEl.innerHTML = `
      <div class="totals-row"><span class="totals-label">Taxable Value ${taxBadge}</span><span class="totals-value">${fmtCurrency(t.subtotal)}</span></div>
      ${taxRows}
      <div class="totals-row"><span class="totals-label">Total Tax</span><span class="totals-value text-danger">${fmtCurrency(t.totalTax)}</span></div>
      <div class="totals-row grand-total"><span class="totals-label">Grand Total</span><span class="totals-value">${fmtCurrency(t.total)}</span></div>`;
  },

  _saveDoc(type, isDraft = false) {
    const isSales = type === 'sales';
    const existingDoc = window._iDoc;

    if (!existingDoc) {
      const limits = DB.getTrialLimits();
      if (limits.isTrial && !limits.canCreateBill) {
        if (limits.isExpired) {
          App.toast('⏳ Your 60-day free trial has expired. Please activate your license to continue.', 'error');
        } else {
          App.toast(`⏳ Trial Limit Reached: Maximum ${limits.maxTotalBills} bills (30 clean + 50 trial). Please activate your license.`, 'error');
        }
        App.openLicenseModal();
        return;
      }
    }

    const biz = DB.getBiz();
    const partyEl = document.getElementById('if-party');
    const partyId = partyEl?.value;

    if (!partyId) { App.toast(`Please select a ${isSales ? 'customer' : 'supplier'}`, 'error'); return; }

    const party = isSales ? DB.getCustomerById(partyId) : DB.getSupplierById(partyId);
    if (!party) { App.toast('Party not found', 'error'); return; }

    const items = this._getRows();
    if (!items.length || items.every(i => !i.name && !i.productId)) {
      App.toast('Add at least one line item', 'error'); return;
    }

    const posEl = document.getElementById('if-pos');
    const sellerStateCode = isSales ? biz.stateCode : party.stateCode;
    const buyerStateCode = isSales ? (posEl?.value || party.stateCode || biz.stateCode) : biz.stateCode;
    const t = calcTotals(items, sellerStateCode, buyerStateCode);
    const date = document.getElementById('if-date')?.value || new Date().toISOString().split('T')[0];
    const dueDate = document.getElementById('if-due')?.value || date;
    const notes = document.getElementById('if-notes')?.value || '';
    const reverseCharge = document.getElementById('if-rc')?.value === 'true';
    const status = isDraft ? 'draft' : 'sent';

    // Separate Shipping / Consignee Address details
    const hasShippingAddress = document.getElementById('ship-mode-diff')?.checked || false;
    const shippingName = hasShippingAddress ? (document.getElementById('ship-name')?.value.trim() || party.name) : '';
    const shippingAddress = hasShippingAddress ? (document.getElementById('ship-addr')?.value.trim() || '') : '';
    const shippingCity = hasShippingAddress ? (document.getElementById('ship-city')?.value.trim() || '') : '';
    const shipStateEl = document.getElementById('ship-state');
    const shippingStateCode = hasShippingAddress ? (shipStateEl?.value || '') : '';
    const shippingState = hasShippingAddress ? (INDIAN_STATES.find(s => s.code === shippingStateCode)?.name || '') : '';
    const shippingPincode = hasShippingAddress ? (document.getElementById('ship-pin')?.value.trim() || '') : '';
    const shippingGstin = hasShippingAddress ? (document.getElementById('ship-gstin')?.value.toUpperCase().trim() || '') : '';

    if (isSales) {
      const data = {
        ...(existingDoc || {}),
        invoiceNo: existingDoc ? existingDoc.invoiceNo : DB.nextInvoiceNo(),
        date, dueDate, status: existingDoc ? existingDoc.status : status,
        customerId: party.id, customerName: party.name,
        customerGstin: party.gstin || '',
        customerAddress: `${party.address || ''}, ${party.city || ''} - ${party.pincode || ''}`,
        customerState: party.state, customerStateCode: party.stateCode,
        customerPhone: party.phone || '',
        customerWhatsapp: party.whatsapp || party.phone || '',
        placeOfSupply: buyerStateCode, sellerStateCode: biz.stateCode,
        reverseCharge, notes,
        hasShippingAddress,
        shippingName,
        shippingAddress,
        shippingCity,
        shippingState,
        shippingStateCode,
        shippingPincode,
        shippingGstin,
        ...t,
      };
      if (isDraft) data.status = 'draft';
      DB.saveSale(data, !existingDoc);
      App.toast(`Invoice ${data.invoiceNo} ${existingDoc ? 'updated' : 'created'}!`);
    } else {
      const data = {
        ...(existingDoc || {}),
        billNo: existingDoc ? existingDoc.billNo : DB.nextBillNo(),
        date, dueDate, status: existingDoc ? existingDoc.status : status,
        supplierId: party.id, supplierName: party.name,
        supplierGstin: party.gstin || '',
        supplierAddress: `${party.address || ''}, ${party.city || ''} - ${party.pincode || ''}`,
        supplierState: party.state,
        supplierStateCode: party.stateCode,
        supplierPhone: party.phone || '',
        supplierWhatsapp: party.whatsapp || party.phone || '',
        buyerStateCode: biz.stateCode,
        placeOfSupply: biz.stateCode,
        reverseCharge, notes,
        hasShippingAddress,
        shippingName,
        shippingAddress,
        shippingCity,
        shippingState,
        shippingStateCode,
        shippingPincode,
        shippingGstin,
        ...t,
      };
      if (isDraft) data.status = 'draft';
      DB.savePurchase(data, !existingDoc);
      App.toast(`Bill ${data.billNo} ${existingDoc ? 'updated' : 'created'}!`);
    }

    App.closeModal();
    App.refreshSidebar();
    setTimeout(() => App.route(), 300);

    // Sync updated invoice counts & revenue to Google Sheet
    setTimeout(() => {
      if (typeof DB !== 'undefined' && DB.syncRemoteLicense) {
        DB.syncRemoteLicense().catch(() => {});
      }
    }, 1500);
  },

  /* ═══════════════════════════════════════════
     VIEW DOCUMENT
  ═══════════════════════════════════════════ */
  viewDoc(id, type) {
    const isSales = type === 'sales';
    const doc = isSales ? DB.getSaleById(id) : DB.getPurchaseById(id);
    if (!doc) return;
    const biz = DB.getBiz();

    const no = isSales ? doc.invoiceNo : doc.billNo;
    const partyName = isSales ? doc.customerName : doc.supplierName;
    const partyGstin = isSales ? (doc.customerGstin || '') : (doc.supplierGstin || '');
    const partyAddr = isSales ? doc.customerAddress : (doc.supplierAddress || '');
    const partyState = isSales ? doc.customerState : doc.supplierState;

    const posState = INDIAN_STATES.find(s => s.code === (isSales ? doc.placeOfSupply : doc.buyerStateCode || biz.stateCode));

    let taxRows = '';
    if (doc.isIntra) {
      taxRows = `
        <tr><td>CGST</td><td class="text-right">${fmtCurrency(doc.totalCgst)}</td></tr>
        <tr><td>SGST</td><td class="text-right">${fmtCurrency(doc.totalSgst)}</td></tr>`;
    } else {
      taxRows = `<tr><td>IGST</td><td class="text-right">${fmtCurrency(doc.totalIgst)}</td></tr>`;
    }

    const limits = DB.getTrialLimits();
    const isLicensed = !limits.isTrial;

    const activeFmt = biz.invoiceFormat || 'classic';
    window._viewDocFmt = activeFmt;

    const paidAmount = DB.getDocPaidAmount(doc);
    const dueAmount = DB.getDocDueAmount(doc);
    const payments = DB.getDocPayments(doc);

    let statusBadge = `<span class="badge badge-${doc.status}">${doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}</span>`;
    if (doc.status === 'partial') {
      statusBadge = `<span class="badge badge-partial">Partial (Paid ${fmtCurrency(paidAmount)})</span>`;
    }

    const actionButtons = `
      <button class="btn btn-ghost" onclick="App.closeModal()">Close</button>
      <button class="btn btn-secondary" onclick="Billing.shareWhatsApp('${id}','${type}')" title="${isLicensed ? 'Share via WhatsApp' : 'Commercial License Required 💎'}">
        <span class="material-icons" style="color:#25d366">chat</span> WhatsApp ${isLicensed ? '' : '<span style="font-size:10px">💎</span>'}
      </button>
      <button class="btn btn-secondary" onclick="Billing.exportPDF('${id}','${type}')" title="${isLicensed ? 'Save / Export as PDF' : 'Commercial License Required 💎'}">
        <span class="material-icons" style="color:#e74c3c">picture_as_pdf</span> PDF ${isLicensed ? '' : '<span style="font-size:10px">💎</span>'}
      </button>
      <button class="btn btn-success" onclick="App.closeModal();Billing.markPaid('${id}','${type}')"><span class="material-icons">payments</span> ${dueAmount > 0 ? 'Record Payment' : 'Payments &amp; History'}</button>
      ${isLicensed ? `
      <select id="vd-fmt" style="padding:6px 10px;border-radius:var(--radius-sm);border:1px solid var(--border);font-size:.82rem;background:#fff;font-weight:600;color:var(--text-primary)" onchange="window._viewDocFmt = this.value">
        <option value="classic" ${activeFmt === 'classic' ? 'selected' : ''}>📄 Classic GST</option>
        <option value="modern" ${activeFmt === 'modern' ? 'selected' : ''}>💎 Modern Blue</option>
        <option value="compact_pos" ${activeFmt === 'compact_pos' ? 'selected' : ''}>💎 POS 3" Receipt</option>
        <option value="executive" ${activeFmt === 'executive' ? 'selected' : ''}>💎 Executive Dark</option>
        <option value="custom" ${activeFmt === 'custom' ? 'selected' : ''}>🛠️ Custom Template</option>
      </select>
      ` : ''}
      <button class="btn btn-primary" onclick="Billing.printDoc('${id}','${type}', window._viewDocFmt || '${activeFmt}')"><span class="material-icons">print</span> Print</button>
    `;

    App.modal(`${isSales ? 'Sales Tax Invoice' : 'Purchase Order / Bill'}: ${no}`,
      `
      <div style="margin-bottom:14px;display:flex;align-items:center;gap:12px;justify-content:space-between">
        <div>
          <div style="font-size:1.1rem;font-weight:800;letter-spacing:-.02em">${no}</div>
          <div style="font-size:.8rem;color:var(--text-secondary)">${fmtDate(doc.date)} · Due ${fmtDate(doc.dueDate)}</div>
        </div>
        <div style="text-align:right">
          ${statusBadge}
          <div style="font-size:1.4rem;font-weight:800;margin-top:4px;letter-spacing:-.03em">${fmtCurrency(doc.total)}</div>
        </div>
      </div>

      <div class="invoice-parties-grid" style="margin-bottom:16px">
        ${isSales ? `
        <div class="invoice-party-box">
          <h4>Seller / Supplier (From)</h4>
          <div class="party-detail-name">${biz.name}</div>
          <div class="party-detail-line">${biz.address}, ${biz.city}</div>
          <div class="party-detail-gstin">GSTIN: ${biz.gstin || '—'}</div>
        </div>
        <div class="invoice-party-box">
          <h4>Buyer / Recipient (To)</h4>
          <div class="party-detail-name">${partyName}</div>
          <div class="party-detail-line">${partyAddr}</div>
          ${partyGstin ? `<div class="party-detail-gstin">GSTIN: ${partyGstin}</div>` : '<div class="party-detail-line text-muted">Unregistered (B2C)</div>'}
        </div>` : `
        <div class="invoice-party-box">
          <h4>Seller / Supplier (From)</h4>
          <div class="party-detail-name">${partyName}</div>
          <div class="party-detail-line">${partyAddr}</div>
          ${partyGstin ? `<div class="party-detail-gstin">GSTIN: ${partyGstin}</div>` : '<div class="party-detail-line text-muted">Unregistered</div>'}
        </div>
        <div class="invoice-party-box">
          <h4>Buyer / Recipient (Bill To)</h4>
          <div class="party-detail-name">${biz.name}</div>
          <div class="party-detail-line">${biz.address}, ${biz.city}</div>
          <div class="party-detail-gstin">GSTIN: ${biz.gstin || '—'}</div>
        </div>`}
      </div>

      <div style="font-size:.78rem;color:var(--text-secondary);margin-bottom:12px">
        ${isSales ? 'Place of Supply' : 'Place of Supply / Delivery'}: <strong>${posState?.name || biz.state || '—'}</strong> &nbsp;|&nbsp;
        Tax Type: <strong>${doc.isIntra ? 'CGST + SGST (Intra-state)' : 'IGST (Inter-state)'}</strong> &nbsp;|&nbsp;
        Reverse Charge: <strong>${doc.reverseCharge ? 'Yes' : 'No'}</strong>
      </div>

      <div class="table-wrap" style="margin-bottom:14px">
        <table class="table">
          <thead><tr><th>#</th><th>Description</th><th>HSN/SAC</th><th>Qty</th><th>Unit</th><th class="text-right">Rate</th><th class="text-right">Taxable</th><th class="text-right">Tax</th><th class="text-right">Total</th></tr></thead>
          <tbody>
            ${(doc.items || []).map((item, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${item.name}${item.discount ? `<span class="text-muted" style="font-size:.78rem"> (${item.discount}% disc)</span>` : ''}</td>
                <td><span class="mono">${item.hsn || '—'}</span></td>
                <td>${item.qty}</td>
                <td>${item.unit}</td>
                <td class="text-right">${fmtCurrency(item.rate)}</td>
                <td class="text-right">${fmtCurrency(item.taxableValue)}</td>
                <td class="text-right">${fmtCurrency((item.cgstAmt || 0) + (item.sgstAmt || 0) + (item.igstAmt || 0))}</td>
                <td class="text-right amount-cell">${fmtCurrency(item.totalAmt)}</td>
              </tr>`).join('')}
          </tbody>
          <tfoot>
            <tr><td colspan="6"></td><td class="text-right">Subtotal</td><td></td><td class="text-right">${fmtCurrency(doc.subtotal)}</td></tr>
            ${doc.isIntra ? `<tr><td colspan="7" class="text-right">CGST</td><td></td><td class="text-right">${fmtCurrency(doc.totalCgst)}</td></tr><tr><td colspan="7" class="text-right">SGST</td><td></td><td class="text-right">${fmtCurrency(doc.totalSgst)}</td></tr>` : `<tr><td colspan="7" class="text-right">IGST</td><td></td><td class="text-right">${fmtCurrency(doc.totalIgst)}</td></tr>`}
            <tr><td colspan="7" class="text-right font-bold">Grand Total</td><td></td><td class="text-right font-bold" style="font-size:1rem">${fmtCurrency(doc.total)}</td></tr>
          </tfoot>
        </table>
      </div>

      <!-- Payment Breakdown & History Card -->
      <div style="margin-bottom:14px;padding:12px 14px;background:#f8fafc;border:1px solid var(--border);border-radius:var(--radius-sm)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px">
          <strong style="font-size:.85rem;color:var(--text-primary);display:flex;align-items:center;gap:6px">
            <span class="material-icons" style="font-size:16px;color:var(--primary)">account_balance_wallet</span> Payment Status &amp; Settlements
          </strong>
          <div style="display:flex;gap:10px;align-items:center;font-size:.82rem">
            <span>Total: <strong>${fmtCurrency(doc.total)}</strong></span>
            <span style="color:var(--success)">Paid: <strong>${fmtCurrency(paidAmount)}</strong></span>
            ${dueAmount > 0 ? `<span style="color:var(--danger);font-weight:700">Remaining Due: ${fmtCurrency(dueAmount)}</span>` : '<span class="badge badge-paid">Fully Settled</span>'}
            <button class="btn btn-xs btn-primary" onclick="App.closeModal();Billing.markPaid('${id}','${type}')" style="margin-left:6px">
              <span class="material-icons" style="font-size:13px">add_card</span> ${dueAmount > 0 ? '+ Add Payment' : 'Manage / Change Method'}
            </button>
          </div>
        </div>

        ${payments.length > 0 ? `
        <div style="overflow-x:auto">
          <table class="table table-sm" style="font-size:.78rem;margin:0;background:#fff;border-radius:4px;border:1px solid var(--border)">
            <thead><tr><th>Date</th><th>Mode / Method</th><th>Reference</th><th class="text-right">Amount</th><th style="width:80px;text-align:center">Action</th></tr></thead>
            <tbody>
              ${payments.map(p => `
                <tr>
                  <td>${fmtDate(p.date)}</td>
                  <td><span class="badge badge-info" style="font-size:.72rem">${p.method}</span></td>
                  <td><span class="mono" style="font-size:.75rem">${p.ref || '—'}</span></td>
                  <td class="text-right font-bold">${fmtCurrency(p.amount)}</td>
                  <td style="text-align:center;white-space:nowrap">
                    <button class="btn btn-xs btn-ghost" onclick="App.closeModal();Billing.editPayment('${id}','${type}','${p.id}')" title="Change Payment Method / Date">✏️ Edit</button>
                    <button class="btn btn-xs btn-ghost" onclick="App.closeModal();Billing.deletePayment('${id}','${type}','${p.id}')" title="Delete Payment Record" style="color:var(--danger)">🗑️</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : '<div style="font-size:.8rem;color:var(--text-secondary);font-style:italic">No payment transactions recorded yet.</div>'}
      </div>

      ${doc.notes ? `<div style="font-size:.82rem;color:var(--text-secondary);padding:8px 12px;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border);margin-bottom:14px"><strong>Notes:</strong> ${doc.notes}</div>` : ''}
      
      ${isSales && isLicensed && biz.upiId && dueAmount > 0 ? `
      <div style="padding:12px 16px;background:linear-gradient(135deg, hsl(220,90%,97%) 0%, #fff 100%);border:1px solid hsl(220,80%,85%);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div style="display:flex;align-items:center;gap:12px">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=0&data=${encodeURIComponent(`upi://pay?pa=${biz.upiId}&pn=${biz.name}&am=${parseFloat(dueAmount).toFixed(2)}&tn=${encodeURIComponent('Invoice ' + no)}&cu=INR`)}" style="width:76px;height:76px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;padding:4px" alt="UPI QR">
          <div>
            <div style="font-weight:700;font-size:.88rem;color:#1e3a8a;display:flex;align-items:center;gap:6px">
              <span class="material-icons" style="font-size:18px;color:#2563eb">qr_code_scanner</span> Scan &amp; Pay Due Amount via UPI
            </div>
            <div style="font-size:.8rem;color:var(--text-secondary);margin-top:2px">UPI ID: <strong style="color:var(--text-primary)">${biz.upiId}</strong></div>
            <div style="font-size:.78rem;color:#d97706;font-weight:600;margin-top:2px">Due Amount: ${fmtCurrency(dueAmount)}</div>
          </div>
        </div>
        <div style="font-size:.75rem;color:var(--text-secondary);text-align:right">
          Supports <strong>PhonePe</strong>, <strong>Google Pay</strong>, <strong>Paytm</strong>, <strong>BHIM</strong>
        </div>
      </div>
      ` : ''}
      `,
      actionButtons, 'modal-xl'
    );
  },

  /* ═══════════════════════════════════════════
     PAYMENT MANAGEMENT (Partial & Multi-Mode)
  ═══════════════════════════════════════════ */
  markPaid(id, type) {
    const isSales = type === 'sales';
    const doc = isSales ? DB.getSaleById(id) : DB.getPurchaseById(id);
    if (!doc) return;

    const total = parseFloat(doc.total) || 0;
    const paidAmount = DB.getDocPaidAmount(doc);
    const dueAmount = DB.getDocDueAmount(doc);
    const payments = DB.getDocPayments(doc);
    const today = new Date().toISOString().split('T')[0];

    const paymentsTableHtml = payments.length > 0 ? `
      <div style="margin-top:16px;margin-bottom:16px">
        <strong style="font-size:.85rem;color:var(--text-primary);display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span class="material-icons" style="font-size:16px;color:var(--primary)">history</span> Payment History (${payments.length} transaction${payments.length > 1 ? 's' : ''})
        </strong>
        <div style="max-height:160px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm)">
          <table class="table table-sm" style="font-size:.8rem;margin:0">
            <thead style="background:var(--bg)">
              <tr>
                <th>Date</th>
                <th>Mode</th>
                <th>Reference</th>
                <th class="text-right">Amount</th>
                <th style="width:75px;text-align:center">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${payments.map(p => `
                <tr>
                  <td>${fmtDate(p.date)}</td>
                  <td><span class="badge badge-info" style="font-size:.72rem">${p.method}</span></td>
                  <td><span class="mono" style="font-size:.75rem">${p.ref || '—'}</span></td>
                  <td class="text-right font-bold">${fmtCurrency(p.amount)}</td>
                  <td style="white-space:nowrap;text-align:center">
                    <button class="btn btn-xs btn-ghost" onclick="Billing.editPayment('${id}','${type}','${p.id}')" title="Edit / Change Method">✏️</button>
                    <button class="btn btn-xs btn-ghost" onclick="Billing.deletePayment('${id}','${type}','${p.id}')" title="Delete Payment" style="color:var(--danger)">🗑️</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : '';

    App.modal(`Record Payment — ${isSales ? doc.invoiceNo : doc.billNo}`,
      `
      <!-- Payment Status Hero Card -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;background:var(--bg);padding:12px;border-radius:var(--radius-sm);border:1px solid var(--border);text-align:center">
        <div>
          <div style="font-size:.72rem;color:var(--text-secondary);text-transform:uppercase;font-weight:700">Total Bill</div>
          <div style="font-size:1.1rem;font-weight:800;color:var(--text-primary)">${fmtCurrency(total)}</div>
        </div>
        <div>
          <div style="font-size:.72rem;color:var(--text-secondary);text-transform:uppercase;font-weight:700">Paid So Far</div>
          <div style="font-size:1.1rem;font-weight:800;color:var(--success)">${fmtCurrency(paidAmount)}</div>
        </div>
        <div style="background:#fff;border-radius:6px;padding:4px;border:1px solid ${dueAmount > 0 ? 'var(--warning)' : 'var(--success)'}">
          <div style="font-size:.72rem;color:${dueAmount > 0 ? 'var(--warning-dark, #b45309)' : 'var(--success)'};text-transform:uppercase;font-weight:700">Remaining Due</div>
          <div style="font-size:1.15rem;font-weight:900;color:${dueAmount > 0 ? 'var(--danger)' : 'var(--success)'}">${fmtCurrency(dueAmount)}</div>
        </div>
      </div>

      ${paymentsTableHtml}

      <!-- Add New / Partial Payment Form -->
      <div style="padding:12px;background:#f8fafc;border:1px solid var(--border);border-radius:var(--radius-sm)">
        <strong style="font-size:.85rem;color:var(--primary);display:flex;align-items:center;gap:6px;margin-bottom:10px">
          <span class="material-icons" style="font-size:16px">add_card</span> Add Payment Entry (Partial / Split Mode)
        </strong>

        <div class="form-grid" style="font-size:.85rem">
          <div class="form-group form-full">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <label style="margin:0">Amount to Pay (₹) <span class="required">*</span></label>
              ${dueAmount > 0 ? `
              <div style="display:flex;gap:4px">
                <button type="button" class="btn btn-xs btn-ghost" onclick="document.getElementById('pay-amount').value = ${Math.min(100, dueAmount)};">₹100</button>
                <button type="button" class="btn btn-xs btn-ghost" onclick="document.getElementById('pay-amount').value = ${Math.min(500, dueAmount)};">₹500</button>
                <button type="button" class="btn btn-xs btn-ghost" onclick="document.getElementById('pay-amount').value = ${Math.min(1000, dueAmount)};">₹1,000</button>
                <button type="button" class="btn btn-xs btn-primary" onclick="document.getElementById('pay-amount').value = ${dueAmount};">Full (₹${dueAmount})</button>
              </div>
              ` : ''}
            </div>
            <input id="pay-amount" type="number" step="0.01" value="${dueAmount > 0 ? dueAmount : ''}" placeholder="e.g. 100 or 1000" style="font-size:1.1rem;font-weight:700">
          </div>

          <div class="form-group">
            <label>Payment Method <span class="required">*</span></label>
            <select id="pay-method">
              ${PAYMENT_METHODS.map(m => `<option value="${m}">${m}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label>Payment Date <span class="required">*</span></label>
            <input id="pay-date" type="date" value="${today}">
          </div>

          <div class="form-group form-full">
            <label>Reference / Transaction ID / UTR / Cheque</label>
            <input id="pay-ref" placeholder="e.g. UPI-Ref / Cash counter / Cheque #">
          </div>

          <div class="form-group form-full">
            <label>Notes / Remarks</label>
            <input id="pay-notes" placeholder="Optional remarks…">
          </div>
        </div>
      </div>
      `,
      `
      <button class="btn btn-ghost" onclick="App.closeModal()">Close</button>
      <button class="btn btn-primary" onclick="Billing._savePaymentEntry('${id}','${type}')"><span class="material-icons">save</span> Save Payment</button>
      `,
      'modal-md'
    );
  },

  _savePaymentEntry(id, type) {
    const amt = parseFloat(document.getElementById('pay-amount')?.value) || 0;
    if (amt <= 0) {
      App.toast('Please enter a valid payment amount greater than 0', 'error');
      document.getElementById('pay-amount')?.focus();
      return;
    }

    const method = document.getElementById('pay-method')?.value || 'Cash';
    const date = document.getElementById('pay-date')?.value || new Date().toISOString().split('T')[0];
    const ref = document.getElementById('pay-ref')?.value.trim() || '';
    const notes = document.getElementById('pay-notes')?.value.trim() || '';

    const updated = DB.addDocPayment(id, type, { amount: amt, method, date, ref, notes });
    if (!updated) return;

    const remainingDue = DB.getDocDueAmount(updated);
    if (remainingDue > 0) {
      App.toast(`✅ Recorded ₹${amt.toLocaleString('en-IN')} via ${method}! Remaining Due: ₹${remainingDue.toLocaleString('en-IN')}`, 'info');
      this.markPaid(id, type);
    } else {
      App.toast(`🎉 Full payment completed for ${type === 'sales' ? updated.invoiceNo : updated.billNo}!`, 'success');
      App.closeModal();
      App.refreshSidebar();
      setTimeout(() => App.route(), 300);
    }
  },

  editPayment(docId, type, paymentId) {
    const isSales = type === 'sales';
    const doc = isSales ? DB.getSaleById(docId) : DB.getPurchaseById(docId);
    if (!doc) return;

    const payments = DB.getDocPayments(doc);
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;

    App.modal('✏️ Edit Payment / Change Method',
      `
      <div class="form-grid" style="font-size:.85rem">
        <div class="form-group form-full">
          <label>Payment Method <span class="required">*</span></label>
          <select id="edit-pay-method">
            ${PAYMENT_METHODS.map(m => `<option value="${m}" ${m === payment.method ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>Amount (₹) <span class="required">*</span></label>
          <input id="edit-pay-amount" type="number" step="0.01" value="${payment.amount}">
        </div>

        <div class="form-group">
          <label>Payment Date <span class="required">*</span></label>
          <input id="edit-pay-date" type="date" value="${payment.date}">
        </div>

        <div class="form-group form-full">
          <label>Reference / Transaction ID / UTR</label>
          <input id="edit-pay-ref" value="${payment.ref || ''}" placeholder="e.g. UPI-Ref / Cheque #">
        </div>

        <div class="form-group form-full">
          <label>Notes</label>
          <input id="edit-pay-notes" value="${payment.notes || ''}">
        </div>
      </div>
      `,
      `
      <button class="btn btn-ghost" onclick="Billing.markPaid('${docId}','${type}')">Back</button>
      <button class="btn btn-primary" onclick="Billing._saveEditedPayment('${docId}','${type}','${paymentId}')"><span class="material-icons">check</span> Update Payment</button>
      `,
      'modal-sm'
    );
  },

  _saveEditedPayment(docId, type, paymentId) {
    const amt = parseFloat(document.getElementById('edit-pay-amount')?.value) || 0;
    if (amt <= 0) {
      App.toast('Amount must be greater than 0', 'error');
      return;
    }
    const method = document.getElementById('edit-pay-method')?.value || 'Cash';
    const date = document.getElementById('edit-pay-date')?.value || new Date().toISOString().split('T')[0];
    const ref = document.getElementById('edit-pay-ref')?.value.trim() || '';
    const notes = document.getElementById('edit-pay-notes')?.value.trim() || '';

    DB.updateDocPayment(docId, type, paymentId, { amount: amt, method, date, ref, notes });
    App.toast(`Payment method updated to ${method}! 💳`, 'success');
    this.markPaid(docId, type);
  },

  deletePayment(docId, type, paymentId) {
    if (!confirm('Remove this payment record?\n\nThe due balance will be restored.')) return;
    DB.deleteDocPayment(docId, type, paymentId);
    App.toast('Payment entry removed. Due amount updated.', 'warning');
    this.markPaid(docId, type);
  },

  /* ═══════════════════════════════════════════
     DELETE
  ═══════════════════════════════════════════ */
  deleteDoc(id, type) {
    if (DB.getRole() === 'staff') {
      App.toast('🔒 Staff cannot delete invoices/bills. Owner Mode required.', 'error');
      App.toggleRoleModal();
      return;
    }
    App.modal('Confirm Delete',
      `<div class="confirm-body">
        <span class="material-icons">delete_forever</span>
        <h3>Delete ${type === 'sales' ? 'Invoice' : 'Bill'}?</h3>
        <p>This cannot be undone. Stock levels will not be reversed automatically.</p>
      </div>`,
      `<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
       <button class="btn btn-danger" onclick="Billing._doDelete('${id}','${type}')">Delete</button>`,
      'modal-sm'
    );
  },

  _doDelete(id, type) {
    if (type === 'sales') DB.deleteSale(id); else DB.deletePurchase(id);
    App.toast('Deleted successfully');
    App.closeModal();
    App.refreshSidebar();
    setTimeout(() => App.route(), 300);
  },

  /* ═══════════════════════════════════════════
     SHARE VIA WHATSAPP (LICENSED FEATURE 💎)
  ═══════════════════════════════════════════ */
  shareWhatsApp(id, type) {
    const limits = DB.getTrialLimits();
    if (limits.isTrial) {
      App.toast('🔒 WhatsApp Bill Sharing is exclusive to Licensed Commercial users. Activate your license to send WhatsApp invoices.', 'warning');
      App.openLicenseModal();
      return;
    }

    const isSales = type === 'sales';
    const doc = isSales ? DB.getSaleById(id) : DB.getPurchaseById(id);
    if (!doc) return;

    const biz = DB.getBiz();
    const no = isSales ? doc.invoiceNo : doc.billNo;
    const partyName = isSales ? doc.customerName : doc.supplierName;
    const customerObj = isSales ? DB.getCustomerById(doc.customerId) : null;
    const supplierObj = !isSales ? DB.getSupplierById(doc.supplierId) : null;
    const partyPhone = isSales 
      ? (doc.customerWhatsapp || customerObj?.whatsapp || doc.customerPhone || customerObj?.phone || '') 
      : (doc.supplierWhatsapp || supplierObj?.whatsapp || doc.supplierPhone || supplierObj?.phone || '');

    const itemsSummary = (doc.items || []).map((it, idx) => `• *${it.name}* (Qty: ${it.qty} ${it.unit || 'Nos'}) - ₹${(it.totalAmt || 0).toLocaleString('en-IN')}`).join('\n');

    let msg = `🧾 *TAX INVOICE — ${biz.name}*\n`;
    if (biz.tagline) msg += `_${biz.tagline}_\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📄 *Invoice No:* ${no}\n`;
    msg += `📅 *Date:* ${fmtDate(doc.date)}\n`;
    msg += `👤 *Customer:* ${partyName}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🛒 *Items Purchased:*\n${itemsSummary}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💵 Subtotal: ₹${(doc.subtotal || 0).toLocaleString('en-IN')}\n`;
    msg += `📊 GST Tax: ₹${(doc.totalTax || 0).toLocaleString('en-IN')}\n`;
    msg += `💰 *Grand Total:* ₹${(doc.total || 0).toLocaleString('en-IN')}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;

    if (doc.status === 'paid') {
      msg += `✅ *Payment Status: PAID*\nThank you for doing business with us! 🙏\n`;
    } else {
      msg += `⏳ *Payment Status: DUE (₹${(doc.total || 0).toLocaleString('en-IN')})*\n`;
      msg += `⏰ *Due Date:* ${fmtDate(doc.dueDate)}\n\n`;
      if (biz.bankAccount) {
        msg += `🏦 *Payment Details:*\n`;
        msg += `Bank: ${biz.bankName || ''}\n`;
        msg += `A/C No: ${biz.bankAccount}\n`;
        msg += `IFSC: ${biz.bankIFSC || ''}\n`;
        if (biz.bankBranch) msg += `Branch: ${biz.bankBranch}\n`;
      }
    }

    if (biz.phone || biz.email) {
      msg += `\n📞 Support / Inquiry: ${biz.phone || ''} ${biz.email ? '| ' + biz.email : ''}\n`;
    }
    msg += `_Generated by ShopPulse_`;

    let cleanPhone = (partyPhone || '').replace(/\D/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

    const waUrl = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

    window.open(waUrl, '_blank');
    App.toast(`Opening WhatsApp for ${no}…`, 'success');
  },

  /* ═══════════════════════════════════════════
     EXPORT / SAVE AS PDF (LICENSED FEATURE 💎)
  ═══════════════════════════════════════════ */
  async exportPDF(id, type) {
    const limits = DB.getTrialLimits();
    if (limits.isTrial) {
      App.toast('🔒 1-Click PDF Bill Export is exclusive to Licensed Commercial users. Activate your license to unlock PDF generation.', 'warning');
      App.openLicenseModal();
      return;
    }

    const isSales = type === 'sales';
    const doc = isSales ? DB.getSaleById(id) : DB.getPurchaseById(id);
    if (!doc) return;

    const html = this.generateDocHtml(doc, type, window._viewDocFmt || DB.getBillFormat());
    const title = `${isSales ? (doc.invoiceNo || 'Invoice') : (doc.billNo || 'Bill')}_${(doc.customerName || doc.supplierName || 'Client').replace(/\s+/g, '_')}`;

    if (window.desktopApp && window.desktopApp.savePdf) {
      App.toast('Preparing PDF export dialog...', 'info');
      try {
        const res = await window.desktopApp.savePdf({ html, title });
        if (res && res.success) {
          App.toast(`🎉 PDF Saved Successfully!`, 'success');
        }
      } catch (err) {
        console.error('PDF export error:', err);
        this.printDoc(id, type);
      }
    } else {
      this.printDoc(id, type);
      App.toast('In the print dialog, choose "Save as PDF" 📄', 'info');
    }
  },

  /* ═══════════════════════════════════════════
     SAMPLE DOC PREVIEW
  ═══════════════════════════════════════════ */
  getSampleDoc() {
    const sales = DB.getSales();
    if (sales && sales.length > 0) return sales[0];
    const biz = DB.getBiz();
    return {
      id: 'SAMPLE-PREVIEW-001',
      invoiceNo: `${biz.invoicePrefix || 'APS'}/2026-27/0001`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      customerId: 'CUST-001',
      customerName: 'Zenith Infotech Pvt Ltd',
      customerGstin: '27AABCZ9321K1Z4',
      customerAddress: 'Plot 15, Rajiv Gandhi IT Park, Hinjewadi',
      customerCity: 'Pune',
      customerState: 'Maharashtra',
      customerStateCode: '27',
      customerPhone: '+91 98230 01122',
      customerWhatsapp: '+91 98230 01122',
      placeOfSupply: '27',
      isIntra: true,
      reverseCharge: false,
      status: 'unpaid',
      subtotal: 45000,
      totalCgst: 4050,
      totalSgst: 4050,
      totalIgst: 0,
      totalTax: 8100,
      total: 53100,
      items: [
        { name: 'Hikvision 4MP IP Dome Camera (ColorVu)', hsn: '8525', qty: 4, unit: 'Nos', rate: 4500, discount: 0, taxableValue: 18000, cgstRate: 9, cgstAmt: 1620, sgstRate: 9, sgstAmt: 1620, igstRate: 0, igstAmt: 0, totalAmt: 21240 },
        { name: 'Hikvision 16-Channel 4K NVR', hsn: '8521', qty: 1, unit: 'Nos', rate: 12000, discount: 0, taxableValue: 12000, cgstRate: 9, cgstAmt: 1080, sgstRate: 9, sgstAmt: 1080, igstRate: 0, igstAmt: 0, totalAmt: 14160 },
        { name: 'Western Digital 4TB Purple Surveillance HDD', hsn: '8471', qty: 1, unit: 'Nos', rate: 8500, discount: 0, taxableValue: 8500, cgstRate: 9, cgstAmt: 765, sgstRate: 9, sgstAmt: 765, igstRate: 0, igstAmt: 0, totalAmt: 10030 },
        { name: 'CCTV Installation & Network Setup', hsn: '998714', qty: 1, unit: 'Job', rate: 6500, discount: 0, taxableValue: 6500, cgstRate: 9, cgstAmt: 585, sgstRate: 9, sgstAmt: 585, igstRate: 0, igstAmt: 0, totalAmt: 7670 }
      ]
    };
  },

  /* ═══════════════════════════════════════════
     PRINT DOCUMENT (Sales Invoice / Purchase Bill)
  ═══════════════════════════════════════════ */
  printDoc(id, type, formatOverride = null) {
    const isSales = type === 'sales';
    const doc = isSales ? DB.getSaleById(id) : DB.getPurchaseById(id);
    if (!doc) {
      App.toast('Document not found for printing', 'error');
      return;
    }

    const format = formatOverride || window._viewDocFmt || DB.getBillFormat() || 'classic';
    const html = this.generateDocHtml(doc, type, format, false);
    this._executePrint(html);
  },

  generateDocHtml(doc, type = 'sales', formatOverride = null, forcePreview = false) {
    if (!doc) return '';
    const isSales = type === 'sales';
    const biz = DB.getBiz();
    const posState = INDIAN_STATES.find(s => s.code === (isSales ? doc.placeOfSupply : (doc.buyerStateCode || biz.stateCode)));
    const no = isSales ? doc.invoiceNo : doc.billNo;
    const partyName = isSales ? doc.customerName : doc.supplierName;
    const partyGstin = isSales ? (doc.customerGstin || '') : (doc.supplierGstin || '');
    const partyAddr = isSales ? doc.customerAddress : (doc.supplierAddress || '');
    const partyState = isSales ? doc.customerState : doc.supplierState;

    const limits = DB.getTrialLimits();
    const showWatermark = !forcePreview && limits.isTrial && limits.isWatermarkNeeded;
    const format = (limits.isTrial && !forcePreview) ? 'classic' : (formatOverride || DB.getBillFormat() || 'classic');
    const customTpl = DB.getCustomTemplate();

    // ─── 1. COMPACT 3-INCH THERMAL POS FORMAT (80MM ROLL) ───
    if (format === 'compact_pos') {
      return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${no} - POS</title>
<style>
@page { size: 80mm auto; margin: 2mm; }
body { font-family: 'Courier New', Courier, monospace, sans-serif; font-size: 8.5pt; color: #000; width: 74mm; margin: 0 auto; padding: 4px 2px; }
.pos-center { text-align: center; }
.pos-title { font-size: 11pt; font-weight: 900; }
.pos-sub { font-size: 7.5pt; line-height: 1.3; }
.pos-divider { border-top: 1px dashed #000; margin: 5px 0; }
.pos-table { width: 100%; font-size: 8pt; border-collapse: collapse; }
.pos-table th { border-bottom: 1px dashed #000; padding: 3px 0; text-align: left; }
.pos-table td { padding: 3px 0; vertical-align: top; }
.pos-right { text-align: right; }
.pos-totals { width: 100%; font-size: 8.5pt; margin-top: 4px; }
.pos-totals td { padding: 2px 0; }
.pos-grand { font-size: 10pt; font-weight: 900; border-top: 1px solid #000; border-bottom: 1px solid #000; }
@media print { body { width: 100%; } }
</style>
</head>
<body>
<div class="pos-center">
  <div class="pos-title">${biz.name}</div>
  <div class="pos-sub">${biz.address}, ${biz.city} — ${biz.pincode}<br>Phone: ${biz.phone} | GSTIN: ${biz.gstin || '—'}</div>
</div>
<div class="pos-divider"></div>
<div style="font-size:8pt;line-height:1.4">
  <div><strong>${isSales ? 'TAX INVOICE' : 'PURCHASE BILL'}:</strong> ${no}</div>
  <div><strong>Date:</strong> ${fmtDate(doc.date)}</div>
  <div><strong>Customer:</strong> ${partyName}</div>
  ${partyGstin ? `<div><strong>GSTIN:</strong> ${partyGstin}</div>` : ''}
  ${doc.hasShippingAddress && doc.shippingAddress ? `<div><strong>Ship To:</strong> ${doc.shippingName || partyName}, ${doc.shippingAddress}</div>` : ''}
</div>
<div class="pos-divider"></div>
<table class="pos-table">
  <thead>
    <tr><th>Item</th><th class="pos-right">Qty</th><th class="pos-right">Rate</th><th class="pos-right">Total</th></tr>
  </thead>
  <tbody>
    ${(doc.items || []).map(it => `
      <tr>
        <td>${it.name}</td>
        <td class="pos-right">${it.qty} ${it.unit}</td>
        <td class="pos-right">${parseFloat(it.rate).toFixed(0)}</td>
        <td class="pos-right font-bold">${parseFloat(it.totalAmt).toFixed(2)}</td>
      </tr>
    `).join('')}
  </tbody>
</table>
<div class="pos-divider"></div>
<table class="pos-totals">
  <tr><td>Taxable Subtotal:</td><td class="pos-right">${fmtCurrency(doc.subtotal)}</td></tr>
  ${doc.isIntra ? `<tr><td>CGST + SGST:</td><td class="pos-right">${fmtCurrency(doc.totalCgst + doc.totalSgst)}</td></tr>` : `<tr><td>IGST:</td><td class="pos-right">${fmtCurrency(doc.totalIgst)}</td></tr>`}
  <tr class="pos-grand"><td><strong>NET TOTAL:</strong></td><td class="pos-right"><strong>${fmtCurrency(doc.total)}</strong></td></tr>
</table>
${!limits.isTrial && isSales && biz.upiId ? `
<div class="pos-center" style="margin-top:6px">
  <div style="font-size:7pt;font-weight:700">SCAN &amp; PAY UPI</div>
  <img src="https://api.qrserver.com/v1/create-qr-code/?size=85x85&margin=0&data=${encodeURIComponent(`upi://pay?pa=${biz.upiId}&pn=${biz.name}&am=${parseFloat(doc.total).toFixed(2)}&tn=${encodeURIComponent('Invoice ' + no)}&cu=INR`)}" style="width:70px;height:70px;margin:3px auto;display:block">
  <div style="font-size:6.5pt">${biz.upiId}</div>
</div>
` : ''}
<div class="pos-divider"></div>
<div class="pos-center pos-sub">Thank you for your business!<br>${biz.website || 'Visit Again!'}</div>
</body></html>`;
    }

    // ─── 2. STANDARD A4 MULTI-FORMAT THEMES (Classic, Modern, Executive, Custom) ───
    let primaryColor = '#1a2332';
    let accentColor = '#2563eb';
    let fontFamily = 'Arial, Helvetica, sans-serif';
    let headerBorder = '1.5px solid #222';
    let headerBgStyle = 'background: #1a2332; color: #fff;';
    let itemTableBorder = 'border: .5pt solid #bbb;';
    let zebraRows = false;
    let logoPos = 'left';

    if (format === 'modern') {
      primaryColor = '#1d4ed8';
      accentColor = '#3b82f6';
      fontFamily = "'Segoe UI', Roboto, Helvetica, sans-serif";
      headerBorder = '1.5px solid #e2e8f0; border-radius: 8px; overflow: hidden;';
      headerBgStyle = 'background: #1d4ed8; color: #fff; letter-spacing: 0.1em;';
      itemTableBorder = 'border-bottom: 1px solid #e2e8f0;';
      zebraRows = true;
    } else if (format === 'executive') {
      primaryColor = '#0f172a';
      accentColor = '#d97706';
      fontFamily = "'Segoe UI', Georgia, serif";
      headerBorder = '2px solid #0f172a;';
      headerBgStyle = 'background: #0f172a; color: #f8fafc; border-bottom: 3px solid #d97706;';
      itemTableBorder = 'border: .5pt solid #cbd5e1;';
      zebraRows = true;
    } else if (format === 'custom') {
      primaryColor = customTpl.primaryColor || '#1a2332';
      accentColor = customTpl.accentColor || '#2563eb';
      fontFamily = customTpl.fontFamily || 'Arial, Helvetica, sans-serif';
      headerBorder = `1.5px solid ${primaryColor}`;
      headerBgStyle = `background: ${primaryColor}; color: #fff;`;
      zebraRows = customTpl.zebraRows || false;
      logoPos = customTpl.logoPosition || 'left';
    }

    let taxCols = doc.isIntra
      ? `<th>CGST Rate</th><th>CGST Amt</th><th>SGST Rate</th><th>SGST Amt</th>`
      : `<th>IGST Rate</th><th>IGST Amt</th>`;

    let itemRows = (doc.items || []).map((item, i) => {
      let taxCells = doc.isIntra
        ? `<td class="rate">${item.cgstRate}%</td><td class="amount">${fmtCurrency(item.cgstAmt)}</td><td class="rate">${item.sgstRate}%</td><td class="amount">${fmtCurrency(item.sgstAmt)}</td>`
        : `<td class="rate">${item.igstRate}%</td><td class="amount">${fmtCurrency(item.igstAmt)}</td>`;
      return `<tr ${zebraRows && i % 2 === 1 ? 'style="background:#f8fafc"' : ''}>
        <td class="sr">${i + 1}</td>
        <td>${item.name}${item.discount ? ` <em>(${item.discount}% disc)</em>` : ''}</td>
        <td class="hsn">${item.hsn || ''}</td>
        <td class="qty">${item.qty}</td>
        <td>${item.unit}</td>
        <td class="rate">${fmtCurrency(item.rate)}</td>
        <td class="amount">${fmtCurrency(item.taxableValue)}</td>
        ${taxCells}
        <td class="amount"><strong>${fmtCurrency(item.totalAmt)}</strong></td>
      </tr>`;
    }).join('');

    let totalTaxRows = doc.isIntra
      ? `<tr><td>CGST</td><td>${fmtCurrency(doc.totalCgst)}</td></tr><tr><td>SGST</td><td>${fmtCurrency(doc.totalSgst)}</td></tr>`
      : `<tr><td>IGST</td><td>${fmtCurrency(doc.totalIgst)}</td></tr>`;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${no} - ${biz.name}</title>
<style>
@page { size: A4; margin: 10mm 12mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: ${fontFamily}; font-size: 9pt; color: #111; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.inv-wrap { max-width: 210mm; margin: 0 auto; ${headerBorder} position: relative; }
.inv-title-bar { ${headerBgStyle} text-align: center; font-size: 13pt; font-weight: 800; letter-spacing: .08em; padding: 6px 0; text-transform: uppercase; }
.watermark {
  position: absolute;
  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-35deg);
  font-size: 38pt;
  font-weight: 900;
  color: rgba(220, 53, 69, 0.14);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  pointer-events: none;
  z-index: 100;
  text-align: center;
  line-height: 1.2;
  border: 3.5px dashed rgba(220, 53, 69, 0.22);
  padding: 24px 44px;
  border-radius: 12px;
}
.trial-footer-banner {
  text-align: center;
  font-size: 7.5pt;
  font-weight: 700;
  color: #c0392b;
  padding: 6px 0;
  margin-top: 10px;
  border-top: 1px dashed #e74c3c;
}
.inv-biz-row { display: flex; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid #ccc; align-items: center; }
.inv-biz-name { font-size: 12pt; font-weight: 700; color: ${primaryColor}; }
.inv-meta-table td { padding: 2px 4px; font-size: 8.5pt; }
.inv-meta-table td:first-child { color: #555; text-align: right; padding-right: 8px; }
.inv-meta-table td:last-child { font-weight: 700; }
.inv-parties { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #ccc; }
.inv-party { padding: 10px 14px; }
.inv-party:first-child { border-right: 1px solid #ccc; }
.inv-party-label { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #555; margin-bottom: 4px; }
.inv-party-name { font-size: 10.5pt; font-weight: 700; margin-bottom: 2px; }
.inv-party-addr { font-size: 8.5pt; color: #333; line-height: 1.5; }
.inv-party-gstin { font-size: 8.5pt; font-weight: 700; color: ${primaryColor}; margin-top: 4px; }
.supply-bar { padding: 5px 14px; background: #f5f5f5; border-bottom: 1px solid #ccc; font-size: 8.5pt; color: #333; }
table.items { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
table.items th { background: #e8eaf0; padding: 6px 5px; text-align: center; font-size: 7.5pt; text-transform: uppercase; border: .5pt solid #aaa; }
table.items td { ${itemTableBorder} padding: 5px 5px; vertical-align: middle; }
table.items .sr, table.items .qty, table.items .hsn { text-align: center; }
table.items .rate, table.items .amount { text-align: right; }
.inv-footer { display: grid; grid-template-columns: 1fr auto; border-top: 1px solid #ccc; }
.inv-bank { padding: 10px 14px; border-right: 1px solid #ccc; }
.inv-totals { min-width: 220px; }
.inv-totals table { width: 100%; border-collapse: collapse; }
.inv-totals table td { padding: 4px 10px; border-bottom: .5pt solid #eee; font-size: 8.5pt; }
.grand-total td { background: ${primaryColor} !important; color: #fff !important; font-weight: 800 !important; font-size: 10pt !important; padding: 7px 10px !important; }
.inv-words { border-top: 1px solid #ccc; padding: 6px 14px; font-size: 8pt; font-style: italic; }
.inv-sign { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid #ccc; }
.inv-sign-box { padding: 10px 14px; min-height: 60px; font-size: 8pt; color: #555; }
.inv-sign-box:first-child { border-right: 1px solid #ccc; }
.inv-sign-name { font-weight: 700; font-size: 9pt; color: #000; margin-top: 24px; }
.rc-note { font-size: 7.5pt; color: #777; padding: 4px 14px; border-top: .5pt solid #ccc; }
@media print { .inv-wrap { border: none; } }
</style>
</head>
<body>
<div class="inv-wrap">
  <div class="inv-title-bar">${isSales ? 'TAX INVOICE' : 'PURCHASE ORDER'}</div>
  <div class="inv-biz-row">
    <div style="display:flex;align-items:center;gap:12px;${logoPos === 'right' ? 'flex-direction:row-reverse' : ''}">
      ${!limits.isTrial && biz.logo && logoPos !== 'none' ? `<img src="${biz.logo}" style="max-height:52px;max-width:90px;object-fit:contain">` : ''}
      <div>
        <div class="inv-biz-name">${biz.name}</div>
        <div style="font-size:8.5pt">${biz.address}, ${biz.city} — ${biz.pincode}</div>
        <div style="font-size:8.5pt">GSTIN: ${biz.gstin || '—'}</div>
      </div>
    </div>
    <div>
      <table class="inv-meta-table">
        <tr><td>${isSales ? 'Invoice No.' : 'PO / Bill No.'}</td><td>${no}</td></tr>
        <tr><td>Date</td><td>${fmtDate(doc.date)}</td></tr>
      </table>
    </div>
  </div>
  <div class="inv-parties" style="${doc.hasShippingAddress && doc.shippingAddress ? 'grid-template-columns: 1fr 1fr 1fr;' : ''}">
    ${isSales ? `
    <div class="inv-party">
      <div class="inv-party-label">Seller / Supplier</div>
      <div class="inv-party-name">${biz.name}</div>
      <div class="inv-party-addr">${biz.address}, ${biz.city} — ${biz.pincode}<br>${biz.state}</div>
      <div class="inv-party-gstin">GSTIN: ${biz.gstin || '—'}</div>
    </div>
    <div class="inv-party">
      <div class="inv-party-label">Billed To (Buyer)</div>
      <div class="inv-party-name">${partyName}</div>
      <div class="inv-party-addr">${partyAddr}<br>${partyState || ''}</div>
      <div class="inv-party-gstin">${partyGstin ? 'GSTIN: ' + partyGstin : 'Unregistered (Consumer)'}</div>
    </div>
    ${doc.hasShippingAddress && doc.shippingAddress ? `
    <div class="inv-party" style="border-left:1px solid #ccc;background:#fcfcfc">
      <div class="inv-party-label" style="color:${primaryColor}">Shipped To (Consignee)</div>
      <div class="inv-party-name">${doc.shippingName || partyName}</div>
      <div class="inv-party-addr">${doc.shippingAddress}${doc.shippingCity ? ', ' + doc.shippingCity : ''}${doc.shippingPincode ? ' — ' + doc.shippingPincode : ''}<br>${doc.shippingState || ''}</div>
      <div class="inv-party-gstin">${doc.shippingGstin ? 'GSTIN: ' + doc.shippingGstin : (partyGstin ? 'GSTIN: ' + partyGstin : 'Unregistered')}</div>
    </div>` : ''}
    ` : `
    <div class="inv-party">
      <div class="inv-party-label">Supplier / Vendor</div>
      <div class="inv-party-name">${partyName}</div>
      <div class="inv-party-addr">${partyAddr}<br>${partyState || ''}</div>
      <div class="inv-party-gstin">${partyGstin ? 'GSTIN: ' + partyGstin : 'Unregistered (Vendor)'}</div>
    </div>
    <div class="inv-party">
      <div class="inv-party-label">Billed To (Buyer)</div>
      <div class="inv-party-name">${biz.name}</div>
      <div class="inv-party-addr">${biz.address}, ${biz.city} — ${biz.pincode}<br>${biz.state}</div>
      <div class="inv-party-gstin">GSTIN: ${biz.gstin || '—'}</div>
    </div>
    ${doc.hasShippingAddress && doc.shippingAddress ? `
    <div class="inv-party" style="border-left:1px solid #ccc;background:#fcfcfc">
      <div class="inv-party-label" style="color:${primaryColor}">Delivered To (Site / Branch)</div>
      <div class="inv-party-name">${doc.shippingName || biz.name}</div>
      <div class="inv-party-addr">${doc.shippingAddress}${doc.shippingCity ? ', ' + doc.shippingCity : ''}${doc.shippingPincode ? ' — ' + doc.shippingPincode : ''}<br>${doc.shippingState || ''}</div>
      <div class="inv-party-gstin">GSTIN: ${doc.shippingGstin || biz.gstin || '—'}</div>
    </div>` : ''}
    `}
  </div>
  <table class="items">
    <thead>
      <tr>
        <th style="width:22px">Sr.</th>
        <th>Description</th>
        <th style="width:70px">HSN</th>
        <th style="width:40px">Qty</th>
        <th style="width:40px">Unit</th>
        <th style="width:75px">Rate</th>
        <th style="width:80px">Taxable</th>
        ${taxCols}
        <th style="width:85px">Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="inv-footer">
    <div class="inv-bank">
      ${isSales ? `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div>
          <h4 style="font-size:7.5pt;font-weight:700;text-transform:uppercase;color:${primaryColor};margin-bottom:4px">Bank Details for Payment</h4>
          <table style="font-size:8pt">
            <tr><td>Bank Name</td><td>${biz.bankName || '—'}</td></tr>
            <tr><td>Account No.</td><td>${biz.bankAccount || '—'}</td></tr>
            <tr><td>IFSC Code</td><td>${biz.bankIFSC || '—'}</td></tr>
            <tr><td>Branch</td><td>${biz.bankBranch || '—'}</td></tr>
            ${biz.upiId ? `<tr><td>UPI ID</td><td><strong>${biz.upiId}</strong></td></tr>` : ''}
          </table>
        </div>
        ${!limits.isTrial && biz.upiId ? `
        <div style="text-align:center;border:1px solid #cbd5e1;padding:5px 8px;border-radius:4px;background:#f8fafc;min-width:96px">
          <div style="font-size:6.5pt;font-weight:700;color:${primaryColor};margin-bottom:2px;letter-spacing:0.04em">SCAN &amp; PAY UPI</div>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&margin=0&data=${encodeURIComponent(`upi://pay?pa=${biz.upiId}&pn=${biz.name}&am=${parseFloat(doc.total).toFixed(2)}&tn=${encodeURIComponent('Invoice ' + no)}&cu=INR`)}" style="width:78px;height:78px;display:block;margin:0 auto;background:#fff;padding:2px;border:1px solid #e2e8f0" alt="UPI QR">
          <div style="font-size:6pt;font-weight:700;color:${doc.status === 'paid' ? '#059669' : '#d97706'};margin-top:2px">${fmtCurrency(doc.total)} ${doc.status === 'paid' ? '(Paid)' : '(Due)'}</div>
        </div>
        ` : ''}
      </div>
      ${doc.notes ? `<div style="margin-top:8px;font-size:8pt;color:#333"><strong>Notes:</strong> ${doc.notes}</div>` : ''}
      ${customTpl.customNotes ? `<div style="margin-top:6px;font-size:8pt;color:${primaryColor};font-style:italic"><strong>Message:</strong> ${customTpl.customNotes}</div>` : ''}
      ${biz.termsAndConditions ? `<div style="margin-top:8px;font-size:7.5pt;color:#555"><strong>Terms:</strong><br>${biz.termsAndConditions.replace(/\n/g, '<br>')}</div>` : ''}
      ` : `
      <h4 style="font-size:7.5pt;font-weight:700;text-transform:uppercase;color:${primaryColor};margin-bottom:4px">Order &amp; Delivery Instructions</h4>
      <div style="font-size:8pt;color:#333;line-height:1.5">
        <div><strong>Deliver To:</strong> ${biz.name}, ${biz.address}, ${biz.city} — ${biz.pincode}</div>
        <div><strong>Contact:</strong> ${biz.phone} | ${biz.email}</div>
        ${doc.notes ? `<div style="margin-top:6px"><strong>Notes:</strong> ${doc.notes}</div>` : ''}
        <div style="margin-top:6px;font-size:7.5pt;color:#666">Please attach original Tax Invoice and Warranty cards along with the shipment.</div>
      </div>
      `}
    </div>
    <div class="inv-totals">
      <table>
        <tr><td>Taxable Value</td><td>${fmtCurrency(doc.subtotal)}</td></tr>
        ${totalTaxRows}
        <tr><td><strong>Total Tax</strong></td><td>${fmtCurrency(doc.totalTax)}</td></tr>
        <tr class="grand-total"><td>GRAND TOTAL</td><td>${fmtCurrency(doc.total)}</td></tr>
      </table>
    </div>
  </div>
  <div class="inv-words">
    Amount in Words: <strong>${numberToWords(doc.total)}</strong>
  </div>
  <div class="inv-sign">
    <div class="inv-sign-box">
      <div>${isSales ? 'Received goods / services in good condition.' : "Supplier's Acknowledgment &amp; Seal"}</div>
      <div class="inv-sign-name">${isSales ? "Receiver's Signature &amp; Seal" : "Supplier / Dispatch Signatory"}</div>
    </div>
    <div class="inv-sign-box" style="text-align:right">
      <div>For <strong>${biz.name}</strong></div>
      <div class="inv-sign-name">${biz.signatory || 'Authorized Signatory'}</div>
    </div>
  </div>
  <div class="rc-note">${isSales ? 'This is a computer-generated invoice and does not require a physical signature.' : 'This is an official computer-generated Purchase Order.'} ${doc.reverseCharge ? '<strong>Tax is payable on reverse charge basis.</strong>' : 'Tax is not payable on reverse charge basis.'}</div>
</div>
${showWatermark ? `
<div class="watermark">
  SHOPPULSE TRIAL<br>
  <span style="font-size:14pt;font-weight:700;letter-spacing:0.04em">Activate: shraban@andropcsoft.com</span>
</div>
<div class="trial-footer-banner">
  ⚠️ Generated with ShopPulse 60-Day Trial Version (Bill #${limits.currentBills} of ${limits.maxTotalBills}). For permanent watermark-free printing, contact developer Shraban Kumar Mahato (shraban@andropcsoft.com).
</div>
` : ''}
</body></html>`;

    this._executePrint(html);
  },

  async _executePrint(html) {
    App.closeModal();

    // 1. If running in Electron Desktop App, use native desktop print bridge
    if (window.desktopApp && typeof window.desktopApp.printHtml === 'function') {
      try {
        await window.desktopApp.printHtml(html);
        return;
      } catch (err) {
        console.error('Desktop print bridge failed, falling back:', err);
      }
    }

    // 2. Standard Web / Browser Fallback (Popup window with direct print call)
    try {
      const w = window.open('', '_blank');
      if (w) {
        w.document.open();
        w.document.write(html);
        w.document.close();
        setTimeout(() => {
          try {
            w.focus();
            w.print();
          } catch (e) {}
        }, 300);
      } else {
        App.toast('Please allow popups to print invoices', 'warning');
      }
    } catch (err) {
      console.error('Print execution error:', err);
    }
  },

  /* ═══════════════════════════════════════════
     RECEIVABLES
  ═══════════════════════════════════════════ */
  renderReceivables(container) {
    const sales = DB.getSales().filter(s => s.status !== 'paid' && s.status !== 'draft');
    const today = new Date();

    const aging = {
      current: sales.filter(s => daysBetween(today, new Date(s.dueDate)) >= 0),
      d30: sales.filter(s => { const d = daysBetween(today, new Date(s.dueDate)); return d < 0 && d >= -30; }),
      d60: sales.filter(s => { const d = daysBetween(today, new Date(s.dueDate)); return d < -30 && d >= -60; }),
      d90: sales.filter(s => daysBetween(today, new Date(s.dueDate)) < -60),
    };

    container.innerHTML = `
      <div class="page-header-row"><h2>Receivables (Unpaid Invoices)</h2></div>
      <div class="aging-grid">
        ${[
      { label: 'Not Due', cls: 'aging-current', items: aging.current },
      { label: '1–30 Days Overdue', cls: 'aging-30', items: aging.d30 },
      { label: '31–60 Days Overdue', cls: 'aging-60', items: aging.d60 },
      { label: '60+ Days Overdue', cls: 'aging-90', items: aging.d90 },
    ].map(a => `
          <div class="aging-card ${a.cls}">
            <div class="aging-label">${a.label}</div>
            <div class="aging-amount">${fmtCurrency(a.items.reduce((s, i) => s + i.total, 0))}</div>
            <div class="aging-count">${a.items.length} invoice${a.items.length !== 1 ? 's' : ''}</div>
          </div>`).join('')}
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Invoice No</th><th>Customer</th><th>Invoice Date</th><th>Due Date</th><th>Days Overdue</th><th class="text-right">Balance Due</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${sales.length === 0 ? `<tr><td colspan="8"><div class="table-empty"><span class="material-icons">check_circle</span><p>All invoices are paid! 🎉</p></div></td></tr>` :
        sales.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).map(s => {
          const daysOver = -daysBetween(today, new Date(s.dueDate));
          const isOver = daysOver > 0;
          const dueAmt = DB.getDocDueAmount(s);
          const paidAmt = DB.getDocPaidAmount(s);
          let badge = `<span class="badge badge-${s.status}">${s.status}</span>`;
          if (s.status === 'partial') badge = `<span class="badge badge-partial">Partial (${fmtCurrency(paidAmt)})</span>`;

          return `<tr onclick="Billing.viewDoc('${s.id}','sales')" style="cursor:pointer">
                <td><span class="mono">${s.invoiceNo}</span></td>
                <td><div style="font-weight:600">${s.customerName}</div><div style="font-size:.72rem;color:var(--text-secondary);font-family:monospace">${s.customerGstin || 'Unregistered'}</div></td>
                <td>${fmtDate(s.date)}</td>
                <td style="${isOver ? 'color:var(--danger);font-weight:600' : ''}">${fmtDate(s.dueDate)}</td>
                <td>${isOver ? `<span class="badge badge-overdue">${daysOver} days</span>` : '<span class="badge badge-success">Not due</span>'}</td>
                <td class="text-right amount-cell ${isOver ? 'due' : ''}">
                  <div>${fmtCurrency(dueAmt)}</div>
                  ${paidAmt > 0 ? `<div style="font-size:.7rem;color:var(--text-secondary)">Total: ${fmtCurrency(s.total)}</div>` : ''}
                </td>
                <td>${badge}</td>
                <td class="action-col" onclick="event.stopPropagation()"><button class="btn btn-xs btn-success" onclick="Billing.markPaid('${s.id}','sales')"><span class="material-icons" style="font-size:13px">payments</span> Record Payment</button></td>
              </tr>`;
        }).join('')}
          </tbody>
          ${sales.length > 0 ? `<tfoot><tr><td colspan="5" class="text-right">Total Outstanding Due</td><td colspan="2" class="text-right font-bold">${fmtCurrency(sales.reduce((s, i) => s + DB.getDocDueAmount(i), 0))}</td><td></td></tr></tfoot>` : ''}
        </table>
      </div>`;
  },

  /* ═══════════════════════════════════════════
     PAYABLES
  ═══════════════════════════════════════════ */
  renderPayables(container) {
    const purchases = DB.getPurchases().filter(p => p.status !== 'paid' && p.status !== 'draft');
    const today = new Date();

    const aging = {
      current: purchases.filter(p => daysBetween(today, new Date(p.dueDate)) >= 0),
      d30: purchases.filter(p => { const d = daysBetween(today, new Date(p.dueDate)); return d < 0 && d >= -30; }),
      d60: purchases.filter(p => { const d = daysBetween(today, new Date(p.dueDate)); return d < -30 && d >= -60; }),
      d90: purchases.filter(p => daysBetween(today, new Date(p.dueDate)) < -60),
    };

    container.innerHTML = `
      <div class="page-header-row"><h2>Payables (Bills to Pay)</h2></div>
      <div class="aging-grid">
        ${[
      { label: 'Not Due', cls: 'aging-current', items: aging.current },
      { label: '1–30 Days Overdue', cls: 'aging-30', items: aging.d30 },
      { label: '31–60 Days Overdue', cls: 'aging-60', items: aging.d60 },
      { label: '60+ Days Overdue', cls: 'aging-90', items: aging.d90 },
    ].map(a => `
          <div class="aging-card ${a.cls}">
            <div class="aging-label">${a.label}</div>
            <div class="aging-amount">${fmtCurrency(a.items.reduce((s, b) => s + DB.getDocDueAmount(b), 0))}</div>
            <div class="aging-count">${a.items.length} bill${a.items.length !== 1 ? 's' : ''}</div>
          </div>`).join('')}
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Bill No</th><th>Supplier</th><th>Bill Date</th><th>Due Date</th><th>Days Overdue</th><th class="text-right">Balance Due</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${purchases.length === 0 ? `<tr><td colspan="8"><div class="table-empty"><span class="material-icons">check_circle</span><p>No pending bills! 🎉</p></div></td></tr>` :
        purchases.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).map(p => {
          const daysOver = -daysBetween(today, new Date(p.dueDate));
          const isOver = daysOver > 0;
          const dueAmt = DB.getDocDueAmount(p);
          const paidAmt = DB.getDocPaidAmount(p);
          let badge = `<span class="badge badge-${p.status}">${p.status}</span>`;
          if (p.status === 'partial') badge = `<span class="badge badge-partial">Partial (${fmtCurrency(paidAmt)})</span>`;

          return `<tr onclick="Billing.viewDoc('${p.id}','purchases')" style="cursor:pointer">
                <td><span class="mono">${p.billNo}</span></td>
                <td><div style="font-weight:600">${p.supplierName}</div><div style="font-size:.72rem;color:var(--text-secondary);font-family:monospace">${p.supplierGstin || '—'}</div></td>
                <td>${fmtDate(p.date)}</td>
                <td style="${isOver ? 'color:var(--danger);font-weight:600' : ''}">${fmtDate(p.dueDate)}</td>
                <td>${isOver ? `<span class="badge badge-overdue">${daysOver} days</span>` : '<span class="badge badge-success">Not due</span>'}</td>
                <td class="text-right amount-cell ${isOver ? 'due' : ''}">
                  <div>${fmtCurrency(dueAmt)}</div>
                  ${paidAmt > 0 ? `<div style="font-size:.7rem;color:var(--text-secondary)">Total: ${fmtCurrency(p.total)}</div>` : ''}
                </td>
                <td>${badge}</td>
                <td class="action-col" onclick="event.stopPropagation()"><button class="btn btn-xs btn-success" onclick="Billing.markPaid('${p.id}','purchases')"><span class="material-icons" style="font-size:13px">payments</span> Record Payment</button></td>
              </tr>`;
        }).join('')}
          </tbody>
          ${purchases.length > 0 ? `<tfoot><tr><td colspan="5" class="text-right">Total Payable Due</td><td colspan="2" class="text-right font-bold">${fmtCurrency(purchases.reduce((s, b) => s + DB.getDocDueAmount(b), 0))}</td><td></td></tr></tfoot>` : ''}
        </table>
      </div>`;
  }
};
