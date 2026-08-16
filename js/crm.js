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
                          <div style="font-weight:600">${c.name}</div>
                          ${c.city ? `<div style="font-size:.75rem;color:var(--text-secondary)">${c.city}</div>` : ''}
                        </div>
                      </div>
                    </td>
                    <td>${c.gstin ? `<span class="mono">${c.gstin}</span>` : '<span style="font-size:.78rem;color:var(--text-tertiary)">Unregistered</span>'}</td>
                    <td style="font-size:.84rem">${c.state || '—'}</td>
                    <td style="font-size:.84rem">${c.phone || '—'}</td>
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
    const c = contactId ? (isCustomer ? DB.getCustomerById(contactId) : DB.getSupplierById(contactId)) : null;
    const stateOpts = INDIAN_STATES.map(s => `<option value="${s.code}" ${c?.stateCode === s.code ? 'selected' : ''}>${s.name}</option>`).join('');

    App.modal(c ? `Edit ${isCustomer ? 'Customer' : 'Supplier'}` : `Add ${isCustomer ? 'Customer' : 'Supplier'}`,
      `<div class="form-grid">
        <div class="form-group form-full"><label>Name <span class="required">*</span></label><input id="c-name" value="${c?.name || ''}"></div>
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
    const name = document.getElementById('c-name')?.value?.trim();
    const gstin = document.getElementById('c-gstin')?.value?.toUpperCase().trim();

    if (!name) { App.toast('Name is required', 'error'); return; }
    if (gstin && !validateGSTIN(gstin)) { App.toast('Invalid GSTIN format (must be 15 alphanumeric characters)', 'error'); return; }

    const stateEl = document.getElementById('c-state');
    const state = INDIAN_STATES.find(s => s.code === stateEl?.value);

    const data = {
      id: existingId || null,
      name, gstin, pan: document.getElementById('c-pan')?.value?.toUpperCase().trim() || '',
      address: document.getElementById('c-addr')?.value?.trim() || '',
      city: document.getElementById('c-city')?.value?.trim() || '',
      state: state?.name || '', stateCode: stateEl?.value || '',
      pincode: document.getElementById('c-pin')?.value?.trim() || '',
      phone: document.getElementById('c-phone')?.value?.trim() || '',
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

    App.modal(`${c.name}`,
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px">
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
  }
};
