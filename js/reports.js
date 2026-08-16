'use strict';

/* ─────────────────────────────────────────────
   Reports Module — P&L, GSTR-1, GSTR-3B
───────────────────────────────────────────── */
const Reports = {
  render(container) {
    const sales = DB.getSales();
    const purchases = DB.getPurchases();
    const expenses = DB.getExpenses();

    // Date filter helpers
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Last 30 days
    const past30 = new Date(now - 30 * 86400000);

    const mSales = sales.filter(s => new Date(s.date) >= currentMonthStart);
    const mPurchases = purchases.filter(p => new Date(p.date) >= currentMonthStart);
    const mExpensesList = expenses.filter(e => new Date(e.date) >= currentMonthStart);
    const pmSales = sales.filter(s => { const d = new Date(s.date); return d >= prevMonthStart && d <= prevMonthEnd; });

    const mRevenue = mSales.filter(s => s.status === 'paid').reduce((s, i) => s + i.total, 0);
    const pmRevenue = pmSales.filter(s => s.status === 'paid').reduce((s, i) => s + i.total, 0);
    const mPurchaseAmt = mPurchases.filter(p => p.status === 'paid').reduce((s, b) => s + b.total, 0);
    const mExpenseAmt = mExpensesList.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const mProfit = mRevenue - mPurchaseAmt - mExpenseAmt;
    const mOutputTax = mSales.reduce((s, i) => s + (i.totalTax || 0), 0);
    const mInputTax = mPurchases.reduce((s, b) => s + (b.totalTax || 0), 0);
    const mExpenseItc = mExpensesList.filter(e => e.isItc).reduce((s, e) => s + (parseFloat(e.gstAmt) || 0), 0);
    const mNetTax = mOutputTax - (mInputTax + mExpenseItc);

    const revenueChange = pmRevenue > 0 ? ((mRevenue - pmRevenue) / pmRevenue * 100).toFixed(1) : '—';

    // Monthly breakdown (6 months)
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const m = d.getMonth(), y = d.getFullYear();
      const label = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      const revenue = sales.filter(s => { const sd = new Date(s.date); return sd.getMonth() === m && sd.getFullYear() === y && s.status === 'paid'; }).reduce((s, x) => s + x.total, 0);
      const purchase = purchases.filter(p => { const pd = new Date(p.date); return pd.getMonth() === m && pd.getFullYear() === y && p.status === 'paid'; }).reduce((s, x) => s + x.total, 0);
      const exp = expenses.filter(e => { const ed = new Date(e.date); return ed.getMonth() === m && ed.getFullYear() === y; }).reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
      const outputTax = sales.filter(s => { const sd = new Date(s.date); return sd.getMonth() === m && sd.getFullYear() === y; }).reduce((s, x) => s + (x.totalTax || 0), 0);
      const inputTax = purchases.filter(p => { const pd = new Date(p.date); return pd.getMonth() === m && pd.getFullYear() === y; }).reduce((s, x) => s + (x.totalTax || 0), 0);
      const expItc = expenses.filter(e => { const ed = new Date(e.date); return ed.getMonth() === m && ed.getFullYear() === y && e.isItc; }).reduce((s, x) => s + (parseFloat(x.gstAmt) || 0), 0);
      const totalItc = inputTax + expItc;
      return { label, revenue, purchase, expense: exp, profit: revenue - purchase - exp, outputTax, inputTax: totalItc, netTax: outputTax - totalItc };
    });

    // Top customers
    const custMap = {};
    sales.filter(s => s.status === 'paid').forEach(s => {
      if (!custMap[s.customerId]) custMap[s.customerId] = { name: s.customerName, revenue: 0, invoices: 0 };
      custMap[s.customerId].revenue += s.total;
      custMap[s.customerId].invoices++;
    });
    const topCustomers = Object.values(custMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Top products
    const prodMap = {};
    sales.forEach(s => (s.items || []).forEach(item => {
      if (!prodMap[item.name]) prodMap[item.name] = { name: item.name, hsn: item.hsn, revenue: 0, qty: 0 };
      prodMap[item.name].revenue += item.totalAmt || 0;
      prodMap[item.name].qty += item.qty || 0;
    }));
    const topProducts = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    container.innerHTML = `
      <div class="page-header-row"><h2>Reports & Analytics</h2>
        <div class="actions">
          <button class="btn btn-secondary" onclick="Reports.exportCSV()"><span class="material-icons">download</span> Export CSV</button>
        </div>
      </div>

      <!-- KPI Row -->
      <div class="kpi-grid" style="margin-bottom:20px">
        <div class="kpi-card kpi-primary">
          <div class="kpi-icon"><span class="material-icons">trending_up</span></div>
          <div class="kpi-content">
            <div class="kpi-label">This Month Revenue</div>
            <div class="kpi-value">${fmtCurrency(mRevenue)}</div>
            <div class="kpi-sub">${revenueChange !== '—' ? (parseFloat(revenueChange) >= 0 ? '▲' : '▼') + ' ' + Math.abs(revenueChange) + '% vs last month' : 'No prev. data'}</div>
          </div>
        </div>
        <div class="kpi-card kpi-warning">
          <div class="kpi-icon"><span class="material-icons">shopping_bag</span></div>
          <div class="kpi-content">
            <div class="kpi-label">Purchases &amp; Expenses</div>
            <div class="kpi-value">${fmtCurrency(mPurchaseAmt + mExpenseAmt)}</div>
            <div class="kpi-sub">Cost: ${fmtCurrency(mPurchaseAmt)} | Opex: ${fmtCurrency(mExpenseAmt)}</div>
          </div>
        </div>
        <div class="kpi-card ${mProfit >= 0 ? 'kpi-success' : 'kpi-danger'}">
          <div class="kpi-icon"><span class="material-icons">account_balance</span></div>
          <div class="kpi-content">
            <div class="kpi-label">Net Operating Profit</div>
            <div class="kpi-value">${fmtCurrency(mProfit)}</div>
            <div class="kpi-sub">Net Margin: ${mRevenue > 0 ? (mProfit / mRevenue * 100).toFixed(1) + '%' : '—'}</div>
          </div>
        </div>
        <div class="kpi-card ${mNetTax >= 0 ? 'kpi-danger' : 'kpi-success'}">
          <div class="kpi-icon"><span class="material-icons">receipt</span></div>
          <div class="kpi-content">
            <div class="kpi-label">Net GST Payable</div>
            <div class="kpi-value">${fmtCurrency(Math.abs(mNetTax))}</div>
            <div class="kpi-sub">${mNetTax >= 0 ? 'Tax to pay' : 'Input credit'}${mExpenseItc > 0 ? ` (incl. ${fmtCurrency(mExpenseItc)} Exp ITC)` : ''}</div>
          </div>
        </div>
      </div>

      <!-- Monthly Breakdown -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><h3>Monthly Summary (Last 6 Months)</h3></div>
        <div class="card-body p-0">
          <table class="table">
            <thead>
              <tr>
                <th>Month</th>
                <th class="text-right">Revenue</th>
                <th class="text-right">Purchases</th>
                <th class="text-right">Expenses</th>
                <th class="text-right">Net Profit</th>
                <th class="text-right">Output GST</th>
                <th class="text-right">Input ITC</th>
                <th class="text-right">Net GST</th>
              </tr>
            </thead>
            <tbody>
              ${months.map(m => `
                <tr>
                  <td><strong>${m.label}</strong></td>
                  <td class="text-right text-success font-bold">${fmtCurrency(m.revenue)}</td>
                  <td class="text-right">${fmtCurrency(m.purchase)}</td>
                  <td class="text-right text-danger">${fmtCurrency(m.expense)}</td>
                  <td class="text-right ${m.profit >= 0 ? 'text-success' : 'text-danger'} font-bold">${fmtCurrency(m.profit)}</td>
                  <td class="text-right text-danger">${fmtCurrency(m.outputTax)}</td>
                  <td class="text-right text-success">${fmtCurrency(m.inputTax)}</td>
                  <td class="text-right ${m.netTax >= 0 ? 'text-danger' : 'text-success'} font-bold">${fmtCurrency(m.netTax)}</td>
                </tr>`).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td><strong>Total</strong></td>
                <td class="text-right font-bold text-success">${fmtCurrency(months.reduce((s, m) => s + m.revenue, 0))}</td>
                <td class="text-right font-bold">${fmtCurrency(months.reduce((s, m) => s + m.purchase, 0))}</td>
                <td class="text-right font-bold text-danger">${fmtCurrency(months.reduce((s, m) => s + m.expense, 0))}</td>
                <td class="text-right font-bold">${fmtCurrency(months.reduce((s, m) => s + m.profit, 0))}</td>
                <td class="text-right font-bold">${fmtCurrency(months.reduce((s, m) => s + m.outputTax, 0))}</td>
                <td class="text-right font-bold">${fmtCurrency(months.reduce((s, m) => s + m.inputTax, 0))}</td>
                <td class="text-right font-bold">${fmtCurrency(months.reduce((s, m) => s + m.netTax, 0))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <!-- Top Customers -->
        <div class="card">
          <div class="card-header"><h3>Top Customers by Revenue</h3></div>
          <div class="card-body p-0">
            <table class="table">
              <thead><tr><th>Customer</th><th class="text-right">Invoices</th><th class="text-right">Revenue</th></tr></thead>
              <tbody>
                ${topCustomers.map(c => `
                  <tr>
                    <td>${c.name}</td>
                    <td class="text-right">${c.invoices}</td>
                    <td class="text-right font-bold text-success">${fmtCurrency(c.revenue)}</td>
                  </tr>`).join('') || '<tr><td colspan="3" class="text-muted text-center" style="padding:20px">No paid sales yet</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Top Products -->
        <div class="card">
          <div class="card-header"><h3>Top Products by Revenue</h3></div>
          <div class="card-body p-0">
            <table class="table">
              <thead><tr><th>Product</th><th>HSN</th><th class="text-right">Qty Sold</th><th class="text-right">Revenue</th></tr></thead>
              <tbody>
                ${topProducts.slice(0, 5).map(p => `
                  <tr>
                    <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.name}</td>
                    <td><span class="mono">${p.hsn || '—'}</span></td>
                    <td class="text-right">${p.qty}</td>
                    <td class="text-right font-bold text-success">${fmtCurrency(p.revenue)}</td>
                  </tr>`).join('') || '<tr><td colspan="4" class="text-muted text-center" style="padding:20px">No sales yet</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  /* ═══════════════════════════════════════════
     GST RETURNS
  ═══════════════════════════════════════════ */
  renderGST(container) {
    const sales = DB.getSales();
    const purchases = DB.getPurchases();
    const biz = DB.getBiz();
    const now = new Date();
    const fy = getFY();

    // Month picker
    const months = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
      });
    }

    let selectedMonth = months[0].value;

    const renderGSTR = () => {
      const [year, month] = selectedMonth.split('-').map(Number);
      const filterDocs = (docs) => docs.filter(d => {
        const dd = new Date(d.date);
        return dd.getFullYear() === year && dd.getMonth() + 1 === month;
      });

      const mSales = filterDocs(sales);
      const mPurchases = filterDocs(purchases);

      // GSTR-1: B2B (registered buyers)
      const b2b = mSales.filter(s => s.customerGstin);
      // GSTR-1: B2C (unregistered)
      const b2c = mSales.filter(s => !s.customerGstin);
      // Large B2C (inter-state, value > 2.5L)
      const b2cLarge = b2c.filter(s => !s.isIntra && s.total > 250000);
      const b2cSmall = b2c.filter(s => s.isIntra || s.total <= 250000);

      const totalOutputTax = mSales.reduce((s, i) => s + (i.totalTax || 0), 0);
      const totalOutputCgst = mSales.reduce((s, i) => s + (i.totalCgst || 0), 0);
      const totalOutputSgst = mSales.reduce((s, i) => s + (i.totalSgst || 0), 0);
      const totalOutputIgst = mSales.reduce((s, i) => s + (i.totalIgst || 0), 0);
      const totalInputTax = mPurchases.reduce((s, b) => s + (b.totalTax || 0), 0);
      const totalInputCgst = mPurchases.reduce((s, b) => s + (b.totalCgst || 0), 0);
      const totalInputSgst = mPurchases.reduce((s, b) => s + (b.totalSgst || 0), 0);
      const totalInputIgst = mPurchases.reduce((s, b) => s + (b.totalIgst || 0), 0);
      const netTax = totalOutputTax - totalInputTax;
      const totalTaxableOutput = mSales.reduce((s, i) => s + (i.subtotal || 0), 0);

      // HSN Summary
      const hsnMap = {};
      mSales.forEach(s => (s.items || []).forEach(item => {
        const k = item.hsn || 'MISC';
        if (!hsnMap[k]) hsnMap[k] = { hsn: k, desc: item.name, unit: item.unit, qty: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0 };
        hsnMap[k].qty += item.qty || 0;
        hsnMap[k].taxable += item.taxableValue || 0;
        hsnMap[k].igst += item.igstAmt || 0;
        hsnMap[k].cgst += item.cgstAmt || 0;
        hsnMap[k].sgst += item.sgstAmt || 0;
      }));
      const hsnSummary = Object.values(hsnMap);

      container.querySelector('#gst-content').innerHTML = `
        <!-- GSTR-3B Summary -->
        <div class="gstr-section">
          <div class="gstr-header-box">
            <span><span class="material-icons" style="vertical-align:middle;margin-right:6px;font-size:18px">summarize</span>GSTR-3B Summary — ${months.find(m => m.value === selectedMonth)?.label}</span>
            <button class="btn btn-sm" style="background:rgba(255,255,255,.15);color:#fff;border-color:rgba(255,255,255,.2)" onclick="Reports.printGSTR3B('${selectedMonth}')"><span class="material-icons" style="font-size:15px">print</span> Print</button>
          </div>
          <div style="padding:16px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">
            <div class="card" style="border:1px solid var(--border)">
              <div class="card-body">
                <div class="invoice-section-title">3.1 Outward Taxable Supplies</div>
                <div class="stat-row"><span class="stat-label">Total Taxable Value</span><span class="stat-value">${fmtCurrency(totalTaxableOutput)}</span></div>
                <div class="stat-row"><span class="stat-label">Output CGST</span><span class="stat-value text-danger">${fmtCurrency(totalOutputCgst)}</span></div>
                <div class="stat-row"><span class="stat-label">Output SGST</span><span class="stat-value text-danger">${fmtCurrency(totalOutputSgst)}</span></div>
                <div class="stat-row"><span class="stat-label">Output IGST</span><span class="stat-value text-danger">${fmtCurrency(totalOutputIgst)}</span></div>
                <div class="stat-row" style="border-top:2px solid var(--border);margin-top:4px;padding-top:8px"><span class="stat-label font-bold">Total Output Tax</span><span class="stat-value text-danger font-bold">${fmtCurrency(totalOutputTax)}</span></div>
              </div>
            </div>
            <div class="card" style="border:1px solid var(--border)">
              <div class="card-body">
                <div class="invoice-section-title">4. Input Tax Credit (ITC)</div>
                <div class="stat-row"><span class="stat-label">ITC CGST</span><span class="stat-value text-success">${fmtCurrency(totalInputCgst)}</span></div>
                <div class="stat-row"><span class="stat-label">ITC SGST</span><span class="stat-value text-success">${fmtCurrency(totalInputSgst)}</span></div>
                <div class="stat-row"><span class="stat-label">ITC IGST</span><span class="stat-value text-success">${fmtCurrency(totalInputIgst)}</span></div>
                <div class="stat-row" style="border-top:2px solid var(--border);margin-top:4px;padding-top:8px"><span class="stat-label font-bold">Total ITC</span><span class="stat-value text-success font-bold">${fmtCurrency(totalInputTax)}</span></div>
              </div>
            </div>
            <div class="card" style="border:1px solid ${netTax > 0 ? 'var(--danger)' : 'var(--success)'}">
              <div class="card-body">
                <div class="invoice-section-title">6. Net Tax Payable</div>
                <div class="stat-row"><span class="stat-label">CGST Payable</span><span class="stat-value ${totalOutputCgst - totalInputCgst > 0 ? 'text-danger' : 'text-success'}">${fmtCurrency(totalOutputCgst - totalInputCgst)}</span></div>
                <div class="stat-row"><span class="stat-label">SGST Payable</span><span class="stat-value ${totalOutputSgst - totalInputSgst > 0 ? 'text-danger' : 'text-success'}">${fmtCurrency(totalOutputSgst - totalInputSgst)}</span></div>
                <div class="stat-row"><span class="stat-label">IGST Payable</span><span class="stat-value ${totalOutputIgst - totalInputIgst > 0 ? 'text-danger' : 'text-success'}">${fmtCurrency(totalOutputIgst - totalInputIgst)}</span></div>
                <div class="stat-row" style="border-top:2px solid var(--border);margin-top:4px;padding-top:8px">
                  <span class="stat-label font-bold">Net Payable</span>
                  <span class="stat-value ${netTax > 0 ? 'text-danger' : 'text-success'} font-bold" style="font-size:1.05rem">${fmtCurrency(Math.abs(netTax))} ${netTax > 0 ? '(Pay)' : '(Credit)'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- GSTR-1: B2B -->
        <div class="gstr-section">
          <div class="gstr-header-box">
            <span><span class="material-icons" style="vertical-align:middle;margin-right:6px;font-size:18px">receipt_long</span>GSTR-1: B2B Invoices (Registered Buyers) — ${b2b.length} records</span>
            <button class="btn btn-sm" style="background:rgba(255,255,255,.15);color:#fff;border-color:rgba(255,255,255,.2)" onclick="Reports.exportGSTR1B2B('${selectedMonth}')"><span class="material-icons" style="font-size:15px">download</span> CSV</button>
          </div>
          ${b2b.length ? `
          <table class="gstr-table">
            <thead>
              <tr>
                <th>GSTIN of Buyer</th>
                <th>Invoice No.</th>
                <th>Invoice Date</th>
                <th class="text-right">Invoice Value</th>
                <th>Place of Supply</th>
                <th>RC</th>
                <th class="text-right">Taxable Value</th>
                <th class="text-right">IGST</th>
                <th class="text-right">CGST</th>
                <th class="text-right">SGST</th>
              </tr>
            </thead>
            <tbody>
              ${b2b.map(s => {
        const pos = INDIAN_STATES.find(st => st.code === s.placeOfSupply);
        return `<tr>
                  <td><span class="mono">${s.customerGstin}</span></td>
                  <td><span class="mono">${s.invoiceNo}</span></td>
                  <td>${fmtDate(s.date)}</td>
                  <td class="text-right">${fmtCurrency(s.total)}</td>
                  <td>${pos?.name || s.placeOfSupply}</td>
                  <td>${s.reverseCharge ? 'Y' : 'N'}</td>
                  <td class="text-right">${fmtCurrency(s.subtotal)}</td>
                  <td class="text-right">${fmtCurrency(s.totalIgst || 0)}</td>
                  <td class="text-right">${fmtCurrency(s.totalCgst || 0)}</td>
                  <td class="text-right">${fmtCurrency(s.totalSgst || 0)}</td>
                </tr>`;
      }).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="6" style="text-align:right;font-weight:700">Total</td>
                <td class="text-right">${fmtCurrency(b2b.reduce((s, i) => s + i.subtotal, 0))}</td>
                <td class="text-right">${fmtCurrency(b2b.reduce((s, i) => s + (i.totalIgst || 0), 0))}</td>
                <td class="text-right">${fmtCurrency(b2b.reduce((s, i) => s + (i.totalCgst || 0), 0))}</td>
                <td class="text-right">${fmtCurrency(b2b.reduce((s, i) => s + (i.totalSgst || 0), 0))}</td>
              </tr>
            </tfoot>
          </table>` : '<div class="empty-state" style="padding:20px"><span class="material-icons">receipt</span><p>No B2B transactions this month</p></div>'}
        </div>

        <!-- GSTR-1: B2C -->
        <div class="gstr-section">
          <div class="gstr-header-box">
            <span><span class="material-icons" style="vertical-align:middle;margin-right:6px;font-size:18px">person</span>GSTR-1: B2C Invoices (Unregistered Buyers) — ${b2c.length} records</span>
          </div>
          ${b2c.length ? `
          <table class="gstr-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Invoice No.</th>
                <th>Customer</th>
                <th>Invoice Date</th>
                <th class="text-right">Invoice Value</th>
                <th>Place of Supply</th>
                <th class="text-right">Taxable Value</th>
                <th class="text-right">IGST</th>
                <th class="text-right">CGST</th>
                <th class="text-right">SGST</th>
              </tr>
            </thead>
            <tbody>
              ${b2c.map(s => {
        const pos = INDIAN_STATES.find(st => st.code === s.placeOfSupply);
        const type = s.total > 250000 && !s.isIntra ? 'B2CL' : 'B2CS';
        return `<tr>
                  <td><span class="badge badge-${type === 'B2CL' ? 'warning' : 'secondary'}">${type}</span></td>
                  <td><span class="mono">${s.invoiceNo}</span></td>
                  <td>${s.customerName}</td>
                  <td>${fmtDate(s.date)}</td>
                  <td class="text-right">${fmtCurrency(s.total)}</td>
                  <td>${pos?.name || s.placeOfSupply}</td>
                  <td class="text-right">${fmtCurrency(s.subtotal)}</td>
                  <td class="text-right">${fmtCurrency(s.totalIgst || 0)}</td>
                  <td class="text-right">${fmtCurrency(s.totalCgst || 0)}</td>
                  <td class="text-right">${fmtCurrency(s.totalSgst || 0)}</td>
                </tr>`;
      }).join('')}
            </tbody>
          </table>` : '<div class="empty-state" style="padding:20px"><span class="material-icons">receipt</span><p>No B2C transactions this month</p></div>'}
        </div>

        <!-- HSN Summary -->
        <div class="gstr-section">
          <div class="gstr-header-box">
            <span><span class="material-icons" style="vertical-align:middle;margin-right:6px;font-size:18px">tag</span>HSN/SAC Summary</span>
            <button class="btn btn-sm" style="background:rgba(255,255,255,.15);color:#fff;border-color:rgba(255,255,255,.2)" onclick="Reports.exportHSN('${selectedMonth}')"><span class="material-icons" style="font-size:15px">download</span> CSV</button>
          </div>
          ${hsnSummary.length ? `
          <table class="gstr-table">
            <thead>
              <tr>
                <th>HSN/SAC</th>
                <th>Description</th>
                <th>UOM</th>
                <th class="text-right">Total Quantity</th>
                <th class="text-right">Total Value</th>
                <th class="text-right">IGST</th>
                <th class="text-right">CGST</th>
                <th class="text-right">SGST</th>
              </tr>
            </thead>
            <tbody>
              ${hsnSummary.map(h => `
                <tr>
                  <td><span class="mono">${h.hsn}</span></td>
                  <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.desc}</td>
                  <td>${h.unit || '—'}</td>
                  <td class="text-right">${h.qty}</td>
                  <td class="text-right">${fmtCurrency(h.taxable)}</td>
                  <td class="text-right">${fmtCurrency(h.igst)}</td>
                  <td class="text-right">${fmtCurrency(h.cgst)}</td>
                  <td class="text-right">${fmtCurrency(h.sgst)}</td>
                </tr>`).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" class="text-right font-bold">Total</td>
                <td class="text-right">${fmtCurrency(hsnSummary.reduce((s, h) => s + h.taxable, 0))}</td>
                <td class="text-right">${fmtCurrency(hsnSummary.reduce((s, h) => s + h.igst, 0))}</td>
                <td class="text-right">${fmtCurrency(hsnSummary.reduce((s, h) => s + h.cgst, 0))}</td>
                <td class="text-right">${fmtCurrency(hsnSummary.reduce((s, h) => s + h.sgst, 0))}</td>
              </tr>
            </tfoot>
          </table>` : '<div class="empty-state" style="padding:20px"><p>No sales transactions this month</p></div>'}
        </div>
      `;
    };

    container.innerHTML = `
      <div class="page-header-row">
        <h2>GST Returns</h2>
        <div style="display:flex;align-items:center;gap:10px">
          <label style="font-size:.84rem;font-weight:600;color:var(--text-secondary)">Period:</label>
          <select id="gst-month" class="filter-select" onchange="window._gstM=this.value;window._gstR()">
            ${months.map(m => `<option value="${m.value}">${m.label}</option>`).join('')}
          </select>
        </div>
      </div>

      <div style="margin-bottom:14px;padding:10px 14px;background:var(--primary-light);border:1px solid hsl(221,60%,85%);border-radius:var(--radius);font-size:.84rem;color:var(--primary-dark)">
        <strong>GST Registration:</strong> ${biz.gstin || 'Not set'} &nbsp;|&nbsp;
        <strong>Legal Name:</strong> ${biz.name} &nbsp;|&nbsp;
        <strong>State:</strong> ${biz.state} (${biz.stateCode}) &nbsp;|&nbsp;
        <strong>FY:</strong> ${fy}
      </div>

      <div id="gst-content"></div>
    `;

    window._gstM = months[0].value;
    window._gstR = () => { selectedMonth = window._gstM; renderGSTR(); };
    renderGSTR();
  },

  exportCSV() {
    const sales = DB.getSales();
    const rows = [
      ['Invoice No', 'Date', 'Customer', 'Customer GSTIN', 'Place of Supply', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total Tax', 'Grand Total', 'Status'],
      ...sales.map(s => [s.invoiceNo, s.date, s.customerName, s.customerGstin || '', s.placeOfSupply, s.subtotal, s.totalCgst || 0, s.totalSgst || 0, s.totalIgst || 0, s.totalTax || 0, s.total, s.status])
    ];
    this._downloadCSV(rows, 'sales_report.csv');
    App.toast('Sales report downloaded!');
  },

  exportGSTR1B2B(month) {
    const [year, m] = month.split('-').map(Number);
    const b2b = DB.getSales().filter(s => s.customerGstin && new Date(s.date).getFullYear() === year && new Date(s.date).getMonth() + 1 === m);
    const rows = [
      ['GSTIN of Buyer', 'Invoice No', 'Invoice Date', 'Invoice Value', 'Place of Supply', 'Reverse Charge', 'Taxable Value', 'IGST', 'CGST', 'SGST'],
      ...b2b.map(s => [s.customerGstin, s.invoiceNo, s.date, s.total, s.placeOfSupply, s.reverseCharge ? 'Y' : 'N', s.subtotal, s.totalIgst || 0, s.totalCgst || 0, s.totalSgst || 0])
    ];
    this._downloadCSV(rows, `GSTR1_B2B_${month}.csv`);
    App.toast('GSTR-1 B2B exported!');
  },

  exportHSN(month) {
    const [year, m] = month.split('-').map(Number);
    const mSales = DB.getSales().filter(s => new Date(s.date).getFullYear() === year && new Date(s.date).getMonth() + 1 === m);
    const hsnMap = {};
    mSales.forEach(s => (s.items || []).forEach(item => {
      const k = item.hsn || 'MISC';
      if (!hsnMap[k]) hsnMap[k] = { hsn: k, desc: item.name, unit: item.unit, qty: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0 };
      hsnMap[k].qty += item.qty; hsnMap[k].taxable += item.taxableValue || 0;
      hsnMap[k].igst += item.igstAmt || 0; hsnMap[k].cgst += item.cgstAmt || 0; hsnMap[k].sgst += item.sgstAmt || 0;
    }));
    const rows = [
      ['HSN/SAC', 'Description', 'UOM', 'Total Quantity', 'Total Value', 'IGST', 'CGST', 'SGST'],
      ...Object.values(hsnMap).map(h => [h.hsn, h.desc, h.unit, h.qty, h.taxable, h.igst, h.cgst, h.sgst])
    ];
    this._downloadCSV(rows, `HSN_Summary_${month}.csv`);
    App.toast('HSN Summary exported!');
  },

  _downloadCSV(rows, filename) {
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  },

  printGSTR3B(month) {
    App.toast('GSTR-3B print view coming soon!', 'info');
  }
};
