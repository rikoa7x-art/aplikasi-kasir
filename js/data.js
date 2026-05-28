/* ================================================
   SablonKas - Data Store (Supabase + Cache)
   ================================================
   Strategi: Cache-First
   - Init: load semua data dari Supabase ke memori
   - Baca: dari cache (sinkron, no breaking change)
   - Tulis: update cache langsung + sync Supabase di background
   - Timeout 8 detik: fallback localStorage jika Supabase lambat
   ================================================ */

const DB = (() => {
  const COLLECTION_KEYS = ['penjualan', 'kas', 'pembelian', 'produksi', 'piutang', 'hutang', 'beban'];
  const LS_PREFIX = 'sk_';
  const INIT_TIMEOUT_MS = 8000;

  const _cache = {
    penjualan: [], kas: [], pembelian: [], produksi: [],
    piutang: [], hutang: [], beban: [],
    period: null, kas_settings: {}, company: null, neraca_settings: {}
  };

  let _ready = false;
  let _readyCallbacks = [];
  let _sb = null; // Supabase client

  // ---- Supabase fire-and-forget write ----
  function _fw(promiseFn) {
    if (!_sb) return;
    try { promiseFn().then(({ error }) => { if (error) console.warn('[Supabase] Write err:', error.message); }); }
    catch (e) { console.warn('[Supabase] Write err:', e); }
  }

  // ---- Update status loading screen ----
  function _setStatus(msg) {
    const el = document.getElementById('loadingStatus');
    if (el) el.textContent = msg;
  }

  // ---- Fallback: localStorage ----
  function _loadFromLocalStorage() {
    try {
      COLLECTION_KEYS.forEach(key => {
        const raw = localStorage.getItem(LS_PREFIX + key);
        _cache[key] = raw ? JSON.parse(raw) : [];
      });
      ['period', 'kas_settings', 'company', 'neraca_settings'].forEach(key => {
        const raw = localStorage.getItem(LS_PREFIX + key);
        if (raw) _cache[key] = JSON.parse(raw);
      });
      console.log('[DB] Loaded from localStorage');
    } catch (e) { console.warn('[DB] localStorage err:', e); }
  }

  // ---- Load semua data dari Supabase ----
  async function _loadFromSupabase() {
    // Load semua data transaksi sekaligus
    const { data: rows, error: dataErr } = await _sb
      .from('sablonkas_data')
      .select('collection, id, data');

    if (dataErr) throw dataErr;

    // Reset cache collections
    COLLECTION_KEYS.forEach(k => { _cache[k] = []; });

    // Isi cache dari rows
    (rows || []).forEach(row => {
      if (_cache[row.collection] !== undefined) {
        _cache[row.collection].push(row.data);
      }
    });

    // Load settings
    const { data: settings, error: setErr } = await _sb
      .from('sablonkas_settings')
      .select('key, value');

    if (setErr) throw setErr;

    (settings || []).forEach(row => {
      _cache[row.key] = row.value;
    });

    console.log('[Supabase] Data loaded ✅');
  }

  // ---- Migrasi localStorage → Supabase (sekali jalan) ----
  async function _migrate() {
    if (localStorage.getItem(LS_PREFIX + '_migrated_sb')) return;

    // Cek apakah Supabase sudah ada data
    const { data: existing } = await _sb.from('sablonkas_data').select('id').limit(1);
    if (existing && existing.length > 0) {
      localStorage.setItem(LS_PREFIX + '_migrated_sb', '1');
      return;
    }

    let migrated = false;

    // Migrasi koleksi data
    for (const key of COLLECTION_KEYS) {
      const raw = localStorage.getItem(LS_PREFIX + key);
      if (!raw) continue;
      const records = JSON.parse(raw);
      if (!records || !records.length) continue;

      const rows = records
        .filter(r => r.id)
        .map(r => ({ collection: key, id: String(r.id), data: r }));

      if (rows.length > 0) {
        const { error } = await _sb.from('sablonkas_data').insert(rows);
        if (error) console.warn(`[Migrate] Error '${key}':`, error.message);
        else { console.log(`[Migrate] '${key}': ${rows.length} records → Supabase`); migrated = true; }
      }
    }

    // Migrasi settings
    const settingsKeys = ['period', 'kas_settings', 'company', 'neraca_settings'];
    const settingsRows = [];
    settingsKeys.forEach(key => {
      const raw = localStorage.getItem(LS_PREFIX + key);
      if (raw) settingsRows.push({ key, value: JSON.parse(raw) });
    });

    if (settingsRows.length > 0) {
      const { error } = await _sb.from('sablonkas_settings').upsert(settingsRows);
      if (error) console.warn('[Migrate] Settings error:', error.message);
      else migrated = true;
    }

    if (migrated) {
      localStorage.setItem(LS_PREFIX + '_migrated_sb', '1');
      console.log('[Migrate] Migrasi selesai ✅');
    }
  }

  // ---- Tandai siap ----
  function _markReady() {
    _ready = true;
    const cbs = _readyCallbacks.splice(0);
    cbs.forEach(cb => { try { cb(); } catch (e) { console.error(e); } });
  }

  // ---- Inisialisasi utama ----
  async function _init() {
    _sb = window._supabaseClient || null;

    if (!_sb) {
      _setStatus('Mode offline (data lokal)');
      _loadFromLocalStorage();
      _markReady();
      return;
    }

    const supabaseWork = async () => {
      _setStatus('Memuat data dari Supabase...');
      await _migrate();
      await _loadFromSupabase();
    };

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), INIT_TIMEOUT_MS)
    );

    try {
      await Promise.race([supabaseWork(), timeout]);
      _setStatus('Data siap ✅');
    } catch (err) {
      const msg = err.message === 'timeout' ? 'Koneksi lambat, pakai data lokal...' : 'Pakai data lokal...';
      _setStatus(msg);
      console.warn('[DB] Supabase fallback:', err.message);
      _loadFromLocalStorage();
    }

    _markReady();
  }

  // ---- Public: onReady ----
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
    _fw(() => _sb.from('sablonkas_settings').upsert({ key: 'period', value: val }));
  }
  function getPeriodeKey() {
    const p = getPeriode(); return `${p.year}-${p.month}`;
  }

  // ---- CRUD ----
  function getAll(key) { return Array.isArray(_cache[key]) ? [..._cache[key]] : []; }

  function saveAll(key, data) {
    _cache[key] = [...data];
    _fw(async () => {
      // Hapus semua record lama untuk koleksi ini
      await _sb.from('sablonkas_data').delete().eq('collection', key);
      if (!data.length) return { error: null };
      const rows = data.filter(r => r.id).map(r => ({ collection: key, id: String(r.id), data: r }));
      return _sb.from('sablonkas_data').insert(rows);
    });
  }

  function getByPeriode(key, periodeKey) { return getAll(key).filter(r => r.periode === periodeKey); }

  function add(key, record) {
    if (!Array.isArray(_cache[key])) _cache[key] = [];
    _cache[key].push(record);
    _fw(() => _sb.from('sablonkas_data').insert({ collection: key, id: String(record.id), data: record }));
  }

  function update(key, id, updates) {
    _cache[key] = getAll(key).map(r => r.id === id ? { ...r, ...updates } : r);
    const updated = _cache[key].find(r => r.id === id);
    if (updated) {
      _fw(() => _sb.from('sablonkas_data')
        .update({ data: updated })
        .eq('collection', key)
        .eq('id', String(id))
      );
    }
  }

  function remove(key, id) {
    _cache[key] = getAll(key).filter(r => r.id !== id);
    _fw(() => _sb.from('sablonkas_data').delete().eq('collection', key).eq('id', String(id)));
  }

  // ---- Settings ----
  function getKasSettings(pk) { return (_cache.kas_settings || {})[pk] || { saldoKas: 0, saldoBank: 0 }; }
  function setKasSettings(pk, s) {
    if (!_cache.kas_settings) _cache.kas_settings = {};
    _cache.kas_settings[pk] = s;
    const snap = { ..._cache.kas_settings };
    _fw(() => _sb.from('sablonkas_settings').upsert({ key: 'kas_settings', value: snap }));
  }
  function getCompanySettings() {
    return _cache.company || { nama: 'WY SPORT', tagline: 'Jersey & Sportswear Custom', alamat: '', telepon: '' };
  }
  function setCompanySettings(s) {
    _cache.company = s;
    _fw(() => _sb.from('sablonkas_settings').upsert({ key: 'company', value: s }));
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
    _fw(() => _sb.from('sablonkas_settings').upsert({ key: 'neraca_settings', value: snap }));
  }

  // ---- Aggregations ----
  function getTotalPenjualan(pk) { return getByPeriode('penjualan', pk).reduce((s, r) => s + (parseFloat(r.totalHarga) || 0), 0); }
  function getTotalHPP(pk)       { return getByPeriode('produksi', pk).reduce((s, r) => s + (parseFloat(r.totalHPP) || 0), 0); }
  function getTotalBeban(pk)     { return getByPeriode('beban', pk).reduce((s, r) => s + (parseFloat(r.jumlah) || 0), 0); }
  function getTotalPiutang(pk) {
    const d = pk ? getAll('piutang').filter(r => r.periode === pk) : getAll('piutang');
    return d.filter(r => r.status !== 'LUNAS').reduce((s, r) => s + (parseFloat(r.sisaPiutang) || 0), 0);
  }
  function getTotalHutang(pk) {
    const d = pk ? getAll('hutang').filter(r => r.periode === pk) : getAll('hutang');
    return d.filter(r => r.status !== 'LUNAS').reduce((s, r) => s + (parseFloat(r.sisaHutang) || 0), 0);
  }
  function getKasSaldo(pk) {
    const s = getKasSettings(pk), t = getByPeriode('kas', pk);
    return (parseFloat(s.saldoKas) || 0) + (parseFloat(s.saldoBank) || 0)
      + t.reduce((a, r) => a + (parseFloat(r.masuk) || 0), 0)
      - t.reduce((a, r) => a + (parseFloat(r.keluar) || 0), 0);
  }
  function getKasSaldoDetail(pk) {
    const s = getKasSettings(pk), t = getByPeriode('kas', pk);
    const net = t.reduce((a, r) => a + (parseFloat(r.masuk) || 0), 0)
              - t.reduce((a, r) => a + (parseFloat(r.keluar) || 0), 0);
    return { kasTunai: (parseFloat(s.saldoKas) || 0) + net, kasBank: (parseFloat(s.saldoBank) || 0) };
  }
  function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

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
