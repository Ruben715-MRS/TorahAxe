// Réglages › Apparence : thème, fond d'écran, motif. Les choix sont gardés dans localStorage (AppearanceCore.KEY).
// L'application des attributs se fait aussi très tôt, depuis <head> (voir index.html), pour éviter un flash de thème.

let apPrefs = AppearanceCore.normalize(null);
let apMedia = null;

function apPrefersDark() {
    try { return !!(apMedia && apMedia.matches); } catch (e) { return false; }
}
function apLoad() {
    try { apPrefs = AppearanceCore.normalize(JSON.parse(localStorage.getItem(AppearanceCore.KEY) || 'null')); } catch (e) { apPrefs = AppearanceCore.normalize(null); }
}
function apSave() {
    try { localStorage.setItem(AppearanceCore.KEY, JSON.stringify(apPrefs)); } catch (e) { /* stockage indisponible : valable pour cette séance */ }
}
function apApply() {
    AppearanceCore.apply(document.documentElement, apPrefs, apPrefersDark());
}

const AP_GROUPS = [
    { key: 'theme', label: 'Apparence', options: [['auto', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']],
      note: '« Auto » suit le réglage clair/sombre programmé sur votre système.' },
    { key: 'wallpaper', label: 'Fond d\'écran', options: [['none', 'Aucun'], ['sand', 'Sable'], ['sky', 'Ciel'], ['sage', 'Sauge'], ['slate', 'Ardoise']],
      note: 'Un fond de couleur douce, visible derrière les écrans. Il s\'adapte au mode clair ou sombre.' },
    { key: 'motif', label: 'Motif', options: [['none', 'Aucun'], ['dots', 'Points'], ['grid', 'Quadrillage'], ['meander', 'Frise']],
      note: 'Un tracé discret répété sur le fond, sous les cartes et les frises.' },
    { key: 'intensity', label: 'Intensité du motif', options: [['low', 'Faible'], ['medium', 'Moyenne'], ['high', 'Forte']],
      note: 'La visibilité du motif.', onlyWithMotif: true }
];

function apRender() {
    const body = document.getElementById('settings-body');
    if (!body) return;
    body.textContent = '';
    AP_GROUPS.forEach(function (g) {
        if (g.onlyWithMotif && apPrefs.motif === 'none') return;
        const group = document.createElement('div');
        group.className = 'settings-group';
        const label = document.createElement('div');
        label.className = 'settings-label';
        label.textContent = g.label;
        const seg = document.createElement('div');
        seg.className = 'segmented';
        seg.setAttribute('role', 'group');
        seg.setAttribute('aria-label', g.label);
        g.options.forEach(function (o) {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = o[1];
            const on = apPrefs[g.key] === o[0];
            b.className = on ? 'active' : '';
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
            b.onclick = function () { apSet(g.key, o[0]); };
            seg.appendChild(b);
        });
        const note = document.createElement('p');
        note.className = 'modal-desc';
        note.textContent = g.note;
        group.append(label, seg, note);
        body.appendChild(group);
    });
}

function apSet(key, value) {
    apPrefs = AppearanceCore.normalize(Object.assign({}, apPrefs, { [key]: value }));
    apSave();
    apApply();
    apRender();
}

function apInit() {
    try { apMedia = window.matchMedia('(prefers-color-scheme: dark)'); } catch (e) { apMedia = null; }
    apLoad();
    apApply();
    if (apMedia && apMedia.addEventListener) apMedia.addEventListener('change', function () { if (apPrefs.theme === 'auto') apApply(); });
}
apInit();
