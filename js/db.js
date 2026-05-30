/* ============================================================
   db.js — Storage Layer (localStorage CRUD)
   PWO App | WYSPORT by Kakami
   ============================================================ */
'use strict';

const DB_KEY     = 'pwo_orders';
const SETTINGS_KEY = 'pwo_settings';
const SEQ_KEY    = 'pwo_seq';

const db = {

  // ---- Get all PWOs ----
  getAll() {
    try {
      return JSON.parse(localStorage.getItem(DB_KEY) || '[]');
    } catch { return []; }
  },

  // ---- Get one PWO by id ----
  get(id) {
    return this.getAll().find(p => p.id === id) || null;
  },

  // ---- Save (create or update) ----
  save(data) {
    const all = this.getAll();
    if (!data.id) {
      // Create new
      data.id        = 'pwo_' + Date.now();
      data.createdAt = new Date().toISOString();
      data.pwoNumber = this._nextNumber();
      all.push(data);
    } else {
      // Update existing
      const idx = all.findIndex(p => p.id === data.id);
      if (idx >= 0) all[idx] = { ...all[idx], ...data, updatedAt: new Date().toISOString() };
      else all.push(data);
    }
    data.updatedAt = new Date().toISOString();
    localStorage.setItem(DB_KEY, JSON.stringify(all));
    return data;
  },

  // ---- Duplicate a PWO ----
  duplicate(id) {
    const original = this.get(id);
    if (!original) return null;
    const copy = JSON.parse(JSON.stringify(original));
    copy.id        = null;
    copy.status    = 'draft';
    copy.client    = original.client + ' (copy)';
    copy.createdAt = null;
    return this.save(copy);
  },

  // ---- Delete ----
  delete(id) {
    const all = this.getAll().filter(p => p.id !== id);
    localStorage.setItem(DB_KEY, JSON.stringify(all));
  },

  // ---- Aggregate stats for dashboard ----
  getStats() {
    const all = this.getAll();
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear  = now.getFullYear();

    const stats = {
      total:    all.length,
      draft:    0,
      proses:   0,
      qc:       0,
      selesai:  0,
      terkirim: 0,
      totalPcs: 0,
      thisMonthCount: 0,
      revenue:  0,
      deadlineSoon: [],  // deadline <= 3 days
      sizeCount: {},
      monthlyData: {},
    };

    const SIZES = ['XS','S','M','L','XL','XXL','3XL','4XL','5XL','CUSTOM'];
    SIZES.forEach(s => { stats.sizeCount[s] = 0; });

    all.forEach(pwo => {
      // Status counts
      const st = pwo.status || 'draft';
      if (stats[st] !== undefined) stats[st]++;

      // Total pcs
      const qty = parseInt(pwo.totalOrder || 0);
      stats.totalPcs += qty;

      // Revenue
      stats.revenue += parseFloat(pwo.grandTotal || 0);

      // This month count
      if (pwo.createdAt) {
        const d = new Date(pwo.createdAt);
        if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
          stats.thisMonthCount++;
        }
        // Monthly data for chart (last 6 months)
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        stats.monthlyData[key] = (stats.monthlyData[key] || 0) + 1;
      }

      // Deadline soon (not selesai/terkirim)
      if (pwo.deadline && !['selesai','terkirim'].includes(st)) {
        const dl = new Date(pwo.deadline);
        const diffDays = Math.ceil((dl - now) / (1000*60*60*24));
        if (diffDays <= 3) {
          stats.deadlineSoon.push({ id: pwo.id, client: pwo.client, project: pwo.project, deadline: pwo.deadline, diffDays });
        }
      }

      // Size count
      if (pwo.rows) {
        pwo.rows.forEach(row => {
          if (row.size && stats.sizeCount[row.size] !== undefined) {
            stats.sizeCount[row.size]++;
          }
        });
      }
    });

    return stats;
  },

  // ---- Sequential PWO number ----
  _nextNumber() {
    const settings = this.getSettings();
    const prefix   = settings.pwoPrefix || 'PWO';
    const year     = new Date().getFullYear();
    let seq = parseInt(localStorage.getItem(SEQ_KEY) || '0') + 1;
    localStorage.setItem(SEQ_KEY, String(seq));
    return `${prefix}-${year}-${String(seq).padStart(3, '0')}`;
  },

  // ---- Settings ----
  getSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; }
  },
  saveSettings(s) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  },

  // ---- Export / Import ----
  exportJSON() {
    const data = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      orders: this.getAll(),
      settings: this.getSettings(),
      seq: localStorage.getItem(SEQ_KEY),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `pwo-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
  },

  importJSON(jsonText) {
    const data = JSON.parse(jsonText);
    if (data.orders) localStorage.setItem(DB_KEY, JSON.stringify(data.orders));
    if (data.settings) localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
    if (data.seq) localStorage.setItem(SEQ_KEY, data.seq);
  },
};
