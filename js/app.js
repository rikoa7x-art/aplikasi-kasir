/* ================================================
   SablonKas - Main Application Router & Controller
   ================================================ */

const App = (() => {
  const MONTHS = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const MODULES = {
    dashboard: { module: () => Dashboard, label: 'Dashboard' },
    penjualan: { module: () => Penjualan, label: 'Penjualan' },
    kas:       { module: () => Kas,       label: 'Kas & Bank' },
    pembelian: { module: () => Pembelian, label: 'Pembelian' },
    produksi:  { module: () => Produksi,  label: 'Produksi/HPP' },
    piutang:   { module: () => Piutang,   label: 'Piutang' },
    hutang:    { module: () => Hutang,    label: 'Hutang' },
    beban:     { module: () => Beban,     label: 'Beban Ops' },
    laporan:   { module: () => Laporan,   label: 'Laporan' },
    neraca:    { module: () => Laporan,   label: 'Neraca' },
  };

  let currentPage = 'dashboard';
  const BOTTOM_NAV_PAGES = ['dashboard', 'penjualan', 'kas', 'laporan'];

  function init() {
    updatePeriodDisplay();
    updateHeaderCompany();
    navigate('dashboard');
  }

  // Update nama perusahaan di header dari company settings
  function updateHeaderCompany() {
    const c = DB.getCompanySettings();
    const nameEl = document.getElementById('appLogoText');
    if (nameEl) nameEl.textContent = c.nama || 'WY SPORT';
  }

  function navigate(page) {
    if (page === 'neraca') {
      Laporan.setTab('neraca');
      page = 'laporan';
    }
    currentPage = page;

    // Update bottom nav active state
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    // FAB visibility
    const fabBtn = document.getElementById('fabBtn');
    const noFabPages = ['dashboard', 'laporan'];
    if (fabBtn) fabBtn.style.display = noFabPages.includes(page) ? 'none' : 'flex';

    renderCurrentPage();
  }

  function renderCurrentPage() {
    const container = document.getElementById('pageContainer');
    const modEntry = MODULES[currentPage];
    if (!modEntry) return;

    const mod = modEntry.module();
    if (!mod) return;

    container.innerHTML = mod.render();
    container.style.animation = 'none';
    requestAnimationFrame(() => {
      container.style.animation = 'fadeSlideIn 0.25s ease';
    });

    if (mod.afterRender) mod.afterRender();
  }

  // ---- Period Management ----
  function openPeriodModal() {
    const p = DB.getPeriode();
    document.getElementById('periodMonth').value = p.month;
    // Bug #7 fix: gunakan tahun berjalan jika belum ada preference tersimpan
    const yearEl = document.getElementById('periodYear');
    yearEl.value = p.year;
    showOverlay();
    document.getElementById('periodModal').classList.add('visible');
  }

  function closePeriodModal() {
    document.getElementById('periodModal').classList.remove('visible');
    hideOverlay();
  }

  function setPeriod() {
    const month = document.getElementById('periodMonth').value;
    const year = document.getElementById('periodYear').value;
    if (!month || !year || year < 2000 || year > 2099) {
      Utils.toast('Periode tidak valid', 'error');
      return;
    }
    DB.setPeriode(month, year);
    updatePeriodDisplay();
    closePeriodModal();
    renderCurrentPage();
    Utils.toast(`Periode diubah ke ${MONTHS[parseInt(month)]} ${year}`, 'success');
  }

  function updatePeriodDisplay() {
    const p = DB.getPeriode();
    const el = document.getElementById('periodDisplay');
    if (el) el.textContent = `${MONTHS[parseInt(p.month)].substring(0, 3)} ${p.year}`;
  }

  // ---- More Menu ----
  function openMoreMenu() {
    showOverlay();
    document.getElementById('moreMenuSheet').classList.add('visible');

    // Update nav-item active state for more
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === 'more');
    });
  }

  // ---- Form Modal ----
  function openFormModal(title, bodyHtml) {
    document.getElementById('formModalTitle').textContent = title;
    document.getElementById('formModalBody').innerHTML = bodyHtml;
    showOverlay();
    document.getElementById('formModal').classList.add('visible');
  }

  function closeFormModal() {
    // Bug #9 fix: peringatkan user jika ada form yang sudah diisi
    const form = document.querySelector('#formModal form');
    if (form) {
      const inputs = form.querySelectorAll('input:not([readonly]):not([type="hidden"]), select, textarea');
      let hasDirtyData = false;
      inputs.forEach(el => {
        const val = el.value.trim();
        if (val && val !== '0' && val !== el.defaultValue) hasDirtyData = true;
      });
      if (hasDirtyData) {
        if (!window.confirm('Data yang sudah diisi akan hilang. Yakin ingin menutup?')) return;
      }
    }
    document.getElementById('formModal').classList.remove('visible');
    hideOverlay();
  }

  // ---- FAB ----
  function openFAB() {
    const fabActions = {
      penjualan: () => Penjualan.openForm(),
      kas: () => Kas.openForm(),
      pembelian: () => Pembelian.openForm(),
      produksi: () => Produksi.openForm(),
      piutang: () => Piutang.openForm(),
      hutang: () => Hutang.openForm(),
      beban: () => Beban.openForm(),
    };
    const action = fabActions[currentPage];
    if (action) action();
  }

  // ---- Company Settings ----
  function openCompanySettings() {
    const c = DB.getCompanySettings();
    const sync = DB.getSyncStatus();
    const syncColors = { ok: '#10b981', error: '#ef4444', no_table: '#f59e0b', offline: '#999', syncing: '#f59e0b' };
    const syncLabels = { ok: '☁️ Terhubung ke Supabase', error: '❌ Error: ' + sync.error, no_table: '⚙️ Tabel belum dibuat', offline: '📴 Mode lokal (tanpa cloud)', syncing: '🔄 Sedang sinkron...' };
    const syncColor = syncColors[sync.status] || '#999';
    const syncLabel = syncLabels[sync.status] || 'Unknown';
    const sqlInfo = sync.status === 'no_table' ? `
      <div style="background:#1a1a2e;border:1px solid #f59e0b;border-radius:8px;padding:12px;margin-bottom:16px">
        <p style="font-size:12px;color:#f59e0b;margin:0 0 8px;font-weight:600">⚙️ Langkah: Buat tabel di Supabase</p>
        <p style="font-size:11px;color:#aaa;margin:0 0 8px">Buka <strong>supabase.com</strong> → project Anda → <strong>SQL Editor</strong> → paste SQL ini → klik Run:</p>
        <textarea readonly style="width:100%;font-size:10px;background:#0d0d1a;color:#7dd3fc;border:none;border-radius:4px;padding:8px;font-family:monospace;resize:none;box-sizing:border-box" rows="8">CREATE TABLE IF NOT EXISTS sablonkas_data (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  data JSONB NOT NULL,
  PRIMARY KEY (collection, id)
);
CREATE TABLE IF NOT EXISTS sablonkas_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);
ALTER TABLE sablonkas_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE sablonkas_settings DISABLE ROW LEVEL SECURITY;</textarea>
        <button type="button" class="btn btn-primary btn-full" style="margin-top:8px;font-size:12px" onclick="window.location.reload()">🔄 Refresh setelah menjalankan SQL</button>
      </div>` : '';
    const formHtml = `
      <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:10px 12px;margin-bottom:16px;display:flex;align-items:center;gap:8px">
        <span style="width:8px;height:8px;border-radius:50%;background:${syncColor};display:inline-block;flex-shrink:0"></span>
        <span style="font-size:12px;color:${syncColor}">${syncLabel}</span>
      </div>
      ${sqlInfo}
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:16px">Atur informasi perusahaan yang akan tampil di invoice dan laporan.</p>
      <div class="form-group">
        <label>Nama Perusahaan</label>
        <input class="form-control" id="cs_nama" type="text" placeholder="WY SPORT" value="${c.nama || ''}" required>
      </div>
      <div class="form-group">
        <label>Tagline / Deskripsi</label>
        <input class="form-control" id="cs_tagline" type="text" placeholder="Jersey & Sportswear Custom" value="${c.tagline || ''}">
      </div>
      <div class="form-group">
        <label>Alamat</label>
        <input class="form-control" id="cs_alamat" type="text" placeholder="Jl. Contoh No. 1, Kota" value="${c.alamat || ''}">
      </div>
      <div class="form-group">
        <label>No. Telepon / WhatsApp</label>
        <input class="form-control" id="cs_telp" type="text" placeholder="08123456789" value="${c.telepon || ''}">
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="App.closeFormModal()">Batal</button>
        <button type="button" class="btn btn-primary" style="flex:1" onclick="App.saveCompanySettings()">💾 Simpan</button>
      </div>
    `;
    openFormModal('⚙️ Pengaturan', formHtml);
  }

  function saveCompanySettings() {
    const nama = document.getElementById('cs_nama')?.value.trim();
    if (!nama) { Utils.toast('Nama perusahaan wajib diisi!', 'error'); return; }
    DB.setCompanySettings({
      nama,
      tagline: document.getElementById('cs_tagline')?.value.trim() || '',
      alamat: document.getElementById('cs_alamat')?.value.trim() || '',
      telepon: document.getElementById('cs_telp')?.value.trim() || ''
    });
    closeFormModal();
    updateHeaderCompany(); // refresh nama di header
    renderCurrentPage();   // refresh page aktif (misal dashboard)
    Utils.toast('Pengaturan perusahaan disimpan ✅', 'success');
  }

  // ---- Overlay ----
  function showOverlay() {
    document.getElementById('overlay').classList.add('visible');
  }

  function hideOverlay() {
    document.getElementById('overlay').classList.remove('visible');
  }

  function closeOverlay() {
    hideOverlay();
    document.getElementById('moreMenuSheet').classList.remove('visible');
    document.getElementById('periodModal').classList.remove('visible');
    document.getElementById('formModal').classList.remove('visible');

    // Reset nav active state
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === currentPage);
    });
  }

  return {
    init, navigate, renderCurrentPage,
    openPeriodModal, closePeriodModal, setPeriod,
    openMoreMenu,
    openFormModal, closeFormModal,
    openFAB, closeOverlay,
    openCompanySettings, saveCompanySettings
  };
})();

// ---- App Initialization ----
document.addEventListener('DOMContentLoaded', () => {
  const loadingEl = document.getElementById('appLoadingScreen');
  const statusEl  = document.getElementById('loadingStatus');

  // Tunggu Firestore selesai load data
  DB.onReady(() => {
    if (statusEl) statusEl.textContent = 'Data siap ✅';

    // Init aplikasi
    App.init();

    // Sembunyikan loading screen dengan animasi fade
    setTimeout(() => {
      if (loadingEl) loadingEl.classList.add('hidden');
    }, 300);
  });
});
