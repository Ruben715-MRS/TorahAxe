// =========================================================================
// === FOND DES CARTES BIBLIQUES : MapLibre et les terres du Levant ===
// =========================================================================
// Ce que js/app/biblical-maps.js attend de l'Atlas des pays d'HistoriAxe, fourni ici sous la même forme :
//   countriesTheme(), COUNTRIES_OCEAN, countriesData (le fond de terres), countriesLoad() et atlasLoadLibrary().
// MapLibre (assets/vendor/maplibre) et les terres (data/levant-land.json, extrait de Natural Earth 1:50 m, domaine public)
// sont embarqués dans l'app et chargés à la première ouverture d'une carte, pour fonctionner hors-ligne.

const COUNTRIES_OCEAN = { light: '#a9cde8', dark: '#2c4a63' };
let countriesData = null;

function countriesTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

let biblicalLandPromise = null;
function countriesLoad() {
    if (countriesData) return Promise.resolve(true);
    if (!biblicalLandPromise) {
        biblicalLandPromise = fetch('data/levant-land.json')
            .then(r => { if (!r.ok) throw new Error('land'); return r.json(); })
            .then(geo => { countriesData = { geo }; return true; })
            .catch(() => { biblicalLandPromise = null; return false; });
    }
    return biblicalLandPromise;
}

let biblicalLibPromise = null;
function atlasLoadLibrary() {
    if (typeof maplibregl !== 'undefined') return Promise.resolve(true);
    if (!biblicalLibPromise) {
        biblicalLibPromise = new Promise(resolve => {
            const css = document.createElement('link');
            css.rel = 'stylesheet';
            css.href = 'assets/vendor/maplibre/maplibre-gl.css';
            document.head.appendChild(css);
            const js = document.createElement('script');
            js.src = 'assets/vendor/maplibre/maplibre-gl.js';
            js.onload = () => resolve(typeof maplibregl !== 'undefined');
            js.onerror = () => { biblicalLibPromise = null; resolve(false); };
            document.head.appendChild(js);
        });
    }
    return biblicalLibPromise;
}
