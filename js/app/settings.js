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
    rdRender(body);
}

// --- Lecture : police hébraïque, voyelles, vitesse du défilement, lieu et rappels ------------------------------------------------------------------
// Ces réglages écrivent dans le stockage des outils qui les lisent déjà (Tikkoun et Siddour : la police ; Siddour : les voyelles ;
// défilement automatique : la vitesse) : un seul endroit pour les choisir, et chaque outil garde son propre sélecteur.
const RD_SPEED_COUNT = 7;

function rdFonts() { return typeof TORAH_READER_FONTS !== 'undefined' ? TORAH_READER_FONTS : []; }

function rdReadJson(key) {
    try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
}
function rdFontId() {
    const fonts = rdFonts();
    if (typeof torahReaderFontId === 'function') return torahReaderFontId();
    return fonts.length ? fonts[0].id : '';
}
function rdNiqqud() {
    const p = rdReadJson('siddurPrefs');
    return typeof p.niqqud === 'boolean' ? p.niqqud : true;
}
function rdSpeed() {
    return typeof autoScrollStoredSpeed === 'function' ? autoScrollStoredSpeed() : 2;
}

function rdSetFont(id) {
    if (!rdFonts().some(function (f) { return f.id === id; })) return;
    try { localStorage.setItem('historiaxe_torah_reader_font_v2', id); } catch (e) { /* valable pour cette séance */ }
    const p = rdReadJson('siddurPrefs');
    p.font = id;
    try { localStorage.setItem('siddurPrefs', JSON.stringify(p)); } catch (e) { /* idem */ }
    apRender();
}
function rdSetNiqqud(on) {
    const p = rdReadJson('siddurPrefs');
    p.niqqud = on;
    try { localStorage.setItem('siddurPrefs', JSON.stringify(p)); } catch (e) { /* valable pour cette séance */ }
    apRender();
}
function rdSetSpeed(i) {
    try { localStorage.setItem('autoScrollSpeed', String(i)); } catch (e) { /* valable pour cette séance */ }
    apRender();
}
function rdOpenZmanim() {
    closeSettings();
    if (typeof openTool === 'function') openTool('zmanim', 'screen-main');
    if (typeof zmOpenSettings === 'function') zmOpenSettings();
}

function rdChip(text, on, onclick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.className = on ? 'active' : '';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.onclick = onclick;
    return b;
}
function rdGroup(body, labelText, control, noteText) {
    const group = document.createElement('div');
    group.className = 'settings-group';
    const label = document.createElement('div');
    label.className = 'settings-label';
    label.textContent = labelText;
    group.appendChild(label);
    group.appendChild(control);
    if (noteText) {
        const note = document.createElement('p');
        note.className = 'modal-desc';
        note.textContent = noteText;
        group.appendChild(note);
    }
    body.appendChild(group);
}

function rdRender(body) {
    const title = document.createElement('h3');
    title.className = 'settings-section';
    title.textContent = 'Lecture et étude';
    body.appendChild(title);

    const fonts = rdFonts();
    if (fonts.length) {
        const cur = rdFontId();
        const grid = document.createElement('div');
        grid.className = 'profile-choices';
        grid.setAttribute('role', 'group');
        grid.setAttribute('aria-label', 'Police hébraïque');
        fonts.forEach(function (f) { grid.appendChild(rdChip(f.label, f.id === cur, function () { rdSetFont(f.id); })); });
        rdGroup(body, 'Police hébraïque', grid, 'Pour le Tikkoun (Torah) et le Siddour. Chaque outil garde son propre sélecteur.');
    }

    const nq = rdNiqqud();
    const vow = document.createElement('div');
    vow.className = 'segmented';
    vow.setAttribute('role', 'group');
    vow.setAttribute('aria-label', 'Voyelles dans le Siddour');
    vow.append(rdChip('Avec voyelles', nq, function () { rdSetNiqqud(true); }), rdChip('Sans voyelles', !nq, function () { rdSetNiqqud(false); }));
    rdGroup(body, 'Voyelles (nikoud) dans le Siddour', vow, 'Se change aussi depuis l\'affichage du Siddour.');

    const sp = rdSpeed();
    const spd = document.createElement('div');
    spd.className = 'segmented';
    spd.setAttribute('role', 'group');
    spd.setAttribute('aria-label', 'Vitesse du défilement automatique');
    for (let i = 0; i < RD_SPEED_COUNT; i++) (function (k) { spd.appendChild(rdChip(String(k + 1), k === sp, function () { rdSetSpeed(k); })); })(i);
    rdGroup(body, 'Défilement automatique', spd, 'Vitesse de départ, de 1 (lente) à 7 (rapide). Elle suit la dernière vitesse que vous avez réglée dans un texte.');

    const zm = document.createElement('button');
    zm.type = 'button';
    zm.className = 'settings-link-btn';
    zm.textContent = 'Lieu, opinions et rappels (Zmanim) ›';
    zm.onclick = rdOpenZmanim;
    rdGroup(body, 'Lieu et rappels', zm, 'Votre lieu, les opinions de calcul et les notifications (bougies, Omer, Roch \'Hodesh…).');
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
