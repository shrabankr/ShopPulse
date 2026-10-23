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
const APP_VERSION = '1.3.0';

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

function calcWarrantyExpiry(startDateStr, warrantyStr) {
  if (!startDateStr || !warrantyStr) return null;
  const start = new Date(startDateStr);
  if (isNaN(start.getTime())) return null;

  const w = (warrantyStr || '').toLowerCase().trim();
  let monthsToAdd = 0;
  let daysToAdd = 0;

  if (w.includes('year') || w.includes('yr')) {
    const num = parseFloat(w) || 1;
    monthsToAdd = Math.round(num * 12);
  } else if (w.includes('month') || w.includes('mo')) {
    const num = parseFloat(w) || 1;
    monthsToAdd = Math.round(num);
  } else if (w.includes('day')) {
    const num = parseFloat(w) || 7;
    daysToAdd = Math.round(num);
  } else if (w.includes('lifetime')) {
    monthsToAdd = 120; // 10 years
  } else {
    const num = parseFloat(w);
    if (!isNaN(num) && num > 0) monthsToAdd = Math.round(num * 12);
  }

  const expiry = new Date(start);
  if (monthsToAdd > 0) {
    expiry.setMonth(expiry.getMonth() + monthsToAdd);
  }
  if (daysToAdd > 0) {
    expiry.setDate(expiry.getDate() + daysToAdd);
  }
  return expiry.toISOString().split('T')[0];
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

function genUPIQrDataUrl(text, cellSize = 3) {
  if (!text) return '';
  try {
    if (typeof qrcode === 'function') {
      const qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      return qr.createDataURL(cellSize, 0);
    }
  } catch (e) {
    console.warn('Offline QR generator fallback:', e);
  }
  return `https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=0&data=${encodeURIComponent(text)}`;
}

/* ─────────────────────────────────────────────
   GST Calculation Engine
───────────────────────────────────────────── */
function calcTotals(items, sellerStateCode, buyerStateCode, shippingCharges = 0, shippingGstRate = 0) {
  const isIntra = sellerStateCode === buyerStateCode;
  let itemsSubtotal = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0;

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

    itemsSubtotal += taxable;
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

  itemsSubtotal = Math.round(itemsSubtotal * 100) / 100;
  const shipAmt = Math.max(0, parseFloat(shippingCharges) || 0);
  const shipGst = Math.max(0, parseFloat(shippingGstRate) || 0);

  const shipCgst = isIntra && shipAmt > 0 ? Math.round(shipAmt * shipGst / 2 / 100 * 100) / 100 : 0;
  const shipSgst = isIntra && shipAmt > 0 ? Math.round(shipAmt * shipGst / 2 / 100 * 100) / 100 : 0;
  const shipIgst = !isIntra && shipAmt > 0 ? Math.round(shipAmt * shipGst / 100 * 100) / 100 : 0;
  const shipTax = Math.round((shipCgst + shipSgst + shipIgst) * 100) / 100;

  totalCgst = Math.round((totalCgst + shipCgst) * 100) / 100;
  totalSgst = Math.round((totalSgst + shipSgst) * 100) / 100;
  totalIgst = Math.round((totalIgst + shipIgst) * 100) / 100;

  const subtotal = Math.round((itemsSubtotal + shipAmt) * 100) / 100;
  const totalTax = Math.round((totalCgst + totalSgst + totalIgst) * 100) / 100;
  const total = Math.round((subtotal + totalTax) * 100) / 100;

  return {
    items: calcItems,
    itemsSubtotal,
    shippingCharges: shipAmt,
    shippingGstRate: shipGst,
    shippingTax: shipTax,
    shippingTotal: Math.round((shipAmt + shipTax) * 100) / 100,
    subtotal,
    totalCgst,
    totalSgst,
    totalIgst,
    totalTax,
    total,
    isIntra
  };
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

const RETURN_REASONS_SALES = [
  'Defective / Damaged Goods (RMA)',
  'Wrong Item Supplied',
  'Customer Exchange / Return',
  'Quality Issue / Performance Dissatisfaction',
  'Order Cancellation / Post-Sale Discount',
  'Excess Goods Returned',
  'Other Reason'
];

const RETURN_REASONS_PURCHASE = [
  'Defective / Faulty on Arrival (DOA)',
  'Damaged in Transit',
  'Wrong Item / Not as per PO Specification',
  'Quality Rejection / Testing Failed',
  'Vendor Recall / Warranty Claim',
  'Excess Quantity Supplied by Vendor',
  'Other Reason'
];

/* ─────────────────────────────────────────────
   Database Layer (localStorage)
───────────────────────────────────────────── */
const DB = {
  VERSION: APP_VERSION,
  K: {
    BIZ: 'sp_biz',
    CUSTOMERS: 'sp_customers',
    SUPPLIERS: 'sp_suppliers',
    PRODUCTS: 'sp_products',
    CATEGORIES: 'sp_categories',
    SALES: 'sp_sales',
    PURCHASES: 'sp_purchases',
    CREDIT_NOTES: 'sp_credit_notes',
    DEBIT_NOTES: 'sp_debit_notes',
    QUOTATIONS: 'sp_quotations',
    SERVICES: 'sp_service_jobs',
    BUNDLES: 'sp_bundles',
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
      name: 'AndroPCSoft Technologies', tagline: 'IT Solutions & CCTV Security Systems', logo: '', gstin: '27AABCA1234F1Z5', pan: 'AABCA1234F',
      address: 'Shop 104, Tech Arcade, Station Road', city: 'Pune', state: 'Maharashtra', stateCode: '27',
      pincode: '411001', phone: '+91 98000 12345', whatsapp: '+91 98000 12345', email: 'shraban@andropcsoft.com', website: 'www.andropcsoft.com',
      bankName: 'HDFC Bank', bankAccount: '50200012345678', bankIFSC: 'HDFC0000123', bankBranch: 'Station Road, Pune', upiId: 'shraban@okaxis',
      invoicePrefix: 'APS', invoiceCounter: 1, invoiceFormat: 'classic',
      billPrefix: 'PO', billCounter: 1,
      creditNotePrefix: 'CN', creditNoteCounter: 1,
      debitNotePrefix: 'DN', debitNoteCounter: 1,
      quotationPrefix: 'QTN', quotationCounter: 1,
      jobPrefix: 'JOB', jobCounter: 4,
      enableLoyalty: true, loyaltySpendRate: 100, loyaltyPointValue: 1, loyaltyMinRedeem: 10, referralBonusPoints: 50,
      defaultPaymentTerms: 30, signatory: 'Shraban Kumar Mahato', termsAndConditions: 'Goods once sold will not be taken back.\nWarranty as per manufacturer terms.\nInterest @18% p.a. will be charged on delayed payments.',
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

  /* Customer Loyalty & Referral Engine */
  adjustCustomerLoyalty(customerId, pointsDelta, type = 'manual', refDoc = '', note = '') {
    if (!customerId || !pointsDelta) return;
    const c = this.getCustomerById(customerId);
    if (!c) return;

    const curPoints = c.loyaltyPoints || 0;
    const newPoints = Math.max(0, curPoints + pointsDelta);
    c.loyaltyPoints = newPoints;

    const history = c.loyaltyHistory || [];
    history.unshift({
      id: genId('LP'),
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      type, // 'earned' | 'redeemed' | 'referral_bonus' | 'manual'
      points: pointsDelta,
      balanceAfter: newPoints,
      refDoc: refDoc || '',
      note: note || (pointsDelta > 0 ? `+${pointsDelta} pts added` : `${pointsDelta} pts deducted`)
    });
    if (history.length > 50) history.length = 50;
    c.loyaltyHistory = history;

    this.saveCustomer(c);
    return c;
  },

  grantReferralBonus(customerId, invoiceNo) {
    if (!customerId) return;
    const c = this.getCustomerById(customerId);
    if (!c || !c.referredBy || c._referralBonusGranted) return;

    const referrer = this.getCustomerById(c.referredBy);
    if (!referrer) return;

    const biz = this.getBiz();
    const bonus = parseInt(biz.referralBonusPoints, 10) || 50;

    this.adjustCustomerLoyalty(
      referrer.id,
      bonus,
      'referral_bonus',
      invoiceNo || '',
      `Referral Reward: ${c.name} made their first purchase!`
    );

    referrer.referralCount = (referrer.referralCount || 0) + 1;
    this.saveCustomer(referrer);

    c._referralBonusGranted = true;
    this.saveCustomer(c);
  },

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
  saveProductsBulk(items) {
    const list = this.getProducts();
    const map = new Map(list.map(p => [p.id, p]));
    const nameMap = new Map(list.map(p => [p.name.trim().toLowerCase(), p]));
    const skuMap = new Map(list.filter(p => p.sku).map(p => [p.sku.trim().toLowerCase(), p]));

    items.forEach(data => {
      let existing = null;
      if (data.id && map.has(data.id)) existing = map.get(data.id);
      else if (data.sku && skuMap.has(data.sku.trim().toLowerCase())) existing = skuMap.get(data.sku.trim().toLowerCase());
      else if (data.name && nameMap.has(data.name.trim().toLowerCase())) existing = nameMap.get(data.name.trim().toLowerCase());

      if (existing) {
        Object.assign(existing, data);
      } else {
        if (!data.id) data.id = genId('P');
        if (!data.createdAt) data.createdAt = new Date().toISOString();
        list.push(data);
        map.set(data.id, data);
        if (data.name) nameMap.set(data.name.trim().toLowerCase(), data);
        if (data.sku) skuMap.set(data.sku.trim().toLowerCase(), data);
      }
    });

    this._set(this.K.PRODUCTS, list);
    return list;
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
      const oldDoc = i > -1 ? list[i] : null;
      if (i > -1) list[i] = data; else list.push(data);
      this._set(this.K.SALES, list);

      // Transition from draft to finalized
      if (oldDoc && oldDoc.status === 'draft' && data.status !== 'draft' && data.customerId) {
        if (data.pointsRedeemed > 0 && !data._pointsRedeemedApplied) {
          this.adjustCustomerLoyalty(data.customerId, -data.pointsRedeemed, 'redeemed', data.invoiceNo, `Redeemed on Invoice #${data.invoiceNo}`);
          data._pointsRedeemedApplied = true;
        }
        if (data.pointsEarned > 0 && !data._pointsEarnedApplied) {
          this.adjustCustomerLoyalty(data.customerId, data.pointsEarned, 'earned', data.invoiceNo, `Earned on Invoice #${data.invoiceNo}`);
          data._pointsEarnedApplied = true;
        }
        this.grantReferralBonus(data.customerId, data.invoiceNo);
        list[i] = data;
        this._set(this.K.SALES, list);
      }
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

    // Apply loyalty points & referral bonus if finalized
    if (data.customerId && data.status !== 'draft') {
      if (data.pointsRedeemed > 0) {
        this.adjustCustomerLoyalty(data.customerId, -data.pointsRedeemed, 'redeemed', data.invoiceNo, `Redeemed on Invoice #${data.invoiceNo}`);
        data._pointsRedeemedApplied = true;
      }
      if (data.pointsEarned > 0) {
        this.adjustCustomerLoyalty(data.customerId, data.pointsEarned, 'earned', data.invoiceNo, `Earned on Invoice #${data.invoiceNo}`);
        data._pointsEarnedApplied = true;
      }
      this.grantReferralBonus(data.customerId, data.invoiceNo);
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

  /* ─── Credit Notes / Sales Returns (Customer Returns) ─── */
  getCreditNotes() { return this._get(this.K.CREDIT_NOTES) || []; },
  getCreditNoteById(id) { return this.getCreditNotes().find(n => n.id === id); },
  getDocCreditNotes(invoiceNo) {
    if (!invoiceNo) return [];
    return this.getCreditNotes().filter(cn => cn.originalInvoiceNo === invoiceNo);
  },
  saveCreditNote(data, isNew = true) {
    const list = this.getCreditNotes();
    if (!isNew) {
      const i = list.findIndex(n => n.id === data.id);
      if (i > -1) list[i] = data; else list.push(data);
      this._set(this.K.CREDIT_NOTES, list);
      return data;
    }
    data.id = genId('CN');
    data.createdAt = new Date().toISOString();
    // Restock returned inventory
    if (data.items) {
      data.items.forEach(item => {
        if (item.productId) {
          const qty = parseFloat(item.qty) || 0;
          this.adjustStock(item.productId, +qty);
          this._addMov({
            productId: item.productId,
            type: 'in',
            qty: qty,
            reference: data.noteNo,
            date: data.date,
            note: `Sales Return (CN): ${data.noteNo}${data.originalInvoiceNo ? ' for Inv #' + data.originalInvoiceNo : ''} — ${data.reason || 'Customer Return'}`
          });
        }
      });
    }
    list.push(data);
    this._set(this.K.CREDIT_NOTES, list);
    return data;
  },
  deleteCreditNote(id) {
    const note = this.getCreditNoteById(id);
    if (note && note.items) {
      // Revert restocked inventory
      note.items.forEach(item => {
        if (item.productId) {
          const qty = parseFloat(item.qty) || 0;
          this.adjustStock(item.productId, -qty);
          this._addMov({
            productId: item.productId,
            type: 'out',
            qty: qty,
            reference: 'CN-REVERT',
            date: new Date().toISOString().split('T')[0],
            note: `Reverted CN #${note.noteNo} deletion`
          });
        }
      });
    }
    this._set(this.K.CREDIT_NOTES, this.getCreditNotes().filter(n => n.id !== id));
  },
  nextCreditNoteNo() {
    const b = this.getBiz();
    const no = `${b.creditNotePrefix || 'CN'}/${getFY()}/${String(b.creditNoteCounter || 1).padStart(4, '0')}`;
    this.setBiz({ ...b, creditNoteCounter: (b.creditNoteCounter || 1) + 1 });
    return no;
  },

  /* ─── Debit Notes / Purchase Returns (Supplier Returns) ─── */
  getDebitNotes() { return this._get(this.K.DEBIT_NOTES) || []; },
  getDebitNoteById(id) { return this.getDebitNotes().find(n => n.id === id); },
  getDocDebitNotes(billNo) {
    if (!billNo) return [];
    return this.getDebitNotes().filter(dn => dn.originalBillNo === billNo);
  },
  saveDebitNote(data, isNew = true) {
    const list = this.getDebitNotes();
    if (!isNew) {
      const i = list.findIndex(n => n.id === data.id);
      if (i > -1) list[i] = data; else list.push(data);
      this._set(this.K.DEBIT_NOTES, list);
      return data;
    }
    data.id = genId('DN');
    data.createdAt = new Date().toISOString();
    // Reduce inventory as goods are returned to supplier
    if (data.items) {
      data.items.forEach(item => {
        if (item.productId) {
          const qty = parseFloat(item.qty) || 0;
          this.adjustStock(item.productId, -qty);
          this._addMov({
            productId: item.productId,
            type: 'out',
            qty: qty,
            reference: data.noteNo,
            date: data.date,
            note: `Purchase Return (DN): ${data.noteNo}${data.originalBillNo ? ' for Bill #' + data.originalBillNo : ''} — ${data.reason || 'Supplier Return'}`
          });
        }
      });
    }
    list.push(data);
    this._set(this.K.DEBIT_NOTES, list);
    return data;
  },
  deleteDebitNote(id) {
    const note = this.getDebitNoteById(id);
    if (note && note.items) {
      // Revert deducted inventory
      note.items.forEach(item => {
        if (item.productId) {
          const qty = parseFloat(item.qty) || 0;
          this.adjustStock(item.productId, +qty);
          this._addMov({
            productId: item.productId,
            type: 'in',
            qty: qty,
            reference: 'DN-REVERT',
            date: new Date().toISOString().split('T')[0],
            note: `Reverted DN #${note.noteNo} deletion`
          });
        }
      });
    }
    this._set(this.K.DEBIT_NOTES, this.getDebitNotes().filter(n => n.id !== id));
  },
  nextDebitNoteNo() {
    const b = this.getBiz();
    const no = `${b.debitNotePrefix || 'DN'}/${getFY()}/${String(b.debitNoteCounter || 1).padStart(4, '0')}`;
    this.setBiz({ ...b, debitNoteCounter: (b.debitNoteCounter || 1) + 1 });
    return no;
  },

  /* ─── Quotations & Estimates ─── */
  getQuotations() { return this._get(this.K.QUOTATIONS) || []; },
  getQuotationById(id) { return this.getQuotations().find(q => q.id === id); },
  saveQuotation(data, isNew = true) {
    const list = this.getQuotations();
    if (!isNew) {
      const i = list.findIndex(q => q.id === data.id);
      if (i > -1) list[i] = data; else list.unshift(data);
      this._set(this.K.QUOTATIONS, list);
      return data;
    }
    data.id = genId('QTN');
    data.createdAt = new Date().toISOString();
    // Quotations do not alter stock
    list.unshift(data);
    this._set(this.K.QUOTATIONS, list);
    return data;
  },
  deleteQuotation(id) {
    this._set(this.K.QUOTATIONS, this.getQuotations().filter(q => q.id !== id));
  },
  nextQuotationNo() {
    const b = this.getBiz();
    const no = `${b.quotationPrefix || 'QTN'}/${getFY()}/${String(b.quotationCounter || 1).padStart(4, '0')}`;
    this.setBiz({ ...b, quotationCounter: (b.quotationCounter || 1) + 1 });
    return no;
  },

  /* ─── Service Center & Repair Job Sheets ─── */
  getJobs() { return this._get(this.K.SERVICES) || []; },
  getJobById(id) { return this.getJobs().find(j => j.id === id); },
  saveJob(data, isNew = true) {
    const list = this.getJobs();
    if (!isNew) {
      const i = list.findIndex(j => j.id === data.id);
      data.updatedAt = new Date().toISOString();
      if (i > -1) list[i] = data; else list.unshift(data);
      this._set(this.K.SERVICES, list);
      return data;
    }
    data.id = genId('JOB');
    data.createdAt = new Date().toISOString();
    data.updatedAt = data.createdAt;
    list.unshift(data);
    this._set(this.K.SERVICES, list);
    return data;
  },
  deleteJob(id) {
    this._set(this.K.SERVICES, this.getJobs().filter(j => j.id !== id));
  },
  nextJobNo() {
    const b = this.getBiz();
    const no = `${b.jobPrefix || 'JOB'}/${getFY()}/${String(b.jobCounter || 1).padStart(4, '0')}`;
    this.setBiz({ ...b, jobCounter: (b.jobCounter || 1) + 1 });
    return no;
  },

  /* ─── Package Bundles & Custom PC Configurator ─── */
  getBundles() { return this._get(this.K.BUNDLES) || []; },
  getBundleById(id) { return this.getBundles().find(b => b.id === id); },
  saveBundle(data) {
    const list = this.getBundles();
    if (data.id) {
      const idx = list.findIndex(b => b.id === data.id);
      data.updatedAt = new Date().toISOString();
      if (idx > -1) list[idx] = { ...list[idx], ...data };
      else list.unshift(data);
    } else {
      data.id = genId('BDL');
      data.createdAt = new Date().toISOString();
      data.updatedAt = data.createdAt;
      list.unshift(data);
    }
    this._set(this.K.BUNDLES, list);
    return data;
  },
  deleteBundle(id) {
    this._set(this.K.BUNDLES, this.getBundles().filter(b => b.id !== id));
  },

  ensureConfiguratorSeed() {
    const prods = this.getProducts();
    const skuMap = new Map(prods.map(p => [(p.sku || '').toUpperCase(), p]));
    let addedCount = 0;

    const catalog = [
      // CPUs
      { name: 'Intel Core i3-12100 Processor (LGA1700, 3.3GHz, UHD 730)', sku: 'CPU-I3-12100', barcode: '890100200001', hsn: '8471', category: 'Processors', brand: 'Intel', socket: 'LGA1700', series: 'Core i3', tdp: 60, unit: 'Nos', purchasePrice: 6900, sellingPrice: 8200, dealerPrice: 7500, warranty: '3 Years', gstRate: 18, stock: 14, reorderLevel: 3 },
      { name: 'Intel Core i5-12400F Desktop Processor (LGA1700, 6 Cores)', sku: 'CPU-I5-12400F', barcode: '890100200002', hsn: '8471', category: 'Processors', brand: 'Intel', socket: 'LGA1700', series: 'Core i5', tdp: 65, unit: 'Nos', purchasePrice: 8400, sellingPrice: 9800, dealerPrice: 9100, warranty: '3 Years', gstRate: 18, stock: 12, reorderLevel: 3 },
      { name: 'Intel Core i5-13400 Desktop Processor (LGA1700, 10 Cores, UHD 730)', sku: 'CPU-I5-13400', barcode: '890100200003', hsn: '8471', category: 'Processors', brand: 'Intel', socket: 'LGA1700', series: 'Core i5', tdp: 65, unit: 'Nos', purchasePrice: 15800, sellingPrice: 18500, dealerPrice: 16900, warranty: '3 Years', gstRate: 18, stock: 8, reorderLevel: 2 },
      { name: 'Intel Core i7-14700 Desktop Processor (LGA1700, 20 Cores)', sku: 'CPU-I7-14700', barcode: '890100200004', hsn: '8471', category: 'Processors', brand: 'Intel', socket: 'LGA1700', series: 'Core i7', tdp: 65, unit: 'Nos', purchasePrice: 29500, sellingPrice: 34000, dealerPrice: 31500, warranty: '3 Years', gstRate: 18, stock: 5, reorderLevel: 2 },
      { name: 'AMD Ryzen 5 5600 Processor with Wraith Stealth Cooler (AM4)', sku: 'CPU-RYZ-5600', barcode: '890100200005', hsn: '8471', category: 'Processors', brand: 'AMD', socket: 'AM4', series: 'Ryzen 5', tdp: 65, unit: 'Nos', purchasePrice: 8900, sellingPrice: 10500, dealerPrice: 9600, warranty: '3 Years', gstRate: 18, stock: 10, reorderLevel: 2 },
      { name: 'AMD Ryzen 7 5700X Desktop Processor (AM4, 8 Cores 16 Threads)', sku: 'CPU-RYZ-5700X', barcode: '890100200006', hsn: '8471', category: 'Processors', brand: 'AMD', socket: 'AM4', series: 'Ryzen 7', tdp: 65, unit: 'Nos', purchasePrice: 14200, sellingPrice: 16500, dealerPrice: 15100, warranty: '3 Years', gstRate: 18, stock: 6, reorderLevel: 2 },
      { name: 'AMD Ryzen 5 7600 Processor (AM5, 6 Cores, Radeon Graphics)', sku: 'CPU-RYZ-7600', barcode: '890100200007', hsn: '8471', category: 'Processors', brand: 'AMD', socket: 'AM5', series: 'Ryzen 5', tdp: 65, unit: 'Nos', purchasePrice: 15600, sellingPrice: 18200, dealerPrice: 16800, warranty: '3 Years', gstRate: 18, stock: 7, reorderLevel: 2 },

      // Motherboards
      { name: 'ASRock H610M-H2/M.2 M-ATX Motherboard (LGA1700, DDR4)', sku: 'MB-ASR-H610', barcode: '890100200010', hsn: '8473', category: 'Motherboards', brand: 'ASROCK', socket: 'LGA1700', chipset: 'H610', memoryType: 'DDR4', unit: 'Nos', purchasePrice: 4750, sellingPrice: 5610, dealerPrice: 5100, warranty: '3 Years', gstRate: 18, stock: 15, reorderLevel: 3 },
      { name: 'ASRock B760M PG Lightning Motherboard (LGA1700, DDR5, PCIe 5.0)', sku: 'MB-ASR-B760', barcode: '890100200011', hsn: '8473', category: 'Motherboards', brand: 'ASROCK', socket: 'LGA1700', chipset: 'B760', memoryType: 'DDR5', unit: 'Nos', purchasePrice: 9100, sellingPrice: 10678, dealerPrice: 9800, warranty: '3 Years', gstRate: 18, stock: 9, reorderLevel: 2 },
      { name: 'Asus B760M-AYW WIFI DDR5 Motherboard (LGA1700, WiFi 6, 2.5G LAN)', sku: 'MB-ASU-B760', barcode: '890100200012', hsn: '8473', category: 'Motherboards', brand: 'ASUS', socket: 'LGA1700', chipset: 'B760', memoryType: 'DDR5', unit: 'Nos', purchasePrice: 8200, sellingPrice: 9491, dealerPrice: 8800, warranty: '3 Years', gstRate: 18, stock: 7, reorderLevel: 2 },
      { name: 'MSI PRO B760M-E DDR4 Motherboard (LGA1700, HDMI/VGA)', sku: 'MB-MSI-B760-D4', barcode: '890100200013', hsn: '8473', category: 'Motherboards', brand: 'MSI', socket: 'LGA1700', chipset: 'B760', memoryType: 'DDR4', unit: 'Nos', purchasePrice: 6100, sellingPrice: 7200, dealerPrice: 6600, warranty: '3 Years', gstRate: 18, stock: 11, reorderLevel: 2 },
      { name: 'Gigabyte B550M DS3H Motherboard (AM4, Dual M.2, DDR4)', sku: 'MB-GIG-B550', barcode: '890100200014', hsn: '8473', category: 'Motherboards', brand: 'GIGABYTE', socket: 'AM4', chipset: 'B550', memoryType: 'DDR4', unit: 'Nos', purchasePrice: 6600, sellingPrice: 7800, dealerPrice: 7100, warranty: '3 Years', gstRate: 18, stock: 8, reorderLevel: 2 },
      { name: 'MSI PRO A620M-E Motherboard (AM5, DDR5, mATX)', sku: 'MB-MSI-A620', barcode: '890100200015', hsn: '8473', category: 'Motherboards', brand: 'MSI', socket: 'AM5', chipset: 'A620', memoryType: 'DDR5', unit: 'Nos', purchasePrice: 5800, sellingPrice: 6900, dealerPrice: 6300, warranty: '3 Years', gstRate: 18, stock: 6, reorderLevel: 2 },

      // Memory (RAM)
      { name: 'Corsair Vengeance LPX 8GB DDR4 3200MHz RAM', sku: 'RAM-COR-8-D4', barcode: '890100200020', hsn: '8473', category: 'Memory (RAM)', brand: 'Corsair', memoryType: 'DDR4', unit: 'Nos', purchasePrice: 1450, sellingPrice: 1800, dealerPrice: 1600, warranty: 'Lifetime', gstRate: 18, stock: 25, reorderLevel: 5 },
      { name: 'Corsair Vengeance LPX 16GB DDR4 3200MHz RAM', sku: 'RAM-COR-16-D4', barcode: '890100200021', hsn: '8473', category: 'Memory (RAM)', brand: 'Corsair', memoryType: 'DDR4', unit: 'Nos', purchasePrice: 2600, sellingPrice: 3200, dealerPrice: 2850, warranty: 'Lifetime', gstRate: 18, stock: 35, reorderLevel: 5 },
      { name: 'Crucial 16GB DDR5 4800MHz Desktop Memory (UDIMM)', sku: 'RAM-CRU-16-D5', barcode: '890100200022', hsn: '8473', category: 'Memory (RAM)', brand: 'Crucial', memoryType: 'DDR5', unit: 'Nos', purchasePrice: 3100, sellingPrice: 3800, dealerPrice: 3400, warranty: 'Lifetime', gstRate: 18, stock: 18, reorderLevel: 3 },
      { name: 'G.Skill Ripjaws S5 32GB (2x16GB) DDR5 6000MHz RAM', sku: 'RAM-GSK-32-D5', barcode: '890100200023', hsn: '8473', category: 'Memory (RAM)', brand: 'G.Skill', memoryType: 'DDR5', unit: 'Kit', purchasePrice: 7400, sellingPrice: 8900, dealerPrice: 8100, warranty: 'Lifetime', gstRate: 18, stock: 8, reorderLevel: 2 },

      // Storage
      { name: 'Crucial P3 500GB PCIe M.2 2280 NVMe SSD (Up to 3500MB/s)', sku: 'SSD-CRU-P3-500', barcode: '890100200030', hsn: '8471', category: 'Solid State Drive (M.2 SSD)', brand: 'Crucial', unit: 'Nos', purchasePrice: 2350, sellingPrice: 2900, dealerPrice: 2600, warranty: '3 Years', gstRate: 18, stock: 22, reorderLevel: 4 },
      { name: 'Samsung 980 1TB PCIe 3.0 NVMe M.2 Internal SSD', sku: 'SSD-SAM-980-1TB', barcode: '890100200031', hsn: '8471', category: 'Solid State Drive (M.2 SSD)', brand: 'Samsung', unit: 'Nos', purchasePrice: 5100, sellingPrice: 6200, dealerPrice: 5600, warranty: '5 Years', gstRate: 18, stock: 14, reorderLevel: 3 },
      { name: 'Kingston A400 240GB 2.5" SATA III Internal SSD', sku: 'SSD-KNG-A400-240', barcode: '890100200032', hsn: '8471', category: 'Solid State Drive (SATA SSD)', brand: 'Kingston', unit: 'Nos', purchasePrice: 1250, sellingPrice: 1600, dealerPrice: 1400, warranty: '3 Years', gstRate: 18, stock: 20, reorderLevel: 4 },
      { name: 'Western Digital Blue 1TB 7200 RPM 3.5" Desktop Hard Drive', sku: 'HDD-WD-1TB-BLU', barcode: '890100200033', hsn: '8471', category: 'Hard Disk Drive (Internal HDD)', brand: 'Western Digital', unit: 'Nos', purchasePrice: 3100, sellingPrice: 3800, dealerPrice: 3400, warranty: '2 Years', gstRate: 18, stock: 16, reorderLevel: 3 },
      { name: 'Western Digital Purple 4TB Surveillance Hard Drive', sku: 'HDD-WD-4TB-PUR', barcode: '890100200034', hsn: '8471', category: 'Hard Disk Drive (Internal HDD)', brand: 'Western Digital', unit: 'Nos', purchasePrice: 6400, sellingPrice: 7800, dealerPrice: 7000, warranty: '3 Years', gstRate: 18, stock: 12, reorderLevel: 2 },

      // Graphics Cards
      { name: 'Asus Phoenix GeForce GTX 1650 4GB GDDR6 Graphics Card', sku: 'GPU-ASU-1650', barcode: '890100200040', hsn: '8473', category: 'Graphics Card (GPU/VGA)', brand: 'ASUS', tdp: 75, unit: 'Nos', purchasePrice: 9800, sellingPrice: 11500, dealerPrice: 10600, warranty: '3 Years', gstRate: 18, stock: 8, reorderLevel: 2 },
      { name: 'ZOTAC Gaming GeForce RTX 3060 Twin Edge 12GB GDDR6', sku: 'GPU-ZOT-3060', barcode: '890100200041', hsn: '8473', category: 'Graphics Card (GPU/VGA)', brand: 'Zotac', tdp: 170, unit: 'Nos', purchasePrice: 19500, sellingPrice: 22800, dealerPrice: 21000, warranty: '3 Years', gstRate: 18, stock: 6, reorderLevel: 2 },
      { name: 'MSI GeForce RTX 4060 Ventus 2X Black 8GB OC GDDR6', sku: 'GPU-MSI-4060', barcode: '890100200042', hsn: '8473', category: 'Graphics Card (GPU/VGA)', brand: 'MSI', tdp: 115, unit: 'Nos', purchasePrice: 23800, sellingPrice: 27500, dealerPrice: 25400, warranty: '3 Years', gstRate: 18, stock: 5, reorderLevel: 2 },

      // Power Supplies
      { name: 'Ant Esports VS450L 450W Continuous Power Supply', sku: 'PSU-ANT-450', barcode: '890100200050', hsn: '8504', category: 'Power Supply Unit (SMPS/PSU)', brand: 'Ant Esports', wattage: 450, unit: 'Nos', purchasePrice: 1200, sellingPrice: 1550, dealerPrice: 1350, warranty: '2 Years', gstRate: 18, stock: 20, reorderLevel: 4 },
      { name: 'Cooler Master MWE 550W 80 Plus Bronze V2 Power Supply', sku: 'PSU-CM-550', barcode: '890100200051', hsn: '8504', category: 'Power Supply Unit (SMPS/PSU)', brand: 'Cooler Master', wattage: 550, unit: 'Nos', purchasePrice: 3100, sellingPrice: 3800, dealerPrice: 3450, warranty: '5 Years', gstRate: 18, stock: 15, reorderLevel: 3 },
      { name: 'Corsair CV650 650 Watt 80 Plus Bronze Certified PSU', sku: 'PSU-COR-650', barcode: '890100200052', hsn: '8504', category: 'Power Supply Unit (SMPS/PSU)', brand: 'Corsair', wattage: 650, unit: 'Nos', purchasePrice: 3950, sellingPrice: 4800, dealerPrice: 4350, warranty: '3 Years', gstRate: 18, stock: 10, reorderLevel: 2 },

      // Cabinets & Coolers
      { name: 'Zebronics ZEB-FEEL Office Micro-ATX Cabinet with 450W SMPS', sku: 'CAB-ZEB-OFFICE', barcode: '890100200060', hsn: '8473', category: 'Cabinet / Case', brand: 'Zebronics', unit: 'Nos', purchasePrice: 1050, sellingPrice: 1350, dealerPrice: 1180, warranty: '1 Year', gstRate: 18, stock: 18, reorderLevel: 3 },
      { name: 'Ant Esports ICE-100 Auto RGB Mid-Tower Gaming Cabinet', sku: 'CAB-ANT-ICE100', barcode: '890100200061', hsn: '8473', category: 'Cabinet / Case', brand: 'Ant Esports', unit: 'Nos', purchasePrice: 2050, sellingPrice: 2600, dealerPrice: 2300, warranty: '1 Year', gstRate: 18, stock: 12, reorderLevel: 2 },
      { name: 'Deepcool AG400 ARGB Single-Tower 120mm CPU Air Cooler', sku: 'CLR-DPC-AG400', barcode: '890100200062', hsn: '8473', category: 'Cooling System (CPU Cooler)', brand: 'Deepcool', unit: 'Nos', purchasePrice: 1350, sellingPrice: 1750, dealerPrice: 1520, warranty: '1 Year', gstRate: 18, stock: 14, reorderLevel: 3 },
      { name: 'Intel / AMD Stock Air Cooler (Standard Box Pack)', sku: 'CLR-STK-BOX', barcode: '890100200063', hsn: '8473', category: 'Cooling System (CPU Cooler)', brand: 'Standard', unit: 'Nos', purchasePrice: 0, sellingPrice: 0, dealerPrice: 0, warranty: '3 Years', gstRate: 18, stock: 999, reorderLevel: 0 },

      // Peripherals
      { name: 'Dell 24" SE2422H Full HD 75Hz ComfortView Monitor', sku: 'MON-DEL-24', barcode: '890100200070', hsn: '8528', category: 'Monitor (Display)', brand: 'Dell', unit: 'Nos', purchasePrice: 6400, sellingPrice: 7800, dealerPrice: 7000, warranty: '3 Years', gstRate: 18, stock: 10, reorderLevel: 2 },
      { name: 'Logitech MK215 Wireless Keyboard and Mouse Combo', sku: 'KBD-LOG-MK215', barcode: '890100200071', hsn: '8471', category: 'Keyboard & Mouse', brand: 'Logitech', unit: 'Set', purchasePrice: 980, sellingPrice: 1250, dealerPrice: 1100, warranty: '1 Year', gstRate: 18, stock: 25, reorderLevel: 5 },

      // CCTV Components
      { name: 'CP PLUS 2.4MP Cosmic HD Dome Camera (20m IR, Plastic Body)', sku: 'CCTV-CP-DOM', barcode: '890100200080', hsn: '8525', category: 'CCTV', brand: 'CP PLUS', unit: 'Nos', purchasePrice: 850, sellingPrice: 1100, dealerPrice: 950, warranty: '2 Years', gstRate: 18, stock: 40, reorderLevel: 10 },
      { name: 'CP PLUS 2.4MP Cosmic HD Bullet Camera (20m IR, Weatherproof)', sku: 'CCTV-CP-BUL', barcode: '890100200081', hsn: '8525', category: 'CCTV', brand: 'CP PLUS', unit: 'Nos', purchasePrice: 980, sellingPrice: 1250, dealerPrice: 1100, warranty: '2 Years', gstRate: 18, stock: 35, reorderLevel: 10 },
      { name: 'Hikvision 4-Channel HD 1080p Turbo HD DVR (AcuSense, 1 SATA)', sku: 'CCTV-HK-DVR4', barcode: '890100200082', hsn: '8521', category: 'CCTV', brand: 'Hikvision', unit: 'Nos', purchasePrice: 2200, sellingPrice: 2900, dealerPrice: 2500, warranty: '2 Years', gstRate: 18, stock: 12, reorderLevel: 3 },
      { name: 'ERD 4-Channel 12V 5A CCTV SMPS Power Supply', sku: 'CCTV-PSU-4CH', barcode: '890100200083', hsn: '8504', category: 'CCTV Accessories', brand: 'ERD', unit: 'Nos', purchasePrice: 480, sellingPrice: 650, dealerPrice: 550, warranty: '1 Year', gstRate: 18, stock: 25, reorderLevel: 5 },
      { name: 'BNC & DC Heavy Brass Connectors Set (4 Pairs)', sku: 'CCTV-BNC-DC', barcode: '890100200084', hsn: '8536', category: 'CCTV Accessories', brand: 'D-Link', unit: 'Pack', purchasePrice: 110, sellingPrice: 180, dealerPrice: 140, warranty: 'Testing Warranty', gstRate: 18, stock: 50, reorderLevel: 10 },
      { name: '4U CCTV DVR / NVR Wall Mount Metal Rack with Lock & Glass Door', sku: 'CCTV-RCK-4U', barcode: '890100200085', hsn: '8529', category: 'CCTV Accessories', brand: 'SecureEye', unit: 'Nos', purchasePrice: 1050, sellingPrice: 1450, dealerPrice: 1250, warranty: '1 Year', gstRate: 18, stock: 15, reorderLevel: 3 }
    ];

    catalog.forEach(item => {
      const existing = skuMap.get((item.sku || '').toUpperCase());
      if (!existing) {
        this.saveProduct(item);
        addedCount++;
      }
    });

    // Ensure Categories
    const categories = this.getCategories();
    const newCats = ['Processors', 'Motherboards', 'Memory (RAM)', 'Solid State Drive (M.2 SSD)', 'Solid State Drive (SATA SSD)', 'Hard Disk Drive (Internal HDD)', 'Graphics Card (GPU/VGA)', 'Power Supply Unit (SMPS/PSU)', 'Cabinet / Case', 'Cooling System (CPU Cooler)', 'Monitor (Display)', 'Keyboard & Mouse', 'CCTV Accessories'];
    const mergedCats = Array.from(new Set([...categories, ...newCats]));
    if (mergedCats.length > categories.length) {
      this.saveCategories(mergedCats);
    }

    // Ensure Default Bundle Templates if none exist
    if (this.getBundles().length === 0) {
      const allProds = this.getProducts();
      const findP = (sku) => allProds.find(p => p.sku === sku);

      // 1. Office PC
      const pCpuOffice = findP('CPU-I3-12100');
      const pMbOffice  = findP('MB-ASR-H610');
      const pRamOffice = findP('RAM-COR-8-D4');
      const pSsdOffice = findP('SSD-CRU-P3-500');
      const pCabOffice = findP('CAB-ZEB-OFFICE');
      const pMonOffice = findP('MON-DEL-24');
      const pKbdOffice = findP('KBD-LOG-MK215');

      const officeItems = [];
      [
        { p: pCpuOffice, qty: 1 },
        { p: pMbOffice, qty: 1 },
        { p: pRamOffice, qty: 1 },
        { p: pSsdOffice, qty: 1 },
        { p: pCabOffice, qty: 1 },
        { p: pMonOffice, qty: 1 },
        { p: pKbdOffice, qty: 1 }
      ].forEach(({ p, qty }) => {
        if (p) {
          officeItems.push({
            productId: p.id,
            name: p.name,
            sku: p.sku,
            hsn: p.hsn,
            unit: p.unit || 'Nos',
            qty,
            rate: p.sellingPrice,
            discount: 0,
            gstRate: p.gstRate || 18,
            warranty: p.warranty || '1 Year'
          });
        }
      });

      if (officeItems.length > 0) {
        this.saveBundle({
          name: 'Intel Core i3 12th Gen Office Desktop Kit',
          type: 'pc',
          description: 'Standard office & accounting workstation. 12th Gen Core i3, H610 Motherboard, 8GB DDR4, 500GB NVMe SSD, 24" Dell Monitor & Wireless Combo.',
          estimatedWattage: 180,
          items: officeItems
        });
      }

      // 2. Gaming PC
      const pCpuGame = findP('CPU-I5-12400F');
      const pMbGame  = findP('MB-MSI-B760-D4');
      const pClrGame = findP('CLR-DPC-AG400');
      const pRamGame = findP('RAM-COR-16-D4');
      const pSsdGame = findP('SSD-SAM-980-1TB');
      const pGpuGame = findP('GPU-MSI-4060');
      const pCabGame = findP('CAB-ANT-ICE100');
      const pPsuGame = findP('PSU-CM-550');

      const gameItems = [];
      [
        { p: pCpuGame, qty: 1 },
        { p: pClrGame, qty: 1 },
        { p: pMbGame, qty: 1 },
        { p: pRamGame, qty: 1 },
        { p: pSsdGame, qty: 1 },
        { p: pGpuGame, qty: 1 },
        { p: pCabGame, qty: 1 },
        { p: pPsuGame, qty: 1 }
      ].forEach(({ p, qty }) => {
        if (p) {
          gameItems.push({
            productId: p.id,
            name: p.name,
            sku: p.sku,
            hsn: p.hsn,
            unit: p.unit || 'Nos',
            qty,
            rate: p.sellingPrice,
            discount: 0,
            gstRate: p.gstRate || 18,
            warranty: p.warranty || '3 Years'
          });
        }
      });

      if (gameItems.length > 0) {
        this.saveBundle({
          name: 'Intel Core i5 & RTX 4060 Gaming Desktop Setup',
          type: 'pc',
          description: '1080p / 1440p High FPS Gaming Rig: Intel Core i5-12400F, MSI B760, RTX 4060 8GB, 16GB DDR4, 1TB NVMe SSD, 550W Bronze PSU.',
          estimatedWattage: 330,
          items: gameItems
        });
      }

      // 3. CCTV Setup
      const pCctvDvr  = findP('CCTV-HK-DVR4') || allProds.find(p => p.sku === 'HKV-DS-7608NI');
      const pCctvDom  = findP('CCTV-CP-DOM') || allProds.find(p => p.sku === 'HKV-DS-2CD2121');
      const pCctvBul  = findP('CCTV-CP-BUL') || allProds.find(p => p.sku === 'HKV-DS-2CD2T56');
      const pCctvHdd  = allProds.find(p => p.sku === 'SEG-SK2TB') || findP('HDD-WD-4TB-PUR');
      const pCctvPsu  = findP('CCTV-PSU-4CH');
      const pCctvWire = allProds.find(p => p.sku === 'CAT6-305M');
      const pCctvBnc  = findP('CCTV-BNC-DC');
      const pCctvRck  = findP('CCTV-RCK-4U');
      const pCctvInst = allProds.find(p => p.sku === 'SVC-INST-CCTV');

      const cctvItems = [];
      [
        { p: pCctvDvr, qty: 1 },
        { p: pCctvDom, qty: 2 },
        { p: pCctvBul, qty: 2 },
        { p: pCctvHdd, qty: 1 },
        { p: pCctvPsu, qty: 1 },
        { p: pCctvWire, qty: 1 },
        { p: pCctvBnc, qty: 1 },
        { p: pCctvRck, qty: 1 },
        { p: pCctvInst, qty: 1 }
      ].forEach(({ p, qty }) => {
        if (p) {
          cctvItems.push({
            productId: p.id,
            name: p.name,
            sku: p.sku,
            hsn: p.hsn,
            unit: p.unit || 'Nos',
            qty,
            rate: p.sellingPrice,
            discount: 0,
            gstRate: p.gstRate || 18,
            warranty: p.warranty || '2 Years'
          });
        }
      });

      if (cctvItems.length > 0) {
        this.saveBundle({
          name: 'Hikvision / CP PLUS 4-Camera HD CCTV Surveillance Package',
          type: 'cctv',
          description: 'Complete 4-Camera Surveillance Setup: 2 Indoor Domes, 2 Outdoor Bullet IP66, 4-Ch DVR, 2TB HDD, 4-Ch SMPS, Cable, Connectors, 4U Rack & Installation.',
          estimatedWattage: 65,
          items: cctvItems
        });
      }
    }
  },

  /* ─── Hardware Serial Number & Warranty Engine ─── */
  searchSerial(query) {
    if (!query || typeof query !== 'string') return [];
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const today = new Date().toISOString().split('T')[0];
    const results = [];

    // 1. Search Sales Invoices
    const sales = this.getSales();
    const purchases = this.getPurchases();

    sales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const serials = (item.serialNo || '').toLowerCase();
        if (serials && serials.includes(q)) {
          const expiryDate = calcWarrantyExpiry(sale.date, item.warranty);
          let isUnderWarranty = false;
          let daysLeft = 0;
          let statusText = 'No Warranty Specified';

          if (expiryDate) {
            daysLeft = daysBetween(expiryDate, today);
            isUnderWarranty = daysLeft >= 0;
            if (isUnderWarranty) {
              const years = Math.floor(daysLeft / 365);
              const remDays = daysLeft % 365;
              const months = Math.floor(remDays / 30);
              const durationText = years > 0 ? `${years}y ${months}m` : `${daysLeft} days`;
              statusText = `Active (${durationText} remaining)`;
            } else {
              const expiredAgo = Math.abs(daysLeft);
              statusText = `Expired (${expiredAgo} days ago)`;
            }
          }

          // Cross-reference purchase bill for distributor RMA
          let supplierInfo = null;
          const matchingPurchase = purchases.find(p =>
            (p.items || []).some(pi =>
              (pi.serialNo && pi.serialNo.toLowerCase().includes(q)) ||
              (item.productId && pi.productId === item.productId)
            )
          );

          if (matchingPurchase) {
            supplierInfo = {
              id: matchingPurchase.id,
              supplierName: matchingPurchase.supplierName,
              billNo: matchingPurchase.billNo,
              billDate: matchingPurchase.date,
              supplierPhone: matchingPurchase.supplierPhone || ''
            };
          }

          results.push({
            type: 'sale',
            docId: sale.id,
            docNo: sale.invoiceNo,
            docDate: sale.date,
            customerName: sale.customerName,
            customerPhone: sale.customerPhone || '',
            customerGstin: sale.customerGstin || '',
            productName: item.name,
            productId: item.productId,
            serialNo: item.serialNo,
            warranty: item.warranty || 'Standard',
            expiryDate,
            daysLeft,
            isUnderWarranty,
            statusText,
            supplierInfo
          });
        }
      });
    });

    // 2. Search Purchase Bills
    purchases.forEach(pur => {
      (pur.items || []).forEach(item => {
        const serials = (item.serialNo || '').toLowerCase();
        if (serials && serials.includes(q)) {
          // Avoid duplicate if already linked in sales
          const alreadyLinked = results.some(r => r.type === 'sale' && r.supplierInfo && r.supplierInfo.billNo === pur.billNo);
          if (!alreadyLinked) {
            results.push({
              type: 'purchase',
              docId: pur.id,
              docNo: pur.billNo,
              docDate: pur.date,
              supplierName: pur.supplierName,
              supplierPhone: pur.supplierPhone || '',
              productName: item.name,
              productId: item.productId,
              serialNo: item.serialNo,
              warranty: item.warranty || 'Standard',
              statusText: 'Inward / Supplier Purchase'
            });
          }
        }
      });
    });

    // 3. Search Service / Repair Job Sheets
    const jobs = this.getJobs();
    jobs.forEach(job => {
      const serials = (job.serialNo || '').toLowerCase();
      if (serials && serials.includes(q)) {
        results.push({
          type: 'service',
          docId: job.id,
          docNo: job.jobNo,
          docDate: job.date,
          customerName: job.customerName,
          customerPhone: job.customerPhone || '',
          productName: `${job.deviceType || 'Device'} — ${job.brandModel || 'Hardware'}`,
          serialNo: job.serialNo,
          warranty: 'Service Warranty (30 Days)',
          statusText: `Service Center: ${job.status.toUpperCase()}`,
          jobStatus: job.status,
          problemReported: job.problemReported
        });
      }
    });

    return results;
  },

  /* Payments & Multi-Split Management */
  getDocPayments(doc) {
    if (!doc) return [];
    if (Array.isArray(doc.payments) && doc.payments.length > 0) {
      return doc.payments;
    }
    // Backward compatibility for existing records
    if (doc.status === 'paid' && (doc.paidAmount || doc.total)) {
      return [{
        id: 'PAY-LEGACY-' + (doc.id || '1'),
        date: doc.paymentDate || doc.date || new Date().toISOString().split('T')[0],
        amount: parseFloat(doc.paidAmount || doc.total || 0),
        method: doc.paymentMethod || 'Cash',
        ref: doc.paymentRef || 'Settled',
        notes: ''
      }];
    }
    return [];
  },

  getDocPaidAmount(doc) {
    if (!doc) return 0;
    const payments = this.getDocPayments(doc);
    return payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  },

  getDocDueAmount(doc) {
    if (!doc) return 0;
    const total = parseFloat(doc.total) || 0;
    const paid = this.getDocPaidAmount(doc);
    let returnAdj = 0;
    if (doc.invoiceNo) {
      const cns = this.getDocCreditNotes(doc.invoiceNo);
      returnAdj = cns.filter(c => c.settlementAction === 'adjust_invoice').reduce((s, c) => s + (parseFloat(c.total) || 0), 0);
    } else if (doc.billNo) {
      const dns = this.getDocDebitNotes(doc.billNo);
      returnAdj = dns.filter(d => d.settlementAction === 'adjust_bill').reduce((s, d) => s + (parseFloat(d.total) || 0), 0);
    }
    return Math.max(0, parseFloat((total - paid - returnAdj).toFixed(2)));
  },

  getDocReturnAmount(doc) {
    if (!doc) return 0;
    if (doc.invoiceNo) {
      return this.getDocCreditNotes(doc.invoiceNo).reduce((s, c) => s + (parseFloat(c.total) || 0), 0);
    } else if (doc.billNo) {
      return this.getDocDebitNotes(doc.billNo).reduce((s, d) => s + (parseFloat(d.total) || 0), 0);
    }
    return 0;
  },

  addDocPayment(id, type, payment) {
    const isSales = type === 'sales';
    const doc = isSales ? this.getSaleById(id) : this.getPurchaseById(id);
    if (!doc) return null;

    const payments = [...this.getDocPayments(doc)];
    const newPayment = {
      id: payment.id || genId('PAY'),
      date: payment.date || new Date().toISOString().split('T')[0],
      amount: parseFloat(payment.amount) || 0,
      method: payment.method || 'Cash',
      ref: payment.ref || '',
      notes: payment.notes || '',
      createdAt: new Date().toISOString()
    };
    payments.push(newPayment);

    const paidAmount = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const total = parseFloat(doc.total) || 0;
    
    let status = 'unpaid';
    if (paidAmount >= total - 0.01) {
      status = 'paid';
    } else if (paidAmount > 0) {
      status = 'partial';
    }

    const updated = {
      ...doc,
      payments,
      paidAmount,
      status,
      paymentDate: newPayment.date,
      paymentMethod: newPayment.method,
      paymentRef: newPayment.ref
    };

    if (isSales) this.saveSale(updated, false); else this.savePurchase(updated, false);
    return updated;
  },

  updateDocPayment(id, type, paymentId, updatedPayment) {
    const isSales = type === 'sales';
    const doc = isSales ? this.getSaleById(id) : this.getPurchaseById(id);
    if (!doc) return null;

    let payments = [...this.getDocPayments(doc)];
    const idx = payments.findIndex(p => p.id === paymentId);
    if (idx > -1) {
      payments[idx] = {
        ...payments[idx],
        ...updatedPayment,
        amount: parseFloat(updatedPayment.amount) || payments[idx].amount
      };
    }

    const paidAmount = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const total = parseFloat(doc.total) || 0;
    
    let status = 'unpaid';
    if (paidAmount >= total - 0.01) {
      status = 'paid';
    } else if (paidAmount > 0) {
      status = 'partial';
    }

    const lastPay = payments[payments.length - 1];
    const updated = {
      ...doc,
      payments,
      paidAmount,
      status,
      paymentDate: lastPay?.date || doc.paymentDate || '',
      paymentMethod: lastPay?.method || doc.paymentMethod || '',
      paymentRef: lastPay?.ref || doc.paymentRef || ''
    };

    if (isSales) this.saveSale(updated, false); else this.savePurchase(updated, false);
    return updated;
  },

  deleteDocPayment(id, type, paymentId) {
    const isSales = type === 'sales';
    const doc = isSales ? this.getSaleById(id) : this.getPurchaseById(id);
    if (!doc) return null;

    let payments = this.getDocPayments(doc).filter(p => p.id !== paymentId);
    const paidAmount = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const total = parseFloat(doc.total) || 0;
    
    let status = 'unpaid';
    if (paidAmount >= total - 0.01) {
      status = 'paid';
    } else if (paidAmount > 0) {
      status = 'partial';
    }

    const lastPay = payments[payments.length - 1];
    const updated = {
      ...doc,
      payments,
      paidAmount,
      status,
      paymentDate: lastPay?.date || '',
      paymentMethod: lastPay?.method || '',
      paymentRef: lastPay?.ref || ''
    };

    if (isSales) this.saveSale(updated, false); else this.savePurchase(updated, false);
    return updated;
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
      lastAutoBackupDate: null,
      autoBackupEnabled: true,
      autoBackupRetentionDays: 7,
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

    // Immediately push updated commercial license status to Google Sheet
    setTimeout(() => {
      this.syncRemoteLicense().catch(() => {});
    }, 500);

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

  setCustomLicense(plan = 'annual', email = '', key = '', expiryDate = '') {
    const lic = this.getLicense();
    lic.plan = plan;
    if (email) lic.registeredEmail = email.toLowerCase().trim();
    if (key) lic.licenseKey = key.toUpperCase().trim();
    if (expiryDate) {
      lic.expiryDate = expiryDate;
    } else {
      if (plan === 'lifetime' || plan === 'developer') {
        lic.expiryDate = '2099-12-31';
      } else if (plan === 'annual') {
        lic.expiryDate = '2027-12-31';
      } else {
        const d = new Date();
        d.setDate(d.getDate() + 60);
        lic.expiryDate = d.toISOString().split('T')[0];
      }
    }
    lic.status = 'active';
    delete lic.blockReason;
    this.setLicense(lic);

    // Sync updated license immediately to Google Sheet
    setTimeout(() => {
      this.syncRemoteLicense().catch(() => {});
    }, 500);

    return lic;
  },

  getLicenseStatus() {
    const lic = this.getLicense();
    const now = new Date();
    const exp = new Date((lic.expiryDate || '2099-12-31') + 'T23:59:59');
    const diffDays = Math.ceil((exp - now) / 86400000);
    const isExpired = diffDays < 0;
    const isBlocked = lic.status === 'blocked';

    let planName = '60-Day Free Trial';
    if (lic.plan === 'annual') planName = '1-Year Commercial License';
    if (lic.plan === 'lifetime') planName = 'Lifetime Unlimited License';
    if (lic.plan === 'developer') planName = 'Developer Master License (Unlimited)';

    return {
      ...lic,
      daysLeft: Math.max(0, diffDays),
      isExpired,
      isBlocked,
      planName,
      isTrial: lic.plan === 'trial',
      isLifetime: lic.plan === 'lifetime' || lic.plan === 'developer',
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
    let cfg = this._get(this.K.REMOTE);
    const defaultUrl = 'https://script.google.com/macros/s/AKfycbylA3nb30UND6_QA5O_eAbXjBLjhUZeiylNn6qhOVurLYz_EQVzfa2VKgkEfHB60Mj_/exec';
    if (!cfg || !cfg.webhookUrl || cfg.webhookUrl.includes('AKfycbzPyugDKIdgwdbcq')) {
      cfg = {
        webhookUrl: defaultUrl,
        lastSyncDate: null,
        lastSyncStatus: null,
        autoSync: true
      };
      this.setRemoteConfig(cfg);
    }
    return cfg;
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
      licenseKey: lic.licenseKey || 'N/A',
      status: lic.status || 'active',
      expiryDate: lic.expiryDate || 'N/A',
      daysLeft: lic.daysLeft,
      salesCount: sales.length,
      purchasesCount: purchases.length,
      productsCount: products.length,
      partiesCount: customers.length + suppliers.length,
      totalSalesRevenue: parseFloat(totalSalesAmt).toFixed(2),
      version: APP_VERSION,
      timestamp: new Date().toISOString()
    };

    const qs = Object.keys(payload).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(payload[k])).join('&');
    const targetUrl = cfg.webhookUrl + (cfg.webhookUrl.includes('?') ? '&' : '?') + qs;

    try {
      const resp = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: { 'Accept': 'application/json' }
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
      const resp = await fetch(url, { 
        method: 'GET',
        redirect: 'follow',
        headers: { 'Accept': 'application/json' }
      });
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
        method: 'GET',
        redirect: 'follow',
        headers: { 'Accept': 'application/json' }
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
        version: APP_VERSION
      },
      exportedAt: new Date().toISOString(),
      businessName: biz.name,
      gstin: biz.gstin,
      stats: {
        salesCount: this.getSales().length,
        purchasesCount: this.getPurchases().length,
        quotationsCount: this.getQuotations().length,
        creditNotesCount: this.getCreditNotes().length,
        debitNotesCount: this.getDebitNotes().length,
        servicesCount: this.getJobs ? this.getJobs().length : 0,
        bundlesCount: this.getBundles ? this.getBundles().length : 0,
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
        quotations: this.getQuotations(),
        creditNotes: this.getCreditNotes(),
        debitNotes: this.getDebitNotes(),
        services: this.getJobs ? this.getJobs() : [],
        bundles: this.getBundles ? this.getBundles() : [],
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
    if (d.quotations) this._set(this.K.QUOTATIONS, d.quotations);
    if (d.creditNotes) this._set(this.K.CREDIT_NOTES, d.creditNotes);
    if (d.debitNotes) this._set(this.K.DEBIT_NOTES, d.debitNotes);
    if (d.services) this._set(this.K.SERVICES, d.services);
    if (d.bundles) this._set(this.K.BUNDLES, d.bundles);
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
      name: 'AndroPCSoft Technologies', tagline: 'IT Solutions & CCTV Security Systems', logo: '', gstin: '27AABCA1234F1Z5', pan: 'AABCA1234F',
      address: 'Shop 104, Tech Arcade, Station Road', city: 'Pune',
      state: 'Maharashtra', stateCode: '27', pincode: '411001',
      phone: '+91 98000 12345', whatsapp: '+91 98000 12345', email: 'shraban@andropcsoft.com',
      website: 'www.andropcsoft.com',
      bankName: 'HDFC Bank', bankAccount: '50200012345678',
      bankIFSC: 'HDFC0000123', bankBranch: 'Station Road, Pune',
      upiId: 'shraban@okaxis',
      invoicePrefix: 'APS', invoiceCounter: 9,
      billPrefix: 'PO', billCounter: 6,
      defaultPaymentTerms: 30, signatory: 'Shraban Kumar Mahato',
      termsAndConditions: 'All goods carry manufacturer warranty only. No returns after installation.\nAMC services are non-refundable once commenced.\nInterest @18% p.a. on delayed payments. Subject to local jurisdiction.',
    });

    // ── Customers (Businesses & Organisations) ──
    const c1 = this.saveCustomer({ name: 'Zenith Infotech Pvt Ltd', customerType: 'dealer', gstin: '27AABCZ9321K1Z4', phone: '9823001122', whatsapp: '9823001122', email: 'accounts@zenithinfotech.com', address: 'Plot 15, Rajiv Gandhi IT Park', city: 'Pune', state: 'Maharashtra', stateCode: '27', pincode: '411057', contactPerson: 'Suresh Patil' });
    const c2 = this.saveCustomer({ name: 'St. Xavier School & College', customerType: 'retail', gstin: '27AABTS4218M1ZQ', phone: '9823003344', whatsapp: '9823003344', email: 'admin@stxaviers.edu.in', address: '5, MG Road, Camp', city: 'Pune', state: 'Maharashtra', stateCode: '27', pincode: '411001', contactPerson: 'Fr. Thomas', loyaltyPoints: 150, referralCount: 1 });
    const c3 = this.saveCustomer({ name: 'City Hospital & Research Centre', customerType: 'retail', gstin: '27AABCC7123H1ZR', phone: '9823005566', whatsapp: '9823005566', email: 'accounts@cityhospital.in', address: '88 Nagar Road, Yerawada', city: 'Pune', state: 'Maharashtra', stateCode: '27', pincode: '411006', contactPerson: 'Mrs. Shinde', loyaltyPoints: 240 });
    const c4 = this.saveCustomer({ name: 'Nagpur Municipal Corporation', customerType: 'retail', gstin: '27AAANS8891P1ZX', phone: '0712-2567890', whatsapp: '9823007700', email: 'it.dept@nagpurcorp.gov.in', address: 'Mahapal Complex, Kasturchand Park', city: 'Nagpur', state: 'Maharashtra', stateCode: '27', pincode: '440001', contactPerson: 'Mr. Borse (IT Officer)' });
    const c5 = this.saveCustomer({ name: 'Alpha Manufacturing Ltd', customerType: 'retail', gstin: '24AABCA4512R1ZT', phone: '9712001234', whatsapp: '9712001234', email: 'it@alphamfg.com', address: 'GIDC Industrial Estate, Phase II', city: 'Surat', state: 'Gujarat', stateCode: '24', pincode: '394221', contactPerson: 'Rajesh Shah' });
    const c6 = this.saveCustomer({ name: 'Kohinoor Group of Hotels', customerType: 'retail', gstin: '27AABCK3312L1ZV', phone: '9823007788', whatsapp: '9823007788', email: 'finance@kohinoorhotels.com', address: '42 FC Road', city: 'Pune', state: 'Maharashtra', stateCode: '27', pincode: '411005', contactPerson: 'Deepa Kulkarni', loyaltyPoints: 80, referredBy: c2.id });

    // ── Suppliers (IT & CCTV Distributors) ──
    const s1 = this.saveSupplier({ name: 'Ingram Micro India Pvt Ltd', gstin: '27AAACI5892K1ZE', phone: '1800209800', email: 'orders@ingrammicro.in', address: 'Kalina, Santacruz East', city: 'Mumbai', state: 'Maharashtra', stateCode: '27', pincode: '400098' });
    const s2 = this.saveSupplier({ name: 'Rashi Peripherals Pvt Ltd', gstin: '27AAACP4561M1ZQ', phone: '022-66064606', email: 'sales@rptechindia.com', address: 'Mahindra Industrial Park, Kandivali', city: 'Mumbai', state: 'Maharashtra', stateCode: '27', pincode: '400067' });
    const s3 = this.saveSupplier({ name: 'Hikvision India Pvt Ltd', gstin: '29AABCH7823R1ZK', phone: '1800-103-3999', email: 'india@hikvision.com', address: 'Cessna Business Park, Kadubeesanahalli', city: 'Bengaluru', state: 'Karnataka', stateCode: '29', pincode: '560103' });
    const s4 = this.saveSupplier({ name: 'Redington India Ltd', gstin: '33AAACP4534Q1ZL', phone: '044-42243300', email: 'b2b@redington.co.in', address: 'SPL Guindy House, Mount Road', city: 'Chennai', state: 'Tamil Nadu', stateCode: '33', pincode: '600032' });

    // ── Products & Services ──
    // Computers & Laptops
    const p1  = this.saveProduct({ name: 'HP ProBook 450 G10 Laptop (i5/8GB/512GB)', sku: 'HP-PB450-G10', barcode: '890100100001', hsn: '8471', category: 'Laptops', unit: 'Nos', purchasePrice: 48000, sellingPrice: 56000, dealerPrice: 51500, warranty: '1 Year', gstRate: 18, stock: 12, reorderLevel: 3 });
    const p2  = this.saveProduct({ name: 'Dell OptiPlex 3000 Desktop PC', sku: 'DELL-OP3000', barcode: '890100100002', hsn: '8471', category: 'Desktops', unit: 'Nos', purchasePrice: 32000, sellingPrice: 38500, dealerPrice: 35500, warranty: '3 Years', gstRate: 18, stock: 8, reorderLevel: 2 });
    const p3  = this.saveProduct({ name: 'HP Color LaserJet Pro MFP', sku: 'HP-CLJ-MFP', barcode: '890100100003', hsn: '8443', category: 'Printers', unit: 'Nos', purchasePrice: 18000, sellingPrice: 22000, dealerPrice: 19800, warranty: '1 Year', gstRate: 18, stock: 5, reorderLevel: 2 });
    // CCTV & Surveillance
    const p4  = this.saveProduct({ name: 'Hikvision 2MP IP Dome Camera', sku: 'HKV-DS-2CD2121', barcode: '890100100004', hsn: '8525', category: 'CCTV', unit: 'Nos', purchasePrice: 1800, sellingPrice: 2800, dealerPrice: 2250, warranty: '2 Years', gstRate: 18, stock: 50, reorderLevel: 15 });
    const p5  = this.saveProduct({ name: 'Hikvision 5MP Bullet Camera (Outdoor)', sku: 'HKV-DS-2CD2T56', barcode: '890100100005', hsn: '8525', category: 'CCTV', unit: 'Nos', purchasePrice: 3200, sellingPrice: 4800, dealerPrice: 4100, warranty: '2 Years', gstRate: 18, stock: 30, reorderLevel: 10 });
    const p6  = this.saveProduct({ name: 'Hikvision 8-Ch NVR (4K, POE)', sku: 'HKV-DS-7608NI', barcode: '890100100006', hsn: '8521', category: 'CCTV', unit: 'Nos', purchasePrice: 8500, sellingPrice: 12500, dealerPrice: 10500, warranty: '2 Years', gstRate: 18, stock: 10, reorderLevel: 3 });
    const p7  = this.saveProduct({ name: '2TB Surveillance HDD (Seagate SkyHawk)', sku: 'SEG-SK2TB', barcode: '890100100007', hsn: '8471', category: 'Storage', unit: 'Nos', purchasePrice: 4200, sellingPrice: 5500, dealerPrice: 4800, warranty: '3 Years', gstRate: 18, stock: 20, reorderLevel: 5 });
    // Networking
    const p8  = this.saveProduct({ name: 'TP-Link 24-Port Gigabit Switch', sku: 'TP-TL-SG1024D', barcode: '890100100008', hsn: '8517', category: 'Networking', unit: 'Nos', purchasePrice: 5500, sellingPrice: 7200, dealerPrice: 6300, warranty: '3 Years', gstRate: 18, stock: 8, reorderLevel: 2 });
    const p9  = this.saveProduct({ name: 'Fortinet FortiGate Firewall 60F', sku: 'FTN-FG-60F', barcode: '890100100009', hsn: '8517', category: 'Networking', unit: 'Nos', purchasePrice: 28000, sellingPrice: 36000, dealerPrice: 31500, warranty: '1 Year', gstRate: 18, stock: 4, reorderLevel: 1 });
    const p10 = this.saveProduct({ name: 'CAT6 UTP Cable (305m Box)', sku: 'CAT6-305M', barcode: '890100100010', hsn: '8544', category: 'Networking', unit: 'Box', purchasePrice: 3200, sellingPrice: 4500, dealerPrice: 3800, warranty: 'Testing Warranty', gstRate: 18, stock: 15, reorderLevel: 4 });
    const p11 = this.saveProduct({ name: 'Vertiv 1KVA Online UPS', sku: 'VTV-UPS-1KVA', barcode: '890100100011', hsn: '8504', category: 'UPS & Power', unit: 'Nos', purchasePrice: 12000, sellingPrice: 15500, dealerPrice: 13800, warranty: '2 Years', gstRate: 18, stock: 6, reorderLevel: 2 });
    // Computer Parts
    const p12 = this.saveProduct({ name: 'Kingston 16GB DDR4 RAM (3200MHz)', sku: 'KNG-16GB-DDR4', barcode: '890100100012', hsn: '8473', category: 'Computer Parts', unit: 'Nos', purchasePrice: 2800, sellingPrice: 3800, dealerPrice: 3200, warranty: '3 Years', gstRate: 18, stock: 30, reorderLevel: 10 });
    const p13 = this.saveProduct({ name: 'Samsung 512GB SSD (SATA)', sku: 'SAM-SSD-512', barcode: '890100100013', hsn: '8471', category: 'Computer Parts', unit: 'Nos', purchasePrice: 3200, sellingPrice: 4500, dealerPrice: 3800, warranty: '3 Years', gstRate: 18, stock: 25, reorderLevel: 8 });
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
      [{ productId: p4.id, name: p4.name, hsn: p4.hsn, unit: p4.unit, qty: 16, rate: 2800, discount: 5, gstRate: 18, serialNo: 'HK-2MP-88391 to 88406', warranty: '2 Years' },
       { productId: p6.id, name: p6.name, hsn: p6.hsn, unit: p6.unit, qty: 2,  rate: 12500, discount: 0, gstRate: 18, serialNo: 'NVR-7608-8801, NVR-7608-8802', warranty: '2 Years' },
       { productId: p7.id, name: p7.name, hsn: p7.hsn, unit: p7.unit, qty: 2,  rate: 5500, discount: 0, gstRate: 18, serialNo: 'SEG-2TB-9911, SEG-2TB-9912', warranty: '3 Years' },
       { productId: p16.id, name: p16.name, hsn: p16.hsn, unit: p16.unit, qty: 2, rate: 5000, discount: 0, gstRate: 18, warranty: '1 Year Support' }],
      'paid', daysAgo(45), 'Bank Transfer', 'CCTV installation — Main building & Hostel block');

    // INV 002 — Laptops + networking for IT company (PAID)
    mkSale('SCS/2024-25/0002', daysAgo(50), c1,
      [{ productId: p1.id, name: p1.name, hsn: p1.hsn, unit: p1.unit, qty: 10, rate: 51500, discount: 0, gstRate: 18, serialNo: 'HP-PB450-SN001 to SN010', warranty: '1 Year' },
       { productId: p8.id, name: p8.name, hsn: p8.hsn, unit: p8.unit, qty: 1,  rate: 6300,  discount: 0, gstRate: 18, serialNo: 'TP-SG1024-55410', warranty: '3 Years' },
       { productId: p17.id, name: p17.name, hsn: p17.hsn, unit: p17.unit, qty: 1, rate: 4500, discount: 0, gstRate: 18, warranty: '30 Days Testing' }],
      'paid', daysAgo(35), 'NEFT', 'New office IT setup — Dealer Pricing');

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
      [{ productId: p4.id, name: p4.name, hsn: p4.hsn, unit: p4.unit, qty: 50, rate: 1800, discount: 2, gstRate: 18, serialNo: 'HK-2MP-88391 to 88440', warranty: '2 Years' },
       { productId: p5.id, name: p5.name, hsn: p5.hsn, unit: p5.unit, qty: 30, rate: 3200, discount: 2, gstRate: 18, warranty: '2 Years' },
       { productId: p6.id, name: p6.name, hsn: p6.hsn, unit: p6.unit, qty: 10, rate: 8500, discount: 0, gstRate: 18, serialNo: 'NVR-7608-8801, NVR-7608-8802', warranty: '2 Years' }],
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

    // ── Sample Returns (Credit Note & Debit Note) ──
    const biz = this.getBiz();
    const cnItems = [{ productId: p5.id, name: p5.name, hsn: p5.hsn, unit: p5.unit, qty: 1, rate: 4800, discount: 0, gstRate: 18 }];
    const cnTotals = calcTotals(cnItems, biz.stateCode, c3.stateCode || biz.stateCode);
    this.saveCreditNote({
      noteNo: 'CN/2024-25/0001',
      date: daysAgo(12),
      customerId: c3.id,
      customerName: c3.name,
      customerGstin: c3.gstin || '',
      customerAddress: `${c3.address || ''}, ${c3.city || ''}`,
      customerState: c3.state,
      customerStateCode: c3.stateCode,
      originalInvoiceNo: 'SCS/2024-25/0008',
      originalInvoiceDate: daysAgo(55),
      reason: 'Defective / Damaged Goods (RMA)',
      settlementAction: 'adjust_invoice',
      settlementNote: 'Adjusted against pending balance on invoice SCS/2024-25/0008',
      notes: 'Customer returned 1 defective camera unit for warranty credit',
      ...cnTotals
    }, true);

    const dnItems = [{ productId: p10.id, name: p10.name, hsn: p10.hsn, unit: p10.unit, qty: 2, rate: 3200, discount: 0, gstRate: 18 }];
    const dnTotals = calcTotals(dnItems, s2.stateCode || biz.stateCode, biz.stateCode);
    this.saveDebitNote({
      noteNo: 'DN/2024-25/0001',
      date: daysAgo(15),
      supplierId: s2.id,
      supplierName: s2.name,
      supplierGstin: s2.gstin || '',
      supplierAddress: `${s2.address || ''}, ${s2.city || ''}`,
      supplierState: s2.state,
      supplierStateCode: s2.stateCode,
      originalBillNo: 'SCS-PO/2024-25/0003',
      originalBillDate: daysAgo(20),
      reason: 'Defective / Faulty on Arrival (DOA)',
      settlementAction: 'adjust_bill',
      settlementNote: 'Deducted from payable balance on bill SCS-PO/2024-25/0003',
      notes: 'Returned 2 units faulty patch panels to Rashi Peripherals for replacement credit',
      ...dnTotals
    }, true);

    // ── Sample Quotations / Estimates ──
    const q1Items = [
      { productId: p5.id, name: p5.name, hsn: p5.hsn, unit: p5.unit, qty: 6, rate: 4800, discount: 5, gstRate: 18 },
      { productId: p6.id, name: p6.name, hsn: p6.hsn, unit: p6.unit, qty: 1, rate: 8500, discount: 0, gstRate: 18 },
      { productId: p7.id, name: p7.name, hsn: p7.hsn, unit: p7.unit, qty: 1, rate: 4200, discount: 0, gstRate: 18 },
      { productId: p9.id, name: p9.name, hsn: p9.hsn, unit: p9.unit, qty: 2, rate: 2200, discount: 0, gstRate: 18 }
    ];
    const q1Totals = calcTotals(q1Items, biz.stateCode, c1.stateCode || biz.stateCode);
    this.saveQuotation({
      quotationNo: 'QTN/2024-25/0001',
      date: daysAgo(5),
      validDays: 15,
      validUntil: daysAgo(-10),
      customerId: c1.id,
      customerName: c1.name,
      customerGstin: c1.gstin || '',
      customerAddress: `${c1.address || ''}, ${c1.city || ''}`,
      customerState: c1.state,
      customerStateCode: c1.stateCode,
      status: 'sent',
      deliveryMode: 'instore',
      shippingCharges: 0,
      notes: 'Quotation for 6-camera commercial surveillance setup with 8ch DVR and 2TB surveillance storage.\nValidity: 15 days from issue date.',
      ...q1Totals
    }, true);

    const q2Items = [
      { productId: p1.id, name: p1.name, hsn: p1.hsn, unit: p1.unit, qty: 2, rate: 46500, discount: 2, gstRate: 18 },
      { productId: p3.id, name: p3.name, hsn: p3.hsn, unit: p3.unit, qty: 1, rate: 16500, discount: 0, gstRate: 18 }
    ];
    const q2Totals = calcTotals(q2Items, biz.stateCode, c2.stateCode || biz.stateCode);
    this.saveQuotation({
      quotationNo: 'QTN/2024-25/0002',
      date: daysAgo(25),
      validDays: 30,
      validUntil: daysAgo(5),
      customerId: c2.id,
      customerName: c2.name,
      customerGstin: c2.gstin || '',
      customerAddress: `${c2.address || ''}, ${c2.city || ''}`,
      customerState: c2.state,
      customerStateCode: c2.stateCode,
      status: 'converted',
      convertedToInvoiceNo: 'SCS/2024-25/0005',
      convertedAt: daysAgo(20),
      deliveryMode: 'shipment',
      shippingCharges: 350,
      notes: 'Corporate office workstation quote. Converted to Invoice SCS/2024-25/0005.',
      ...q2Totals
    }, true);

    // ── Sample Service Center & Repair Job Sheets ──
    this.saveJob({
      jobNo: 'JOB/2024-25/0001',
      date: daysAgo(3),
      expectedDeliveryDate: daysAgo(-1),
      customerId: c1.id,
      customerName: c1.name,
      customerPhone: c1.phone || '9822014589',
      customerAddress: `${c1.address || ''}, ${c1.city || ''}`,
      deviceType: 'Laptop',
      brandModel: 'Dell Inspiron 15 3511',
      serialNo: 'CN-08K92-12903',
      passwordPin: 'Dell@2024',
      accessories: 'Original 65W Charger, Laptop Bag',
      physicalCondition: 'Minor scratches on back lid, screen intact',
      problemReported: 'No display on boot, power LED blinks 3 amber & 5 white. Needs urgent RAM/display diagnosis.',
      diagnosticsNotes: 'RAM socket cleaned, installed 8GB DDR4 module. Display working fine. Running 24hr burn-in test.',
      assignedTechnician: 'Amit (Senior Hardware Tech)',
      estimatedCost: 2800,
      advancePaid: 500,
      advancePaymentMethod: 'UPI',
      status: 'ready',
      finalCost: 2800,
      itemsUsed: [
        { name: 'Motherboard Display Rail Chip Repair', hsn: '998731', qty: 1, rate: 1200, gstRate: 18 },
        { productId: p7.id, name: 'Kingston 240GB 2.5 SATA SSD Upgrade', hsn: '8471', qty: 1, rate: 1600, gstRate: 18 }
      ],
      notes: 'Customer requested data backup before reinstalling Windows. Backup confirmed in safe drive.'
    }, true);

    this.saveJob({
      jobNo: 'JOB/2024-25/0002',
      date: daysAgo(7),
      expectedDeliveryDate: daysAgo(4),
      customerId: null,
      customerName: 'Rajesh Mehra',
      customerPhone: '9823456789',
      customerAddress: 'Kothrud, Pune',
      deviceType: 'CCTV DVR',
      brandModel: 'CP PLUS 8-Channel HD DVR (CP-UVR-0801E1)',
      serialNo: 'CP-UVR-0801E-7781',
      passwordPin: 'admin / blank',
      accessories: '12V Power Adapter, USB Mouse',
      physicalCondition: 'Dusty chassis, BNC port 3 loose',
      problemReported: 'Administrator password forgotten, channel 3 showing black screen video loss.',
      diagnosticsNotes: 'Board firmware reflashed with official CP Plus reset patch. Re-soldered loose BNC socket 3. All 8 channels recording ok.',
      assignedTechnician: 'Sandeep (CCTV Tech)',
      estimatedCost: 1200,
      advancePaid: 0,
      advancePaymentMethod: 'Cash',
      status: 'delivered',
      finalCost: 1200,
      convertedToInvoiceNo: 'SCS/2024-25/0007',
      deliveredAt: daysAgo(4),
      itemsUsed: [
        { name: 'DVR Firmware Reset & BNC Port Repair Service', hsn: '998714', qty: 1, rate: 1200, gstRate: 18 }
      ],
      notes: 'Handed over to customer with fresh admin credentials: admin / Pass@123'
    }, true);

    this.saveJob({
      jobNo: 'JOB/2024-25/0003',
      date: daysAgo(1),
      expectedDeliveryDate: daysAgo(-3),
      customerId: c3 ? c3.id : null,
      customerName: c3 ? c3.name : 'Vikram Malhotra',
      customerPhone: '9970112233',
      customerAddress: 'Hadapsar, Pune',
      deviceType: 'Desktop PC',
      brandModel: 'Custom Assembled Intel Core i5 Tower',
      serialNo: 'APC-PC-2023-4412',
      passwordPin: 'None',
      accessories: 'CPU Tower Cabinet Only (No cables)',
      physicalCondition: 'Front USB port cracked, cabinet side panel thumb screws missing',
      problemReported: 'PC restarting randomly under load, burning electronic smell from power supply fan.',
      diagnosticsNotes: 'SMPS secondary capacitor leaking. Tested with shop test bench PSU, motherboard and GPU boot normal. Waiting for replacement 550W Bronze PSU.',
      assignedTechnician: 'Amit (Senior Hardware Tech)',
      estimatedCost: 3600,
      advancePaid: 1000,
      advancePaymentMethod: 'UPI',
      status: 'waiting_parts',
      finalCost: 3600,
      itemsUsed: [
        { name: 'Cabinet Diagnostic & Assembly Labor', hsn: '998731', qty: 1, rate: 600, gstRate: 18 },
        { name: 'Cooler Master 550W 80+ Bronze Power Supply', hsn: '8504', qty: 1, rate: 3000, gstRate: 18 }
      ],
      notes: 'Ordered replacement PSU from Redington distributor. Expected arrival tomorrow morning.'
    }, true);

    this.ensureConfiguratorSeed();
    this._set(this.K.SEEDED, true);
  }
};
