# Rasa Timur — Peta Kuliner Pontianak Timur

Dari folder proyek, jalankan:

```sh
npm ci
npm start
```

Buka [peta Rasa Timur](http://127.0.0.1:3000/). Express menyajikan halaman peta beserta API dari alamat yang sama. Peta memuat 45 titik dari [endpoint data kuliner](http://127.0.0.1:3000/api/data/kuliner), yang membaca salinan `data/kuliner_east.geojson` dari Paundra.

Halaman peta memerlukan koneksi internet untuk memuat Leaflet, MarkerCluster, font, dan peta dasar yang digunakan frontend. Data warung dan server Express berada di perangkat lokal.

[Endpoint statistik jenis masakan](http://127.0.0.1:3000/api/stats/jenis) menghitung ulang jumlah warung dari `properties.jenis_masakan` setiap kali diminta.

Respons untuk data tanggal 23 November 2026:

```json
{
  "kwetiau": 4,
  "mi_ayam": 3,
  "bubur_pedas": 2,
  "lainnya": 36
}
```

Kategori yang belum memiliki titik tetap muncul dengan nilai nol. Jika berkas data tidak bisa dibaca atau memuat kategori yang tidak dikenal, API mengembalikan status HTTP 500.

## Menambah kawasan kuliner

Kirim `POST /api/feature/kawasan` dengan `Content-Type: application/json`. Isi permintaan memuat satu GeoJSON Feature di dalam `feature`.

```json
{
  "feature": {
    "type": "Feature",
    "properties": {
      "nama_kawasan": "Kawasan Contoh",
      "jumlah_warung": 3,
      "tipe_zona": "Sentra Kuliner Tradisional"
    },
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[109.357, -0.036], [109.358, -0.036], [109.358, -0.035], [109.357, -0.035], [109.357, -0.036]]]
    }
  }
}
```

Koordinat memakai urutan `[bujur, lintang]`. Titik awal dan akhir setiap cincin poligon harus sama. `jumlah_warung` diisi sebagai bilangan bulat nonnegatif berdasarkan data kawasan yang dipakai.

Jika berhasil, server menyimpan fitur dengan ID baru ke `data/kawasan_kuliner.geojson` dan mengembalikan HTTP 201 dengan `feature` yang tersimpan dan `total` kawasan. Permintaan yang tidak valid menghasilkan HTTP 400. Kegagalan membaca atau menyimpan berkas menghasilkan HTTP 500. Gunakan salinan proyek jika ingin mencoba contoh tanpa menambah kawasan ke data kerja.
