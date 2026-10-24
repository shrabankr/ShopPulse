// Automated Test & Audit Suite for ShopPulse
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passedTests = 0;
let failedTests = 0;
const errors = [];

function assert(condition, message) {
  if (!condition) {
    failedTests++;
    errors.push(`FAIL: ${message}`);
    console.error(`❌ FAIL: ${message}`);
  } else {
    passedTests++;
    console.log(`✅ PASS: ${message}`);
  }
}

function assertClose(actual, expected, message, precision = 0.01) {
  if (Math.abs(actual - expected) > precision) {
    failedTests++;
    errors.push(`FAIL: ${message} (Expected ~${expected}, got ${actual})`);
    console.error(`❌ FAIL: ${message} (Expected ~${expected}, got ${actual})`);
  } else {
    passedTests++;
    console.log(`✅ PASS: ${message} (${actual})`);
  }
}

console.log('======================================================');
console.log('       SHOPPULSE v1.4.0 COMPREHENSIVE AUDIT & TEST    ');
console.log('======================================================\n');

// Phase 1: JS Syntax Check
console.log('--- Phase 1: Syntax Validation across all JS Files ---');
const jsFiles = [
  'js/data.js',
  'js/app.js',
  'js/billing.js',
  'js/inventory.js',
  'js/crm.js',
  'js/services.js',
  'js/configurator.js',
  'js/expenses.js',
  'js/reports.js',
  'js/ai.js',
  'electron/main.js',
  'electron/preload.js',
  'electron/inject-icon.js'
];

jsFiles.forEach(file => {
  const filePath = path.resolve(__dirname, '..', file);
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    new vm.Script(code, { filename: file });
    assert(true, `Syntax check passed for ${file}`);
  } catch (err) {
    assert(false, `Syntax error in ${file}: ${err.message}`);
  }
});

// Phase 2: Mock Browser Environment & Load Core Modules
console.log('\n--- Phase 2: Mock DOM / Browser Environment & Data Layer ---');

const localStorageMock = (function () {
  let store = {};
  return {
    getItem: (key) => (store[key] !== undefined ? store[key] : null),
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    _dump: () => store
  };
})();

const domElements = {};
function createMockElement(id, tag = 'div') {
  return {
    id,
    tagName: tag.toUpperCase(),
    innerHTML: '',
    innerText: '',
    value: '',
    classList: {
      _classes: new Set(),
      add(...c) { c.forEach(x => this._classes.add(x)); },
      remove(...c) { c.forEach(x => this._classes.delete(x)); },
      contains(c) { return this._classes.has(c); },
      toggle(c) {
        if (this.contains(c)) {
          this.remove(c);
          return false;
        } else {
          this.add(c);
          return true;
        }
      }
    },
    style: {},
    appendChild: () => {},
    closest: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    setAttribute: () => {},
    getAttribute: () => null
  };
}

const mockWindow = {
  localStorage: localStorageMock,
  location: { hash: '#dashboard' },
  addEventListener: () => {},
  document: {
    getElementById: (id) => {
      if (!domElements[id]) domElements[id] = createMockElement(id);
      return domElements[id];
    },
    querySelector: (sel) => createMockElement(sel),
    querySelectorAll: () => [],
    createElement: (tag) => createMockElement('temp', tag),
    body: createMockElement('body', 'body'),
    head: createMockElement('head', 'head'),
    addEventListener: () => {}
  },
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  Date: Date,
  Math: Math,
  JSON: JSON,
  desktopApp: {
    isDesktop: true,
    savePdf: () => Promise.resolve({ success: true, filePath: 'C:\\test.pdf' }),
    printNow: () => Promise.resolve({ success: true })
  }
};
mockWindow.window = mockWindow;

const context = vm.createContext(mockWindow);

function runFile(filePath, context, exportVar) {
  let code = fs.readFileSync(filePath, 'utf8');
  if (exportVar) {
    code += `\nif (typeof ${exportVar} !== 'undefined') { window.${exportVar} = ${exportVar}; }`;
  }
  vm.runInContext(code, context);
}

// Load data.js into sandbox
runFile(path.resolve(__dirname, '..', 'js/data.js'), context, 'DB');

assert(typeof context.DB === 'object', 'DB object initialized in global scope');
assert(typeof context.calcTotals === 'function', 'calcTotals() function available');
assert(typeof context.fmtCurrency === 'function', 'fmtCurrency() function available');
assert(typeof context.numberToWords === 'function', 'numberToWords() function available');
assert(typeof context.validateGSTIN === 'function', 'validateGSTIN() function available');

// Phase 3: GST Tax Engine Tests
console.log('\n--- Phase 3: GST Engine (calcTotals) Tests ---');

// Test 3.1: Intra-state (seller state 27, buyer state 27) -> CGST + SGST, no IGST
const intraItems = [
  { qty: 2, rate: 1000, discount: 10, gstRate: 18 } // taxable = 2000 - 200 = 1800. CGST 9% (162), SGST 9% (162)
];
const intraRes = context.calcTotals(intraItems, '27', '27');
assert(intraRes.isIntra === true, 'Intra-state detection is correct');
assertClose(intraRes.subtotal, 1800, 'Intra-state subtotal matches');
assertClose(intraRes.totalCgst, 162, 'Intra-state CGST (9%) matches 162');
assertClose(intraRes.totalSgst, 162, 'Intra-state SGST (9%) matches 162');
assertClose(intraRes.totalIgst, 0, 'Intra-state IGST is 0');
assertClose(intraRes.totalTax, 324, 'Intra-state total tax is 324');
assertClose(intraRes.total, 2124, 'Intra-state grand total is 2124');

// Test 3.2: Inter-state (seller state 27, buyer state 29) -> IGST, no CGST/SGST
const interItems = [
  { qty: 5, rate: 500, discount: 0, gstRate: 18 }, // taxable = 2500, IGST 18% = 450
  { qty: 1, rate: 1000, discount: 5, gstRate: 12 } // taxable = 950, IGST 12% = 114
];
const interRes = context.calcTotals(interItems, '27', '29');
assert(interRes.isIntra === false, 'Inter-state detection is correct');
assertClose(interRes.subtotal, 3450, 'Inter-state subtotal matches 3450');
assertClose(interRes.totalCgst, 0, 'Inter-state CGST is 0');
assertClose(interRes.totalSgst, 0, 'Inter-state SGST is 0');
assertClose(interRes.totalIgst, 564, 'Inter-state IGST matches 564');
assertClose(interRes.total, 4014, 'Inter-state grand total is 4014');

// Test 3.3: 0% Tax / Exempt
const zeroTaxItems = [
  { qty: 10, rate: 100, discount: 0, gstRate: 0 }
];
const zeroRes = context.calcTotals(zeroTaxItems, '27', '27');
assertClose(zeroRes.totalTax, 0, '0% GST items have zero tax');
assertClose(zeroRes.total, 1000, '0% GST items grand total matches subtotal');

// Phase 4: Utilities & Business Logic Tests
console.log('\n--- Phase 4: Business Utilities & Backward Compatibility ---');

// Test 4.1: validateGSTIN
assert(context.validateGSTIN('27AABCT5432R1ZP') === true, 'Valid GSTIN recognized');
assert(context.validateGSTIN('INVALID123') === false, 'Invalid GSTIN rejected');
assert(context.validateGSTIN('') === true, 'Empty GSTIN accepted (unregistered)');

// Test 4.2: numberToWords
const words = context.numberToWords(50220.80);
assert(words.includes('Fifty Thousand') && words.includes('Two Hundred'), `numberToWords output correct: "${words}"`);

// Test 4.3: fmtCurrency
const formatted = context.fmtCurrency(1234567.89);
assert(formatted.includes('12,34,567.89'), `fmtCurrency format correct: "${formatted}"`);

// Test 4.4: Golden Rule / Backward Compatibility
// Seed protection test: If sp_seeded is already present with custom data, DB.seed() must NOT wipe it!
context.localStorage.setItem('sp_seeded', JSON.stringify(true));
context.localStorage.setItem('sp_products', JSON.stringify([{ id: 'PROD-CUSTOM', name: 'User Custom Hardware', stock: 99 }]));
context.DB.seed();
const products = context.DB.getProducts();
assert(products.some(p => p.id === 'PROD-CUSTOM'), 'The Golden Rule: User custom data preserved on seed() when sp_seeded is set');

// Test 4.5: Auto-numbering sequence
const invNo1 = context.DB.nextInvoiceNo();
assert(typeof invNo1 === 'string' && invNo1.length > 5, `nextInvoiceNo generated: ${invNo1}`);
const billNo1 = context.DB.nextBillNo();
assert(typeof billNo1 === 'string' && billNo1.length > 5, `nextBillNo generated: ${billNo1}`);
const jobNo1 = context.DB.nextJobNo();
assert(typeof jobNo1 === 'string' && jobNo1.length > 4, `nextJobNo generated: ${jobNo1}`);
const quotNo1 = context.DB.nextQuotationNo();
assert(typeof quotNo1 === 'string' && quotNo1.length > 4, `nextQuotationNo generated: ${quotNo1}`);

// Test 4.6: Stock adjustment
const initialStock = products[0].stock;
context.DB.adjustStock(products[0].id, -5);
const updatedStock = context.DB.getProductById(products[0].id).stock;
assert(updatedStock === initialStock - 5, `DB.adjustStock decremented correctly (${initialStock} -> ${updatedStock})`);

// Phase 5: Load Billing Module & Test Invoicing & Conversions
console.log('\n--- Phase 5: Billing Module Tests ---');
runFile(path.resolve(__dirname, '..', 'js/billing.js'), context, 'Billing');
assert(typeof context.Billing === 'object', 'Billing module loaded successfully');

// Test 5.1: Create & Save Sale Invoice
const rawSaleItems = [
  { productId: products[0].id, name: products[0].name, hsn: '8471', unit: 'Nos', qty: 2, rate: 5000, discount: 0, gstRate: 18 }
];
const saleTotals = context.calcTotals(rawSaleItems, '27', '27');
const sampleSale = {
  invoiceNo: invNo1,
  date: new Date().toISOString().split('T')[0],
  dueDate: new Date().toISOString().split('T')[0],
  customer: { id: 'CUST-001', name: 'Sharma Electronics', gstin: '27AABCT5432R1ZP', stateCode: '27' },
  customerName: 'Sharma Electronics',
  customerGstin: '27AABCT5432R1ZP',
  paymentStatus: 'Unpaid',
  paymentMethod: 'UPI',
  notes: 'Audit test invoice',
  ...saleTotals
};
const savedSale = context.DB.saveSale(sampleSale, true);
const retrievedSale = context.DB.getSaleById(savedSale.id);
assert(retrievedSale !== undefined && retrievedSale.invoiceNo === invNo1, 'DB.saveSale & DB.getSaleById working');
assert(retrievedSale.total === 11800, `Calculated sale total is 11800 (got ${retrievedSale.total})`);

// Test 5.2: Quotation to Sale conversion
const rawQuotItems = [
  { productId: products[0].id, name: products[0].name, hsn: '8471', unit: 'Nos', qty: 1, rate: 10000, discount: 10, gstRate: 18 }
];
const quotTotals = context.calcTotals(rawQuotItems, '27', '27');
const sampleQuotation = {
  quotationNo: quotNo1,
  date: new Date().toISOString().split('T')[0],
  validUntil: new Date().toISOString().split('T')[0],
  customer: { id: 'CUST-001', name: 'Sharma Electronics', gstin: '27AABCT5432R1ZP', stateCode: '27' },
  customerName: 'Sharma Electronics',
  status: 'Draft',
  notes: 'Quotation test',
  ...quotTotals
};
const savedQuot = context.DB.saveQuotation(sampleQuotation, true);
const retrievedQuot = context.DB.getQuotationById(savedQuot.id);
assert(retrievedQuot !== undefined, 'Quotation saved and retrieved');

// Test 5.3: Document HTML rendering (ensure no undefined property errors)
const invoiceHTML = context.Billing.generateDocHtml(retrievedSale, 'sales');
assert(typeof invoiceHTML === 'string' && invoiceHTML.includes('TAX INVOICE'), 'Invoice HTML generated successfully');
assert(invoiceHTML.includes(invNo1), 'Invoice HTML includes correct invoice number');

const quotHTML = context.Billing.generateQuotationHtml(retrievedQuot);
assert(typeof quotHTML === 'string' && (quotHTML.includes('ESTIMATE') || quotHTML.includes('QUOTATION')), 'Quotation HTML generated successfully');

// Phase 6: Services Module Tests (Job Sheets & Claim Tokens)
console.log('\n--- Phase 6: Services Module Tests ---');
runFile(path.resolve(__dirname, '..', 'js/services.js'), context, 'Services');
assert(typeof context.Services === 'object', 'Services module loaded successfully');

const sampleJob = {
  jobNo: jobNo1,
  date: new Date().toISOString().split('T')[0],
  customerName: 'Patel Infotech',
  customerPhone: '9876543210',
  deviceType: 'Laptop',
  brandModel: 'Dell Inspiron 15',
  serialImei: 'SN12345678',
  problemReported: 'No display / blank screen',
  status: 'in_progress',
  estimatedCost: 2500,
  advancePaid: 500
};
const savedJob = context.DB.saveJob(sampleJob, true);
const retrievedJob = context.DB.getJobById(savedJob.id);
assert(retrievedJob !== undefined && retrievedJob.jobNo === jobNo1, 'DB.saveJob & getJobById working');

const tokenHTML = context.Services.generateTokenHtml(retrievedJob, 'compact_pos');
assert(typeof tokenHTML === 'string' && tokenHTML.includes(jobNo1), '3" POS Claim Token HTML generated successfully');
const a4TokenHTML = context.Services.generateTokenHtml(retrievedJob, 'a4');
assert(typeof a4TokenHTML === 'string' && a4TokenHTML.includes(jobNo1), 'A4 Service Job Sheet HTML generated successfully');

// Phase 7: Configurator Module Tests
console.log('\n--- Phase 7: Configurator Module Tests ---');
runFile(path.resolve(__dirname, '..', 'js/configurator.js'), context, 'Configurator');
assert(typeof context.Configurator === 'object', 'Configurator module loaded successfully');

// Test wattage calculation
context.Configurator._pcSlots = {
  cpu: { product: { name: 'Core i5-13400 Processor', price: 18500 } },
  gpu: { product: { name: 'GeForce RTX 3060 12GB Graphics Card', price: 26000 } }
};
const totalTdp = context.Configurator._calcEstimatedWattage();
assert(totalTdp > 100, `Total TDP calculated accurately: ${totalTdp}W`);
const recPsu = context.Configurator._getPsuRecommendation(totalTdp);
assert(typeof recPsu === 'string' && recPsu.includes('Recommended:'), `PSU Recommendation returned: ${recPsu}`);

// Phase 8: CRM Ledger Balance Tests
console.log('\n--- Phase 8: CRM Ledger Balance Tests ---');
runFile(path.resolve(__dirname, '..', 'js/crm.js'), context, 'CRM');
assert(typeof context.CRM === 'object', 'CRM module loaded successfully');

// Save test customer
const testCust = context.DB.saveCustomer({
  name: 'Sharma Electronics',
  gstin: '27AABCT5432R1ZP',
  phone: '9876543210',
  city: 'Pune',
  state: 'Maharashtra',
  stateCode: '27'
});

// Customer ledger test
const custLedger = context.CRM.computeLedger(testCust.id, 'customers');
assert(custLedger !== null && typeof custLedger === 'object', 'Customer ledger computed successfully');
assert(Array.isArray(custLedger.entries), 'Customer ledger entries returned as array');
assert(typeof custLedger.closingBalance === 'number', `Customer ledger closing balance calculated: ${custLedger.closingBalance}`);
const ledgerHtml = context.CRM.generateLedgerHtml(testCust.id, 'customers');
assert(typeof ledgerHtml === 'string' && ledgerHtml.includes('Sharma Electronics'), 'Ledger HTML rendered successfully with customer name');

// Phase 9: App Navigation, Roles & Collapsible Sidebar Tests
console.log('\n--- Phase 9: App Navigation, Roles & Collapsible Sidebar Tests ---');
runFile(path.resolve(__dirname, '..', 'js/app.js'), context, 'App');
assert(typeof context.App === 'object', 'App module loaded successfully');

// Test 9.1: Role security - default to staff mode
assert(context.DB.getRole() === 'staff', 'Security: Default active role is staff mode');
assert(context.DB.verifyOwnerPin('1234') === true, 'Owner default PIN 1234 verifies successfully');
context.DB.setRole('owner');
assert(context.DB.getRole() === 'owner', 'Switched to owner mode successfully');
context.App.init();
assert(context.DB.getRole() === 'staff', 'App.init() securely defaults active session back to staff mode on launch');

// Test 9.2: Test sidebar collapse toggle
const initialCollapsed = context.App.getCollapsedNav();
assert(Array.isArray(initialCollapsed), 'getCollapsedNav returns array');
context.App.toggleNavSection('transactions');
const afterToggle = context.App.getCollapsedNav();
assert(afterToggle.includes('transactions'), 'toggleNavSection successfully toggled section to collapsed');
context.App.expandNavSection('transactions');
const afterExpand = context.App.getCollapsedNav();
assert(!afterExpand.includes('transactions'), 'expandNavSection successfully restored expanded state');

// Phase 10: Electron Desktop Preload & Main Verification
console.log('\n--- Phase 10: Electron Desktop Bridge Verification ---');
const preloadCode = fs.readFileSync(path.resolve(__dirname, '..', 'electron/preload.js'), 'utf8');
assert(preloadCode.includes('savePdf'), 'preload.js exposes savePdf API');
assert(preloadCode.includes('printNow'), 'preload.js exposes printNow API');
assert(preloadCode.includes('isDesktop: true'), 'preload.js flags isDesktop as true');

const mainCode = fs.readFileSync(path.resolve(__dirname, '..', 'electron/main.js'), 'utf8');
assert(mainCode.includes("ipcMain.handle('save-pdf'"), 'main.js handles save-pdf IPC call');
assert(mainCode.includes("ipcMain.handle('print-now'"), 'main.js handles print-now IPC call');
assert(mainCode.includes('shell.showItemInFolder'), 'main.js automatically highlights saved PDF in Windows File Explorer');

// Summary
console.log('\n======================================================');
console.log(`TOTAL TESTS RUN: ${passedTests + failedTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
if (failedTests > 0) {
  console.log('\nERRORS:');
  errors.forEach(e => console.log(e));
}
console.log('======================================================');

if (failedTests > 0) process.exit(1);
process.exit(0);
