# API Peta Kuliner Pontianak Timur

Dari folder proyek, jalankan:

```sh
npm ci
npm start
```

Buka [statistik jenis masakan](http://127.0.0.1:3000/api/stats/jenis). Server berjalan lokal dan membaca salinan `data/kuliner_east.geojson` dari Paundra. Setiap permintaan menghitung ulang jumlah warung dari `properties.jenis_masakan`.

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
