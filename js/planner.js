/**
 * planner.js
 * Generates the optimal agency expansion plan
 * based on score, GAM absence, geography and population.
 */

let planItems = [];

function buildPlan() {
  const n = Math.max(1, Math.min(20, +document.getElementById('plan-n').value || 5));

  // Filter eligible communes: no GAM, pop > 15 000, sorted by score desc
  const candidates = DATA
    .filter(d => !d.Has_GAM && d.Pop_2026 > 15000)
    .sort((a, b) => b.Score_IA_Predictif - a.Score_IA_Predictif);

  // Greedy selection: max 2 per wilaya for geographic spread
  const wilayaCount = {};
  planItems = [];
  for (const d of candidates) {
    if (planItems.length >= n) break;
    const wc = wilayaCount[d.Wilaya] || 0;
    if (wc >= 2) continue;
    planItems.push(d);
    wilayaCount[d.Wilaya] = wc + 1;
  }

  renderPlanItems();
  renderPlanKPIs();

  if (!plannerMapInited) {
    initPlannerMap();
    plannerMapInited = true;
  }
  renderPlanMarkers(planItems);

  document.getElementById('plan-kpis').style.display = 'grid';
  document.getElementById('plan-export-btn').style.display = 'block';
}
window.buildPlan = buildPlan;

function renderPlanItems() {
  const list = document.getElementById('planner-list');
  if (!planItems.length) {
    list.innerHTML = `<div class="empty-state" style="padding:20px"><div class="empty-text" style="font-size:13px">Aucune commune dans le plan</div></div>`;
    return;
  }
  list.innerHTML = planItems.map((d, i) => `
    <div class="plan-item">
      <div class="plan-rank">#${i + 1}</div>
      <div class="plan-info">
        <div class="plan-name">${d.Commune}</div>
        <div class="plan-meta">${d.Wilaya} · ${fmtNum(d.Pop_2026)} hab. · ${fmtDA(d.Chiffre_Affaires_Potentiel_DA)}</div>
      </div>
      <div class="plan-score">${fmtScore(d.Score_IA_Predictif)}</div>
      <button class="plan-remove" onclick="removePlanItem(${i})" title="Retirer">✕</button>
    </div>`).join('');
}

function removePlanItem(i) {
  planItems.splice(i, 1);
  renderPlanItems();
  renderPlanKPIs();
  renderPlanMarkers(planItems);
}
window.removePlanItem = removePlanItem;

function renderPlanKPIs() {
  document.getElementById('pk-n').textContent   = planItems.length;
  document.getElementById('pk-rev').textContent = fmtDA(planItems.reduce((s, d) => s + d.Chiffre_Affaires_Potentiel_DA, 0));
  document.getElementById('pk-pop').textContent = fmtNum(planItems.reduce((s, d) => s + d.Pop_2026, 0));
}

function exportPlan() {
  const headers = ['Rang','Commune','Wilaya','Score_IA','Prob_%','CA_Potentiel_DA','Pop_2026','Concurrents','ZI'];
  const rows = planItems.map((d, i) => [
    i + 1, d.Commune, d.Wilaya,
    fmtScore(d.Score_IA_Predictif), fmtScore(d['Probabilite_Succes_%']),
    d.Chiffre_Affaires_Potentiel_DA, d.Pop_2026,
    d.Nb_Agences_Concurrents_Total, d.Nb_Zones_Industrielles
  ].join(','));

  const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'GAM_Plan_Expansion.csv';
  a.click();
}
window.exportPlan = exportPlan;
