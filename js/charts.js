/**
 * charts.js
 * Builds all Chart.js instances for the Analytics tab.
 * Called once when the user first opens Tab 4.
 */

function buildCharts() {
  const cOpts = (extra = {}) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: 'var(--text2)', font: { family: "'Plus Jakarta Sans'", size: 11 } } },
      ...(extra.plugins || {})
    },
    scales: {
      x: { grid: { color: 'var(--border)' }, ticks: { color: 'var(--text3)', font: { size: 10 } }, ...(extra.scaleX || {}) },
      y: { grid: { color: 'var(--border)' }, ticks: { color: 'var(--text3)', font: { size: 10 } }, ...(extra.scaleY || {}) }
    },
    ...extra
  });

  // ── Top 15 wilayas by avg score ──────────────────────
  const byW = {};
  DATA.forEach(d => {
    if (!byW[d.Wilaya]) byW[d.Wilaya] = { s: 0, n: 0 };
    byW[d.Wilaya].s += d.Score_IA_Predictif;
    byW[d.Wilaya].n++;
  });
  const top15w = Object.entries(byW)
    .map(([w, v]) => ({ w, avg: v.s / v.n }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 15);

  new Chart(document.getElementById('ch-wilayas'), {
    type: 'bar',
    data: {
      labels: top15w.map(x => x.w),
      datasets: [{ data: top15w.map(x => +x.avg.toFixed(1)), backgroundColor: top15w.map(x => scoreColor(x.avg)), borderRadius: 5 }]
    },
    options: {
      ...cOpts({ indexAxis: 'y', plugins: { legend: { display: false } } }),
      onClick: (e, els) => {
        if (els[0]) {
          document.getElementById('tbl-wilaya').value = top15w[els[0].index].w;
          filterTable();
          showTab(2);
        }
      }
    }
  });

  // ── Top 20 communes ───────────────────────────────────
  const t20 = DATA.slice().sort((a, b) => b.Score_IA_Predictif - a.Score_IA_Predictif).slice(0, 20);
  new Chart(document.getElementById('ch-top20'), {
    type: 'bar',
    data: {
      labels: t20.map(d => d.Commune),
      datasets: [{ data: t20.map(d => d.Score_IA_Predictif), backgroundColor: t20.map(d => scoreColor(d.Score_IA_Predictif)), borderRadius: 4 }]
    },
    options: cOpts({
      plugins: { legend: { display: false } },
      scaleX: { ticks: { maxRotation: 45, font: { size: 9 }, color: 'var(--text3)' } }
    })
  });

  // ── Score histogram ───────────────────────────────────
  const bins = Array(10).fill(0);
  DATA.forEach(d => { const b = Math.min(Math.floor(d.Score_IA_Predictif / 10), 9); bins[b]++; });
  new Chart(document.getElementById('ch-hist'), {
    type: 'bar',
    data: {
      labels: ['0-10','10-20','20-30','30-40','40-50','50-60','60-70','70-80','80-90','90-100'],
      datasets: [{ data: bins, backgroundColor: ['#e8f5e9','#c8e6c9','#a5d6a7','#81c784','#66bb6a','#4caf50','#43a047','#388e3c','#d4a017','#b8860b'], borderRadius: 4 }]
    },
    options: cOpts({ plugins: { legend: { display: false } } })
  });

  // ── Competitor market share ───────────────────────────
  const ct = { SAA:0, ALLIANCE:0, AXA:0, CAAR:0, CAAT:0, CASH:0, CIAR:0, TRUST:0 };
  DATA.forEach(d => Object.keys(ct).forEach(k => ct[k] += (d['Nb_Agences_' + k] || 0)));
  new Chart(document.getElementById('ch-pie'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(ct),
      datasets: [{
        data: Object.values(ct),
        backgroundColor: ['#1a5c35','#2e7d4f','#4caf50','#81c784','#d4a017','#e65100','#e53935','#7b1fa2'],
        borderColor: '#fff',
        borderWidth: 2
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: 'var(--text2)', font: { size: 11 } } } } }
  });

  // ── Deficit by wilaya ─────────────────────────────────
  const defW = {};
  DATA.forEach(d => { if (!defW[d.Wilaya]) defW[d.Wilaya] = 0; defW[d.Wilaya] += d.Deficit_Agences; });
  const t15def = Object.entries(defW).sort((a, b) => b[1] - a[1]).slice(0, 15);
  new Chart(document.getElementById('ch-deficit'), {
    type: 'bar',
    data: {
      labels: t15def.map(x => x[0]),
      datasets: [{ label: 'Déficit total', data: t15def.map(x => x[1]), backgroundColor: 'rgba(212,160,23,.5)', borderColor: '#d4a017', borderWidth: 1.5, borderRadius: 4 }]
    },
    options: cOpts({ plugins: { legend: { display: false } } })
  });

  // ── Industrial zones ──────────────────────────────────
  const t15i = DATA.slice()
    .sort((a, b) => (b.Nb_Zones_Industrielles + b.Nb_Zones_Activite) - (a.Nb_Zones_Industrielles + a.Nb_Zones_Activite))
    .slice(0, 15);
  new Chart(document.getElementById('ch-indus'), {
    type: 'bar',
    data: {
      labels: t15i.map(d => d.Commune),
      datasets: [
        { label: 'Zones ind.', data: t15i.map(d => d.Nb_Zones_Industrielles), backgroundColor: 'rgba(230,81,0,.5)', borderRadius: 4 },
        { label: 'Zones act.', data: t15i.map(d => d.Nb_Zones_Activite),       backgroundColor: 'rgba(46,125,79,.5)', borderRadius: 4 }
      ]
    },
    options: cOpts({
      scaleX: { stacked: true, ticks: { maxRotation: 45, font: { size: 9 }, color: 'var(--text3)' } },
      scaleY: { stacked: true }
    })
  });

  // ── Seismic market by wilaya ──────────────────────────
  const seisW = {};
  DATA.forEach(d => { if (!seisW[d.Wilaya]) seisW[d.Wilaya] = 0; seisW[d.Wilaya] += d.Nombre_Total_Polices_assurances_seismes; });
  const t12s = Object.entries(seisW).sort((a, b) => b[1] - a[1]).slice(0, 12);
  new Chart(document.getElementById('ch-seismic'), {
    type: 'bar',
    data: {
      labels: t12s.map(x => x[0]),
      datasets: [{ label: 'Polices sismiques', data: t12s.map(x => x[1]), backgroundColor: 'rgba(229,57,53,.4)', borderColor: '#e53935', borderWidth: 1.5, borderRadius: 4 }]
    },
    options: cOpts({
      plugins: { legend: { display: false } },
      scaleX: { ticks: { maxRotation: 45, font: { size: 9 }, color: 'var(--text3)' } }
    })
  });

  // ── Revenue by wilaya ─────────────────────────────────
  const revW = {};
  DATA.forEach(d => { if (!revW[d.Wilaya]) revW[d.Wilaya] = 0; revW[d.Wilaya] += d.Chiffre_Affaires_Potentiel_DA; });
  const t15r = Object.entries(revW).sort((a, b) => b[1] - a[1]).slice(0, 15);
  new Chart(document.getElementById('ch-revenue'), {
    type: 'bar',
    data: {
      labels: t15r.map(x => x[0]),
      datasets: [{ data: t15r.map(x => x[1]), backgroundColor: t15r.map((_, i) => i < 3 ? '#d4a017' : 'rgba(46,125,79,.5)'), borderRadius: 4 }]
    },
    options: cOpts({
      plugins: { legend: { display: false } },
      scaleY: { ticks: { callback: v => fmtDA(v) } }
    })
  });
}

window.buildCharts = buildCharts;
