/* ================================================
   SablonKas - Data Store (localStorage)
   ================================================ */

const DB = (() => {
  const PREFIX = 'sk_';

  // ---- Period Management ----
  function getPeriode() {
    const raw = localStorage.getItem(PREFIX + 'period');
    if (raw) return JSON.parse(raw);
    const now = new Date();
    return {
      month: String(now.getMonth() + 1).padStart(2, '0'),
      year: String(now.getFullYear())
    };
  }

  function setPeriode(month, year) {
    localStorage.setItem(PREFIX + 'period', JSON.stringify({ month, year }));
  }

  function getPeriodeKey() {
    const p = getPeriode();
    return `${p.year}-${p.month}`;
  }

  // ---- Generic CRUD ----
  function getAll(key) {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : [];
  }

  function saveAll(key, data) {
    localStorage.setItem(PREFIX + key, JSON.stringify(data));
  }

  function getByPeriode(key, periodeKey) {
    return getAll(key).filter(r => r.periode === periodeKey);
  }

  function add(key, record) {
    const data = getAll(key);
    data.push(record);
    saveAll(key, data);
  }

  function update(key, id, updates) {
    const data = getAll(key).map(r => r.id === id ? { ...r, ...updates } : r);
    saveAll(key, data);
  }

  function remove(key, id) {
    const data = getAll(key).filter(r => r.id !== id);
    saveAll(key, data);
  }

  // ---- Kas & Bank Settings ----
  function getKasSettings(periodeKey) {
    const raw = localStorage.getItem(PREFIX + 'kas_settings');
    const all = raw ? JSON.parse(raw) : {};
    return all[periodeKey] || { saldoKas: 0, saldoBank: 0 };
  }

  function setKasSettings(periodeKey, settings) {
    const raw = localStorage.getItem(PREFIX + 'kas_settings');
    const all = raw ? JSON.parse(raw) : {};
    all[periodeKey] = settings;
    localStorage.setItem(PREFIX + 'kas_settings', JSON.stringify(all));
  }

  // ---- Neraca Settings ----
  function getNeracaSettings(periodeKey) {
    const raw = localStorage.getItem(PREFIX + 'neraca_settings');
    const all = raw ? JSON.parse(raw) : {};
    return all[periodeKey] || {
      persediaanBahanBaku: 0,
      persediaanBarangJadi: 0,
      mesinPeralatan: 0,
      akumulasiPenyusutan: 0,
      inventarisKantor: 0,
      hutangPajak: 0,
      biayaHarusDibayar: 0,
      modalDisetor: 0,
      labaDitahan: 0
    };
  }

  function setNeracaSettings(periodeKey, settings) {
    const raw = localStorage.getItem(PREFIX + 'neraca_settings');
    const all = raw ? JSON.parse(raw) : {};
    all[periodeKey] = { ...getNeracaSettings(periodeKey), ...settings };
    localStorage.setItem(PREFIX + 'neraca_settings', JSON.stringify(all));
  }

  // ---- Aggregation Helpers ----
  function getTotalPenjualan(periodeKey) {
    return getByPeriode('penjualan', periodeKey)
      .reduce((s, r) => s + (parseFloat(r.totalHarga) || 0), 0);
  }

  function getTotalHPP(periodeKey) {
    return getByPeriode('produksi', periodeKey)
      .reduce((s, r) => s + (parseFloat(r.totalHPP) || 0), 0);
  }

  function getTotalBeban(periodeKey) {
    return getByPeriode('beban', periodeKey)
      .reduce((s, r) => s + (parseFloat(r.jumlah) || 0), 0);
  }

  function getTotalPiutang() {
    return getAll('piutang')
      .filter(r => r.status !== 'LUNAS')
      .reduce((s, r) => s + (parseFloat(r.sisaPiutang) || 0), 0);
  }

  function getTotalHutang() {
    return getAll('hutang')
      .filter(r => r.status !== 'LUNAS')
      .reduce((s, r) => s + (parseFloat(r.sisaHutang) || 0), 0);
  }

  function getKasSaldo(periodeKey) {
    const settings = getKasSettings(periodeKey);
    const txns = getByPeriode('kas', periodeKey);
    const totalMasuk = txns.reduce((s, r) => s + (parseFloat(r.masuk) || 0), 0);
    const totalKeluar = txns.reduce((s, r) => s + (parseFloat(r.keluar) || 0), 0);
    return (parseFloat(settings.saldoKas) || 0) + (parseFloat(settings.saldoBank) || 0) + totalMasuk - totalKeluar;
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  return {
    getPeriode, setPeriode, getPeriodeKey,
    getAll, saveAll, getByPeriode, add, update, remove,
    getKasSettings, setKasSettings,
    getNeracaSettings, setNeracaSettings,
    getTotalPenjualan, getTotalHPP, getTotalBeban,
    getTotalPiutang, getTotalHutang, getKasSaldo,
    generateId
  };
})();
