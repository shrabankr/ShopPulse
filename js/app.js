'use strict';

/* ─────────────────────────────────────────────
   App Shell — Router, Dashboard, Settings
───────────────────────────────────────────── */
const App = {
  charts: {},

  init() {
    DB.seed();
    this.buildSidebar();
    this.buildTopbar();
    window.addEventListener('hashchange', () => this.route());
    this.route(location.hash || '#dashboard');
  },

  /* ─── Sidebar ─── */
  buildSidebar() {
    const biz = DB.getBiz();
    const unpaidSales = DB.getSales().filter(s => ['unpaid', 'overdue'].includes(s.status)).length;
    const unpaidBuys = DB.getPurchases().filter(p => ['unpaid', 'overdue'].includes(p.status)).length;
    const lowStock = DB.getProducts().filter(p => p.reorderLevel > 0 && p.stock <= p.reorderLevel).length;

    document.getElementById('sidebar').innerHTML = `
      <div class="sidebar-logo">
        <div class="logo-icon"><span class="material-icons">electric_bolt</span></div>
        <div>
          <span class="logo-name">ShopPulse</span>
          <span class="logo-biz">${biz.name}</span>
        </div>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-section">
          <span class="nav-section-label">Overview</span>
          <a href="#dashboard" class="nav-item" data-r="dashboard"><span class="material-icons">dashboard</span><span>Dashboard</span></a>
        </div>
        <div class="nav-section">
          <span class="nav-section-label">Transactions</span>
          <a href="#billing-sales" class="nav-item" data-r="billing-sales"><span class="material-icons">receipt_long</span><span>Sales Invoices</span></a>
          <a href="#billing-purchases" class="nav-item" data-r="billing-purchases"><span class="material-icons">shopping_bag</span><span>Purchase Bills</span></a>
          <a href="#receivables" class="nav-item" data-r="receivables"><span class="material-icons">account_balance_wallet</span><span>Receivables</span>${unpaidSales ? `<span class="nav-badge">${unpaidSales}</span>` : ''}</a>
          <a href="#payables" class="nav-item" data-r="payables"><span class="material-icons">payments</span><span>Payables</span>${unpaidBuys ? `<span class="nav-badge">${unpaidBuys}</span>` : ''}</a>
        </div>
        <div class="nav-section">
          <span class="nav-section-label">Management</span>
          <a href="#inventory" class="nav-item" data-r="inventory"><span class="material-icons">inventory_2</span><span>Inventory</span>${lowStock ? `<span class="nav-badge warn">${lowStock}</span>` : ''}</a>
          <a href="#customers" class="nav-item" data-r="customers"><span class="material-icons">people</span><span>Customers</span></a>
          <a href="#suppliers" class="nav-item" data-r="suppliers"><span class="material-icons">local_shipping</span><span>Suppliers</span></a>
        </div>
        <div class="nav-section">
          <span class="nav-section-label">Analytics</span>
          <a href="#reports" class="nav-item" data-r="reports"><span class="material-icons">bar_chart</span><span>Reports</span></a>
          <a href="#gst" class="nav-item" data-r="gst"><span class="material-icons">receipt</span><span>GST Returns</span></a>
          <a href="#ai" class="nav-item" data-r="ai"><span class="material-icons">auto_awesome</span><span>AI Assistant</span><span class="nav-chip">AI</span></a>
        </div>
        <div class="nav-section">
          <a href="#settings" class="nav-item" data-r="settings"><span class="material-icons">settings</span><span>Settings</span></a>
        </div>
      </nav>
    `;
  },

  /* ─── Topbar ─── */
  buildTopbar() {
    document.getElementById('topbar').innerHTML = `
      <button class="sidebar-toggle" onclick="document.getElementById('sidebar').classList.toggle('open')">
        <span class="material-icons">menu</span>
      </button>
      <div class="topbar-title" id="tb-title">Dashboard</div>
      <div class="topbar-actions">
        <button class="btn btn-primary btn-sm" onclick="Billing.openNew('sales')">
          <span class="material-icons">add</span> New Invoice
        </button>
        <button class="icon-btn" onclick="App.route('#settings')" title="Settings">
          <span class="material-icons">manage_accounts</span>
        </button>
      </div>
    `;
  },

  /* ─── Router ─── */
  route(hash) {
    if (hash) location.hash = hash;
    const r = (location.hash || '#dashboard').replace('#', '');

    // Destroy charts
    Object.values(this.charts).forEach(c => { try { c.destroy(); } catch (e) { } });
    this.charts = {};

    // Active nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const active = document.querySelector(`.nav-item[data-r="${r}"]`);
    if (active) active.classList.add('active');

    const c = document.getElementById('page-content');
    const T = document.getElementById('tb-title');

    const titles = {
      dashboard: 'Dashboard', 'billing-sales': 'Sales Invoices',
      'billing-purchases': 'Purchase Bills', receivables: 'Receivables',
      payables: 'Payables', inventory: 'Inventory',
      customers: 'Customers', suppliers: 'Suppliers',
      reports: 'Reports', gst: 'GST Returns', ai: 'AI Assistant', settings: 'Settings'
    };
    if (T) T.textContent = titles[r] || 'ShopPulse';

    switch (r) {
      case 'dashboard': this.renderDashboard(c); break;
      case 'billing-sales': Billing.render(c, 'sales'); break;
      case 'billing-purchases': Billing.render(c, 'purchases'); break;
      case 'receivables': Billing.renderReceivables(c); break;
      case 'payables': Billing.renderPayables(c); break;
      case 'inventory': Inventory.render(c); break;
      case 'customers': CRM.render(c, 'customers'); break;
      case 'suppliers': CRM.render(c, 'suppliers'); break;
      case 'reports': Reports.render(c); break;
      case 'gst': Reports.renderGST(c); break;
      case 'ai': AI.render(c); break;
      case 'settings': this.renderSettings(c); break;
      default: this.renderDashboard(c);
    }
  },

  refreshSidebar() { this.buildSidebar(); },

  /* ─── Dashboard ─── */
  renderDashboard(container) {
    const sales = DB.getSales();
    const purchases = DB.getPurchases();
    const products = DB.getProducts();

    const revenue = sales.filter(s => s.status === 'paid').reduce((s, i) => s + i.total, 0);
    const receivables = sales.filter(s => s.status !== 'paid').reduce((s, i) => s + i.total, 0);
    const payables = purchases.filter(p => p.status !== 'paid').reduce((s, b) => s + b.total, 0);
    const invValue = products.reduce((s, p) => s + p.stock * p.purchasePrice, 0);
    const lowStock = products.filter(p => p.reorderLevel > 0 && p.stock <= p.reorderLevel);
    const overdue = sales.filter(s => s.status === 'overdue');
    const monthlyRevenue = this._monthly(sales);
    const topProds = this._topProducts(sales);

    // GST this month
    const now = new Date();
    const mm = now.getMonth(), yy = now.getFullYear();
    const mSales = sales.filter(s => { const d = new Date(s.date); return d.getMonth() === mm && d.getFullYear() === yy; });
    const mPurchases = purchases.filter(p => { const d = new Date(p.date); return d.getMonth() === mm && d.getFullYear() === yy; });
    const outTax = mSales.reduce((s, i) => s + (i.totalTax || 0), 0);
    const inTax = mPurchases.reduce((s, b) => s + (b.totalTax || 0), 0);

    container.innerHTML = `
      <div class="dashboard">
        <div class="kpi-grid">
          <div class="kpi-card kpi-primary">
            <div class="kpi-icon"><span class="material-icons">trending_up</span></div>
            <div class="kpi-content">
              <div class="kpi-label">Total Revenue</div>
              <div class="kpi-value">${fmtCurrency(revenue)}</div>
              <div class="kpi-sub">${sales.filter(s => s.status === 'paid').length} paid invoices</div>
            </div>
          </div>
          <div class="kpi-card kpi-warning">
            <div class="kpi-icon"><span class="material-icons">account_balance_wallet</span></div>
            <div class="kpi-content">
              <div class="kpi-label">Receivables</div>
              <div class="kpi-value">${fmtCurrency(receivables)}</div>
              <div class="kpi-sub">${sales.filter(s => s.status !== 'paid').length} pending invoices</div>
            </div>
          </div>
          <div class="kpi-card kpi-danger">
            <div class="kpi-icon"><span class="material-icons">payments</span></div>
            <div class="kpi-content">
              <div class="kpi-label">Payables</div>
              <div class="kpi-value">${fmtCurrency(payables)}</div>
              <div class="kpi-sub">${purchases.filter(p => p.status !== 'paid').length} pending bills</div>
            </div>
          </div>
          <div class="kpi-card kpi-success">
            <div class="kpi-icon"><span class="material-icons">inventory</span></div>
            <div class="kpi-content">
              <div class="kpi-label">Inventory Value</div>
              <div class="kpi-value">${fmtCurrency(invValue)}</div>
              <div class="kpi-sub">${products.length} products</div>
            </div>
          </div>
        </div>

        <div class="dashboard-grid">
          <div class="card dashboard-chart-card">
            <div class="card-header"><h3>Revenue Trend (6 Months)</h3></div>
            <div class="card-body"><canvas id="rev-chart" height="220"></canvas></div>
          </div>

          <div class="dashboard-alerts">
            ${overdue.length ? `<div class="alert-card alert-danger">
              <span class="material-icons">warning</span>
              <div><strong>${overdue.length} Overdue Invoice${overdue.length > 1 ? 's' : ''}</strong>
              <p>${fmtCurrency(overdue.reduce((s, i) => s + i.total, 0))} outstanding</p></div>
              <a href="#receivables" onclick="App.route('#receivables')" class="alert-action">View</a>
            </div>` : ''}
            ${lowStock.length ? `<div class="alert-card alert-warning">
              <span class="material-icons">inventory_2</span>
              <div><strong>${lowStock.length} Low Stock Alert${lowStock.length > 1 ? 's' : ''}</strong>
              <p>${lowStock.slice(0, 2).map(p => p.name.split(' ').slice(0, 2).join(' ')).join(', ')}${lowStock.length > 2 ? '...' : ''}</p></div>
              <a href="#inventory" onclick="App.route('#inventory')" class="alert-action">View</a>
            </div>` : ''}
            <div class="alert-card alert-info">
              <span class="material-icons">auto_awesome</span>
              <div><strong>AI Insights Ready</strong><p>Smart business analysis available</p></div>
              <a href="#ai" onclick="App.route('#ai')" class="alert-action">Open</a>
            </div>
            <div class="card" style="margin-top:10px">
              <div class="card-header"><h3>GST This Month</h3><a href="#gst" onclick="App.route('#gst')" class="card-link">Returns</a></div>
              <div class="card-body">
                <div class="gst-summary-grid">
                  <div class="gst-item"><span class="gst-label">Output Tax (Sales)</span><span class="gst-value text-danger">${fmtCurrency(outTax)}</span></div>
                  <div class="gst-item"><span class="gst-label">ITC (Purchases)</span><span class="gst-value text-success">${fmtCurrency(inTax)}</span></div>
                  <div class="gst-item gst-net"><span class="gst-label">Net Tax Payable</span><span class="gst-value ${outTax - inTax > 0 ? 'text-danger' : 'text-success'}">${fmtCurrency(Math.abs(outTax - inTax))} ${outTax - inTax > 0 ? '▲' : '▼'}</span></div>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><h3>Recent Sales</h3><a class="card-link" onclick="App.route('#billing-sales')">View All →</a></div>
            <div class="card-body p-0">
              <table class="table">
                <thead><tr><th>Invoice No</th><th>Customer</th><th>Date</th><th class="text-right">Amount</th><th>Status</th></tr></thead>
                <tbody>
                  ${sales.slice(-6).reverse().map(s => `
                    <tr style="cursor:pointer" onclick="Billing.viewDoc('${s.id}','sales')">
                      <td><span class="mono">${s.invoiceNo}</span></td>
                      <td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.customerName}</td>
                      <td class="text-muted">${fmtDate(s.date)}</td>
                      <td class="text-right amount-cell">${fmtCurrency(s.total)}</td>
                      <td><span class="badge badge-${s.status}">${s.status}</span></td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><h3>Top Products</h3></div>
            <div class="card-body">
              ${topProds.slice(0, 5).map((p, i) => `
                <div class="top-product-row">
                  <span class="rank">${i + 1}</span>
                  <div class="product-info">
                    <span class="product-name">${p.name}</span>
                    <div class="progress-bar"><div class="progress-fill" style="width:${(p.revenue / (topProds[0].revenue || 1) * 100).toFixed(0)}%"></div></div>
                  </div>
                  <span class="product-rev">${fmtCurrency(p.revenue)}</span>
                </div>`).join('') || '<p class="text-muted" style="font-size:.84rem">No sales data yet.</p>'}
            </div>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      const canvas = document.getElementById('rev-chart');
      if (!canvas || !window.Chart) return;
      this.charts.revenue = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: monthlyRevenue.map(m => m.label),
          datasets: [
            {
              label: 'Revenue', data: monthlyRevenue.map(m => m.revenue),
              backgroundColor: 'rgba(59,130,246,0.85)', borderRadius: 5, borderSkipped: false,
            },
            {
              label: 'Purchases', data: monthlyRevenue.map(m => m.purchases),
              backgroundColor: 'rgba(239,68,68,0.6)', borderRadius: 5, borderSkipped: false,
            }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } } },
          scales: {
            y: { beginAtZero: true, ticks: { callback: v => '₹' + (v / 1000).toFixed(0) + 'k', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
            x: { grid: { display: false }, ticks: { font: { size: 11 } } }
          }
        }
      });
    }, 80);
  },

  _monthly(sales) {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const label = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      const m = d.getMonth(), y = d.getFullYear();
      const revenue = DB.getSales().filter(s => { const sd = new Date(s.date); return sd.getMonth() === m && sd.getFullYear() === y && s.status === 'paid'; }).reduce((s, x) => s + x.total, 0);
      const purchases = DB.getPurchases().filter(p => { const pd = new Date(p.date); return pd.getMonth() === m && pd.getFullYear() === y && p.status === 'paid'; }).reduce((s, x) => s + x.total, 0);
      return { label, revenue, purchases };
    });
  },

  _topProducts(sales) {
    const map = {};
    sales.forEach(s => (s.items || []).forEach(item => {
      map[item.name] = (map[item.name] || 0) + (item.totalAmt || 0);
    }));
    return Object.entries(map).map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue);
  },

  /* ─── Modal ─── */
  modal(title, body, footer, size = '') {
    const o = document.getElementById('modal-overlay');
    o.classList.remove('hidden');
    o.innerHTML = `
      <div class="modal-backdrop" onclick="App.closeModal()"></div>
      <div class="modal-container ${size}">
        <div class="modal-header">
          <h2>${title}</h2>
          <button class="modal-close" onclick="App.closeModal()"><span class="material-icons">close</span></button>
        </div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>`;
    setTimeout(() => o.querySelector('.modal-container').classList.add('open'), 10);
  },

  closeModal() {
    const o = document.getElementById('modal-overlay');
    const m = o.querySelector('.modal-container');
    if (m) m.classList.remove('open');
    setTimeout(() => o.classList.add('hidden'), 220);
  },

  /* ─── Toast ─── */
  toast(msg, type = 'success') {
    const icons = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' };
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span class="material-icons">${icons[type] || 'info'}</span><span>${msg}</span>`;
    document.getElementById('toast-container').appendChild(t);
    requestAnimationFrame(() => { requestAnimationFrame(() => t.classList.add('show')); });
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
  },

  /* ─── Settings ─── */
  renderSettings(container) {
    const b = DB.getBiz();
    const stateOpts = INDIAN_STATES.map(s => `<option value="${s.code}" ${b.stateCode === s.code ? 'selected' : ''}>${s.name}</option>`).join('');
    container.innerHTML = `
      <div class="page-header"><h2>Business Settings</h2><p>Your GST-registered business profile used on all invoices.</p></div>
      <div class="settings-grid">
        <div class="card">
          <div class="card-header"><h3>GST Business Profile</h3></div>
          <div class="card-body">
            <div class="form-grid">
              <div class="form-group form-full"><label>Business Name <span class="required">*</span></label><input id="s-name" value="${b.name || ''}"></div>
              <div class="form-group"><label>GSTIN (15-digit)</label><input id="s-gstin" value="${b.gstin || ''}" placeholder="27AAAAA0000A1Z5" maxlength="15" style="font-family:monospace;letter-spacing:.05em;text-transform:uppercase"></div>
              <div class="form-group"><label>PAN</label><input id="s-pan" value="${b.pan || ''}" placeholder="AAAAA0000A" maxlength="10" style="text-transform:uppercase"></div>
              <div class="form-group form-full"><label>Address</label><textarea id="s-addr">${b.address || ''}</textarea></div>
              <div class="form-group"><label>City</label><input id="s-city" value="${b.city || ''}"></div>
              <div class="form-group"><label>State <span class="required">*</span></label><select id="s-state">${stateOpts}</select></div>
              <div class="form-group"><label>Pincode</label><input id="s-pin" value="${b.pincode || ''}" maxlength="6"></div>
              <div class="form-group"><label>Phone</label><input id="s-phone" value="${b.phone || ''}"></div>
              <div class="form-group"><label>Email</label><input id="s-email" type="email" value="${b.email || ''}"></div>
              <div class="form-group"><label>Website</label><input id="s-web" value="${b.website || ''}"></div>
              <div class="form-group"><label>Authorized Signatory</label><input id="s-sign" value="${b.signatory || ''}"></div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Bank Details (for Invoice)</h3></div>
          <div class="card-body">
            <div class="form-grid">
              <div class="form-group"><label>Bank Name</label><input id="s-bank" value="${b.bankName || ''}"></div>
              <div class="form-group"><label>Account Number</label><input id="s-acc" value="${b.bankAccount || ''}"></div>
              <div class="form-group"><label>IFSC Code</label><input id="s-ifsc" value="${b.bankIFSC || ''}"></div>
              <div class="form-group"><label>Branch</label><input id="s-branch" value="${b.bankBranch || ''}"></div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Invoice Settings</h3></div>
          <div class="card-body">
            <div class="form-grid">
              <div class="form-group"><label>Sales Invoice Prefix</label><input id="s-invpfx" value="${b.invoicePrefix || 'INV'}" maxlength="6"></div>
              <div class="form-group"><label>Purchase Bill Prefix</label><input id="s-billpfx" value="${b.billPrefix || 'PO'}" maxlength="6"></div>
              <div class="form-group"><label>Default Payment Terms (days)</label><input id="s-terms" type="number" value="${b.defaultPaymentTerms || 30}" min="0"></div>
              <div class="form-group form-full"><label>Terms & Conditions (printed on invoice)</label><textarea id="s-tnc">${b.termsAndConditions || ''}</textarea></div>
            </div>
          </div>
        </div>
        <div class="settings-footer">
          <button class="btn btn-primary" onclick="App.saveSettings()"><span class="material-icons">save</span> Save Settings</button>
          <button class="btn btn-ghost btn-danger" onclick="App.clearAll()"><span class="material-icons">delete_forever</span> Reset All Data</button>
        </div>
      </div>
    `;
  },

  saveSettings() {
    const stateEl = document.getElementById('s-state');
    const selectedState = INDIAN_STATES.find(s => s.code === stateEl.value);
    const biz = {
      ...DB.getBiz(),
      name: document.getElementById('s-name').value.trim(),
      gstin: document.getElementById('s-gstin').value.toUpperCase().trim(),
      pan: document.getElementById('s-pan').value.toUpperCase().trim(),
      address: document.getElementById('s-addr').value.trim(),
      city: document.getElementById('s-city').value.trim(),
      state: selectedState?.name || '',
      stateCode: stateEl.value,
      pincode: document.getElementById('s-pin').value.trim(),
      phone: document.getElementById('s-phone').value.trim(),
      email: document.getElementById('s-email').value.trim(),
      website: document.getElementById('s-web').value.trim(),
      signatory: document.getElementById('s-sign').value.trim(),
      bankName: document.getElementById('s-bank').value.trim(),
      bankAccount: document.getElementById('s-acc').value.trim(),
      bankIFSC: document.getElementById('s-ifsc').value.trim(),
      bankBranch: document.getElementById('s-branch').value.trim(),
      invoicePrefix: document.getElementById('s-invpfx').value.trim() || 'INV',
      billPrefix: document.getElementById('s-billpfx').value.trim() || 'PO',
      defaultPaymentTerms: parseInt(document.getElementById('s-terms').value) || 30,
      termsAndConditions: document.getElementById('s-tnc').value.trim(),
    };
    if (!biz.name) { this.toast('Business name is required', 'error'); return; }
    if (biz.gstin && !validateGSTIN(biz.gstin)) { this.toast('Invalid GSTIN format', 'error'); return; }
    DB.setBiz(biz);
    this.buildSidebar();
    this.toast('Settings saved successfully!');
  },

  clearAll() {
    if (confirm('⚠️ Delete ALL ShopPulse data permanently?\n\nThis cannot be undone.')) {
      localStorage.clear();
      location.reload();
    }
  }
};

window.addEventListener('DOMContentLoaded', () => App.init());
