/**
 * app.js
 * ------
 * Main orchestrator. Runs after all scripts are loaded.
 * Order: loadData() → fillKPIs() → initMapModule() → initTable() → show UI
 *
 * To add a new tab:
 *   1. Add the button + page HTML in index.html
 *   2. Create js/yourmodule.js
 *   3. Add <script src="js/yourmodule.js"> in index.html
 *   4. Call your init function in the boot sequence below
 */

var chartsBuilt       = false;
var plannerMapInited  = false;

/* ── Tab switching ───────────────────────────────────── */
function showTab(n) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
  document.getElementById('tab' + n).classList.add('active');
  document.getElementById('tabBtn' + n).classList.add('active');

  if (n === 1 && window.mapInstance) {
    setTimeout(function() { mapInstance.invalidateSize(); }, 100);
  }
  if (n === 4 && !chartsBuilt) {
    buildCharts();
    chartsBuilt = true;
  }
  if (n === 5 && !plannerMapInited) {
    initPlannerMap();
    plannerMapInited = true;
  }
}
window.showTab = showTab;

/* ── KPI bar ─────────────────────────────────────────── */
function fillKPIs(dataset) {
  var data = dataset || DATA;
  var total    = data.length;
  var noGam    = data.filter(function(d) { return !d.Has_GAM; }).length;
  var totalRev = data.reduce(function(s, d) { return s + d.Chiffre_Affaires_Potentiel_DA; }, 0);
  var avgScore = total > 0 ? data.reduce(function(s, d) { return s + d.Score_IA_Predictif; }, 0) / total : 0;
  var avgProb  = total > 0 ? data.reduce(function(s, d) { return s + d['Probabilite_Succes_%']; }, 0) / total : 0;
  var top      = data.length > 0 ? data.slice().sort(function(a, b) { return b.Score_IA_Predictif - a.Score_IA_Predictif; })[0] : null;

  document.getElementById('k-total').textContent = total.toLocaleString('fr');
  document.getElementById('k-nogam').textContent = noGam.toLocaleString('fr');
  document.getElementById('k-top').textContent   = top ? top.Commune + ' · ' + top.Wilaya : '—';
  document.getElementById('k-rev').textContent   = fmtDA(totalRev);
  document.getElementById('k-score').textContent = avgScore.toFixed(1) + ' / 100';
  document.getElementById('k-prob').textContent  = avgProb.toFixed(1) + '%';
}

/* ── Logo: click or drag-and-drop ────────────────────── */
function initLogoDrop() {
  var box = document.getElementById('logo-drop');
  if (!box) return;

  box.title = 'Cliquez pour ajouter le logo GAM';

  box.addEventListener('dragover', function(e) {
    e.preventDefault();
    box.style.opacity = '.7';
  });
  box.addEventListener('dragleave', function() { box.style.opacity = '1'; });
  box.addEventListener('drop', function(e) {
    e.preventDefault();
    box.style.opacity = '1';
    var file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      box.innerHTML = '<img src="' + ev.target.result + '" alt="GAM Logo" style="width:100%;height:100%;object-fit:contain;border-radius:6px">';
    };
    reader.readAsDataURL(file);
  });

  box.addEventListener('click', function() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        box.innerHTML = '<img src="' + ev.target.result + '" alt="GAM Logo" style="width:100%;height:100%;object-fit:contain;border-radius:6px">';
      };
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

/* ── Boot sequence ───────────────────────────────────── */
window.addEventListener('load', function() {

  // Safety: if PapaParse didn't load, show a clear error
  if (typeof Papa === 'undefined') {
    document.getElementById('loading-sub').textContent = 'Erreur: PapaParse non chargé. Vérifiez votre connexion internet.';
    document.getElementById('loading-sub').style.color = '#e53935';
    return;
  }

  loadData()
    .then(function() {
      try {
        setLoadingProgress(92, 'Calcul des indicateurs...');
        fillKPIs();

        setLoadingProgress(95, 'Initialisation de la carte...');
        initMapModule();

        setLoadingProgress(98, 'Préparation du tableau...');
        initTable();

        initLogoDrop();

        setLoadingProgress(100, 'Prêt !');

        // Small delay so user sees 100% before hiding
        setTimeout(function() {
          var screen = document.getElementById('loading-screen');
          var pages  = document.getElementById('pages');
          if (screen) {
            screen.style.transition = 'opacity .4s';
            screen.style.opacity = '0';
            setTimeout(function() { screen.style.display = 'none'; }, 420);
          }
          if (pages) pages.style.display = '';
        }, 400);
      } catch (e) {
        console.error('Initialization failed:', e);
        setLoadingError('Erreur lors de l\'initialisation: ' + e.message);
      }
    })
    .catch(function(err) {
      console.error('Boot failed:', err);
      setLoadingError('Erreur fatale: ' + err.message);
    });
});
