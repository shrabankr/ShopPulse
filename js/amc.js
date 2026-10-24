'use strict';

/* ─────────────────────────────────────────────────────────────
   ShopPulse — AMC (Annual Maintenance Contracts) & Renewals
   Specialized for Indian IT, CCTV, Networking & Hardware Stores
───────────────────────────────────────────────────────────── */
const AMC = {
  _filterStatus: 'all',
  _filterCategory: 'all',
  _searchQuery: '',

  render(container) {
    const amcs = DB.getAmcs();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Compute status flags and days remaining dynamically
    amcs.forEach(a => {
      if (a.status !== 'renewed') {
        const end = new Date(a.endDate);
        end.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
        a._daysRemaining = diffDays;
        if (diffDays < 0) {
          a.status = 'expired';
        } else if (diffDays <= 30) {
          a.status = 'expiring_soon';
        } else {
          a.status = 'active';
        }
      } else {
        a._daysRemaining = null;
      }
    });

    const activeList = amcs.filter(a => ['active', 'expiring_soon'].includes(a.status));
    const totalArr = activeList.reduce((sum, a) => sum + (parseFloat(a.contractValue) || 0), 0);
    const expiringList = amcs.filter(a => a.status === 'expiring_soon');

    // Count PM visits due in the current month
    const curYear = today.getFullYear();
    const curMonth = today.getMonth() + 1;
    let duePmVisitsCount = 0;
    activeList.forEach(a => {
      (a.pmVisits || []).forEach(v => {
        if (v.status !== 'completed' && v.scheduledDate) {
          const vDate = new Date(v.scheduledDate);
          if (vDate.getFullYear() === curYear && (vDate.getMonth() + 1) === curMonth) {
            duePmVisitsCount++;
          }
        }
      });
    });

    // Filter list
    let filtered = amcs.slice();
    if (this._filterStatus !== 'all') {
      filtered = filtered.filter(a => a.status === this._filterStatus);
    }
    if (this._filterCategory !== 'all') {
      filtered = filtered.filter(a => a.deviceCategory === this._filterCategory);
    }
    if (this._searchQuery) {
      const q = this._searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        (a.amcNo && a.amcNo.toLowerCase().includes(q)) ||
        (a.customerName && a.customerName.toLowerCase().includes(q)) ||
        (a.customerPhone && a.customerPhone.includes(q)) ||
        (a.siteAddress && a.siteAddress.toLowerCase().includes(q)) ||
        (a.equipmentSummary && a.equipmentSummary.toLowerCase().includes(q))
      );
    }

    container.innerHTML = `
      <div class="page-header-row">
        <div>
          <h2>Annual Maintenance Contracts (AMC)</h2>
          <p style="font-size:0.83rem;color:var(--text-secondary);margin:2px 0 0">
            Recurring maintenance contracts, scheduled preventive maintenance visits &amp; SLA renewals (SAC 998314)
          </p>
        </div>
        <div class="actions" style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-secondary" onclick="AMC.exportCSV()" title="Export all AMC contracts to CSV">
            <span class="material-icons">file_download</span> Export CSV
          </button>
          <button class="btn btn-primary" onclick="AMC.openForm()">
            <span class="material-icons">add</span> + New AMC Contract
          </button>
        </div>
      </div>

      <!-- KPI Metrics -->
      <div class="kpi-grid" style="margin-bottom:20px">
        <div class="kpi-card kpi-primary">
          <div class="kpi-icon"><span class="material-icons">handshake</span></div>
          <div class="kpi-content">
            <div class="kpi-label">Active Contracts</div>
            <div class="kpi-value">${activeList.length}</div>
            <div class="kpi-sub">${amcs.length} total registered</div>
          </div>
        </div>

        <div class="kpi-card kpi-success">
          <div class="kpi-icon"><span class="material-icons">currency_rupee</span></div>
          <div class="kpi-content">
            <div class="kpi-label">Annual Recurring Revenue (ARR)</div>
            <div class="kpi-value">${fmtCurrency(totalArr)}</div>
            <div class="kpi-sub">Across active contracts</div>
          </div>
        </div>

        <div class="kpi-card ${expiringList.length ? 'kpi-warning' : 'kpi-primary'}">
          <div class="kpi-icon"><span class="material-icons">notification_important</span></div>
          <div class="kpi-content">
            <div class="kpi-label">Expiring in 30 Days</div>
            <div class="kpi-value" style="${expiringList.length ? 'color:hsl(38,92%,45%)' : ''}">${expiringList.length}</div>
            <div class="kpi-sub">${expiringList.length ? 'Needs renewal follow-up' : 'All contracts up to date'}</div>
          </div>
        </div>

        <div class="kpi-card kpi-primary">
          <div class="kpi-icon"><span class="material-icons">engineering</span></div>
          <div class="kpi-content">
            <div class="kpi-label">PM Visits Due This Month</div>
            <div class="kpi-value">${duePmVisitsCount}</div>
            <div class="kpi-sub">Preventive service visits</div>
          </div>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="card" style="margin-bottom:18px">
        <div class="card-body" style="padding:14px 18px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:space-between">
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;flex:1;min-width:280px">
            <div style="position:relative;flex:1;min-width:220px">
              <span class="material-icons" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:18px;color:var(--text-secondary)">search</span>
              <input type="text" id="amc-search" placeholder="Search by customer, contract #, equipment, phone..." 
                     value="${this._searchQuery.replace(/"/g, '&quot;')}"
                     oninput="AMC._onSearch(this.value)"
                     style="width:100%;padding:7px 10px 7px 34px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);font-size:.85rem;box-sizing:border-box">
            </div>

            <select id="amc-cat-filter" onchange="AMC._onCatFilter(this.value)" style="padding:7px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);font-size:.85rem">
              <option value="all" ${this._filterCategory === 'all' ? 'selected' : ''}>All Categories</option>
              <option value="CCTV Surveillance" ${this._filterCategory === 'CCTV Surveillance' ? 'selected' : ''}>📹 CCTV Surveillance</option>
              <option value="Computers &amp; IT Hardware" ${this._filterCategory === 'Computers &amp; IT Hardware' ? 'selected' : ''}>🖥️ Computers &amp; IT</option>
              <option value="Networking &amp; Firewall" ${this._filterCategory === 'Networking &amp; Firewall' ? 'selected' : ''}>🌐 Networking &amp; Firewall</option>
              <option value="Biometric &amp; Intercom" ${this._filterCategory === 'Biometric &amp; Intercom' ? 'selected' : ''}>🛡️ Biometric &amp; Intercom</option>
              <option value="Complete IT Infrastructure" ${this._filterCategory === 'Complete IT Infrastructure' ? 'selected' : ''}>🏢 Complete IT Infra</option>
            </select>
          </div>

          <!-- Status Tabs -->
          <div style="display:flex;gap:4px;background:var(--bg);padding:3px;border-radius:var(--radius-sm);border:1px solid var(--border)">
            <button class="btn btn-xs ${this._filterStatus === 'all' ? 'btn-primary' : 'btn-ghost'}" onclick="AMC._onStatusFilter('all')">All (${amcs.length})</button>
            <button class="btn btn-xs ${this._filterStatus === 'active' ? 'btn-primary' : 'btn-ghost'}" onclick="AMC._onStatusFilter('active')">Active (${amcs.filter(a => a.status === 'active').length})</button>
            <button class="btn btn-xs ${this._filterStatus === 'expiring_soon' ? 'btn-warning' : 'btn-ghost'}" onclick="AMC._onStatusFilter('expiring_soon')">Expiring (${expiringList.length})</button>
            <button class="btn btn-xs ${this._filterStatus === 'expired' ? 'btn-danger' : 'btn-ghost'}" onclick="AMC._onStatusFilter('expired')">Expired (${amcs.filter(a => a.status === 'expired').length})</button>
            <button class="btn btn-xs ${this._filterStatus === 'renewed' ? 'btn-primary' : 'btn-ghost'}" onclick="AMC._onStatusFilter('renewed')">Renewed</button>
          </div>
        </div>
      </div>

      <!-- Contracts Table -->
      <div class="card">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Contract No &amp; Type</th>
                <th>Client &amp; Site</th>
                <th>Category &amp; Scope</th>
                <th>Validity &amp; Status</th>
                <th>PM Visits</th>
                <th class="text-right">Contract Value</th>
                <th class="action-col text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr><td colspan="7" class="table-empty" style="text-align:center;padding:48px 20px">
                  <span class="material-icons" style="font-size:44px;color:var(--text-secondary);display:block;margin-bottom:8px">handshake</span>
                  <div style="font-weight:700;font-size:1rem;color:var(--text-primary)">No AMC Contracts Found</div>
                  <div style="font-size:.82rem;color:var(--text-secondary);margin-top:4px">Create contracts to track IT/CCTV maintenance, service visits, and recurring renewals.</div>
                  <button class="btn btn-primary btn-sm" onclick="AMC.openForm()" style="margin-top:12px">+ Add First AMC Contract</button>
                </td></tr>
              ` : filtered.map(a => {
                const visits = a.pmVisits || [];
                const doneVisits = visits.filter(v => v.status === 'completed').length;
                const totalVisits = visits.length;
                const pct = totalVisits > 0 ? Math.round((doneVisits / totalVisits) * 100) : 0;

                let statusBadge = '';
                if (a.status === 'renewed') {
                  statusBadge = '<span class="badge" style="background:hsl(217,91%,90%);color:hsl(217,91%,35%)">Renewed</span>';
                } else if (a.status === 'expiring_soon') {
                  statusBadge = `<span class="badge badge-warning" title="${a._daysRemaining} days remaining">Expiring in ${a._daysRemaining}d</span>`;
                } else if (a.status === 'expired') {
                  statusBadge = '<span class="badge badge-danger">Expired</span>';
                } else {
                  statusBadge = '<span class="badge badge-paid">Active</span>';
                }

                const typePill = a.contractType === 'Comprehensive'
                  ? '<span style="font-size:.68rem;padding:2px 6px;border-radius:4px;background:hsl(142,76%,92%);color:hsl(142,76%,28%);font-weight:700">Comprehensive</span>'
                  : '<span style="font-size:.68rem;padding:2px 6px;border-radius:4px;background:hsl(217,91%,94%);color:hsl(217,91%,38%);font-weight:700">Non-Comp (Labor Only)</span>';

                return `
                  <tr>
                    <td>
                      <div style="font-weight:700;font-family:monospace;font-size:.9rem;color:var(--primary)">${a.amcNo}</div>
                      <div style="margin-top:3px">${typePill}</div>
                    </td>
                    <td>
                      <div style="font-weight:700;color:var(--text-primary)">${a.customerName}</div>
                      <div style="font-size:.78rem;color:var(--text-secondary);display:flex;align-items:center;gap:4px;margin-top:2px">
                        <span class="material-icons" style="font-size:13px">place</span>
                        <span style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.siteAddress || 'Registered Office'}</span>
                      </div>
                      ${a.customerPhone ? `<div style="font-size:.75rem;color:var(--text-secondary);margin-top:1px">📞 ${a.customerPhone}</div>` : ''}
                    </td>
                    <td>
                      <div style="font-weight:600;font-size:.85rem">${a.deviceCategory}</div>
                      <div style="font-size:.75rem;color:var(--text-secondary);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px" title="${(a.equipmentSummary || '').replace(/"/g, '&quot;')}">
                        ${a.equipmentSummary || '—'}
                      </div>
                      <div style="font-size:.72rem;color:var(--text-secondary);margin-top:1px">
                        <strong>${a.unitsCovered || '—'}</strong> units | SLA: <strong>${a.slaResponseHours || 4}h</strong>
                      </div>
                    </td>
                    <td>
                      <div>${statusBadge}</div>
                      <div style="font-size:.78rem;font-weight:600;color:var(--text-primary);margin-top:4px">
                        ${fmtDate(a.startDate)} → ${fmtDate(a.endDate)}
                      </div>
                      ${a.status === 'active' && a._daysRemaining !== null ? `
                        <div style="font-size:.72rem;color:var(--text-secondary);margin-top:1px">
                          ${a._daysRemaining} days left
                        </div>` : ''}
                    </td>
                    <td>
                      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:.78rem;font-weight:700">
                        <span>${doneVisits}/${totalVisits} Done</span>
                        <span style="color:var(--text-secondary);font-size:.72rem">${a.visitFrequency}</span>
                      </div>
                      <div style="width:100%;height:6px;background:var(--border);border-radius:3px;overflow:hidden;margin-top:4px">
                        <div style="width:${pct}%;height:100%;background:${pct === 100 ? 'var(--success)' : 'var(--primary)'};border-radius:3px;transition:width .3s"></div>
                      </div>
                      <button class="btn btn-xs btn-ghost" onclick="AMC.openVisitsModal('${a.id}')" style="margin-top:4px;padding:2px 4px;font-size:.72rem;color:var(--primary)">
                        <span class="material-icons" style="font-size:13px">tune</span> Manage Visits
                      </button>
                    </td>
                    <td class="text-right">
                      <div style="font-weight:800;font-size:1rem;color:var(--text-primary)">${fmtCurrency(a.totalValue || a.contractValue)}</div>
                      <div style="font-size:.72rem;color:var(--text-secondary);margin-top:1px">Taxable: ${fmtCurrency(a.contractValue)}</div>
                      <div style="font-size:.7rem;color:var(--text-secondary)">SAC ${a.sacCode || '998314'} (18%)</div>
                    </td>
                    <td class="action-col text-right">
                      <div style="display:inline-flex;gap:4px">
                        <button class="btn btn-xs btn-secondary" onclick="AMC.printAgreement('${a.id}')" title="View &amp; Print A4 AMC SLA Agreement">
                          <span class="material-icons" style="font-size:14px">description</span>
                        </button>
                        <button class="btn btn-xs btn-secondary" onclick="AMC.openVisitsModal('${a.id}')" title="Preventive Maintenance Visits Schedule">
                          <span class="material-icons" style="font-size:14px">engineering</span>
                        </button>
                        <button class="btn btn-xs btn-secondary" onclick="AMC.convertToInvoice('${a.id}')" title="Generate GST Tax Invoice (SAC 998314)">
                          <span class="material-icons" style="font-size:14px">receipt_long</span>
                        </button>
                        <button class="btn btn-xs btn-secondary" onclick="AMC.renewContract('${a.id}')" title="Renew AMC Contract for Next Year">
                          <span class="material-icons" style="font-size:14px">autorenew</span>
                        </button>
                        <button class="btn btn-xs btn-secondary" onclick="AMC.shareWhatsApp('${a.id}')" title="Send WhatsApp Update / Reminder" style="color:#25d366">
                          <span class="material-icons" style="font-size:14px">chat</span>
                        </button>
                        <button class="btn btn-xs btn-secondary" onclick="AMC.openForm('${a.id}')" title="Edit Contract Details">
                          <span class="material-icons" style="font-size:14px">edit</span>
                        </button>
                        <button class="btn btn-xs btn-ghost" onclick="AMC.deleteAmc('${a.id}')" title="Delete Contract">
                          <span class="material-icons" style="font-size:14px;color:var(--danger)">delete</span>
                        </button>
                      </div>
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

  _onSearch(val) {
    this._searchQuery = val.trim();
    this.render(document.getElementById('page-content'));
  },

  _onCatFilter(val) {
    this._filterCategory = val;
    this.render(document.getElementById('page-content'));
  },

  _onStatusFilter(val) {
    this._filterStatus = val;
    this.render(document.getElementById('page-content'));
  },

  /* ─────────────────────────────────────────────────────────────
     Contract Form Modal (Add / Edit)
  ───────────────────────────────────────────────────────────── */
  openForm(amcId = null) {
    const isEdit = !!amcId;
    const amc = isEdit ? DB.getAmcById(amcId) : null;
    const customers = DB.getCustomers();

    const todayStr = new Date().toISOString().split('T')[0];
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    nextYear.setDate(nextYear.getDate() - 1);
    const nextYearStr = nextYear.toISOString().split('T')[0];

    const initialAmcNo = amc ? amc.amcNo : DB.nextAmcNo();
    const initialCustId = amc ? (amc.customerId || '') : '';
    const initialCustName = amc ? amc.customerName : (customers[0]?.name || '');
    const initialCustPhone = amc ? amc.customerPhone : (customers[0]?.phone || customers[0]?.whatsapp || '');
    const initialCustEmail = amc ? amc.customerEmail : (customers[0]?.email || '');
    const initialSite = amc ? amc.siteAddress : (customers[0]?.address || '');
    const initialType = amc ? amc.contractType : 'Comprehensive';
    const initialCategory = amc ? amc.deviceCategory : 'CCTV Surveillance';
    const initialEquip = amc ? amc.equipmentSummary : '';
    const initialUnits = amc ? (amc.unitsCovered || 1) : 16;
    const initialStart = amc ? amc.startDate : todayStr;
    const initialEnd = amc ? amc.endDate : nextYearStr;
    const initialFreq = amc ? amc.visitFrequency : 'Quarterly';
    const initialSla = amc ? (amc.slaResponseHours || 4) : 4;
    const initialVal = amc ? amc.contractValue : 35000;
    const initialGst = amc ? (amc.gstRate !== undefined ? amc.gstRate : 18) : 18;
    const initialNotes = amc ? amc.notes : '';

    const bodyHtml = `
      <form id="amc-form" onsubmit="event.preventDefault();AMC.save('${amcId || ''}')">
        <div class="form-grid">
          <div class="form-group">
            <label class="required">Contract Number</label>
            <input type="text" id="amc-no" class="form-control" value="${initialAmcNo}" required>
          </div>

          <div class="form-group">
            <label class="required">Customer / Client</label>
            <select id="amc-cust-sel" class="form-control" onchange="AMC._onCustChange(this)" required>
              <option value="">-- Select Registered Customer --</option>
              ${customers.map(c => `
                <option value="${c.id}" ${initialCustId === c.id ? 'selected' : ''}>
                  ${c.name} (${c.city || c.phone || 'Pune'})
                </option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label>Client Contact Phone</label>
            <input type="text" id="amc-phone" class="form-control" value="${initialCustPhone}">
          </div>

          <div class="form-group">
            <label>Client Contact Email</label>
            <input type="email" id="amc-email" class="form-control" value="${initialCustEmail}">
          </div>

          <div class="form-group form-full">
            <label class="required">Service Site / Campus Address</label>
            <input type="text" id="amc-site" class="form-control" value="${initialSite.replace(/"/g, '&quot;')}" placeholder="Full physical address where equipment is installed..." required>
          </div>

          <div class="form-group">
            <label class="required">Contract Type</label>
            <select id="amc-type" class="form-control" required>
              <option value="Comprehensive" ${initialType === 'Comprehensive' ? 'selected' : ''}>Comprehensive (Includes Parts Replacement)</option>
              <option value="Non-Comprehensive" ${initialType === 'Non-Comprehensive' ? 'selected' : ''}>Non-Comprehensive (Service &amp; Labor Only)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="required">Infrastructure Category</label>
            <select id="amc-cat" class="form-control" required>
              <option value="CCTV Surveillance" ${initialCategory === 'CCTV Surveillance' ? 'selected' : ''}>📹 CCTV Surveillance</option>
              <option value="Computers &amp; IT Hardware" ${initialCategory === 'Computers &amp; IT Hardware' ? 'selected' : ''}>🖥️ Computers &amp; IT Hardware</option>
              <option value="Networking &amp; Firewall" ${initialCategory === 'Networking &amp; Firewall' ? 'selected' : ''}>🌐 Networking &amp; Firewall</option>
              <option value="Biometric &amp; Intercom" ${initialCategory === 'Biometric &amp; Intercom' ? 'selected' : ''}>🛡️ Biometric &amp; Intercom</option>
              <option value="Complete IT Infrastructure" ${initialCategory === 'Complete IT Infrastructure' ? 'selected' : ''}>🏢 Complete IT Infrastructure</option>
            </select>
          </div>

          <div class="form-group form-full">
            <label class="required">Equipment Inventory &amp; Scope Covered</label>
            <textarea id="amc-equip" class="form-control" rows="2" placeholder="e.g. 16x 4MP IP Cameras, 1x 16CH NVR, 2x 24-Port PoE Switches, 4TB HDD, cabling..." required>${initialEquip}</textarea>
          </div>

          <div class="form-group">
            <label>Total Units / Devices Covered</label>
            <input type="number" id="amc-units" class="form-control" value="${initialUnits}" min="1">
          </div>

          <div class="form-group">
            <label class="required">Preventive Visit Frequency</label>
            <select id="amc-freq" class="form-control" required>
              <option value="Quarterly" ${initialFreq === 'Quarterly' ? 'selected' : ''}>Quarterly (4 Scheduled Visits / Year)</option>
              <option value="Bi-Monthly" ${initialFreq === 'Bi-Monthly' ? 'selected' : ''}>Bi-Monthly (6 Scheduled Visits / Year)</option>
              <option value="Monthly" ${initialFreq === 'Monthly' ? 'selected' : ''}>Monthly (12 Scheduled Visits / Year)</option>
              <option value="Half-Yearly" ${initialFreq === 'Half-Yearly' ? 'selected' : ''}>Half-Yearly (2 Scheduled Visits / Year)</option>
              <option value="On-Demand" ${initialFreq === 'On-Demand' ? 'selected' : ''}>On-Demand / As Needed Only</option>
            </select>
          </div>

          <div class="form-group">
            <label class="required">Contract Start Date</label>
            <input type="date" id="amc-start" class="form-control" value="${initialStart}" onchange="AMC._onStartDateChange(this.value)" required>
          </div>

          <div class="form-group">
            <label class="required">Contract Expiry Date</label>
            <input type="date" id="amc-end" class="form-control" value="${initialEnd}" required>
          </div>

          <div class="form-group">
            <label class="required">SLA Emergency Response Window</label>
            <select id="amc-sla" class="form-control" required>
              <option value="2" ${initialSla == 2 ? 'selected' : ''}>2 Hours (Critical / Emergency Response)</option>
              <option value="4" ${initialSla == 4 ? 'selected' : ''}>4 Hours (Standard High-Priority)</option>
              <option value="8" ${initialSla == 8 ? 'selected' : ''}>8 Hours (Same-Day Response)</option>
              <option value="24" ${initialSla == 24 ? 'selected' : ''}>24 Hours (Next Business Day)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="required">Contract Value (Taxable ₹ excl. GST)</label>
            <input type="number" id="amc-val" class="form-control" value="${initialVal}" min="0" step="100" oninput="AMC._calcTotalPreview()" required>
          </div>

          <div class="form-group">
            <label class="required">GST Rate (SAC 998314)</label>
            <select id="amc-gst" class="form-control" onchange="AMC._calcTotalPreview()" required>
              <option value="18" ${initialGst == 18 ? 'selected' : ''}>18% (Standard IT Services)</option>
              <option value="12" ${initialGst == 12 ? 'selected' : ''}>12%</option>
              <option value="0" ${initialGst == 0 ? 'selected' : ''}>0% (Exempted)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Grand Total (incl. GST)</label>
            <div id="amc-total-preview" style="font-size:1.15rem;font-weight:800;color:var(--primary);padding:8px 0">
              ₹0.00
            </div>
          </div>

          <div class="form-group form-full">
            <label>Special Terms &amp; Scope Conditions</label>
            <textarea id="amc-notes" class="form-control" rows="2" placeholder="e.g. Free replacement of camera connectors. Routine lens cleaning and firmware patching included.">${initialNotes}</textarea>
          </div>
        </div>
      </form>
    `;

    App.modal(isEdit ? `Edit AMC Contract: ${amc.amcNo}` : 'New Annual Maintenance Contract (AMC)', bodyHtml, `
      <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button type="button" class="btn btn-primary" onclick="AMC.save('${amcId || ''}')">
        <span class="material-icons" style="font-size:16px">save</span> Save Contract
      </button>
    `, 'modal-lg');

    setTimeout(() => this._calcTotalPreview(), 50);
  },

  _onCustChange(sel) {
    if (!sel || !sel.value) return;
    const c = DB.getCustomerById(sel.value);
    if (!c) return;
    const phoneInput = document.getElementById('amc-phone');
    const emailInput = document.getElementById('amc-email');
    const siteInput = document.getElementById('amc-site');

    if (phoneInput) phoneInput.value = c.whatsapp || c.phone || '';
    if (emailInput) emailInput.value = c.email || '';
    if (siteInput && !siteInput.value) siteInput.value = `${c.name}, ${c.address || ''}, ${c.city || ''}`;
  },

  _onStartDateChange(val) {
    if (!val) return;
    const d = new Date(val);
    if (isNaN(d.getTime())) return;
    d.setFullYear(d.getFullYear() + 1);
    d.setDate(d.getDate() - 1);
    const endInput = document.getElementById('amc-end');
    if (endInput) {
      endInput.value = d.toISOString().split('T')[0];
    }
  },

  _calcTotalPreview() {
    const valInput = document.getElementById('amc-val');
    const gstInput = document.getElementById('amc-gst');
    const preview = document.getElementById('amc-total-preview');
    if (!preview) return;

    const val = parseFloat(valInput?.value) || 0;
    const gstRate = parseFloat(gstInput?.value) || 0;
    const gstAmt = Math.round((val * (gstRate / 100)) * 100) / 100;
    const total = val + gstAmt;

    preview.innerHTML = `${fmtCurrency(total)} <span style="font-size:.78rem;font-weight:400;color:var(--text-secondary)">(Taxable: ${fmtCurrency(val)} + GST: ${fmtCurrency(gstAmt)})</span>`;
  },

  save(amcId = null) {
    const form = document.getElementById('amc-form');
    if (!form || !form.reportValidity()) return;

    const custSel = document.getElementById('amc-cust-sel');
    const custId = custSel?.value;
    const customer = DB.getCustomerById(custId);

    const amcNo = (document.getElementById('amc-no')?.value || '').trim();
    const phone = (document.getElementById('amc-phone')?.value || '').trim();
    const email = (document.getElementById('amc-email')?.value || '').trim();
    const site = (document.getElementById('amc-site')?.value || '').trim();
    const contractType = document.getElementById('amc-type')?.value;
    const category = document.getElementById('amc-cat')?.value;
    const equipment = (document.getElementById('amc-equip')?.value || '').trim();
    const units = parseInt(document.getElementById('amc-units')?.value, 10) || 1;
    const frequency = document.getElementById('amc-freq')?.value;
    const startDate = document.getElementById('amc-start')?.value;
    const endDate = document.getElementById('amc-end')?.value;
    const sla = parseInt(document.getElementById('amc-sla')?.value, 10) || 4;
    const val = parseFloat(document.getElementById('amc-val')?.value) || 0;
    const gstRate = parseFloat(document.getElementById('amc-gst')?.value) || 18;
    const notes = (document.getElementById('amc-notes')?.value || '').trim();

    if (!startDate || !endDate) {
      App.toast('Please specify contract validity start and end dates', 'error');
      return;
    }

    const gstAmt = Math.round((val * (gstRate / 100)) * 100) / 100;
    const total = val + gstAmt;

    const existing = amcId ? DB.getAmcById(amcId) : null;
    let pmVisits = existing ? (existing.pmVisits || []) : [];

    // If new or date/frequency changed, regenerate schedule
    if (!existing || existing.startDate !== startDate || existing.endDate !== endDate || existing.visitFrequency !== frequency) {
      const newSchedule = generatePmSchedule(startDate, endDate, frequency);
      // Preserve already completed visits if any
      if (existing && existing.pmVisits) {
        newSchedule.forEach((v, idx) => {
          if (existing.pmVisits[idx] && existing.pmVisits[idx].status === 'completed') {
            newSchedule[idx] = existing.pmVisits[idx];
          }
        });
      }
      pmVisits = newSchedule;
    }

    const amcObj = {
      ...(existing || {}),
      amcNo,
      customerId: custId,
      customerName: customer ? customer.name : (document.getElementById('amc-cust-sel')?.options[custSel.selectedIndex]?.text || 'Client'),
      customerPhone: phone,
      customerEmail: email,
      siteAddress: site,
      contractType,
      deviceCategory: category,
      equipmentSummary: equipment,
      unitsCovered: units,
      visitFrequency: frequency,
      startDate,
      endDate,
      slaResponseHours: sla,
      contractValue: val,
      gstRate,
      sacCode: '998314',
      taxableValue: val,
      gstAmount: gstAmt,
      totalValue: total,
      pmVisits,
      notes,
      status: existing?.status === 'renewed' ? 'renewed' : 'active',
      paymentStatus: existing?.paymentStatus || 'paid'
    };

    if (amcId) amcObj.id = amcId;

    DB.saveAmc(amcObj);
    App.closeModal();
    App.toast(`🎉 AMC Contract "${amcNo}" saved successfully!`, 'success');
    App.buildSidebar();
    this.render(document.getElementById('page-content'));
  },

  deleteAmc(amcId) {
    const amc = DB.getAmcById(amcId);
    if (!amc) return;
    if (confirm(`Are you sure you want to delete AMC Contract ${amc.amcNo} for "${amc.customerName}"?`)) {
      DB.deleteAmc(amcId);
      App.toast(`AMC ${amc.amcNo} deleted.`, 'info');
      App.buildSidebar();
      this.render(document.getElementById('page-content'));
    }
  },

  /* ─────────────────────────────────────────────────────────────
     Preventive Maintenance (PM) Visits Schedule Modal
  ───────────────────────────────────────────────────────────── */
  openVisitsModal(amcId) {
    const amc = DB.getAmcById(amcId);
    if (!amc) return;

    const visits = amc.pmVisits || [];

    const bodyHtml = `
      <div style="margin-bottom:14px;background:var(--bg);padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span style="font-weight:700;font-size:1rem;color:var(--text-primary)">${amc.amcNo} — ${amc.customerName}</span>
          <span style="font-size:.78rem;font-weight:600;color:var(--primary)">${amc.visitFrequency} Visits</span>
        </div>
        <div style="font-size:.8rem;color:var(--text-secondary)">
          📍 Site: ${amc.siteAddress || 'Registered Office'} | 📦 Equipment: ${amc.equipmentSummary || '—'}
        </div>
      </div>

      <div style="font-size:.82rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);margin-bottom:10px">
        Preventive Service Visits (${visits.filter(v => v.status === 'completed').length}/${visits.length} Completed)
      </div>

      <div style="display:flex;flex-direction:column;gap:10px;max-height:420px;overflow-y:auto;padding-right:4px">
        ${visits.length === 0 ? `
          <div style="text-align:center;padding:24px;color:var(--text-secondary)">
            No scheduled visits for on-demand contracts. Click below to add an on-call maintenance visit.
          </div>
        ` : visits.map((v, idx) => {
          const isDone = v.status === 'completed';
          return `
            <div style="border:1px solid var(--border);border-left:4px solid ${isDone ? 'var(--success)' : 'var(--warning)'};border-radius:var(--radius-sm);background:#fff;padding:12px;box-shadow:0 1px 3px rgba(0,0,0,0.04)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <div style="font-weight:700;font-size:.9rem;display:flex;align-items:center;gap:6px">
                  <span class="material-icons" style="font-size:18px;color:${isDone ? 'var(--success)' : 'var(--warning)'}">
                    ${isDone ? 'check_circle' : 'schedule'}
                  </span>
                  Visit #${v.id || (idx + 1)}: ${fmtDate(v.scheduledDate)}
                </div>
                <div style="display:flex;align-items:center;gap:6px">
                  <select id="pm-status-${idx}" class="form-control" style="font-size:.78rem;padding:4px 8px;height:28px" onchange="AMC._toggleVisitDone(${idx})">
                    <option value="pending" ${v.status === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                    <option value="scheduled" ${v.status === 'scheduled' ? 'selected' : ''}>📅 Scheduled</option>
                    <option value="completed" ${v.status === 'completed' ? 'selected' : ''}>✅ Completed</option>
                  </select>
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px">
                <div>
                  <label style="font-size:.72rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:2px">Assigned Technician</label>
                  <input type="text" id="pm-tech-${idx}" class="form-control" style="font-size:.8rem;padding:4px 8px" value="${(v.technician || '').replace(/"/g, '&quot;')}" placeholder="e.g. Sandeep (CCTV Tech)">
                </div>
                <div>
                  <label style="font-size:.72rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:2px">Completion Date</label>
                  <input type="date" id="pm-date-${idx}" class="form-control" style="font-size:.8rem;padding:4px 8px" value="${v.completedDate || ''}">
                </div>
              </div>

              <div style="margin-bottom:8px">
                <label style="font-size:.72rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:2px">Service Notes / Work Done</label>
                <input type="text" id="pm-notes-${idx}" class="form-control" style="font-size:.8rem;padding:4px 8px" value="${(v.notes || '').replace(/"/g, '&quot;')}" placeholder="e.g. Lens cleaned, connector replaced, UPS runtime checked...">
              </div>

              <div style="display:flex;justify-content:space-between;align-items:center;padding-top:6px;border-top:1px dashed var(--border)">
                <button type="button" class="btn btn-xs btn-secondary" onclick="AMC.createServiceJobFromPm('${amc.id}', ${idx})" title="Convert this scheduled visit to a field service repair ticket">
                  <span class="material-icons" style="font-size:13px">build</span> Generate Service Job Ticket
                </button>
                <button type="button" class="btn btn-xs btn-primary" onclick="AMC.saveSingleVisit('${amc.id}', ${idx})">
                  💾 Update Visit
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    App.modal(`🛠️ PM Schedule: ${amc.amcNo}`, bodyHtml, `
      <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
    `, 'modal-lg');
  },

  _toggleVisitDone(idx) {
    const statusSel = document.getElementById(`pm-status-${idx}`);
    const dateInput = document.getElementById(`pm-date-${idx}`);
    if (statusSel?.value === 'completed' && dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }
  },

  saveSingleVisit(amcId, idx) {
    const amc = DB.getAmcById(amcId);
    if (!amc || !amc.pmVisits || !amc.pmVisits[idx]) return;

    const status = document.getElementById(`pm-status-${idx}`)?.value || 'pending';
    const tech = (document.getElementById(`pm-tech-${idx}`)?.value || '').trim();
    const completedDate = document.getElementById(`pm-date-${idx}`)?.value || null;
    const notes = (document.getElementById(`pm-notes-${idx}`)?.value || '').trim();

    amc.pmVisits[idx].status = status;
    amc.pmVisits[idx].technician = tech;
    amc.pmVisits[idx].completedDate = completedDate;
    amc.pmVisits[idx].notes = notes;

    DB.saveAmc(amc);
    App.toast(`✅ Visit #${amc.pmVisits[idx].id || (idx + 1)} updated successfully!`, 'success');
    this.render(document.getElementById('page-content'));
  },

  createServiceJobFromPm(amcId, idx) {
    const amc = DB.getAmcById(amcId);
    if (!amc || !amc.pmVisits || !amc.pmVisits[idx]) return;
    const v = amc.pmVisits[idx];

    const todayStr = new Date().toISOString().split('T')[0];
    const customer = DB.getCustomerById(amc.customerId);

    const jobData = {
      jobNo: DB.nextJobNo(),
      date: todayStr,
      expectedDeliveryDate: v.scheduledDate || todayStr,
      customerId: amc.customerId,
      customerName: amc.customerName,
      customerPhone: amc.customerPhone,
      customerAddress: amc.siteAddress,
      deviceType: amc.deviceCategory,
      brandModel: `AMC Preventive Maintenance (Contract ${amc.amcNo})`,
      serialNo: 'AMC-ONSITE',
      passwordPin: 'N/A',
      accessories: 'Onsite Client Infrastructure',
      physicalCondition: 'Operating at client premises',
      problemReported: `Scheduled Preventive Maintenance Visit #${v.id || (idx + 1)} under AMC ${amc.amcNo}. Scope: ${amc.equipmentSummary}`,
      diagnosticsNotes: `Routine servicing: Camera realignment, lens cleaning, dust removal, storage recording health check, firmware updates.`,
      assignedTechnician: v.technician || 'Sandeep (Field Engineer)',
      estimatedCost: 0,
      advancePaid: 0,
      advancePaymentMethod: 'Cash',
      status: 'received',
      finalCost: 0,
      notes: `Covered under ${amc.contractType} AMC Contract ${amc.amcNo}. Zero billing for routine maintenance.`
    };

    const savedJob = DB.saveJob(jobData);
    App.closeModal();
    App.toast(`🛠️ Field Service Job ${savedJob.jobNo} created for this PM visit!`, 'success');
    location.hash = '#services';
  },

  /* ─────────────────────────────────────────────────────────────
     1-Click Renewal Engine
  ───────────────────────────────────────────────────────────── */
  renewContract(amcId) {
    const oldAmc = DB.getAmcById(amcId);
    if (!oldAmc) return;

    if (!confirm(`Create renewal contract for "${oldAmc.customerName}" based on ${oldAmc.amcNo}?`)) {
      return;
    }

    // Determine next period
    let nextStart = new Date();
    if (oldAmc.endDate) {
      const prevEnd = new Date(oldAmc.endDate);
      prevEnd.setDate(prevEnd.getDate() + 1);
      nextStart = prevEnd;
    }
    const nextStartStr = nextStart.toISOString().split('T')[0];

    const nextEnd = new Date(nextStart);
    nextEnd.setFullYear(nextEnd.getFullYear() + 1);
    nextEnd.setDate(nextEnd.getDate() - 1);
    const nextEndStr = nextEnd.toISOString().split('T')[0];

    // Mark previous as renewed
    oldAmc.status = 'renewed';
    DB.saveAmc(oldAmc);

    // Pre-create next AMC
    const newAmc = {
      amcNo: DB.nextAmcNo(),
      customerId: oldAmc.customerId,
      customerName: oldAmc.customerName,
      customerPhone: oldAmc.customerPhone,
      customerEmail: oldAmc.customerEmail,
      siteAddress: oldAmc.siteAddress,
      contractType: oldAmc.contractType,
      deviceCategory: oldAmc.deviceCategory,
      equipmentSummary: oldAmc.equipmentSummary,
      unitsCovered: oldAmc.unitsCovered,
      visitFrequency: oldAmc.visitFrequency,
      startDate: nextStartStr,
      endDate: nextEndStr,
      slaResponseHours: oldAmc.slaResponseHours,
      contractValue: oldAmc.contractValue,
      gstRate: oldAmc.gstRate,
      sacCode: '998314',
      taxableValue: oldAmc.taxableValue,
      gstAmount: oldAmc.gstAmount,
      totalValue: oldAmc.totalValue,
      pmVisits: generatePmSchedule(nextStartStr, nextEndStr, oldAmc.visitFrequency),
      notes: `Renewal of previous contract ${oldAmc.amcNo}. ${oldAmc.notes || ''}`.trim(),
      status: 'active',
      paymentStatus: 'unpaid'
    };

    const saved = DB.saveAmc(newAmc);
    App.toast(`🎉 New Renewal AMC ${saved.amcNo} created! Edit details if needed.`, 'success');
    this.openForm(saved.id);
  },

  /* ─────────────────────────────────────────────────────────────
     1-Click GST Tax Invoice Conversion (SAC 998314)
  ───────────────────────────────────────────────────────────── */
  convertToInvoice(amcId) {
    const amc = DB.getAmcById(amcId);
    if (!amc) return;

    if (amc.linkedInvoiceId) {
      const inv = DB.getSaleById(amc.linkedInvoiceId);
      if (inv) {
        if (confirm(`AMC ${amc.amcNo} is already billed under Invoice #${inv.invoiceNo}. Open existing invoice?`)) {
          Billing.viewDoc(inv.id, 'sales');
          return;
        }
      }
    }

    const itemDesc = `Annual Maintenance Contract (AMC): ${amc.deviceCategory} (${amc.contractType})\nPeriod: ${fmtDate(amc.startDate)} to ${fmtDate(amc.endDate)}\nSite: ${amc.siteAddress}\nScope: ${amc.equipmentSummary}`;

    // Open Billing sales invoice form with pre-filled items
    location.hash = '#billing-sales';
    setTimeout(() => {
      Billing.openForm('sales');
      setTimeout(() => {
        const custSel = document.getElementById('if-party');
        if (custSel && amc.customerId) {
          custSel.value = amc.customerId;
          if (typeof Billing._onPartyChange === 'function') Billing._onPartyChange(custSel);
        }

        const tbody = document.getElementById('items-tbody');
        if (tbody) {
          tbody.innerHTML = '';
          Billing._addRow({
            productId: '',
            name: `AMC Service: ${amc.deviceCategory} (${amc.contractType})`,
            hsn: '998314',
            unit: 'Job',
            qty: 1,
            rate: amc.contractValue,
            discount: 0,
            gstRate: amc.gstRate || 18,
            warranty: `${fmtDate(amc.startDate)} - ${fmtDate(amc.endDate)}`
          });
          const notesInput = document.getElementById('if-notes');
          if (notesInput) {
            notesInput.value = `AMC Contract No: ${amc.amcNo}\nSite Address: ${amc.siteAddress}\nEquipment Covered: ${amc.equipmentSummary}`;
          }
        }
        App.toast(`Pre-filled Sales Invoice for AMC ${amc.amcNo} (SAC 998314)!`, 'info');
      }, 250);
    }, 150);
  },

  /* ─────────────────────────────────────────────────────────────
     Professional A4 AMC Contract Certificate & Agreement
  ───────────────────────────────────────────────────────────── */
  generateAgreementHtml(amcId) {
    const amc = DB.getAmcById(amcId);
    if (!amc) return '';
    const biz = DB.getBiz();
    const customer = DB.getCustomerById(amc.customerId);

    const visits = amc.pmVisits || [];
    const visitsTableHtml = visits.map((v, i) => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:600">Q${i + 1}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-weight:600">${fmtDate(v.scheduledDate)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${v.status === 'completed' ? `<span style="color:#059669;font-weight:700">Completed on ${fmtDate(v.completedDate)}</span>` : '<span style="color:#4b5563">Preventive Maintenance &amp; Health Check</span>'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${v.technician || 'Authorized Service Engineer'}</td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AMC Agreement - ${amc.amcNo}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 14mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #111827; margin: 0; padding: 0; font-size: 9.5pt; line-height: 1.45; }
    .header-table { width: 100%; border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 14px; }
    .title-pill { display: inline-block; background: #1e3a8a; color: #fff; padding: 4px 12px; font-weight: 800; font-size: 11pt; border-radius: 4px; letter-spacing: 0.5px; text-transform: uppercase; }
    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    table.data-table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 14px; }
    table.data-table th { background: #f1f5f9; padding: 7px 10px; text-align: left; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1.5px solid #cbd5e1; }
    .clause-num { font-weight: 700; color: #1e3a8a; }
  </style>
</head>
<body>

  <!-- Header -->
  <table class="header-table">
    <tr>
      <td style="vertical-align:top">
        <div style="font-size:16pt;font-weight:900;color:#1e3a8a;letter-spacing:-0.5px">${biz.name || 'ShopPulse Electronics'}</div>
        <div style="font-size:8.5pt;color:#4b5563;margin-top:2px">${biz.tagline || 'IT Infrastructure, Surveillance &amp; Computer Services'}</div>
        <div style="font-size:8.5pt;color:#374151;margin-top:4px">
          ${biz.address || ''}, ${biz.city || ''} - ${biz.pincode || ''}, ${biz.state || ''}<br>
          GSTIN: <strong>${biz.gstin || 'UNREGISTERED'}</strong> | Phone: ${biz.phone || ''} | Email: ${biz.email || ''}
        </div>
      </td>
      <td style="vertical-align:top;text-align:right">
        <div class="title-pill">AMC Service Agreement</div>
        <div style="font-size:11pt;font-weight:800;color:#111827;margin-top:6px;font-family:monospace">${amc.amcNo}</div>
        <div style="font-size:8.5pt;color:#6b7280;margin-top:2px">Dated: <strong>${fmtDate(amc.startDate)}</strong></div>
      </td>
    </tr>
  </table>

  <!-- Parties & Scope -->
  <div class="info-box">
    <div class="info-grid">
      <div>
        <div style="font-size:7.5pt;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">SERVICE CLIENT</div>
        <div style="font-size:11pt;font-weight:800;color:#0f172a;margin-top:2px">${amc.customerName}</div>
        <div style="font-size:8.5pt;color:#334155;margin-top:2px">
          Site: <strong>${amc.siteAddress || 'Registered Office'}</strong><br>
          ${customer?.gstin ? `GSTIN: <strong>${customer.gstin}</strong><br>` : ''}
          Contact: ${amc.customerPhone || '—'} | ${amc.customerEmail || '—'}
        </div>
      </div>
      <div>
        <div style="font-size:7.5pt;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">CONTRACT SPECIFICATIONS</div>
        <div style="font-size:9pt;margin-top:2px;line-height:1.4">
          • Contract Type: <strong>${amc.contractType}</strong><br>
          • Category: <strong>${amc.deviceCategory}</strong> (${amc.unitsCovered} Units)<br>
          • Validity Period: <strong>${fmtDate(amc.startDate)} to ${fmtDate(amc.endDate)}</strong><br>
          • Emergency SLA: <strong>Within ${amc.slaResponseHours} Hours</strong><br>
          • Total Value: <strong>${fmtCurrency(amc.totalValue)}</strong> (SAC 998314)
        </div>
      </div>
    </div>
  </div>

  <!-- Scope & Assets Covered -->
  <div style="font-weight:800;font-size:9.5pt;color:#1e3a8a;margin-top:10px">1. ASSETS COVERED &amp; SCOPE OF WORK</div>
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:4px;padding:8px 12px;margin:6px 0 12px;font-size:9pt">
    ${amc.equipmentSummary ? amc.equipmentSummary.replace(/\n/g, '<br>') : 'All authorized surveillance cameras, recording servers, switches, power units and active hardware.'}
  </div>

  <!-- Preventive Maintenance Schedule -->
  <div style="font-weight:800;font-size:9.5pt;color:#1e3a8a">2. SCHEDULED PREVENTIVE MAINTENANCE (${amc.visitFrequency})</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width:10%;text-align:center">Quarter</th>
        <th style="width:25%">Target Date</th>
        <th style="width:40%">Service Operations</th>
        <th style="width:25%">Assigned Tech</th>
      </tr>
    </thead>
    <tbody>
      ${visitsTableHtml || '<tr><td colspan="4" style="text-align:center;padding:10px;color:#6b7280">On-demand service visits as per client requests.</td></tr>'}
    </tbody>
  </table>

  <!-- SLA Terms & Conditions -->
  <div style="font-weight:800;font-size:9.5pt;color:#1e3a8a;margin-top:10px">3. SERVICE LEVEL AGREEMENT (SLA) &amp; TERMS</div>
  <div style="font-size:8.2pt;color:#374151;line-height:1.45;margin-top:4px">
    <p style="margin:2px 0"><span class="clause-num">3.1 Response Time:</span> The Service Provider commits to attending emergency breakdown calls within <strong>${amc.slaResponseHours} business hours</strong> of notification.</p>
    <p style="margin:2px 0"><span class="clause-num">3.2 Coverage:</span> ${amc.contractType === 'Comprehensive' ? 'Comprehensive contract covers all repair labor, routine maintenance, lens cleaning, cable repairs, and burnt/damaged parts replacement.' : 'Non-comprehensive contract covers labor, preventive health visits, firmware patching, and diagnostics only. Replacement components shall be billed separately at authorized rates.'}</p>
    <p style="margin:2px 0"><span class="clause-num">3.3 Exclusions:</span> Physical damage resulting from fire, water flooding, physical theft, electrical high-voltage lightning strikes, or tampering by third-party unauthorized technicians is strictly excluded.</p>
    <p style="margin:2px 0"><span class="clause-num">3.4 Payment:</span> Contract consideration of <strong>${fmtCurrency(amc.totalValue)}</strong> is payable in advance. All disputes subject to local jurisdiction.</p>
    ${amc.notes ? `<p style="margin:2px 0"><span class="clause-num">3.5 Special Terms:</span> ${amc.notes}</p>` : ''}
  </div>

  <!-- Signatures -->
  <table style="width:100%;margin-top:36px;border-top:1px solid #cbd5e1;padding-top:12px">
    <tr>
      <td style="width:50%;vertical-align:bottom">
        <div style="font-size:8pt;color:#6b7280">ACCEPTED &amp; CONFIRMED FOR CLIENT:</div>
        <div style="font-weight:800;font-size:10pt;color:#111827;margin-top:2px">${amc.customerName}</div>
        <div style="height:45px"></div>
        <div style="font-size:8.5pt;color:#374151">Authorized Signatory &amp; Stamp</div>
      </td>
      <td style="width:50%;text-align:right;vertical-align:bottom">
        <div style="font-size:8pt;color:#6b7280">FOR SERVICE PROVIDER:</div>
        <div style="font-weight:800;font-size:10pt;color:#1e3a8a;margin-top:2px">${biz.name}</div>
        <div style="height:45px"></div>
        <div style="font-size:8.5pt;color:#374151">${biz.signatory || 'Proprietor / Director'}</div>
      </td>
    </tr>
  </table>

</body>
</html>`;
  },

  printAgreement(amcId) {
    const html = this.generateAgreementHtml(amcId);
    const amc = DB.getAmcById(amcId);
    const title = amc ? `AMC_${amc.amcNo.replace(/[^a-zA-Z0-9]/g, '_')}_Agreement` : 'AMC_Agreement';

    if (window.desktopApp && typeof window.desktopApp.printHtml === 'function') {
      window.desktopApp.printHtml({ html, title });
      return;
    }

    try {
      const w = window.open('', '_blank');
      if (w) {
        w.document.open();
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 300);
      }
    } catch (e) {
      App.toast('Popup blocked. Allow popups to print agreement.', 'error');
    }
  },

  /* ─────────────────────────────────────────────────────────────
     WhatsApp Renewal Reminder
  ───────────────────────────────────────────────────────────── */
  shareWhatsApp(amcId) {
    const amc = DB.getAmcById(amcId);
    if (!amc) return;

    const biz = DB.getBiz();
    const phone = (amc.customerPhone || '').replace(/[^0-9]/g, '');

    const visits = amc.pmVisits || [];
    const doneCount = visits.filter(v => v.status === 'completed').length;

    let msg = `*AMC SERVICE UPDATE — ${biz.name}*\n\n`;
    msg += `Dear *${amc.customerName}*,\n\n`;
    msg += `Here is the status summary for your Annual Maintenance Contract:\n`;
    msg += `• *Contract No:* ${amc.amcNo}\n`;
    msg += `• *Category:* ${amc.deviceCategory} (${amc.contractType})\n`;
    msg += `• *Coverage:* ${amc.equipmentSummary}\n`;
    msg += `• *Validity Period:* ${fmtDate(amc.startDate)} to *${fmtDate(amc.endDate)}*\n`;
    msg += `• *Preventive Maintenance:* ${doneCount}/${visits.length} scheduled visits completed\n`;

    if (amc.status === 'expiring_soon' && amc._daysRemaining !== null) {
      msg += `\n⚠️ *Renewal Notice:* Your contract is expiring in *${amc._daysRemaining} days*. Please approve renewal to ensure uninterrupted SLA response.\n`;
    } else if (amc.status === 'expired') {
      msg += `\n🔴 *Contract Expired:* Your AMC expired on ${fmtDate(amc.endDate)}. Please renew to resume warranty & emergency support.\n`;
    } else {
      msg += `\n✅ *Status:* Active under 24/7 SLA monitoring.\n`;
    }

    msg += `\nThank you for choosing *${biz.name}*!\nPhone: ${biz.phone || ''}`;

    const url = phone.length >= 10
      ? `https://api.whatsapp.com/send?phone=91${phone.slice(-10)}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

    window.open(url, '_blank');
    App.toast(`Opening WhatsApp for ${amc.amcNo}…`, 'success');
  },

  /* ─────────────────────────────────────────────────────────────
     Export All AMCs to CSV
  ───────────────────────────────────────────────────────────── */
  exportCSV() {
    const amcs = DB.getAmcs();
    if (!amcs.length) {
      App.toast('No AMC contracts to export.', 'warning');
      return;
    }

    const headers = ['Contract No', 'Customer Name', 'Phone', 'Site Address', 'Contract Type', 'Category', 'Units', 'Start Date', 'End Date', 'Frequency', 'Taxable Value', 'GST Rate', 'Total Value', 'Status'];
    const rows = amcs.map(a => [
      a.amcNo,
      a.customerName,
      a.customerPhone || '',
      a.siteAddress || '',
      a.contractType,
      a.deviceCategory,
      a.unitsCovered || 1,
      a.startDate,
      a.endDate,
      a.visitFrequency,
      a.contractValue,
      `${a.gstRate || 18}%`,
      a.totalValue,
      a.status
    ]);

    const csvContent = [headers, ...rows]
      .map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ShopPulse_AMC_Contracts_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    App.toast('AMC Contracts exported to CSV!', 'success');
  }
};
