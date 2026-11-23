# Tugas Nabil — Frontend Rasa Timur (SK-4)

Bangun peta web Leaflet untuk melihat sebaran 45 warung kuliner tradisional di Kecamatan Pontianak Timur. Pengguna bisa menyaring jenis masakan, membedakan harga per porsi dari warna penanda, dan membuka rincian satu warung.

## Urutan pengerjaan

1. Buat `public/index.html`, `public/css/style.css`, dan `public/js/app.js`. Pusatkan peta pada titik warung di Pontianak Timur. Tambahkan legenda harga dan kontrol untuk empat jenis masakan.
2. Gunakan [GeoJSON warung](data/kuliner_east.geojson) untuk menyiapkan tampilan awal. Setelah Frans menyiapkan `GET /api/data/kuliner`, ambil titik dari endpoint itu. `GET /api/stats/jenis` sudah bisa dijalankan dengan [panduan server](Panduan%20Menjalankan.md). Jika perlu mencoba tampilan sebelum kedua bagian terhubung, buat salinan GeoJSON sementara untuk server frontend lokal.
3. Buat satu objek status dengan filter `kwetiau`, `mi_ayam`, `bubur_pedas`, dan `lainnya`, semuanya aktif saat peta dibuka. Hubungkan setiap kotak centang ke fungsi `renderKuliner()` supaya tampilan mengikuti pilihan pengguna.
4. Gunakan gradasi warna dari `harga_porsi` dan tampilkan keterangannya di legenda. Beri harga kosong warna netral berlabel “Harga belum tersedia”. Gunakan `L.circleMarker` untuk penanda biasa dan `L.divIcon` berwarna harga saat penanda masuk ke MarkerCluster.
5. Tambahkan popup saat penanda diklik. Tampilkan nama, jenis masakan, harga per porsi, dan tahun berdiri jika tersedia. Jika menampilkan status halal, jelaskan bahwa nilainya tercatat pada dataset dan belum diverifikasi. Tampilkan pesan yang bisa dipahami ketika pemuatan data gagal atau filter tidak menyisakan titik.

## Cek sebelum serah terima

- [ ] Saat semua filter aktif, peta memuat 45 warung.
- [ ] Jika hanya satu kategori aktif, jumlahnya sesuai data: 4 kwetiau, 3 mi ayam, 2 bubur pedas, dan 36 lainnya.
- [ ] Mematikan semua filter mengosongkan penanda. Mengaktifkan filter lagi memulihkan hasil yang sesuai.
- [ ] Pengelompokan penanda berubah sesuai zoom dan tetap mengikuti filter. Klik penanda individual untuk membuka popup.
- [ ] Warung tanpa harga punya tampilan tersendiri. Warna penanda dan isi legenda konsisten.
- [ ] Setelah dihubungkan ke server Frans, peta memuat titik dari API dan bisa dijalankan dari salinan repositori yang baru.

Serahkan folder `public/` beserta catatan singkat cara menjalankan dan hasil pemeriksaan. Beri tahu Frans jika ada kebutuhan pada respons API sebelum integrasi.
