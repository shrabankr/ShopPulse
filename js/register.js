'use strict';

/* ─────────────────────────────────────────────
   Register Module — Daily Cash Register,
   Shift Balancing & Day-End Z-Report
───────────────────────────────────────────── */
const Register = {
  render(container) {
    const biz = DB.getBiz();
    const currentReg = DB.getCurrentRegister();
    const allRegs = DB.getRegisters();
    const calc = currentReg ? DB.calcRegisterExpectedCash(currentReg) : null;

    let activeShiftCard = '';
    if (currentReg) {
      const openedDate = new Date(currentReg.openedAt);
      const hoursOpen = Math.max(0, ((Date.now() - openedDate.getTime()) / (1000 * 60 * 60))).toFixed(1);

      activeShiftCard = `
        <div class="card" style="margin-bottom:20px;border-top:4px solid var(--success)">
          <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
            <div>
              <div style="display:flex;align-items:center;gap:8px">
                <span class="badge" style="background:#10b981;color:#fff;font-weight:700">ACTIVE SHIFT OPEN</span>
                <strong style="font-size:1rem;color:var(--text-primary)">${currentReg.shiftNo || currentReg.id}</strong>
              </div>
              <div style="font-size:.78rem;color:var(--text-secondary);margin-top:4px">
                Opened by <strong>${currentReg.openedBy}</strong> on ${fmtDate(currentReg.date)} at ${openedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${hoursOpen} hrs ago)
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-secondary btn-sm" onclick="Register.openCashMovementModal('in')" title="Add Float or Cash into Drawer">
                <span class="material-icons" style="font-size:16px">add_circle</span> Cash In
              </button>
              <button class="btn btn-secondary btn-sm" onclick="Register.openCashMovementModal('out')" title="Take Petty Cash out for Expenses / Drops">
                <span class="material-icons" style="font-size:16px">remove_circle</span> Cash Drop
              </button>
              <button class="btn btn-primary btn-sm" onclick="Register.openCloseShiftModal('${currentReg.id}')" style="background:#0f172a">
                <span class="material-icons" style="font-size:16px">lock</span> Close Shift &amp; Z-Report
              </button>
            </div>
          </div>
          <div class="card-body">
            <!-- 4-Column Cash Drawer KPIs -->
            <div class="kpi-grid" style="margin-bottom:16px">
              <div class="kpi-card" style="border-left:4px solid #3b82f6">
                <div class="kpi-label">Opening Float</div>
                <div class="kpi-value" style="color:#2563eb">${fmtCurrency(calc.openingFloat)}</div>
                <div style="font-size:.72rem;color:var(--text-secondary)">Drawer cash at shift start</div>
              </div>

              <div class="kpi-card" style="border-left:4px solid #10b981">
                <div class="kpi-label">Cash Inflow Today</div>
                <div class="kpi-value" style="color:#059669">${fmtCurrency(calc.cashSales + calc.cashReceivedDue + calc.manualCashIn)}</div>
                <div style="font-size:.72rem;color:var(--text-secondary)">Sales (₹${calc.cashSales}) + Dues (₹${calc.cashReceivedDue})</div>
              </div>

              <div class="kpi-card" style="border-left:4px solid #f59e0b">
                <div class="kpi-label">Cash Outflow Today</div>
                <div class="kpi-value" style="color:#d97706">${fmtCurrency(calc.cashExpenses + calc.cashPurchases + calc.manualCashOut)}</div>
                <div style="font-size:.72rem;color:var(--text-secondary)">Expenses (₹${calc.cashExpenses}) + Drops (₹${calc.manualCashOut})</div>
              </div>

              <div class="kpi-card" style="border-left:4px solid #8b5cf6;background:#faf5ff">
                <div class="kpi-label" style="color:#6b21a8;font-weight:700">Expected Till Cash</div>
                <div class="kpi-value" style="color:#6b21a8;font-size:1.6rem">${fmtCurrency(calc.systemExpectedCash)}</div>
                <div style="font-size:.72rem;color:#7e22ce;font-weight:600">Must be physically in drawer</div>
              </div>
            </div>

            <!-- Tender Breakdown Strip -->
            <div style="display:flex;gap:12px;flex-wrap:wrap;padding:12px 14px;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border);align-items:center">
              <span style="font-size:.8rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase">Shift Non-Cash Revenue:</span>
              <span class="badge" style="background:#e0f2fe;color:#0369a1;padding:4px 10px;font-size:.8rem">
                📲 UPI / QR: <strong>${fmtCurrency(calc.upiSales)}</strong>
              </span>
              <span class="badge" style="background:#f1f5f9;color:#334155;padding:4px 10px;font-size:.8rem">
                💳 Cards / POS: <strong>${fmtCurrency(calc.cardSales)}</strong>
              </span>
              ${calc.otherSales > 0 ? `
              <span class="badge" style="background:#fef3c7;color:#92400e;padding:4px 10px;font-size:.8rem">
                🏦 Bank / Cheque: <strong>${fmtCurrency(calc.otherSales)}</strong>
              </span>
              ` : ''}
              <span style="margin-left:auto;font-size:.85rem;font-weight:700;color:var(--text-primary)">
                Gross Shift Revenue: <strong style="color:var(--primary)">${fmtCurrency(calc.totalSales)}</strong>
              </span>
            </div>
          </div>
        </div>
      `;
    } else {
      activeShiftCard = `
        <div class="card" style="margin-bottom:20px;border-top:4px solid #64748b;background:#f8fafc">
          <div class="card-body" style="text-align:center;padding:32px 20px">
            <span class="material-icons" style="font-size:48px;color:#94a3b8;margin-bottom:8px">point_of_sale</span>
            <h3 style="margin-bottom:6px;color:var(--text-primary)">No Active Cash Register Shift</h3>
            <p style="font-size:.85rem;color:var(--text-secondary);max-width:500px;margin:0 auto 16px">
              Opening a morning shift sets the starting cash drawer float and enables real-time tracking of cash sales, UPI collections, and cash expenses.
            </p>
            <button class="btn btn-primary" onclick="Register.openShiftModal()" style="font-size:.9rem;padding:8px 18px">
              <span class="material-icons" style="font-size:18px">play_arrow</span> Open Register &amp; Start Shift
            </button>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="page-header-row">
        <div>
          <h2>Cash Register &amp; Shift Balancing</h2>
          <div style="font-size:.82rem;color:var(--text-secondary)">Point of Sale Cash Drawer Balancing, Denomination Counting &amp; Day-End Z-Reports</div>
        </div>
        <div class="actions">
          ${!currentReg ? `
            <button class="btn btn-primary" onclick="Register.openShiftModal()">
              <span class="material-icons">play_arrow</span> Open Shift
            </button>
          ` : `
            <button class="btn btn-secondary btn-sm" onclick="Register.viewZReport('${currentReg.id}')">
              <span class="material-icons">preview</span> Live Shift Preview
            </button>
          `}
        </div>
      </div>

      ${activeShiftCard}

      <!-- Past Shifts & Z-Report History Table -->
      <div class="card">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
          <strong style="display:flex;align-items:center;gap:6px">
            <span class="material-icons" style="font-size:18px;color:var(--primary)">history</span>
            Register Shift History &amp; Z-Reports (${allRegs.length})
          </strong>
        </div>
        <div class="table-wrap">
          <table class="table" style="font-size:.85rem">
            <thead>
              <tr>
                <th>Shift No.</th>
                <th>Date &amp; Time</th>
                <th>Cashier / Opened By</th>
                <th class="text-right">Float</th>
                <th class="text-right">Expected Cash</th>
                <th class="text-right">Counted Cash</th>
                <th class="text-right">Discrepancy</th>
                <th>Status</th>
                <th class="action-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${allRegs.length === 0 ? `
                <tr><td colspan="9" class="table-empty">No cash register shifts recorded yet.</td></tr>
              ` : allRegs.map(r => {
                const isClosed = r.status === 'closed';
                const disc = r.cashDiscrepancy || 0;
                let discBadge = `<span style="color:var(--text-muted)">—</span>`;
                if (isClosed) {
                  if (Math.abs(disc) < 0.01) discBadge = `<span class="badge" style="background:#dcfce7;color:#166534">Balanced (₹0)</span>`;
                  else if (disc < 0) discBadge = `<span class="badge" style="background:#fee2e2;color:#991b1b">Short: -₹${Math.abs(disc).toFixed(2)}</span>`;
                  else discBadge = `<span class="badge" style="background:#fef3c7;color:#92400e">Excess: +₹${disc.toFixed(2)}</span>`;
                }

                return `
                  <tr>
                    <td><strong>${r.shiftNo || r.id}</strong></td>
                    <td>
                      <div>${fmtDate(r.date)}</div>
                      <div style="font-size:.72rem;color:var(--text-secondary)">
                        ${new Date(r.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        ${r.closedAt ? ` → ${new Date(r.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                      </div>
                    </td>
                    <td>${r.openedBy || '—'}${r.closedBy ? `<div style="font-size:.72rem;color:var(--text-secondary)">Closed by ${r.closedBy}</div>` : ''}</td>
                    <td class="text-right">${fmtCurrency(r.openingFloat)}</td>
                    <td class="text-right font-bold">${fmtCurrency(r.systemExpectedCash || r.openingFloat)}</td>
                    <td class="text-right font-bold" style="color:${isClosed ? 'var(--text-primary)' : 'var(--text-muted)'}">${isClosed ? fmtCurrency(r.actualPhysicalCash) : 'Open…'}</td>
                    <td class="text-right">${discBadge}</td>
                    <td>
                      ${r.status === 'open' 
                        ? `<span class="badge" style="background:#10b981;color:#fff">OPEN</span>` 
                        : `<span class="badge" style="background:#e2e8f0;color:#334155">CLOSED</span>`}
                    </td>
                    <td class="action-col">
                      <button class="btn btn-xs btn-secondary" onclick="Register.viewZReport('${r.id}')" title="View &amp; Print Day-End Z-Report">
                        <span class="material-icons" style="font-size:14px">receipt</span> Z-Report
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  openShiftModal() {
    const today = new Date().toISOString().split('T')[0];
    const biz = DB.getBiz();

    App.modal('🟢 Open Cash Register & Start Shift',
      `
      <div class="form-grid" style="font-size:.85rem">
        <div class="form-group form-full">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <label style="margin:0">Opening Cash Float (₹) <span class="required">*</span></label>
            <div style="display:flex;gap:4px">
              <button type="button" class="btn btn-xs btn-ghost" onclick="document.getElementById('reg-float').value = 0;">₹0</button>
              <button type="button" class="btn btn-xs btn-ghost" onclick="document.getElementById('reg-float').value = 1000;">₹1,000</button>
              <button type="button" class="btn btn-xs btn-ghost" onclick="document.getElementById('reg-float').value = 2000;">₹2,000</button>
              <button type="button" class="btn btn-xs btn-ghost" onclick="document.getElementById('reg-float').value = 5000;">₹5,000</button>
            </div>
          </div>
          <input type="number" id="reg-float" value="2000" step="10" min="0" style="font-size:1.15rem;font-weight:700">
          <small style="color:var(--text-secondary)">Starting cash change loaded into the register till at store opening.</small>
        </div>

        <div class="form-group">
          <label>Shift Date</label>
          <input type="date" id="reg-date" value="${today}">
        </div>

        <div class="form-group">
          <label>Cashier / Staff Name <span class="required">*</span></label>
          <input type="text" id="reg-cashier" value="${DB.getRole() === 'staff' ? 'Counter Staff' : (biz.signatory || 'Store Manager')}" placeholder="e.g. Ramesh / Suresh">
        </div>

        <div class="form-group form-full">
          <label>Notes / Handover Remarks (Optional)</label>
          <textarea id="reg-notes" rows="2" placeholder="e.g. Morning opening shift with standard change float."></textarea>
        </div>
      </div>
      `,
      `
      <button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="Register._saveOpenShift()"><span class="material-icons">play_arrow</span> Start Shift</button>
      `,
      'modal-md'
    );
  },

  _saveOpenShift() {
    const floatAmt = parseFloat(document.getElementById('reg-float')?.value) || 0;
    const openedBy = (document.getElementById('reg-cashier')?.value || '').trim() || 'Counter Staff';
    const notes = (document.getElementById('reg-notes')?.value || '').trim();

    const res = DB.openRegister(floatAmt, openedBy, notes);
    if (!res.success) {
      App.toast(res.message, 'error');
      return;
    }

    App.closeModal();
    App.refreshSidebar();
    App.toast(`🟢 Cash Register shift ${res.register.shiftNo} opened with ${fmtCurrency(floatAmt)} float!`, 'success');
    this.render(document.getElementById('page-content'));
  },

  openCashMovementModal(type = 'in') {
    const reg = DB.getCurrentRegister();
    if (!reg) return;
    const isIn = type === 'in';

    App.modal(isIn ? '💰 Cash In — Add Drawer Float' : '💸 Cash Drop — Petty Cash Out',
      `
      <div class="form-grid" style="font-size:.85rem">
        <div class="form-group form-full">
          <label>Amount to ${isIn ? 'Deposit' : 'Withdraw'} (₹) <span class="required">*</span></label>
          <input type="number" id="mov-amount" min="1" step="10" placeholder="e.g. 500 or 1000" style="font-size:1.15rem;font-weight:700">
        </div>
        <div class="form-group form-full">
          <label>Reason / Narration <span class="required">*</span></label>
          <input type="text" id="mov-reason" placeholder="${isIn ? 'e.g. Added change from bank / Owner top-up' : 'e.g. Tea & snacks / Courier cash / Handover to owner'}">
        </div>
      </div>
      `,
      `
      <button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="Register._saveCashMovement('${reg.id}', '${type}')">
        <span class="material-icons">save</span> Record ${isIn ? 'Cash In' : 'Cash Drop'}
      </button>
      `,
      'modal-sm'
    );
  },

  _saveCashMovement(regId, type) {
    const amt = parseFloat(document.getElementById('mov-amount')?.value) || 0;
    const reason = (document.getElementById('mov-reason')?.value || '').trim();
    if (amt <= 0) {
      App.toast('Please enter a valid amount', 'error');
      return;
    }
    if (!reason) {
      App.toast('Please enter a reason', 'error');
      return;
    }

    DB.addRegisterCashMovement(regId, type, amt, reason);
    App.closeModal();
    App.toast(`✅ Recorded ${type === 'in' ? 'Cash In' : 'Cash Drop'} of ${fmtCurrency(amt)}!`, 'info');
    this.render(document.getElementById('page-content'));
  },

  openCloseShiftModal(registerId) {
    const reg = DB.getRegisterById(registerId);
    if (!reg) return;
    const calc = DB.calcRegisterExpectedCash(reg);
    const biz = DB.getBiz();

    window._closeShiftExpected = calc.systemExpectedCash;

    App.modal(`🔒 Close Shift &amp; Day-End Z-Report — ${reg.shiftNo}`,
      `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;background:var(--bg);padding:10px 14px;border-radius:var(--radius-sm);border:1px solid var(--border)">
        <div>
          <div style="font-size:.72rem;color:var(--text-secondary);text-transform:uppercase;font-weight:700">Shift Started</div>
          <div style="font-size:.9rem;font-weight:700">${new Date(reg.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by ${reg.openedBy}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:.72rem;color:var(--text-secondary);text-transform:uppercase;font-weight:700">System Expected Cash</div>
          <div style="font-size:1.15rem;font-weight:900;color:var(--primary)">${fmtCurrency(calc.systemExpectedCash)}</div>
        </div>
      </div>

      <!-- Indian Currency Denomination Note Counter -->
      <div class="card" style="margin-bottom:14px;border:1px solid var(--border)">
        <div class="card-header" style="padding:8px 12px;background:#f8fafc">
          <strong style="font-size:.82rem;color:var(--text-primary);display:flex;align-items:center;gap:6px">
            <span class="material-icons" style="font-size:16px;color:#2563eb">payments</span>
            Physical Currency Note Counter (Denominations)
          </strong>
        </div>
        <div class="card-body" style="padding:10px">
          <table class="table table-sm" style="font-size:.82rem;margin:0">
            <thead style="background:var(--bg)">
              <tr>
                <th style="width:110px">Note</th>
                <th style="width:100px">Count (Pieces)</th>
                <th class="text-right">Subtotal (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>₹500</strong> Note</td>
                <td><input type="number" id="c-500" min="0" step="1" value="0" style="width:85px;padding:3px 6px;font-weight:700" oninput="Register._calcDenominations()"></td>
                <td class="text-right font-bold" id="sub-500">₹0.00</td>
              </tr>
              <tr>
                <td><strong>₹200</strong> Note</td>
                <td><input type="number" id="c-200" min="0" step="1" value="0" style="width:85px;padding:3px 6px;font-weight:700" oninput="Register._calcDenominations()"></td>
                <td class="text-right font-bold" id="sub-200">₹0.00</td>
              </tr>
              <tr>
                <td><strong>₹100</strong> Note</td>
                <td><input type="number" id="c-100" min="0" step="1" value="0" style="width:85px;padding:3px 6px;font-weight:700" oninput="Register._calcDenominations()"></td>
                <td class="text-right font-bold" id="sub-100">₹0.00</td>
              </tr>
              <tr>
                <td><strong>₹50</strong> Note</td>
                <td><input type="number" id="c-50" min="0" step="1" value="0" style="width:85px;padding:3px 6px;font-weight:700" oninput="Register._calcDenominations()"></td>
                <td class="text-right font-bold" id="sub-50">₹0.00</td>
              </tr>
              <tr>
                <td><strong>₹20</strong> Note</td>
                <td><input type="number" id="c-20" min="0" step="1" value="0" style="width:85px;padding:3px 6px;font-weight:700" oninput="Register._calcDenominations()"></td>
                <td class="text-right font-bold" id="sub-20">₹0.00</td>
              </tr>
              <tr>
                <td><strong>₹10</strong> Note</td>
                <td><input type="number" id="c-10" min="0" step="1" value="0" style="width:85px;padding:3px 6px;font-weight:700" oninput="Register._calcDenominations()"></td>
                <td class="text-right font-bold" id="sub-10">₹0.00</td>
              </tr>
              <tr>
                <td><strong>Coins</strong> (Any)</td>
                <td><input type="number" id="c-coins" min="0" step="1" value="0" style="width:85px;padding:3px 6px;font-weight:700" oninput="Register._calcDenominations()"></td>
                <td class="text-right font-bold" id="sub-coins">₹0.00</td>
              </tr>
            </tbody>
            <tfoot style="background:#f1f5f9;font-weight:800">
              <tr>
                <td colspan="2">TOTAL PHYSICAL CASH COUNTED:</td>
                <td class="text-right" id="denom-total-box" style="font-size:1rem;color:var(--text-primary)">₹0.00</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Discrepancy Alert Box -->
      <div id="shift-discrepancy-card" style="padding:10px 14px;border-radius:var(--radius-sm);margin-bottom:14px;background:#f8fafc;border:1px dashed #cbd5e1;text-align:center">
        <div style="font-size:.78rem;color:var(--text-secondary);text-transform:uppercase">Cash Drawer Variance</div>
        <div id="shift-discrepancy-text" style="font-size:1.1rem;font-weight:800;color:var(--text-muted);margin-top:2px">Enter denomination counts above</div>
      </div>

      <div class="form-grid" style="font-size:.85rem">
        <div class="form-group">
          <label>Closed By / Approved By <span class="required">*</span></label>
          <input type="text" id="reg-close-by" value="${biz.signatory || 'Owner'}" placeholder="e.g. Shraban (Owner)">
        </div>
        <div class="form-group">
          <label>Handover Status</label>
          <select id="reg-handover-status">
            <option value="owner">Handed over directly to Owner</option>
            <option value="safe">Deposited in Shop Safe</option>
            <option value="next_shift">Left in drawer for Next Shift Cashier</option>
          </select>
        </div>
        <div class="form-group form-full">
          <label>Closing Notes / Discrepancy Reason</label>
          <textarea id="reg-close-notes" rows="2" placeholder="e.g. Balanced drawer perfectly. Cash deposited in safe."></textarea>
        </div>
      </div>
      `,
      `
      <button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="Register._submitCloseShift('${reg.id}')" style="background:#0f172a">
        <span class="material-icons">receipt_long</span> Confirm &amp; Print Z-Report
      </button>
      `,
      'modal-md'
    );

    setTimeout(() => this._calcDenominations(), 50);
  },

  _calcDenominations() {
    const n500 = (parseInt(document.getElementById('c-500')?.value) || 0) * 500;
    const n200 = (parseInt(document.getElementById('c-200')?.value) || 0) * 200;
    const n100 = (parseInt(document.getElementById('c-100')?.value) || 0) * 100;
    const n50  = (parseInt(document.getElementById('c-50')?.value)  || 0) * 50;
    const n20  = (parseInt(document.getElementById('c-20')?.value)  || 0) * 20;
    const n10  = (parseInt(document.getElementById('c-10')?.value)  || 0) * 10;
    const coins = parseFloat(document.getElementById('c-coins')?.value) || 0;

    const setSub = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = fmtCurrency(val); };
    setSub('sub-500', n500);
    setSub('sub-200', n200);
    setSub('sub-100', n100);
    setSub('sub-50', n50);
    setSub('sub-20', n20);
    setSub('sub-10', n10);
    setSub('sub-coins', coins);

    const totalCounted = n500 + n200 + n100 + n50 + n20 + n10 + coins;
    const totalBox = document.getElementById('denom-total-box');
    if (totalBox) totalBox.textContent = fmtCurrency(totalCounted);

    const expected = window._closeShiftExpected || 0;
    const diff = Math.round((totalCounted - expected) * 100) / 100;
    const card = document.getElementById('shift-discrepancy-card');
    const text = document.getElementById('shift-discrepancy-text');

    if (text && card) {
      if (Math.abs(diff) < 0.01) {
        card.style.background = '#dcfce7';
        card.style.borderColor = '#86efac';
        text.style.color = '#15803d';
        text.innerHTML = `✅ Perfect Balance! Expected ${fmtCurrency(expected)} == Counted ${fmtCurrency(totalCounted)} (₹0.00 Variance)`;
      } else if (diff < 0) {
        card.style.background = '#fee2e2';
        card.style.borderColor = '#fca5a5';
        text.style.color = '#b91c1c';
        text.innerHTML = `⚠️ Shortage: Cash Short by ${fmtCurrency(Math.abs(diff))} (Expected ${fmtCurrency(expected)} vs Counted ${fmtCurrency(totalCounted)})`;
      } else {
        card.style.background = '#fef3c7';
        card.style.borderColor = '#fcd34d';
        text.style.color = '#b45309';
        text.innerHTML = `🟡 Overage: Cash Excess by ${fmtCurrency(diff)} (Expected ${fmtCurrency(expected)} vs Counted ${fmtCurrency(totalCounted)})`;
      }
    }
  },

  _submitCloseShift(regId) {
    const denoms = {
      n500: parseInt(document.getElementById('c-500')?.value) || 0,
      n200: parseInt(document.getElementById('c-200')?.value) || 0,
      n100: parseInt(document.getElementById('c-100')?.value) || 0,
      n50:  parseInt(document.getElementById('c-50')?.value)  || 0,
      n20:  parseInt(document.getElementById('c-20')?.value)  || 0,
      n10:  parseInt(document.getElementById('c-10')?.value)  || 0,
      coins: parseFloat(document.getElementById('c-coins')?.value) || 0
    };

    const closedBy = (document.getElementById('reg-close-by')?.value || '').trim() || 'Owner';
    const handover = document.getElementById('reg-handover-status')?.value || 'owner';
    const notes = (document.getElementById('reg-close-notes')?.value || '').trim();

    const fullNotes = `Handover: ${handover}. ${notes}`.trim();

    const res = DB.closeRegister(regId, denoms, fullNotes, closedBy);
    if (!res.success) {
      App.toast(res.message, 'error');
      return;
    }

    App.closeModal();
    App.refreshSidebar();
    App.toast(`🎉 Shift ${res.register.shiftNo} closed successfully! Opening Z-Report...`, 'success');
    this.render(document.getElementById('page-content'));

    setTimeout(() => {
      this.viewZReport(regId);
    }, 400);
  },

  viewZReport(regId) {
    const reg = DB.getRegisterById(regId);
    if (!reg) return;

    App.modal(`📄 Day-End Register Z-Report — ${reg.shiftNo || reg.id}`,
      `
      <div style="display:flex;justify-content:center;gap:10px;margin-bottom:14px">
        <button class="btn btn-sm btn-secondary" onclick="Register._previewFormat('${regId}', 'compact_pos')">
          <span class="material-icons" style="font-size:15px">receipt</span> 3" Thermal POS Slip
        </button>
        <button class="btn btn-sm btn-secondary" onclick="Register._previewFormat('${regId}', 'a4')">
          <span class="material-icons" style="font-size:15px">description</span> A4 Audit Statement
        </button>
      </div>
      <div id="z-report-frame-wrap" style="border:1px solid var(--border);border-radius:var(--radius-sm);background:#fff;max-height:550px;overflow-y:auto;padding:10px">
        <iframe id="z-report-frame" style="width:100%;height:500px;border:none"></iframe>
      </div>
      `,
      `
      <button class="btn btn-ghost" onclick="App.closeModal()">Close</button>
      <button class="btn btn-secondary" onclick="Register.printZReport('${regId}', 'a4')">
        <span class="material-icons">picture_as_pdf</span> Print A4
      </button>
      <button class="btn btn-primary" onclick="Register.printZReport('${regId}', 'compact_pos')">
        <span class="material-icons">print</span> 🖨️ Print 3" POS Slip
      </button>
      `,
      'modal-lg'
    );

    setTimeout(() => this._previewFormat(regId, 'compact_pos'), 50);
  },

  _previewFormat(regId, format = 'compact_pos') {
    const frame = document.getElementById('z-report-frame');
    if (!frame) return;
    const html = this.generateZReportHtml(regId, format);
    frame.srcdoc = html;
  },

  generateZReportHtml(regId, format = 'compact_pos') {
    const reg = DB.getRegisterById(regId);
    if (!reg) return '';
    const biz = DB.getBiz();
    const calc = reg.status === 'closed' ? reg : DB.calcRegisterExpectedCash(reg);

    const openedTime = new Date(reg.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const closedTime = reg.closedAt ? new Date(reg.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Still Open';
    const denoms = reg.closingDenominations || {};

    const disc = reg.cashDiscrepancy != null ? reg.cashDiscrepancy : (calc.systemExpectedCash - calc.openingFloat);

    // ─── 1. 3" THERMAL POS SLIP (80MM ROLL) ───
    if (format === 'compact_pos') {
      return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Z-Report - ${reg.shiftNo || reg.id}</title>
<style>
@page { size: 80mm auto; margin: 2mm; }
body { font-family: 'Courier New', Courier, monospace, sans-serif; font-size: 8.5pt; color: #000; width: 74mm; margin: 0 auto; padding: 4px 2px; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.bold { font-weight: 700; }
.divider { border-top: 1px dashed #000; margin: 5px 0; }
.title { font-size: 11pt; font-weight: 900; }
.sub { font-size: 7.5pt; line-height: 1.3; }
table { width: 100%; border-collapse: collapse; font-size: 8pt; }
table td { padding: 2px 0; vertical-align: top; }
@media print { body { width: 100%; } }
</style>
</head>
<body>
<div class="text-center">
  <div class="title">${biz.name}</div>
  <div class="sub">${biz.address}, ${biz.city} — ${biz.pincode}<br>GSTIN: ${biz.gstin || '—'} | Phone: ${biz.phone}</div>
  <div class="divider"></div>
  <div style="font-weight:900;font-size:9.5pt;letter-spacing:0.5px">DAILY REGISTER Z-REPORT</div>
  <div style="font-size:7.5pt">Shift: ${reg.shiftNo || reg.id} | Date: ${fmtDate(reg.date)}</div>
</div>

<div class="divider"></div>
<table>
  <tr><td>Opened:</td><td class="text-right">${openedTime} (${reg.openedBy})</td></tr>
  <tr><td>Closed:</td><td class="text-right">${closedTime} (${reg.closedBy || '—'})</td></tr>
  <tr><td>Status:</td><td class="text-right bold">${reg.status.toUpperCase()}</td></tr>
</table>

<div class="divider"></div>
<div class="bold" style="font-size:8pt;margin-bottom:2px">CASH RECONCILIATION</div>
<table>
  <tr><td>Opening Float:</td><td class="text-right">${fmtCurrency(calc.openingFloat)}</td></tr>
  <tr><td>+ Cash Sales:</td><td class="text-right">${fmtCurrency(calc.cashSales)}</td></tr>
  <tr><td>+ Dues Collected:</td><td class="text-right">${fmtCurrency(calc.cashReceivedDue)}</td></tr>
  ${calc.manualCashIn > 0 ? `<tr><td>+ Cash Drops In:</td><td class="text-right">${fmtCurrency(calc.manualCashIn)}</td></tr>` : ''}
  <tr><td>- Cash Expenses:</td><td class="text-right">-${fmtCurrency(calc.cashExpenses)}</td></tr>
  ${calc.cashPurchases > 0 ? `<tr><td>- Cash Purchases:</td><td class="text-right">-${fmtCurrency(calc.cashPurchases)}</td></tr>` : ''}
  ${calc.manualCashOut > 0 ? `<tr><td>- Petty Cash Out:</td><td class="text-right">-${fmtCurrency(calc.manualCashOut)}</td></tr>` : ''}
  <tr style="border-top:1px solid #000;border-bottom:1px solid #000;font-weight:900">
    <td>EXPECTED TILL CASH:</td>
    <td class="text-right">${fmtCurrency(calc.systemExpectedCash)}</td>
  </tr>
  ${reg.status === 'closed' ? `
  <tr><td>PHYSICAL CASH COUNT:</td><td class="text-right bold">${fmtCurrency(reg.actualPhysicalCash)}</td></tr>
  <tr style="font-weight:900;font-size:9pt">
    <td>DRAWER VARIANCE:</td>
    <td class="text-right">${Math.abs(reg.cashDiscrepancy) < 0.01 ? 'BALANCED (₹0)' : (reg.cashDiscrepancy < 0 ? `SHORT -₹${Math.abs(reg.cashDiscrepancy).toFixed(2)}` : `EXCESS +₹${reg.cashDiscrepancy.toFixed(2)}`)}</td>
  </tr>
  ` : ''}
</table>

<div class="divider"></div>
<div class="bold" style="font-size:8pt;margin-bottom:2px">NON-CASH SALES SUMMARY</div>
<table>
  <tr><td>📲 UPI / QR:</td><td class="text-right">${fmtCurrency(calc.upiSales)}</td></tr>
  <tr><td>💳 Card / POS:</td><td class="text-right">${fmtCurrency(calc.cardSales)}</td></tr>
  ${calc.otherSales > 0 ? `<tr><td>🏦 Bank / Cheque:</td><td class="text-right">${fmtCurrency(calc.otherSales)}</td></tr>` : ''}
  <tr style="font-weight:900;border-top:1px solid #000">
    <td>GROSS SHIFT SALES:</td>
    <td class="text-right">${fmtCurrency(calc.totalSales)}</td>
  </tr>
</table>

${reg.status === 'closed' && (denoms.n500 || denoms.n200 || denoms.n100) ? `
<div class="divider"></div>
<div class="bold" style="font-size:7.5pt;margin-bottom:2px">COUNTED DENOMINATIONS:</div>
<div style="font-size:7pt;line-height:1.4">
  ${denoms.n500 ? `500x${denoms.n500} = ₹${denoms.n500 * 500} | ` : ''}
  ${denoms.n200 ? `200x${denoms.n200} = ₹${denoms.n200 * 200} | ` : ''}
  ${denoms.n100 ? `100x${denoms.n100} = ₹${denoms.n100 * 100} | ` : ''}
  ${denoms.n50 ? `50x${denoms.n50} = ₹${denoms.n50 * 50} | ` : ''}
  ${denoms.n20 ? `20x${denoms.n20} = ₹${denoms.n20 * 20} | ` : ''}
  ${denoms.n10 ? `10x${denoms.n10} = ₹${denoms.n10 * 10} | ` : ''}
  ${denoms.coins ? `Coins: ₹${denoms.coins}` : ''}
</div>
` : ''}

${reg.closeNotes ? `
<div class="divider"></div>
<div style="font-size:7pt"><strong>Notes:</strong> ${reg.closeNotes}</div>
` : ''}

<div class="divider"></div>
<div style="margin-top:18px;display:flex;justify-content:space-between;font-size:7pt">
  <div class="text-center" style="width:45%;border-top:1px solid #000;padding-top:2px">Cashier Signature</div>
  <div class="text-center" style="width:45%;border-top:1px solid #000;padding-top:2px">Manager / Owner</div>
</div>
<div class="text-center sub" style="margin-top:10px">Generated via ShopPulse System</div>
</body></html>`;
    }

    // ─── 2. A4 AUDIT STATEMENT ───
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Z-Report - ${reg.shiftNo || reg.id}</title>
<style>
@page { size: A4; margin: 15mm; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; color: #111; line-height: 1.5; padding: 10px; }
.header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
.biz-title { font-size: 16pt; font-weight: 800; color: #0f172a; }
.table-grid { width: 100%; border-collapse: collapse; margin-top: 10px; }
.table-grid th, .table-grid td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 9pt; }
.table-grid th { background: #f8fafc; text-align: left; font-size: 8.5pt; text-transform: uppercase; }
.kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.kpi-box { padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc; }
.kpi-box strong { font-size: 13pt; display: block; color: #0f172a; }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="biz-title">${biz.name}</div>
    <div style="font-size:8.5pt;color:#555">${biz.address}, ${biz.city} — ${biz.pincode} | GSTIN: ${biz.gstin || '—'}</div>
  </div>
  <div style="text-align:right">
    <h2 style="margin:0;color:#0f172a;font-size:14pt">DAY-END Z-REPORT</h2>
    <div style="font-size:9pt;font-weight:700">Shift No: ${reg.shiftNo || reg.id}</div>
    <div style="font-size:8.5pt;color:#666">Date: ${fmtDate(reg.date)}</div>
  </div>
</div>

<div class="kpi-row">
  <div class="kpi-box">
    <span style="font-size:7.5pt;color:#64748b;text-transform:uppercase;font-weight:700">Opening Float</span>
    <strong>${fmtCurrency(calc.openingFloat)}</strong>
  </div>
  <div class="kpi-box">
    <span style="font-size:7.5pt;color:#64748b;text-transform:uppercase;font-weight:700">Cash Sales</span>
    <strong style="color:#059669">${fmtCurrency(calc.cashSales)}</strong>
  </div>
  <div class="kpi-box">
    <span style="font-size:7.5pt;color:#64748b;text-transform:uppercase;font-weight:700">Expected Cash</span>
    <strong style="color:#2563eb">${fmtCurrency(calc.systemExpectedCash)}</strong>
  </div>
  <div class="kpi-box" style="background:${reg.status === 'closed' ? (Math.abs(reg.cashDiscrepancy) < 0.01 ? '#f0fdf4' : '#fef2f2') : '#f8fafc'}">
    <span style="font-size:7.5pt;color:#64748b;text-transform:uppercase;font-weight:700">Discrepancy</span>
    <strong style="color:${reg.status === 'closed' ? (Math.abs(reg.cashDiscrepancy) < 0.01 ? '#15803d' : '#b91c1c') : '#64748b'}">
      ${reg.status === 'closed' ? (Math.abs(reg.cashDiscrepancy) < 0.01 ? 'Balanced (₹0)' : `₹${reg.cashDiscrepancy.toFixed(2)}`) : 'In Progress'}
    </strong>
  </div>
</div>

<h4 style="margin:16px 0 6px;text-transform:uppercase;font-size:9pt;color:#0f172a">1. Financial Movements &amp; Tenders Reconciliation</h4>
<table class="table-grid">
  <thead>
    <tr><th>Category / Tender</th><th>Source / Direction</th><th style="text-align:right">Amount (₹)</th></tr>
  </thead>
  <tbody>
    <tr><td>Opening Cash Float</td><td>Morning Drawer Cash</td><td style="text-align:right">${fmtCurrency(calc.openingFloat)}</td></tr>
    <tr><td>Cash Sales Inflow</td><td>Invoices Settled in Cash</td><td style="text-align:right;color:#059669">+${fmtCurrency(calc.cashSales)}</td></tr>
    <tr><td>Receivables Overdue Collection</td><td>Cash Received on Outstanding Accounts</td><td style="text-align:right;color:#059669">+${fmtCurrency(calc.cashReceivedDue)}</td></tr>
    ${calc.manualCashIn > 0 ? `<tr><td>Manual Cash-In Drops</td><td>Additional Float Added</td><td style="text-align:right;color:#059669">+${fmtCurrency(calc.manualCashIn)}</td></tr>` : ''}
    <tr><td>Cash Operating Expenses</td><td>Tea, Courier, Transport, Petty Cash</td><td style="text-align:right;color:#dc2626">-${fmtCurrency(calc.cashExpenses)}</td></tr>
    ${calc.cashPurchases > 0 ? `<tr><td>Cash Inventory Purchases</td><td>Local Cash Purchases</td><td style="text-align:right;color:#dc2626">-${fmtCurrency(calc.cashPurchases)}</td></tr>` : ''}
    ${calc.manualCashOut > 0 ? `<tr><td>Petty Cash Drops Out</td><td>Owner Handover / Bank Drop</td><td style="text-align:right;color:#dc2626">-${fmtCurrency(calc.manualCashOut)}</td></tr>` : ''}
    <tr style="background:#f1f5f9;font-weight:800">
      <td colspan="2">TOTAL SYSTEM EXPECTED CASH IN DRAWER</td>
      <td style="text-align:right">${fmtCurrency(calc.systemExpectedCash)}</td>
    </tr>
    ${reg.status === 'closed' ? `
    <tr style="font-weight:700">
      <td colspan="2">PHYSICAL CASH COUNTED (DENOMINATIONS)</td>
      <td style="text-align:right">${fmtCurrency(reg.actualPhysicalCash)}</td>
    </tr>
    <tr style="background:${Math.abs(reg.cashDiscrepancy) < 0.01 ? '#dcfce7' : '#fee2e2'};font-weight:800;color:${Math.abs(reg.cashDiscrepancy) < 0.01 ? '#15803d' : '#991b1b'}">
      <td colspan="2">RECONCILIATION VARIANCE (OVERAGE / SHORTAGE)</td>
      <td style="text-align:right">${Math.abs(reg.cashDiscrepancy) < 0.01 ? 'PERFECTLY BALANCED (₹0.00)' : `₹${reg.cashDiscrepancy.toFixed(2)}`}</td>
    </tr>
    ` : ''}
  </tbody>
</table>

<h4 style="margin:20px 0 6px;text-transform:uppercase;font-size:9pt;color:#0f172a">2. Non-Cash &amp; Digital Tender Reconciliation</h4>
<table class="table-grid">
  <thead>
    <tr><th>Digital Tender</th><th>Gateway / Mode</th><th style="text-align:right">Amount (₹)</th></tr>
  </thead>
  <tbody>
    <tr><td>UPI / QR Collections</td><td>GPay / PhonePe / Paytm / BHIM</td><td style="text-align:right"><strong>${fmtCurrency(calc.upiSales)}</strong></td></tr>
    <tr><td>Card / POS Swipe</td><td>Debit / Credit Card EDC Machine</td><td style="text-align:right"><strong>${fmtCurrency(calc.cardSales)}</strong></td></tr>
    ${calc.otherSales > 0 ? `<tr><td>Direct Bank Transfer / NEFT / Cheque</td><td>Corporate / Bank Direct</td><td style="text-align:right"><strong>${fmtCurrency(calc.otherSales)}</strong></td></tr>` : ''}
    <tr style="background:#f1f5f9;font-weight:800">
      <td colspan="2">TOTAL GROSS REVENUE ACROSS ALL MODES</td>
      <td style="text-align:right;color:#2563eb">${fmtCurrency(calc.totalSales)}</td>
    </tr>
  </tbody>
</table>

<div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px">
  <div style="border-top:1px solid #94a3b8;padding-top:6px">
    <strong>Cashier Handover Signature</strong><br>
    <span style="font-size:8.5pt;color:#64748b">Name: ${reg.openedBy}</span>
  </div>
  <div style="border-top:1px solid #94a3b8;padding-top:6px;text-align:right">
    <strong>Store Manager / Owner Signature</strong><br>
    <span style="font-size:8.5pt;color:#64748b">Approved By: ${reg.closedBy || 'Owner'}</span>
  </div>
</div>
</body></html>`;
  },

  printZReport(regId, format = 'compact_pos') {
    const html = this.generateZReportHtml(regId, format);
    if (window.electronAPI && window.electronAPI.printNow) {
      window.electronAPI.printNow(html, { silent: false }).catch(() => {
        this._fallbackPrint(html);
      });
    } else {
      this._fallbackPrint(html);
    }
  },

  _fallbackPrint(html) {
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) {
      App.toast('Pop-up blocked. Please allow popups for printing.', 'warning');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 350);
  }
};
