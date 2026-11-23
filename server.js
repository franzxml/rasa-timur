const express = require('express');
const { readFile } = require('node:fs/promises');
const { join } = require('node:path');

const app = express();
const dataWarung = join(__dirname, 'data', 'kuliner_east.geojson');
app.disable('x-powered-by');

app.get('/api/stats/jenis', async (_req, res) => {
  try {
    const data = JSON.parse(await readFile(dataWarung, 'utf8'));
    if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
      throw new Error('Data warung harus berupa GeoJSON FeatureCollection.');
    }

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

const port = Number(process.env.PORT ?? 3000);
const server = app.listen(port, '127.0.0.1');
server.once('listening', () => {
  console.log(`API peta kuliner tersedia di http://127.0.0.1:${server.address().port}`);
});
