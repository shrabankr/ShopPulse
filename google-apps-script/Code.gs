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
    'Machine ID', 'Company / Shop Name', 'Owner / Contact', 'Registered Email', 
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
    'Machine ID', 'Company / Shop Name', 'Owner / Contact', 'Email', 
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

function doPost(e) { return handleRequest(e); }
function doGet(e) { return handleRequest(e); }

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
        existingCommand = isTrial ? (data[i][20] || 'ALLOW') : (data[i][21] || 'ALLOW');
        extendDays = isTrial ? (data[i][21] || 0) : (data[i][22] || 0);
        break;
      }
    }

    let responseCommand = existingCommand.toString().trim();

    if (isTrial) {
      const rowData = [
        machineId, shopName, signatory, email,
        phone, city, state, pincode, address, gstin, pan, bankUpi,
        '60-Day Free Trial', status.toUpperCase(), daysLeft, salesCount, purchasesCount, productsCount,
        partiesCount, '₹' + totalRevenue, responseCommand || 'ALLOW', extendDays || '',
        rowIndex > 0 ? data[rowIndex - 1][22] : now, now
      ];
      if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
      else sheet.appendRow(rowData);
    } else {
      const rowData = [
        machineId, shopName, signatory, email,
        phone, city, state, pincode, address, gstin, pan, bankUpi,
        plan.toUpperCase(), status.toUpperCase(), daysLeft, salesCount, purchasesCount, productsCount,
        partiesCount, '₹' + totalRevenue, expiryDate, responseCommand || 'ALLOW', extendDays || '',
        rowIndex > 0 ? data[rowIndex - 1][23] : now, now
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
