/* ================================================
   SablonKas - Utility Functions
   ================================================ */

const Utils = (() => {

  // ---- Formatting ----
  function formatRupiah(amount) {
    const num = parseFloat(amount) || 0;
    return 'Rp ' + num.toLocaleString('id-ID', { minimumFractionDigits: 0 });
  }

  function formatNumber(amount) {
    const num = parseFloat(amount) || 0;
    return num.toLocaleString('id-ID');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
  }

  function getPeriodeLabel(periodeKey) {
    if (!periodeKey) return '';
    const [year, month] = periodeKey.split('-');
    const months = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${months[parseInt(month)]} ${year}`;
  }

  function getPeriodeLabelShort(periodeKey) {
    if (!periodeKey) return '';
    const [year, month] = periodeKey.split('-');
    const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${months[parseInt(month)]} ${year}`;
  }

  function todayISO() {
    return new Date().toISOString().split('T')[0];
  }

  // ---- Status Badge ----
  function statusBadge(status) {
    const map = {
      'LUNAS': 'badge-success',
      'SEBAGIAN': 'badge-warning',
      'DP 50%': 'badge-warning',
      'BELUM BAYAR': 'badge-danger',
      'KREDIT': 'badge-warning',
      'TERLAMBAT': 'badge-danger',
      'AKTIF': 'badge-info',
    };
    const cls = map[status] || 'badge-primary';
    return `<span class="badge ${cls}">${status}</span>`;
  }

  // ---- Toast ----
  function toast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3100);
  }

  // ---- Confirm Dialog ----
  function confirm(message, callback) {
    // Simple native confirm
    if (window.confirm(message)) callback();
  }

  // ---- Export to Excel ----
  function exportExcel(sheetData, filename) {
    // sheetData: array of { sheetName, headers, rows }
    const wb = XLSX.utils.book_new();
    sheetData.forEach(({ sheetName, headers, rows }) => {
      const wsData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
    });
    XLSX.writeFile(wb, filename + '.xlsx');
  }

  // ---- Export to PDF (print) ----
  function exportPDF() {
    window.print();
  }

  // ---- Build Mini Bar Chart (Canvas) ----
  function drawBarChart(canvasId, labels, datasets) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const padLeft = 8, padRight = 8, padTop = 20, padBottom = 30;
    const chartW = W - padLeft - padRight;
    const chartH = H - padTop - padBottom;

    ctx.clearRect(0, 0, W, H);

    const allVals = datasets.flatMap(d => d.data);
    const maxVal = Math.max(...allVals, 1);

    const barGroupW = chartW / labels.length;
    const barW = (barGroupW / datasets.length) * 0.65;
    const gap = barGroupW * 0.15;

    datasets.forEach((dataset, di) => {
      dataset.data.forEach((val, i) => {
        const barH = (val / maxVal) * chartH;
        const x = padLeft + i * barGroupW + gap / 2 + di * (barW + 2);
        const y = padTop + chartH - barH;

        // Bar gradient
        const grad = ctx.createLinearGradient(x, y, x, padTop + chartH);
        grad.addColorStop(0, dataset.color || '#6c63ff');
        grad.addColorStop(1, (dataset.color || '#6c63ff') + '44');
        ctx.fillStyle = grad;
        ctx.beginPath();
        // Polyfill for roundRect
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0]);
        } else {
          const r = 3;
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + barW - r, y);
          ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
          ctx.lineTo(x + barW, y + barH);
          ctx.lineTo(x, y + barH);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
        }
        ctx.fill();
      });
    });

    // X labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    labels.forEach((label, i) => {
      const x = padLeft + i * barGroupW + barGroupW / 2;
      ctx.fillText(label, x, H - 8);
    });

    // Legend
    ctx.textAlign = 'left';
    datasets.forEach((dataset, i) => {
      ctx.fillStyle = dataset.color || '#6c63ff';
      ctx.fillRect(padLeft + i * 90, 6, 10, 8);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(dataset.label || '', padLeft + i * 90 + 14, 14);
    });
  }

  return {
    formatRupiah, formatNumber, formatDate, formatDateShort,
    getPeriodeLabel, getPeriodeLabelShort, todayISO,
    statusBadge, toast, confirm,
    exportExcel, exportPDF, drawBarChart
  };
})();
