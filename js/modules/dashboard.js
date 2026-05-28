/* ================================================
   Module: Dashboard
   ================================================ */

const Dashboard = (() => {

  function render() {
    const periode = DB.getPeriodeKey();
    const periodeLabel = Utils.getPeriodeLabel(periode);

    const totalPendapatan = DB.getTotalPenjualan(periode);
    const totalHPP = DB.getTotalHPP(periode);
    const labaKotor = totalPendapatan - totalHPP;
    const totalBeban = DB.getTotalBeban(periode);
    const labaBersih = labaKotor - totalBeban;
    // Bug #2 fix: filter piutang & hutang per periode aktif, bukan semua periode
    const totalPiutang = DB.getTotalPiutang(periode);
    const totalHutang = DB.getTotalHutang(periode);

    const company = DB.getCompanySettings();

    return `
      <div class="welcome-card">
        <div class="welcome-logo-row">
          <img src="icons/logo-wysport.png" class="welcome-logo" alt="${company.nama}">
          <div>
            <div class="welcome-title">${company.nama}</div>
            <div class="welcome-sub">${company.tagline || 'Manajemen Keuangan Usaha'}</div>
          </div>
        </div>
        <div class="welcome-period-label">Periode: ${periodeLabel}</div>
      </div>

      <p class="section-title">Ringkasan Keuangan</p>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon">💰</div>
          <div class="kpi-label">Total Pendapatan</div>
          <div class="kpi-value positive">${Utils.formatRupiah(totalPendapatan)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">⚙️</div>
          <div class="kpi-label">Total HPP</div>
          <div class="kpi-value warning">${Utils.formatRupiah(totalHPP)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">📈</div>
          <div class="kpi-label">Laba Kotor</div>
          <div class="kpi-value ${labaKotor >= 0 ? 'positive' : 'negative'}">${Utils.formatRupiah(labaKotor)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">💼</div>
          <div class="kpi-label">Total Beban</div>
          <div class="kpi-value warning">${Utils.formatRupiah(totalBeban)}</div>
        </div>
      </div>

      <div class="kpi-card highlight" style="margin-bottom:16px;padding:18px;">
        <div class="kpi-label" style="color:rgba(255,255,255,0.7)">Laba Bersih Periode Ini</div>
        <div class="kpi-value" style="color:white;font-size:22px">${Utils.formatRupiah(labaBersih)}</div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon">👥</div>
          <div class="kpi-label">Total Piutang</div>
          <div class="kpi-value warning">${Utils.formatRupiah(totalPiutang)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">🏢</div>
          <div class="kpi-label">Total Hutang</div>
          <div class="kpi-value negative">${Utils.formatRupiah(totalHutang)}</div>
        </div>
      </div>

      <div class="chart-container">
        <div class="chart-title">Pendapatan vs HPP vs Beban</div>
        <canvas id="dashChart" style="height:160px;display:block;"></canvas>
      </div>

      <p class="section-title">Navigasi Cepat</p>
      <div class="nav-grid">
        <div class="nav-card" onclick="App.navigate('penjualan')">
          <span class="nav-card-icon">📈</span>
          <div class="nav-card-text">
            <div class="nav-card-title">Penjualan</div>
            <div class="nav-card-desc">Order & Invoice</div>
          </div>
        </div>
        <div class="nav-card" onclick="App.navigate('kas')">
          <span class="nav-card-icon">💰</span>
          <div class="nav-card-text">
            <div class="nav-card-title">Kas & Bank</div>
            <div class="nav-card-desc">Mutasi kas harian</div>
          </div>
        </div>
        <div class="nav-card" onclick="App.navigate('pembelian')">
          <span class="nav-card-icon">📦</span>
          <div class="nav-card-text">
            <div class="nav-card-title">Pembelian</div>
            <div class="nav-card-desc">Bahan baku & supplies</div>
          </div>
        </div>
        <div class="nav-card" onclick="App.navigate('produksi')">
          <span class="nav-card-icon">⚙️</span>
          <div class="nav-card-text">
            <div class="nav-card-title">Produksi/HPP</div>
            <div class="nav-card-desc">Biaya produksi</div>
          </div>
        </div>
        <div class="nav-card" onclick="App.navigate('piutang')">
          <span class="nav-card-icon">👥</span>
          <div class="nav-card-text">
            <div class="nav-card-title">Piutang</div>
            <div class="nav-card-desc">Tagihan pelanggan</div>
          </div>
        </div>
        <div class="nav-card" onclick="App.navigate('hutang')">
          <span class="nav-card-icon">🏢</span>
          <div class="nav-card-text">
            <div class="nav-card-title">Hutang</div>
            <div class="nav-card-desc">Hutang supplier</div>
          </div>
        </div>
        <div class="nav-card" onclick="App.navigate('beban')">
          <span class="nav-card-icon">💼</span>
          <div class="nav-card-text">
            <div class="nav-card-title">Beban Ops</div>
            <div class="nav-card-desc">Biaya operasional</div>
          </div>
        </div>
        <div class="nav-card" onclick="App.navigate('laporan')">
          <span class="nav-card-icon">📋</span>
          <div class="nav-card-text">
            <div class="nav-card-title">Laporan</div>
            <div class="nav-card-desc">L/R & Neraca</div>
          </div>
        </div>
      </div>
    `;
  }

  function afterRender() {
    const periode = DB.getPeriodeKey();
    const penjualan = DB.getTotalPenjualan(periode);
    const hpp = DB.getTotalHPP(periode);
    const beban = DB.getTotalBeban(periode);

    setTimeout(() => {
      Utils.drawBarChart('dashChart',
        ['Pendapatan', 'HPP', 'Beban'],
        [{ label: 'Nilai (Rp)', data: [penjualan, hpp, beban], color: '#6c63ff' }]
      );
    }, 100);
  }

  return { render, afterRender };
})();
