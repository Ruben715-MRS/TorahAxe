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
    ritRender(body);
    if (typeof stCardsRender === 'function') stCardsRender(body);
    if (typeof stRender === 'function') stRender(body);
    rdRender(body);
    fbRender(body);
    dtRender(body);
    abRender(body);
}

// --- Rite : séfarade ou ashkénaze -------------------------------------------------------------------------------------------------------------------------
// Un réglage global, gardé sur l'appareil. Il choisit le vocabulaire (« Hazkara » chez les séfarades, « Yahrzeit » chez les ashkénazes) et, pour les dates personnelles, la règle de l'Adar
// (js/personalDatesCore.js). Les écrans Bénédictions et Siddour gardent leur propre choix de rite ; s'il n'a jamais été fait, Bénédictions prend celui-ci. Sans choix enregistré : séfarade.
const RITE_KEY = 'torahaxe_rite_v1';
const RITE_NAMES = { sefarade: 'dates.rite_sefarade', ashkenaze: 'dates.rite_ashkenaze', habad: 'dates.rite_habad' };

// Le rite que l'utilisateur a choisi, ou null s'il n'en a jamais choisi.
function riteStored() {
    try { const v = localStorage.getItem(RITE_KEY); return RITE_NAMES[v] ? v : null; } catch (e) { return null; }
}
// Le rite choisi tel quel (séfarade, ashkénaze, 'Habad) : le Siddour et les Bénédictions s'y règlent.
function riteFull() { return riteStored() || 'sefarade'; }
// Pour les dates (mot du jour anniversaire, règle de l'Adar), 'Habad suit l'usage ashkénaze.
function riteGet() { const r = riteFull(); return r === 'habad' ? 'ashkenaze' : r; }

// Le mot du jour anniversaire d'un décès : « Hazkara » (séfarade) ou « Yahrzeit » (ashkénaze).
function datesTerm() { return t(riteGet() === 'ashkenaze' ? 'dates.term_yahrzeit' : 'dates.term_hazkara'); }

function riteSet(rite) {
    if (!RITE_NAMES[rite]) return;
    try { localStorage.setItem(RITE_KEY, rite); localStorage.removeItem('benediction-rite'); } catch (e) { /* valable pour cette séance */ }
    // Le Siddour (Birkat haMazon, Méeïn chalosh) et l'écran Bénédictions suivent le nouveau rite.
    if (typeof sdApplyRite === 'function') sdApplyRite();
    // Le rite change la règle de l'Adar : les rappels des dates personnelles sont recalculés.
    if (typeof TorahAxeNotifications !== 'undefined' && TorahAxeNotifications.isSupported()) TorahAxeNotifications.scheduleZmanim();
    apRender();
}

function ritRender(body) {
    const group = document.createElement('div');
    group.className = 'settings-group';
    const label = document.createElement('div');
    label.className = 'settings-label';
    label.textContent = t('dates.rite_label');
    const seg = document.createElement('div');
    seg.className = 'segmented';
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', t('dates.rite_label'));
    Object.keys(RITE_NAMES).forEach(function (id) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = t(RITE_NAMES[id]);
        const on = riteGet() === id;
        b.className = on ? 'active' : '';
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.onclick = function () { riteSet(id); };
        seg.appendChild(b);
    });
    const note = document.createElement('p');
    note.className = 'modal-desc';
    note.textContent = t('dates.rite_note');
    group.append(label, seg, note);
    body.appendChild(group);
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
    try { localStorage.setItem('torahaxe_torah_reader_font_v2', id); } catch (e) { /* valable pour cette séance */ }
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
// Page restaurée depuis le cache arrière/avant (iOS) ou rechargée : on repose les attributs depuis le stockage.
window.addEventListener('pageshow', function () { apLoad(); apApply(); });

// --- Sons et vibrations ----------------------------------------------------------------------------------------------------------------------------
// appSettings (js/app/friseShim.js) porte `sound` et `haptics`, lus par js/audio.js ; on le garde sur l'appareil. `settingsSave` est aussi appelé
// par la frise et par js/location.js : il enregistre tout appSettings.
const AS_KEY = 'torahaxeAppSettings';

function settingsSave(s) {
    try { localStorage.setItem(AS_KEY, JSON.stringify(s)); } catch (e) { /* valable pour cette séance */ }
}
function asLoad() {
    if (typeof appSettings === 'undefined') return;
    try {
        const v = JSON.parse(localStorage.getItem(AS_KEY) || 'null');
        if (!v || typeof v !== 'object') return;
        if (typeof v.sound === 'boolean') appSettings.sound = v.sound;
        if (typeof v.haptics === 'boolean') appSettings.haptics = v.haptics;
        if (typeof v.roundLength === 'number' || typeof v.roundLength === 'string') appSettings.roundLength = v.roundLength;
        ['axesLegendPinned', 'locationPromptShown'].forEach(function (k) { if (typeof v[k] === 'boolean') appSettings[k] = v[k]; });
    } catch (e) { /* réglages par défaut */ }
}
window.addEventListener('load', asLoad);

function fbSet(key, on) {
    if (typeof appSettings === 'undefined') return;
    appSettings[key] = on;
    settingsSave(appSettings);
    if (on && key === 'haptics' && typeof triggerHaptic === 'function') triggerHaptic('success');
    apRender();
}
function fbRender(body) {
    if (typeof appSettings === 'undefined') return;
    const title = document.createElement('h3');
    title.className = 'settings-section';
    title.textContent = 'Application';
    body.appendChild(title);
    [['sound', 'Sons', 'Les petits sons des jeux (frise, roue…).'], ['haptics', 'Vibrations', 'Le retour tactile des jeux et du Kotel.']].forEach(function (d) {
        const on = appSettings[d[0]] !== false;
        const seg = document.createElement('div');
        seg.className = 'segmented';
        seg.setAttribute('role', 'group');
        seg.setAttribute('aria-label', d[1]);
        seg.append(rdChip('Activés', on, function () { fbSet(d[0], true); }), rdChip('Coupés', !on, function () { fbSet(d[0], false); }));
        rdGroup(body, d[1], seg, d[2]);
    });
}

// --- Données : sauvegarde, restauration, remise à zéro ---------------------------------------------------------------------------------------------
let dtConfirm = false;   // « Tout effacer » attend une seconde pression
let dtMsg = '';

function dtEntries() {
    const out = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); out[k] = localStorage.getItem(k); } } catch (e) { /* rien à lire */ }
    return out;
}
function dtMessage(text) { dtMsg = text; dtConfirm = false; apRender(); }

function dtExport() {
    const json = JSON.stringify(DataCore.buildExport(dtEntries()), null, 1);
    const name = DataCore.fileName();
    let file = null;
    try { file = new File([json], name, { type: 'application/json' }); } catch (e) { file = null; }
    if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        navigator.share({ files: [file], title: 'Sauvegarde TorahAxe' }).then(function () { dtMessage('Sauvegarde prête.'); }, function () { /* annulé */ });
        return;
    }
    try {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        dtMessage('Sauvegarde téléchargée (' + name + ').');
    } catch (e) { dtMessage('Impossible de créer la sauvegarde sur cet appareil.'); }
}

function dtImportFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
        const r = DataCore.parseImport(String(reader.result || ''));
        if (!r.ok) { dtMessage(r.error); return; }
        try {
            Object.keys(r.data).forEach(function (k) { localStorage.setItem(k, r.data[k]); });
        } catch (e) { dtMessage('Restauration impossible : le stockage est plein ou indisponible.'); return; }
        location.reload();
    };
    reader.onerror = function () { dtMessage('Lecture du fichier impossible.'); };
    reader.readAsText(file);
}

function dtReset() {
    if (!dtConfirm) { dtConfirm = true; dtMsg = ''; apRender(); return; }
    try { localStorage.clear(); } catch (e) { /* rien à effacer */ }
    // Les réglages de rappels reviennent à zéro : on reprogramme (donc on annule) les notifications de l'iPhone.
    const done = function () { location.reload(); };
    try {
        const n = typeof TorahAxeNotifications !== 'undefined' ? TorahAxeNotifications.scheduleZmanim() : null;
        if (n && n.then) n.then(done, done); else done();
    } catch (e) { done(); }
}

function dtRender(body) {
    const wrap = document.createElement('div');
    const row = document.createElement('div');
    row.className = 'settings-actions';
    const exp = document.createElement('button');
    exp.type = 'button';
    exp.className = 'settings-link-btn';
    exp.textContent = 'Sauvegarder mes données';
    exp.onclick = dtExport;
    const imp = document.createElement('button');
    imp.type = 'button';
    imp.className = 'settings-link-btn';
    imp.textContent = 'Restaurer une sauvegarde';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.hidden = true;
    input.onchange = function () { dtImportFile(input.files && input.files[0]); };
    imp.onclick = function () { input.click(); };
    const rst = document.createElement('button');
    rst.type = 'button';
    rst.className = 'settings-link-btn settings-danger';
    rst.textContent = dtConfirm ? 'Confirmer : tout effacer' : 'Effacer mes données';
    rst.onclick = dtReset;
    row.append(exp, imp, input, rst);
    if (dtConfirm) {
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'settings-link-btn';
        cancel.textContent = 'Annuler';
        cancel.onclick = function () { dtConfirm = false; apRender(); };
        row.appendChild(cancel);
    }
    wrap.appendChild(row);
    if (dtMsg) {
        const m = document.createElement('p');
        m.className = 'modal-desc';
        m.setAttribute('role', 'status');
        m.textContent = dtMsg;
        wrap.appendChild(m);
    }
    rdGroup(body, 'Mes données', wrap, 'Réglages, lieu, favoris, positions de lecture et progression des jeux, gardés sur cet appareil. La sauvegarde est un fichier à conserver ; « Effacer » remet l\'application à zéro et ne se défait pas.');
}

// --- À propos ----------------------------------------------------------------------------------------------------------------------------------
const AB_VERSION = '1.0.0';
const AB_CREDITS = [
    'Siddour, Tanakh, Targoum Onkelos : Sefaria (domaine public).',
    'Tikkoun : tikkun.io (licence MIT), d\'après l\'API Sefaria.',
    'Cartes et frontières : Natural Earth (domaine public) ; cartes affichées avec MapLibre.',
    'Textes français, résumés, titres et outils : TorahAxe.'
];
function abRender(body) {
    const box = document.createElement('div');
    const v = document.createElement('p');
    v.className = 'modal-desc';
    v.textContent = 'TorahAxe, version ' + AB_VERSION;
    box.appendChild(v);
    const ul = document.createElement('ul');
    ul.className = 'settings-credits';
    AB_CREDITS.forEach(function (c) { const li = document.createElement('li'); li.textContent = c; ul.appendChild(li); });
    box.appendChild(ul);
    rdGroup(body, 'À propos', box, 'Les contenus halakhiques sont à faire relire par une personne compétente avant toute décision pratique.');
}
