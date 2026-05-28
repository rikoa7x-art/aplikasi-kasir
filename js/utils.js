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

  // ---- Print Invoice Order Jersey ----
  function printInvoice(recordId) {
    const record = DB.getAll('penjualan').find(r => r.id === recordId);
    if (!record) { toast('Data tidak ditemukan', 'error'); return; }

    // Bug #10 fix: gunakan nama perusahaan dari pengaturan, bukan hardcode
    const company = DB.getCompanySettings();
    const companyName = company.nama || 'WY SPORT';
    const companyTagline = company.tagline || 'Jersey & Sportswear Custom';

    const formatRp = (v) => 'Rp ' + (parseFloat(v)||0).toLocaleString('id-ID');
    const fmtDate = (d) => { if (!d) return '-'; const dt = new Date(d); return isNaN(dt) ? d : dt.toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'}); };

    // Absolute path to logo to ensure it loads in the print popup window
    const logoSrc = new URL('icons/logo-wysport.png', window.location.href).href;

    // Build spec rows
    const specs = [];
    if (record.ukuranSegmen) specs.push(['Ukuran Segmen', record.ukuranSegmen]);
    if (record.lengan) specs.push(['Model Lengan', record.lengan]);
    if (record.customJersey) specs.push(['Custom Jersey', record.customJersey]);
    if (record.embellishment) specs.push(['Embellishment', record.embellishment.split('(')[0].trim()]);

    const specRows = specs.map(([label, val]) =>
      `<tr><td style="color:#666;width:45%">${label}</td><td style="font-weight:600">${val}</td></tr>`
    ).join('');

    const metodeBadgeColor = {
      'Cash': '#10b981', 'Transfer Bank': '#6c63ff', 'QRIS': '#22d3ee', 'COD': '#f59e0b'
    };
    const badgeColor = metodeBadgeColor[record.metodePembayaran] || '#666';

    const statusColors = { 'LUNAS': '#10b981', 'DP 50%': '#f59e0b', 'BELUM BAYAR': '#ef4444' };
    const statusColor = statusColors[record.status] || '#666';

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Invoice ${record.noInvoice} - ${companyName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; background: #fff; color: #1a1a1a; }
  .invoice-wrap { max-width: 720px; margin: 0 auto; padding: 32px 28px; }

  /* Header */
  .inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid #111; }
  .inv-logo-area { display: flex; align-items: center; gap: 14px; }
  .inv-logo { width: 90px; height: 90px; object-fit: contain; }
  .inv-company { }
  .inv-company-name { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #111; }
  .inv-company-tagline { font-size: 11px; color: #666; margin-top: 3px; }
  .inv-company-contact { font-size: 10px; color: #888; margin-top: 2px; line-height: 1.5; }
  .inv-meta { text-align: right; }
  .inv-number { font-size: 22px; font-weight: 800; color: #111; }
  .inv-date { font-size: 11px; color: #666; margin-top: 4px; }
  .inv-status-badge { display: inline-block; margin-top: 6px; padding: 3px 12px; border-radius: 99px; font-size: 11px; font-weight: 700; background: ${statusColor}22; color: ${statusColor}; border: 1px solid ${statusColor}44; }

  /* Bill To */
  .inv-bill { background: #f8f8f8; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px; }
  .inv-section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 6px; }
  .inv-customer-name { font-size: 16px; font-weight: 700; color: #111; }

  /* Product Detail */
  .inv-product { margin-bottom: 20px; }
  .inv-product-title { font-size: 15px; font-weight: 700; margin-bottom: 10px; color: #111; border-bottom: 1px solid #eee; padding-bottom: 8px; }
  .inv-spec-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .inv-spec-table td { padding: 5px 8px; }
  .inv-spec-table tr:nth-child(even) td { background: #f8f8f8; }

  /* Pricing */
  .inv-pricing { margin-bottom: 20px; }
  .inv-price-table { width: 100%; border-collapse: collapse; }
  .inv-price-table th { background: #111; color: #fff; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  .inv-price-table td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 12px; }
  .inv-price-table tfoot td { background: #f0f0f0; font-weight: 700; font-size: 13px; }
  .inv-price-table .amount { text-align: right; font-family: monospace; }

  /* Summary */
  .inv-summary { background: #f8f8f8; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px; }
  .inv-summary-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; font-size: 13px; }
  .inv-summary-row.total { border-top: 2px solid #111; margin-top: 6px; padding-top: 8px; font-weight: 800; font-size: 16px; }
  .inv-summary-row.sisa { color: #ef4444; font-weight: 700; }
  .inv-summary-row.lunas { color: #10b981; font-weight: 700; }

  /* Payment */
  .inv-payment { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
  .inv-payment-box { flex: 1; min-width: 160px; background: ${badgeColor}11; border: 1px solid ${badgeColor}33; border-radius: 8px; padding: 12px 14px; }
  .inv-payment-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 4px; }
  .inv-payment-value { font-size: 14px; font-weight: 700; color: ${badgeColor}; }

  /* Footer */
  .inv-footer { border-top: 1px solid #ddd; padding-top: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
  .inv-footer-note { font-size: 11px; color: #888; max-width: 300px; line-height: 1.5; }
  .inv-signature { text-align: center; }
  .inv-signature-line { width: 120px; border-top: 1px solid #333; margin: 40px auto 6px; }
  .inv-signature-label { font-size: 11px; color: #666; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none; }
    @page { margin: 1cm; }
  }
</style>
</head>
<body>
<div class="invoice-wrap">

  <!-- Print Button (hidden on print) -->
  <div class="no-print" style="margin-bottom:16px;text-align:right">
    <button onclick="window.print()" style="background:#111;color:#fff;border:none;padding:10px 24px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer">&#128424; Cetak Invoice</button>
    <button onclick="window.close()" style="background:#eee;color:#333;border:none;padding:10px 18px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;margin-left:8px">&times; Tutup</button>
  </div>

  <!-- Header -->
  <div class="inv-header">
    <div class="inv-logo-area">
      <img class="inv-logo" src="${logoSrc}" alt="${companyName}" onerror="this.style.display='none'">
      <div class="inv-company">
        <div class="inv-company-name">${companyName}</div>
        <div class="inv-company-tagline">${companyTagline}</div>
        ${company.alamat ? `<div class="inv-company-contact">📍 ${company.alamat}</div>` : ''}
        ${company.telepon ? `<div class="inv-company-contact">📱 ${company.telepon}</div>` : ''}
      </div>
    </div>
    <div class="inv-meta">
      <div class="inv-number">${record.noInvoice}</div>
      <div class="inv-date">Tanggal Order: ${fmtDate(record.tglOrder)}</div>
      ${record.tglLunas ? `<div class="inv-date">Tgl Lunas: ${fmtDate(record.tglLunas)}</div>` : ''}
      <div><span class="inv-status-badge">${record.status}</span></div>
    </div>
  </div>

  <!-- Bill To -->
  <div class="inv-bill">
    <div class="inv-section-label">Tagihan Kepada</div>
    <div class="inv-customer-name">${record.namaPelanggan}</div>
  </div>

  <!-- Product -->
  <div class="inv-product">
    <div class="inv-product-title">Detail Produk Jersey</div>
    <table class="inv-spec-table">
      <tr><td style="color:#666;width:45%">Jenis Jersey</td><td style="font-weight:700">${record.jenisProduk}</td></tr>
      ${specRows}
      <tr><td style="color:#666">Qty</td><td style="font-weight:700">${(record.qty||0).toLocaleString('id-ID')} pcs</td></tr>
    </table>
  </div>

  <!-- Pricing Table -->
  <div class="inv-pricing">
    <table class="inv-price-table">
      <thead>
        <tr>
          <th>Deskripsi</th>
          <th class="amount">Harga/pcs</th>
          <th class="amount">Qty</th>
          <th class="amount">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Harga Dasar Jersey</td>
          <td class="amount">${formatRp(record.hargaSatuan)}</td>
          <td class="amount">${record.qty}</td>
          <td class="amount">${formatRp((record.hargaSatuan||0)*(record.qty||0))}</td>
        </tr>
        ${(record.biayaCustomPerPcs > 0) ? `<tr><td>Custom Jersey Design</td><td class="amount">${formatRp(record.biayaCustomPerPcs)}</td><td class="amount">${record.qty}</td><td class="amount">${formatRp((record.biayaCustomPerPcs||0)*(record.qty||0))}</td></tr>` : ''}
        ${(record.biayaEmbellPerPcs > 0) ? `<tr><td>${(record.embellishment||'Embellishment').split('(')[0].trim()}</td><td class="amount">${formatRp(record.biayaEmbellPerPcs)}</td><td class="amount">${record.qty}</td><td class="amount">${formatRp((record.biayaEmbellPerPcs||0)*(record.qty||0))}</td></tr>` : ''}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3">TOTAL</td>
          <td class="amount">${formatRp(record.totalHarga)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- Summary -->
  <div class="inv-summary">
    <div class="inv-summary-row">
      <span>Total Harga</span>
      <strong>${formatRp(record.totalHarga)}</strong>
    </div>
    <div class="inv-summary-row">
      <span>DP Diterima</span>
      <strong style="color:#10b981">(${formatRp(record.dpDiterima)})</strong>
    </div>
    <div class="inv-summary-row total ${record.sisaTagihan <= 0 ? 'lunas' : 'sisa'}">
      <span>${record.sisaTagihan <= 0 ? 'LUNAS' : 'Sisa Tagihan'}</span>
      <strong>${formatRp(record.sisaTagihan <= 0 ? 0 : record.sisaTagihan)}</strong>
    </div>
  </div>

  <!-- Payment Method -->
  <div class="inv-payment">
    <div class="inv-payment-box">
      <div class="inv-payment-label">Metode Pembayaran</div>
      <div class="inv-payment-value">${record.metodePembayaran || 'Cash'}</div>
    </div>
    ${record.noRekening ? `<div class="inv-payment-box" style="flex:2">
      <div class="inv-payment-label">No. Rekening / Bank</div>
      <div class="inv-payment-value" style="font-size:12px;color:#333">${record.noRekening}</div>
    </div>` : ''}
    ${record.keterangan ? `<div class="inv-payment-box" style="flex:2;background:#f8f8f8;border-color:#ddd">
      <div class="inv-payment-label">Keterangan</div>
      <div class="inv-payment-value" style="font-size:12px;color:#333">${record.keterangan}</div>
    </div>` : ''}
  </div>

  <!-- Footer -->
  <div class="inv-footer">
    <div class="inv-footer-note">
      Terima kasih telah memesan jersey di <strong>${companyName}</strong>.<br>
      Barang yang sudah dibeli tidak dapat dikembalikan.<br>
      Hubungi kami jika ada pertanyaan.
    </div>
    <div class="inv-signature">
      <div class="inv-signature-line"></div>
      <div class="inv-signature-label">${companyName}</div>
    </div>
  </div>

</div>
</body></html>`;

    const win = window.open('', '_blank', 'width=800,height=900,scrollbars=yes');
    if (win) {
      win.document.write(html);
      win.document.close();
    } else {
      toast('Popup diblokir browser. Izinkan popup untuk mencetak invoice.', 'error');
    }
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
    exportExcel, exportPDF, printInvoice, drawBarChart
  };
})();
