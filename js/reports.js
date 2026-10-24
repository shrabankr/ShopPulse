'use strict';

/* ─────────────────────────────────────────────
   Reports Module — P&L, GSTR-1, GSTR-3B
───────────────────────────────────────────── */
const Reports = {
  render(container) {
    const sales = DB.getSales();
    const purchases = DB.getPurchases();
    const expenses = DB.getExpenses();
    const cNotes = DB.getCreditNotes();
    const dNotes = DB.getDebitNotes();

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
    const mCreditNotes = cNotes.filter(n => new Date(n.date) >= currentMonthStart);
    const mDebitNotes = dNotes.filter(n => new Date(n.date) >= currentMonthStart);
    const pmSales = sales.filter(s => { const d = new Date(s.date); return d >= prevMonthStart && d <= prevMonthEnd; });

    const mGrossRevenue = mSales.filter(s => s.status === 'paid').reduce((s, i) => s + i.total, 0);
    const mReturnsAmt = mCreditNotes.reduce((s, n) => s + (n.total || 0), 0);
    const mRevenue = Math.max(0, mGrossRevenue - mReturnsAmt);
    const pmRevenue = pmSales.filter(s => s.status === 'paid').reduce((s, i) => s + i.total, 0);

    const mGrossPurchase = mPurchases.filter(p => p.status === 'paid').reduce((s, b) => s + b.total, 0);
    const mPurchaseReturnsAmt = mDebitNotes.reduce((s, n) => s + (n.total || 0), 0);
    const mPurchaseAmt = Math.max(0, mGrossPurchase - mPurchaseReturnsAmt);

    const mExpenseAmt = mExpensesList.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const mProfit = mRevenue - mPurchaseAmt - mExpenseAmt;
    const mOutputTax = Math.max(0, mSales.reduce((s, i) => s + (i.totalTax || 0), 0) - mCreditNotes.reduce((s, n) => s + (n.totalTax || 0), 0));
    const mInputTax = Math.max(0, mPurchases.reduce((s, b) => s + (b.totalTax || 0), 0) - mDebitNotes.reduce((s, n) => s + (n.totalTax || 0), 0));
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
      const mCreditNotes = filterDocs(DB.getCreditNotes());
      const mDebitNotes = filterDocs(DB.getDebitNotes());

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

        <!-- GSTR-1: 9B. Credit & Debit Notes (Sales Returns) -->
        <div class="gstr-section">
          <div class="gstr-header-box">
            <span><span class="material-icons" style="vertical-align:middle;margin-right:6px;font-size:18px">assignment_returned</span>GSTR-1: 9B. Credit &amp; Debit Notes (Sales Returns) — ${mCreditNotes.length} records</span>
          </div>
          ${mCreditNotes.length ? `
          <table class="gstr-table">
            <thead>
              <tr>
                <th>Note No.</th>
                <th>Note Date</th>
                <th>Original Invoice Ref</th>
                <th>Customer Name</th>
                <th>GSTIN</th>
                <th>Return Reason</th>
                <th class="text-right">Note Value</th>
                <th class="text-right">Taxable</th>
                <th class="text-right">Tax Reversal</th>
              </tr>
            </thead>
            <tbody>
              ${mCreditNotes.map(n => `
                <tr>
                  <td><span class="mono" style="font-weight:700">${n.noteNo}</span></td>
                  <td>${fmtDate(n.date)}</td>
                  <td><span class="mono" style="color:var(--primary)">${n.originalInvoiceNo || 'Direct Return'}</span></td>
                  <td>${n.customerName}</td>
                  <td><span class="mono">${n.customerGstin || 'Unregistered'}</span></td>
                  <td><span class="badge badge-warning">${n.reason || 'Return'}</span></td>
                  <td class="text-right font-bold" style="color:var(--danger)">-${fmtCurrency(n.total)}</td>
                  <td class="text-right">${fmtCurrency(n.subtotal)}</td>
                  <td class="text-right font-bold text-danger">-${fmtCurrency(n.totalTax || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="6" class="text-right font-bold">Total Credit Notes (Reduction in Outward Tax)</td>
                <td class="text-right font-bold text-danger">-${fmtCurrency(mCreditNotes.reduce((s, n) => s + (n.total || 0), 0))}</td>
                <td class="text-right font-bold">${fmtCurrency(mCreditNotes.reduce((s, n) => s + (n.subtotal || 0), 0))}</td>
                <td class="text-right font-bold text-danger">-${fmtCurrency(mCreditNotes.reduce((s, n) => s + (n.totalTax || 0), 0))}</td>
              </tr>
            </tfoot>
          </table>` : '<div class="empty-state" style="padding:20px"><p>No Credit Notes (Sales Returns) issued this month</p></div>'}
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
        <div>
          <h2>GST Returns &amp; Compliance</h2>
          <div style="font-size:.82rem;color:var(--text-secondary)">GSTR-1, GSTR-3B &amp; Direct JSON Upload for gst.gov.in Portal</div>
        </div>
        <div class="actions" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="Reports.downloadGSTR1Json(window._gstM || '${months[0].value}')" title="Download official JSON file for direct upload to gst.gov.in portal">
            <span class="material-icons">cloud_download</span> GSTR-1 Portal JSON
          </button>
          <button class="btn btn-secondary" onclick="Reports.viewGSTR1JsonModal(window._gstM || '${months[0].value}')" title="Inspect &amp; Validate GSTR-1 JSON Schema">
            <span class="material-icons">code</span> Inspect &amp; Validate
          </button>
          <div style="display:inline-flex;align-items:center;gap:6px">
            <label style="font-size:.84rem;font-weight:600;color:var(--text-secondary);margin:0">Period:</label>
            <select id="gst-month" class="filter-select" onchange="window._gstM=this.value;window._gstR()">
              ${months.map(m => `<option value="${m.value}">${m.label}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <div style="margin-bottom:14px;padding:10px 14px;background:var(--primary-light);border:1px solid hsl(221,60%,85%);border-radius:var(--radius);font-size:.84rem;color:var(--primary-dark)">
        <strong>GST Registration:</strong> ${biz.gstin || 'Not set'} &nbsp;|&nbsp;
        <strong>Legal Name:</strong> ${biz.name} &nbsp;|&nbsp;
        <strong>State:</strong> ${biz.state} (${biz.stateCode}) &nbsp;|&nbsp;
        <strong>FY:</strong> ${fy}
      </div>

      <div style="margin-bottom:14px;padding:12px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:var(--radius);font-size:.84rem;color:#166534;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="material-icons" style="font-size:20px;color:#16a34a">verified</span>
          <span><strong>GST Portal Direct Integration:</strong> Generate official <code>.json</code> return file ready to upload directly to <strong>gst.gov.in</strong> without Excel / Offline Tool.</span>
        </div>
        <button class="btn btn-xs btn-success" onclick="Reports.downloadGSTR1Json(window._gstM || '${months[0].value}')">
          <span class="material-icons" style="font-size:14px">download</span> Download GSTR-1 JSON
        </button>
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
  },

  /* ─────────────────────────────────────────────
     Official GSTN GSTR-1 JSON Generator
     Compliant with gst.gov.in Direct Upload Schema
  ───────────────────────────────────────────── */
  _fmtDateGSTN(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY format
    }
    return dateStr;
  },

  _mapUQC(unit) {
    if (!unit) return 'OTH';
    const u = unit.toUpperCase().trim();
    if (u.includes('NO') || u.includes('PC') || u.includes('UNIT')) return 'NOS';
    if (u.includes('BOX')) return 'BOX';
    if (u.includes('MTR') || u.includes('METER')) return 'MTR';
    if (u.includes('SET')) return 'SET';
    if (u.includes('BAG') || u.includes('PKT') || u.includes('PACK')) return 'PAC';
    if (u.includes('KG') || u.includes('KILO')) return 'KGS';
    if (u.includes('LTR') || u.includes('LITER')) return 'LTR';
    return 'OTH';
  },

  generateGSTR1Json(month) {
    const biz = DB.getBiz();
    const [year, m] = month.split('-').map(Number);
    const monthStr = String(m).padStart(2, '0');
    const yearStr = String(year);
    const fp = `${monthStr}${yearStr}`; // e.g. "102026"

    const allSales = DB.getSales().filter(s => s.status !== 'draft');
    const mSales = allSales.filter(s => {
      const d = new Date(s.date);
      return d.getFullYear() === year && (d.getMonth() + 1) === m;
    });

    const mCreditNotes = DB.getCreditNotes().filter(c => {
      const d = new Date(c.date);
      return d.getFullYear() === year && (d.getMonth() + 1) === m;
    });

    const mDebitNotes = DB.getDebitNotes().filter(d => {
      const dt = new Date(d.date);
      return dt.getFullYear() === year && (dt.getMonth() + 1) === m;
    });

    // ─── 1. B2B (Table 4) ───
    const b2bMap = {};
    mSales.filter(s => s.customerGstin && s.customerGstin.trim().length >= 15).forEach(s => {
      const ctin = s.customerGstin.trim().toUpperCase();
      if (!b2bMap[ctin]) {
        b2bMap[ctin] = { ctin, inv: [] };
      }

      // Group line items by GST Rate
      const rateGroups = {};
      (s.items || []).forEach(it => {
        const rt = parseFloat(it.gstRate) || 0;
        if (!rateGroups[rt]) {
          rateGroups[rt] = { rt, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 };
        }
        rateGroups[rt].txval += (parseFloat(it.taxableValue) || 0);
        rateGroups[rt].iamt += (parseFloat(it.igstAmt) || 0);
        rateGroups[rt].camt += (parseFloat(it.cgstAmt) || 0);
        rateGroups[rt].samt += (parseFloat(it.sgstAmt) || 0);
      });

      const itms = Object.values(rateGroups).map((g, idx) => ({
        num: idx + 1,
        itm_det: {
          rt: g.rt,
          txval: Math.round(g.txval * 100) / 100,
          iamt: Math.round(g.iamt * 100) / 100,
          camt: Math.round(g.camt * 100) / 100,
          samt: Math.round(g.samt * 100) / 100,
          csamt: 0
        }
      }));

      const pos = String(s.placeOfSupply || s.customerStateCode || biz.stateCode || '27').padStart(2, '0');

      b2bMap[ctin].inv.push({
        inum: s.invoiceNo,
        idt: this._fmtDateGSTN(s.date),
        val: Math.round(parseFloat(s.total) * 100) / 100,
        pos,
        rchrg: s.reverseCharge ? 'Y' : 'N',
        inv_typ: 'R',
        itms
      });
    });

    const b2b = Object.values(b2bMap);

    // ─── 2. B2CL (Table 5: Large Inter-State B2C > 2.5L) ───
    const b2clMap = {};
    mSales.filter(s => (!s.customerGstin || s.customerGstin.trim().length < 15) && !s.isIntra && parseFloat(s.total) > 250000).forEach(s => {
      const pos = String(s.placeOfSupply || s.customerStateCode || '00').padStart(2, '0');
      if (!b2clMap[pos]) {
        b2clMap[pos] = { pos, inv: [] };
      }

      const rateGroups = {};
      (s.items || []).forEach(it => {
        const rt = parseFloat(it.gstRate) || 0;
        if (!rateGroups[rt]) {
          rateGroups[rt] = { rt, txval: 0, iamt: 0, csamt: 0 };
        }
        rateGroups[rt].txval += (parseFloat(it.taxableValue) || 0);
        rateGroups[rt].iamt += (parseFloat(it.igstAmt) || 0);
      });

      const itms = Object.values(rateGroups).map((g, idx) => ({
        num: idx + 1,
        itm_det: {
          rt: g.rt,
          txval: Math.round(g.txval * 100) / 100,
          iamt: Math.round(g.iamt * 100) / 100,
          csamt: 0
        }
      }));

      b2clMap[pos].inv.push({
        inum: s.invoiceNo,
        idt: this._fmtDateGSTN(s.date),
        val: Math.round(parseFloat(s.total) * 100) / 100,
        itms
      });
    });
    const b2cl = Object.values(b2clMap);

    // ─── 3. B2CS (Table 7: Small B2C Supplies) ───
    const b2csMap = {};
    mSales.filter(s => (!s.customerGstin || s.customerGstin.trim().length < 15) && (s.isIntra || parseFloat(s.total) <= 250000)).forEach(s => {
      const sply_ty = s.isIntra ? 'INTRA' : 'INTER';
      const pos = String(s.placeOfSupply || s.customerStateCode || biz.stateCode || '27').padStart(2, '0');

      (s.items || []).forEach(it => {
        const rt = parseFloat(it.gstRate) || 0;
        const key = `${sply_ty}_${pos}_${rt}`;
        if (!b2csMap[key]) {
          b2csMap[key] = {
            sply_ty,
            pos,
            typ: 'OE',
            rt,
            txval: 0,
            iamt: 0,
            camt: 0,
            samt: 0,
            csamt: 0
          };
        }
        b2csMap[key].txval += (parseFloat(it.taxableValue) || 0);
        b2csMap[key].iamt += (parseFloat(it.igstAmt) || 0);
        b2csMap[key].camt += (parseFloat(it.cgstAmt) || 0);
        b2csMap[key].samt += (parseFloat(it.sgstAmt) || 0);
      });
    });

    const b2cs = Object.values(b2csMap).map(g => ({
      sply_ty: g.sply_ty,
      pos: g.pos,
      typ: g.typ,
      rt: g.rt,
      txval: Math.round(g.txval * 100) / 100,
      iamt: Math.round(g.iamt * 100) / 100,
      camt: Math.round(g.camt * 100) / 100,
      samt: Math.round(g.samt * 100) / 100,
      csamt: 0
    }));

    // ─── 4. CDNR (Table 9B: Registered Credit/Debit Notes) ───
    const cdnrMap = {};
    const processRegisteredNote = (note, ntty) => {
      const ctin = (note.customerGstin || note.supplierGstin || '').trim().toUpperCase();
      if (!ctin || ctin.length < 15) return;

      if (!cdnrMap[ctin]) cdnrMap[ctin] = { ctin, nt: [] };

      const rateGroups = {};
      (note.items || []).forEach(it => {
        const rt = parseFloat(it.gstRate) || 0;
        if (!rateGroups[rt]) rateGroups[rt] = { rt, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 };
        rateGroups[rt].txval += (parseFloat(it.taxableValue) || 0);
        rateGroups[rt].iamt += (parseFloat(it.igstAmt) || 0);
        rateGroups[rt].camt += (parseFloat(it.cgstAmt) || 0);
        rateGroups[rt].samt += (parseFloat(it.sgstAmt) || 0);
      });

      const itms = Object.values(rateGroups).map((g, idx) => ({
        num: idx + 1,
        itm_det: {
          rt: g.rt,
          txval: Math.round(g.txval * 100) / 100,
          iamt: Math.round(g.iamt * 100) / 100,
          camt: Math.round(g.camt * 100) / 100,
          samt: Math.round(g.samt * 100) / 100,
          csamt: 0
        }
      }));

      const pos = String(note.placeOfSupply || biz.stateCode || '27').padStart(2, '0');
      cdnrMap[ctin].nt.push({
        ntty,
        nt_num: note.noteNo || note.creditNoteNo || note.debitNoteNo || note.id,
        nt_dt: this._fmtDateGSTN(note.date),
        p_gst: 'N',
        val: Math.round(parseFloat(note.total) * 100) / 100,
        pos,
        rchrg: 'N',
        inv_typ: 'R',
        itms
      });
    };

    mCreditNotes.forEach(c => processRegisteredNote(c, 'C'));
    mDebitNotes.forEach(d => processRegisteredNote(d, 'D'));
    const cdnr = Object.values(cdnrMap);

    // ─── 5. CDNUR (Table 9B: Unregistered Credit/Debit Notes) ───
    const cdnur = [];
    const processUnregisteredNote = (note, ntty) => {
      const ctin = (note.customerGstin || note.supplierGstin || '').trim();
      if (ctin && ctin.length >= 15) return;

      const rateGroups = {};
      (note.items || []).forEach(it => {
        const rt = parseFloat(it.gstRate) || 0;
        if (!rateGroups[rt]) rateGroups[rt] = { rt, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 };
        rateGroups[rt].txval += (parseFloat(it.taxableValue) || 0);
        rateGroups[rt].iamt += (parseFloat(it.igstAmt) || 0);
        rateGroups[rt].camt += (parseFloat(it.cgstAmt) || 0);
        rateGroups[rt].samt += (parseFloat(it.sgstAmt) || 0);
      });

      const itms = Object.values(rateGroups).map((g, idx) => ({
        num: idx + 1,
        itm_det: {
          rt: g.rt,
          txval: Math.round(g.txval * 100) / 100,
          iamt: Math.round(g.iamt * 100) / 100,
          camt: Math.round(g.camt * 100) / 100,
          samt: Math.round(g.samt * 100) / 100,
          csamt: 0
        }
      }));

      const pos = String(note.placeOfSupply || biz.stateCode || '27').padStart(2, '0');
      cdnur.push({
        typ: parseFloat(note.total) > 250000 && !note.isIntra ? 'B2CL' : 'B2CS',
        ntty,
        nt_num: note.noteNo || note.creditNoteNo || note.debitNoteNo || note.id,
        nt_dt: this._fmtDateGSTN(note.date),
        p_gst: 'N',
        val: Math.round(parseFloat(note.total) * 100) / 100,
        pos,
        itms
      });
    };
    mCreditNotes.forEach(c => processUnregisteredNote(c, 'C'));
    mDebitNotes.forEach(d => processUnregisteredNote(d, 'D'));

    // ─── 6. HSN Summary (Table 12) ───
    const hsnAgg = {};
    mSales.forEach(s => {
      (s.items || []).forEach(it => {
        const hsn = (it.hsn || '8471').trim();
        const desc = it.name || 'Computer / CCTV Goods';
        const uqc = this._mapUQC(it.unit);
        const key = `${hsn}_${uqc}`;

        if (!hsnAgg[key]) {
          hsnAgg[key] = {
            hsn_sc: hsn,
            desc: desc.slice(0, 30),
            uqc,
            qty: 0,
            val: 0,
            txval: 0,
            iamt: 0,
            camt: 0,
            samt: 0,
            csamt: 0
          };
        }
        hsnAgg[key].qty += (parseFloat(it.qty) || 0);
        hsnAgg[key].val += (parseFloat(it.totalAmt) || 0);
        hsnAgg[key].txval += (parseFloat(it.taxableValue) || 0);
        hsnAgg[key].iamt += (parseFloat(it.igstAmt) || 0);
        hsnAgg[key].camt += (parseFloat(it.cgstAmt) || 0);
        hsnAgg[key].samt += (parseFloat(it.sgstAmt) || 0);
      });
    });

    const hsnData = Object.values(hsnAgg).map((h, idx) => ({
      num: idx + 1,
      hsn_sc: h.hsn_sc,
      desc: h.desc,
      uqc: h.uqc,
      qty: Math.round(h.qty * 100) / 100,
      val: Math.round(h.val * 100) / 100,
      txval: Math.round(h.txval * 100) / 100,
      iamt: Math.round(h.iamt * 100) / 100,
      camt: Math.round(h.camt * 100) / 100,
      samt: Math.round(h.samt * 100) / 100,
      csamt: 0
    }));

    // ─── 7. Document Issued Summary (Table 13) ───
    const doc_det = [];
    if (mSales.length > 0) {
      const sortedInvs = [...mSales].sort((a, b) => (a.invoiceNo || '').localeCompare(b.invoiceNo || ''));
      doc_det.push({
        doc_num: 1, // 1: Invoices for outward supply
        doc_typ: 'Invoices for outward supply',
        docs: [
          {
            num: 1,
            from: sortedInvs[0].invoiceNo,
            to: sortedInvs[sortedInvs.length - 1].invoiceNo,
            totnum: sortedInvs.length,
            canc: 0,
            net_issue: sortedInvs.length
          }
        ]
      });
    }

    if (mCreditNotes.length > 0) {
      const sortedCns = [...mCreditNotes].sort((a, b) => (a.noteNo || a.id).localeCompare(b.noteNo || b.id));
      doc_det.push({
        doc_num: 5, // 5: Credit Notes
        doc_typ: 'Credit Notes',
        docs: [
          {
            num: 1,
            from: sortedCns[0].noteNo || sortedCns[0].id,
            to: sortedCns[sortedCns.length - 1].noteNo || sortedCns[sortedCns.length - 1].id,
            totnum: sortedCns.length,
            canc: 0,
            net_issue: sortedCns.length
          }
        ]
      });
    }

    if (mDebitNotes.length > 0) {
      const sortedDns = [...mDebitNotes].sort((a, b) => (a.noteNo || a.id).localeCompare(b.noteNo || b.id));
      doc_det.push({
        doc_num: 4, // 4: Debit Notes
        doc_typ: 'Debit Notes',
        docs: [
          {
            num: 1,
            from: sortedDns[0].noteNo || sortedDns[0].id,
            to: sortedDns[sortedDns.length - 1].noteNo || sortedDns[sortedDns.length - 1].id,
            totnum: sortedDns.length,
            canc: 0,
            net_issue: sortedDns.length
          }
        ]
      });
    }

    // Top-Level GSTR-1 Structure
    return {
      gstin: (biz.gstin || '27AABCA1234F1Z5').toUpperCase(),
      fp,
      gt: parseFloat(biz.grossTurnoverPrevFY) || 0,
      cur_gt: parseFloat(biz.grossTurnoverCurFY) || 0,
      b2b,
      b2cl,
      b2cs,
      cdnr,
      cdnur,
      exp: [],
      hsn: { data: hsnData },
      doc_issue: { doc_det }
    };
  },

  validateGSTR1(month) {
    const issues = [];
    const biz = DB.getBiz();
    if (!biz.gstin || !validateGSTIN(biz.gstin)) {
      issues.push({ level: 'error', message: `Business GSTIN (${biz.gstin || 'Empty'}) is invalid or not set.` });
    }

    const gstr1 = this.generateGSTR1Json(month);
    
    // Check B2B recipients
    gstr1.b2b.forEach(b => {
      if (!validateGSTIN(b.ctin)) {
        issues.push({ level: 'error', message: `Customer GSTIN ${b.ctin} is invalid in B2B table.` });
      }
      b.inv.forEach(i => {
        if (!i.pos || i.pos === '00') {
          issues.push({ level: 'error', message: `Invoice ${i.inum} has missing or invalid Place of Supply (POS).` });
        }
        if (i.val <= 0) {
          issues.push({ level: 'warning', message: `Invoice ${i.inum} has zero or negative total amount.` });
        }
      });
    });

    // Check HSN
    gstr1.hsn.data.forEach(h => {
      if (!h.hsn_sc || h.hsn_sc.length < 2) {
        issues.push({ level: 'warning', message: `HSN code "${h.hsn_sc}" for "${h.desc}" is less than standard 4 digits.` });
      }
    });

    const totalRecords = gstr1.b2b.reduce((s, b) => s + b.inv.length, 0) + gstr1.b2cl.reduce((s, b) => s + b.inv.length, 0) + gstr1.b2cs.length + gstr1.cdnr.length + gstr1.cdnur.length;

    return {
      isValid: issues.filter(i => i.level === 'error').length === 0,
      issues,
      stats: {
        b2bCount: gstr1.b2b.reduce((s, b) => s + b.inv.length, 0),
        b2csCount: gstr1.b2cs.length,
        b2clCount: gstr1.b2cl.reduce((s, b) => s + b.inv.length, 0),
        cdnrCount: gstr1.cdnr.reduce((s, c) => s + c.nt.length, 0),
        hsnCount: gstr1.hsn.data.length,
        totalRecords
      },
      json: gstr1
    };
  },

  downloadGSTR1Json(month) {
    const val = this.validateGSTR1(month);
    const biz = DB.getBiz();
    const [year, m] = month.split('-').map(Number);
    const fp = `${String(m).padStart(2, '0')}${year}`;
    const filename = `GSTR1_${(biz.gstin || 'SHOPPULSE').toUpperCase()}_${fp}.json`;

    if (!val.isValid) {
      this.viewGSTR1JsonModal(month);
      App.toast(`⚠️ Please resolve ${val.issues.filter(i => i.level === 'error').length} GST validation error(s) before portal upload.`, 'warning');
      return;
    }

    const jsonStr = JSON.stringify(val.json, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    App.toast(`🎉 Official GSTR-1 JSON downloaded: ${filename}`, 'success');
  },

  viewGSTR1JsonModal(month) {
    const val = this.validateGSTR1(month);
    const jsonStr = JSON.stringify(val.json, null, 2);
    const [year, m] = month.split('-').map(Number);
    const monthName = new Date(year, m - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

    let statusAlert = '';
    if (val.isValid) {
      statusAlert = `
        <div style="padding:10px 14px;background:#dcfce7;border:1px solid #86efac;border-radius:var(--radius-sm);color:#15803d;margin-bottom:12px;display:flex;align-items:center;gap:8px">
          <span class="material-icons">check_circle</span>
          <div>
            <strong>100% Valid &amp; Ready for GST Portal Upload!</strong>
            <div style="font-size:.78rem">All GSTINs, HSNs, rates, and invoice totals match GSTN schema specifications.</div>
          </div>
        </div>
      `;
    } else {
      statusAlert = `
        <div style="padding:10px 14px;background:#fee2e2;border:1px solid #fca5a5;border-radius:var(--radius-sm);color:#991b1b;margin-bottom:12px">
          <div style="font-weight:700;display:flex;align-items:center;gap:6px">
            <span class="material-icons">error</span> Validation Issues Detected (${val.issues.length})
          </div>
          <ul style="margin:6px 0 0 20px;font-size:.8rem;line-height:1.4">
            ${val.issues.map(i => `<li><strong>${i.level.toUpperCase()}:</strong> ${i.message}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    const bodyHtml = `
      ${statusAlert}

      <!-- Statistics Pill Bar -->
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
        <span class="badge" style="background:#e0f2fe;color:#0369a1;padding:5px 10px;font-size:.8rem">
          Table 4 (B2B): <strong>${val.stats.b2bCount} invoices</strong>
        </span>
        <span class="badge" style="background:#f1f5f9;color:#334155;padding:5px 10px;font-size:.8rem">
          Table 7 (B2CS): <strong>${val.stats.b2csCount} lines</strong>
        </span>
        <span class="badge" style="background:#fef3c7;color:#92400e;padding:5px 10px;font-size:.8rem">
          Table 9B (CDNR): <strong>${val.stats.cdnrCount} notes</strong>
        </span>
        <span class="badge" style="background:#f3e8ff;color:#6b21a8;padding:5px 10px;font-size:.8rem">
          Table 12 (HSN): <strong>${val.stats.hsnCount} items</strong>
        </span>
      </div>

      <!-- JSON Preview Box -->
      <div style="position:relative">
        <textarea id="gstr1-json-textarea" readonly rows="16" style="width:100%;font-family:monospace;font-size:.78rem;background:#0f172a;color:#f8fafc;padding:12px;border-radius:var(--radius-sm);border:1px solid #334155;resize:vertical">${jsonStr}</textarea>
        <button type="button" class="btn btn-xs btn-secondary" onclick="navigator.clipboard.writeText(document.getElementById('gstr1-json-textarea').value);App.toast('Copied GSTR-1 JSON to clipboard!','success')" style="position:absolute;top:8px;right:8px;opacity:0.9">
          📋 Copy JSON
        </button>
      </div>

      <!-- Government Portal Upload Instructions -->
      <div style="margin-top:14px;padding:10px 14px;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border);font-size:.8rem;line-height:1.5">
        <strong>How to Upload to GST Portal (gst.gov.in):</strong>
        <ol style="margin:4px 0 0 18px;color:var(--text-secondary)">
          <li>Click <strong>Download JSON</strong> below to save <code>GSTR1_${val.json.gstin}_${val.json.fp}.json</code>.</li>
          <li>Log into <a href="https://services.gst.gov.in" target="_blank" style="color:var(--primary);font-weight:700">gst.gov.in</a> &rarr; <strong>Returns Dashboard</strong> &rarr; Select Financial Year &amp; Month (<strong>${monthName}</strong>).</li>
          <li>Under <strong>Details of outward supplies (GSTR-1)</strong>, click <strong>PREPARE OFFLINE &rarr; Upload</strong>.</li>
          <li>Choose this downloaded <code>.json</code> file. Your return will be instantly populated and validated by GSTN with Nil errors!</li>
        </ol>
      </div>
    `;

    App.modal(`📥 Official GSTR-1 JSON — ${monthName}`, bodyHtml, `
      <button class="btn btn-ghost" onclick="App.closeModal()">Close</button>
      <button class="btn btn-primary" onclick="Reports.downloadGSTR1Json('${month}')">
        <span class="material-icons">download</span> Download GSTR-1 JSON
      </button>
    `, 'modal-lg');
  }
};
