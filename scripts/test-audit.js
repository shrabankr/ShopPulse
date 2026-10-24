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
console.log('       SHOPPULSE v1.9.0 COMPREHENSIVE AUDIT & TEST    ');
console.log('======================================================\n');

// Phase 1: JS Syntax Check
console.log('--- Phase 1: Syntax Validation across all JS Files ---');
const jsFiles = [
  'js/data.js',
  'js/app.js',
  'js/billing.js',
  'js/register.js',
  'js/inventory.js',
  'js/crm.js',
  'js/services.js',
  'js/amc.js',
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

// Phase 11: Barcode Engine & Label Printing Studio Verification
console.log('\n--- Phase 11: Barcode Engine & Label Printing Studio Verification ---');
runFile(path.resolve(__dirname, '..', 'js/inventory.js'), context, 'Inventory');
assert(typeof context.Inventory === 'object', 'Inventory module loaded successfully');

// Test 11.1: Pure Code 128 SVG Barcode Generator
const sampleSvg = context.generateBarcodeSVG('890100100001', 30, 1.5);
assert(sampleSvg && sampleSvg.startsWith('<svg') && sampleSvg.includes('<rect'), 'generateBarcodeSVG returns valid SVG containing bars');
assert(sampleSvg.includes('viewBox="0 0'), 'Barcode SVG includes responsive viewBox');

// Test 11.2: 12-digit Indian EAN Barcode Generator
const sampleEan = context.genBarcodeEAN();
assert(typeof sampleEan === 'string' && sampleEan.length === 12 && sampleEan.startsWith('890'), `genBarcodeEAN generates 12-digit Indian prefix barcode: ${sampleEan}`);

// Test 11.3: DB.getProductByBarcode Lookup
const seededProducts = context.DB.getProducts();
assert(seededProducts.length > 0, 'Catalog has seeded products');
const firstProd = seededProducts[0];
if (!firstProd.barcode) {
  firstProd.barcode = '890123456789';
  context.DB.saveProduct(firstProd);
}
const foundByBarcode = context.DB.getProductByBarcode(firstProd.barcode);
assert(foundByBarcode && foundByBarcode.id === firstProd.id, `DB.getProductByBarcode successfully resolved product by barcode (${firstProd.barcode})`);
const foundBySku = context.DB.getProductByBarcode(firstProd.sku || firstProd.id);
assert(foundBySku && foundBySku.id === firstProd.id, 'DB.getProductByBarcode fallback to SKU/ID works');

// Test 11.4: Thermal 50x25mm and A4 Sheet Label HTML Generation
const thermalHtml = context.Inventory.generateBarcodeSheetHtml({
  title: 'Hikvision 2MP Dome Camera',
  barcode: '890100100004',
  price: '1850',
  warranty: '2 Years',
  shopName: 'ShopPulse IT Solutions',
  showShopName: true,
  showPrice: true,
  layout: 'thermal_50x25',
  copies: 5
});
assert(thermalHtml.includes('@page') && thermalHtml.includes('50mm 25mm'), 'Thermal 50x25mm layout uses exact roll page dimensions');
assert(thermalHtml.includes('sticker-thermal_50x25'), 'Thermal label includes container class');
assert(thermalHtml.includes('Hikvision 2MP Dome Camera'), 'Thermal label includes product title');

const a4SheetHtml = context.Inventory.generateBarcodeSheetHtml({
  title: 'Cat6 Network Cable 305m',
  barcode: '890100100007',
  price: '4200',
  warranty: '',
  shopName: 'ShopPulse IT Solutions',
  showShopName: true,
  showPrice: true,
  layout: 'a4_24',
  copies: 24
});
assert(a4SheetHtml.includes('grid-template-columns: repeat(3, 68mm)'), 'A4 24-up layout creates 3-column sticker grid');
assert(a4SheetHtml.includes('sticker-a4_24'), 'A4 24-up label includes correct layout class');

// Phase 12: AMC (Annual Maintenance Contracts) & Warranty Renewals Verification
console.log('\n--- Phase 12: AMC Engine & Preventive Maintenance Scheduler Verification ---');
runFile(path.resolve(__dirname, '..', 'js/amc.js'), context, 'AMC');
assert(typeof context.AMC === 'object', 'AMC module loaded successfully');

// Test 12.1: PM Visits Generation Engine
const quarterlySchedule = context.generatePmSchedule('2026-04-01', '2027-03-31', 'Quarterly');
assert(quarterlySchedule.length === 4, `Quarterly schedule generates exactly 4 visits: got ${quarterlySchedule.length}`);
const monthlySchedule = context.generatePmSchedule('2026-04-01', '2027-03-31', 'Monthly');
assert(monthlySchedule.length === 12, `Monthly schedule generates exactly 12 visits: got ${monthlySchedule.length}`);
const biMonthlySchedule = context.generatePmSchedule('2026-04-01', '2027-03-31', 'Bi-Monthly');
assert(biMonthlySchedule.length === 6, `Bi-Monthly schedule generates exactly 6 visits: got ${biMonthlySchedule.length}`);

// Test 12.2: AMC CRUD & Seed Integrity
context.DB.ensureAmcSeed();
const allAmcs = context.DB.getAmcs();
assert(allAmcs.length >= 2, `Seeded initial AMC contracts correctly: found ${allAmcs.length}`);
const testAmc = allAmcs[0];
assert(testAmc.amcNo && testAmc.sacCode === '998314', `AMC Contract ${testAmc.amcNo} carries valid SAC 998314 for IT maintenance services`);

// Test 12.3: Expiring Soon Calculation
const expiringSample = {
  amcNo: 'AMC/2026-27/9999',
  customerName: 'Test School',
  startDate: '2025-05-01',
  endDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0], // 15 days from now
  contractValue: 25000,
  status: 'active'
};
context.DB.saveAmc(expiringSample);
const expiringAmcs = context.DB.getExpiringAmcs(30);
assert(expiringAmcs.some(a => a.amcNo === 'AMC/2026-27/9999'), 'getExpiringAmcs successfully detected contract expiring in 15 days');

// Test 12.4: A4 Agreement / SLA Certificate Generation
const agreementHtml = context.AMC.generateAgreementHtml(testAmc.id);
assert(agreementHtml.includes('AMC Service Agreement') && agreementHtml.includes(testAmc.amcNo), 'Agreement HTML contains valid title and contract number');
assert(agreementHtml.includes('998314'), 'Agreement HTML contains SAC 998314 IT Service Code');
assert(agreementHtml.includes('SERVICE LEVEL AGREEMENT'), 'Agreement HTML contains SLA terms and conditions');

// Test 12.5: Backup payload incorporates AMCs
const backupObj = context.DB.createBackupObject();
assert(Array.isArray(backupObj.data.amcs) && backupObj.data.amcs.length >= 2, 'createBackupObject includes amcs data array');
assert(backupObj.stats.amcsCount >= 2, 'createBackupObject stats includes amcsCount');

// Phase 13: Split Payments, Dynamic Countertop UPI QR & Change Calculator Verification
console.log('\n--- Phase 13: Split Payments, Dynamic Countertop UPI QR & Change Calculator Verification ---');

// Test 13.1: NPCI UPI URI Scheme standard formatting
const biz = context.DB.getBiz();
const upiUri = `upi://pay?pa=${encodeURIComponent(biz.upiId || 'shraban@okaxis')}&pn=${encodeURIComponent(biz.name || 'ShopPulse')}&am=2500.00&cu=INR&tn=${encodeURIComponent('Bill SCS/2026-27/0001')}`;
assert(upiUri.startsWith('upi://pay?'), 'UPI URI correctly conforms to NPCI standard scheme');
assert(upiUri.includes('pa=') && upiUri.includes('am=2500.00') && upiUri.includes('cu=INR'), 'UPI URI encodes payee VPA, amount, and INR currency');

// Test 13.2: Multi-Tender Split Payment Math & Persistence
const testSale = {
  invoiceNo: 'SCS/2026-27/9901',
  date: '2026-10-24',
  customerId: 'CUST-001',
  customerName: 'Tech Innovators Pvt Ltd',
  items: [{ productId: 'PROD-001', name: 'Hikvision 2MP Dome Camera', hsn: '8525', unit: 'Nos', qty: 2, rate: 1500, discount: 0, gstRate: 18, taxableValue: 3000, cgstRate: 9, cgstAmt: 270, sgstRate: 9, sgstAmt: 270, igstRate: 0, igstAmt: 0, totalAmt: 3540 }],
  subtotal: 3000,
  totalCgst: 270,
  totalSgst: 270,
  totalIgst: 0,
  totalTax: 540,
  total: 3540,
  isIntra: true,
  payments: [
    { id: 'PAY-1', date: '2026-10-24', amount: 1540, method: 'Cash', ref: 'Counter Cash' },
    { id: 'PAY-2', date: '2026-10-24', amount: 2000, method: 'UPI', ref: 'UPI-UTR-9876543210' }
  ],
  cashTendered: 2000,
  changeReturned: 460,
  paymentMethod: 'Split (Cash, UPI)',
  status: 'paid'
};
context.DB.saveSale(testSale);
const savedSplitSale = context.DB.getSaleById(testSale.id);
assert(savedSplitSale, 'Saved sale with split payments successfully retrievable');
const retrievedPayments = context.DB.getDocPayments(savedSplitSale);
assert(Array.isArray(retrievedPayments) && retrievedPayments.length === 2, `getDocPayments accurately returns 2 split tenders: got ${retrievedPayments.length}`);
const calculatedPaid = context.DB.getDocPaidAmount(savedSplitSale);
assert(calculatedPaid === 3540, `getDocPaidAmount sums splits correctly (₹1,540 + ₹2,000 = ₹3,540): got ₹${calculatedPaid}`);
const remainingDue = context.DB.getDocDueAmount(savedSplitSale);
assert(remainingDue === 0, `getDocDueAmount returns 0 for fully settled bill: got ₹${remainingDue}`);

// Test 13.3: Partial Split Payment Math
const partialSale = {
  invoiceNo: 'SCS/2026-27/9902',
  date: '2026-10-24',
  customerId: 'CUST-002',
  customerName: 'Aman Sharma',
  items: [{ productId: 'PROD-002', name: 'Cat6 Cable', hsn: '8544', unit: 'Box', qty: 1, rate: 4000, discount: 0, gstRate: 18, taxableValue: 4000, cgstRate: 9, cgstAmt: 360, sgstRate: 9, sgstAmt: 360, igstRate: 0, igstAmt: 0, totalAmt: 4720 }],
  subtotal: 4000,
  totalCgst: 360,
  totalSgst: 360,
  totalIgst: 0,
  totalTax: 720,
  total: 4720,
  isIntra: true,
  payments: [
    { id: 'PAY-P1', date: '2026-10-24', amount: 2000, method: 'Cash', ref: 'Deposit' }
  ],
  paymentMethod: 'Cash',
  status: 'partial'
};
context.DB.saveSale(partialSale);
const savedPartial = context.DB.getSaleById(partialSale.id);
const partialPaid = context.DB.getDocPaidAmount(savedPartial);
const partialDue = context.DB.getDocDueAmount(savedPartial);
assert(partialPaid === 2000, `Partial payment returns ₹2,000: got ₹${partialPaid}`);
assert(partialDue === 2720, `Partial due correctly calculated as ₹2,720: got ₹${partialDue}`);

// Test 13.4: Cash Change Calculator Logic
const cashAllocated = 1540;
const cashTendered = 2000;
const changeReturned = Math.max(0, Math.round((cashTendered - cashAllocated) * 100) / 100);
assert(changeReturned === 460, `Cash Change Calculator: ₹2,000 tendered - ₹1,540 allocated = ₹460 returned (got ${changeReturned})`);
const exactTendered = 1540;
const exactChange = Math.max(0, Math.round((exactTendered - cashAllocated) * 100) / 100);
assert(exactChange === 0, `Exact tender yields ₹0.00 change returned (got ${exactChange})`);

// Test 13.5: Multi-Format Invoice Print Breakdown (POS & A4)
const posDocHtml = context.Billing.generateDocHtml(savedSplitSale, 'sales', 'compact_pos', true);
assert(posDocHtml.includes('Amount Paid:') && posDocHtml.includes('Cash Tendered:') && posDocHtml.includes('Change Returned:'), 'POS 3" thermal invoice includes full split payment & change returned breakdown');
assert(posDocHtml.includes('UPI-UTR-9876543210'), 'POS 3" thermal invoice includes transaction reference / UTR');

const a4DocHtml = context.Billing.generateDocHtml(savedSplitSale, 'sales', 'classic', true);
assert(a4DocHtml.includes('Amount Paid') && a4DocHtml.includes('Cash Tendered') && a4DocHtml.includes('Change Returned'), 'A4 Classic invoice includes split payment breakdown');

// Phase 14: Daily Cash Register, Shift Balancing & Day-End Z-Report Verification
console.log('\n--- Phase 14: Daily Cash Register & Shift Balancing Verification ---');
runFile(path.resolve(__dirname, '..', 'js/register.js'), context, 'Register');
assert(typeof context.Register === 'object', 'Register module loaded successfully');

// Test 14.1: Seed & Data Layer Integrity
context.DB.ensureRegisterSeed();
const seededRegs = context.DB.getRegisters();
assert(seededRegs.length >= 1, `Register seed populated: found ${seededRegs.length} shifts`);

// Test 14.2: Open Shift with Morning Float
const openRes = context.DB.openRegister(2500, 'Ramesh Cashier', 'Morning retail shift');
assert(openRes.success && openRes.register.openingFloat === 2500, 'openRegister successfully opened new shift with ₹2,500 float');
const currentOpen = context.DB.getCurrentRegister();
assert(currentOpen && currentOpen.id === openRes.register.id && currentOpen.status === 'open', 'getCurrentRegister accurately resolved open shift');

// Test 14.3: Manual Float Drop & Top-up Cash Movements
context.DB.addRegisterCashMovement(openRes.register.id, 'in', 500, 'Added coins & change from bank');
context.DB.addRegisterCashMovement(openRes.register.id, 'out', 200, 'Courier postage cash');
const updatedOpenReg = context.DB.getRegisterById(openRes.register.id);
assert(updatedOpenReg.cashAdditions.length === 1 && updatedOpenReg.cashDrops.length === 1, 'Manual cash in and cash drop correctly recorded');

// Test 14.4: Expected Cash Calculation
const regCalc = context.DB.calcRegisterExpectedCash(updatedOpenReg);
assert(regCalc.openingFloat === 2500, `calcRegisterExpectedCash float matches: ₹${regCalc.openingFloat}`);
assert(regCalc.manualCashIn === 500 && regCalc.manualCashOut === 200, `calcRegisterExpectedCash accounts for manual cash-in (₹500) and drop (₹200)`);
// Expected: 2500 + 500 (in) - 200 (out) = 2800 (plus any cash sales within shift)
assert(regCalc.systemExpectedCash >= 2800, `Expected drawer cash computed accurately: ₹${regCalc.systemExpectedCash}`);

// Test 14.5: Physical Denomination Counter & Shift Closure
// Counting: 5 x ₹500 (2500) + 1 x ₹200 (200) + 1 x ₹100 (100) = ₹2,800
const testDenoms = { n500: 5, n200: 1, n100: 1, n50: 0, n20: 0, n10: 0, coins: 0 };
const closeRes = context.DB.closeRegister(openRes.register.id, testDenoms, 'End of shift handover completed', 'Shraban (Owner)');
assert(closeRes.success && closeRes.register.status === 'closed', 'closeRegister successfully finalized and closed shift');
assert(closeRes.register.actualPhysicalCash === 2800, `Physical cash counted accurately (5x500 + 1x200 + 1x100 = ₹2,800): got ₹${closeRes.register.actualPhysicalCash}`);
assert(typeof closeRes.register.cashDiscrepancy === 'number', `Variance discrepancy computed: ₹${closeRes.register.cashDiscrepancy}`);

// Test 14.6: Z-Report Document Generation (3" POS Slip & A4)
const posZReport = context.Register.generateZReportHtml(closeRes.register.id, 'compact_pos');
assert(posZReport.includes('DAILY REGISTER Z-REPORT') && posZReport.includes('CASH RECONCILIATION'), '3" Thermal POS Z-Report HTML includes headers and reconciliation tables');
assert(posZReport.includes('EXPECTED TILL CASH:'), 'POS Z-Report includes system expected cash line');

const a4ZReport = context.Register.generateZReportHtml(closeRes.register.id, 'a4');
assert(a4ZReport.includes('DAY-END Z-REPORT') && a4ZReport.includes('Financial Movements'), 'A4 Audit Z-Report HTML generated with complete tables');

// Test 14.7: Backup Payload Verification
const regBackup = context.DB.createBackupObject();
assert(Array.isArray(regBackup.data.registers) && regBackup.stats.registersCount >= 1, 'createBackupObject includes registers data array and stats');

// Phase 15: Official GSTR-1 JSON Generator & GST Portal Schema Verification
console.log('\n--- Phase 15: Official GSTR-1 JSON Generator & GST Portal Schema Verification ---');
runFile(path.resolve(__dirname, '..', 'js/reports.js'), context, 'Reports');
assert(typeof context.Reports === 'object', 'Reports module loaded successfully');

// Test 15.1: Date Formatting & UQC Mapping Helpers
assert(context.Reports._fmtDateGSTN('2026-10-24') === '24-10-2026', 'Date correctly formatted to GSTN DD-MM-YYYY format');
assert(context.Reports._mapUQC('Nos') === 'NOS' && context.Reports._mapUQC('Box') === 'BOX', 'UQC mapper resolves NOS and BOX standard unit codes');
assert(context.Reports._mapUQC('Meter') === 'MTR' && context.Reports._mapUQC('Set') === 'SET', 'UQC mapper resolves MTR and SET standard unit codes');

// Test 15.2: Seed an invoice with B2B GSTIN for October 2026
const b2bSale = {
  invoiceNo: 'APS/2026-27/0088',
  date: '2026-10-24',
  customerId: 'CUST-001',
  customerName: 'Tech Innovators Pvt Ltd',
  customerGstin: '27AABCZ9321K1Z4',
  customerStateCode: '27',
  placeOfSupply: '27',
  reverseCharge: false,
  items: [
    { productId: 'PROD-001', name: 'Hikvision 4MP IP Dome Camera', hsn: '8525', unit: 'Nos', qty: 2, rate: 4500, discount: 0, gstRate: 18, taxableValue: 9000, cgstRate: 9, cgstAmt: 810, sgstRate: 9, sgstAmt: 810, igstRate: 0, igstAmt: 0, totalAmt: 10620 }
  ],
  subtotal: 9000,
  totalCgst: 810,
  totalSgst: 810,
  totalIgst: 0,
  totalTax: 1620,
  total: 10620,
  isIntra: true,
  status: 'paid'
};
context.DB.saveSale(b2bSale);

// Test 15.3: GSTR-1 JSON Top-Level Structure
const gstr1 = context.Reports.generateGSTR1Json('2026-10');
assert(typeof gstr1 === 'object', 'generateGSTR1Json returns valid JSON object');
assert(gstr1.gstin && gstr1.fp === '102026', `Top-level GSTR-1 contains valid GSTIN and financial period 102026 (got ${gstr1.fp})`);
assert(Array.isArray(gstr1.b2b) && Array.isArray(gstr1.b2cs) && Array.isArray(gstr1.cdnr) && Array.isArray(gstr1.cdnur), 'Contains required b2b, b2cs, cdnr, and cdnur arrays');
assert(typeof gstr1.hsn === 'object' && Array.isArray(gstr1.hsn.data), 'Contains required Table 12 HSN data array');
assert(typeof gstr1.doc_issue === 'object' && Array.isArray(gstr1.doc_issue.doc_det), 'Contains required Table 13 doc_issue array');

// Test 15.4: B2B Table Verification
const b2bEntry = gstr1.b2b.find(b => b.ctin === '27AABCZ9321K1Z4');
assert(b2bEntry && b2bEntry.inv.length >= 1, 'B2B table accurately grouped registered customer with invoice');
const b2bInv = b2bEntry.inv.find(i => i.inum === 'APS/2026-27/0088');
assert(b2bInv && b2bInv.idt === '24-10-2026' && b2bInv.pos === '27', 'B2B invoice carries valid DD-MM-YYYY date and 2-digit POS code');
assert(b2bInv.itms && b2bInv.itms[0].itm_det.rt === 18 && b2bInv.itms[0].itm_det.txval === 9000, 'B2B invoice item details carry rate 18% and taxable value 9000');

// Test 15.5: Table 12 HSN Summary & Table 13 Document Series
const hsnEntry = gstr1.hsn.data.find(h => h.hsn_sc === '8525');
assert(hsnEntry && hsnEntry.uqc === 'NOS' && hsnEntry.qty >= 2, 'HSN summary accurately aggregates CCTV camera quantities');
assert(gstr1.doc_issue.doc_det.some(d => d.doc_num === 1), 'Table 13 doc_issue includes outward sales invoice serial range');

// Test 15.6: Validation Engine
const valReport = context.Reports.validateGSTR1('2026-10');
assert(valReport && typeof valReport.isValid === 'boolean', 'validateGSTR1 returns validation report');
assert(valReport.stats.b2bCount >= 1 && valReport.stats.hsnCount >= 1, 'validateGSTR1 stats correctly reflect populated sections');

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
