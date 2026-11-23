# Catatan Serah Terima Frontend Rasa Timur (SK-4)

Folder `public/` sudah siap untuk diintegrasikan dengan backend Express pada repositori `rasa-timur`.

## Daftar Berkas

- `public/index.html`: struktur halaman peta interaktif, kontrol filter jenis masakan, toggle MarkerCluster, legenda gradasi harga, dan tampilan status (loading, kosong, galat).
- `public/css/style.css`: tata letak responsif desktop, tablet (drawer kiri), dan ponsel (bottom sheet), warna berstandar kontras WCAG AA, gaya marker dan popup warung.
- `public/js/app.js`: inisialisasi peta Leaflet (OpenStreetMap), state terpusat `state`, fungsi `renderKuliner()`, klasifikasi warna harga 5 kelas + kategori harga kosong, serta pembacaan data GeoJSON.

## Cara Menjalankan Pratinjau Lokal (Tanpa Mengubah Backend)

Dari folder akar repositori, jalankan server statis sederhana:

```sh
python -m http.server 8080
```

Kemudian buka `http://127.0.0.1:8080/public/` pada browser.

Catatan perilaku pengambilan data di `public/js/app.js`:

1. Frontend terlebih dahulu meminta `GET /api/data/kuliner`.
2. Jika endpoint mengembalikan HTTP 404 (karena belum ditambahkan ke `server.js`), frontend otomatis memuat `../data/kuliner_east.geojson` untuk pratinjau lokal.
3. Jika endpoint mengembalikan status error server (misalnya HTTP 500) atau format GeoJSON tidak valid, tampilan galat akan muncul beserta tombol `Muat Ulang Data`.

## Kebutuhan Integrasi Backend untuk Frans (`server.js`)

Agar `npm start` menyajikan frontend dan data langsung dari server Express:

1. Tambahkan middleware statis sebelum route lain atau setelah konfigurasi dasar `app`:

```js
app.use(express.static(join(__dirname, 'public')));
```

2. Tambahkan endpoint `GET /api/data/kuliner` yang membaca `data/kuliner_east.geojson` dan mengembalikan GeoJSON `FeatureCollection` utuh dengan `Content-Type: application/json` dan `Cache-Control: no-store`. Jika berkas gagal dibaca atau tidak valid, kembalikan status HTTP 500 dengan JSON `{ error: '...' }` (konsisten dengan `GET /api/stats/jenis`).

## Hasil Pemeriksaan

Pengujian interaktif dilakukan melalui browser pada viewport desktop (`1280x800`), tablet (`768x1024`), dan ponsel (`375x812`) dengan hasil sebagai berikut (0 galat konsol dan 0 galat halaman):

- [x] Saat semua filter aktif, peta memuat 45 warung (`Menampilkan 45 dari 45 warung`).
- [x] Filter tunggal per kategori menghasilkan jumlah sesuai dataset: 4 kwetiau, 3 mi ayam, 2 bubur pedas, dan 36 lainnya.
- [x] Mematikan semua filter mengosongkan penanda (`0 dari 45`) dan memunculkan pesan status kosong beserta tombol `Aktifkan Semua Filter` untuk memulihkan semua titik.
- [x] MarkerCluster mengelompokkan penanda berdekatan dengan `L.divIcon` berwarna harga, memecah kluster saat zoom diperbesar, dan dapat dimatikan untuk menampilkan 45 `L.circleMarker` individual.
- [x] Warung tanpa harga (8 warung) tampil dengan warna netral `#6B7278` bergaris putus-putus dan label legenda `Harga belum tersedia`. Popup menampilkan nama, jenis masakan, harga per porsi, tahun berdiri (jika tersedia), dan catatan bahwa nilai halal berasal dari dataset dan belum diverifikasi.
- [x] Simulasi koneksi ke `GET /api/data/kuliner` (HTTP 200 dan simulasi galat HTTP 500) serta mode pratinjau lokal (`../data/kuliner_east.geojson` saat 404) berjalan sesuai rancangan. Integrasi penuh dengan `npm start` tinggal menambahkan `express.static` dan `GET /api/data/kuliner` di `server.js`.

