/* ================================================
   SablonKas - Data Store (Firebase Firestore + Cache)
   ================================================
   Strategi: Cache-First
   - Saat init: ambil semua data dari Firestore ke memori
   - Baca: dari cache (sinkron, tidak ada breaking change ke modul)
   - Tulis: update cache langsung + sync ke Firestore di background
   ================================================ */

const DB = (() => {
  // ---- Firestore & Cache ----
  const _db = window._firestoreDB;

  // Koleksi data utama (array of records)
  const COLLECTION_KEYS = ['penjualan', 'kas', 'pembelian', 'produksi', 'piutang', 'hutang', 'beban'];

  // In-memory cache
  const _cache = {
    // collections
    penjualan: [], kas: [], pembelian: [], produksi: [],
    piutang: [], hutang: [], beban: [],
    // settings (disimpan di Firestore koleksi _settings)
    period: null,
    kas_settings: {},
    company: null,
    neraca_settings: {}
  };

  let _ready = false;
  let _readyCallbacks = [];

  // ---- Pending write queue (untuk fallback offline) ----
  function _safeWrite(fn) {
    try { fn(); } catch (e) { console.warn('[Firebase] Write error:', e); }
  }

  // ---- Firestore Helpers ----
  function _col(key) { return _db.collection(key); }
  function _settingsDoc(key) { return _db.collection('_settings').doc(key); }

  // ---- Load semua data dari Firestore ke cache ----
  async function _loadFromFirestore() {
    try {
      // Load semua koleksi data secara paralel
      const colPromises = COLLECTION_KEYS.map(key =>
        _col(key).get().then(snap => {
          _cache[key] = snap.docs.map(doc => doc.data());
        })
      );

      // Load semua settings secara paralel
      const settingsKeys = ['period', 'kas_settings', 'company', 'neraca_settings'];
      const settingsPromises = settingsKeys.map(key =>
        _settingsDoc(key).get().then(doc => {
          if (doc.exists) _cache[key] = doc.data();
        })
      );

      await Promise.all([...colPromises, ...settingsPromises]);
      console.log('[Firebase] Data berhasil dimuat dari Firestore ✅');
    } catch (err) {
      console.warn('[Firebase] Gagal load dari Firestore, mencoba localStorage:', err);
      _loadFromLocalStorage();
    }
  }

  // ---- Fallback: load dari localStorage jika Firestore gagal ----
  function _loadFromLocalStorage() {
    const PREFIX = 'sk_';
    try {
      COLLECTION_KEYS.forEach(key => {
        const raw = localStorage.getItem(PREFIX + key);
        if (raw) _cache[key] = JSON.parse(raw);
      });
      const rawPeriod = localStorage.getItem(PREFIX + 'period');
      if (rawPeriod) _cache.period = JSON.parse(rawPeriod);
      const rawKasSettings = localStorage.getItem(PREFIX + 'kas_settings');
      if (rawKasSettings) _cache.kas_settings = JSON.parse(rawKasSettings);
      const rawCompany = localStorage.getItem(PREFIX + 'company');
      if (rawCompany) _cache.company = JSON.parse(rawCompany);
      const rawNeraca = localStorage.getItem(PREFIX + 'neraca_settings');
      if (rawNeraca) _cache.neraca_settings = JSON.parse(rawNeraca);
      console.log('[DB] Data dimuat dari localStorage (fallback) ✅');
    } catch (e) {
      console.warn('[DB] Fallback localStorage juga gagal:', e);
    }
  }

  // ---- Migrasi: pindahkan data localStorage ke Firestore ----
  async function _migrateLocalStorageToFirestore() {
    const PREFIX = 'sk_';
    let hasMigrated = false;

    try {
      for (const key of COLLECTION_KEYS) {
        const raw = localStorage.getItem(PREFIX + key);
        if (!raw) continue;
        const records = JSON.parse(raw);
        if (!records || records.length === 0) continue;

        // Cek apakah Firestore sudah punya data
        const snap = await _col(key).limit(1).get();
        if (!snap.empty) continue; // sudah ada data, skip

        // Batch write ke Firestore
        const batch = _db.batch();
        records.forEach(record => {
          if (record.id) {
            batch.set(_col(key).doc(String(record.id)), record);
          }
        });
        await batch.commit();
        _cache[key] = records;
        hasMigrated = true;
        console.log(`[Migrate] ${records.length} record '${key}' dipindahkan ke Firestore`);
      }

      // Migrasi settings
      const settingsMap = {
        period: PREFIX + 'period',
        kas_settings: PREFIX + 'kas_settings',
        company: PREFIX + 'company',
        neraca_settings: PREFIX + 'neraca_settings'
      };

      for (const [fsKey, lsKey] of Object.entries(settingsMap)) {
        const raw = localStorage.getItem(lsKey);
        if (!raw) continue;

        const settingsSnap = await _settingsDoc(fsKey).get();
        if (settingsSnap.exists) continue; // sudah ada

        const val = JSON.parse(raw);
        await _settingsDoc(fsKey).set(val);
        _cache[fsKey] = val;
        hasMigrated = true;
        console.log(`[Migrate] Settings '${fsKey}' dipindahkan ke Firestore`);
      }

      if (hasMigrated) {
        console.log('[Migrate] Migrasi localStorage → Firestore selesai ✅');
      }
    } catch (err) {
      console.warn('[Migrate] Migrasi gagal:', err);
    }
  }

  // ---- Inisialisasi: load data lalu panggil onReady callbacks ----
  async function _init() {
    await _migrateLocalStorageToFirestore();
    await _loadFromFirestore();
    _ready = true;
    _readyCallbacks.forEach(cb => {
      try { cb(); } catch (e) { console.error('[DB] onReady callback error:', e); }
    });
    _readyCallbacks = [];
  }

  // ---- Public: daftar callback saat data siap ----
  function onReady(callback) {
    if (_ready) {
      try { callback(); } catch (e) { console.error('[DB] onReady callback error:', e); }
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
    _safeWrite(() => _settingsDoc('period').set(val));
  }

  function getPeriodeKey() {
    const p = getPeriode();
    return `${p.year}-${p.month}`;
  }

  // ---- Generic CRUD (menggunakan cache, Firestore sync di background) ----
  function getAll(key) {
    return Array.isArray(_cache[key]) ? [..._cache[key]] : [];
  }

  function saveAll(key, data) {
    _cache[key] = [...data];
    // Sync ke Firestore: hapus semua lama lalu set yang baru (batch)
    _safeWrite(async () => {
      try {
        const snap = await _col(key).get();
        const batch = _db.batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        data.forEach(record => {
          if (record.id) batch.set(_col(key).doc(String(record.id)), record);
        });
        await batch.commit();
      } catch (e) {
        console.warn(`[Firebase] saveAll '${key}' gagal:`, e);
      }
    });
  }

  function getByPeriode(key, periodeKey) {
    return getAll(key).filter(r => r.periode === periodeKey);
  }

  function add(key, record) {
    if (!Array.isArray(_cache[key])) _cache[key] = [];
    _cache[key].push(record);
    _safeWrite(() => _col(key).doc(String(record.id)).set(record));
  }

  function update(key, id, updates) {
    _cache[key] = getAll(key).map(r => r.id === id ? { ...r, ...updates } : r);
    _safeWrite(() => _col(key).doc(String(id)).update(updates));
  }

  function remove(key, id) {
    _cache[key] = getAll(key).filter(r => r.id !== id);
    _safeWrite(() => _col(key).doc(String(id)).delete());
  }

  // ---- Kas & Bank Settings ----
  function getKasSettings(periodeKey) {
    const all = _cache.kas_settings || {};
    return all[periodeKey] || { saldoKas: 0, saldoBank: 0 };
  }

  function setKasSettings(periodeKey, settings) {
    if (!_cache.kas_settings) _cache.kas_settings = {};
    _cache.kas_settings[periodeKey] = settings;
    _safeWrite(() => _settingsDoc('kas_settings').set(_cache.kas_settings));
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
    _safeWrite(() => _settingsDoc('company').set(settings));
  }

  // ---- Neraca Settings ----
  function getNeracaSettings(periodeKey) {
    const all = _cache.neraca_settings || {};
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
    if (!_cache.neraca_settings) _cache.neraca_settings = {};
    _cache.neraca_settings[periodeKey] = {
      ...getNeracaSettings(periodeKey),
      ...settings
    };
    _safeWrite(() => _settingsDoc('neraca_settings').set(_cache.neraca_settings));
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

  function getTotalPiutang(periodeKey) {
    const data = periodeKey
      ? getAll('piutang').filter(r => r.periode === periodeKey)
      : getAll('piutang');
    return data
      .filter(r => r.status !== 'LUNAS')
      .reduce((s, r) => s + (parseFloat(r.sisaPiutang) || 0), 0);
  }

  function getTotalHutang(periodeKey) {
    const data = periodeKey
      ? getAll('hutang').filter(r => r.periode === periodeKey)
      : getAll('hutang');
    return data
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

  function getKasSaldoDetail(periodeKey) {
    const settings = getKasSettings(periodeKey);
    const txns = getByPeriode('kas', periodeKey);
    const totalMasuk = txns.reduce((s, r) => s + (parseFloat(r.masuk) || 0), 0);
    const totalKeluar = txns.reduce((s, r) => s + (parseFloat(r.keluar) || 0), 0);
    const netFlow = totalMasuk - totalKeluar;
    const saldoKasAwal = parseFloat(settings.saldoKas) || 0;
    const saldoBankAwal = parseFloat(settings.saldoBank) || 0;
    return {
      kasTunai: saldoKasAwal + netFlow,
      kasBank: saldoBankAwal
    };
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // ---- Mulai inisialisasi ----
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
