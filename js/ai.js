'use strict';

/* ─────────────────────────────────────────────
   AI Assistant Module
───────────────────────────────────────────── */
const AI = {
  chatHistory: [],

  render(container) {
    const products = DB.getProducts();
    const lowStock = products.filter(p => p.reorderLevel > 0 && p.stock <= p.reorderLevel);

    container.innerHTML = `
      <div class="page-header">
        <h2>AI Business Assistant</h2>
        <p>Smart insights, bill generation, reorder suggestions, and business analytics.</p>
      </div>
      <div class="ai-page">
        <div>
          <!-- Feature Cards -->
          <div class="ai-features-grid">
            <div class="ai-feature-card" onclick="AI.runFeature('summary')">
              <div class="ai-feature-icon" style="background:var(--primary-light)"><span class="material-icons" style="color:var(--primary)">auto_awesome</span></div>
              <h4>Business Summary</h4>
              <p>Get a complete health report of your business in plain language.</p>
            </div>
            <div class="ai-feature-card" onclick="AI.runFeature('generate')">
              <div class="ai-feature-icon" style="background:var(--success-light)"><span class="material-icons" style="color:var(--success)">receipt_long</span></div>
              <h4>Smart Bill Generator</h4>
              <p>Describe in plain text — AI creates a draft invoice for you.</p>
            </div>
            <div class="ai-feature-card" onclick="AI.runFeature('reorder')">
              <div class="ai-feature-icon" style="background:var(--warning-light)"><span class="material-icons" style="color:var(--warning)">inventory_2</span></div>
              <h4>Reorder Suggestions <span class="badge badge-warning" style="font-size:.65rem">${lowStock.length}</span></h4>
              <p>AI-powered purchase recommendations for low-stock items.</p>
            </div>
            <div class="ai-feature-card" onclick="AI.runFeature('forecast')">
              <div class="ai-feature-icon" style="background:hsl(271,78%,95%)"><span class="material-icons" style="color:hsl(271,78%,50%)">trending_up</span></div>
              <h4>Revenue Forecast</h4>
              <p>Predict next month's revenue based on historical trends.</p>
            </div>
            <div class="ai-feature-card" onclick="AI.runFeature('gst')">
              <div class="ai-feature-icon" style="background:var(--danger-light)"><span class="material-icons" style="color:var(--danger)">receipt</span></div>
              <h4>GST Compliance Check</h4>
              <p>Review your GST data for missing HSN codes, GSTINs, or issues.</p>
            </div>
            <div class="ai-feature-card" onclick="AI.runFeature('topperformers')">
              <div class="ai-feature-icon" style="background:var(--info-light)"><span class="material-icons" style="color:var(--info)">emoji_events</span></div>
              <h4>Top Performers</h4>
              <p>Identify your best customers, products, and growth opportunities.</p>
            </div>
          </div>

          <!-- Reorder Alert (if any) -->
          ${lowStock.length ? `
          <div class="card" style="margin-top:16px">
            <div class="card-header">
              <h3>🚨 Reorder Required — ${lowStock.length} Item${lowStock.length > 1 ? 's' : ''}</h3>
              <button class="btn btn-sm btn-warning" onclick="AI.generatePO()"><span class="material-icons">add_shopping_cart</span> Generate PO</button>
            </div>
            <div class="card-body p-0">
              <table class="table">
                <thead><tr><th>Product</th><th>HSN</th><th class="text-right">Current Stock</th><th class="text-right">Reorder Level</th><th class="text-right">Suggested Order</th></tr></thead>
                <tbody>
                  ${lowStock.map(p => {
        const suggestedQty = Math.max(p.reorderLevel * 3 - p.stock, p.reorderLevel);
        return `<tr>
                      <td><div style="font-weight:600">${p.name}</div><div style="font-size:.75rem;color:var(--text-secondary)">${p.sku}</div></td>
                      <td><span class="mono">${p.hsn || '—'}</span></td>
                      <td class="text-right"><span class="badge badge-${p.stock === 0 ? 'overdue' : 'warning'}">${p.stock} ${p.unit}</span></td>
                      <td class="text-right">${p.reorderLevel} ${p.unit}</td>
                      <td class="text-right font-bold">${suggestedQty} ${p.unit}</td>
                    </tr>`;
      }).join('')}
                </tbody>
              </table>
            </div>
          </div>` : ''}
        </div>

        <!-- AI Chat -->
        <div class="ai-chat-box">
          <div class="ai-chat-header">
            <div class="ai-chat-avatar"><span class="material-icons">smart_toy</span></div>
            <div>
              <h4>ShopPulse AI</h4>
              <p>Business intelligence assistant</p>
            </div>
          </div>
          <div class="ai-chat-messages" id="ai-messages">
            <div class="chat-msg ai">
              👋 Hello! I'm your ShopPulse AI assistant.<br><br>
              I can help you with:
              <ul>
                <li>Business summaries & insights</li>
                <li>GST compliance review</li>
                <li>Inventory & reorder analysis</li>
                <li>Revenue forecasting</li>
                <li>Invoice generation tips</li>
              </ul>
              Click a feature card or type your question below!
            </div>
          </div>
          <div class="ai-chat-input-row">
            <input id="ai-input" placeholder="Ask me anything about your business…" onkeydown="if(event.key==='Enter')AI.sendMessage()">
            <button class="btn btn-primary btn-sm" onclick="AI.sendMessage()"><span class="material-icons">send</span></button>
          </div>
        </div>
      </div>
    `;
  },

  runFeature(feature) {
    const responses = {
      summary: this._businessSummary(),
      generate: this._billGenGuide(),
      reorder: this._reorderAnalysis(),
      forecast: this._revenueForecast(),
      gst: this._gstCheck(),
      topperformers: this._topPerformers(),
    };
    this._addMessage('ai', responses[feature] || 'Feature not found.');
  },

  sendMessage() {
    const input = document.getElementById('ai-input');
    if (!input || !input.value.trim()) return;
    const msg = input.value.trim();
    input.value = '';
    this._addMessage('user', msg);

    // Show typing
    const msgs = document.getElementById('ai-messages');
    const typing = document.createElement('div');
    typing.className = 'chat-msg ai ai-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    typing.id = 'typing-indicator';
    msgs.appendChild(typing);
    msgs.scrollTop = msgs.scrollHeight;

    setTimeout(() => {
      const typingEl = document.getElementById('typing-indicator');
      if (typingEl) typingEl.remove();
      this._addMessage('ai', this._processQuery(msg));
    }, 800 + Math.random() * 600);
  },

  _addMessage(role, content) {
    const msgs = document.getElementById('ai-messages');
    if (!msgs) return;
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;
    div.innerHTML = content;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  },

  _processQuery(query) {
    const q = query.toLowerCase();
    const sales = DB.getSales();
    const purchases = DB.getPurchases();
    const products = DB.getProducts();
    const biz = DB.getBiz();

    if (q.includes('revenue') || q.includes('sales')) return this._revenueForecast();
    if (q.includes('gst') || q.includes('tax') || q.includes('return')) return this._gstCheck();
    if (q.includes('stock') || q.includes('inventory') || q.includes('reorder')) return this._reorderAnalysis();
    if (q.includes('customer') || q.includes('top') || q.includes('best')) return this._topPerformers();
    if (q.includes('summary') || q.includes('health') || q.includes('report')) return this._businessSummary();
    if (q.includes('invoice') || q.includes('bill') || q.includes('create') || q.includes('generate')) return this._billGenGuide();
    if (q.includes('profit') || q.includes('margin')) {
      const totalRevenue = sales.filter(s => s.status === 'paid').reduce((s, i) => s + i.total, 0);
      const totalCost = purchases.filter(p => p.status === 'paid').reduce((s, b) => s + b.total, 0);
      const profit = totalRevenue - totalCost;
      const margin = totalRevenue > 0 ? (profit / totalRevenue * 100).toFixed(1) : 0;
      return `📊 <strong>Profit Analysis:</strong><br><br>
        • Total Revenue: <strong>${fmtCurrency(totalRevenue)}</strong><br>
        • Total Purchases: <strong>${fmtCurrency(totalCost)}</strong><br>
        • Gross Profit: <strong>${fmtCurrency(profit)}</strong><br>
        • Profit Margin: <strong>${margin}%</strong><br><br>
        ${parseFloat(margin) < 15 ? '⚠️ Margin below 15% — consider reviewing your pricing.' : parseFloat(margin) > 30 ? '✅ Excellent margin above 30%!' : '✅ Healthy profit margin.'}`;
    }
    if (q.includes('overdue') || q.includes('unpaid') || q.includes('outstanding')) {
      const overdue = sales.filter(s => s.status === 'overdue');
      const outstanding = overdue.reduce((s, i) => s + i.total, 0);
      return `⚠️ <strong>Outstanding Payments:</strong><br><br>
        • <strong>${overdue.length}</strong> overdue invoices<br>
        • Total outstanding: <strong>${fmtCurrency(outstanding)}</strong><br><br>
        ${overdue.length > 0 ? '💡 <strong>Recommended Actions:</strong><ul><li>Send payment reminders immediately</li><li>Follow up with overdue customers</li><li>Consider offering early payment discounts</li></ul>' : '✅ All invoices are paid! Great job!'}`;
    }

    // Default helpful response
    return `I understand you're asking about "<em>${query}</em>".<br><br>
      Here's what I can help with:
      <ul>
        <li>Type <strong>"summary"</strong> for business health report</li>
        <li>Type <strong>"revenue"</strong> for sales analysis & forecast</li>
        <li>Type <strong>"gst"</strong> for GST compliance review</li>
        <li>Type <strong>"reorder"</strong> for inventory suggestions</li>
        <li>Type <strong>"profit"</strong> for margin analysis</li>
        <li>Type <strong>"overdue"</strong> for payment status</li>
      </ul>
      Or click a feature card on the left!`;
  },

  _businessSummary() {
    const sales = DB.getSales();
    const purchases = DB.getPurchases();
    const products = DB.getProducts();
    const biz = DB.getBiz();

    const totalRevenue = sales.filter(s => s.status === 'paid').reduce((s, i) => s + i.total, 0);
    const totalCost = purchases.filter(p => p.status === 'paid').reduce((s, b) => s + b.total, 0);
    const receivables = sales.filter(s => ['unpaid', 'overdue', 'sent'].includes(s.status)).reduce((s, i) => s + i.total, 0);
    const payables = purchases.filter(p => ['unpaid', 'overdue'].includes(p.status)).reduce((s, b) => s + b.total, 0);
    const lowStock = products.filter(p => p.reorderLevel > 0 && p.stock <= p.reorderLevel).length;
    const outOfStock = products.filter(p => p.stock === 0).length;
    const overdueCount = sales.filter(s => s.status === 'overdue').length;
    const profit = totalRevenue - totalCost;

    const score = Math.min(100, Math.max(0,
      (profit > 0 ? 30 : 0) +
      (receivables < totalRevenue * 0.3 ? 25 : 10) +
      (lowStock === 0 ? 20 : lowStock < 3 ? 10 : 0) +
      (overdueCount === 0 ? 25 : overdueCount < 3 ? 12 : 0)
    ));

    const scoreLabel = score >= 80 ? '🟢 Excellent' : score >= 60 ? '🟡 Good' : score >= 40 ? '🟠 Needs Attention' : '🔴 Critical';

    return `📊 <strong>Business Health Report — ${biz.name}</strong><br><br>
      <strong>Health Score: ${score}/100 — ${scoreLabel}</strong><br><br>
      <strong>💰 Financials:</strong>
      <ul>
        <li>Total Revenue (Paid): ${fmtCurrency(totalRevenue)}</li>
        <li>Total Purchases (Paid): ${fmtCurrency(totalCost)}</li>
        <li>Gross Profit: <strong>${fmtCurrency(profit)}</strong> ${profit >= 0 ? '✅' : '❌'}</li>
        <li>Profit Margin: ${totalRevenue > 0 ? (profit / totalRevenue * 100).toFixed(1) + '%' : '—'}</li>
      </ul>
      <strong>📋 Receivables & Payables:</strong>
      <ul>
        <li>Outstanding Receivables: ${fmtCurrency(receivables)} (${overdueCount} overdue) ${overdueCount > 0 ? '⚠️' : '✅'}</li>
        <li>Outstanding Payables: ${fmtCurrency(payables)}</li>
      </ul>
      <strong>📦 Inventory:</strong>
      <ul>
        <li>Low Stock Items: ${lowStock} ${lowStock > 0 ? '⚠️' : '✅'}</li>
        <li>Out of Stock: ${outOfStock} ${outOfStock > 0 ? '🔴' : '✅'}</li>
      </ul>
      <strong>💡 Recommendations:</strong>
      <ul>
        ${overdueCount > 0 ? '<li>Follow up on ' + overdueCount + ' overdue invoices immediately</li>' : ''}
        ${lowStock > 0 ? '<li>Reorder ' + lowStock + ' items before they run out</li>' : ''}
        ${profit < 0 ? '<li>⚠️ Operating at a loss — review pricing and costs</li>' : ''}
        ${payables > totalRevenue * 0.5 ? '<li>High payables relative to revenue — manage cash flow carefully</li>' : ''}
        <li>Keep GSTR-1 filed on time before 11th of next month</li>
      </ul>`;
  },

  _billGenGuide() {
    return `🧾 <strong>Smart Bill Generator</strong><br><br>
      To create a GST-compliant invoice quickly:<br><br>
      1️⃣ Click <strong>"New Invoice"</strong> in the top bar<br>
      2️⃣ Select your <strong>customer</strong> — GSTIN and address auto-fill<br>
      3️⃣ The <strong>Place of Supply</strong> auto-sets to customer's state<br>
      4️⃣ Select <strong>products</strong> from inventory — price, HSN & GST auto-fill<br>
      5️⃣ Tax type auto-switches:<br>
        &nbsp;&nbsp;• Same state → CGST + SGST<br>
        &nbsp;&nbsp;• Different state → IGST<br>
      6️⃣ Click <strong>"Print"</strong> for a GST-compliant invoice with:<br>
        &nbsp;&nbsp;• Your GSTIN, customer GSTIN<br>
        &nbsp;&nbsp;• HSN codes, tax rates<br>
        &nbsp;&nbsp;• Amount in words<br>
        &nbsp;&nbsp;• Bank details & signature<br><br>
      💡 <strong>Pro Tip:</strong> Go to <strong>Inventory</strong> first and set up your products with HSN codes to make invoicing faster!`;
  },

  _reorderAnalysis() {
    const products = DB.getProducts();
    const sales = DB.getSales();
    const lowStock = products.filter(p => p.reorderLevel > 0 && p.stock <= p.reorderLevel);

    if (!lowStock.length) {
      return `✅ <strong>All items are well-stocked!</strong><br><br>
        No reorder needed at this time. Your inventory levels look healthy.<br><br>
        💡 Tip: Set up <strong>Reorder Levels</strong> for each product to get automatic alerts.`;
    }

    // Estimate monthly consumption
    const consumption = {};
    const now = new Date();
    const past30 = new Date(now - 30 * 86400000);
    sales.filter(s => new Date(s.date) >= past30).forEach(s => {
      (s.items || []).forEach(item => {
        if (!consumption[item.productId]) consumption[item.productId] = 0;
        consumption[item.productId] += item.qty;
      });
    });

    const suggestions = lowStock.map(p => {
      const monthlyUsage = consumption[p.id] || 0;
      const daysLeft = monthlyUsage > 0 ? Math.floor((p.stock / monthlyUsage) * 30) : null;
      const suggestedQty = Math.max(p.reorderLevel * 3 - p.stock, p.reorderLevel);
      return `<li><strong>${p.name}</strong> — ${p.stock} left${daysLeft !== null ? ` (≈${daysLeft} days)` : ''} → Order <strong>${suggestedQty} ${p.unit}</strong> @ ${fmtCurrency(p.purchasePrice)} each</li>`;
    }).join('');

    const totalValue = lowStock.reduce((s, p) => {
      const suggestedQty = Math.max(p.reorderLevel * 3 - p.stock, p.reorderLevel);
      return s + suggestedQty * p.purchasePrice;
    }, 0);

    return `⚠️ <strong>Reorder Alert — ${lowStock.length} Item${lowStock.length > 1 ? 's' : ''}</strong><br><br>
      <ul>${suggestions}</ul>
      <strong>Estimated Purchase Value: ${fmtCurrency(totalValue)}</strong><br><br>
      💡 Click <strong>"Generate PO"</strong> below the reorder table to create purchase orders automatically!`;
  },

  _revenueForecast() {
    const sales = DB.getSales();
    const now = new Date();

    // Get last 6 months revenue
    const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const m = d.getMonth(), y = d.getFullYear();
      return sales.filter(s => {
        const sd = new Date(s.date);
        return sd.getMonth() === m && sd.getFullYear() === y && s.status === 'paid';
      }).reduce((s, x) => s + x.total, 0);
    });

    const avg = monthlyRevenue.reduce((s, r) => s + r, 0) / 6;
    const lastMonth = monthlyRevenue[5] || 0;
    const trend = monthlyRevenue.length > 1 ? monthlyRevenue[5] - monthlyRevenue[4] : 0;
    const forecast = Math.max(0, lastMonth + trend * 0.7);
    const trendPct = lastMonth > 0 ? (trend / lastMonth * 100).toFixed(1) : 0;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const nextMonth = months[(now.getMonth() + 1) % 12];

    return `📈 <strong>Revenue Forecast</strong><br><br>
      <strong>Last 6 Months:</strong>
      <ul>
        ${monthlyRevenue.map((r, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const label = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      return `<li>${label}: <strong>${fmtCurrency(r)}</strong></li>`;
    }).join('')}
      </ul>
      <strong>6-Month Average:</strong> ${fmtCurrency(avg)}<br>
      <strong>Month-over-Month Trend:</strong> ${trend >= 0 ? '▲' : '▼'} ${Math.abs(trendPct)}%<br><br>
      <strong>🔮 ${nextMonth} Forecast: ${fmtCurrency(forecast)}</strong><br><br>
      ${trend > 0 ? '✅ Business is growing! Keep up the good work.' : trend < 0 ? '⚠️ Revenue declining — focus on new customer acquisition and upselling.' : '📊 Revenue is stable — explore new markets to drive growth.'}`;
  },

  _gstCheck() {
    const sales = DB.getSales();
    const purchases = DB.getPurchases();
    const products = DB.getProducts();
    const biz = DB.getBiz();
    const customers = DB.getCustomers();
    const suppliers = DB.getSuppliers();

    const issues = [];
    const warnings = [];

    // Check business profile
    if (!biz.gstin) issues.push('❌ Business GSTIN not set in Settings');
    else if (!validateGSTIN(biz.gstin)) issues.push(`❌ Business GSTIN "${biz.gstin}" appears invalid`);

    // Check products for missing HSN
    const missingHSN = products.filter(p => !p.hsn);
    if (missingHSN.length) warnings.push(`⚠️ ${missingHSN.length} product${missingHSN.length > 1 ? 's' : ''} missing HSN/SAC code: ${missingHSN.slice(0, 2).map(p => p.name).join(', ')}`);

    // Check invoices
    const missingHSNInvoice = sales.filter(s => (s.items || []).some(item => !item.hsn));
    if (missingHSNInvoice.length) warnings.push(`⚠️ ${missingHSNInvoice.length} invoice(s) have items without HSN codes`);

    // Check registered customers with invalid GSTIN
    customers.filter(c => c.gstin).forEach(c => {
      if (!validateGSTIN(c.gstin)) warnings.push(`⚠️ Customer "${c.name}" has invalid GSTIN: ${c.gstin}`);
    });

    // GST filing status
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthInvoices = sales.filter(s => {
      const d = new Date(s.date);
      return d.getFullYear() === prevMonth.getFullYear() && d.getMonth() === prevMonth.getMonth();
    });

    const gstr1Due = new Date(now.getFullYear(), now.getMonth(), 11);
    const isDue = now >= gstr1Due;

    return `🔍 <strong>GST Compliance Check</strong><br><br>
      <strong>Your GST Profile:</strong>
      <ul>
        <li>GSTIN: ${biz.gstin ? `<strong>${biz.gstin}</strong> ${validateGSTIN(biz.gstin) ? '✅' : '❌ Invalid format'}` : '❌ Not set'}</li>
        <li>State: ${biz.state} (${biz.stateCode})</li>
        <li>Business Name: ${biz.name}</li>
      </ul>
      <strong>Issues Found (${issues.length}):</strong>
      ${issues.length ? `<ul>${issues.map(i => `<li>${i}</li>`).join('')}</ul>` : '<ul><li>✅ No critical issues!</li></ul>'}
      <strong>Warnings (${warnings.length}):</strong>
      ${warnings.length ? `<ul>${warnings.map(w => `<li>${w}</li>`).join('')}</ul>` : '<ul><li>✅ No warnings!</li></ul>'}
      <strong>GSTR-1 Status:</strong>
      <ul>
        <li>Previous month invoices: ${prevMonthInvoices.length}</li>
        <li>Filing due: 11th of current month ${isDue ? '⚠️ <strong>DUE NOW!</strong>' : '✅ Not yet due'}</li>
        <li>Go to <strong>GST Returns</strong> tab to view and export your GSTR-1 data</li>
      </ul>`;
  },

  _topPerformers() {
    const sales = DB.getSales();

    const custMap = {};
    sales.filter(s => s.status === 'paid').forEach(s => {
      if (!custMap[s.customerId]) custMap[s.customerId] = { name: s.customerName, revenue: 0, count: 0 };
      custMap[s.customerId].revenue += s.total;
      custMap[s.customerId].count++;
    });
    const topCustomers = Object.values(custMap).sort((a, b) => b.revenue - a.revenue).slice(0, 3);

    const prodMap = {};
    sales.forEach(s => (s.items || []).forEach(item => {
      if (!prodMap[item.name]) prodMap[item.name] = { name: item.name, revenue: 0, qty: 0 };
      prodMap[item.name].revenue += item.totalAmt || 0;
      prodMap[item.name].qty += item.qty || 0;
    }));
    const topProducts = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue).slice(0, 3);

    return `🏆 <strong>Top Performers Analysis</strong><br><br>
      <strong>🌟 Top 3 Customers:</strong>
      <ul>
        ${topCustomers.length ? topCustomers.map((c, i) => `<li>${['🥇', '🥈', '🥉'][i]} <strong>${c.name}</strong> — ${fmtCurrency(c.revenue)} (${c.count} invoices)</li>`).join('') : '<li>No paid invoices yet</li>'}
      </ul>
      <strong>🛍️ Top 3 Products:</strong>
      <ul>
        ${topProducts.length ? topProducts.map((p, i) => `<li>${['🥇', '🥈', '🥉'][i]} <strong>${p.name}</strong> — ${fmtCurrency(p.revenue)} (${p.qty} units)</li>`).join('') : '<li>No sales data yet</li>'}
      </ul>
      <strong>💡 Growth Opportunities:</strong>
      <ul>
        ${topCustomers[0] ? `<li>Upsell premium products to <strong>${topCustomers[0].name}</strong> — your top buyer</li>` : ''}
        ${topProducts[0] ? `<li>Stock more <strong>${topProducts[0].name}</strong> — your best-selling product</li>` : ''}
        <li>Offer loyalty discounts to repeat customers to improve retention</li>
        <li>Cross-sell related products to increase average order value</li>
      </ul>`;
  },

  generatePO() {
    const lowStock = DB.getProducts().filter(p => p.reorderLevel > 0 && p.stock <= p.reorderLevel);
    if (!lowStock.length) { App.toast('No items to reorder', 'info'); return; }
    App.navigate('#billing-purchases');
    App.toast(`💡 Navigate to Purchase Bills and create orders for ${lowStock.length} items`, 'info');
  },

  renderReorderAlert() {
    AI.render(document.getElementById('page-content'));
    // Scroll to reorder table
    setTimeout(() => {
      const table = document.querySelector('.ai-feature-card');
      if (table) table.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }
};
