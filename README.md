# ⚡ ShopPulse — GST Business Management System

> **All-in-one billing, inventory, CRM, and GST compliance app for Indian IT/CCTV service businesses.**  
> Built as a **vanilla HTML + CSS + JavaScript SPA** (Single Page Application) with **zero dependencies** except Chart.js.  
> All data stored in **browser localStorage** — no backend, no database, no server needed.

---

## 🧑‍💼 Business Context

**Who uses this:** A small Indian IT & CCTV business (computers, parts, CCTV cameras, networking equipment, and Annual Maintenance Contract services) that sells to other businesses and organisations (B2B).

**What it replaces:** Manual billing, Excel sheets, and paper invoices.

**Key compliance requirement:** Indian GST (Goods & Services Tax) — all invoices must be GST-compliant with HSN/SAC codes, CGST/SGST or IGST calculation, GSTIN of buyer and seller.

---

## 📁 Project Structure

```
ShopPulse/
│
├── index.html              ← App shell (SPA entry point)
│
├── css/
│   ├── index.css           ← Design system (tokens, layout, sidebar, print)
│   ├── components.css      ← Reusable UI (buttons, forms, tables, modals, toasts)
│   └── modules.css         ← Page-specific styles (billing, CCTV, AI, reports)
│
└── js/
    ├── data.js             ← ★ DATA LAYER (localStorage DB + GST engine + seed data)
    ├── app.js              ← ★ APP SHELL (router, dashboard, modal, toast, settings)
    ├── billing.js          ← Sales invoices, purchase bills, print, receivables/payables
    ├── inventory.js        ← Product catalog, stock tracking, adjustments
    ├── crm.js              ← Customers & suppliers management
    ├── expenses.js         ← Operating expenses, GST ITC tracking, category breakdown
    ├── reports.js          ← P&L, GSTR-1, GSTR-3B, HSN summary, CSV export
    └── ai.js               ← AI assistant (business insights, forecasting, reorder)
```

---

## 🔑 Key Files Explained

### `js/data.js` — The Brain
This is the most important file. It contains:

1. **`DB` object** — The entire data access layer
   - `DB.getSales()` / `DB.saveSale()` / `DB.deleteSale()`
   - `DB.getPurchases()` / `DB.savePurchase()` / `DB.deletePurchase()`
   - `DB.getExpenses()` / `DB.saveExpense()` / `DB.deleteExpense()`
   - `DB.getProducts()` / `DB.saveProduct()` / `DB.adjustStock()`
   - `DB.getCustomers()` / `DB.saveCustomer()`
   - `DB.getSuppliers()` / `DB.saveSupplier()`
   - `DB.getBiz()` / `DB.setBiz()` — Business profile (GSTIN, bank details, etc.)
   - `DB.nextInvoiceNo()` / `DB.nextBillNo()` — Auto-generates invoice numbers in format `TC/2024-25/0001`

2. **`calcTotals(items, sellerStateCode, buyerStateCode)`** — GST engine
   - If sellerState === buyerState → **CGST + SGST** (intra-state)
   - If sellerState !== buyerState → **IGST** (inter-state)
   - Returns: `{ items[], subtotal, totalCgst, totalSgst, totalIgst, totalTax, total, isIntra }`

3. **`DB.seed()`** — Pre-loads demo data on first run
   - Business: SysCare Computer Services, Pune, Maharashtra (GST state code: 27)
   - 6 customers (schools, hospitals, municipal corp, hotels, IT companies)
   - 4 suppliers (Ingram Micro, Rashi Peripherals, Hikvision, Redington)
   - 19 products (laptops, desktops, CCTV cameras, NVR, networking, UPS, RAM, SSD + AMC/service items)
   - 8 sales invoices + 5 purchase bills

4. **Global utility functions** (available everywhere):
   - `fmtCurrency(n)` → `₹1,23,456.00` (Indian number format)
   - `fmtDate(str)` → `15 Aug 2024`
   - `validateGSTIN(gstin)` → true/false (15-char alphanum check)
   - `numberToWords(n)` → "One Lakh Twenty Three Thousand..." (for invoice printing)
   - `genId(prefix)` → unique ID like `INV-a1b2c3`
   - `getFY()` → `"2024-25"` (Indian financial year)
   - `daysBetween(d1, d2)` → number of days

5. **Constants** (also in data.js):
   - `INDIAN_STATES` — All 37 states/UTs with GST state codes
   - `GST_RATES` — [0, 0.1, 0.25, 1, 1.5, 3, 5, 7.5, 12, 18, 28]
   - `UNITS` — ["Nos", "Pcs", "Box", "Job", "Visit", "Kg", "Ltr", "Mtr", "Set", "Pair", "Nos/Year", "System/Year"]
   - `PAYMENT_METHODS` — ["Bank Transfer", "NEFT", "RTGS", "UPI", "Cheque", "Cash", "Credit Card"]

---

### `js/app.js` — The Router
- `App.init()` → Seeds DB, builds sidebar, sets up hash-based routing
- `App.route('#dashboard')` → Switches views by URL hash
- Available routes: `#dashboard`, `#billing-sales`, `#billing-purchases`, `#receivables`, `#payables`, `#inventory`, `#customers`, `#suppliers`, `#reports`, `#gst`, `#ai`, `#settings`
- `App.modal(title, body, footer, size)` → Opens a modal dialog
- `App.closeModal()` → Closes modal
- `App.toast(msg, type)` → Shows a notification (type: success/error/warning/info)
- `App.renderDashboard()` → Renders KPI cards + revenue chart (Chart.js) + alerts

---

### `js/billing.js` — Invoicing
- `Billing.render(container, 'sales'|'purchases')` → Invoice list with filters
- `Billing.openNew('sales'|'purchases')` → Opens new invoice form
- `Billing.viewDoc(id, type)` → View invoice details in modal
- `Billing.markPaid(id, type)` → Record payment modal
- `Billing.printDoc(id, type)` → Opens a new browser window with a print-ready GST Tax Invoice
- `Billing.renderReceivables(container)` → Unpaid sales with aging analysis (0-30, 31-60, 60+ days)
- `Billing.renderPayables(container)` → Unpaid purchases with aging

**GST Invoice Form flow:**
1. Select customer → GSTIN, address, state auto-filled
2. Place of Supply auto-set to customer's state
3. Add line items → select from products or type custom
4. Product selected → rate, HSN, GST% auto-filled from inventory
5. `Billing._recalc()` → recalculates on every change (CGST+SGST or IGST based on states)
6. Save → auto-generates invoice number, stores in localStorage

---

### `js/inventory.js` — Stock Management
- `Inventory.render(container)` → Product list with category filters + KPI cards
- `Inventory.openForm(productId)` → Add/edit product modal
- `Inventory.adjustStock(productId)` → Add/subtract/set stock quantity
- Products have: `name, sku, hsn, category, unit, gstRate, purchasePrice, sellingPrice, stock, reorderLevel`
- **Services** (AMC, Installation, Repair) have `stock: 9999` and `reorderLevel: 0` — treated as unlimited

---

### `js/crm.js` — Customer/Supplier Management
- `CRM.render(container, 'customers'|'suppliers')` → Contact list with outstanding balance
- `CRM.openForm(type, contactId)` → Add/edit contact
- `CRM.viewContact(id, type)` → Full contact profile with transaction history
- GSTIN validated on save using `validateGSTIN()`
- Unregistered customers (B2C) have empty GSTIN — allowed

---

### `js/reports.js` — GST Returns & Analytics
- `Reports.render(container)` → P&L with monthly breakdown, top customers/products
- `Reports.renderGST(container)` → GST Returns page
  - **GSTR-3B** summary: Output tax, ITC, Net payable
  - **GSTR-1 B2B**: Registered buyer invoices (with GSTIN)
  - **GSTR-1 B2C**: Unregistered buyer invoices (B2CL > ₹2.5L inter-state, B2CS rest)
  - **HSN Summary**: Quantity and tax per HSN/SAC code
- `Reports.exportCSV()` → Download sales report as CSV
- `Reports.exportGSTR1B2B(month)` → Download B2B invoices as CSV
- `Reports.exportHSN(month)` → Download HSN summary as CSV

---

### `js/ai.js` — AI Business Assistant
> This is **rule-based AI** (no external AI API) — uses localStorage data to generate insights.

- `AI.render(container)` → Shows 6 feature cards + reorder alert table + chat box
- **Features:**
  - `_businessSummary()` → Health score (0-100) + financial overview
  - `_revenueForecast()` → 6-month trend + next month prediction
  - `_reorderAnalysis()` → Items below reorder level + suggested order qty
  - `_gstCheck()` → Missing GSTINs, invalid HSN, filing reminders
  - `_topPerformers()` → Top 3 customers + top 3 products
  - `_billGenGuide()` → Step-by-step invoice creation guide
- `_processQuery(text)` → Keyword-based chat responses (no external API needed)

---

## 🇮🇳 GST Compliance Details

| Concept | Implementation |
|---|---|
| **GSTIN format** | 15-char: `27AABCT5432R1ZP` (state+pan+entity+checksum) |
| **HSN codes** | Mandatory on all products (4-8 digit for goods) |
| **SAC codes** | Services use 6-digit SAC: `998314` (AMC), `998714` (CCTV install), `998313` (network setup), `998731` (repair) |
| **Intra-state** | seller state == buyer state → CGST (half) + SGST (half) |
| **Inter-state** | seller state != buyer state → IGST (full rate) |
| **Place of Supply** | Defaults to buyer's state, user can override |
| **Reverse Charge** | Toggle on invoice (printed on invoice as required) |
| **B2B** | Customer has GSTIN — appears in GSTR-1 B2B |
| **B2CS** | Customer has no GSTIN, intra-state or inter-state ≤₹2.5L |
| **B2CL** | Customer has no GSTIN, inter-state > ₹2.5L |
| **Invoice number** | `TC/2024-25/0001` format (prefix/FY/serial) |
| **Amount in words** | Indian format (Lakh, Crore) printed on invoice |

---

## 💾 Data Storage (localStorage Keys)

```
sp_biz          → Business profile object
sp_sales        → Array of sale invoice objects
sp_purchases    → Array of purchase bill objects
sp_products     → Array of product objects
sp_customers    → Array of customer objects
sp_suppliers    → Array of supplier objects
sp_categories   → Array of category name strings
sp_movements    → Array of stock movement records
sp_seeded       → Boolean flag (prevents re-seeding)
```

**To reset all data:** `localStorage.clear(); location.reload()`

---

## 📄 Invoice Object Structure

```js
{
  id: "INV-a1b2c3",
  invoiceNo: "TC/2024-25/0001",
  date: "2024-08-01",
  dueDate: "2024-08-31",
  customerId: "CUST-xyz",
  customerName: "St. Xavier School",
  customerGstin: "27AABTS4218M1ZQ",
  customerAddress: "5, MG Road, Pune - 411001",
  customerState: "Maharashtra",
  customerStateCode: "27",
  placeOfSupply: "27",
  sellerStateCode: "27",
  reverseCharge: false,
  items: [
    {
      productId: "PROD-abc",
      name: "Hikvision 2MP IP Dome Camera",
      hsn: "8525",
      unit: "Nos",
      qty: 16,
      rate: 2800,
      discount: 5,           // percentage
      gstRate: 18,
      taxableValue: 42560,   // after discount
      cgstRate: 9, cgstAmt: 3830.40,
      sgstRate: 9, sgstAmt: 3830.40,
      igstRate: 0, igstAmt: 0,
      totalAmt: 50220.80
    }
  ],
  subtotal: 42560,           // sum of taxableValue
  totalCgst: 3830.40,
  totalSgst: 3830.40,
  totalIgst: 0,
  totalTax: 7660.80,
  total: 50220.80,           // grand total
  isIntra: true,             // true = CGST+SGST, false = IGST
  notes: "CCTV installation — Main building",
  status: "paid",            // draft | sent | unpaid | paid | overdue
  paymentDate: "2024-08-16",
  paymentMethod: "Bank Transfer",
  createdAt: "2024-08-01T10:00:00.000Z"
}
```

---

## 🛒 Product Object Structure

```js
{
  id: "PROD-abc123",
  name: "Hikvision 2MP IP Dome Camera",
  sku: "HKV-DS-2CD2121",
  hsn: "8525",              // HSN for goods / SAC for services
  category: "CCTV",
  unit: "Nos",
  gstRate: 18,              // GST % (0/5/12/18/28)
  purchasePrice: 1800,      // excl. GST
  sellingPrice: 2800,       // excl. GST
  stock: 50,
  reorderLevel: 15,         // alert when stock <= this
  description: ""
}
```

---

## 🔮 Future SaaS Migration Plan

When scaling to multi-shop SaaS:

1. **Frontend:** Migrate to **Next.js** (App Router)
2. **Backend:** **Node.js + Express** or **Supabase**
3. **Database:** **PostgreSQL** — add `shop_id` column to every table
4. **Auth:** **Clerk** or **Supabase Auth**
5. **Billing:** **Razorpay Subscriptions** (INR)
6. **New features:** Email invoices, WhatsApp reminders, GST e-invoicing (IRN), Tally export
7. **Pricing:** Free (50 inv/mo) → Starter ₹499 → Pro ₹1,499 → Enterprise custom

**Current localStorage keys map directly to PostgreSQL tables:**
```
sp_sales      → invoices     (+ shop_id)
sp_purchases  → bills        (+ shop_id)
sp_products   → products     (+ shop_id)
sp_customers  → contacts     (+ shop_id, type='customer')
sp_suppliers  → contacts     (+ shop_id, type='supplier')
sp_biz        → shops        (one row per tenant)
```

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Language | Vanilla JavaScript (ES6+, strict mode) |
| Styling | Vanilla CSS with CSS custom properties (variables) |
| Charts | Chart.js 4.4.3 (CDN) |
| Icons | Google Material Icons (CDN) |
| Fonts | Google Fonts — Inter |
| Storage | Browser localStorage (JSON serialized) |
| Routing | URL hash-based (`#dashboard`, `#billing-sales`, etc.) |
| Printing | Opens new browser tab with full HTML invoice for native print |
| Hosting | Any static file server (or just open index.html directly) |

---

## 🚀 How to Run

**Option A — Direct (simplest):**
```
Double-click index.html in File Explorer
```

**Option B — Local server (recommended for Chrome):**
```bash
# Using Python
python -m http.server 3000

# Using Node.js
npx serve .
```
Then open: `http://localhost:3000`

**First run:** Demo data auto-loads (SysCare Computer Services, Pune — IT/CCTV business)

**Reset data:** Open browser console (F12) → `localStorage.clear(); location.reload()`

---

## ✅ Checklist Before Going Live

- [ ] Go to **Settings** → Enter your real business name
- [ ] Enter your actual **GSTIN** (15 characters)
- [ ] Set your **Bank Account details** (shown on printed invoices)
- [ ] Go to **Inventory** → Delete demo products → Add your real products with HSN codes
- [ ] Go to **Customers** → Delete demo customers → Add real clients
- [ ] Go to **Suppliers** → Add your vendors
- [ ] Create your first real **Sales Invoice** and print it
