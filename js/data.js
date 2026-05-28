/* ================================================
   SablonKas - Data Store (Firebase Firestore + Cache)
   ================================================
   Strategi: Cache-First
   - Saat init: ambil semua data dari Firestore ke memori
   - Baca: dari cache (sinkron, tidak ada breaking change ke modul)
   - Tulis: update cache langsung + sync ke Firestore di background
   ================================================ */

const DB = (() => {
  // Koleksi data utama (array of records)
  const COLLECTION_KEYS = ['penjualan', 'kas', 'pembelian', 'produksi', 'piutang', 'hutang', 'beban'];
  const LS_PREFIX = 'sk_';

  // In-memory cache
  const _cache = {
    penjualan: [], kas: [], pembelian: [], produksi: [],
    piutang: [], hutang: [], beban: [],
    period: null,
    kas_settings: {},
    company: null,
    neraca_settings: {}
  };

  let _ready = false;
  let _readyCallbacks = [];
  let _db = null; // diisi setelah Firebase init

  // ---- Firestore Helpers (lazy) ----
  function _col(key) { return _db.collection(key); }
  function _settingsDoc(key) { return _db.collection('_settings').doc(key); }

  // ---- Fire-and-forget write ke Firestore ----
  function _fw(promiseFn) {
    if (!_db) return;
    try {
      promiseFn().catch(e => console.warn('[Firebase] Write err:', e));
    } catch (e) {
      console.warn('[Firebase] Write err:', e);
    }
  }

  // ---- Fallback: load dari localStorage ----
  function _loadFromLocalStorage() {
    try {
      COLLECTION_KEYS.forEach(key => {
        const raw = localStorage.getItem(LS_PREFIX + key);
        _cache[key] = raw ? JSON.parse(raw) : [];
      });
      const rawPeriod = localStorage.getItem(LS_PREFIX + 'period');
      if (rawPeriod) _cache.period = JSON.parse(rawPeriod);
      const rawKas = localStorage.getItem(LS_PREFIX + 'kas_settings');
      if (rawKas) _cache.kas_settings = JSON.parse(rawKas);
      const rawCompany = localStorage.getItem(LS_PREFIX + 'company');
      if (rawCompany) _cache.company = JSON.parse(rawCompany);
      const rawNeraca = localStorage.getItem(LS_PREFIX + 'neraca_settings');
      if (rawNeraca) _cache.neraca_settings = JSON.parse(rawNeraca);
      console.log('[DB] Loaded from localStorage (fallback)');
    } catch (e) {
      console.warn('[DB] localStorage fallback error:', e);
    }
  }

  // ---- Load dari Firestore ke cache ----
  async function _loadFromFirestore() {
    const colPromises = COLLECTION_KEYS.map(key =>
      _col(key).get().then(snap => {
        _cache[key] = snap.docs.map(doc => doc.data());
      })
    );
    const settingsKeys = ['period', 'kas_settings', 'company', 'neraca_settings'];
    const setPromises = settingsKeys.map(key =>
      _settingsDoc(key).get().then(doc => {
        if (doc.exists) _cache[key] = doc.data();
      })
    );
    await Promise.all([...colPromises, ...setPromises]);
    console.log('[Firebase] Data loaded ✅');
  }

  // ---- Migrasi data localStorage → Firestore (sekali jalan) ----
  async function _migrate() {
    if (localStorage.getItem(LS_PREFIX + '_migrated_to_firestore')) return;
    let any = false;
    for (const key of COLLECTION_KEYS) {
      const raw = localStorage.getItem(LS_PREFIX + key);
      if (!raw) continue;
      const records = JSON.parse(raw);
      if (!records || !records.length) continue;
      const snap = await _col(key).limit(1).get();
      if (!snap.empty) continue;
      const batch = _db.batch();
      records.forEach(r => { if (r.id) batch.set(_col(key).doc(String(r.id)), r); });
      await batch.commit();
      any = true;
      console.log(`[Migrate] '${key}': ${records.length} records → Firestore`);
    }
    const settingsMap = {
      period: LS_PREFIX + 'period',
      kas_settings: LS_PREFIX + 'kas_settings',
      company: LS_PREFIX + 'company',
      neraca_settings: LS_PREFIX + 'neraca_settings'
    };
    for (const [fsKey, lsKey] of Object.entries(settingsMap)) {
      const raw = localStorage.getItem(lsKey);
      if (!raw) continue;
      const snap = await _settingsDoc(fsKey).get();
      if (snap.exists) continue;
      await _settingsDoc(fsKey).set(JSON.parse(raw));
      any = true;
    }
    if (any) {
      localStorage.setItem(LS_PREFIX + '_migrated_to_firestore', '1');
      console.log('[Migrate] Migration complete ✅');
    }
  }

  // ---- Tandai onReady selesai ----
  function _markReady() {
    _ready = true;
    const cbs = _readyCallbacks.slice();
    _readyCallbacks = [];
    cbs.forEach(cb => { try { cb(); } catch (e) { console.error('[DB] onReady cb error:', e); } });
  }

  // ---- Inisialisasi ----
  async function _init() {
    // Ambil Firestore dari global yang sudah diinit oleh firebase-config.js
    _db = window._firestoreDB || null;

    if (!_db) {
      console.warn('[DB] Firestore tidak tersedia, pakai localStorage');
      _loadFromLocalStorage();
      _markReady();
      return;
    }

    try {
      await _migrate();
      await _loadFromFirestore();
    } catch (err) {
      console.warn('[DB] Firestore gagal, fallback localStorage:', err);
      _loadFromLocalStorage();
    }
    _markReady();
  }

  // ---- Public: daftar callback saat data siap ----
  function onReady(callback) {
    if (_ready) {
      try { callback(); } catch (e) { console.error('[DB] onReady error:', e); }
    } else {
      _readyCallbacks.push(callback);
    }
  }

  // ---- Period Management ----
  function getPeriode() {
    if (_cache.period) return _cache.period;
    const now = new Date();
    return {
      month: String(now.getMonth() + 1).padStart(2, '0'),
      year: String(now.getFullYear())
    };
  }

  function setPeriode(month, year) {
    const val = { month, year };
    _cache.period = val;
    _fw(() => _settingsDoc('period').set(val));
  }

  function getPeriodeKey() {
    const p = getPeriode();
    return `${p.year}-${p.month}`;
  }

  // ---- Generic CRUD ----
  function getAll(key) {
    return Array.isArray(_cache[key]) ? [..._cache[key]] : [];
  }

  function saveAll(key, data) {
    _cache[key] = [...data];
    _fw(async () => {
      const snap = await _col(key).get();
      const batch = _db.batch();
      snap.docs.forEach(doc => batch.delete(doc.ref));
      data.forEach(r => { if (r.id) batch.set(_col(key).doc(String(r.id)), r); });
      await batch.commit();
    });
  }

  function getByPeriode(key, periodeKey) {
    return getAll(key).filter(r => r.periode === periodeKey);
  }

  function add(key, record) {
    if (!Array.isArray(_cache[key])) _cache[key] = [];
    _cache[key].push(record);
    _fw(() => _col(key).doc(String(record.id)).set(record));
  }

  function update(key, id, updates) {
    _cache[key] = getAll(key).map(r => r.id === id ? { ...r, ...updates } : r);
    // Firestore update() hanya update field yg ada, tidak hapus field lain
    _fw(() => _col(key).doc(String(id)).update(updates));
  }

  function remove(key, id) {
    _cache[key] = getAll(key).filter(r => r.id !== id);
    _fw(() => _col(key).doc(String(id)).delete());
  }

  // ---- Kas & Bank Settings ----
  function getKasSettings(periodeKey) {
    const all = _cache.kas_settings || {};
    return all[periodeKey] || { saldoKas: 0, saldoBank: 0 };
  }

  function setKasSettings(periodeKey, settings) {
    if (!_cache.kas_settings) _cache.kas_settings = {};
    _cache.kas_settings[periodeKey] = settings;
    const snap = Object.assign({}, _cache.kas_settings);
    _fw(() => _settingsDoc('kas_settings').set(snap));
  }

  // ---- Company Settings ----
  function getCompanySettings() {
    return _cache.company || {
      nama: 'WY SPORT',
      tagline: 'Jersey & Sportswear Custom',
      alamat: '',
      telepon: ''
    };
  }

  function setCompanySettings(settings) {
    _cache.company = settings;
    _fw(() => _settingsDoc('company').set(settings));
  }

  // ---- Neraca Settings ----
  function getNeracaSettings(periodeKey) {
    const all = _cache.neraca_settings || {};
    return all[periodeKey] || {
      persediaanBahanBaku: 0, persediaanBarangJadi: 0,
      mesinPeralatan: 0, akumulasiPenyusutan: 0, inventarisKantor: 0,
      hutangPajak: 0, biayaHarusDibayar: 0, modalDisetor: 0, labaDitahan: 0
    };
  }

  function setNeracaSettings(periodeKey, settings) {
    if (!_cache.neraca_settings) _cache.neraca_settings = {};
    _cache.neraca_settings[periodeKey] = { ...getNeracaSettings(periodeKey), ...settings };
    const snap = Object.assign({}, _cache.neraca_settings);
    _fw(() => _settingsDoc('neraca_settings').set(snap));
  }

  // ---- Aggregation Helpers ----
  function getTotalPenjualan(periodeKey) {
    return getByPeriode('penjualan', periodeKey).reduce((s, r) => s + (parseFloat(r.totalHarga) || 0), 0);
  }
  function getTotalHPP(periodeKey) {
    return getByPeriode('produksi', periodeKey).reduce((s, r) => s + (parseFloat(r.totalHPP) || 0), 0);
  }
  function getTotalBeban(periodeKey) {
    return getByPeriode('beban', periodeKey).reduce((s, r) => s + (parseFloat(r.jumlah) || 0), 0);
  }
  function getTotalPiutang(periodeKey) {
    const data = periodeKey ? getAll('piutang').filter(r => r.periode === periodeKey) : getAll('piutang');
    return data.filter(r => r.status !== 'LUNAS').reduce((s, r) => s + (parseFloat(r.sisaPiutang) || 0), 0);
  }
  function getTotalHutang(periodeKey) {
    const data = periodeKey ? getAll('hutang').filter(r => r.periode === periodeKey) : getAll('hutang');
    return data.filter(r => r.status !== 'LUNAS').reduce((s, r) => s + (parseFloat(r.sisaHutang) || 0), 0);
  }
  function getKasSaldo(periodeKey) {
    const s = getKasSettings(periodeKey);
    const txns = getByPeriode('kas', periodeKey);
    const masuk = txns.reduce((a, r) => a + (parseFloat(r.masuk) || 0), 0);
    const keluar = txns.reduce((a, r) => a + (parseFloat(r.keluar) || 0), 0);
    return (parseFloat(s.saldoKas) || 0) + (parseFloat(s.saldoBank) || 0) + masuk - keluar;
  }
  function getKasSaldoDetail(periodeKey) {
    const s = getKasSettings(periodeKey);
    const txns = getByPeriode('kas', periodeKey);
    const masuk = txns.reduce((a, r) => a + (parseFloat(r.masuk) || 0), 0);
    const keluar = txns.reduce((a, r) => a + (parseFloat(r.keluar) || 0), 0);
    return {
      kasTunai: (parseFloat(s.saldoKas) || 0) + (masuk - keluar),
      kasBank: (parseFloat(s.saldoBank) || 0)
    };
  }
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // Mulai inisialisasi (dijalankan saat script di-load)
  _init();

  return {
    onReady,
    getPeriode, setPeriode, getPeriodeKey,
    getAll, saveAll, getByPeriode, add, update, remove,
    getKasSettings, setKasSettings,
    getNeracaSettings, setNeracaSettings,
    getCompanySettings, setCompanySettings,
    getTotalPenjualan, getTotalHPP, getTotalBeban,
    getTotalPiutang, getTotalHutang, getKasSaldo, getKasSaldoDetail,
    generateId
  };
})();
