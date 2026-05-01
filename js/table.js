/**
 * table.js
 * Sortable, filterable, paginated rankings table.
 */

let tblSort     = { col: 'Rank_National', dir: 1 };
let tblPage     = 1;
let tblPerPage  = 25;
let tblFiltered = [];

function initTable() {
  tblFiltered = [...DATA];
  sortTableData();
  renderTable();
}
window.initTable = initTable;

function renderTable() {
  const body  = document.getElementById('rtable-body');
  const start = (tblPage - 1) * tblPerPage;
  const slice = tblFiltered.slice(start, start + tblPerPage);

  body.innerHTML = slice.map(d => {
    const sc     = d.Score_IA_Predictif;
    const isTop3 = d.Rank_National <= 3;
    return `<tr class="${isTop3 ? 'top3' : ''}" onclick="openScorecardFromTable('${d.Commune.replace(/'/g, "\\'")}')">
      <td style="font-weight:700;color:var(--text3)">${d.Rank_National}</td>
      <td style="color:var(--text3)">${d.Rank_Wilaya}</td>
      <td style="font-weight:700">${isTop3 ? '🏆 ' : ''}${d.Commune}</td>
      <td>${d.Wilaya}</td>
      <td style="color:var(--text3);font-size:11px">${d.Statut || '—'}</td>
      <td><span class="score-badge" style="background:${scoreBg(sc)};color:${scoreColor(sc)}">${fmtScore(sc)}</span></td>
      <td style="font-weight:600">${fmtScore(d['Probabilite_Succes_%'])}%</td>
      <td style="font-weight:600;color:var(--yellow)">${fmtDA(d.Chiffre_Affaires_Potentiel_DA)}</td>
      <td>${fmtNum(d.Pop_2026)}</td>
      <td style="text-align:center">${d.Nb_Agences_Concurrents_Total}</td>
      <td class="${d.Has_GAM ? 'gam-yes' : 'gam-no'}">${d.Has_GAM ? 'Oui' : 'Non'}</td>
      <td style="text-align:center">${d.Nb_Zones_Industrielles || 0}</td>
      <td style="text-align:center">${d.Zone_Sismique || 0}</td>
    </tr>`;
  }).join('');

  renderPagination();
}

function filterTable() {
  const q   = (document.getElementById('tbl-search').value || '').toLowerCase();
  const wil = document.getElementById('tbl-wilaya').value;

  tblFiltered = DATA.filter(d => {
    if (wil && d.Wilaya !== wil)                                            return false;
    if (q && !d.Commune.toLowerCase().includes(q) && !d.Wilaya.toLowerCase().includes(q)) return false;
    return true;
  });
  sortTableData();
  tblPage = 1;
  renderTable();
  fillKPIs(tblFiltered);
}
window.filterTable = filterTable;

function sortTable(col) {
  if (tblSort.col === col) tblSort.dir *= -1;
  else { tblSort.col = col; tblSort.dir = 1; }
  sortTableData();
  renderTable();
  fillKPIs(tblFiltered);
}
window.sortTable = sortTable;

function sortTableData() {
  const { col, dir } = tblSort;
  tblFiltered.sort((a, b) => {
    const av = a[col], bv = b[col];
    if (typeof av === 'string') return av.localeCompare(bv) * dir;
    return (av - bv) * dir;
  });
}

function changePerPage() {
  tblPerPage = +document.getElementById('tbl-perpage').value;
  tblPage = 1;
  renderTable();
}
window.changePerPage = changePerPage;

function renderPagination() {
  const total = Math.ceil(tblFiltered.length / tblPerPage);
  let html = `<span class="page-info">${tblFiltered.length} résultats</span>`;

  const pages = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (tblPage > 3)          pages.push('…');
    for (let i = Math.max(2, tblPage - 1); i <= Math.min(total - 1, tblPage + 1); i++) pages.push(i);
    if (tblPage < total - 2)  pages.push('…');
    pages.push(total);
  }

  html += pages.map(p =>
    p === '…'
      ? `<span class="page-info">…</span>`
      : `<button class="page-btn ${p === tblPage ? 'active' : ''}" onclick="goPage(${p})">${p}</button>`
  ).join('');

  document.getElementById('pagination').innerHTML = html;
}

function goPage(p) { tblPage = p; renderTable(); }
window.goPage = goPage;

function openScorecardFromTable(name) {
  showTab(3);
  setTimeout(() => loadScorecard(name), 60);
}
window.openScorecardFromTable = openScorecardFromTable;

function exportCSV() {
  const headers = ['Rang_Nat','Rang_W','Commune','Wilaya','Statut','Score_IA',
    'Prob_%','CA_Potentiel_DA','Pop_2026','Concurrents','GAM','ZI','Sismique'];
  const rows = tblFiltered.map(d => [
    d.Rank_National, d.Rank_Wilaya, d.Commune, d.Wilaya, d.Statut,
    d.Score_IA_Predictif, d['Probabilite_Succes_%'],
    d.Chiffre_Affaires_Potentiel_DA, d.Pop_2026,
    d.Nb_Agences_Concurrents_Total, d.Has_GAM,
    d.Nb_Zones_Industrielles, d.Zone_Sismique
  ].join(','));

  const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'GAM_Classements.csv';
  a.click();
}
window.exportCSV = exportCSV;
