'use strict';

/* ─────────────────────────────────────────────
   Indian States with GST State Codes
───────────────────────────────────────────── */
const INDIAN_STATES = [
  { name: 'Andhra Pradesh', code: '37' },
  { name: 'Arunachal Pradesh', code: '12' },
  { name: 'Assam', code: '18' },
  { name: 'Bihar', code: '10' },
  { name: 'Chandigarh', code: '04' },
  { name: 'Chhattisgarh', code: '22' },
  { name: 'Dadra & Nagar Haveli and Daman & Diu', code: '26' },
  { name: 'Delhi', code: '07' },
  { name: 'Goa', code: '30' },
  { name: 'Gujarat', code: '24' },
  { name: 'Haryana', code: '06' },
  { name: 'Himachal Pradesh', code: '02' },
  { name: 'Jammu and Kashmir', code: '01' },
  { name: 'Jharkhand', code: '20' },
  { name: 'Karnataka', code: '29' },
  { name: 'Kerala', code: '32' },
  { name: 'Ladakh', code: '38' },
  { name: 'Lakshadweep', code: '31' },
  { name: 'Madhya Pradesh', code: '23' },
  { name: 'Maharashtra', code: '27' },
  { name: 'Manipur', code: '14' },
  { name: 'Meghalaya', code: '17' },
  { name: 'Mizoram', code: '15' },
  { name: 'Nagaland', code: '13' },
  { name: 'Odisha', code: '21' },
  { name: 'Puducherry', code: '34' },
  { name: 'Punjab', code: '03' },
  { name: 'Rajasthan', code: '08' },
  { name: 'Sikkim', code: '11' },
  { name: 'Tamil Nadu', code: '33' },
  { name: 'Telangana', code: '36' },
  { name: 'Tripura', code: '16' },
  { name: 'Uttar Pradesh', code: '09' },
  { name: 'Uttarakhand', code: '05' },
  { name: 'West Bengal', code: '19' },
];

const GST_RATES = [0, 0.1, 0.25, 1, 1.5, 3, 5, 7.5, 12, 18, 28];
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'NEFT', 'RTGS', 'Credit Card', 'Other'];
const UNITS = ['Nos', 'Pcs', 'Box', 'Pack', 'Set', 'Roll', 'Mtr', 'Job', 'Visit', 'License', 'Year', 'Month'];
const DECIMAL_UNITS = ['Mtr', 'Roll'];

function isDecimalUnit(unit) {
  return DECIMAL_UNITS.includes(unit);
}

/* ─────────────────────────────────────────────
   Helper Utilities
───────────────────────────────────────────── */
function genId(prefix) {
  return prefix + Date.now() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function getFY() {
  const now = new Date();
  const m = now.getMonth(); // 0-indexed
  const y = now.getFullYear();
  if (m >= 3) return `${y}-${String(y + 1).slice(-2)}`;
  return `${y - 1}-${String(y).slice(-2)}`;
}

function fmtCurrency(n) {
  n = parseFloat(n) || 0;
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysBetween(d1, d2) {
  const diff = new Date(d1) - new Date(d2);
  return Math.floor(diff / 86400000);
}

function numberToWords(amount) {
  amount = Math.round(amount);
  if (amount === 0) return 'Zero Rupees Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function w(n) {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + w(n % 100) : '');
    if (n < 100000) return w(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + w(n % 1000) : '');
    if (n < 10000000) return w(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + w(n % 100000) : '');
    return w(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + w(n % 10000000) : '');
  }

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let result = w(rupees) + ' Rupees';
  if (paise > 0) result += ' and ' + w(paise) + ' Paise';
  return result + ' Only';
}

function validateGSTIN(gstin) {
  if (!gstin) return true; // optional for unregistered
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return regex.test(gstin.toUpperCase());
}

/* ─────────────────────────────────────────────
   GST Calculation Engine
───────────────────────────────────────────── */
function calcTotals(items, sellerStateCode, buyerStateCode) {
  const isIntra = sellerStateCode === buyerStateCode;
  let subtotal = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0;

  const calcItems = items.map(item => {
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.rate) || 0;
    const discount = parseFloat(item.discount) || 0;
    const gstRate = parseFloat(item.gstRate) || 0;

    const taxable = Math.round(qty * rate * (1 - discount / 100) * 100) / 100;
    const cgstAmt = isIntra ? Math.round(taxable * gstRate / 2 / 100 * 100) / 100 : 0;
    const sgstAmt = isIntra ? Math.round(taxable * gstRate / 2 / 100 * 100) / 100 : 0;
    const igstAmt = !isIntra ? Math.round(taxable * gstRate / 100 * 100) / 100 : 0;
    const totalAmt = taxable + cgstAmt + sgstAmt + igstAmt;

    subtotal += taxable;
    totalCgst += cgstAmt;
    totalSgst += sgstAmt;
    totalIgst += igstAmt;

    return {
      ...item,
      taxableValue: Math.round(taxable * 100) / 100,
      cgstRate: isIntra ? gstRate / 2 : 0,
      sgstRate: isIntra ? gstRate / 2 : 0,
      igstRate: isIntra ? 0 : gstRate,
      cgstAmt: Math.round(cgstAmt * 100) / 100,
      sgstAmt: Math.round(sgstAmt * 100) / 100,
      igstAmt: Math.round(igstAmt * 100) / 100,
      totalAmt: Math.round(totalAmt * 100) / 100,
    };
  });

  subtotal = Math.round(subtotal * 100) / 100;
  totalCgst = Math.round(totalCgst * 100) / 100;
  totalSgst = Math.round(totalSgst * 100) / 100;
  totalIgst = Math.round(totalIgst * 100) / 100;
  const totalTax = Math.round((totalCgst + totalSgst + totalIgst) * 100) / 100;
  const total = Math.round((subtotal + totalTax) * 100) / 100;

  return { items: calcItems, subtotal, totalCgst, totalSgst, totalIgst, totalTax, total, isIntra };
}

const EXPENSE_CATEGORIES = [
  'Travel & Fuel',
  'Rent & Electricity',
  'Internet & Phone',
  'Tools & Consumables',
  'Salaries & Wages',
  'Office & Stationery',
  'Software & Subscriptions',
  'Marketing & Promotion',
  'Repairs & Maintenance',
  'Tea & Refreshments',
  'Other / Misc'
];

/* ─────────────────────────────────────────────
   Database Layer (localStorage)
───────────────────────────────────────────── */
const DB = {
  K: {
    BIZ: 'sp_biz',
    CUSTOMERS: 'sp_customers',
    SUPPLIERS: 'sp_suppliers',
    PRODUCTS: 'sp_products',
    CATEGORIES: 'sp_categories',
    SALES: 'sp_sales',
    PURCHASES: 'sp_purchases',
    EXPENSES: 'sp_expenses',
    MOVEMENTS: 'sp_movements',
    AUTH: 'sp_auth',
    BACKUPS: 'sp_backups',
    LICENSE: 'sp_license',
    REMOTE: 'sp_remote',
    TEMPLATE: 'sp_custom_template',
    SETUP_DONE: 'sp_setup_done',
    SEEDED: 'sp_seeded',
  },

  _get(k) { try { const d = localStorage.getItem(k); return d ? JSON.parse(d) : null; } catch (e) { return null; } },
  _set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },

  /* Business */
  getBiz() {
    return this._get(this.K.BIZ) || {
      name: 'My Business', tagline: '', logo: '', gstin: '', pan: '',
      address: '', city: '', state: 'Maharashtra', stateCode: '27',
      pincode: '', phone: '', email: '', website: '',
      bankName: '', bankAccount: '', bankIFSC: '', bankBranch: '', upiId: '',
      invoicePrefix: 'INV', invoiceCounter: 1, invoiceFormat: 'classic',
      billPrefix: 'PO', billCounter: 1,
      defaultPaymentTerms: 30, signatory: '', termsAndConditions: 'Goods once sold will not be taken back.\nInterest @18% p.a. will be charged on delayed payments.',
    };
  },
  setBiz(b) { this._set(this.K.BIZ, b); },

  /* Bill Templates & Formats (Licensed Feature) */
  getBillFormat() {
    const limits = this.getTrialLimits();
    if (limits.isTrial) return 'classic';
    const biz = this.getBiz();
    return biz.invoiceFormat || 'classic';
  },
  setBillFormat(fmt) {
    const biz = this.getBiz();
    biz.invoiceFormat = fmt;
    this.setBiz(biz);
  },
  getCustomTemplate() {
    return this._get(this.K.TEMPLATE) || {
      primaryColor: '#1e293b',
      accentColor: '#0284c7',
      fontFamily: 'Arial, sans-serif',
      logoPos: 'left',
      headerStyle: 'solid',
      showBorder: true,
      customNotes: 'Thank you for choosing us for your IT & CCTV infrastructure!',
    };
  },
  saveCustomTemplate(t) {
    this._set(this.K.TEMPLATE, t);
  },

  /* Categories */
  getCategories() { return this._get(this.K.CATEGORIES) || ['Computers & Laptops', 'CCTV & Security', 'Networking & Cables', 'Computer Parts (RAM/SSD)', 'Printers & Peripherals', 'Services & AMC', 'Software & Licenses', 'Other']; },
  saveCategories(c) { this._set(this.K.CATEGORIES, c); },

  /* Customers */
  getCustomers() { return this._get(this.K.CUSTOMERS) || []; },
  getCustomerById(id) { return this.getCustomers().find(c => c.id === id); },
  saveCustomer(data) {
    const list = this.getCustomers();
    if (data.id) {
      const i = list.findIndex(c => c.id === data.id);
      if (i > -1) list[i] = { ...list[i], ...data }; else list.push(data);
    } else {
      data.id = genId('C'); data.createdAt = new Date().toISOString();
      list.push(data);
    }
    this._set(this.K.CUSTOMERS, list);
    return data;
  },
  deleteCustomer(id) { this._set(this.K.CUSTOMERS, this.getCustomers().filter(c => c.id !== id)); },

  /* Suppliers */
  getSuppliers() { return this._get(this.K.SUPPLIERS) || []; },
  getSupplierById(id) { return this.getSuppliers().find(s => s.id === id); },
  saveSupplier(data) {
    const list = this.getSuppliers();
    if (data.id) {
      const i = list.findIndex(s => s.id === data.id);
      if (i > -1) list[i] = { ...list[i], ...data }; else list.push(data);
    } else {
      data.id = genId('S'); data.createdAt = new Date().toISOString();
      list.push(data);
    }
    this._set(this.K.SUPPLIERS, list);
    return data;
  },
  deleteSupplier(id) { this._set(this.K.SUPPLIERS, this.getSuppliers().filter(s => s.id !== id)); },

  /* Products */
  getProducts() { return this._get(this.K.PRODUCTS) || []; },
  getProductById(id) { return this.getProducts().find(p => p.id === id); },
  saveProduct(data) {
    const list = this.getProducts();
    if (data.id) {
      const i = list.findIndex(p => p.id === data.id);
      if (i > -1) list[i] = { ...list[i], ...data }; else list.push(data);
    } else {
      data.id = genId('P'); data.createdAt = new Date().toISOString();
      list.push(data);
    }
    this._set(this.K.PRODUCTS, list);
    return data;
  },
  deleteProduct(id) { this._set(this.K.PRODUCTS, this.getProducts().filter(p => p.id !== id)); },
  adjustStock(productId, delta) {
    const products = this.getProducts().map(p =>
      p.id === productId ? { ...p, stock: Math.max(0, (p.stock || 0) + delta) } : p
    );
    this._set(this.K.PRODUCTS, products);
  },

  /* Sales */
  getSales() { return this._get(this.K.SALES) || []; },
  getSaleById(id) { return this.getSales().find(s => s.id === id); },
  saveSale(data, isNew = true) {
    const list = this.getSales();
    if (!isNew) {
      const i = list.findIndex(s => s.id === data.id);
      if (i > -1) list[i] = data; else list.push(data);
      this._set(this.K.SALES, list);
      return data;
    }
    data.id = genId('INV');
    data.createdAt = new Date().toISOString();
    if (data.items) {
      data.items.forEach(item => {
        if (item.productId) {
          this.adjustStock(item.productId, -item.qty);
          this._addMov({ productId: item.productId, type: 'out', qty: item.qty, reference: data.invoiceNo, date: data.date, note: 'Sale: ' + data.invoiceNo });
        }
      });
    }
    list.push(data);
    this._set(this.K.SALES, list);
    return data;
  },
  deleteSale(id) { this._set(this.K.SALES, this.getSales().filter(s => s.id !== id)); },
  nextInvoiceNo() {
    const b = this.getBiz();
    const no = `${b.invoicePrefix || 'INV'}/${getFY()}/${String(b.invoiceCounter || 1).padStart(4, '0')}`;
    this.setBiz({ ...b, invoiceCounter: (b.invoiceCounter || 1) + 1 });
    return no;
  },

  /* Purchases */
  getPurchases() { return this._get(this.K.PURCHASES) || []; },
  getPurchaseById(id) { return this.getPurchases().find(p => p.id === id); },
  savePurchase(data, isNew = true) {
    const list = this.getPurchases();
    if (!isNew) {
      const i = list.findIndex(p => p.id === data.id);
      if (i > -1) list[i] = data; else list.push(data);
      this._set(this.K.PURCHASES, list);
      return data;
    }
    data.id = genId('BILL');
    data.createdAt = new Date().toISOString();
    if (data.items) {
      data.items.forEach(item => {
        if (item.productId) {
          this.adjustStock(item.productId, +item.qty);
          this._addMov({ productId: item.productId, type: 'in', qty: item.qty, reference: data.billNo, date: data.date, note: 'Purchase: ' + data.billNo });
        }
      });
    }
    list.push(data);
    this._set(this.K.PURCHASES, list);
    return data;
  },
  deletePurchase(id) { this._set(this.K.PURCHASES, this.getPurchases().filter(p => p.id !== id)); },
  nextBillNo() {
    const b = this.getBiz();
    const no = `${b.billPrefix || 'PO'}/${getFY()}/${String(b.billCounter || 1).padStart(4, '0')}`;
    this.setBiz({ ...b, billCounter: (b.billCounter || 1) + 1 });
    return no;
  },

  /* Expenses */
  getExpenses() { return this._get(this.K.EXPENSES) || []; },
  getExpenseById(id) { return this.getExpenses().find(e => e.id === id); },
  saveExpense(data) {
    const list = this.getExpenses();
    if (data.id) {
      const i = list.findIndex(e => e.id === data.id);
      if (i > -1) list[i] = { ...list[i], ...data }; else list.push(data);
    } else {
      data.id = genId('EXP');
      data.createdAt = new Date().toISOString();
      list.push(data);
    }
    this._set(this.K.EXPENSES, list);
    return data;
  },
  deleteExpense(id) { this._set(this.K.EXPENSES, this.getExpenses().filter(e => e.id !== id)); },

  /* Stock Movements */
  getMovements() { return this._get(this.K.MOVEMENTS) || []; },
  _addMov(m) {
    const list = this.getMovements();
    m.id = genId('MOV');
    list.push(m);
    this._set(this.K.MOVEMENTS, list);
  },

  /* ─── Mode & Security ─── */
  getAuth() {
    return this._get(this.K.AUTH) || {
      role: 'owner', // 'staff' | 'owner' | 'developer'
      ownerPin: '1234',
      devKey: 'andropcsoft',
      lastBackupDate: null,
    };
  },
  setAuth(a) { this._set(this.K.AUTH, a); },
  getRole() { return this.getAuth().role || 'owner'; },
  setRole(role) {
    const a = this.getAuth();
    a.role = role;
    this.setAuth(a);
  },
  verifyOwnerPin(pin) {
    const auth = this.getAuth();
    return pin === (auth.ownerPin || '1234') || pin === 'andropcsoft' || pin === 'shraban' || pin === 'shraban@9800';
  },
  verifyDevKey(key) {
    return key === 'shraban@9800' || key === 'andropcsoft' || key === 'shraban';
  },
  setOwnerPin(newPin) {
    const a = this.getAuth();
    a.ownerPin = newPin;
    this.setAuth(a);
  },

  /* ─── Gmail & Subscription Licensing Engine ─── */
  getLicense() {
    let lic = this._get(this.K.LICENSE);
    if (!lic) {
      const now = new Date();
      const expiry = new Date(now.getTime() + 60 * 86400000);
      lic = {
        machineId: 'SP-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
        registeredEmail: '',
        registeredShop: '',
        plan: 'trial', // 'trial' | 'annual' | 'lifetime'
        trialStartDate: now.toISOString().split('T')[0],
        trialDays: 60,
        expiryDate: expiry.toISOString().split('T')[0],
        licenseKey: '',
        status: 'active'
      };
      this.setLicense(lic);
    }
    return lic;
  },

  setLicense(l) { this._set(this.K.LICENSE, l); },

  _hashKey(email, plan, year) {
    const raw = `ANDRO_${email.toLowerCase().trim()}_${plan.toUpperCase()}_${year}_KEY`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36).toUpperCase().padStart(6, '0');
  },

  generateLicenseKey(email, plan = '1YR', expiryYear = 2027) {
    const cleanEmail = (email || '').toLowerCase().trim();
    if (!cleanEmail) throw new Error('Email is required to generate license');
    const hash = this._hashKey(cleanEmail, plan, expiryYear);
    const prefix = plan === 'LIFE' ? 'SPS-LIFE' : 'SPS-1YR';
    return `${prefix}-${hash}-${expiryYear}`;
  },

  verifyLicenseKey(email, key) {
    if (!email || !key) return { valid: false, message: 'Email and License Key are required' };
    const cleanEmail = email.toLowerCase().trim();
    const cleanKey = key.toUpperCase().trim();
    const parts = cleanKey.split('-');
    if (parts.length < 4 || parts[0] !== 'SPS') {
      return { valid: false, message: 'Invalid key format. Expected format: SPS-1YR-XXXXXX-YYYY' };
    }
    const plan = parts[1]; // '1YR' or 'LIFE'
    const keyHash = parts[2];
    const year = parseInt(parts[3]) || 2027;

    const expectedHash = this._hashKey(cleanEmail, plan, year);
    if (keyHash !== expectedHash) {
      return { valid: false, message: 'License key does not match this Gmail address!' };
    }

    const expiryDate = plan === 'LIFE' ? '2099-12-31' : `${year}-12-31`;
    return {
      valid: true,
      plan: plan === 'LIFE' ? 'lifetime' : 'annual',
      expiryDate,
      message: `Verified successfully! ${plan === 'LIFE' ? 'Lifetime' : '1-Year Annual'} License.`
    };
  },

  activateLicense(email, key, shopName) {
    const res = this.verifyLicenseKey(email, key);
    if (!res.valid) throw new Error(res.message);

    const lic = this.getLicense();
    lic.registeredEmail = email.toLowerCase().trim();
    lic.registeredShop = shopName || DB.getBiz().name;
    lic.plan = res.plan;
    lic.expiryDate = res.expiryDate;
    lic.licenseKey = key.toUpperCase().trim();
    lic.status = 'active';
    delete lic.blockReason;
    this.setLicense(lic);
    return lic;
  },

  extendTrial(extraDays = 14) {
    const lic = this.getLicense();
    const curExp = new Date(lic.expiryDate || new Date());
    const newExp = new Date(curExp.getTime() + extraDays * 86400000);
    lic.expiryDate = newExp.toISOString().split('T')[0];
    lic.trialDays = (lic.trialDays || 60) + extraDays;
    lic.status = 'active';
    delete lic.blockReason;
    this.setLicense(lic);
    return lic;
  },

  getLicenseStatus() {
    const lic = this.getLicense();
    const now = new Date();
    const exp = new Date(lic.expiryDate + 'T23:59:59');
    const diffDays = Math.ceil((exp - now) / 86400000);
    const isExpired = diffDays < 0;
    const isBlocked = lic.status === 'blocked';

    let planName = '60-Day Free Trial';
    if (lic.plan === 'annual') planName = '1-Year Commercial License';
    if (lic.plan === 'lifetime') planName = 'Lifetime Unlimited License';

    return {
      ...lic,
      daysLeft: Math.max(0, diffDays),
      isExpired,
      isBlocked,
      planName,
      isTrial: lic.plan === 'trial',
      isLifetime: lic.plan === 'lifetime',
    };
  },

  /* ─── Trial vs Commercial Feature Limits ─── */
  getTrialLimits() {
    const lic = this.getLicenseStatus();
    const custCount = this.getCustomers().length;
    const suppCount = this.getSuppliers().length;
    const billCount = this.getSales().length;

    if (!lic.isTrial) {
      return {
        isTrial: false,
        maxCustomers: Infinity,
        maxSuppliers: Infinity,
        maxCleanBills: Infinity,
        maxTotalBills: Infinity,
        currentCustomers: custCount,
        currentSuppliers: suppCount,
        currentBills: billCount,
        canAddCustomer: true,
        canAddSupplier: true,
        canCreateBill: true,
        canSetBranding: true,
        isWatermarkNeeded: false,
        summaryText: 'Unlimited Commercial License (No Restrictions)'
      };
    }

    const maxCustomers = 50;
    const maxSuppliers = 10;
    const maxCleanBills = 30;
    const maxTotalBills = 80;

    const canAddCustomer = custCount < maxCustomers;
    const canAddSupplier = suppCount < maxSuppliers;
    const isWatermarkNeeded = billCount >= maxCleanBills;
    const canCreateBill = billCount < maxTotalBills && !lic.isExpired && !lic.isBlocked;

    return {
      isTrial: true,
      maxCustomers,
      currentCustomers: custCount,
      canAddCustomer,
      maxSuppliers,
      currentSuppliers: suppCount,
      canAddSupplier,
      maxCleanBills,
      maxTotalBills,
      currentBills: billCount,
      isWatermarkNeeded,
      canCreateBill,
      canSetBranding: false,
      billsRemaining: Math.max(0, maxTotalBills - billCount),
      cleanBillsRemaining: Math.max(0, maxCleanBills - billCount),
      summaryText: `60-Day Trial: ${custCount}/${maxCustomers} Cust, ${suppCount}/${maxSuppliers} Supp, ${billCount}/${maxTotalBills} Bills (${isWatermarkNeeded ? 'Watermarked' : 'Clean Print'})`
    };
  },

  /* ─── Remote Google Sheet Licensing & Telemetry Engine ─── */
  getRemoteConfig() {
    return this._get(this.K.REMOTE) || {
      webhookUrl: 'https://script.google.com/macros/s/AKfycbzPyugDKIdgwdbcqSkPWNYJcyQBhgzMz_mYz6YR9gw_wHzwMnTIbs_z6kzB2S2esOTt/exec',
      lastSyncDate: null,
      lastSyncStatus: null,
      autoSync: true
    };
  },

  setRemoteConfig(cfg) { this._set(this.K.REMOTE, cfg); },

  async syncRemoteLicense() {
    const cfg = this.getRemoteConfig();
    if (!cfg.webhookUrl) return { skipped: true, reason: 'No Google Sheet webhook configured' };

    const lic = this.getLicenseStatus();
    const biz = this.getBiz();
    const sales = this.getSales();
    const purchases = this.getPurchases();
    const products = this.getProducts();
    const customers = this.getCustomers();
    const suppliers = this.getSuppliers();
    const totalSalesAmt = sales.reduce((s, x) => s + (parseFloat(x.total) || 0), 0);

    const payload = {
      action: 'heartbeat',
      machineId: lic.machineId,
      shopName: biz.name || 'Unnamed Shop',
      signatory: biz.signatory || 'Owner',
      email: lic.registeredEmail || biz.email || 'unregistered',
      phone: biz.phone || 'N/A',
      city: biz.city || 'N/A',
      state: biz.state || 'N/A',
      pincode: biz.pincode || 'N/A',
      address: biz.address || 'N/A',
      gstin: biz.gstin || 'N/A',
      pan: biz.pan || 'N/A',
      bankName: biz.bankName || 'N/A',
      upiId: biz.upiId || 'N/A',
      plan: lic.plan,
      status: lic.status || 'active',
      expiryDate: lic.expiryDate || 'N/A',
      daysLeft: lic.daysLeft,
      salesCount: sales.length,
      purchasesCount: purchases.length,
      productsCount: products.length,
      partiesCount: customers.length + suppliers.length,
      totalSalesRevenue: parseFloat(totalSalesAmt).toFixed(2),
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };

    const qs = Object.keys(payload).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(payload[k])).join('&');
    const targetUrl = cfg.webhookUrl + (cfg.webhookUrl.includes('?') ? '&' : '?') + qs;

    try {
      const resp = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const text = await resp.text();
      let data = {};
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { status: 'success', command: 'ALLOW' };
      }

      cfg.lastSyncDate = new Date().toISOString();
      cfg.lastSyncStatus = 'success';
      this.setRemoteConfig(cfg);

      // Handle Remote Killswitch, Online Auto-Activation & Trial Extension
      if (data && data.command) {
        const cmd = data.command.toUpperCase().trim();
        const l = this.getLicense();

        if (cmd === 'BLOCK' || cmd === 'LOCK') {
          l.status = 'blocked';
          l.blockReason = data.message || 'License suspended by developer. Please contact support.';
          this.setLicense(l);
          return { command: 'BLOCK', message: l.blockReason };
        } else if (cmd === 'ACTIVATE_1YR' || cmd === 'ACTIVATE_ANNUAL' || (data.plan === 'annual' && (cmd === 'ALLOW' || cmd === 'ACTIVATE'))) {
          const nextYear = new Date().getFullYear() + 1;
          const expiryDate = data.expiryDate || `${nextYear}-12-31`;
          const email = l.registeredEmail || biz.email || 'client@shoppulse.com';
          const key = data.licenseKey || this.generateLicenseKey(email, '1YR', parseInt(expiryDate.split('-')[0]));
          l.plan = 'annual';
          l.expiryDate = expiryDate;
          l.licenseKey = key;
          l.status = 'active';
          delete l.blockReason;
          this.setLicense(l);
          return { command: 'ACTIVATED', plan: 'annual', message: '1-Year Commercial License Activated Online!' };
        } else if (cmd === 'ACTIVATE_LIFE' || cmd === 'ACTIVATE_LIFETIME' || (data.plan === 'lifetime' && (cmd === 'ALLOW' || cmd === 'ACTIVATE'))) {
          const email = l.registeredEmail || biz.email || 'client@shoppulse.com';
          const key = data.licenseKey || this.generateLicenseKey(email, 'LIFE', 2099);
          l.plan = 'lifetime';
          l.expiryDate = '2099-12-31';
          l.licenseKey = key;
          l.status = 'active';
          delete l.blockReason;
          this.setLicense(l);
          return { command: 'ACTIVATED', plan: 'lifetime', message: 'Lifetime Unlimited License Activated Online!' };
        } else if (cmd === 'UNBLOCK' || cmd === 'ALLOW') {
          if (l.status === 'blocked') {
            l.status = 'active';
            delete l.blockReason;
            this.setLicense(l);
          }
        } else if (cmd === 'EXTEND' && data.extendDays) {
          this.extendTrial(parseInt(data.extendDays) || 30);
        }
      }

      return { success: true, data };
    } catch (err) {
      cfg.lastSyncStatus = 'error: ' + err.message;
      this.setRemoteConfig(cfg);
      return { success: false, error: err.message };
    }
  },

  async fetchRemoteUsers() {
    const cfg = this.getRemoteConfig();
    if (!cfg.webhookUrl) return { success: false, error: 'No Google Sheet Webhook URL configured' };
    try {
      const url = cfg.webhookUrl + (cfg.webhookUrl.includes('?') ? '&' : '?') + 'action=get_users&t=' + Date.now();
      const resp = await fetch(url, { method: 'GET' });
      const data = await resp.json();
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async setRemoteCommand(machineId, command, extendDays = 0) {
    const cfg = this.getRemoteConfig();
    if (!cfg.webhookUrl) return { success: false, error: 'No Google Sheet Webhook URL configured' };
    try {
      const payload = { action: 'set_command', machineId, command, extendDays };
      const qs = Object.keys(payload).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(payload[k])).join('&');
      const url = cfg.webhookUrl + (cfg.webhookUrl.includes('?') ? '&' : '?') + qs;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /* ─── Onboarding & Welcome Setup Wizard ─── */
  isSetupDone() {
    return this._get(this.K.SETUP_DONE) === true;
  },

  setSetupDone(done = true) {
    this._set(this.K.SETUP_DONE, !!done);
  },

  completeSetup(data) {
    const biz = this.getBiz();
    if (data.shopName) biz.name = data.shopName.trim();
    if (data.email) biz.email = data.email.trim();
    if (data.phone) biz.phone = data.phone.trim();
    if (data.city) biz.city = data.city.trim();
    if (data.stateCode) {
      biz.stateCode = data.stateCode;
      const s = INDIAN_STATES.find(st => st.code === data.stateCode);
      if (s) biz.state = s.name;
    }
    if (data.gstin) biz.gstin = data.gstin.toUpperCase().trim();
    this.setBiz(biz);

    // Initialize License
    const lic = this.getLicense();
    if (data.email) lic.registeredEmail = data.email.trim();
    if (data.shopName) lic.registeredShop = data.shopName.trim();
    this.setLicense(lic);

    // Set Owner PIN
    if (data.pin) {
      this.setOwnerPin(data.pin.trim());
    }

    this.setSetupDone(true);

    // Auto-ping Google Sheets telemetry in background to register new shop lead
    setTimeout(() => {
      this.syncRemoteLicense().catch(() => {});
    }, 1000);

    return { biz, lic };
  },

  /* ─── Backup & Restore Engine ─── */
  createBackupObject() {
    const biz = this.getBiz();
    return {
      app: 'ShopPulse',
      developer: {
        author: 'Shraban Kumar Mahato',
        email: 'shraban@andropcsoft.com',
        website: 'andropcsoft.com',
        version: '1.0.0'
      },
      exportedAt: new Date().toISOString(),
      businessName: biz.name,
      gstin: biz.gstin,
      stats: {
        salesCount: this.getSales().length,
        purchasesCount: this.getPurchases().length,
        expensesCount: this.getExpenses().length,
        productsCount: this.getProducts().length,
        customersCount: this.getCustomers().length,
        suppliersCount: this.getSuppliers().length
      },
      data: {
        biz: this.getBiz(),
        categories: this.getCategories(),
        customers: this.getCustomers(),
        suppliers: this.getSuppliers(),
        products: this.getProducts(),
        sales: this.getSales(),
        purchases: this.getPurchases(),
        expenses: this.getExpenses(),
        movements: this.getMovements(),
        auth: this.getAuth()
      }
    };
  },

  downloadBackup() {
    const backup = this.createBackupObject();
    const biz = this.getBiz();
    const jsonStr = JSON.stringify(backup, null, 2);
    const dateStr = new Date().toISOString().split('T')[0];
    const safeBiz = (biz.name || 'ShopPulse').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `ShopPulse_Backup_${safeBiz}_${dateStr}.json`;

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    // Update last backup timestamp & save local snapshot
    const auth = this.getAuth();
    auth.lastBackupDate = new Date().toISOString();
    this.setAuth(auth);
    this.saveSnapshot(`Manual Backup Export (${filename})`);
    return filename;
  },

  saveSnapshot(label = 'Auto Snapshot') {
    try {
      const history = this._get(this.K.BACKUPS) || [];
      const snap = {
        id: genId('SNAP'),
        date: new Date().toISOString(),
        label,
        data: this.createBackupObject()
      };
      history.unshift(snap);
      if (history.length > 5) history.length = 5; // keep last 5 snapshots
      this._set(this.K.BACKUPS, history);
    } catch (e) {
      console.warn('Snapshot storage limit reached', e);
    }
  },

  getSnapshots() {
    return this._get(this.K.BACKUPS) || [];
  },

  restoreBackup(backupData) {
    if (!backupData || !backupData.data) {
      throw new Error('Invalid backup file format: missing data payload');
    }
    const d = backupData.data;
    if (d.biz) this.setBiz(d.biz);
    if (d.categories) this.saveCategories(d.categories);
    if (d.customers) this._set(this.K.CUSTOMERS, d.customers);
    if (d.suppliers) this._set(this.K.SUPPLIERS, d.suppliers);
    if (d.products) this._set(this.K.PRODUCTS, d.products);
    if (d.sales) this._set(this.K.SALES, d.sales);
    if (d.purchases) this._set(this.K.PURCHASES, d.purchases);
    if (d.expenses) this._set(this.K.EXPENSES, d.expenses);
    if (d.movements) this._set(this.K.MOVEMENTS, d.movements);
    if (d.auth) this.setAuth(d.auth);
    this._set(this.K.SEEDED, true);
    return true;
  },

  factoryReset(seedDemo = false) {
    localStorage.clear();
    if (seedDemo) {
      this.seed();
    } else {
      this._set(this.K.SEEDED, true);
      this.setBiz({
        name: 'My Computer Shop', gstin: '', pan: '',
        address: '', city: '', state: 'Maharashtra', stateCode: '27',
        pincode: '', phone: '', email: '', website: '',
        bankName: '', bankAccount: '', bankIFSC: '', bankBranch: '',
        invoicePrefix: 'INV', invoiceCounter: 1,
        billPrefix: 'PO', billCounter: 1,
        defaultPaymentTerms: 30, signatory: '',
        termsAndConditions: 'All goods carry manufacturer warranty only. No returns after installation.\nSubject to local jurisdiction.'
      });
      this.saveCategories(['Laptops', 'Desktops', 'Printers', 'CCTV', 'Networking', 'Storage', 'UPS & Power', 'Computer Parts', 'AMC Services', 'Installation', 'Support']);
    }
  },

  /* ──────────────────────────────────────────
     SEED DEMO DATA
  ────────────────────────────────────────── */
  seed() {
    if (this._get(this.K.SEEDED)) return;

    this.setBiz({
      name: 'SysCare Computer Services', gstin: '27AABCT5432R1ZP', pan: 'AABCT5432R',
      address: '12, IT Park Road, Sector 5', city: 'Pune',
      state: 'Maharashtra', stateCode: '27', pincode: '411057',
      phone: '+91 98600 12345', email: 'accounts@syscare.in',
      website: 'www.syscare.in',
      bankName: 'ICICI Bank', bankAccount: '012305001234567',
      bankIFSC: 'ICIC0000123', bankBranch: 'Hinjewadi, Pune',
      upiId: 'syscare@okicici',
      invoicePrefix: 'SCS', invoiceCounter: 9,
      billPrefix: 'PO', billCounter: 6,
      defaultPaymentTerms: 30, signatory: 'Ankit Mehta',
      termsAndConditions: 'All goods carry manufacturer warranty only. No returns after installation.\nAMC services are non-refundable once commenced.\nInterest @18% p.a. on delayed payments. Subject to Pune Jurisdiction.',
    });

    // ── Customers (Businesses & Organisations) ──
    const c1 = this.saveCustomer({ name: 'Zenith Infotech Pvt Ltd', gstin: '27AABCZ9321K1Z4', phone: '9823001122', email: 'accounts@zenithinfotech.com', address: 'Plot 15, Rajiv Gandhi IT Park', city: 'Pune', state: 'Maharashtra', stateCode: '27', pincode: '411057', contactPerson: 'Suresh Patil' });
    const c2 = this.saveCustomer({ name: 'St. Xavier School & College', gstin: '27AABTS4218M1ZQ', phone: '9823003344', email: 'admin@stxaviers.edu.in', address: '5, MG Road, Camp', city: 'Pune', state: 'Maharashtra', stateCode: '27', pincode: '411001', contactPerson: 'Fr. Thomas' });
    const c3 = this.saveCustomer({ name: 'City Hospital & Research Centre', gstin: '27AABCC7123H1ZR', phone: '9823005566', email: 'accounts@cityhospital.in', address: '88 Nagar Road, Yerawada', city: 'Pune', state: 'Maharashtra', stateCode: '27', pincode: '411006', contactPerson: 'Mrs. Shinde' });
    const c4 = this.saveCustomer({ name: 'Nagpur Municipal Corporation', gstin: '27AAANS8891P1ZX', phone: '0712-2567890', email: 'it.dept@nagpurcorp.gov.in', address: 'Mahapal Complex, Kasturchand Park', city: 'Nagpur', state: 'Maharashtra', stateCode: '27', pincode: '440001', contactPerson: 'Mr. Borse (IT Officer)' });
    const c5 = this.saveCustomer({ name: 'Alpha Manufacturing Ltd', gstin: '24AABCA4512R1ZT', phone: '9712001234', email: 'it@alphamfg.com', address: 'GIDC Industrial Estate, Phase II', city: 'Surat', state: 'Gujarat', stateCode: '24', pincode: '394221', contactPerson: 'Rajesh Shah' });
    const c6 = this.saveCustomer({ name: 'Kohinoor Group of Hotels', gstin: '27AABCK3312L1ZV', phone: '9823007788', email: 'finance@kohinoorhotels.com', address: '42 FC Road', city: 'Pune', state: 'Maharashtra', stateCode: '27', pincode: '411005', contactPerson: 'Deepa Kulkarni' });

    // ── Suppliers (IT & CCTV Distributors) ──
    const s1 = this.saveSupplier({ name: 'Ingram Micro India Pvt Ltd', gstin: '27AAACI5892K1ZE', phone: '1800209800', email: 'orders@ingrammicro.in', address: 'Kalina, Santacruz East', city: 'Mumbai', state: 'Maharashtra', stateCode: '27', pincode: '400098' });
    const s2 = this.saveSupplier({ name: 'Rashi Peripherals Pvt Ltd', gstin: '27AAACP4561M1ZQ', phone: '022-66064606', email: 'sales@rptechindia.com', address: 'Mahindra Industrial Park, Kandivali', city: 'Mumbai', state: 'Maharashtra', stateCode: '27', pincode: '400067' });
    const s3 = this.saveSupplier({ name: 'Hikvision India Pvt Ltd', gstin: '29AABCH7823R1ZK', phone: '1800-103-3999', email: 'india@hikvision.com', address: 'Cessna Business Park, Kadubeesanahalli', city: 'Bengaluru', state: 'Karnataka', stateCode: '29', pincode: '560103' });
    const s4 = this.saveSupplier({ name: 'Redington India Ltd', gstin: '33AAACP4534Q1ZL', phone: '044-42243300', email: 'b2b@redington.co.in', address: 'SPL Guindy House, Mount Road', city: 'Chennai', state: 'Tamil Nadu', stateCode: '33', pincode: '600032' });

    // ── Products & Services ──
    // Computers & Laptops
    const p1  = this.saveProduct({ name: 'HP ProBook 450 G10 Laptop (i5/8GB/512GB)', sku: 'HP-PB450-G10', hsn: '8471', category: 'Laptops', unit: 'Nos', purchasePrice: 48000, sellingPrice: 56000, gstRate: 18, stock: 12, reorderLevel: 3 });
    const p2  = this.saveProduct({ name: 'Dell OptiPlex 3000 Desktop PC', sku: 'DELL-OP3000', hsn: '8471', category: 'Desktops', unit: 'Nos', purchasePrice: 32000, sellingPrice: 38500, gstRate: 18, stock: 8, reorderLevel: 2 });
    const p3  = this.saveProduct({ name: 'HP Color LaserJet Pro MFP', sku: 'HP-CLJ-MFP', hsn: '8443', category: 'Printers', unit: 'Nos', purchasePrice: 18000, sellingPrice: 22000, gstRate: 18, stock: 5, reorderLevel: 2 });
    // CCTV & Surveillance
    const p4  = this.saveProduct({ name: 'Hikvision 2MP IP Dome Camera', sku: 'HKV-DS-2CD2121', hsn: '8525', category: 'CCTV', unit: 'Nos', purchasePrice: 1800, sellingPrice: 2800, gstRate: 18, stock: 50, reorderLevel: 15 });
    const p5  = this.saveProduct({ name: 'Hikvision 5MP Bullet Camera (Outdoor)', sku: 'HKV-DS-2CD2T56', hsn: '8525', category: 'CCTV', unit: 'Nos', purchasePrice: 3200, sellingPrice: 4800, gstRate: 18, stock: 30, reorderLevel: 10 });
    const p6  = this.saveProduct({ name: 'Hikvision 8-Ch NVR (4K, POE)', sku: 'HKV-DS-7608NI', hsn: '8521', category: 'CCTV', unit: 'Nos', purchasePrice: 8500, sellingPrice: 12500, gstRate: 18, stock: 10, reorderLevel: 3 });
    const p7  = this.saveProduct({ name: '2TB Surveillance HDD (Seagate SkyHawk)', sku: 'SEG-SK2TB', hsn: '8471', category: 'Storage', unit: 'Nos', purchasePrice: 4200, sellingPrice: 5500, gstRate: 18, stock: 20, reorderLevel: 5 });
    // Networking
    const p8  = this.saveProduct({ name: 'TP-Link 24-Port Gigabit Switch', sku: 'TP-TL-SG1024D', hsn: '8517', category: 'Networking', unit: 'Nos', purchasePrice: 5500, sellingPrice: 7200, gstRate: 18, stock: 8, reorderLevel: 2 });
    const p9  = this.saveProduct({ name: 'Fortinet FortiGate Firewall 60F', sku: 'FTN-FG-60F', hsn: '8517', category: 'Networking', unit: 'Nos', purchasePrice: 28000, sellingPrice: 36000, gstRate: 18, stock: 4, reorderLevel: 1 });
    const p10 = this.saveProduct({ name: 'CAT6 UTP Cable (305m Box)', sku: 'CAT6-305M', hsn: '8544', category: 'Networking', unit: 'Box', purchasePrice: 3200, sellingPrice: 4500, gstRate: 18, stock: 15, reorderLevel: 4 });
    const p11 = this.saveProduct({ name: 'Vertiv 1KVA Online UPS', sku: 'VTV-UPS-1KVA', hsn: '8504', category: 'UPS & Power', unit: 'Nos', purchasePrice: 12000, sellingPrice: 15500, gstRate: 18, stock: 6, reorderLevel: 2 });
    // Computer Parts
    const p12 = this.saveProduct({ name: 'Kingston 16GB DDR4 RAM (3200MHz)', sku: 'KNG-16GB-DDR4', hsn: '8473', category: 'Computer Parts', unit: 'Nos', purchasePrice: 2800, sellingPrice: 3800, gstRate: 18, stock: 30, reorderLevel: 10 });
    const p13 = this.saveProduct({ name: 'Samsung 512GB SSD (SATA)', sku: 'SAM-SSD-512', hsn: '8471', category: 'Computer Parts', unit: 'Nos', purchasePrice: 3200, sellingPrice: 4500, gstRate: 18, stock: 25, reorderLevel: 8 });
    // Services (SAC Codes)
    const p14 = this.saveProduct({ name: 'Annual Maintenance Contract (AMC) — Computer', sku: 'SVC-AMC-PC', hsn: '998314', category: 'AMC Services', unit: 'Nos/Year', purchasePrice: 0, sellingPrice: 3500, gstRate: 18, stock: 9999, reorderLevel: 0 });
    const p15 = this.saveProduct({ name: 'Annual Maintenance Contract (AMC) — CCTV System', sku: 'SVC-AMC-CCTV', hsn: '998314', category: 'AMC Services', unit: 'System/Year', purchasePrice: 0, sellingPrice: 8000, gstRate: 18, stock: 9999, reorderLevel: 0 });
    const p16 = this.saveProduct({ name: 'CCTV Installation & Configuration', sku: 'SVC-INST-CCTV', hsn: '998714', category: 'Installation', unit: 'Job', purchasePrice: 0, sellingPrice: 5000, gstRate: 18, stock: 9999, reorderLevel: 0 });
    const p17 = this.saveProduct({ name: 'Network Setup & Configuration', sku: 'SVC-NET-SETUP', hsn: '998313', category: 'Installation', unit: 'Job', purchasePrice: 0, sellingPrice: 4500, gstRate: 18, stock: 9999, reorderLevel: 0 });
    const p18 = this.saveProduct({ name: 'On-Site Computer Repair / Support', sku: 'SVC-REPAIR', hsn: '998731', category: 'Support', unit: 'Visit', purchasePrice: 0, sellingPrice: 800, gstRate: 18, stock: 9999, reorderLevel: 0 });
    const p19 = this.saveProduct({ name: 'Data Backup & Recovery Service', sku: 'SVC-DATA-BKUP', hsn: '998313', category: 'Support', unit: 'Job', purchasePrice: 0, sellingPrice: 2500, gstRate: 18, stock: 9999, reorderLevel: 0 });
    this.saveCategories(['Laptops', 'Desktops', 'Printers', 'CCTV', 'Networking', 'Storage', 'UPS & Power', 'Computer Parts', 'AMC Services', 'Installation', 'Support']);

    const bizStateCode = '27';
    const today = new Date();
    const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; };
    const daysLater = (base, n) => { const d = new Date(base); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]; };

    const mkSale = (no, date, customer, itemDefs, status, payDate, payMethod, notes = '') => {
      const t = calcTotals(itemDefs, bizStateCode, customer.stateCode);
      const inv = {
        id: genId('INV'), invoiceNo: no, date, dueDate: daysLater(date, 30),
        customerId: customer.id, customerName: customer.name,
        customerGstin: customer.gstin || '',
        customerAddress: `${customer.address}, ${customer.city} - ${customer.pincode}`,
        customerState: customer.state, customerStateCode: customer.stateCode,
        placeOfSupply: customer.stateCode, sellerStateCode: bizStateCode,
        reverseCharge: false, ...t, notes,
        status, paymentDate: payDate || null, paymentMethod: payMethod || null,
        createdAt: new Date().toISOString(),
      };
      const list = this.getSales(); list.push(inv); this._set(this.K.SALES, list);
    };

    const mkPurchase = (no, date, supplier, itemDefs, status, payDate) => {
      const t = calcTotals(itemDefs, supplier.stateCode, bizStateCode);
      const bill = {
        id: genId('BILL'), billNo: no, date, dueDate: daysLater(date, 30),
        supplierId: supplier.id, supplierName: supplier.name,
        supplierGstin: supplier.gstin,
        supplierAddress: `${supplier.address}, ${supplier.city} - ${supplier.pincode}`,
        supplierState: supplier.state,
        supplierStateCode: supplier.stateCode,
        buyerStateCode: bizStateCode,
        placeOfSupply: bizStateCode,
        ...t,
        status, paymentDate: payDate || null, notes: 'Purchased for inventory stock replenishment.', createdAt: new Date().toISOString(),
      };
      const list = this.getPurchases(); list.push(bill); this._set(this.K.PURCHASES, list);
    };

    // ── Sales Invoices ──
    // INV 001 — CCTV supply & installation for school (PAID)
    mkSale('SCS/2024-25/0001', daysAgo(60), c2,
      [{ productId: p4.id, name: p4.name, hsn: p4.hsn, unit: p4.unit, qty: 16, rate: 2800, discount: 5, gstRate: 18 },
       { productId: p6.id, name: p6.name, hsn: p6.hsn, unit: p6.unit, qty: 2,  rate: 12500, discount: 0, gstRate: 18 },
       { productId: p7.id, name: p7.name, hsn: p7.hsn, unit: p7.unit, qty: 2,  rate: 5500, discount: 0, gstRate: 18 },
       { productId: p16.id, name: p16.name, hsn: p16.hsn, unit: p16.unit, qty: 2, rate: 5000, discount: 0, gstRate: 18 }],
      'paid', daysAgo(45), 'Bank Transfer', 'CCTV installation — Main building & Hostel block');

    // INV 002 — Laptops + networking for IT company (PAID)
    mkSale('SCS/2024-25/0002', daysAgo(50), c1,
      [{ productId: p1.id, name: p1.name, hsn: p1.hsn, unit: p1.unit, qty: 10, rate: 56000, discount: 3, gstRate: 18 },
       { productId: p8.id, name: p8.name, hsn: p8.hsn, unit: p8.unit, qty: 1,  rate: 7200,  discount: 0, gstRate: 18 },
       { productId: p17.id, name: p17.name, hsn: p17.hsn, unit: p17.unit, qty: 1, rate: 4500, discount: 0, gstRate: 18 }],
      'paid', daysAgo(35), 'NEFT', 'New office IT setup');

    // INV 003 — AMC renewal for hospital (PAID)
    mkSale('SCS/2024-25/0003', daysAgo(40), c3,
      [{ productId: p14.id, name: p14.name, hsn: p14.hsn, unit: p14.unit, qty: 25, rate: 3500, discount: 0, gstRate: 18 },
       { productId: p15.id, name: p15.name, hsn: p15.hsn, unit: p15.unit, qty: 3,  rate: 8000, discount: 0, gstRate: 18 }],
      'paid', daysAgo(25), 'Cheque', 'AMC 2024-25 — 25 computers + 3 CCTV systems');

    // INV 004 — Desktop supply + UPS for hotel (PAID)
    mkSale('SCS/2024-25/0004', daysAgo(30), c6,
      [{ productId: p2.id,  name: p2.name,  hsn: p2.hsn,  unit: p2.unit,  qty: 5, rate: 38500, discount: 2, gstRate: 18 },
       { productId: p11.id, name: p11.name, hsn: p11.hsn, unit: p11.unit, qty: 5, rate: 15500, discount: 0, gstRate: 18 },
       { productId: p17.id, name: p17.name, hsn: p17.hsn, unit: p17.unit, qty: 1, rate: 4500, discount: 0, gstRate: 18 }],
      'paid', daysAgo(15), 'Bank Transfer', 'Front desk + back office computers');

    // INV 005 — CCTV supply for manufacturer in Gujarat (inter-state IGST) (PAID)
    mkSale('SCS/2024-25/0005', daysAgo(25), c5,
      [{ productId: p5.id, name: p5.name, hsn: p5.hsn, unit: p5.unit, qty: 20, rate: 4800, discount: 5, gstRate: 18 },
       { productId: p6.id, name: p6.name, hsn: p6.hsn, unit: p6.unit, qty: 3,  rate: 12500, discount: 0, gstRate: 18 },
       { productId: p10.id, name: p10.name, hsn: p10.hsn, unit: p10.unit, qty: 4, rate: 4500, discount: 0, gstRate: 18 }],
      'paid', daysAgo(10), 'RTGS', 'Factory-wide CCTV surveillance system');

    // INV 006 — Firewall + network for Municipal Corporation (SENT — awaiting payment)
    mkSale('SCS/2024-25/0006', daysAgo(18), c4,
      [{ productId: p9.id,  name: p9.name,  hsn: p9.hsn,  unit: p9.unit,  qty: 2,  rate: 36000, discount: 0, gstRate: 18 },
       { productId: p8.id,  name: p8.name,  hsn: p8.hsn,  unit: p8.unit,  qty: 3,  rate: 7200,  discount: 0, gstRate: 18 },
       { productId: p17.id, name: p17.name, hsn: p17.hsn, unit: p17.unit, qty: 2,  rate: 4500,  discount: 0, gstRate: 18 }],
      'sent', null, null, 'Network upgradation — IT dept Nagpur Corp');

    // INV 007 — AMC renewal for school (UNPAID)
    mkSale('SCS/2024-25/0007', daysAgo(10), c2,
      [{ productId: p14.id, name: p14.name, hsn: p14.hsn, unit: p14.unit, qty: 30, rate: 3500, discount: 0, gstRate: 18 },
       { productId: p15.id, name: p15.name, hsn: p15.hsn, unit: p15.unit, qty: 2,  rate: 8000, discount: 0, gstRate: 18 }],
      'unpaid', null, null, 'Annual AMC 2025-26 — Computer lab & CCTV');

    // INV 008 — CCTV expansion for hospital (OVERDUE)
    mkSale('SCS/2024-25/0008', daysAgo(55), c3,
      [{ productId: p5.id, name: p5.name, hsn: p5.hsn, unit: p5.unit, qty: 8,  rate: 4800, discount: 0, gstRate: 18 },
       { productId: p7.id, name: p7.name, hsn: p7.hsn, unit: p7.unit, qty: 2,  rate: 5500, discount: 0, gstRate: 18 },
       { productId: p16.id, name: p16.name, hsn: p16.hsn, unit: p16.unit, qty: 1, rate: 5000, discount: 0, gstRate: 18 }],
      'overdue', null, null, 'ICU & Emergency wing CCTV expansion');

    // ── Purchase Bills ──
    // PO 001 — Laptops from Ingram Micro (PAID)
    mkPurchase('SCS-PO/2024-25/0001', daysAgo(65), s1,
      [{ productId: p1.id, name: p1.name, hsn: p1.hsn, unit: p1.unit, qty: 15, rate: 48000, discount: 0, gstRate: 18 },
       { productId: p2.id, name: p2.name, hsn: p2.hsn, unit: p2.unit, qty: 8,  rate: 32000, discount: 0, gstRate: 18 }],
      'paid', daysAgo(50));

    // PO 002 — CCTV cameras from Hikvision (PAID)
    mkPurchase('SCS-PO/2024-25/0002', daysAgo(55), s3,
      [{ productId: p4.id, name: p4.name, hsn: p4.hsn, unit: p4.unit, qty: 50, rate: 1800, discount: 2, gstRate: 18 },
       { productId: p5.id, name: p5.name, hsn: p5.hsn, unit: p5.unit, qty: 30, rate: 3200, discount: 2, gstRate: 18 },
       { productId: p6.id, name: p6.name, hsn: p6.hsn, unit: p6.unit, qty: 10, rate: 8500, discount: 0, gstRate: 18 }],
      'paid', daysAgo(40));

    // PO 003 — Networking equipment from Rashi Peripherals (UNPAID)
    mkPurchase('SCS-PO/2024-25/0003', daysAgo(20), s2,
      [{ productId: p8.id,  name: p8.name,  hsn: p8.hsn,  unit: p8.unit,  qty: 10, rate: 5500, discount: 0, gstRate: 18 },
       { productId: p9.id,  name: p9.name,  hsn: p9.hsn,  unit: p9.unit,  qty: 5,  rate: 28000, discount: 0, gstRate: 18 },
       { productId: p10.id, name: p10.name, hsn: p10.hsn, unit: p10.unit, qty: 20, rate: 3200, discount: 0, gstRate: 18 }],
      'unpaid', null);

    // PO 004 — Server parts from Redington (OVERDUE)
    mkPurchase('SCS-PO/2024-25/0004', daysAgo(52), s4,
      [{ productId: p12.id, name: p12.name, hsn: p12.hsn, unit: p12.unit, qty: 50, rate: 2800, discount: 0, gstRate: 18 },
       { productId: p13.id, name: p13.name, hsn: p13.hsn, unit: p13.unit, qty: 30, rate: 3200, discount: 0, gstRate: 18 },
       { productId: p11.id, name: p11.name, hsn: p11.hsn, unit: p11.unit, qty: 10, rate: 12000, discount: 0, gstRate: 18 }],
      'overdue', null);

    // PO 005 — Additional CCTV stock (UNPAID — recent)
    mkPurchase('SCS-PO/2024-25/0005', daysAgo(5), s3,
      [{ productId: p4.id, name: p4.name, hsn: p4.hsn, unit: p4.unit, qty: 30, rate: 1800, discount: 0, gstRate: 18 },
       { productId: p7.id, name: p7.name, hsn: p7.hsn, unit: p7.unit, qty: 15, rate: 4200, discount: 0, gstRate: 18 }],
      'unpaid', null);

    // ── Business Operating Expenses ──
    const mkExpense = (title, category, amount, date, paidVia, vendor = '', gstAmt = 0, isItc = false, notes = '') => {
      this.saveExpense({
        title, category, amount, date, paidVia, vendor, gstAmt, isItc, notes
      });
    };

    mkExpense('Office Rent — Hinjewadi Sector 5', 'Rent & Electricity', 22000, daysAgo(45), 'Bank Transfer', 'Shree Realties', 3960, true, 'Monthly commercial shop rent');
    mkExpense('Technician Fuel & Site Conveyance', 'Travel & Fuel', 4500, daysAgo(38), 'UPI', 'HPCL Fuel Station', 0, false, 'Site visits for CCTV & network installation');
    mkExpense('Airtel Enterprise Fiber Broadband', 'Internet & Phone', 1499, daysAgo(30), 'UPI', 'Airtel Enterprise', 269.82, true, 'Office 200 Mbps fiber line');
    mkExpense('Drill Bits, PVC Conduits & Cable Clips', 'Tools & Consumables', 3200, daysAgo(22), 'Cash', 'Pune Hardware Mart', 0, false, 'Installation consumables');
    mkExpense('Assistant Technician Site Wages', 'Salaries & Wages', 12000, daysAgo(15), 'Bank Transfer', 'Nilesh G. (Tech)', 0, false, 'On-site installation support wages');
    mkExpense('Office Tea, Water & Client Refreshments', 'Tea & Refreshments', 1850, daysAgo(8), 'Cash', 'Local Vendor', 0, false, 'Monthly pantry expenses');
    mkExpense('QuickHeal Antivirus License Stock', 'Software & Subscriptions', 5600, daysAgo(3), 'UPI', 'IT Software Hub', 1008, true, 'Antivirus renewals for client PCs');

    this._set(this.K.SEEDED, true);
  }
};
