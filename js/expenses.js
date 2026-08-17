'use strict';

/* ─────────────────────────────────────────────
   Expenses Module — Business & Operational Costs
───────────────────────────────────────────── */
const Expenses = {
  _filterCategory: '',
  _filterMonth: '',
  _filterSearch: '',

  render(container) {
    const expenses = DB.getExpenses();
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Compute metrics
    const totalExp = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const thisMonthExp = expenses
      .filter(e => new Date(e.date) >= currentMonthStart)
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const totalItcGst = expenses
      .filter(e => e.isItc)
      .reduce((s, e) => s + (parseFloat(e.gstAmt) || 0), 0);

    // Category breakdown
    const catTotals = {};
    expenses.forEach(e => {
      const c = e.category || 'Other / Misc';
      catTotals[c] = (catTotals[c] || 0) + (parseFloat(e.amount) || 0);
    });
    let topCatName = '—', topCatAmt = 0;
    Object.entries(catTotals).forEach(([cat, amt]) => {
      if (amt > topCatAmt) { topCatAmt = amt; topCatName = cat; }
    });

    // Filter logic
    let list = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (this._filterCategory) {
      list = list.filter(e => e.category === this._filterCategory);
    }
    if (this._filterMonth) {
      list = list.filter(e => (e.date || '').startsWith(this._filterMonth));
    }
    if (this._filterSearch) {
      const q = this._filterSearch.toLowerCase();
      list = list.filter(e =>
        (e.title || '').toLowerCase().includes(q) ||
        (e.vendor || '').toLowerCase().includes(q) ||
        (e.notes || '').toLowerCase().includes(q)
      );
    }

    const catOptions = EXPENSE_CATEGORIES.map(c =>
      `<option value="${c}" ${this._filterCategory === c ? 'selected' : ''}>${c}</option>`
    ).join('');

    // Generate month options from data
    const monthSet = new Set(expenses.map(e => (e.date || '').substring(0, 7)).filter(Boolean));
    const monthOpts = Array.from(monthSet).sort().reverse().map(m => {
      const d = new Date(m + '-01');
      const label = d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
      return `<option value="${m}" ${this._filterMonth === m ? 'selected' : ''}>${label}</option>`;
    }).join('');

    container.innerHTML = `
      <div class="page-header-row">
        <div>
          <h2>Operating Expenses</h2>
          <div style="font-size:0.85rem;color:var(--text-secondary);margin-top:2px">Track daily shop costs, technician conveyance, rent &amp; GST Input Tax Credit</div>
        </div>
        <div class="actions">
          <button class="btn btn-secondary" onclick="Expenses.exportCSV()"><span class="material-icons">download</span> Export CSV</button>
          <button class="btn btn-primary" onclick="Expenses.openForm()"><span class="material-icons">add</span> Add Expense</button>
        </div>
      </div>

      <!-- KPI Grid -->
      <div class="kpi-grid" style="margin-bottom:24px">
        <div class="kpi-card kpi-danger">
          <div class="kpi-icon"><span class="material-icons">receipt_long</span></div>
          <div class="kpi-content">
            <div class="kpi-label">Total Expenses</div>
            <div class="kpi-value">${fmtCurrency(totalExp)}</div>
            <div class="kpi-sub">${expenses.length} total entries</div>
          </div>
        </div>

        <div class="kpi-card kpi-warning">
          <div class="kpi-icon"><span class="material-icons">calendar_today</span></div>
          <div class="kpi-content">
            <div class="kpi-label">This Month</div>
            <div class="kpi-value">${fmtCurrency(thisMonthExp)}</div>
            <div class="kpi-sub">Current billing cycle</div>
          </div>
        </div>

        <div class="kpi-card kpi-success">
          <div class="kpi-icon"><span class="material-icons">savings</span></div>
          <div class="kpi-content">
            <div class="kpi-label">GST ITC Claimable</div>
            <div class="kpi-value">${fmtCurrency(totalItcGst)}</div>
            <div class="kpi-sub">Input Tax Credit savings</div>
          </div>
        </div>

        <div class="kpi-card kpi-primary">
          <div class="kpi-icon"><span class="material-icons">pie_chart</span></div>
          <div class="kpi-content">
            <div class="kpi-label">Top Category</div>
            <div class="kpi-value" style="font-size:1.15rem">${topCatName}</div>
            <div class="kpi-sub">${fmtCurrency(topCatAmt)} spent</div>
          </div>
        </div>
      </div>

      <!-- Filters & Table Card -->
      <div class="card">
        <div class="card-header" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between">
          <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;flex:1">
            <div class="search-wrap" style="min-width:220px;max-width:320px">
              <input type="text" id="exp-search" placeholder="Search expense or vendor…" value="${this._filterSearch}" oninput="Expenses.onSearch(this.value)">
            </div>
            <select id="exp-cat-filter" style="padding:6px 10px;border-radius:var(--radius-sm);border:1px solid var(--border);font-size:.85rem;background:var(--card-bg);color:var(--text-primary)" onchange="Expenses.onCategoryChange(this.value)">
              <option value="">All Categories</option>
              ${catOptions}
            </select>
            <select id="exp-month-filter" style="padding:6px 10px;border-radius:var(--radius-sm);border:1px solid var(--border);font-size:.85rem;background:var(--card-bg);color:var(--text-primary)" onchange="Expenses.onMonthChange(this.value)">
              <option value="">All Months</option>
              ${monthOpts}
            </select>
            ${(this._filterCategory || this._filterMonth || this._filterSearch) ? `<button class="btn btn-ghost btn-xs" onclick="Expenses.clearFilters()"><span class="material-icons">clear</span> Clear</button>` : ''}
          </div>
          <div style="font-size:0.85rem;color:var(--text-secondary)">
            Showing <strong>${list.length}</strong> of ${expenses.length} records
          </div>
        </div>

        <div class="card-body" style="padding:0">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th style="width:105px">Date</th>
                  <th>Description / Title</th>
                  <th>Category</th>
                  <th>Vendor / Paid To</th>
                  <th>Payment Mode</th>
                  <th class="text-right">GST / ITC</th>
                  <th class="text-right">Amount</th>
                  <th class="action-col" style="width:100px">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${list.length === 0 ? `
                  <tr><td colspan="8" class="table-empty" style="text-align:center;padding:40px 20px;color:var(--text-secondary)">
                    <span class="material-icons" style="font-size:40px;opacity:.4;display:block;margin-bottom:8px">receipt_long</span>
                    No expenses recorded yet. Click <strong>"Add Expense"</strong> to log operating costs.
                  </td></tr>
                ` : list.map(e => `
                  <tr>
                    <td><span class="mono">${fmtDate(e.date)}</span></td>
                    <td>
                      <div style="font-weight:600;color:var(--text-primary)">${e.title}</div>
                      ${e.notes ? `<div style="font-size:.78rem;color:var(--text-secondary);margin-top:2px">${e.notes}</div>` : ''}
                    </td>
                    <td><span class="badge badge-draft" style="font-weight:600">${e.category || 'Other'}</span></td>
                    <td>${e.vendor ? `<span style="font-weight:500">${e.vendor}</span>` : '<span class="text-muted">—</span>'}</td>
                    <td><span class="badge badge-info">${e.paidVia || 'Cash'}</span></td>
                    <td class="text-right">
                      ${e.isItc ? `<span class="badge badge-paid" title="Claimable in GSTR-3B">ITC: ${fmtCurrency(e.gstAmt || 0)}</span>` : (e.gstAmt > 0 ? fmtCurrency(e.gstAmt) : '<span class="text-muted">—</span>')}
                    </td>
                    <td class="text-right font-bold amount-cell" style="font-size:.95rem">${fmtCurrency(e.amount)}</td>
                    <td class="action-col">
                      <button class="btn btn-ghost btn-xs icon-btn" onclick="Expenses.openForm('${e.id}')" title="Edit"><span class="material-icons">edit</span></button>
                      ${DB.getRole() !== 'staff' ? `<button class="btn btn-ghost btn-xs icon-btn text-danger" onclick="Expenses.delete('${e.id}')" title="Delete"><span class="material-icons">delete</span></button>` : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  onSearch(v) {
    this._filterSearch = v;
    this.render(document.getElementById('page-content'));
  },

  onCategoryChange(v) {
    this._filterCategory = v;
    this.render(document.getElementById('page-content'));
  },

  onMonthChange(v) {
    this._filterMonth = v;
    this.render(document.getElementById('page-content'));
  },

  clearFilters() {
    this._filterCategory = '';
    this._filterMonth = '';
    this._filterSearch = '';
    this.render(document.getElementById('page-content'));
  },

  openForm(id = null) {
    const isEdit = !!id;
    const exp = isEdit ? DB.getExpenseById(id) : null;
    const today = new Date().toISOString().split('T')[0];

    const catOpts = EXPENSE_CATEGORIES.map(c =>
      `<option value="${c}" ${exp && exp.category === c ? 'selected' : ''}>${c}</option>`
    ).join('');

    const payOpts = PAYMENT_METHODS.map(m =>
      `<option value="${m}" ${exp && exp.paidVia === m ? 'selected' : ''}>${m}</option>`
    ).join('');

    App.modal(
      isEdit ? 'Edit Expense' : 'Record Operating Expense',
      `
      <div class="form-grid">
        <div class="form-group form-full">
          <label>Expense Title / Description <span class="required">*</span></label>
          <input id="exp-title" placeholder="e.g. Technician Fuel, Shop Rent, Broadband Bill, Drill Bits" value="${exp ? exp.title || '' : ''}">
        </div>

        <div class="form-group">
          <label>Category <span class="required">*</span></label>
          <select id="exp-cat">${catOpts}</select>
        </div>

        <div class="form-group">
          <label>Amount (₹) <span class="required">*</span></label>
          <input id="exp-amount" type="number" step="0.01" min="0" placeholder="0.00" value="${exp ? exp.amount || '' : ''}">
        </div>

        <div class="form-group">
          <label>Date <span class="required">*</span></label>
          <input id="exp-date" type="date" value="${exp ? exp.date : today}">
        </div>

        <div class="form-group">
          <label>Payment Method</label>
          <select id="exp-pay-via">${payOpts}</select>
        </div>

        <div class="form-group">
          <label>Paid To / Vendor Name</label>
          <input id="exp-vendor" placeholder="e.g. Landlord, Petrol Pump, Airtel, Local Hardware" value="${exp ? exp.vendor || '' : ''}">
        </div>

        <div class="form-group">
          <label>GST Amount Included (₹)</label>
          <input id="exp-gst" type="number" step="0.01" min="0" placeholder="0.00" value="${exp ? exp.gstAmt || 0 : ''}">
        </div>

        <div class="form-group form-full" style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border)">
          <input type="checkbox" id="exp-itc" ${exp && exp.isItc ? 'checked' : ''} style="width:18px;height:18px;cursor:pointer">
          <label for="exp-itc" style="margin:0;cursor:pointer;font-size:.85rem">
            <strong>Claim Input Tax Credit (ITC)?</strong>
            <span style="display:block;font-size:.78rem;color:var(--text-secondary)">Check this if you have a valid GST invoice from the vendor to claim credit in GSTR-3B.</span>
          </label>
        </div>

        <div class="form-group form-full">
          <label>Notes / Bill Reference No.</label>
          <textarea id="exp-notes" rows="2" placeholder="e.g. Bill #1234, Site visit for St. Xavier School">${exp ? exp.notes || '' : ''}</textarea>
        </div>
      </div>
      `,
      `
      <button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="Expenses.save('${id || ''}')"><span class="material-icons">save</span> ${isEdit ? 'Update Expense' : 'Save Expense'}</button>
      `,
      'modal-lg'
    );
  },

  save(id = '') {
    const title = document.getElementById('exp-title')?.value.trim();
    const category = document.getElementById('exp-cat')?.value;
    const amount = parseFloat(document.getElementById('exp-amount')?.value) || 0;
    const date = document.getElementById('exp-date')?.value;
    const paidVia = document.getElementById('exp-pay-via')?.value;
    const vendor = document.getElementById('exp-vendor')?.value.trim();
    const gstAmt = parseFloat(document.getElementById('exp-gst')?.value) || 0;
    const isItc = document.getElementById('exp-itc')?.checked || false;
    const notes = document.getElementById('exp-notes')?.value.trim();

    if (!title) { App.toast('Please enter an expense title', 'error'); return; }
    if (amount <= 0) { App.toast('Please enter a valid amount', 'error'); return; }
    if (!date) { App.toast('Please select a date', 'error'); return; }

    const data = {
      id: id || undefined,
      title,
      category,
      amount,
      date,
      paidVia,
      vendor,
      gstAmt: isItc ? gstAmt : 0,
      isItc,
      notes
    };

    DB.saveExpense(data);
    App.toast(`Expense "${title}" saved successfully!`);
    App.closeModal();
    this.render(document.getElementById('page-content'));
  },

  delete(id) {
    if (DB.getRole() === 'staff') {
      App.toast('🔒 Staff cannot delete expenses. Owner Mode required.', 'error');
      App.toggleRoleModal();
      return;
    }
    const exp = DB.getExpenseById(id);
    if (!exp) return;

    App.modal('Delete Expense',
      `<div class="confirm-body">
        <span class="material-icons">delete_forever</span>
        <h3>Delete "${exp.title}"?</h3>
        <p>Amount: <strong>${fmtCurrency(exp.amount)}</strong> on ${fmtDate(exp.date)}. This action cannot be undone.</p>
      </div>`,
      `<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
       <button class="btn btn-danger" onclick="DB.deleteExpense('${id}');App.toast('Expense deleted');App.closeModal();Expenses.render(document.getElementById('page-content'))">Delete</button>`,
      'modal-sm'
    );
  },

  exportCSV() {
    const expenses = DB.getExpenses();
    if (!expenses.length) { App.toast('No expenses to export', 'warning'); return; }

    const headers = ['Expense ID', 'Date', 'Title', 'Category', 'Vendor', 'Amount', 'Payment Mode', 'GST Amount', 'ITC Claimable', 'Notes'];
    const rows = expenses.map(e => [
      `"${e.id || ''}"`,
      `"${e.date || ''}"`,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      `"${e.category || ''}"`,
      `"${(e.vendor || '').replace(/"/g, '""')}"`,
      e.amount || 0,
      `"${e.paidVia || ''}"`,
      e.gstAmt || 0,
      e.isItc ? 'Yes' : 'No',
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const bizName = (DB.getBiz().name || 'ShopPulse').replace(/[^a-zA-Z0-9]/g, '_');
    a.download = `${bizName}_Expenses_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    App.toast('Expenses exported to CSV');
  }
};
