/* ================================================
   Module: Pembelian Bahan Baku
   ================================================ */

const Pembelian = (() => {
  const STATUS_LIST = ['LUNAS', 'KREDIT', 'BELUM BAYAR'];
  const SATUAN_LIST = ['pcs', 'kg', 'liter', 'roll', 'lusin', 'rim', 'pak', 'unit', 'meter'];

  function render() {
    const periode = DB.getPeriodeKey();
    const data = DB.getByPeriode('pembelian', periode);

    const totalBeli = data.reduce((s, r) => s + (parseFloat(r.total) || 0), 0);
    const belumBayar = data.filter(r => r.statusBayar !== 'LUNAS').reduce((s, r) => s + (parseFloat(r.total) || 0), 0);

    const rows = data.length === 0
      ? `<tr><td colspan="9" class="table-empty">
           <div class="table-empty-icon">📦</div>
           <div class="table-empty-text">Belum ada data pembelian</div>
         </td></tr>`
      : data.map(r => `
          <tr>
            <td><span class="font-mono" style="color:var(--accent);font-size:11px">${r.noPO}</span></td>
            <td>${Utils.formatDateShort(r.tanggal)}</td>
            <td class="wrap" style="max-width:120px">${r.namaSupplier}</td>
            <td class="wrap" style="max-width:130px">${r.namaBahan}</td>
            <td class="text-right">${Utils.formatNumber(r.qty)} ${r.satuan}</td>
            <td class="text-right rupiah">${Utils.formatRupiah(r.hargaSatuan)}</td>
            <td class="text-right rupiah">${Utils.formatRupiah(r.total)}</td>
            <td>${Utils.statusBadge(r.statusBayar)}</td>
            <td>
              <button class="action-btn edit" onclick="Pembelian.openEdit('${r.id}')">✏️</button>
              <button class="action-btn delete" onclick="Pembelian.deleteRecord('${r.id}')">🗑️</button>
            </td>
          </tr>`).join('');

    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
        <div>
          <div class="page-title">Pembelian Bahan</div>
          <div class="page-subtitle">Pembelian Bahan Baku & Supplies</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="Pembelian.openForm()">+ Tambah</button>
      </div>

      <div class="rekap-grid">
        <div class="rekap-item">
          <div class="rekap-label">Total Pembelian</div>
          <div class="rekap-value negative-color">${Utils.formatRupiah(totalBeli)}</div>
        </div>
        <div class="rekap-item">
          <div class="rekap-label">Belum Lunas</div>
          <div class="rekap-value warning-color">${Utils.formatRupiah(belumBayar)}</div>
        </div>
        <div class="rekap-item">
          <div class="rekap-label">Jumlah Item</div>
          <div class="rekap-value">${data.length} transaksi</div>
        </div>
        <div class="rekap-item">
          <div class="rekap-label">Sudah Lunas</div>
          <div class="rekap-value positive-color">${Utils.formatRupiah(totalBeli - belumBayar)}</div>
        </div>
      </div>

      <div class="export-bar">
        <button class="btn btn-secondary btn-sm" onclick="Pembelian.exportExcel()">📊 Excel</button>
        <button class="btn btn-secondary btn-sm" onclick="Utils.exportPDF()">🖨️ PDF</button>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>No. PO</th><th>Tanggal</th><th>Supplier</th><th>Bahan</th>
              <th>Qty</th><th>Harga Sat.</th><th>Total</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="6">TOTAL PEMBELIAN</td>
              <td class="text-right">${Utils.formatRupiah(totalBeli)}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }

  function openForm(id) {
    const record = id ? DB.getAll('pembelian').find(r => r.id === id) : null;
    const isEdit = !!record;
    const r = record || {};

    const statusOpts = STATUS_LIST.map(s =>
      `<option value="${s}" ${r.statusBayar === s ? 'selected' : ''}>${s}</option>`
    ).join('');
    const satuanOpts = SATUAN_LIST.map(s =>
      `<option value="${s}" ${r.satuan === s ? 'selected' : ''}>${s}</option>`
    ).join('');

    const formHtml = `
      <form id="pembelianForm" onsubmit="Pembelian.saveForm(event,'${id || ''}')">
        <div class="form-row">
          <div class="form-group">
            <label>No. PO</label>
            <input class="form-control" id="pbPO" type="text" placeholder="PO-001" value="${r.noPO || ''}" required>
          </div>
          <div class="form-group">
            <label>Tanggal</label>
            <input class="form-control" id="pbTgl" type="date" value="${r.tanggal || Utils.todayISO()}" required>
          </div>
        </div>
        <div class="form-group">
          <label>Nama Supplier</label>
          <input class="form-control" id="pbSupplier" type="text" placeholder="Nama supplier" value="${r.namaSupplier || ''}" required>
        </div>
        <div class="form-group">
          <label>Nama Bahan / Item</label>
          <input class="form-control" id="pbBahan" type="text" placeholder="Kaos Polos, Tinta Sablon, dll" value="${r.namaBahan || ''}" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Qty</label>
            <input class="form-control" id="pbQty" type="number" min="0" step="any" placeholder="100" value="${r.qty || ''}" oninput="Pembelian.calcTotal()" required>
          </div>
          <div class="form-group">
            <label>Satuan</label>
            <select class="form-control" id="pbSatuan">${satuanOpts}</select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Harga Satuan (Rp)</label>
            <input class="form-control" id="pbHarga" type="number" min="0" placeholder="14000" value="${r.hargaSatuan || ''}" oninput="Pembelian.calcTotal()" required>
          </div>
          <div class="form-group">
            <label>Total (Rp)</label>
            <input class="form-control calculated-field" id="pbTotal" type="number" readonly value="${r.total || ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Jatuh Tempo</label>
            <input class="form-control" id="pbJT" type="date" value="${r.jatuhTempo || ''}">
          </div>
          <div class="form-group">
            <label>Status Bayar</label>
            <select class="form-control" id="pbStatus">${statusOpts}</select>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="App.closeFormModal()">Batal</button>
          <button type="submit" class="btn btn-primary" style="flex:1">${isEdit ? 'Update' : 'Simpan'}</button>
        </div>
      </form>
    `;
    App.openFormModal(isEdit ? 'Edit Pembelian' : 'Tambah Pembelian Bahan', formHtml);
  }

  function calcTotal() {
    const qty = parseFloat(document.getElementById('pbQty')?.value) || 0;
    const harga = parseFloat(document.getElementById('pbHarga')?.value) || 0;
    const el = document.getElementById('pbTotal');
    if (el) el.value = qty * harga;
  }

  function saveForm(e, id) {
    e.preventDefault();
    const qty = parseFloat(document.getElementById('pbQty').value) || 0;
    const hargaSatuan = parseFloat(document.getElementById('pbHarga').value) || 0;
    const record = {
      id: id || DB.generateId(),
      periode: DB.getPeriodeKey(),
      noPO: document.getElementById('pbPO').value.trim(),
      tanggal: document.getElementById('pbTgl').value,
      namaSupplier: document.getElementById('pbSupplier').value.trim(),
      namaBahan: document.getElementById('pbBahan').value.trim(),
      qty, satuan: document.getElementById('pbSatuan').value,
      hargaSatuan, total: qty * hargaSatuan,
      jatuhTempo: document.getElementById('pbJT').value,
      statusBayar: document.getElementById('pbStatus').value
    };
    if (id) DB.update('pembelian', id, record);
    else DB.add('pembelian', record);
    App.closeFormModal();
    App.renderCurrentPage();
    Utils.toast(id ? 'Pembelian diupdate' : 'Pembelian ditambahkan', 'success');
  }

  function openEdit(id) { openForm(id); }

  function deleteRecord(id) {
    Utils.confirm('Hapus data pembelian ini?', () => {
      DB.remove('pembelian', id);
      App.renderCurrentPage();
      Utils.toast('Data dihapus', 'info');
    });
  }

  function exportExcel() {
    const periode = DB.getPeriodeKey();
    const data = DB.getByPeriode('pembelian', periode);
    const headers = ['No PO', 'Tanggal', 'Supplier', 'Bahan', 'Qty', 'Satuan', 'Harga Satuan', 'Total', 'Jatuh Tempo', 'Status'];
    const rows = data.map(r => [r.noPO, r.tanggal, r.namaSupplier, r.namaBahan, r.qty, r.satuan, r.hargaSatuan, r.total, r.jatuhTempo, r.statusBayar]);
    Utils.exportExcel([{ sheetName: 'Pembelian', headers, rows }], `Pembelian_${periode}`);
  }

  return { render, openForm, openEdit, deleteRecord, saveForm, calcTotal, exportExcel };
})();
