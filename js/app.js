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
      modeBadge = `<button class="btn btn-xs btn-secondary" onclick="App.toggleRoleModal()" title="Click to unlock Owner Mode" style="border-radius:20px;padding:3px 10px;font-size:.78rem"><span class="material-icons" style="font-size:13px;color:var(--text-secondary)">lock</span> Staff Mode ▾</button>`;
    } else if (role === 'developer') {
      modeBadge = `<button class="btn btn-xs" onclick="App.toggleRoleModal()" title="Click to switch to Owner or Staff Mode" style="border-radius:20px;padding:3px 10px;font-size:.78rem;background:hsl(271,78%,50%);color:#fff"><span class="material-icons" style="font-size:13px">terminal</span> Dev Mode ▾</button>`;
    } else {
      modeBadge = `<button class="btn btn-xs btn-secondary" onclick="App.toggleRoleModal()" title="Click to switch to Staff Mode" style="border-radius:20px;padding:3px 10px;font-size:.78rem;color:var(--primary);border-color:var(--primary-light)"><span class="material-icons" style="font-size:13px">admin_panel_settings</span> Owner Mode ▾</button>`;
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
        <div class="form-group" style="max-width:260px;margin:0 auto 12px">
          <input type="password" id="owner-pin-input" placeholder="Enter 4-digit PIN" maxlength="20" style="text-align:center;font-size:1.2rem;letter-spacing:.2em;font-weight:700" onkeyup="if(event.key==='Enter')App.unlockOwner()">
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0 10px;font-size:.78rem">
          <a href="javascript:void(0)" onclick="App.openForgotPinModal()" style="color:var(--primary);font-weight:600">🔑 Forgot PIN?</a>
          <a href="javascript:void(0)" onclick="App.closeModal();App.openDevConsole()" style="color:var(--text-secondary)">Developer Login</a>
        </div>
        `,
        `
        <button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="App.unlockOwner()"><span class="material-icons">lock_open</span> Unlock</button>
        `,
        'modal-sm'
      );
      setTimeout(() => document.getElementById('owner-pin-input')?.focus(), 200);
    } else if (currentRole === 'developer') {
      this.modal('Switch App Role',
        `
        <div style="text-align:center;padding:10px 0 16px">
          <div style="width:54px;height:54px;border-radius:50%;background:hsl(271,78%,90%);color:hsl(271,78%,50%);display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px">
            <span class="material-icons" style="font-size:28px">admin_panel_settings</span>
          </div>
          <h3>Select Active Role</h3>
          <p style="font-size:.85rem;color:var(--text-secondary)">Switch between Owner Mode (Normal Shop Operation) and Counter Staff Mode.</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:10px">
          <button class="btn btn-primary" style="justify-content:flex-start;padding:12px 16px" onclick="App.setRoleAndClose('owner')">
            <span class="material-icons" style="font-size:20px">admin_panel_settings</span>
            <div style="text-align:left;margin-left:8px">
              <div style="font-weight:700">👑 Switch to Owner Mode</div>
              <div style="font-size:.75rem;opacity:.85">Full control, P&amp;L reports, inventory, settings</div>
            </div>
          </button>
          <button class="btn btn-warning" style="justify-content:flex-start;padding:12px 16px" onclick="App.setRoleAndClose('staff')">
            <span class="material-icons" style="font-size:20px">lock</span>
            <div style="text-align:left;margin-left:8px">
              <div style="font-weight:700">🔒 Switch to Staff Mode</div>
              <div style="font-size:.75rem;opacity:.85">Restricted billing counter (hides purchase price &amp; P&amp;L)</div>
            </div>
          </button>
          <button class="btn btn-secondary" style="justify-content:flex-start;padding:10px 16px" onclick="App.closeModal();App.openDevConsole()">
            <span class="material-icons" style="font-size:20px">terminal</span>
            <div style="text-align:left;margin-left:8px">
              <div style="font-weight:600">Open Master Dev Console</div>
            </div>
          </button>
        </div>
        `,
        `
        <button class="btn btn-ghost" onclick="App.closeModal()">Close</button>
        `,
        'modal-sm'
      );
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

  setRoleAndClose(role) {
    DB.setRole(role);
    this.closeModal();
    this.buildSidebar();
    this.buildTopbar();
    this.toast(`Switched to ${role === 'owner' ? 'Owner' : 'Staff'} Mode! 👑`, 'success');
    this.route();
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

  openForgotPinModal() {
    const biz = DB.getBiz();
    const lic = DB.getLicense();
    this.modal('Owner PIN Assistance',
      `
      <div style="text-align:center;padding:10px 0 16px">
        <div style="width:54px;height:54px;border-radius:50%;background:hsl(0,80%,94%);color:var(--danger);display:inline-flex;align-items:center;justify-content:center;margin-bottom:10px">
          <span class="material-icons" style="font-size:28px">security</span>
        </div>
        <h3>Developer PIN Authorization</h3>
        <p style="font-size:.84rem;color:var(--text-secondary);max-width:340px;margin:0 auto">
          To prevent unauthorized counter staff access to profit/cost data, PIN resets require <strong>Developer Authorization</strong>.
        </p>
      </div>

      <div style="background:var(--bg);padding:10px 14px;border-radius:var(--radius-sm);font-size:.8rem;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="color:var(--text-secondary)">Shop Name:</span>
          <strong>${biz.name}</strong>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--text-secondary)">Machine ID:</span>
          <strong class="mono">${lic.machineId}</strong>
        </div>
      </div>

      <div class="form-group" style="margin-bottom:12px">
        <label>Developer Master Authorization Key <span class="required">*</span></label>
        <input id="recovery-verify-input" type="password" placeholder="Enter Developer Master Key" onkeyup="if(event.key==='Enter')App.recoverOwnerPin()">
      </div>
      `,
      `
      <button class="btn btn-ghost" onclick="App.toggleRoleModal()">Back</button>
      <button class="btn btn-primary" onclick="App.recoverOwnerPin()"><span class="material-icons">restart_alt</span> Unlock &amp; Reset PIN</button>
      <a href="mailto:shraban@andropcsoft.com?subject=${encodeURIComponent(`PIN Reset Request — ${biz.name}`)}&body=${encodeURIComponent(`Hi Shraban,\n\nI forgot my ShopPulse Owner PIN.\n\nShop Name: ${biz.name}\nMachine ID: ${lic.machineId}\n\nPlease help me unlock/reset my Owner PIN.\n\nThank you,\n${biz.name}`)}" class="btn btn-secondary"><span class="material-icons">mail</span> Contact Shraban</a>
      `,
      'modal-md'
    );
  },

  recoverOwnerPin() {
    const input = document.getElementById('recovery-verify-input')?.value.trim();
    if (!input) {
      this.toast('Please enter Developer Master Key', 'error');
      return;
    }

    if (DB.verifyDevKey(input)) {
      DB.setOwnerPin('1234');
      DB.setRole('owner');
      this.closeModal();
      this.buildSidebar();
      this.buildTopbar();
      this.toast('🎉 Developer authorization successful! PIN reset to 1234 & Owner Mode unlocked.', 'success');
      this.route('#settings');
    } else {
      this.toast('Invalid Developer Master Key. Access denied.', 'error');
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
        <h4 style="margin-bottom:10px;font-size:.9rem"><span class="material-icons" style="font-size:16px;vertical-align:middle">vpn_key</span> Method 1: Offline License Key (Activation / Renewal / Upgrade)</h4>
        <p style="font-size:.78rem;color:var(--text-secondary);margin-bottom:8px">Enter the cryptographic key sent to you via SMS, WhatsApp, or Email by Shraban to activate, renew, or upgrade to Lifetime.</p>
        <div class="form-grid" style="margin-bottom:10px">
          <div class="form-group form-full">
            <label>Your Registered Gmail Address <span class="required">*</span></label>
            <input id="lic-in-email" type="email" placeholder="e.g. yourshop@gmail.com" value="${lic.registeredEmail || biz.email || ''}">
          </div>
          <div class="form-group form-full">
            <label>License Activation / Upgrade Key <span class="required">*</span></label>
            <input id="lic-in-key" placeholder="e.g. SPS-1YR-XXXXXX-2027 or SPS-LIFE-XXXXXX-2099" style="font-family:monospace;letter-spacing:.08em;text-transform:uppercase" value="${lic.licenseKey || ''}">
          </div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="App.activateLicense()"><span class="material-icons">check_circle</span> Activate / Upgrade License</button>
      </div>

      <div class="card" style="padding:14px;border-left:4px solid #0f9d58;margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <div>
            <h4 style="font-size:.9rem;color:#0f9d58"><span class="material-icons" style="font-size:16px;vertical-align:middle">cloud_sync</span> Method 2: Online 1-Click Auto-Activation / Upgrade</h4>
            <p style="font-size:.78rem;color:var(--text-secondary);margin-top:2px">If you already paid via UPI/GPay, click below to sync and automatically apply your new license.</p>
          </div>
          <button class="btn btn-sm btn-secondary" onclick="App.checkOnlineActivation()"><span class="material-icons">sync</span> 🔄 Check Online Status</button>
        </div>
      </div>

      ${DB.getRole() === 'developer' ? `
      <!-- Developer Master Override & Switcher -->
      <div class="card" style="padding:14px;border:2px dashed hsl(271,78%,50%);background:hsl(271,100%,98%);margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h4 style="margin:0;color:hsl(271,78%,35%);font-size:.92rem;display:flex;align-items:center;gap:6px">
            <span class="material-icons" style="font-size:18px">admin_panel_settings</span> 🛠️ Developer Master Controls: Override License Key &amp; Plan
          </h4>
          <span class="badge" style="background:hsl(271,78%,50%);color:#fff">DEV MODE</span>
        </div>
        <p style="font-size:.78rem;color:hsl(271,50%,35%);margin-bottom:10px">As Developer, you can instantly change the license plan, key, or reset to trial for testing:</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
          <button class="btn btn-xs" style="background:hsl(271,78%,50%);color:#fff" onclick="App._devApplyCustomLicense('lifetime', 'shraban@andropcsoft.com', 'SPS-LIFE-NOVE6F-2099', '2099-12-31')"><span class="material-icons" style="font-size:12px">diamond</span> Set Lifetime</button>
          <button class="btn btn-xs btn-success" onclick="App._devApplyCustomLicense('annual', 'shraban@andropcsoft.com', 'SPS-1YR-6UABD9-2027', '2027-12-31')"><span class="material-icons" style="font-size:12px">verified</span> Set 1-Year Commercial</button>
          <button class="btn btn-xs btn-primary" onclick="App._devApplyCustomLicense('developer', 'shraban@andropcsoft.com', 'DEV-MASTER-ALL-ACCESS', '2099-12-31')"><span class="material-icons" style="font-size:12px">code</span> Set Dev Master</button>
          <button class="btn btn-xs btn-warning" onclick="App._devApplyCustomLicense('trial', '', 'TRIAL-EVAL-60D')"><span class="material-icons" style="font-size:12px">hourglass_top</span> Reset to 60-Day Trial</button>
        </div>
        <div class="form-grid-3" style="gap:8px;font-size:.8rem">
          <div class="form-group">
            <label style="font-size:.75rem">Plan Type</label>
            <select id="dev-ovr-plan" style="padding:4px 8px;font-size:.8rem">
              <option value="annual" ${lic.plan === 'annual' ? 'selected' : ''}>1-Year Commercial</option>
              <option value="lifetime" ${lic.plan === 'lifetime' ? 'selected' : ''}>Lifetime Unlimited</option>
              <option value="developer" ${lic.plan === 'developer' ? 'selected' : ''}>Developer Master</option>
              <option value="trial" ${lic.plan === 'trial' ? 'selected' : ''}>60-Day Trial</option>
            </select>
          </div>
          <div class="form-group">
            <label style="font-size:.75rem">Custom License Key</label>
            <input id="dev-ovr-key" value="${lic.licenseKey || ''}" placeholder="e.g. SPS-1YR-..." style="font-family:monospace;padding:4px 8px;font-size:.8rem">
          </div>
          <div class="form-group">
            <label style="font-size:.75rem">Expiry Date</label>
            <input id="dev-ovr-exp" type="date" value="${lic.expiryDate || '2027-12-31'}" style="padding:4px 8px;font-size:.8rem">
          </div>
        </div>
        <div style="margin-top:8px;text-align:right">
          <button class="btn btn-sm" style="background:hsl(271,78%,45%);color:#fff" onclick="App._devApplyCustomManual()"><span class="material-icons" style="font-size:14px">save</span> Save &amp; Force Apply License</button>
        </div>
      </div>
      ` : ''}

      <div style="text-align:center;font-size:.82rem;color:var(--text-secondary)">
        Need a license key? Contact developer <strong>Shraban Kumar Mahato</strong> at <a href="mailto:shraban@andropcsoft.com" style="color:var(--primary);font-weight:600">shraban@andropcsoft.com</a>
      </div>
      `,
      `
      <button class="btn btn-ghost" onclick="App.closeModal()">Close</button>
      <a href="https://wa.me/919800012345?text=${encodeURIComponent(`Hi Shraban,\n\nI would like to purchase a ShopPulse Commercial License for my shop: ${biz.name}\nMachine ID: ${lic.machineId}\nEmail: ${lic.registeredEmail || biz.email || ''}`)}" target="_blank" class="btn btn-success"><span class="material-icons">chat</span> 📲 WhatsApp Developer</a>
      <a href="mailto:shraban@andropcsoft.com?subject=${encodeURIComponent(`ShopPulse Commercial License Request — ${biz.name || 'My Shop'}`)}&body=${encodeURIComponent(`Hi Shraban,\n\nI would like to purchase / activate a ShopPulse Commercial License for my shop.\n\nMy Shop Details:\n• Shop Name: ${biz.name}\n• Registered Gmail: ${lic.registeredEmail || biz.email || ''}\n• Phone / WhatsApp: ${biz.phone || ''}\n• City & State: ${biz.city || ''}, ${biz.state || ''}\n• Machine Install ID: ${lic.machineId}\n• Plan Requested: 1-Year Commercial License (₹1,999) / Lifetime License (₹4,999)\n\nPlease share your UPI QR Code / Payment details and activation key.\n\nThank you,\n${biz.name}`)}" class="btn btn-primary"><span class="material-icons">mail</span> 📧 Email for Key</a>
      `,
      'modal-lg'
    );
  },

  async checkOnlineActivation() {
    this.toast('Connecting to server to check license status…', 'info');
    try {
      const res = await DB.syncRemoteLicense();
      if (res && res.command === 'ACTIVATED') {
        this.closeModal();
        this.buildTopbar();
        this.toast(`🎉 ${res.message || 'Commercial License Activated Online!'}`, 'success');
        this.route();
      } else if (res && res.command === 'BLOCK') {
        this.toast('⚠️ License is suspended by administrator.', 'error');
        this.route();
      } else if (res && res.success) {
        const lic = DB.getLicenseStatus();
        if (!lic.isTrial) {
          this.closeModal();
          this.buildTopbar();
          this.toast(`🎉 Active Commercial License detected (${lic.planName})!`, 'success');
          this.route();
        } else {
          this.toast('Server checked: Currently in Trial mode. Please send payment to activate.', 'info');
        }
      } else {
        this.toast('Could not verify online. Check your internet connection or use Method 1 (Offline Key).', 'warning');
      }
    } catch (e) {
      this.toast('Online check failed: ' + e.message, 'error');
    }
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

  /* ─── Developer Master Console & Security Gate ─── */
  openDevConsole() {
    this.requestDevAccess();
  },

  requestDevAccess() {
    if (sessionStorage.getItem('sp_dev_authenticated') === 'true') {
      this._showDevConsole();
      return;
    }
    this.modal('🔒 Developer Access Restricted',
      `
      <div style="text-align:center;padding:10px 0 16px">
        <div style="width:54px;height:54px;border-radius:50%;background:hsl(271,78%,90%);color:hsl(271,78%,50%);display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px">
          <span class="material-icons" style="font-size:28px">terminal</span>
        </div>
        <h3>Developer Authentication</h3>
        <p style="font-size:.84rem;color:var(--text-secondary)">This console is strictly restricted to software developer <strong>Shraban Kumar Mahato</strong>.</p>
      </div>
      <div class="form-group" style="max-width:260px;margin:0 auto 16px">
        <label style="text-align:center;display:block">Enter Developer Master Key</label>
        <input type="password" id="dev-auth-key" placeholder="••••••••••••" style="text-align:center;font-size:1.1rem;letter-spacing:.15em;font-weight:700" onkeyup="if(event.key==='Enter')App._verifyDevAccess()">
      </div>
      `,
      `
      <button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" style="background:hsl(271,78%,50%);border-color:hsl(271,78%,50%)" onclick="App._verifyDevAccess()"><span class="material-icons">lock_open</span> Authorize</button>
      `,
      'modal-sm'
    );
    setTimeout(() => document.getElementById('dev-auth-key')?.focus(), 200);
  },

  _verifyDevAccess() {
    const key = document.getElementById('dev-auth-key')?.value.trim();
    if (DB.verifyDevKey(key)) {
      sessionStorage.setItem('sp_dev_authenticated', 'true');
      DB.setRole('developer');
      this.closeModal();
      this.toast('Developer access granted! 🚀', 'success');
      this._showDevConsole();
    } else {
      this.toast('⛔ Access Denied: Invalid Developer Key!', 'error');
    }
  },

  _showDevConsole() {
    const biz = DB.getBiz();
    const sales = DB.getSales();
    const purchases = DB.getPurchases();
    const products = DB.getProducts();
    const customers = DB.getCustomers();
    const suppliers = DB.getSuppliers();
    const expenses = DB.getExpenses();
    const lic = DB.getLicenseStatus();

    const storageUsageKB = (JSON.stringify(localStorage).length / 1024).toFixed(2);

    const cfg = DB.getRemoteConfig();

    this.modal('🛠️ Developer Master Console & User Manager',
      `
      <div style="margin-bottom:14px;padding:12px 16px;background:hsl(271,78%,96%);border:1px solid hsl(271,60%,85%);border-radius:var(--radius);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:44px;height:44px;border-radius:12px;background:hsl(271,78%,50%);color:#fff;display:flex;align-items:center;justify-content:center">
            <span class="material-icons">admin_panel_settings</span>
          </div>
          <div>
            <div style="font-weight:700;color:hsl(271,78%,30%);font-size:1.05rem">ShopPulse — Developer Master Hub</div>
            <div style="font-size:.8rem;color:hsl(271,50%,40%)">Author &amp; Creator: <strong>Shraban Kumar Mahato</strong> (shraban@andropcsoft.com)</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-sm btn-primary" onclick="App.setRoleAndClose('owner')"><span class="material-icons">manage_accounts</span> 👑 Switch to Owner</button>
          <button class="btn btn-sm btn-warning" onclick="App.setRoleAndClose('staff')"><span class="material-icons">lock</span> 🔒 Staff Mode</button>
        </div>
      </div>

      <!-- Google Sheets Webhook & Telemetry Sync Hub -->
      <div class="card" style="padding:12px 14px;margin-bottom:14px;border-left:4px solid #0f9d58">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">
          <h4 style="margin:0;color:#0f9d58;display:flex;align-items:center;gap:6px">
            <span class="material-icons" style="font-size:18px">cloud_sync</span> Google Sheets License Hub &amp; Webhook
          </h4>
          <div style="display:flex;gap:6px">
            <button class="btn btn-xs btn-primary" onclick="App._devTestRemoteSync()"><span class="material-icons" style="font-size:14px">upload</span> Send Immediate Heartbeat</button>
            <button class="btn btn-xs btn-secondary" onclick="App._devFetchUsers()"><span class="material-icons" style="font-size:14px">refresh</span> Fetch Live Users</button>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <input id="dev-remote-url" value="${cfg.webhookUrl || ''}" placeholder="Paste Google Apps Script Web App URL (/exec)" style="font-family:monospace;font-size:.8rem;flex:1;background:#fff">
          <button class="btn btn-sm btn-secondary" onclick="App._devSaveRemoteUrl()"><span class="material-icons">save</span> Save URL</button>
        </div>
      </div>

      <!-- Active Users & Licenses Management Hub -->
      <div class="card" style="padding:0;margin-bottom:16px;overflow:hidden;border:1px solid var(--border)">
        <div style="background:#f8fafc;padding:8px 14px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <div style="display:flex;gap:6px">
            <button id="tab-btn-trials" class="btn btn-sm btn-primary" onclick="App._devSwitchTab('trials')">⏳ Trial Users &amp; Leads (<span id="dev-trial-count">...</span>)</button>
            <button id="tab-btn-licenses" class="btn btn-sm btn-ghost" onclick="App._devSwitchTab('licenses')">📋 Active Licenses (<span id="dev-lic-count">...</span>)</button>
            <button id="tab-btn-keygen" class="btn btn-sm btn-ghost" onclick="App._devSwitchTab('keygen')">🔑 Offline Key Generator</button>
            <button id="tab-btn-switcher" class="btn btn-sm btn-ghost" onclick="App._devSwitchTab('switcher')">⚙️ Change License Key</button>
          </div>
          <span style="font-size:.78rem;color:var(--text-secondary)">Live Cloud Synchronization</span>
        </div>

        <!-- 1. Trial Users Tab -->
        <div id="dev-tab-trials" style="padding:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
            <div style="font-size:.85rem;color:var(--text-secondary)">All evaluation shops running on 60-day trial. You can remotely activate or extend their license in 1 click:</div>
          </div>
          <div class="table-wrap" style="max-height:280px;overflow-y:auto">
            <table class="table" style="font-size:.82rem">
              <thead>
                <tr>
                  <th>Machine ID</th>
                  <th>Shop Name</th>
                  <th>Contact Email</th>
                  <th>Phone / City</th>
                  <th>Days Left</th>
                  <th>Invoices</th>
                  <th>Status</th>
                  <th style="text-align:right">Remote Actions</th>
                </tr>
              </thead>
              <tbody id="dev-trials-tbody">
                <tr><td colspan="8" style="text-align:center;padding:16px;color:var(--text-secondary)">Loading trial users from Google Sheets...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 2. Active Licenses Tab -->
        <div id="dev-tab-licenses" style="padding:14px;display:none">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
            <div style="font-size:.85rem;color:var(--text-secondary)">All registered commercial clients and authorized lifetime shops:</div>
          </div>
          <div class="table-wrap" style="max-height:280px;overflow-y:auto">
            <table class="table" style="font-size:.82rem">
              <thead>
                <tr>
                  <th>Machine ID</th>
                  <th>Shop Name</th>
                  <th>Registered Gmail</th>
                  <th>Phone / City</th>
                  <th>Plan</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th style="text-align:right">Remote Actions</th>
                </tr>
              </thead>
              <tbody id="dev-licenses-tbody">
                <tr><td colspan="8" style="text-align:center;padding:16px;color:var(--text-secondary)">Loading active licenses from Google Sheets...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 3. Keygen Tab -->
        <div id="dev-tab-keygen" style="padding:14px;display:none">
          <h4 style="margin-bottom:6px;color:hsl(271,78%,35%)"><span class="material-icons" style="font-size:18px;vertical-align:middle">key</span> Generate Cryptographic License Key</h4>
          <p style="font-size:.8rem;color:var(--text-secondary);margin-bottom:12px">Generate offline keys tied to customer Gmail addresses for immediate activation.</p>
          <div class="form-grid-3" style="margin-bottom:10px">
            <div class="form-group">
              <label>Customer Gmail</label>
              <input id="dev-lic-email" placeholder="customer@gmail.com" value="">
            </div>
            <div class="form-group">
              <label>Plan Type</label>
              <select id="dev-lic-plan">
                <option value="1YR">1-Year Annual Commercial (1YR)</option>
                <option value="LIFE">Lifetime Unlimited (LIFE)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Expiry Year</label>
              <input id="dev-lic-year" type="number" value="2027">
            </div>
          </div>
          <button class="btn btn-sm btn-primary" onclick="App._devGenerateKey()"><span class="material-icons">vpn_key</span> Generate License Key</button>

          <div id="dev-key-output" style="display:none;margin-top:12px;padding:10px;background:var(--bg);border-radius:var(--radius-sm)">
            <div style="font-size:.8rem;color:var(--text-secondary);margin-bottom:4px">Generated Key for <strong id="dev-out-email"></strong>:</div>
            <div style="display:flex;gap:8px;align-items:center">
              <input id="dev-out-key" readonly style="font-family:monospace;font-weight:700;letter-spacing:.08em;background:#fff">
              <button class="btn btn-sm btn-secondary" onclick="navigator.clipboard.writeText(document.getElementById('dev-out-key').value);App.toast('License key copied! 📋')">Copy Key</button>
              <button class="btn btn-sm btn-success" onclick="App._devCopyWhatsApp()"><span class="material-icons" style="font-size:14px">chat</span> Copy WhatsApp</button>
            </div>
          </div>
        </div>

        <!-- 4. License Switcher Tab -->
        <div id="dev-tab-switcher" style="padding:14px;display:none">
          <h4 style="margin-bottom:6px;color:hsl(271,78%,35%)"><span class="material-icons" style="font-size:18px;vertical-align:middle">vpn_key</span> Developer Machine License Controller &amp; Key Switcher</h4>
          <p style="font-size:.8rem;color:var(--text-secondary);margin-bottom:12px">Directly change or override the current machine's active license plan and cryptographic key:</p>
          
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
            <button class="btn btn-sm" style="background:hsl(271,78%,50%);color:#fff" onclick="DB.setCustomLicense('lifetime', 'shraban@andropcsoft.com', 'SPS-LIFE-NOVE6F-2099', '2099-12-31');App.toast('Set to Lifetime License! 💎');App._showDevConsole();App.buildTopbar();"><span class="material-icons" style="font-size:14px">diamond</span> Set Lifetime</button>
            <button class="btn btn-sm btn-success" onclick="DB.setCustomLicense('annual', 'shraban@andropcsoft.com', 'SPS-1YR-6UABD9-2027', '2027-12-31');App.toast('Set to 1-Year Annual! 📅');App._showDevConsole();App.buildTopbar();"><span class="material-icons" style="font-size:14px">verified</span> Set 1-Year Annual</button>
            <button class="btn btn-sm btn-primary" onclick="DB.setCustomLicense('developer', 'shraban@andropcsoft.com', 'DEV-MASTER-ALL-ACCESS', '2099-12-31');App.toast('Set to Developer Master! 🚀');App._showDevConsole();App.buildTopbar();"><span class="material-icons" style="font-size:14px">code</span> Set Dev Master</button>
            <button class="btn btn-sm btn-warning" onclick="DB.setCustomLicense('trial', '', 'TRIAL-EVAL-60D');App.toast('Reset to 60-Day Trial! ⏳');App._showDevConsole();App.buildTopbar();"><span class="material-icons" style="font-size:14px">hourglass_top</span> Reset to Trial</button>
          </div>

          <div class="form-grid-3" style="gap:8px;font-size:.84rem;background:var(--bg);padding:12px;border-radius:var(--radius-sm)">
            <div class="form-group">
              <label>Plan Type</label>
              <select id="dev-sw-plan">
                <option value="annual" ${lic.plan === 'annual' ? 'selected' : ''}>1-Year Commercial (Annual)</option>
                <option value="lifetime" ${lic.plan === 'lifetime' ? 'selected' : ''}>Lifetime Unlimited</option>
                <option value="developer" ${lic.plan === 'developer' ? 'selected' : ''}>Developer Master License</option>
                <option value="trial" ${lic.plan === 'trial' ? 'selected' : ''}>60-Day Evaluation Trial</option>
              </select>
            </div>
            <div class="form-group">
              <label>Custom License Key</label>
              <input id="dev-sw-key" value="${lic.licenseKey || ''}" placeholder="e.g. SPS-1YR-..." style="font-family:monospace">
            </div>
            <div class="form-group">
              <label>Expiry Date</label>
              <input id="dev-sw-exp" type="date" value="${lic.expiryDate || '2027-12-31'}">
            </div>
          </div>
          <div style="margin-top:10px;text-align:right">
            <button class="btn btn-sm btn-primary" onclick="
              const p = document.getElementById('dev-sw-plan').value;
              const k = document.getElementById('dev-sw-key').value;
              const e = document.getElementById('dev-sw-exp').value;
              DB.setCustomLicense(p, '', k, e);
              App.toast('License updated & saved! 🚀');
              App._showDevConsole();
              App.buildTopbar();
            "><span class="material-icons">save</span> Force Save License</button>
          </div>
        </div>
      </div>

      <!-- Quick Database Stats & Utilities -->
      <div class="kpi-grid" style="margin-bottom:14px">
        <div class="kpi-card kpi-primary">
          <div class="kpi-content">
            <div class="kpi-label">Local Storage Used</div>
            <div class="kpi-value">${storageUsageKB} KB</div>
            <div class="kpi-sub">Client browser cache</div>
          </div>
        </div>
        <div class="kpi-card kpi-success">
          <div class="kpi-content">
            <div class="kpi-label">Local Documents</div>
            <div class="kpi-value">${sales.length + purchases.length} Docs</div>
            <div class="kpi-sub">${sales.length} Invoices / ${purchases.length} POs</div>
          </div>
        </div>
        <div class="kpi-card kpi-warning">
          <div class="kpi-content">
            <div class="kpi-label">Local Catalog</div>
            <div class="kpi-value">${products.length + customers.length} Entities</div>
            <div class="kpi-sub">${products.length} Items / ${customers.length} Cust</div>
          </div>
        </div>
        <div class="kpi-card kpi-danger">
          <div class="kpi-content">
            <div class="kpi-label">Total Expenses</div>
            <div class="kpi-value">${expenses.length} Records</div>
            <div class="kpi-sub">${fmtCurrency(expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0))}</div>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
        <div class="card" style="padding:12px 14px">
          <h4 style="margin-bottom:6px"><span class="material-icons" style="font-size:16px;vertical-align:middle">cloud_sync</span> Database Backup &amp; Migration</h4>
          <div style="display:flex;gap:8px;margin-top:8px">
            <button class="btn btn-sm btn-primary" onclick="App.downloadBackup()"><span class="material-icons">download</span> Full Backup (.json)</button>
            <button class="btn btn-sm btn-secondary" onclick="App.triggerRestore()"><span class="material-icons">upload</span> Restore File</button>
          </div>
        </div>

        <div class="card" style="padding:12px 14px">
          <h4 style="margin-bottom:6px"><span class="material-icons" style="font-size:16px;vertical-align:middle">restart_alt</span> Client Setup &amp; Factory Reset</h4>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
            <button class="btn btn-sm btn-danger" onclick="if(confirm('Wipe all data and prepare fresh blank shop?')){DB.factoryReset(false);location.reload();}"><span class="material-icons">cleaning_services</span> Fresh Wipe</button>
            <button class="btn btn-sm btn-secondary" onclick="if(confirm('Reload demo dataset?')){DB.factoryReset(true);location.reload();}"><span class="material-icons">dataset</span> Reload Demo</button>
          </div>
        </div>
      </div>
      `,
      `
      <button class="btn btn-ghost" onclick="App.closeModal()">Close</button>
      <button class="btn btn-secondary" onclick="DB.setRole('developer');App.closeModal();App.buildTopbar();App.toast('Developer Mode Active 🚀')">Set Dev Mode</button>
      `,
      'modal-xl'
    );

    // Auto-fetch users upon opening console
    setTimeout(() => { this._devFetchUsers(); }, 50);
  },

  _devSwitchTab(tab) {
    const tabs = ['trials', 'licenses', 'keygen', 'switcher'];
    tabs.forEach(t => {
      const btn = document.getElementById(`tab-btn-${t}`);
      const content = document.getElementById(`dev-tab-${t}`);
      if (btn) {
        btn.className = (t === tab) ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-ghost';
      }
      if (content) {
        content.style.display = (t === tab) ? 'block' : 'none';
      }
    });
  },

  async _devFetchUsers() {
    const trialTbody = document.getElementById('dev-trials-tbody');
    const licTbody = document.getElementById('dev-licenses-tbody');
    const trialCountSpan = document.getElementById('dev-trial-count');
    const licCountSpan = document.getElementById('dev-lic-count');

    if (trialTbody) trialTbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:16px;color:var(--text-secondary)"><span class="material-icons" style="animation:spin 1s linear infinite;vertical-align:middle">sync</span> Fetching live trial users from Google Sheets...</td></tr>`;
    if (licTbody) licTbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:16px;color:var(--text-secondary)"><span class="material-icons" style="animation:spin 1s linear infinite;vertical-align:middle">sync</span> Fetching live commercial licenses from Google Sheets...</td></tr>`;

    const inputUrl = document.getElementById('dev-remote-url')?.value.trim();
    if (inputUrl) {
      const cfg = DB.getRemoteConfig();
      cfg.webhookUrl = inputUrl;
      DB.setRemoteConfig(cfg);
    }
    const res = await DB.fetchRemoteUsers();

    if (!res.success || !res.data) {
      const errMsg = res.error || 'Unable to connect to Google Sheets Webhook';
      if (trialTbody) trialTbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:16px;color:#dc2626">⚠️ ${errMsg}. Please verify Webhook URL.</td></tr>`;
      if (licTbody) licTbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:16px;color:#dc2626">⚠️ ${errMsg}. Please verify Webhook URL.</td></tr>`;
      if (trialCountSpan) trialCountSpan.textContent = '0';
      if (licCountSpan) licCountSpan.textContent = '0';
      return;
    }

    const trials = res.data.trials || [];
    const licenses = res.data.licenses || [];

    if (trialCountSpan) trialCountSpan.textContent = trials.length;
    if (licCountSpan) licCountSpan.textContent = licenses.length;

    // Render Trial Users
    if (trialTbody) {
      if (trials.length === 0) {
        trialTbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:16px;color:var(--text-secondary)">No trial users recorded in Google Sheets yet. Click "Send Immediate Heartbeat" to test.</td></tr>`;
      } else {
        trialTbody.innerHTML = trials.map(t => `
          <tr>
            <td><strong class="mono" style="font-size:.78rem">${t.machineId}</strong></td>
            <td><strong>${t.shopName || '—'}</strong></td>
            <td><a href="mailto:${t.email}" style="color:var(--primary)">${t.email}</a></td>
            <td>${t.phone || '—'}<br><span style="font-size:.75rem;color:var(--text-secondary)">${t.city || '—'}</span></td>
            <td><span class="badge ${parseInt(t.daysLeft) < 10 ? 'badge-danger' : 'badge-warning'}">${t.daysLeft}d left</span></td>
            <td>${t.salesCount || 0} bills</td>
            <td><span class="badge ${t.command === 'BLOCK' ? 'badge-danger' : 'badge-paid'}">${t.command || 'ALLOW'}</span></td>
            <td style="text-align:right;white-space:nowrap">
              <button class="btn btn-xs btn-primary" title="Remotely Activate 1-Year Commercial License" onclick="App._devSetRemoteCommand('${t.machineId}','ACTIVATE_1YR')"><span class="material-icons" style="font-size:12px">verified</span> 1-Yr</button>
              <button class="btn btn-xs btn-secondary" title="Remotely Activate Lifetime Unlimited License" onclick="App._devSetRemoteCommand('${t.machineId}','ACTIVATE_LIFE')"><span class="material-icons" style="font-size:12px">diamond</span> Life</button>
              <button class="btn btn-xs btn-ghost" title="Extend Trial by +30 Days" onclick="App._devSetRemoteCommand('${t.machineId}','EXTEND', 30)"><span class="material-icons" style="font-size:12px">more_time</span> +30d</button>
              ${t.command === 'BLOCK' ? `
                <button class="btn btn-xs btn-success" title="Unblock / Restore Access" onclick="App._devSetRemoteCommand('${t.machineId}','ALLOW')"><span class="material-icons" style="font-size:12px">lock_open</span></button>
              ` : `
                <button class="btn btn-xs btn-danger" title="Suspend / Block Shop Access" onclick="if(confirm('Remotely suspend access for ${t.shopName}?'))App._devSetRemoteCommand('${t.machineId}','BLOCK')"><span class="material-icons" style="font-size:12px">block</span></button>
              `}
            </td>
          </tr>
        `).join('');
      }
    }

    // Render Licensed Users
    if (licTbody) {
      if (licenses.length === 0) {
        licTbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:16px;color:var(--text-secondary)">No active commercial licenses logged yet.</td></tr>`;
      } else {
        licTbody.innerHTML = licenses.map(l => `
          <tr>
            <td><strong class="mono" style="font-size:.78rem">${l.machineId}</strong></td>
            <td><strong>${l.shopName || '—'}</strong></td>
            <td><a href="mailto:${l.email}" style="color:var(--primary)">${l.email}</a></td>
            <td>${l.phone || '—'}<br><span style="font-size:.75rem;color:var(--text-secondary)">${l.city || '—'}</span></td>
            <td><span class="badge badge-paid">${(l.plan || 'Commercial').toUpperCase()}</span></td>
            <td>${fmtDate(l.expiryDate) || l.expiryDate}</td>
            <td><span class="badge ${l.command === 'BLOCK' ? 'badge-danger' : 'badge-paid'}">${l.command === 'BLOCK' ? 'SUSPENDED' : 'ACTIVE'}</span></td>
            <td style="text-align:right;white-space:nowrap">
              ${l.command === 'BLOCK' ? `
                <button class="btn btn-xs btn-success" title="Reactivate Access" onclick="App._devSetRemoteCommand('${l.machineId}','ALLOW')"><span class="material-icons" style="font-size:12px">lock_open</span> Unblock</button>
              ` : `
                <button class="btn btn-xs btn-danger" title="Suspend License" onclick="if(confirm('Suspend license for ${l.shopName}?'))App._devSetRemoteCommand('${l.machineId}','BLOCK')"><span class="material-icons" style="font-size:12px">block</span> Block</button>
              `}
            </td>
          </tr>
        `).join('');
      }
    }
  },

  async _devSetRemoteCommand(machineId, command, extendDays = 0) {
    this.toast(`Applying command ${command} to Machine ID: ${machineId}…`, 'info');
    const res = await DB.setRemoteCommand(machineId, command, extendDays);
    if (res.success) {
      this.toast(`🎉 Command "${command}" successfully applied!`, 'success');
      this._devFetchUsers();
    } else {
      this.toast(`Failed to update command: ${res.error}`, 'error');
    }
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

  _toggleUrlVisibility() {
    const input = document.getElementById('dev-remote-url');
    const btn = document.getElementById('dev-url-toggle-btn');
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      if (btn) btn.innerHTML = '<span class="material-icons" style="font-size:14px;vertical-align:middle">visibility_off</span> Hide URL';
    } else {
      input.type = 'password';
      if (btn) btn.innerHTML = '<span class="material-icons" style="font-size:14px;vertical-align:middle">visibility</span> Show URL';
    }
  },


  _devApplyCustomLicense(plan, email, key, expiry) {
    const lic = DB.setCustomLicense(plan, email, key, expiry);
    this.toast(`🎉 License updated to ${lic.plan.toUpperCase()}! Key: ${lic.licenseKey}`, 'success');
    this.buildTopbar();
    this.openLicenseModal();
  },

  _devApplyCustomManual() {
    const plan = document.getElementById('dev-ovr-plan')?.value || 'annual';
    const key = document.getElementById('dev-ovr-key')?.value.trim() || '';
    const exp = document.getElementById('dev-ovr-exp')?.value || '';
    const lic = DB.setCustomLicense(plan, '', key, exp);
    this.toast(`🎉 License updated to ${lic.plan.toUpperCase()}! Key: ${lic.licenseKey}`, 'success');
    this.buildTopbar();
    this.openLicenseModal();
  },

  _devSaveRemoteUrl() {
    const url = document.getElementById('dev-remote-url')?.value.trim() || '';
    const cfg = DB.getRemoteConfig();
    cfg.webhookUrl = url;
    DB.setRemoteConfig(cfg);
    this.toast('Google Sheets Webhook URL saved! 🌐', 'success');
  },

  async _devTestRemoteSync() {
    const inputUrl = document.getElementById('dev-remote-url')?.value.trim();
    if (inputUrl) {
      const cfg = DB.getRemoteConfig();
      cfg.webhookUrl = inputUrl;
      DB.setRemoteConfig(cfg);
    }
    this.toast('Sending telemetry ping to Google Sheet…', 'info');
    const res = await DB.syncRemoteLicense();
    if (res.skipped) {
      this.toast('Please enter and save your Google Apps Script Webhook URL first.', 'warning');
    } else if (res.success) {
      this.toast('Ping received by Google Sheet! Response: ' + ((res.data && res.data.command) || 'OK'), 'success');
      this._devFetchUsers();
    } else {
      this.toast('Ping failed: ' + (res.error || 'Network error'), 'error');
    }
  },

  _devCopyGoogleScript() {
    const scriptCode = `// ═══════════════════════════════════════════════════════════════════════════
// ShopPulse Master Remote License Hub & Auto-Lead Manager
// Author: Shraban Kumar Mahato (AndroPCSoft - shraban@andropcsoft.com)
// Deploy: Deploy > New Deployment > Web App > Execute as: Me > Access: Anyone
// ═══════════════════════════════════════════════════════════════════════════

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  
  var data = {};
  if (e && e.postData && e.postData.contents) {
    try { data = JSON.parse(e.postData.contents); } catch (err) { data = e.parameter || {}; }
  } else if (e && e.parameter) {
    data = e.parameter;
  }

  // If no machineId provided, return health status
  if (!data || !data.machineId) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "online",
      message: "ShopPulse Webhook is Active! Waiting for shop data."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 1. First-time auto setup & styling
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Last Active", "Machine ID", "Shop Name", "Gmail", "Phone", 
      "City", "GSTIN", "Current Plan", "Days Left", "Invoices", "Version", 
      "Command (Control)", "WhatsApp Client", "Admin Notes"
    ]);
    sheet.getRange(1, 1, 1, 14)
      .setFontWeight("bold")
      .setBackground("#1a2332")
      .setFontColor("#ffffff")
      .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
  }

  var rows = sheet.getDataRange().getValues();
  var rowIndex = -1;
  var command = "ALLOW";
  var adminNotes = "";

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][1] == data.machineId) {
      rowIndex = i + 1;
      command = rows[i][11] || "ALLOW";
      adminNotes = rows[i][13] || "";
      break;
    }
  }

  var now = Utilities.formatDate(new Date(), "GMT+5:30", "dd-MMM-yyyy HH:mm");
  var cleanPhone = (data.phone || "").toString().replace(/\\D/g, "");
  if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;
  var waFormula = cleanPhone ? '=HYPERLINK("https://wa.me/' + cleanPhone + '", "📲 WhatsApp")' : "—";

  if (rowIndex > -1) {
    sheet.getRange(rowIndex, 1, 1, 11).setValues([[
      now, data.machineId, data.shopName, data.email, data.phone,
      data.city, data.gstin, data.plan, data.daysLeft, data.salesCount, data.version
    ]]);
    sheet.getRange(rowIndex, 13).setFormula(waFormula);
  } else {
    var newRow = [
      now, data.machineId, data.shopName, data.email, data.phone,
      data.city, data.gstin, data.plan, data.daysLeft, data.salesCount, data.version,
      "ALLOW", "", ""
    ];
    sheet.appendRow(newRow);
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 13).setFormula(waFormula);

    // Add Command Dropdown validation for easy 1-click control
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(["ALLOW", "ACTIVATE_1YR", "ACTIVATE_LIFE", "EXTEND_30D", "BLOCK"], true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange(lastRow, 12).setDataValidation(rule);
  }

  // Response commands sent back to ShopPulse client app
  var response = {
    status: "success",
    command: command,
    plan: command.indexOf("LIFE") > -1 ? "lifetime" : (command.indexOf("1YR") > -1 ? "annual" : data.plan),
    extendDays: command === "EXTEND_30D" ? 30 : 0,
    message: command === "BLOCK" ? "License suspended by developer. Please contact shraban@andropcsoft.com." : "Active"
  };

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
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
    const lic = DB.getLicenseStatus();
    const limits = DB.getTrialLimits();
    const snapshots = DB.getSnapshots();
    const stateOpts = INDIAN_STATES.map(s => `<option value="${s.code}" ${b.stateCode === s.code ? 'selected' : ''}>${s.name}</option>`).join('');
    container.innerHTML = `
      <div class="page-header">
        <h2>Business Settings &amp; Data Safety</h2>
        <p>Manage your GST profile, check subscription status, and backup your database.</p>
      </div>

      <!-- Unified Subscription & License Status Card -->
      <div class="card" style="margin-bottom:20px;border-left:4px solid ${lic.isTrial ? '#f59e0b' : (lic.isLifetime ? 'hsl(271,78%,50%)' : '#0f9d58')}">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
          <div>
            <h3 style="display:flex;align-items:center;gap:8px">
              <span class="material-icons" style="font-size:22px;color:${lic.isTrial ? '#f59e0b' : (lic.isLifetime ? 'hsl(271,78%,50%)' : '#0f9d58')}">${lic.isTrial ? 'hourglass_top' : (lic.isLifetime ? 'diamond' : 'verified')}</span>
              Subscription &amp; License Status
            </h3>
          </div>
          <span class="badge ${lic.isTrial ? (lic.isExpired ? 'badge-danger' : 'badge-warning') : 'badge-paid'}" style="font-size:.82rem;padding:4px 12px;font-weight:700">
            ${lic.planName.toUpperCase()} • ${lic.isExpired ? 'EXPIRED' : 'ACTIVE'}
          </span>
        </div>
        <div class="card-body">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;margin-bottom:14px">
            <div>
              <div style="font-size:.92rem;font-weight:700;margin-bottom:4px;color:var(--text-primary)">
                ${lic.isTrial ? '60-Day Free Evaluation Trial' : (lic.isLifetime ? 'Lifetime Unlimited Commercial License' : '1-Year Commercial License Active')}
              </div>
              <div style="font-size:.82rem;color:var(--text-secondary)">
                Registered to: <strong style="color:var(--text-primary)">${lic.registeredEmail || b.email || 'Not registered (Trial Active)'}</strong>
                ${lic.licenseKey ? ` • Key: <span class="mono" style="font-size:.78rem;color:var(--primary)">${lic.licenseKey}</span>` : ''}
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-sm btn-secondary" onclick="App.checkOnlineActivation()"><span class="material-icons">sync</span> 🔄 Check Online Status</button>
              <button class="btn btn-sm btn-primary" onclick="App.openLicenseModal()"><span class="material-icons">vpn_key</span> ${lic.isTrial ? 'Activate License' : 'View License Key'}</button>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--bg);border-radius:var(--radius-sm);font-size:.84rem;flex-wrap:wrap;gap:8px">
            <span>Status: <strong>${lic.isExpired ? '<span class="text-danger">Expired</span>' : '<span class="text-success">Active</span>'}</strong> (${lic.daysLeft} days remaining)</span>
            <span style="color:var(--text-secondary)">Machine ID: <strong class="mono" style="font-size:.78rem;color:var(--text-primary)">${lic.machineId}</strong></span>
          </div>
        </div>
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
              <div class="form-group"><label>Phone Number</label><input id="s-phone" value="${b.phone || ''}" placeholder="+91 98000 12345"></div>
              <div class="form-group"><label>WhatsApp Number (for customer chat)</label><input id="s-whatsapp" value="${b.whatsapp || b.phone || ''}" placeholder="+91 98000 12345"></div>
              <div class="form-group"><label>Email</label><input id="s-email" type="email" value="${b.email || ''}"></div>
              <div class="form-group"><label>Website</label><input id="s-web" value="${b.website || ''}"></div>
              <div class="form-group"><label>Authorized Signatory</label><input id="s-sign" value="${b.signatory || ''}"></div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Bank &amp; UPI Payment Details</h3></div>
          <div class="card-body">
            <div class="form-grid">
              <div class="form-group"><label>Bank Name</label><input id="s-bank" value="${b.bankName || ''}"></div>
              <div class="form-group"><label>Account Number</label><input id="s-acc" value="${b.bankAccount || ''}"></div>
              <div class="form-group"><label>IFSC Code</label><input id="s-ifsc" value="${b.bankIFSC || ''}"></div>
              <div class="form-group"><label>Branch</label><input id="s-branch" value="${b.bankBranch || ''}"></div>
              <div class="form-group form-full">
                <label>UPI ID / VPA <span style="font-weight:400;font-size:.78rem;color:var(--text-secondary)">(for Automatic Payment QR Code on Due Invoices)</span></label>
                <input id="s-upi" value="${b.upiId || ''}" placeholder="e.g. yourshop@okaxis, 9823001122@upi, syscare@icici">
                <div class="form-hint" style="font-size:.75rem;color:var(--text-secondary);margin-top:4px">
                  ⚡ <strong>Licensed Feature:</strong> A dynamic UPI QR Code will print on unpaid/due invoices so customers can scan with PhonePe, Google Pay, Paytm, or BHIM to pay instantly. Once marked Paid, the QR code is automatically hidden.
                </div>
              </div>
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

        <div class="card" style="border-left:4px solid #3b82f6">
          <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
            <h3><span class="material-icons" style="vertical-align:middle;font-size:20px;color:#3b82f6">lock</span> Owner Security PIN Management</h3>
            <span class="badge badge-info">Security</span>
          </div>
          <div class="card-body">
            <p style="font-size:.82rem;color:var(--text-secondary);margin-bottom:14px">
              Protect Owner features (Sales editing, Financial Reports, and Settings) from staff by configuring your 4-digit Owner PIN:
            </p>
            <div class="form-grid-3" style="gap:10px;margin-bottom:12px">
              <div class="form-group">
                <label>Current Owner PIN <span class="required">*</span></label>
                <input type="password" id="s-cur-pin" placeholder="Enter current PIN (default: 1234)" maxlength="10" autocomplete="off">
              </div>
              <div class="form-group">
                <label>New Owner PIN <span class="required">*</span></label>
                <input type="password" id="s-new-pin" placeholder="Enter new 4-digit PIN" maxlength="10" autocomplete="off">
              </div>
              <div class="form-group">
                <label>Confirm New PIN <span class="required">*</span></label>
                <input type="password" id="s-conf-pin" placeholder="Re-enter new PIN" maxlength="10" autocomplete="off">
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
              <button class="btn btn-sm btn-ghost" type="button" onclick="
                const p1 = document.getElementById('s-cur-pin');
                const p2 = document.getElementById('s-new-pin');
                const p3 = document.getElementById('s-conf-pin');
                const isPass = p1.type === 'password';
                p1.type = isPass ? 'text' : 'password';
                p2.type = isPass ? 'text' : 'password';
                p3.type = isPass ? 'text' : 'password';
                this.innerHTML = isPass ? '<span class=\"material-icons\" style=\"font-size:14px\">visibility_off</span> Hide PINs' : '<span class=\"material-icons\" style=\"font-size:14px\">visibility</span> Show PINs';
              "><span class="material-icons" style="font-size:14px">visibility</span> Show PINs</button>
              <button class="btn btn-primary" onclick="App.saveOwnerPin()"><span class="material-icons">lock_reset</span> Change Owner PIN</button>
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

        <div class="card" style="border-left:4px solid var(--primary)">
          <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <h3><span class="material-icons" style="vertical-align:middle;font-size:20px;color:var(--primary)">style</span> Bill &amp; Invoice Printing Formats</h3>
            <span class="badge ${lic.isTrial ? 'badge-warning' : 'badge-paid'}">${lic.isTrial ? '1 Format (Trial Default)' : '5 Formats Available 💎'}</span>
          </div>
          <div class="card-body">
            <div style="font-size:.85rem;color:var(--text-secondary);margin-bottom:14px">
              ${lic.isTrial ? `
              🔒 <strong>Trial Limitation:</strong> Free trial accounts use the standard <em>Classic GST Corporate</em> format. <strong>Commercial License</strong> unlocks Modern Minimalist, 3-Inch POS Receipt, Executive Dark, and your own Custom Template Designer.
              ` : `
              Select your shop's primary invoice design or build your own custom branded bill layout.
              `}
            </div>
            <div class="form-grid">
              <div class="form-group form-full">
                <label>Active Bill / Invoice Format</label>
                <select id="s-invfmt" onchange="App._onFormatSelectChange(this)" ${lic.isTrial || DB.getRole() === 'staff' ? 'disabled' : ''}>
                  <option value="classic" ${(b.invoiceFormat || 'classic') === 'classic' ? 'selected' : ''}>📄 Classic GST Corporate (Standard GST Grid - Default)</option>
                  <option value="modern" ${(b.invoiceFormat) === 'modern' ? 'selected' : ''}>💎 Modern Tech Minimalist (Clean Blue &amp; Borderless)</option>
                  <option value="compact_pos" ${(b.invoiceFormat) === 'compact_pos' ? 'selected' : ''}>💎 Compact 3-Inch POS Receipt (80mm Thermal Roll)</option>
                  <option value="executive" ${(b.invoiceFormat) === 'executive' ? 'selected' : ''}>💎 Executive Slate &amp; Gold (Luxury IT Projects)</option>
                  <option value="custom" ${(b.invoiceFormat) === 'custom' ? 'selected' : ''}>🛠️ Custom Template (Designed by Owner / Dev)</option>
                </select>
              </div>
            </div>

            <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">
              <button type="button" class="btn btn-sm btn-primary" onclick="App.previewBillFormat(document.getElementById('s-invfmt')?.value || 'classic')"><span class="material-icons">visibility</span> 👁️ Live Preview Format</button>
              ${!lic.isTrial && (DB.getRole() === 'owner' || DB.getRole() === 'developer') ? `
              <button type="button" class="btn btn-sm btn-secondary" onclick="App.openCustomTemplateModal()"><span class="material-icons">palette</span> 🎨 Design Custom Template</button>
              ` : ''}
              ${lic.isTrial ? `
              <button type="button" class="btn btn-warning btn-sm" onclick="App.openLicenseModal()"><span class="material-icons">vpn_key</span> Unlock All 5 Formats with License</button>
              ` : ''}
            </div>
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

  _onFormatSelectChange(sel) {
    const limits = DB.getTrialLimits();
    if (limits.isTrial && sel.value !== 'classic') {
      sel.value = 'classic';
      this.toast('💎 Multiple Bill Formats are exclusive to Licensed Users. Please activate your license to unlock.', 'warning');
      this.openLicenseModal();
      return;
    }
    if (DB.getRole() === 'staff') {
      this.toast('🔒 Only Owner or Developer can change bill formats.', 'error');
      return;
    }
    const biz = DB.getBiz();
    biz.invoiceFormat = sel.value;
    DB.setBiz(biz);
    this.toast(`Bill format changed to ${sel.options[sel.selectedIndex].text.split('(')[0].trim()}! 🎨`, 'success');
    this.previewBillFormat(sel.value);
  },

  previewBillFormat(format = 'classic') {
    const limits = DB.getTrialLimits();
    const formats = [
      { id: 'classic', name: 'Classic Corporate', icon: 'description' },
      { id: 'modern', name: 'Modern Minimalist', icon: 'diamond' },
      { id: 'compact_pos', name: '3-Inch POS Receipt', icon: 'receipt' },
      { id: 'executive', name: 'Executive Slate & Gold', icon: 'workspace_premium' },
      { id: 'custom', name: 'Custom Template', icon: 'palette' },
    ];

    const sampleDoc = Billing.getSampleDoc();
    const activeFmt = format || DB.getBillFormat() || 'classic';
    const htmlContent = Billing.generateDocHtml(sampleDoc, 'sales', activeFmt, true);

    const tabsHtml = formats.map(f => `
      <button type="button" class="btn btn-sm ${f.id === activeFmt ? 'btn-primary' : 'btn-ghost'}" onclick="App.previewBillFormat('${f.id}')" style="font-size:.8rem;padding:4px 10px">
        <span class="material-icons" style="font-size:14px;vertical-align:middle">${f.icon}</span> ${f.name}
      </button>
    `).join('');

    this.modal(`🎨 Live Bill Format Preview — ${formats.find(f => f.id === activeFmt)?.name || activeFmt}`,
      `
      <div style="margin-bottom:12px;padding:8px 12px;background:var(--bg);border-radius:var(--radius-sm);display:flex;gap:6px;flex-wrap:wrap;align-items:center;justify-content:space-between">
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${tabsHtml}
        </div>
        <span style="font-size:.78rem;color:var(--text-secondary)">⚡ Instant Live Render</span>
      </div>

      <div style="background:#475569;border-radius:8px;padding:14px;display:flex;justify-content:center;overflow:hidden;box-shadow:inset 0 2px 6px rgba(0,0,0,0.3)">
        <iframe id="bill-preview-frame" style="width:100%;max-width:${activeFmt === 'compact_pos' ? '340px' : '780px'};height:520px;border:none;background:#fff;border-radius:6px;box-shadow:0 10px 25px rgba(0,0,0,0.35)"></iframe>
      </div>
      `,
      `
      <button class="btn btn-ghost" onclick="App.closeModal()">Close</button>
      <button class="btn btn-secondary" onclick="Billing.printDoc('${sampleDoc.id}', 'sales', '${activeFmt}')"><span class="material-icons">print</span> Print Sample</button>
      ${!limits.isTrial ? `
      <button class="btn btn-primary" onclick="
        const biz = DB.getBiz();
        biz.invoiceFormat = '${activeFmt}';
        DB.setBiz(biz);
        App.toast('🎉 Set as Default Bill Format: ${formats.find(f => f.id === activeFmt)?.name}!', 'success');
        const sel = document.getElementById('s-invfmt');
        if (sel) sel.value = '${activeFmt}';
        App.closeModal();
      "><span class="material-icons">check_circle</span> Set as Default Format</button>
      ` : `
      <button class="btn btn-warning" onclick="App.openLicenseModal()"><span class="material-icons">vpn_key</span> Unlock Format</button>
      `}
      `,
      'modal-xl'
    );

    setTimeout(() => {
      const frame = document.getElementById('bill-preview-frame');
      if (frame && frame.contentWindow) {
        frame.contentWindow.document.open();
        frame.contentWindow.document.write(htmlContent);
        frame.contentWindow.document.close();
      }
    }, 50);
  },

  openCustomTemplateModal() {
    const limits = DB.getTrialLimits();
    if (limits.isTrial) {
      this.toast('💎 Custom Template Builder is exclusive to Licensed Users.', 'warning');
      this.openLicenseModal();
      return;
    }
    if (DB.getRole() === 'staff') {
      this.toast('🔒 Only Owner or Developer can access Custom Template Designer.', 'error');
      return;
    }

    const t = DB.getCustomTemplate();
    App.modal('🎨 Custom Bill Format Designer (Owner / Dev Only)',
      `
      <div class="form-grid">
        <div class="form-group">
          <label>Primary Theme Color</label>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="color" id="ct-primary" value="${t.primaryColor || '#1e293b'}" style="width:46px;height:38px;padding:2px;cursor:pointer;border-radius:4px;border:1px solid var(--border)">
            <input id="ct-primary-hex" value="${t.primaryColor || '#1e293b'}" placeholder="#1e293b" style="flex:1" onchange="document.getElementById('ct-primary').value = this.value">
          </div>
        </div>
        <div class="form-group">
          <label>Accent Color</label>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="color" id="ct-accent" value="${t.accentColor || '#0284c7'}" style="width:46px;height:38px;padding:2px;cursor:pointer;border-radius:4px;border:1px solid var(--border)">
            <input id="ct-accent-hex" value="${t.accentColor || '#0284c7'}" placeholder="#0284c7" style="flex:1" onchange="document.getElementById('ct-accent').value = this.value">
          </div>
        </div>
        <div class="form-group">
          <label>Font Family</label>
          <select id="ct-font">
            <option value="Arial, sans-serif" ${t.fontFamily.includes('Arial') ? 'selected' : ''}>Arial (Classic Clean)</option>
            <option value="'Segoe UI', Roboto, sans-serif" ${t.fontFamily.includes('Segoe') ? 'selected' : ''}>Segoe UI / Modern Sans</option>
            <option value="'Courier New', monospace" ${t.fontFamily.includes('Courier') ? 'selected' : ''}>Courier New (Technical / Monospace)</option>
            <option value="Georgia, serif" ${t.fontFamily.includes('Georgia') ? 'selected' : ''}>Georgia (Traditional Serif)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Logo Placement</label>
          <select id="ct-logo-pos">
            <option value="left" ${t.logoPos === 'left' ? 'selected' : ''}>Left-Aligned</option>
            <option value="center" ${t.logoPos === 'center' ? 'selected' : ''}>Center-Aligned</option>
            <option value="right" ${t.logoPos === 'right' ? 'selected' : ''}>Right-Aligned</option>
            <option value="none" ${t.logoPos === 'none' ? 'selected' : ''}>Hide Logo</option>
          </select>
        </div>
        <div class="form-group">
          <label>Header Title Bar Style</label>
          <select id="ct-header-style">
            <option value="solid" ${t.headerStyle === 'solid' ? 'selected' : ''}>Solid Full-Width Primary Color</option>
            <option value="minimal" ${t.headerStyle === 'minimal' ? 'selected' : ''}>Minimal Clean (Light Accent)</option>
            <option value="border" ${t.headerStyle === 'border' ? 'selected' : ''}>Left Accent Stripe Only</option>
          </select>
        </div>
        <div class="form-group">
          <label>Table Grid Outline</label>
          <select id="ct-border">
            <option value="true" ${t.showBorder ? 'selected' : ''}>Full Box Grid (GST Strict)</option>
            <option value="false" ${!t.showBorder ? 'selected' : ''}>Clean Borderless Zebra</option>
          </select>
        </div>
        <div class="form-group form-full">
          <label>Custom Thank You / Footer Slogan</label>
          <input id="ct-notes" value="${t.customNotes || ''}" placeholder="e.g. Thank you for choosing us for your IT &amp; CCTV infrastructure!">
        </div>
      </div>
      `,
      `
      <button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="App.saveCustomTemplate()"><span class="material-icons">save</span> Save &amp; Apply My Format</button>
      `,
      'modal-lg'
    );

    // Sync color inputs
    const pPicker = document.getElementById('ct-primary');
    const pHex = document.getElementById('ct-primary-hex');
    if (pPicker && pHex) pPicker.addEventListener('input', () => { pHex.value = pPicker.value; });

    const aPicker = document.getElementById('ct-accent');
    const aHex = document.getElementById('ct-accent-hex');
    if (aPicker && aHex) aPicker.addEventListener('input', () => { aHex.value = aPicker.value; });
  },

  saveCustomTemplate() {
    const templateData = {
      primaryColor: document.getElementById('ct-primary')?.value || '#1e293b',
      accentColor: document.getElementById('ct-accent')?.value || '#0284c7',
      fontFamily: document.getElementById('ct-font')?.value || 'Arial, sans-serif',
      logoPos: document.getElementById('ct-logo-pos')?.value || 'left',
      headerStyle: document.getElementById('ct-header-style')?.value || 'solid',
      showBorder: document.getElementById('ct-border')?.value === 'true',
      customNotes: document.getElementById('ct-notes')?.value?.trim() || '',
    };

    DB.saveCustomTemplate(templateData);
    DB.setBillFormat('custom');
    this.closeModal();
    this.toast('🎉 Custom Bill Format saved and activated as your default format!', 'success');
    this.renderSettings(document.getElementById('page-content'));
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
    const curPin = document.getElementById('s-cur-pin')?.value.trim();
    const newPin = document.getElementById('s-new-pin')?.value.trim();
    const confPin = document.getElementById('s-conf-pin')?.value.trim();

    if (!curPin) {
      this.toast('Please enter your Current Owner PIN', 'error');
      document.getElementById('s-cur-pin')?.focus();
      return;
    }

    if (!DB.verifyOwnerPin(curPin)) {
      this.toast('⛔ Incorrect Current PIN! Please enter your existing PIN.', 'error');
      document.getElementById('s-cur-pin')?.focus();
      return;
    }

    if (!newPin) {
      this.toast('Please enter your New Owner PIN (at least 4 digits)', 'error');
      document.getElementById('s-new-pin')?.focus();
      return;
    }

    if (newPin.length < 4) {
      this.toast('New PIN must be at least 4 digits!', 'warning');
      document.getElementById('s-new-pin')?.focus();
      return;
    }

    if (newPin !== confPin) {
      this.toast('⛔ Confirm PIN does not match New PIN! Please re-type.', 'error');
      document.getElementById('s-conf-pin')?.focus();
      return;
    }

    DB.setOwnerPin(newPin);
    
    // Clear input fields
    const p1 = document.getElementById('s-cur-pin');
    const p2 = document.getElementById('s-new-pin');
    const p3 = document.getElementById('s-conf-pin');
    if (p1) p1.value = '';
    if (p2) p2.value = '';
    if (p3) p3.value = '';

    this.toast('🎉 Owner PIN updated successfully! 🔒', 'success');
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
      whatsapp: document.getElementById('s-whatsapp')?.value.trim() || document.getElementById('s-phone')?.value.trim() || '',
      email: document.getElementById('s-email').value.trim(),
      website: document.getElementById('s-web').value.trim(),
      signatory: document.getElementById('s-sign').value.trim(),
      bankName: document.getElementById('s-bank').value.trim(),
      bankAccount: document.getElementById('s-acc').value.trim(),
      bankIFSC: document.getElementById('s-ifsc').value.trim(),
      bankBranch: document.getElementById('s-branch').value.trim(),
      upiId: document.getElementById('s-upi')?.value.trim() || '',
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
