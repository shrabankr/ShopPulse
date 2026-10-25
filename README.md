# ⚡ ShopPulse — GST Business Management System

> **All-in-one billing, inventory, CRM, and GST compliance app for Indian IT/CCTV service businesses.**  
> Built as a **vanilla HTML + CSS + JavaScript SPA** (Single Page Application) with **zero dependencies** except Chart.js.  
> All data stored in **browser localStorage** — no backend, no database, no server needed.

---

## 🌟 What's New in v2.0.0 — Unified Enterprise Release: Delivery Challan, Barcode POS, Aging Khata & WhatsApp Engine

### 1. 🚚 GST Delivery Challan & Dispatch Gate Pass (Material Outward Slip — Rule 55)
- 📜 **Statutory GST Rule 55 Delivery Challan**: Fully compliant outward transport and delivery challan for moving goods without a tax invoice (goods sent on approval, delivery after service, site installation, or job work).
- ⚡ **1-Click Generation**: Direct 1-click trigger from any Sales Invoice (`Billing.viewDoc`) or Service & Repair Job Sheet (`Services.viewJob`). Automatically carries forward customer data, product line items, quantities, serial numbers (S/N), and warranty terms.
- 📄 **Dual Document Layouts**:
  - **A4 Official Delivery Challan**: Includes business letterhead, consignee destination, transportation metadata (Mode of Transport, Vehicle Number, Transporter Name, LR/Docket Number, E-Way Bill Number), itemized hardware list with serial numbers, statutory declaration, and **Physical Receiver Acknowledgment Block** with Name, Phone, Designation (`Self`, `Store Manager`, `IT Staff`, `Security Desk`, `Project Engineer`), and Physical Signature & Rubber Stamp boxes.
  - **3" Thermal POS Gate Pass Slip**: Compact 80mm roll slip for counter checkout checkpoints, delivery van driver handovers, or security gate outward verification.
- 📋 **Dedicated Management Hub (`#challans`)**: Filter by Sales deliveries, Service hardware returns, or Manual outward dispatches, search by vehicle/customer/challan number, and reprint/export anytime.
- 📲 **1-Click WhatsApp Dispatch Notification**: Send complete delivery notices with vehicle numbers, tracking numbers, and item lists to consignees.

### 2. ⚡ Rapid USB Barcode Scanner POS Mode
- 🔫 **Continuous Zero-Touch Scan-to-Cart**: Plug any standard USB or wireless 1D/2D barcode gun (Honeywell, TVS, Zebra, Datalogic, Inateck, etc.) into your PC and scan item barcodes consecutively.
- 📦 **Automated Quantity Increment**: If a scanned item is already in the bill, its quantity automatically increments by 1 with instant visual feedback highlight.
- 🔊 **Zero-Dependency Synthesizer Audio Beep**: Uses browser Web Audio API (`window.AudioContext`) to generate a crisp 800Hz POS confirmation chime without loading external MP3 files.
- ⌨️ **Instant F2 POS Keyboard Shortcut**: Press `F2` from anywhere in ShopPulse to instantly focus the barcode scanner input or open a new sales invoice.

### 3. 📊 Aging Khata & Credit Overdue Analysis Dashboard
- 🗓️ **4 Standard Indian Credit Aging Buckets**:
  - **0–30 Days (Current / Not Due)**: Healthy customer credit.
  - **31–60 Days (Overdue Alert)**: Polite payment follow-up window.
  - **61–90 Days (Critical Overdue)**: Urgent notice with Shop UPI ID.
  - **90+ Days (High Risk / Bad Debt)**: Formal settlement demand notice.
- 🎯 **Interactive Filter Cards**: 1-click KPI cards in `#receivables` and `#payables` filter customer outstanding lists immediately.
- 📲 **Tiered WhatsApp Payment Reminder Presets**: Automatically suggests the right tone based on overdue days:
  - *Gentle Reminder (1–30d)*: Courteous reminder with invoice date, amount, and due date.
  - *Urgent Follow-up (31–60d)*: Explicit warning of credit hold with instant Countertop UPI ID and bank details.
  - *Final Settlement Notice (60+d)*: Formal legal demand to prevent suspension of warranty, AMC, and credit facilities.
- 📥 **1-Click Aging CSV Export**: Download complete receivables aging reports with party contact details, credit terms, and overdue days.

### 4. 💬 Enhanced 1-Click Zero-Cost WhatsApp Dispatch Engine
- 💰 **100% Free Desktop Dispatch**: Zero monthly subscription fees, zero third-party gateway charges (Wati/UltraMsg), and no Meta Cloud API verification.
- 📱 **Interactive WhatsApp Dispatch Center (`App.openWhatsAppModal()`)**: Live styled preview bubble, Indian mobile normalizer (`+91` auto-fix), direct launch in WhatsApp Web / Desktop, copy to clipboard, and instant PDF export.
- 🧾 **Multi-Scenario Triggers**: Covers Sales Invoices, Payment Receipts, Service Tickets (Intake, Estimate, Ready, Status), AMC Contracts, and CRM Customer Khata Statements.
- ⚙️ **Customizable Templates in Settings**: Custom greeting, custom shop signature footer, and prefix management.
- 🧪 **200-Point Automated Test Suite**: 100% test pass rate across all 17 phases.

---

## 🌟 What's New in v1.9.0 — Official GSTR-1 JSON Generator for Direct GST Portal Upload
- 🏛️ **Official GSTN GSTR-1 JSON Generation (`Reports.generateGSTR1Json()`)**: Compiles 100% government-compliant `.json` return files ready to upload directly on the Indian GST Portal (`services.gst.gov.in`) under **Returns Dashboard $\rightarrow$ GSTR-1 $\rightarrow$ Prepare Offline $\rightarrow$ Upload**.
- 📑 **Complete Statutory GSTN Tables Coverage**:
  - **Table 4 (B2B)**: Outward supplies to registered taxable persons grouped by Buyer GSTIN with 2-digit Place of Supply (`pos`), reverse charge flags (`rchrg`), invoice numbers, and item tax rates.
  - **Table 5 (B2CL)**: Large inter-state invoices to consumers exceeding ₹2.5 Lakhs.
  - **Table 7 (B2CS)**: Aggregated consumer sales classified by supply type (`INTRA` / `INTER`), Place of Supply code, and tax rate.
  - **Table 9B (CDNR & CDNUR)**: Credit notes and debit notes issued to registered and unregistered buyers.
  - **Table 12 (HSN/SAC Summary)**: Product and service summary with standardized Indian Unit Quantity Codes (UQC: `NOS`, `BOX`, `MTR`, `SET`, `PAC`) and aggregated values.
  - **Table 13 (Documents Issued)**: Complete document series numbering ranges (`from`, `to`, `totnum`, `net_issue`).
- 🔍 **Interactive Pre-Upload GST Inspector & Validator (`Reports.viewGSTR1JsonModal()`)**: Live modal previewing JSON payloads, syntax validation, B2B GSTIN checksum verification, and 1-click clipboard copy with portal upload instructions.
- 🧪 **147-Point Automated Test Suite**: Expanded verification covering GSTN schema generation, financial period mapping (`MMYYYY`), rate groupings, UQC conversion, and validation error detection.

---

## 🌟 What's New in v1.8.0 — Daily Cash Register, Shift Balancing & Day-End Z-Report
- 💼 **Daily Cash Register & Shift Management**: Full POS till management enabling cashiers to start morning shifts with opening float cash (`DB.openRegister()`), tracking active drawer sessions throughout the workday.
- 🧮 **Interactive Indian Currency Denomination Note Counter**: Fast note counting matrix (₹500, ₹200, ₹100, ₹50, ₹20, ₹10 & coins) with live subtotal calculation and automated physical cash aggregation.
- ⚖️ **Automated Discrepancy & Variance Reconciliation**: Real-time comparison between System Expected Cash (Opening float $+$ Cash sales $+$ Overdue collections $+$ Cash-in drops $-$ Cash expenses $-$ Cash purchases $-$ Cash-drops) versus Counted Physical Cash with color-coded **Balanced (₹0)**, **Shortage (-₹)**, or **Overage (+₹)** indicators.
- 📄 **Dual-Format Day-End Z-Report (3" POS Thermal Slip & A4 Audit Sheet)**: 1-click printable and exportable audit report detailing shift timings, financial movements, gross revenue across all payment modes (Cash, UPI, Card), physical denomination breakdown, variance, and dual signature blocks (Cashier and Store Manager/Owner).
- 💰 **Drawer Float & Drop Operations**: Fast modal actions for mid-day cash injections (bank change top-ups) or petty cash drops (owner handovers, courier postage) with full narration audit trails.
- 🧪 **131-Point Automated Test Suite**: Expanded verification covering register opening, cash inflow/outflow balance calculations, denomination matrix totals, shift finalization, and Z-report generation.

---

## 🌟 What's New in v1.7.0 — Split Payments, Dynamic Countertop UPI QR & Change Calculator
- 💳 **Split Payments & Multi-Tender Support**: Cashiers can now settle bills across multiple tenders simultaneously (e.g., ₹2,000 Cash + ₹8,500 UPI + ₹1,500 Store Credit/Receivable) with live breakdown and auto-balancing line items.
- 📲 **Dynamic Countertop UPI QR Modal**: Live high-resolution QR modal generated on-screen with exact payable amounts encoded via standard NPCI UPI URI (`upi://pay?pa=...&am=...`), with 12-digit UTR confirmation input to auto-apply transactions without any external network dependency.
- 💵 **Cash Received & Change Return Calculator**: Interactive cash-tendered calculator with quick denomination buttons (`+₹100`, `+₹200`, `+₹500`, `Exact`) and bold real-time Change to Return / Tender Short alerts.
- 🧾 **Multi-Format Invoice Payment Breakdown**: Both 3" POS thermal slips and A4 standard templates (Classic, Modern, Executive) print comprehensive tender breakdowns (Cash, UPI, Cheque, Card), cash tendered, change returned, and remaining balance due.
- ⚡ **Overdue Debt Collection Countertop UPI QR**: Record Payment modal in Receivables and Invoices includes instant UPI QR generation for outstanding dues with 1-click UTR verification.
- 🧪 **115-Point Automated Test Suite**: Expanded verification covering multi-tender splits, change return math, NPCI UPI URI schemes, and template print rendering.

---

## 🌟 What's New in v1.6.0 — AMC Contracts & Warranty Renewal Engine
- 🤝 **Comprehensive AMC Contract Management**: Dedicated lifecycle manager for Annual Maintenance Contracts (AMCs) tailored for IT, CCTV surveillance, networking, and hardware service providers.
- 🏢 **Multi-Category & Scope Support**: Register contracts for CCTV Surveillance, Computers & IT Hardware, Networking & Firewall, Biometric & Intercom, and Complete IT Infrastructure with equipment inventories, device counts, and site addresses.
- ⚖️ **Comprehensive vs Non-Comprehensive Coverage**: Clear distinction between parts-inclusive agreements and labor/service-only contracts with automated SLA terms.
- 📅 **Automated Preventive Maintenance (PM) Scheduler**: Auto-generates quarterly, bi-monthly, monthly, or half-yearly scheduled service visit dates across the contract period.
- 🛠️ **1-Click Field Service Ticket Creation**: Convert any scheduled PM visit directly into a field service repair ticket (`DB.saveJob()`) for field technicians to execute on-site.
- 🔄 **1-Click Contract Renewal Engine**: Instantly creates the next year's contract starting seamlessly from the previous expiration date with auto-generated contract numbering.
- 🧾 **1-Click GST Tax Invoice Conversion (SAC 998314)**: Converts contracts to GST-compliant Tax Invoices for Information Technology & Maintenance Services (SAC 998314, 18% GST).
- 📄 **Professional A4 AMC SLA Agreement Certificate**: Printable and PDF-exportable contract document with provider branding, client site details, equipment schedule, SLA response window, terms & conditions, and signature blocks.
- 📲 **WhatsApp Contract & Renewal Dispatch**: Pre-formatted status updates, visit notifications, and renewal alerts directly sent to customer WhatsApp numbers.
- 🧪 **102-Point Automated Test Suite**: Expanded verification covering PM schedule generation, AMC CRUD, expiry detection, and agreement document generation.

---

## 🌟 What's New in v1.5.0 — Barcode Label Printing Studio & Always-Active Scanner POS
- 🏷️ **Barcode & Price Tag Studio**: Dedicated interactive design modal in Inventory allowing creation of barcode and price stickers for any product or custom item with live real-time sticker preview.
- 📐 **Multiple Standard Label Sheet & Roll Layouts**:
  - **50mm × 25mm Thermal Roll (2" × 1")**: Single-row continuous sticker roll for thermal barcode label printers (TVS, TSC, Zebra, Xprinter).
  - **A4 Sheet — 24 Labels (3 cols × 8 rows, 70 × 37mm)**: Standard 24-up sticker paper for regular laser/inkjet printers (Avery/Oddy).
  - **A4 Sheet — 48 Mini Labels (4 cols × 12 rows, 48.5 × 25.4mm)**: Compact mini stickers for small parts (RAM, adapters, connectors).
  - **2D QR Code Sticker (35mm × 35mm)**: 2D QR code sticker format with shop branding and price tags.
- 🖨️ **Zero-Dependency Vector Barcode Engine**: 100% vanilla Code 128 (subset B) SVG generator outputting crisp, scannable vector barcodes without external images or npm packages.
- 🎲 **Automatic Indian 12-digit EAN Barcode Generator**: 1-click generation of standard 12-digit Indian prefix (`890...`) barcodes with option to save generated barcodes directly to product records.
- ⚡ **Global Always-Active Hardware Barcode Scanner POS**: Background scanner listener automatically intercepts rapid laser/CCD scanner gun inputs (< 60ms keystrokes) anywhere in the app:
  - If invoice/bill form is open: auto-adds item or increments quantity with audio beep.
  - If serial/warranty lookup is open: populates S/N and triggers instant warranty lookup.
  - If in Inventory: filters catalog to exact product.
  - Anywhere else: displays a fast identification popup with stock status, retail & dealer prices, and 1-click invoice creation.
- 🧪 **89-Point Automated Test Suite**: Expanded test coverage verifying pure SVG Code 128 rendering, Indian EAN prefixes, barcode lookup, and multi-layout label sheets.

---

## 🌟 What's New in v1.4.0 — Desktop Experience & Security Edition
- 💿 **Official Windows NSIS Setup Wizard Installer**: Standard installation wizard (`ShopPulse-Setup-v1.4.0.exe`) creating desktop shortcuts, Start Menu integration, and clean uninstaller support.
- 🔒 **Default Staff Mode & Privacy Engine**: Every app launch safely defaults to Counter Staff Mode (`🔒 Staff Mode ▾`), masking sensitive wholesale purchase costs, supplier bills, payables, and P&L until unlocked by the shop owner with PIN (`1234`).
- 🗂️ **Collapsible Sidebar Navigation**: Sleek categorized sections (Transactions, Management, Analytics & System) with smooth caret indicators, local state persistence, and auto-expansion on route navigation.
- 🖨️ **Native Win32 Printing Engine**: Direct hardware printing support via native system dialogs, completely eliminating the Windows UWP print preview bug.
- 📄 **Enhanced Vector PDF Engine & Auto-Explorer Reveal**: Direct vector PDF generation with automatic file highlighting in Windows File Explorer and meaningful document names.
- ⚡ **Native Brand Icon Packaging**: High-resolution multi-size Windows bolt icon embedded directly into `ShopPulse.exe` and `ShopPulse-Setup-v1.4.0.exe`.
- 🧪 **Comprehensive Automated Test Suite**: Built-in 77-point test runner (`npm test`) covering GST engines, CRM ledgers, configurator TDP math, and data safety.

---

## 🌟 What's New in v1.3.0 — Specialized Computer & Electronics Store Edition
- 🛠️ **Service & Repair Job Sheet System**: Complete intake workflow for customer laptops, desktops, DVRs, CCTV cameras, and printers with 3" thermal claim tokens, technician diagnostics, and 1-click conversion to GST Tax Invoices (SAC 998731).
- 📖 **Party Ledger & Statement of Account (Khata)**: Complete account statement for Customers and Suppliers with opening balances, running Dr/Cr debit-credit calculations, A4 PDF printable statement, 1-click CSV export, and WhatsApp khata reminder dispatch.
- 🛡️ **Automated Local Backup & Data Safety (Desktop)**: Background daily rolling backup saved silently to your local Documents folder with automated 7-day retention cleanup, detected backups list with 1-click restore, and File Explorer folder access.
- 📦 **Bulk Excel / CSV Product & Opening Stock Import**: Download ready sample template, import hundreds of products in 1 click, visual verification preview grid with error detection, smart upsert (update existing & add new), and 1-click catalog export.
- 🖥️ **Custom PC Configurator & 📹 CCTV Package Bundler**: Guided component-by-component PC builder with real-time socket (LGA1700, AM4, AM5) and DDR4/DDR5 memory compatibility checks, live system wattage estimation, strict inventory stock guard, GST-inclusive on-road rates display, reusable package templates library, and 1-click conversion to GST Tax Invoices or Quotations.
- ⭐ **Customer Loyalty Points & Referral Rewards Engine**: Earn reward points per ₹ spent on every invoice, 1-click points redemption discount at checkout, customer-to-customer referral tracking with bonus point payouts, manual balance adjustments with audit reason trail, and loyalty ledger breakdown in CRM.
- 🛡️ **Hardware Serial Number (S/N) & IMEI Tracking**: Record line-item serial numbers across Sales Invoices, Purchase Bills, and print them on all receipts.
- ⏳ **Warranty Engine & Expiry Tracking**: Supports Testing Warranty, 3M, 6M, 1–5 Years, and Lifetime coverage with live active/expired badges.
- 🔍 **Hardware Serial & Warranty Lookup Hub**: 1-click topbar search (`Warranty S/N`) to instantly look up any S/N, view customer invoice, remaining warranty, and distributor RMA records.
- 🏷️ **Dual Pricing Engine (Retail vs Dealer / Wholesale)**: Auto-detects dealer accounts and offers a 1-click rate toggle pill on line items.
- 🔫 **Barcode Scanner Gun Fast-Add Bar**: Scan barcodes directly into invoices with offline audio feedback.
- 📜 **Quotation & Estimations**: Issue quotations with 1-click item-by-item conversion to GST Tax Invoices.
- 🔄 **Sales & Purchase Return Engine**: Issue Credit Notes and Debit Notes with automated real-time stock restoration.
- 🧾 **Multi-Format Invoicing**: Classic GST, Modern Blue, 3" POS Thermal Slip (80mm), and Executive Dark templates.
- ✈️ **100% Offline Capable**: Bundled offline Inter fonts and Material Icons — zero external network or CDN dependency.

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
    ├── crm.js              ← Customers, suppliers & Khata ledger statements
    ├── expenses.js         ← Operating expenses, GST ITC tracking, category breakdown
    ├── reports.js          ← P&L, GSTR-1, GSTR-3B, HSN summary, CSV export
    ├── services.js         ← Job Sheet system for computer/CCTV repairs & service tokens
    ├── configurator.js     ← Custom PC Builder & CCTV Package Kit Configurator
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
| Offline Assets | 100% Local (Bundled Inter fonts & Material Icons in fonts/) |
| Charts | Local Chart.js 4.4.3 (js/chart.umd.min.js) |
| QR Code | Local QRCode.js (js/qrcode.min.js) |
| Desktop App | Electron 31 (Windows x64 executable & portable zip) |
| Storage | Browser localStorage (JSON serialized, zero external server) |
| Routing | URL hash-based (#dashboard, #billing-sales, #quotations, #returns, etc.) |
| Printing | Multi-format (Classic GST, Modern Blue, 3-inch POS Thermal Receipt, Executive Dark) |
| Hosting | Any static file server or direct double-click on index.html / ShopPulse.exe |

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
