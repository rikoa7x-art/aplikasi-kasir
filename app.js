/* ============================================================
   PWO App – app.js
   WYSPORT by Kakami | Production Work Order Application
   ============================================================ */

'use strict';

// ============================================================
// STATE
// ============================================================
let rowCount = 0;

const SIZES = ['XS','S','M','L','XL','XXL','3XL','4XL','5XL','CUSTOM'];
const SLEEVE = ['PENDEK','PANJANG'];

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  generatePWONumber();
  setPrintDate();
  addRows(5);           // default 5 empty rows
  initSignaturePads();
  initSidebarHighlight();
  tryLoadAutoSave();
  setInterval(autoSave, 30000); // auto-save every 30s
});

// ============================================================
// PWO NUMBER & DATE
// ============================================================
function generatePWONumber() {
  const now  = new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const rnd  = String(Math.floor(Math.random() * 900) + 100);
  document.getElementById('pwo-number').textContent = `PWO-${yyyy}${mm}-${rnd}`;
}

function setPrintDate() {
  const now = new Date();
  document.getElementById('print-date').textContent = now.toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
}

// ============================================================
// ROW MANAGEMENT
// ============================================================
function addRow() {
  rowCount++;
  const tbody = document.getElementById('prod-tbody');
  const tr    = document.createElement('tr');
  tr.id       = `row-${rowCount}`;
  tr.dataset.rowId = rowCount;

  tr.innerHTML = `
    <td><div style="display:flex;align-items:center;justify-content:center;gap:4px;padding:4px">
      <span class="row-num">${rowCount}</span>
      <button class="row-del-btn" onclick="deleteRow(${rowCount})" title="Hapus baris">×</button>
    </div></td>
    <td><input class="td-input" type="text" placeholder="Nama pemain..." style="min-width:110px" /></td>
    <td><input class="td-input" type="text" placeholder="No..." /></td>
    <td>
      <select class="td-select" onchange="recalcAll()" title="Pilih ukuran">
        <option value="">–</option>
        ${SIZES.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
    </td>
    <td>
      <select class="td-select" onchange="recalcAll()" title="Pilih panjang lengan">
        <option value="">–</option>
        ${SLEEVE.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
    </td>
    <td><input class="td-input" type="text" placeholder="Posisi / ket..." style="min-width:80px" /></td>
    <td><input class="td-input" type="text" placeholder="..." /></td>
    <td><input class="td-input" type="text" placeholder="..." /></td>
    <td><input class="td-input" type="text" placeholder="..." /></td>
    <td><input class="td-input" type="text" placeholder="..." /></td>
    <td><input class="td-input" type="text" placeholder="..." /></td>
    <td><input class="td-input" type="text" placeholder="..." /></td>
    <td><div class="td-check"><input type="checkbox" title="Cek item" onchange="updateSidebar()" /></div></td>
  `;
  tbody.appendChild(tr);
  recalcAll();
  updateSidebar();
  return tr;
}

function addRows(n) {
  for (let i = 0; i < n; i++) addRow();
}

function deleteRow(id) {
  const row = document.getElementById(`row-${id}`);
  if (row) {
    row.remove();
    renumberRows();
    recalcAll();
    updateSidebar();
  }
}

function renumberRows() {
  const rows = document.querySelectorAll('#prod-tbody tr');
  rows.forEach((tr, i) => {
    const numEl = tr.querySelector('.row-num');
    if (numEl) numEl.textContent = i + 1;
  });
}

function clearTable() {
  if (!confirm('Hapus semua baris item produksi?')) return;
  document.getElementById('prod-tbody').innerHTML = '';
  rowCount = 0;
  recalcAll();
  updateSidebar();
  showToast('Tabel dikosongkan', 'info');
}

// ============================================================
// RECALCULATION
// ============================================================
function recalcAll() {
  const rows   = document.querySelectorAll('#prod-tbody tr');
  const counts = {};
  SIZES.forEach(s => { counts[s] = 0; });
  let totalPendek = 0, totalPanjang = 0;

  rows.forEach(tr => {
    const selects = tr.querySelectorAll('select');
    if (selects.length < 2) return;
    const size   = selects[0].value;
    const sleeve = selects[1].value;
    if (size && counts[size] !== undefined) counts[size]++;
    if (sleeve === 'PENDEK') totalPendek++;
    if (sleeve === 'PANJANG') totalPanjang++;
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  // ---- Update recap table ----
  setCount('rc-xs',     counts['XS']);
  setCount('rc-s',      counts['S']);
  setCount('rc-m',      counts['M']);
  setCount('rc-l',      counts['L']);
  setCount('rc-xl',     counts['XL']);
  setCount('rc-xxl',    counts['XXL']);
  setCount('rc-3xl',    counts['3XL']);
  setCount('rc-4xl',    counts['4XL']);
  setCount('rc-5xl',    counts['5XL']);
  setCount('rc-custom', counts['CUSTOM']);
  setCount('rc-total',  total);

  // ---- Update header summary ----
  setCount('hdr-xs',     counts['XS']);
  setCount('hdr-s',      counts['S']);
  setCount('hdr-m',      counts['M']);
  setCount('hdr-l',      counts['L']);
  setCount('hdr-xl',     counts['XL']);
  setCount('hdr-xxl',    counts['XXL']);
  setCount('hdr-3xl',    counts['3XL']);
  setCount('hdr-4xl',    counts['4XL']);
  setCount('hdr-5xl',    counts['5XL']);
  setCount('hdr-custom', counts['CUSTOM']);
  setCount('hdr-panjang', totalPanjang);
  setCount('hdr-pendek',  totalPendek);
  setCount('hdr-total',   total);

  updateSidebar();
}

function setCount(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value || '0';
  // highlight non-zero
  if (value > 0) {
    el.style.background = '';
    el.style.color = '';
  }
}

function updateSidebar() {
  const rows  = document.querySelectorAll('#prod-tbody tr');
  document.getElementById('sb-total').textContent = rows.length;
}

// ============================================================
// LOGO UPLOAD
// ============================================================
function handleLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const container = document.getElementById('logo-drop');
    container.innerHTML = `<img src="${e.target.result}" alt="Logo" style="width:100%;height:100%;object-fit:contain;border-radius:6px;" />`;
  };
  reader.readAsDataURL(file);
}

// ============================================================
// DESIGN IMAGE UPLOAD
// ============================================================
function handleDesignUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  loadDesignFile(file);
}

function handleDesignDrop(event) {
  event.preventDefault();
  document.getElementById('design-drop-zone').classList.remove('drag-over');
  const file = event.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    loadDesignFile(file);
  }
}

function loadDesignFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById('design-preview');
    const placeholder = document.getElementById('design-placeholder');
    const controls  = document.getElementById('design-controls');
    preview.src = e.target.result;
    preview.style.display = 'block';
    placeholder.style.display = 'none';
    controls.style.display = 'flex';
    showToast('Gambar desain berhasil diunggah ✓');
  };
  reader.readAsDataURL(file);
}

function clearDesign() {
  document.getElementById('design-preview').src = '';
  document.getElementById('design-preview').style.display = 'none';
  document.getElementById('design-placeholder').style.display = 'flex';
  document.getElementById('design-controls').style.display = 'none';
  document.getElementById('design-input').value = '';
}

// ============================================================
// SIGNATURE PADS
// ============================================================
function initSignaturePads() {
  ['sig-operator','sig-qc','sig-maker'].forEach(id => {
    initPad(id);
  });
}

function initPad(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let drawing = false;
  let lastX = 0, lastY = 0;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top)  * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY
    };
  }

  canvas.addEventListener('mousedown', e => {
    drawing = true;
    const p = getPos(e);
    lastX = p.x; lastY = p.y;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
  });
  canvas.addEventListener('mousemove', e => {
    if (!drawing) return;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastX = p.x; lastY = p.y;
  });
  canvas.addEventListener('mouseup',   () => { drawing = false; });
  canvas.addEventListener('mouseleave',() => { drawing = false; });

  // Touch support
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    drawing = true;
    const p = getPos(e);
    lastX = p.x; lastY = p.y;
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!drawing) return;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastX = p.x; lastY = p.y;
  }, { passive: false });
  canvas.addEventListener('touchend', () => { drawing = false; });
}

function clearSig(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

// ============================================================
// ORDER TYPE
// ============================================================
function updateOrderType(radio) {
  // just for future use / display
}

// ============================================================
// SCROLL TO SECTION
// ============================================================
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // update active nav
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  event.currentTarget.classList.add('active');
}

function initSidebarHighlight() {
  const sections = [
    'sec-header','sec-design','sec-recap','sec-table','sec-notes','sec-sign'
  ];
  const btns = document.querySelectorAll('.nav-btn');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const idx = sections.indexOf(entry.target.id);
        if (idx >= 0) {
          btns.forEach(b => b.classList.remove('active'));
          if (btns[idx]) btns[idx].classList.add('active');
        }
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
}

// ============================================================
// SAVE & LOAD (localStorage)
// ============================================================
function getFormData() {
  const rows = [];
  document.querySelectorAll('#prod-tbody tr').forEach(tr => {
    const inputs  = tr.querySelectorAll('input.td-input');
    const selects = tr.querySelectorAll('select.td-select');
    const chk     = tr.querySelector('input[type="checkbox"]');
    rows.push({
      nama:    inputs[0]?.value || '',
      noplayer:inputs[1]?.value || '',
      size:    selects[0]?.value || '',
      sleeve:  selects[1]?.value || '',
      posisi:  inputs[2]?.value  || '',
      atasDpn: inputs[3]?.value  || '',
      atasBlk: inputs[4]?.value  || '',
      bwKanan: inputs[5]?.value  || '',
      bwKiri:  inputs[6]?.value  || '',
      lnKanan: inputs[7]?.value  || '',
      lnKiri:  inputs[8]?.value  || '',
      cek:     chk?.checked || false,
    });
  });

  return {
    client:    document.getElementById('field-client').value,
    project:   document.getElementById('field-project').value,
    date:      document.getElementById('field-date').value,
    material:  document.getElementById('field-material').value,
    otherMat:  document.getElementById('field-other-material').value,
    orderType: document.querySelector('input[name="order-type"]:checked')?.value || 'Full Order',
    notes:     document.getElementById('notes-area').value,
    opName:    document.getElementById('sign-operator-name').value,
    qcName:    document.getElementById('sign-qc-name').value,
    makerName: document.getElementById('sign-maker-name').value,
    pwoNumber: document.getElementById('pwo-number').textContent,
    designSrc: document.getElementById('design-preview').src,
    rows,
    savedAt: new Date().toISOString(),
  };
}

function saveLocal() {
  try {
    const data = getFormData();
    localStorage.setItem('pwo_data', JSON.stringify(data));
    showToast('💾 Data berhasil disimpan!');
  } catch (e) {
    showToast('Gagal menyimpan: ' + e.message, 'error');
  }
}

function autoSave() {
  try {
    const data = getFormData();
    localStorage.setItem('pwo_autosave', JSON.stringify(data));
  } catch (_) {}
}

function loadLocal() {
  const raw = localStorage.getItem('pwo_data') || localStorage.getItem('pwo_autosave');
  if (!raw) { showToast('Tidak ada data tersimpan', 'error'); return; }
  try {
    const data = JSON.parse(raw);
    applyFormData(data);
    showToast('📂 Data berhasil dimuat!');
  } catch (e) {
    showToast('Gagal memuat: ' + e.message, 'error');
  }
}

function tryLoadAutoSave() {
  const raw = localStorage.getItem('pwo_autosave');
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    // only auto-load if there's actual content
    if (data.client || data.project || (data.rows && data.rows.some(r => r.nama))) {
      if (confirm('Ditemukan data tersimpan. Muat data sebelumnya?')) {
        applyFormData(data);
        showToast('📂 Data tersimpan dimuat');
      }
    }
  } catch (_) {}
}

function applyFormData(data) {
  // header fields
  setField('field-client',          data.client);
  setField('field-project',         data.project);
  setField('field-date',            data.date);
  setField('field-material',        data.material);
  setField('field-other-material',  data.otherMat);
  setField('notes-area',            data.notes);
  setField('sign-operator-name',    data.opName);
  setField('sign-qc-name',          data.qcName);
  setField('sign-maker-name',       data.makerName);

  if (data.pwoNumber) document.getElementById('pwo-number').textContent = data.pwoNumber;

  // order type
  if (data.orderType) {
    const radio = document.querySelector(`input[name="order-type"][value="${data.orderType}"]`);
    if (radio) radio.checked = true;
  }

  // design image
  if (data.designSrc && data.designSrc.length > 10) {
    const preview = document.getElementById('design-preview');
    preview.src = data.designSrc;
    preview.style.display = 'block';
    document.getElementById('design-placeholder').style.display = 'none';
    document.getElementById('design-controls').style.display = 'flex';
  }

  // rows
  if (data.rows && data.rows.length > 0) {
    document.getElementById('prod-tbody').innerHTML = '';
    rowCount = 0;
    data.rows.forEach(rowData => {
      const tr = addRow();
      const inputs  = tr.querySelectorAll('input.td-input');
      const selects = tr.querySelectorAll('select.td-select');
      const chk     = tr.querySelector('input[type="checkbox"]');
      if (inputs[0]) inputs[0].value = rowData.nama    || '';
      if (inputs[1]) inputs[1].value = rowData.noplayer|| '';
      if (selects[0]) selects[0].value = rowData.size  || '';
      if (selects[1]) selects[1].value = rowData.sleeve|| '';
      if (inputs[2]) inputs[2].value = rowData.posisi  || '';
      if (inputs[3]) inputs[3].value = rowData.atasDpn || '';
      if (inputs[4]) inputs[4].value = rowData.atasBlk || '';
      if (inputs[5]) inputs[5].value = rowData.bwKanan || '';
      if (inputs[6]) inputs[6].value = rowData.bwKiri  || '';
      if (inputs[7]) inputs[7].value = rowData.lnKanan || '';
      if (inputs[8]) inputs[8].value = rowData.lnKiri  || '';
      if (chk) chk.checked = rowData.cek || false;
    });
    recalcAll();
  }
}

function setField(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined) el.value = value;
}

// ============================================================
// TOAST NOTIFICATION
// ============================================================
let toastTimer = null;
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className   = 'toast' + (type === 'error' ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.classList.add('hidden'); }, 3000);
}
