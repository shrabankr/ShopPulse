# AGENTS.md — ShopPulse AI Coding Instructions

> This file tells AI coding agents (Antigravity, Cursor, Codex, Claude, etc.)
> how to understand, modify, and extend this codebase correctly.

---

## Project Identity

- **Name:** ShopPulse
- **Type:** Vanilla HTML + CSS + JS Single Page Application (SPA)
- **Purpose:** GST-compliant billing, inventory, and CRM for Indian IT/CCTV businesses
- **Storage:** Browser `localStorage` only — NO backend, NO server, NO npm
- **Entry point:** `index.html`

---

## ⚠️ Critical Rules — Never Break These

1. **NO build tools.** No npm, no webpack, no bundler. Plain `<script src="...">` tags only.
2. **NO external UI libraries.** No React, Vue, Bootstrap, Tailwind. Pure vanilla JS + CSS.
3. **NO backend calls.** All data lives in `localStorage`. No `fetch()` to any API except CDNs.
4. **Script load order matters** — always in this sequence in `index.html`:
   ```
   data.js → app.js → billing.js → inventory.js → crm.js → reports.js → ai.js
   ```
5. **Every module is a plain `const` object** (e.g. `const Billing = { ... }`). Not classes, not ES modules.
6. **All modules are globally scoped** — `Billing`, `Inventory`, `CRM`, `Reports`, `AI`, `App`, `DB` are all on `window`.
7. **Never touch `localStorage` directly** in module files — always use `DB.*` methods from `data.js`.
8. **GST logic lives only in `calcTotals()` in `data.js`** — do not duplicate tax calculation elsewhere.

---

## Architecture at a Glance

```
index.html
  └── loads css/index.css, css/components.css, css/modules.css
  └── loads js/data.js     ← DB object + GST engine + constants + seed data
  └── loads js/app.js      ← Router + Dashboard + Modal + Toast + Settings
  └── loads js/billing.js  ← Sales invoices, purchase bills, receivables, payables
  └── loads js/inventory.js← Products, stock management
  └── loads js/crm.js      ← Customers, suppliers
  └── loads js/reports.js  ← P&L, GSTR-1, GSTR-3B, CSV export
  └── loads js/ai.js       ← Rule-based AI assistant

Routing: hash-based (window.location.hash)
  App.route('#dashboard')   → renders dashboard
  App.route('#billing-sales')→ calls Billing.render(container, 'sales')
  (etc.)

Rendering: each module has a render(container) method that sets innerHTML
  container = document.getElementById('page-content')
```

---

## Data Layer — How to Use DB

```js
// Read
DB.getSales()                     // returns array
DB.getSaleById(id)                // returns object or undefined
DB.getProducts()                  // returns array
DB.getProductById(id)             // returns object or undefined
DB.getCustomers() / getCustomerById(id)
DB.getSuppliers() / getSupplierById(id)
DB.getPurchases() / getPurchaseById(id)
DB.getBiz()                       // returns business profile object

// Write
DB.saveSale(saleObj, isNew)       // isNew=true appends, false updates by id
DB.savePurchase(billObj, isNew)
DB.saveProduct(productObj)        // auto-assigns id if null
DB.saveCustomer(contactObj)       // auto-assigns id if null
DB.saveSupplier(contactObj)
DB.setBiz(bizObj)

// Delete
DB.deleteSale(id)
DB.deletePurchase(id)
DB.deleteProduct(id)
DB.deleteCustomer(id)
DB.deleteSupplier(id)

// Inventory
DB.adjustStock(productId, delta)  // delta can be negative

// Auto-numbering
DB.nextInvoiceNo()  // returns "SCS/2024-25/0009"
DB.nextBillNo()     // returns "SCS-PO/2024-25/0007"
```

---

## GST Calculation — How calcTotals() Works

```js
const result = calcTotals(items, sellerStateCode, buyerStateCode);

// items = array of:
{
  productId, name, hsn, unit,
  qty,         // number
  rate,        // price excl. GST
  discount,    // percentage (0-100)
  gstRate      // 0 / 5 / 12 / 18 / 28
}

// result:
{
  items: [      // same items with computed fields added:
    { ...item, taxableValue, cgstRate, cgstAmt, sgstRate, sgstAmt, igstRate, igstAmt, totalAmt }
  ],
  subtotal,     // sum of taxableValue
  totalCgst,    // 0 if inter-state
  totalSgst,    // 0 if inter-state
  totalIgst,    // 0 if intra-state
  totalTax,     // totalCgst + totalSgst + totalIgst
  total,        // subtotal + totalTax
  isIntra       // true if same state (CGST+SGST), false (IGST)
}
```

**Rule:** `sellerStateCode === buyerStateCode` → intra-state (CGST+SGST). Otherwise inter-state (IGST).

---

## UI Patterns — How to Build a New Page

```js
// 1. Add a route in app.js App.route()
case 'mypage': MyModule.render(c); break;

// 2. Add a nav item in app.js buildSidebar()
<a href="#mypage" class="nav-item" data-r="mypage">...</a>

// 3. Create the module
const MyModule = {
  render(container) {
    container.innerHTML = `
      <div class="page-header-row">
        <h2>My Page</h2>
        <div class="actions">
          <button class="btn btn-primary" onclick="MyModule.openForm()">Add</button>
        </div>
      </div>
      <!-- content -->
    `;
  },

  openForm() {
    App.modal('Add Item',
      `<div class="form-grid">...</div>`,
      `<button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
       <button class="btn btn-primary" onclick="MyModule.save()">Save</button>`
    );
  },

  save() {
    // validate, call DB.save*(), App.toast(), App.closeModal(), re-render
  }
};
```

---

## CSS Class Reference — Most Important

### Layout
- `.card` + `.card-header` + `.card-body` — white card container
- `.page-header-row` — page title + action buttons row
- `.kpi-grid` — 4-column KPI card grid
- `.kpi-card.kpi-primary/success/warning/danger` — stat card

### Forms
- `.form-grid` — 2-column form grid
- `.form-grid-3` — 3-column form grid
- `.form-group` — label + input wrapper
- `.form-full` — spans full width in grid
- `.required` — red asterisk span

### Tables
- `.table-wrap` > `.table` — responsive table
- `.table tbody tr:hover` — built-in hover highlight
- `.action-col` — right-aligned action buttons column
- `.table-empty` — centered empty state inside table

### Buttons
- `.btn.btn-primary` — blue
- `.btn.btn-secondary` — white/bordered
- `.btn.btn-success` — green
- `.btn.btn-danger` — red
- `.btn.btn-ghost` — transparent
- `.btn.btn-sm` / `.btn.btn-xs` — smaller variants

### Badges
- `.badge.badge-paid` — green
- `.badge.badge-unpaid` / `.badge-warning` — yellow
- `.badge.badge-overdue` / `.badge-danger` — red
- `.badge.badge-sent` / `.badge-info` — blue
- `.badge.badge-draft` — grey

### Modals
- `App.modal(title, bodyHTML, footerHTML, sizeClass)` — sizeClass: `''|'modal-lg'|'modal-xl'|'modal-sm'`
- Always include Cancel button calling `App.closeModal()`

---

## Constants Available Globally

```js
INDIAN_STATES   // [{name, code}] — all 37 Indian states/UTs with GST codes
GST_RATES       // [0, 0.1, 0.25, 1, 1.5, 3, 5, 7.5, 12, 18, 28]
UNITS           // ["Nos", "Pcs", "Box", "Job", "Visit", ...]
PAYMENT_METHODS // ["Bank Transfer", "NEFT", "RTGS", "UPI", "Cheque", "Cash", ...]
```

---

## Common Utility Functions

```js
fmtCurrency(1234567.89)   // → "₹12,34,567.89"  (Indian lakh/crore format)
fmtDate("2024-08-15")     // → "15 Aug 2024"
validateGSTIN("27AABCT5432R1ZP")  // → true/false
numberToWords(50220.80)   // → "Fifty Thousand Two Hundred Twenty and Paise Eighty Only"
genId("INV")              // → "INV-a1b2c3d4"
getFY()                   // → "2024-25"
daysBetween(date1, date2) // → integer (negative = date2 is in past)
```

---

## Business Domain Knowledge

### Product Categories & HSN/SAC Codes
| Category | HSN/SAC | GST% |
|---|---|---|
| Laptops, Desktops | 8471 | 18% |
| Printers | 8443 | 18% |
| CCTV Cameras | 8525 | 18% |
| DVR/NVR | 8521 | 18% |
| Network switches, Firewall | 8517 | 18% |
| UPS | 8504 | 18% |
| RAM, SSD, Computer parts | 8473 / 8471 | 18% |
| Cables (CAT6, HDMI) | 8544 | 18% |
| AMC services | 998314 | 18% |
| CCTV Installation | 998714 | 18% |
| Network setup | 998313 | 18% |
| Computer repair | 998731 | 18% |

### Invoice Number Format
`SCS/2024-25/0001` = `{prefix}/{financial-year}/{4-digit-serial}`

### Financial Year
April 1 – March 31. `getFY()` returns `"2024-25"`.

---

## What NOT to Do

- ❌ Don't add `import`/`export` — not an ES module project
- ❌ Don't add `package.json` or npm dependencies
- ❌ Don't use `querySelector` with non-unique selectors in global scope (use within container)
- ❌ Don't store temporary UI state in localStorage — only use DB methods for real data
- ❌ Don't hardcode INR amounts — always use `fmtCurrency()`
- ❌ Don't hardcode dates — always use `new Date().toISOString().split('T')[0]`
- ❌ Don't duplicate GST calculation logic — always call `calcTotals()`
- ❌ Don't modify `data.js` seed data structure without updating README.md
