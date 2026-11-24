const express = require('express');
const { randomUUID } = require('node:crypto');
const { readFile, rename, rm, writeFile } = require('node:fs/promises');
const { join } = require('node:path');

const app = express();
const dataWarung = join(__dirname, 'data', 'kuliner_east.geojson');
const dataKawasan = join(__dirname, 'data', 'kawasan_kuliner.geojson');
let antreanSimpanKawasan = Promise.resolve();
app.disable('x-powered-by');
app.use(express.static(join(__dirname, 'public')));
app.get('/favicon.ico', (_req, res) => res.status(204).end());

async function bacaKoleksiGeoJSON(berkas) {
  const data = JSON.parse(await readFile(berkas, 'utf8'));
  if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    throw new Error('Berkas harus berisi GeoJSON FeatureCollection.');
  }
  return data;
}

function koordinatValid(titik) {
  return Array.isArray(titik) && titik.length === 2 && titik.every(Number.isFinite)
    && Math.abs(titik[0]) <= 180 && Math.abs(titik[1]) <= 90;
}

function cincinValid(cincin) {
  if (!Array.isArray(cincin) || cincin.length < 4 || !cincin.every(koordinatValid)) {
    return false;
  }
  const [xAwal, yAwal] = cincin[0];
  const [xAkhir, yAkhir] = cincin.at(-1);
  if (xAwal !== xAkhir || yAwal !== yAkhir) return false;

  let duaKaliLuas = 0;
  for (let i = 1; i < cincin.length; i += 1) {
    const [x1, y1] = cincin[i - 1];
    const [x2, y2] = cincin[i];
    duaKaliLuas += (x1 - xAwal) * (y2 - yAwal) - (x2 - xAwal) * (y1 - yAwal);
  }
  return duaKaliLuas !== 0;
}

async function simpanKawasan(feature) {
  const koleksi = await bacaKoleksiGeoJSON(dataKawasan);
  const idTerakhir = koleksi.features.reduce((terbesar, kawasan) => {
    const id = kawasan?.properties?.id;
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('ID kawasan yang tersimpan tidak valid.');
    return Math.max(terbesar, id);
  }, 0);
  const id = idTerakhir + 1;
  if (!Number.isSafeInteger(id)) throw new Error('ID kawasan sudah mencapai batas.');

  const fiturBaru = { ...feature, properties: { id, ...feature.properties } };
  koleksi.features.push(fiturBaru);

  const sementara = `${dataKawasan}.${randomUUID()}.tmp`;
  try {
    await writeFile(sementara, `${JSON.stringify(koleksi, null, 2)}\n`, { flag: 'wx' });
    await rename(sementara, dataKawasan);
  } catch (error) {
    await rm(sementara, { force: true }).catch(() => {});
    throw error;
  }

  return { feature: fiturBaru, total: koleksi.features.length };
}

app.get('/api/data/kuliner', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    res.json(await bacaKoleksiGeoJSON(dataWarung));
  } catch (error) {
    console.error('Gagal memuat data warung:', error.message);
    res.status(500).json({ error: 'Data warung tidak tersedia. Periksa berkas GeoJSON.' });
  }
});

app.get('/api/stats/jenis', async (_req, res) => {
  try {
    const data = await bacaKoleksiGeoJSON(dataWarung);
    const jumlah = { kwetiau: 0, mi_ayam: 0, bubur_pedas: 0, lainnya: 0 };
    for (const [index, feature] of data.features.entries()) {
      const jenis = feature?.properties?.jenis_masakan;
      if (typeof jenis !== 'string' || !Object.hasOwn(jumlah, jenis)) {
        throw new Error(`Jenis masakan pada fitur ${index + 1} tidak valid.`);
      }
      jumlah[jenis] += 1;
    }

    res.set('Cache-Control', 'no-store').json(jumlah);
  } catch (error) {
    console.error('Gagal menghitung statistik jenis warung:', error.message);
    res.status(500).json({ error: 'Statistik warung tidak tersedia. Periksa berkas data.' });
  }
});

app.post('/api/feature/kawasan', express.json({ limit: '100kb' }), async (req, res) => {
  const feature = req.body?.feature;
  const geometry = feature?.geometry;
  if (feature?.type !== 'Feature' || geometry?.type !== 'Polygon'
      || !Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0
      || !geometry.coordinates.every(cincinValid)) {
    return res.status(400).json({
      error: 'Kirim feature dengan geometri Polygon tertutup dan koordinat [bujur, lintang] yang valid.'
    });
  }

  const { nama_kawasan, jumlah_warung, tipe_zona } = feature.properties ?? {};
  if (typeof nama_kawasan !== 'string' || !nama_kawasan.trim()
      || typeof tipe_zona !== 'string' || !tipe_zona.trim()
      || !Number.isSafeInteger(jumlah_warung) || jumlah_warung < 0) {
    return res.status(400).json({
      error: 'Isi nama_kawasan dan tipe_zona serta jumlah_warung sebagai bilangan bulat nonnegatif.'
    });
  }

  const dataBaru = {
    type: 'Feature',
    properties: {
      nama_kawasan: nama_kawasan.trim(),
      jumlah_warung,
      tipe_zona: tipe_zona.trim()
    },
    geometry: { type: 'Polygon', coordinates: geometry.coordinates }
  };
  const operasiSimpan = antreanSimpanKawasan.then(() => simpanKawasan(dataBaru));
  antreanSimpanKawasan = operasiSimpan.catch(() => {});

  try {
    res.status(201).json(await operasiSimpan);
  } catch (error) {
    console.error('Gagal menyimpan kawasan kuliner:', error.message);
    res.status(500).json({ error: 'Kawasan tidak dapat disimpan. Periksa berkas data.' });
  }
});

app.use((error, _req, res, next) => {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON permintaan tidak valid.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Ukuran permintaan melebihi 100 KB.' });
  }
  next(error);
});

const port = Number(process.env.PORT ?? 3000);
const server = app.listen(port, '127.0.0.1');
server.once('listening', () => {
  console.log(`API peta kuliner tersedia di http://127.0.0.1:${server.address().port}`);
});
