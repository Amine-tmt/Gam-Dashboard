/**
 * map.js
 * Handles the Leaflet strategic map:
 * - 8 data layers with live switching
 * - Filters (wilaya, score, population, toggles)
 * - Popup on click + scorecard panel
 */

window.mapInstance = null;
let mapMarkers  = [];
let currentLayer = 'score';
let sidebarOpen  = true;
window.plannerMap = null;

// ─── Colour helpers ──────────────────────────────────
function scoreColor(s) {
  if (s >= 80) return '#d4a017';
  if (s >= 60) return '#2e7d4f';
  if (s >= 40) return '#4caf50';
  if (s >= 20) return '#81c784';
  return '#c8e6c9';
}
function scoreBg(s) {
  if (s >= 80) return '#fef9e7';
  if (s >= 60) return '#e8f5e9';
  if (s >= 40) return '#f1f8e9';
  return '#f9fbe7';
}

// ─── Exposed globally for other modules ──────────────
window.scoreColor = scoreColor;
window.scoreBg    = scoreBg;

// ─── Formatting ──────────────────────────────────────
function fmtNum(n) { return n == null ? '—' : Number(n).toLocaleString('fr'); }
function fmtDA(n) {
  if (!n) return '—';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' Mrd DA';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' M DA';
  return fmtNum(n) + ' DA';
}
function fmtScore(s) { return Number(s).toFixed(1); }

window.fmtNum   = fmtNum;
window.fmtDA    = fmtDA;
window.fmtScore = fmtScore;

// ─── Map initialisation ──────────────────────────────
function initMap() {
  window.mapInstance = L.map('map', { zoomControl: true, center: [28.5, 2.5], zoom: 5 });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 18
  }).addTo(window.mapInstance);

  renderMarkers();
}

// ─── Marker style per layer ──────────────────────────
function getMarkerStyle(d, layer) {
  let color = '#4caf50', size = 6;
  switch (layer) {
    case 'score':
      color = scoreColor(d.Score_IA_Predictif);
      size  = 4 + d.Score_IA_Predictif / 14;
      break;
    case 'population':
      color = '#1976d2';
      size  = 4 + Math.min(d.Pop_2026 / 30000, 13);
      break;
    case 'revenue': {
      const maxRev = Math.max(...DATA.map(x => x.Chiffre_Affaires_Potentiel_DA));
      color = '#d4a017';
      size  = 4 + (d.Chiffre_Affaires_Potentiel_DA / maxRev) * 15;
      break;
    }
    case 'competitors': {
      const c = d.Nb_Agences_Concurrents_Total;
      color = c === 0 ? '#2e7d4f' : c <= 3 ? '#d4a017' : '#e53935';
      size  = 5;
      break;
    }
    case 'industrial':
      color = d.Nb_Zones_Industrielles > 0 ? '#e65100' : '#c8e6c9';
      size  = d.Nb_Zones_Industrielles > 0 ? 7 : 4;
      break;
    case 'seismic': {
      const s = d.Zone_Sismique;
      color = s >= 3 ? '#e53935' : s >= 2 ? '#d4a017' : '#2e7d4f';
      size  = 5;
      break;
    }
    case 'gam':
      color = d.Has_GAM ? '#2e7d4f' : '#e53935';
      size  = 5;
      break;
    case 'deficit': {
      const def = d.Deficit_Agences;
      color = def > 5 ? '#d4a017' : def > 0 ? '#4caf50' : '#c8e6c9';
      size  = 4 + Math.min(def / 2, 9);
      break;
    }
  }
  return { color, size };
}

// ─── Filter logic ─────────────────────────────────────
function getFilteredData() {
  const wil      = document.getElementById('f-wilaya').value;
  const minScore = +document.getElementById('f-score').value;
  const minPop   = +document.getElementById('f-pop').value;
  const noGam    = document.getElementById('f-nogam').checked;
  const indus    = document.getElementById('f-industrial').checked;
  const seis     = document.getElementById('f-seismic').checked;
  const comp     = document.getElementById('f-comp').value;

  return DATA.filter(d => {
    if (wil  && d.Wilaya !== wil)               return false;
    if (d.Score_IA_Predictif < minScore)         return false;
    if (d.Pop_2026 < minPop)                     return false;
    if (noGam  && d.Has_GAM)                     return false;
    if (indus  && d.Nb_Zones_Industrielles < 1)  return false;
    if (seis   && d.Zone_Sismique < 3)           return false;
    if (comp === '0'   && d.Nb_Agences_Concurrents_Total !== 0)         return false;
    if (comp === '1-3' && (d.Nb_Agences_Concurrents_Total < 1 || d.Nb_Agences_Concurrents_Total > 3)) return false;
    if (comp === '4+'  && d.Nb_Agences_Concurrents_Total < 4)           return false;
    return true;
  });
}

// ─── Render markers ───────────────────────────────────
function renderMarkers() {
  mapMarkers.forEach(m => window.mapInstance.removeLayer(m));
  mapMarkers = [];

  const filtered = getFilteredData();
  document.getElementById('map-count').textContent = filtered.length + ' / ' + DATA.length;

  filtered.forEach(d => {
    if (!d.Lat_Commune || !d.Lon_Commune) return;
    const { color, size } = getMarkerStyle(d, currentLayer);
    const m = L.circleMarker([d.Lat_Commune, d.Lon_Commune], {
      radius: size,
      fillColor: color,
      color: '#fff',
      weight: 0.8,
      fillOpacity: 0.85
    });
    m.bindPopup(buildPopupHTML(d), { maxWidth: 270 });
    mapMarkers.push(m);
    m.addTo(window.mapInstance);
  });

  updateLegend();
}

// ─── Popup HTML ───────────────────────────────────────
function buildPopupHTML(d) {
  return `
    <div class="popup-commune">${d.Commune}</div>
    <div class="popup-wilaya">${d.Wilaya} · ${d.Statut || 'Commune'}</div>
    <div class="popup-row"><span class="popup-label">Score IA</span><span class="popup-val" style="color:${scoreColor(d.Score_IA_Predictif)}">${fmtScore(d.Score_IA_Predictif)}/100</span></div>
    <div class="popup-row"><span class="popup-label">Probabilité succès</span><span class="popup-val">${fmtScore(d['Probabilite_Succes_%'])}%</span></div>
    <div class="popup-row"><span class="popup-label">CA Potentiel</span><span class="popup-val">${fmtDA(d.Chiffre_Affaires_Potentiel_DA)}</span></div>
    <div class="popup-row"><span class="popup-label">Population 2026</span><span class="popup-val">${fmtNum(d.Pop_2026)}</span></div>
    <div class="popup-row"><span class="popup-label">Concurrents</span><span class="popup-val">${d.Nb_Agences_Concurrents_Total}</span></div>
    <div class="popup-row"><span class="popup-label">Présence GAM</span><span class="popup-val" style="color:${d.Has_GAM ? '#2e7d4f' : '#e53935'}">${d.Has_GAM ? 'Oui' : 'Non'}</span></div>
    <button class="popup-btn" onclick="openScorecardPanel('${d.Commune.replace(/'/g, "\\'")}')">Voir le scorecard complet</button>`;
}

// ─── Scorecard side panel ─────────────────────────────
function openScorecardPanel(name) {
  const d = DATA.find(x => x.Commune === name);
  if (!d) return;
  document.getElementById('map-sc-content').innerHTML = buildScorecardHTML(d, true);
  document.getElementById('map-scorecard').classList.add('open');
  window.mapInstance.closePopup();
}
function closeMapScorecard() {
  document.getElementById('map-scorecard').classList.remove('open');
}
window.closeMapScorecard = closeMapScorecard;

// ─── Layer switcher ───────────────────────────────────
function setLayer(l, btn) {
  currentLayer = l;
  document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderMarkers();
}
window.setLayer = setLayer;

// ─── Filters ──────────────────────────────────────────
function applyFilters() { 
  renderMarkers();
  fillKPIs(getFilteredData());
}
function resetFilters() {
  document.getElementById('f-wilaya').value   = '';
  document.getElementById('f-score').value    = 0;
  document.getElementById('f-score-val').textContent = '0';
  document.getElementById('f-pop').value      = 0;
  document.getElementById('f-pop-val').textContent   = '0';
  document.getElementById('f-nogam').checked      = false;
  document.getElementById('f-industrial').checked = false;
  document.getElementById('f-seismic').checked    = false;
  document.getElementById('f-comp').value     = '';
  renderMarkers();
}
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;

// ─── Sidebar toggle ───────────────────────────────────
function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  document.getElementById('map-sidebar').classList.toggle('collapsed', !sidebarOpen);
  document.getElementById('map-toggle-btn').textContent = sidebarOpen ? '‹' : '›';
  setTimeout(() => window.mapInstance && window.mapInstance.invalidateSize(), 300);
}
window.toggleSidebar = toggleSidebar;

// ─── Legend ───────────────────────────────────────────
function updateLegend() {
  const legends = {
    score:       [{ c: scoreColor(90), l: '80-100 — Excellent' }, { c: scoreColor(70), l: '60-80 — Bon' }, { c: scoreColor(50), l: '40-60 — Moyen' }, { c: scoreColor(30), l: '20-40 — Faible' }, { c: scoreColor(10), l: '0-20 — Très faible' }],
    population:  [{ c: '#1976d2', l: 'Taille ∝ population' }],
    revenue:     [{ c: '#d4a017', l: 'Taille ∝ CA potentiel' }],
    competitors: [{ c: '#2e7d4f', l: 'Aucun concurrent' }, { c: '#d4a017', l: '1-3 concurrents' }, { c: '#e53935', l: '4 et plus' }],
    industrial:  [{ c: '#e65100', l: 'Zone industrielle' }, { c: '#c8e6c9', l: 'Pas de zone ind.' }],
    seismic:     [{ c: '#e53935', l: 'Zone 3 — élevé' }, { c: '#d4a017', l: 'Zone 2 — moyen' }, { c: '#2e7d4f', l: 'Zone 1 — faible' }],
    gam:         [{ c: '#2e7d4f', l: 'GAM présent' }, { c: '#e53935', l: 'Sans GAM' }],
    deficit:     [{ c: '#d4a017', l: 'Déficit > 5' }, { c: '#4caf50', l: 'Déficit 1-5' }, { c: '#c8e6c9', l: 'Pas de déficit' }]
  };
  const titles = {
    score: 'Score IA', population: 'Population 2026', revenue: 'CA Potentiel',
    competitors: 'Concurrents', industrial: 'Zones Industrielles',
    seismic: 'Risque Sismique', gam: 'Couverture GAM', deficit: 'Déficit Agences'
  };
  document.getElementById('map-legend-title').textContent = titles[currentLayer] || '';
  document.getElementById('map-legend-items').innerHTML = (legends[currentLayer] || [])
    .map(i => `<div class="legend-item"><div class="legend-dot" style="background:${i.c}"></div>${i.l}</div>`)
    .join('');
}

// ─── Wilaya dropdowns (shared) ────────────────────────
function populateWilayaDropdowns() {
  const wilayas = [...new Set(DATA.map(d => d.Wilaya))].sort();
  ['f-wilaya', 'tbl-wilaya'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '<option value="">Toutes les wilayas</option>' +
      wilayas.map(w => `<option value="${w}">${w}</option>`).join('');
  });
}
window.populateWilayaDropdowns = populateWilayaDropdowns;

// ─── Planner map ──────────────────────────────────────
function initPlannerMap() {
  window.plannerMap = L.map('planner-map', { center: [28.5, 2.5], zoom: 5 });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(window.plannerMap);
  window.plannerMap.invalidateSize();
}
window.initPlannerMap = initPlannerMap;

let plannerMarkers = [];
function renderPlanMarkers(items) {
  plannerMarkers.forEach(m => window.plannerMap.removeLayer(m));
  plannerMarkers = [];
  items.forEach((d, i) => {
    if (!d.Lat_Commune || !d.Lon_Commune) return;
    const m = L.circleMarker([d.Lat_Commune, d.Lon_Commune], {
      radius: 11, fillColor: '#d4a017', color: '#fff', weight: 2, fillOpacity: 0.9
    });
    m.bindTooltip(`#${i + 1} ${d.Commune} — Score: ${fmtScore(d.Score_IA_Predictif)}`, { permanent: false });
    plannerMarkers.push(m.addTo(window.plannerMap));
  });
  window.plannerMap.invalidateSize();
}
window.renderPlanMarkers = renderPlanMarkers;

// ─── Public init ──────────────────────────────────────
function initMapModule() {
  initMap();
  populateWilayaDropdowns();
}
window.initMapModule = initMapModule;
