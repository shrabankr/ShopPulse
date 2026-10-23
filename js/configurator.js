/**
 * ShopPulse — PC Configurator & CCTV Package Bundler
 * Guided PC builder with hardware compatibility, stock validation,
 * GST-inclusive on-road pricing, and 1-click Tax Invoice & Quotation loading.
 */

const Configurator = {
  _activeTab: 'pc', // 'pc' | 'cctv' | 'templates'
  _showOutOfStock: false,

  // ── PC Slots State ──
  _pcSlots: {
    cpu: null,
    cooler: null,
    motherboard: null,
    ram: null,
    ssd_m2: null,
    ssd_sata: null,
    hdd: null,
    gpu: null,
    cabinet: null,
    psu: null,
    monitor: null,
    keyboard_mouse: null
  },

  // ── CCTV Slots State ──
  _cctvSlots: {
    dvr_nvr: null,
    dome_cameras: null,
    bullet_cameras: null,
    hard_drive: null,
    power_supply: null,
    cables: null,
    connectors: null,
    rack: null,
    installation: null
  },

  // Slot definitions for PC Builder
  _pcSlotDefs: [
    { key: 'cpu', label: 'Processor (CPU)', icon: 'memory', category: 'Processors', required: true, tooltip: 'Select Intel or AMD processor' },
    { key: 'cooler', label: 'Cooling System (CPU Cooler)', icon: 'ac_unit', category: 'Cooling System (CPU Cooler)', required: false, tooltip: 'Air cooler, AIO liquid cooler or stock box cooler' },
    { key: 'motherboard', label: 'Motherboard', icon: 'developer_board', category: 'Motherboards', required: true, tooltip: 'Motherboard matching the selected CPU socket' },
    { key: 'ram', label: 'Memory (RAM)', icon: 'straighten', category: 'Memory (RAM)', required: true, tooltip: 'DDR4 or DDR5 RAM modules' },
    { key: 'ssd_m2', label: 'Solid State Drive (M.2 SSD)', icon: 'storage', category: 'Solid State Drive (M.2 SSD)', required: false, tooltip: 'High-speed NVMe PCIe M.2 SSD' },
    { key: 'ssd_sata', label: 'Solid State Drive (SATA SSD)', icon: 'dns', category: 'Solid State Drive (SATA SSD)', required: false, tooltip: '2.5-inch SATA internal SSD' },
    { key: 'hdd', label: 'Hard Disk Drive (Internal HDD)', icon: 'disc_full', category: 'Hard Disk Drive (Internal HDD)', required: false, tooltip: '3.5-inch high capacity storage drive' },
    { key: 'gpu', label: 'Graphics Card (GPU / VGA)', icon: 'videogame_asset', category: 'Graphics Card (GPU/VGA)', required: false, tooltip: 'Dedicated Nvidia GeForce or AMD Radeon GPU' },
    { key: 'cabinet', label: 'Cabinet / Case', icon: 'desktop_windows', category: 'Cabinet / Case', required: true, tooltip: 'Mid-Tower, Gaming ARGB or Micro-ATX Case' },
    { key: 'psu', label: 'Power Supply Unit (SMPS / PSU)', icon: 'power', category: 'Power Supply Unit (SMPS/PSU)', required: true, tooltip: 'Continuous power supply matching total system wattage' },
    { key: 'monitor', label: 'Monitor (Display)', icon: 'tv', category: 'Monitor (Display)', required: false, tooltip: 'Full HD / 2K Display screen' },
    { key: 'keyboard_mouse', label: 'Keyboard & Mouse Combo', icon: 'keyboard', category: 'Keyboard & Mouse', required: false, tooltip: 'Input peripherals' }
  ],

  // Slot definitions for CCTV Kit Bundler
  _cctvSlotDefs: [
    { key: 'dvr_nvr', label: 'Surveillance DVR / NVR Unit', icon: 'security', category: 'CCTV', defaultQty: 1, tooltip: '4-Ch, 8-Ch, or 16-Ch Recording Unit' },
    { key: 'dome_cameras', label: 'Indoor Dome Cameras', icon: 'videocam', category: 'CCTV', defaultQty: 2, tooltip: 'Ceiling mounted indoor surveillance cameras' },
    { key: 'bullet_cameras', label: 'Outdoor Bullet Cameras (IP66/67)', icon: 'videocam', category: 'CCTV', defaultQty: 2, tooltip: 'Weatherproof outdoor night-vision cameras' },
    { key: 'hard_drive', label: 'Surveillance Hard Drive (24x7)', icon: 'storage', category: 'Hard Disk Drive (Internal HDD)', defaultQty: 1, tooltip: 'Seagate SkyHawk / WD Purple 24x7 drive' },
    { key: 'power_supply', label: 'CCTV SMPS Power Supply', icon: 'power', category: 'CCTV Accessories', defaultQty: 1, tooltip: 'Multi-channel 12V DC power unit or PoE switch' },
    { key: 'cables', label: 'CCTV Coaxial / CAT6 Cable Roll', icon: 'settings_ethernet', category: 'Networking', defaultQty: 1, tooltip: '3+1 Copper cable or 305m CAT6 box' },
    { key: 'connectors', label: 'BNC & DC Power Connectors', icon: 'cable', category: 'CCTV Accessories', defaultQty: 1, tooltip: 'Heavy brass BNC and DC video/power jacks' },
    { key: 'rack', label: 'Wall Mount CCTV / DVR Rack', icon: 'inventory', category: 'CCTV Accessories', defaultQty: 1, tooltip: '2U / 4U Metal locking rack' },
    { key: 'installation', label: 'Wiring, Installation & Setup', icon: 'build', category: 'Installation', defaultQty: 1, tooltip: 'Professional installation and mobile app cloud setup' }
  ],

  /* ──────────────────────────────────────────
     COMPATIBILITY MATRIX ENGINE
  ────────────────────────────────────────── */
  _getCompatibleChipsets(socket) {
    if (!socket) return [];
    const s = socket.toUpperCase();
    if (s.includes('1700')) return ['H610', 'B660', 'B760', 'Z690', 'Z790'];
    if (s.includes('1200')) return ['H410', 'H510', 'B460', 'B560', 'Z490', 'Z590'];
    if (s.includes('AM4'))  return ['A320', 'A520', 'B350', 'B450', 'B550', 'X370', 'X470', 'X570'];
    if (s.includes('AM5'))  return ['A620', 'B650', 'B650E', 'X670', 'X670E', 'B840', 'B850', 'X870'];
    return [];
  },

  _detectSocket(product) {
    if (!product) return null;
    if (product.socket) return product.socket;
    const txt = `${product.name} ${product.sku || ''} ${product.category || ''}`.toUpperCase();
    if (txt.includes('LGA1700') || txt.includes('12100') || txt.includes('12400') || txt.includes('13400') || txt.includes('13600') || txt.includes('13700') || txt.includes('14400') || txt.includes('14700')) return 'LGA1700';
    if (txt.includes('LGA1200') || txt.includes('10100') || txt.includes('10105') || txt.includes('10400') || txt.includes('11400') || txt.includes('11700')) return 'LGA1200';
    if (txt.includes('AM5') || txt.includes('7600') || txt.includes('7700') || txt.includes('7800') || txt.includes('7900') || txt.includes('8600') || txt.includes('9600')) return 'AM5';
    if (txt.includes('AM4') || txt.includes('3600') || txt.includes('4600') || txt.includes('5600') || txt.includes('5700') || txt.includes('5800') || txt.includes('3200G')) return 'AM4';
    return null;
  },

  _detectChipset(product) {
    if (!product) return null;
    if (product.chipset) return product.chipset;
    const txt = `${product.name} ${product.sku || ''}`.toUpperCase();
    const chips = ['H610', 'B760', 'Z790', 'B660', 'Z690', 'H510', 'B560', 'Z590', 'H410', 'B460', 'A520', 'B550', 'X570', 'B450', 'A320', 'A620', 'B650', 'X670', 'B850', 'Q270', 'B250'];
    for (const c of chips) {
      if (txt.includes(c)) return c;
    }
    return null;
  },

  _detectMemoryType(product) {
    if (!product) return null;
    if (product.memoryType) return product.memoryType.toUpperCase();
    const txt = `${product.name} ${product.sku || ''}`.toUpperCase();
    if (txt.includes('DDR5') || txt.includes('D5')) return 'DDR5';
    if (txt.includes('DDR4') || txt.includes('D4')) return 'DDR4';
    if (txt.includes('DDR3')) return 'DDR3';
    return null;
  },

  _detectBrand(product) {
    if (!product) return 'Other';
    if (product.brand) return product.brand.toUpperCase();
    const txt = `${product.name} ${product.sku || ''}`.toUpperCase();
    const brands = ['INTEL', 'AMD', 'ASUS', 'ASROCK', 'MSI', 'GIGABYTE', 'CORSAIR', 'CRUCIAL', 'KINGSTON', 'G.SKILL', 'SAMSUNG', 'WESTERN DIGITAL', 'WD', 'SEAGATE', 'ZOTAC', 'COOLER MASTER', 'DEEPCOOL', 'ANT ESPORTS', 'ZEBRONICS', 'HIKVISION', 'CP PLUS', 'DAHUA', 'DELL', 'HP', 'LOGITECH', 'TP-LINK', 'D-LINK'];
    for (const b of brands) {
      if (txt.includes(b)) return b;
    }
    return 'OTHER';
  },

  _detectTdp(product) {
    if (!product) return 0;
    if (product.tdp) return parseFloat(product.tdp) || 0;
    const txt = `${product.name} ${product.sku || ''}`.toUpperCase();
    if (txt.includes('RTX 4060')) return 115;
    if (txt.includes('RTX 3060')) return 170;
    if (txt.includes('GTX 1650')) return 75;
    if (txt.includes('RTX 4070')) return 200;
    if (txt.includes('I7-14700') || txt.includes('I7-13700')) return 125;
    if (txt.includes('I5-12400') || txt.includes('I5-13400') || txt.includes('5600') || txt.includes('7600')) return 65;
    if (txt.includes('I3-12100') || txt.includes('I3-10100')) return 60;
    return 0;
  },

  /* Calculate Total System Wattage */
  _calcEstimatedWattage() {
    let watts = 50; // base motherboard, fans, chipset & drives
    const cpu = this._pcSlots.cpu?.product;
    const gpu = this._pcSlots.gpu?.product;
    if (cpu) watts += this._detectTdp(cpu) || 65;
    if (gpu) watts += this._detectTdp(gpu) || 115;
    return watts;
  },

  /* ──────────────────────────────────────────
     MAIN RENDER METHOD
  ────────────────────────────────────────── */
  render(container) {
    // Ensure rich seed hardware parts & sample templates are ready
    if (DB.ensureConfiguratorSeed) {
      DB.ensureConfiguratorSeed();
    }

    container.innerHTML = `
      <div class="configurator-wrap">
        <!-- Top Title Bar -->
        <div class="page-header-row" style="margin-bottom:16px">
          <div>
            <h2 style="display:flex;align-items:center;gap:8px">
              <span class="material-icons" style="color:var(--primary);font-size:28px">memory</span>
              Custom PC &amp; CCTV Kit Configurator
            </h2>
            <p class="text-secondary" style="margin:2px 0 0 0;font-size:.87rem">
              Build custom PCs with socket &amp; memory compatibility checks, design multi-camera CCTV kits, and load directly into GST Tax Invoices or Quotations.
            </p>
          </div>
          <div class="actions" style="display:flex;gap:8px">
            <button class="btn btn-secondary btn-sm" onclick="Configurator.openTemplatesModal()">
              <span class="material-icons">folder_open</span> Saved Templates (${DB.getBundles().length})
            </button>
            <button class="btn btn-ghost btn-sm" onclick="Configurator.resetCurrent()" title="Reset current selection">
              <span class="material-icons">refresh</span> Reset
            </button>
          </div>
        </div>

        <!-- Mode Navigation Tabs -->
        <div class="tabs" style="margin-bottom:20px;border-bottom:2px solid var(--border);display:flex;gap:12px">
          <button class="tab-btn ${this._activeTab === 'pc' ? 'active' : ''}" onclick="Configurator.switchTab('pc')" style="padding:10px 18px;font-weight:700;display:flex;align-items:center;gap:6px">
            <span class="material-icons" style="font-size:18px">desktop_windows</span> 🖥️ Custom PC Builder
          </button>
          <button class="tab-btn ${this._activeTab === 'cctv' ? 'active' : ''}" onclick="Configurator.switchTab('cctv')" style="padding:10px 18px;font-weight:700;display:flex;align-items:center;gap:6px">
            <span class="material-icons" style="font-size:18px">videocam</span> 📹 CCTV Package Bundler
          </button>
          <button class="tab-btn ${this._activeTab === 'templates' ? 'active' : ''}" onclick="Configurator.switchTab('templates')" style="padding:10px 18px;font-weight:700;display:flex;align-items:center;gap:6px">
            <span class="material-icons" style="font-size:18px">bookmark</span> 💾 Bundle Templates Library
          </button>
        </div>

        <!-- Tab Content Wrapper -->
        <div id="cfg-tab-content">
          ${this._renderActiveTabContent()}
        </div>
      </div>
    `;

    this._bindEvents();
  },

  switchTab(tab) {
    this._activeTab = tab;
    const c = document.getElementById('cfg-tab-content');
    if (c) c.innerHTML = this._renderActiveTabContent();
    document.querySelectorAll('.configurator-wrap .tab-btn').forEach(b => b.classList.remove('active'));
    event?.target?.closest('.tab-btn')?.classList.add('active');
  },

  _renderActiveTabContent() {
    if (this._activeTab === 'cctv') return this._renderCctvView();
    if (this._activeTab === 'templates') return this._renderTemplatesView();
    return this._renderPcView();
  },

  /* ──────────────────────────────────────────
     1. CUSTOM PC BUILDER VIEW
  ────────────────────────────────────────── */
  _renderPcView() {
    const estimatedWattage = this._calcEstimatedWattage();
    const totals = this._calcTotals('pc');
    const selectedCount = Object.values(this._pcSlots).filter(Boolean).length;
    const cpu = this._pcSlots.cpu?.product;
    const socket = this._detectSocket(cpu);
    const mb = this._pcSlots.motherboard?.product;
    const mbMem = this._detectMemoryType(mb);

    return `
      <div style="display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start">
        <!-- Left: Slot Chooser Table -->
        <div class="card" style="border:1px solid var(--border)">
          <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--border)">
            <div>
              <h3 style="margin:0;font-size:1.05rem;font-weight:700">Custom PC Configurator Choose Your Pc Parts!</h3>
              <p style="margin:3px 0 0;font-size:.8rem;color:var(--text-secondary)">Select the components to configure your PC to measure.</p>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <label style="display:flex;align-items:center;gap:6px;font-size:.82rem;cursor:pointer;user-select:none;color:var(--text-secondary)">
                <input type="checkbox" id="cfg-show-oos" ${this._showOutOfStock ? 'checked' : ''} onchange="Configurator.toggleShowOos(this.checked)">
                Show out of stock items
              </label>
            </div>
          </div>

          <!-- Compatibility Notification Bar -->
          ${cpu ? `
            <div style="padding:10px 16px;background:#eef2ff;border-bottom:1px solid #c7d2fe;font-size:.83rem;display:flex;align-items:center;gap:8px;color:#3730a3">
              <span class="material-icons" style="font-size:18px;color:#4f46e5">check_circle</span>
              <span><strong>Active CPU Platform:</strong> ${cpu.name.slice(0, 42)}... (${socket || 'Standard Socket'}${mbMem ? ` | Recommended RAM: ${mbMem}` : ''})</span>
            </div>
          ` : ''}

          <!-- Slots List Table -->
          <div class="table-wrap p-0">
            <table class="table" style="margin:0">
              <thead>
                <tr>
                  <th style="width:28%;padding:12px 16px">Component</th>
                  <th style="width:72%;padding:12px 16px">Selection</th>
                </tr>
              </thead>
              <tbody>
                ${this._pcSlotDefs.map(def => this._renderPcSlotRow(def)).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Right: Sticky Live Summary & Actions Panel -->
        <div class="pc-summary-panel" style="position:sticky;top:80px;display:flex;flex-direction:column;gap:14px">
          <!-- Wattage & Summary Card -->
          <div class="card" style="border:1px solid var(--border);box-shadow:var(--shadow-sm)">
            <div class="card-header" style="background:#f8fafc;padding:14px 16px;border-bottom:1px solid var(--border);text-align:center">
              <div style="font-size:.82rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em">Estimated Wattage</div>
              <div style="font-size:1.6rem;font-weight:800;color:var(--primary);margin:4px 0">
                ${estimatedWattage}W
              </div>
              <div style="font-size:.78rem;color:var(--text-muted)">
                ${this._getPsuRecommendation(estimatedWattage)}
              </div>
            </div>

            <div class="card-body" style="padding:16px">
              <div style="text-align:center;margin-bottom:14px">
                <div style="font-size:.82rem;color:var(--text-secondary);font-weight:600">Total Price (Incl. GST):</div>
                <div style="font-size:1.7rem;font-weight:900;color:#059669;margin:4px 0">
                  ${fmtCurrency(totals.total)}
                </div>
                <div style="font-size:.78rem;color:var(--text-muted)">
                  Taxable: ${fmtCurrency(totals.taxable)} + GST: ${fmtCurrency(totals.tax)}
                </div>
              </div>

              <div style="border-top:1px dashed var(--border);padding-top:12px;margin-bottom:16px;font-size:.82rem;color:var(--text-secondary)">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                  <span>Selected Parts:</span>
                  <strong>${selectedCount} of ${this._pcSlotDefs.length}</strong>
                </div>
                <div style="display:flex;justify-content:space-between">
                  <span>Out of Stock Flag:</span>
                  <span style="font-weight:700;color:${totals.hasOutOfStock ? 'var(--danger)' : 'var(--success)'}">
                    ${totals.hasOutOfStock ? '⚠️ Contains Out of Stock' : '✅ 100% In Stock'}
                  </span>
                </div>
              </div>

              <!-- Primary Action Buttons -->
              <div style="display:flex;flex-direction:column;gap:8px">
                <button class="btn btn-primary" onclick="Configurator.createInvoice('pc')" style="width:100%;justify-content:center;padding:10px 14px;font-weight:700">
                  <span class="material-icons">receipt_long</span> Create Tax Invoice
                </button>
                <button class="btn btn-secondary" onclick="Configurator.createQuotation('pc')" style="width:100%;justify-content:center;padding:9px 14px;font-weight:600">
                  <span class="material-icons">request_quote</span> Create Quotation / Estimate
                </button>
                <button class="btn btn-secondary" onclick="Configurator.openSaveBuildModal('pc')" style="width:100%;justify-content:center;padding:9px 14px">
                  <span class="material-icons">bookmark_add</span> Save This Build
                </button>
              </div>

              <!-- Secondary Utility Actions Grid -->
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
                <button class="btn btn-xs btn-ghost" onclick="Configurator.printSpecSheet('pc')" style="justify-content:center">
                  <span class="material-icons" style="font-size:14px">print</span> Print
                </button>
                <button class="btn btn-xs btn-ghost" onclick="Configurator.exportSpecSheetPDF('pc')" style="justify-content:center;color:#e74c3c">
                  <span class="material-icons" style="font-size:14px">picture_as_pdf</span> PDF
                </button>
                <button class="btn btn-xs btn-ghost" onclick="Configurator.shareWhatsApp('pc')" style="justify-content:center;color:#059669">
                  <span class="material-icons" style="font-size:14px">send</span> WhatsApp
                </button>
              </div>
            </div>
          </div>

          <!-- Compatibility Guidance Note -->
          <div style="padding:12px;background:#f8fafc;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.78rem;color:var(--text-secondary);line-height:1.4">
            💡 <strong>Smart Hardware Compatibility:</strong> Motherboard and memory slots automatically match the chosen processor socket. Product prices reflect <strong>exact GST-inclusive rates</strong> ready for billing.
          </div>
        </div>
      </div>
    `;
  },

  _renderPcSlotRow(def) {
    const slot = this._pcSlots[def.key];
    const item = slot?.product;
    const qty = slot?.qty || 1;

    if (!item) {
      return `
        <tr style="border-bottom:1px solid var(--border)">
          <td style="padding:14px 16px;font-weight:600;color:var(--text);font-size:.88rem">
            <div style="display:flex;align-items:center;gap:8px">
              <span class="material-icons" style="font-size:20px;color:var(--text-muted)">${def.icon}</span>
              <span>${def.label}</span>
              ${def.required ? '<span style="color:var(--danger)">*</span>' : ''}
            </div>
          </td>
          <td style="padding:14px 16px">
            <button class="btn btn-sm btn-secondary" onclick="Configurator.openPicker('${def.key}')" style="width:100%;justify-content:space-between;padding:8px 14px;background:#fff;border:1px dashed var(--border)">
              <span style="color:var(--text-secondary)">Choose ${def.label}</span>
              <span class="material-icons" style="font-size:18px;color:var(--primary)">add</span>
            </button>
          </td>
        </tr>
      `;
    }

    const priceWithGst = item.sellingPrice * (1 + (item.gstRate || 18) / 100);
    const lineTotal = priceWithGst * qty;
    const inStock = (item.stock || 0) >= qty;
    const brand = this._detectBrand(item);

    return `
      <tr style="border-bottom:1px solid var(--border);background:#fff">
        <td style="padding:12px 16px;font-weight:600;font-size:.88rem">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="material-icons" style="font-size:20px;color:var(--primary)">${def.icon}</span>
            <span>${def.label}</span>
          </div>
        </td>
        <td style="padding:12px 16px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div style="flex:1;min-width:240px">
              <div style="font-weight:700;font-size:.88rem;color:var(--text);line-height:1.3">
                ${item.name}
              </div>
              <div style="display:flex;align-items:center;gap:8px;margin-top:3px;font-size:.78rem;color:var(--text-secondary)">
                <span style="background:#f1f5f9;padding:1px 6px;border-radius:4px;font-weight:600">${brand}</span>
                <span>SKU: ${item.sku || 'N/A'}</span>
                <span>•</span>
                <span class="badge ${inStock ? 'badge-paid' : 'badge-danger'}" style="font-size:.7rem;padding:1px 6px">
                  ${inStock ? `In Stock (${item.stock})` : 'Out of Stock'}
                </span>
              </div>
            </div>

            <!-- Quantity & Line Pricing -->
            <div style="display:flex;align-items:center;gap:14px">
              <div style="display:flex;align-items:center;gap:4px">
                <span style="font-size:.78rem;color:var(--text-muted)">Qty:</span>
                <input type="number" min="1" max="99" value="${qty}" onchange="Configurator.updateSlotQty('${def.key}', this.value)" style="width:52px;padding:3px 6px;font-size:.82rem;text-align:center;font-weight:700;border:1px solid var(--border);border-radius:4px">
              </div>

              <div style="text-align:right;min-width:110px">
                <div style="font-weight:800;color:var(--text);font-size:.92rem">${fmtCurrency(lineTotal)}</div>
                <div style="font-size:.72rem;color:var(--text-muted)">(${fmtCurrency(priceWithGst)} incl. GST)</div>
              </div>

              <div style="display:flex;gap:4px">
                <button class="btn btn-xs btn-secondary" onclick="Configurator.openPicker('${def.key}')" title="Change component">
                  <span class="material-icons" style="font-size:14px">swap_horiz</span> Change
                </button>
                <button class="btn btn-xs btn-ghost text-danger" onclick="Configurator.clearSlot('${def.key}')" title="Remove component">
                  <span class="material-icons" style="font-size:16px">close</span>
                </button>
              </div>
            </div>
          </div>
        </td>
      </tr>
    `;
  },

  /* PSU Wattage Recommendation string */
  _getPsuRecommendation(watts) {
    if (watts <= 250) return 'Recommended: 450W PSU';
    if (watts <= 350) return 'Recommended: 550W Bronze PSU';
    if (watts <= 480) return 'Recommended: 650W Bronze PSU';
    return 'Recommended: 750W+ Gold PSU';
  },

  /* ──────────────────────────────────────────
     2. CCTV KIT BUNDLER VIEW
  ────────────────────────────────────────── */
  _renderCctvView() {
    const totals = this._calcTotals('cctv');
    const selectedCount = Object.values(this._cctvSlots).filter(Boolean).length;

    return `
      <div style="display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start">
        <!-- Left: CCTV Package Slots -->
        <div class="card" style="border:1px solid var(--border)">
          <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--border)">
            <div>
              <h3 style="margin:0;font-size:1.05rem;font-weight:700">Surveillance CCTV Package Bundler</h3>
              <p style="margin:3px 0 0;font-size:.8rem;color:var(--text-secondary)">Build multi-camera CCTV kits with cameras, DVR/NVR, hard disks, power supplies, and installation.</p>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-xs btn-secondary" onclick="Configurator.loadPreset('cctv_4ch')">
                ⚡ Load Hikvision 4-Cam Preset
              </button>
            </div>
          </div>

          <div class="table-wrap p-0">
            <table class="table" style="margin:0">
              <thead>
                <tr>
                  <th style="width:32%;padding:12px 16px">CCTV Component</th>
                  <th style="width:68%;padding:12px 16px">Selection</th>
                </tr>
              </thead>
              <tbody>
                ${this._cctvSlotDefs.map(def => this._renderCctvSlotRow(def)).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Right: Summary Card -->
        <div class="pc-summary-panel" style="position:sticky;top:80px;display:flex;flex-direction:column;gap:14px">
          <div class="card" style="border:1px solid var(--border);box-shadow:var(--shadow-sm)">
            <div class="card-header" style="background:#f8fafc;padding:14px 16px;border-bottom:1px solid var(--border);text-align:center">
              <div style="font-size:.82rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase">Package Total</div>
              <div style="font-size:1.7rem;font-weight:900;color:#059669;margin:4px 0">
                ${fmtCurrency(totals.total)}
              </div>
              <div style="font-size:.78rem;color:var(--text-muted)">
                Taxable: ${fmtCurrency(totals.taxable)} + GST: ${fmtCurrency(totals.tax)}
              </div>
            </div>

            <div class="card-body" style="padding:16px">
              <div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:14px;color:var(--text-secondary)">
                <span>Components Configured:</span>
                <strong>${selectedCount} of ${this._cctvSlotDefs.length}</strong>
              </div>

              <div style="display:flex;flex-direction:column;gap:8px">
                <button class="btn btn-primary" onclick="Configurator.createInvoice('cctv')" style="width:100%;justify-content:center;padding:10px 14px;font-weight:700">
                  <span class="material-icons">receipt_long</span> Create Tax Invoice
                </button>
                <button class="btn btn-secondary" onclick="Configurator.createQuotation('cctv')" style="width:100%;justify-content:center;padding:9px 14px;font-weight:600">
                  <span class="material-icons">request_quote</span> Create Quotation / Estimate
                </button>
                <button class="btn btn-secondary" onclick="Configurator.openSaveBuildModal('cctv')" style="width:100%;justify-content:center;padding:9px 14px">
                  <span class="material-icons">bookmark_add</span> Save As CCTV Kit
                </button>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
                <button class="btn btn-xs btn-ghost" onclick="Configurator.printSpecSheet('cctv')" style="justify-content:center">
                  <span class="material-icons" style="font-size:14px">print</span> Print
                </button>
                <button class="btn btn-xs btn-ghost" onclick="Configurator.exportSpecSheetPDF('cctv')" style="justify-content:center;color:#e74c3c">
                  <span class="material-icons" style="font-size:14px">picture_as_pdf</span> PDF
                </button>
                <button class="btn btn-xs btn-ghost" onclick="Configurator.shareWhatsApp('cctv')" style="justify-content:center;color:#059669">
                  <span class="material-icons" style="font-size:14px">send</span> WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _renderCctvSlotRow(def) {
    const slot = this._cctvSlots[def.key];
    const item = slot?.product;
    const qty = slot?.qty || def.defaultQty || 1;

    if (!item) {
      return `
        <tr style="border-bottom:1px solid var(--border)">
          <td style="padding:14px 16px;font-weight:600;font-size:.88rem">
            <div style="display:flex;align-items:center;gap:8px">
              <span class="material-icons" style="font-size:20px;color:var(--text-muted)">${def.icon}</span>
              <span>${def.label}</span>
            </div>
          </td>
          <td style="padding:14px 16px">
            <button class="btn btn-sm btn-secondary" onclick="Configurator.openPicker('${def.key}', 'cctv')" style="width:100%;justify-content:space-between;padding:8px 14px;background:#fff;border:1px dashed var(--border)">
              <span style="color:var(--text-secondary)">Choose ${def.label}</span>
              <span class="material-icons" style="font-size:18px;color:var(--primary)">add</span>
            </button>
          </td>
        </tr>
      `;
    }

    const priceWithGst = item.sellingPrice * (1 + (item.gstRate || 18) / 100);
    const lineTotal = priceWithGst * qty;
    const inStock = (item.stock || 0) >= qty;

    return `
      <tr style="border-bottom:1px solid var(--border);background:#fff">
        <td style="padding:12px 16px;font-weight:600;font-size:.88rem">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="material-icons" style="font-size:20px;color:var(--primary)">${def.icon}</span>
            <span>${def.label}</span>
          </div>
        </td>
        <td style="padding:12px 16px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div style="flex:1;min-width:220px">
              <div style="font-weight:700;font-size:.88rem;color:var(--text)">${item.name}</div>
              <div style="font-size:.78rem;color:var(--text-secondary);margin-top:2px">
                SKU: ${item.sku || 'N/A'} • <span class="badge ${inStock ? 'badge-paid' : 'badge-danger'}" style="font-size:.7rem;padding:1px 6px">${inStock ? `In Stock (${item.stock})` : 'Out of Stock'}</span>
              </div>
            </div>

            <div style="display:flex;align-items:center;gap:14px">
              <div style="display:flex;align-items:center;gap:4px">
                <span style="font-size:.78rem;color:var(--text-muted)">Qty:</span>
                <input type="number" min="1" max="999" value="${qty}" onchange="Configurator.updateSlotQty('${def.key}', this.value, 'cctv')" style="width:55px;padding:3px 6px;font-size:.82rem;text-align:center;font-weight:700;border:1px solid var(--border);border-radius:4px">
              </div>

              <div style="text-align:right;min-width:110px">
                <div style="font-weight:800;color:var(--text);font-size:.92rem">${fmtCurrency(lineTotal)}</div>
                <div style="font-size:.72rem;color:var(--text-muted)">(${fmtCurrency(priceWithGst)} ea.)</div>
              </div>

              <div style="display:flex;gap:4px">
                <button class="btn btn-xs btn-secondary" onclick="Configurator.openPicker('${def.key}', 'cctv')">
                  <span class="material-icons" style="font-size:14px">swap_horiz</span> Change
                </button>
                <button class="btn btn-xs btn-ghost text-danger" onclick="Configurator.clearSlot('${def.key}', 'cctv')">
                  <span class="material-icons" style="font-size:16px">close</span>
                </button>
              </div>
            </div>
          </div>
        </td>
      </tr>
    `;
  },

  /* ──────────────────────────────────────────
     3. SAVED BUNDLES TEMPLATES VIEW
  ────────────────────────────────────────── */
  _renderTemplatesView() {
    const bundles = DB.getBundles();
    if (!bundles.length) {
      return `
        <div class="card" style="padding:40px;text-align:center">
          <span class="material-icons" style="font-size:48px;color:var(--text-muted)">bookmark_border</span>
          <h3 style="margin:12px 0 6px">No Saved Bundles Yet</h3>
          <p style="color:var(--text-secondary);font-size:.88rem;max-width:440px;margin:0 auto 16px">
            Configure a custom PC or CCTV kit, then click <strong>"Save This Build"</strong> to store it as a reusable template.
          </p>
          <button class="btn btn-primary" onclick="Configurator.switchTab('pc')">Start Building PC</button>
        </div>
      `;
    }

    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(360px, 1fr));gap:16px">
        ${bundles.map(b => {
          const isPc = b.type === 'pc';
          const itemsCount = (b.items || []).length;
          const totals = calcTotals(b.items || [], '27', '27');

          return `
            <div class="card" style="border:1px solid var(--border);display:flex;flex-direction:column;justify-content:space-between">
              <div class="card-header" style="display:flex;justify-content:space-between;align-items:flex-start;padding:14px 16px">
                <div>
                  <span class="badge ${isPc ? 'badge-info' : 'badge-paid'}" style="font-size:.72rem;margin-bottom:6px">
                    ${isPc ? '🖥️ Custom PC Build' : '📹 CCTV Package'}
                  </span>
                  <h3 style="margin:0;font-size:1rem;font-weight:700">${b.name}</h3>
                </div>
                <button class="btn btn-xs btn-ghost text-danger" onclick="Configurator.deleteTemplate('${b.id}')" title="Delete bundle">
                  <span class="material-icons" style="font-size:16px">delete</span>
                </button>
              </div>

              <div class="card-body" style="padding:0 16px 14px">
                <p style="font-size:.82rem;color:var(--text-secondary);margin:0 0 10px;line-height:1.4">
                  ${b.description || 'Pre-configured hardware package.'}
                </p>

                <div style="background:#f8fafc;padding:10px 12px;border-radius:var(--radius-sm);margin-bottom:12px;font-size:.8rem">
                  <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                    <span style="color:var(--text-secondary)">Total Items:</span>
                    <strong>${itemsCount} parts</strong>
                  </div>
                  ${b.estimatedWattage ? `
                    <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                      <span style="color:var(--text-secondary)">Power Rating:</span>
                      <strong>~${b.estimatedWattage}W</strong>
                    </div>
                  ` : ''}
                  <div style="display:flex;justify-content:space-between;font-size:.9rem;padding-top:4px;border-top:1px dashed var(--border)">
                    <span style="font-weight:700">Total Price:</span>
                    <strong style="color:#059669">${fmtCurrency(totals.total)} (incl. GST)</strong>
                  </div>
                </div>

                <div style="display:flex;gap:6px">
                  <button class="btn btn-xs btn-secondary" onclick="Configurator.loadBundleToWorkspace('${b.id}')" style="flex:1;justify-content:center">
                    <span class="material-icons" style="font-size:14px">edit</span> Load &amp; Edit
                  </button>
                  <button class="btn btn-xs btn-primary" onclick="Configurator.loadTemplateToBilling('${b.id}', 'sales')" style="flex:1;justify-content:center">
                    <span class="material-icons" style="font-size:14px">receipt</span> 1-Click Invoice
                  </button>
                  <button class="btn btn-xs btn-secondary" onclick="Configurator.loadTemplateToBilling('${b.id}', 'quotation')" style="flex:1;justify-content:center">
                    <span class="material-icons" style="font-size:14px">request_quote</span> Quote
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  /* ──────────────────────────────────────────
     4. COMPONENT PICKER MODAL (Matches User Screenshots)
  ────────────────────────────────────────── */
  openPicker(slotKey, mode = 'pc') {
    const isPc = mode === 'pc';
    const def = isPc
      ? this._pcSlotDefs.find(d => d.key === slotKey)
      : this._cctvSlotDefs.find(d => d.key === slotKey);
    if (!def) return;

    window._cfgCurrentPicker = { slotKey, mode, def };
    window._cfgFilterBrand = '';
    window._cfgFilterSub = '';
    window._cfgSearchQuery = '';
    window._cfgSortBy = 'name_asc';

    const modalTitle = `${def.label} — Choose ${def.label}`;

    App.modal(
      modalTitle,
      `
      <div id="cfg-picker-container" style="min-height:480px">
        <!-- Filter Controls Bar matching screenshots -->
        <div class="cfg-filter-bar" style="display:grid;grid-template-columns:140px 160px 1fr 140px;gap:10px;margin-bottom:14px;align-items:center">
          <!-- Filter 1: Brand -->
          <div class="form-group" style="margin:0">
            <select id="cfg-filter-brand" onchange="Configurator._onPickerFilterChange()" style="font-size:.85rem;padding:6px 10px;font-weight:600">
              <option value="">Choose A Brand</option>
              ${this._getBrandOptions(def)}
            </select>
          </div>

          <!-- Filter 2: Dynamic CPU / Chipset / Spec Filter -->
          <div class="form-group" style="margin:0">
            <select id="cfg-filter-sub" onchange="Configurator._onPickerFilterChange()" style="font-size:.85rem;padding:6px 10px;font-weight:600">
              ${this._getSubFilterOptions(def)}
            </select>
          </div>

          <!-- Filter 3: Search Bar with Red Search Button -->
          <div style="display:flex;gap:6px">
            <input type="text" id="cfg-filter-search" placeholder="Search Your ${def.label}..." oninput="Configurator._onPickerFilterChange()" style="font-size:.85rem;padding:6px 10px;flex:1">
            <button class="btn btn-sm btn-danger" onclick="Configurator._onPickerFilterChange()" style="padding:6px 12px;background:#e11d48;border-color:#e11d48">
              <span class="material-icons" style="font-size:16px">search</span>
            </button>
          </div>

          <!-- Filter 4: Sort Dropdown -->
          <div class="form-group" style="margin:0">
            <select id="cfg-filter-sort" onchange="Configurator._onPickerFilterChange()" style="font-size:.85rem;padding:6px 10px">
              <option value="name_asc">Name (A - Z)</option>
              <option value="name_desc">Name (Z - A)</option>
              <option value="price_asc">Price (Low to High)</option>
              <option value="price_desc">Price (High to Low)</option>
            </select>
          </div>
        </div>

        <!-- Stock Availability Filter Switch -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 2px;margin-bottom:10px;font-size:.82rem;color:var(--text-secondary)">
          <span id="cfg-results-count">Loading products...</span>
          <label style="cursor:pointer;display:flex;align-items:center;gap:6px">
            <input type="checkbox" id="cfg-modal-show-oos" ${this._showOutOfStock ? 'checked' : ''} onchange="Configurator._toggleModalOos(this.checked)">
            Show out of stock items
          </label>
        </div>

        <!-- Results Table -->
        <div class="table-wrap" style="max-height:420px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm)">
          <table class="table" style="margin:0;font-size:.85rem">
            <thead style="position:sticky;top:0;background:#f8fafc;z-index:2">
              <tr>
                <th style="width:7%;text-align:center">Image</th>
                <th style="width:36%">Product Name</th>
                <th style="width:16%">Model / SKU</th>
                <th style="width:17%">Unit Price (Incl. GST)</th>
                <th style="width:12%">Availability</th>
                <th style="width:6%;text-align:center">Quantity</th>
                <th style="width:10%;text-align:center">Action</th>
              </tr>
            </thead>
            <tbody id="cfg-picker-tbody">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>
      </div>
      `,
      `
      <button class="btn btn-ghost" onclick="App.closeModal()">Close</button>
      `,
      'modal-xl'
    );

    this._renderPickerList();
  },

  _getBrandOptions(def) {
    const allProds = DB.getProducts();
    const brands = new Set();
    allProds.forEach(p => {
      const b = this._detectBrand(p);
      if (b && b !== 'OTHER') brands.add(b);
    });
    return Array.from(brands).sort().map(b => `<option value="${b}">${b}</option>`).join('');
  },

  _getSubFilterOptions(def) {
    const k = def.key;
    if (k === 'cpu') {
      return `
        <option value="">Choose Your CPU</option>
        <option value="Core i3">Core i3</option>
        <option value="Core i5">Core i5</option>
        <option value="Core i7">Core i7</option>
        <option value="Core i9">Core i9</option>
        <option value="Core Ultra">Core Ultra</option>
        <option value="Ryzen 3">Ryzen 3</option>
        <option value="Ryzen 5">Ryzen 5</option>
        <option value="Ryzen 7">Ryzen 7</option>
        <option value="Ryzen 9">Ryzen 9</option>
        <option value="Ryzen Threadripper">Ryzen Threadripper</option>
        <option value="Pentium">Pentium</option>
        <option value="Athlon">Athlon</option>
      `;
    }
    if (k === 'motherboard') {
      const cpu = this._pcSlots.cpu?.product;
      const socket = this._detectSocket(cpu);
      const compatChips = this._getCompatibleChipsets(socket);

      return `
        <option value="">Choose Your Chipset</option>
        ${compatChips.length ? `<optgroup label="Compatible with ${socket}">` + compatChips.map(c => `<option value="${c}">${c} (Compatible)</option>`).join('') + `</optgroup>` : ''}
        <optgroup label="All Chipsets">
          <option value="H610">H610</option>
          <option value="B760">B760</option>
          <option value="Z790">Z790</option>
          <option value="B660">B660</option>
          <option value="A520">A520</option>
          <option value="B550">B550</option>
          <option value="X570">X570</option>
          <option value="A620">A620</option>
          <option value="B650">B650</option>
          <option value="X670">X670</option>
          <option value="B450">B450</option>
          <option value="A320">A320</option>
        </optgroup>
      `;
    }
    if (k === 'ram') {
      return `
        <option value="">Choose RAM Type</option>
        <option value="DDR4">DDR4 Memory</option>
        <option value="DDR5">DDR5 Memory</option>
        <option value="8GB">8GB Modules</option>
        <option value="16GB">16GB Modules</option>
        <option value="32GB">32GB Kits</option>
      `;
    }
    if (k.includes('ssd') || k === 'hdd') {
      return `
        <option value="">Choose Capacity</option>
        <option value="256GB">240GB - 256GB</option>
        <option value="500GB">500GB - 512GB</option>
        <option value="1TB">1TB</option>
        <option value="2TB">2TB</option>
        <option value="4TB">4TB+</option>
      `;
    }
    if (k === 'gpu') {
      return `
        <option value="">Choose GPU Series</option>
        <option value="1650">GTX 1650</option>
        <option value="3060">RTX 3060</option>
        <option value="4060">RTX 4060</option>
        <option value="4070">RTX 4070</option>
        <option value="Radeon">AMD Radeon</option>
      `;
    }
    if (k === 'psu') {
      return `
        <option value="">Choose Wattage</option>
        <option value="450">450 Watts</option>
        <option value="550">550 Watts</option>
        <option value="650">650 Watts</option>
        <option value="750">750+ Watts</option>
      `;
    }
    return `<option value="">All Categories</option>`;
  },

  _onPickerFilterChange() {
    window._cfgFilterBrand = document.getElementById('cfg-filter-brand')?.value || '';
    window._cfgFilterSub   = document.getElementById('cfg-filter-sub')?.value || '';
    window._cfgSearchQuery = document.getElementById('cfg-filter-search')?.value || '';
    window._cfgSortBy      = document.getElementById('cfg-filter-sort')?.value || 'name_asc';
    this._renderPickerList();
  },

  _toggleModalOos(checked) {
    this._showOutOfStock = checked;
    const topCb = document.getElementById('cfg-show-oos');
    if (topCb) topCb.checked = checked;
    this._renderPickerList();
  },

  toggleShowOos(checked) {
    this._showOutOfStock = checked;
    this.render(document.getElementById('page-content'));
  },

  _renderPickerList() {
    const tbody = document.getElementById('cfg-picker-tbody');
    const countEl = document.getElementById('cfg-results-count');
    if (!tbody || !window._cfgCurrentPicker) return;

    const { slotKey, mode, def } = window._cfgCurrentPicker;
    const allProducts = DB.getProducts();

    // 1. Initial category filter
    let list = allProducts.filter(p => {
      const pCat = (p.category || '').toLowerCase();
      const defCat = (def.category || '').toLowerCase();
      const pName = (p.name || '').toLowerCase();

      // Matching heuristics
      if (pCat === defCat) return true;
      if (slotKey === 'cpu' && (pCat.includes('processor') || pName.includes('core i') || pName.includes('ryzen'))) return true;
      if (slotKey === 'motherboard' && (pCat.includes('motherboard') || pName.includes('motherboard'))) return true;
      if (slotKey === 'ram' && (pCat.includes('ram') || pCat.includes('memory') || pName.includes('ddr4') || pName.includes('ddr5'))) return true;
      if (slotKey === 'ssd_m2' && (pName.includes('m.2') || pName.includes('nvme'))) return true;
      if (slotKey === 'ssd_sata' && (pName.includes('sata') && pName.includes('ssd'))) return true;
      if (slotKey === 'hdd' && (pName.includes('hdd') || pName.includes('hard drive') || pName.includes('skyhawk') || pName.includes('purple'))) return true;
      if (slotKey === 'gpu' && (pCat.includes('graphics') || pName.includes('rtx') || pName.includes('gtx') || pName.includes('geforce'))) return true;
      if (slotKey === 'cabinet' && (pCat.includes('cabinet') || pName.includes('cabinet') || pName.includes('tower'))) return true;
      if (slotKey === 'psu' && (pCat.includes('power') || pCat.includes('smps') || pName.includes('psu') || pName.includes('power supply'))) return true;
      if (slotKey === 'cooler' && (pCat.includes('cooler') || pName.includes('cooler') || pName.includes('aio'))) return true;
      if (slotKey === 'monitor' && (pCat.includes('monitor') || pName.includes('monitor') || pName.includes('display'))) return true;
      if (slotKey === 'keyboard_mouse' && (pCat.includes('keyboard') || pName.includes('keyboard') || pName.includes('mouse'))) return true;

      // CCTV mappings
      if (mode === 'cctv') {
        if (slotKey === 'dvr_nvr' && (pName.includes('dvr') || pName.includes('nvr'))) return true;
        if (slotKey === 'dome_cameras' && (pName.includes('dome'))) return true;
        if (slotKey === 'bullet_cameras' && (pName.includes('bullet'))) return true;
        if (slotKey === 'hard_drive' && (pName.includes('skyhawk') || pName.includes('purple') || pName.includes('hdd') || pName.includes('surveillance'))) return true;
        if (slotKey === 'power_supply' && (pName.includes('cctv') && pName.includes('smps') || pName.includes('power supply'))) return true;
        if (slotKey === 'cables' && (pName.includes('cable') || pName.includes('cat6') || pName.includes('3+1'))) return true;
        if (slotKey === 'connectors' && (pName.includes('bnc') || pName.includes('connector'))) return true;
        if (slotKey === 'rack' && (pName.includes('rack'))) return true;
        if (slotKey === 'installation' && (pCat.includes('installation') || pName.includes('installation') || pName.includes('setup'))) return true;
      }

      return false;
    });

    // 2. Compatibility filters (Socket & Chipset)
    if (mode === 'pc') {
      const chosenCpu = this._pcSlots.cpu?.product;
      const cpuSocket = this._detectSocket(chosenCpu);

      if (slotKey === 'motherboard' && cpuSocket) {
        // Tag compatibility or filter
        list = list.filter(mb => {
          const mbSocket = this._detectSocket(mb);
          if (!mbSocket) return true; // keep if unknown
          return mbSocket === cpuSocket;
        });
      }

      const chosenMb = this._pcSlots.motherboard?.product;
      const mbMemType = this._detectMemoryType(chosenMb);
      if (slotKey === 'ram' && mbMemType) {
        list = list.filter(ram => {
          const ramMemType = this._detectMemoryType(ram);
          if (!ramMemType) return true;
          return ramMemType === mbMemType;
        });
      }
    }

    // 3. User Filter: Brand
    if (window._cfgFilterBrand) {
      list = list.filter(p => this._detectBrand(p) === window._cfgFilterBrand);
    }

    // 4. User Filter: Sub-filter (CPU family / Chipset / etc.)
    if (window._cfgFilterSub) {
      const sub = window._cfgFilterSub.toLowerCase();
      list = list.filter(p => {
        const fullTxt = `${p.name} ${p.sku || ''} ${p.chipset || ''} ${p.socket || ''}`.toLowerCase();
        return fullTxt.includes(sub);
      });
    }

    // 5. User Filter: Search Query
    if (window._cfgSearchQuery) {
      const q = window._cfgSearchQuery.toLowerCase().trim();
      list = list.filter(p => {
        return (p.name || '').toLowerCase().includes(q) ||
               (p.sku || '').toLowerCase().includes(q) ||
               (p.barcode || '').toLowerCase().includes(q);
      });
    }

    // 6. Out of stock filter
    if (!this._showOutOfStock) {
      list = list.filter(p => (p.stock || 0) > 0);
    }

    // 7. Sorting
    list.sort((a, b) => {
      const priceA = a.sellingPrice * (1 + (a.gstRate || 18) / 100);
      const priceB = b.sellingPrice * (1 + (b.gstRate || 18) / 100);
      if (window._cfgSortBy === 'price_asc') return priceA - priceB;
      if (window._cfgSortBy === 'price_desc') return priceB - priceA;
      if (window._cfgSortBy === 'name_desc') return b.name.localeCompare(a.name);
      return a.name.localeCompare(b.name);
    });

    if (countEl) {
      countEl.innerHTML = `Showing <strong>${list.length}</strong> items available`;
    }

    if (!list.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">
            <span class="material-icons" style="font-size:36px">search_off</span>
            <div style="font-weight:600;margin-top:6px">No products found matching your filters</div>
            <div style="font-size:.8rem;margin-top:4px">Try clearing filters or enabling "Show out of stock items"</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(item => {
      const gstRate = item.gstRate || 18;
      const priceWithGst = item.sellingPrice * (1 + gstRate / 100);
      const inStock = (item.stock || 0) > 0;
      const brand = this._detectBrand(item);

      return `
        <tr style="border-bottom:1px solid var(--border);transition:background .15s" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
          <!-- Image Icon -->
          <td style="text-align:center;padding:10px 8px">
            <div style="width:36px;height:36px;background:#f1f5f9;border-radius:6px;display:flex;align-items:center;justify-content:center;margin:0 auto">
              <span class="material-icons" style="font-size:20px;color:var(--text-secondary)">${def.icon}</span>
            </div>
          </td>

          <!-- Product Name -->
          <td style="padding:10px 12px">
            <div style="font-weight:700;color:var(--text);line-height:1.35">${item.name}</div>
            <div style="font-size:.76rem;color:var(--text-secondary);margin-top:2px">
              <span style="background:#e2e8f0;padding:1px 5px;border-radius:3px;font-weight:600">${brand}</span>
              ${item.warranty ? `<span>• ${item.warranty}</span>` : ''}
            </div>
          </td>

          <!-- Model / SKU -->
          <td style="padding:10px 12px;font-family:var(--font-mono);font-size:.8rem;color:var(--text-secondary)">
            ${item.sku || 'N/A'}
          </td>

          <!-- Unit Price (GST Inclusive) -->
          <td style="padding:10px 12px">
            <div style="font-size:1.05rem;font-weight:800;color:#0f172a">
              ${fmtCurrency(priceWithGst)}
            </div>
            <div style="font-size:.72rem;color:var(--text-muted)">
              ${fmtCurrency(item.sellingPrice)} + ${gstRate}% GST
            </div>
          </td>

          <!-- Availability -->
          <td style="padding:10px 12px">
            <span class="badge ${inStock ? 'badge-paid' : 'badge-danger'}" style="font-size:.75rem;padding:3px 8px;font-weight:700">
              ${inStock ? `In Stock (${item.stock})` : 'Out of Stock'}
            </span>
          </td>

          <!-- Quantity Input -->
          <td style="padding:10px 8px;text-align:center">
            <input type="number" id="cfg-qty-${item.id}" min="1" max="99" value="1" style="width:48px;padding:4px;font-size:.85rem;text-align:center;font-weight:700;border:1px solid var(--border);border-radius:4px">
          </td>

          <!-- Add Button (Red Button matching screenshot) -->
          <td style="padding:10px 12px;text-align:center">
            <button class="btn btn-sm btn-danger" onclick="Configurator._selectProduct('${item.id}', '${slotKey}', '${mode}')" style="background:#e11d48;border-color:#e11d48;padding:6px 14px;font-weight:700;white-space:nowrap">
              Add To List
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  _selectProduct(productId, slotKey, mode) {
    const p = DB.getProductById(productId);
    if (!p) return;

    const qtyInput = document.getElementById(`cfg-qty-${productId}`);
    const qty = parseInt(qtyInput?.value, 10) || 1;

    if (mode === 'cctv') {
      this._cctvSlots[slotKey] = { product: p, qty };
    } else {
      this._pcSlots[slotKey] = { product: p, qty };

      // Auto-check CPU & Motherboard compatibility
      if (slotKey === 'cpu') {
        const mb = this._pcSlots.motherboard?.product;
        if (mb) {
          const cpuSocket = this._detectSocket(p);
          const mbSocket = this._detectSocket(mb);
          if (cpuSocket && mbSocket && cpuSocket !== mbSocket) {
            App.toast(`Notice: Existing motherboard (${mb.name.slice(0, 24)}...) is ${mbSocket}, but new CPU requires ${cpuSocket}. Please update Motherboard.`, 'warning');
            this._pcSlots.motherboard = null;
          }
        }
      }
    }

    App.closeModal();
    App.toast(`Added ${p.name.slice(0, 28)}... to configuration.`, 'success');
    this.render(document.getElementById('page-content'));
  },

  updateSlotQty(slotKey, newQty, mode = 'pc') {
    const q = parseInt(newQty, 10) || 1;
    if (mode === 'cctv') {
      if (this._cctvSlots[slotKey]) this._cctvSlots[slotKey].qty = Math.max(1, q);
    } else {
      if (this._pcSlots[slotKey]) this._pcSlots[slotKey].qty = Math.max(1, q);
    }
    this.render(document.getElementById('page-content'));
  },

  clearSlot(slotKey, mode = 'pc') {
    if (mode === 'cctv') {
      this._cctvSlots[slotKey] = null;
    } else {
      this._pcSlots[slotKey] = null;
    }
    this.render(document.getElementById('page-content'));
  },

  resetCurrent() {
    if (this._activeTab === 'cctv') {
      Object.keys(this._cctvSlots).forEach(k => { this._cctvSlots[k] = null; });
    } else {
      Object.keys(this._pcSlots).forEach(k => { this._pcSlots[k] = null; });
    }
    App.toast('Configurator cleared.', 'info');
    this.render(document.getElementById('page-content'));
  },

  /* ──────────────────────────────────────────
     CALCULATE TOTALS (WITH GST)
  ────────────────────────────────────────── */
  _calcTotals(mode = 'pc') {
    const slots = mode === 'cctv' ? this._cctvSlots : this._pcSlots;
    let taxable = 0;
    let tax = 0;
    let total = 0;
    let hasOutOfStock = false;

    Object.values(slots).forEach(s => {
      if (!s || !s.product) return;
      const p = s.product;
      const qty = s.qty || 1;
      const rate = p.sellingPrice || 0;
      const gstRate = p.gstRate || 18;
      const lineTaxable = rate * qty;
      const lineTax = lineTaxable * (gstRate / 100);

      taxable += lineTaxable;
      tax += lineTax;
      total += (lineTaxable + lineTax);

      if ((p.stock || 0) < qty) {
        hasOutOfStock = true;
      }
    });

    return { taxable, tax, total, hasOutOfStock };
  },

  /* ──────────────────────────────────────────
     1-CLICK CONVERSION TO BILLING / QUOTATION
  ────────────────────────────────────────── */
  _prepareLineItems(mode = 'pc') {
    const slots = mode === 'cctv' ? this._cctvSlots : this._pcSlots;
    const items = [];

    Object.entries(slots).forEach(([k, s]) => {
      if (!s || !s.product) return;
      const p = s.product;
      const qty = s.qty || 1;
      items.push({
        productId: p.id,
        name: p.name,
        sku: p.sku || '',
        hsn: p.hsn || '8471',
        unit: p.unit || 'Nos',
        qty,
        rate: p.sellingPrice || 0,
        discount: 0,
        gstRate: p.gstRate || 18,
        warranty: p.warranty || ''
      });
    });

    return items;
  },

  createInvoice(mode = 'pc') {
    const items = this._prepareLineItems(mode);
    if (!items.length) {
      App.toast('Please select at least one component before creating an invoice.', 'warning');
      return;
    }

    // Check inventory stock availability
    const outOfStockItems = [];
    items.forEach(it => {
      const p = DB.getProductById(it.productId);
      if (p && (p.stock || 0) < it.qty) {
        outOfStockItems.push(`${p.name} (Stock: ${p.stock || 0}, Need: ${it.qty})`);
      }
    });

    if (outOfStockItems.length > 0) {
      App.modal(
        '⚠️ Inventory Stock Alert',
        `
        <div style="padding:10px 4px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;color:var(--danger)">
            <span class="material-icons" style="font-size:28px">warning</span>
            <strong>Cannot create Tax Invoice: Missing Inventory Stock</strong>
          </div>
          <p style="font-size:.85rem;color:var(--text-secondary);margin-bottom:12px">
            The following selected products do not have enough stock in inventory to be billed immediately:
          </p>
          <ul style="background:#fff1f2;border:1px solid #fecdd3;border-radius:var(--radius-sm);padding:10px 24px;font-size:.83rem;color:#9f1239;margin:0 0 16px">
            ${outOfStockItems.map(txt => `<li>${txt}</li>`).join('')}
          </ul>
          <p style="font-size:.85rem;color:var(--text)">
            💡 <strong>Recommended:</strong> Would you like to create a <strong>Quotation / Estimate</strong> instead for this customer?
          </p>
        </div>
        `,
        `
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="App.closeModal();Configurator.createQuotation('${mode}')">
          <span class="material-icons">request_quote</span> Create Quotation Instead
        </button>
        `,
        'modal-md'
      );
      return;
    }

    // Launch Billing sales invoice pre-populated with items
    Billing.openForm('sales', {
      items,
      notes: mode === 'pc' ? 'Custom Assembled PC Configuration.' : 'Surveillance CCTV Package Installation.'
    });
  },

  createQuotation(mode = 'pc') {
    const items = this._prepareLineItems(mode);
    if (!items.length) {
      App.toast('Please select at least one component before creating a quotation.', 'warning');
      return;
    }

    Billing.openQuotationForm(null, {
      items,
      notes: mode === 'pc'
        ? `1. Quotation for Custom Assembled PC Configuration.\n2. Prices are valid for 15 days from date.\n3. Hardware warranty as per manufacturer terms.\n4. GST included as per applicable rates.`
        : `1. Quotation for CCTV Surveillance Security System.\n2. Installation, cabling & network setup included.\n3. Hardware warranty as per manufacturer terms.\n4. GST included as per applicable rates.`
    });
  },

  /* ──────────────────────────────────────────
     SAVE BUILD AS REUSABLE BUNDLE TEMPLATE
  ────────────────────────────────────────── */
  openSaveBuildModal(mode = 'pc') {
    const items = this._prepareLineItems(mode);
    if (!items.length) {
      App.toast('Please select components before saving as a template.', 'warning');
      return;
    }

    const defaultName = mode === 'pc'
      ? `${this._pcSlots.cpu?.product?.name.slice(0, 24) || 'Custom'} Desktop Kit`
      : 'Hikvision / CP PLUS Surveillance Kit';
    const wattage = mode === 'pc' ? this._calcEstimatedWattage() : 60;

    App.modal(
      '💾 Save Package Bundle Template',
      `
      <div class="form-grid">
        <div class="form-group form-full">
          <label>Template / Bundle Name <span class="required">*</span></label>
          <input type="text" id="cfg-save-name" value="${defaultName}" placeholder="e.g. Core i5 12th Gen Office PC">
        </div>
        <div class="form-group form-full">
          <label>Description / Usage Note</label>
          <textarea id="cfg-save-desc" rows="3" placeholder="Description of configuration, target audience, performance level..."></textarea>
        </div>
      </div>
      `,
      `
      <button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="Configurator._executeSaveBuild('${mode}', ${wattage})">
        <span class="material-icons">save</span> Save Bundle
      </button>
      `,
      'modal-md'
    );
  },

  _executeSaveBuild(mode, wattage) {
    const name = document.getElementById('cfg-save-name')?.value.trim();
    const desc = document.getElementById('cfg-save-desc')?.value.trim();
    if (!name) {
      App.toast('Please enter a bundle template name.', 'warning');
      return;
    }

    const items = this._prepareLineItems(mode);
    DB.saveBundle({
      name,
      description: desc,
      type: mode,
      estimatedWattage: wattage,
      items
    });

    App.closeModal();
    App.toast(`Bundle "${name}" saved to templates library!`, 'success');
  },

  openTemplatesModal() {
    this.switchTab('templates');
  },

  loadBundleToWorkspace(bundleId) {
    const b = DB.getBundleById(bundleId);
    if (!b) return;

    if (b.type === 'cctv') {
      this._activeTab = 'cctv';
      Object.keys(this._cctvSlots).forEach(k => { this._cctvSlots[k] = null; });
      (b.items || []).forEach(it => {
        const p = DB.getProductById(it.productId);
        if (!p) return;
        const name = p.name.toLowerCase();
        if (name.includes('dvr') || name.includes('nvr')) this._cctvSlots.dvr_nvr = { product: p, qty: it.qty };
        else if (name.includes('dome')) this._cctvSlots.dome_cameras = { product: p, qty: it.qty };
        else if (name.includes('bullet')) this._cctvSlots.bullet_cameras = { product: p, qty: it.qty };
        else if (name.includes('hard') || name.includes('skyhawk') || name.includes('purple')) this._cctvSlots.hard_drive = { product: p, qty: it.qty };
        else if (name.includes('smps') || name.includes('power')) this._cctvSlots.power_supply = { product: p, qty: it.qty };
        else if (name.includes('cable')) this._cctvSlots.cables = { product: p, qty: it.qty };
        else if (name.includes('bnc') || name.includes('connector')) this._cctvSlots.connectors = { product: p, qty: it.qty };
        else if (name.includes('rack')) this._cctvSlots.rack = { product: p, qty: it.qty };
        else if (name.includes('installation') || name.includes('service')) this._cctvSlots.installation = { product: p, qty: it.qty };
      });
    } else {
      this._activeTab = 'pc';
      Object.keys(this._pcSlots).forEach(k => { this._pcSlots[k] = null; });
      (b.items || []).forEach(it => {
        const p = DB.getProductById(it.productId);
        if (!p) return;
        const name = p.name.toLowerCase();
        const cat = (p.category || '').toLowerCase();
        if (cat.includes('processor') || name.includes('core i') || name.includes('ryzen')) this._pcSlots.cpu = { product: p, qty: it.qty };
        else if (cat.includes('motherboard') || name.includes('motherboard')) this._pcSlots.motherboard = { product: p, qty: it.qty };
        else if (cat.includes('ram') || cat.includes('memory') || name.includes('ddr4') || name.includes('ddr5')) this._pcSlots.ram = { product: p, qty: it.qty };
        else if (name.includes('m.2') || name.includes('nvme')) this._pcSlots.ssd_m2 = { product: p, qty: it.qty };
        else if (name.includes('sata')) this._pcSlots.ssd_sata = { product: p, qty: it.qty };
        else if (name.includes('hdd') || name.includes('hard drive')) this._pcSlots.hdd = { product: p, qty: it.qty };
        else if (cat.includes('graphics') || name.includes('rtx') || name.includes('gtx')) this._pcSlots.gpu = { product: p, qty: it.qty };
        else if (cat.includes('cabinet') || name.includes('cabinet')) this._pcSlots.cabinet = { product: p, qty: it.qty };
        else if (cat.includes('power') || name.includes('psu') || name.includes('smps')) this._pcSlots.psu = { product: p, qty: it.qty };
        else if (cat.includes('cooler') || name.includes('cooler')) this._pcSlots.cooler = { product: p, qty: it.qty };
        else if (cat.includes('monitor') || name.includes('monitor')) this._pcSlots.monitor = { product: p, qty: it.qty };
        else if (name.includes('keyboard') || name.includes('mouse')) this._pcSlots.keyboard_mouse = { product: p, qty: it.qty };
      });
    }

    App.toast(`Loaded "${b.name}" into workspace!`, 'success');
    this.render(document.getElementById('page-content'));
  },

  loadTemplateToBilling(bundleId, type = 'sales') {
    const b = DB.getBundleById(bundleId);
    if (!b || !b.items || !b.items.length) return;

    if (type === 'sales') {
      Billing.openForm('sales', {
        items: b.items,
        notes: `Loaded from template: ${b.name}`
      });
    } else {
      Billing.openQuotationForm(null, {
        items: b.items,
        notes: `1. Package quotation: ${b.name}.\n2. Prices valid for 15 days.\n3. GST included.`
      });
    }
  },

  deleteTemplate(bundleId) {
    if (!confirm('Are you sure you want to delete this bundle template?')) return;
    DB.deleteBundle(bundleId);
    App.toast('Bundle deleted.', 'info');
    this.render(document.getElementById('page-content'));
  },

  loadPreset(presetId) {
    if (presetId === 'cctv_4ch') {
      const allProds = DB.getProducts();
      const findP = (sku) => allProds.find(p => p.sku === sku);

      this._cctvSlots.dvr_nvr = { product: findP('CCTV-HK-DVR4') || allProds.find(p => p.sku === 'HKV-DS-7608NI'), qty: 1 };
      this._cctvSlots.dome_cameras = { product: findP('CCTV-CP-DOM') || allProds.find(p => p.sku === 'HKV-DS-2CD2121'), qty: 2 };
      this._cctvSlots.bullet_cameras = { product: findP('CCTV-CP-BUL') || allProds.find(p => p.sku === 'HKV-DS-2CD2T56'), qty: 2 };
      this._cctvSlots.hard_drive = { product: allProds.find(p => p.sku === 'SEG-SK2TB') || findP('HDD-WD-4TB-PUR'), qty: 1 };
      this._cctvSlots.power_supply = { product: findP('CCTV-PSU-4CH'), qty: 1 };
      this._cctvSlots.cables = { product: allProds.find(p => p.sku === 'CAT6-305M'), qty: 1 };
      this._cctvSlots.connectors = { product: findP('CCTV-BNC-DC'), qty: 1 };
      this._cctvSlots.rack = { product: findP('CCTV-RCK-4U'), qty: 1 };
      this._cctvSlots.installation = { product: allProds.find(p => p.sku === 'SVC-INST-CCTV'), qty: 1 };

      App.toast('Hikvision & CP PLUS 4-Camera Kit preset loaded!', 'success');
      this.render(document.getElementById('page-content'));
    }
  },

  /* ──────────────────────────────────────────
     GENERATE BUILD SPECIFICATION HTML
  ────────────────────────────────────────── */
  generateSpecSheetHtml(mode = 'pc') {
    const items = this._prepareLineItems(mode);
    if (!items.length) {
      App.toast('Nothing to export. Please choose parts first.', 'warning');
      return '';
    }

    const biz = DB.getBiz();
    const totals = this._calcTotals(mode);
    const wattage = mode === 'pc' ? this._calcEstimatedWattage() : null;
    const title = mode === 'pc' ? 'Custom PC Specification & Quotation Sheet' : 'CCTV Surveillance Package Specification Sheet';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          @page { size: A4; margin: 12mm 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; color: #1e293b; font-size: 13px; line-height: 1.5; background: #fff; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; }
          .biz-name { font-size: 18px; font-weight: 800; color: #0f172a; }
          .biz-sub { font-size: 11px; color: #64748b; }
          .title { font-size: 16px; font-weight: 700; margin-bottom: 12px; text-transform: uppercase; color: #2563eb; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th { background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 11px; text-align: left; text-transform: uppercase; }
          td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 12px; }
          .text-right { text-align: right; }
          .total-box { float: right; width: 280px; margin-top: 10px; }
          .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
          .total-row.grand { font-size: 15px; font-weight: 800; border-top: 2px solid #0f172a; padding-top: 6px; margin-top: 4px; color: #059669; }
          .footer { margin-top: 50px; font-size: 11px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 10px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="biz-name">${biz.name || 'ShopPulse Computer & CCTV Systems'}</div>
            <div class="biz-sub">${biz.address || ''}, ${biz.city || ''} ${biz.pincode || ''}</div>
            <div class="biz-sub">Phone: ${biz.phone || ''} | Email: ${biz.email || ''}</div>
            <div class="biz-sub">GSTIN: <strong>${biz.gstin || 'Unregistered'}</strong></div>
          </div>
          <div style="text-align:right">
            <div style="font-size:14px;font-weight:700">DATE: ${new Date().toLocaleDateString('en-IN')}</div>
            ${wattage ? `<div style="font-size:12px;font-weight:700;color:#2563eb;margin-top:4px">Power Rating: ~${wattage}W</div>` : ''}
          </div>
        </div>

        <div class="title">${title}</div>

        <table>
          <thead>
            <tr>
              <th style="width:5%">#</th>
              <th style="width:50%">Hardware Description / Item</th>
              <th style="width:10%">HSN</th>
              <th style="width:7%;text-align:center">Qty</th>
              <th style="width:14%" class="text-right">Unit Rate (₹)</th>
              <th style="width:14%" class="text-right">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((it, idx) => {
              const lineBase = it.rate * it.qty;
              const lineTotal = lineBase * (1 + it.gstRate / 100);
              return `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${it.name}</strong>${it.warranty ? `<div style="font-size:10px;color:#64748b">Warranty: ${it.warranty}</div>` : ''}</td>
                  <td>${it.hsn}</td>
                  <td style="text-align:center">${it.qty}</td>
                  <td class="text-right">${fmtCurrency(it.rate)}</td>
                  <td class="text-right">${fmtCurrency(lineTotal)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="total-box">
          <div class="total-row"><span>Taxable Amount:</span> <span>${fmtCurrency(totals.taxable)}</span></div>
          <div class="total-row"><span>GST Tax (18%):</span> <span>${fmtCurrency(totals.tax)}</span></div>
          <div class="total-row grand"><span>Total (Incl. GST):</span> <span>${fmtCurrency(totals.total)}</span></div>
        </div>

        <div style="clear:both"></div>

        <div class="footer">
          <div><strong>Terms &amp; Notes:</strong></div>
          <div>1. Quotation prices are valid for 15 days from date of issue.</div>
          <div>2. Warranty will be honored directly as per OEM manufacturer policies.</div>
          <div>3. Generated by ShopPulse GST Management System.</div>
        </div>
      </body>
      </html>
    `;
  },

  /* ──────────────────────────────────────────
     PRINT BUILD SPECIFICATION SHEET
  ────────────────────────────────────────── */
  printSpecSheet(mode = 'pc') {
    const html = this.generateSpecSheetHtml(mode);
    if (!html) return;

    const cleanDate = new Date().toISOString().split('T')[0];
    const fileTitle = mode === 'pc' ? `PC_Build_Specification_${cleanDate}` : `CCTV_Package_Specification_${cleanDate}`;

    if (window.desktopApp && typeof window.desktopApp.printHtml === 'function') {
      window.desktopApp.printHtml({ html, title: fileTitle });
      return;
    }

    const w = window.open('', '_blank');
    if (w) {
      w.document.open();
      w.document.write(html + '<script>window.print();</script>');
      w.document.close();
    }
  },

  /* ──────────────────────────────────────────
     EXPORT BUILD SPECIFICATION AS PDF
  ────────────────────────────────────────── */
  async exportSpecSheetPDF(mode = 'pc') {
    const html = this.generateSpecSheetHtml(mode);
    if (!html) return;

    const cleanDate = new Date().toISOString().split('T')[0];
    const fileTitle = mode === 'pc' ? `PC_Build_Specification_${cleanDate}` : `CCTV_Package_Specification_${cleanDate}`;
    const defaultDir = DB.getBiz().pdfSaveDir || '';

    if (window.desktopApp && window.desktopApp.savePdf) {
      App.toast('Preparing Specification PDF...', 'info');
      try {
        const res = await window.desktopApp.savePdf({ html, title: fileTitle, defaultDir });
        if (res && res.success) {
          App.toast(`🎉 PDF Saved: ${res.filePath}`, 'success');
        }
      } catch (e) {
        console.error('Spec PDF export error:', e);
        this.printSpecSheet(mode);
      }
    } else {
      this.printSpecSheet(mode);
      App.toast('In the print dialog, choose "Save as PDF" 📄', 'info');
    }
  },

  /* ──────────────────────────────────────────
     SHARE ON WHATSAPP
  ────────────────────────────────────────── */
  shareWhatsApp(mode = 'pc') {
    const items = this._prepareLineItems(mode);
    if (!items.length) {
      App.toast('Select parts to share summary on WhatsApp.', 'warning');
      return;
    }

    const biz = DB.getBiz();
    const totals = this._calcTotals(mode);
    const title = mode === 'pc' ? '🖥️ *Custom PC Build Quotation*' : '📹 *CCTV Surveillance Package Quotation*';

    let msg = `${title}\nFrom: *${biz.name}*\nDate: ${new Date().toLocaleDateString('en-IN')}\n\n*Component Specs:*\n`;
    items.forEach((it, idx) => {
      const lineTotal = it.rate * it.qty * (1 + it.gstRate / 100);
      msg += `${idx + 1}. ${it.name} (x${it.qty}) - ₹${lineTotal.toFixed(0)}\n`;
    });

    if (mode === 'pc') {
      msg += `\n*Estimated Power:* ~${this._calcEstimatedWattage()}W`;
    }

    msg += `\n\n*Total On-Road Price:* ${fmtCurrency(totals.total)} (GST Included)\n\n_For booking or queries, reply to this message!_`;

    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  },

  _bindEvents() {}
};