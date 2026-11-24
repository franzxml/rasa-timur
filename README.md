# Rasa Timur

Peta interaktif warung kuliner tradisional di Kecamatan Pontianak Timur. Gunakan filter jenis masakan dan legenda harga untuk menjelajahi peta, lalu klik penanda untuk melihat rincian warung.

## Cara menjalankan

Siapkan Git dan Node.js 18 atau lebih baru. Jalankan perintah berikut di terminal:

```sh
git clone https://github.com/franzxml/rasa-timur.git
cd rasa-timur
npm ci
npm start
```

Buka [http://127.0.0.1:3000](http://127.0.0.1:3000/) di browser. Data warung dibaca dari folder `data/` pada perangkatmu. Browser memerlukan koneksi internet untuk memuat pustaka peta, font, dan peta dasar.

Tekan `Ctrl+C` di terminal untuk menghentikan server.
