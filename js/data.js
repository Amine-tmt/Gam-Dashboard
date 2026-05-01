/**
 * data.js
 * -------
 * Loads data/Final_dataset.csv and exposes window.DATA
 *
 * To update data   → replace data/Final_dataset.csv, refresh browser.
 * To host online   → upload the whole folder to Netlify / GitHub Pages.
 */

window.DATA = [];

function setLoadingProgress(pct, msg) {
  const fill = document.getElementById('loading-fill');
  const sub  = document.getElementById('loading-sub');
  if (fill) fill.style.width = pct + '%';
  if (sub)  sub.textContent  = msg;
}

function setLoadingError(msg) {
  const sub  = document.getElementById('loading-sub');
  const fill = document.getElementById('loading-fill');
  const text = document.getElementById('loading-text');
  if (sub)  { sub.textContent = msg; sub.style.color = '#e53935'; }
  if (fill) fill.style.background = '#e53935';
  if (text) text.textContent = 'Erreur de chargement';
  console.error('Loading error:', msg);
}

function loadData() {
  return new Promise((resolve, reject) => {
    setLoadingProgress(15, 'Chargement du fichier CSV...');

    // Add timeout to prevent indefinite hanging
    const timeout = setTimeout(() => {
      reject(new Error('Timeout: le fichier CSV n\'a pas pu être chargé dans les délais'));
    }, 10000); // 10 second timeout

    fetch('./data/Final_dataset.csv')
      .then(response => {
        clearTimeout(timeout);
        if (!response.ok) throw new Error('Fichier introuvable (' + response.status + ')');
        setLoadingProgress(35, 'Fichier reçu, analyse en cours...');
        return response.text();
      })
      .then(csvText => {
        setLoadingProgress(55, 'Parsing des données...');

        // Strip BOM if Excel added it
        var cleaned = csvText.replace(/^\uFEFF/, '');

        var result = Papa.parse(cleaned, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          transformHeader: function(h) { return h.trim().replace(/^\uFEFF/, ''); }
        });

        if (result.errors && result.errors.length > 0) {
          console.warn('CSV warnings:', result.errors.slice(0, 3));
        }

        setLoadingProgress(75, 'Nettoyage et validation...');

        var numericFields = [
          'Pop_1998','Pop_2008','Pop_2026','Taux_Croissance',
          'Pop_Tahat_2008','Taux_Activite_2008','Indicateur_Jeunesse_2008',
          'Pop_Active_Est_2026','Jeunesse_Scolarisee_Est_2026',
          'Zone_Sismique','Coef_Acceleration',
          'Nombre_Total_Polices_assurances_seismes',
          'Bien immobilier','Installation commerciale','Installation industrielle',
          'Nb_Zones_Industrielles','Nb_Zones_Activite',
          'Nb_Agences_GAM','Nb_Agences_Concurrents_Total',
          'Nb_Agences_SAA','Nb_Agences_ALLIANCE','Nb_Agences_AXA',
          'Nb_Agences_CAAR','Nb_Agences_CAAT','Nb_Agences_CASH',
          'Nb_Agences_CIAR','Nb_Agences_TRUST',
          'Has_GAM','Nb_Agences_GAM2',
          'Capacite_Agences_Theorique','Deficit_Agences',
          'Chiffre_Affaires_Potentiel_DA',
          'Probabilite_Succes_%','Score_IA_Predictif',
          'Lat_Commune','Lon_Commune',
          'post_code','Rank_National','Rank_Wilaya'
        ];

        var stringFields = ['Commune','Wilaya','Statut','Descriptions_ZI','Concurrents_Noms','ar_name'];

        window.DATA = result.data.map(function(row) {
          numericFields.forEach(function(f) {
            var v = row[f];
            row[f] = (v === null || v === undefined || v === '' || isNaN(v)) ? 0 : Number(v);
          });
          stringFields.forEach(function(f) {
            if (!row[f]) row[f] = '';
          });
          return row;
        });

        if (window.DATA.length === 0) {
          throw new Error('Le CSV est vide ou mal formaté');
        }

        clearTimeout(timeout);
        setLoadingProgress(90, window.DATA.length + ' communes chargées...');
        console.log('DATA OK:', window.DATA.length, 'lignes');
        console.log('Colonnes:', Object.keys(window.DATA[0]));
        resolve(window.DATA);
      })
      .catch(function(err) {
        clearTimeout(timeout);
        console.error('Erreur:', err);
        setLoadingError('Erreur : ' + err.message);
        reject(err);
      });
  });
}
