# GAM Assurance — Dashboard Expansion Commerciale

## Structure du projet

```
gam-dashboard/
├── index.html              ← Page principale (ne pas modifier)
├── css/
│   └── style.css           ← Tous les styles visuels
├── js/
│   ├── data.js             ← Chargement du CSV (fetch)
│   ├── map.js              ← Carte Leaflet + couches + filtres
│   ├── table.js            ← Tableau de classement
│   ├── scorecard.js        ← Scorecard commune + graphiques
│   ├── charts.js           ← Graphiques analytiques (Tab 4)
│   ├── planner.js          ← Planificateur d'expansion (Tab 5)
│   └── app.js              ← Orchestrateur principal
└── data/
    └── Final_dataset.csv   ← VOS DONNÉES — remplacez ce fichier
```

## Mettre à jour les données

Remplacez simplement `data/Final_dataset.csv` par votre nouveau fichier.
Le dashboard se rechargera automatiquement avec les nouvelles données.
**Aucune autre modification n'est nécessaire.**

## Lancer le dashboard en local

Le dashboard utilise `fetch()` pour lire le CSV, donc vous avez besoin
d'un serveur HTTP local (les navigateurs bloquent les requêtes file://).

### Option 1 — Python (recommandé, aucune installation)
```bash
cd gam-dashboard
python -m http.server 8080
```
Puis ouvrez http://localhost:8080 dans votre navigateur.

### Option 2 — VS Code Live Server
Installez l'extension **Live Server** dans VS Code,
ouvrez le dossier `gam-dashboard`, puis cliquez sur **Go Live**.

### Option 3 — Node.js
```bash
npx serve gam-dashboard
```

## Technologies utilisées

- **Leaflet.js** — Carte interactive
- **Chart.js** — Graphiques
- **PapaParse** — Lecture CSV côté client
- **Plus Jakarta Sans** — Typographie (Google Fonts)
