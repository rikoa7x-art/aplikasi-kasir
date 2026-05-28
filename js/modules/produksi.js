/* ================================================
   Module: Produksi / HPP Per Order
   ================================================ */

const Produksi = (() => {

  function render() {
    const periode = DB.getPeriodeKey();
    const data = DB.getByPeriode('produksi', periode);

    const totalHPP = data.reduce((s, r) => s + (parseFloat(r.totalHPP) || 0), 0);
    const totalHargaJual = data.reduce((s, r) => s + (parseFloat(r.hargaJual) || 0), 0);
    const avgMargin = data.length > 0
      ? (data.reduce((s, r) => s + (parseFloat(r.margin) || 0), 0) / data.length)
      : 0;

    const rows = data.length === 0
      ? `<tr><td colspan="10" class="table-empty">
           <div class="table-empty-icon">👕</div>
           <div class="table-empty-text">Belum ada data produksi / HPP jersey</div>
         </td></tr>`
      : data.map(r => {
          const margin = parseFloat(r.margin) || 0;
          const marginColor = margin >= 0.3 ? 'var(--success)' : margin >= 0.1 ? 'var(--warning)' : 'var(--danger)';
          return `<tr>
            <td><span class="font-mono" style="color:var(--primary-light);font-size:11px">${r.noInvoice}</span></td>
            <td class="wrap" style="max-width:100px">${r.namaProduk}</td>
            <td class="text-right">${Utils.formatNumber(r.qty)}</td>
            <td class="text-right rupiah">${Utils.formatRupiah(r.bahanBaku)}</td>
            <td class="text-right rupiah">${Utils.formatRupiah(r.tintaFilm)}</td>
            <td class="text-right rupiah">${Utils.formatRupiah(r.tkLangsung)}</td>
            <td class="text-right rupiah">${Utils.formatRupiah(r.overhead)}</td>
            <td class="text-right rupiah" style="color:var(--warning);font-weight:700">${Utils.formatRupiah(r.totalHPP)}</td>
            <td class="text-right rupiah">${Utils.formatRupiah(r.hargaJual)}</td>
            <td class="text-right" style="color:${marginColor};font-weight:700">${(margin * 100).toFixed(1)}%</td>
            <td>
              <button class="action-btn edit" onclick="Produksi.openEdit('${r.id}')">✏️</button>
              <button class="action-btn delete" onclick="Produksi.deleteRecord('${r.id}')">🗑️</button>
            </td>
          </tr>`;
        }).join('');

    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
        <div>
          <div class="page-title">Produksi / HPP</div>
          <div class="page-subtitle">Biaya Produksi & HPP Per Order</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="Produksi.openForm()">+ Tambah</button>
      </div>

      <div class="rekap-grid">
        <div class="rekap-item">
          <div class="rekap-label">Total HPP</div>
          <div class="rekap-value warning-color">${Utils.formatRupiah(totalHPP)}</div>
        </div>
        <div class="rekap-item">
          <div class="rekap-label">Total Harga Jual</div>
          <div class="rekap-value positive-color">${Utils.formatRupiah(totalHargaJual)}</div>
        </div>
        <div class="rekap-item">
          <div class="rekap-label">Avg. Margin</div>
          <div class="rekap-value ${avgMargin >= 0.3 ? 'positive-color' : avgMargin >= 0.1 ? 'warning-color' : 'negative-color'}">${(avgMargin * 100).toFixed(1)}%</div>
        </div>
        <div class="rekap-item">
          <div class="rekap-label">Laba Kotor</div>
          <div class="rekap-value positive-color">${Utils.formatRupiah(totalHargaJual - totalHPP)}</div>
        </div>
      </div>

      <div class="export-bar">
        <button class="btn btn-secondary btn-sm" onclick="Produksi.exportExcel()">📊 Excel</button>
        <button class="btn btn-secondary btn-sm" onclick="Utils.exportPDF()">🖨️ PDF</button>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Invoice</th><th>Produk</th><th>Qty</th>
              <th>Bahan Baku</th><th>Tinta/Film</th><th>TK Langsung</th><th>Overhead</th>
              <th>Total HPP</th><th>Harga Jual</th><th>Margin</th><th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="7">TOTAL</td>
              <td class="text-right">${Utils.formatRupiah(totalHPP)}</td>
              <td class="text-right">${Utils.formatRupiah(totalHargaJual)}</td>
              <td class="text-right">${(avgMargin * 100).toFixed(1)}%</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }

  function openForm(id) {
    const record = id ? DB.getAll('produksi').find(r => r.id === id) : null;
    const isEdit = !!record;
    const r = record || {};

    // Auto-populate invoice options from penjualan current periode
    const invoices = DB.getByPeriode('penjualan', DB.getPeriodeKey());
    const invOpts = invoices.map(inv =>
      `<option value="${inv.noInvoice}" ${r.noInvoice === inv.noInvoice ? 'selected' : ''}>${inv.noInvoice} - ${inv.namaPelanggan}</option>`
    ).join('');

    const formHtml = `
      <form id="produksiForm" onsubmit="Produksi.saveForm(event,'${id || ''}')">
        <div class="form-row">
          <div class="form-group">
            <label>No. Invoice</label>
            ${invoices.length > 0
              ? `<select class="form-control" id="prInv" onchange="Produksi.fillFromInvoice()">${invOpts}</select>`
              : `<input class="form-control" id="prInv" type="text" placeholder="INV-001" value="${r.noInvoice || ''}" required>`
            }
          </div>
          <div class="form-group">
            <label>Nama Produk</label>
            <input class="form-control" id="prProduk" type="text" placeholder="Kaos Sablon Manual" value="${r.namaProduk || ''}" required>
          </div>
        </div>
        <div class="form-group">
          <label>Qty (pcs)</label>
          <input class="form-control" id="prQty" type="number" min="1" placeholder="100" value="${r.qty || ''}" required>
        </div>
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:10px;margin-top:4px">Komponen Biaya Produksi (Rp):</p>
        <div class="form-row">
          <div class="form-group">
            <label>Bahan Baku</label>
            <input class="form-control" id="prBahan" type="number" min="0" placeholder="0" value="${r.bahanBaku || 0}" oninput="Produksi.calcHPP()">
          </div>
          <div class="form-group">
            <label>Tinta / Film</label>
            <input class="form-control" id="prTinta" type="number" min="0" placeholder="0" value="${r.tintaFilm || 0}" oninput="Produksi.calcHPP()">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>TK Langsung</label>
            <input class="form-control" id="prTK" type="number" min="0" placeholder="0" value="${r.tkLangsung || 0}" oninput="Produksi.calcHPP()">
          </div>
          <div class="form-group">
            <label>Overhead</label>
            <input class="form-control" id="prOH" type="number" min="0" placeholder="0" value="${r.overhead || 0}" oninput="Produksi.calcHPP()">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Total HPP (Rp)</label>
            <input class="form-control calculated-field" id="prHPP" type="number" readonly value="${r.totalHPP || ''}">
          </div>
          <div class="form-group">
            <label>HPP/pcs (Rp)</label>
            <input class="form-control calculated-field" id="prHPPpcs" type="number" readonly value="${r.hppPerPcs || ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Harga Jual (Rp)</label>
            <input class="form-control" id="prHJ" type="number" min="0" placeholder="0" value="${r.hargaJual || ''}" oninput="Produksi.calcMargin()" required>
          </div>
          <div class="form-group">
            <label>Margin (%)</label>
            <input class="form-control calculated-field" id="prMargin" type="text" readonly value="${r.margin !== undefined ? (r.margin * 100).toFixed(1) + '%' : ''}">
            <input type="hidden" id="prMarginVal" value="${r.margin || 0}">
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="App.closeFormModal()">Batal</button>
          <button type="submit" class="btn btn-primary" style="flex:1">${isEdit ? 'Update' : 'Simpan'}</button>
        </div>
      </form>
    `;
    App.openFormModal(isEdit ? 'Edit Data Produksi' : 'Tambah Data Produksi / HPP', formHtml);
  }

  function fillFromInvoice() {
    const invNo = document.getElementById('prInv')?.value;
    const inv = DB.getByPeriode('penjualan', DB.getPeriodeKey()).find(r => r.noInvoice === invNo);
    if (inv) {
      const produkEl = document.getElementById('prProduk');
      const qtyEl = document.getElementById('prQty');
      const hjEl = document.getElementById('prHJ');
      // Bangun label produk lengkap dengan spesifikasi jersey
      let labelProduk = inv.jenisProduk || '';
      const specs = [];
      if (inv.ukuranSegmen) specs.push(inv.ukuranSegmen);
      if (inv.lengan) specs.push(inv.lengan);
      if (inv.customJersey === 'Ya') specs.push('Custom');
      if (inv.embellishment && inv.embellishment !== 'Tanpa Embellishment') {
        specs.push(inv.embellishment.split('(')[0].trim());
      }
      if (specs.length) labelProduk += ' (' + specs.join(', ') + ')';
      if (produkEl) produkEl.value = labelProduk;
      if (qtyEl) qtyEl.value = inv.qty;
      if (hjEl) hjEl.value = inv.totalHarga;
      calcHPP();
      calcMargin();
    }
  }

  function calcHPP() {
    const bahan = parseFloat(document.getElementById('prBahan')?.value) || 0;
    const tinta = parseFloat(document.getElementById('prTinta')?.value) || 0;
    const tk = parseFloat(document.getElementById('prTK')?.value) || 0;
    const oh = parseFloat(document.getElementById('prOH')?.value) || 0;
    const qty = parseFloat(document.getElementById('prQty')?.value) || 1;
    const hpp = bahan + tinta + tk + oh;
    const hppEl = document.getElementById('prHPP');
    const hppPcsEl = document.getElementById('prHPPpcs');
    if (hppEl) hppEl.value = hpp;
    if (hppPcsEl) hppPcsEl.value = qty > 0 ? (hpp / qty).toFixed(0) : 0;
    calcMargin();
  }

  function calcMargin() {
    const hpp = parseFloat(document.getElementById('prHPP')?.value) || 0;
    const hj = parseFloat(document.getElementById('prHJ')?.value) || 0;
    const marginEl = document.getElementById('prMargin');
    const marginValEl = document.getElementById('prMarginVal');
    if (hj > 0) {
      const margin = (hj - hpp) / hj;
      if (marginEl) marginEl.value = (margin * 100).toFixed(1) + '%';
      if (marginValEl) marginValEl.value = margin; // simpan desimal murni
    } else {
      if (marginEl) marginEl.value = '';
      if (marginValEl) marginValEl.value = 0;
    }
  }

  function saveForm(e, id) {
    e.preventDefault();
    const bahan = parseFloat(document.getElementById('prBahan').value) || 0;
    const tinta = parseFloat(document.getElementById('prTinta').value) || 0;
    const tk = parseFloat(document.getElementById('prTK').value) || 0;
    const oh = parseFloat(document.getElementById('prOH').value) || 0;
    const qty = parseFloat(document.getElementById('prQty').value) || 1;
    const hj = parseFloat(document.getElementById('prHJ').value) || 0;
    const totalHPP = bahan + tinta + tk + oh;
    // Bug #4 fix: baca margin dari hidden field (desimal murni) bukan dari display field
    const margin = hj > 0 ? (hj - totalHPP) / hj : 0;

    const record = {
      id: id || DB.generateId(),
      periode: DB.getPeriodeKey(),
      noInvoice: document.getElementById('prInv').value,
      namaProduk: document.getElementById('prProduk').value.trim(),
      qty, bahanBaku: bahan, tintaFilm: tinta, tkLangsung: tk, overhead: oh,
      totalHPP, hppPerPcs: qty > 0 ? totalHPP / qty : 0,
      hargaJual: hj, margin
    };
    if (id) DB.update('produksi', id, record);
    else DB.add('produksi', record);
    App.closeFormModal();
    App.renderCurrentPage();
    Utils.toast(id ? 'Data produksi diupdate' : 'Data produksi ditambahkan', 'success');
  }

  function openEdit(id) { openForm(id); }

  function deleteRecord(id) {
    Utils.confirm('Hapus data produksi ini?', () => {
      DB.remove('produksi', id);
      App.renderCurrentPage();
      Utils.toast('Data dihapus', 'info');
    });
  }

  function exportExcel() {
    const periode = DB.getPeriodeKey();
    const data = DB.getByPeriode('produksi', periode);
    const headers = ['No Invoice', 'Produk', 'Qty', 'Bahan Baku', 'Tinta/Film', 'TK Langsung', 'Overhead', 'Total HPP', 'HPP/pcs', 'Harga Jual', 'Margin'];
    const rows = data.map(r => [r.noInvoice, r.namaProduk, r.qty, r.bahanBaku, r.tintaFilm, r.tkLangsung, r.overhead, r.totalHPP, r.hppPerPcs, r.hargaJual, (r.margin * 100).toFixed(1) + '%']);
    Utils.exportExcel([{ sheetName: 'Produksi HPP', headers, rows }], `Produksi_${periode}`);
  }

  return { render, openForm, openEdit, deleteRecord, saveForm, fillFromInvoice, calcHPP, calcMargin, exportExcel };
})();
