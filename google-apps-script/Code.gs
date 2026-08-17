/**
 * =========================================================================
 * ShopPulse Centralized License Manager & Telemetry Engine (v3.0)
 * Author: Shraban Kumar Mahato (shraban@andropcsoft.com)
 * =========================================================================
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet ("ShopPulse License Manager")
 * 2. Click "Extensions" -> "Apps Script"
 * 3. Replace all code with this script
 * 4. Click "Save" (💾)
 * 5. Run "setupSheets" to auto-create tabs and colored header rows!
 * 6. Click "Deploy" -> "New deployment" -> Web app -> Anyone -> Deploy!
 */

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // ─── 1. TAB: Active Commercial Licenses ───
  let licSheet = ss.getSheetByName('Active_Licenses');
  if (!licSheet) licSheet = ss.insertSheet('Active_Licenses');
  
  const licHeaders = [
    'Machine ID', 'License Key', 'Company / Shop Name', 'Owner / Contact', 'Registered Email', 
    'Phone', 'City', 'State', 'Pincode', 'Address', 'GSTIN', 'PAN', 'Bank / UPI ID', 
    'Plan Type', 'Status', 'Days Left', 'Sales Count', 'Purchase Count', 'Products', 
    'Parties', 'Total Revenue (₹)', 'Expiry Date', 'Remote Command', 'Extend Days', 
    'First Seen', 'Last Heartbeat'
  ];
  
  licSheet.getRange(1, 1, 1, licHeaders.length).setValues([licHeaders])
    .setBackground('#1e293b')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  licSheet.setFrozenRows(1);
  
  // ─── 2. TAB: Trial Users & Evaluation Leads ───
  let trialSheet = ss.getSheetByName('Trial_Users');
  if (!trialSheet) trialSheet = ss.insertSheet('Trial_Users');
  
  const trialHeaders = [
    'Machine ID', 'License Key / Mode', 'Company / Shop Name', 'Owner / Contact', 'Email', 
    'Phone', 'City', 'State', 'Pincode', 'Address', 'GSTIN', 'PAN', 'Bank / UPI ID', 
    'Evaluation Plan', 'Status', 'Days Left', 'Invoices Created', 'Purchase Bills', 'Catalog Items', 
    'Parties', 'Total Sales (₹)', 'Remote Command', 'Extend Days', 
    'First Installed', 'Last Heartbeat'
  ];
  
  trialSheet.getRange(1, 1, 1, trialHeaders.length).setValues([trialHeaders])
    .setBackground('#0f766e')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  trialSheet.setFrozenRows(1);

  // Delete blank Sheet1 if existing
  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch(e) {}
  }
}

/**
 * Run this function once in Apps Script to instantly populate realistic Demo Data
 * with verified cryptographic license keys!
 */
function seedDemoGoogleSheet() {
  setupSheets();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const licSheet = ss.getSheetByName('Active_Licenses');
  const trialSheet = ss.getSheetByName('Trial_Users');
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  // 1. Seed Active Commercial & Lifetime Licenses with Keys
  const demoLicenses = [
    [
      'SP-88219A4B', 'SPS-1YR-S006Q1-2027', 'Apex Computech & IT Hub', 'Amit Sharma', 'apex.pune@gmail.com',
      '+91 98231 44556', 'Pune', 'Maharashtra', '411004', 'Shop 12, Deccan Gymkhana', '27AAACA1234K1Z1', 'AAACA1234K', 'HDFC Bank / apex@okhdfcbank',
      '1-YEAR ANNUAL', 'ACTIVE', '502', 48, 14, 85,
      62, '₹14,50,800.00', '2027-12-31', 'ALLOW', '',
      '2024-04-10 10:15:00', now
    ],
    [
      'SP-3391C0E2', 'SPS-LIFE-NOVE6F-2099', 'SecureVision CCTV & Security', 'Vikram Joshi', 'securevision.cctv@gmail.com',
      '+91 98190 22334', 'Mumbai', 'Maharashtra', '400050', 'B-4, Linking Road, Bandra', '27AAACV5678L1Z2', 'AAACV5678L', 'ICICI Bank / securevision@icici',
      'LIFETIME UNLIMITED', 'ACTIVE', '26780', 124, 38, 140,
      115, '₹38,90,500.00', '2099-12-31', 'ALLOW', '',
      '2024-01-15 09:30:00', now
    ],
    [
      'SP-7710EF88', 'SPS-1YR-UDAPPM-2027', 'NextGen Network Solutions', 'Rahul Verma', 'nextgen.delhi@gmail.com',
      '+91 98111 88990', 'New Delhi', 'Delhi', '110019', 'Nehru Place IT Complex', '07AAACN9012M1Z3', 'AAACN9012M', 'Axis Bank / nextgen@okaxis',
      '1-YEAR ANNUAL', 'ACTIVE', '502', 36, 11, 62,
      45, '₹9,80,000.00', '2027-12-31', 'ALLOW', '',
      '2024-06-01 11:20:00', now
    ],
    [
      'SP-110488CD', 'SPS-LIFE-4OG6B7-2099', 'MicroTech Computers & Laptops', 'Karthik Rao', 'microtech.bangalore@gmail.com',
      '+91 98450 33445', 'Bengaluru', 'Karnataka', '560002', 'SP Road Electronics Market', '29AAACM3456N1Z4', 'AAACM3456N', 'SBI Bank / microtech@oksbi',
      'LIFETIME UNLIMITED', 'ACTIVE', '26780', 92, 28, 110,
      88, '₹24,60,000.00', '2099-12-31', 'ALLOW', '',
      '2024-03-20 14:00:00', now
    ]
  ];

  // 2. Seed 60-Day Trial Leads
  const demoTrials = [
    [
      'SP-9944A102', 'TRIAL-EVAL-60D', 'SmartCare AMC & IT Services', 'Sourav Ganguly', 'smartcare.kolkata@gmail.com',
      '+91 98300 77889', 'Kolkata', 'West Bengal', '700071', 'Park Street Tech Square', '19AAACS7890P1Z5', 'AAACS7890P', 'Kotak Bank / smartcare@kotak',
      '60-Day Free Trial', 'ACTIVE', '48', 12, 4, 35,
      24, '₹2,40,000.00', 'ALLOW', '',
      '2026-08-01 10:00:00', now
    ],
    [
      'SP-55092BC1', 'TRIAL-EVAL-60D', 'Demo Client Evaluation Shop', 'Rajesh Kumar', 'demo.client@gmail.com',
      '+91 98480 11223', 'Hyderabad', 'Telangana', '500003', 'CTC Parklane, Secunderabad', '36AAACD1122Q1Z6', 'AAACD1122Q', 'HDFC Bank / democlient@okhdfcbank',
      '60-Day Free Trial', 'ACTIVE', '58', 5, 2, 22,
      15, '₹85,000.00', 'ALLOW', '',
      '2026-08-15 16:30:00', now
    ]
  ];

  // Clear and write updated rows
  licSheet.clearContents();
  trialSheet.clearContents();
  setupSheets();
  licSheet.getRange(2, 1, demoLicenses.length, demoLicenses[0].length).setValues(demoLicenses);
  trialSheet.getRange(2, 1, demoTrials.length, demoTrials[0].length).setValues(demoTrials);
}

function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
    return handleRequest(e);
  }
  return HtmlService.createHtmlOutput(getAdminDashboardHtml())
    .setTitle('ShopPulse — Cloud License & Client Hub')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) { 
  return handleRequest(e); 
}

function getAdminDashboardHtml() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupSheets();
  
  const licSheet = ss.getSheetByName('Active_Licenses');
  const trialSheet = ss.getSheetByName('Trial_Users');
  
  const licRows = licSheet ? licSheet.getDataRange().getValues().slice(1) : [];
  const trialRows = trialSheet ? trialSheet.getDataRange().getValues().slice(1) : [];

  const licData = licRows.filter(r => r[0]).map(r => ({
    machineId: r[0], shopName: r[1], signatory: r[2], email: r[3],
    phone: r[4], city: r[5], state: r[6], pincode: r[7], address: r[8],
    gstin: r[9], pan: r[10], bankUpi: r[11], plan: r[12], status: r[13],
    daysLeft: r[14], salesCount: r[15], purchasesCount: r[16], productsCount: r[17],
    partiesCount: r[18], totalRevenue: r[19], expiryDate: r[20],
    command: r[21], extendDays: r[22], firstSeen: r[23], lastSeen: r[24]
  }));

  const trialData = trialRows.filter(r => r[0]).map(r => ({
    machineId: r[0], shopName: r[1], signatory: r[2], email: r[3],
    phone: r[4], city: r[5], state: r[6], pincode: r[7], address: r[8],
    gstin: r[9], pan: r[10], bankUpi: r[11], plan: r[12], status: r[13],
    daysLeft: r[14], salesCount: r[15], purchasesCount: r[16], productsCount: r[17],
    partiesCount: r[18], totalRevenue: r[19], command: r[20], extendDays: r[21],
    firstSeen: r[22], lastSeen: r[23]
  }));

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ShopPulse Cloud License Hub</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@600&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; background: #0f172a; color: #f8fafc; padding: 16px; min-height: 100vh; }
.container { max-width: 1200px; margin: 0 auto; }
.header { background: #1e293b; border: 1px solid #334155; padding: 20px; border-radius: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; }
.brand h1 { font-size: 1.4rem; font-weight: 800; color: #38bdf8; letter-spacing: -0.02em; }
.brand p { font-size: 0.82rem; color: #94a3b8; margin-top: 2px; }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 20px; }
.kpi-card { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 16px; }
.kpi-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 700; }
.kpi-num { font-size: 1.8rem; font-weight: 800; margin-top: 4px; color: #f8fafc; }
.tabs { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.tab-btn { background: #1e293b; border: 1px solid #334155; color: #94a3b8; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
.tab-btn.active { background: #2563eb; color: #fff; border-color: #3b82f6; }
.table-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; padding: 16px; }
.search-box { width: 100%; max-width: 360px; padding: 8px 12px; background: #0f172a; border: 1px solid #334155; border-radius: 6px; color: #fff; font-size: 0.85rem; margin-bottom: 14px; }
.table-wrap { overflow-x: auto; max-height: 480px; }
table { width: 100%; border-collapse: collapse; font-size: 0.82rem; text-align: left; }
th { background: #0f172a; color: #94a3b8; padding: 10px 12px; font-weight: 700; text-transform: uppercase; font-size: 0.72rem; letter-spacing: 0.04em; position: sticky; top: 0; }
td { padding: 10px 12px; border-bottom: 1px solid #334155; vertical-align: middle; }
tr:hover { background: rgba(51, 65, 85, 0.4); }
.badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 0.72rem; font-weight: 700; }
.badge-active { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #059669; }
.badge-trial { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid #d97706; }
.badge-blocked { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #dc2626; }
.mono { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #38bdf8; }
.btn-action { padding: 4px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; border: none; cursor: pointer; margin-right: 4px; }
.btn-act { background: #059669; color: #fff; }
.btn-life { background: #7c3aed; color: #fff; }
.btn-ext { background: #0284c7; color: #fff; }
.btn-blk { background: #dc2626; color: #fff; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="brand">
      <h1>⚡ ShopPulse Cloud License Hub</h1>
      <p>Developer: <strong>Shraban Kumar Mahato</strong> (AndroPCSoft Technologies) • Centralized Real-Time Control</p>
    </div>
    <button class="tab-btn" onclick="location.reload()" style="background:#0f172a;color:#38bdf8">🔄 Refresh Data</button>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-title">Active Commercial Licenses</div>
      <div class="kpi-num" style="color:#34d399">${licData.length}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Active Trial Users &amp; Leads</div>
      <div class="kpi-num" style="color:#fbbf24">${trialData.length}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Total Registered Shops</div>
      <div class="kpi-num" style="color:#38bdf8">${licData.length + trialData.length}</div>
    </div>
  </div>

  <div class="tabs">
    <button id="tbtn-trials" class="tab-btn active" onclick="switchTab('trials')">⏳ Trial Users &amp; Leads (${trialData.length})</button>
    <button id="tbtn-licenses" class="tab-btn" onclick="switchTab('licenses')">📋 Active Licenses (${licData.length})</button>
  </div>

  <!-- Trial Tab -->
  <div id="tab-trials" class="table-card">
    <input type="text" class="search-box" id="trialSearch" placeholder="🔍 Search by Shop, Phone, City, Machine ID..." onkeyup="filterTable('trialTable', this.value)">
    <div class="table-wrap">
      <table id="trialTable">
        <thead>
          <tr>
            <th>Machine ID</th>
            <th>Company / Shop Name</th>
            <th>Contact Person</th>
            <th>Phone / Email</th>
            <th>City / State</th>
            <th>GSTIN</th>
            <th>Days Left</th>
            <th>Invoices</th>
            <th>Status</th>
            <th>Remote Action</th>
          </tr>
        </thead>
        <tbody>
          ${trialData.length === 0 ? '<tr><td colspan="10" style="text-align:center;padding:24px;color:#94a3b8">No trial shops recorded yet.</td></tr>' : 
            trialData.map(t => `
              <tr>
                <td class="mono">${t.machineId}</td>
                <td><strong>${t.shopName}</strong></td>
                <td>${t.signatory}</td>
                <td>${t.phone}<br><span style="color:#94a3b8;font-size:0.75rem">${t.email}</span></td>
                <td>${t.city}, ${t.state}</td>
                <td class="mono">${t.gstin}</td>
                <td><span class="badge ${parseInt(t.daysLeft) < 10 ? 'badge-blocked' : 'badge-trial'}">${t.daysLeft}d left</span></td>
                <td>${t.salesCount}</td>
                <td><span class="badge ${t.command === 'BLOCK' ? 'badge-blocked' : 'badge-active'}">${t.command || 'ACTIVE'}</span></td>
                <td style="white-space:nowrap">
                  <button class="btn-action btn-act" onclick="applyCmd('${t.machineId}','ACTIVATE_1YR')">1-Yr</button>
                  <button class="btn-action btn-life" onclick="applyCmd('${t.machineId}','ACTIVATE_LIFE')">Life</button>
                  <button class="btn-action btn-ext" onclick="applyCmd('${t.machineId}','EXTEND',30)">+30d</button>
                  <button class="btn-action btn-blk" onclick="applyCmd('${t.machineId}','BLOCK')">Block</button>
                </td>
              </tr>
            `).join('')
          }
        </tbody>
      </table>
    </div>
  </div>

  <!-- Licenses Tab -->
  <div id="tab-licenses" class="table-card" style="display:none">
    <input type="text" class="search-box" id="licSearch" placeholder="🔍 Search by Shop, Phone, City, Machine ID..." onkeyup="filterTable('licTable', this.value)">
    <div class="table-wrap">
      <table id="licTable">
        <thead>
          <tr>
            <th>Machine ID</th>
            <th>Company / Shop Name</th>
            <th>Owner / Contact</th>
            <th>Phone / Email</th>
            <th>City / State</th>
            <th>Plan</th>
            <th>Expiry Date</th>
            <th>Revenue</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${licData.length === 0 ? '<tr><td colspan="10" style="text-align:center;padding:24px;color:#94a3b8">No commercial licenses recorded yet.</td></tr>' : 
            licData.map(l => `
              <tr>
                <td class="mono">${l.machineId}</td>
                <td><strong>${l.shopName}</strong></td>
                <td>${l.signatory}</td>
                <td>${l.phone}<br><span style="color:#94a3b8;font-size:0.75rem">${l.email}</span></td>
                <td>${l.city}, ${l.state}</td>
                <td><span class="badge badge-active">${l.plan.toUpperCase()}</span></td>
                <td>${l.expiryDate}</td>
                <td>${l.totalRevenue}</td>
                <td><span class="badge ${l.command === 'BLOCK' ? 'badge-blocked' : 'badge-active'}">${l.command === 'BLOCK' ? 'SUSPENDED' : 'ACTIVE'}</span></td>
                <td style="white-space:nowrap">
                  ${l.command === 'BLOCK' ? `
                    <button class="btn-action btn-act" onclick="applyCmd('${l.machineId}','ALLOW')">Unblock</button>
                  ` : `
                    <button class="btn-action btn-blk" onclick="applyCmd('${l.machineId}','BLOCK')">Block</button>
                  `}
                </td>
              </tr>
            `).join('')
          }
        </tbody>
      </table>
    </div>
  </div>
</div>

<script>
function switchTab(t) {
  document.getElementById('tab-trials').style.display = (t === 'trials') ? 'block' : 'none';
  document.getElementById('tab-licenses').style.display = (t === 'licenses') ? 'block' : 'none';
  document.getElementById('tbtn-trials').className = (t === 'trials') ? 'tab-btn active' : 'tab-btn';
  document.getElementById('tbtn-licenses').className = (t === 'licenses') ? 'tab-btn active' : 'tab-btn';
}

function filterTable(tableId, query) {
  query = query.toLowerCase();
  const rows = document.querySelectorAll('#' + tableId + ' tbody tr');
  rows.forEach(r => {
    const text = r.textContent.toLowerCase();
    r.style.display = text.includes(query) ? '' : 'none';
  });
}

function applyCmd(machineId, cmd, extendDays) {
  if (!confirm('Apply command ' + cmd + ' to Machine: ' + machineId + '?')) return;
  fetch('?action=set_command&machineId=' + encodeURIComponent(machineId) + '&command=' + encodeURIComponent(cmd) + (extendDays ? '&extendDays=' + extendDays : ''))
    .then(r => r.json())
    .then(d => {
      alert(d.message || 'Command updated successfully!');
      location.reload();
    })
    .catch(e => alert('Error: ' + e));
}
</script>
</body>
</html>`;
}

function handleRequest(e) {
  try {
    let params = {};
    if (e && e.postData && e.postData.contents) {
      try { params = JSON.parse(e.postData.contents); } catch (err) { params = e.parameter || {}; }
    } else if (e && e.parameter) {
      params = e.parameter;
    }

    const action = params.action || 'heartbeat';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    setupSheets();

    // ─── 1. API: GET ALL USERS FOR DEVELOPER DASHBOARD ───
    if (action === 'get_users' || action === 'fetch_all') {
      const licSheet = ss.getSheetByName('Active_Licenses');
      const trialSheet = ss.getSheetByName('Trial_Users');
      
      const licRows = licSheet ? licSheet.getDataRange().getValues().slice(1) : [];
      const trialRows = trialSheet ? trialSheet.getDataRange().getValues().slice(1) : [];

      const licenses = licRows.filter(r => r[0]).map(r => ({
        machineId: r[0], shopName: r[1], signatory: r[2], email: r[3],
        phone: r[4], city: r[5], state: r[6], pincode: r[7], address: r[8],
        gstin: r[9], pan: r[10], bankUpi: r[11], plan: r[12], status: r[13],
        daysLeft: r[14], salesCount: r[15], purchasesCount: r[16], productsCount: r[17],
        partiesCount: r[18], totalRevenue: r[19], expiryDate: r[20],
        command: r[21], extendDays: r[22], firstSeen: r[23], lastSeen: r[24]
      }));

      const trials = trialRows.filter(r => r[0]).map(r => ({
        machineId: r[0], shopName: r[1], signatory: r[2], email: r[3],
        phone: r[4], city: r[5], state: r[6], pincode: r[7], address: r[8],
        gstin: r[9], pan: r[10], bankUpi: r[11], plan: r[12], status: r[13],
        daysLeft: r[14], salesCount: r[15], purchasesCount: r[16], productsCount: r[17],
        partiesCount: r[18], totalRevenue: r[19], command: r[20], extendDays: r[21],
        firstSeen: r[22], lastSeen: r[23]
      }));

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        totalLicenses: licenses.length,
        totalTrials: trials.length,
        licenses: licenses,
        trials: trials
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ─── 2. API: REMOTE COMMAND UPDATE FROM DEVELOPER CONSOLE ───
    if (action === 'set_command') {
      const targetMid = params.machineId;
      const targetCmd = (params.command || 'ALLOW').toUpperCase().trim();
      const targetExtend = parseInt(params.extendDays) || 0;
      
      let updated = false;
      ['Active_Licenses', 'Trial_Users'].forEach(sName => {
        const s = ss.getSheetByName(sName);
        if (!s) return;
        const vals = s.getDataRange().getValues();
        for (let i = 1; i < vals.length; i++) {
          if (vals[i][0] == targetMid) {
            if (sName === 'Active_Licenses') {
              s.getRange(i + 1, 22).setValue(targetCmd);
              if (targetExtend > 0) s.getRange(i + 1, 23).setValue(targetExtend);
            } else {
              s.getRange(i + 1, 21).setValue(targetCmd);
              if (targetExtend > 0) s.getRange(i + 1, 22).setValue(targetExtend);
            }
            updated = true;
          }
        }
      });

      return ContentService.createTextOutput(JSON.stringify({
        status: updated ? 'success' : 'not_found',
        message: updated ? `Command "${targetCmd}" applied to Machine ID: ${targetMid}` : 'Machine ID not found in sheet'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ─── 3. HEARTBEAT TELEMETRY LOGGING (COMPANY + LICENSE DETAILS) ───
    const machineId = params.machineId || 'UNKNOWN';
    const shopName = params.shopName || 'Unnamed Shop';
    const signatory = params.signatory || 'Owner';
    const email = params.email || 'unregistered';
    const phone = params.phone || 'N/A';
    const city = params.city || 'N/A';
    const state = params.state || 'N/A';
    const pincode = params.pincode || 'N/A';
    const address = params.address || 'N/A';
    const gstin = params.gstin || 'N/A';
    const pan = params.pan || 'N/A';
    const bankUpi = `${params.bankName || ''} / ${params.upiId || ''}`.replace(/^ \/ | \/ $/g, '').trim() || 'N/A';
    
    const plan = (params.plan || 'trial').toLowerCase();
    const status = params.status || 'active';
    const daysLeft = params.daysLeft || '0';
    const salesCount = params.salesCount || '0';
    const purchasesCount = params.purchasesCount || '0';
    const productsCount = params.productsCount || '0';
    const partiesCount = params.partiesCount || '0';
    const totalRevenue = params.totalSalesRevenue || '0.00';
    const expiryDate = params.expiryDate || 'N/A';
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const licenseKey = params.licenseKey || (isTrial ? 'TRIAL-EVAL-60D' : 'N/A');
    const isTrial = (plan === 'trial');
    const sheetName = isTrial ? 'Trial_Users' : 'Active_Licenses';
    const sheet = ss.getSheetByName(sheetName);

    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    let existingCommand = 'ALLOW';
    let extendDays = 0;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == machineId) {
        rowIndex = i + 1;
        existingCommand = isTrial ? (data[i][21] || 'ALLOW') : (data[i][22] || 'ALLOW');
        extendDays = isTrial ? (data[i][22] || 0) : (data[i][23] || 0);
        break;
      }
    }

    let responseCommand = existingCommand.toString().trim();

    if (isTrial) {
      const rowData = [
        machineId, licenseKey, shopName, signatory, email,
        phone, city, state, pincode, address, gstin, pan, bankUpi,
        '60-Day Free Trial', status.toUpperCase(), daysLeft, salesCount, purchasesCount, productsCount,
        partiesCount, '₹' + totalRevenue, responseCommand || 'ALLOW', extendDays || '',
        rowIndex > 0 ? data[rowIndex - 1][23] : now, now
      ];
      if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
      else sheet.appendRow(rowData);
    } else {
      const rowData = [
        machineId, licenseKey, shopName, signatory, email,
        phone, city, state, pincode, address, gstin, pan, bankUpi,
        plan.toUpperCase(), status.toUpperCase(), daysLeft, salesCount, purchasesCount, productsCount,
        partiesCount, '₹' + totalRevenue, expiryDate, responseCommand || 'ALLOW', extendDays || '',
        rowIndex > 0 ? data[rowIndex - 1][24] : now, now
      ];
      if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
      else sheet.appendRow(rowData);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      command: responseCommand,
      plan: plan,
      extendDays: extendDays,
      message: 'Telemetry synchronized with ShopPulse Centralized License Manager.'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
