/* ================================================
   SablonKas - Data Store (Supabase + localStorage)
   ================================================
   Write-Through Double Storage:
   - Setiap tulis → localStorage DULU (aman), lalu Supabase
   - Saat load → coba Supabase, fallback localStorage
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
  let _sb = null;
  let _syncStatus = 'offline'; // 'offline' | 'syncing' | 'ok' | 'error'
  let _syncError = '';

  // ======== localStorage ========
  function _lsSave(key, value) {
    try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); }
    catch (e) { console.warn('[LS] Save err:', e); }
  }
  function _lsLoad(key, fallback) {
    try { const r = localStorage.getItem(LS_PREFIX + key); return r ? JSON.parse(r) : fallback; }
    catch (e) { return fallback; }
  }
  function _saveColLS(key) { _lsSave(key, _cache[key]); }

  function _loadFromLocalStorage() {
    COLLECTION_KEYS.forEach(k => { _cache[k] = _lsLoad(k, []); });
    _cache.period          = _lsLoad('period', null);
    _cache.kas_settings    = _lsLoad('kas_settings', {});
    _cache.company         = _lsLoad('company', null);
    _cache.neraca_settings = _lsLoad('neraca_settings', {});
  }

  // ======== Supabase ========
  function _sbWrite(promiseFn) {
    if (!_sb || _syncStatus === 'offline') return;
    try {
      promiseFn().then(({ error }) => {
        if (error) {
          console.warn('[Supabase] Write err:', error.message);
          _setSyncStatus('error', error.message);
        }
      });
    } catch (e) { console.warn('[Supabase] Write err:', e); }
  }

  async function _testConnection() {
    const { error } = await _sb.from('sablonkas_data').select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        // Tabel belum ada
        throw new Error('TABEL_BELUM_DIBUAT');
      }
      throw new Error(error.message);
    }
    return true;
  }

  async function _loadFromSupabase() {
    const { data: rows, error } = await _sb
      .from('sablonkas_data').select('collection, id, data');
    if (error) throw new Error(error.message);

    COLLECTION_KEYS.forEach(k => { _cache[k] = []; });
    (rows || []).forEach(row => {
      if (Array.isArray(_cache[row.collection])) _cache[row.collection].push(row.data);
    });

    const { data: settings, error: setErr } = await _sb
      .from('sablonkas_settings').select('key, value');
    if (setErr) throw new Error(setErr.message);
    (settings || []).forEach(row => { _cache[row.key] = row.value; });

    // Sync ke localStorage juga
    COLLECTION_KEYS.forEach(k => _lsSave(k, _cache[k]));
    if (_cache.period)          _lsSave('period', _cache.period);
    if (_cache.kas_settings)    _lsSave('kas_settings', _cache.kas_settings);
    if (_cache.company)         _lsSave('company', _cache.company);
    if (_cache.neraca_settings) _lsSave('neraca_settings', _cache.neraca_settings);
  }

  async function _uploadLocalToSupabase() {
    // Cek apakah Supabase sudah ada data
    const { data: existing } = await _sb.from('sablonkas_data').select('id').limit(1);
    if (existing && existing.length > 0) return; // sudah ada data

    const allRows = [];
    COLLECTION_KEYS.forEach(key => {
      const records = _lsLoad(key, []);
      records.filter(r => r.id).forEach(r => {
        allRows.push({ collection: key, id: String(r.id), data: r });
      });
    });
    if (allRows.length > 0) {
      const { error } = await _sb.from('sablonkas_data').insert(allRows);
      if (error) throw new Error(error.message);
    }

    const settingsRows = [];
    ['period','kas_settings','company','neraca_settings'].forEach(key => {
      const val = _lsLoad(key, null);
      if (val) settingsRows.push({ key, value: val });
    });
    if (settingsRows.length > 0) {
      await _sb.from('sablonkas_settings').upsert(settingsRows);
    }
    if (allRows.length > 0) console.log(`[Migrate] ${allRows.length} records → Supabase ✅`);
  }

  // ======== Sync status ========
  function _setSyncStatus(status, errMsg) {
    _syncStatus = status;
    _syncError = errMsg || '';
    // Update badge di header jika ada
    const badge = document.getElementById('syncStatusBadge');
    if (!badge) return;
    const map = {
      offline:  { color: '#999',    icon: '📴', text: 'Lokal' },
      syncing:  { color: '#f59e0b', icon: '🔄', text: 'Sinkron...' },
      ok:       { color: '#10b981', icon: '☁️', text: 'Cloud ✓' },
      error:    { color: '#ef4444', icon: '⚠️', text: 'Error' },
      no_table: { color: '#f59e0b', icon: '⚙️', text: 'Setup DB' },
    };
    const s = map[status] || map.offline;
    badge.style.color = s.color;
    badge.title = errMsg || s.text;
    badge.textContent = `${s.icon} ${s.text}`;
  }

  function _setStatus(msg) {
    const el = document.getElementById('loadingStatus');
    if (el) el.textContent = msg;
  }

  // ======== Tandai siap ========
  function _markReady() {
    _ready = true;
    const cbs = _readyCallbacks.splice(0);
    cbs.forEach(cb => { try { cb(); } catch (e) { console.error(e); } });
  }

  // ======== Init ========
  async function _init() {
    // 1. Load localStorage dulu → data pasti tersedia
    _loadFromLocalStorage();

    _sb = window._supabaseClient || null;
    if (!_sb) {
      _setSyncStatus('offline', 'Supabase tidak terkonfigurasi');
      _markReady();
      return;
    }

    _setSyncStatus('syncing');
    _setStatus('Menghubungkan ke Supabase...');

    const supabaseWork = async () => {
      await _testConnection();           // cek tabel ada atau tidak
      await _uploadLocalToSupabase();    // upload data lokal jika Supabase masih kosong
      await _loadFromSupabase();         // load dari Supabase ke cache
    };

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), INIT_TIMEOUT_MS)
    );

    try {
      await Promise.race([supabaseWork(), timeoutPromise]);
      _setSyncStatus('ok');
      _setStatus('Tersinkron dengan cloud ✅');
    } catch (err) {
      const msg = err.message;
      if (msg === 'TABEL_BELUM_DIBUAT') {
        _setSyncStatus('no_table', 'Tabel Supabase belum dibuat. Jalankan SQL di Supabase Dashboard.');
        _setStatus('⚙️ Perlu setup tabel Supabase');
        // Tampilkan toast setelah app siap
        setTimeout(() => {
          if (window.Utils) Utils.toast('⚙️ Buat tabel di Supabase dulu! Lihat petunjuk di Pengaturan.', 'warning', 6000);
        }, 1500);
      } else if (msg === 'TIMEOUT') {
        _setSyncStatus('error', 'Koneksi timeout');
        _setStatus('Timeout, pakai data lokal');
      } else {
        _setSyncStatus('error', msg);
        _setStatus('Error: ' + msg.substring(0, 50));
        console.error('[Supabase] Init error:', msg);
      }
    }

    _markReady();
  }

  // ======== Public API ========
  function onReady(cb) {
    if (_ready) { try { cb(); } catch (e) { console.error(e); } }
    else _readyCallbacks.push(cb);
  }

  function getSyncStatus() { return { status: _syncStatus, error: _syncError }; }

  // ======== Period ========
  function getPeriode() {
    if (_cache.period) return _cache.period;
    const now = new Date();
    return { month: String(now.getMonth() + 1).padStart(2, '0'), year: String(now.getFullYear()) };
  }
  function setPeriode(month, year) {
    const val = { month, year };
    _cache.period = val;
    _lsSave('period', val);
    _sbWrite(() => _sb.from('sablonkas_settings').upsert({ key: 'period', value: val }));
  }
  function getPeriodeKey() { const p = getPeriode(); return `${p.year}-${p.month}`; }

  // ======== CRUD ========
  function getAll(key) { return Array.isArray(_cache[key]) ? [..._cache[key]] : []; }

  function saveAll(key, data) {
    _cache[key] = [...data];
    _saveColLS(key);
    _sbWrite(async () => {
      await _sb.from('sablonkas_data').delete().eq('collection', key);
      if (!data.length) return { error: null };
      return _sb.from('sablonkas_data').insert(
        data.filter(r => r.id).map(r => ({ collection: key, id: String(r.id), data: r }))
      );
    });
  }

  function getByPeriode(key, pk) { return getAll(key).filter(r => r.periode === pk); }

  function add(key, record) {
    if (!Array.isArray(_cache[key])) _cache[key] = [];
    _cache[key].push(record);
    _saveColLS(key);
    _sbWrite(() => _sb.from('sablonkas_data').insert({
      collection: key, id: String(record.id), data: record
    }));
  }

  function update(key, id, updates) {
    _cache[key] = getAll(key).map(r => r.id === id ? { ...r, ...updates } : r);
    _saveColLS(key);
    const updated = _cache[key].find(r => r.id === id);
    if (updated) {
      _sbWrite(() => _sb.from('sablonkas_data')
        .update({ data: updated }).eq('collection', key).eq('id', String(id)));
    }
  }

  function remove(key, id) {
    _cache[key] = getAll(key).filter(r => r.id !== id);
    _saveColLS(key);
    _sbWrite(() => _sb.from('sablonkas_data').delete()
      .eq('collection', key).eq('id', String(id)));
  }

  // ======== Settings ========
  function getKasSettings(pk) { return (_cache.kas_settings || {})[pk] || { saldoKas: 0, saldoBank: 0 }; }
  function setKasSettings(pk, s) {
    if (!_cache.kas_settings) _cache.kas_settings = {};
    _cache.kas_settings[pk] = s;
    _lsSave('kas_settings', _cache.kas_settings);
    _sbWrite(() => _sb.from('sablonkas_settings').upsert({ key: 'kas_settings', value: { ..._cache.kas_settings } }));
  }
  function getCompanySettings() {
    return _cache.company || { nama: 'WY SPORT', tagline: 'Jersey & Sportswear Custom', alamat: '', telepon: '' };
  }
  function setCompanySettings(s) {
    _cache.company = s;
    _lsSave('company', s);
    _sbWrite(() => _sb.from('sablonkas_settings').upsert({ key: 'company', value: s }));
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
    _lsSave('neraca_settings', _cache.neraca_settings);
    _sbWrite(() => _sb.from('sablonkas_settings').upsert({ key: 'neraca_settings', value: { ..._cache.neraca_settings } }));
  }

  // ======== Aggregations ========
  function getTotalPenjualan(pk) { return getByPeriode('penjualan',pk).reduce((s,r)=>s+(parseFloat(r.totalHarga)||0),0); }
  function getTotalHPP(pk)       { return getByPeriode('produksi',pk).reduce((s,r)=>s+(parseFloat(r.totalHPP)||0),0); }
  function getTotalBeban(pk)     { return getByPeriode('beban',pk).reduce((s,r)=>s+(parseFloat(r.jumlah)||0),0); }
  function getTotalPiutang(pk) {
    const d = pk ? getAll('piutang').filter(r=>r.periode===pk) : getAll('piutang');
    return d.filter(r=>r.status!=='LUNAS').reduce((s,r)=>s+(parseFloat(r.sisaPiutang)||0),0);
  }
  function getTotalHutang(pk) {
    const d = pk ? getAll('hutang').filter(r=>r.periode===pk) : getAll('hutang');
    return d.filter(r=>r.status!=='LUNAS').reduce((s,r)=>s+(parseFloat(r.sisaHutang)||0),0);
  }
  function getKasSaldo(pk) {
    const s=getKasSettings(pk), t=getByPeriode('kas',pk);
    return (parseFloat(s.saldoKas)||0)+(parseFloat(s.saldoBank)||0)
      +t.reduce((a,r)=>a+(parseFloat(r.masuk)||0),0)
      -t.reduce((a,r)=>a+(parseFloat(r.keluar)||0),0);
  }
  function getKasSaldoDetail(pk) {
    const s=getKasSettings(pk), t=getByPeriode('kas',pk);
    const net=t.reduce((a,r)=>a+(parseFloat(r.masuk)||0),0)-t.reduce((a,r)=>a+(parseFloat(r.keluar)||0),0);
    return { kasTunai:(parseFloat(s.saldoKas)||0)+net, kasBank:(parseFloat(s.saldoBank)||0) };
  }
  function generateId() { return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

  _init();

  return {
    onReady, getSyncStatus,
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
