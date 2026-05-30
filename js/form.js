/* ============================================================
   form.js — Form PWO Logic (New / Edit)
   PWO App | WYSPORT by Kakami
   ============================================================ */
'use strict';

let rowCount   = 0;
let currentPWO = null;
const SIZES    = ['XS','S','M','L','XL','XXL','3XL','4XL','5XL','CUSTOM'];
const SLEEVE   = ['PENDEK','PANJANG'];

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const id     = params.get('id');

  if (id) {
    // Edit existing PWO
    currentPWO = db.get(id);
    if (currentPWO) loadFormData(currentPWO);
    else { alert('PWO tidak ditemukan'); history.back(); }
  } else {
    // New PWO
    currentPWO = null;
    addRows(5);
    setPrintDate();
    generatePWONumberDisplay();
  }

  initSignaturePads();
  initPriceCalculation();
  setInterval(autoSaveDraft, 20000);
});

// ============================================================
// PWO NUMBER & DATE
// ============================================================
function generatePWONumberDisplay() {
  const el = document.getElementById('pwo-number-display');
  if (el) el.textContent = '(baru setelah disimpan)';
}

function setPrintDate() {
  const el = document.getElementById('print-date');
  if (el) el.textContent = new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });
}

// ============================================================
// ROW MANAGEMENT
// ============================================================
function addRow() {
  rowCount++;
  const tbody = document.getElementById('prod-tbody');
  const tr    = document.createElement('tr');
  tr.id = `row-${rowCount}`;
  tr.dataset.rowId = rowCount;

  tr.innerHTML = `
    <td><div style="display:flex;align-items:center;justify-content:center;gap:4px;padding:4px">
      <span class="row-num">${rowCount}</span>
      <button class="row-del-btn" onclick="deleteRow(${rowCount})" title="Hapus baris">×</button>
    </div></td>
    <td><input class="td-input" type="text" placeholder="Nama pemain..." style="min-width:110px" /></td>
    <td><input class="td-input" type="text" placeholder="No..." /></td>
    <td>
      <select class="td-select" onchange="recalcAll()">
        <option value="">–</option>
        ${SIZES.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
    </td>
    <td>
      <select class="td-select" onchange="recalcAll()">
        <option value="">–</option>
        ${SLEEVE.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
    </td>
    <td><input class="td-input" type="text" placeholder="Posisi..." style="min-width:80px" /></td>
    <td><input class="td-input" type="text" placeholder="..." /></td>
    <td><input class="td-input" type="text" placeholder="..." /></td>
    <td><input class="td-input" type="text" placeholder="..." /></td>
    <td><input class="td-input" type="text" placeholder="..." /></td>
    <td><input class="td-input" type="text" placeholder="..." /></td>
    <td><input class="td-input" type="text" placeholder="..." /></td>
    <td><div class="td-check"><input type="checkbox" onchange="recalcAll()" /></div></td>
  `;
  tbody.appendChild(tr);
  recalcAll();
  return tr;
}

function addRows(n) { for (let i = 0; i < n; i++) addRow(); }

function deleteRow(id) {
  const row = document.getElementById(`row-${id}`);
  if (row) { row.remove(); renumberRows(); recalcAll(); }
}

function renumberRows() {
  document.querySelectorAll('#prod-tbody tr').forEach((tr, i) => {
    const el = tr.querySelector('.row-num');
    if (el) el.textContent = i + 1;
  });
}

function clearTable() {
  if (!confirm('Hapus semua baris?')) return;
  document.getElementById('prod-tbody').innerHTML = '';
  rowCount = 0; recalcAll();
}

// ============================================================
// RECALCULATION
// ============================================================
function recalcAll() {
  const rows   = document.querySelectorAll('#prod-tbody tr');
  const counts = {};
  SIZES.forEach(s => { counts[s] = 0; });
  let pendek = 0, panjang = 0;

  rows.forEach(tr => {
    const sels = tr.querySelectorAll('select');
    if (sels.length < 2) return;
    const size   = sels[0].value;
    const sleeve = sels[1].value;
    if (size && counts[size] !== undefined) counts[size]++;
    if (sleeve === 'PENDEK')  pendek++;
    if (sleeve === 'PANJANG') panjang++;
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  // Recap table
  SIZES.forEach(s => {
    const key = s.toLowerCase().replace('xl','xl');
    setCount('rc-' + s.toLowerCase().replace(/\s/g,''), counts[s]);
  });
  // Map ids for recap
  const idMap = { XS:'rc-xs', S:'rc-s', M:'rc-m', L:'rc-l', XL:'rc-xl', XXL:'rc-xxl',
    '3XL':'rc-3xl', '4XL':'rc-4xl', '5XL':'rc-5xl', CUSTOM:'rc-custom' };
  Object.entries(idMap).forEach(([size, id]) => setCount(id, counts[size]));
  setCount('rc-total', total);

  // Header summary
  const hdrMap = { XS:'hdr-xs', S:'hdr-s', M:'hdr-m', L:'hdr-l', XL:'hdr-xl', XXL:'hdr-xxl',
    '3XL':'hdr-3xl', '4XL':'hdr-4xl', '5XL':'hdr-5xl', CUSTOM:'hdr-custom' };
  Object.entries(hdrMap).forEach(([size, id]) => setCount(id, counts[size]));
  setCount('hdr-panjang', panjang);
  setCount('hdr-pendek',  pendek);
  setCount('hdr-total',   total);

  recalcPrice(counts, total);
}

function setCount(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || '0';
}

// ============================================================
// PRICE CALCULATION
// ============================================================
function initPriceCalculation() {
  // When price inputs change, recalculate
  document.querySelectorAll('.price-inp, .small-inp').forEach(inp => {
    inp.addEventListener('input', () => {
      const sels = document.querySelectorAll('#prod-tbody select');
      const counts = {};
      SIZES.forEach(s => { counts[s] = 0; });
      document.querySelectorAll('#prod-tbody tr').forEach(tr => {
        const sel = tr.querySelectorAll('select')[0];
        if (sel && sel.value && counts[sel.value] !== undefined) counts[sel.value]++;
      });
      const total = Object.values(counts).reduce((a,b) => a+b, 0);
      recalcPrice(counts, total);
    });
  });
}

function recalcPrice(counts, total) {
  let subtotal = 0;
  SIZES.forEach(size => {
    const qty   = counts[size] || 0;
    const inp   = document.getElementById(`price-${size.toLowerCase()}`);
    const price = inp ? parseFloat(inp.value.replace(/\D/g,'') || 0) : 0;
    subtotal += qty * price;

    // Update qty display in price table
    const qtyEl = document.getElementById(`qty-${size.toLowerCase()}`);
    if (qtyEl) qtyEl.textContent = qty;
  });

  // Ongkos sablon
  const sablonInp = document.getElementById('sablon-cost');
  const sablon    = sablonInp ? parseFloat(sablonInp.value.replace(/\D/g,'') || 0) * total : 0;
  subtotal += sablon;

  // Diskon
  const discInp  = document.getElementById('discount-val');
  const discChk  = document.getElementById('discount-chk');
  const taxChk   = document.getElementById('tax-chk');
  const discPct  = discChk && discChk.checked ? parseFloat(discInp?.value || 0) : 0;
  const discAmt  = subtotal * (discPct / 100);
  const afterDisc= subtotal - discAmt;
  const tax      = taxChk && taxChk.checked ? afterDisc * 0.11 : 0;
  const grandTotal = afterDisc + tax;

  setEl('inv-subtotal', formatRupiah(subtotal));
  setEl('inv-discount', discPct > 0 ? `-${formatRupiah(discAmt)} (${discPct}%)` : '–');
  setEl('inv-tax',      tax > 0 ? formatRupiah(tax) + ' (11%)' : '–');
  setEl('inv-total',    formatRupiah(grandTotal));

  // Store grand total for saving
  if (window._currentGrandTotal !== undefined) window._currentGrandTotal = grandTotal;
  window._currentGrandTotal = grandTotal;
}

// ============================================================
// LOGO & DESIGN UPLOAD
// ============================================================
function handleLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const c = document.getElementById('logo-drop');
    c.innerHTML = `<img src="${e.target.result}" alt="Logo" style="width:100%;height:100%;object-fit:contain;border-radius:6px;" />`;
  };
  reader.readAsDataURL(file);
}

function handleDesignUpload(event) { loadDesignFile(event.target.files[0]); }
function handleDesignDrop(event) {
  event.preventDefault();
  document.getElementById('design-drop-zone').classList.remove('drag-over');
  const file = event.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadDesignFile(file);
}
function loadDesignFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('design-preview').src = e.target.result;
    document.getElementById('design-preview').style.display = 'block';
    document.getElementById('design-placeholder').style.display = 'none';
    document.getElementById('design-controls').style.display = 'flex';
  };
  reader.readAsDataURL(file);
}
function clearDesign() {
  document.getElementById('design-preview').src = '';
  document.getElementById('design-preview').style.display = 'none';
  document.getElementById('design-placeholder').style.display = 'flex';
  document.getElementById('design-controls').style.display = 'none';
}

// ============================================================
// IMPORT FROM EXCEL/CSV (SheetJS)
// ============================================================
function importFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (typeof XLSX === 'undefined') {
    showToast('Library import belum dimuat. Cek koneksi internet.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    const wb = XLSX.read(e.target.result, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

    // Detect header row (first row with ≥ 2 non-empty cells)
    let headerIdx = 0;
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      if (rows[i].filter(c => c).length >= 2) { headerIdx = i; break; }
    }
    const headers = rows[headerIdx].map(h => String(h || '').toLowerCase().trim());
    const dataRows = rows.slice(headerIdx + 1);

    const findCol = (...keys) => {
      for (const k of keys) {
        const i = headers.findIndex(h => h.includes(k));
        if (i >= 0) return i;
      }
      return -1;
    };

    const colNama   = findCol('nama', 'name', 'pemain');
    const colNo     = findCol('no player', 'nomor', 'no.');
    const colSize   = findCol('size', 'ukuran');
    const colSleeve = findCol('lengan', 'sleeve', 'tangan', 'pendek', 'panjang');

    // Clear existing rows
    document.getElementById('prod-tbody').innerHTML = '';
    rowCount = 0;
    let imported = 0;

    dataRows.forEach(row => {
      if (!row || row.every(c => !c)) return;
      const tr = addRow();
      const inputs  = tr.querySelectorAll('input.td-input');
      const selects = tr.querySelectorAll('select.td-select');

      if (colNama   >= 0 && inputs[0]) inputs[0].value  = row[colNama]   || '';
      if (colNo     >= 0 && inputs[1]) inputs[1].value  = row[colNo]     || '';
      if (colSize   >= 0 && selects[0]) {
        const sizeVal = String(row[colSize] || '').toUpperCase().trim();
        if (SIZES.includes(sizeVal)) selects[0].value = sizeVal;
      }
      if (colSleeve >= 0 && selects[1]) {
        const sv = String(row[colSleeve] || '').toUpperCase().trim();
        if (sv.includes('PANJANG')) selects[1].value = 'PANJANG';
        else if (sv.includes('PENDEK')) selects[1].value = 'PENDEK';
      }
      imported++;
    });

    recalcAll();
    showToast(`✅ ${imported} item berhasil diimport!`);
  };
  reader.readAsArrayBuffer(file);
}

// ============================================================
// SIGNATURE PADS
// ============================================================
function initSignaturePads() {
  ['sig-operator','sig-qc','sig-maker'].forEach(id => initPad(id));
}

function initPad(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let drawing = false, lx = 0, ly = 0;

  const pos = e => {
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / r.width, sy = canvas.height / r.height;
    if (e.touches) return { x: (e.touches[0].clientX - r.left)*sx, y: (e.touches[0].clientY - r.top)*sy };
    return { x: (e.clientX - r.left)*sx, y: (e.clientY - r.top)*sy };
  };
  const draw = (from, to) => {
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke();
  };

  canvas.addEventListener('mousedown', e => { drawing = true; const p = pos(e); lx=p.x; ly=p.y; });
  canvas.addEventListener('mousemove', e => { if (!drawing) return; const p=pos(e); draw({x:lx,y:ly},p); lx=p.x; ly=p.y; });
  canvas.addEventListener('mouseup',    () => { drawing = false; });
  canvas.addEventListener('mouseleave', () => { drawing = false; });
  canvas.addEventListener('touchstart', e => { e.preventDefault(); drawing=true; const p=pos(e); lx=p.x; ly=p.y; }, {passive:false});
  canvas.addEventListener('touchmove',  e => { e.preventDefault(); if(!drawing) return; const p=pos(e); draw({x:lx,y:ly},p); lx=p.x; ly=p.y; }, {passive:false});
  canvas.addEventListener('touchend',   () => { drawing = false; });
}

function clearSig(id) {
  const c = document.getElementById(id);
  if (c) c.getContext('2d').clearRect(0,0,c.width,c.height);
}

// ============================================================
// SEND VIA WHATSAPP
// ============================================================
function sendWA() {
  const client  = document.getElementById('field-client')?.value  || '–';
  const project = document.getElementById('field-project')?.value || '–';
  const deadline= document.getElementById('field-date')?.value    || '–';
  const total   = document.getElementById('hdr-total')?.textContent || '0';
  const grandT  = document.getElementById('inv-total')?.textContent || '–';
  const pwoNum  = document.getElementById('pwo-number-display')?.textContent || '–';

  const msg = encodeURIComponent(
    `*PRODUCTION WORK ORDER*\n` +
    `No. PWO  : ${pwoNum}\n` +
    `Klien    : ${client}\n` +
    `Proyek   : ${project}\n` +
    `Deadline : ${deadline}\n` +
    `Total Qty: ${total} pcs\n` +
    `Grand Total: ${grandT}\n\n` +
    `_WYSPORT by Kakami_`
  );
  window.open(`https://wa.me/?text=${msg}`, '_blank');
}

// ============================================================
// SAVE PWO
// ============================================================
function getFormData() {
  const rows = [];
  document.querySelectorAll('#prod-tbody tr').forEach(tr => {
    const inputs  = tr.querySelectorAll('input.td-input');
    const selects = tr.querySelectorAll('select');
    const chk     = tr.querySelector('input[type="checkbox"]');
    if (!inputs[0]) return;
    rows.push({
      nama:     inputs[0]?.value || '',
      noplayer: inputs[1]?.value || '',
      size:     selects[0]?.value || '',
      sleeve:   selects[1]?.value || '',
      posisi:   inputs[2]?.value  || '',
      atasDpn:  inputs[3]?.value  || '',
      atasBlk:  inputs[4]?.value  || '',
      bwKanan:  inputs[5]?.value  || '',
      bwKiri:   inputs[6]?.value  || '',
      lnKanan:  inputs[7]?.value  || '',
      lnKiri:   inputs[8]?.value  || '',
      cek:      chk?.checked || false,
    });
  });

  // Price data per size
  const priceData = {};
  SIZES.forEach(s => {
    const inp = document.getElementById(`price-${s.toLowerCase()}`);
    priceData[s] = parseFloat(inp?.value?.replace(/\D/g,'') || 0);
  });

  return {
    id:          currentPWO?.id || null,
    client:      document.getElementById('field-client')?.value || '',
    project:     document.getElementById('field-project')?.value || '',
    deadline:    document.getElementById('field-deadline')?.value || '',
    dateDisplay: document.getElementById('field-date')?.value || '',
    material:    document.getElementById('field-material')?.value || '',
    otherMat:    document.getElementById('field-other-material')?.value || '',
    orderType:   document.querySelector('input[name="order-type"]:checked')?.value || 'Full Order',
    status:      document.getElementById('field-status')?.value || 'draft',
    totalOrder:  parseInt(document.getElementById('hdr-total')?.textContent || 0),
    notes:       document.getElementById('notes-area')?.value || '',
    opName:      document.getElementById('sign-operator-name')?.value || '',
    qcName:      document.getElementById('sign-qc-name')?.value || '',
    makerName:   document.getElementById('sign-maker-name')?.value || '',
    designSrc:   document.getElementById('design-preview')?.src || '',
    grandTotal:  window._currentGrandTotal || 0,
    priceData,
    rows,
  };
}

function savePWO() {
  const data = getFormData();
  if (!data.client.trim()) {
    showToast('Nama klien wajib diisi!', 'error'); return;
  }
  const saved = db.save(data);
  currentPWO  = saved;
  const numEl = document.getElementById('pwo-number-display');
  if (numEl) numEl.textContent = saved.pwoNumber;
  showToast('💾 PWO berhasil disimpan! No. ' + saved.pwoNumber);
  // Update page title
  document.title = `${saved.pwoNumber} – PWO WYSPORT`;
}

function autoSaveDraft() {
  try {
    const data = getFormData();
    localStorage.setItem('pwo_draft', JSON.stringify(data));
  } catch (_) {}
}

function loadFormData(pwo) {
  setInp('field-client',          pwo.client);
  setInp('field-project',         pwo.project);
  setInp('field-date',            pwo.dateDisplay);
  setInp('field-deadline',        pwo.deadline);
  setInp('field-material',        pwo.material);
  setInp('field-other-material',  pwo.otherMat);
  setInp('notes-area',            pwo.notes);
  setInp('sign-operator-name',    pwo.opName);
  setInp('sign-qc-name',          pwo.qcName);
  setInp('sign-maker-name',       pwo.makerName);

  const numEl = document.getElementById('pwo-number-display');
  if (numEl) numEl.textContent = pwo.pwoNumber || '–';

  const printEl = document.getElementById('print-date');
  if (printEl) printEl.textContent = new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });

  if (pwo.status) {
    const sel = document.getElementById('field-status');
    if (sel) sel.value = pwo.status;
  }
  if (pwo.orderType) {
    const radio = document.querySelector(`input[name="order-type"][value="${pwo.orderType}"]`);
    if (radio) radio.checked = true;
  }
  if (pwo.designSrc && pwo.designSrc.length > 10) {
    document.getElementById('design-preview').src = pwo.designSrc;
    document.getElementById('design-preview').style.display = 'block';
    document.getElementById('design-placeholder').style.display = 'none';
    document.getElementById('design-controls').style.display = 'flex';
  }
  if (pwo.priceData) {
    SIZES.forEach(s => {
      const inp = document.getElementById(`price-${s.toLowerCase()}`);
      if (inp && pwo.priceData[s]) inp.value = pwo.priceData[s];
    });
  }
  if (pwo.rows && pwo.rows.length > 0) {
    document.getElementById('prod-tbody').innerHTML = '';
    rowCount = 0;
    pwo.rows.forEach(rd => {
      const tr = addRow();
      const inputs  = tr.querySelectorAll('input.td-input');
      const selects = tr.querySelectorAll('select');
      const chk     = tr.querySelector('input[type="checkbox"]');
      if (inputs[0]) inputs[0].value  = rd.nama    || '';
      if (inputs[1]) inputs[1].value  = rd.noplayer|| '';
      if (selects[0]) selects[0].value = rd.size   || '';
      if (selects[1]) selects[1].value = rd.sleeve || '';
      if (inputs[2]) inputs[2].value  = rd.posisi  || '';
      if (inputs[3]) inputs[3].value  = rd.atasDpn || '';
      if (inputs[4]) inputs[4].value  = rd.atasBlk || '';
      if (inputs[5]) inputs[5].value  = rd.bwKanan || '';
      if (inputs[6]) inputs[6].value  = rd.bwKiri  || '';
      if (inputs[7]) inputs[7].value  = rd.lnKanan || '';
      if (inputs[8]) inputs[8].value  = rd.lnKiri  || '';
      if (chk) chk.checked = rd.cek || false;
    });
    recalcAll();
  }
}

function setInp(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined) el.value = val;
}

// ============================================================
// NAVIGATION
// ============================================================
function goBack() { window.location.href = 'index.html'; }
function openInvoicePage() {
  if (!currentPWO?.id) { showToast('Simpan PWO dulu sebelum buat invoice', 'warning'); return; }
  window.location.href = `invoice.html?id=${currentPWO.id}`;
}
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================================
// HELPERS
// ============================================================
function setEl(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function formatRupiah(num) {
  if (!num || isNaN(num)) return '–';
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}

let toastTimer;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast' + (type !== 'success' ? ` ${type}` : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3500);
}
