/* ================================================
   Module: Kas & Bank
   ================================================ */

const Kas = (() => {
  const KATEGORI = ['Penjualan', 'Pembelian Bahan', 'Gaji', 'Sewa', 'Utilitas', 'Pembelian Alat', 'Piutang Masuk', 'Bayar Hutang', 'Modal', 'Lainnya'];

  function render() {
    const periode = DB.getPeriodeKey();
    const settings = DB.getKasSettings(periode);
    const data = DB.getByPeriode('kas', periode);

    const saldoAwalKas = parseFloat(settings.saldoKas) || 0;
    const saldoAwalBank = parseFloat(settings.saldoBank) || 0;
    const saldoAwalTotal = saldoAwalKas + saldoAwalBank;

    const totalMasuk = data.reduce((s, r) => s + (parseFloat(r.masuk) || 0), 0);
    const totalKeluar = data.reduce((s, r) => s + (parseFloat(r.keluar) || 0), 0);
    const saldoAkhir = saldoAwalTotal + totalMasuk - totalKeluar;

    // Running saldo calculation
    let runningSaldo = saldoAwalTotal;
    const rows = data.length === 0
      ? `<tr><td colspan="7" class="table-empty">
           <div class="table-empty-icon">💰</div>
           <div class="table-empty-text">Belum ada transaksi kas</div>
         </td></tr>`
      : data.map(r => {
          const masuk = parseFloat(r.masuk) || 0;
          const keluar = parseFloat(r.keluar) || 0;
          runningSaldo += masuk - keluar;
          return `<tr>
            <td>${Utils.formatDateShort(r.tanggal)}</td>
            <td class="wrap" style="max-width:140px">${r.keterangan}</td>
            <td><span class="badge badge-primary" style="font-size:10px">${r.kategori}</span></td>
            <td class="text-right rupiah" style="color:var(--success)">${masuk > 0 ? Utils.formatRupiah(masuk) : '-'}</td>
            <td class="text-right rupiah" style="color:var(--danger)">${keluar > 0 ? Utils.formatRupiah(keluar) : '-'}</td>
            <td class="text-right rupiah">${Utils.formatRupiah(runningSaldo)}</td>
            <td>
              <button class="action-btn edit" onclick="Kas.openEdit('${r.id}')">✏️</button>
              <button class="action-btn delete" onclick="Kas.deleteRecord('${r.id}')">🗑️</button>
            </td>
          </tr>`;
        }).join('');

    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
        <div>
          <div class="page-title">Kas & Bank</div>
          <div class="page-subtitle">Buku Mutasi Kas Harian</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="Kas.openForm()">+ Tambah</button>
      </div>

      <div class="saldo-awal-card">
        <div class="saldo-item">
          <div class="saldo-label">Saldo Awal Kas</div>
          <div class="saldo-value">${Utils.formatRupiah(saldoAwalKas)}</div>
        </div>
        <div class="saldo-item">
          <div class="saldo-label">Saldo Awal Bank</div>
          <div class="saldo-value">${Utils.formatRupiah(saldoAwalBank)}</div>
        </div>
      </div>

      <div class="rekap-grid">
        <div class="rekap-item">
          <div class="rekap-label">Total Masuk</div>
          <div class="rekap-value positive-color">${Utils.formatRupiah(totalMasuk)}</div>
        </div>
        <div class="rekap-item">
          <div class="rekap-label">Total Keluar</div>
          <div class="rekap-value negative-color">${Utils.formatRupiah(totalKeluar)}</div>
        </div>
        <div class="rekap-item" style="grid-column:1/-1">
          <div class="rekap-label">Saldo Akhir</div>
          <div class="rekap-value ${saldoAkhir >= 0 ? 'positive-color' : 'negative-color'}" style="font-size:18px">${Utils.formatRupiah(saldoAkhir)}</div>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:14px">
        <button class="btn btn-secondary btn-sm" onclick="Kas.openSaldoAwal()">⚙️ Atur Saldo Awal</button>
        <button class="btn btn-secondary btn-sm" onclick="Kas.exportExcel()">📊 Excel</button>
        <button class="btn btn-secondary btn-sm" onclick="Utils.exportPDF()">🖨️ PDF</button>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Tanggal</th><th>Keterangan</th><th>Kategori</th>
              <th>Masuk (Rp)</th><th>Keluar (Rp)</th><th>Saldo (Rp)</th><th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="3">TOTAL PERIODE</td>
              <td class="text-right">${Utils.formatRupiah(totalMasuk)}</td>
              <td class="text-right">${Utils.formatRupiah(totalKeluar)}</td>
              <td class="text-right">${Utils.formatRupiah(saldoAkhir)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }

  function openSaldoAwal() {
    const periode = DB.getPeriodeKey();
    const settings = DB.getKasSettings(periode);
    const formHtml = `
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">
        Masukkan saldo awal kas dan bank untuk periode ini.
      </p>
      <div class="form-group">
        <label>Saldo Awal Kas Tunai (Rp)</label>
        <input class="form-control" id="saldoKas" type="number" min="0" value="${settings.saldoKas || 0}">
      </div>
      <div class="form-group">
        <label>Saldo Awal Bank (Rp)</label>
        <input class="form-control" id="saldoBank" type="number" min="0" value="${settings.saldoBank || 0}">
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="App.closeFormModal()">Batal</button>
        <button type="button" class="btn btn-primary" style="flex:1" onclick="Kas.saveSaldoAwal()">Simpan</button>
      </div>
    `;
    App.openFormModal('Saldo Awal Kas & Bank', formHtml);
  }

  function saveSaldoAwal() {
    const periode = DB.getPeriodeKey();
    DB.setKasSettings(periode, {
      saldoKas: parseFloat(document.getElementById('saldoKas').value) || 0,
      saldoBank: parseFloat(document.getElementById('saldoBank').value) || 0
    });
    App.closeFormModal();
    App.renderCurrentPage();
    Utils.toast('Saldo awal disimpan', 'success');
  }

  function openForm(id) {
    const record = id ? DB.getAll('kas').find(r => r.id === id) : null;
    const isEdit = !!record;
    const r = record || {};

    const kategoriOpts = KATEGORI.map(k =>
      `<option value="${k}" ${r.kategori === k ? 'selected' : ''}>${k}</option>`
    ).join('');

    const formHtml = `
      <form id="kasForm" onsubmit="Kas.saveForm(event,'${id || ''}')">
        <div class="form-row">
          <div class="form-group">
            <label>Tanggal</label>
            <input class="form-control" id="ksTgl" type="date" value="${r.tanggal || Utils.todayISO()}" required>
          </div>
          <div class="form-group">
            <label>Referensi</label>
            <input class="form-control" id="ksRef" type="text" placeholder="INV-001 / PO-001" value="${r.referensi || ''}">
          </div>
        </div>
        <div class="form-group">
          <label>Keterangan</label>
          <input class="form-control" id="ksKet" type="text" placeholder="Deskripsi transaksi" value="${r.keterangan || ''}" required>
        </div>
        <div class="form-group">
          <label>Kategori</label>
          <select class="form-control" id="ksKat">${kategoriOpts}</select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Uang Masuk (Rp)</label>
            <input class="form-control" id="ksMasuk" type="number" min="0" placeholder="0" value="${r.masuk || ''}">
          </div>
          <div class="form-group">
            <label>Uang Keluar (Rp)</label>
            <input class="form-control" id="ksKeluar" type="number" min="0" placeholder="0" value="${r.keluar || ''}">
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="App.closeFormModal()">Batal</button>
          <button type="submit" class="btn btn-primary" style="flex:1">${isEdit ? 'Update' : 'Simpan'}</button>
        </div>
      </form>
    `;
    App.openFormModal(isEdit ? 'Edit Transaksi Kas' : 'Tambah Transaksi Kas', formHtml);
  }

  function saveForm(e, id) {
    e.preventDefault();
    const record = {
      id: id || DB.generateId(),
      periode: DB.getPeriodeKey(),
      tanggal: document.getElementById('ksTgl').value,
      keterangan: document.getElementById('ksKet').value.trim(),
      kategori: document.getElementById('ksKat').value,
      referensi: document.getElementById('ksRef').value.trim(),
      masuk: parseFloat(document.getElementById('ksMasuk').value) || 0,
      keluar: parseFloat(document.getElementById('ksKeluar').value) || 0
    };
    if (id) DB.update('kas', id, record);
    else DB.add('kas', record);
    App.closeFormModal();
    App.renderCurrentPage();
    Utils.toast(id ? 'Transaksi diupdate' : 'Transaksi ditambahkan', 'success');
  }

  function openEdit(id) { openForm(id); }

  function deleteRecord(id) {
    Utils.confirm('Hapus transaksi ini?', () => {
      DB.remove('kas', id);
      App.renderCurrentPage();
      Utils.toast('Transaksi dihapus', 'info');
    });
  }

  function exportExcel() {
    const periode = DB.getPeriodeKey();
    const data = DB.getByPeriode('kas', periode);
    const headers = ['Tanggal', 'Keterangan', 'Kategori', 'Referensi', 'Masuk', 'Keluar'];
    const rows = data.map(r => [r.tanggal, r.keterangan, r.kategori, r.referensi, r.masuk, r.keluar]);
    Utils.exportExcel([{ sheetName: 'Kas & Bank', headers, rows }], `KasBank_${periode}`);
  }

  return { render, openSaldoAwal, saveSaldoAwal, openForm, openEdit, deleteRecord, saveForm, exportExcel };
})();
