const API_DATA_URL = '/api/data/kuliner';
const FALLBACK_GEOJSON_URL = '../data/kuliner_east.geojson';
const PONTIANAK_TIMUR_CENTER = [-0.0418, 109.3656];
const DEFAULT_ZOOM = 14;

const CATEGORY_META = {
  kwetiau: { label: 'Kwetiau' },
  mi_ayam: { label: 'Mi Ayam' },
  bubur_pedas: { label: 'Bubur Pedas' },
  lainnya: { label: 'Lainnya' },
};

const PRICE_TIERS = [
  {
    id: 'tier-1',
    label: 'Sampai Rp 14.000',
    fill: '#F2C94C',
    stroke: '#6B4F00',
    matches: (harga) => harga <= 14000,
  },
  {
    id: 'tier-2',
    label: 'Rp 14.001 - Rp 17.000',
    fill: '#EB9834',
    stroke: '#6E3E00',
    matches: (harga) => harga > 14000 && harga <= 17000,
  },
  {
    id: 'tier-3',
    label: 'Rp 17.001 - Rp 22.000',
    fill: '#DE6226',
    stroke: '#5E2207',
    matches: (harga) => harga > 17000 && harga <= 22000,
  },
  {
    id: 'tier-4',
    label: 'Rp 22.001 - Rp 25.000',
    fill: '#B83227',
    stroke: '#4A110C',
    matches: (harga) => harga > 22000 && harga <= 25000,
  },
  {
    id: 'tier-5',
    label: 'Di atas Rp 25.000',
    fill: '#6E1423',
    stroke: '#2E060D',
    matches: (harga) => harga > 25000,
  },
];

const UNKNOWN_PRICE_TIER = {
  id: 'tier-unknown',
  label: 'Harga belum tersedia',
  fill: '#6B7278',
  stroke: '#3A4147',
  isUnknown: true,
};

const state = {
  filters: {
    kwetiau: true,
    mi_ayam: true,
    bubur_pedas: true,
    lainnya: true,
  },
  cluster: true,
  status: 'loading',
  errorMessage: '',
  dataSource: null,
  allFeatures: [],
};

const rupiahsFormatter = new Intl.NumberFormat('id-ID');

const elements = {
  appShell: document.getElementById('app-shell'),
  controlPanel: document.getElementById('control-panel'),
  panelBackdrop: document.getElementById('panel-backdrop'),
  openPanelBtn: document.getElementById('open-panel-btn'),
  closePanelBtn: document.getElementById('close-panel-btn'),
  desktopToggleBtn: document.getElementById('desktop-toggle-btn'),
  visibleCount: document.getElementById('visible-count'),
  mobileCount: document.getElementById('mobile-count'),
  resetViewBtn: document.getElementById('reset-view-btn'),
  selectAllBtn: document.getElementById('select-all-btn'),
  clearAllBtn: document.getElementById('clear-all-btn'),
  emptyResetBtn: document.getElementById('empty-reset-btn'),
  retryLoadBtn: document.getElementById('retry-load-btn'),
  clusterToggle: document.getElementById('toggle-cluster'),
  clusterModeNote: document.getElementById('cluster-mode-note'),
  priceLegend: document.getElementById('price-legend'),
  dataSourceNote: document.getElementById('data-source-note'),
  stateLoading: document.getElementById('state-loading'),
  stateEmpty: document.getElementById('state-empty'),
  stateError: document.getElementById('state-error'),
  errorDetail: document.getElementById('error-detail'),
  filterInputs: Array.from(document.querySelectorAll('input[data-filter]')),
};

let map = null;
let activeLayer = null;
let dataBounds = null;

function initMap() {
  if (typeof L === 'undefined') {
    throw new Error('Pustaka Leaflet tidak berhasil dimuat. Periksa koneksi atau skrip CDN.');
  }

  map = L.map('map', {
    center: PONTIANAK_TIMUR_CENTER,
    zoom: DEFAULT_ZOOM,
    zoomControl: false,
  });

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; Kontributor OpenStreetMap',
  }).addTo(map);
}

function getPriceTier(hargaPorsi) {
  if (typeof hargaPorsi !== 'number' || !Number.isFinite(hargaPorsi) || hargaPorsi <= 0) {
    return UNKNOWN_PRICE_TIER;
  }

  return PRICE_TIERS.find((tier) => tier.matches(hargaPorsi)) || UNKNOWN_PRICE_TIER;
}

function formatRupiah(hargaPorsi) {
  if (typeof hargaPorsi !== 'number' || !Number.isFinite(hargaPorsi) || hargaPorsi <= 0) {
    return UNKNOWN_PRICE_TIER.label;
  }

  return `Rp ${rupiahsFormatter.format(hargaPorsi)}`;
}

function createPriceDivIcon(hargaPorsi) {
  const tier = getPriceTier(hargaPorsi);
  const dot = document.createElement('span');
  dot.className = tier.isUnknown ? 'warung-dot warung-dot--unknown' : 'warung-dot';
  dot.style.backgroundColor = tier.fill;
  dot.style.borderColor = tier.stroke;

  return L.divIcon({
    className: 'warung-div-icon',
    html: dot.outerHTML,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

function createCircleMarker(feature, latlng) {
  const tier = getPriceTier(feature?.properties?.harga_porsi);
  return L.circleMarker(latlng, {
    radius: 8,
    fillColor: tier.fill,
    color: tier.stroke,
    weight: 2,
    opacity: 1,
    fillOpacity: 0.92,
    dashArray: tier.isUnknown ? '3 2' : null,
  });
}

function createClusterIcon(cluster) {
  const count = cluster.getChildCount();
  const isLarge = count >= 10;
  const size = isLarge ? 42 : 36;

  return L.divIcon({
    className: 'warung-cluster-icon',
    html: `<span class="warung-cluster ${isLarge ? 'warung-cluster--large' : ''}">${count}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function appendPopupRow(listElement, labelText, valueNodeOrText) {
  const row = document.createElement('div');
  row.className = 'warung-popup-row';

  const dt = document.createElement('dt');
  dt.textContent = labelText;

  const dd = document.createElement('dd');
  if (typeof valueNodeOrText === 'string') {
    dd.textContent = valueNodeOrText;
  } else {
    dd.appendChild(valueNodeOrText);
  }

  row.append(dt, dd);
  listElement.appendChild(row);
}

function buildPopupContent(feature) {
  const props = feature?.properties || {};
  const tier = getPriceTier(props.harga_porsi);
  const categoryInfo = CATEGORY_META[props.jenis_masakan] || { label: props.jenis_masakan || 'Lainnya' };

  const container = document.createElement('article');
  container.className = 'warung-popup';

  const categoryEl = document.createElement('p');
  categoryEl.className = 'warung-popup-category';
  categoryEl.textContent = categoryInfo.label;

  const titleEl = document.createElement('h3');
  titleEl.className = 'warung-popup-title';
  titleEl.textContent = props.nama || 'Warung tanpa nama';

  const dl = document.createElement('dl');
  dl.className = 'warung-popup-list';

  const priceValue = document.createElement('span');
  priceValue.className = 'popup-price-value';
  const swatch = document.createElement('span');
  swatch.className = tier.isUnknown ? 'popup-swatch popup-swatch--unknown' : 'popup-swatch';
  swatch.style.backgroundColor = tier.fill;
  swatch.style.borderColor = tier.stroke;
  swatch.setAttribute('aria-hidden', 'true');

  const priceText = document.createElement('span');
  priceText.textContent = formatRupiah(props.harga_porsi);
  priceValue.append(swatch, priceText);
  appendPopupRow(dl, 'Harga per porsi', priceValue);

  if (typeof props.tahun_berdiri === 'number' && Number.isFinite(props.tahun_berdiri)) {
    const usiaText =
      typeof props.usia_warung === 'number' && Number.isFinite(props.usia_warung)
        ? `${props.tahun_berdiri} (${props.usia_warung} tahun)`
        : String(props.tahun_berdiri);
    appendPopupRow(dl, 'Tahun berdiri', usiaText);
  }

  if (typeof props.halal === 'string' && props.halal.trim() !== '') {
    appendPopupRow(dl, 'Status halal', `Tercatat: ${props.halal}`);
  }

  const coords = feature?.geometry?.coordinates;
  if (Array.isArray(coords) && coords.length >= 2) {
    appendPopupRow(dl, 'Koordinat', `${Number(coords[1]).toFixed(5)}, ${Number(coords[0]).toFixed(5)}`);
  }

  container.append(categoryEl, titleEl, dl);

  if (typeof props.halal === 'string' && props.halal.trim() !== '') {
    const noteEl = document.createElement('p');
    noteEl.className = 'warung-popup-note';
    noteEl.textContent = 'Nilai halal tercatat pada dataset dan belum diverifikasi secara independen.';
    container.appendChild(noteEl);
  }

  return container;
}

function bindFeatureInteractions(feature, layer) {
  layer.bindPopup(() => buildPopupContent(feature), {
    maxWidth: 300,
    closeButton: true,
  });
}

function updateCategoryCounts() {
  const counts = { kwetiau: 0, mi_ayam: 0, bubur_pedas: 0, lainnya: 0 };

  for (const feature of state.allFeatures) {
    const jenis = feature?.properties?.jenis_masakan;
    if (Object.hasOwn(counts, jenis)) {
      counts[jenis] += 1;
    }
  }

  for (const [key, value] of Object.entries(counts)) {
    const el = document.getElementById(`count-${key}`);
    if (el) {
      el.textContent = String(value);
    }
  }
}

function renderLegend() {
  const countsByTier = new Map();
  for (const tier of PRICE_TIERS) {
    countsByTier.set(tier.id, 0);
  }
  countsByTier.set(UNKNOWN_PRICE_TIER.id, 0);

  for (const feature of state.allFeatures) {
    const tier = getPriceTier(feature?.properties?.harga_porsi);
    countsByTier.set(tier.id, (countsByTier.get(tier.id) || 0) + 1);
  }

  elements.priceLegend.innerHTML = '';

  for (const tier of [...PRICE_TIERS, UNKNOWN_PRICE_TIER]) {
    const item = document.createElement('li');
    item.className = 'legend-item';

    const swatch = document.createElement('span');
    swatch.className = tier.isUnknown ? 'legend-swatch legend-swatch--unknown' : 'legend-swatch';
    swatch.style.backgroundColor = tier.fill;
    swatch.style.borderColor = tier.stroke;
    swatch.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.className = 'legend-text';
    text.textContent = tier.label;

    const count = document.createElement('span');
    count.className = 'legend-count';
    count.textContent = `${countsByTier.get(tier.id) || 0} warung`;

    item.append(swatch, text, count);
    elements.priceLegend.appendChild(item);
  }
}

function updateClusterNote() {
  elements.clusterModeNote.textContent = state.cluster
    ? 'Aktif: penanda berdekatan dikelompokkan otomatis dan memakai L.divIcon berwarna harga.'
    : 'Nonaktif: setiap warung tampil terpisah memakai L.circleMarker berwarna harga.';
}

function updateStatusOverlays() {
  elements.stateLoading.hidden = state.status !== 'loading';
  elements.stateError.hidden = state.status !== 'error';

  if (state.status === 'error') {
    elements.errorDetail.textContent = state.errorMessage;
    elements.stateEmpty.hidden = true;
  }
}

function renderKuliner() {
  if (!map) {
    return;
  }

  if (activeLayer) {
    map.removeLayer(activeLayer);
    activeLayer = null;
  }

  if (state.status !== 'ready') {
    elements.stateEmpty.hidden = true;
    return;
  }

  const filteredFeatures = state.allFeatures.filter((feature) => {
    const jenis = feature?.properties?.jenis_masakan;
    return Boolean(state.filters[jenis]);
  });

  const total = state.allFeatures.length;
  const shown = filteredFeatures.length;
  elements.visibleCount.textContent = `Menampilkan ${shown} dari ${total} warung`;
  elements.mobileCount.textContent = `${shown}/${total} warung`;

  if (shown === 0) {
    elements.stateEmpty.hidden = false;
    return;
  }

  elements.stateEmpty.hidden = true;

  const filteredCollection = {
    type: 'FeatureCollection',
    features: filteredFeatures,
  };

  if (state.cluster && typeof L.markerClusterGroup === 'function') {
    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 48,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: createClusterIcon,
    });

    const pointsLayer = L.geoJSON(filteredCollection, {
      pointToLayer: (feature, latlng) =>
        L.marker(latlng, {
          icon: createPriceDivIcon(feature?.properties?.harga_porsi),
          alt: feature?.properties?.nama || 'Warung kuliner',
        }),
      onEachFeature: bindFeatureInteractions,
    });

    clusterGroup.addLayer(pointsLayer);
    clusterGroup.addTo(map);
    activeLayer = clusterGroup;
    return;
  }

  const circleLayer = L.geoJSON(filteredCollection, {
    pointToLayer: createCircleMarker,
    onEachFeature: bindFeatureInteractions,
  });

  circleLayer.addTo(map);
  activeLayer = circleLayer;
}

function validateGeoJson(payload) {
  if (!payload || payload.type !== 'FeatureCollection' || !Array.isArray(payload.features)) {
    throw new Error('Format data harus berupa GeoJSON FeatureCollection yang valid.');
  }

  const validFeatures = payload.features.filter((feature) => {
    const coords = feature?.geometry?.coordinates;
    return (
      feature?.type === 'Feature' &&
      feature?.geometry?.type === 'Point' &&
      Array.isArray(coords) &&
      coords.length >= 2 &&
      Number.isFinite(Number(coords[0])) &&
      Number.isFinite(Number(coords[1]))
    );
  });

  if (validFeatures.length === 0) {
    throw new Error('Dataset GeoJSON tidak memiliki titik koordinat warung yang valid.');
  }

  return validFeatures;
}

async function fetchKulinerPayload() {
  const apiResponse = await fetch(API_DATA_URL, { cache: 'no-store' });

  if (apiResponse.ok) {
    return {
      source: 'api',
      payload: await apiResponse.json(),
    };
  }

  // Fallback hanya saat endpoint API Frans belum tersedia (404), bukan saat server error (5xx).
  if (apiResponse.status === 404) {
    const fallbackResponse = await fetch(FALLBACK_GEOJSON_URL, { cache: 'no-store' });
    if (fallbackResponse.ok) {
      return {
        source: 'fallback',
        payload: await fallbackResponse.json(),
      };
    }
    throw new Error(
      `Endpoint ${API_DATA_URL} belum tersedia (404) dan pratinjau lokal gagal dimuat (HTTP ${fallbackResponse.status}).`
    );
  }

  throw new Error(`Server API mengembalikan status HTTP ${apiResponse.status}.`);
}

function fitToDataBounds() {
  if (!map) {
    return;
  }

  if (dataBounds && dataBounds.isValid()) {
    map.fitBounds(dataBounds, { padding: [32, 32], maxZoom: 15 });
    return;
  }

  map.setView(PONTIANAK_TIMUR_CENTER, DEFAULT_ZOOM);
}

async function loadData() {
  state.status = 'loading';
  state.errorMessage = '';
  elements.visibleCount.textContent = 'Memuat data...';
  elements.mobileCount.textContent = 'Memuat...';
  updateStatusOverlays();
  renderKuliner();

  try {
    const { source, payload } = await fetchKulinerPayload();
    const features = validateGeoJson(payload);

    state.allFeatures = features;
    state.dataSource = source;
    state.status = 'ready';

    const latLngs = features.map((f) => [f.geometry.coordinates[1], f.geometry.coordinates[0]]);
    dataBounds = L.latLngBounds(latLngs);

    elements.dataSourceNote.textContent =
      source === 'api'
        ? `Sumber aktif: API ${API_DATA_URL}`
        : 'Sumber pratinjau lokal: data/kuliner_east.geojson';

    updateCategoryCounts();
    renderLegend();
    updateStatusOverlays();
    renderKuliner();
    fitToDataBounds();
  } catch (error) {
    state.status = 'error';
    state.errorMessage = error instanceof Error ? error.message : 'Gagal memuat data GeoJSON.';
    elements.visibleCount.textContent = 'Gagal memuat data';
    elements.mobileCount.textContent = 'Gagal';
    elements.dataSourceNote.textContent = 'Sumber data tidak dapat diakses.';
    updateStatusOverlays();
    renderKuliner();
  }
}

function setAllFilters(active) {
  for (const key of Object.keys(state.filters)) {
    state.filters[key] = active;
  }

  for (const input of elements.filterInputs) {
    input.checked = active;
  }

  renderKuliner();
}

function setDrawerOpen(open) {
  elements.controlPanel.classList.toggle('is-open', open);
  elements.panelBackdrop.hidden = !open;
  elements.openPanelBtn.setAttribute('aria-expanded', String(open));

  if (open) {
    elements.closePanelBtn.focus();
  } else if (window.innerWidth < 1024) {
    elements.openPanelBtn.focus();
  }
}

function bindEvents() {
  for (const input of elements.filterInputs) {
    input.addEventListener('change', () => {
      const key = input.dataset.filter;
      if (key && Object.hasOwn(state.filters, key)) {
        state.filters[key] = input.checked;
        renderKuliner();
      }
    });
  }

  elements.selectAllBtn.addEventListener('click', () => setAllFilters(true));
  elements.clearAllBtn.addEventListener('click', () => setAllFilters(false));
  elements.emptyResetBtn.addEventListener('click', () => setAllFilters(true));
  elements.resetViewBtn.addEventListener('click', fitToDataBounds);
  elements.retryLoadBtn.addEventListener('click', loadData);

  elements.clusterToggle.addEventListener('change', () => {
    state.cluster = elements.clusterToggle.checked;
    updateClusterNote();
    renderKuliner();
  });

  elements.desktopToggleBtn.addEventListener('click', () => {
    const collapsed = elements.appShell.classList.toggle('panel-collapsed');
    elements.desktopToggleBtn.setAttribute('aria-expanded', String(!collapsed));
    elements.desktopToggleBtn.textContent = collapsed ? 'Tampilkan Panel' : 'Sembunyikan Panel';

    if (map) {
      window.requestAnimationFrame(() => map.invalidateSize());
    }
  });

  elements.openPanelBtn.addEventListener('click', () => setDrawerOpen(true));
  elements.closePanelBtn.addEventListener('click', () => setDrawerOpen(false));
  elements.panelBackdrop.addEventListener('click', () => setDrawerOpen(false));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && elements.controlPanel.classList.contains('is-open')) {
      setDrawerOpen(false);
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024 && elements.controlPanel.classList.contains('is-open')) {
      elements.controlPanel.classList.remove('is-open');
      elements.panelBackdrop.hidden = true;
      elements.openPanelBtn.setAttribute('aria-expanded', 'false');
    }

    if (map) {
      map.invalidateSize();
    }
  });
}

function bootstrap() {
  try {
    initMap();
    updateClusterNote();
    bindEvents();
    loadData();
  } catch (error) {
    state.status = 'error';
    state.errorMessage = error instanceof Error ? error.message : 'Peta gagal diinisialisasi.';
    updateStatusOverlays();
  }
}

document.addEventListener('DOMContentLoaded', bootstrap);
