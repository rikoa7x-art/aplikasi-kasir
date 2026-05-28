/* ================================================
   Module: Hutang Supplier
   ================================================ */

const Hutang = (() => {
  let filterStatus = 'SEMUA';
  const STATUS_LIST = ['LUNAS', 'SEBAGIAN', 'BELUM BAYAR'];

  function render() {
    const periode = DB.getPeriodeKey();
    let data = DB.getAll('hutang').filter(r => r.periode === periode);
    if (filterStatus !== 'SEMUA') data = data.filter(r => r.status !== 'LUNAS');

    const totalHutang = data.reduce((s, r) => s + (parseFloat(r.totalHutang) || 0), 0);
    const totalDibayar = data.reduce((s, r) => s + (parseFloat(r.sudahDibayar) || 0), 0);
    const totalSisa = data.reduce((s, r) => s + (parseFloat(r.sisaHutang) || 0), 0);

    const chips = ['SEMUA', 'BELUM LUNAS'].map(s =>
      `<div class="chip ${filterStatus === s ? 'active' : ''}" onclick="Hutang.setFilter('${s}')">${s}</div>`
    ).join('');

    const today = new Date();
    const cards = data.length === 0
      ? `<div class="empty-state">
           <span class="empty-icon">🏢</span>
           <div class="empty-title">Belum ada data hutang</div>
           <div class="empty-desc">Tambahkan hutang supplier untuk periode ini</div>
         </div>`
      : data.map(r => {
          const jt = r.jatuhTempo ? new Date(r.jatuhTempo) : null;
          const terlambat = jt && r.status !== 'LUNAS' && jt < today;
          const hariLagi = jt ? Math.ceil((jt - today) / (1000 * 60 * 60 * 24)) : null;
          let jtLabel = '-';
          if (jt) {
            if (r.status === 'LUNAS') jtLabel = `✅ ${Utils.formatDate(r.jatuhTempo)}`;
            else if (terlambat) jtLabel = `⚠️ Terlambat ${Math.abs(hariLagi)} hari`;
            else if (hariLagi <= 7) jtLabel = `⏰ ${hariLagi} hari lagi`;
            else jtLabel = Utils.formatDate(r.jatuhTempo);
          }
          return `
            <div class="detail-card">
              <div class="detail-card-header">
                <div>
                  <div class="detail-card-name">${r.namaSupplier}</div>
                  <div style="font-size:11px;color:var(--accent);margin-top:2px;font-family:monospace">${r.noPO}</div>
                </div>
                ${Utils.statusBadge(r.status)}
              </div>
              <div class="detail-card-body">
                <div class="detail-field">
                  <div class="detail-field-label">Total Hutang</div>
                  <div class="detail-field-value negative-color">${Utils.formatRupiah(r.totalHutang)}</div>
                </div>
                <div class="detail-field">
                  <div class="detail-field-label">Sudah Dibayar</div>
                  <div class="detail-field-value positive-color">${Utils.formatRupiah(r.sudahDibayar)}</div>
                </div>
                <div class="detail-field">
                  <div class="detail-field-label">Sisa Hutang</div>
                  <div class="detail-field-value ${parseFloat(r.sisaHutang) > 0 ? 'warning-color' : 'positive-color'}">${Utils.formatRupiah(r.sisaHutang)}</div>
                </div>
                <div class="detail-field">
                  <div class="detail-field-label">Jatuh Tempo</div>
                  <div class="detail-field-value" style="${terlambat ? 'color:var(--danger)' : ''}">${jtLabel}</div>
                </div>
                <div class="detail-field">
                  <div class="detail-field-label">Tgl PO</div>
                  <div class="detail-field-value">${Utils.formatDate(r.tglPO)}</div>
                </div>
              </div>
              <div class="detail-actions">
                <button class="btn btn-secondary btn-sm" onclick="Hutang.openEdit('${r.id}')">✏️ Edit</button>
                <button class="btn btn-danger btn-sm" onclick="Hutang.deleteRecord('${r.id}')">🗑️ Hapus</button>
              </div>
            </div>`;
        }).join('');

    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
        <div>
          <div class="page-title">Hutang Supplier</div>
          <div class="page-subtitle">Kartu Hutang & Jatuh Tempo</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="Hutang.openForm()">+ Tambah</button>
      </div>

      <div class="rekap-grid">
        <div class="rekap-item">
          <div class="rekap-label">Total Hutang</div>
          <div class="rekap-value negative-color">${Utils.formatRupiah(totalHutang)}</div>
        </div>
        <div class="rekap-item">
          <div class="rekap-label">Sisa Hutang</div>
          <div class="rekap-value warning-color">${Utils.formatRupiah(totalSisa)}</div>
        </div>
        <div class="rekap-item">
          <div class="rekap-label">Sudah Dibayar</div>
          <div class="rekap-value positive-color">${Utils.formatRupiah(totalDibayar)}</div>
        </div>
        <div class="rekap-item">
          <div class="rekap-label">Jml Supplier</div>
          <div class="rekap-value">${data.length} supplier</div>
        </div>
      </div>

      <div class="filter-chips">${chips}</div>

      <div class="export-bar">
        <button class="btn btn-secondary btn-sm" onclick="Hutang.exportExcel()">📊 Excel</button>
        <button class="btn btn-secondary btn-sm" onclick="Utils.exportPDF()">🖨️ PDF</button>
      </div>

      ${cards}
    `;
  }

  function setFilter(status) {
    filterStatus = status;
    App.renderCurrentPage();
  }

  function openForm(id) {
    const record = id ? DB.getAll('hutang').find(r => r.id === id) : null;
    const isEdit = !!record;
    const r = record || {};

    const statusOpts = STATUS_LIST.map(s =>
      `<option value="${s}" ${r.status === s ? 'selected' : ''}>${s}</option>`
    ).join('');

    const formHtml = `
      <form id="hutangForm" onsubmit="Hutang.saveForm(event,'${id || ''}')">
        <div class="form-group">
          <label>Nama Supplier</label>
          <input class="form-control" id="htSupplier" type="text" placeholder="Nama supplier" value="${r.namaSupplier || ''}" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>No. PO</label>
            <input class="form-control" id="htPO" type="text" placeholder="PO-001" value="${r.noPO || ''}" required>
          </div>
          <div class="form-group">
            <label>Tgl PO</label>
            <input class="form-control" id="htTgl" type="date" value="${r.tglPO || Utils.todayISO()}" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Total Hutang (Rp)</label>
            <input class="form-control" id="htTotal" type="number" min="0" placeholder="0" value="${r.totalHutang || ''}" oninput="Hutang.calcSisa()" required>
          </div>
          <div class="form-group">
            <label>Sudah Dibayar (Rp)</label>
            <input class="form-control" id="htBayar" type="number" min="0" placeholder="0" value="${r.sudahDibayar || 0}" oninput="Hutang.calcSisa()">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Sisa Hutang (Rp)</label>
            <input class="form-control calculated-field" id="htSisa" type="number" readonly value="${r.sisaHutang || ''}">
          </div>
          <div class="form-group">
            <label>Jatuh Tempo</label>
            <input class="form-control" id="htJT" type="date" value="${r.jatuhTempo || ''}">
          </div>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select class="form-control" id="htStatus">${statusOpts}</select>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="App.closeFormModal()">Batal</button>
          <button type="submit" class="btn btn-primary" style="flex:1">${isEdit ? 'Update' : 'Simpan'}</button>
        </div>
      </form>
    `;
    App.openFormModal(isEdit ? 'Edit Hutang' : 'Tambah Hutang Supplier', formHtml);
  }

  function calcSisa() {
    const total = parseFloat(document.getElementById('htTotal')?.value) || 0;
    const bayar = parseFloat(document.getElementById('htBayar')?.value) || 0;
    const el = document.getElementById('htSisa');
    if (el) el.value = Math.max(0, total - bayar);
  }

  function saveForm(e, id) {
    e.preventDefault();
    const total = parseFloat(document.getElementById('htTotal').value) || 0;
    const bayar = parseFloat(document.getElementById('htBayar').value) || 0;
    const record = {
      id: id || DB.generateId(),
      periode: DB.getPeriodeKey(),
      namaSupplier: document.getElementById('htSupplier').value.trim(),
      noPO: document.getElementById('htPO').value.trim(),
      tglPO: document.getElementById('htTgl').value,
      totalHutang: total, sudahDibayar: bayar,
      sisaHutang: Math.max(0, total - bayar),
      jatuhTempo: document.getElementById('htJT').value,
      status: document.getElementById('htStatus').value
    };
    if (id) DB.update('hutang', id, record);
    else DB.add('hutang', record);
    App.closeFormModal();
    App.renderCurrentPage();
    Utils.toast(id ? 'Hutang diupdate' : 'Hutang ditambahkan', 'success');
  }

  function openEdit(id) { openForm(id); }

  function deleteRecord(id) {
    Utils.confirm('Hapus data hutang ini?', () => {
      DB.remove('hutang', id);
      App.renderCurrentPage();
      Utils.toast('Data dihapus', 'info');
    });
  }

  function exportExcel() {
    const periode = DB.getPeriodeKey();
    const data = DB.getAll('hutang').filter(r => r.periode === periode);
    const headers = ['Supplier', 'No PO', 'Tgl PO', 'Total Hutang', 'Sudah Dibayar', 'Sisa Hutang', 'Jatuh Tempo', 'Status'];
    const rows = data.map(r => [r.namaSupplier, r.noPO, r.tglPO, r.totalHutang, r.sudahDibayar, r.sisaHutang, r.jatuhTempo, r.status]);
    Utils.exportExcel([{ sheetName: 'Hutang Supplier', headers, rows }], `Hutang_${periode}`);
  }

  return { render, setFilter, openForm, openEdit, deleteRecord, saveForm, calcSisa, exportExcel };
})();
