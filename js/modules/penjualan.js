/* ================================================
   Module: Penjualan & Order
   ================================================ */

const Penjualan = (() => {
  let filterStatus = 'SEMUA';

  const STATUS_LIST = ['LUNAS', 'DP 50%', 'BELUM BAYAR'];

  // Daftar produk jersey
  const PRODUK_LIST = [
    'Jersey Futsal', 'Jersey Bola', 'Jersey Basket',
    'Jersey Badminton', 'Jersey Voli', 'Jersey Lari',
    'Jersey Polo', 'Jersey Training', 'Jersey Custom', 'Lainnya'
  ];

  // Opsi ukuran segmen
  const UKURAN_SEGMEN = ['Dewasa', 'Anak'];

  // Opsi lengan
  const LENGAN_LIST = ['Lengan Pendek', 'Lengan Panjang'];

  // Embellishment & biaya tambahannya (Rp per pcs)
  const EMBELLISHMENT_LIST = [
    { label: 'Tanpa Embellishment', biaya: 0 },
    { label: 'Bordir Nama (+Rp 5.000/pcs)', biaya: 5000 },
    { label: 'Bordir Logo (+Rp 10.000/pcs)', biaya: 10000 },
    { label: 'Patch Woven (+Rp 8.000/pcs)', biaya: 8000 },
    { label: 'Print Nama (+Rp 3.000/pcs)', biaya: 3000 },
    { label: 'Print Nomor (+Rp 2.000/pcs)', biaya: 2000 },
    { label: 'Sublimasi Full (+Rp 15.000/pcs)', biaya: 15000 },
    { label: 'Lengan Tambahan (+Rp 7.000/pcs)', biaya: 7000 },
  ];

  // Metode pembayaran
  const METODE_BAYAR_LIST = ['Cash', 'Transfer Bank', 'QRIS', 'COD'];

  // Helper: biaya embellishment berdasarkan label
  function getEmbellishmentBiaya(label) {
    const found = EMBELLISHMENT_LIST.find(e => e.label === label);
    return found ? found.biaya : 0;
  }

  // Helper: label detail produk jersey
  function buildJerseyLabel(r) {
    const parts = [];
    if (r.ukuranSegmen) parts.push(r.ukuranSegmen);
    if (r.lengan) parts.push(r.lengan);
    if (r.customJersey === 'Ya') parts.push('Custom');
    if (r.embellishment && r.embellishment !== 'Tanpa Embellishment') {
      // Tampilkan singkat
      parts.push(r.embellishment.split('(')[0].trim());
    }
    return parts.length ? `<span style="font-size:11px;color:var(--text-muted)">${parts.join(' · ')}</span>` : '';
  }

  // Helper: badge metode bayar
  function metodeBayarBadge(metode) {
    const colors = {
      'Cash': 'var(--success)',
      'Transfer Bank': 'var(--primary-light)',
      'QRIS': 'var(--accent)',
      'COD': 'var(--warning)'
    };
    const color = colors[metode] || 'var(--text-muted)';
    return `<span style="font-size:11px;font-weight:600;color:${color};background:${color}22;padding:2px 7px;border-radius:20px">${metode || '-'}</span>`;
  }

  function render() {
    const periode = DB.getPeriodeKey();
    let data = DB.getByPeriode('penjualan', periode);

    if (filterStatus !== 'SEMUA') data = data.filter(r => r.status === filterStatus);

    const totalQty = data.reduce((s, r) => s + (parseInt(r.qty) || 0), 0);
    const totalHarga = data.reduce((s, r) => s + (parseFloat(r.totalHarga) || 0), 0);
    const totalDP = data.reduce((s, r) => s + (parseFloat(r.dpDiterima) || 0), 0);
    const totalSisa = data.reduce((s, r) => s + (parseFloat(r.sisaTagihan) || 0), 0);

    const chips = ['SEMUA', ...STATUS_LIST].map(s =>
      `<div class="chip ${filterStatus === s ? 'active' : ''}" onclick="Penjualan.setFilter('${s}')">${s}</div>`
    ).join('');

    const rows = data.length === 0
      ? `<tr><td colspan="11" class="table-empty">
           <div class="table-empty-icon">👕</div>
           <div class="table-empty-text">Belum ada data order jersey</div>
         </td></tr>`
      : data.map(r => `
          <tr>
            <td><span class="font-mono" style="color:var(--primary-light);font-size:11px">${r.noInvoice}</span></td>
            <td>${Utils.formatDateShort(r.tglOrder)}</td>
            <td class="wrap" style="max-width:110px">${r.namaPelanggan}</td>
            <td>
              <div style="font-size:12px;font-weight:600">${r.jenisProduk}</div>
              ${buildJerseyLabel(r)}
            </td>
            <td class="text-right">${Utils.formatNumber(r.qty)}</td>
            <td class="text-right rupiah">${Utils.formatRupiah(r.totalHarga)}</td>
            <td class="text-right rupiah">${Utils.formatRupiah(r.dpDiterima)}</td>
            <td class="text-right rupiah">${Utils.formatRupiah(r.sisaTagihan)}</td>
            <td>${metodeBayarBadge(r.metodePembayaran)}</td>
            <td>${Utils.statusBadge(r.status)}</td>
            <td>
              <button class="action-btn" onclick="Utils.printInvoice('${r.id}')" title="Cetak Invoice" style="font-size:15px">🖨️</button>
              <button class="action-btn edit" onclick="Penjualan.openEdit('${r.id}')" title="Edit">✏️</button>
              <button class="action-btn delete" onclick="Penjualan.deleteRecord('${r.id}')" title="Hapus">🗑️</button>
            </td>
          </tr>`).join('');

    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
        <div>
          <div class="page-title">Penjualan / Order Jersey</div>
          <div class="page-subtitle">Catatan Order, Invoice & Pembayaran</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="Penjualan.openForm()">+ Tambah</button>
      </div>

      <div class="rekap-grid">
        <div class="rekap-item">
          <div class="rekap-label">Total Order</div>
          <div class="rekap-value" style="color:var(--accent)">${data.length} order</div>
        </div>
        <div class="rekap-item">
          <div class="rekap-label">Total Qty</div>
          <div class="rekap-value">${Utils.formatNumber(totalQty)} pcs</div>
        </div>
        <div class="rekap-item">
          <div class="rekap-label">Total Pendapatan</div>
          <div class="rekap-value positive-color">${Utils.formatRupiah(totalHarga)}</div>
        </div>
        <div class="rekap-item">
          <div class="rekap-label">Sisa Tagihan</div>
          <div class="rekap-value warning-color">${Utils.formatRupiah(totalSisa)}</div>
        </div>
      </div>

      <div class="filter-chips">${chips}</div>

      <div class="export-bar">
        <button class="btn btn-secondary btn-sm" onclick="Penjualan.exportExcel()">📊 Excel</button>
        <button class="btn btn-secondary btn-sm" onclick="Utils.exportPDF()">🖨️ PDF</button>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Invoice</th><th>Tgl</th><th>Pelanggan</th><th>Produk & Detail</th>
              <th>Qty</th><th>Total</th><th>DP</th><th>Sisa</th><th>Metode</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="4">TOTAL</td>
              <td class="text-right">${Utils.formatNumber(totalQty)}</td>
              <td class="text-right">${Utils.formatRupiah(totalHarga)}</td>
              <td class="text-right">${Utils.formatRupiah(totalDP)}</td>
              <td class="text-right">${Utils.formatRupiah(totalSisa)}</td>
              <td colspan="3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }

  function setFilter(status) {
    filterStatus = status;
    App.renderCurrentPage();
  }

  function openForm(id) {
    const record = id ? DB.getAll('penjualan').find(r => r.id === id) : null;
    const isEdit = !!record;
    const r = record || {};

    const statusOptions = STATUS_LIST.map(s =>
      `<option value="${s}" ${r.status === s ? 'selected' : ''}>${s}</option>`
    ).join('');

    const produkOptions = PRODUK_LIST.map(p =>
      `<option value="${p}" ${r.jenisProduk === p ? 'selected' : ''}>${p}</option>`
    ).join('');

    const ukuranOptions = UKURAN_SEGMEN.map(u =>
      `<option value="${u}" ${(r.ukuranSegmen || 'Dewasa') === u ? 'selected' : ''}>${u}</option>`
    ).join('');

    const lenganOptions = LENGAN_LIST.map(l =>
      `<option value="${l}" ${(r.lengan || 'Lengan Pendek') === l ? 'selected' : ''}>${l}</option>`
    ).join('');

    const embellOptions = EMBELLISHMENT_LIST.map(e =>
      `<option value="${e.label}" ${r.embellishment === e.label ? 'selected' : ''}>${e.label}</option>`
    ).join('');

    const metodeOptions = METODE_BAYAR_LIST.map(m =>
      `<option value="${m}" ${(r.metodePembayaran || 'Cash') === m ? 'selected' : ''}>${m}</option>`
    ).join('');

    const formHtml = `
      <form id="penjualanForm" onsubmit="Penjualan.saveForm(event,'${id || ''}')">

        <!-- Baris 1: Invoice & Tanggal -->
        <div class="form-row">
          <div class="form-group">
            <label>No. Invoice</label>
            <input class="form-control" id="pvNoInv" type="text" placeholder="INV-001" value="${r.noInvoice || ''}" required>
          </div>
          <div class="form-group">
            <label>Tanggal Order</label>
            <input class="form-control" id="pvTgl" type="date" value="${r.tglOrder || Utils.todayISO()}" required>
          </div>
        </div>

        <!-- Nama Pelanggan -->
        <div class="form-group">
          <label>Nama Pelanggan / Tim / Klub</label>
          <input class="form-control" id="pvPelanggan" type="text" placeholder="Nama pelanggan / tim / perusahaan" value="${r.namaPelanggan || ''}" required>
        </div>

        <!-- Baris 2: Jenis Produk & Qty -->
        <div class="form-row">
          <div class="form-group">
            <label>Jenis Jersey</label>
            <select class="form-control" id="pvProduk">${produkOptions}</select>
          </div>
          <div class="form-group">
            <label>Qty (pcs)</label>
            <input class="form-control" id="pvQty" type="number" min="1" placeholder="16" value="${r.qty || ''}" oninput="Penjualan.calcTotal()" required>
          </div>
        </div>

        <!-- ===== Spesifikasi Jersey ===== -->
        <p style="font-size:12px;font-weight:700;color:var(--primary-light);margin:12px 0 8px;letter-spacing:0.5px;text-transform:uppercase">🏅 Spesifikasi Jersey</p>

        <!-- Baris 3: Ukuran Segmen & Lengan -->
        <div class="form-row">
          <div class="form-group">
            <label>Ukuran Segmen</label>
            <select class="form-control" id="pvUkuran">${ukuranOptions}</select>
          </div>
          <div class="form-group">
            <label>Model Lengan</label>
            <select class="form-control" id="pvLengan">${lenganOptions}</select>
          </div>
        </div>

        <!-- Baris 4: Custom Jersey & Embellishment -->
        <div class="form-row">
          <div class="form-group">
            <label>Custom Jersey?</label>
            <select class="form-control" id="pvCustom" onchange="Penjualan.calcTotal()">
              <option value="Tidak" ${(r.customJersey || 'Tidak') === 'Tidak' ? 'selected' : ''}>Tidak (Standar)</option>
              <option value="Ya" ${r.customJersey === 'Ya' ? 'selected' : ''}>Ya (Full Custom Design +Rp 10.000/pcs)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Embellishment</label>
            <select class="form-control" id="pvEmbell" onchange="Penjualan.calcTotal()">${embellOptions}</select>
          </div>
        </div>

        <!-- Info biaya tambahan -->
        <div id="pvBiayaTambahanInfo" style="background:var(--surface-2,rgba(255,255,255,0.05));border-radius:8px;padding:8px 12px;margin-bottom:10px;font-size:12px;color:var(--text-muted);display:flex;gap:16px;flex-wrap:wrap">
          <span>Custom: <strong id="pvInfoCustom" style="color:var(--accent)">Rp 0</strong></span>
          <span>Embellishment: <strong id="pvInfoEmbell" style="color:var(--accent)">Rp 0</strong></span>
          <span>Biaya Tambahan/pcs: <strong id="pvInfoTotal" style="color:var(--warning)">Rp 0</strong></span>
        </div>

        <!-- ===== Harga ===== -->
        <p style="font-size:12px;font-weight:700;color:var(--primary-light);margin:4px 0 8px;letter-spacing:0.5px;text-transform:uppercase">💰 Detail Harga</p>

        <!-- Baris 5: Harga Satuan Dasar & Total -->
        <div class="form-row">
          <div class="form-group">
            <label>Harga Satuan Dasar (Rp/pcs)</label>
            <input class="form-control" id="pvHargaSat" type="number" min="0" placeholder="65000" value="${r.hargaSatuan || ''}" oninput="Penjualan.calcTotal()" required>
          </div>
          <div class="form-group">
            <label>Harga Satuan Final (Rp/pcs)</label>
            <input class="form-control calculated-field" id="pvHargaFinal" type="number" readonly value="${r.hargaSatuanFinal || ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Total Harga (Rp)</label>
            <input class="form-control calculated-field" id="pvTotal" type="number" readonly value="${r.totalHarga || ''}">
          </div>
          <div class="form-group">
            <label>DP Diterima (Rp)</label>
            <input class="form-control" id="pvDP" type="number" min="0" placeholder="0" value="${r.dpDiterima || 0}" oninput="Penjualan.calcSisa()">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Sisa Tagihan (Rp)</label>
            <input class="form-control calculated-field" id="pvSisa" type="number" readonly value="${r.sisaTagihan || ''}">
          </div>
          <div class="form-group">
            <label>Tgl Lunas</label>
            <input class="form-control" id="pvTglLunas" type="date" value="${r.tglLunas || ''}">
          </div>
        </div>

        <!-- ===== Pembayaran ===== -->
        <p style="font-size:12px;font-weight:700;color:var(--primary-light);margin:4px 0 8px;letter-spacing:0.5px;text-transform:uppercase">🏦 Pembayaran</p>

        <div class="form-row">
          <div class="form-group">
            <label>Metode Pembayaran</label>
            <select class="form-control" id="pvMetode">${metodeOptions}</select>
          </div>
          <div class="form-group">
            <label>Status Pembayaran</label>
            <select class="form-control" id="pvStatus">${statusOptions}</select>
          </div>
        </div>

        <!-- Keterangan rekening jika Transfer -->
        <div class="form-group" id="pvRekeningGroup" style="display:${(r.metodePembayaran === 'Transfer Bank' || r.metodePembayaran === 'QRIS') ? 'block' : 'none'}">
          <label>No. Rekening / Nama Bank</label>
          <input class="form-control" id="pvRekening" type="text" placeholder="BCA 1234567890 a/n ..." value="${r.noRekening || ''}">
        </div>

        <div class="form-group">
          <label>Keterangan</label>
          <input class="form-control" id="pvKet" type="text" placeholder="Opsional (catatan tambahan)" value="${r.keterangan || ''}">
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="App.closeFormModal()">Batal</button>
          <button type="submit" class="btn btn-primary" style="flex:1">${isEdit ? 'Update' : 'Simpan'}</button>
        </div>
      </form>
    `;

    App.openFormModal(isEdit ? 'Edit Order Jersey' : 'Tambah Order Jersey', formHtml);

    // Pasang event listener untuk metode pembayaran setelah form dibuka
    setTimeout(() => {
      const metodeEl = document.getElementById('pvMetode');
      if (metodeEl) {
        metodeEl.addEventListener('change', () => {
          const val = metodeEl.value;
          const grp = document.getElementById('pvRekeningGroup');
          if (grp) grp.style.display = (val === 'Transfer Bank' || val === 'QRIS') ? 'block' : 'none';
        });
      }
      // Hitung awal
      calcTotal();
    }, 50);
  }

  function calcTotal() {
    const qty = parseFloat(document.getElementById('pvQty')?.value) || 0;
    const hargaDasar = parseFloat(document.getElementById('pvHargaSat')?.value) || 0;
    const isCustom = document.getElementById('pvCustom')?.value === 'Ya';
    const embellLabel = document.getElementById('pvEmbell')?.value || '';

    const biayaCustom = isCustom ? 10000 : 0;
    const biayaEmbell = getEmbellishmentBiaya(embellLabel);
    const biayaTambahan = biayaCustom + biayaEmbell;
    const hargaFinal = hargaDasar + biayaTambahan;
    const total = qty * hargaFinal;

    // Update info panel
    const infoCustomEl = document.getElementById('pvInfoCustom');
    const infoEmbellEl = document.getElementById('pvInfoEmbell');
    const infoTotalEl = document.getElementById('pvInfoTotal');
    if (infoCustomEl) infoCustomEl.textContent = Utils.formatRupiah(biayaCustom);
    if (infoEmbellEl) infoEmbellEl.textContent = Utils.formatRupiah(biayaEmbell);
    if (infoTotalEl) infoTotalEl.textContent = Utils.formatRupiah(biayaTambahan);

    const finalEl = document.getElementById('pvHargaFinal');
    const totalEl = document.getElementById('pvTotal');
    if (finalEl) finalEl.value = hargaFinal;
    if (totalEl) totalEl.value = total;

    calcSisa();
  }

  function calcSisa() {
    const total = parseFloat(document.getElementById('pvTotal')?.value) || 0;
    const dp = parseFloat(document.getElementById('pvDP')?.value) || 0;
    const sisaEl = document.getElementById('pvSisa');
    if (sisaEl) sisaEl.value = Math.max(0, total - dp);
  }

  function saveForm(e, id) {
    e.preventDefault();
    const qty = parseFloat(document.getElementById('pvQty').value) || 0;
    const hargaSatuan = parseFloat(document.getElementById('pvHargaSat').value) || 0;
    const isCustom = document.getElementById('pvCustom').value === 'Ya';
    const embellLabel = document.getElementById('pvEmbell').value;
    const biayaCustom = isCustom ? 10000 : 0;
    const biayaEmbell = getEmbellishmentBiaya(embellLabel);
    const hargaSatuanFinal = hargaSatuan + biayaCustom + biayaEmbell;
    const totalHarga = qty * hargaSatuanFinal;
    const dpDiterima = parseFloat(document.getElementById('pvDP').value) || 0;

    // Bug #5 fix: validasi DP tidak boleh melebihi total harga
    if (dpDiterima > totalHarga) {
      Utils.toast('DP tidak boleh melebihi Total Harga!', 'error');
      return;
    }

    const noInvoice = document.getElementById('pvNoInv').value.trim();
    // Bug #5 fix: cek duplikat no invoice dalam periode yang sama (kecuali saat edit record ini sendiri)
    const existingInv = DB.getByPeriode('penjualan', DB.getPeriodeKey())
      .find(r => r.noInvoice === noInvoice && r.id !== id);
    if (existingInv) {
      Utils.toast(`No. Invoice "${noInvoice}" sudah digunakan di periode ini!`, 'error');
      return;
    }

    const sisaTagihan = Math.max(0, totalHarga - dpDiterima);
    const metodePembayaran = document.getElementById('pvMetode').value;
    const noRekeningEl = document.getElementById('pvRekening');

    const record = {
      id: id || DB.generateId(),
      periode: DB.getPeriodeKey(),
      noInvoice, // sudah di-cache & divalidasi sebelumnya
      tglOrder: document.getElementById('pvTgl').value,
      namaPelanggan: document.getElementById('pvPelanggan').value.trim(),
      jenisProduk: document.getElementById('pvProduk').value,
      // Spesifikasi jersey
      ukuranSegmen: document.getElementById('pvUkuran').value,
      lengan: document.getElementById('pvLengan').value,
      customJersey: document.getElementById('pvCustom').value,
      embellishment: embellLabel,
      biayaCustomPerPcs: biayaCustom,
      biayaEmbellPerPcs: biayaEmbell,
      // Harga
      qty,
      hargaSatuan,
      hargaSatuanFinal,
      totalHarga,
      dpDiterima,
      sisaTagihan,
      tglLunas: document.getElementById('pvTglLunas').value,
      // Pembayaran
      metodePembayaran,
      noRekening: noRekeningEl ? noRekeningEl.value.trim() : '',
      status: document.getElementById('pvStatus').value,
      keterangan: document.getElementById('pvKet').value.trim()
    };

    if (id) DB.update('penjualan', id, record);
    else DB.add('penjualan', record);

    App.closeFormModal();
    App.renderCurrentPage();
    Utils.toast(id ? 'Data order diupdate' : 'Order jersey berhasil ditambahkan', 'success');
  }

  function openEdit(id) { openForm(id); }

  function deleteRecord(id) {
    Utils.confirm('Hapus data order jersey ini?', () => {
      DB.remove('penjualan', id);
      App.renderCurrentPage();
      Utils.toast('Data dihapus', 'info');
    });
  }

  function exportExcel() {
    const periode = DB.getPeriodeKey();
    const data = DB.getByPeriode('penjualan', periode);
    const headers = [
      'No Invoice', 'Tgl Order', 'Pelanggan', 'Jenis Jersey',
      'Ukuran', 'Lengan', 'Custom', 'Embellishment',
      'Qty', 'Harga Dasar/pcs', 'Harga Final/pcs', 'Total Harga',
      'DP Diterima', 'Sisa Tagihan', 'Metode Bayar', 'Status'
    ];
    const rows = data.map(r => [
      r.noInvoice, r.tglOrder, r.namaPelanggan, r.jenisProduk,
      r.ukuranSegmen || '', r.lengan || '', r.customJersey || '',
      r.embellishment || '',
      r.qty, r.hargaSatuan, r.hargaSatuanFinal, r.totalHarga,
      r.dpDiterima, r.sisaTagihan, r.metodePembayaran || '', r.status
    ]);
    Utils.exportExcel([{ sheetName: 'Penjualan Jersey', headers, rows }], `Penjualan_${periode}`);
  }

  return { render, setFilter, openForm, openEdit, deleteRecord, saveForm, calcTotal, calcSisa, exportExcel };
})();
