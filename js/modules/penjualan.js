/* ================================================
   Module: Penjualan & Order
   ================================================ */

const Penjualan = (() => {
  let filterStatus = 'SEMUA';

  const STATUS_LIST = ['LUNAS', 'DP 50%', 'BELUM BAYAR'];
  const PRODUK_LIST = ['Kaos Sablon Manual', 'Kaos DTF', 'Kaos DTG', 'Kaos Polo Bordir', 'Kaos Polos', 'Sablon 2 Warna', 'Lainnya'];

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
      ? `<tr><td colspan="9" class="table-empty">
           <div class="table-empty-icon">📋</div>
           <div class="table-empty-text">Belum ada data penjualan</div>
         </td></tr>`
      : data.map(r => `
          <tr>
            <td><span class="font-mono" style="color:var(--primary-light);font-size:11px">${r.noInvoice}</span></td>
            <td>${Utils.formatDateShort(r.tglOrder)}</td>
            <td class="wrap" style="max-width:120px">${r.namaPelanggan}</td>
            <td>${r.jenisProduk}</td>
            <td class="text-right">${Utils.formatNumber(r.qty)}</td>
            <td class="text-right rupiah">${Utils.formatRupiah(r.totalHarga)}</td>
            <td class="text-right rupiah">${Utils.formatRupiah(r.dpDiterima)}</td>
            <td class="text-right rupiah">${Utils.formatRupiah(r.sisaTagihan)}</td>
            <td>${Utils.statusBadge(r.status)}</td>
            <td>
              <button class="action-btn edit" onclick="Penjualan.openEdit('${r.id}')" title="Edit">✏️</button>
              <button class="action-btn delete" onclick="Penjualan.deleteRecord('${r.id}')" title="Hapus">🗑️</button>
            </td>
          </tr>`).join('');

    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
        <div>
          <div class="page-title">Penjualan</div>
          <div class="page-subtitle">Catatan Order & Invoice</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="Penjualan.openForm()">+ Tambah</button>
      </div>

      <div class="rekap-grid">
        <div class="rekap-item">
          <div class="rekap-label">Total Transaksi</div>
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
              <th>Invoice</th><th>Tgl</th><th>Pelanggan</th><th>Produk</th>
              <th>Qty</th><th>Total</th><th>DP</th><th>Sisa</th><th>Status</th><th></th>
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
              <td colspan="2"></td>
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

    const formHtml = `
      <form id="penjualanForm" onsubmit="Penjualan.saveForm(event,'${id || ''}')">
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
        <div class="form-group">
          <label>Nama Pelanggan</label>
          <input class="form-control" id="pvPelanggan" type="text" placeholder="Nama pelanggan / perusahaan" value="${r.namaPelanggan || ''}" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Jenis Produk</label>
            <select class="form-control" id="pvProduk">${produkOptions}</select>
          </div>
          <div class="form-group">
            <label>Qty (pcs)</label>
            <input class="form-control" id="pvQty" type="number" min="1" placeholder="100" value="${r.qty || ''}" oninput="Penjualan.calcTotal()" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Harga Satuan (Rp)</label>
            <input class="form-control" id="pvHargaSat" type="number" min="0" placeholder="35000" value="${r.hargaSatuan || ''}" oninput="Penjualan.calcTotal()" required>
          </div>
          <div class="form-group">
            <label>Total Harga (Rp)</label>
            <input class="form-control calculated-field" id="pvTotal" type="number" readonly value="${r.totalHarga || ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>DP Diterima (Rp)</label>
            <input class="form-control" id="pvDP" type="number" min="0" placeholder="0" value="${r.dpDiterima || 0}" oninput="Penjualan.calcSisa()">
          </div>
          <div class="form-group">
            <label>Sisa Tagihan (Rp)</label>
            <input class="form-control calculated-field" id="pvSisa" type="number" readonly value="${r.sisaTagihan || ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Status Pembayaran</label>
            <select class="form-control" id="pvStatus">${statusOptions}</select>
          </div>
          <div class="form-group">
            <label>Tgl Lunas</label>
            <input class="form-control" id="pvTglLunas" type="date" value="${r.tglLunas || ''}">
          </div>
        </div>
        <div class="form-group">
          <label>Keterangan</label>
          <input class="form-control" id="pvKet" type="text" placeholder="Opsional" value="${r.keterangan || ''}">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="App.closeFormModal()">Batal</button>
          <button type="submit" class="btn btn-primary" style="flex:1">${isEdit ? 'Update' : 'Simpan'}</button>
        </div>
      </form>
    `;

    App.openFormModal(isEdit ? 'Edit Penjualan' : 'Tambah Penjualan', formHtml);
  }

  function calcTotal() {
    const qty = parseFloat(document.getElementById('pvQty')?.value) || 0;
    const harga = parseFloat(document.getElementById('pvHargaSat')?.value) || 0;
    const total = qty * harga;
    const totalEl = document.getElementById('pvTotal');
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
    const totalHarga = qty * hargaSatuan;
    const dpDiterima = parseFloat(document.getElementById('pvDP').value) || 0;
    const sisaTagihan = Math.max(0, totalHarga - dpDiterima);

    const record = {
      id: id || DB.generateId(),
      periode: DB.getPeriodeKey(),
      noInvoice: document.getElementById('pvNoInv').value.trim(),
      tglOrder: document.getElementById('pvTgl').value,
      namaPelanggan: document.getElementById('pvPelanggan').value.trim(),
      jenisProduk: document.getElementById('pvProduk').value,
      qty, hargaSatuan, totalHarga, dpDiterima, sisaTagihan,
      tglLunas: document.getElementById('pvTglLunas').value,
      status: document.getElementById('pvStatus').value,
      keterangan: document.getElementById('pvKet').value.trim()
    };

    if (id) DB.update('penjualan', id, record);
    else DB.add('penjualan', record);

    App.closeFormModal();
    App.renderCurrentPage();
    Utils.toast(id ? 'Data penjualan diupdate' : 'Penjualan berhasil ditambahkan', 'success');
  }

  function openEdit(id) { openForm(id); }

  function deleteRecord(id) {
    Utils.confirm('Hapus data penjualan ini?', () => {
      DB.remove('penjualan', id);
      App.renderCurrentPage();
      Utils.toast('Data dihapus', 'info');
    });
  }

  function exportExcel() {
    const periode = DB.getPeriodeKey();
    const data = DB.getByPeriode('penjualan', periode);
    const headers = ['No Invoice', 'Tgl Order', 'Pelanggan', 'Produk', 'Qty', 'Harga Satuan', 'Total Harga', 'DP Diterima', 'Sisa Tagihan', 'Status'];
    const rows = data.map(r => [r.noInvoice, r.tglOrder, r.namaPelanggan, r.jenisProduk, r.qty, r.hargaSatuan, r.totalHarga, r.dpDiterima, r.sisaTagihan, r.status]);
    Utils.exportExcel([{ sheetName: 'Penjualan', headers, rows }], `Penjualan_${periode}`);
  }

  return { render, setFilter, openForm, openEdit, deleteRecord, saveForm, calcTotal, calcSisa, exportExcel };
})();
