/**
 * scorecard.js
 * Builds and renders the detailed commune scorecard
 * including radar chart and population trend.
 */

let scChartInstances = {};

// ─── Autocomplete search ──────────────────────────────
function scSearch() {
  const q  = document.getElementById('sc-search').value.toLowerCase();
  const dd = document.getElementById('sc-dropdown');
  if (q.length < 2) { dd.style.display = 'none'; return; }

  const matches = DATA
    .filter(d => d.Commune.toLowerCase().includes(q) || d.Wilaya.toLowerCase().includes(q))
    .slice(0, 10);

  dd.innerHTML = matches.map(d =>
    `<div class="sc-option" onclick="loadScorecard('${d.Commune.replace(/'/g, "\\'")}');document.getElementById('sc-dropdown').style.display='none'">
      ${d.Commune} <span style="color:var(--text3);font-size:11px">— ${d.Wilaya}</span>
    </div>`
  ).join('');
  dd.style.display = matches.length ? 'block' : 'none';
}
window.scSearch = scSearch;

document.addEventListener('click', e => {
  if (!e.target.closest('.autocomplete-wrap')) {
    const dd = document.getElementById('sc-dropdown');
    if (dd) dd.style.display = 'none';
  }
});

function scRandom() {
  const d = DATA[Math.floor(Math.random() * DATA.length)];
  loadScorecard(d.Commune);
}
window.scRandom = scRandom;

// ─── Load a scorecard by commune name ────────────────
function loadScorecard(name) {
  const d = DATA.find(x => x.Commune === name);
  if (!d) return;
  document.getElementById('sc-search').value = name;
  const dd = document.getElementById('sc-dropdown');
  if (dd) dd.style.display = 'none';
  document.getElementById('scorecard-content').innerHTML = buildScorecardHTML(d, false);
  buildScorecardCharts(d);
}
window.loadScorecard = loadScorecard;

// ─── HTML builder ─────────────────────────────────────
function buildScorecardHTML(d, compact) {
  const sc   = d.Score_IA_Predictif;
  const prob = d['Probabilite_Succes_%'];
  const col  = scoreColor(sc);

  const decision = sc >= 60
    ? { cls: 'open',    col: '#2e7d4f', text: 'Recommandé — Ouvrir une agence',
        reason: `Score IA de ${fmtScore(sc)}/100 avec ${fmtScore(prob)}% de probabilité de succès. Déficit de ${d.Deficit_Agences} agences dans la zone.` }
    : sc >= 40
    ? { cls: 'monitor', col: '#d4a017', text: 'À surveiller',
        reason: `Score intermédiaire (${fmtScore(sc)}/100). Marché en développement avec ${d.Nb_Agences_Concurrents_Total} concurrent(s).` }
    : { cls: 'noopen',  col: '#e53935', text: 'Non recommandé',
        reason: `Score insuffisant (${fmtScore(sc)}/100). Potentiel limité au regard des critères d'implantation.` };

  const competitors = ['SAA','ALLIANCE','AXA','CAAR','CAAT','CASH','CIAR','TRUST']
    .filter(c => d['Nb_Agences_' + c] > 0)
    .map(c => `${c}: ${d['Nb_Agences_' + c]}`).join(' · ') || 'Aucun concurrent';

  return `
  <div class="sc-header-card">
    <div class="sc-gauge-wrap">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r="46" fill="none" stroke="var(--border)" stroke-width="9"/>
        <circle cx="55" cy="55" r="46" fill="none" stroke="${col}" stroke-width="9"
          stroke-dasharray="${2 * Math.PI * 46 * sc / 100} ${2 * Math.PI * 46 * (1 - sc / 100)}"
          stroke-dashoffset="${2 * Math.PI * 46 * 0.25}" stroke-linecap="round"/>
        <text x="55" y="50" text-anchor="middle" font-family="Plus Jakarta Sans" font-size="20" font-weight="800" fill="${col}">${fmtScore(sc)}</text>
        <text x="55" y="65" text-anchor="middle" font-family="Plus Jakarta Sans" font-size="10" fill="var(--text3)" font-weight="600">Score IA</text>
      </svg>
    </div>
    <div class="sc-info-main">
      <div class="sc-commune-name">${d.Commune}</div>
      <div class="sc-wilaya">${d.Wilaya}</div>
      <div class="badge-row">
        <span class="badge badge-status">${d.Statut || 'Commune'}</span>
        <span class="badge badge-rank">#${d.Rank_National} National</span>
        <span class="badge badge-rank">#${d.Rank_Wilaya} Wilaya</span>
        <span class="badge ${d.Has_GAM ? 'badge-gam-yes' : 'badge-gam-no'}">${d.Has_GAM ? 'GAM présent' : 'Sans GAM'}</span>
      </div>
      <div class="sc-metrics">
        <div class="sc-metric">
          <div class="sc-metric-label">Probabilité succès</div>
          <div class="sc-metric-value" style="color:${col}">${fmtScore(prob)}%</div>
        </div>
        <div class="sc-metric">
          <div class="sc-metric-label">CA Potentiel</div>
          <div class="sc-metric-value" style="color:var(--yellow);font-size:15px">${fmtDA(d.Chiffre_Affaires_Potentiel_DA)}</div>
        </div>
        <div class="sc-metric">
          <div class="sc-metric-label">Déficit agences</div>
          <div class="sc-metric-value">${d.Deficit_Agences}</div>
        </div>
      </div>
    </div>
  </div>

  ${compact ? '' : `
  <div class="sc-grid">
    <div class="sc-card full">
      <div class="sc-card-title">Analyse multi-critères</div>
      <canvas id="sc-radar" height="180"></canvas>
    </div>

    <div class="sc-card">
      <div class="sc-card-title">Démographie</div>
      <div class="sc-stat-row"><span class="sc-stat-label">Population 1998</span><span class="sc-stat-value">${fmtNum(d.Pop_1998)}</span></div>
      <div class="sc-stat-row"><span class="sc-stat-label">Population 2008</span><span class="sc-stat-value">${fmtNum(d.Pop_2008)}</span></div>
      <div class="sc-stat-row"><span class="sc-stat-label">Population 2026 (est.)</span><span class="sc-stat-value" style="color:var(--green2)">${fmtNum(d.Pop_2026)}</span></div>
      <div class="sc-stat-row"><span class="sc-stat-label">Taux de croissance</span><span class="sc-stat-value">${d.Taux_Croissance}%</span></div>
      <div class="sc-stat-row"><span class="sc-stat-label">Pop. active 2026</span><span class="sc-stat-value">${fmtNum(d.Pop_Active_Est_2026)}</span></div>
      <div class="sc-stat-row"><span class="sc-stat-label">Jeunesse scolarisée</span><span class="sc-stat-value">${fmtNum(d.Jeunesse_Scolarisee_Est_2026)}</span></div>
      <div class="sc-stat-row"><span class="sc-stat-label">Taux d'activité 2008</span><span class="sc-stat-value">${d.Taux_Activite_2008}%</span></div>
    </div>

    <div class="sc-card">
      <div class="sc-card-title">Concurrence</div>
      <div class="sc-stat-row"><span class="sc-stat-label">Total concurrents</span><span class="sc-stat-value" style="color:#e53935;font-size:16px;font-weight:800">${d.Nb_Agences_Concurrents_Total}</span></div>
      ${['SAA','ALLIANCE','AXA','CAAR','CAAT','CASH','CIAR','TRUST'].map(c =>
        `<div class="sc-stat-row"><span class="sc-stat-label">${c}</span><span class="sc-stat-value">${d['Nb_Agences_' + c] || 0}</span></div>`
      ).join('')}
    </div>

    <div class="sc-card">
      <div class="sc-card-title">Activité économique</div>
      <div class="sc-stat-row"><span class="sc-stat-label">Bien immobilier</span><span class="sc-stat-value">${fmtNum(d['Bien immobilier'])}</span></div>
      <div class="sc-stat-row"><span class="sc-stat-label">Installations commerciales</span><span class="sc-stat-value">${fmtNum(d['Installation commerciale'])}</span></div>
      <div class="sc-stat-row"><span class="sc-stat-label">Installations industrielles</span><span class="sc-stat-value">${fmtNum(d['Installation industrielle'])}</span></div>
      <div class="sc-stat-row"><span class="sc-stat-label">Zones industrielles</span><span class="sc-stat-value" style="color:var(--yellow)">${d.Nb_Zones_Industrielles}</span></div>
      <div class="sc-stat-row"><span class="sc-stat-label">Zones d'activité</span><span class="sc-stat-value" style="color:var(--yellow)">${d.Nb_Zones_Activite}</span></div>
      ${d.Descriptions_ZI && d.Descriptions_ZI !== '0'
        ? `<div class="sc-stat-row"><span class="sc-stat-label">Description ZI</span><span class="sc-stat-value" style="font-size:10px;max-width:150px;text-align:right">${d.Descriptions_ZI}</span></div>`
        : ''}
    </div>

    <div class="sc-card">
      <div class="sc-card-title">Risque sismique et marché</div>
      <div class="sc-stat-row"><span class="sc-stat-label">Zone sismique</span><span class="sc-stat-value" style="color:${d.Zone_Sismique >= 3 ? '#e53935' : d.Zone_Sismique >= 2 ? '#d4a017' : '#2e7d4f'}">Zone ${d.Zone_Sismique}</span></div>
      <div class="sc-stat-row"><span class="sc-stat-label">Coef. accélération</span><span class="sc-stat-value">${d.Coef_Acceleration}</span></div>
      <div class="sc-stat-row"><span class="sc-stat-label">Polices sismiques</span><span class="sc-stat-value">${fmtNum(d.Nombre_Total_Polices_assurances_seismes)}</span></div>
      <div class="sc-stat-row"><span class="sc-stat-label">Capacité théorique</span><span class="sc-stat-value">${d.Capacite_Agences_Theorique}</span></div>
      <div class="sc-stat-row"><span class="sc-stat-label">Déficit agences</span><span class="sc-stat-value" style="color:var(--yellow)">${d.Deficit_Agences}</span></div>
    </div>

    <div class="sc-card full">
      <div class="sc-card-title">Évolution démographique</div>
      <canvas id="sc-pop-trend" height="110"></canvas>
    </div>

    <div class="sc-card full">
      <div class="decision-box ${decision.cls}">
        <div class="decision-title" style="color:${decision.col}">${decision.text}</div>
        <div class="decision-reason">${decision.reason}</div>
      </div>
    </div>
  </div>`}`;
}
window.buildScorecardHTML = buildScorecardHTML;

// ─── Charts ───────────────────────────────────────────
function buildScorecardCharts(d) {
  Object.values(scChartInstances).forEach(c => c && c.destroy && c.destroy());
  scChartInstances = {};

  const maxPop   = Math.max(...DATA.map(x => x.Pop_2026));
  const maxEco   = Math.max(...DATA.map(x => (x['Installation commerciale'] || 0) + (x['Installation industrielle'] || 0)));
  const maxDef   = Math.max(...DATA.map(x => x.Deficit_Agences));
  const maxSeis  = Math.max(...DATA.map(x => x.Nombre_Total_Polices_assurances_seismes));
  const maxYouth = Math.max(...DATA.map(x => x.Jeunesse_Scolarisee_Est_2026));
  const maxComp  = Math.max(...DATA.map(x => x.Nb_Agences_Concurrents_Total));

  const vals = [
    (d.Pop_2026 / maxPop) * 100,
    (((d['Installation commerciale'] || 0) + (d['Installation industrielle'] || 0)) / maxEco) * 100,
    (d.Deficit_Agences / maxDef) * 100,
    (d.Nombre_Total_Polices_assurances_seismes / maxSeis) * 100,
    maxComp > 0 ? (1 - d.Nb_Agences_Concurrents_Total / maxComp) * 100 : 100,
    (d.Jeunesse_Scolarisee_Est_2026 / maxYouth) * 100
  ];

  const radarCtx = document.getElementById('sc-radar');
  if (radarCtx) {
    scChartInstances.radar = new Chart(radarCtx, {
      type: 'radar',
      data: {
        labels: ['Force démographique', 'Activité économique', 'Déficit couverture', 'Marché sismique', 'Pression compétitive', 'Marché jeunes'],
        datasets: [{
          data: vals,
          backgroundColor: 'rgba(46,125,79,.12)',
          borderColor: '#2e7d4f',
          pointBackgroundColor: '#d4a017',
          borderWidth: 2,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          r: {
            backgroundColor: 'rgba(232,245,233,.4)',
            grid: { color: 'var(--border)' },
            ticks: { color: 'var(--text3)', font: { size: 9 }, backdropColor: 'transparent' },
            pointLabels: { color: 'var(--text2)', font: { size: 11, weight: '600' } },
            min: 0, max: 100
          }
        }
      }
    });
  }

  const popCtx = document.getElementById('sc-pop-trend');
  if (popCtx) {
    scChartInstances.pop = new Chart(popCtx, {
      type: 'line',
      data: {
        labels: ['1998', '2008', '2026'],
        datasets: [{
          data: [d.Pop_1998, d.Pop_2008, d.Pop_2026],
          borderColor: '#2e7d4f',
          backgroundColor: 'rgba(46,125,79,.08)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#d4a017',
          pointRadius: 5,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'var(--border)' }, ticks: { color: 'var(--text3)' } },
          y: { grid: { color: 'var(--border)' }, ticks: { color: 'var(--text3)', callback: v => fmtNum(v) } }
        }
      }
    });
  }
}
