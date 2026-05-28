/* ================================================
   Module: Piutang Pelanggan
   ================================================ */

const Piutang = (() => {
  let filterStatus = 'SEMUA';
  const STATUS_LIST = ['LUNAS', 'SEBAGIAN', 'BELUM BAYAR'];

  function render() {
    const periode = DB.getPeriodeKey();
    let data = DB.getAll('piutang').filter(r => r.periode === periode);
    if (filterStatus !== 'SEMUA') data = data.filter(r => r.status === filterStatus);

    const totalTagihan = data.reduce((s, r) => s + (parseFloat(r.totalTagihan) || 0), 0);
    const totalDibayar = data.reduce((s, r) => s + (parseFloat(r.dpBayar) || 0), 0);
    const totalSisa = data.reduce((s, r) => s + (parseFloat(r.sisaPiutang) || 0), 0);

    const chips = ['SEMUA', ...STATUS_LIST].map(s =>
      `<div class="chip ${filterStatus === s ? 'active' : ''}" onclick="Piutang.setFilter('${s}')">${s}</div>`
    ).join('');

    const today = new Date();
    const cards = data.length === 0
      ? `<div class="empty-state">
           <span class="empty-icon">👥</span>
           <div class="empty-title">Belum ada data piutang</div>
           <div class="empty-desc">Tambahkan piutang pelanggan untuk periode ini</div>
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
                  <div class="detail-card-name">${r.namaPelanggan}</div>
                  <div style="font-size:11px;color:var(--primary-light);margin-top:2px;font-family:monospace">${r.noInvoice}</div>
                </div>
                ${Utils.statusBadge(r.status)}
              </div>
              <div class="detail-card-body">
                <div class="detail-field">
                  <div class="detail-field-label">Total Tagihan</div>
                  <div class="detail-field-value positive-color">${Utils.formatRupiah(r.totalTagihan)}</div>
                </div>
                <div class="detail-field">
                  <div class="detail-field-label">Sudah Dibayar</div>
                  <div class="detail-field-value">${Utils.formatRupiah(r.dpBayar)}</div>
                </div>
                <div class="detail-field">
                  <div class="detail-field-label">Sisa Piutang</div>
                  <div class="detail-field-value ${parseFloat(r.sisaPiutang) > 0 ? 'warning-color' : 'positive-color'}">${Utils.formatRupiah(r.sisaPiutang)}</div>
                </div>
                <div class="detail-field">
                  <div class="detail-field-label">Jatuh Tempo</div>
                  <div class="detail-field-value" style="${terlambat ? 'color:var(--danger)' : ''}">${jtLabel}</div>
                </div>
                <div class="detail-field">
                  <div class="detail-field-label">Tgl Invoice</div>
                  <div class="detail-field-value">${Utils.formatDate(r.tglInvoice)}</div>
                </div>
              </div>
              <div class="detail-actions">
                <button class="btn btn-secondary btn-sm" onclick="Piutang.openEdit('${r.id}')">✏️ Edit</button>
                <button class="btn btn-danger btn-sm" onclick="Piutang.deleteRecord('${r.id}')">🗑️ Hapus</button>
              </div>
            </div>`;
        }).join('');

    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
        <div>
          <div class="page-title">Piutang</div>
          <div class="page-subtitle">Kartu Piutang Pelanggan</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="Piutang.openForm()">+ Tambah</button>
      </div>

      <div class="rekap-grid">
        <div class="rekap-item">
          <div class="rekap-label">Total Tagihan</div>
          <div class="rekap-value positive-color">${Utils.formatRupiah(totalTagihan)}</div>
        </div>
        <div class="rekap-item">
          <div class="rekap-label">Sisa Piutang</div>
          <div class="rekap-value warning-color">${Utils.formatRupiah(totalSisa)}</div>
        </div>
        <div class="rekap-item">
          <div class="rekap-label">Sudah Dibayar</div>
          <div class="rekap-value">${Utils.formatRupiah(totalDibayar)}</div>
        </div>
        <div class="rekap-item">
          <div class="rekap-label">Jml Pelanggan</div>
          <div class="rekap-value">${data.length} pelanggan</div>
        </div>
      </div>

      <div class="filter-chips">${chips}</div>

      <div class="export-bar">
        <button class="btn btn-secondary btn-sm" onclick="Piutang.exportExcel()">📊 Excel</button>
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
    const record = id ? DB.getAll('piutang').find(r => r.id === id) : null;
    const isEdit = !!record;
    const r = record || {};

    const statusOpts = STATUS_LIST.map(s =>
      `<option value="${s}" ${r.status === s ? 'selected' : ''}>${s}</option>`
    ).join('');

    const formHtml = `
      <form id="piutangForm" onsubmit="Piutang.saveForm(event,'${id || ''}')">
        <div class="form-group">
          <label>Nama Pelanggan</label>
          <input class="form-control" id="ptPelanggan" type="text" placeholder="Nama pelanggan" value="${r.namaPelanggan || ''}" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>No. Invoice</label>
            <input class="form-control" id="ptInv" type="text" placeholder="INV-001" value="${r.noInvoice || ''}" required>
          </div>
          <div class="form-group">
            <label>Tgl Invoice</label>
            <input class="form-control" id="ptTgl" type="date" value="${r.tglInvoice || Utils.todayISO()}" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Total Tagihan (Rp)</label>
            <input class="form-control" id="ptTotal" type="number" min="0" placeholder="0" value="${r.totalTagihan || ''}" oninput="Piutang.calcSisa()" required>
          </div>
          <div class="form-group">
            <label>Sudah Dibayar (Rp)</label>
            <input class="form-control" id="ptBayar" type="number" min="0" placeholder="0" value="${r.dpBayar || 0}" oninput="Piutang.calcSisa()">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Sisa Piutang (Rp)</label>
            <input class="form-control calculated-field" id="ptSisa" type="number" readonly value="${r.sisaPiutang || ''}">
          </div>
          <div class="form-group">
            <label>Jatuh Tempo</label>
            <input class="form-control" id="ptJT" type="date" value="${r.jatuhTempo || ''}">
          </div>
        </div>
        <div class="form-group">
          <label>Status Piutang</label>
          <select class="form-control" id="ptStatus">${statusOpts}</select>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="App.closeFormModal()">Batal</button>
          <button type="submit" class="btn btn-primary" style="flex:1">${isEdit ? 'Update' : 'Simpan'}</button>
        </div>
      </form>
    `;
    App.openFormModal(isEdit ? 'Edit Piutang' : 'Tambah Piutang', formHtml);
  }

  function calcSisa() {
    const total = parseFloat(document.getElementById('ptTotal')?.value) || 0;
    const bayar = parseFloat(document.getElementById('ptBayar')?.value) || 0;
    const el = document.getElementById('ptSisa');
    if (el) el.value = Math.max(0, total - bayar);
  }

  function saveForm(e, id) {
    e.preventDefault();
    const total = parseFloat(document.getElementById('ptTotal').value) || 0;
    const bayar = parseFloat(document.getElementById('ptBayar').value) || 0;
    const record = {
      id: id || DB.generateId(),
      periode: DB.getPeriodeKey(),
      namaPelanggan: document.getElementById('ptPelanggan').value.trim(),
      noInvoice: document.getElementById('ptInv').value.trim(),
      tglInvoice: document.getElementById('ptTgl').value,
      totalTagihan: total, dpBayar: bayar,
      sisaPiutang: Math.max(0, total - bayar),
      jatuhTempo: document.getElementById('ptJT').value,
      status: document.getElementById('ptStatus').value
    };
    if (id) DB.update('piutang', id, record);
    else DB.add('piutang', record);
    App.closeFormModal();
    App.renderCurrentPage();
    Utils.toast(id ? 'Piutang diupdate' : 'Piutang ditambahkan', 'success');
  }

  function openEdit(id) { openForm(id); }

  function deleteRecord(id) {
    Utils.confirm('Hapus data piutang ini?', () => {
      DB.remove('piutang', id);
      App.renderCurrentPage();
      Utils.toast('Data dihapus', 'info');
    });
  }

  function exportExcel() {
    const periode = DB.getPeriodeKey();
    const data = DB.getAll('piutang').filter(r => r.periode === periode);
    const headers = ['Pelanggan', 'No Invoice', 'Tgl Invoice', 'Total Tagihan', 'Sudah Dibayar', 'Sisa Piutang', 'Jatuh Tempo', 'Status'];
    const rows = data.map(r => [r.namaPelanggan, r.noInvoice, r.tglInvoice, r.totalTagihan, r.dpBayar, r.sisaPiutang, r.jatuhTempo, r.status]);
    Utils.exportExcel([{ sheetName: 'Piutang', headers, rows }], `Piutang_${periode}`);
  }

  return { render, setFilter, openForm, openEdit, deleteRecord, saveForm, calcSisa, exportExcel };
})();
