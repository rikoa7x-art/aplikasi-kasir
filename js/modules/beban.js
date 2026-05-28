/* ================================================
   Module: Beban Operasional
   ================================================ */

const Beban = (() => {
  const KATEGORI_LIST = ['Gaji & Upah', 'Sewa', 'Utilitas', 'Pemasaran', 'Administrasi', 'Pemeliharaan', 'Operasional', 'Lainnya'];

  function render() {
    const periode = DB.getPeriodeKey();
    const data = DB.getByPeriode('beban', periode);

    const totalBeban = data.reduce((s, r) => s + (parseFloat(r.jumlah) || 0), 0);

    // Rekap per kategori
    const rekapMap = {};
    KATEGORI_LIST.forEach(k => rekapMap[k] = 0);
    data.forEach(r => {
      if (rekapMap[r.kategori] !== undefined) rekapMap[r.kategori] += parseFloat(r.jumlah) || 0;
    });

    const rekapRows = Object.entries(rekapMap)
      .filter(([k, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => {
        const pct = totalBeban > 0 ? (v / totalBeban * 100) : 0;
        return `
          <div class="beban-rekap-item">
            <span style="font-size:12px;font-weight:600;min-width:100px;color:var(--text-secondary)">${k}</span>
            <div class="beban-bar-wrapper">
              <div class="beban-bar" style="width:${pct}%"></div>
            </div>
            <span class="beban-pct">${pct.toFixed(0)}%</span>
            <span style="font-size:12px;font-weight:700;min-width:90px;text-align:right">${Utils.formatRupiah(v)}</span>
          </div>`;
      }).join('') || '<div style="color:var(--text-muted);font-size:13px;padding:12px 0">Belum ada data</div>';

    const rows = data.length === 0
      ? `<tr><td colspan="6" class="table-empty">
           <div class="table-empty-icon">💼</div>
           <div class="table-empty-text">Belum ada beban operasional</div>
         </td></tr>`
      : data.map(r => `
          <tr>
            <td>${Utils.formatDateShort(r.tanggal)}</td>
            <td class="wrap" style="max-width:150px">${r.keterangan}</td>
            <td><span class="badge badge-primary" style="font-size:10px">${r.kategori}</span></td>
            <td class="text-right rupiah">${Utils.formatRupiah(r.jumlah)}</td>
            <td style="font-size:11px;color:var(--text-muted)">${r.buktiRef || '-'}</td>
            <td>
              <button class="action-btn edit" onclick="Beban.openEdit('${r.id}')">✏️</button>
              <button class="action-btn delete" onclick="Beban.deleteRecord('${r.id}')">🗑️</button>
            </td>
          </tr>`).join('');

    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
        <div>
          <div class="page-title">Beban Operasional</div>
          <div class="page-subtitle">Gaji, Sewa, Utilitas & Lainnya</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="Beban.openForm()">+ Tambah</button>
      </div>

      <div class="card card-gradient" style="margin-bottom:14px">
        <div class="kpi-label">Total Beban Operasional</div>
        <div class="kpi-value warning-color" style="font-size:22px">${Utils.formatRupiah(totalBeban)}</div>
      </div>

      <p class="section-title">Rekap Per Kategori</p>
      <div class="card" style="margin-bottom:16px">
        ${rekapRows}
      </div>

      <div class="export-bar">
        <button class="btn btn-secondary btn-sm" onclick="Beban.exportExcel()">📊 Excel</button>
        <button class="btn btn-secondary btn-sm" onclick="Utils.exportPDF()">🖨️ PDF</button>
      </div>

      <p class="section-title">Daftar Beban</p>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Tanggal</th><th>Keterangan</th><th>Kategori</th>
              <th>Jumlah (Rp)</th><th>Bukti/Ref</th><th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="3">TOTAL BEBAN</td>
              <td class="text-right">${Utils.formatRupiah(totalBeban)}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }

  function openForm(id) {
    const record = id ? DB.getAll('beban').find(r => r.id === id) : null;
    const isEdit = !!record;
    const r = record || {};

    const kategoriOpts = KATEGORI_LIST.map(k =>
      `<option value="${k}" ${r.kategori === k ? 'selected' : ''}>${k}</option>`
    ).join('');

    const formHtml = `
      <form id="bebanForm" onsubmit="Beban.saveForm(event,'${id || ''}')">
        <div class="form-row">
          <div class="form-group">
            <label>Tanggal</label>
            <input class="form-control" id="bnTgl" type="date" value="${r.tanggal || Utils.todayISO()}" required>
          </div>
          <div class="form-group">
            <label>Bukti / Referensi</label>
            <input class="form-control" id="bnRef" type="text" placeholder="BKT-001" value="${r.buktiRef || ''}">
          </div>
        </div>
        <div class="form-group">
          <label>Keterangan</label>
          <input class="form-control" id="bnKet" type="text" placeholder="Gaji karyawan, tagihan listrik, dll" value="${r.keterangan || ''}" required>
        </div>
        <div class="form-group">
          <label>Kategori</label>
          <select class="form-control" id="bnKat">${kategoriOpts}</select>
        </div>
        <div class="form-group">
          <label>Jumlah (Rp)</label>
          <input class="form-control" id="bnJumlah" type="number" min="0" placeholder="0" value="${r.jumlah || ''}" required>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="App.closeFormModal()">Batal</button>
          <button type="submit" class="btn btn-primary" style="flex:1">${isEdit ? 'Update' : 'Simpan'}</button>
        </div>
      </form>
    `;
    App.openFormModal(isEdit ? 'Edit Beban' : 'Tambah Beban Operasional', formHtml);
  }

  function saveForm(e, id) {
    e.preventDefault();
    const record = {
      id: id || DB.generateId(),
      periode: DB.getPeriodeKey(),
      tanggal: document.getElementById('bnTgl').value,
      keterangan: document.getElementById('bnKet').value.trim(),
      kategori: document.getElementById('bnKat').value,
      jumlah: parseFloat(document.getElementById('bnJumlah').value) || 0,
      buktiRef: document.getElementById('bnRef').value.trim()
    };
    if (id) DB.update('beban', id, record);
    else DB.add('beban', record);
    App.closeFormModal();
    App.renderCurrentPage();
    Utils.toast(id ? 'Beban diupdate' : 'Beban ditambahkan', 'success');
  }

  function openEdit(id) { openForm(id); }

  function deleteRecord(id) {
    Utils.confirm('Hapus beban ini?', () => {
      DB.remove('beban', id);
      App.renderCurrentPage();
      Utils.toast('Data dihapus', 'info');
    });
  }

  function exportExcel() {
    const periode = DB.getPeriodeKey();
    const data = DB.getByPeriode('beban', periode);
    const headers = ['Tanggal', 'Keterangan', 'Kategori', 'Jumlah', 'Bukti/Ref'];
    const rows = data.map(r => [r.tanggal, r.keterangan, r.kategori, r.jumlah, r.buktiRef]);
    Utils.exportExcel([{ sheetName: 'Beban Operasional', headers, rows }], `Beban_${periode}`);
  }

  return { render, openForm, openEdit, deleteRecord, saveForm, exportExcel };
})();
