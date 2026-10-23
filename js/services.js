/**
 * ShopPulse — Services & Repair Center Job Sheets Module
 * Handles inward customer devices, repair claim tokens (3" POS & A4),
 * status workflows, hardware parts replacement, and 1-click GST invoice conversion.
 */

const Services = {
  activeFilter: 'all',
  searchQuery: '',

  /* ═══════════════════════════════════════════
     RENDER MAIN SERVICES & JOBS VIEW
  ═══════════════════════════════════════════ */
  render(container, filter = 'all') {
    this.activeFilter = filter;
    const jobs = DB.getJobs();
    const customers = DB.getCustomers();

    // Calculate metrics
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter(j => ['received', 'diagnosing', 'waiting_parts'].includes(j.status)).length;
    const readyJobs = jobs.filter(j => j.status === 'ready').length;
    const deliveredJobs = jobs.filter(j => j.status === 'delivered').length;
    const totalAdvance = jobs
      .filter(j => j.status !== 'delivered' && j.status !== 'cancelled')
      .reduce((sum, j) => sum + (parseFloat(j.advancePaid) || 0), 0);

    // Apply Filter & Search
    let filtered = [...jobs];
    if (this.activeFilter === 'active') {
      filtered = filtered.filter(j => ['received', 'diagnosing', 'waiting_parts'].includes(j.status));
    } else if (this.activeFilter === 'ready') {
      filtered = filtered.filter(j => j.status === 'ready');
    } else if (this.activeFilter === 'delivered') {
      filtered = filtered.filter(j => j.status === 'delivered');
    } else if (this.activeFilter === 'cancelled') {
      filtered = filtered.filter(j => j.status === 'cancelled');
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(j =>
        (j.jobNo && j.jobNo.toLowerCase().includes(q)) ||
        (j.customerName && j.customerName.toLowerCase().includes(q)) ||
        (j.customerPhone && j.customerPhone.includes(q)) ||
        (j.brandModel && j.brandModel.toLowerCase().includes(q)) ||
        (j.serialNo && j.serialNo.toLowerCase().includes(q)) ||
        (j.problemReported && j.problemReported.toLowerCase().includes(q))
      );
    }

    container.innerHTML = `
      <div class="page-header-row">
        <div>
          <h2>🛠️ Repair &amp; Service Center Job Sheets</h2>
          <p class="text-muted" style="margin-top:2px;font-size:.85rem">Track inward client hardware, claim tokens, technician diagnosis, and convert completed repairs to GST Tax Invoices.</p>
        </div>
        <div class="actions">
          <button class="btn btn-primary" onclick="Services.openForm()">
            <span class="material-icons">add_circle</span> New Service Job Sheet
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid" style="margin-bottom:20px">
        <div class="kpi-card kpi-warning">
          <div class="kpi-title">Active In-Shop Repairs</div>
          <div class="kpi-val">${activeJobs}</div>
          <div class="kpi-sub">Received, Diagnosing, or On-Hold</div>
        </div>
        <div class="kpi-card kpi-success">
          <div class="kpi-title">Ready for Pickup</div>
          <div class="kpi-val">${readyJobs}</div>
          <div class="kpi-sub">Repaired &amp; Tested OK</div>
        </div>
        <div class="kpi-card kpi-primary">
          <div class="kpi-title">Delivered &amp; Invoiced</div>
          <div class="kpi-val">${deliveredJobs}</div>
          <div class="kpi-sub">Total Completed Jobs</div>
        </div>
        <div class="kpi-card kpi-info">
          <div class="kpi-title">Advance Deposits Held</div>
          <div class="kpi-val">${fmtCurrency(totalAdvance)}</div>
          <div class="kpi-sub">From active inward hardware</div>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="card" style="margin-bottom:18px">
        <div class="card-body" style="padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <!-- Filter Tabs -->
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-xs ${this.activeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="Services.setFilter('all')">
              All Jobs (${totalJobs})
            </button>
            <button class="btn btn-xs ${this.activeFilter === 'active' ? 'btn-primary' : 'btn-secondary'}" onclick="Services.setFilter('active')">
              ⏳ In Progress (${activeJobs})
            </button>
            <button class="btn btn-xs ${this.activeFilter === 'ready' ? 'btn-primary' : 'btn-secondary'}" onclick="Services.setFilter('ready')">
              ✅ Ready for Pickup (${readyJobs})
            </button>
            <button class="btn btn-xs ${this.activeFilter === 'delivered' ? 'btn-primary' : 'btn-secondary'}" onclick="Services.setFilter('delivered')">
              📦 Delivered (${deliveredJobs})
            </button>
            <button class="btn btn-xs ${this.activeFilter === 'cancelled' ? 'btn-primary' : 'btn-secondary'}" onclick="Services.setFilter('cancelled')">
              🚫 Cancelled
            </button>
          </div>

          <!-- Search Input -->
          <div style="position:relative;min-width:260px">
            <span class="material-icons" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:18px;color:var(--text-muted)">search</span>
            <input type="text" class="form-control" style="padding-left:34px;height:34px;font-size:.85rem"
              placeholder="Search Job #, Device, S/N, or Customer..."
              value="${this.searchQuery}"
              oninput="Services.search(this.value)">
          </div>
        </div>
      </div>

      <!-- Job Sheets Table -->
      <div class="card">
        <div class="card-body" style="padding:0">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Job Sheet #</th>
                  <th>Customer</th>
                  <th>Device &amp; S/N</th>
                  <th>Reported Problem</th>
                  <th>Status</th>
                  <th class="text-right">Estimate &amp; Advance</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.length === 0 ? `
                  <tr>
                    <td colspan="7" class="table-empty">
                      <span class="material-icons" style="font-size:42px;color:var(--text-muted);display:block;margin-bottom:8px">build_circle</span>
                      <strong>No service job sheets found</strong>
                      <div class="text-muted" style="font-size:.82rem;margin-top:4px">Click "+ New Service Job Sheet" to take in a customer device.</div>
                    </td>
                  </tr>
                ` : filtered.map(job => {
                  const statusInfo = Services.getStatusBadge(job.status);
                  const estCost = parseFloat(job.finalCost || job.estimatedCost) || 0;
                  const advPaid = parseFloat(job.advancePaid) || 0;
                  const balanceDue = Math.max(0, estCost - advPaid);

                  return `
                    <tr>
                      <td>
                        <div style="font-weight:700;color:var(--primary);cursor:pointer" onclick="Services.viewJob('${job.id}')">${job.jobNo}</div>
                        <div style="font-size:.75rem;color:var(--text-secondary);margin-top:1px">
                          In: ${fmtDate(job.date)}
                          ${job.expectedDeliveryDate ? ` · Due: <strong>${fmtDate(job.expectedDeliveryDate)}</strong>` : ''}
                        </div>
                      </td>
                      <td>
                        <div style="font-weight:600">${job.customerName || 'Walk-in Customer'}</div>
                        ${job.customerPhone ? `
                          <div style="font-size:.76rem;color:var(--text-secondary);display:flex;align-items:center;gap:4px;margin-top:2px">
                            <span>📞 ${job.customerPhone}</span>
                            <a href="javascript:void(0)" onclick="Services.shareWhatsApp('${job.id}')" title="Chat on WhatsApp" style="color:#25d366;display:inline-flex;align-items:center">
                              <span class="material-icons" style="font-size:14px">chat</span>
                            </a>
                          </div>
                        ` : ''}
                      </td>
                      <td>
                        <div style="font-weight:600;display:flex;align-items:center;gap:6px">
                          <span class="badge" style="background:#e0f2fe;color:#0369a1;font-size:.7rem;padding:2px 6px">${job.deviceType || 'Hardware'}</span>
                          <span>${job.brandModel || '—'}</span>
                        </div>
                        ${job.serialNo ? `<div style="font-size:.74rem;font-family:monospace;color:var(--text-secondary);margin-top:2px">S/N: <strong>${job.serialNo}</strong></div>` : ''}
                        ${job.passwordPin && job.passwordPin !== 'None' ? `<div style="font-size:.72rem;color:var(--text-muted)">PIN/Pass: <span class="mono">${job.passwordPin}</span></div>` : ''}
                      </td>
                      <td style="max-width:280px">
                        <div style="font-size:.82rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${job.problemReported || ''}">
                          ${job.problemReported || '—'}
                        </div>
                        ${job.diagnosticsNotes ? `
                          <div style="font-size:.74rem;color:var(--text-secondary);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${job.diagnosticsNotes}">
                            🔧 <em>${job.diagnosticsNotes}</em>
                          </div>
                        ` : ''}
                        ${job.assignedTechnician ? `<div style="font-size:.72rem;color:var(--primary);margin-top:1px">Tech: ${job.assignedTechnician}</div>` : ''}
                      </td>
                      <td>
                        <span class="badge ${statusInfo.badgeClass}" style="display:inline-flex;align-items:center;gap:4px">
                          <span class="material-icons" style="font-size:13px">${statusInfo.icon}</span> ${statusInfo.label}
                        </span>
                        ${job.convertedToInvoiceNo ? `
                          <div style="font-size:.72rem;color:var(--success);font-weight:600;margin-top:3px">
                            🧾 Inv #${job.convertedToInvoiceNo}
                          </div>
                        ` : ''}
                      </td>
                      <td class="text-right">
                        <div style="font-weight:700">${fmtCurrency(estCost)}</div>
                        <div style="font-size:.75rem;color:var(--success);margin-top:1px">Adv: ${fmtCurrency(advPaid)}</div>
                        ${balanceDue > 0 && job.status !== 'delivered' ? `
                          <div style="font-size:.72rem;color:var(--danger);font-weight:600">Due: ${fmtCurrency(balanceDue)}</div>
                        ` : ''}
                      </td>
                      <td class="text-right action-col">
                        <div style="display:flex;gap:4px;justify-content:flex-end;flex-wrap:wrap">
                          <button class="btn btn-xs btn-secondary" onclick="Services.printTokenPrompt('${job.id}')" title="Print Customer Claim Token (3-Inch POS or A4)">
                            <span class="material-icons" style="font-size:14px">print</span>
                          </button>
                          <button class="btn btn-xs btn-secondary" onclick="Services.openStatusModal('${job.id}')" title="Update Repair Status, Notes &amp; Parts">
                            <span class="material-icons" style="font-size:14px">tune</span>
                          </button>
                          ${job.status !== 'delivered' && !job.convertedToInvoiceNo ? `
                            <button class="btn btn-xs btn-primary" onclick="Services.convertToInvoice('${job.id}')" title="Deliver &amp; Convert to GST Tax Invoice">
                              <span class="material-icons" style="font-size:14px">receipt</span>
                            </button>
                          ` : ''}
                          <button class="btn btn-xs btn-secondary" onclick="Services.openForm('${job.id}')" title="Edit Job Details">
                            <span class="material-icons" style="font-size:14px">edit</span>
                          </button>
                          <button class="btn btn-xs btn-danger" onclick="Services.deleteJob('${job.id}')" title="Delete Job Sheet">
                            <span class="material-icons" style="font-size:14px">delete</span>
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
      </div>
    `;
  },

  setFilter(filter) {
    this.activeFilter = filter;
    const c = document.getElementById('page-content');
    this.render(c, filter);
  },

  search(q) {
    this.searchQuery = q;
    const c = document.getElementById('page-content');
    this.render(c, this.activeFilter);
  },

  getStatusBadge(status) {
    switch (status) {
      case 'received':
        return { label: 'Received (Inward)', badgeClass: 'badge-draft', icon: 'login' };
      case 'diagnosing':
        return { label: 'In Diagnostics', badgeClass: 'badge-sent', icon: 'biotech' };
      case 'waiting_parts':
        return { label: 'Waiting for Parts', badgeClass: 'badge-warning', icon: 'hourglass_top' };
      case 'ready':
        return { label: 'Ready for Pickup', badgeClass: 'badge-paid', icon: 'check_circle' };
      case 'delivered':
        return { label: 'Delivered / Invoiced', badgeClass: 'badge-paid', icon: 'task_alt' };
      case 'cancelled':
        return { label: 'Cancelled / RTO', badgeClass: 'badge-danger', icon: 'cancel' };
      default:
        return { label: status, badgeClass: 'badge-draft', icon: 'help_outline' };
    }
  },

  /* ═══════════════════════════════════════════
     NEW / EDIT SERVICE JOB SHEET MODAL FORM
  ═══════════════════════════════════════════ */
  openForm(jobId = null) {
    const isNew = !jobId;
    const job = isNew ? null : DB.getJobById(jobId);
    const customers = DB.getCustomers();
    const today = new Date().toISOString().split('T')[0];

    const bodyHtml = `
      <form id="service-job-form" onsubmit="event.preventDefault(); Services.save('${jobId || ''}');">
        <!-- Customer Details Box -->
        <div style="background:#f8fafc;padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:14px">
          <div style="font-weight:700;font-size:.85rem;margin-bottom:8px;display:flex;align-items:center;gap:6px;color:var(--text-primary)">
            <span class="material-icons" style="font-size:16px;color:var(--primary)">person</span> Customer Contact Information
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label>Select Existing Customer</label>
              <select id="job-cust-select" class="form-control" onchange="Services._onCustomerSelect(this.value)">
                <option value="">-- Walk-in / Type Below --</option>
                ${customers.map(c => `
                  <option value="${c.id}" ${job && job.customerId === c.id ? 'selected' : ''}>${c.name} (${c.phone || 'No phone'})</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Customer Name <span class="required">*</span></label>
              <input type="text" id="job-cust-name" class="form-control" value="${job ? job.customerName || '' : ''}" required placeholder="e.g. Ramesh Kumar">
            </div>
            <div class="form-group">
              <label>Customer Mobile No. <span class="required">*</span></label>
              <input type="tel" id="job-cust-phone" class="form-control" value="${job ? job.customerPhone || '' : ''}" required placeholder="10-digit mobile number">
            </div>
            <div class="form-group">
              <label>Customer Address / Area</label>
              <input type="text" id="job-cust-addr" class="form-control" value="${job ? job.customerAddress || '' : ''}" placeholder="Local city or street">
            </div>
          </div>
        </div>

        <!-- Hardware & Device Information -->
        <div style="background:#f8fafc;padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:14px">
          <div style="font-weight:700;font-size:.85rem;margin-bottom:8px;display:flex;align-items:center;gap:6px;color:var(--text-primary)">
            <span class="material-icons" style="font-size:16px;color:var(--primary)">devices</span> Device &amp; Hardware Details
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label>Device Category <span class="required">*</span></label>
              <select id="job-device-type" class="form-control" required>
                ${['Laptop', 'Desktop PC', 'CCTV DVR', 'CCTV NVR', 'CCTV Camera', 'Printer', 'Monitor', 'UPS / Inverter', 'SMPS / Power Supply', 'Networking Switch/Router', 'Hard Disk / SSD', 'Motherboard / GPU', 'Other Electronic'].map(t => `
                  <option value="${t}" ${job && job.deviceType === t ? 'selected' : ''}>${t}</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Brand &amp; Model <span class="required">*</span></label>
              <input type="text" id="job-brand-model" class="form-control" value="${job ? job.brandModel || '' : ''}" required placeholder="e.g. HP Pavilion 15 / Hikvision 8CH">
            </div>
            <div class="form-group">
              <label>Serial Number (S/N) / IMEI</label>
              <input type="text" id="job-serial" class="form-control" style="font-family:monospace" value="${job ? job.serialNo || '' : ''}" placeholder="Hardware S/N for verification">
            </div>
            <div class="form-group">
              <label>Device Password / Pattern / PIN</label>
              <input type="text" id="job-password" class="form-control" value="${job ? job.passwordPin || '' : 'None'}" placeholder="e.g. 1234 or None">
            </div>
            <div class="form-group">
              <label>Accessories Received with Device</label>
              <input type="text" id="job-accessories" class="form-control" value="${job ? job.accessories || '' : 'Original Charger, Power Cord'}" placeholder="e.g. Charger, Bag, Cable, None">
            </div>
            <div class="form-group">
              <label>Physical Condition on Inward</label>
              <input type="text" id="job-condition" class="form-control" value="${job ? job.physicalCondition || '' : 'Normal wear, screen intact'}" placeholder="e.g. Scratches, broken hinge, good">
            </div>
          </div>
        </div>

        <!-- Problem Description & Estimation -->
        <div style="background:#f8fafc;padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:14px">
          <div style="font-weight:700;font-size:.85rem;margin-bottom:8px;display:flex;align-items:center;gap:6px;color:var(--text-primary)">
            <span class="material-icons" style="font-size:16px;color:var(--primary)">report_problem</span> Problem Reported &amp; Financial Estimates
          </div>
          <div class="form-group" style="margin-bottom:10px">
            <label>Problem Reported by Customer <span class="required">*</span></label>
            <textarea id="job-problem" class="form-control" rows="2" required placeholder="Describe the fault reported (e.g. No display, liquid spill, intermittent restart)...">${job ? job.problemReported || '' : ''}</textarea>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label>Estimated Repair Cost (₹)</label>
              <input type="number" id="job-est-cost" class="form-control" min="0" step="10" value="${job ? job.estimatedCost || 0 : 0}">
            </div>
            <div class="form-group">
              <label>Advance Deposit Paid (₹)</label>
              <input type="number" id="job-advance" class="form-control" min="0" step="10" value="${job ? job.advancePaid || 0 : 0}">
            </div>
            <div class="form-group">
              <label>Advance Payment Mode</label>
              <select id="job-adv-mode" class="form-control">
                ${['Cash', 'UPI', 'Bank Transfer', 'Card', 'None'].map(m => `
                  <option value="${m}" ${job && job.advancePaymentMethod === m ? 'selected' : (m === 'Cash' ? 'selected' : '')}>${m}</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Expected Delivery Date</label>
              <input type="date" id="job-deliv-date" class="form-control" value="${job && job.expectedDeliveryDate ? job.expectedDeliveryDate : today}">
            </div>
            <div class="form-group">
              <label>Assigned Hardware Technician</label>
              <input type="text" id="job-tech" class="form-control" value="${job ? job.assignedTechnician || '' : 'Senior Hardware Tech'}" placeholder="e.g. Amit / Sandeep">
            </div>
            <div class="form-group">
              <label>Initial Status</label>
              <select id="job-status" class="form-control">
                <option value="received" ${job && job.status === 'received' ? 'selected' : ''}>📥 Inward Received</option>
                <option value="diagnosing" ${job && job.status === 'diagnosing' ? 'selected' : ''}>🔬 In Diagnostics</option>
                <option value="waiting_parts" ${job && job.status === 'waiting_parts' ? 'selected' : ''}>⏳ Waiting for Parts</option>
                <option value="ready" ${job && job.status === 'ready' ? 'selected' : ''}>✅ Ready for Pickup</option>
                <option value="delivered" ${job && job.status === 'delivered' ? 'selected' : ''}>📦 Delivered &amp; Completed</option>
                <option value="cancelled" ${job && job.status === 'cancelled' ? 'selected' : ''}>🚫 Cancelled / Unrepairable</option>
              </select>
            </div>
          </div>
        </div>
      </form>
    `;

    App.modal(
      isNew ? 'Create New Service Job Sheet' : `Edit Service Job Sheet: ${job.jobNo}`,
      bodyHtml,
      `
        <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button type="button" class="btn btn-primary" onclick="document.getElementById('service-job-form').dispatchEvent(new Event('submit', {cancelable:true, bubbles:true}))">
          ${isNew ? 'Create Job Sheet &amp; Print Token' : 'Save Changes'}
        </button>
      `,
      'modal-lg'
    );
  },

  _onCustomerSelect(custId) {
    if (!custId) return;
    const cust = DB.getCustomerById(custId);
    if (!cust) return;
    const nameEl = document.getElementById('job-cust-name');
    const phoneEl = document.getElementById('job-cust-phone');
    const addrEl = document.getElementById('job-cust-addr');
    if (nameEl) nameEl.value = cust.name;
    if (phoneEl) phoneEl.value = cust.phone || '';
    if (addrEl) addrEl.value = `${cust.address || ''}${cust.city ? ', ' + cust.city : ''}`;
  },

  /* ═══════════════════════════════════════════
     SAVE SERVICE JOB SHEET
  ═══════════════════════════════════════════ */
  save(jobId = '') {
    const custName = document.getElementById('job-cust-name')?.value.trim();
    const custPhone = document.getElementById('job-cust-phone')?.value.trim();
    const brandModel = document.getElementById('job-brand-model')?.value.trim();
    const problem = document.getElementById('job-problem')?.value.trim();

    if (!custName) { App.toast('Please enter customer name.', 'error'); return; }
    if (!custPhone) { App.toast('Please enter customer mobile number.', 'error'); return; }
    if (!brandModel) { App.toast('Please enter device brand and model.', 'error'); return; }
    if (!problem) { App.toast('Please describe the reported fault/issue.', 'error'); return; }

    const isNew = !jobId;
    const existing = isNew ? null : DB.getJobById(jobId);

    const jobData = {
      ...(existing || {}),
      jobNo: existing ? existing.jobNo : DB.nextJobNo(),
      date: existing ? existing.date : new Date().toISOString().split('T')[0],
      customerId: document.getElementById('job-cust-select')?.value || null,
      customerName: custName,
      customerPhone: custPhone,
      customerAddress: document.getElementById('job-cust-addr')?.value.trim() || '',
      deviceType: document.getElementById('job-device-type')?.value || 'Laptop',
      brandModel: brandModel,
      serialNo: document.getElementById('job-serial')?.value.trim() || '',
      passwordPin: document.getElementById('job-password')?.value.trim() || 'None',
      accessories: document.getElementById('job-accessories')?.value.trim() || 'None',
      physicalCondition: document.getElementById('job-condition')?.value.trim() || 'Normal wear',
      problemReported: problem,
      estimatedCost: parseFloat(document.getElementById('job-est-cost')?.value) || 0,
      advancePaid: parseFloat(document.getElementById('job-advance')?.value) || 0,
      advancePaymentMethod: document.getElementById('job-adv-mode')?.value || 'Cash',
      expectedDeliveryDate: document.getElementById('job-deliv-date')?.value || '',
      assignedTechnician: document.getElementById('job-tech')?.value.trim() || '',
      status: document.getElementById('job-status')?.value || 'received'
    };

    const saved = DB.saveJob(jobData, isNew);
    App.closeModal();
    App.toast(isNew ? `Job Sheet #${saved.jobNo} created successfully!` : 'Job Sheet updated successfully!', 'success');

    const c = document.getElementById('page-content');
    this.render(c, this.activeFilter);

    // If new job, prompt to print claim token immediately
    if (isNew) {
      setTimeout(() => {
        this.printTokenPrompt(saved.id);
      }, 350);
    }
  },

  /* ═══════════════════════════════════════════
     VIEW JOB DETAILS MODAL
  ═══════════════════════════════════════════ */
  viewJob(id) {
    const job = DB.getJobById(id);
    if (!job) return;
    const biz = DB.getBiz();
    const statusInfo = this.getStatusBadge(job.status);
    const estCost = parseFloat(job.finalCost || job.estimatedCost) || 0;
    const advPaid = parseFloat(job.advancePaid) || 0;
    const balanceDue = Math.max(0, estCost - advPaid);

    const bodyHtml = `
      <div style="margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-size:1.15rem;font-weight:800;letter-spacing:-.02em">${job.jobNo}</div>
          <div style="font-size:.8rem;color:var(--text-secondary)">Inward: ${fmtDate(job.date)} · Expected: ${job.expectedDeliveryDate ? fmtDate(job.expectedDeliveryDate) : 'Not Specified'}</div>
        </div>
        <div>
          <span class="badge ${statusInfo.badgeClass}" style="font-size:.85rem;padding:4px 10px">
            <span class="material-icons" style="font-size:14px;vertical-align:middle">${statusInfo.icon}</span> ${statusInfo.label}
          </span>
        </div>
      </div>

      <!-- Customer & Device Grid -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-bottom:16px">
        <div style="padding:12px;background:var(--bg);border-radius:var(--radius-sm);font-size:.85rem">
          <div style="font-weight:700;color:var(--primary);margin-bottom:6px">👤 Customer Information</div>
          <div><strong>${job.customerName}</strong></div>
          <div>📞 ${job.customerPhone || 'No Phone'}</div>
          <div style="color:var(--text-secondary)">${job.customerAddress || 'Local Walk-in'}</div>
        </div>
        <div style="padding:12px;background:var(--bg);border-radius:var(--radius-sm);font-size:.85rem">
          <div style="font-weight:700;color:var(--primary);margin-bottom:6px">💻 Device &amp; Hardware</div>
          <div><strong>${job.deviceType}</strong>: ${job.brandModel}</div>
          <div>S/N: <span class="mono">${job.serialNo || 'None'}</span></div>
          <div>PIN / Password: <span class="mono">${job.passwordPin || 'None'}</span></div>
          <div style="color:var(--text-secondary)">Accessories: ${job.accessories || 'None'}</div>
        </div>
      </div>

      <!-- Problem & Diagnostics Box -->
      <div style="padding:12px;background:var(--bg);border-radius:var(--radius-sm);margin-bottom:16px;font-size:.85rem">
        <div style="font-weight:700;color:var(--danger);margin-bottom:4px">⚠️ Problem Reported:</div>
        <div style="margin-bottom:10px;line-height:1.5">${job.problemReported}</div>
        <div style="font-weight:700;color:var(--primary);margin-bottom:4px">🔧 Technician Diagnosis &amp; Actions:</div>
        <div style="line-height:1.5">${job.diagnosticsNotes || 'Diagnosis pending or in progress.'}</div>
        ${job.assignedTechnician ? `<div style="font-size:.78rem;color:var(--text-secondary);margin-top:6px">Assigned to: <strong>${job.assignedTechnician}</strong></div>` : ''}
      </div>

      <!-- Replaced Parts & Labor (if any) -->
      ${job.itemsUsed && job.itemsUsed.length > 0 ? `
        <div style="margin-bottom:16px">
          <strong style="font-size:.85rem">Hardware Parts &amp; Services Rendered:</strong>
          <table class="table" style="margin-top:6px;font-size:.82rem">
            <thead><tr><th>#</th><th>Description</th><th>HSN/SAC</th><th>Qty</th><th class="text-right">Rate</th><th class="text-right">Total</th></tr></thead>
            <tbody>
              ${job.itemsUsed.map((it, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${it.name}</strong></td>
                  <td class="mono">${it.hsn || '998731'}</td>
                  <td>${it.qty}</td>
                  <td class="text-right">${fmtCurrency(it.rate)}</td>
                  <td class="text-right">${fmtCurrency(it.qty * it.rate)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- Financial Balance Card -->
      <div style="padding:12px;background:#f8fafc;border:1px solid var(--border);border-radius:var(--radius-sm);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div>
          <span style="font-size:.82rem;color:var(--text-secondary)">Advance Paid: </span>
          <strong style="color:var(--success)">${fmtCurrency(advPaid)}</strong> (${job.advancePaymentMethod || 'Cash'})
        </div>
        <div>
          <span style="font-size:.82rem;color:var(--text-secondary)">Total Estimated/Final: </span>
          <strong style="font-size:1.05rem">${fmtCurrency(estCost)}</strong>
        </div>
        ${balanceDue > 0 ? `
          <div style="color:var(--danger);font-weight:700;font-size:.9rem">
            Remaining Balance Due: ${fmtCurrency(balanceDue)}
          </div>
        ` : '<span class="badge badge-paid">Fully Settled</span>'}
      </div>
    `;

    App.modal(
      `Job Sheet Details: ${job.jobNo}`,
      bodyHtml,
      `
        <button class="btn btn-secondary" onclick="App.closeModal()">Close</button>
        <button class="btn btn-secondary" onclick="Services.shareWhatsApp('${job.id}')" title="Send WhatsApp Update">
          <span class="material-icons" style="color:#25d366">chat</span> WhatsApp
        </button>
        <button class="btn btn-secondary" onclick="Services.printTokenPrompt('${job.id}')" title="Print Token Slip">
          <span class="material-icons">print</span> Print Token
        </button>
        <button class="btn btn-secondary" onclick="Services.exportTokenPDF('${job.id}', 'a4')" title="Save as PDF">
          <span class="material-icons" style="color:#e74c3c">picture_as_pdf</span> PDF
        </button>
        <button class="btn btn-primary" onclick="App.closeModal();Services.openStatusModal('${job.id}')">
          <span class="material-icons">tune</span> Update Status / Parts
        </button>
      `,
      'modal-lg'
    );
  },

  /* ═══════════════════════════════════════════
     STATUS UPDATE & PARTS MODAL
  ═══════════════════════════════════════════ */
  openStatusModal(id) {
    const job = DB.getJobById(id);
    if (!job) return;
    const products = DB.getProducts();

    const bodyHtml = `
      <form id="job-status-form" onsubmit="event.preventDefault(); Services._saveStatus('${job.id}');">
        <div class="form-group" style="margin-bottom:12px">
          <label>Update Repair Workflow Status <span class="required">*</span></label>
          <select id="update-status-val" class="form-control" style="font-weight:700">
            <option value="received" ${job.status === 'received' ? 'selected' : ''}>📥 Inward Received</option>
            <option value="diagnosing" ${job.status === 'diagnosing' ? 'selected' : ''}>🔬 In Diagnostics / Troubleshooting</option>
            <option value="waiting_parts" ${job.status === 'waiting_parts' ? 'selected' : ''}>⏳ Waiting for Parts (On Hold)</option>
            <option value="ready" ${job.status === 'ready' ? 'selected' : ''}>✅ Repaired &amp; Ready for Pickup</option>
            <option value="delivered" ${job.status === 'delivered' ? 'selected' : ''}>📦 Delivered &amp; Completed</option>
            <option value="cancelled" ${job.status === 'cancelled' ? 'selected' : ''}>🚫 Cancelled / Unrepairable (RTO)</option>
          </select>
        </div>

        <div class="form-group" style="margin-bottom:12px">
          <label>Technician Findings &amp; Diagnostics Notes</label>
          <textarea id="update-diag-notes" class="form-control" rows="3" placeholder="Enter diagnostic actions taken, components tested, chip-level work performed...">${job.diagnosticsNotes || ''}</textarea>
        </div>

        <div class="form-grid" style="margin-bottom:12px">
          <div class="form-group">
            <label>Final / Updated Service Cost (₹)</label>
            <input type="number" id="update-final-cost" class="form-control" min="0" value="${job.finalCost || job.estimatedCost || 0}">
          </div>
          <div class="form-group">
            <label>Assigned Technician</label>
            <input type="text" id="update-tech-name" class="form-control" value="${job.assignedTechnician || ''}" placeholder="Technician name">
          </div>
        </div>

        <!-- Parts Replaced / Labor Items -->
        <div style="background:#f8fafc;padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <strong style="font-size:.85rem;color:var(--text-primary)">Replaced Hardware Parts / Service Items:</strong>
            <button type="button" class="btn btn-xs btn-secondary" onclick="Services._addPartRow()">
              <span class="material-icons" style="font-size:14px">add</span> Add Part / Service
            </button>
          </div>
          <div id="job-parts-table-wrap">
            <table class="table" style="font-size:.82rem" id="job-parts-table">
              <thead><tr><th>Item / Part Name</th><th>HSN/SAC</th><th style="width:70px">Qty</th><th style="width:100px">Rate (₹)</th><th style="width:40px"></th></tr></thead>
              <tbody id="job-parts-tbody">
                ${(job.itemsUsed || []).map((it, idx) => `
                  <tr>
                    <td><input type="text" class="form-control form-control-sm part-name" value="${it.name || ''}" placeholder="Part / Service description"></td>
                    <td><input type="text" class="form-control form-control-sm part-hsn" value="${it.hsn || '998731'}" placeholder="HSN/SAC"></td>
                    <td><input type="number" class="form-control form-control-sm part-qty" value="${it.qty || 1}" min="1"></td>
                    <td><input type="number" class="form-control form-control-sm part-rate" value="${it.rate || 0}" min="0"></td>
                    <td><button type="button" class="btn btn-xs btn-danger" onclick="this.closest('tr').remove()"><span class="material-icons" style="font-size:12px">delete</span></button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </form>
    `;

    App.modal(
      `Update Status: ${job.jobNo}`,
      bodyHtml,
      `
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Services._saveStatus('${job.id}')">Save &amp; Update Status</button>
      `,
      'modal-md'
    );
  },

  _addPartRow() {
    const tbody = document.getElementById('job-parts-tbody');
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" class="form-control form-control-sm part-name" placeholder="e.g. 512GB NVMe SSD Upgrade"></td>
      <td><input type="text" class="form-control form-control-sm part-hsn" value="8471" placeholder="HSN/SAC"></td>
      <td><input type="number" class="form-control form-control-sm part-qty" value="1" min="1"></td>
      <td><input type="number" class="form-control form-control-sm part-rate" value="0" min="0"></td>
      <td><button type="button" class="btn btn-xs btn-danger" onclick="this.closest('tr').remove()"><span class="material-icons" style="font-size:12px">delete</span></button></td>
    `;
    tbody.appendChild(tr);
  },

  _saveStatus(jobId) {
    const job = DB.getJobById(jobId);
    if (!job) return;

    const newStatus = document.getElementById('update-status-val')?.value || job.status;
    const diagNotes = document.getElementById('update-diag-notes')?.value.trim() || '';
    const finalCost = parseFloat(document.getElementById('update-final-cost')?.value) || job.estimatedCost;
    const techName = document.getElementById('update-tech-name')?.value.trim() || job.assignedTechnician;

    // Collect parts
    const parts = [];
    document.querySelectorAll('#job-parts-tbody tr').forEach(row => {
      const name = row.querySelector('.part-name')?.value.trim();
      const hsn = row.querySelector('.part-hsn')?.value.trim() || '998731';
      const qty = parseFloat(row.querySelector('.part-qty')?.value) || 1;
      const rate = parseFloat(row.querySelector('.part-rate')?.value) || 0;
      if (name) {
        parts.push({ name, hsn, qty, rate, gstRate: 18 });
      }
    });

    job.status = newStatus;
    job.diagnosticsNotes = diagNotes;
    job.finalCost = finalCost;
    job.assignedTechnician = techName;
    job.itemsUsed = parts;

    if (newStatus === 'delivered' && !job.deliveredAt) {
      job.deliveredAt = new Date().toISOString().split('T')[0];
    }

    DB.saveJob(job, false);
    App.closeModal();
    App.toast(`Status updated to "${this.getStatusBadge(newStatus).label}"!`, 'success');

    const c = document.getElementById('page-content');
    this.render(c, this.activeFilter);
  },

  /* ═══════════════════════════════════════════
     PRINT CLAIM TOKEN PROMPT & MODAL
  ═══════════════════════════════════════════ */
  printTokenPrompt(jobId) {
    const job = DB.getJobById(jobId);
    if (!job) return;

    App.modal(
      `Print Service Claim Token: ${job.jobNo}`,
      `
        <div style="text-align:center;padding:12px">
          <span class="material-icons" style="font-size:46px;color:var(--primary);margin-bottom:8px">receipt_long</span>
          <h3>Print Customer Claim Token</h3>
          <p style="color:var(--text-secondary);font-size:.85rem;margin:6px 0 16px">
            Select the desired print format. 3" Thermal slip is ideal for sticking on the device and handing customer a claim receipt.
          </p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="App.closeModal();Services.printToken('${job.id}', 'compact_pos')" style="padding:10px 16px">
              <span class="material-icons">receipt</span> 3" Thermal POS Slip (80mm)
            </button>
            <button class="btn btn-secondary" onclick="App.closeModal();Services.printToken('${job.id}', 'a4')" style="padding:10px 16px">
              <span class="material-icons">description</span> Standard A4 Slip
            </button>
            <button class="btn btn-secondary" onclick="App.closeModal();Services.exportTokenPDF('${job.id}', 'a4')" style="padding:10px 16px">
              <span class="material-icons" style="color:#e74c3c">picture_as_pdf</span> Save as PDF
            </button>
          </div>
        </div>
      `,
      `<button class="btn btn-ghost" onclick="App.closeModal()">Close</button>`,
      'modal-sm'
    );
  },

  /* ═══════════════════════════════════════════
     GENERATE PRINTABLE HTML & DISPATCH
  ═══════════════════════════════════════════ */
  generateTokenHtml(job, format = 'compact_pos') {
    if (!job) return '';
    const biz = DB.getBiz();
    const estCost = parseFloat(job.finalCost || job.estimatedCost) || 0;
    const advPaid = parseFloat(job.advancePaid) || 0;
    const balanceDue = Math.max(0, estCost - advPaid);

    let html = '';
    if (format === 'compact_pos') {
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Job Token - ${job.jobNo}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body {
              font-family: 'Courier New', Courier, monospace, sans-serif;
              width: 76mm;
              margin: 2mm auto;
              padding: 2mm;
              color: #000;
              font-size: 11px;
              line-height: 1.35;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .title { font-size: 14px; font-weight: 800; margin: 4px 0; }
            .dash { border-top: 1px dashed #000; margin: 5px 0; }
            .row { display: flex; justify-content: space-between; }
            .terms { font-size: 8.5px; line-height: 1.25; margin-top: 6px; }
            @media print {
              body { width: 100%; margin: 0; padding: 2mm; }
            }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="bold" style="font-size:15px">${biz.name}</div>
            <div>${biz.address || ''}, ${biz.city || ''}</div>
            <div>Tel: ${biz.phone || ''}</div>
            ${biz.gstin ? `<div>GSTIN: ${biz.gstin}</div>` : ''}
            <div class="dash"></div>
            <div class="title">*** SERVICE CLAIM TOKEN ***</div>
            <div class="dash"></div>
          </div>

          <div class="row"><span class="bold">Job Token #:</span> <span class="bold">${job.jobNo}</span></div>
          <div class="row"><span>Inward Date:</span> <span>${fmtDate(job.date)}</span></div>
          ${job.expectedDeliveryDate ? `<div class="row"><span class="bold">Exp. Delivery:</span> <span class="bold">${fmtDate(job.expectedDeliveryDate)}</span></div>` : ''}
          <div class="dash"></div>

          <div><span class="bold">Customer:</span> ${job.customerName}</div>
          <div><span class="bold">Mobile:</span> ${job.customerPhone || '—'}</div>
          <div class="dash"></div>

          <div><span class="bold">Device:</span> ${job.deviceType} - ${job.brandModel}</div>
          ${job.serialNo ? `<div><span class="bold">S/N:</span> ${job.serialNo}</div>` : ''}
          ${job.passwordPin && job.passwordPin !== 'None' ? `<div><span class="bold">Password/PIN:</span> ${job.passwordPin}</div>` : ''}
          <div><span class="bold">Accessories:</span> ${job.accessories || 'None'}</div>
          <div><span class="bold">Condition:</span> ${job.physicalCondition || 'Normal wear'}</div>
          <div class="dash"></div>

          <div><span class="bold">Reported Fault:</span></div>
          <div style="margin:2px 0 4px">${job.problemReported}</div>
          <div class="dash"></div>

          <div class="row"><span>Est. Repair Cost:</span> <span class="bold">${fmtCurrency(estCost)}</span></div>
          <div class="row"><span>Advance Paid:</span> <span class="bold">${fmtCurrency(advPaid)}</span></div>
          ${balanceDue > 0 ? `<div class="row bold" style="font-size:12px"><span>Balance Due:</span> <span>${fmtCurrency(balanceDue)}</span></div>` : ''}
          <div class="dash"></div>

          <div class="center" style="margin:6px 0">
            <div style="font-family:monospace;letter-spacing:2px;font-size:12px;font-weight:bold">* ${job.jobNo} *</div>
          </div>

          <div class="terms">
            <strong>TERMS &amp; CONDITIONS:</strong><br>
            1. Present this original claim token at the time of collecting your hardware.<br>
            2. Customer must backup personal data before service. Shop is not liable for data loss.<br>
            3. Goods not claimed within 30 days of completion are subject to scrap disposal.<br>
            4. 30-day warranty applies exclusively to components repaired or replaced.
          </div>

          <div class="center" style="margin-top:10px;font-size:9px">
            Thank you for choosing ${biz.name}!
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
        </html>
      `;
    } else {
      // Standard A4 / A5 Slip
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Service Job Sheet - ${job.jobNo}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 13px; line-height: 1.5; color: #1e293b; padding: 20px; }
            .header-table { width: 100%; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
            .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }
            .box h4 { margin: 0 0 6px; color: #0284c7; font-size: 13px; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
            th { background: #f1f5f9; font-weight: 600; font-size: 12px; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .terms { font-size: 11px; color: #64748b; margin-top: 20px; border-top: 1px solid #cbd5e1; padding-top: 10px; }
            .sig-row { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 10px; }
            .sig-box { width: 200px; text-align: center; border-top: 1px solid #000; padding-top: 4px; font-weight: 600; font-size: 12px; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div style="font-size:20px;font-weight:800;color:#0f172a">${biz.name}</div>
                <div style="color:#64748b">${biz.tagline || 'IT Solutions & Hardware Service Center'}</div>
                <div>${biz.address || ''}, ${biz.city || ''}</div>
                <div>Tel: ${biz.phone || ''} | Email: ${biz.email || ''}</div>
                ${biz.gstin ? `<div><strong>GSTIN:</strong> ${biz.gstin}</div>` : ''}
              </td>
              <td class="text-right">
                <div style="font-size:18px;font-weight:800;color:#0284c7">SERVICE JOB SHEET</div>
                <div style="font-size:15px;font-weight:700;margin-top:2px">${job.jobNo}</div>
                <div><strong>Inward Date:</strong> ${fmtDate(job.date)}</div>
                ${job.expectedDeliveryDate ? `<div><strong>Expected Delivery:</strong> ${fmtDate(job.expectedDeliveryDate)}</div>` : ''}
              </td>
            </tr>
          </table>

          <div class="grid">
            <div class="box">
              <h4>Customer Details</h4>
              <div><strong>${job.customerName}</strong></div>
              <div>Phone: ${job.customerPhone || '—'}</div>
              <div>Address: ${job.customerAddress || 'Local Walk-in'}</div>
            </div>
            <div class="box">
              <h4>Hardware Specifications</h4>
              <div><strong>Device:</strong> ${job.deviceType} — ${job.brandModel}</div>
              <div><strong>Serial Number (S/N):</strong> ${job.serialNo || 'None'}</div>
              <div><strong>Password / PIN:</strong> ${job.passwordPin || 'None'}</div>
              <div><strong>Accessories Received:</strong> ${job.accessories || 'None'}</div>
              <div><strong>Physical Condition:</strong> ${job.physicalCondition || 'Normal wear'}</div>
            </div>
          </div>

          <div class="box" style="margin-bottom:16px">
            <h4>Reported Fault &amp; Initial Diagnosis</h4>
            <div><strong>Problem Reported:</strong> ${job.problemReported}</div>
            ${job.diagnosticsNotes ? `<div style="margin-top:4px"><strong>Diagnosis Notes:</strong> ${job.diagnosticsNotes}</div>` : ''}
            ${job.assignedTechnician ? `<div style="margin-top:4px"><strong>Assigned Technician:</strong> ${job.assignedTechnician}</div>` : ''}
          </div>

          <table>
            <thead><tr><th>Financial Summary</th><th class="text-right">Amount (₹)</th></tr></thead>
            <tbody>
              <tr><td>Estimated / Final Repair Charges</td><td class="text-right bold">${fmtCurrency(estCost)}</td></tr>
              <tr><td>Advance Deposit Received (${job.advancePaymentMethod || 'Cash'})</td><td class="text-right" style="color:#16a34a">${fmtCurrency(advPaid)}</td></tr>
              <tr style="background:#f8fafc"><td class="bold">Remaining Balance Due Upon Delivery</td><td class="text-right bold" style="font-size:14px;color:#dc2626">${fmtCurrency(balanceDue)}</td></tr>
            </tbody>
          </table>

          <div class="terms">
            <strong>Customer Acknowledgement &amp; Terms:</strong><br>
            1. I hereby authorize the repair of the above hardware and acknowledge that any diagnosis advance is non-refundable.<br>
            2. I agree that the service center is not liable for data loss; all sensitive data has been backed up prior to handover.<br>
            3. Hardware not claimed within 30 days of repair completion notification will be treated as abandoned and scrapped.
          </div>

          <div class="sig-row">
            <div class="sig-box">Customer Signature</div>
            <div class="sig-box">Authorized Store Signature</div>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
        </html>
      `;
    }

    return html;
  },

  printToken(jobId, format = 'compact_pos') {
    const job = DB.getJobById(jobId);
    if (!job) return;
    const cleanJobNo = (job.jobNo || 'Token').replace(/[\/\\:*?"<>|]/g, '-');
    const cleanParty = ((job.customerName || 'Customer').trim()).replace(/[\/\\:*?"<>|\s]+/g, '_');
    const title = `JobSheet_${cleanJobNo}_${cleanParty}`;
    const html = this.generateTokenHtml(job, format);

    if (window.desktopApp && typeof window.desktopApp.printHtml === 'function') {
      window.desktopApp.printHtml({ html, title });
      return;
    }

    const printWin = window.open('', '_blank', 'width=900,height=750');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(html);
      printWin.document.close();
    }
  },

  async exportTokenPDF(jobId, format = 'a4') {
    const job = DB.getJobById(jobId);
    if (!job) {
      App.toast('Job not found for export', 'error');
      return;
    }
    const cleanJobNo = (job.jobNo || 'Token').replace(/[\/\\:*?"<>|]/g, '-');
    const cleanParty = ((job.customerName || 'Customer').trim()).replace(/[\/\\:*?"<>|\s]+/g, '_');
    const title = `JobSheet_${cleanJobNo}_${cleanParty}`;
    const html = this.generateTokenHtml(job, format);
    const defaultDir = DB.getBiz().pdfSaveDir || '';

    if (window.desktopApp && window.desktopApp.savePdf) {
      App.toast('Preparing Job Sheet PDF...', 'info');
      try {
        const res = await window.desktopApp.savePdf({ html, title, defaultDir });
        if (res && res.success) {
          App.toast(`🎉 PDF Saved: ${res.filePath}`, 'success');
        }
      } catch (err) {
        console.error('Job sheet PDF export error:', err);
        this.printToken(jobId, format);
      }
    } else {
      this.printToken(jobId, format);
      App.toast('In the print dialog, choose "Save as PDF" 📄', 'info');
    }
  },

  /* ═══════════════════════════════════════════
     SHARE STATUS VIA WHATSAPP
  ═══════════════════════════════════════════ */
  shareWhatsApp(jobId) {
    const job = DB.getJobById(jobId);
    if (!job) return;
    const biz = DB.getBiz();
    const estCost = parseFloat(job.finalCost || job.estimatedCost) || 0;
    const advPaid = parseFloat(job.advancePaid) || 0;
    const balanceDue = Math.max(0, estCost - advPaid);
    const statusLabel = this.getStatusBadge(job.status).label;

    const text = `Hello *${job.customerName}*,\n\nYour service request update from *${biz.name}*:\n\n` +
      `🛠️ *Job Sheet No:* ${job.jobNo}\n` +
      `💻 *Device:* ${job.deviceType} - ${job.brandModel}\n` +
      `${job.serialNo ? `🔢 *Serial No:* ${job.serialNo}\n` : ''}` +
      `⚠️ *Reported Issue:* ${job.problemReported}\n` +
      `📌 *Current Status:* ${statusLabel}\n` +
      `💰 *Estimated Cost:* ₹${estCost} (Advance Paid: ₹${advPaid})\n` +
      `${balanceDue > 0 ? `💵 *Balance Due:* ₹${balanceDue}\n` : ''}` +
      `${job.expectedDeliveryDate ? `📅 *Expected Delivery:* ${fmtDate(job.expectedDeliveryDate)}\n` : ''}` +
      `\nFor any inquiries, please contact us at ${biz.phone || ''}. Thank you!`;

    const phone = (job.customerPhone || '').replace(/[^0-9]/g, '');
    const cleanPhone = phone.length === 10 ? '91' + phone : phone;
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  },

  /* ═══════════════════════════════════════════
     1-CLICK CONVERT TO TAX INVOICE
  ═══════════════════════════════════════════ */
  convertToInvoice(jobId) {
    const job = DB.getJobById(jobId);
    if (!job) return;
    const biz = DB.getBiz();
    const estCost = parseFloat(job.finalCost || job.estimatedCost) || 0;
    const advPaid = parseFloat(job.advancePaid) || 0;

    App.modal(
      `Convert Job Sheet to Tax Invoice: ${job.jobNo}`,
      `
        <div style="padding:10px 4px">
          <p style="font-size:.85rem;color:var(--text-secondary);margin-bottom:12px">
            This will generate a formal GST Tax Invoice for <strong>${job.customerName}</strong>. Service labor and replaced hardware parts will be automatically added to the invoice items.
          </p>

          <div style="background:#f8fafc;padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:14px;font-size:.85rem">
            <div><strong>Device:</strong> ${job.deviceType} - ${job.brandModel} (${job.serialNo || 'No S/N'})</div>
            <div><strong>Issue Repaired:</strong> ${job.problemReported}</div>
            <div style="margin-top:6px">
              <strong>Service Labor Charges:</strong>
              <input type="number" id="conv-labor-cost" class="form-control" style="width:160px;display:inline-block;margin-left:8px" value="${estCost}" min="0">
            </div>
            <div style="font-size:.76rem;color:var(--text-secondary);margin-top:4px">GST SAC Code 998731 (Computer &amp; Electronic Hardware Repair) @ 18% GST</div>
          </div>

          ${job.itemsUsed && job.itemsUsed.length > 0 ? `
            <div style="margin-bottom:12px">
              <strong style="font-size:.85rem">Included Replacement Hardware Parts:</strong>
              <div style="font-size:.8rem;color:var(--text-secondary)">
                ${job.itemsUsed.map(it => `• ${it.name} (Qty: ${it.qty} @ ₹${it.rate})`).join('<br>')}
              </div>
            </div>
          ` : ''}

          ${advPaid > 0 ? `
            <div style="padding:8px 12px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:var(--radius-sm);font-size:.82rem;color:hsl(226,71%,40%)">
              💡 <strong>Advance Credited:</strong> The advance deposit of <strong>${fmtCurrency(advPaid)}</strong> already paid by customer will be recorded in the invoice payment settlements.
            </div>
          ` : ''}
        </div>
      `,
      `
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="Services._executeInvoiceConversion('${job.id}')">
          <span class="material-icons">receipt</span> Generate Tax Invoice
        </button>
      `,
      'modal-md'
    );
  },

  _executeInvoiceConversion(jobId) {
    const job = DB.getJobById(jobId);
    if (!job) return;
    const biz = DB.getBiz();
    const laborCost = parseFloat(document.getElementById('conv-labor-cost')?.value) || (job.finalCost || job.estimatedCost);

    // Build items
    const items = [
      {
        name: `Computer & Electronics Hardware Repair Service (Job Sheet #${job.jobNo})`,
        hsn: '998731',
        qty: 1,
        unit: 'Job',
        rate: laborCost,
        discount: 0,
        gstRate: 18,
        serialNo: job.serialNo || '',
        warranty: '30 Days Service Warranty'
      }
    ];

    if (job.itemsUsed && job.itemsUsed.length > 0) {
      job.itemsUsed.forEach(part => {
        items.push({
          name: part.name,
          hsn: part.hsn || '8471',
          qty: part.qty || 1,
          unit: 'Nos',
          rate: part.rate || 0,
          discount: 0,
          gstRate: part.gstRate || 18,
          serialNo: '',
          warranty: '1 Year Manufacturer'
        });
      });
    }

    const totals = calcTotals(items, biz.stateCode, biz.stateCode);
    const invoiceNo = DB.nextInvoiceNo();
    const advPaid = parseFloat(job.advancePaid) || 0;

    const payments = [];
    let status = 'unpaid';
    if (advPaid > 0) {
      payments.push({
        id: genId('PAY'),
        amount: Math.min(advPaid, totals.total),
        date: job.date || new Date().toISOString().split('T')[0],
        method: job.advancePaymentMethod || 'UPI',
        reference: `Advance Deposit from Job Sheet ${job.jobNo}`,
        notes: 'Advance credited during job inward'
      });
      status = advPaid >= totals.total ? 'paid' : 'partial';
    }

    const saleDoc = {
      invoiceNo,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      customerId: job.customerId || null,
      customerName: job.customerName,
      customerPhone: job.customerPhone || '',
      customerAddress: job.customerAddress || '',
      customerState: biz.state,
      customerStateCode: biz.stateCode,
      status,
      payments,
      paidAmount: payments.reduce((s, p) => s + p.amount, 0),
      notes: `Generated from Service Job Sheet #${job.jobNo} for ${job.deviceType} (${job.brandModel}).`,
      ...totals
    };

    DB.saveSale(saleDoc, true);

    // Update job sheet status to delivered & link invoice
    job.status = 'delivered';
    job.convertedToInvoiceNo = invoiceNo;
    job.deliveredAt = new Date().toISOString().split('T')[0];
    DB.saveJob(job, false);

    App.closeModal();
    App.toast(`Generated Tax Invoice #${invoiceNo} for Job Sheet #${job.jobNo}!`, 'success');

    // Switch view to sales invoices
    App.route('#billing-sales');
  },

  /* ═══════════════════════════════════════════
     DELETE SERVICE JOB SHEET
  ═══════════════════════════════════════════ */
  deleteJob(id) {
    const job = DB.getJobById(id);
    if (!job) return;

    App.modal(
      'Delete Job Sheet',
      `
        <div class="confirm-body">
          <span class="material-icons" style="color:var(--danger)">delete_forever</span>
          <h3>Delete Job Sheet "${job.jobNo}"?</h3>
          <p style="margin-top:6px;line-height:1.5">
            Are you sure you want to permanently delete this job sheet for <strong>${job.customerName}</strong> (${job.brandModel})?
          </p>
        </div>
      `,
      `
        <button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-danger" onclick="DB.deleteJob('${id}');App.closeModal();App.toast('Job Sheet deleted.','info');Services.render(document.getElementById('page-content'),Services.activeFilter);">Delete Job Sheet</button>
      `,
      'modal-sm'
    );
  }
};
