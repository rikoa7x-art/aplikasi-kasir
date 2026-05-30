/* ============================================================
   dashboard.js — Dashboard Logic
   PWO App | WYSPORT by Kakami
   ============================================================ */
'use strict';

// Chart.js instances
let chartTrend = null;
let chartSize  = null;

document.addEventListener('DOMContentLoaded', () => {
  renderDashboard();
  initReminders();
  initSearch();
  initImportExport();
});

function renderDashboard() {
  const stats = db.getStats();
  renderSummaryCards(stats);
  renderDeadlineAlerts(stats);
  renderCharts(stats);
  renderPWOList();
  updateDeadlineBadge(stats);
}

// ============================================================
// SUMMARY CARDS
// ============================================================
function renderSummaryCards(stats) {
  setEl('stat-total',    stats.total);
  setEl('stat-proses',   stats.proses + stats.qc);
  setEl('stat-selesai',  stats.selesai + stats.terkirim);
  setEl('stat-revenue',  formatRupiah(stats.revenue));
  setEl('stat-pcs',      stats.totalPcs.toLocaleString('id-ID') + ' pcs');
  setEl('stat-month',    stats.thisMonthCount + ' order');
}

// ============================================================
// DEADLINE ALERTS
// ============================================================
function renderDeadlineAlerts(stats) {
  const container = document.getElementById('deadline-alerts');
  if (!container) return;
  container.innerHTML = '';
  if (stats.deadlineSoon.length === 0) return;

  const banner = document.createElement('div');
  banner.className = 'alert-banner';
  const items = stats.deadlineSoon.map(d => {
    const label = d.diffDays <= 0 ? 'HARI INI!' : d.diffDays === 1 ? 'besok' : `${d.diffDays} hari lagi`;
    return `<strong>${d.client}</strong> (${label})`;
  }).join(', ');
  banner.innerHTML = `
    <span class="alert-banner-icon">🚨</span>
    <span class="alert-banner-text">Deadline segera: ${items}</span>
  `;
  container.appendChild(banner);
}

function updateDeadlineBadge(stats) {
  const badge = document.getElementById('deadline-badge');
  if (!badge) return;
  if (stats.deadlineSoon.length > 0) {
    badge.textContent = stats.deadlineSoon.length;
    badge.style.display = 'inline';
  } else {
    badge.style.display = 'none';
  }
}

// ============================================================
// CHARTS
// ============================================================
function renderCharts(stats) {
  renderTrendChart(stats);
  renderSizeChart(stats);
}

function renderTrendChart(stats) {
  const ctx = document.getElementById('chart-trend');
  if (!ctx) return;

  // Build last 6 months labels
  const labels = [];
  const data   = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    labels.push(d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }));
    data.push(stats.monthlyData[key] || 0);
  }

  if (chartTrend) chartTrend.destroy();
  chartTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Jumlah Order',
        data,
        borderColor: '#1a56db',
        backgroundColor: 'rgba(26,86,219,.12)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#1a56db',
        pointRadius: 4,
        pointHoverRadius: 6,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e293b',
          titleColor: '#94a3b8',
          bodyColor: '#fff',
          borderColor: '#334155',
          borderWidth: 1,
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#64748b' } },
        y: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#64748b', stepSize: 1 }, beginAtZero: true },
      }
    }
  });
}

function renderSizeChart(stats) {
  const ctx = document.getElementById('chart-size');
  if (!ctx) return;

  const labels = Object.keys(stats.sizeCount).filter(k => stats.sizeCount[k] > 0);
  const data   = labels.map(k => stats.sizeCount[k]);

  if (labels.length === 0) {
    labels.push('Belum ada data'); data.push(1);
  }

  const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#84cc16','#14b8a6'];

  if (chartSize) chartSize.destroy();
  chartSize = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: COLORS.slice(0, labels.length), borderWidth: 0, hoverOffset: 6 }]
    },
    options: {
      responsive: true,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#1e293b', titleColor: '#94a3b8', bodyColor: '#fff', borderColor: '#334155', borderWidth: 1 }
      }
    }
  });

  // Render legend
  const legendEl = document.getElementById('size-legend');
  if (legendEl) {
    legendEl.innerHTML = labels.map((l, i) => `
      <li class="legend-item">
        <span class="legend-dot" style="background:${COLORS[i]}"></span>
        <span class="legend-label">${l}</span>
        <span class="legend-val">${data[i]}</span>
      </li>
    `).join('');
  }
}

// ============================================================
// PWO LIST TABLE
// ============================================================
function renderPWOList(filter = {}) {
  const tbody = document.getElementById('pwo-tbody');
  if (!tbody) return;

  let orders = db.getAll();

  // Apply filters
  if (filter.status && filter.status !== 'all') {
    orders = orders.filter(o => o.status === filter.status);
  }
  if (filter.search) {
    const q = filter.search.toLowerCase();
    orders = orders.filter(o =>
      (o.client || '').toLowerCase().includes(q) ||
      (o.project || '').toLowerCase().includes(q) ||
      (o.pwoNumber || '').toLowerCase().includes(q)
    );
  }

  // Sort: newest first
  orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="8">
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <div class="empty-title">Belum ada PWO</div>
          <div class="empty-sub">Klik "+ Buat PWO Baru" untuk membuat Production Work Order pertama Anda.</div>
        </div>
      </td></tr>
    `;
    return;
  }

  tbody.innerHTML = orders.map(pwo => {
    const deadlineHtml = renderDeadlineBadge(pwo);
    const statusBadge  = renderStatusBadge(pwo.status);
    const total = pwo.grandTotal ? formatRupiah(pwo.grandTotal) : '—';
    const qty   = pwo.totalOrder || '—';
    return `
      <tr>
        <td><span class="pwo-no">${pwo.pwoNumber || '—'}</span></td>
        <td>
          <div class="pwo-client">${esc(pwo.client || 'Tanpa Nama')}</div>
          <div class="pwo-project">${esc(pwo.project || '')}</div>
        </td>
        <td>${deadlineHtml}</td>
        <td><span class="pwo-qty">${qty} pcs</span></td>
        <td><span class="pwo-total">${total}</span></td>
        <td>${statusBadge}</td>
        <td class="deadline-text">${formatDate(pwo.createdAt)}</td>
        <td>
          <div class="row-actions">
            <button class="action-icon-btn" onclick="openPWO('${pwo.id}')" title="Edit">✏️</button>
            <button class="action-icon-btn" onclick="duplicatePWO('${pwo.id}')" title="Duplikasi">📋</button>
            <button class="action-icon-btn" onclick="openInvoice('${pwo.id}')" title="Invoice">🧾</button>
            <button class="action-icon-btn" onclick="sendWA('${pwo.id}')" title="Kirim WA">📲</button>
            <button class="action-icon-btn danger" onclick="deletePWO('${pwo.id}')" title="Hapus">🗑</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderStatusBadge(status) {
  const map = {
    draft:    ['badge-draft',    '📝 Draft'],
    proses:   ['badge-proses',   '⚙️ Proses'],
    qc:       ['badge-qc',       '🔍 QC'],
    selesai:  ['badge-selesai',  '✅ Selesai'],
    terkirim: ['badge-terkirim', '📦 Terkirim'],
  };
  const [cls, label] = map[status] || map.draft;
  return `<span class="badge ${cls}">${label}</span>`;
}

function renderDeadlineBadge(pwo) {
  if (!pwo.deadline) return '<span class="deadline-text">—</span>';
  const dl   = new Date(pwo.deadline);
  const now  = new Date();
  const diff = Math.ceil((dl - now) / (1000*60*60*24));
  const text = dl.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });

  if (['selesai','terkirim'].includes(pwo.status)) {
    return `<span class="deadline-text">${text}</span>`;
  }
  if (diff <= 0)  return `<span class="deadline-text deadline-danger">❗ ${text}</span>`;
  if (diff <= 3)  return `<span class="deadline-text deadline-warn">⚠️ ${text} (${diff}h)</span>`;
  return `<span class="deadline-text">${text}</span>`;
}

// ============================================================
// ACTIONS
// ============================================================
function newPWO() {
  window.location.href = 'form.html';
}

function openPWO(id) {
  window.location.href = `form.html?id=${id}`;
}

function duplicatePWO(id) {
  if (!confirm('Duplikasi PWO ini?')) return;
  const copy = db.duplicate(id);
  if (copy) { showToast('✅ PWO berhasil diduplikasi!'); renderDashboard(); }
}

function deletePWO(id) {
  if (!confirm('Hapus PWO ini? Tindakan tidak bisa dibatalkan.')) return;
  db.delete(id);
  showToast('🗑 PWO dihapus', 'warning');
  renderDashboard();
}

function openInvoice(id) {
  window.location.href = `invoice.html?id=${id}`;
}

function sendWA(id) {
  const pwo = db.get(id);
  if (!pwo) return;
  const total = pwo.grandTotal ? formatRupiah(pwo.grandTotal) : 'belum dihitung';
  const msg = encodeURIComponent(
    `*PRODUCTION WORK ORDER*\n` +
    `No. PWO : ${pwo.pwoNumber || '-'}\n` +
    `Klien   : ${pwo.client || '-'}\n` +
    `Proyek  : ${pwo.project || '-'}\n` +
    `Qty     : ${pwo.totalOrder || 0} pcs\n` +
    `Total   : ${total}\n` +
    `Deadline: ${pwo.deadline ? new Date(pwo.deadline).toLocaleDateString('id-ID') : '-'}\n\n` +
    `_WYSPORT by Kakami_`
  );
  window.open(`https://wa.me/?text=${msg}`, '_blank');
}

// ============================================================
// SEARCH & FILTER
// ============================================================
function initSearch() {
  const searchInput = document.getElementById('search-input');
  const filterStatus = document.getElementById('filter-status');
  if (!searchInput || !filterStatus) return;

  let debounceTimer;
  const doFilter = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      renderPWOList({
        search: searchInput.value,
        status: filterStatus.value,
      });
    }, 200);
  };

  searchInput.addEventListener('input', doFilter);
  filterStatus.addEventListener('change', doFilter);
}

// ============================================================
// IMPORT / EXPORT
// ============================================================
function initImportExport() {
  const importInput = document.getElementById('import-input');
  if (!importInput) return;
  importInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        db.importJSON(ev.target.result);
        showToast('📂 Data berhasil diimpor!');
        renderDashboard();
      } catch (err) {
        showToast('Gagal impor: format tidak valid', 'error');
      }
    };
    reader.readAsText(file);
  });
}

function exportData() { db.exportJSON(); showToast('💾 Data diekspor!'); }

// ============================================================
// REMINDER (Notifications)
// ============================================================
function initReminders() {
  const stats = db.getStats();
  if (stats.deadlineSoon.length === 0) return;

  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      fireNotifications(stats.deadlineSoon);
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') fireNotifications(stats.deadlineSoon);
      });
    }
  }
}

function fireNotifications(items) {
  // Only fire once per session
  if (sessionStorage.getItem('notif_fired')) return;
  sessionStorage.setItem('notif_fired', '1');

  items.forEach((item, i) => {
    setTimeout(() => {
      const diff = item.diffDays;
      const body = diff <= 0
        ? `Deadline hari ini! (${item.client})`
        : `${diff} hari lagi — ${item.client}: ${item.project}`;
      new Notification('⚠️ Deadline PWO Mendekat', {
        body,
        icon: 'icon-192.png',
        tag: item.id,
      });
    }, i * 1500);
  });
}

// ============================================================
// HELPERS
// ============================================================
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function formatRupiah(num) {
  if (!num || isNaN(num)) return '—';
  return 'Rp ' + Number(num).toLocaleString('id-ID', { minimumFractionDigits: 0 });
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
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
