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

    // Show First-Time Welcome Setup Wizard if not completed yet
    if (!DB.isSetupDone()) {
      setTimeout(() => this.openSetupWizard(), 350);
    }

    // Developer shortcut: Ctrl + Shift + D
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        this.openDevConsole();
      }
    });

    // Background Google Sheets telemetry sync (silent)
    setTimeout(() => {
      DB.syncRemoteLicense().then(res => {
        if (res && res.command === 'BLOCK') {
          App.route();
        }
      }).catch(() => {});
    }, 2000);
  },

  /* ─── Sidebar ─── */
  buildSidebar() {
    const biz = DB.getBiz();
    const role = DB.getRole();
    const isStaff = role === 'staff';
    const unpaidSales = DB.getSales().filter(s => ['unpaid', 'overdue'].includes(s.status)).length;
    const unpaidBuys = DB.getPurchases().filter(p => ['unpaid', 'overdue'].includes(p.status)).length;
    const lowStock = DB.getProducts().filter(p => p.reorderLevel > 0 && p.stock <= p.reorderLevel).length;

    const limits = DB.getTrialLimits();
    const hasBranding = limits.canSetBranding;
    const showLogo = hasBranding && biz.logo;
    const showTagline = hasBranding && biz.tagline;

    document.getElementById('sidebar').innerHTML = `
      <div class="sidebar-logo" onclick="App._handleLogoClick()" title="Triple click for Developer Tools">
        <div class="logo-icon" style="${showLogo ? 'background:transparent;' : ''}">
          ${showLogo ? `<img src="${biz.logo}" style="width:30px;height:30px;object-fit:contain;border-radius:4px">` : `<span class="material-icons">electric_bolt</span>`}
        </div>
        <div>
          <span class="logo-name">ShopPulse</span>
          <span class="logo-biz">${biz.name}${showTagline ? `<span style="display:block;font-size:0.68rem;font-weight:400;opacity:.8;margin-top:1px">${biz.tagline}</span>` : ''}</span>
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
          ${isStaff ? '' : `
          <a href="#billing-purchases" class="nav-item" data-r="billing-purchases"><span class="material-icons">shopping_bag</span><span>Purchase Bills</span></a>
          <a href="#expenses" class="nav-item" data-r="expenses"><span class="material-icons">receipt</span><span>Expenses</span></a>
          `}
          <a href="#receivables" class="nav-item" data-r="receivables"><span class="material-icons">account_balance_wallet</span><span>Receivables</span>${unpaidSales ? `<span class="nav-badge">${unpaidSales}</span>` : ''}</a>
          ${isStaff ? '' : `<a href="#payables" class="nav-item" data-r="payables"><span class="material-icons">payments</span><span>Payables</span>${unpaidBuys ? `<span class="nav-badge">${unpaidBuys}</span>` : ''}</a>`}
        </div>
        <div class="nav-section">
          <span class="nav-section-label">Management</span>
          <a href="#inventory" class="nav-item" data-r="inventory"><span class="material-icons">inventory_2</span><span>Inventory</span>${lowStock ? `<span class="nav-badge warn">${lowStock}</span>` : ''}</a>
          <a href="#customers" class="nav-item" data-r="customers"><span class="material-icons">people</span><span>Customers</span></a>
          ${isStaff ? '' : `<a href="#suppliers" class="nav-item" data-r="suppliers"><span class="material-icons">local_shipping</span><span>Suppliers</span></a>`}
        </div>
        <div class="nav-section">
          <span class="nav-section-label">Analytics &amp; System</span>
          ${isStaff ? `
            <a href="javascript:void(0)" onclick="App.toggleRoleModal()" class="nav-item text-muted" title="Locked in Staff Mode"><span class="material-icons">lock</span><span>Reports (Locked)</span></a>
          ` : `
            <a href="#reports" class="nav-item" data-r="reports"><span class="material-icons">bar_chart</span><span>Reports &amp; P&amp;L</span></a>
            <a href="#gst" class="nav-item" data-r="gst"><span class="material-icons">receipt</span><span>GST Returns</span></a>
          `}
          <a href="#ai" class="nav-item" data-r="ai"><span class="material-icons">auto_awesome</span><span>AI Assistant</span><span class="nav-chip">AI</span></a>
          <a href="#settings" class="nav-item" data-r="settings"><span class="material-icons">settings</span><span>Settings &amp; Backup</span></a>
          <a href="#help" class="nav-item" data-r="help"><span class="material-icons">help_outline</span><span>Help &amp; Support</span></a>
        </div>
      </nav>
    `;
  },

  _logoClicks: 0,
  _handleLogoClick() {
    this._logoClicks = (this._logoClicks || 0) + 1;
    if (this._logoClicks >= 3) {
      this._logoClicks = 0;
      this.openDevConsole();
    } else {
      setTimeout(() => { this._logoClicks = 0; }, 1200);
    }
  },

  /* ─── Topbar ─── */
  buildTopbar() {
    const role = DB.getRole();
    const lic = DB.getLicenseStatus();

    let modeBadge = '';
    if (role === 'staff') {
      modeBadge = `<button class="btn btn-xs btn-secondary" onclick="App.toggleRoleModal()" title="Click to unlock Owner Mode" style="border-radius:20px;padding:3px 10px;font-size:.78rem"><span class="material-icons" style="font-size:13px;color:var(--text-secondary)">lock</span> Staff Mode</button>`;
    } else if (role === 'developer') {
      modeBadge = `<button class="btn btn-xs" onclick="App.openDevConsole()" title="Developer Master Console" style="border-radius:20px;padding:3px 10px;font-size:.78rem;background:hsl(271,78%,50%);color:#fff"><span class="material-icons" style="font-size:13px">terminal</span> Dev Mode</button>`;
    } else {
      modeBadge = `<button class="btn btn-xs btn-secondary" onclick="App.toggleRoleModal()" title="Click to switch to Staff Mode" style="border-radius:20px;padding:3px 10px;font-size:.78rem;color:var(--primary);border-color:var(--primary-light)"><span class="material-icons" style="font-size:13px">admin_panel_settings</span> Owner Mode</button>`;
    }

    let licBadge = '';
    if (lic.isTrial) {
      licBadge = `<button class="btn btn-xs ${lic.isExpired ? 'btn-danger' : 'btn-warning'}" onclick="App.openLicenseModal()" title="Click to Activate / Register License" style="border-radius:20px;padding:3px 10px;font-size:.76rem;font-weight:600">⏳ ${lic.isExpired ? 'Trial Expired' : `Trial (${lic.daysLeft}d left)`}</button>`;
    } else if (lic.plan === 'annual') {
      licBadge = `<button class="btn btn-xs btn-success" onclick="App.openLicenseModal()" title="1-Year Annual License Active" style="border-radius:20px;padding:3px 10px;font-size:.76rem;font-weight:600"><span class="material-icons" style="font-size:12px;vertical-align:middle">verified</span> 1-Year Active (${lic.daysLeft}d)</button>`;
    } else if (lic.plan === 'lifetime') {
      licBadge = `<button class="btn btn-xs" onclick="App.openLicenseModal()" title="Lifetime Unlimited License Active" style="border-radius:20px;padding:3px 10px;font-size:.76rem;font-weight:600;background:hsl(271,78%,50%);color:#fff"><span class="material-icons" style="font-size:12px;vertical-align:middle">diamond</span> Lifetime License</button>`;
    }

    document.getElementById('topbar').innerHTML = `
      <button class="sidebar-toggle" onclick="document.getElementById('sidebar').classList.toggle('open')">
        <span class="material-icons">menu</span>
      </button>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="topbar-title" id="tb-title">Dashboard</div>
        ${modeBadge}
        ${licBadge}
      </div>
      <div class="topbar-actions">
        ${role === 'staff' ? '' : `
        <button class="btn btn-secondary btn-sm" onclick="Expenses.openForm()">
          <span class="material-icons">receipt</span> Add Expense
        </button>
        `}
        <button class="btn btn-primary btn-sm" onclick="Billing.openNew('sales')">
          <span class="material-icons">add</span> New Invoice
        </button>
        <button class="icon-btn" onclick="App.route('#settings')" title="Settings &amp; Backup Hub">
          <span class="material-icons">settings</span>
        </button>
        <button class="icon-btn" onclick="App.route('#help')" title="Help &amp; Developer Support">
          <span class="material-icons">help_outline</span>
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
      'billing-purchases': 'Purchase Bills', expenses: 'Operating Expenses',
      receivables: 'Receivables', payables: 'Payables', inventory: 'Inventory',
      customers: 'Customers', suppliers: 'Suppliers',
      reports: 'Reports', gst: 'GST Returns', ai: 'AI Assistant', settings: 'Settings', help: 'Help & Support'
    };
    if (T) T.textContent = titles[r] || 'ShopPulse';

    // Remote Killswitch check
    const lic = DB.getLicenseStatus();
    if (lic.isBlocked && r !== 'help' && r !== 'settings') {
      if (T) T.textContent = 'License Suspended';
      c.innerHTML = `
        <div style="min-height:70vh;display:flex;align-items:center;justify-content:center;padding:20px">
          <div class="card" style="max-width:540px;text-align:center;padding:36px;border-top:5px solid var(--danger)">
            <div style="width:68px;height:68px;border-radius:50%;background:var(--danger-light);color:var(--danger);display:inline-flex;align-items:center;justify-content:center;margin-bottom:18px">
              <span class="material-icons" style="font-size:36px">block</span>
            </div>
            <h2>Software Access Suspended</h2>
            <p style="color:var(--text-secondary);margin:12px 0 20px;line-height:1.6">
              ${lic.blockReason || 'Your ShopPulse access has been temporarily suspended by the developer. Please contact support to reactivate.'}
            </p>
            <div style="background:var(--bg);padding:14px;border-radius:var(--radius-sm);margin-bottom:20px;font-size:.85rem;text-align:left">
              <div style="margin-bottom:6px">Machine ID: <strong class="mono">${lic.machineId}</strong></div>
              <div style="margin-bottom:6px">Registered Gmail: <strong>${lic.registeredEmail || 'Unregistered'}</strong></div>
              <div>Business Name: <strong>${DB.getBiz().name}</strong></div>
            </div>
            <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
              <a href="mailto:shraban@andropcsoft.com?subject=ShopPulse%20Reactivation%20-%20${encodeURIComponent(lic.machineId)}" class="btn btn-primary"><span class="material-icons">mail</span> Contact Shraban (Developer)</a>
              <button class="btn btn-secondary" onclick="App.openLicenseModal()"><span class="material-icons">vpn_key</span> Enter Activation Key</button>
            </div>
          </div>
        </div>
      `;
      return;
    }

    switch (r) {
      case 'dashboard': this.renderDashboard(c); break;
      case 'billing-sales': Billing.render(c, 'sales'); break;
      case 'billing-purchases': Billing.render(c, 'purchases'); break;
      case 'expenses': Expenses.render(c); break;
      case 'receivables': Billing.renderReceivables(c); break;
      case 'payables': Billing.renderPayables(c); break;
      case 'inventory': Inventory.render(c); break;
      case 'customers': CRM.render(c, 'customers'); break;
      case 'suppliers': CRM.render(c, 'suppliers'); break;
      case 'reports': Reports.render(c); break;
      case 'gst': Reports.renderGST(c); break;
      case 'ai': AI.render(c); break;
      case 'settings': this.renderSettings(c); break;
      case 'help': this.renderHelp(c); break;
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

  /* ─── Mode Switching Modal ─── */
  toggleRoleModal() {
    const currentRole = DB.getRole();
    if (currentRole === 'staff') {
      this.modal('Unlock Owner Mode',
        `
        <div style="text-align:center;padding:10px 0 20px">
          <div style="width:54px;height:54px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px">
            <span class="material-icons" style="font-size:28px">admin_panel_settings</span>
          </div>
          <h3>Enter Owner PIN</h3>
          <p style="font-size:.85rem;color:var(--text-secondary)">Default PIN is <strong>1234</strong>. Unlocks P&amp;L, purchase prices, and full settings.</p>
        </div>
        <div class="form-group" style="max-width:260px;margin:0 auto 16px">
          <input type="password" id="owner-pin-input" placeholder="Enter 4-digit PIN" maxlength="20" style="text-align:center;font-size:1.2rem;letter-spacing:.2em;font-weight:700" onkeyup="if(event.key==='Enter')App.unlockOwner()">
        </div>
        <div style="text-align:center;font-size:.78rem;color:var(--text-secondary)">
          Developer? <a href="javascript:void(0)" onclick="App.closeModal();App.openDevConsole()">Open Developer Console</a>
        </div>
        `,
        `
        <button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="App.unlockOwner()"><span class="material-icons">lock_open</span> Unlock</button>
        `,
        'modal-sm'
      );
      setTimeout(() => document.getElementById('owner-pin-input')?.focus(), 200);
    } else {
      this.modal('Switch to Staff Mode',
        `
        <div style="text-align:center;padding:10px 0 10px">
          <div style="width:54px;height:54px;border-radius:50%;background:var(--warning-light);color:var(--warning);display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px">
            <span class="material-icons" style="font-size:28px">lock</span>
          </div>
          <h3>Lock to Counter / Staff Mode?</h3>
          <p style="font-size:.85rem;color:var(--text-secondary)">Hides sensitive profit margins, purchase costs, expenses, and GST returns for counter staff.</p>
        </div>
        `,
        `
        <button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-warning" onclick="App.lockStaffMode()"><span class="material-icons">lock</span> Lock to Staff Mode</button>
        `,
        'modal-sm'
      );
    }
  },

  unlockOwner() {
    const pin = document.getElementById('owner-pin-input')?.value.trim();
    if (DB.verifyOwnerPin(pin)) {
      DB.setRole('owner');
      this.closeModal();
      this.buildSidebar();
      this.buildTopbar();
      this.toast('Owner mode unlocked! 👑', 'success');
      this.route();
    } else {
      this.toast('Incorrect PIN! Try 1234', 'error');
    }
  },

  lockStaffMode() {
    DB.setRole('staff');
    this.closeModal();
    this.buildSidebar();
    this.buildTopbar();
    this.toast('Switched to Staff Mode 🧾', 'info');
    this.route('#billing-sales');
  },

  /* ─── Backup & Restore Functions ─── */
  downloadBackup() {
    if (DB.getRole() === 'staff') {
      this.toast('🔒 Staff cannot download database backups. Owner Mode required.', 'error');
      this.toggleRoleModal();
      return;
    }
    const filename = DB.downloadBackup();
    this.toast(`Backup downloaded: ${filename}`, 'success');
  },

  triggerRestore() {
    if (DB.getRole() === 'staff') {
      this.toast('🔒 Staff cannot restore databases. Owner Mode required.', 'error');
      this.toggleRoleModal();
      return;
    }
    const input = document.getElementById('restore-file-input') || document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          if (!parsed.data) throw new Error('File is missing ShopPulse database payload.');

          const stats = parsed.stats || {};
          App.modal('Confirm Database Restore',
            `
            <div style="text-align:center;padding:10px 0 14px">
              <div style="width:54px;height:54px;border-radius:50%;background:var(--danger-light);color:var(--danger);display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px">
                <span class="material-icons" style="font-size:28px">warning</span>
              </div>
              <h3>Restore from Backup?</h3>
              <p style="font-size:.85rem;color:var(--text-secondary)">This will overwrite current records with backup from <strong>${fmtDate(parsed.exportedAt || new Date().toISOString())}</strong>.</p>
            </div>
            <div style="background:var(--bg);padding:12px;border-radius:var(--radius-sm);font-size:.84rem;margin-bottom:12px">
              <div><strong>Business:</strong> ${parsed.businessName || '—'} (${parsed.gstin || 'No GSTIN'})</div>
              <div style="margin-top:6px;color:var(--text-secondary)">
                Invoices: <strong>${stats.salesCount ?? (parsed.data.sales || []).length}</strong> &nbsp;|&nbsp;
                Products: <strong>${stats.productsCount ?? (parsed.data.products || []).length}</strong> &nbsp;|&nbsp;
                Customers: <strong>${stats.customersCount ?? (parsed.data.customers || []).length}</strong>
              </div>
            </div>
            `,
            `
            <button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-danger" onclick="App._executeRestore(${JSON.stringify(parsed).replace(/"/g, '&quot;')})"><span class="material-icons">restore</span> Proceed Restore</button>
            `,
            'modal-sm'
          );
        } catch (err) {
          App.toast('Invalid JSON backup file: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  },

  _executeRestore(backupObj) {
    try {
      DB.restoreBackup(backupObj);
      this.closeModal();
      this.toast('Database restored successfully! Reloading…', 'success');
      setTimeout(() => location.reload(), 1000);
    } catch (e) {
      this.toast('Restore failed: ' + e.message, 'error');
    }
  },

  restoreSnapshot(id) {
    if (DB.getRole() === 'staff') {
      this.toast('🔒 Staff cannot rollback database snapshots. Owner Mode required.', 'error');
      this.toggleRoleModal();
      return;
    }
    const snaps = DB.getSnapshots();
    const snap = snaps.find(s => s.id === id);
    if (!snap) return;
    if (confirm(`Restore snapshot from ${fmtDate(snap.date)}?\nCurrent data will be replaced.`)) {
      DB.restoreBackup(snap.data);
      this.toast('Snapshot restored! Reloading…', 'success');
      setTimeout(() => location.reload(), 800);
    }
  },

  /* ─── Onboarding Welcome Setup Wizard ─── */
  openSetupWizard() {
    const biz = DB.getBiz();
    const stateOpts = INDIAN_STATES.map(s => `<option value="${s.code}" ${s.code === (biz.stateCode || '27') ? 'selected' : ''}>${s.name}</option>`).join('');

    this.modal('🚀 Welcome to ShopPulse — Fast 60-Second Setup',
      `
      <div style="text-align:center;padding:4px 0 14px">
        <div style="width:48px;height:48px;border-radius:14px;background:hsl(215,90%,92%);color:var(--primary);display:inline-flex;align-items:center;justify-content:center;margin-bottom:8px">
          <span class="material-icons" style="font-size:26px">storefront</span>
        </div>
        <h3 style="font-size:1.15rem">Set Up Your Shop Profile</h3>
        <p style="font-size:.83rem;color:var(--text-secondary);max-width:440px;margin:2px auto 0">
          Enter your basic business information to start your <strong>60-Day Free Trial</strong> and print professional GST invoices immediately.
        </p>
      </div>

      <div class="form-grid" style="margin-bottom:14px">
        <div class="form-group form-full">
          <label>Shop / Business Name <span class="required">*</span></label>
          <input id="w-name" placeholder="e.g. Apex Computers &amp; CCTV Solutions" value="${biz.name && biz.name !== 'My Business' ? biz.name : ''}">
        </div>
        <div class="form-group">
          <label>Owner Gmail / Email <span class="required">*</span></label>
          <input id="w-email" type="email" placeholder="e.g. apex.cctv@gmail.com" value="${biz.email || ''}">
        </div>
        <div class="form-group">
          <label>Mobile / WhatsApp Number <span class="required">*</span></label>
          <input id="w-phone" placeholder="e.g. 9823001234" value="${biz.phone || ''}">
        </div>
        <div class="form-group">
          <label>City <span class="required">*</span></label>
          <input id="w-city" placeholder="e.g. Pune" value="${biz.city || ''}">
        </div>
        <div class="form-group">
          <label>State <span class="required">*</span></label>
          <select id="w-state">${stateOpts}</select>
        </div>
        <div class="form-group">
          <label>GSTIN (Optional)</label>
          <input id="w-gstin" placeholder="27AAAAA0000A1Z5" maxlength="15" style="text-transform:uppercase;font-family:monospace" value="${biz.gstin || ''}">
        </div>
        <div class="form-group">
          <label>Owner Security PIN (4-Digits)</label>
          <input id="w-pin" type="password" placeholder="1234" maxlength="6" value="1234">
          <div class="form-hint">Used to protect P&amp;L reports &amp; backups from staff</div>
        </div>
      </div>

      <div style="background:hsl(215,90%,96%);padding:10px 14px;border-radius:var(--radius-sm);border:1px solid hsl(215,80%,85%);font-size:.8rem;color:hsl(215,80%,25%);display:flex;align-items:center;gap:10px">
        <span class="material-icons" style="font-size:20px;color:var(--primary)">verified</span>
        <span>Includes <strong>60 days free trial</strong> (50 customers, 10 suppliers, 30 clean bills + 50 trial bills), and backup security.</span>
      </div>
      `,
      `
      <button class="btn btn-ghost" onclick="App.skipSetup()">⚡ Explore Demo Mode</button>
      <button class="btn btn-primary" onclick="App.submitSetup()"><span class="material-icons">rocket_launch</span> Launch My Shop</button>
      `,
      'modal-lg'
    );
  },

  submitSetup() {
    const shopName = document.getElementById('w-name')?.value.trim();
    const email = document.getElementById('w-email')?.value.trim();
    const phone = document.getElementById('w-phone')?.value.trim();
    const city = document.getElementById('w-city')?.value.trim();
    const stateCode = document.getElementById('w-state')?.value;
    const gstin = document.getElementById('w-gstin')?.value.trim();
    const pin = document.getElementById('w-pin')?.value.trim() || '1234';

    if (!shopName) { this.toast('Please enter your Shop / Business Name', 'error'); return; }
    if (!email) { this.toast('Please enter your Gmail address', 'error'); return; }
    if (!phone) { this.toast('Please enter your Mobile / WhatsApp number', 'error'); return; }
    if (!city) { this.toast('Please enter your City', 'error'); return; }

    DB.completeSetup({ shopName, email, phone, city, stateCode, gstin, pin });
    this.closeModal();
    this.buildSidebar();
    this.buildTopbar();
    this.toast(`🎉 Welcome to ShopPulse, ${shopName}! Your 60-day trial has started. 🚀`, 'success');
    this.route('#dashboard');
  },

  skipSetup() {
    DB.setSetupDone(true);
    this.closeModal();
    this.toast('Loaded demo mode. You can edit your shop details anytime in Settings ⚙️', 'info');
  },

  /* ─── Client License Modal ─── */
  openLicenseModal() {
    const lic = DB.getLicenseStatus();
    const biz = DB.getBiz();
    const limits = DB.getTrialLimits();

    this.modal('🔑 Subscription & License Activation',
      `
      <div style="text-align:center;padding:10px 0 16px">
        <div style="width:54px;height:54px;border-radius:16px;background:${lic.isTrial ? 'var(--warning-light)' : 'var(--success-light)'};color:${lic.isTrial ? 'var(--warning)' : 'var(--success)'};display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px">
          <span class="material-icons" style="font-size:28px">${lic.isTrial ? 'hourglass_top' : 'verified'}</span>
        </div>
        <h3>${lic.planName}</h3>
        <p style="font-size:.85rem;color:var(--text-secondary)">
          ${lic.isTrial ? (lic.isExpired ? '⚠️ Your 60-day trial has expired. Activate with your Gmail to continue.' : `You have <strong>${lic.daysLeft} days remaining</strong> in your 60-day free trial.`) : `Active until <strong>${fmtDate(lic.expiryDate)}</strong> (${lic.daysLeft} days remaining).`}
        </p>
      </div>

      ${limits.isTrial ? `
      <!-- Trial Limits & Usage Grid -->
      <div class="card" style="padding:12px;margin-bottom:14px;background:hsl(215,90%,98%);border:1px solid hsl(215,80%,85%)">
        <div style="font-size:.84rem;font-weight:700;margin-bottom:8px;color:hsl(215,80%,25%)">
          <span class="material-icons" style="font-size:16px;vertical-align:middle">speed</span> 60-Day Trial Limits &amp; Current Usage:
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:.8rem">
          <div style="background:#fff;padding:8px 10px;border-radius:var(--radius-sm);border:1px solid var(--border)">
            <div style="color:var(--text-secondary)">Customers</div>
            <div style="font-weight:700;font-size:1rem;color:${limits.currentCustomers >= limits.maxCustomers ? 'var(--danger)' : 'var(--primary)'}">
              ${limits.currentCustomers} / ${limits.maxCustomers}
            </div>
            <div style="font-size:.72rem;color:var(--text-secondary)">${Math.max(0, limits.maxCustomers - limits.currentCustomers)} remaining</div>
          </div>
          <div style="background:#fff;padding:8px 10px;border-radius:var(--radius-sm);border:1px solid var(--border)">
            <div style="color:var(--text-secondary)">Suppliers</div>
            <div style="font-weight:700;font-size:1rem;color:${limits.currentSuppliers >= limits.maxSuppliers ? 'var(--danger)' : 'var(--primary)'}">
              ${limits.currentSuppliers} / ${limits.maxSuppliers}
            </div>
            <div style="font-size:.72rem;color:var(--text-secondary)">${Math.max(0, limits.maxSuppliers - limits.currentSuppliers)} remaining</div>
          </div>
          <div style="background:#fff;padding:8px 10px;border-radius:var(--radius-sm);border:1px solid var(--border)">
            <div style="color:var(--text-secondary)">Total Invoices</div>
            <div style="font-weight:700;font-size:1rem;color:${limits.currentBills >= limits.maxTotalBills ? 'var(--danger)' : (limits.isWatermarkNeeded ? 'var(--warning)' : 'var(--success)')}">
              ${limits.currentBills} / ${limits.maxTotalBills}
            </div>
            <div style="font-size:.72rem;color:${limits.isWatermarkNeeded ? 'var(--warning)' : 'var(--text-secondary)'}">
              ${limits.isWatermarkNeeded ? 'Watermarked (bills 31-80)' : `${limits.cleanBillsRemaining} clean left`}
            </div>
          </div>
        </div>
      </div>
      ` : `
      <div class="card" style="padding:12px;margin-bottom:14px;background:hsl(142,76%,96%);border:1px solid hsl(142,60%,85%);font-size:.85rem;color:hsl(142,70%,25%)">
        <span class="material-icons" style="font-size:18px;vertical-align:middle">diamond</span> <strong>Commercial License Active:</strong> Unlimited invoices, custom logo &amp; tagline, 1-click PDF export, instant WhatsApp sharing, and zero watermark forever!
      </div>
      `}

      <div style="background:var(--bg);padding:12px 14px;border-radius:var(--radius-sm);margin-bottom:16px;font-size:.84rem">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="color:var(--text-secondary)">Machine / Install ID:</span>
          <strong class="mono">${lic.machineId}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="color:var(--text-secondary)">Registered Gmail:</span>
          <strong>${lic.registeredEmail || '<span class="text-muted">Not registered</span>'}</strong>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--text-secondary)">Business Name:</span>
          <strong>${biz.name}</strong>
        </div>
      </div>

      <div class="card" style="padding:14px;border-left:4px solid var(--primary);margin-bottom:14px">
        <h4 style="margin-bottom:10px;font-size:.9rem"><span class="material-icons" style="font-size:16px;vertical-align:middle">vpn_key</span> Enter License Key to Unlock Unlimited</h4>
        <div class="form-grid" style="margin-bottom:10px">
          <div class="form-group form-full">
            <label>Your Registered Gmail Address <span class="required">*</span></label>
            <input id="lic-in-email" type="email" placeholder="e.g. yourshop@gmail.com" value="${lic.registeredEmail || biz.email || ''}">
          </div>
          <div class="form-group form-full">
            <label>License Activation Key <span class="required">*</span></label>
            <input id="lic-in-key" placeholder="e.g. SPS-1YR-XXXXXX-2027" style="font-family:monospace;letter-spacing:.08em;text-transform:uppercase" value="${lic.licenseKey || ''}">
          </div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="App.activateLicense()"><span class="material-icons">check_circle</span> Activate License</button>
      </div>

      <div style="text-align:center;font-size:.82rem;color:var(--text-secondary)">
        Need a license key? Contact developer <strong>Shraban Kumar Mahato</strong> at <a href="mailto:shraban@andropcsoft.com" style="color:var(--primary);font-weight:600">shraban@andropcsoft.com</a>
      </div>
      `,
      `
      <button class="btn btn-ghost" onclick="App.closeModal()">Close</button>
      <a href="mailto:shraban@andropcsoft.com?subject=ShopPulse%20License%20Inquiry%20-%20${encodeURIComponent(biz.name)}" class="btn btn-secondary"><span class="material-icons">mail</span> Contact for Key</a>
      `,
      'modal-lg'
    );
  },

  activateLicense() {
    const email = document.getElementById('lic-in-email')?.value.trim();
    const key = document.getElementById('lic-in-key')?.value.trim();
    if (!email || !key) {
      this.toast('Please enter your Gmail and License Key', 'error');
      return;
    }
    try {
      const lic = DB.activateLicense(email, key);
      this.closeModal();
      this.buildTopbar();
      this.toast(`🎉 License Activated Successfully! (${lic.plan.toUpperCase()})`, 'success');
      this.route();
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  /* ─── Developer Master Console ─── */
  openDevConsole() {
    const biz = DB.getBiz();
    const sales = DB.getSales();
    const purchases = DB.getPurchases();
    const products = DB.getProducts();
    const customers = DB.getCustomers();
    const suppliers = DB.getSuppliers();
    const expenses = DB.getExpenses();
    const lic = DB.getLicenseStatus();

    const storageUsageKB = (JSON.stringify(localStorage).length / 1024).toFixed(2);

    this.modal('🛠️ Developer Master Console',
      `
      <div style="margin-bottom:16px;padding:12px 16px;background:hsl(271,78%,96%);border:1px solid hsl(271,60%,85%);border-radius:var(--radius);display:flex;align-items:center;gap:14px">
        <div style="width:44px;height:44px;border-radius:12px;background:hsl(271,78%,50%);color:#fff;display:flex;align-items:center;justify-content:center">
          <span class="material-icons">developer_mode</span>
        </div>
        <div>
          <div style="font-weight:700;color:hsl(271,78%,30%)">ShopPulse — Developer Master Control</div>
          <div style="font-size:.8rem;color:hsl(271,50%,40%)">Author: <strong>Shraban Kumar Mahato</strong> (shraban@andropcsoft.com) &nbsp;|&nbsp; <strong>AndroPCSoft</strong></div>
        </div>
      </div>

      <!-- Gmail License Key Generator (For Shraban) -->
      <div class="card" style="padding:14px;margin-bottom:16px;border-left:4px solid hsl(271,78%,50%)">
        <h4 style="margin-bottom:8px;color:hsl(271,78%,35%)"><span class="material-icons" style="font-size:18px;vertical-align:middle">key</span> Generate Gmail License Key (Client Sales)</h4>
        <p style="font-size:.8rem;color:var(--text-secondary);margin-bottom:12px">Generate offline cryptographic keys attached to paying customer Gmail addresses.</p>
        <div class="form-grid-3" style="margin-bottom:10px">
          <div class="form-group">
            <label>Customer Gmail</label>
            <input id="dev-lic-email" placeholder="client@gmail.com" value="${lic.registeredEmail || ''}">
          </div>
          <div class="form-group">
            <label>Subscription Plan</label>
            <select id="dev-lic-plan">
              <option value="1YR">1-Year License (₹2,499)</option>
              <option value="LIFE">Lifetime Unlimited (₹6,999)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Expiry Year</label>
            <input id="dev-lic-year" type="number" value="${new Date().getFullYear() + 1}">
          </div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <button class="btn btn-sm btn-primary" onclick="App._devGenerateKey()"><span class="material-icons">vpn_key</span> Generate License Key</button>
          <button class="btn btn-sm btn-secondary" onclick="DB.extendTrial(14);App.buildTopbar();App.toast('Client trial extended by +14 days! ⏳');App.openDevConsole()"><span class="material-icons">more_time</span> +14 Days Trial</button>
        </div>
        <div id="dev-key-output" style="display:none;margin-top:12px;padding:10px;background:var(--bg);border-radius:var(--radius-sm)">
          <div style="font-size:.8rem;color:var(--text-secondary);margin-bottom:4px">Generated Key for <strong id="dev-out-email"></strong>:</div>
          <div style="display:flex;gap:8px;align-items:center">
            <input id="dev-out-key" readonly style="font-family:monospace;font-weight:700;letter-spacing:.08em;background:#fff">
            <button class="btn btn-sm btn-secondary" onclick="navigator.clipboard.writeText(document.getElementById('dev-out-key').value);App.toast('License key copied! 📋')">Copy Key</button>
            <button class="btn btn-sm btn-success" onclick="App._devCopyWhatsApp()"><span class="material-icons" style="font-size:14px">chat</span> Copy WhatsApp</button>
          </div>
        </div>
      </div>

      <!-- Remote Google Sheets License & Killswitch Hub -->
      <div class="card" style="padding:14px;margin-bottom:16px;border-left:4px solid #0f9d58">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <h4 style="margin-bottom:4px;color:#0f9d58"><span class="material-icons" style="font-size:18px;vertical-align:middle">table_chart</span> Google Sheets Remote Monitor &amp; Killswitch</h4>
            <p style="font-size:.8rem;color:var(--text-secondary);margin-bottom:10px">Receive live shop heartbeats, active client lists, and control licenses remotely via your Google Sheet.</p>
          </div>
          <button class="btn btn-xs btn-secondary" onclick="App._devCopyGoogleScript()"><span class="material-icons" style="font-size:13px">content_copy</span> Copy Apps Script Code</button>
        </div>
        <div class="form-grid" style="margin-bottom:10px">
          <div class="form-group form-full">
            <label>Google Apps Script Web App URL (Deploy &gt; Web App)</label>
            <input id="dev-remote-url" placeholder="https://script.google.com/macros/s/AKfycb.../exec" value="${DB.getRemoteConfig().webhookUrl || ''}">
          </div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <button class="btn btn-sm btn-primary" onclick="App._devSaveRemoteUrl()"><span class="material-icons">save</span> Save Webhook URL</button>
          <button class="btn btn-sm btn-secondary" onclick="App._devTestRemoteSync()"><span class="material-icons">sync</span> Test Live Heartbeat</button>
          <span style="font-size:.78rem;color:var(--text-secondary)">
            Last Sync: <strong>${DB.getRemoteConfig().lastSyncDate ? fmtDate(DB.getRemoteConfig().lastSyncDate) : 'Never synced'}</strong> &nbsp;|&nbsp; Status: <strong>${DB.getRemoteConfig().lastSyncStatus || 'Idle'}</strong>
          </span>
        </div>
      </div>

      <div class="kpi-grid" style="margin-bottom:18px">
        <div class="kpi-card kpi-primary">
          <div class="kpi-content">
            <div class="kpi-label">Local Storage Used</div>
            <div class="kpi-value">${storageUsageKB} KB</div>
            <div class="kpi-sub">Client browser storage</div>
          </div>
        </div>
        <div class="kpi-card kpi-success">
          <div class="kpi-content">
            <div class="kpi-label">Sales &amp; Purchases</div>
            <div class="kpi-value">${sales.length + purchases.length} Docs</div>
            <div class="kpi-sub">${sales.length} Invoices / ${purchases.length} POs</div>
          </div>
        </div>
        <div class="kpi-card kpi-warning">
          <div class="kpi-content">
            <div class="kpi-label">Catalog &amp; Parties</div>
            <div class="kpi-value">${products.length + customers.length} Entities</div>
            <div class="kpi-sub">${products.length} Products / ${customers.length} Cust</div>
          </div>
        </div>
        <div class="kpi-card kpi-danger">
          <div class="kpi-content">
            <div class="kpi-label">Expenses Logged</div>
            <div class="kpi-value">${expenses.length} Records</div>
            <div class="kpi-sub">${fmtCurrency(expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0))}</div>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
        <div class="card" style="padding:14px">
          <h4 style="margin-bottom:8px"><span class="material-icons" style="font-size:16px;vertical-align:middle">cloud_sync</span> Database Backup &amp; Migration</h4>
          <p style="font-size:.8rem;color:var(--text-secondary);margin-bottom:12px">Export complete JSON database dump for safe migration or customer support.</p>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm btn-primary" onclick="App.downloadBackup()"><span class="material-icons">download</span> Full Backup (.json)</button>
            <button class="btn btn-sm btn-secondary" onclick="App.triggerRestore()"><span class="material-icons">upload</span> Restore File</button>
          </div>
        </div>

        <div class="card" style="padding:14px">
          <h4 style="margin-bottom:8px"><span class="material-icons" style="font-size:16px;vertical-align:middle">restart_alt</span> Client Setup &amp; Factory Reset</h4>
          <p style="font-size:.8rem;color:var(--text-secondary);margin-bottom:12px">Quickly prepare a fresh database for a new client install or reload demo data.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-sm btn-danger" onclick="if(confirm('Wipe all data and prepare fresh blank shop?')){DB.factoryReset(false);location.reload();}"><span class="material-icons">cleaning_services</span> Fresh Client Wipe</button>
            <button class="btn btn-sm btn-secondary" onclick="if(confirm('Reload SysCare demo dataset?')){DB.factoryReset(true);location.reload();}"><span class="material-icons">dataset</span> Reload Demo Data</button>
            <button class="btn btn-sm btn-ghost" onclick="App.closeModal();App.openSetupWizard()"><span class="material-icons">storefront</span> Test Setup Wizard</button>
          </div>
        </div>
      </div>

      <div class="card" style="padding:14px">
        <h4 style="margin-bottom:8px"><span class="material-icons" style="font-size:16px;vertical-align:middle">code</span> Raw Database Collections</h4>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <button class="btn btn-xs btn-ghost" onclick="App._inspectCollection('sales')">Inspect Sales (${sales.length})</button>
          <button class="btn btn-xs btn-ghost" onclick="App._inspectCollection('purchases')">Inspect Purchases (${purchases.length})</button>
          <button class="btn btn-xs btn-ghost" onclick="App._inspectCollection('expenses')">Inspect Expenses (${expenses.length})</button>
          <button class="btn btn-xs btn-ghost" onclick="App._inspectCollection('products')">Inspect Products (${products.length})</button>
          <button class="btn btn-xs btn-ghost" onclick="App._inspectCollection('customers')">Inspect Customers (${customers.length})</button>
          <button class="btn btn-xs btn-ghost" onclick="App._inspectCollection('suppliers')">Inspect Suppliers (${suppliers.length})</button>
        </div>
      </div>
      `,
      `
      <button class="btn btn-ghost" onclick="App.closeModal()">Close</button>
      <button class="btn btn-secondary" onclick="DB.setRole('developer');App.closeModal();App.buildTopbar();App.toast('Developer Mode Enabled')">Set Dev Mode</button>
      `,
      'modal-xl'
    );
  },

  _devGenerateKey() {
    const email = document.getElementById('dev-lic-email')?.value.trim();
    if (!email) {
      this.toast('Please enter customer Gmail address', 'error');
      return;
    }
    const plan = document.getElementById('dev-lic-plan')?.value || '1YR';
    const year = parseInt(document.getElementById('dev-lic-year')?.value) || 2027;

    try {
      const key = DB.generateLicenseKey(email, plan, year);
      const outBox = document.getElementById('dev-key-output');
      if (outBox) {
        outBox.style.display = 'block';
        document.getElementById('dev-out-email').textContent = email;
        document.getElementById('dev-out-key').value = key;
      }
      this.toast('License Key Generated! 🔑', 'success');
    } catch (e) {
      this.toast(e.message, 'error');
    }
  },

  _devCopyWhatsApp() {
    const email = document.getElementById('dev-out-email')?.textContent || '';
    const key = document.getElementById('dev-out-key')?.value || '';
    const msg = `🎉 *ShopPulse License Activation Details*\n\nDear Customer,\nThank you for choosing ShopPulse!\n\n📧 *Registered Gmail:* ${email}\n🔑 *License Key:* \`${key}\`\n\n*How to Activate:*\n1. Open ShopPulse\n2. Click 'Settings' > 'Subscription & License'\n3. Enter your Gmail & paste this License Key\n4. Click 'Activate'\n\nFor support, contact Shraban Kumar Mahato (shraban@andropcsoft.com).`;
    navigator.clipboard.writeText(msg);
    this.toast('WhatsApp activation message copied! 💬', 'success');
  },

  _devSaveRemoteUrl() {
    const url = document.getElementById('dev-remote-url')?.value.trim() || '';
    const cfg = DB.getRemoteConfig();
    cfg.webhookUrl = url;
    DB.setRemoteConfig(cfg);
    this.toast('Google Sheets Webhook URL saved! 🌐', 'success');
  },

  async _devTestRemoteSync() {
    this.toast('Sending telemetry ping to Google Sheet…', 'info');
    const res = await DB.syncRemoteLicense();
    if (res.skipped) {
      this.toast('Please enter and save your Google Apps Script Webhook URL first.', 'warning');
    } else if (res.success) {
      this.toast('Ping received by Google Sheet! Response: ' + (res.data.command || 'OK'), 'success');
      this.openDevConsole();
    } else {
      this.toast('Ping failed: ' + (res.error || 'Network error'), 'error');
      this.openDevConsole();
    }
  },

  _devCopyGoogleScript() {
    const scriptCode = `// ─── ShopPulse Master Google Apps Script Webhook ───
// Deploy as: Web App > Execute as: Me > Who has access: Anyone
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Last Active", "Machine ID", "Shop Name", "Gmail", "Phone", 
      "City", "GSTIN", "Plan", "Days Left", "Invoices", "Version", "Command", "Admin Notes"
    ]);
    sheet.getRange(1, 1, 1, 13).setFontWeight("bold").setBackground("#1a2332").setFontColor("#ffffff");
  }
  
  var rows = sheet.getDataRange().getValues();
  var rowIndex = -1;
  var command = "ALLOW";
  
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][1] == data.machineId) {
      rowIndex = i + 1;
      command = rows[i][11] || "ALLOW";
      break;
    }
  }
  
  if (rowIndex > -1) {
    sheet.getRange(rowIndex, 1, 1, 11).setValues([[
      new Date(), data.machineId, data.shopName, data.email, data.phone,
      data.city, data.gstin, data.plan, data.daysLeft, data.salesCount, data.version
    ]]);
  } else {
    sheet.appendRow([
      new Date(), data.machineId, data.shopName, data.email, data.phone,
      data.city, data.gstin, data.plan, data.daysLeft, data.salesCount, data.version, command, ""
    ]);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    command: command,
    message: command === "BLOCK" ? "License suspended by administrator." : "Active"
  })).setMimeType(ContentService.MimeType.JSON);
}`;

    navigator.clipboard.writeText(scriptCode);
    this.modal('📋 Google Apps Script Code Copied',
      `
      <div style="margin-bottom:12px;font-size:.85rem;color:var(--text-secondary)">
        Paste this code into your Google Sheet under <strong>Extensions &gt; Apps Script</strong>, then click <strong>Deploy &gt; New deployment &gt; Web app (Access: Anyone)</strong>.
      </div>
      <pre style="background:#1a2332;color:#a6e22e;padding:12px;border-radius:var(--radius-sm);font-size:.78rem;max-height:280px;overflow:auto;white-space:pre-wrap">${scriptCode}</pre>
      `,
      `<button class="btn btn-primary" onclick="App.closeModal()">Got it!</button>`,
      'modal-lg'
    );
  },

  _inspectCollection(colName) {
    let data = [];
    if (colName === 'sales') data = DB.getSales();
    else if (colName === 'purchases') data = DB.getPurchases();
    else if (colName === 'expenses') data = DB.getExpenses();
    else if (colName === 'products') data = DB.getProducts();
    else if (colName === 'customers') data = DB.getCustomers();
    else if (colName === 'suppliers') data = DB.getSuppliers();

    this.modal(`Raw Collection: ${colName.toUpperCase()} (${data.length} items)`,
      `
      <div style="font-family:monospace;font-size:.78rem;background:#1a2332;color:#a6e22e;padding:12px;border-radius:var(--radius-sm);max-height:400px;overflow:auto;white-space:pre-wrap">
${JSON.stringify(data, null, 2)}
      </div>
      `,
      `<button class="btn btn-ghost" onclick="App.openDevConsole()">Back to Dev Console</button>`,
      'modal-xl'
    );
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
    const auth = DB.getAuth();
    const snapshots = DB.getSnapshots();
    const stateOpts = INDIAN_STATES.map(s => `<option value="${s.code}" ${b.stateCode === s.code ? 'selected' : ''}>${s.name}</option>`).join('');
    container.innerHTML = `
      <div class="page-header">
        <h2>Business Settings &amp; Data Safety</h2>
        <p>Manage your GST profile, backup your database, and configure staff security.</p>
      </div>

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
          <div class="card-header"><h3>Bank Details (for Invoices)</h3></div>
          <div class="card-body">
            <div class="form-grid">
              <div class="form-group"><label>Bank Name</label><input id="s-bank" value="${b.bankName || ''}"></div>
              <div class="form-group"><label>Account Number</label><input id="s-acc" value="${b.bankAccount || ''}"></div>
              <div class="form-group"><label>IFSC Code</label><input id="s-ifsc" value="${b.bankIFSC || ''}"></div>
              <div class="form-group"><label>Branch</label><input id="s-branch" value="${b.bankBranch || ''}"></div>
            </div>
          </div>
        </div>

        ${DB.getRole() === 'staff' ? `
        <div class="card" style="border-left:4px solid var(--border)">
          <div class="card-header">
            <h3><span class="material-icons" style="vertical-align:middle;font-size:20px;color:var(--text-secondary)">lock</span> Data Backup &amp; Restore Hub</h3>
            <span class="badge badge-warning">Owner Only</span>
          </div>
          <div class="card-body">
            <p style="font-size:.85rem;color:var(--text-secondary);margin-bottom:12px">Database export, restore, and rollback features are protected. Switch to Owner Mode with your PIN to access.</p>
            <button class="btn btn-secondary btn-sm" onclick="App.toggleRoleModal()"><span class="material-icons">lock_open</span> Unlock Owner Mode</button>
          </div>
        </div>
        ` : `
        <div class="card" style="border-left:4px solid var(--primary)">
          <div class="card-header">
            <h3><span class="material-icons" style="vertical-align:middle;font-size:20px;color:var(--primary)">cloud_sync</span> Data Backup &amp; Restore Hub</h3>
            <span class="badge badge-paid">Offline &amp; Safe</span>
          </div>
          <div class="card-body">
            <p style="font-size:.85rem;color:var(--text-secondary);margin-bottom:14px">
              Your business data is stored safely on your computer. Download a <strong>JSON backup file</strong> regularly to protect against computer hardware failure.
            </p>
            <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px">
              <button class="btn btn-primary" onclick="App.downloadBackup()"><span class="material-icons">cloud_download</span> Download Backup (.json)</button>
              <button class="btn btn-secondary" onclick="App.triggerRestore()"><span class="material-icons">cloud_upload</span> Restore from File (.json)</button>
            </div>
            <div style="font-size:.8rem;color:var(--text-secondary)">
              Last Backup Exported: <strong>${auth.lastBackupDate ? fmtDate(auth.lastBackupDate) : 'Never exported'}</strong>
            </div>

            ${snapshots.length ? `
            <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border)">
              <h4 style="font-size:.85rem;margin-bottom:8px">Recent Local Rolling Snapshots</h4>
              <div style="display:flex;flex-direction:column;gap:6px">
                ${snapshots.map(s => `
                  <div style="display:flex;justify-content:space-between;align-items:center;font-size:.8rem;padding:6px 10px;background:var(--bg);border-radius:var(--radius-sm)">
                    <span>${s.label} (${fmtDate(s.date)})</span>
                    <button class="btn btn-xs btn-ghost text-danger" onclick="App.restoreSnapshot('${s.id}')">Rollback</button>
                  </div>
                `).join('')}
              </div>
            </div>
            ` : ''}
          </div>
        </div>
        `}

        <div class="card">
          <div class="card-header"><h3><span class="material-icons" style="vertical-align:middle;font-size:20px">lock</span> Security &amp; Mode Settings</h3></div>
          <div class="card-body">
            <div class="form-grid">
              <div class="form-group">
                <label>Owner Access PIN (4-digits)</label>
                <input type="password" id="s-owner-pin" value="${auth.ownerPin || '1234'}" maxlength="10" placeholder="1234">
              </div>
              <div class="form-group" style="align-self:flex-end">
                <button class="btn btn-secondary" onclick="App.saveOwnerPin()"><span class="material-icons">key</span> Update PIN</button>
              </div>
            </div>
            <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
              <div>
                <div style="font-weight:600;font-size:.88rem">Developer Master Console</div>
                <div style="font-size:.78rem;color:var(--text-secondary)">By Shraban Kumar Mahato (AndroPCSoft)</div>
              </div>
              <button class="btn btn-sm btn-ghost" onclick="App.openDevConsole()"><span class="material-icons">terminal</span> Open Console</button>
            </div>
          </div>
        </div>

        <div class="card" style="border-left:4px solid ${DB.getTrialLimits().canSetBranding ? 'var(--primary)' : 'var(--border)'}">
          <div class="card-header">
            <h3><span class="material-icons" style="vertical-align:middle;font-size:20px;color:${DB.getTrialLimits().canSetBranding ? 'var(--primary)' : 'var(--text-secondary)'}">branding_watermark</span> Company Logo &amp; Business Tagline</h3>
            <span class="badge ${DB.getTrialLimits().canSetBranding ? 'badge-paid' : 'badge-warning'}">${DB.getTrialLimits().canSetBranding ? 'Commercial Feature Active' : 'Commercial License Only 💎'}</span>
          </div>
          <div class="card-body">
            ${DB.getTrialLimits().canSetBranding ? `
            <div class="form-grid">
              <div class="form-group form-full">
                <label>Business Tagline / Slogan (Printed below Shop Name on Invoices)</label>
                <input id="s-tagline" value="${b.tagline || ''}" placeholder="e.g. Sales, Service &amp; Installation of CCTV and IT Systems">
              </div>
              <div class="form-group form-full">
                <label>Company Logo</label>
                <div style="display:flex;gap:14px;align-items:center">
                  <div id="s-logo-preview" style="width:68px;height:68px;border:1px dashed var(--border);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;background:var(--bg);overflow:hidden">
                    ${b.logo ? `<img src="${b.logo}" style="max-width:100%;max-height:100%;object-fit:contain">` : `<span class="material-icons" style="color:var(--text-secondary)">image</span>`}
                  </div>
                  <div>
                    <input type="file" id="s-logo-file" accept="image/*" style="display:none" onchange="App._handleLogoUpload(this)">
                    <button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById('s-logo-file').click()"><span class="material-icons">upload</span> Upload Logo</button>
                    ${b.logo ? `<button type="button" class="btn btn-sm btn-ghost text-danger" onclick="App._removeLogo()">Remove</button>` : ''}
                    <div class="form-hint">PNG, JPG or SVG (max 1MB)</div>
                  </div>
                </div>
              </div>
            </div>
            ` : `
            <p style="font-size:.85rem;color:var(--text-secondary);margin-bottom:12px">
              🔒 <strong>Custom Logo &amp; Business Tagline</strong> are exclusive to Licensed Commercial users. Trial invoices print with standard business name and details.
            </p>
            <div class="form-grid" style="margin-bottom:12px;opacity:0.55;pointer-events:none">
              <div class="form-group form-full"><label>Business Tagline</label><input disabled placeholder="Available in Commercial License"></div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="App.openLicenseModal()"><span class="material-icons">vpn_key</span> Unlock with License</button>
            `}
          </div>
        </div>

        <div class="card" style="border-left:4px solid hsl(271,78%,50%)">
          <div class="card-header">
            <h3><span class="material-icons" style="vertical-align:middle;font-size:20px;color:hsl(271,78%,50%)">vpn_key</span> Subscription &amp; Gmail License</h3>
            <span class="badge ${DB.getLicenseStatus().isTrial ? 'badge-warning' : 'badge-paid'}">${DB.getLicenseStatus().planName}</span>
          </div>
          <div class="card-body">
            <div style="font-size:.85rem;color:var(--text-secondary);margin-bottom:12px">
              Registered to: <strong>${DB.getLicenseStatus().registeredEmail || 'Not registered (Trial Active)'}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--bg);border-radius:var(--radius-sm);margin-bottom:14px;font-size:.84rem">
              <span>Status: <strong>${DB.getLicenseStatus().isExpired ? '<span class="text-danger">Expired</span>' : '<span class="text-success">Active</span>'}</strong> (${DB.getLicenseStatus().daysLeft} days remaining)</span>
              <span class="mono" style="font-size:.78rem">ID: ${DB.getLicenseStatus().machineId}</span>
            </div>
            <button class="btn btn-primary btn-sm" onclick="App.openLicenseModal()"><span class="material-icons">key</span> Activate / Renew License</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3>Invoice Customization</h3></div>
          <div class="card-body">
            <div class="form-grid">
              <div class="form-group"><label>Sales Invoice Prefix</label><input id="s-invpfx" value="${b.invoicePrefix || 'SCS'}" maxlength="6"></div>
              <div class="form-group"><label>Purchase Bill Prefix</label><input id="s-billpfx" value="${b.billPrefix || 'SCS-PO'}" maxlength="6"></div>
              <div class="form-group"><label>Default Payment Terms (days)</label><input id="s-terms" type="number" value="${b.defaultPaymentTerms || 30}" min="0"></div>
              <div class="form-group form-full"><label>Terms &amp; Conditions (printed on invoice)</label><textarea id="s-tnc">${b.termsAndConditions || ''}</textarea></div>
            </div>
          </div>
        </div>
        <div class="settings-footer">
          <button class="btn btn-primary" onclick="App.saveSettings()"><span class="material-icons">save</span> Save All Settings</button>
        </div>
      </div>
    `;
  },

  _handleLogoUpload(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      this.toast('Logo file size must be under 1MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const biz = DB.getBiz();
      biz.logo = e.target.result;
      DB.setBiz(biz);
      this.toast('Logo uploaded! Click "Save All Settings" to confirm.', 'success');
      this.renderSettings(document.getElementById('page-content'));
    };
    reader.readAsDataURL(file);
  },

  _removeLogo() {
    const biz = DB.getBiz();
    biz.logo = '';
    DB.setBiz(biz);
    this.toast('Logo removed', 'info');
    this.renderSettings(document.getElementById('page-content'));
  },

  saveOwnerPin() {
    const pin = document.getElementById('s-owner-pin')?.value.trim();
    if (!pin) { this.toast('PIN cannot be empty', 'error'); return; }
    DB.setOwnerPin(pin);
    this.toast('Owner PIN updated successfully!');
  },

  saveSettings() {
    const stateEl = document.getElementById('s-state');
    const selectedState = INDIAN_STATES.find(s => s.code === stateEl.value);
    const limits = DB.getTrialLimits();
    const taglineEl = document.getElementById('s-tagline');

    const biz = {
      ...DB.getBiz(),
      name: document.getElementById('s-name').value.trim(),
      tagline: limits.canSetBranding && taglineEl ? taglineEl.value.trim() : (DB.getBiz().tagline || ''),
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

  renderHelp(container) {
    const biz = DB.getBiz();
    container.innerHTML = `
      <div class="page-header">
        <h2>Help &amp; Developer Support</h2>
        <p>Official technical support, software customizations, and developer assistance.</p>
      </div>

      <!-- Developer Support Banner -->
      <div class="card" style="margin-bottom:20px;border-left:4px solid hsl(271,78%,50%);background:linear-gradient(135deg, #ffffff 0%, hsl(271,78%,98%) 100%)">
        <div class="card-body" style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">
          <div style="width:60px;height:60px;border-radius:16px;background:hsl(271,78%,50%);color:#fff;display:flex;align-items:center;justify-content:center;font-size:32px;flex-shrink:0;box-shadow:0 4px 14px rgba(147,51,234,0.3)">
            <span class="material-icons" style="font-size:34px">support_agent</span>
          </div>
          <div style="flex:1;min-width:260px">
            <h3 style="margin-bottom:4px;color:hsl(271,78%,25%)">Software Developer Contact</h3>
            <div style="font-size:.9rem;color:var(--text-secondary);margin-bottom:8px">
              Created &amp; Maintained by <strong>Shraban Kumar Mahato</strong> (AndroPCSoft)
            </div>
            <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:.86rem">
              <span>📧 Email: <a href="mailto:shraban@andropcsoft.com?subject=ShopPulse%20Support%20Request" style="font-weight:700;color:hsl(271,78%,45%)">shraban@andropcsoft.com</a></span>
              <span>🌐 Website: <a href="https://andropcsoft.com" target="_blank" style="font-weight:700;color:hsl(271,78%,45%)">andropcsoft.com</a></span>
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <a href="mailto:shraban@andropcsoft.com?subject=ShopPulse%20Help%20Request%20-%20${encodeURIComponent(biz.name)}" class="btn btn-primary" style="background:hsl(271,78%,50%);border-color:hsl(271,78%,50%)">
              <span class="material-icons">mail</span> Email Shraban
            </a>
          </div>
        </div>
      </div>

      <!-- Who and How to Contact -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:24px">
        <div class="card">
          <div class="card-header"><h4 style="display:flex;align-items:center;gap:8px"><span class="material-icons" style="color:var(--primary);font-size:20px">storefront</span> Shop Owners &amp; Retailers</h4></div>
          <div class="card-body" style="font-size:.85rem;color:var(--text-secondary);line-height:1.6">
            <p><strong>Contact for:</strong></p>
            <ul style="padding-left:18px;margin-top:6px">
              <li>Setting up on new desktop PCs or laptops</li>
              <li>Thermal printer &amp; A4/A5 invoice layout customization</li>
              <li>Database backup recovery or PC migration</li>
              <li>GSTIN &amp; HSN rate setup for computer/CCTV goods</li>
            </ul>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h4 style="display:flex;align-items:center;gap:8px"><span class="material-icons" style="color:var(--success);font-size:20px">account_balance</span> Accountants &amp; Tax Consultants</h4></div>
          <div class="card-body" style="font-size:.85rem;color:var(--text-secondary);line-height:1.6">
            <p><strong>Contact for:</strong></p>
            <ul style="padding-left:18px;margin-top:6px">
              <li>Custom GSTR-1 / GSTR-3B Excel &amp; CSV export formats</li>
              <li>Tally XML or Busy accounting export integration</li>
              <li>ITC input tax credit verification &amp; P&amp;L audit reports</li>
            </ul>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h4 style="display:flex;align-items:center;gap:8px"><span class="material-icons" style="color:hsl(271,78%,50%);font-size:20px">cloud_sync</span> Multi-Shop SaaS &amp; Custom Features</h4></div>
          <div class="card-body" style="font-size:.85rem;color:var(--text-secondary);line-height:1.6">
            <p><strong>Contact for:</strong></p>
            <ul style="padding-left:18px;margin-top:6px">
              <li>Multi-branch inventory sync &amp; central warehouse</li>
              <li>Field technician mobile job card apps</li>
              <li>Cloud multi-tenant deployment for your business group</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Quick Self Help -->
      <div class="card">
        <div class="card-header"><h3><span class="material-icons" style="vertical-align:middle;font-size:20px">help</span> Frequently Asked Questions</h3></div>
        <div class="card-body" style="font-size:.86rem;line-height:1.6;color:var(--text-secondary)">
          <div style="margin-bottom:14px">
            <strong style="color:var(--text-primary);font-size:.9rem">Q: How do I backup my shop data?</strong>
            <p>Go to <strong>Settings &amp; Backup Hub</strong> and click <strong>"Download Backup (.json)"</strong>. Keep this file in a USB drive or Google Drive weekly.</p>
          </div>
          <div style="margin-bottom:14px">
            <strong style="color:var(--text-primary);font-size:.9rem">Q: How do I hide profit margins from billing staff?</strong>
            <p>Click the mode badge on the topbar and select <strong>"Lock to Staff Mode"</strong>. To switch back, enter your Owner PIN (Default: <code>1234</code>).</p>
          </div>
          <div>
            <strong style="color:var(--text-primary);font-size:.9rem">Q: How do I open the Developer Master Console?</strong>
            <p>Press <strong><code>Ctrl + Shift + D</code></strong> anywhere on your keyboard or triple-click the ShopPulse logo on top-left.</p>
          </div>
        </div>
      </div>
    `;
  },

  clearAll() {
    if (confirm('⚠️ Delete ALL ShopPulse data permanently?\n\nThis cannot be undone.')) {
      localStorage.clear();
      location.reload();
    }
  }
};

window.addEventListener('DOMContentLoaded', () => App.init());
