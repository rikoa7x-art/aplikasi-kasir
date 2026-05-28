/* ================================================
   Module: Laporan (Laba Rugi + Neraca)
   ================================================ */

const Laporan = (() => {
  let activeTab = 'lr'; // 'lr' or 'neraca'

  function render() {
    const periode = DB.getPeriodeKey();
    const periodeLabel = Utils.getPeriodeLabel(periode);

    const tabHtml = `
      <div class="filter-chips" style="margin-bottom:16px">
        <div class="chip ${activeTab === 'lr' ? 'active' : ''}" onclick="Laporan.setTab('lr')">📋 Laba Rugi</div>
        <div class="chip ${activeTab === 'neraca' ? 'active' : ''}" onclick="Laporan.setTab('neraca')">🏦 Neraca</div>
      </div>
    `;

    return `
      <div>
        <div class="page-title">Laporan Keuangan</div>
        <div class="page-subtitle">Periode: ${periodeLabel}</div>
      </div>
      ${tabHtml}
      <div class="export-bar">
        <button class="btn btn-secondary btn-sm" onclick="Laporan.exportExcel()">📊 Excel</button>
        <button class="btn btn-secondary btn-sm" onclick="Utils.exportPDF()">🖨️ PDF</button>
      </div>
      ${activeTab === 'lr' ? renderLabaRugi(periode) : renderNeraca(periode)}
    `;
  }

  function renderLabaRugi(periode) {
    const periodeLabel = Utils.getPeriodeLabel(periode);

    // Data from other modules
    const penjualan = DB.getByPeriode('penjualan', periode);
    const produksi = DB.getByPeriode('produksi', periode);
    const beban = DB.getByPeriode('beban', periode);

    const totalPendapatan = penjualan.reduce((s, r) => s + (parseFloat(r.totalHarga) || 0), 0);
    const diskonPenjualan = 0;
    const pendapatanBersih = totalPendapatan - diskonPenjualan;

    const bahanBaku = produksi.reduce((s, r) => s + (parseFloat(r.bahanBaku) || 0), 0);
    const tintaFilm = produksi.reduce((s, r) => s + (parseFloat(r.tintaFilm) || 0), 0);
    const tkLangsung = produksi.reduce((s, r) => s + (parseFloat(r.tkLangsung) || 0), 0);
    const overhead = produksi.reduce((s, r) => s + (parseFloat(r.overhead) || 0), 0);
    const totalHPP = bahanBaku + tintaFilm + tkLangsung + overhead;
    const labaKotor = pendapatanBersih - totalHPP;

    // Beban by category
    const getBebanKat = (kat) => beban.filter(r => r.kategori === kat).reduce((s, r) => s + (parseFloat(r.jumlah) || 0), 0);
    const bebanGaji = getBebanKat('Gaji & Upah');
    const bebanSewa = getBebanKat('Sewa');
    const bebanUtilitas = getBebanKat('Utilitas');
    const bebanPemasaran = getBebanKat('Pemasaran');
    const bebanAdmin = getBebanKat('Administrasi');
    const bebanPemeliharaan = getBebanKat('Pemeliharaan');
    const bebanOps = getBebanKat('Operasional');
    const bebanLain = getBebanKat('Lainnya');
    const totalBeban = beban.reduce((s, r) => s + (parseFloat(r.jumlah) || 0), 0);

    const labaSebelumPajak = labaKotor - totalBeban;
    const estimasiPajak = labaSebelumPajak > 0 ? labaSebelumPajak * 0.11 : 0; // estimasi PPH 11%
    const labaBersih = labaSebelumPajak - estimasiPajak;

    const row = (label, val, cls = '', indent = false) => `
      <div class="report-row ${cls}">
        <span class="report-label ${indent ? 'indent' : ''}">${label}</span>
        <span class="report-value ${val < 0 ? 'negative' : ''}">${Utils.formatRupiah(val)}</span>
      </div>`;

    return `
      <div style="text-align:center;margin-bottom:12px">
        <div style="font-size:13px;color:var(--text-muted)">LAPORAN LABA RUGI</div>
        <div style="font-size:15px;font-weight:700">Periode: ${periodeLabel}</div>
      </div>

      <div class="report-section">
        <div class="report-section-title">I. Pendapatan</div>
        ${row('Pendapatan Penjualan', totalPendapatan, '', true)}
        ${row('Diskon Penjualan', diskonPenjualan, '', true)}
        ${row('Total Pendapatan Bersih', pendapatanBersih, 'total')}
      </div>

      <div class="report-section">
        <div class="report-section-title">II. Harga Pokok Penjualan (HPP)</div>
        ${row('Bahan Baku', bahanBaku, '', true)}
        ${row('Tinta / Film', tintaFilm, '', true)}
        ${row('Tenaga Kerja Langsung', tkLangsung, '', true)}
        ${row('Overhead Pabrik', overhead, '', true)}
        ${row('Total HPP', totalHPP, 'total')}
      </div>

      <div class="report-section">
        <div class="report-section-title" style="background: linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.08))">LABA KOTOR</div>
        <div class="report-row total">
          <span class="report-label" style="font-weight:700">Laba Kotor</span>
          <span class="report-value ${labaKotor >= 0 ? 'positive' : 'negative'}" style="font-size:16px">${Utils.formatRupiah(labaKotor)}</span>
        </div>
      </div>

      <div class="report-section">
        <div class="report-section-title">III. Beban Operasional</div>
        ${bebanGaji > 0 ? row('Gaji & Upah', bebanGaji, '', true) : ''}
        ${bebanSewa > 0 ? row('Sewa', bebanSewa, '', true) : ''}
        ${bebanUtilitas > 0 ? row('Utilitas', bebanUtilitas, '', true) : ''}
        ${bebanPemasaran > 0 ? row('Pemasaran', bebanPemasaran, '', true) : ''}
        ${bebanAdmin > 0 ? row('Administrasi', bebanAdmin, '', true) : ''}
        ${bebanPemeliharaan > 0 ? row('Pemeliharaan', bebanPemeliharaan, '', true) : ''}
        ${bebanOps > 0 ? row('Operasional', bebanOps, '', true) : ''}
        ${bebanLain > 0 ? row('Lainnya', bebanLain, '', true) : ''}
        ${totalBeban === 0 ? '<div class="report-row"><span class="report-label indent" style="color:var(--text-muted)">Belum ada beban</span><span class="report-value">-</span></div>' : ''}
        ${row('Total Beban Operasional', totalBeban, 'total')}
      </div>

      <div class="report-section">
        <div class="report-section-title">Ringkasan</div>
        ${row('Laba Sebelum Pajak', labaSebelumPajak)}
        ${row('Estimasi Pajak (11%)', estimasiPajak, '', true)}
        <div class="report-row grand-total">
          <span class="report-label">LABA BERSIH</span>
          <span class="report-value">${Utils.formatRupiah(labaBersih)}</span>
        </div>
      </div>
    `;
  }

  function renderNeraca(periode) {
    const periodeLabel = Utils.getPeriodeLabel(periode);
    const neracaSet = DB.getNeracaSettings(periode);

    // Bug #1 fix: gunakan getKasSaldoDetail() untuk mendapatkan kas tunai & bank secara terpisah
    const kasSaldoDetail = DB.getKasSaldoDetail(periode);
    const kasTunai = kasSaldoDetail.kasTunai;
    const kasBank = kasSaldoDetail.kasBank;

    const piutangAktif = DB.getAll('piutang').filter(r => r.periode === periode && r.status !== 'LUNAS')
      .reduce((s, r) => s + (parseFloat(r.sisaPiutang) || 0), 0);
    const hutangUsaha = DB.getAll('hutang').filter(r => r.periode === periode && r.status !== 'LUNAS')
      .reduce((s, r) => s + (parseFloat(r.sisaHutang) || 0), 0);

    const persediaanBB = parseFloat(neracaSet.persediaanBahanBaku) || 0;
    const persediaanBJ = parseFloat(neracaSet.persediaanBarangJadi) || 0;
    const mesin = parseFloat(neracaSet.mesinPeralatan) || 0;
    const akumulasi = parseFloat(neracaSet.akumulasiPenyusutan) || 0;
    const inventaris = parseFloat(neracaSet.inventarisKantor) || 0;

    const totalAsetLancar = kasTunai + kasBank + piutangAktif + persediaanBB + persediaanBJ;
    const totalAsetTetap = mesin - akumulasi + inventaris;
    const totalAset = totalAsetLancar + totalAsetTetap;

    // Liabilitas
    const dpPelanggan = DB.getByPeriode('penjualan', periode)
      .filter(r => r.status !== 'LUNAS')
      .reduce((s, r) => s + (parseFloat(r.dpDiterima) || 0), 0);
    const hutangPajak = parseFloat(neracaSet.hutangPajak) || 0;
    const biayaHarusDibayar = parseFloat(neracaSet.biayaHarusDibayar) || 0;
    const totalLiabilitas = hutangUsaha + dpPelanggan + hutangPajak + biayaHarusDibayar;

    // Ekuitas
    const modalDisetor = parseFloat(neracaSet.modalDisetor) || 0;
    const labaDitahan = parseFloat(neracaSet.labaDitahan) || 0;
    // Laba Berjalan from L/R
    const penjualan = DB.getByPeriode('penjualan', periode);
    const produksi = DB.getByPeriode('produksi', periode);
    const beban = DB.getByPeriode('beban', periode);
    const totalPendapatan = penjualan.reduce((s, r) => s + (parseFloat(r.totalHarga) || 0), 0);
    const totalHPP = produksi.reduce((s, r) => s + (parseFloat(r.totalHPP) || 0), 0);
    const totalBeban = beban.reduce((s, r) => s + (parseFloat(r.jumlah) || 0), 0);
    const labaBerjalan = totalPendapatan - totalHPP - totalBeban;
    const totalEkuitas = modalDisetor + labaDitahan + labaBerjalan;
    const totalLiabEkuitas = totalLiabilitas + totalEkuitas;

    const row = (label, val, cls = '', indent = false, colorClass = '') => `
      <div class="report-row ${cls}">
        <span class="report-label ${indent ? 'indent' : ''}">${label}</span>
        <span class="report-value ${colorClass} ${val < 0 ? 'negative' : ''}">${Utils.formatRupiah(val)}</span>
      </div>`;

    const balanced = Math.abs(totalAset - totalLiabEkuitas) < 1;

    return `
      <div style="text-align:center;margin-bottom:12px">
        <div style="font-size:13px;color:var(--text-muted)">NERACA (BALANCE SHEET)</div>
        <div style="font-size:15px;font-weight:700">Periode: ${periodeLabel}</div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:16px">
        <button class="btn btn-secondary btn-sm" style="flex:1" onclick="Laporan.openNeracaSettings()">⚙️ Atur Aset & Modal</button>
      </div>

      <p class="section-title">Aset</p>
      <div class="report-section">
        <div class="report-section-title">Aset Lancar</div>
        ${row('Kas Tunai', kasTunai, '', true)}
        ${row('Kas di Bank', kasBank, '', true)}
        ${row('Piutang Usaha', piutangAktif, '', true)}
        ${row('Persediaan Bahan Baku', persediaanBB, '', true)}
        ${row('Persediaan Barang Jadi', persediaanBJ, '', true)}
        ${row('Total Aset Lancar', totalAsetLancar, 'total')}
      </div>
      <div class="report-section">
        <div class="report-section-title">Aset Tetap</div>
        ${row('Mesin & Peralatan', mesin, '', true)}
        ${row('Akumulasi Penyusutan', -akumulasi, '', true)}
        ${row('Inventaris Kantor', inventaris, '', true)}
        ${row('Total Aset Tetap (Net)', totalAsetTetap, 'total')}
      </div>
      <div class="report-section">
        <div class="report-row grand-total">
          <span class="report-label">TOTAL ASET</span>
          <span class="report-value">${Utils.formatRupiah(totalAset)}</span>
        </div>
      </div>

      <p class="section-title">Liabilitas & Ekuitas</p>
      <div class="report-section">
        <div class="report-section-title">Liabilitas Lancar</div>
        ${row('Hutang Usaha (Supplier)', hutangUsaha, '', true)}
        ${row('Uang Muka Pelanggan', dpPelanggan, '', true)}
        ${row('Hutang Pajak', hutangPajak, '', true)}
        ${row('Biaya Masih Harus Dibayar', biayaHarusDibayar, '', true)}
        ${row('Total Liabilitas', totalLiabilitas, 'total')}
      </div>
      <div class="report-section">
        <div class="report-section-title">Ekuitas</div>
        ${row('Modal Disetor', modalDisetor, '', true)}
        ${row('Laba Ditahan', labaDitahan, '', true)}
        ${row('Laba Berjalan (periode ini)', labaBerjalan, '', true, labaBerjalan >= 0 ? 'positive' : 'negative')}
        ${row('Total Ekuitas', totalEkuitas, 'total')}
      </div>
      <div class="report-section">
        <div class="report-row grand-total">
          <span class="report-label">TOTAL LIABILITAS + EKUITAS</span>
          <span class="report-value">${Utils.formatRupiah(totalLiabEkuitas)}</span>
        </div>
      </div>

      <div class="card" style="text-align:center;margin-top:12px;border-color:${balanced ? 'var(--success)' : 'var(--danger)'}">
        <div style="font-size:24px">${balanced ? '✅' : '⚠️'}</div>
        <div style="font-size:14px;font-weight:700;color:${balanced ? 'var(--success)' : 'var(--danger)'}">
          ${balanced ? 'Neraca Seimbang' : 'Neraca Tidak Seimbang'}
        </div>
        ${!balanced ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">Selisih: ${Utils.formatRupiah(Math.abs(totalAset - totalLiabEkuitas))}</div>` : ''}
      </div>
    `;
  }

  function setTab(tab) {
    activeTab = tab;
    App.renderCurrentPage();
  }

  function openNeracaSettings() {
    const periode = DB.getPeriodeKey();
    const s = DB.getNeracaSettings(periode);
    const formHtml = `
      <p style="font-size:12px;color:var(--text-muted);margin-bottom:14px">Isi nilai aset, liabilitas, dan ekuitas yang tidak otomatis terhitung.</p>
      <p class="section-title">Aset Tetap</p>
      <div class="form-row">
        <div class="form-group">
          <label>Mesin & Peralatan (Rp)</label>
          <input class="form-control" id="ns_mesin" type="number" min="0" value="${s.mesinPeralatan || 0}">
        </div>
        <div class="form-group">
          <label>Akumulasi Penyusutan (Rp)</label>
          <input class="form-control" id="ns_akum" type="number" min="0" value="${s.akumulasiPenyusutan || 0}">
        </div>
      </div>
      <div class="form-group">
        <label>Inventaris Kantor (Rp)</label>
        <input class="form-control" id="ns_inv" type="number" min="0" value="${s.inventarisKantor || 0}">
      </div>
      <p class="section-title">Persediaan</p>
      <div class="form-row">
        <div class="form-group">
          <label>Persediaan Bahan Baku (Rp)</label>
          <input class="form-control" id="ns_bb" type="number" min="0" value="${s.persediaanBahanBaku || 0}">
        </div>
        <div class="form-group">
          <label>Persediaan Barang Jadi (Rp)</label>
          <input class="form-control" id="ns_bj" type="number" min="0" value="${s.persediaanBarangJadi || 0}">
        </div>
      </div>
      <p class="section-title">Liabilitas Lainnya</p>
      <div class="form-row">
        <div class="form-group">
          <label>Hutang Pajak (Rp)</label>
          <input class="form-control" id="ns_pajak" type="number" min="0" value="${s.hutangPajak || 0}">
        </div>
        <div class="form-group">
          <label>Biaya Harus Dibayar (Rp)</label>
          <input class="form-control" id="ns_biaya" type="number" min="0" value="${s.biayaHarusDibayar || 0}">
        </div>
      </div>
      <p class="section-title">Ekuitas</p>
      <div class="form-row">
        <div class="form-group">
          <label>Modal Disetor (Rp)</label>
          <input class="form-control" id="ns_modal" type="number" min="0" value="${s.modalDisetor || 0}">
        </div>
        <div class="form-group">
          <label>Laba Ditahan (Rp)</label>
          <input class="form-control" id="ns_laba" type="number" value="${s.labaDitahan || 0}">
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="App.closeFormModal()">Batal</button>
        <button type="button" class="btn btn-primary" style="flex:1" onclick="Laporan.saveNeracaSettings()">Simpan</button>
      </div>
    `;
    App.openFormModal('Pengaturan Neraca', formHtml);
  }

  function saveNeracaSettings() {
    DB.setNeracaSettings(DB.getPeriodeKey(), {
      mesinPeralatan: parseFloat(document.getElementById('ns_mesin').value) || 0,
      akumulasiPenyusutan: parseFloat(document.getElementById('ns_akum').value) || 0,
      inventarisKantor: parseFloat(document.getElementById('ns_inv').value) || 0,
      persediaanBahanBaku: parseFloat(document.getElementById('ns_bb').value) || 0,
      persediaanBarangJadi: parseFloat(document.getElementById('ns_bj').value) || 0,
      hutangPajak: parseFloat(document.getElementById('ns_pajak').value) || 0,
      biayaHarusDibayar: parseFloat(document.getElementById('ns_biaya').value) || 0,
      modalDisetor: parseFloat(document.getElementById('ns_modal').value) || 0,
      labaDitahan: parseFloat(document.getElementById('ns_laba').value) || 0,
    });
    App.closeFormModal();
    App.renderCurrentPage();
    Utils.toast('Pengaturan neraca disimpan', 'success');
  }

  function exportExcel() {
    const periode = DB.getPeriodeKey();
    const periodeLabel = Utils.getPeriodeLabel(periode);

    // L/R data
    const penjualan = DB.getByPeriode('penjualan', periode);
    const produksi = DB.getByPeriode('produksi', periode);
    const beban = DB.getByPeriode('beban', periode);

    const totalPendapatan = penjualan.reduce((s, r) => s + (parseFloat(r.totalHarga) || 0), 0);
    const bahanBaku = produksi.reduce((s, r) => s + (parseFloat(r.bahanBaku) || 0), 0);
    const tintaFilm = produksi.reduce((s, r) => s + (parseFloat(r.tintaFilm) || 0), 0);
    const tkLangsung = produksi.reduce((s, r) => s + (parseFloat(r.tkLangsung) || 0), 0);
    const overhead = produksi.reduce((s, r) => s + (parseFloat(r.overhead) || 0), 0);
    const totalHPP = bahanBaku + tintaFilm + tkLangsung + overhead;
    const labaKotor = totalPendapatan - totalHPP;
    const totalBeban = beban.reduce((s, r) => s + (parseFloat(r.jumlah) || 0), 0);
    const labaBersih = labaKotor - totalBeban;

    const lrRows = [
      ['LAPORAN LABA RUGI', `Periode: ${periodeLabel}`],
      [],
      ['I. PENDAPATAN'],
      ['Pendapatan Penjualan', totalPendapatan],
      ['Total Pendapatan Bersih', totalPendapatan],
      [],
      ['II. HPP'],
      ['Bahan Baku', bahanBaku],
      ['Tinta/Film', tintaFilm],
      ['TK Langsung', tkLangsung],
      ['Overhead', overhead],
      ['Total HPP', totalHPP],
      [],
      ['LABA KOTOR', labaKotor],
      [],
      ['III. BEBAN OPERASIONAL', totalBeban],
      [],
      ['LABA BERSIH', labaBersih],
    ];

    Utils.exportExcel([
      { sheetName: 'Laba Rugi', headers: ['Keterangan', 'Jumlah (Rp)'], rows: lrRows },
    ], `Laporan_${periode}`);
  }

  return { render, setTab, openNeracaSettings, saveNeracaSettings, exportExcel };
})();
