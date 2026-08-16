/**
 * =========================================================================
 * ShopPulse License Manager & Telemetry Engine (Google Apps Script)
 * Author: Shraban Kumar Mahato (shraban@andropcsoft.com)
 * Version: 2.0.0
 * =========================================================================
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet ("ShopPulse License Manager")
 * 2. Click "Extensions" -> "Apps Script"
 * 3. Delete any default code and paste this ENTIRE file
 * 4. Click "Save" (💾)
 * 5. Click "Run" -> Select "setupSheets" to create all tabs & headers automatically!
 * 6. Click "Deploy" -> "New deployment"
 *    - Type: Web app
 *    - Description: ShopPulse Telemetry & License Manager v2
 *    - Execute as: Me (your Gmail)
 *    - Who has access: Anyone
 * 7. Click "Deploy" and copy the Web App URL into ShopPulse!
 */

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Licenses Tab
  let licSheet = ss.getSheetByName('Active_Licenses');
  if (!licSheet) {
    licSheet = ss.insertSheet('Active_Licenses');
  }
  const licHeaders = [
    'Machine ID', 'Shop Name', 'Email', 'Phone', 'City', 
    'Plan', 'Status', 'Days Left', 'Bills Count', 'Products Count', 
    'Expiry Date', 'Remote Command', 'Last Seen (UTC)'
  ];
  licSheet.getRange(1, 1, 1, licHeaders.length).setValues([licHeaders])
    .setBackground('#1e293b')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  licSheet.setFrozenRows(1);
  
  // 2. Trial Users Tab
  let trialSheet = ss.getSheetByName('Trial_Users');
  if (!trialSheet) {
    trialSheet = ss.insertSheet('Trial_Users');
  }
  const trialHeaders = [
    'Machine ID', 'Shop Name', 'Email', 'Phone', 'City', 
    'Trial Plan', 'Days Left', 'Bills Created', 'Products Added', 
    'Remote Command', 'Extend Days', 'First Seen', 'Last Heartbeat'
  ];
  trialSheet.getRange(1, 1, 1, trialHeaders.length).setValues([trialHeaders])
    .setBackground('#0f766e')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  trialSheet.setFrozenRows(1);
  
  // Remove default "Sheet1" if empty
  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch(e) {}
  }
}

function doPost(e) {
  return handleRequest(e);
}

function doGet(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    let params = {};
    if (e && e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch (err) {
        params = e.parameter || {};
      }
    } else if (e && e.parameter) {
      params = e.parameter;
    }

    const machineId = params.machineId || params.mid || 'UNKNOWN';
    const email = params.email || 'unregistered';
    const shopName = params.shopName || 'Unnamed Shop';
    const phone = params.phone || 'N/A';
    const city = params.city || 'N/A';
    const plan = (params.plan || 'trial').toLowerCase();
    const expiryDate = params.expiryDate || 'N/A';
    const daysLeft = params.daysLeft || '0';
    const salesCount = params.salesCount || '0';
    const productsCount = params.productsCount || '0';
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    setupSheets(); // Ensures sheets and headers exist

    const isTrial = (plan === 'trial');
    const sheetName = isTrial ? 'Trial_Users' : 'Active_Licenses';
    const sheet = ss.getSheetByName(sheetName);

    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    let existingCommand = 'ALLOW';
    let extendDays = 0;

    // Search for existing machineId
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == machineId) {
        rowIndex = i + 1;
        existingCommand = isTrial ? (data[i][9] || 'ALLOW') : (data[i][11] || 'ALLOW');
        extendDays = isTrial ? (data[i][10] || 0) : 0;
        break;
      }
    }

    let responseCommand = existingCommand.toString().trim();

    if (isTrial) {
      // Trial_Users row
      const rowData = [
        machineId, shopName, email, phone, city,
        '60-Day Free Trial', daysLeft, salesCount, productsCount,
        responseCommand || 'ALLOW', extendDays || '', 
        rowIndex > 0 ? data[rowIndex - 1][11] : now, now
      ];

      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
      } else {
        sheet.appendRow(rowData);
      }
    } else {
      // Active_Licenses row
      const rowData = [
        machineId, shopName, email, phone, city,
        plan.toUpperCase(), 'ACTIVE', daysLeft, salesCount, productsCount,
        expiryDate, responseCommand || 'ALLOW', now
      ];

      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
      } else {
        sheet.appendRow(rowData);
      }
    }

    const responsePayload = {
      status: 'success',
      command: responseCommand,
      plan: plan,
      extendDays: extendDays,
      message: 'Telemetry synchronized with ShopPulse License Manager.'
    };

    return ContentService.createTextOutput(JSON.stringify(responsePayload))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
