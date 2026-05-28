/* ================================================
   SablonKas - Data Store (Firebase Firestore + Cache)
   ================================================ */

const DB = (() => {
  const COLLECTION_KEYS = ['penjualan', 'kas', 'pembelian', 'produksi', 'piutang', 'hutang', 'beban'];
  const LS_PREFIX = 'sk_';
  const INIT_TIMEOUT_MS = 8000; // fallback ke localStorage jika Firebase > 8 detik

  const _cache = {
    penjualan: [], kas: [], pembelian: [], produksi: [],
    piutang: [], hutang: [], beban: [],
    period: null, kas_settings: {}, company: null, neraca_settings: {}
  };

  let _ready = false;
  let _readyCallbacks = [];
  let _db = null;

  // ---- Helpers ----
  function _col(key)            { return _db.collection(key); }
  function _settingsDoc(key)    { return _db.collection('_settings').doc(key); }

  // Fire-and-forget write ke Firestore
  function _fw(promiseFn) {
    if (!_db) return;
    try { promiseFn().catch(e => console.warn('[Firebase] Write err:', e)); }
    catch (e) { console.warn('[Firebase] Write err:', e); }
  }

  // ---- Load dari localStorage (fallback) ----
  function _loadFromLocalStorage() {
    try {
      COLLECTION_KEYS.forEach(key => {
        const raw = localStorage.getItem(LS_PREFIX + key);
        _cache[key] = raw ? JSON.parse(raw) : [];
      });
      ['period','kas_settings','company','neraca_settings'].forEach(key => {
        const raw = localStorage.getItem(LS_PREFIX + key);
        if (raw) _cache[key] = JSON.parse(raw);
      });
      console.log('[DB] Loaded from localStorage');
    } catch (e) { console.warn('[DB] localStorage error:', e); }
  }

  // ---- Load dari Firestore ----
  async function _loadFromFirestore() {
    const colPromises = COLLECTION_KEYS.map(key =>
      _col(key).get().then(snap => { _cache[key] = snap.docs.map(d => d.data()); })
    );
    const setPromises = ['period','kas_settings','company','neraca_settings'].map(key =>
      _settingsDoc(key).get().then(doc => { if (doc.exists) _cache[key] = doc.data(); })
    );
    await Promise.all([...colPromises, ...setPromises]);
    console.log('[Firebase] Data loaded ✅');
  }

  // ---- Migrasi localStorage → Firestore ----
  async function _migrate() {
    if (localStorage.getItem(LS_PREFIX + '_migrated')) return;
    let migrated = false;
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
      migrated = true;
    }
    const settingsMap = { period: 'period', kas_settings: 'kas_settings', company: 'company', neraca_settings: 'neraca_settings' };
    for (const [fsKey, lsKey] of Object.entries(settingsMap)) {
      const raw = localStorage.getItem(LS_PREFIX + lsKey);
      if (!raw) continue;
      const snap = await _settingsDoc(fsKey).get();
      if (snap.exists) continue;
      await _settingsDoc(fsKey).set(JSON.parse(raw));
      migrated = true;
    }
    if (migrated) {
      localStorage.setItem(LS_PREFIX + '_migrated', '1');
      console.log('[Migrate] Done ✅');
    }
  }

  // ---- Tandai siap ----
  function _markReady() {
    _ready = true;
    const cbs = _readyCallbacks.splice(0);
    cbs.forEach(cb => { try { cb(); } catch (e) { console.error(e); } });
  }

  // ---- Update teks loading screen ----
  function _setStatus(msg) {
    const el = document.getElementById('loadingStatus');
    if (el) el.textContent = msg;
  }

  // ---- Inisialisasi utama (dengan timeout) ----
  async function _init() {
    _db = window._firestoreDB || null;

    if (!_db) {
      _setStatus('Mode offline (localStorage)');
      _loadFromLocalStorage();
      _markReady();
      return;
    }

    // Buat promise dengan timeout agar tidak stuck selamanya
    const firebaseWork = async () => {
      _setStatus('Memuat data dari Firebase...');
      await _migrate();
      await _loadFromFirestore();
    };

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firebase timeout')), INIT_TIMEOUT_MS)
    );

    try {
      await Promise.race([firebaseWork(), timeout]);
      _setStatus('Data siap ✅');
    } catch (err) {
      if (err.message === 'Firebase timeout') {
        _setStatus('Firebase lambat, pakai data lokal...');
        console.warn('[DB] Firebase timeout, fallback localStorage');
      } else {
        _setStatus('Pakai data lokal...');
        console.warn('[DB] Firebase error:', err);
      }
      _loadFromLocalStorage();
    }

    _markReady();
  }

  // ---- Public API ----
  function onReady(cb) {
    if (_ready) { try { cb(); } catch (e) { console.error(e); } }
    else _readyCallbacks.push(cb);
  }

  // ---- Period ----
  function getPeriode() {
    if (_cache.period) return _cache.period;
    const now = new Date();
    return { month: String(now.getMonth() + 1).padStart(2, '0'), year: String(now.getFullYear()) };
  }
  function setPeriode(month, year) {
    const val = { month, year };
    _cache.period = val;
    _fw(() => _settingsDoc('period').set(val));
  }
  function getPeriodeKey() {
    const p = getPeriode(); return `${p.year}-${p.month}`;
  }

  // ---- CRUD ----
  function getAll(key) { return Array.isArray(_cache[key]) ? [..._cache[key]] : []; }

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

  function getByPeriode(key, periodeKey) { return getAll(key).filter(r => r.periode === periodeKey); }
  function add(key, record) {
    if (!Array.isArray(_cache[key])) _cache[key] = [];
    _cache[key].push(record);
    _fw(() => _col(key).doc(String(record.id)).set(record));
  }
  function update(key, id, updates) {
    _cache[key] = getAll(key).map(r => r.id === id ? { ...r, ...updates } : r);
    _fw(() => _col(key).doc(String(id)).update(updates));
  }
  function remove(key, id) {
    _cache[key] = getAll(key).filter(r => r.id !== id);
    _fw(() => _col(key).doc(String(id)).delete());
  }

  // ---- Settings ----
  function getKasSettings(pk) { return (_cache.kas_settings || {})[pk] || { saldoKas: 0, saldoBank: 0 }; }
  function setKasSettings(pk, s) {
    if (!_cache.kas_settings) _cache.kas_settings = {};
    _cache.kas_settings[pk] = s;
    const snap = { ..._cache.kas_settings };
    _fw(() => _settingsDoc('kas_settings').set(snap));
  }
  function getCompanySettings() {
    return _cache.company || { nama: 'WY SPORT', tagline: 'Jersey & Sportswear Custom', alamat: '', telepon: '' };
  }
  function setCompanySettings(s) {
    _cache.company = s;
    _fw(() => _settingsDoc('company').set(s));
  }
  function getNeracaSettings(pk) {
    return (_cache.neraca_settings || {})[pk] || {
      persediaanBahanBaku: 0, persediaanBarangJadi: 0, mesinPeralatan: 0,
      akumulasiPenyusutan: 0, inventarisKantor: 0, hutangPajak: 0,
      biayaHarusDibayar: 0, modalDisetor: 0, labaDitahan: 0
    };
  }
  function setNeracaSettings(pk, s) {
    if (!_cache.neraca_settings) _cache.neraca_settings = {};
    _cache.neraca_settings[pk] = { ...getNeracaSettings(pk), ...s };
    const snap = { ..._cache.neraca_settings };
    _fw(() => _settingsDoc('neraca_settings').set(snap));
  }

  // ---- Aggregations ----
  function getTotalPenjualan(pk) { return getByPeriode('penjualan', pk).reduce((s,r) => s+(parseFloat(r.totalHarga)||0), 0); }
  function getTotalHPP(pk)       { return getByPeriode('produksi', pk).reduce((s,r) => s+(parseFloat(r.totalHPP)||0), 0); }
  function getTotalBeban(pk)     { return getByPeriode('beban', pk).reduce((s,r) => s+(parseFloat(r.jumlah)||0), 0); }
  function getTotalPiutang(pk) {
    const d = pk ? getAll('piutang').filter(r => r.periode===pk) : getAll('piutang');
    return d.filter(r => r.status!=='LUNAS').reduce((s,r) => s+(parseFloat(r.sisaPiutang)||0), 0);
  }
  function getTotalHutang(pk) {
    const d = pk ? getAll('hutang').filter(r => r.periode===pk) : getAll('hutang');
    return d.filter(r => r.status!=='LUNAS').reduce((s,r) => s+(parseFloat(r.sisaHutang)||0), 0);
  }
  function getKasSaldo(pk) {
    const s = getKasSettings(pk), t = getByPeriode('kas', pk);
    return (parseFloat(s.saldoKas)||0)+(parseFloat(s.saldoBank)||0)+t.reduce((a,r)=>a+(parseFloat(r.masuk)||0),0)-t.reduce((a,r)=>a+(parseFloat(r.keluar)||0),0);
  }
  function getKasSaldoDetail(pk) {
    const s = getKasSettings(pk), t = getByPeriode('kas', pk);
    const net = t.reduce((a,r)=>a+(parseFloat(r.masuk)||0),0)-t.reduce((a,r)=>a+(parseFloat(r.keluar)||0),0);
    return { kasTunai: (parseFloat(s.saldoKas)||0)+net, kasBank: (parseFloat(s.saldoBank)||0) };
  }
  function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

  // Mulai init
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
