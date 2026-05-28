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
    navigate('dashboard');
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
    document.getElementById('periodYear').value = p.year;
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
    openFAB, closeOverlay
  };
})();

// ---- App Initialization ----
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
