# 🧾 QasirKu

Aplikasi Point of Sale (POS) Progressive Web App gratis dan open-source yang dirancang untuk Usaha Mikro, Kecil, dan Menengah (UMKM) di Indonesia. Kini hadir dengan arsitektur **Client-Server** terpusat untuk sinkronisasi data yang andal, aman, dan kolaboratif bagi multi-user (owner & staff).

---

## ✨ Fitur Utama

- **POS / Kasir** — Antarmuka kasir yang lengkap dengan keranjang belanja, diskon per item & diskon transaksi, pemilihan metode pembayaran, kalkulasi kembalian otomatis, serta pemilihan pelanggan.
- **Open Bill** — Simpan transaksi sebagai open bill untuk diselesaikan nanti, lengkap dengan nama pelanggan, nomor meja, catatan per item, dan keterangan tambahan yang dicetak pada struk.
- **Manajemen Pelanggan** — CRUD data pelanggan (nama, nomor HP, email, alamat, catatan) lengkap dengan ringkasan transaksi (total belanja, frekuensi belanja) dan riwayat transaksi mereka.
- **Manajemen Pengeluaran** — Pencatatan pengeluaran operasional bisnis berdasarkan kategori dan metode pembayaran, dilengkapi visualisasi kartu ringkasan total pengeluaran dan filter rentang waktu (hari ini, 7 hari, 30 hari, bulan ini, semua).
- **Manajemen Produk & SKU** — Manajemen katalog produk lengkap dengan kategori, SKU (unik & wajib), satuan, deskripsi, foto produk, dan dukungan barcode.
- **Manajemen Stok & HPP (COGS)** — Pencatatan barang masuk (Stock In) dari supplier dan barang keluar non-penjualan (Stock Out - rusak, hilang, dll). Harga Pokok Penjualan (HPP) dihitung otomatis menggunakan metode *Weighted Average* setiap kali stok baru ditambahkan.
- **Laporan & Analitik** — Grafik penjualan 7/30 hari terakhir, produk terlaris, total pendapatan, margin keuntungan bersih, laporan pengeluaran, serta audit log mutasi stok. Laporan dapat diekspor ke file **Excel (.xlsx)** langsung dari sisi klien.
- **Riwayat Transaksi** — Halaman daftar seluruh transaksi penjualan beserta detail item dan struk untuk dicetak/dikirim ulang.
- **Multi-User & Hak Akses** — Autentikasi dengan peran Owner & Staff. Owner dapat mengatur hak akses spesifik bagi staff (seperti mengelola produk, melihat laporan, mengakses pengeluaran, dll). Staff masuk menggunakan PIN 4-6 digit yang aman.
- **Barcode Scanning** — Pemindaian barcode produk langsung menggunakan kamera perangkat (mendukung EAN-13, EAN-8, UPC-A, UPC-E, Code-128, dll) atau input manual keyboard.
- **PWA (Progressive Web App)** — Dapat diinstal langsung ke layar utama perangkat (homescreen) di Android, iOS, maupun Desktop dengan dukungan Service Worker (Workbox).
- **Tema Kustom & Dark Mode** — Dukungan penuh untuk mode gelap (Dark Mode) serta kustomisasi warna aksen tema aplikasi (tersedia beberapa pilihan warna).

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Framework** | React 18 + TypeScript |
| **Build Tool** | Vite |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Theming** | next-themes (mode gelap/terang) |
| **State & Caching** | @tanstack/react-query (React Query) |
| **API Client** | Axios (dengan interceptor untuk otorisasi JWT) |
| **Authentication** | JWT (JSON Web Token) dengan penyimpanan lokal di `localStorage` |
| **Charts** | Recharts |
| **Routing** | React Router DOM v6 |
| **Forms & Validation** | React Hook Form + Zod |
| **Icons** | Lucide React |
| **Date formatting** | date-fns (id locale) |
| **PWA Support** | vite-plugin-pwa (Workbox) |
| **Barcode Scanner** | html5-qrcode (camera + manual input) |
| **Receipt Rendering** | html2canvas (to PNG), Web Bluetooth Print |
| **Excel Export** | ExcelJS (ekspor laporan .xlsx sisi klien) |
| **Typography** | Plus Jakarta Sans |

---

## 🚀 Memulai (Local Development)

### Prasyarat

- [Bun](https://bun.sh/) (sangat direkomendasikan) atau [Node.js](https://nodejs.org/) v18+
- npm, yarn, atau bun

### Langkah Instalasi

1. **Clone repository ini**
   ```bash
   git clone https://github.com/m-ghozi/qasirku.git
   cd qasirku
   ```

2. **Konfigurasi Environment Variable**
   Buat file `.env` di root direktori proyek Anda:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
   *Sesuaikan URL di atas dengan alamat REST API Backend QasirKu Anda.*

3. **Instal dependencies**
   ```bash
   npm install
   # atau jika menggunakan bun
   bun install
   ```

4. **Jalankan server pengembangan**
   ```bash
   npm run dev
   # atau
   bun run dev
   ```
   Aplikasi client akan berjalan secara lokal di `http://localhost:8080`.

### Build untuk Produksi

```bash
npm run build
npm run preview
```

---

## 📁 Struktur Proyek Klien

```
src/
├── App.tsx                  # Root component & konfigurasi routing aplikasi
├── main.tsx                 # Entry point aplikasi React
├── index.css                # Konfigurasi Token Desain (HSL CSS variables & Tailwind)
├── lib/
│   ├── api.ts               # Instance Axios dengan interceptor JWT & auto-logout
│   ├── auth.ts              # Fungsi helper otorisasi JWT, decode token, & pemetaan izin
│   ├── export-report.ts     # Ekspor laporan ke file Excel (.xlsx) via ExcelJS
│   ├── utils.ts             # Fungsi utility umum (e.g., cn helper untuk Tailwind)
│   └── image-utils.ts       # Kompresi gambar produk sisi klien sebelum diunggah
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx    # Tata letak utama responsif (mobile-first / tablet split-pane)
│   │   └── BottomNav.tsx    # Navigasi bawah (5 tab utama, tombol kasir di tengah)
│   ├── reports/
│   │   └── ExportReportDialog.tsx # Dialog pemilihan rentang & ekspor laporan ke Excel
│   ├── ui/                  # Komponen UI primitif shadcn/ui (48 komponen)
│   ├── BarcodeScanner.tsx   # Scanner barcode kamera dengan penanganan izin PWA
│   ├── CustomerPicker.tsx   # Pilihan pelanggan dalam transaksi kasir
│   ├── ProductPicker.tsx    # Pemilih produk (pencarian) untuk kasir & form stok
│   ├── SearchableSelect.tsx # Dropdown select dengan pencarian
│   ├── NumberInput.tsx      # Input angka dengan format ribuan/mata uang
│   ├── ErrorBoundary.tsx    # Penanganan error global komponen React
│   ├── RequireAuth.tsx      # Guard rute yang mewajibkan sesi login
│   ├── LockedPage.tsx       # Tampilan fallback saat rute tidak memiliki izin akses
│   ├── NavLink.tsx          # Tautan navigasi yang sadar hak akses (permission-aware)
│   ├── Receipt.tsx          # Render struk belanja, unduh gambar, share, & print Bluetooth
│   └── ThemeColorPicker.tsx # Picker warna aksen tema (10 pilihan warna)
├── pages/
│   ├── Dashboard.tsx        # Ringkasan statistik cepat, pintasan aksi, & peringatan stok menipis
│   ├── Cashier.tsx          # Halaman kasir utama (pemilihan item, keranjang, checkout)
│   ├── Customers.tsx        # Manajemen pelanggan (CRUD & riwayat transaksi)
│   ├── Expenses.tsx         # Manajemen pengeluaran bisnis (CRUD & filter)
│   ├── Products.tsx         # Manajemen produk & SKU produk
│   ├── Reports.tsx          # Laporan grafis penjualan, profit, dan omset + ekspor Excel
│   ├── TransactionHistory.tsx # Riwayat seluruh transaksi penjualan & cetak ulang struk
│   ├── Settings.tsx         # Pengaturan toko, satuan unit, kategori, metode bayar, & PWA
│   ├── Users.tsx            # Pengelolaan hak akses staff/kasir (khusus owner)
│   ├── Supplier.tsx         # CRUD manajemen supplier mitra
│   ├── StockIn.tsx          # Pencatatan barang masuk & hitung otomatis HPP
│   ├── StockOut.tsx         # Pencatatan mutasi barang keluar (rusak/hilang)
│   ├── StockReport.tsx      # Laporan log mutasi/aliran stok produk
│   ├── Login.tsx            # Halaman login staff/owner dengan PIN/Username
│   ├── Index.tsx            # Halaman fallback default (tidak terpasang di routing)
│   └── NotFound.tsx         # Halaman fallback 404
├── hooks/
│   ├── index.ts             # Re-export agregat seluruh hooks
│   ├── use-auth.tsx         # Context & hook autentikasi sesi user dan izin hak akses
│   ├── use-customers.ts     # Hook query/mutasi data pelanggan
│   ├── use-expenses.tsx     # Hook query/mutasi data pengeluaran operasional
│   ├── use-products.ts      # Hook query/mutasi katalog produk
│   ├── use-categories.ts    # Hook query/mutasi kategori produk
│   ├── use-units.ts         # Hook query/mutasi satuan unit
│   ├── use-payment-methods.ts # Hook query/mutasi metode pembayaran
│   ├── use-suppliers.ts     # Hook query/mutasi data supplier
│   ├── use-stock.ts         # Hook query/mutasi transaksi barang masuk & keluar
│   ├── use-transactions.ts  # Hook query/mutasi transaksi kasir
│   ├── use-users.ts         # Hook query/mutasi pengguna & hak akses staff
│   ├── use-dashboard.ts     # Hook agregasi statistik dashboard
│   ├── use-report.ts        # Hook query data laporan & analitik
│   ├── use-store-setting.ts # Hook query/mutasi pengaturan toko
│   ├── use-theme-color.ts   # Sinkronisasi warna aksen tema terpilih ke CSS
│   ├── use-pwa-install.ts   # Pendeteksi & pemicu prompt instalasi PWA
│   ├── use-mobile.tsx       # Deteksi ukuran layar perangkat bergerak
│   └── use-toast.ts         # Pemicu notifikasi pop-up (toast)
└── services/                # Layer integrasi API Client-Server untuk setiap resource
                             # (product, customer, transaction, stock, supplier,
                             #  category, unit, paymentMethod, expense, report,
                             #  dashboard, storeSetting, user)
```

---

## 💾 Integrasi Database & Sinkronisasi API

Aplikasi ini menggunakan database terpusat yang diakses melalui REST API server backend.

- **Otorisasi JWT**: Setelah login sukses, token JWT disimpan di `localStorage` klien. Token ini disisipkan secara otomatis dalam header `Authorization: Bearer <token>` pada setiap permintaan data ke backend melalui Axios interceptor.
- **Otomatis Keluar (Session Expiry)**: Jika backend merespons dengan status `401 Unauthorized` atau `403 Forbidden` (misal token kedaluwarsa atau akun dinonaktifkan oleh owner), interceptor klien akan otomatis menghapus token dari penyimpanan lokal dan mengarahkan pengguna kembali ke halaman `/login`.
- **HPP (Harga Pokok Penjualan - COGS)**: Perhitungan HPP dilakukan oleh server backend saat transaksi penerimaan barang masuk (Stock In) disubmit, menggunakan metode *Weighted Average*:
  $$\text{HPP Baru} = \frac{(\text{Stok Lama} \times \text{HPP Lama}) + (\text{Qty Baru} \times \text{Harga Beli})}{\text{Stok Lama} + \text{Qty Baru}}$$

---

## ☕ Dukungan dan Kontribusi

Jika Anda menemukan bug atau ingin berkontribusi dalam pengembangan aplikasi QasirKu:
1. Fork repository ini
2. Buat branch fitur baru (`git checkout -b feature/fitur-baru`)
3. Commit perubahan Anda (`git commit -m 'Menambahkan fitur baru'`)
4. Push ke branch tersebut (`git push origin feature/fitur-baru`)
5. Ajukan Pull Request

### Panduan Kontribusi
- Semua teks antarmuka pengguna (UI) menggunakan **Bahasa Indonesia** (target pengguna UMKM Indonesia).
- Gunakan komponen UI dasar yang tersedia di `src/components/ui/` berbasis `shadcn/ui`.
- Gunakan React Query hooks yang ada untuk setiap mutasi/query agar sinkron dengan state server.
- Pastikan hak akses staf dicek menggunakan helper `can()` dari context `useAuth` pada tombol/tindakan yang sensitif.

---

Built dengan ❤️ untuk kemajuan UMKM Indonesia.
