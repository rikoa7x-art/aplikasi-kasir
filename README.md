# 🖨️ SablonKas - Aplikasi Manajemen Keuangan Sablon

Aplikasi manajemen keuangan berbasis web (mobile-first) untuk perusahaan percetakan sablon kaos.

## 🌐 Live Demo
👉 **[Buka Aplikasi](https://rikoa7x-art.github.io/aplikasi-kasir/)**

## ✨ Fitur

| Modul | Keterangan |
|-------|------------|
| 📊 Dashboard | Ringkasan KPI & grafik keuangan |
| 📈 Penjualan | Catat order & invoice |
| 💰 Kas & Bank | Buku mutasi kas harian |
| 📦 Pembelian | Pembelian bahan baku & supplies |
| ⚙️ Produksi/HPP | Biaya produksi & HPP per order |
| 👥 Piutang | Kartu piutang pelanggan |
| 🏢 Hutang | Kartu hutang supplier |
| 💼 Beban Ops | Gaji, sewa, utilitas & lainnya |
| 📋 Laba Rugi | Laporan L/R otomatis |
| 🏦 Neraca | Balance sheet perusahaan |

## 🚀 Teknologi
- HTML5 + Vanilla CSS + JavaScript
- LocalStorage (data tersimpan di browser, offline)
- Multi-periode (pilih bulan/tahun)
- Export Excel (.xlsx) via SheetJS
- Export PDF via Print

## 📱 Cara Pakai
1. Buka `index.html` di browser (atau akses link demo)
2. Pilih periode (bulan & tahun) via tombol header
3. Mulai input data dari modul yang diinginkan
4. Laporan Laba Rugi & Neraca terhitung otomatis

## 💡 Catatan
- Data disimpan di **localStorage** browser (tidak hilang saat refresh)
- Untuk backup, gunakan fitur **Export Excel**
- Untuk cetak laporan, gunakan tombol **Export PDF**
