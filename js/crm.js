'use strict';

/* ─────────────────────────────────────────────
   CRM Module — Customers & Suppliers
───────────────────────────────────────────── */
const CRM = {
  render(container, type = 'customers') {
    const isCustomer = type === 'customers';
    const contacts = isCustomer ? DB.getCustomers() : DB.getSuppliers();
    const sales = DB.getSales();
    const purchases = DB.getPurchases();

    let search = '';

    const getBalance = (contact) => {
      if (isCustomer) {
        const unpaid = sales.filter(s => s.customerId === contact.id && s.status !== 'paid' && s.status !== 'draft');
        return unpaid.reduce((s, i) => s + i.total, 0);
      } else {
        const unpaid = purchases.filter(p => p.supplierId === contact.id && p.status !== 'paid' && p.status !== 'draft');
        return unpaid.reduce((s, b) => s + b.total, 0);
      }
    };

    const getTxCount = (contact) => {
      if (isCustomer) return sales.filter(s => s.customerId === contact.id).length;
      return purchases.filter(p => p.supplierId === contact.id).length;
    };

    const totalBalance = contacts.reduce((s, c) => s + getBalance(c), 0);
    const totalTx = contacts.reduce((s, c) => s + getTxCount(c), 0);

    const renderList = () => {
      const filtered = contacts.filter(c =>
        !search || (c.name + (c.gstin || '') + c.phone + c.email + c.city).toLowerCase().includes(search.toLowerCase())
      );

      const listEl = container.querySelector('#crm-list');
      if (!listEl) return;

      if (!filtered.length) {
        listEl.innerHTML = `<div class="empty-state">
          <span class="material-icons">${isCustomer ? 'people' : 'local_shipping'}</span>
          <h3>No ${type} found</h3>
          <p>Add your first ${isCustomer ? 'customer' : 'supplier'} to get started.</p>
          <button class="btn btn-primary" onclick="CRM.openForm('${type}')"><span class="material-icons">add</span> Add ${isCustomer ? 'Customer' : 'Supplier'}</button>
        </div>`;
        return;
      }

      listEl.innerHTML = `
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>${isCustomer ? 'Customer' : 'Supplier'}</th>
                <th>GSTIN</th>
                <th>State</th>
                <th>Phone</th>
                <th>Email</th>
                <th class="text-right">Transactions</th>
                <th class="text-right">Outstanding Balance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(c => {
        const balance = getBalance(c);
        const txCount = getTxCount(c);
        const avatar = c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        return `
                  <tr onclick="CRM.viewContact('${c.id}','${type}')" style="cursor:pointer">
                    <td>
                      <div style="display:flex;align-items:center;gap:10px">
                        <div class="contact-avatar" style="width:36px;height:36px;border-radius:8px;background:var(--primary-light);color:var(--primary-dark);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.82rem;flex-shrink:0">${avatar}</div>
                        <div>
                          <div style="font-weight:600;display:flex;align-items:center;gap:6px">
                            ${c.name}
                            ${c.customerType === 'dealer' ? `<span class="badge" style="background:hsl(271,78%,92%);color:hsl(271,78%,35%);font-size:.65rem;padding:1px 6px;font-weight:700">DEALER / TECH</span>` : ''}
                            ${type === 'customers' && (c.loyaltyPoints > 0) ? `<span class="badge" style="background:#fef3c7;color:#92400e;font-size:.68rem;padding:1px 6px;font-weight:700" title="${c.loyaltyPoints} Loyalty Points Available">⭐ ${c.loyaltyPoints} pts</span>` : ''}
                          </div>
                          ${c.city ? `<div style="font-size:.75rem;color:var(--text-secondary)">${c.city}</div>` : ''}
                        </div>
                      </div>
                    </td>
                    <td>${c.gstin ? `<span class="mono">${c.gstin}</span>` : '<span style="font-size:.78rem;color:var(--text-tertiary)">Unregistered</span>'}</td>
                    <td style="font-size:.84rem">
                      ${c.phone || '—'}
                      ${(c.whatsapp || c.phone) ? `
                        <a href="https://wa.me/${(c.whatsapp || c.phone).replace(/[^0-9]/g, '')}" target="_blank" class="btn btn-xs btn-ghost" style="color:#25d366;padding:2px 4px;vertical-align:middle;margin-left:4px" title="Chat on WhatsApp">
                          <span class="material-icons" style="font-size:14px">chat</span>
                        </a>` : ''}
                    </td>
                    <td style="font-size:.84rem">${c.email || '—'}</td>
                    <td class="text-right">
                      <span class="badge badge-primary">${txCount}</span>
                    </td>
                    <td class="text-right">
                      <span style="font-weight:700;font-size:.95rem;color:${balance > 0 ? 'var(--danger)' : 'var(--success)'}">
                        ${balance > 0 ? fmtCurrency(balance) : '—'}
                      </span>
                    </td>
                    <td class="action-col" onclick="event.stopPropagation()">
                      <button class="btn btn-xs btn-secondary" onclick="CRM.openLedgerModal('${c.id}','${type}')" title="View &amp; Print Account Statement / Ledger" style="color:var(--primary);font-weight:600">
                        <span class="material-icons" style="font-size:14px">menu_book</span> Ledger
                      </button>
                      <button class="btn btn-xs btn-secondary" onclick="CRM.openForm('${type}','${c.id}')" title="Edit"><span class="material-icons" style="font-size:14px">edit</span></button>
                      ${DB.getRole() !== 'staff' ? `<button class="btn btn-xs btn-ghost" onclick="CRM.deleteContact('${c.id}','${type}')" title="Delete"><span class="material-icons" style="font-size:14px;color:var(--danger)">delete</span></button>` : ''}
                    </td>
                  </tr>`;
      }).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5"></td>
                <td class="text-right font-bold">${totalTx} total</td>
                <td class="text-right font-bold" style="color:${totalBalance > 0 ? 'var(--danger)' : 'var(--success)'}">
                  ${totalBalance > 0 ? fmtCurrency(totalBalance) : '—'}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>`;
    };

    container.innerHTML = `
      <div class="page-header-row">
        <h2>${isCustomer ? 'Customers' : 'Suppliers'}</h2>
        <div class="actions">
          <button class="btn btn-primary" onclick="CRM.openForm('${type}')">
            <span class="material-icons">add</span> Add ${isCustomer ? 'Customer' : 'Supplier'}
          </button>
        </div>
      </div>

      <div class="kpi-grid" style="margin-bottom:16px">
        <div class="kpi-card kpi-primary">
          <div class="kpi-icon"><span class="material-icons">${isCustomer ? 'people' : 'local_shipping'}</span></div>
          <div class="kpi-content">
            <div class="kpi-label">Total ${isCustomer ? 'Customers' : 'Suppliers'}</div>
            <div class="kpi-value">${contacts.length}</div>
          </div>
        </div>
        <div class="kpi-card kpi-success">
          <div class="kpi-icon"><span class="material-icons">verified</span></div>
          <div class="kpi-content">
            <div class="kpi-label">GST Registered</div>
            <div class="kpi-value">${contacts.filter(c => c.gstin).length}</div>
          </div>
        </div>
        <div class="kpi-card kpi-warning">
          <div class="kpi-icon"><span class="material-icons">receipt_long</span></div>
          <div class="kpi-content">
            <div class="kpi-label">Total Transactions</div>
            <div class="kpi-value">${totalTx}</div>
          </div>
        </div>
        <div class="kpi-card kpi-danger">
          <div class="kpi-icon"><span class="material-icons">${isCustomer ? 'account_balance_wallet' : 'payments'}</span></div>
          <div class="kpi-content">
            <div class="kpi-label">Outstanding Balance</div>
            <div class="kpi-value">${fmtCurrency(totalBalance)}</div>
          </div>
        </div>
      </div>

      <div class="filter-bar">
        <div class="search-box">
          <span class="material-icons">search</span>
          <input placeholder="Search by name, GSTIN, phone, city…" oninput="window._crmS=this.value;window._crmR()">
        </div>
      </div>

      <div id="crm-list"></div>
    `;

    window._crmS = '';
    window._crmR = () => { search = window._crmS; renderList(); };
    renderList();
  },

  openForm(type, contactId = null) {
    const isCustomer = type === 'customers';
    const limits = DB.getTrialLimits();

    if (!contactId) {
      if (isCustomer && !limits.canAddCustomer) {
        App.toast(`⏳ Trial Limit Reached: Maximum ${limits.maxCustomers} customers allowed in 60-day trial mode. Activate license to add unlimited.`, 'warning');
        App.openLicenseModal();
        return;
      }
      if (!isCustomer && !limits.canAddSupplier) {
        App.toast(`⏳ Trial Limit Reached: Maximum ${limits.maxSuppliers} suppliers allowed in 60-day trial mode. Activate license to add unlimited.`, 'warning');
        App.openLicenseModal();
        return;
      }
    }

    const c = contactId ? (isCustomer ? DB.getCustomerById(contactId) : DB.getSupplierById(contactId)) : null;
    const stateOpts = INDIAN_STATES.map(s => `<option value="${s.code}" ${c?.stateCode === s.code ? 'selected' : ''}>${s.name}</option>`).join('');

    App.modal(c ? `Edit ${isCustomer ? 'Customer' : 'Supplier'}` : `Add ${isCustomer ? 'Customer' : 'Supplier'}`,
      `<div class="form-grid">
        <div class="form-group form-full"><label>Name <span class="required">*</span></label><input id="c-name" value="${c?.name || ''}"></div>
        ${isCustomer ? `
        <div class="form-group form-full">
          <label>Customer Pricing Category</label>
          <select id="c-type" style="font-weight:600">
            <option value="retail" ${!c || c.customerType !== 'dealer' ? 'selected' : ''}>Standard Retail Customer (Regular Prices)</option>
            <option value="dealer" ${c && c.customerType === 'dealer' ? 'selected' : ''}>Dealer / CCTV Installer / Technician (Auto-Applies Wholesale Rates)</option>
          </select>
        </div>
        <div class="form-group form-full">
          <label>Referred By (Optional Referral Rewards)</label>
          <select id="c-referrer">
            <option value="">None / Direct Walk-In</option>
            ${DB.getCustomers().filter(other => other.id !== contactId).map(other => `
              <option value="${other.id}" ${c?.referredBy === other.id ? 'selected' : ''}>${other.name} (${other.phone || 'No phone'})</option>
            `).join('')}
          </select>
          <div class="form-hint">When this customer makes their first purchase, the referring customer will receive bonus loyalty points!</div>
        </div>` : ''}
        <div class="form-group">
          <label>GSTIN</label>
          <input id="c-gstin" value="${c?.gstin || ''}" placeholder="27AAAAA0000A1Z5 (blank if unregistered)" maxlength="15" style="font-family:monospace;letter-spacing:.05em;text-transform:uppercase">
          <div class="form-hint">Leave blank for unregistered / B2C customers</div>
        </div>
        <div class="form-group"><label>PAN</label><input id="c-pan" value="${c?.pan || ''}" maxlength="10" style="text-transform:uppercase"></div>
        <div class="form-group form-full"><label>Address</label><textarea id="c-addr" rows="2">${c?.address || ''}</textarea></div>
        <div class="form-group"><label>City</label><input id="c-city" value="${c?.city || ''}"></div>
        <div class="form-group"><label>State <span class="required">*</span></label><select id="c-state">${stateOpts}</select></div>
        <div class="form-group"><label>Pincode</label><input id="c-pin" value="${c?.pincode || ''}" maxlength="6"></div>
        <div class="form-group"><label>Phone</label><input id="c-phone" value="${c?.phone || ''}"></div>
        <div class="form-group"><label>WhatsApp Number</label><input id="c-whatsapp" value="${c?.whatsapp || c?.phone || ''}" placeholder="e.g. +91 98230 11223"></div>
        <div class="form-group"><label>Email</label><input id="c-email" type="email" value="${c?.email || ''}"></div>
        <div class="form-group"><label>Contact Person</label><input id="c-contact" value="${c?.contactPerson || ''}"></div>
        <div class="form-group form-full"><label>Notes</label><textarea id="c-notes" rows="2">${c?.notes || ''}</textarea></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
       <button class="btn btn-primary" onclick="CRM.saveContact('${type}','${contactId || ''}')"><span class="material-icons">save</span> ${c ? 'Update' : 'Add'}</button>`,
      'modal-lg'
    );
  },

  saveContact(type, existingId) {
    const isCustomer = type === 'customers';
    const limits = DB.getTrialLimits();

    if (!existingId) {
      if (isCustomer && !limits.canAddCustomer) {
        App.toast(`⏳ Trial limit reached: Maximum ${limits.maxCustomers} customers allowed. Please activate your license.`, 'error');
        App.openLicenseModal();
        return;
      }
      if (!isCustomer && !limits.canAddSupplier) {
        App.toast(`⏳ Trial limit reached: Maximum ${limits.maxSuppliers} suppliers allowed. Please activate your license.`, 'error');
        App.openLicenseModal();
        return;
      }
    }

    const name = document.getElementById('c-name')?.value?.trim();
    const gstin = document.getElementById('c-gstin')?.value?.toUpperCase().trim();

    if (!name) { App.toast('Name is required', 'error'); return; }
    if (gstin && !validateGSTIN(gstin)) { App.toast('Invalid GSTIN format (must be 15 alphanumeric characters)', 'error'); return; }

    const stateEl = document.getElementById('c-state');
    const state = INDIAN_STATES.find(s => s.code === stateEl?.value);

    const data = {
      id: existingId || null,
      name, gstin, pan: document.getElementById('c-pan')?.value?.toUpperCase().trim() || '',
      customerType: isCustomer ? (document.getElementById('c-type')?.value || 'retail') : undefined,
      referredBy: isCustomer ? (document.getElementById('c-referrer')?.value || '') : undefined,
      loyaltyPoints: isCustomer ? (c?.loyaltyPoints || 0) : undefined,
      loyaltyHistory: isCustomer ? (c?.loyaltyHistory || []) : undefined,
      referralCount: isCustomer ? (c?.referralCount || 0) : undefined,
      _referralBonusGranted: isCustomer ? (c?._referralBonusGranted || false) : undefined,
      address: document.getElementById('c-addr')?.value?.trim() || '',
      city: document.getElementById('c-city')?.value?.trim() || '',
      state: state?.name || '', stateCode: stateEl?.value || '',
      pincode: document.getElementById('c-pin')?.value?.trim() || '',
      phone: document.getElementById('c-phone')?.value?.trim() || '',
      whatsapp: document.getElementById('c-whatsapp')?.value?.trim() || '',
      email: document.getElementById('c-email')?.value?.trim() || '',
      contactPerson: document.getElementById('c-contact')?.value?.trim() || '',
      notes: document.getElementById('c-notes')?.value?.trim() || '',
    };

    if (isCustomer) DB.saveCustomer(data); else DB.saveSupplier(data);
    App.toast(`${isCustomer ? 'Customer' : 'Supplier'} "${name}" ${existingId ? 'updated' : 'added'}!`);
    App.closeModal();
    CRM.render(document.getElementById('page-content'), type);
  },

  viewContact(id, type) {
    const isCustomer = type === 'customers';
    const c = isCustomer ? DB.getCustomerById(id) : DB.getSupplierById(id);
    if (!c) return;

    const sales = DB.getSales();
    const purchases = DB.getPurchases();
    const txList = isCustomer
      ? sales.filter(s => s.customerId === id).sort((a, b) => new Date(b.date) - new Date(a.date))
      : purchases.filter(p => p.supplierId === id).sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalBusiness = txList.reduce((s, t) => s + t.total, 0);
    const outstanding = txList.filter(t => t.status !== 'paid').reduce((s, t) => s + t.total, 0);
    const paid = txList.filter(t => t.status === 'paid').reduce((s, t) => s + t.total, 0);
    const referrer = isCustomer && c.referredBy ? DB.getCustomerById(c.referredBy) : null;
    const biz = DB.getBiz();
    const pointVal = biz.loyaltyPointValue || 1;
    const pointsBalance = c.loyaltyPoints || 0;
    const history = c.loyaltyHistory || [];

    App.modal(`${c.name}`,
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
        <div>
          <div class="invoice-section-title"><span class="material-icons">business</span> Contact Details</div>
          <div class="detail-row"><span class="detail-label">GSTIN</span><span class="detail-value mono">${c.gstin || 'Unregistered'}</span></div>
          <div class="detail-row"><span class="detail-label">State</span><span class="detail-value">${c.state || '—'} (${c.stateCode || '—'})</span></div>
          <div class="detail-row"><span class="detail-label">Address</span><span class="detail-value">${c.address || '—'}, ${c.city || ''}</span></div>
          <div class="detail-row"><span class="detail-label">Pincode</span><span class="detail-value">${c.pincode || '—'}</span></div>
          <div class="detail-row"><span class="detail-label">Phone</span><span class="detail-value">${c.phone || '—'}</span></div>
          <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${c.email || '—'}</span></div>
        </div>
        <div>
          <div class="invoice-section-title"><span class="material-icons">analytics</span> Business Summary</div>
          <div class="stat-row"><span class="stat-label">Total Transactions</span><span class="stat-value">${txList.length}</span></div>
          <div class="stat-row"><span class="stat-label">Total Business</span><span class="stat-value">${fmtCurrency(totalBusiness)}</span></div>
          <div class="stat-row"><span class="stat-label">Amount Paid</span><span class="stat-value text-success">${fmtCurrency(paid)}</span></div>
          <div class="stat-row"><span class="stat-label">Outstanding</span><span class="stat-value ${outstanding > 0 ? 'text-danger' : 'text-success'}">${fmtCurrency(outstanding)}</span></div>
        </div>
      </div>

      ${isCustomer ? `
      <!-- Customer Loyalty & Referral Hub -->
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <div>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="material-icons" style="font-size:20px;color:#d97706">stars</span>
              <strong style="color:#92400e;font-size:.95rem">Loyalty Points &amp; Referral Program</strong>
            </div>
            <div style="font-size:.8rem;color:#78350f;margin-top:2px">
              Available Balance: <strong style="font-size:.95rem;color:#b45309">${pointsBalance} pts</strong> (₹${(pointsBalance * pointVal).toFixed(2)} value)
              ${referrer ? ` • Referred by: <strong>${referrer.name}</strong>` : ''}
              ${c.referralCount ? ` • Successful Referrals: <strong>${c.referralCount}</strong>` : ''}
            </div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-xs btn-secondary" onclick="CRM.openAdjustPointsModal('${id}')" style="border-color:#d97706;color:#92400e;background:#fff">
              <span class="material-icons" style="font-size:14px">tune</span> Adjust Points
            </button>
          </div>
        </div>
        ${history.length ? `
        <div style="margin-top:10px;padding-top:8px;border-top:1px dashed #fcd34d">
          <div style="font-size:.75rem;font-weight:700;color:#92400e;margin-bottom:6px">Recent Loyalty Transactions:</div>
          <div style="max-height:100px;overflow-y:auto;display:flex;flex-direction:column;gap:4px">
            ${history.slice(0, 5).map(h => `
              <div style="display:flex;justify-content:space-between;align-items:center;font-size:.74rem;background:#fff;padding:4px 8px;border-radius:4px;border:1px solid #fef3c7">
                <span>${fmtDate(h.date)}: ${h.note || h.type}</span>
                <strong style="color:${h.points > 0 ? '#059669' : '#dc2626'}">${h.points > 0 ? '+' : ''}${h.points} pts (Bal: ${h.balanceAfter})</strong>
              </div>
            `).join('')}
          </div>
        </div>` : ''}
      </div>` : ''}

      <div class="invoice-section-title" style="margin-bottom:10px"><span class="material-icons">receipt_long</span> Transaction History (${txList.length})</div>
      ${txList.length ? `
      <div class="table-wrap" style="max-height:300px;overflow-y:auto">
        <table class="table">
          <thead><tr><th>No.</th><th>Date</th><th class="text-right">Amount</th><th>Status</th></tr></thead>
          <tbody>
            ${txList.map(t => `
              <tr>
                <td><span class="mono">${isCustomer ? t.invoiceNo : t.billNo}</span></td>
                <td>${fmtDate(t.date)}</td>
                <td class="text-right amount-cell">${fmtCurrency(t.total)}</td>
                <td><span class="badge badge-${t.status}">${t.status}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : '<div class="empty-state" style="padding:24px"><span class="material-icons">receipt_long</span><p>No transactions yet</p></div>'}`,
      `<button class="btn btn-ghost" onclick="App.closeModal()">Close</button>
       <button class="btn btn-secondary" onclick="App.closeModal();CRM.openLedgerModal('${id}','${type}')"><span class="material-icons">menu_book</span> Statement of Account</button>
       <button class="btn btn-secondary" onclick="App.closeModal();CRM.openForm('${type}','${id}')"><span class="material-icons">edit</span> Edit</button>
       ${isCustomer ? `<button class="btn btn-primary" onclick="App.closeModal();Billing.openNew('sales')"><span class="material-icons">receipt_long</span> New Invoice</button>` : `<button class="btn btn-primary" onclick="App.closeModal();Billing.openNew('purchases')"><span class="material-icons">add_shopping_cart</span> New Bill</button>`}`,
      'modal-xl'
    );
  },

  deleteContact(id, type) {
    if (DB.getRole() === 'staff') {
      App.toast(`🔒 Staff cannot delete ${type}. Owner Mode required.`, 'error');
      App.toggleRoleModal();
      return;
    }
    const isCustomer = type === 'customers';
    const c = isCustomer ? DB.getCustomerById(id) : DB.getSupplierById(id);
    App.modal('Delete Contact',
      `<div class="confirm-body">
        <span class="material-icons">delete_forever</span>
        <h3>Delete "${c?.name}"?</h3>
        <p>Transaction history will still be preserved but the contact will be removed.</p>
      </div>`,
      `<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
       <button class="btn btn-danger" onclick="${isCustomer ? 'DB.deleteCustomer' : 'DB.deleteSupplier'}('${id}');App.toast('Contact deleted');App.closeModal();CRM.render(document.getElementById('page-content'),'${type}')">Delete</button>`,
      'modal-sm'
    );
  },

  /* ═══════════════════════════════════════════
     LOYALTY POINTS ADJUSTMENT
  ═══════════════════════════════════════════ */
  openAdjustPointsModal(customerId) {
    const c = DB.getCustomerById(customerId);
    if (!c) return;
    const biz = DB.getBiz();
    const curPoints = c.loyaltyPoints || 0;

    App.modal(`Adjust Loyalty Points — ${c.name}`,
      `
      <div style="background:var(--bg);padding:14px;border-radius:var(--radius-sm);border:1px solid var(--border);margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:.78rem;color:var(--text-secondary)">Current Loyalty Balance</div>
            <div style="font-size:1.4rem;font-weight:800;color:#b45309">⭐ ${curPoints} Points</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:.78rem;color:var(--text-secondary)">Monetary Value</div>
            <div style="font-size:1.1rem;font-weight:700;color:var(--text-primary)">₹${(curPoints * (biz.loyaltyPointValue || 1)).toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>Action</label>
          <select id="adj-pts-type">
            <option value="add">Credit / Add Points (+)</option>
            <option value="deduct">Debit / Deduct Points (−)</option>
            <option value="set">Set Exact Balance (=)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Points Amount <span class="required">*</span></label>
          <input type="number" id="adj-pts-amount" min="1" step="1" placeholder="e.g. 50">
        </div>
        <div class="form-group form-full">
          <label>Reason / Note <span class="required">*</span></label>
          <input id="adj-pts-note" placeholder="e.g. Festival bonus, Referral reward, Customer goodwill credit...">
        </div>
      </div>
      `,
      `
      <button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="CRM._doAdjustPoints('${customerId}')"><span class="material-icons">save</span> Apply Points</button>
      `,
      'modal-sm'
    );
  },

  _doAdjustPoints(customerId) {
    const type = document.getElementById('adj-pts-type')?.value;
    const amount = parseInt(document.getElementById('adj-pts-amount')?.value, 10);
    const note = document.getElementById('adj-pts-note')?.value?.trim();

    if (!amount || amount < 0) {
      App.toast('Please enter a valid points amount', 'error');
      return;
    }
    if (!note) {
      App.toast('Please enter a reason or note for this adjustment', 'error');
      return;
    }

    const c = DB.getCustomerById(customerId);
    if (!c) return;

    let delta = 0;
    if (type === 'add') delta = amount;
    else if (type === 'deduct') delta = -amount;
    else if (type === 'set') delta = amount - (c.loyaltyPoints || 0);

    DB.adjustCustomerLoyalty(customerId, delta, 'manual', 'MANUAL-ADJUST', note);
    App.toast(`Loyalty balance updated: ${c.name} → ${Math.max(0, (c.loyaltyPoints || 0) + delta)} pts!`, 'success');
    App.closeModal();
    CRM.render(document.getElementById('page-content'), 'customers');
  },

  /* ═══════════════════════════════════════════
     PARTY LEDGER & STATEMENT OF ACCOUNT (KHATA)
  ═══════════════════════════════════════════ */
  _getPresetDates(preset) {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth(); // 0 = Jan, 3 = Apr

    if (preset === 'all') {
      return { from: '', to: '' };
    }
    if (preset === 'month') {
      const from = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-01`;
      return { from, to: today };
    }
    if (preset === '30days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return { from: d.toISOString().split('T')[0], to: today };
    }
    if (preset === '90days') {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      return { from: d.toISOString().split('T')[0], to: today };
    }
    // Default: 'fy' (Indian Financial Year: 1 Apr - 31 Mar)
    const fyStartYear = curMonth >= 3 ? curYear : curYear - 1;
    const from = `${fyStartYear}-04-01`;
    const to = `${fyStartYear + 1}-03-31`;
    return { from, to: today < to ? today : to };
  },

  computeLedger(contactId, type = 'customers', fromDate = null, toDate = null) {
    const isCustomer = type === 'customers';
    const contact = isCustomer ? DB.getCustomerById(contactId) : DB.getSupplierById(contactId);
    if (!contact) return null;

    const sales = DB.getSales();
    const purchases = DB.getPurchases();
    const creditNotes = DB.getCreditNotes ? DB.getCreditNotes() : [];
    const debitNotes = DB.getDebitNotes ? DB.getDebitNotes() : [];

    const allTx = [];

    if (isCustomer) {
      // 1. Sales Invoices
      sales.filter(s => s.customerId === contactId && s.status !== 'draft').forEach(s => {
        allTx.push({
          date: s.date,
          type: 'invoice',
          docId: s.id,
          docNo: s.invoiceNo,
          particulars: `Sales Tax Invoice #${s.invoiceNo}`,
          debit: s.total || 0,
          credit: 0,
          status: s.status
        });

        // 2. Payments recorded on invoice
        const payments = DB.getDocPayments ? DB.getDocPayments(s) : (s.payments || []);
        payments.forEach(p => {
          allTx.push({
            date: p.date || s.date,
            type: 'payment',
            docId: s.id,
            docNo: s.invoiceNo,
            particulars: `Payment Received (${p.method || 'Cash'})${p.reference ? ' • Ref: ' + p.reference : ''}`,
            debit: 0,
            credit: p.amount || 0,
            paymentMethod: p.method
          });
        });
      });

      // 3. Credit Notes (Sales Returns)
      creditNotes.filter(cn => cn.customerId === contactId).forEach(cn => {
        allTx.push({
          date: cn.date,
          type: 'credit_note',
          docId: cn.id,
          docNo: cn.noteNo,
          particulars: `Customer Return / Credit Note #${cn.noteNo}${cn.originalInvoiceNo ? ' (Inv #' + cn.originalInvoiceNo + ')' : ''}`,
          debit: 0,
          credit: cn.total || 0,
          reason: cn.reason
        });
      });
    } else {
      // Supplier transactions
      purchases.filter(p => p.supplierId === contactId && p.status !== 'draft').forEach(p => {
        allTx.push({
          date: p.date,
          type: 'bill',
          docId: p.id,
          docNo: p.billNo,
          particulars: `Purchase Bill #${p.billNo}`,
          debit: 0,
          credit: p.total || 0,
          status: p.status
        });

        // Payments made on this bill
        const payments = DB.getDocPayments ? DB.getDocPayments(p) : (p.payments || []);
        payments.forEach(pay => {
          allTx.push({
            date: pay.date || p.date,
            type: 'payment',
            docId: p.id,
            docNo: p.billNo,
            particulars: `Payment Made (${pay.method || 'Bank Transfer'})${pay.reference ? ' • Ref: ' + pay.reference : ''}`,
            debit: pay.amount || 0,
            credit: 0
          });
        });
      });

      // Debit Notes (Purchase Returns)
      debitNotes.filter(dn => dn.supplierId === contactId).forEach(dn => {
        allTx.push({
          date: dn.date,
          type: 'debit_note',
          docId: dn.id,
          docNo: dn.noteNo,
          particulars: `Supplier Return / Debit Note #${dn.noteNo}${dn.originalBillNo ? ' (Bill #' + dn.originalBillNo + ')' : ''}`,
          debit: dn.total || 0,
          credit: 0
        });
      });
    }

    // Sort chronologically
    allTx.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate opening balance prior to fromDate
    let openingBalance = 0;
    const periodTx = [];

    allTx.forEach(tx => {
      if (fromDate && tx.date < fromDate) {
        if (isCustomer) {
          openingBalance += (tx.debit - tx.credit);
        } else {
          openingBalance += (tx.credit - tx.debit);
        }
      } else if (!toDate || tx.date <= toDate) {
        periodTx.push(tx);
      }
    });

    // Compute running balance
    let running = openingBalance;
    const entries = periodTx.map(tx => {
      if (isCustomer) {
        running += (tx.debit - tx.credit);
      } else {
        running += (tx.credit - tx.debit);
      }
      return {
        ...tx,
        runningBalance: running
      };
    });

    const totalDebits = entries.reduce((s, e) => s + e.debit, 0);
    const totalCredits = entries.reduce((s, e) => s + e.credit, 0);
    const closingBalance = running;

    return {
      contact,
      isCustomer,
      fromDate,
      toDate,
      openingBalance,
      entries,
      totalDebits,
      totalCredits,
      closingBalance
    };
  },

  openLedgerModal(contactId, type = 'customers', preset = 'fy', customFrom = null, customTo = null) {
    const isCustomer = type === 'customers';
    let from = customFrom;
    let to = customTo;

    if (!from && !to && preset) {
      const dates = this._getPresetDates(preset);
      from = dates.from;
      to = dates.to;
    }

    const ledger = this.computeLedger(contactId, type, from, to);
    if (!ledger) return;

    const c = ledger.contact;
    const opening = ledger.openingBalance;
    const closing = ledger.closingBalance;
    const isDue = closing > 0;
    const isAdv = closing < 0;

    const periodText = from && to ? `${fmtDate(from)} to ${fmtDate(to)}` : (from ? `Since ${fmtDate(from)}` : 'All Time History');

    const bodyHtml = `
      <!-- Filter Bar: Presets & Date Pickers -->
      <div style="background:#f8fafc;padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <span style="font-size:.8rem;font-weight:600;color:var(--text-secondary)">Period:</span>
          <button class="btn btn-xs ${preset === 'fy' ? 'btn-primary' : 'btn-secondary'}" onclick="CRM.openLedgerModal('${contactId}','${type}','fy')">Current FY</button>
          <button class="btn btn-xs ${preset === 'month' ? 'btn-primary' : 'btn-secondary'}" onclick="CRM.openLedgerModal('${contactId}','${type}','month')">This Month</button>
          <button class="btn btn-xs ${preset === '30days' ? 'btn-primary' : 'btn-secondary'}" onclick="CRM.openLedgerModal('${contactId}','${type}','30days')">Last 30 Days</button>
          <button class="btn btn-xs ${preset === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="CRM.openLedgerModal('${contactId}','${type}','all')">All Time</button>
        </div>

        <div style="display:flex;gap:6px;align-items:center">
          <input type="date" id="ledger-from" class="form-control" style="height:30px;font-size:.8rem;padding:2px 8px" value="${from || ''}">
          <span style="font-size:.8rem;color:var(--text-muted)">to</span>
          <input type="date" id="ledger-to" class="form-control" style="height:30px;font-size:.8rem;padding:2px 8px" value="${to || ''}">
          <button class="btn btn-xs btn-primary" onclick="CRM._applyCustomLedgerDates('${contactId}','${type}')">Apply</button>
        </div>
      </div>

      <!-- Financial Summary Cards -->
      <div class="kpi-grid" style="margin-bottom:16px">
        <div class="kpi-card" style="background:#ffffff;border:1px solid var(--border)">
          <div class="kpi-title">Opening Balance</div>
          <div class="kpi-val" style="font-size:1.15rem">${fmtCurrency(Math.abs(opening))} <span style="font-size:.75rem;color:var(--text-secondary)">${opening >= 0 ? (isCustomer ? 'Dr' : 'Cr') : (isCustomer ? 'Cr' : 'Dr')}</span></div>
          <div class="kpi-sub">Prior to ${from ? fmtDate(from) : 'start'}</div>
        </div>
        <div class="kpi-card" style="background:#ffffff;border:1px solid var(--border)">
          <div class="kpi-title">${isCustomer ? 'Total Invoiced (+)' : 'Total Purchases (+)'}</div>
          <div class="kpi-val" style="font-size:1.15rem">${fmtCurrency(isCustomer ? ledger.totalDebits : ledger.totalCredits)}</div>
          <div class="kpi-sub">Billings in period</div>
        </div>
        <div class="kpi-card" style="background:#ffffff;border:1px solid var(--border)">
          <div class="kpi-title">${isCustomer ? 'Payments &amp; Returns (-)' : 'Payments &amp; Returns (-)'}</div>
          <div class="kpi-val text-success" style="font-size:1.15rem">${fmtCurrency(isCustomer ? ledger.totalCredits : ledger.totalDebits)}</div>
          <div class="kpi-sub">Total credits settled</div>
        </div>
        <div class="kpi-card" style="background:${isDue ? '#fef2f2' : (isAdv ? '#f0fdf4' : '#f8fafc')};border:1px solid ${isDue ? '#fca5a5' : (isAdv ? '#86efac' : 'var(--border)')}">
          <div class="kpi-title">${isCustomer ? 'Net Outstanding Due' : 'Net Amount Payable'}</div>
          <div class="kpi-val" style="font-size:1.25rem;color:${isDue ? 'var(--danger)' : (isAdv ? 'var(--success)' : 'var(--text-primary)')}">
            ${fmtCurrency(Math.abs(closing))} <span style="font-size:.78rem;font-weight:700">${isDue ? (isCustomer ? 'Dr (Due)' : 'Cr (Payable)') : (isAdv ? 'Cr (Advance)' : 'Settled')}</span>
          </div>
          <div class="kpi-sub">As of ${to ? fmtDate(to) : 'Today'}</div>
        </div>
      </div>

      <!-- Chronological Ledger Table -->
      <div class="card" style="box-shadow:none;border:1px solid var(--border);margin-bottom:0">
        <div class="card-body" style="padding:0">
          <div class="table-wrap" style="max-height:360px;overflow-y:auto">
            <table class="table" style="font-size:.83rem">
              <thead>
                <tr>
                  <th style="width:90px">Date</th>
                  <th style="width:130px">Voucher / Type</th>
                  <th style="width:130px">Ref / Doc #</th>
                  <th>Particulars / Details</th>
                  <th class="text-right" style="width:105px">Debit (₹)</th>
                  <th class="text-right" style="width:105px">Credit (₹)</th>
                  <th class="text-right" style="width:125px">Running Balance</th>
                </tr>
              </thead>
              <tbody>
                <!-- Opening Balance Row -->
                <tr style="background:#f8fafc;font-weight:600">
                  <td>${from ? fmtDate(from) : '—'}</td>
                  <td><span class="badge badge-draft" style="font-size:.7rem">OPENING</span></td>
                  <td>—</td>
                  <td>Opening Balance brought forward</td>
                  <td class="text-right">${opening > 0 && isCustomer ? fmtCurrency(opening) : '—'}</td>
                  <td class="text-right">${opening < 0 && isCustomer ? fmtCurrency(Math.abs(opening)) : '—'}</td>
                  <td class="text-right font-bold" style="color:${opening > 0 ? 'var(--danger)' : 'var(--text-primary)'}">
                    ${fmtCurrency(Math.abs(opening))} ${opening >= 0 ? (isCustomer ? 'Dr' : 'Cr') : (isCustomer ? 'Cr' : 'Dr')}
                  </td>
                </tr>

                ${ledger.entries.length === 0 ? `
                  <tr>
                    <td colspan="7" style="text-align:center;padding:24px;color:var(--text-secondary)">
                      No transactions recorded in this period.
                    </td>
                  </tr>
                ` : ledger.entries.map(e => {
                  let typeBadge = '';
                  if (e.type === 'invoice') typeBadge = '<span class="badge badge-primary" style="font-size:.7rem">TAX INVOICE</span>';
                  else if (e.type === 'bill') typeBadge = '<span class="badge badge-warning" style="font-size:.7rem">PURCHASE BILL</span>';
                  else if (e.type === 'payment') typeBadge = '<span class="badge badge-paid" style="font-size:.7rem">PAYMENT</span>';
                  else if (e.type === 'credit_note') typeBadge = '<span class="badge badge-danger" style="font-size:.7rem">CREDIT NOTE</span>';
                  else if (e.type === 'debit_note') typeBadge = '<span class="badge badge-info" style="font-size:.7rem">DEBIT NOTE</span>';

                  const bal = e.runningBalance;
                  const balLabel = bal > 0 ? (isCustomer ? 'Dr' : 'Cr') : (bal < 0 ? (isCustomer ? 'Cr' : 'Dr') : 'Settled');
                  const balColor = bal > 0 ? 'var(--danger)' : (bal < 0 ? 'var(--success)' : 'var(--text-secondary)');

                  return `
                    <tr>
                      <td style="white-space:nowrap">${fmtDate(e.date)}</td>
                      <td>${typeBadge}</td>
                      <td>
                        <strong class="mono" style="cursor:pointer;color:var(--primary)" onclick="App.closeModal();${isCustomer && e.type === 'invoice' ? `Billing.viewDoc('${e.docId}','sales')` : (!isCustomer && e.type === 'bill' ? `Billing.viewDoc('${e.docId}','purchases')` : '')}">
                          ${e.docNo}
                        </strong>
                      </td>
                      <td>${e.particulars}</td>
                      <td class="text-right" style="color:${e.debit > 0 ? 'var(--text-primary)' : 'var(--text-muted)'}">${e.debit > 0 ? fmtCurrency(e.debit) : '—'}</td>
                      <td class="text-right" style="color:${e.credit > 0 ? 'var(--success)' : 'var(--text-muted)'}">${e.credit > 0 ? fmtCurrency(e.credit) : '—'}</td>
                      <td class="text-right font-bold" style="color:${balColor}">
                        ${fmtCurrency(Math.abs(bal))} <span style="font-size:.72rem">${balLabel}</span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr style="background:#f1f5f9;font-weight:700">
                  <td colspan="4" class="text-right">Period Totals</td>
                  <td class="text-right font-bold">${fmtCurrency(ledger.totalDebits)}</td>
                  <td class="text-right font-bold text-success">${fmtCurrency(ledger.totalCredits)}</td>
                  <td class="text-right font-bold" style="color:${isDue ? 'var(--danger)' : 'var(--success)'}">
                    ${fmtCurrency(Math.abs(closing))} ${isDue ? (isCustomer ? 'Dr' : 'Cr') : (isAdv ? 'Cr' : '')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    `;

    App.modal(
      `Statement of Account: ${c.name} (${periodText})`,
      bodyHtml,
      `
        <button class="btn btn-ghost" onclick="App.closeModal()">Close</button>
        <button class="btn btn-secondary" onclick="CRM.shareLedgerWhatsApp('${contactId}','${type}','${from || ''}','${to || ''}')" title="Send Statement on WhatsApp">
          <span class="material-icons" style="color:#25d366">chat</span> WhatsApp Statement
        </button>
        <button class="btn btn-secondary" onclick="CRM.exportLedgerCSV('${contactId}','${type}','${from || ''}','${to || ''}')" title="Export Ledger as CSV / Excel">
          <span class="material-icons">download</span> Export CSV
        </button>
        <button class="btn btn-secondary" onclick="CRM.exportLedgerPDF('${contactId}','${type}','${from || ''}','${to || ''}')" title="Save Statement as PDF">
          <span class="material-icons" style="color:#e74c3c">picture_as_pdf</span> PDF
        </button>
        <button class="btn btn-primary" onclick="CRM.printLedger('${contactId}','${type}','${from || ''}','${to || ''}')" title="Print Official A4 Statement of Accounts">
          <span class="material-icons">print</span> Print Statement
        </button>
      `,
      'modal-xl'
    );
  },

  _applyCustomLedgerDates(contactId, type) {
    const from = document.getElementById('ledger-from')?.value || '';
    const to = document.getElementById('ledger-to')?.value || '';
    this.openLedgerModal(contactId, type, 'custom', from, to);
  },

  /* ═══════════════════════════════════════════
     GENERATE STATEMENT OF ACCOUNT HTML (A4)
  ═══════════════════════════════════════════ */
  generateLedgerHtml(contactId, type, fromDate, toDate) {
    const ledger = this.computeLedger(contactId, type, fromDate, toDate);
    if (!ledger) return '';
    const biz = DB.getBiz();
    const c = ledger.contact;
    const isCustomer = ledger.isCustomer;
    const opening = ledger.openingBalance;
    const closing = ledger.closingBalance;
    const isDue = closing > 0;
    const isAdv = closing < 0;

    const periodText = fromDate && toDate ? `${fmtDate(fromDate)} to ${fmtDate(toDate)}` : (fromDate ? `Since ${fmtDate(fromDate)}` : 'Complete Lifetime Ledger');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Statement of Account - ${c.name}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11.5px; line-height: 1.4; color: #1e293b; padding: 10px; }
          .header-table { width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
          .title { font-size: 16px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: .02em; }
          .grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; margin-bottom: 12px; }
          .box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px 10px; }
          .box h4 { margin: 0 0 4px; font-size: 11px; color: #0284c7; text-transform: uppercase; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
          th { background: #f1f5f9; font-weight: 700; font-size: 11px; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .kpi-row { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
          .kpi-box { flex: 1; border: 1px solid #cbd5e1; padding: 6px 10px; border-radius: 4px; background: #fafafa; }
          .kpi-label { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; }
          .kpi-val { font-size: 13px; font-weight: 800; margin-top: 2px; }
          .bank-box { background: #f1f5f9; border: 1px dashed #94a3b8; border-radius: 4px; padding: 8px 12px; font-size: 10.5px; margin-top: 10px; }
          .sig-row { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 10px; }
          .sig-box { width: 180px; text-align: center; border-top: 1px solid #000; padding-top: 3px; font-weight: 600; font-size: 11px; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td>
              <div style="font-size:18px;font-weight:800;color:#0f172a">${biz.name}</div>
              <div style="color:#64748b;font-size:11px">${biz.tagline || 'IT & CCTV Business Solutions'}</div>
              <div>${biz.address || ''}, ${biz.city || ''}</div>
              <div>Tel: ${biz.phone || ''} | Email: ${biz.email || ''}</div>
              ${biz.gstin ? `<div><strong>GSTIN:</strong> ${biz.gstin} &nbsp;|&nbsp; State Code: ${biz.stateCode || '27'}</div>` : ''}
            </td>
            <td class="text-right">
              <div class="title">STATEMENT OF ACCOUNTS</div>
              <div style="font-size:13px;font-weight:700;margin-top:2px">${isCustomer ? 'Customer Ledger (Khata)' : 'Supplier Account Statement'}</div>
              <div style="color:#475569;margin-top:2px"><strong>Period:</strong> ${periodText}</div>
              <div style="color:#64748b;font-size:10px">Generated on: ${fmtDate(new Date().toISOString().split('T')[0])}</div>
            </td>
          </tr>
        </table>

        <div class="grid">
          <div class="box">
            <h4>Account Holder (Party Details)</h4>
            <div style="font-size:13px;font-weight:700">${c.name}</div>
            <div><strong>GSTIN:</strong> ${c.gstin || 'Unregistered / B2C'}</div>
            <div><strong>Phone:</strong> ${c.phone || '—'}</div>
            <div><strong>Address:</strong> ${c.address || ''}${c.city ? ', ' + c.city : ''}</div>
            <div><strong>State:</strong> ${c.state || ''} (${c.stateCode || ''})</div>
          </div>
          <div class="box">
            <h4>Account Status &amp; Terms</h4>
            <div><strong>Pricing Category:</strong> ${c.customerType === 'dealer' ? 'Dealer / Wholesale' : 'Standard Retail'}</div>
            <div><strong>Total Invoiced:</strong> ${fmtCurrency(isCustomer ? ledger.totalDebits : ledger.totalCredits)}</div>
            <div><strong>Total Paid / Returned:</strong> ${fmtCurrency(isCustomer ? ledger.totalCredits : ledger.totalDebits)}</div>
            <div style="margin-top:4px;padding-top:4px;border-top:1px dashed #cbd5e1">
              <strong>Closing Balance:</strong> <span style="font-size:13px;font-weight:800;color:${isDue ? '#dc2626' : '#16a34a'}">${fmtCurrency(Math.abs(closing))} ${isDue ? (isCustomer ? 'Dr (Pending Due)' : 'Cr (Payable)') : (isAdv ? 'Cr (Advance)' : 'Settled')}</span>
            </div>
          </div>
        </div>

        <div class="kpi-row">
          <div class="kpi-box">
            <div class="kpi-label">Opening Balance</div>
            <div class="kpi-val">${fmtCurrency(Math.abs(opening))} ${opening >= 0 ? (isCustomer ? 'Dr' : 'Cr') : 'Cr'}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">${isCustomer ? 'Total Billed (+)' : 'Total Purchases (+)'}</div>
            <div class="kpi-val">${fmtCurrency(isCustomer ? ledger.totalDebits : ledger.totalCredits)}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">Total Credits / Paid (-)</div>
            <div class="kpi-val" style="color:#16a34a">${fmtCurrency(isCustomer ? ledger.totalCredits : ledger.totalDebits)}</div>
          </div>
          <div class="kpi-box" style="border-color:${isDue ? '#ef4444' : '#22c55e'};background:${isDue ? '#fef2f2' : '#f0fdf4'}">
            <div class="kpi-label" style="color:${isDue ? '#dc2626' : '#15803d'}">Net Outstanding</div>
            <div class="kpi-val" style="color:${isDue ? '#dc2626' : '#15803d'}">${fmtCurrency(Math.abs(closing))} ${isDue ? (isCustomer ? 'Dr' : 'Cr') : ''}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:75px">Date</th>
              <th style="width:110px">Type</th>
              <th style="width:110px">Voucher / Ref</th>
              <th>Particulars / Description</th>
              <th class="text-right" style="width:95px">Debit (₹)</th>
              <th class="text-right" style="width:95px">Credit (₹)</th>
              <th class="text-right" style="width:115px">Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background:#f8fafc;font-weight:600">
              <td>${fromDate ? fmtDate(fromDate) : '—'}</td>
              <td>OPENING</td>
              <td>—</td>
              <td>Opening Balance brought forward</td>
              <td class="text-right">${opening > 0 && isCustomer ? fmtCurrency(opening) : '—'}</td>
              <td class="text-right">${opening < 0 && isCustomer ? fmtCurrency(Math.abs(opening)) : '—'}</td>
              <td class="text-right bold">${fmtCurrency(Math.abs(opening))} ${opening >= 0 ? (isCustomer ? 'Dr' : 'Cr') : 'Cr'}</td>
            </tr>
            ${ledger.entries.map(e => `
              <tr>
                <td>${fmtDate(e.date)}</td>
                <td>${e.type.replace('_', ' ').toUpperCase()}</td>
                <td style="font-family:monospace;font-weight:600">${e.docNo}</td>
                <td>${e.particulars}</td>
                <td class="text-right">${e.debit > 0 ? fmtCurrency(e.debit) : '—'}</td>
                <td class="text-right">${e.credit > 0 ? fmtCurrency(e.credit) : '—'}</td>
                <td class="text-right bold">${fmtCurrency(Math.abs(e.runningBalance))} ${e.runningBalance >= 0 ? (isCustomer ? 'Dr' : 'Cr') : 'Cr'}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#f1f5f9;font-weight:800">
              <td colspan="4" class="text-right">Totals</td>
              <td class="text-right">${fmtCurrency(ledger.totalDebits)}</td>
              <td class="text-right" style="color:#16a34a">${fmtCurrency(ledger.totalCredits)}</td>
              <td class="text-right" style="color:${isDue ? '#dc2626' : '#16a34a'}">${fmtCurrency(Math.abs(closing))} ${isDue ? (isCustomer ? 'Dr' : 'Cr') : ''}</td>
            </tr>
          </tfoot>
        </table>

        ${biz.bankAccount ? `
          <div class="bank-box">
            <strong>Payment Remittance Details:</strong><br>
            Please transfer pending balance to: <strong>${biz.bankName || 'Bank'}</strong> &nbsp;|&nbsp;
            A/C No: <strong>${biz.bankAccount}</strong> &nbsp;|&nbsp;
            IFSC: <strong>${biz.bankIFSC}</strong> &nbsp;|&nbsp;
            UPI ID: <strong>${biz.upiId || '—'}</strong>
          </div>
        ` : ''}

        <div class="sig-row">
          <div class="sig-box">Accountant / Checked By</div>
          <div class="sig-box">For ${biz.name}<br>(Authorized Signatory)</div>
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    return html;
  },

  printLedger(contactId, type, fromDate, toDate) {
    const ledger = this.computeLedger(contactId, type, fromDate, toDate);
    if (!ledger) return;
    const c = ledger.contact;
    const cleanParty = ((c.name || 'Account').trim()).replace(/[\/\\:*?"<>|\s]+/g, '_');
    const title = `Statement_${cleanParty}_${getFY()}`;
    const html = this.generateLedgerHtml(contactId, type, fromDate, toDate);

    if (window.desktopApp && typeof window.desktopApp.printHtml === 'function') {
      window.desktopApp.printHtml({ html, title });
      return;
    }

    const w = window.open('', '_blank', 'width=900,height=750');
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
    }
  },

  async exportLedgerPDF(contactId, type, fromDate, toDate) {
    const ledger = this.computeLedger(contactId, type, fromDate, toDate);
    if (!ledger) {
      App.toast('Statement not found for export', 'error');
      return;
    }
    const c = ledger.contact;
    const cleanParty = ((c.name || 'Account').trim()).replace(/[\/\\:*?"<>|\s]+/g, '_');
    const title = `Statement_${cleanParty}_${getFY()}`;
    const html = this.generateLedgerHtml(contactId, type, fromDate, toDate);
    const defaultDir = DB.getBiz().pdfSaveDir || '';

    if (window.desktopApp && window.desktopApp.savePdf) {
      App.toast('Preparing Statement PDF...', 'info');
      try {
        const res = await window.desktopApp.savePdf({ html, title, defaultDir });
        if (res && res.success) {
          App.toast(`🎉 PDF Saved: ${res.filePath}`, 'success');
        }
      } catch (err) {
        console.error('Statement PDF export error:', err);
        this.printLedger(contactId, type, fromDate, toDate);
      }
    } else {
      this.printLedger(contactId, type, fromDate, toDate);
      App.toast('In print dialog, choose "Save as PDF" 📄', 'info');
    }
  },

  /* ═══════════════════════════════════════════
     EXPORT LEDGER TO CSV
  ═══════════════════════════════════════════ */
  exportLedgerCSV(contactId, type, fromDate, toDate) {
    const ledger = this.computeLedger(contactId, type, fromDate, toDate);
    if (!ledger) return;
    const c = ledger.contact;
    const isCustomer = ledger.isCustomer;

    const rows = [
      ['Date', 'Voucher Type', 'Ref Number', 'Particulars', 'Debit (INR)', 'Credit (INR)', 'Running Balance (INR)']
    ];

    // Opening balance
    rows.push([
      fromDate || '',
      'OPENING',
      '-',
      'Opening Balance',
      ledger.openingBalance > 0 && isCustomer ? ledger.openingBalance : 0,
      ledger.openingBalance < 0 && isCustomer ? Math.abs(ledger.openingBalance) : 0,
      `${ledger.openingBalance} ${ledger.openingBalance >= 0 ? (isCustomer ? 'Dr' : 'Cr') : 'Cr'}`
    ]);

    ledger.entries.forEach(e => {
      rows.push([
        e.date,
        e.type.toUpperCase(),
        `"${e.docNo}"`,
        `"${e.particulars.replace(/"/g, '""')}"`,
        e.debit || 0,
        e.credit || 0,
        `${e.runningBalance} ${e.runningBalance >= 0 ? (isCustomer ? 'Dr' : 'Cr') : 'Cr'}`
      ]);
    });

    // Totals
    rows.push([
      'TOTALS',
      '-',
      '-',
      'Period Totals',
      ledger.totalDebits,
      ledger.totalCredits,
      `${ledger.closingBalance} ${ledger.closingBalance >= 0 ? (isCustomer ? 'Dr' : 'Cr') : 'Cr'}`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const safeName = (c.name || 'Party').replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute('download', `Ledger_${safeName}_${fromDate || 'start'}_to_${toDate || 'today'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    App.toast(`Exported Ledger CSV for ${c.name}!`, 'success');
  },

  /* ═══════════════════════════════════════════
     SHARE STATEMENT VIA WHATSAPP (1-CLICK DISPATCH)
  ═══════════════════════════════════════════ */
  shareLedgerWhatsApp(contactId, type = 'customers', fromDate, toDate) {
    const isCustomerType = type === 'customer' || type === 'customers';
    const normalizedType = isCustomerType ? 'customers' : 'suppliers';
    const ledger = this.computeLedger(contactId, normalizedType, fromDate, toDate);
    if (!ledger) return;
    const biz = DB.getBiz();
    const c = ledger.contact;
    const isCustomer = ledger.isCustomer;
    const closing = ledger.closingBalance;
    const isDue = closing > 0;
    const partyPhone = c.whatsapp || c.phone || '';

    const periodText = fromDate && toDate ? `${fmtDate(fromDate)} to ${fmtDate(toDate)}` : (fromDate ? `Since ${fmtDate(fromDate)}` : 'Complete Account History');
    const greeting = biz.waGreeting ? `${biz.waGreeting}\n\n` : '';
    const footer = biz.waFooter ? `\n\n${biz.waFooter}` : `\n\n📞 Support / Accounts Desk: ${biz.phone || ''}\n_ShopPulse CRM_`;

    // Preset 1: Full Statement
    const statementMsg = `${greeting}📊 *STATEMENT OF ACCOUNT (LEDGER) — ${biz.name}*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *Account of:* ${c.name}\n` +
      `📅 *Period:* ${periodText}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🔹 *Opening Balance:* ₹${Math.abs(ledger.openingBalance).toFixed(2)} ${ledger.openingBalance >= 0 ? (isCustomer ? 'Dr' : 'Cr') : 'Cr'}\n` +
      `➕ *Total Invoiced:* ₹${(isCustomer ? ledger.totalDebits : ledger.totalCredits).toFixed(2)}\n` +
      `➖ *Total Payments:* ₹${(isCustomer ? ledger.totalCredits : ledger.totalDebits).toFixed(2)}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `${isDue ? `🔴 *NET OUTSTANDING DUE: ₹${Math.abs(closing).toFixed(2)}*` : `🟢 *NET BALANCE: ₹${Math.abs(closing).toFixed(2)} (Settled)*`}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `${isDue && biz.upiId ? `📲 *Pay Instantly via UPI:* ${biz.upiId}\n` : ''}` +
      `${isDue && biz.bankAccount ? `🏦 *Bank Transfer:* ${biz.bankName || ''} | A/C: ${biz.bankAccount} | IFSC: ${biz.bankIFSC || ''}\n` : ''}` +
      footer;

    // Preset 2: Friendly Payment Reminder
    const reminderMsg = `${greeting}🔔 *PAYMENT REMINDER — ${biz.name}*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Dear *${c.name}*,\n\n` +
      `This is a gentle reminder that a balance of *₹${Math.abs(closing).toFixed(2)}* is currently pending on your account.\n\n` +
      `${biz.upiId ? `📲 *Quick UPI Payment:*\nUPI ID: *${biz.upiId}*\n\n` : ''}` +
      `${biz.bankAccount ? `🏦 *Bank Transfer Details:*\nBank: ${biz.bankName || ''}\nA/C No: ${biz.bankAccount}\nIFSC: ${biz.bankIFSC || ''}\n\n` : ''}` +
      `Kindly arrange payment at your earliest convenience. If already paid, please ignore this notice.\n` +
      `Thank you for your business!` +
      footer;

    const presets = [
      { label: 'Full Statement', text: statementMsg },
      { label: 'Payment Reminder', text: reminderMsg }
    ];

    App.openWhatsAppModal({
      title: `Ledger Statement WhatsApp — ${c.name}`,
      phone: partyPhone,
      partyName: c.name,
      messageText: isDue ? reminderMsg : statementMsg,
      docType: 'ledger',
      docId: contactId,
      presets: isDue ? [presets[1], presets[0]] : presets
    });
  }
};
