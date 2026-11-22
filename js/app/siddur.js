// =========================================================================
// === SIDDOUR SÉFARADE : accueil par moments et rayons, puis lecteur ===
// =========================================================================
// Le siddour des jours de semaine, nusach Edot haMizrah, en hébreu vocalisé (data/siddur/, domaine public, généré par scripts/build_siddur.js).
// Le texte n'est jamais retouché : js/siddurCore.js lit les consignes du livre (« בקיץ », « בעשרת ימי תשובה », « בראש חדש »…) et dit quelle variante
// s'applique AUJOURD'HUI (jour hébraïque, lieu de l'écran Zmanim) ; l'écran met cette variante en valeur et estompe les autres. Un ajout entier
// qui ne s'applique pas (Yaalé véyavo un jour ordinaire, Avinou Malkénou…) est replié sous une ligne qui l'annonce : un toucher le rouvre, et le
// bouton « Tout afficher » rend le livre tel qu'il est imprimé. Les sections se chargent à la demande et se gardent en cache : « Télécharger »
// les prend toutes, pour prier sans réseau.
// Tout ce qui vient des données passe par des nœuds DOM construits un à un (createTextNode, createElement), jamais par du HTML.
// Contenu halakhique **à relire par une personne compétente**.

const SD_PREFS_KEY = 'siddurPrefs';
const SD_DATA = 'data/siddur/';
// Chaque rite a son siddour : séfarade = Edot HaMizrach (data/siddur/), ashkénaze = Siddur Ashkenaz (data/siddur/ashkenaz/, scripts/build_siddur_ashkenaz.js),
// 'Habad = Tehilat Hachem (data/siddur/habad/, scripts/build_siddur_habad.js). Ce que le siddour d'un rite n'a pas (Chabbat de 'Habad, zemirot, Pourim…) est repris
// du siddour d'Edot HaMizrach : ces sections portent `from: 'sefarade'` dans l'index (scripts/merge_siddur_fallback.js) et se lisent dans data/siddur/.
const SD_DATA_RITES = { habad: SD_DATA + 'habad/', ashkenaze: SD_DATA + 'ashkenaz/' };
function sdBase() { const r = typeof riteFull === 'function' ? riteFull() : 'sefarade'; return SD_DATA_RITES[r] || SD_DATA; }
// Le dossier où lire une section (ou sa traduction) : celui du rite, sauf pour une section reprise du siddour séfarade.
let sdFromSefarade = new Set();
function sdBaseOf(id) { return sdFromSefarade.has(id) ? SD_DATA : sdBase(); }
let sdIndexBase = null;     // le dossier dont vient sdIndex

let sdIndex = null;
const sdCache = {};
// v : version des réglages. En v2, la police par défaut passe de Noto Serif à Frank Ruhl Libre (la seule à avoir un vrai gras) ;
// un « noto-serif » enregistré avant la v2 n'était que l'ancien défaut, pas un choix : il est remplacé.
let sdPrefs = { v: 2, size: 2, niqqud: true, all: false, fr: false, font: 'frank', heRub: false, jx: true, name: 'adonai', fab: true, hideOff: false, zim: 3, zimForm: 'a', zimWed: false, zimWho: {}, zimCohen: 'one', zimHost: 'm' };
// Polices livrées avec leurs vraies graisses (fonts.css) : le gras y est dessiné par la police, pas simulé par un contour.
const SD_REAL_BOLD = ['frank'];
let sdView = { mode: 'home', ids: [], title: '' };
let sdPlace = null;
let sdCtx = null;
// Une ouverture demandée par un autre écran (l'accueil) : { group } ou { ids, title }, exécutée dès que l'index du siddour est chargé.
let sdPending = null;
let sdDirectBack = false;    // ouvert depuis l'écran Bénédictions d'Explorer : le retour de la lecture ramène directement là-bas, sans passer par l'accueil du siddour
const sdOrigText = new WeakMap();   // le texte d'origine (avec voyelles) de chaque nœud de texte du lecteur
let sdSheetEl = null;               // la feuille ouverte (sommaire, affichage, rayon…), s'il y en a une
let sdRestoreTop = null;
let sdShabbatNote = '';             // « Variantes du Chabbat du … » quand on lit un texte de Chabbat un autre jour            // la position de lecture à retrouver après un nouveau rendu
const SD_LAST_KEY = 'siddurLast';

const SD_SIZES = [18, 20, 23, 27, 32];
// Les groupes du parcours rapide (le texte du jour), dans l'ordre de la journée.
const SD_PRAYERS = ['chacharit', 'minha', 'arvit'];

// Les polices sont celles du Tikkoun (TORAH_READER_FONTS, js/app/torah-reader.js) : un seul registre, une seule liste.
function sdFontById(id) {
    return typeof TORAH_READER_FONTS !== 'undefined' ? TORAH_READER_FONTS.find(f => f.id === id) || null : null;
}
function sdFontStack() {
    const f = sdFontById(sdPrefs.font);
    return f ? f.stack : "'HX Torah', 'Noto Serif Hebrew', serif";
}
// Le contenu du lecteur reçoit la police, et dit si elle a un vrai gras (sinon style.css le simule).
function sdSetFont(content) {
    content.style.setProperty('--sd-font', sdFontStack());
    content.dataset.bold = SD_REAL_BOLD.indexOf(sdPrefs.font) >= 0 ? 'real' : 'faux';
}

function sdLoadPrefs() {
    try {
        const p = JSON.parse(localStorage.getItem(SD_PREFS_KEY) || '{}');
        if (Number.isInteger(p.size) && p.size >= 0 && p.size < SD_SIZES.length) sdPrefs.size = p.size;
        if (typeof p.niqqud === 'boolean') sdPrefs.niqqud = p.niqqud;
        if (typeof p.all === 'boolean') sdPrefs.all = p.all;
        if (typeof p.fr === 'boolean') sdPrefs.fr = p.fr;
        if (typeof p.heRub === 'boolean') sdPrefs.heRub = p.heRub;
        if (typeof p.jx === 'boolean') sdPrefs.jx = p.jx;
        if (typeof p.fab === 'boolean') sdPrefs.fab = p.fab;
        if (typeof p.hideOff === 'boolean') sdPrefs.hideOff = p.hideOff;
        if (p.guest && typeof p.guest === 'object') sdPrefs.guest = p.guest;
        if (p.zim === 1 || p.zim === 3 || p.zim === 10) sdPrefs.zim = p.zim;
        if (p.zimForm === 'a' || p.zimForm === 'b') sdPrefs.zimForm = p.zimForm;
        if (typeof p.zimWed === 'boolean') sdPrefs.zimWed = p.zimWed;
        if (p.zimWho && typeof p.zimWho === 'object') Object.keys(SD_ZIM_WHO).concat('meCohen').forEach(k => { if (p.zimWho[k] === true) sdPrefs.zimWho[k] = true; });
        if (p.zimCohen === 'one' || p.zimCohen === 'many') sdPrefs.zimCohen = p.zimCohen;
        if (p.zimHost === 'm' || p.zimHost === 'f') sdPrefs.zimHost = p.zimHost;
        if (p.zimWho && p.zimWho.cohanim === true) { sdPrefs.zimWho.cohen = true; sdPrefs.zimCohen = 'many'; }      // anciennes cases séparées
        if (p.zimWho && p.zimWho.bhf === true) { sdPrefs.zimWho.bh = true; sdPrefs.zimHost = 'f'; }
        if (p.name === 'source' || p.name === 'adonai') sdPrefs.name = p.name;
        if (typeof p.font === 'string' && sdFontById(p.font) && (p.v >= 2 || p.font !== 'noto-serif')) sdPrefs.font = p.font;
    } catch (e) { /* stockage indisponible : réglages par défaut */ }
}
function sdSavePrefs() {
    try { localStorage.setItem(SD_PREFS_KEY, JSON.stringify(sdPrefs)); } catch (e) { /* idem */ }
}

function sdEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

// --- Le jour et le lieu ------------------------------------------------------------------------------------------------------------------
function sdReadPlace() {
    try { return ZmanimCore.normalizePlace(JSON.parse(localStorage.getItem('zmanimPlace') || 'null')); } catch (e) { return null; }
}

// Le contexte du jour hébraïque : celui du lieu de Zmanim ; sans lieu, le jour civil de l'appareil (diaspora), et l'écran le dit.
function sdComputeContext() {
    sdPlace = sdReadPlace();
    const now = Date.now();
    let fixed, israel = false;
    if (sdPlace) {
        fixed = SiddurCore.hebrewDayFixed(sdPlace, now, {});
        israel = profileIsrael(sdPlace);
    } else {
        israel = profileIsrael(null);   // sans lieu : le domicile, s'il est choisi
        const d = new Date(now);
        fixed = CalendarYearCore.gregorianToFixed(d.getFullYear(), d.getMonth() + 1, d.getDate());
    }
    sdCtx = SiddurCore.contextFor(fixed, israel);
    return sdCtx;
}

// La prière à dire maintenant : avant Minha Guedola Chaharit, jusqu'à la sortie des étoiles Minha, ensuite Arvit (après minuit jusqu'à l'aube : Arvit).
function sdCurrentPrayer() {
    if (!sdPlace) return null;
    const now = Date.now();
    const d = ZmanimCore.civilDateOf(sdPlace.tz, now);
    const z = ZmanimCore.zmanim(sdPlace, d.year, d.month, d.day, {});
    const r = (k) => ZmanimCore.rounded(z, k);
    if (r('alot') !== null && now < r('alot')) return 'arvit';
    if (r('minchaGedola') !== null && now < r('minchaGedola')) return 'chacharit';
    if (r('shkia') !== null && now < r('shkia')) return 'minha';
    return 'arvit';
}

// Entre la chkia et la sortie des étoiles : c'est déjà l'heure d'Arvit, mais le jour hébraïque (donc le contexte) n'a pas encore changé.
function sdBetweenShkiaAndTzeit() {
    if (!sdPlace) return false;
    const now = Date.now();
    const d = ZmanimCore.civilDateOf(sdPlace.tz, now);
    const z = ZmanimCore.zmanim(sdPlace, d.year, d.month, d.day, {});
    const shkia = ZmanimCore.rounded(z, 'shkia'), tzeit = ZmanimCore.rounded(z, 'tzeit');
    return shkia !== null && now >= shkia && (tzeit === null || now < tzeit);
}

// --- Chargement --------------------------------------------------------------------------------------------------------------------------
function sdFetchJson(url) {
    return fetch(url).then(res => { if (!res.ok) throw new Error('http ' + res.status); return res.json(); });
}
function sdLoadIndex() {
    if (sdIndex) return Promise.resolve(sdIndex);
    const base = sdBase();
    return sdFetchJson(base + 'index.json').then(index => { sdIndex = index; sdIndexBase = base; sdFromSefarade = new Set(); index.groups.forEach(g => g.sections.forEach(x => { if (x.from) sdFromSefarade.add(x.id); })); sdApplyRite(); return index; });
}
function sdLoadSection(id) {
    const base = sdBaseOf(id);
    if (sdCache[base + id]) return Promise.resolve(sdCache[base + id]);
    return sdFetchJson(base + id + '.json').then(section => { sdCache[base + id] = section; return section; });
}
// La traduction française d'une section (facultative) : { indice : [empreinte, texte] }, ou null s'il n'y en a pas.
const sdFrCache = {};
function sdLoadFr(id) {
    const base = sdBaseOf(id);
    if ((base + id) in sdFrCache) return Promise.resolve(sdFrCache[base + id]);
    // Les siddourim ashkénaze et 'Habad n'ont pas (encore) de traduction française : le fichier manque, la section s'affiche en hébreu seul.
    return sdFetchJson(base + 'fr/' + id + '.json').then(d => d.t || null).catch(() => null).then(t => { sdFrCache[base + id] = t; return t; });
}
function sdFindSection(id) {
    for (const g of sdIndex.groups) for (const s of g.sections) if (s.id === id) return { group: g, section: s };
    for (const h of sdRiteHidden) if (h.section.id === id) return h;      // la version d'un autre rite (ouverte depuis l'écran Bénédictions)
    return null;
}

// --- Un seul Birkat haMazon et une seule Méeïn chalosh : ceux du rite choisi dans les Réglages (js/app/settings.js, riteFull) ----------
// Le livre en a trois versions (séfarade, ashkénaze, nusach Sefard de 'Habad) : on n'en montre qu'une, sous un nom simple. Les autres restent
// ouvrables par leur identifiant (sdFindSection), sans apparaître dans les listes.
const SD_RITE_FAMILIES = [
    { fr: 'Birkat haMazon', ids: { sefarade: 'birkat-hamazon', ashkenaze: 'birkat-hamazon-ashkenaze', habad: 'birkat-hamazon-habad' } },
    { fr: 'Bérakha Méeïn chalosh (Al haMih\'ya, Al haGuéfen, Al haEts)', ids: { sefarade: 'al-hamihya', ashkenaze: 'al-hamihya-ashkenaze', habad: 'al-hamihya-ashkenaze' } }
];
let sdRiteHidden = [];
let sdRiteOrig = null;            // les sections d'origine des groupes concernés : { groupId: [sections] }
function sdRite() { return typeof riteFull === 'function' ? riteFull() : 'sefarade'; }
function sdRiteFamily(id) { return SD_RITE_FAMILIES.find(f => Object.keys(f.ids).some(r => f.ids[r] === id)) || null; }
// L'identifiant à ouvrir dans le rite choisi (un texte sans versions : lui-même).
function sdRiteId(id) { const f = sdRiteFamily(id); return f ? f.ids[sdRite()] || id : id; }
function sdApplyRite() {
    if (!sdIndex) return;
    // Passage vers ou depuis 'Habad : on recharge le siddour du nouveau rite.
    if (sdIndexBase !== sdBase()) { sdIndex = null; sdIndexBase = null; sdRiteOrig = null; sdRiteHidden = []; sdPrecacheStarted = false; sdLoadIndex().catch(() => {}); return; }
    if (!sdRiteOrig) {
        sdRiteOrig = {};
        sdIndex.groups.forEach(g => { if (g.sections.some(x => sdRiteFamily(x.id))) sdRiteOrig[g.id] = g.sections.map(x => Object.assign({}, x)); });
    }
    sdRiteHidden = [];
    sdIndex.groups.forEach(g => {
        const orig = sdRiteOrig[g.id];
        if (!orig) return;
        const seen = new Set();
        g.sections = [];
        orig.forEach(sec => {
            const f = sdRiteFamily(sec.id);
            if (!f) { g.sections.push(sec); return; }
            const want = f.ids[sdRite()];
            if (sec.id === want && !seen.has(f)) { seen.add(f); g.sections.push(Object.assign({}, sec, { fr: f.fr })); }
            else if (sec.id !== want) sdRiteHidden.push({ group: g, section: sec });
        });
        // une famille dont la version du rite vient plus loin dans le livre : à la place de la première
        SD_RITE_FAMILIES.forEach(f => { if (!seen.has(f)) { const sec = orig.find(x => x.id === f.ids[sdRite()]); if (sec) g.sections.push(Object.assign({}, sec, { fr: f.fr })); } });
    });
    if (typeof sdView !== 'undefined' && sdView.mode === 'home' && toolEl('screen-tool-siddur') && !toolEl('screen-tool-siddur').classList.contains('hidden')) sdRender();
}

// Garde tout le siddour (et ses traductions) pour prier sans réseau, sans rien demander : au premier affichage de la séance, en arrière-plan. Le service worker (sw.js)
// range déjà chaque fichier lu ; il range ici ceux qu'on n'a pas lus, et seulement ceux-là. Rien n'est noté de plus : c'est lui qui sait ce qu'il garde. Sans service
// worker (iOS : tout est dans le paquet ; navigateur qui n'en a pas), il n'y a rien à faire et rien n'est promis.
let sdPrecacheStarted = false;
function sdPrecache() {
    if (sdPrecacheStarted || typeof TorahOffline === 'undefined' || !TorahOffline.enabled()) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    sdPrecacheStarted = true;
    try { localStorage.removeItem('siddurOffline'); } catch (e) { /* l'ancien drapeau « prêt hors-ligne », qui ne prouvait rien */ }
    // Toutes les sections, y compris les versions des autres rites (ouvertes depuis l'écran Bénédictions), et les petits fichiers dont le lecteur a besoin.
    const base = sdBase();
    const urls = [base + 'index.json', SD_DATA + 'interruptions.json', 'data/torah/weekday.json', 'data/torah/parashot.json'];
    sdIndex.groups.forEach(g => g.sections.forEach(s => urls.push(sdBaseOf(s.id) + s.id + '.json')));
    sdRiteHidden.forEach(h => urls.push(sdBaseOf(h.section.id) + h.section.id + '.json'));
    // Les traductions françaises : celles du siddour du rite (fr/ dans son dossier), et celles d'Edot HaMizrach pour le rite séfarade et pour les sections reprises de lui.
    const frIndex = dir => sdFetchJson(dir + 'fr/index.json').catch(() => ({})).then(idx => ({ dir, ids: Object.keys((idx && idx.sections) || {}) }));
    const dirs = base === SD_DATA ? [SD_DATA] : [base, SD_DATA];
    dirs.forEach(d => urls.push(d + 'fr/index.json'));
    Promise.all(dirs.map(frIndex))
        .then(list => list.forEach(x => x.ids.forEach(id => { if (x.dir === base || sdFromSefarade.has(id)) urls.push(x.dir + 'fr/' + id + '.json'); })))
        .then(() => TorahOffline.precache(urls))
        .then(r => { if (!r || r.failed) sdPrecacheStarted = false; });   // interrompu ou hors réseau : on réessaiera à la prochaine ouverture
}

// --- Les rayons ----------------------------------------------------------------------------------------------------------------------------------
// Le livre est rangé en six rayons. Chaque ligne ouvre une prière entière (`group`), une section ou une suite de sections (`ids`).
// `key` identifie la ligne (raccourcis épinglés, saison) ; `he` est le mot de la ligne. Le rayon Chabbat attend son contenu : `soon` dit ce qui viendra.
const SD_RAYONS = [
    { id: 'semaine', he: 'יום חול', fr: 'Semaine', rows: [
        { key: 'g:reveil', he: 'השכמה', group: 'reveil' },
        { key: 'g:chacharit', he: 'שחרית', group: 'chacharit' },
        { key: 'g:minha', he: 'מנחה', group: 'minha' },
        { key: 'g:arvit', he: 'ערבית', group: 'arvit' },
        { key: 's:chema-coucher', he: 'על המיטה', ids: ['chema-coucher'] },
        { key: 'g:hatsot', he: 'חצות', group: 'hatsot' }
    ] },
    { id: 'chabbat', he: 'שבת', fr: 'Chabbat', rows: [
        { key: 'g:chabbat-accueil', he: 'קבלת שבת', group: 'chabbat-accueil' },
        { key: 'g:chabbat-arvit', he: 'ערבית', group: 'chabbat-arvit' },
        { key: 'g:chabbat-soir', he: 'קידוש', group: 'chabbat-soir' },
        { key: 'g:chabbat-chacharit', he: 'שחרית', group: 'chabbat-chacharit' },
        { key: 'g:chabbat-moussaf', he: 'מוסף', group: 'chabbat-moussaf' },
        { key: 'g:chabbat-seouda-2', he: 'סעודה', group: 'chabbat-seouda-2' },
        { key: 'g:chabbat-minha', he: 'מנחה', group: 'chabbat-minha' },
        { key: 'g:chabbat-seouda-3', he: 'שלישית', group: 'chabbat-seouda-3' },
        { key: 'g:motsei-chabbat', he: 'הבדלה', group: 'motsei-chabbat' },
        { key: 'g:zemirot-chabbat', he: 'זמירות', group: 'zemirot-chabbat', recueil: true, unit: 'chants, du vendredi soir au samedi soir : choisissez le moment' },
        { key: 'g:michnayot-chabbat', he: 'משניות', group: 'michnayot-chabbat' },
        { key: 'g:pirkei-avot', he: 'אבות', group: 'pirkei-avot' }
    ] },
    { id: 'fetes', he: 'מועדים', fr: 'Fêtes', rows: [
        { key: 'g:roch-hodech', he: 'ראש חודש', group: 'roch-hodech' },
        { key: 'g:regalim', he: 'שלוש רגלים', group: 'regalim' },
        { key: 'g:hol-hamoed', he: 'חול המועד', group: 'hol-hamoed' },
        { key: 'x:hanouka', he: 'חנוכה', title: 'Hanouka', ids: ['hanouka-allumage', 'hanouka-maoz-tsour', 'hanouka-chacharit', 'hanouka-zemer-chabbat'] },
        { key: 'x:pourim', he: 'פורים', title: 'Pourim', ids: ['pourim-zakhor', 'pourim-meguila', 'pourim-chochanat-yaakov', 'pourim-jour', 'pourim-qerovets'] },
        { key: 't:esther', he: 'אסתר', tanakh: 'esther', title: 'Méguilat Esther', desc: 'Dans le Tanakh : le texte, la traduction française, les résumés et le défilement automatique' },
        { key: 'x:nissan', he: 'ניסן', title: 'Nissan', ids: ['nissan-ilanot', 'nissan-etude'] },
        { key: 's:omer', he: 'עומר', ids: ['omer'] }
    ] },
    { id: 'jeunes', he: 'תעניות', fr: 'Jeûnes', rows: [
        { key: 'x:selihot', he: 'סליחות', title: 'Sélihot des jeûnes', ids: ['jeune-guedalia', 'jeune-tevet', 'jeune-esther', 'jeune-tamouz'] },
        { key: 's:jeune-tora', he: 'קריאה', ids: ['jeune-tora'] },
        { key: 's:selihot-generales', he: 'סליחות', ids: ['selihot-generales'] },
        { key: 't:eikha', he: 'איכה', tanakh: 'lamentations', title: 'Méguilat Eikha (Tich\'a beAv)', desc: 'Dans le Tanakh : le texte, la traduction française, les résumés et le défilement automatique' },
        { key: 's:deuil', he: 'אבל', ids: ['deuil'] }
    ] },
    { id: 'benedictions', he: 'ברכות', fr: 'Bénédictions', rows: [
        { key: 's:birkat-hamazon', he: 'ברכת המזון', ids: ['birkat-hamazon'] },
        { key: 's:al-hamihya', he: 'מעין שלוש', ids: ['al-hamihya'] },
        { key: 's:birkhot-hanehenin', he: 'ברכות הנהנין', ids: ['birkhot-hanehenin'] },
        { key: 's:birkat-halevana', he: 'קידוש לבנה', ids: ['birkat-halevana'] },
        { key: 's:tefilat-haderekh', he: 'תפילת הדרך', ids: ['tefilat-haderekh'] },
        { key: 's:mezouza', he: 'מזוזה', ids: ['mezouza'] },
        { key: 's:maake', he: 'מעקה', ids: ['maake'] },
        { key: 's:hala', he: 'חלה', ids: ['hala'] },
        { key: 's:tevilat-kelim', he: 'טבילת כלים', ids: ['tevilat-kelim'] },
        { key: 's:terouma-maasser', he: 'תרומות', ids: ['terouma-maasser'] },
        { key: 's:arc-en-ciel', he: 'קשת', ids: ['arc-en-ciel'] },
        { key: 's:eclairs-tonnerre', he: 'ברקים', ids: ['eclairs-tonnerre'] },
        { key: 's:birkhot-hareiyot', he: 'ברכות הראייה', ids: ['birkhot-hareiyot'] },
        { key: 's:birkhot-hareach', he: 'ברכות הריח', ids: ['birkhot-hareach'] },
        { key: 's:dayan-haemet', he: 'דיין האמת', ids: ['dayan-haemet'] },
        { key: 's:chehehyanou', he: 'שהחיינו', ids: ['chehehyanou'] },
        { key: 's:remede', he: 'רפואה', ids: ['remede'] }
    ] },
    { id: 'vie', he: 'שמחות', fr: 'Vie', rows: [
        { key: 's:fiancailles', he: 'אירוסין', ids: ['fiancailles'] },
        { key: 's:cheva-berakhot', he: 'שבע ברכות', ids: ['cheva-berakhot'] },
        { key: 's:brit-mila', he: 'ברית מילה', ids: ['brit-mila'] },
        { key: 's:pidyon-haben', he: 'פדיון הבן', ids: ['pidyon-haben'] }
    ] }
];
const SD_DEFAULT_PINS = ['s:birkat-hamazon', 's:chema-coucher'];
const SD_PINS_KEY = 'siddurPins';
const SD_MAX_PINS = 6;
const SD_HE_PRAYER = { chacharit: 'שחרית', minha: 'מנחה', arvit: 'ערבית' };
// Les groupes de Chabbat : leurs variantes se calculent pour le Chabbat concerné (celui d'aujourd'hui, ou le prochain), pas pour le jour de la semaine où l'on ouvre le livre.
const SD_SHABBAT_GROUPS = ['chabbat-accueil', 'chabbat-arvit', 'chabbat-soir', 'chabbat-chacharit', 'chabbat-moussaf', 'chabbat-seouda-2', 'chabbat-minha', 'chabbat-seouda-3', 'motsei-chabbat'];

const SD_SHABBAT_SECTIONS = ['pourim-zakhor'];    // un texte de Chabbat rangé dans un autre groupe
function sdIsShabbatSection(id) {
    const f = sdIndex ? sdFindSection(id) : null;
    return !!f && (SD_SHABBAT_GROUPS.indexOf(f.group.id) !== -1 || SD_SHABBAT_SECTIONS.indexOf(id) !== -1);
}

// Le jour civil de l'appareil ou du lieu (fixe).
function sdCivilFixed() {
    const now = Date.now();
    const d = sdPlace ? ZmanimCore.civilDateOf(sdPlace.tz, now) : { year: new Date(now).getFullYear(), month: new Date(now).getMonth() + 1, day: new Date(now).getDate() };
    return CalendarYearCore.gregorianToFixed(d.year, d.month, d.day);
}

// Le contexte du Chabbat concerné : aujourd'hui s'il est Chabbat ; le vendredi, le soir qui vient ; le samedi soir (déjà dimanche pour le calendrier), le Chabbat qui finit ;
// sinon le prochain Chabbat. Même jour hébraïque que les autres écrans, jamais celui d'un jour de semaine pour un texte de Chabbat.
function sdShabbatContext(ctx) {
    const wd = HebrewCalendarCore.weekdayOf(ctx.fixed);
    let fixed = ctx.fixed;
    if (wd === 6) return ctx;
    if (wd === 0 && sdCivilFixed() === ctx.fixed - 1) fixed = ctx.fixed - 1;      // samedi soir, après la sortie des étoiles
    else fixed = ctx.fixed + (6 - wd);
    return SiddurCore.contextFor(fixed, ctx.israel);
}

// L'office à dire maintenant. En semaine : Cha'harit, Min'ha ou Arvit. Le Chabbat (jour hébraïque, du vendredi soir au samedi avant la nuit) : ceux de Chabbat.
// { base (chacharit | minha | arvit : pour les horaires), group (le groupe du siddour), title, he, shabbat }, ou null sans lieu.
// Le service de Chabbat. Un Chabbat d'occasion (Roch 'Hodech, Hanouka, 'Hol haMoed), le nom sur plusieurs lignes : « Chaharit de » / « Chabbat » / « Hanouka ».
function sdShabbatService(base, group, fr, he) {
    const svc = { base: base, group: group, title: fr + ' de Chabbat', he: he, shabbat: true };
    const occ = SiddurCore.shabbatOccasionsOf(sdShabbatContext(sdCtx));
    if (occ.length) {
        const lines = sdOccasionLines(base, occ, true);
        svc.title += ' (' + sdOccasionNames(occ).join(' ' + t('tools.sd_occ_and') + ' ') + ')';
        svc.titleLines = lines.fr;
        svc.heLines = lines.he;
        svc.he = lines.he.join(' ');
    }
    return svc;
}

function sdCurrentService() {
    const base = sdPlace ? sdCurrentPrayer() : null;
    if (!base) return null;
    if (base === 'arvit' && !sdCtx.flags.yomTov && sdBetweenShkiaAndTzeit()) {
        // vendredi après la chkia : l'office du soir de Chabbat ; samedi après la chkia : Arvit de semaine (Chabbat finit à la sortie des étoiles)
        if (HebrewCalendarCore.weekdayOf(sdCtx.fixed) === 5) return sdShabbatService(base, 'chabbat-arvit', 'Arvit', 'ערבית');
        if (sdCtx.flags.shabbat) return { base: base, group: 'arvit', title: t('tools.sd_p_arvit'), he: SD_HE_PRAYER.arvit, shabbat: false };
    }
    if (sdCtx.flags.shabbat && !sdCtx.flags.yomTov) {
        const map = { chacharit: ['chabbat-chacharit', 'Cha\'harit', 'שחרית'], minha: ['chabbat-minha', 'Min\'ha', 'מנחה'], arvit: ['chabbat-arvit', 'Arvit', 'ערבית'] };
        return sdShabbatService(base, map[base][0], map[base][1], map[base][2]);
    }
    const occ = SiddurCore.occasionsOf(sdCtx);
    const svc = { base: base, group: base, title: t('tools.sd_p_' + base), he: SD_HE_PRAYER[base], shabbat: false, occasions: occ };
    // Un jour d'occasion : le nom sur plusieurs lignes, en français (« Chaharit de » / « Roch 'Hodech ») comme en hébreu (« שחרית של » / « ראש חודש »).
    if (occ.length) {
        const lines = sdOccasionLines(base, occ);
        svc.title += ' de\u00a0' + sdOccasionNames(occ).join(' ' + t('tools.sd_occ_and') + ' ');
        svc.titleLines = lines.fr;
        svc.heLines = lines.he;
        svc.he = lines.he.join(' ');
    }
    return svc;
}

function sdCleanTitle(fr) { return fr.replace(/ \(jours de semaine\)/, ''); }

// Une ligne de rayon, complétée d'après l'index : { key, he, title, ids, desc }.
function sdRowInfo(row) {
    // Une ligne qui renvoie au Tanakh (les méguilot : leur texte n'est pas recopié dans le siddour, il y est complet).
    if (row.tanakh) return { key: row.key, he: row.he, title: row.title, ids: [], tanakh: row.tanakh, desc: row.desc || '' };
    if (row.group) {
        const g = sdIndex.groups.filter(x => x.id === row.group)[0];
        if (!g) return null;
        return { key: row.key, he: row.he, title: sdCleanTitle(g.fr), ids: g.sections.map(x => x.id), recueil: !!row.recueil, desc: row.unit ? g.sections.length + ' ' + row.unit : g.sections.length > 1 ? g.sections.length + ' parties : tout lire d\'un trait, ou partie par partie' : '', group: g.id };
    }
    const ids = row.ids.map(sdRiteId);
    const found = ids.map(sdFindSection).filter(Boolean);
    if (!found.length) return null;
    const title = row.title || found[0].section.fr;
    return { key: row.key, he: row.he, title: title, ids: ids, desc: row.ids.length > 1 ? row.ids.length + ' textes' : '' };
}
function sdAllRows() {
    const out = [];
    SD_RAYONS.forEach(r => (r.rows || []).forEach(row => { const info = sdRowInfo(row); if (info) out.push(Object.assign(info, { rayon: r.fr })); }));
    return out;
}
function sdRowByKey(key) { return sdAllRows().filter(r => r.key === key)[0] || null; }

function sdLoadPins() {
    try {
        const v = JSON.parse(localStorage.getItem(SD_PINS_KEY) || 'null');
        if (Array.isArray(v)) return v.filter(k => typeof k === 'string').slice(0, SD_MAX_PINS);
    } catch (e) { /* stockage indisponible : raccourcis par défaut */ }
    return SD_DEFAULT_PINS.slice();
}
function sdSavePins(pins) {
    try { localStorage.setItem(SD_PINS_KEY, JSON.stringify(pins)); } catch (e) { /* valable pour cette séance */ }
}

// Ce qui est de saison aujourd'hui, ou le sera bientôt : [{ ...ligne, desc }]. Le jour hébraïque vient du lieu de l'écran Zmanim.
function sdSeasonItems(ctx) {
    const out = [];
    const f = ctx.flags, h = ctx.hebrew;
    const add = (key, desc, ids) => {
        const row = sdRowByKey(key);
        if (!row) return;
        out.push(Object.assign({}, row, { desc: desc }, ids ? { ids: ids } : {}));
    };
    const daysTo = (month, day) => CalendarYearCore.hebrewToFixed(h.year, month, day) - ctx.fixed;
    // Le vendredi avant l'allumage, puis le samedi soir : l'accueil et la sortie de Chabbat
    const civil = sdCivilFixed();
    const civilWeekday = HebrewCalendarCore.weekdayOf(civil);
    if (!f.yomTov && civilWeekday === 5 && !f.shabbat) {
        let when = '';
        if (sdPlace) {
            const d = ZmanimCore.civilDateOf(sdPlace.tz, Date.now());
            const s = ZmanimCore.shabbatOf(sdPlace, d.year, d.month, d.day, zmStoredOpts());
            if (s && s.candles !== null) when = 'Bougies à ' + ZmanimCore.formatTime(s.candles, sdPlace.tz, 'fr') + ' : ';
        }
        add('g:chabbat-accueil', when + 'bougies, Kabbalat Chabbat');
    }
    if (!f.yomTov && civilWeekday === 6 && ctx.weekday === 0) add('g:motsei-chabbat', 'Havdala et prières du samedi soir');
    if (ctx.omer > 0) add('s:omer', t('tools.sd_note_omer', { n: ctx.omer }));
    if (f.rc) add('g:roch-hodech', 'C\'est Roch \'Hodesh : Hallel, Moussaf, Barkhi nafchi…');
    if (f.ch) add('g:hol-hamoed', 'Hallel et Moussaf');
    const fastIds = { guedalia: 'jeune-guedalia', tevet10: 'jeune-tevet', esther: 'jeune-esther', tamouz17: 'jeune-tamouz' };
    if (ctx.fast && fastIds[ctx.fast]) add('x:selihot', 'Sélihot du jeûne d\'aujourd\'hui', [fastIds[ctx.fast]]);
    if (f.hanukkah) add('x:hanouka', 'Pendant Hanouka : l\'allumage, Al hanissim, Hallel');
    else { const d = daysTo('Kislev', 25); if (d > 0 && d <= 14) add('x:hanouka', d === 1 ? 'Demain soir' : 'Dans ' + d + ' jours'); }
    const purimMonth = HebrewCalendarCore.leap(h.year) ? 'AdarII' : 'Adar';
    if (f.purim) { add('x:pourim', 'C\'est Pourim'); add('t:esther', 'Le texte de la Méguila, dans le Tanakh'); }
    else { const d = daysTo(purimMonth, 14); if (d > 0 && d <= 14) add('x:pourim', d === 1 ? 'Demain' : 'Dans ' + d + ' jours'); }
    if (h.month === 'Nisan') add('x:nissan', 'Birkat haIlanot, le mois de Nissan');
    if (h.month === 'Elul' || (h.month === 'Tishri' && h.day <= 10)) add('s:selihot-generales', 'De Roch \'Hodesh Elloul à Yom Kippour');
    if (f.tishaBav) add('t:eikha', 'Lue le soir de Tich\'a beAv, dans le Tanakh');
    // Les trois fêtes : pendant la fête, ou dans les quinze jours qui la précèdent
    const next = (month, day, year) => CalendarYearCore.hebrewToFixed(year === undefined ? h.year : year, month, day) - ctx.fixed;
    const toTishri = h.month === 'Elul' ? next('Tishri', 15, h.year + 1) : next('Tishri', 15);
    const festival = f.pesach ? 'Pessa\'h' : f.sukkot || f.shemini ? 'Souccot' : f.shavuot ? 'Chavouot' : '';
    const upcoming = [['Pessa\'h', next('Nisan', 15)], ['Chavouot', next('Sivan', 6)], ['Souccot', toTishri]].filter(x => x[1] > 0 && x[1] <= 15)[0];
    if (festival) add('g:regalim', 'Amida, Moussaf et mizmorim : ' + festival);
    else if (upcoming) add('g:regalim', upcoming[0] + (upcoming[1] === 1 ? ' : demain' : ' : dans ' + upcoming[1] + ' jours'));
    const lev = sdPlace ? zmLevanaInfo(sdPlace, ZmanimCore.civilDateOf(sdPlace.tz, Date.now()), h, zmStoredOpts()) : null;
    if (lev) add('s:birkat-halevana', lev);
    return out;
}

// --- Les feuilles (sommaire, affichage, rayons, raccourcis) ----------------------------------------------------------------------------------
function sdCloseSheet() {
    if (sdSheetEl) { sdSheetEl.remove(); sdSheetEl = null; }
}

function sdSheet(title, build) {
    sdCloseSheet();
    const scrim = sdEl('div', 'sd-scrim');
    scrim.onclick = (e) => { if (e.target === scrim) sdCloseSheet(); };
    const sheet = sdEl('div', 'sd-sheet');
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', title);
    const head = sdEl('div', 'sd-sheet-head');
    head.appendChild(sdEl('h3', 'sd-sheet-title', title));
    const close = sdEl('button', 'sd-sheet-close', '✕');
    close.type = 'button';
    close.setAttribute('aria-label', 'Fermer');
    close.onclick = sdCloseSheet;
    head.appendChild(close);
    sheet.appendChild(head);
    const content = sdEl('div', 'sd-sheet-body');
    build(content);
    sheet.appendChild(content);
    scrim.appendChild(sheet);
    toolEl('screen-tool-siddur').appendChild(scrim);
    sdSheetEl = scrim;
    close.focus();
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sdSheetEl) sdCloseSheet(); });

// Une ligne de liste (mot hébreu, titre, explication) ; `onclick` ouvre.
function sdRowButton(info, onclick, extra) {
    const b = sdEl('button', 'home-row');
    b.type = 'button';
    const he = sdEl('span', 'he', info.he);
    he.lang = 'he'; he.dir = 'rtl';
    const text = sdEl('span');
    text.appendChild(sdEl('span', 'fr', info.title));
    if (info.desc) text.appendChild(sdEl('span', 'desc', info.desc));
    b.appendChild(he);
    b.appendChild(text);
    b.appendChild(sdEl('span', 'chev', extra || '›'));
    b.onclick = onclick;
    return b;
}

function sdOpenRow(info) {
    sdCloseSheet();
    if (info.recueil) { sdOpenZemirot(); return; }
    if (info.tanakh) { toolReturns.tanakh = 'screen-tool-siddur'; tanakhOpenAt(info.tanakh, 0, 'both'); return; }
    sdOpen(info.ids, info.title);
}

function sdOpenRayon(rayon) {
    if (rayon.soon) {
        sdSheet(rayon.fr, (body) => { body.appendChild(sdEl('p', 'sd-soon', rayon.soon)); });
        return;
    }
    sdSheet(rayon.fr, (body) => {
        const list = sdEl('div', 'home-rows');
        rayon.rows.forEach(row => { const info = sdRowInfo(row); if (info) list.appendChild(sdRowButton(info, () => sdOpenRow(info))); });
        body.appendChild(list);
    });
}

// --- Le recueil des zemirot : quatre onglets (vendredi soir, samedi matin, samedi après-midi, samedi soir) ---------------------------------------
const SD_MOMENTS = [['soir', 'Vendredi soir'], ['matin', 'Samedi matin'], ['apres-midi', 'Samedi après-midi'], ['motsei', 'Samedi soir']];

// L'onglet du moment : le vendredi soir, le samedi matin, l'après-midi, ou le samedi soir ; sinon le vendredi soir.
function sdDefaultMoment() {
    if (sdPlace && sdCtx) {
        if (sdCtx.weekday === 0 && sdCivilFixed() === sdCtx.fixed - 1) return 'motsei';
        const s = sdCurrentService();
        if (s && s.shabbat) return s.base === 'chacharit' ? 'matin' : s.base === 'minha' ? 'apres-midi' : 'soir';
    }
    return 'soir';
}

// `current` : l'identifiant du chant en cours de lecture (mis en valeur), s'il y en a un.
function sdOpenZemirot(tab, current) {
    const group = sdIndex.groups.filter(g => g.id === 'zemirot-chabbat')[0];
    if (!group) return;
    let active = tab || sdDefaultMoment();
    sdSheet('Recueil des zemirot de Chabbat', (body) => {
        const draw = () => {
            toolClear(body);
            const seg = sdEl('div', 'zm-seg sd-tabs');
            seg.setAttribute('role', 'tablist');
            seg.setAttribute('aria-label', 'Moment du chant');
            SD_MOMENTS.forEach(([id, label]) => {
                const n = group.sections.filter(s => (s.tab || 'soir') === id).length;
                const b = sdEl('button', 'zm-seg-btn' + (id === active ? ' is-on' : ''), label);
                b.type = 'button';
                b.id = 'sd-moment-' + id;
                b.setAttribute('role', 'tab');
                b.setAttribute('aria-selected', id === active ? 'true' : 'false');
                b.setAttribute('aria-label', label + ' : ' + n + ' chants');
                b.onclick = () => { active = id; draw(); };
                seg.appendChild(b);
            });
            body.appendChild(seg);
            const list = sdEl('div', 'home-rows');
            group.sections.filter(s => (s.tab || 'soir') === active).forEach(s => {
                const b = sdRowButton({ he: sdShortHe(s.he), title: s.fr, desc: s.id === current ? 'En cours de lecture' : '' }, () => { sdCloseSheet(); sdOpen([s.id], s.fr); });
                if (s.id === current) b.setAttribute('aria-current', 'true');
                list.appendChild(b);
            });
            body.appendChild(list);
        };
        draw();
    });
}

function sdOpenPins() {
    const draw = (body) => {
        toolClear(body);
        body.appendChild(sdEl('p', 'sd-sheet-note', 'Choisissez jusqu\'à ' + SD_MAX_PINS + ' textes à retrouver en un toucher sur l\'accueil.'));
        const pins = sdLoadPins();
        SD_RAYONS.filter(r => r.rows).forEach(r => {
            body.appendChild(sdEl('h4', 'sd-sheet-sub', r.fr));
            const list = sdEl('div', 'home-rows');
            r.rows.forEach(row => {
                const info = sdRowInfo(row);
                if (!info) return;
                const on = pins.indexOf(info.key) !== -1;
                const b = sdRowButton(info, () => {
                    const now = sdLoadPins();
                    const i = now.indexOf(info.key);
                    if (i !== -1) now.splice(i, 1);
                    else if (now.length < SD_MAX_PINS) now.push(info.key);
                    else { showToast('Vous pouvez épingler ' + SD_MAX_PINS + ' textes au plus.'); return; }
                    sdSavePins(now);
                    draw(body);
                    sdRefreshPinsOnHome();
                }, on ? '✓' : '');
                b.setAttribute('aria-pressed', on ? 'true' : 'false');
                list.appendChild(b);
            });
            body.appendChild(list);
        });
    };
    sdSheet('Mes raccourcis', draw);
}

// L'accueil derrière la feuille se met à jour (sans toucher à la position).
function sdRefreshPinsOnHome() {
    if (sdView.mode !== 'home') return;
    const top = toolEl('screen-tool-siddur').scrollTop;
    const sheet = sdSheetEl;
    sdRender();
    if (sheet) toolEl('screen-tool-siddur').appendChild(sheet);
    toolEl('screen-tool-siddur').scrollTop = top;
}

function sdOpenInfo() {
    sdSheet('À propos de ce siddour', (body) => {
        body.appendChild(sdEl('p', 'sd-info', t('tools.sd_intro')));
        body.appendChild(sdEl('p', 'sd-info', t('tools.sd_source', { edition: sdIndex ? sdIndex.edition : '' })));
        body.appendChild(sdEl('p', 'sd-info', t('tools.sd_disclaimer')));
    });
}

// --- Entrée de l'écran ---------------------------------------------------------------------------------------------------------------------
function toolSiddurInit() {
    sdDirectBack = false;
    sdLoadPrefs();
    sdCloseSheet();
    sdView = { mode: 'home', ids: [], title: '' };
    const body = toolEl('tool-siddur-body');
    toolClear(body);
    body.appendChild(sdEl('p', 'tool-small', t('tools.sd_loading')));
    sdBindScroll();
    sdLoadIndex().then(() => {
        const target = sdTakePending();
        if (target) sdView = { mode: 'reader', ids: target.ids, title: target.title, trim: target.trim || {} };
        sdRender();
        setTimeout(sdPrecache, 1500);
    }).catch(() => {
        toolClear(body);
        body.appendChild(sdEl('p', 'tool-msg', t('tools.sd_load_failed')));
    });
}

// Les occasions du jour (Roch 'Hodech, Hanouka, Pourim, 'Hol haMoed ; jamais Chabbat ni jour de fête), et leur nom en français et en hébreu.
function sdOccasions() { return SiddurCore.occasionsOf(sdComputeContext()); }
function sdOccasionNames(occ) { return occ.map(o => t('tools.sd_occ_' + o)); }

// Le nom d'un office un jour d'occasion, sur plusieurs lignes : « Chaharit de » puis le nom de la fête (et, si deux se rencontrent, « et Hanouka »), en français comme en hébreu.
function sdOccasionLines(base, occ, shabbat) {
    // « 'Hol haMoed Souccot » est trop long pour tenir à côté de l'hébreu : il passe sur deux lignes (« 'Hol haMoed » puis « Souccot »).
    const split = (name, head) => (name.indexOf(head + ' ') === 0 ? [head, name.slice(head.length + 1)] : [name]);
    const fr = [], he = [];
    occ.forEach((o, i) => {
        const f = split(t('tools.sd_occ_' + o), "'Hol haMoed"), h = split(SiddurCore.OCC_HE[o], 'חול המועד');
        if (i) { f[0] = t('tools.sd_occ_and') + ' ' + f[0]; h[0] = 'ו' + h[0]; }
        fr.push.apply(fr, f); he.push.apply(he, h);
    });
    // Un Chabbat d'occasion : « Chaharit de » / « Chabbat » / le nom de la fête.
    if (shabbat) { fr.unshift(t('tools.sd_shabbat')); he.unshift('שבת'); }
    return { fr: [t('tools.sd_p_' + base) + ' de'].concat(fr), he: [SD_HE_PRAYER[base] + ' של'].concat(he) };
}

// Un office tel qu'on le lit aujourd'hui : { ids, title, trim }. Un jour d'occasion, le titre le dit (« Chaharit de Roch 'Hodech ») et l'office est composé dans l'ordre du livre
// (SiddurCore.officeFor), pour que « Commencer » suffise.
function sdOffice(groupId) {
    const g = sdIndex.groups.filter(x => x.id === groupId)[0];
    if (!g) return null;
    const ids = g.sections.map(s => s.id);
    let title = sdCleanTitle(g.fr);
    const all = [];
    sdIndex.groups.forEach(x => x.sections.forEach(sec => all.push(sec.id)));
    // Chabbat (Cha'harit, Moussaf, Min'ha, Arvit du vendredi soir) : ceux du Chabbat dont il s'agit (le prochain, si on n'y est pas), avec le nom de l'occasion s'il y en a une.
    if (/^chabbat-(chacharit|moussaf|minha|arvit)$/.test(groupId)) {
        const so = SiddurCore.shabbatOccasionsOf(sdShabbatContext(sdComputeContext()));
        if (!so.length) return { ids: ids, title: title, trim: {} };
        const o = SiddurCore.officeFor(groupId, ids, so, all);
        return { ids: o.ids, title: title + ' (' + sdOccasionNames(so).join(' ' + t('tools.sd_occ_and') + ' ') + ')', trim: o.trim };
    }
    if (SD_PRAYERS.indexOf(groupId) < 0) return { ids: ids, title: title, trim: {} };
    const occ = sdOccasions();
    if (!occ.length) return { ids: ids, title: title, trim: {} };
    title += ' de\u00a0' + sdOccasionNames(occ).join(' ' + t('tools.sd_occ_and') + ' ');
    const friday = HebrewCalendarCore.weekdayOf(sdCtx.fixed) === 5;     // le vendredi de Hanouka : l'allumage, avant Chabbat
    const o = SiddurCore.officeFor(groupId, ids, occ, all, { friday: friday });
    return { ids: o.ids, title: title, trim: o.trim };
}

// L'ouverture en attente, résolue en { ids, title } (une prière entière, ou des sections données).
function sdTakePending() {
    const p = sdPending;
    sdPending = null;
    if (!p) return null;
    if (p.ids) return { ids: p.ids, title: p.title, trim: p.trim || {} };
    return sdOffice(p.group);
}

// Depuis l'accueil : ouvre le siddour directement sur une prière (chacharit, minha, arvit), ou sur des sections.
function openSiddurPrayer(groupId) {
    sdPending = { group: groupId };
    openTool('siddur', 'screen-main');
}
function openSiddurSections(ids, title, trim) {
    sdPending = { ids: ids, title: title, trim: trim || {} };
    openTool('siddur', 'screen-main');
}

// La dernière lecture, gardée sur l'appareil : { ids, title } ou null.
function sdLastRead() {
    try {
        const v = JSON.parse(localStorage.getItem(SD_LAST_KEY) || 'null');
        return v && Array.isArray(v.ids) && v.ids.length && typeof v.title === 'string' ? v : null;
    } catch (e) { return null; }
}

// Les notes du jour affichées en pastilles (Machiv haRouah, Avec Tahanoun…), sans Chabbat ni fête (dits à part).
// `base` : l'office en cours ('arvit'…). Tahanoun ne se dit pas à Arvit : ni « Avec Tahanoun » ni « Tahanoun le matin » n'y ont leur place.
// Les mentions de saison (Machiv haRouah / Morid hatal, Barekh alénou) ne sont pas affichées : elles ne changent que deux fois par an et le texte de la prière les porte déjà.
const SD_SEASON_NOTES = ['machiv', 'morid', 'tal', 'noTal'];
function sdDayNoteLabels(ctx, base) {
    const noTachanun = base === 'arvit' ? id => !/^(noT|t)achanun/.test(id) : () => true;
    // Roch 'Hodech et Hanouka : le Hallel et le Moussaf ne se disent qu'à Cha'harit ; à Min'ha et Arvit, seulement Yaalé véyavo, Al hanissim.
    const short = !!base && base !== 'chacharit';
    const noteKey = id => (short && (id === 'rc' || id === 'hanukkah') ? 'tools.sd_note_' + id + '_short' : 'tools.sd_note_' + id);
    return SiddurCore.notesFor(ctx).filter(id => id !== 'shabbat' && id !== 'yomTov' && SD_SEASON_NOTES.indexOf(id) < 0 && noTachanun(id))
        .map(id => id === 'omer' ? t('tools.sd_note_omer', { n: ctx.omer }) : t(noteKey(id)));
}

function sdRender() {
    const body = toolEl('tool-siddur-body');
    const screen = toolEl('screen-tool-siddur');
    toolClear(body);
    sdComputeContext();
    sdShabbatNote = '';
    if (sdView.mode === 'reader' && sdView.ids.length && sdIsShabbatSection(sdView.ids[0])) {
        const c = sdShabbatContext(sdCtx);
        if (c !== sdCtx) sdShabbatNote = 'Variantes du Chabbat du ' + hcalGregorianText(c.fixed, { weekday: undefined }) + '.';
        sdCtx = c;
    }
    if (screen) screen.classList.toggle('is-reading', sdView.mode === 'reader');
    if (sdView.mode === 'reader') sdRenderReader(body);
    else sdRenderHome(body);
}

// Retour : de la lecture à l'accueil du siddour, puis à l'accueil de l'application (ou, depuis Bénédictions, directement à cet écran).
function sdBack() {
    sdCloseSheet();
    if (sdView.mode === 'reader' && !sdDirectBack) {
        sdView = { mode: 'home', ids: [], title: '' };
        sdRestoreTop = null;
        sdRender();
        window.scrollTo && window.scrollTo(0, 0);
        const screen = toolEl('screen-tool-siddur');
        if (screen) screen.scrollTop = 0;
        return;
    }
    sdDirectBack = false;
    toolBack('siddur');
}

// --- L'accueil du siddour ------------------------------------------------------------------------------------------------------------------------
function sdOpenGroup(groupId) {
    const o = sdOffice(groupId);
    if (o) sdOpen(o.ids, o.title, o.trim);
}

function sdArvitTime() {
    if (!sdPlace) return '';
    const d = ZmanimCore.civilDateOf(sdPlace.tz, Date.now());
    const ms = ZmanimCore.rounded(ZmanimCore.zmanim(sdPlace, d.year, d.month, d.day, zmStoredOpts()), 'tzeit');
    return ms === null ? '' : 'dès ' + ZmanimCore.formatTime(ms, sdPlace.tz, 'fr');
}

function sdRenderHome(body) {
    const ctx = sdCtx;
    const service = sdCurrentService();
    const special = ctx.flags.yomTov;

    // La carte du moment : l'office de l'heure et les variantes du jour sont déjà sur l'accueil de l'application. Ici, elle ne reste que pour ce qui demande
    // une explication ou un geste : un lieu à choisir, ou un jour de fête (avertissement, « Prières des trois fêtes »).
    const hero = sdEl('section', 'home-hero sd-now');
    hero.id = 'sd-hero';
    if (service && !special) {
        // pas de carte : les offices sont dans la rangée ci-dessous, celui de l'heure marqué
    } else if (service) {
        hero.appendChild(sdEl('small', 'home-hero-label', 'À cette heure · ' + hcalHebrewText(ctx.hebrew)));
        const row = sdEl('div', 'home-hero-row');
        row.appendChild(sdEl('div', 'home-hero-name' + (service.title.length > 14 ? ' is-long' : ''), service.title));
        const he = sdEl('span', 'home-hero-he', service.he);
        he.lang = 'he'; he.dir = 'rtl';
        row.appendChild(he);
        hero.appendChild(row);
        if (special) hero.appendChild(sdEl('p', 'home-hero-text', t('tools.sd_warn_yomtov')));
        else {
            const chips = sdEl('div', 'home-chips');
            if (service.shabbat && !service.titleLines) chips.appendChild(sdEl('span', 'home-chip', 'Chabbat'));
            sdDayNoteLabels(ctx, service.base).forEach(label => chips.appendChild(sdEl('span', 'home-chip', label)));
            if (chips.childElementCount) hero.appendChild(chips);
        }
        const regel = special && (ctx.flags.pesach || ctx.flags.sukkot || ctx.flags.shemini || ctx.flags.shavuot);
        const go = sdEl('button', 'home-hero-btn', regel ? 'Prières des trois fêtes' : 'Commencer');
        go.type = 'button';
        go.onclick = () => sdOpenGroup(regel ? 'regalim' : service.group);
        hero.appendChild(go);
    } else {
        hero.appendChild(sdEl('small', 'home-hero-label', hcalHebrewText(ctx.hebrew)));
        hero.appendChild(sdEl('div', 'home-hero-name', 'Votre lieu'));
        hero.appendChild(sdEl('p', 'home-hero-text', t('tools.sd_warn_place')));
        const go = sdEl('button', 'home-hero-btn', 'Choisir mon lieu');
        go.type = 'button';
        go.onclick = () => openTool('zmanim', 'screen-tool-siddur');
        hero.appendChild(go);
        if (special) hero.appendChild(sdEl('p', 'home-hero-text', t('tools.sd_warn_yomtov')));
    }
    if (hero.childElementCount) body.appendChild(hero);

    // Les offices de la journée (de Chabbat ou de semaine), sous le titre : Cha'harit, Min'ha, Arvit. Celui de l'heure est marqué.
    const offices = ctx.flags.shabbat && !special
        ? [['chabbat-chacharit', 'Cha\'harit', 'שחרית'], ['chabbat-moussaf', 'Moussaf', 'מוסף'], ['chabbat-minha', 'Min\'ha', 'מנחה']]
        : SD_PRAYERS.map(g => [g, t('tools.sd_p_' + g), SD_HE_PRAYER[g]]);
    // L'office de l'heure qui n'est pas dans la liste (Arvit de Chabbat le vendredi soir, Arvit à la sortie de Chabbat) s'y ajoute.
    if (service && !special && !offices.some(o => o[0] === service.group)) offices.push([service.group, service.title, service.he]);
    const prayers = sdEl('div', 'home-tiles c' + (offices.length === 3 ? 3 : 2));
    offices.forEach(([gid, label, hebrew]) => {
        const b = sdEl('button', 'home-tile');
        b.type = 'button';
        b.id = 'sd-quick-' + gid;
        if (service && !special && gid === service.group) { b.classList.add('is-now'); b.setAttribute('aria-current', 'true'); }
        const he = sdEl('span', 'he', hebrew);
        he.lang = 'he'; he.dir = 'rtl';
        b.appendChild(he);
        b.appendChild(sdEl('span', 'fr', label));
        if (b.classList.contains('is-now')) b.appendChild(sdEl('span', 'sub', 'À cette heure'));
        else if (gid === 'arvit' && sdPlace) { const when = sdArvitTime(); if (when) b.appendChild(sdEl('span', 'sub', when)); }
        b.onclick = () => sdOpenGroup(gid);
        prayers.appendChild(b);
    });
    body.appendChild(prayers);

    // Les raccourcis épinglés.
    body.appendChild(sdEl('h3', 'home-section-title', 'Mes raccourcis'));
    const pins = sdEl('div', 'home-tiles c3');
    sdLoadPins().map(sdRowByKey).filter(Boolean).forEach(info => {
        const b = sdEl('button', 'home-tile');
        b.type = 'button';
        const he = sdEl('span', 'he sm', info.he);
        he.lang = 'he'; he.dir = 'rtl';
        b.appendChild(he);
        b.appendChild(sdEl('span', 'fr', info.title.replace(/ \(.*\)$/, '')));
        b.onclick = () => sdOpenRow(info);
        pins.appendChild(b);
    });
    const add = sdEl('button', 'home-tile sd-pin-add');
    add.type = 'button';
    add.id = 'sd-pin-add';
    add.appendChild(sdEl('span', 'he sm', '+'));
    add.appendChild(sdEl('span', 'fr', 'Épingler'));
    add.onclick = sdOpenPins;
    pins.appendChild(add);
    body.appendChild(pins);

    // Ce qui est de saison.
    const season = sdSeasonItems(ctx);
    if (season.length) {
        body.appendChild(sdEl('h3', 'home-section-title', 'En ce moment'));
        const list = sdEl('div', 'home-rows');
        season.forEach(info => list.appendChild(sdRowButton(info, () => sdOpenRow(info))));
        body.appendChild(list);
    }

    // Tout le livre, par rayons.
    body.appendChild(sdEl('h3', 'home-section-title', 'Tout le Siddour'));
    const shelves = sdEl('div', 'home-tiles c3');
    SD_RAYONS.forEach(r => {
        const b = sdEl('button', 'home-tile');
        b.type = 'button';
        b.dataset.rayon = r.id;
        const he = sdEl('span', 'he', r.he);
        he.lang = 'he'; he.dir = 'rtl';
        b.appendChild(he);
        b.appendChild(sdEl('span', 'fr', r.fr));
        if (r.soon) b.appendChild(sdEl('span', 'sub sd-soon-tag', 'à venir'));
        b.onclick = () => sdOpenRayon(r);
        shelves.appendChild(b);
    });
    body.appendChild(shelves);

    // Outils de la prière
    body.appendChild(sdEl('h3', 'home-section-title', 'Outils'));
    const tools = sdEl('div', 'home-rows');
    const ix = sdRowButton({ he: 'הפסקות', title: 'Tableau des interruptions', desc: 'Ce qu\'on peut répondre à chaque moment de la prière (rav Yits\'haq Yossef)' }, () => sdOpenInterruptions(null, false));
    ix.id = 'sd-ix-home';
    tools.appendChild(ix);
    body.appendChild(tools);

    // Source
    const foot = sdEl('section', 'sd-foot');
    foot.appendChild(sdEl('p', 'tool-small', t('tools.sd_source', { edition: sdIndex.edition })));
    foot.appendChild(sdEl('p', 'tool-small sd-disclaimer', t('tools.sd_disclaimer')));
    body.appendChild(foot);
}

// --- La lecture ----------------------------------------------------------------------------------------------------------------------------------
// `trim` : { section : premier segment à ne pas montrer } (le Hallel du livre se termine par la lecture de Roch 'Hodech, qui ne convient pas à Hanouka ni à 'Hol haMoed).
function sdOpen(ids, title, trim) {
    sdView = { mode: 'reader', ids: ids, title: title, trim: trim || {} };
    sdRestoreTop = null;
    try { localStorage.setItem(SD_LAST_KEY, JSON.stringify({ ids: ids, title: title, trim: trim || {} })); } catch (e) { /* stockage indisponible */ }
    sdRender();
    const screen = toolEl('screen-tool-siddur');
    if (screen) screen.scrollTop = 0;
    window.scrollTo && window.scrollTo(0, 0);
}

// Redessine la lecture (« tout afficher », traduction) en retrouvant la place.
function sdRerender() {
    const screen = toolEl('screen-tool-siddur');
    sdRestoreTop = screen ? screen.scrollTop : 0;
    sdRender();
}

let sdScrollBound = false;
let sdScrollQueued = false;
function sdBindScroll() {
    if (sdScrollBound) return;
    const screen = toolEl('screen-tool-siddur');
    if (!screen) return;
    screen.addEventListener('scroll', () => {
        if (sdScrollQueued) return;
        sdScrollQueued = true;
        requestAnimationFrame(() => { sdScrollQueued = false; sdUpdateReadBar(); });
    }, { passive: true });
    sdScrollBound = true;
}

function sdShortHe(he) { return String(he).split('›').pop().trim(); }

// La barre du lecteur : le texte en cours (titre et rang dans la prière) et le filet de progression.
function sdUpdateReadBar() {
    if (sdView.mode !== 'reader') return;
    const screen = toolEl('screen-tool-siddur');
    const bar = toolEl('sd-readbar');
    if (!screen || !bar) return;
    const max = screen.scrollHeight - screen.clientHeight;
    const fill = bar.querySelector('.sd-read-prog i');
    if (fill) fill.style.width = (max > 0 ? Math.min(100, Math.max(0, screen.scrollTop / max * 100)) : 0) + '%';
    const boxes = Array.prototype.slice.call(screen.querySelectorAll('.sd-section-box'));
    if (!boxes.length) return;
    const limit = bar.getBoundingClientRect().bottom + 8;
    let cur = boxes[0];
    boxes.forEach(b => { if (b.getBoundingClientRect().top <= limit) cur = b; });
    const id = cur.id.replace('sd-sec-', '');
    if (sdView.ids.length > 1) { const nav = toolEl('sd-parts'); if (nav && nav.dataset.cur !== id) { nav.dataset.cur = id; sdShowPart(nav, id); } }
    const found = sdFindSection(id);
    const name = toolEl('sd-read-name'), sub = toolEl('sd-read-sub');
    if (!found || !name || !sub) return;
    name.textContent = found.section.fr;
    if (sdView.ids.length > 1) sub.textContent = sdView.title + ' · ' + (sdView.ids.indexOf(id) + 1) + ' sur ' + sdView.ids.length;
    else {
        const list = found.group.sections;
        sub.textContent = sdCleanTitle(found.group.fr) + (list.length > 1 ? ' · ' + (list.findIndex(s => s.id === id) + 1) + ' sur ' + list.length : '');
    }
}

// --- Barre des parties (refonte, étape 4) ---------------------------------------------------------------------------------------------
// Sous le titre du lecteur, les parties de l'office (Pethi'hat Eliyahou… Amida… Alénou), comme les onglets des applis de siddour : celle qu'on
// lit est soulignée et reste visible (la barre défile avec la lecture). En lecture d'un trait, toucher une partie y saute ; en lecture d'une
// seule partie, toucher en ouvre une autre.
function sdShortName(fr) { return String(fr).replace(/\s*\([^)]*\)\s*$/, '').trim(); }
function sdPartsList() {
    if (!sdIndex) return null;
    if (sdView.ids.length > 1) return sdView.ids.map(id => { const f = sdFindSection(id); return { id, fr: f ? f.section.fr : id }; });
    const found = sdFindSection(sdView.ids[0]);
    if (!found || found.group.sections.length < 2 || found.group.id === 'zemirot-chabbat') return null;
    return found.group.sections.map(s => ({ id: s.id, fr: s.fr }));
}
function sdPartsNav() {
    const list = sdPartsList();
    if (!list) return null;
    const nav = sdEl('nav', 'sd-parts');
    nav.id = 'sd-parts';
    nav.setAttribute('aria-label', 'Parties de l\'office');
    const multi = sdView.ids.length > 1;
    list.forEach(it => {
        const b = sdEl('button', 'sd-part', sdShortName(it.fr));
        b.type = 'button';
        b.dataset.id = it.id;
        if (!multi && it.id === sdView.ids[0]) b.setAttribute('aria-current', 'true');
        b.onclick = () => {
            if (multi) { const target = document.getElementById('sd-sec-' + it.id); if (target) target.scrollIntoView({ block: 'start' }); }
            else if (it.id !== sdView.ids[0]) sdOpen([it.id], it.fr);
        };
        nav.appendChild(b);
    });
    // la partie ouverte, visible dès l'ouverture
    requestAnimationFrame(() => sdShowPart(nav, multi ? (nav.dataset.cur || list[0].id) : sdView.ids[0]));
    return nav;
}
function sdShowPart(nav, id) {
    const b = nav && nav.querySelector('.sd-part[data-id="' + id + '"]');
    if (!b) return;
    nav.querySelectorAll('.sd-part[aria-current]').forEach(o => { if (o !== b) o.removeAttribute('aria-current'); });
    b.setAttribute('aria-current', 'true');
    const left = b.offsetLeft - (nav.clientWidth - b.offsetWidth) / 2;
    if (Math.abs(nav.scrollLeft - left) > 4) nav.scrollTo({ left: Math.max(0, left), behavior: 'auto' });
}

// --- Le tableau des interruptions (refonte, étape 5) -------------------------------------------------------------------------------------
// « Puis-je répondre ? » : où l'on est dans la prière (détecté depuis la lecture, ou choisi) → tout ce qu'on peut dire, en trois couleurs.
// Données : data/siddur/interruptions.json (js/interruptionsCore.js). Contenu halakhique transcrit du Maguen Avot : **à relire**.
let sdInter = null;
const SD_IX_PILL = { o: ['Oui', 'is-oui'], c: ['Avec limite', 'is-cond'], n: ['Non', 'is-non'] };
function sdLoadInter() {
    if (sdInter) return Promise.resolve(sdInter);
    return sdFetchJson(SD_DATA + 'interruptions.json').then(d => { sdInter = d; return d; });
}
// La partie lue et, dans la Amida, la bénédiction en cours (le dernier nom de bénédiction passé sous la barre).
function sdReadingPlace() {
    const screen = toolEl('screen-tool-siddur');
    const bar = toolEl('sd-readbar');
    if (!screen || !bar) return { id: sdView.ids[0], bk: null };
    const limit = bar.getBoundingClientRect().bottom + 8;
    let sec = sdView.ids[0];
    screen.querySelectorAll('.sd-section-box').forEach(b => { if (b.getBoundingClientRect().top <= limit) sec = b.id.replace('sd-sec-', ''); });
    let bk = null;
    screen.querySelectorAll('#sd-sec-' + sec + ' .sd-bk').forEach(h => { if (h.getBoundingClientRect().top <= limit + 40) bk = h.dataset.bk; });
    return { id: sec, bk };
}
function sdAddInterFab(wrap) {
    if (typeof InterruptionsCore === 'undefined') return;
    const prayer = sdView.ids.some(id => { const f = sdFindSection(id); return f && ['reveil', 'chacharit', 'minha', 'arvit'].indexOf(f.group.id) !== -1; })
        || sdView.ids.some(id => InterruptionsCore.rowForPlace(id));
    if (!sdPrefs.fab || !prayer || wrap.querySelector('.sd-fab')) return;
    const fab = sdEl('button', 'sd-fab');
    fab.type = 'button';
    fab.id = 'sd-fab';
    fab.setAttribute('aria-haspopup', 'dialog');
    fab.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/></svg>';   // icône fixe
    fab.appendChild(document.createTextNode('Puis-je répondre ?'));
    fab.onclick = () => { const pl = sdReadingPlace(); sdOpenInterruptions(InterruptionsCore.rowForPlace(pl.id, pl.bk), true); };
    wrap.appendChild(fab);
}
function sdIxPill(cell) {
    const p = cell ? SD_IX_PILL[cell.c] : ['Non précisé', 'is-nil'];
    return sdEl('span', 'sd-ix-pill ' + p[1], p[0]);
}
function sdOpenInterruptions(rowId, detected) {
    sdLoadInter().then(data => {
        let cur = data.rows.find(r => r.id === rowId) || null;
        let view = 'list';
        sdSheet('Puis-je répondre ?', (body) => {
            const where = sdEl('div', 'sd-ix-where');
            const lab = sdEl('label', 'sd-ix-label', 'Où en êtes-vous dans la prière ?');
            lab.setAttribute('for', 'sd-ix-row');
            where.appendChild(lab);
            const sel = sdEl('select', 'sd-ix-select');
            sel.id = 'sd-ix-row';
            if (!cur) { const o = sdEl('option', '', 'Choisir un moment…'); o.value = ''; sel.appendChild(o); }
            data.rows.forEach(r => { const o = sdEl('option', '', r.fr); o.value = r.id; if (cur && r.id === cur.id) o.selected = true; sel.appendChild(o); });
            where.appendChild(sel);
            const hint = sdEl('p', 'sd-ix-hint', cur && detected ? 'Détecté d\'après votre lecture : changez-le si besoin.' : '');
            where.appendChild(hint);
            body.appendChild(where);
            const tabs = sdEl('div', 'sd-seg-btns sd-ix-views');
            tabs.setAttribute('role', 'group');
            tabs.setAttribute('aria-label', 'Affichage');
            const mk = (id, label) => { const b = sdEl('button', '', label); b.type = 'button'; b.dataset.view = id; b.setAttribute('aria-pressed', view === id ? 'true' : 'false'); b.onclick = () => { view = id; draw(); }; tabs.appendChild(b); };
            mk('list', 'Ce moment');
            mk('grid', 'Tout le tableau');
            body.appendChild(tabs);
            const out = sdEl('div', 'sd-ix-out');
            out.setAttribute('aria-live', 'polite');
            body.appendChild(out);
            const note = sdEl('p', 'sd-ix-note', 'Tableau écrit par le rav Yits\'haq Yossef chalita, tel qu\'imprimé dans le siddour Maguen Avot ; transcrit pour l\'application, à vérifier sur le livre. « Idem » : comme la case du dessus. En cas de doute, demandez à votre rabbin.');
            body.appendChild(note);
            sel.onchange = () => { cur = data.rows.find(r => r.id === sel.value) || null; hint.textContent = ''; const blank = sel.querySelector('option[value=""]'); if (blank && cur) blank.remove(); draw(); };
            function draw() {
                tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === view ? 'true' : 'false'));
                toolClear(out);
                if (view === 'grid') { out.appendChild(sdIxGrid(data, cur)); return; }
                if (!cur) { out.appendChild(sdEl('p', 'sd-ix-empty', 'Choisissez le moment de la prière où vous êtes : la liste de ce que vous pouvez dire s\'affiche ici.')); return; }
                const n = InterruptionsCore.tally(cur);
                const sum = sdEl('p', 'sd-ix-sum');
                [['o', n.o + ' oui'], ['c', n.c + ' avec limite'], ['n', n.n + ' non']].forEach(([c, txt]) => sum.appendChild(sdEl('span', 'sd-ix-pill ' + SD_IX_PILL[c][1], txt)));
                out.appendChild(sum);
                InterruptionsCore.byGroup(data, cur).forEach(g => {
                    out.appendChild(sdEl('h4', 'sd-sheet-sub', g.group.fr));
                    const list = sdEl('div', 'sd-ix-list');
                    g.items.forEach(it => {
                        const row = sdEl('div', 'sd-ix-row');
                        row.appendChild(sdEl('span', 'sd-ix-act', it.col.fr));
                        row.appendChild(sdIxPill(it.cell));
                        const showText = it.cell ? !/^(Interdit|Obligatoire|Autorisé)$/.test(it.cell.t) || it.cell.idem : true;
                        if (showText) row.appendChild(sdEl('span', 'sd-ix-det', it.cell ? it.cell.t + (it.cell.idem ? ' (« Idem » dans le livre)' : '') : 'Case vide dans le tableau'));
                        list.appendChild(row);
                    });
                    out.appendChild(list);
                });
            }
            draw();
        });
    }).catch(() => sdSheet('Puis-je répondre ?', (body) => body.appendChild(sdEl('p', 'sd-info', 'Le tableau n\'a pas pu être chargé. Vérifiez votre connexion.'))));
}
// La vue « comme dans le livre » : moments en lignes, cas en colonnes, première colonne et en-têtes fixes, cases en couleur.
function sdIxGrid(data, cur) {
    const wrap = sdEl('div', 'sd-ix-gridwrap');
    const table = sdEl('table', 'sd-ix-grid');
    const thead = sdEl('thead');
    const hr = sdEl('tr');
    hr.appendChild(sdEl('th', 'sd-ix-corner', 'Moment ↓ · Cas →'));
    data.cols.forEach(c => hr.appendChild(sdEl('th', '', c.fr)));
    thead.appendChild(hr);
    table.appendChild(thead);
    const tb = sdEl('tbody');
    data.rows.forEach(r => {
        const tr = sdEl('tr', cur && r.id === cur.id ? 'is-here' : '');
        tr.appendChild(sdEl('th', '', r.fr));
        r.cells.forEach(cell => tr.appendChild(sdEl('td', cell ? 'is-' + cell.c : 'is-nil', cell ? cell.t + (cell.idem ? ' (idem)' : '') : '—')));
        tb.appendChild(tr);
    });
    table.appendChild(tb);
    wrap.appendChild(table);
    return wrap;
}

// --- La lecture de la Torah du jour (lundi, jeudi, jours particuliers) -------------------------------------------------------------------
// Le texte vient du Tanakh de l'application (data/tanakh/<livre>.json, voyelles et cantillation) ; les montées de data/torah/weekday.json
// (js/torahReadingCore.js). Seulement les montées du jour : la lecture de toute l'année n'est pas affichée.
const SD_TORAH_BOOKS = ['genesis', 'exode', 'levitique', 'nombres', 'deuteronome'];
const SD_ALIYA_NAMES = ['כהן', 'לוי', 'ישראל', 'רביעי'];
const SD_READING_NAMES = { rc: 'Roch \'Hodech', fast: 'Jeûne public (Vayé\'hal)', purim: 'Pourim', tishaBav: '9 Av', hanukkah: 'Hanouka', cholHamoed: '\'Hol hamoèd' };
let sdWeekday = null;
let sdParashot = null;     // data/torah/parashot.json : le nom des parachiot
const sdBookCache = {};
function sdLoadBook(n) {
    const id = SD_TORAH_BOOKS[n - 1];
    if (!sdBookCache[id]) sdBookCache[id] = fetch('data/tanakh/' + id + '.json').then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).catch(e => { delete sdBookCache[id]; throw e; });
    return sdBookCache[id];
}
function sdReadingButton() {
    const b = sdEl('button', 'sd-reading-btn', 'Lecture de la Torah');
    b.type = 'button';
    b.id = 'sd-reading-btn';
    b.setAttribute('aria-haspopup', 'dialog');
    b.onclick = sdOpenReading;
    return b;
}
function sdCivilLabel(fixed) {
    const d = new Date((fixed - 719163) * 86400000);
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}
function sdOpenReading() {
    if (typeof TorahReadingCore === 'undefined') return;
    sdSheet('Lecture de la Torah', (body) => {
        body.appendChild(sdEl('p', 'tool-small', t('tools.sd_loading')));
        const load = sdWeekday ? Promise.resolve(sdWeekday) : Promise.all([sdFetchJson('data/torah/weekday.json'), sdFetchJson('data/torah/parashot.json')]).then(([w, p]) => { sdParashot = p; return (sdWeekday = w); });
        load.then(data => {
            const israel = !!(sdCtx && sdCtx.israel);
            const next = TorahReadingCore.nextReading(sdCtx.fixed, israel);
            toolClear(body);
            if (!next) { body.appendChild(sdEl('p', 'sd-info', 'Pas de lecture de la Torah dans les jours qui viennent.')); return; }
            const r = next.reading;
            const parasha = r.kind === 'parasha' && sdParashot ? sdParashot.parashot[r.parasha] : null;
            const head = sdEl('div', 'sd-reading-head');
            const title = r.kind === 'parasha' ? 'Paracha ' + (parasha ? parasha.fr : '') : SD_READING_NAMES[r.kind];
            head.appendChild(sdEl('p', 'sd-reading-title', title));
            if (parasha) { const he = sdEl('p', 'sd-reading-he', 'פרשת ' + parasha.he); he.lang = 'he'; he.dir = 'rtl'; head.appendChild(he); }
            if (next.fixed !== sdCtx.fixed) head.appendChild(sdEl('p', 'sd-reading-when', 'Pas de lecture aujourd\'hui. Prochaine lecture : ' + sdCivilLabel(next.fixed) + '.'));
            body.appendChild(head);
            const list = TorahReadingCore.aliyot(r, data);
            if (!list) { body.appendChild(sdEl('p', 'sd-info', 'La lecture de ' + SD_READING_NAMES[r.kind] + ' n\'est pas encore dans l\'application.')); return; }
            return sdLoadBook(list[0].book).then(book => {
                const text = sdEl('div', 'sd-reading-text');
                text.lang = 'he'; text.dir = 'rtl';
                text.style.setProperty('--sd-size', SD_SIZES[sdPrefs.size] + 'px');
                text.style.setProperty('--sd-font', sdFontStack());
                list.forEach((a, k) => {
                    const p = sdEl('p', 'sd-reading-aliya');
                    p.appendChild(sdEl('span', 'sd-reading-mark', '(' + SD_ALIYA_NAMES[k] + ')'));
                    for (let c = a.c1; c <= a.c2; c++) {
                        const ch = book.chapters[c - 1] || [];
                        const from = c === a.c1 ? a.v1 : 1, to = c === a.c2 ? a.v2 : ch.length;
                        for (let v = from; v <= to; v++) if (ch[v - 1]) { p.appendChild(sdTextNode(ch[v - 1])); p.appendChild(document.createTextNode(' ')); }
                    }
                    const ref = sdEl('span', 'sd-reading-ref', book.fr + ' ' + a.c1 + ', ' + a.v1 + (a.c2 !== a.c1 ? ' – ' + a.c2 + ', ' + a.v2 : '-' + a.v2));
                    ref.lang = 'fr'; ref.dir = 'ltr';
                    p.appendChild(ref);
                    text.appendChild(p);
                });
                body.appendChild(text);
                body.appendChild(sdEl('p', 'sd-ix-note', 'Montées d\'après Hebcal ; texte du Tanakh de l\'application (tanach.us). À vérifier sur un Houmach.'));
            });
        }).catch(() => { toolClear(body); body.appendChild(sdEl('p', 'sd-info', 'La lecture n\'a pas pu être chargée. Vérifiez votre connexion.')); });
    });
}

// --- La bénédiction de l'invité (Birkat haMazon séfarade) ---------------------------------------------------------------------------------
// Texte du Consistoire (« L'invité dira »), accordé selon qui reçoit : un homme, une femme ou un couple, marié(e) ou non, avec ou sans enfants.
// Les accords sont faits pour l'application, d'après la grammaire du texte : **à relire**.
const SD_GUEST_TABLE = '<b>הָרַחֲמָן</b> הוּא יְבָרֵךְ אֶת הַשֻּׁלְחָן הַזֶּה שֶׁאָכַלְנוּ עָלָיו, וִיסַדֵּר בּוֹ כָּל מַעֲדַנֵּי עוֹלָם, וְיִהְיֶה כְּשֻׁלְחָנוֹ שֶׁל אַבְרָהָם אָבִינוּ, כָּל רָעֵב מִמֶּנּוּ יֹאכַל וְכָל צָמֵא מִמֶּנּוּ יִשְׁתֶּה, וְאַל יֶחְסַר מִמֶּנּוּ כָּל טוּב לָעַד וּלְעוֹלְמֵי עוֹלָמִים, אָמֵן:';
const SD_GUEST_HE = {
    m: { host: 'בַּעַל הַבַּיִת הַזֶּה וּבַעַל הַסְּעֻדָּה הַזֹּאת', pron: 'הוּא', kids: 'וּבָנָיו', spouse: 'וְאִשְׁתּוֹ', all: 'וְכָל אֲשֶׁר לוֹ', hail: 'בָּרֵךְ יְהֹוָה חֵילוֹ וּפֹעַל יָדָיו תִּרְצֶה', nekh: 'וְיִהְיוּ נְכָסָיו וּנְכָסֵינוּ', lif: 'לְפָנָיו', sas: 'שָׂשׂ וְשָׂמֵחַ', bosh: 'לֹא יֵבוֹשׁ בָּעוֹלָם הַזֶּה וְלֹא יִכָּלֵם לָעוֹלָם הַבָּא' },
    f: { host: 'בַּעֲלַת הַבַּיִת הַזֶּה וּבַעֲלַת הַסְּעֻדָּה הַזֹּאת', pron: 'הִיא', kids: 'וּבָנֶיהָ', spouse: 'וּבַעְלָהּ', all: 'וְכָל אֲשֶׁר לָהּ', hail: 'בָּרֵךְ יְהֹוָה חֵילָהּ וּפֹעַל יָדֶיהָ תִּרְצֶה', nekh: 'וְיִהְיוּ נְכָסֶיהָ וּנְכָסֵינוּ', lif: 'לְפָנֶיהָ', sas: 'שָׂשָׂה וּשְׂמֵחָה', bosh: 'לֹא תֵבוֹשׁ בָּעוֹלָם הַזֶּה וְלֹא תִכָּלֵם לָעוֹלָם הַבָּא' },
    c: { host: 'בַּעַל הַבַּיִת הַזֶּה וּבַעֲלַת הַבַּיִת הַזֶּה, בַּעֲלֵי הַסְּעֻדָּה הַזֹּאת', pron: 'הֵם', kids: 'וּבְנֵיהֶם', spouse: '', all: 'וְכָל אֲשֶׁר לָהֶם', hail: 'בָּרֵךְ יְהֹוָה חֵילָם וּפֹעַל יְדֵיהֶם תִּרְצֶה', nekh: 'וְיִהְיוּ נִכְסֵיהֶם וּנְכָסֵינוּ', lif: 'לִפְנֵיהֶם', sas: 'שָׂשִׂים וּשְׂמֵחִים', bosh: 'לֹא יֵבוֹשׁוּ בָּעוֹלָם הַזֶּה וְלֹא יִכָּלְמוּ לָעוֹלָם הַבָּא' }
};
const SD_GUEST_FR = {
    m: { host: 'le maître de cette maison et de ce repas', who: 'lui', kids: 'ses enfants', spouse: 'son épouse', his: 'à lui', s: 'il', poss: 'sa', poss2: 'ses', obj: 'lui', joy: 'joyeux et heureux', shame: 'qu\'il n\'ait pas honte dans ce monde ni ne soit confus dans le monde à venir' },
    f: { host: 'la maîtresse de cette maison et de ce repas', who: 'elle', kids: 'ses enfants', spouse: 'son mari', his: 'à elle', s: 'elle', poss: 'sa', poss2: 'ses', obj: 'elle', joy: 'joyeuse et heureuse', shame: 'qu\'elle n\'ait pas honte dans ce monde ni ne soit confuse dans le monde à venir' },
    c: { host: 'le maître et la maîtresse de cette maison, qui nous offrent ce repas', who: 'eux', kids: 'leurs enfants', spouse: '', his: 'à eux', s: 'ils', poss: 'leur', poss2: 'leurs', obj: 'eux', joy: 'joyeux et heureux', shame: 'qu\'ils n\'aient pas honte dans ce monde ni ne soient confus dans le monde à venir' }
};
function sdGuestState() { const g = sdPrefs.guest || {}; return { who: SD_GUEST_HE[g.who] ? g.who : 'm', married: g.married !== false, kids: g.kids !== false }; }
function sdGuestHe(st) {
    const x = SD_GUEST_HE[st.who];
    const people = [x.pron, st.kids ? x.kids : '', st.married && x.spouse ? x.spouse : '', x.all].filter(Boolean).join(' ');
    return '<b>הָרַחֲמָן</b> הוּא יְבָרֵךְ ' + x.host + '. ' + people + '. ' + (st.kids ? 'בְּבָנִים שֶׁיִּחְיוּ. וּבִנְכָסִים שֶׁיִּרְבּוּ. ' : 'בִּנְכָסִים שֶׁיִּרְבּוּ. ')
        + x.hail + '. ' + x.nekh + ' מֻצְלָחִים וּקְרוֹבִים לָעִיר. וְאַל יִזְדַּקֵּק ' + x.lif + ' וְלֹא לְפָנֵינוּ שׁוּם דְּבַר חֵטְא וְהִרְהוּר עָוֹן. '
        + x.sas + ' כָּל הַיָּמִים בְּעֹשֶׁר וְכָבוֹד מֵעַתָּה וְעַד עוֹלָם. ' + x.bosh + '. אָמֵן כֵּן יְהִי רָצוֹן:';
}
function sdGuestFr(st) {
    const x = SD_GUEST_FR[st.who];
    const people = [x.who, st.kids ? x.kids : '', st.married && x.spouse ? x.spouse : ''].filter(Boolean);
    const list = people.length > 1 ? people.slice(0, -1).join(', ') + ', ' + people[people.length - 1] : people[0];
    return 'Que le Miséricordieux bénisse ' + x.host + ' : ' + list + ' et tout ce qui est ' + x.his + ', ' + (st.kids ? 'par des enfants qui vivent et des biens qui se multiplient' : 'par des biens qui se multiplient')
        + '. Bénis, Éternel, ' + x.poss + ' force, et agrée l\'œuvre de ' + x.poss2 + ' mains. Que ' + x.poss2 + ' biens et les nôtres prospèrent et soient proches de la ville ; que ne se présente ni devant ' + x.obj
        + ' ni devant nous aucune occasion de faute ni pensée de péché. Qu\'' + (x.s === 'il' ? 'il soit ' : x.s === 'elle' ? 'elle soit ' : 'ils soient ') + x.joy + ' tous les jours, dans la richesse et l\'honneur, dès maintenant et pour toujours ; '
        + x.shame + '. Amen, qu\'il en soit ainsi.';
}
function sdGuestPara(html, fr, host) {
    const tree = SiddurCore.parse(html);
    sdMarkNames(tree);
    const p = sdEl('p', 'sd-seg');
    p.lang = 'he'; p.dir = 'rtl';
    sdRenderNodes(tree.c, p);
    host.appendChild(p);
    if (sdPrefs.fr) { const f = sdEl('p', 'sd-fr-seg', fr); f.lang = 'fr'; host.appendChild(f); }
}
function sdGuestBlock() {
    const fold = sdEl('details', 'sd-fold sd-guest');
    const sum = sdEl('summary');
    sum.appendChild(sdEl('span', 'sd-fold-lab', 'Si l\'on est invité : bénédiction de l\'hôte'));
    const he = sdEl('span', 'sd-fold-he', 'הָרַחֲמָן הוּא יְבָרֵךְ…');
    he.lang = 'he'; he.dir = 'rtl';
    sum.appendChild(he);
    fold.appendChild(sum);
    const ctrls = sdEl('div', 'sd-guest-ctrls');
    const text = sdEl('div', 'sd-guest-text');
    const draw = () => {
        const st = sdGuestState();
        toolClear(text);
        sdGuestPara(SD_GUEST_TABLE, 'Que le Miséricordieux bénisse cette table sur laquelle nous avons mangé, qu\'Il y dispose tous les délices du monde, et qu\'elle soit comme la table d\'Abraham notre père : que tout affamé en mange et tout assoiffé en boive, et qu\'aucun bien n\'y manque jamais, à tout jamais. Amen.', text);
        sdGuestPara(sdGuestHe(st), sdGuestFr(st), text);
        ctrls.querySelectorAll('button[data-k]').forEach(b => b.setAttribute('aria-pressed', String(st[b.dataset.k]) === b.dataset.v ? 'true' : 'false'));
        const mar = ctrls.querySelector('.sd-guest-married');
        if (mar) mar.hidden = st.who === 'c';
    };
    const row = (label, key, opts, cls) => {
        const r = sdEl('div', 'sd-guest-row' + (cls ? ' ' + cls : ''));
        r.appendChild(sdEl('span', 'sd-guest-lab', label));
        const seg = sdEl('div', 'sd-seg-btns');
        seg.setAttribute('role', 'group');
        seg.setAttribute('aria-label', label);
        opts.forEach(([v, txt]) => {
            const b = sdEl('button', '', txt);
            b.type = 'button';
            b.dataset.k = key; b.dataset.v = v;
            b.onclick = () => {
                const st = sdGuestState();
                st[key] = v === 'true' ? true : v === 'false' ? false : v;
                sdPrefs.guest = st;
                sdSavePrefs();
                draw();
            };
            seg.appendChild(b);
        });
        r.appendChild(seg);
        ctrls.appendChild(r);
    };
    row('Qui nous reçoit ?', 'who', [['m', 'Un homme'], ['f', 'Une femme'], ['c', 'Un couple']]);
    row('Marié(e) ?', 'married', [['true', 'Oui'], ['false', 'Non']], 'sd-guest-married');
    row('Des enfants ?', 'kids', [['true', 'Oui'], ['false', 'Non']]);
    fold.appendChild(ctrls);
    fold.appendChild(text);
    fold.appendChild(sdEl('p', 'sd-var-note', 'Texte du Consistoire ; les accords (femme, couple, sans enfants, non marié) sont faits par l\'application : à vérifier.'));
    draw();
    return fold;
}

// --- Les « Haraḥaman » des occasions : le marié et la mariée, la Brit Mila (Birkat haMazon séfarade) ----------------------------------------
// Texte du Consistoire (« En présence d'un 'Hatan », « Lors d'une Brit Mila »). Chaque bloc s'ouvre tout seul quand la case correspondante du Zimoun est cochée.
const SD_OCCASIONS = [
    { key: 'wed', label: 'Mariage : bénédiction du marié et de la mariée', first: 'הָרַחֲמָן הוּא יְבָרֵךְ…',
      paras: [
        ['<b>הָרַחֲמָן</b> הוּא יְבָרֵךְ אֶת הֶחָתָן וְהַכַּלָּה, בְּבָנִים זְכָרִים שֶׁל קַיָּמָא, לַעֲבוֹדָתוֹ יִתְבָּרַךְ:', 'Que le Miséricordieux bénisse le marié et la mariée, par des fils qui perpétueront la lignée, pour Son service, béni soit-Il.'],
        ['<b>הָרַחֲמָן</b> הוּא יְבָרֵךְ אֶת כָּל הַמְסֻבִּין בַּשֻּׁלְחָן הַזֶּה, וְיִתֵּן לָנוּ הַקָּדוֹשׁ בָּרוּךְ הוּא, כָּל מִשְׁאֲלוֹת לִבֵּנוּ לְטוֹבָה:', 'Que le Miséricordieux bénisse tous ceux qui sont attablés à cette table, et que le Saint, béni soit-Il, nous accorde pour le bien tous les désirs de notre cœur.']
      ] },
    { key: 'brit', label: 'Brit Mila : bénédictions du repas de circoncision', first: 'הָרַחֲמָן הוּא יְבָרֵךְ…',
      paras: [
        ['<b>הָרַחֲמָן</b> הוּא יְבָרֵךְ אֶת בַּעַל הַבַּיִת הַזֶּה, אֲבִי הַבֵּן, הוּא וְאִשְׁתּוֹ הַיּוֹלֶדֶת, מֵעַתָּה וְעַד עוֹלָם:', 'Que le Miséricordieux bénisse le maître de cette maison, père de l\'enfant, lui et son épouse qui vient d\'accoucher, dès maintenant et à jamais.'],
        ['<b>הָרַחֲמָן</b> הוּא יְבָרֵךְ אֶת הַיֶּלֶד הַנּוֹלָד, וּכְשֵׁם שֶׁזָּכָה לַמִּילָה, כָּךְ יִזְכֶּה לְהִכָּנֵס לַתּוֹרָה וְלַחֻפָּה וּלְמִצְוֹת וּלְמַעֲשִׂים טוֹבִים, וְכֵן יְהִי רָצוֹן וְנֹאמַר אָמֵן:', 'Que le Miséricordieux bénisse l\'enfant qui vient de naître : de même qu\'il a mérité la circoncision, qu\'il mérite d\'entrer dans la Torah, sous la ‘Houpa, aux commandements et aux bonnes actions ; qu\'il en soit ainsi, et disons Amen.'],
        ['<b>הָרַחֲמָן</b> הוּא יְבָרֵךְ אֶת מַעֲלַת הַסַּנְדָּק וְהַמּוֹהֵל וּשְׁאָר הַמִּשְׁתַּדְּלִים בַּמִּצְוָה, הֵם וְכָל אֲשֶׁר לָהֶם:', 'Que le Miséricordieux bénisse le sandak, le mohel et ceux qui s\'emploient à cette mitsva, eux et tout ce qui leur appartient.']
      ] }
];
function sdOccasionBlock(o) {
    const fold = sdEl('details', 'sd-fold sd-occasion');
    fold.open = sdPrefs.zim !== 1 && (o.key === 'wed' ? !!sdPrefs.zimWed : !!(sdPrefs.zimWho || {}).brit);
    const sum = sdEl('summary');
    sum.appendChild(sdEl('span', 'sd-fold-lab', o.label));
    const he = sdEl('span', 'sd-fold-he', o.first);
    he.lang = 'he'; he.dir = 'rtl';
    sum.appendChild(he);
    fold.appendChild(sum);
    o.paras.forEach(([html, fr]) => sdGuestPara(html, fr, fold));
    return fold;
}
function sdOccasionBlocks() {
    const frag = document.createDocumentFragment();
    SD_OCCASIONS.forEach(o => frag.appendChild(sdOccasionBlock(o)));
    return frag;
}

function sdSwitch(label, on, onToggle) {
    const row = sdEl('div', 'sd-opt');
    row.appendChild(sdEl('span', '', label));
    const sw = sdEl('button', 'sd-sw' + (on ? ' is-on' : ''));
    sw.type = 'button';
    sw.setAttribute('role', 'switch');
    sw.setAttribute('aria-checked', on ? 'true' : 'false');
    sw.setAttribute('aria-label', label);
    sw.onclick = () => {
        const next = !sw.classList.contains('is-on');
        sw.classList.toggle('is-on', next);
        sw.setAttribute('aria-checked', next ? 'true' : 'false');
        onToggle(next);
    };
    row.appendChild(sw);
    return row;
}

function sdContentEl() { return toolEl('screen-tool-siddur').querySelector('.sd-content'); }

// Voyelles : on change le texte en place (le texte d'origine est gardé), la lecture ne bouge pas.
function sdApplyNiqqud() {
    const content = sdContentEl();
    if (!content) return;
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
        const original = sdOrigText.get(n);
        if (original !== undefined) n.nodeValue = sdText(original);
    }
}

function sdApplySizeAndFont() {
    const content = sdContentEl();
    if (!content) return;
    content.style.setProperty('--sd-size', SD_SIZES[sdPrefs.size] + 'px');
    sdSetFont(content);
}

function sdOpenDisplay() {
    sdSheet('Affichage du texte', (body) => {
        const size = sdEl('div', 'sd-opt');
        size.appendChild(sdEl('span', '', 'Taille du texte'));
        const seg = sdEl('div', 'sd-seg-btns');
        const mk = (label, aria, delta) => {
            const b = sdEl('button', '', label);
            b.type = 'button';
            b.setAttribute('aria-label', aria);
            b.onclick = () => {
                sdPrefs.size = Math.max(0, Math.min(SD_SIZES.length - 1, sdPrefs.size + delta));
                sdSavePrefs();
                sdApplySizeAndFont();
            };
            return b;
        };
        const smaller = mk('A−', t('tools.sd_smaller'), -1);
        smaller.id = 'sd-smaller';
        const bigger = mk('A+', t('tools.sd_bigger'), 1);
        bigger.id = 'sd-bigger';
        seg.appendChild(smaller);
        seg.appendChild(bigger);
        size.appendChild(seg);
        body.appendChild(size);

        const vowels = sdSwitch('Voyelles (nikoud)', sdPrefs.niqqud, (on) => { sdPrefs.niqqud = on; sdSavePrefs(); sdApplyNiqqud(); });
        vowels.querySelector('button').id = 'sd-niqqud';
        body.appendChild(vowels);
        const fr = sdSwitch('Traduction française', sdPrefs.fr, (on) => { sdPrefs.fr = on; sdSavePrefs(); sdRerender(); });
        fr.querySelector('button').id = 'sd-fr';
        body.appendChild(fr);
        const jx = sdSwitch('Mot à mot (début de la Amida)', sdPrefs.jx, (on) => { sdPrefs.jx = on; sdSavePrefs(); sdRerender(); });
        jx.querySelector('button').id = 'sd-jx';
        body.appendChild(jx);
        const nm = sdSwitch('Nom divin écrit יְהֹוָה avec « אדני »', sdPrefs.name !== 'source', (on) => { sdPrefs.name = on ? 'adonai' : 'source'; sdSavePrefs(); sdRerender(); });
        nm.querySelector('button').id = 'sd-name';
        body.appendChild(nm);
        const fabSw = sdSwitch('Bouton « Puis-je répondre ? »', sdPrefs.fab, (on) => {
            sdPrefs.fab = on;
            sdSavePrefs();
            const wrap = toolEl('sd-reader');
            const fab = toolEl('sd-fab');
            if (!on && fab) fab.remove();
            if (on && wrap) sdAddInterFab(wrap);
        });
        fabSw.querySelector('button').id = 'sd-fab-pref';
        body.appendChild(fabSw);
        body.appendChild(sdEl('p', 'sd-sheet-note sd-opt-hint', 'Masqué, le tableau des interruptions reste dans l\'accueil du Siddour, rubrique « Outils ».'));
        const heRub = sdSwitch('Consignes en hébreu (comme le livre)', sdPrefs.heRub, (on) => { sdPrefs.heRub = on; sdSavePrefs(); sdRerender(); });
        heRub.querySelector('button').id = 'sd-herub';
        body.appendChild(heRub);
        const hide = sdSwitch('Masquer les passages « pas aujourd\'hui »', sdPrefs.hideOff, (on) => { sdPrefs.hideOff = on; sdSavePrefs(); sdRerender(); });
        hide.querySelector('button').id = 'sd-hideoff';
        body.appendChild(hide);
        const all = sdSwitch('Tout afficher, sans estomper', sdPrefs.all, (on) => { sdPrefs.all = on; sdSavePrefs(); sdRerender(); });
        all.querySelector('button').id = 'sd-all';
        body.appendChild(all);

        body.appendChild(sdEl('h4', 'sd-sheet-sub', 'Police'));
        const fonts = sdEl('div', 'home-rows');
        fonts.setAttribute('role', 'radiogroup');
        fonts.setAttribute('aria-label', t('tools.sd_font_aria'));
        TORAH_READER_FONTS.forEach(font => {
            const b = sdEl('button', 'home-row sd-font-opt');
            b.type = 'button';
            b.dataset.font = font.id;
            b.setAttribute('role', 'radio');
            b.setAttribute('aria-checked', font.id === sdPrefs.font ? 'true' : 'false');
            const sample = sdEl('span', 'he', 'שְׁמַע');
            sample.lang = 'he'; sample.dir = 'rtl';
            sample.style.fontFamily = font.stack;
            const label = sdEl('span');
            label.appendChild(sdEl('span', 'fr', font.label));
            b.appendChild(sample);
            b.appendChild(label);
            b.appendChild(sdEl('span', 'chev', font.id === sdPrefs.font ? '✓' : ''));
            b.onclick = () => {
                sdPrefs.font = font.id;
                sdSavePrefs();
                sdApplySizeAndFont();
                fonts.querySelectorAll('.sd-font-opt').forEach(o => {
                    const on = o.dataset.font === font.id;
                    o.setAttribute('aria-checked', on ? 'true' : 'false');
                    o.lastChild.textContent = on ? '✓' : '';
                });
            };
            fonts.appendChild(b);
        });
        body.appendChild(fonts);
    });
}

// Le sommaire : les parties de la prière en cours, pour sauter de l'une à l'autre.
function sdOpenToc() {
    const single = sdView.ids.length === 1;
    const found = sdFindSection(sdView.ids[0]);
    if (single && found && found.group.id === 'zemirot-chabbat') { sdOpenZemirot(found.section.tab || 'soir', found.section.id); return; }
    const current = toolEl('sd-read-name') ? toolEl('sd-read-name').textContent : '';
    sdSheet(single && found ? sdCleanTitle(found.group.fr) : sdView.title, (body) => {
        const list = sdEl('div', 'home-rows');
        let items;
        if (single && found) {
            items = found.group.sections.map(s => ({ id: s.id, fr: s.fr, he: sdShortHe(s.he) }));
            if (found.group.sections.length > 1) {
                list.appendChild(sdRowButton({ he: 'הכל', title: 'Tout lire d\'un trait', desc: found.group.sections.length + ' parties à la suite' },
                    () => { sdCloseSheet(); sdOpen(found.group.sections.map(s => s.id), sdCleanTitle(found.group.fr)); }));
            }
        } else {
            items = sdView.ids.map(id => { const f = sdFindSection(id); return { id: id, fr: f ? f.section.fr : id, he: f ? sdShortHe(f.section.he) : '' }; });
        }
        items.forEach(it => {
            const isCurrent = it.fr === current;
            const b = sdRowButton({ he: it.he, title: it.fr, desc: isCurrent ? 'En cours de lecture' : '' }, () => {
                sdCloseSheet();
                if (single) sdOpen([it.id], it.fr);
                else { const target = document.getElementById('sd-sec-' + it.id); if (target) target.scrollIntoView({ block: 'start' }); }
            });
            if (isCurrent) b.setAttribute('aria-current', 'true');
            list.appendChild(b);
        });
        body.appendChild(list);
    });
}

function sdRenderReader(body) {
    const wrap = sdEl('div', 'sd-reader');
    wrap.id = 'sd-reader';
    const bar = sdEl('div', 'sd-readbar');
    bar.id = 'sd-readbar';
    const titleBtn = sdEl('button', 'sd-read-title');
    titleBtn.type = 'button';
    titleBtn.id = 'sd-read-title';
    titleBtn.setAttribute('aria-haspopup', 'dialog');
    titleBtn.setAttribute('aria-label', 'Sommaire');
    const name = sdEl('strong', '', sdView.title);
    name.id = 'sd-read-name';
    const sub = sdEl('small', '', '');
    sub.id = 'sd-read-sub';
    titleBtn.appendChild(name);
    titleBtn.appendChild(sub);
    titleBtn.onclick = sdOpenToc;
    const aa = sdEl('button', 'sd-read-aa', 'Aa');
    aa.type = 'button';
    aa.id = 'sd-display';
    aa.setAttribute('aria-label', 'Affichage du texte');
    aa.setAttribute('aria-haspopup', 'dialog');
    aa.onclick = sdOpenDisplay;
    bar.appendChild(titleBtn);
    bar.appendChild(aa);
    const tabs = sdPartsNav();
    if (tabs) bar.appendChild(tabs);
    const prog = sdEl('div', 'sd-read-prog');
    prog.appendChild(sdEl('i'));
    bar.appendChild(prog);
    wrap.appendChild(bar);
    const content = sdEl('div', 'sd-content');
    content.style.setProperty('--sd-size', SD_SIZES[sdPrefs.size] + 'px');
    sdSetFont(content);
    wrap.appendChild(content);
    body.appendChild(wrap);
    content.appendChild(sdEl('p', 'tool-small', t('tools.sd_loading')));
    Promise.all(sdView.ids.map(id => Promise.all([sdLoadSection(id), sdLoadFr(id)]).then(r => { r[0].fr_t = r[1]; return r[0]; }))).then(sections => {
        if (sdView.mode !== 'reader') return;
        toolClear(content);
        if (sdShabbatNote) content.appendChild(sdEl('p', 'sd-fr-note', sdShabbatNote));
        if (sdPrefs.fr) content.appendChild(sdEl('p', 'sd-fr-note', t('tools.sd_fr_note')));
        sections.forEach(section => content.appendChild(sdRenderSection(section)));
        sdAddNav(wrap);
        sdAddInterFab(wrap);
        if (!bar.querySelector('.sd-parts')) { const tabs = sdPartsNav(); if (tabs) bar.insertBefore(tabs, bar.querySelector('.sd-read-prog')); }
        const screen = toolEl('screen-tool-siddur');
        if (sdRestoreTop !== null) { screen.scrollTop = sdRestoreTop; sdRestoreTop = null; }
        else { const mark = content.querySelector('.sd-omer-today'); if (mark) mark.scrollIntoView({ block: 'center' }); }
        sdUpdateReadBar();
    }).catch(() => {
        toolClear(content);
        content.appendChild(sdEl('p', 'tool-msg', t('tools.sd_load_failed')));
    });
}

// Précédent / suivant dans le groupe d'une section lue seule.
function sdAddNav(wrap) {
    if (sdView.ids.length !== 1) return;
    const found = sdFindSection(sdView.ids[0]);
    if (!found) return;
    const list = found.group.sections;
    const i = list.findIndex(s => s.id === found.section.id);
    const nav = sdEl('div', 'sd-nav');
    const go = (s, label, cls) => {
        const b = sdEl('button', 'tool-history-chip ' + cls, label);
        b.type = 'button';
        b.onclick = () => sdOpen([s.id], s.fr);
        nav.appendChild(b);
    };
    if (i > 0) go(list[i - 1], '‹ ' + list[i - 1].fr, 'sd-prev');
    if (i < list.length - 1) go(list[i + 1], list[i + 1].fr + ' ›', 'sd-next');
    wrap.appendChild(nav);
}

// --- Le rendu d'une section -------------------------------------------------------------------------------------------------------------------------
const SD_NIQQUD = /[֑-ׇ]/g;
function sdText(s) { return sdPrefs.niqqud ? s : s.replace(SD_NIQQUD, ''); }

function sdAtomsLabel(atoms) {
    return atoms.map(a => t('tools.sd_atom_' + a)).join(' / ');
}

// La classe d'une variante : on (aujourd'hui), off (pas aujourd'hui), unknown.
function sdVariantClass(mark) {
    const state = SiddurCore.evaluate(mark.atoms, sdCtx);
    if (mark.role === 'rubric') return state === 'on' ? 'sd-v is-on is-rubric' : (state === 'off' && !sdPrefs.all ? 'sd-v is-off is-rubric' : 'sd-v');
    if (state === 'on') return 'sd-v is-on';
    if (state === 'off') return sdPrefs.all ? 'sd-v' : 'sd-v is-off';
    return 'sd-v is-unknown';
}

// skipMark : les nœuds de premier niveau sont le corps d'une variante déjà mise en bloc (sdVarBlock) : on ne les estompe pas une seconde fois.
function sdRenderNodes(nodes, parent, skipMark) {
    nodes.forEach(node => {
        const m = skipMark ? null : node.m;
        // Une variante courte restée dans la ligne : sa consigne hébraïque (« בעשרת ימי תשובה: ») devient une petite étiquette française.
        if (m && (m.role === 'marker' || m.role === 'self')) {
            const state = SiddurCore.evaluate(m.atoms, sdCtx);
            const full = SiddurCore.plain(node);
            const lab = sdEl('span', 'sd-v-lab' + (state === 'on' ? ' is-on' : state === 'off' && !sdPrefs.all ? ' is-off' : ''), sdCap(sdAtomsLabel(m.atoms)) + ' :');
            lab.lang = 'fr';
            lab.dir = 'ltr';
            lab.title = full.split(':')[0].trim();
            parent.appendChild(lab);
            if (m.role === 'self') {
                const body = sdEl('span', sdVariantClass(m));
                body.appendChild(sdTextNode(full.slice(full.indexOf(':') + 1).replace(/^\s+/, ' ')));
                parent.appendChild(body);
            }
            return;
        }
        let el;
        if (node.k) { const sp = sdSpecialNode(node); if (m && node.k === 'name') { const w = sdEl('span', sdVariantClass(m)); w.appendChild(sp); parent.appendChild(w); } else parent.appendChild(sp); return; }
        if (node.t === 'text') {
            const text = sdTextNode(node.v);
            if (m) { el = sdEl('span', sdVariantClass(m)); el.appendChild(text); } else { parent.appendChild(text); return; }
        } else if (node.n === 'br') {
            parent.appendChild(document.createElement('br'));
            return;
        } else {
            // <small> : une consigne (sans voyelles) passe en police d'interface ; un texte de prière en <small> (vocalisé) garde presque sa taille.
            const smallCls = SD_HAS_NIQQUD.test(SiddurCore.plain(node)) ? 'sd-small sd-small-text' : 'sd-small sd-small-rub';
            el = sdEl(node.n === 'b' ? 'strong' : 'span', node.n === 'small' ? smallCls : node.n === 'big' ? 'sd-big' : '');
            if (m) el.className = (el.className + ' ' + sdVariantClass(m)).trim();
            sdRenderNodes(node.c, el);
        }
        if (m) {
            const state = SiddurCore.evaluate(m.atoms, sdCtx);
            if (state === 'off' && m.role !== 'rubric' && !sdPrefs.all) el.title = t('tools.sd_variant_off_title', { what: sdAtomsLabel(m.atoms) });
            if (state === 'on' && m.role !== 'rubric') el.title = t('tools.sd_variant_on_title', { what: sdAtomsLabel(m.atoms) });
        }
        parent.appendChild(el);
    });
}

// --- Variantes et consignes (refonte, étape 2) ------------------------------------------------------------------------------------------
// La variante du jour est en taille normale dans un bloc doré ; une variante qui ne s'applique pas est repliée sur une ligne (son nom en
// français et ses premiers mots), avec, s'il y en a une, la règle en cas d'erreur. Les consignes du livre (hébreu sans voyelles) sont montrées
// par leur traduction française (data/siddur/fr/). Rien n'est supprimé : tout se déplie, et « Tout afficher » montre tout comme le livre.
const SD_HAS_NIQQUD = /[ְ-ׇ]/;
function sdTextNode(v) {
    const n = document.createTextNode(sdText(v));
    sdOrigText.set(n, v);
    return n;
}
function sdBlank(k) { return k.t === 'text' && !k.v.trim(); }
function sdCap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function sdFirstWords(text, n) {
    const words = String(text).replace(/[:.,]/g, ' ').trim().split(/\s+/).filter(Boolean);
    return words.slice(0, n || 3).join(' ') + (words.length > (n || 3) ? '…' : '');
}
// Ce qu'on fait si l'on s'est trompé, et depuis quand vaut une variante : texte du siddour Maguen Avot (Min'ha p. 136-147, commentaires
// p. 163 et 544), repris tel quel. Contenu halakhique : **à relire sur le livre**.
const SD_VAR_SINCE = {
    dewWinter: 'depuis Moussaf de Chémini Atséret',
    dewSummer: 'depuis Moussaf du 1er jour de Pessa\'h',
    barechSummer: 'depuis \'Hol hamoèd Pessa\'h jusqu\'au 7 \'Hechvan ; hors d\'Israël, jusqu\'au 60e jour après la Tekoufa de Tichri (nuit du 4 au 5, ou du 5 au 6 décembre)',
    barechWinter: 'depuis la nuit du 7 \'Hechvan ; hors d\'Israël, depuis le 60e jour après la Tekoufa de Tichri (nuit du 4 au 5, ou du 5 au 6 décembre) ; jusqu\'à Min\'ha de la veille de Pessa\'h'
};
const SD_ERR_NOTES = {
    dewSummer: 'Si, en été, on a dit « morid haguéchem », mais qu\'on s\'en rende compte avant d\'avoir dit « baroukh ata Adonaï », on reprend « Ata guibor ». Si l\'on s\'en rend compte au moment où l\'on a dit « baroukh ata Adonaï », on ajoute « lamedéni \'houkékha » puis on reprend « Ata guibor ». Si l\'on a déjà dit « mé\'hayé hamétim », on reprend au début de la Amida. Si l\'on est dans le doute, pendant les trente jours qui suivent le premier jour de Pessa\'h, on reprend au début de la Amida.',
    dewWinter: 'Si, en hiver, on a dit « morid hatal », mais qu\'on s\'en rende compte avant d\'avoir dit « baroukh ata Adonaï », il convient de reprendre à « Ata guibor ». Si l\'on s\'en rend compte au moment où l\'on a dit « baroukh ata Adonaï », on continue « mé\'hayé hamétim », et non « lamedéni \'houkékha ». On ne l\'intercalera pas non plus entre deux bénédictions.',
    barechSummer: 'Si l\'on s\'est trompé en disant « Barekh \'alénou » en été et qu\'on s\'en rende compte au milieu de la bénédiction, on reprendra « Barékhénou ». Si l\'on s\'en rend compte après avoir dit « baroukh ata Adonaï » mais avant « mévarekh hachanim », on dira « lamedéni \'houkékha » et on dira à nouveau « Barékhénou ». Si l\'on a déjà dit « mévarekh hachanim », ou si l\'on s\'en rend compte plus tard, on reprendra dans l\'ordre depuis « Barékhénou ». Si l\'on ne s\'en rend compte qu\'après avoir dit le « Yihyou leratson » qui suit « Elohaï netsor », même si l\'on n\'a pas fait les trois pas en arrière, on reprendra au début de la Amida. Si l\'on a dit « Barekh \'alénou » pendant les jours qui suivent Souccot mais avant le 7 \'Hechvan, selon la loi stricte on n\'aurait pas besoin de se reprendre ; cependant il conviendrait de réciter à nouveau la Amida à titre d\'offrande volontaire, en disant : « Si j\'ai l\'obligation de répéter la Amida, je le fais pour m\'acquitter de mon devoir, et sinon que ce soit à titre d\'offrande volontaire. »',
    barechWinter: 'Si l\'on s\'est trompé en disant « Barékhénou » en hiver, et qu\'on s\'en rende compte au milieu de la bénédiction, on reprendra « Barekh \'alénou ». Si l\'on s\'en rend compte après avoir dit « mévarekh hachanim », mais avant de commencer « Téka\' », on dira alors « véten tal oumatar liverakha » puis « Téka\' béchofar gadol ». Si l\'on ne s\'en rend compte qu\'après avoir commencé « Téka\' », on continuera la prière jusqu\'à « Chéma\' kolénou » ; là, avant de dire « ki ata choméa\' téfilat kol pé », on ajoutera « véten tal oumatar liverakha ». Si, là aussi, on a oublié de le dire et qu\'on s\'en rende compte entre « baroukh ata Adonaï » et « choméa\' téfila », on dira « lamedéni \'houkékha » et on reprendra « Chéma\' kolénou » en ajoutant « véten tal oumatar liverakha ». Si l\'on s\'en rend compte après avoir dit « choméa\' téfila » mais avant de commencer « Retsé », on ajoutera alors « véten tal oumatar liverakha ». Si l\'on a déjà commencé « Retsé », ou si l\'on s\'en rend compte par la suite, on reprendra dans l\'ordre à partir de « Barekh \'alénou ». Si l\'on ne s\'en rend compte qu\'après avoir dit le « Yihyou leratson » qui suit « Elohaï netsor », même si l\'on n\'a pas encore fait trois pas en arrière, on reprendra au début de la Amida.'
};
// Les autres ajouts : reconnus par leurs mots (sans voyelles) et leur condition.
const SD_TEXT_NOTES = [
    { atom: 'aseret', re: /זכרנו לחיים/, t: 'Si l\'on n\'a pas dit « zokhrénou le\'hayim » et que l\'on s\'en aperçoive avant de prononcer le Nom divin, on se reprend, mais si on l\'a déjà prononcé, on ne se reprend pas.' },
    { atom: 'aseret', re: /מי כמוך אב הרחמן|וכתוב לחיים|ובספר חיים/, t: 'Si on a omis de le dire et que l\'on s\'en aperçoive avant de prononcer le Nom divin de la bénédiction suivante, on se reprend, sinon on ne se reprend pas.' },
    { atom: 'aseret', re: /המלך הקדוש/, t: 'Pendant les dix jours de pénitence, si on oublie et on dit « hael hakadoch », ou que l\'on soit dans le doute, et que l\'on ne s\'en souvienne pas tout de suite, on reprend la Amida à son début. Si l\'officiant se trompe, il reprend à « Atta kadoch » et continue normalement.' },
    { atom: 'aseret', re: /המלך המשפט/, t: 'Si l\'on se trompe et que l\'on se rend compte tout de suite (le temps de dire « chalom \'alékha rabi »), on reprendra « hamélekh hamichpat ». Si l\'on s\'en souvient avant le verset « yihyou lératson », on reprend à « Hachiva chofeténou », mais si c\'est après, on reprend la Amida à son début. Il conviendra de la réciter à titre d\'offrande volontaire.' },
    { atom: 'rc', re: /יעלה ויבא/, t: 'Si on a omis de dire « Ya\'alé véyavo », on se reprend, sauf pour la prière du soir de Roch \'Hodech.' },
    { atom: 'hanukkah', re: /על הנסים|על הניסים/, t: 'Si on a omis de dire « Véal hanissim » et que l\'on s\'en aperçoive avant de prononcer le Nom divin de la prochaine bénédiction, on se reprend, sinon on ne se reprend pas.' },
    { atom: 'tishaBav', re: /נחם/, t: 'Si le 9 Av, on n\'a pas dit « Na\'hem » et qu\'on ne s\'en rende compte qu\'après avoir dit « baroukh atta Adonaï », on ne se reprend pas.' },
    { atom: 'fastPublic', re: /עננו/, t: 'Celui qui jeûne récite « \'Anénou ». L\'officiant qui a oublié de dire « \'Anénou » entre « Goël » et « Rofé » le dira comme le particulier, sans le Nom divin.' }
];
const SD_ATOM_FAMILY = { ch: 'rc', chPesach: 'rc', chSukkot: 'rc', purim: 'hanukkah', fastIndividual: 'fastPublic' };
function sdErrNote(atoms, bodyText) {
    for (const a of atoms) if (SD_ERR_NOTES[a]) return SD_ERR_NOTES[a];
    const fam = atoms.map(a => SD_ATOM_FAMILY[a] || a);
    const bare = SiddurCore.stripNiqqud(bodyText);
    const hit = SD_TEXT_NOTES.find(n => fam.indexOf(n.atom) !== -1 && n.re.test(bare));
    return hit ? hit.t : '';
}
// Une règle courte s'affiche telle quelle ; une longue se replie sous « Si l'on s'est trompé ».
function sdNoteEl(text) {
    if (text.length <= 170) { const p = sdEl('p', 'sd-var-note', text); p.lang = 'fr'; return p; }
    const d = sdEl('details', 'sd-var-note sd-var-more');
    d.appendChild(sdEl('summary', '', 'Si l\'on s\'est trompé'));
    const p = sdEl('p', '', text);
    p.lang = 'fr';
    d.appendChild(p);
    return d;
}

// Un bloc de variante. fill(host) y met le texte ; label : le nom en français ; bodyText : le texte (pour les premiers mots et la règle).
// forced : l'état déjà calculé ('on' / 'off' / 'unknown'), quand la condition n'est pas une consigne du livre (le psaume du jour).
function sdVarBlock(atoms, label, bodyText, fill, forced) {
    const state = forced || SiddurCore.evaluate(atoms, sdCtx);
    const name = label || sdCap(sdAtomsLabel(atoms));
    const note = sdErrNote(atoms, bodyText);
    // forced 'fold-unknown' : un passage « selon le cas » replié par défaut (le psaume de la maison d'un deuil).
    // 'fold-ind' : un jeûne individuel reste possible (l'application ne le sait pas) : replié « pas aujourd'hui », jamais masqué.
    if ((state === 'off' && !sdPrefs.all) || state === 'fold-unknown' || (state === 'fold-ind' && !sdPrefs.all)) {
        if (state === 'off' && sdPrefs.hideOff) return document.createDocumentFragment();
        const fold = sdEl('details', 'sd-fold');
        const sum = sdEl('summary');
        sum.appendChild(sdEl('span', 'sd-fold-lab', name + (state === 'off' ? ' · pas aujourd\'hui' : state === 'fold-ind' ? ' · pas aujourd\'hui (sauf jeûne individuel)' : ' · selon le cas')));
        const he = sdEl('span', 'sd-fold-he');
        he.lang = 'he'; he.dir = 'rtl';
        he.appendChild(sdTextNode(sdFirstWords(bodyText)));
        sum.appendChild(he);
        fold.appendChild(sum);
        fill(fold);
        if (note) fold.appendChild(sdNoteEl(note));
        return fold;
    }
    const box = sdEl('div', 'sd-var' + (state === 'on' ? ' is-on' : state === 'unknown' ? ' is-unknown' : ''));
    const head = sdEl('p', 'sd-var-head');
    if (state === 'on') head.appendChild(sdEl('span', 'sd-chip', 'Aujourd\'hui'));
    else if (state === 'unknown') head.appendChild(sdEl('span', 'sd-chip is-unknown', 'Selon le cas'));
    head.appendChild(sdEl('span', '', name));
    const since = atoms.map(a => SD_VAR_SINCE[a]).filter(Boolean)[0];
    if (since) head.appendChild(sdEl('span', 'sd-var-since', '(' + since + ')'));
    box.appendChild(head);
    fill(box);
    if (note) box.appendChild(sdNoteEl(note));
    return box;
}

// Une consigne seule dans son segment : sa traduction française (ou l'hébreu si on l'a demandé, ou s'il n'y a pas de traduction).
function sdRubricEl(tree, fr) {
    const kids = tree.c.filter(k => !sdBlank(k));
    const mark = kids.length === 1 && kids[0].m && kids[0].m.role === 'rubric' ? kids[0].m : null;
    const state = mark ? SiddurCore.evaluate(mark.atoms, sdCtx) : null;
    const el = sdEl('p', 'sd-rub' + (state === 'on' ? ' is-on' : state === 'off' && !sdPrefs.all ? ' is-off' : ''));
    if (state === 'on') el.appendChild(sdEl('span', 'sd-chip', 'Aujourd\'hui'));
    if (fr && !sdPrefs.heRub) {
        el.lang = 'fr';
        el.appendChild(document.createTextNode(fr));
    } else {
        el.lang = 'he'; el.dir = 'rtl';
        el.appendChild(sdTextNode(SiddurCore.plain(tree).replace(/\s+/g, ' ').trim()));
    }
    return el;
}

// Le segment : un titre, une consigne seule, ou du texte. Une variante assez longue (une phrase) ou un segment fait seulement de variantes
// (été / hiver) passe en blocs ; les variantes d'un mot ou deux (« הַשָּׁלוֹם ») restent dans la ligne.
function sdRenderSegment(tree, index, fr) {   // tree peut être remplacé par son contenu (segment tout en gras)
    // Une consigne mise en gras dans la source (<b><small>…</small></b>) est une consigne comme les autres : on la lit à travers le gras, pour la montrer en français.
    const outer = tree.c.filter(k => !sdBlank(k));
    if (index > 0 && outer.length === 1 && outer[0].t === 'tag' && outer[0].n === 'b' && !SD_HAS_NIQQUD.test(SiddurCore.plain(tree))) {
        const inner = outer[0].c.filter(k => !sdBlank(k));
        if (inner.length && inner.every(k => k.t === 'tag' && k.n === 'small')) tree = { t: 'tag', n: 'root', c: outer[0].c };
    }
    const kids = tree.c.filter(k => !sdBlank(k));
    const isTitle = index === 0 && kids[0] && kids[0].t === 'tag' && kids[0].n === 'big';
    if (!isTitle && kids.length && kids.every(k => k.t === 'tag' && k.n === 'small') && !SD_HAS_NIQQUD.test(SiddurCore.plain(tree))) return sdRubricEl(tree, fr);
    // Un intertitre du livre (« מודים דרבנן » suivi de sa consigne, « קריאה ליום הראשון ») : sans voyelles, un titre court en gras ;
    // montré en français comme une consigne, en plus appuyé. Les chants non vocalisés (araméen) ont un texte long : ils ne sont pas concernés.
    if (!isTitle && fr && !sdPrefs.heRub && index > 0 && !SD_HAS_NIQQUD.test(SiddurCore.plain(tree))) {
        const outside = SiddurCore.plain(tree.c.filter(k => !(k.t === 'tag' && k.n === 'small'))).trim();
        const marked = tree.c.some(k => k.t === 'tag' && (k.n === 'b' || k.n === 'big' || k.n === 'small'));
        if (outside && outside.length <= 30 && marked) { const h = sdRubricEl(tree, fr); h.classList.add('sd-rub-head'); return h; }
    }
    const newP = () => { const p = sdEl(isTitle ? 'h4' : 'p', isTitle ? 'sd-title' : 'sd-seg'); p.lang = 'he'; p.dir = 'rtl'; return p; };
    // Un segment entièrement en gras dans la source (une seule balise <b> autour de tout) : on cherche ses variantes à l'intérieur.
    if (!isTitle && kids.length === 1 && kids[0].t === 'tag' && kids[0].n === 'b' && !kids[0].m && kids[0].c.some(k => k.m)) tree = { t: 'tag', n: 'root', c: kids[0].c };
    // les variantes de premier niveau : marqueur + corps, ou consigne et corps dans la même balise (« self » : « בחוה"מ פסח: חג המצות… »)
    const vars = {};
    tree.c.forEach(k => {
        if (!k.m) return;
        if (k.m.role === 'self') { const after = sdAfterColon([k]); if (after.found) vars[k.m.id] = { m: k.m, bodies: after.nodes, self: k }; return; }
        if (k.m.role !== 'marker' && k.m.role !== 'body') return;
        const v = vars[k.m.id] || (vars[k.m.id] = { m: k.m, bodies: [] });
        if (k.m.role === 'body') v.bodies.push(k);
    });
    const outside = SiddurCore.stripNiqqud(SiddurCore.plain(tree.c.filter(k => !(k.m && vars[k.m.id]))));
    const onlyVars = !/[א-ת]/.test(outside);
    const block = {};
    Object.keys(vars).forEach(id => {
        const v = vars[id];
        const len = SiddurCore.stripNiqqud(SiddurCore.plain(v.bodies)).replace(/\s+/g, ' ').trim().length;
        if (v.bodies.length && (onlyVars || len >= 25)) block[id] = v;
    });
    if (!Object.keys(block).length) {
        const el = newP();
        if (kids.length && kids.every(k => k.t === 'tag' && k.n === 'small')) el.classList.add('sd-seg-small');
        sdRenderNodes(tree.c, el);
        const inl = [];
        (function walk(n) { (n.c || []).forEach(k => { if (k.m && (k.m.role === 'marker' || k.m.role === 'self') && SiddurCore.evaluate(k.m.atoms, sdCtx) === 'on') inl.push(k.m.atoms); if (k.t === 'tag') walk(k); }); })(tree);
        const note = inl.length ? sdErrNote(inl[0], SiddurCore.plain(tree)) : '';
        if (!note) return el;
        const wrap = sdEl('div', 'sd-segbox');
        wrap.appendChild(el);
        wrap.appendChild(sdNoteEl(note));
        return wrap;
    }
    const wrap = sdEl('div', 'sd-segbox');
    let cur = null;
    const flush = () => { if (cur && cur.textContent.trim()) wrap.appendChild(cur); cur = null; };
    tree.c.forEach(k => {
        const v = k.m && block[k.m.id];
        if (!v) { if (!cur) cur = newP(); sdRenderNodes([k], cur); return; }
        if (k.m.role !== 'marker' && k.m.role !== 'self') return;   // le corps est rendu avec son marqueur
        flush();
        const bodyText = SiddurCore.plain(v.bodies);
        wrap.appendChild(sdVarBlock(v.m.atoms, '', bodyText, host => {
            const p = newP();
            // un corps en <small> est rendu à taille normale : c'est le texte à dire
            const flat = (list) => list.forEach(b => { if (b.t === 'tag' && b.n === 'small') flat(b.c); else sdRenderNodes([b], p, true); });
            flat(v.bodies);
            host.appendChild(p);
        }));
    });
    flush();
    return wrap;
}

// --- Repères de prière (refonte, étape 3) ------------------------------------------------------------------------------------------
// Dans la Amida : le nom de chaque bénédiction au-dessus d'elle, la traduction de sa conclusion après elle (« [… bouclier d'Avraham.] »),
// le signe des inclinaisons, et le mot à mot du début. Partout : le Nom divin écrit יְהֹוָה avec « אדני » au-dessus (réglage), comme dans le
// Maguen Avot ; la vocalisation de kavana de la source (יַהַוַהַ…) reste dans l'infobulle et revient avec le réglage « comme la source ».
// Repérage par les premiers mots (sans voyelles) de chaque segment. Traductions et noms écrits pour l'application : **à relire**.
const SD_BERAKHOT = [
    { id: 'avot', he: 'ברכת אבות', fr: 'Les Patriarches', start: /^ברוך אתה .*אלהינו ואלהי אבותינו/, end: /מגן אברהם/, hat: 'bouclier d\'Avraham' },
    { id: 'gevourot', he: 'ברכת גבורות', fr: 'La puissance divine', start: /^אתה גבור/, end: /מחיה המתים/, hat: 'qui ressuscite les morts' },
    { id: 'kedoucha', he: 'ברכת הקדושה', fr: 'La sainteté du Nom', start: /^אתה קדוש/, end: /האל הקדוש|המלך הקדוש/, hat: 'le D. qui est Saint', hatAseret: 'le Roi qui est Saint' },
    { id: 'bina', he: 'ברכת הדעת', fr: 'L\'intelligence', start: /^אתה חונן/, end: /חונן הדעת/, hat: 'qui gratifie d\'intelligence' },
    { id: 'techouva', he: 'ברכת התשובה', fr: 'Le retour', start: /^השיבנו/, end: /הרוצה בתשובה/, hat: 'qui veut la pénitence' },
    { id: 'selikha', he: 'ברכת הסליחה', fr: 'Le pardon', start: /^סלח לנו/, end: /המרבה לסל/, hat: 'qui multiplie Son pardon' },
    { id: 'gueoula', he: 'ברכת הגאולה', fr: 'La délivrance', start: /^ראה נא/, end: /גואל ישראל/, hat: 'qui sauve Israël' },
    { id: 'refoua', he: 'ברכת הרפואה', fr: 'La guérison', start: /^רפאנו/, end: /רופא חולי/, hat: 'qui guérit les malades de Son peuple Israël' },
    { id: 'chanim', he: 'ברכת השנים', fr: 'Les récoltes de l\'année', start: /^(ברכנו|ברך עלינו)/, end: /מברך השנים/, hat: 'qui bénit les années' },
    { id: 'kibouts', he: 'ברכת קבוץ גלויות', fr: 'Le rassemblement des exilés', start: /^תקע בשופר/, end: /מקבץ נדחי/, hat: 'qui rassemble les exilés de Son peuple Israël' },
    { id: 'din', he: 'ברכת השבת המשפט', fr: 'La justice', start: /^השיבה שופטינו/, end: /אוהב צדקה ומשפט|המלך המשפט/, hat: 'Roi qui aime charité et justice', hatAseret: 'le Roi de la justice' },
    { id: 'minim', he: 'ברכת המינים', fr: 'Contre les calomniateurs', start: /^ולמלשינים|^למינים/, end: /שובר אויבים/, hat: 'qui brise les ennemis et soumet les scélérats' },
    { id: 'tsadikim', he: 'ברכת הצדיקים', fr: 'Les justes', start: /^על הצדיקים/, end: /ומבטח לצדיקים/, hat: 'appui et abri pour les justes' },
    { id: 'yerouchalayim', he: 'ברכת בנין ירושלים', fr: 'Jérusalem', start: /^תשכון בתוך ירושלים|^ולירושלים/, end: /בונה ירושלים|מנחם ציון/, hat: 'qui construit Jérusalem', hatTishaBav: 'qui console Sion et réédifie Jérusalem' },
    { id: 'david', he: 'ברכת מלכות בית דוד', fr: 'Le règne de David', start: /^את צמח דוד/, end: /קרן ישועה/, hat: 'qui fait croître la corne du salut' },
    { id: 'tefila', he: 'ברכת קבלת התפלה', fr: 'L\'écoute de la prière', start: /^שמע קולנו/, end: /שומע תפלה/, hat: 'qui écoute la prière' },
    { id: 'avoda', he: 'ברכת העבודה', fr: 'Le service divin', start: /^רצה /, end: /שכינתו לציון/, hat: 'qui ramène Sa présence divine à Tsion' },
    { id: 'hodaa', he: 'ברכת ההודאה', fr: 'La reconnaissance', start: /^מודים אנחנו/, end: /הטוב שמך/, hat: 'dont le Nom est bon et à Toi il convient de rendre grâce' },
    { id: 'chalom', he: 'ברכת השלום', fr: 'La paix', start: /^שים שלום/, end: /עמו ישראל בשלום/, hat: 'qui bénit Son peuple Israël par la paix. Amen' },
    { id: 'netsor', he: 'אלהי נצור', fr: 'Prière personnelle', start: /^יהיו לרצון|^אלהי נצור/ }
];
function sdIsAmida(id) { return /amida|moussaf/.test(id); }
function sdBare(tree) { return SiddurCore.stripNiqqud(SiddurCore.plain(tree)).replace(/[,.:;־\-–]/g, ' ').replace(/\s+/g, ' ').trim(); }
function sdBerakhaStart(bare, list) { return (list || SD_BERAKHOT).find(b => b.start.test(bare)) || null; }

// Birkat haMazon : les quatre bénédictions, comme dans le Maguen Avot : leur nom, qui les a instituées, la traduction de leur conclusion.
// Repérage par les premiers mots (sans voyelles), valable pour les trois rites. Noms, notes et traductions écrits pour l'application : **à relire**.
const SD_BH = [
    { id: 'hazan', he: 'ברכת הזן', fr: 'La nourriture (Birkat haZan)', start: /^ברוך אתה יהוה אלהינו מלך העולם (האל )?הזן/, end: /הזן את ?הכל/, hat: 'qui nourrit tout',
      origin: 'La première bérakha fut instituée par Moché rabbénou, en remerciement de la manne.' },
    { id: 'haarets', he: 'ברכת הארץ', fr: 'La Terre (Birkat haArets)', start: /^נודה לך/, end: /על הארץ ועל המזון/, hat: 'pour la terre et pour la nourriture',
      origin: 'La deuxième bérakha fut instituée par Yéhochoua bin Noun à l\'entrée en Terre d\'Israël, en remerciement de la Terre et de ses fruits.' },
    { id: 'yerouchalayim', he: 'בונה ירושלים', fr: 'Jérusalem (Boné Yérouchalayim)', start: /^רחם (נא )?יהוה אלהינו/, end: /בונה (ברחמיו )?ירושלים|מנחם ציון/, hat: 'qui construit Jérusalem', hatTishaBav: 'qui console Sion et réédifie Jérusalem',
      origin: 'La troisième bérakha fut instituée par David haMélèkh pour Israël et Jérusalem, et complétée par Chélomo haMélèkh pour le Temple.' },
    { id: 'hatov', he: 'הטוב והמטיב', fr: 'La bonté (Hatov véhaMétiv)', start: /^ברוך אתה יהוה אלהינו מלך העולם( לעד)? האל אבינו/,
      origin: 'La quatrième bérakha fut instituée par les sages de Yavné quand les morts de Bétar purent enfin être enterrés : « Hatov », car leurs corps ne s\'étaient pas décomposés ; « Véhamétiv », car on leur donna une sépulture.',
      endNote: 'Fin de la quatrième bérakha.' }
];
// Dans l'édition ashkénaze, la source porte déjà la note d'origine devant la bénédiction : on ne la double pas.
const SD_BH_SRC_NOTE = /^(ברכה זו|בונה ירושלים דוד|הטוב והמטיב ביבנה)/;
function sdBerakhotFor(id) { return sdIsAmida(id) ? SD_BERAKHOT : /^birkat-hamazon/.test(id) ? SD_BH : null; }

// Le Zimoun : qui parle (SiddurCore.zimounRole). L'étiquette remplace la consigne : « L'officiant », « Les assistants ».
const SD_ROLES = { lead: 'L\'officiant', resp: 'Les assistants', again: 'L\'officiant reprend après eux', go: 'L\'officiant poursuit', fast: 'Celui qui n\'a pas mangé répond' };

// Le bandeau d'une section : le nom en français et en hébreu, une phrase pour dire quand on la dit, et parfois la règle (quantités, délais).
const SD_BANNERS = [
    { id: /^birkat-hamazon/, fr: 'Birkat haMazon', sub: 'Bénédictions après le repas', he: 'בִּרְכַּת הַמָּזוֹן' },
    { id: /^al-hamihya/, fr: 'Mé\'en Chaloch', sub: 'Bénédiction après un aliment des sept espèces, une pâtisserie ou du vin', he: 'בִּרְכַּת מֵעֵין שָׁלוֹשׁ',
      intro: 'Après avoir mangé un fruit des sept espèces (olives, dattes, raisins, figues, grenades), un aliment à base de l\'une des cinq céréales (pâtisserie, pâtes…) ou bu du vin, on dit cette bérakha. Il faut avoir mangé un kazayit (environ 30 g) dans le temps d\'une \'akhilat prass (environ 7,5 minutes), ou bu un révi\'it (environ 86 ml) de vin dans le temps d\'un chtiyat révi\'it. Sinon, ou pour un autre aliment, on dit Boré néfachot.' }
];
// Les autres bénédictions : bandeau de chaque section (le nom, quand on la dit). Noms et phrases écrits pour l'application : **à relire**.
SD_BANNERS.push(
    { id: /^birkhot-hanehenin$/, fr: 'Birkot haNéhénin', sub: 'Bénédictions avant de manger ou de boire', he: 'בִּרְכוֹת הַנֶּהֱנִין' },
    { id: /^birkhot-hareach$/, fr: 'Bénédictions sur les parfums', sub: 'Birkot haRéa\'h : avant de sentir', he: 'בִּרְכוֹת הָרֵיחַ',
      legend: [['Ni arbre ni plante, ou doute', 'musc, rue, parfum synthétique en flacon…'], ['Plantes, herbes', 'menthe, géranium…'], ['Arbres, arbustes', 'clous de girofle, roses, jasmin, romarin, basilic, bâtons de cannelle…']] },
    { id: /^chehehyanou$/, fr: 'Chéhé\'héyanou', sub: 'Vêtement neuf, fruit de saison, nouvelle maison', he: 'בִּרְכַּת שֶׁהֶחֱיָנוּ' },
    { id: /^mezouza$/, fr: 'Pose de la mézouza', sub: 'Avant de la fixer', he: 'בִּרְכַּת הַמְּזוּזָה' },
    { id: /^arc-en-ciel$/, fr: 'À la vue d\'un arc-en-ciel', sub: '', he: 'בִּרְכַּת הַקֶּשֶׁת' },
    { id: /^eclairs-tonnerre$/, fr: 'Éclairs et tonnerre', sub: 'Dès qu\'on les voit ou qu\'on les entend', he: 'בִּרְכַּת בְּרָקִים וּרְעָמִים' },
    { id: /^hala$/, fr: 'Prélèvement de la \'hala', sub: 'Séparer une part de la pâte', he: 'הַפְרָשַׁת חַלָּה' },
    { id: /^maake$/, fr: 'Pose d\'un parapet', sub: 'Avant de fixer le parapet du toit', he: 'בִּרְכַּת הַמַּעֲקֶה' },
    { id: /^tevilat-kelim$/, fr: 'Immersion de la vaisselle', sub: 'Ustensiles achetés à un non-Juif', he: 'בִּרְכַּת טְבִילַת כֵּלִים' },
    { id: /^tefilat-haderekh$/, fr: 'Prière du voyageur', sub: 'En sortant de la ville', he: 'תְּפִלַּת הַדֶּרֶךְ' },
    { id: /^birkhot-hareiyot$/, fr: 'Bénédictions « à la vue de… »', sub: 'Birkhot haRéyiyot', he: 'בִּרְכוֹת הָרְאִיָּה' },
    { id: /^dayan-haemet$/, fr: 'Dayan haEmet et Hatov véhaMétiv', sub: 'À l\'annonce d\'une mauvaise ou d\'une bonne nouvelle', he: 'דַּיַּן הָאֱמֶת' }
);

// La traduction de la conclusion, entre crochets, sous chaque bénédiction courte (comme « [… qui crée le fruit de la vigne.] » du Maguen Avot). Repérage par la fin du segment, sans voyelles.
const SD_SHORT_HAT_IDS = /^(birkhot-hanehenin|birkhot-hareach|chehehyanou|mezouza|arc-en-ciel|eclairs-tonnerre|maake|hala|tevilat-kelim|birkhot-hareiyot|dayan-haemet)$/;
const SD_SHORT_HATS = [
    [/בורא מיני מזונות$/, 'qui crée toutes sortes de nourritures'], [/בורא פרי הגפן$/, 'qui crée le fruit de la vigne'], [/בורא פרי העץ$/, 'qui crée le fruit de l\'arbre'],
    [/בורא פרי האדמה$/, 'qui crée le fruit de la terre'], [/שהכל נהיה בדברו$/, 'par la parole de qui tout fut'],
    [/בורא עצי בשמים$/, 'qui crée des arbustes aromatiques'], [/בורא עשבי בשמים$/, 'qui crée des herbes aromatiques'], [/בורא מיני בשמים$/, 'qui crée toutes sortes d\'aromates'],
    [/הנותן ריח טוב בפרות$/, 'qui donne une bonne odeur aux fruits'], [/שהחי+נו וקימנו והגיענו לזמן הזה$/, 'qui nous a fait vivre, nous a fait subsister et nous a fait parvenir à ce moment'],
    [/וצונו לקבע מזוזה$/, 'et nous a ordonné de fixer une mézouza'], [/וצונו לעשות מעקה$/, 'et nous a ordonné de faire un parapet'], [/וצונו להפריש חלה תרומה$/, 'et nous a ordonné de prélever la \'hala en offrande'],
    [/וצונו על טבילת כלי/, 'et nous a ordonné l\'immersion des ustensiles (de l\'ustensile)'],
    [/זוכר הברית נאמן בבריתו וקים במאמרו$/, 'qui se souvient de l\'alliance, fidèle à Son alliance et qui tient Sa parole'],
    [/עושה מעשה בראשית$/, 'qui accomplit l\'œuvre de la Création'], [/שכחו וגבורתו מלא עולם$/, 'dont la force et la puissance remplissent le monde'],
    [/דין האמת$/, 'le véritable Juge'], [/הטוב והמטיב$/, 'qui est bon et fait le bien'],
    [/חכם הרזים$/, 'qui connaît les secrets'], [/מציב גבול אלמנה$/, 'qui fixe la frontière de la veuve'], [/שעשה נסים לאבותינו במקום הזה$/, 'qui a fait des miracles à nos pères en ce lieu'],
    [/שככה לו בעולמו$/, 'qui a de tels êtres dans Son monde'], [/משנה הבריות$/, 'qui varie les créatures'], [/עשה את הים הגדול$/, 'qui a fait la Grande Mer'],
    [/שחלק מחכמתו ליראיו$/, 'qui a partagé de Sa sagesse avec ceux qui Le craignent'], [/שנתן מחכמתו לבשר ודם$/, 'qui a donné de Sa sagesse à des êtres de chair et de sang'],
    [/שחלק מכבודו ליראיו$/, 'qui a partagé de Sa gloire avec ceux qui Le craignent'], [/שנתן מכבודו לבשר ודם$/, 'qui a donné de Sa gloire à des êtres de chair et de sang']
];
function sdShortHat(id, bare) {
    if (!SD_SHORT_HAT_IDS.test(id) || !/^ברוך אתה/.test(bare)) return null;
    const h = SD_SHORT_HATS.find(x => x[0].test(bare));
    return h ? h[1] : null;
}

function sdBannerFor(id) { return SD_BANNERS.find(b => b.id.test(id)) || null; }

// Mé'en chaloch : le tableau d'une suite de trois lignes (céréales, vin, sept espèces), dans l'ordre du livre : de droite à gauche.
const SD_MC_HEADS = ['Céréales (pâtisserie, pâtes…)', 'Vin', 'Les sept espèces'];
const SD_MC_LABELS = { 'בחו"ל': 'Hors d\'Israël', 'וי"א גם': 'Certains ajoutent' };

// Les inclinaisons (usage séfarade) : au début et à la conclusion de la 1re bénédiction, et de la bénédiction de reconnaissance (Modim).
// Le signe est un nœud { t: 'text', v: '', k: 'bow' } glissé dans l'arbre avant le mot (le texte, lui, n'est pas modifié).
function sdWordAt(str, word, last) {
    let bare = '';
    const map = [];
    for (let i = 0; i < str.length; i++) if (!/[֑-ׇ]/.test(str[i])) { map.push(i); bare += str[i]; }
    const re = new RegExp('(^|[^א-ת])(' + word + ')(?![א-ת])', 'g');
    let m, at = -1;
    while ((m = re.exec(bare))) { at = m.index + m[1].length; if (!last) break; }
    return at < 0 ? -1 : map[at];
}
function sdInsertBow(tree, word, last) {
    const spots = [];
    (function walk(node) { (node.c || []).forEach((k, idx) => { if (k.t === 'text' && !k.k) spots.push({ list: node.c, k }); else if (k.t === 'tag') walk(k); }); })(tree);
    const order = last ? spots.slice().reverse() : spots;
    for (const sp of order) {
        const at = sdWordAt(sp.k.v, word, last);
        if (at < 0) continue;
        const idx = sp.list.indexOf(sp.k);
        sp.list.splice(idx, 1, { t: 'text', v: sp.k.v.slice(0, at) }, { t: 'text', v: '', k: 'bow' }, { t: 'text', v: sp.k.v.slice(at) });
        return true;
    }
    return false;
}
function sdAddBows(tree, bare) {
    let n = 0;
    if (/^ברוך אתה .*אלהינו ואלהי אבותינו/.test(bare)) n += sdInsertBow(tree, 'ברוך', false);
    if (/מגן אברהם/.test(bare) && /^ברוך אתה|^מלך עוזר/.test(bare)) n += sdInsertBow(tree, 'ברוך', true);
    if (/^מודים אנחנו/.test(bare)) n += sdInsertBow(tree, 'מודים', false);
    if (/הטוב שמך/.test(bare)) n += sdInsertBow(tree, 'ברוך', true);
    return n;
}

// Le Nom divin : יהוה (toutes vocalisations, avec ou sans préfixe ו ב ל כ מ ש) et la graphie de kavana יוהוווהו.
const SD_NQ = '[֑-ׇ]*';
const SD_NAME_RE = new RegExp('(^|[^א-ת֑-ׇ])([ובלכמש]' + SD_NQ + ')?(' + ['י', 'ה', 'ו', 'ה'].join(SD_NQ) + SD_NQ + '|' + ['י', 'ו', 'ה', 'ו', 'ו', 'ו', 'ה', 'ו'].join(SD_NQ) + SD_NQ + ')(?![א-ת])', 'g');
function sdMarkNames(node) {
    if (sdPrefs.name === 'source' || !node.c) return;
    const out = [];
    node.c.forEach(k => {
        if (k.t === 'tag') { sdMarkNames(k); out.push(k); return; }
        if (k.k || k.t !== 'text') { out.push(k); return; }
        let last = 0, m;
        SD_NAME_RE.lastIndex = 0;
        const parts = [];
        while ((m = SD_NAME_RE.exec(k.v))) {
            const start = m.index + m[1].length;
            const nameAt = start + (m[2] ? m[2].length : 0);
            parts.push({ t: 'text', v: k.v.slice(last, nameAt), m: k.m });
            parts.push({ t: 'text', v: m[3], k: 'name', pre: !!m[2], m: k.m });
            last = nameAt + m[3].length;
        }
        if (!parts.length) { out.push(k); return; }
        parts.push({ t: 'text', v: k.v.slice(last), m: k.m });
        parts.forEach(x => { if (x.v || x.k) out.push(x); });
    });
    node.c = out;
}
const SD_BOW_SVG = '<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M11 2H7A4 4 0 0 0 3.2 5.8V10.6M1.3 8.7l1.9 2.1 1.9-2.1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function sdSpecialNode(node) {
    if (node.k === 'bow') {
        const b = sdEl('span', 'sd-bow');
        b.setAttribute('role', 'img');
        b.setAttribute('aria-label', 'On s\'incline');
        b.title = 'On s\'incline';
        b.innerHTML = SD_BOW_SVG;      // dessin fixe de l'application, pas une donnée
        return b;
    }
    const el = sdEl('span', 'sd-name');
    el.title = node.v === 'יְהֹוָה' || node.v === 'יְהוָֹה' ? 'Nom divin : on prononce « Adonaï »' : 'Nom divin : on prononce « Adonaï » (dans la source : ' + node.v + ')';
    el.appendChild(sdTextNode(node.pre ? 'יהֹוָה' : 'יְהֹוָה'));
    return el;
}

// Le mot à mot (Maguen Avot) : chaque mot sur sa traduction, en lignes justifiées. Les mots sont repérés sans voyelles.
const SD_GLOSS = {
    'אדני': 'Éternel', 'שפתי': 'mes lèvres', 'תפתח': 'Tu ouvriras', 'ופי': 'et ma bouche', 'יגיד': 'dira', 'תהלתך': 'Ta louange',
    'ברוך': 'Source de bénédictions', 'אתה': 'Tu es', 'יהוה': 'Éternel', 'אלהינו': 'notre D.', 'ואלהי': 'et le D.', 'אבותינו': 'de nos pères',
    'אלהי': 'le D.', 'אברהם': 'd\'Avraham', 'יצחק': 'd\'Yts\'hak', 'יעקב': 'de Yaâkov', 'האל': 'le D.', 'הגדול': 'grand', 'הגבור': 'puissant',
    'והנורא': 'et redoutable', 'אל': 'D.', 'עליון': 'Suprême', 'גומל': 'qui prodigue', 'חסדים': 'des bontés', 'טובים': 'bienfaisantes',
    'קונה': 'possède', 'הכל': 'tout', 'וזוכר': 'et se rappelle', 'חסדי': 'des bontés', 'אבות': 'des Pères', 'ומביא': 'et amène', 'גואל': 'un sauveur',
    'לבני': 'aux enfants', 'בניהם': 'de leurs enfants', 'למען': 'en faveur', 'שמו': 'de Son Nom', 'באהבה': 'avec amour',
    'מלך': 'Roi', 'עוזר': 'qui aide', 'ומושיע': 'et sauve', 'ומגן': 'et protège', 'מגן': 'bouclier',
    'זכרנו': 'souviens-Toi de nous', 'לחיים': 'pour la vie', 'חפץ': 'qui désire', 'בחיים': 'la vie', 'כתבנו': 'inscris-nous', 'בספר': 'dans le livre',
    'חיים': 'de vie', 'למענך': 'pour Toi', 'אלהים': 'D.'
};
function sdGloss(word) { return SD_GLOSS[SiddurCore.stripNiqqud(word).replace(/[^א-ת]/g, '')] || ''; }
function sdJuxta(p) {
    const tokens = [];
    let bow = null;
    (function walk(parent, bold) {
        Array.prototype.slice.call(parent.childNodes).forEach(n => {
            if (n.nodeType === 3) {
                const orig = sdOrigText.has(n) ? sdOrigText.get(n) : n.nodeValue;
                orig.split(/\s+/).filter(w => w.trim()).forEach(w => {
                    // une ponctuation seule (« , » après un mot en gras ou le Nom divin) se colle au mot d'avant
                    const prev = tokens[tokens.length - 1];
                    if (!/[\u05D0-\u05EA]/.test(w) && prev && !/^\s/.test(orig)) { (prev.tail = (prev.tail || '') + w); return; }
                    tokens.push({ w, bold, bow }); bow = null;
                });
            } else if (n.classList && n.classList.contains('sd-bow')) bow = n;
            else if (n.classList && n.classList.contains('sd-name')) { tokens.push({ el: n, bold, bow, gloss: 'Éternel' }); bow = null; }
            else if (n.tagName === 'STRONG') walk(n, true);
            else { tokens.push({ el: n, bold, bow, gloss: '' }); bow = null; }
        });
    })(p, false);
    const box = sdEl('div', 'sd-jx');
    box.lang = 'he'; box.dir = 'rtl';
    tokens.forEach(tk => {
        const w = sdEl('span', 'sd-jx-w');
        const h = sdEl('span', 'sd-jx-h');
        if (tk.bow) h.appendChild(tk.bow);
        const inner = tk.bold ? sdEl('strong') : h;
        if (tk.el) inner.appendChild(tk.el); else inner.appendChild(sdTextNode(tk.w));
        if (tk.bold) h.appendChild(inner);
        if (tk.tail) h.appendChild(document.createTextNode(tk.tail));
        const g = sdEl('span', 'sd-jx-f', tk.el ? tk.gloss : sdGloss(tk.w));
        g.lang = 'fr';
        w.appendChild(h);
        w.appendChild(g);
        box.appendChild(w);
    });
    p.replaceWith(box);
}

function sdAfterColon(nodes) {
    let found = false;
    const walk = (list) => {
        const out = [];
        list.forEach(k => {
            if (found) { out.push(k); return; }
            if (k.t === 'text' && !k.k) {
                const i = k.v.indexOf(':');
                if (i >= 0) { found = true; const rest = k.v.slice(i + 1); if (rest.trim()) out.push(Object.assign({}, k, { v: rest, m: undefined })); }
                return;
            }
            if (k.t === 'tag') { const c = walk(k.c); if (found && c.length) out.push(Object.assign({}, k, { c, m: undefined })); }
        });
        return out;
    };
    const out = walk(nodes.map(k => k.m && k.m.role === 'self' ? Object.assign({}, k, { m: undefined }) : k));
    return { nodes: out, found };
}
// Une variante enveloppée dans une seule balise avec sa consigne (« <small><small>בתשעה באב מוסיפים:</small> <small>נַחֵם…</small></small> ») :
// { m, body } si elle est assez longue pour un bloc, sinon null (les variantes d'un mot restent dans la ligne).
function sdSelfBlock(tree) {
    const kids = tree.c.filter(k => !sdBlank(k));
    if (kids.length !== 1 || !kids[0].m || kids[0].m.role !== 'self' || kids[0].t !== 'tag') return null;
    const inner = kids[0].c.filter(k => !sdBlank(k));
    const body = inner[0] && inner[0].t === 'tag' && inner[0].n === 'small' && SiddurCore.conditionOf(SiddurCore.plain(inner[0])) ? inner.slice(1) : null;
    if (!body || SiddurCore.stripNiqqud(SiddurCore.plain(body)).trim().length < 25) return null;
    return { m: kids[0].m, body };
}

// Vidouï de Cha'harit : le Kaddich des autres jours, et les supplications propres au lundi et au jeudi (« אל מלך… » jusqu'au Kaddich final).
// Les consignes du livre sont négatives ou couvrent plusieurs segments : on les lit ici, section par section, d'après le jour de la semaine.
// usual : le texte de tous les jours ; le jour où il se dit, il reste dans le texte, sans bloc doré (seulement replié le jour où il ne se dit pas).
// Les consignes du livre que les règles générales ne savent pas lire (négatives, ou sans « : ») : des règles par section, d'après le jour.
// Chaque règle : la section, la consigne d'en-tête (sans voyelles), le nom du bloc, l'état du jour, et jusqu'où va le bloc.
const SD_DAY_RULES = [
    // Vidouï de Cha'harit : le Kaddich des autres jours, et les supplications du lundi et du jeudi (« אל מלך… » jusqu'au Kaddich final).
    { id: 'chacharit-vidoui', head: /^בימים שני וחמישי אין אומרים/, usual: true, label: 'Kaddich des autres jours (ni lundi ni jeudi)', on: c => !(c.weekday === 1 || c.weekday === 4) },
    { id: 'chacharit-vidoui', head: /^בימי שני וחמישי מוסיפים/, label: 'Lundi et jeudi : supplications ajoutées', on: c => c.weekday === 1 || c.weekday === 4, toEnd: true },
    // Fin du Vidouï de Min'ha : Lamnatséa'h, sauf la veille de Chabbat ; « Adonaï malakh » la veille de Chabbat ; « Téfila léani » un jour de jeûne public.
    { id: 'minha-vidoui', head: /^בערב שבת לא אומרים/, usual: true, label: 'Lamnatséa\'h (sauf la veille de Chabbat)', on: c => c.weekday !== 5 },
    { id: 'minha-vidoui', head: /^בערב שבת אומרים/, label: 'Veille de Chabbat : « Adonaï malakh »', on: c => c.weekday === 5 },
    { id: 'minha-vidoui', head: /^בתענית ציבור אומרים/, label: 'Jeûne public : « Téfila léani »', on: c => !!c.flags.fastPublic },
    // Arvit : « Ata 'honantanou » à la sortie de Chabbat et de fête ; Kaddich Titqabal les autres soirs ; ajouts de la sortie de Chabbat.
    { id: 'arvit-amida', head: /^במוצאי שבת ויום טוב מוסיפים/, label: 'Sortie de Chabbat ou de fête : « Ata \'honantanou »', on: c => c.weekday === 0 || sdPrevYomTov(c) },
    { id: 'arvit-amida', head: /^בכל לילות החול מלבד מוצאי שבת/, usual: true, label: 'Kaddich Titqabal (sauf à la sortie de Chabbat)', on: c => c.weekday !== 0 },
    // La sortie de Chabbat commence à « Chouva » ; la requête facultative qui le précède (« לפני שובה ») est repliée à part, « selon le cas ».
    { id: 'arvit-amida', head: /^במוצאי שבת/, label: 'Sortie de Chabbat : « Chouva »', on: c => c.weekday === 0, until: /^שיר למעלות/,
        optional: { head: /^לפני .?שובה.? יש נוהגים/, until: /^שובה/, label: 'Requête facultative avant « Chouva »' } },
    // Birkhot hacha'har : pas de « chéassa li kol tsorki » le 9 Av et à Kippour.
    { id: 'birkhot-hachahar', head: /^בתשעה באב וביום הכיפורים/, usual: true, label: '« Chéassa li kol tsorki » (sauf 9 Av et Kippour)', on: c => !c.flags.tishaBav && !(c.hebrew.month === 'Tishri' && c.hebrew.day === 10) },
    // Les passages qui ne se disent que les jours avec Tahanoun, ou seulement les jours sans.
    { id: 'chacharit-achre', head: /^ביום שאין אומרים בו תחנון/, usual: true, label: 'Lamnatséa\'h ya\'ankha (jours avec Tahanoun)', on: c => !c.flags.noTachanun },
    { id: 'chacharit-beit-yaakov', head: /^בימים שאין אומרים תחנון/, usual: true, label: 'Téfila lédavid (jours avec Tahanoun)', on: c => !c.flags.noTachanun },
    { id: 'chacharit-tora', head: /^ביום שיש בו תחנון/, usual: true, label: 'Jours avec Tahanoun : « El érekh apayim »', on: c => !c.flags.noTachanun, until: /^ביום שאין בו תחנון/ },
    { id: 'chacharit-tora', head: /^ביום שאין בו תחנון/, label: 'Jours sans Tahanoun : « Yehi Adonaï élohénou imanou »', on: c => !!c.flags.noTachanun },
    { id: /^(chacharit|minha)-amida$/, head: /^בימים שאין בהם תחנון יש אומרים/, label: 'Jours sans Tahanoun : « Yehi chem » (selon l\'usage)', on: c => !!c.flags.noTachanun },
    { id: 'tikoun-lea', head: /^בימים שאין אומרים תחנון לא יאמר מזמור/, usual: true, label: 'Lamnatséa\'h ya\'ankha (jours avec Tahanoun)', on: c => !c.flags.noTachanun },
    // Birkat hamazon ashkénaze et 'Habad (Michna Beroura 1, 11, d'après le Chelah) : « Al naharot Bavel » les jours où l'on dit Tahanoun,
    // « Chir hamaalot » les jours sans Tahanoun (Chabbat, fêtes, Roch 'Hodech, Hanouka…). Le rite séfarade dit le psaume 67 tous les jours.
    { id: /^birkat-hamazon-(ashkenaze|habad)$/, head: /^בחול קודם ברכת המזון/, label: 'Jours avec Tahanoun : « Al naharot Bavel »', on: c => !sdNoTachanun(c) },
    { id: /^birkat-hamazon-(ashkenaze|habad)$/, head: /^בשבת קודם ברכת המזון/, label: 'Jours sans Tahanoun (Chabbat, fêtes, Roch \'Hodech…) : « Chir hamaalot »', on: c => sdNoTachanun(c) },
    // Hanouka : Cha'harit donne la lecture de chacun des huit jours, puis celles de Roch 'Hodech Tévet et des Chabbat de Hanouka : on ne montre que celle du jour.
    ...['הראשון', 'השני', 'השלישי', 'הרביעי', 'החמישי', 'הששי', 'השביעי', 'השמיני'].map((w, k) => ({ id: 'hanouka-chacharit', head: new RegExp('^קריאה ליום ' + w), label: 'Lecture du ' + (k ? (k + 1) + 'e' : '1er') + ' jour de Hanouka', on: c => sdHanukkahDay(c) === k + 1, until: /^(קריאה ליום|\s*ראש חדש טבת|\s*שבת)/ })),
    { id: 'hanouka-chacharit', head: /^\s*ראש חדש טבת שחל בחול/, label: 'Roch \'Hodech Tévet pendant Hanouka : deux rouleaux', on: c => !!c.flags.rc, until: /^\s*שבת/ },
    { id: 'hanouka-chacharit', head: /^\s*שבת חנוכה/, label: 'Chabbat de Hanouka', on: c => !!c.flags.shabbat, until: /^\s*שבת וראש/ },
    { id: 'hanouka-chacharit', head: /^\s*שבת וראש חדש וחנוכה/, label: 'Chabbat, Roch \'Hodech et Hanouka', on: c => !!(c.flags.shabbat && c.flags.rc), toEnd: true },
    { id: 'tikoun-lea', head: /^בימים שאין אומרים תחנון לא יאמר פסוק/, usual: true, label: 'Verset « Ad ana bekhiya » (jours avec Tahanoun)', on: c => !c.flags.noTachanun }
];
// Le jour de Hanouka (1 à 8) : le 25 Kislev est le 1er.
function sdHanukkahDay(c) {
    try {
        const f = HebrewCalendarCore.feastsOf(c.hebrew.year, c.israel).filter(x => x.id === 'hanouka')[0];
        const n = f ? c.fixed - f.fixed + 1 : 0;
        return n >= 1 && n <= 8 ? n : 0;
    } catch (e) { return 0; }
}
function sdNoTachanun(c) { return !!(c.flags.noTachanun || c.flags.shabbat || c.flags.yomTov); }
function sdPrevYomTov(c) { try { return !!SiddurCore.contextFor(c.fixed - 1, c.israel).flags.yomTov; } catch (e) { return false; } }
function sdMonThuBlock(sectionId, bares, i) {
    const r = SD_DAY_RULES.find(x => (x.id instanceof RegExp ? x.id.test(sectionId) : x.id === sectionId) && x.head.test(bares[i]));
    if (!r || i + 1 >= bares.length) return null;
    if (r.usual && r.on(sdCtx)) return null;
    const state = r.on(sdCtx) ? 'on' : 'off';
    let from = i + 1;
    // Un passage facultatif annoncé au début du bloc (le jour où il s'applique) : replié à part, « selon le cas », et hors du bloc.
    const pre = [];
    if (state === 'on' && r.optional && r.optional.head.test(bares[from])) {
        let to = from + 1;
        while (to + 1 < bares.length && !r.optional.until.test(bares[to + 1])) to++;
        pre.push({ from: from + 1, to, label: r.optional.label, state: 'fold-unknown' });
        from = to + 1;
    }
    if (from >= bares.length) return null;
    let to = from;
    if (r.toEnd) to = bares.length - 1;
    else if (r.until) { while (to + 1 < bares.length && !r.until.test(bares[to + 1])) to++; }
    return { from: from, to, label: r.label, state: state, pre: pre };
}

// Ce qui se dit avec un minyan (Kaddich, Qédoucha) : dans un bloc gris, marqué « Avec minyan ».
const SD_KADDICH_START = /^(.{0,45} )?יתגדל ויתקדש/;
const SD_KADDICH_NEXT = /^(תתקבל|יהא שלמא|על ישראל ועל רבנן|עושה שלום)/;
function sdMinyanBox(name) {
    const b = sdEl('div', 'sd-qed sd-minyan');
    const tag = sdEl('p', 'sd-minyan-tag');
    tag.appendChild(sdEl('span', 'sd-chip is-minyan', 'Avec minyan'));
    if (name) tag.appendChild(sdEl('span', 'sd-minyan-name', name));
    b.appendChild(tag);
    return b;
}
// Les autres passages qui demandent un minyan : Barékhou (et la réponse), Modim dérabbanan et la Birkat Kohanim de la répétition.
// { from, to, name, atoms? } ; atoms : la Birkat Kohanim de Min'ha, qui ne se dit qu'un jour de jeûne public.
function sdMinyanRange(bares, i) {
    const b = bares[i];
    if (/ברכו את יהוה המברך$/.test(b)) {
        let j = i;
        while (j + 1 < bares.length && /^\S+( \S+)? ברוך יהוה המברך לעולם ועד/.test(bares[j + 1])) j++;
        return { from: i, to: j, name: 'Barékhou' };
    }
    if (/^מודים דרבנן/.test(b)) return { from: i, to: i, name: 'Modim dérabbanan' };
    const bk = /^ברכת כהנים ?(בחזרת|בתענית)/.test(b);
    if (bk) {
        let j = i;
        while (j + 1 < bares.length && j - i < 25 && !/^שים שלום/.test(bares[j + 1])) j++;
        if (/^ברכת כהנים ?בתענית/.test(b)) return { from: i + 1, to: j, name: 'Birkat Kohanim', atoms: ['fastPublic'], label: 'Birkat Kohanim (jeûne public, Min\'ha proche du coucher du soleil)' };
        return { from: i, to: j, name: 'Birkat Kohanim' };
    }
    return null;
}
// Le dernier segment du Kaddich qui commence en i (ses paragraphes suivants : Titqabal, Yehé chlama, Al Israël…), ou -1.
function sdKaddichEnd(bares, i, byHeader) {
    if (!SD_KADDICH_START.test(bares[i])) return -1;
    let j = i;
    while (j + 1 < bares.length && !byHeader[j + 1] && SD_KADDICH_NEXT.test(bares[j + 1])) j++;
    return j;
}
// Des segments dans un hôte (bloc de variante), les Kaddich en bloc gris.
function sdAppendSegs(host, from, to, bares, byHeader, seg) {
    for (let k = from; k <= to; k++) {
        const e = sdKaddichEnd(bares, k, byHeader);
        if (e < 0) { host.appendChild(seg(k)); continue; }
        const box = sdMinyanBox('Kaddich');
        const last = Math.min(e, to);
        for (let m = k; m <= last; m++) box.appendChild(seg(m));
        host.appendChild(box);
        k = last;
    }
}

// Le paratexte d'un chant : qui l'a écrit, dans quel contexte, ce qu'il veut dire ; et le bouton de la traduction française.
function sdAboutCard(about) {
    const card = sdEl('details', 'sd-about');
    card.open = true;
    card.appendChild(sdEl('summary', '', 'À propos de ce chant'));
    [['Auteur', about.auteur], ['Contexte', about.contexte], ['Sens', about.sens]].forEach(([label, text]) => {
        if (!text) return;
        const row = sdEl('p', 'sd-about-row');
        row.appendChild(sdEl('strong', '', label + ' : '));
        row.appendChild(document.createTextNode(text));
        card.appendChild(row);
    });
    const btn = sdEl('button', 'tool-history-chip sd-about-fr', sdPrefs.fr ? 'Masquer la traduction française' : 'Afficher la traduction française');
    btn.type = 'button';
    btn.setAttribute('aria-pressed', sdPrefs.fr ? 'true' : 'false');
    btn.onclick = () => { sdPrefs.fr = !sdPrefs.fr; sdSavePrefs(); sdRerender(); };
    card.appendChild(btn);
    card.appendChild(sdEl('p', 'sd-about-note', 'Titres, traductions et notes sont de l\'application et n\'ont pas été relus par un spécialiste : à vérifier auprès de votre rabbin.'));
    return card;
}

// Birkat haMazon : un « Harahaman » par ligne (la source en met plusieurs dans un segment, séparés par « * » ou par un point).
const SD_HARAHAMAN = /([.:])\s+(?=ה[֑-ׇ]*ר[֑-ׇ]*ח[֑-ׇ]*מ[֑-ׇ]*ן)/g;
function sdSplitHarahaman(node) {
    if (!node.c) return;
    const out = [];
    node.c.forEach(k => {
        if (k.t !== 'text' || (!/\*/.test(k.v) && !SD_HARAHAMAN.test(k.v))) { if (k.t === 'tag') sdSplitHarahaman(k); out.push(k); return; }
        SD_HARAHAMAN.lastIndex = 0;
        const parts = k.v.replace(SD_HARAHAMAN, '$1\u0001').split(/\s*\*\s*|\u0001/);
        parts.forEach(part => {
            if (!part.trim()) return;
            if (out.length) out.push({ t: 'tag', n: 'br', c: [] });
            out.push({ t: 'text', v: part.trim(), m: k.m });
        });
    });
    node.c = out;
}

// Le Zimoun : avec dix hommes ou plus, on ajoute « Élohénou ». La source le met entre parenthèses (« (בעשרה ויותר: אלהינו) ») : on garde le mot ou on l'enlève.
function sdApplyMinyan(node, ten) {
    if (!node.c) return;
    const out = [];
    for (let n = 0; n < node.c.length; n++) {
        const k = node.c[n];
        const txt = k.t === 'tag' ? SiddurCore.plain(k).replace(/\s+/g, ' ').trim() : '';
        if (k.t === 'tag' && k.n === 'small' && /^\(בעשרה/.test(txt) && /\)$/.test(txt)) {          // « (בעשרה ויותר: אלהינו) » tout entier dans le <small>
            const b = k.c.filter(x => x.t === 'tag' && x.n === 'b')[0];
            if (ten && b) out.push(b);
            continue;
        }
        if (k.t === 'tag' && k.n === 'small' && txt === 'בעשרה') {                                    // « (<small>בעשרה</small> אלהינו) » : les parenthèses sont dans le texte autour
            const prev = out[out.length - 1], next = node.c[n + 1];
            if (prev && prev.t === 'text' && /\(\s*$/.test(prev.v) && next && next.t === 'text' && /\)/.test(next.v)) {
                const at = next.v.indexOf(')');
                prev.v = prev.v.replace(/\(\s*$/, '');
                next.v = (ten ? next.v.slice(0, at) : '') + next.v.slice(at + 1);
                continue;
            }
        }
        if (k.t === 'tag') sdApplyMinyan(k, ten);
        out.push(k);
    }
    node.c = out;
}

// Les personnes à table dont le meneur demande la permission (« birchout… »), dans l'ordre où on les nomme avant « mes maîtres ».
// `sub` : un choix qui apparaît quand la case est cochée (un Cohen ou plusieurs, maître ou maîtresse de maison) ; `cohen` : la case « je suis moi-même Cohen » la neutralise.
const SD_ZIM_WHO = {
    rav:   { fr: 'Un rabbin ou un maître (Rav)', he: 'בִּרְשׁוּת הָרַב' },
    cohen: { fr: 'Cohen', cohen: true, sub: { key: 'zimCohen', label: 'Combien de Cohanim ?', opts: [['one', 'Seul'], ['many', '2 ou plus']], he: { one: 'בִּרְשׁוּת הַכֹּהֵן', many: 'בִּרְשׁוּת הַכֹּהֲנִים' } } },
    pere:  { fr: 'Mon père ou mon beau-père', he: 'בִּרְשׁוּת אָבִי מוֹרִי' },
    bh:    { fr: 'Maître ou maîtresse de maison (je suis invité)', sub: { key: 'zimHost', label: 'Qui reçoit ?', opts: [['m', 'Maître'], ['f', 'Maîtresse']], he: { m: 'בִּרְשׁוּת בַּעַל הַבַּיִת', f: 'בִּרְשׁוּת בַּעֲלַת הַבַּיִת' } } },
    brit:  { fr: 'Brit Mila : le père du bébé', he: 'בִּרְשׁוּת אֲבִי הַבֵּן' },
    simha: { fr: 'Celui qui fête sa Bar Mitsva', he: 'בִּרְשׁוּת בַּעַל הַשִּׂמְחָה' }
};
function sdZimounHe(k) { const w = SD_ZIM_WHO[k]; return w.sub ? w.sub.he[sdPrefs[w.sub.key]] : w.he; }
function sdZimounWho() {
    const w = sdPrefs.zimWho || {};
    return Object.keys(SD_ZIM_WHO).filter(k => w[k] && !(SD_ZIM_WHO[k].cohen && w.meCohen));
}
function sdZimounCheck(key, label) {
    const lab = sdEl('label', 'sd-check');
    const inp = sdEl('input');
    inp.type = 'checkbox';
    inp.checked = !!(sdPrefs.zimWho || {})[key];
    inp.onchange = () => {
        sdPrefs.zimWho = sdPrefs.zimWho || {};
        sdPrefs.zimWho[key] = inp.checked;
        sdSavePrefs(); sdRerender();
    };
    lab.appendChild(inp);
    lab.appendChild(sdEl('span', '', label));
    return lab;
}
// L'encadré de Halakha du Zimoun (Choul'han Aroukh, Ora'h 'Haïm 201) : qui dirige, à qui demander la permission.
function sdZimounHalakha() {
    const fold = sdEl('details', 'sd-about');
    fold.appendChild(sdEl('summary', '', 'Halakha : qui dirige le Zimoun ?'));
    [['Ordre d\'usage', 'Chez lui, le maître de maison dirige (il peut céder l\'honneur à un invité). Sinon, à érudition comparable : le Cohen (« vékidachto »), puis le Lévi, puis l\'Israël, le père avant son fils. Le plus grand en Torah passe avant : en pratique, on cède presque toujours la place au Rav. À niveau égal entre deux érudits, le Cohen l\'emporte.'],
     ['Demander la permission', 'Celui qui dirige demande la permission (« birchout… ») aux personnes à honorer avant « Névarekh » : Rav, Cohen (ou Cohanim), père, maître de maison. S\'il est lui-même Cohen, il ne mentionne pas le Cohen. Un érudit qui dirige n\'a pas à demander au Cohen moins instruit, mais beaucoup le font par courtoisie.'],
     ['Père et fils', 'Chez son père, le fils lui laisse diriger. Si le père est invité chez son fils, celui-ci lui cède l\'honneur par respect (kiboud av), sauf si le fils est un grand Rav et que son père lui cède la place.'],
     ['Fêtes', 'Au mariage ou à une Brit Mila, c\'est en général le marié ou le père du bébé qui dirige, ou le Rav à qui ils cèdent. Un invité de marque honoré par le maître de maison dirige à sa place ; il le bénit ensuite (« Haraḥaman hou yévarekh et ba\'al habayit hazé »).']].forEach(r => {
        const row = sdEl('p', 'sd-about-row');
        row.lang = 'fr';
        row.appendChild(sdEl('strong', '', r[0] + '. '));
        row.appendChild(document.createTextNode(r[1]));
        fold.appendChild(row);
    });
    const src = sdEl('p', 'sd-about-note', 'Source : Choul\'han Aroukh, Ora\'h \'Haïm 201. En cas de doute, demandez à votre rav : les usages varient selon les communautés.');
    src.lang = 'fr';
    fold.appendChild(src);
    return fold;
}

// Les réglages du Zimoun : le nombre d'hommes (3 à 9, dix ou plus) et, chez les Séfarades, la formule d'ouverture.
function sdZimounControls(withForm) {
    const box = sdEl('div', 'sd-guest-ctrls sd-zim-ctrls');
    const row = (label, key, opts, parent) => {
        const r = sdEl('div', 'sd-guest-row');
        r.appendChild(sdEl('span', 'sd-guest-lab', label));
        const seg = sdEl('div', 'sd-seg-btns');
        seg.setAttribute('role', 'group');
        seg.setAttribute('aria-label', label);
        opts.forEach(([v, txt]) => {
            const b = sdEl('button', '', txt);
            b.type = 'button';
            b.setAttribute('aria-pressed', String(sdPrefs[key]) === String(v) ? 'true' : 'false');
            b.onclick = () => { sdPrefs[key] = typeof v === 'number' ? v : v; sdSavePrefs(); sdRerender(); };
            seg.appendChild(b);
        });
        r.appendChild(seg);
        (parent || box).appendChild(r);
    };
    row('Hommes ayant mangé ensemble', 'zim', [[1, '1 ou 2'], [3, '3 à 9'], [10, '10 ou plus']]);
    if (withForm && sdPrefs.zim !== 1) row('Formule d\'ouverture', 'zimForm', [['a', 'Hav lan…'], ['b', 'Birchoutkhèm…']]);
    if (withForm && sdPrefs.zim !== 1) {
        const lab = sdEl('label', 'sd-check');
        const box1 = sdEl('input');
        box1.type = 'checkbox';
        box1.checked = !!sdPrefs.zimWed;
        box1.onchange = () => { sdPrefs.zimWed = box1.checked; sdSavePrefs(); sdRerender(); };
        lab.appendChild(box1);
        lab.appendChild(sdEl('span', '', 'Mariage (ou Chéva Berakhot des sept jours qui suivent)'));
        box.appendChild(lab);
    }
    if (withForm && sdPrefs.zim !== 1) {
        const g = sdEl('div', 'sd-zim-who');
        g.setAttribute('role', 'group');
        g.setAttribute('aria-label', 'Qui est à table');
        g.appendChild(sdEl('span', 'sd-guest-lab', 'Qui est à table ? (on demande leur permission)'));
        Object.keys(SD_ZIM_WHO).forEach(k => {
            g.appendChild(sdZimounCheck(k, SD_ZIM_WHO[k].fr));
            const sub = SD_ZIM_WHO[k].sub;
            if (sub && (sdPrefs.zimWho || {})[k]) row(sub.label, sub.key, sub.opts, g);
        });
        if ((sdPrefs.zimWho || {}).cohen || (sdPrefs.zimWho || {}).meCohen) g.appendChild(sdZimounCheck('meCohen', 'Je dirige et je suis moi-même Cohen (pas de permission à demander)'));
        box.appendChild(g);
    }
    const note = sdEl('p', 'sd-origin', sdPrefs.zim === 1 ? 'Seul ou à deux, on ne fait pas de Zimoun : on commence directement par la première bénédiction.' : 'Trois hommes adultes au moins doivent avoir mangé ensemble pour faire le Zimoun. À dix (minyan), on ajoute « Élohénou » et au moins sept d\'entre eux doivent avoir mangé du pain. Une fois que dix hommes ont mangé ensemble, il est interdit de se séparer en petits groupes pour le Zimoun.');
    note.lang = 'fr';
    box.appendChild(note);
    if (sdPrefs.zim !== 1) box.appendChild(sdZimounHalakha());
    return box;
}
function sdRoleEl(kind) { const r = sdEl('p', 'sd-role is-' + kind, SD_ROLES[kind]); r.lang = 'fr'; return r; }
function sdHeLine(chunks) {
    const p = sdEl('p', 'sd-seg'); p.lang = 'he'; p.dir = 'rtl';
    chunks.forEach(c => { if (typeof c === 'string') p.appendChild(sdTextNode(c)); else if (c.ten === 10 && sdPrefs.zim === 10) { const b = sdEl('b'); b.appendChild(sdTextNode(c.he)); p.appendChild(b); } });
    return p;
}
// Le Zimoun séfarade, dans l'ordre : l'officiant ouvre, l'assistance répond, l'officiant demande la permission, l'assistance bénit, l'officiant reprend.
function sdZimounSefarade() {
    const box = sdEl('div', 'sd-zimoun');
    box.appendChild(sdZimounControls(true));
    if (sdPrefs.zim === 1) return box;
    const a = sdPrefs.zimForm !== 'b';
    const ten = { ten: 10, he: ' אֱלֹהֵינוּ' };
    const who = sdZimounWho().map(k => sdZimounHe(k) + ', ').join('');      // « בִּרְשׁוּת הָרַב, בִּרְשׁוּת הַכֹּהֲנִים, … » dans l'ordre de préséance
    if (sdPrefs.zimWed) {       // le Zimoun d'un mariage : « chéhassim'ha bim'ono », le poème d'ouverture, et la suite des sept bénédictions
        const wl = (t) => { const e = sdEl('p', 'sd-origin', t); e.lang = 'fr'; return e; };
        box.appendChild(sdRoleEl('lead'));
        box.appendChild(wl('Le meneur tient une coupe de vin (kos chel bérakha) dans la main droite. Poème d\'ouverture, dit ou chanté avant le Zimoun :'));
        box.appendChild(sdHeLine(['דְּוַי הָסֵר וְגַם חָרוֹן. וְאָז אִלֵּם בְּשִׁיר יָרוֹן. נְחֵנוּ בְּמַעְגְּלֵי צֶדֶק. שְׁעֵה בִּרְכַּת יְשׁוּרוּן.']));
        box.appendChild(sdRoleEl('lead'));
        box.appendChild(sdHeLine([a ? 'הַב לָן וְנִבְרִיךְ לְמַלְכָּא עִלָּאָה קַדִּישָׁא' : 'בִּרְשׁוּתְכֶם הַב לָן נְבָרֵךְ']));
        box.appendChild(sdRoleEl('resp'));
        box.appendChild(sdHeLine([a ? 'שָׁמַיִם' : 'נְבָרֵךְ']));
        box.appendChild(sdRoleEl('lead'));
        box.appendChild(sdHeLine(['בִּרְשׁוּת מַלְכָּא עִלָּאָה קַדִּישָׁא, ' + who + 'וּבִרְשׁוּת מָרָנָן וְרַבָּנָן וְרַבּוֹתַי, וּבִרְשׁוּת הֶחָתָן וְהַכַּלָּה, נְבָרֵךְ', ten, ' שֶׁהַשִּׂמְחָה בִּמְעוֹנוֹ שֶׁאָכַלְנוּ מִשֶּׁלּוֹ']));
        box.appendChild(sdRoleEl('resp'));
        box.appendChild(sdHeLine(['בָּרוּךְ', ten, ' שֶׁהַשִּׂמְחָה בִּמְעוֹנוֹ שֶׁאָכַלְנוּ מִשֶּׁלּוֹ וּבְטוּבוֹ חָיִינוּ']));
        box.appendChild(sdRoleEl('again'));
        box.appendChild(sdHeLine(['בָּרוּךְ', ten, ' שֶׁהַשִּׂמְחָה בִּמְעוֹנוֹ שֶׁאָכַלְנוּ מִשֶּׁלּוֹ וּבְטוּבוֹ חָיִינוּ']));
        box.appendChild(wl('Puis l\'officiant dit le Birkat haMazon à voix haute. Avec trois à neuf hommes, c\'est la même formule, sans « Élohénou ».'));
        const fold = sdEl('details', 'sd-about');
        fold.appendChild(sdEl('summary', '', 'Règles propres au mariage et aux Chéva Berakhot'));
        [['Les sept bénédictions', 'À la fin du Birkat haMazon, on récite les sept bénédictions nuptiales sur une coupe de vin, souvent distribuées entre des invités que l\'on veut honorer. La bénédiction sur le vin (Boré péri haguéfen) se dit avant ou à la fin, selon l\'usage ; puis le marié, la mariée et les convives boivent.'],
         ['Conditions', 'Pour dire les sept bénédictions complètes après le Zimoun : la présence d\'un minyan (dix hommes, dont le marié), celle des deux époux, et un repas pris chez le couple ou dans la salle de réception.'],
         ['Partir avant la fin', 'Tous les invités de la salle forment un seul groupe pour le Zimoun. Comme les mariages se prolongent tard, un invité qui doit partir avant le Birkat haMazon général peut faire un Zimoun à trois avec d\'autres personnes qui partent aussi, ou dire son Birkat haMazon seul en cas de nécessité.']].forEach(r => {
            const row = sdEl('p', 'sd-about-row');
            row.lang = 'fr';
            row.appendChild(sdEl('strong', '', r[0] + '. '));
            row.appendChild(document.createTextNode(r[1]));
            fold.appendChild(row);
        });
        box.appendChild(fold);
        return box;
    }
    box.appendChild(sdRoleEl('lead'));
    box.appendChild(sdHeLine([a ? 'הַב לָן וְנִבְרִיךְ לְמַלְכָּא עִלָּאָה קַדִּישָׁא' : 'בִּרְשׁוּתְכֶם הַב לָן נְבָרֵךְ']));
    box.appendChild(sdRoleEl('resp'));
    box.appendChild(sdHeLine([a ? 'שָׁמַיִם' : 'נְבָרֵךְ']));
    box.appendChild(sdRoleEl('lead'));
    box.appendChild(sdHeLine(['בִּרְשׁוּת מַלְכָּא עִלָּאָה קַדִּישָׁא, ' + who + 'וּבִרְשׁוּת מָרָנָן וְרַבָּנָן וְרַבּוֹתַי, נְבָרֵךְ', ten, ' שֶׁאָכַלְנוּ מִשֶּׁלּוֹ']));
    if (!who) {
        const more = sdEl('p', 'sd-origin', 'Selon l\'assistance, cochez plus haut les personnes présentes : leur permission (« birchout… ») s\'ajoute alors ici.');
        more.lang = 'fr';
        box.appendChild(more);
    }
    box.appendChild(sdRoleEl('resp'));
    box.appendChild(sdHeLine(['בָּרוּךְ', ten, ' שֶׁאָכַלְנוּ מִשֶּׁלּוֹ וּבְטוּבוֹ חָיִינוּ']));
    box.appendChild(sdRoleEl('again'));
    box.appendChild(sdHeLine(['בָּרוּךְ', ten, ' שֶׁאָכַלְנוּ מִשֶּׁלּוֹ וּבְטוּבוֹ חָיִינוּ']));
    return box;
}

// Mé'en chaloch séfarade : les ajouts des jours particuliers (« בשבת » + texte, dans le même segment) deviennent des blocs « selon le jour », comme chez les Ashkénazes.
const SD_MC_DAYS = [
    { re: /^בשבת /, atoms: ['shabbat'], label: 'Chabbat' }, { re: /^בראש ?חודש /, atoms: ['rc'], label: 'Roch \'Hodech' },
    { re: /^בראש ?השנה /, atoms: ['roshHashana'], label: 'Roch Hachana' }, { re: /^בפסח /, atoms: ['pesach'], label: 'Pessa\'h' },
    { re: /^בשבועות /, atoms: ['shavuot'], label: 'Chavouot' }, { re: /^בסוכות /, atoms: ['sukkot'], label: 'Souccot' },
    { re: /^בשמיני עצרת /, atoms: ['shemini'], label: 'Chémini Atséret' }
];

// Le bandeau d'une section (voir SD_BANNERS).
function sdBannerEl(b) {
    const box = sdEl('header', 'sd-banner');
    box.appendChild(sdEl('p', 'sd-banner-fr', b.fr));
    if (b.sub) box.appendChild(sdEl('p', 'sd-banner-sub', b.sub));
    const he = sdEl('h4', 'sd-title');
    he.lang = 'he'; he.dir = 'rtl';
    he.appendChild(sdTextNode(b.he));
    box.appendChild(he);
    if (b.intro) { const p = sdEl('p', 'sd-banner-intro', b.intro); p.lang = 'fr'; box.appendChild(p); }
    if (b.legend) {
        const g = sdEl('div', 'sd-vtab sd-vtab-fr');
        b.legend.forEach(c => { const h = sdEl('div', 'sd-vtab-head', c[0]); h.lang = 'fr'; g.appendChild(h); });
        b.legend.forEach((c, n) => { const e = sdEl('div', 'sd-vtab-cell' + (n === 0 ? ' is-first' : ''), c[1]); e.lang = 'fr'; g.appendChild(e); });
        box.appendChild(g);
    }
    return box;
}

// Mé'en chaloch : le tableau de trois lignes (céréales, vin, sept espèces). Chaque ligne est « consigne + texte » (séfarade : « אם אכל מזונות יאמר » puis
// le texte ; avec « של ארץ ישראל » au milieu, deux textes : hors d'Israël puis Terre d'Israël) ou « consigne— texte » (ashkénaze, avec ses variantes entre parenthèses).
function sdMcCells(tree) {
    const kids = tree.c.filter(k => !sdBlank(k));
    const smalls = kids.filter(k => k.t === 'tag' && k.n === 'small');
    if (smalls.length >= 4 && SiddurCore.plain(smalls[2]).replace(/\s+/g, ' ').trim() === 'של ארץ ישראל') return [smalls[1].c, smalls[3].c];
    if (smalls.length === 2 && kids.length === 2) return [smalls[1].c];                    // consigne + texte, chacun dans son <small>
    const rest = kids.slice(1);                                                           // la consigne vient en premier
    return [rest.map(k => k.t === 'text' ? { t: 'text', v: k.v.replace(/[—()]/g, ''), m: k.m } : k)];
}
function sdMcTable(trees) {
    const cols = trees.map(sdMcCells);
    const rows = Math.max.apply(null, cols.map(c => c.length));
    const box = sdEl('div', 'sd-vtab');
    box.dir = 'rtl';
    SD_MC_HEADS.forEach(h => { const e = sdEl('div', 'sd-vtab-head', h); e.lang = 'fr'; e.dir = 'ltr'; box.appendChild(e); });
    for (let r = 0; r < rows; r++) {
        if (rows > 1) { const cap = sdEl('div', 'sd-vtab-cap', r === 0 ? 'Si la nourriture ne provient pas d\'Israël' : 'Si la nourriture provient d\'Israël'); cap.lang = 'fr'; cap.dir = 'ltr'; box.appendChild(cap); }
        cols.forEach((c, n) => {
            const cell = sdEl('div', 'sd-vtab-cell' + (n === 0 ? ' is-first' : '')); cell.lang = 'he'; cell.dir = 'rtl';
            (c[r] || []).forEach(k => {
                const lab = k.t === 'tag' && k.n === 'small' ? SD_MC_LABELS[SiddurCore.plain(k).replace(/\s+/g, ' ').trim()] : null;
                if (lab) { const l = sdEl('span', 'sd-vtab-lab', lab); l.lang = 'fr'; l.dir = 'ltr'; cell.appendChild(l); }
                else sdRenderNodes([k], cell, true);
            });
            box.appendChild(cell);
        });
    }
    return box;
}

function sdRenderSection(section) {
    const box = sdEl('section', 'sd-section-box');
    box.id = 'sd-sec-' + section.id;
    const banner = sdBannerFor(section.id);
    if (sdView.ids.length > 1 && !banner) {
        const head = sdEl('h4', 'sd-sec-head');
        head.appendChild(sdEl('span', '', section.fr));
        const he = sdEl('span', 'sd-sec-head-he', section.he);
        he.lang = 'he'; he.dir = 'rtl';
        head.appendChild(he);
        box.appendChild(head);
    }
    if (section.about) box.appendChild(sdAboutCard(section.about));
    const counter = { n: 1 };
    // Le profil (homme / femme, js/app/first-profile.js) : la version du texte qui le concerne ; les indices restent ceux du livre.
    const gender = typeof profileGender === 'function' ? profileGender() : null;
    const prof = ProfileCore.adaptSection(section.segments, gender);
    const trimFrom = (sdView.trim || {})[section.id];
    if (Number.isInteger(trimFrom)) for (let k = trimFrom; k < section.segments.length; k++) prof.hidden.add(k);
    const trees = prof.segments.map(html => SiddurCore.analyseSegment(html, counter));
    const amida = sdIsAmida(section.id);
    const bkList = sdBerakhotFor(section.id);           // les bénédictions à titrer (Amida, Birkat haMazon), ou null
    const bares = trees.map(sdBare);
    const bhSection = /^birkat-hamazon/.test(section.id);
    const mcAt = {};
    if (/^al-hamihya/.test(section.id)) SiddurCore.mcTables(bares).forEach(tb => { mcAt[tb.from] = tb; });
    let bows = 0;
    trees.forEach((tr, k) => { if (amida) bows += sdAddBows(tr, bares[k]); sdMarkNames(tr); });
    if (bhSection) trees.forEach(tr => { sdApplyMinyan(tr, sdPrefs.zim === 10); sdSplitHarahaman(tr); });
    const groups = SiddurCore.groups(section.segments);
    const byHeader = {};
    groups.forEach(g => { byHeader[g.header] = g; });
    let omerAt = -1;
    if (section.id === 'omer' && sdCtx.omer > 0) omerAt = SiddurCore.omerSegment(section.segments, sdCtx.omer);
    if (section.id === 'omer' && sdCtx.omer > 0) box.appendChild(sdEl('p', 'sd-omer-note', t('tools.sd_omer_today', { n: sdCtx.omer })));
    // Les traductions servent toujours aux consignes ; sous chaque segment, seulement si on les a demandées.
    const frAll = section.fr_t || null;
    const frOf = (i) => { const tr = frAll && frAll[i]; return tr && tr[0] === SiddurCore.fingerprint(section.segments[i]) ? ProfileCore.adaptFr(tr[1], gender) : null; };
    if (sdPrefs.fr && !frAll) box.appendChild(sdEl('p', 'sd-fr-missing', t('tools.sd_fr_missing')));
    const seg = (i) => {
        const role = /^birkat-hamazon/.test(section.id) ? SiddurCore.zimounRole(bares[i]) : null;
        if (role) { const r = sdEl('p', 'sd-role is-' + role, SD_ROLES[role]); r.lang = 'fr'; return r; }
        const fr = frOf(i);
        let el = sdRenderSegment(trees[i], i, fr);
        if (amida && sdPrefs.jx && /^(אדני שפתי|ברוך אתה .*אלהינו ואלהי אבותינו)/.test(bares[i])) {
            if (el.matches('.sd-seg')) { const holder = sdEl('div', 'sd-segbox'); holder.appendChild(el); el = holder; }
            Array.prototype.slice.call(el.querySelectorAll('.sd-seg')).forEach(sdJuxta);
        }
        if (i === omerAt) el.classList.add('sd-omer-today');
        if (!sdPrefs.fr || !fr || el.classList.contains('sd-rub')) return el;
        const wrap = document.createDocumentFragment();
        wrap.appendChild(el);
        const frEl = sdEl('p', 'sd-fr-seg', fr);
        frEl.lang = 'fr';
        wrap.appendChild(frEl);
        return wrap;
    };
    // Amida : le nom de la bénédiction avant elle, la traduction de sa conclusion après le segment qui la contient.
    const seen = {};
    // La Qédoucha de la répétition : dans un bloc gris, de son titre jusqu'à la bénédiction suivante.
    let out = box;
    let open = null;
    let pendingEnd = null;     // « Fin de la quatrième bérakha » : après le segment qui la porte
    const flushEnd = () => { if (!pendingEnd) return; const p = sdEl('p', 'sd-hat', '(' + pendingEnd + ')'); p.lang = 'fr'; out.appendChild(p); pendingEnd = null; };
    const headFor = (from, to) => {
        if (!bkList) return;
        for (let k = from; k <= to; k++) {
            const b = sdBerakhaStart(bares[k], bkList);
            if (!b || seen[b.id]) continue;
            seen[b.id] = true;
            out = box;
            if (b.id === 'avot' && bows) {
                const lg = sdEl('p', 'sd-rub sd-bow-legend');
                lg.lang = 'fr';
                const ic = sdSpecialNode({ k: 'bow' });
                lg.appendChild(ic);
                lg.appendChild(document.createTextNode('On s\'incline au début et à la fin de la première bénédiction, et au début et à la fin de Modim, aux endroits marqués de ce signe ; pas pour les autres bénédictions. Façon de s\'incliner selon les Séfaradim : quand on dit « Baroukh », on se courbe sans fléchir les genoux ; quand on dit « Atta », on baisse la tête ; quand on prononce le Nom divin, on se redresse.'));
                out.appendChild(lg);
            }
            const h = sdEl('p', 'sd-bk');
            h.dataset.bk = b.id;
            h.appendChild(sdEl('span', 'sd-bk-fr', b.fr));
            const he = sdEl('span', 'sd-bk-he', b.he);
            he.lang = 'he'; he.dir = 'rtl';
            h.appendChild(he);
            out.appendChild(h);
            if (b.origin && !(k > 0 && SD_BH_SRC_NOTE.test(bares[k - 1]))) { const o = sdEl('p', 'sd-origin', b.origin); o.lang = 'fr'; out.appendChild(o); }
            pendingEnd = b.endNote || null;
            open = b.hat ? b : null;
            return;
        }
    };
    const hatAfter = (from, to, deferIfNextGroup) => {
        if (!open || sdPrefs.fr) return;
        let hit = false;
        for (let k = from; k <= to; k++) if (/ברוך אתה/.test(bares[k]) && open.end.test(bares[k])) hit = true;
        if (!hit || deferIfNextGroup) return;
        const on = (atom) => SiddurCore.evaluate([atom], sdCtx) === 'on';
        const hat = open.hatAseret && on('aseret') ? open.hatAseret : open.hatTishaBav && on('tishaBav') ? open.hatTishaBav : open.hat;
        const p = sdEl('p', 'sd-hat', '[… ' + hat + '.]');
        p.lang = 'fr';
        out.appendChild(p);
        open = null;
    };
    // Le psaume du jour : celui du jour (et ceux des jours particuliers) en bloc « Aujourd'hui », les autres repliés.
    const psalmDay = /chir-chel-yom/.test(section.id);
    let i = 0;
    while (i < trees.length) {
        if (prof.hidden.has(i)) { i++; continue; }       // la version de l'autre profil
        if (i === 0 && banner) { box.appendChild(sdBannerEl(banner)); i++; continue; }
        if (mcAt[i]) { out.appendChild(sdMcTable(trees.slice(i, mcAt[i].to + 1))); i = mcAt[i].to + 1; continue; }
        if (section.id === 'birkat-hamazon' && i === 4 && /^אם המסובים שלושה/.test(bares[4]) && /^ברוך אתה/.test(bares[15] || '')) { out.appendChild(sdZimounSefarade()); i = 15; continue; }
        if (bhSection && section.id !== 'birkat-hamazon' && /^שלושה שאכלו/.test(bares[i])) {
            out.appendChild(sdZimounControls(false));
            if (sdPrefs.zim === 1) {                       // sans Zimoun : on saute jusqu'à la première bénédiction (avec la note d'origine de la source, s'il y en a une)
                let j = bares.findIndex(b => SD_BH[0].start.test(b));
                if (j > i) { if (SD_BH_SRC_NOTE.test(bares[j - 1])) j--; i = j; continue; }
            }
        }
        const mcDay = section.id === 'al-hamihya' ? SD_MC_DAYS.find(d => d.re.test(bares[i])) : null;
        if (mcDay) {
            const smalls = trees[i].c.filter(k => k.t === 'tag' && k.n === 'small').slice(1);
            out.appendChild(sdVarBlock(mcDay.atoms, mcDay.label, SiddurCore.plain(smalls), host => {
                const p = sdEl('p', 'sd-seg'); p.lang = 'he'; p.dir = 'rtl';
                smalls.forEach((sm, n) => { if (n) p.appendChild(document.createTextNode(' ')); sdRenderNodes(sm.c, p); });
                host.appendChild(p);
            }));
            i++;
            continue;
        }
        if (amida && out === box && /^קדושה/.test(bares[i])) { out = sdMinyanBox('Qédoucha'); box.appendChild(out); }
        const ps = psalmDay && i + 1 < trees.length ? SiddurCore.dayPsalm(SiddurCore.plain(trees[i]), sdCtx) : null;
        if (ps) {
            const fr = frOf(i);
            const label = fr ? fr.split(/\s*:/)[0].replace(/,?\s*on dit$/, '').trim() : SiddurCore.plain(trees[i]).trim();
            const h = i;
            // « היום יום רביעי בשבת קודש… » se récite : on le garde en hébreu, comme texte de prière ; le reste de l'en-tête est le nom du bloc.
            const head = SiddurCore.plain(trees[h]).replace(/\s+/g, ' ').trim();
            const at = sdWordAt(head, 'היום', false);
            out.appendChild(sdVarBlock([], label, SiddurCore.plain(trees[h + 1]), host => {
                if (at >= 0) { const p = sdEl('p', 'sd-seg'); p.lang = 'he'; p.dir = 'rtl'; p.appendChild(sdTextNode(head.slice(at))); host.appendChild(p); }
                host.appendChild(seg(h + 1));
            }, ps === 'unknown' ? 'fold-unknown' : ps));
            i += 2;
            continue;
        }
        // Variante enveloppée (9 Av : « Na'hem ») : un bloc, avec sa conclusion propre (« … מְנַחֵם צִיּוֹן ») ; ce jour-là, la conclusion
        // ordinaire (« … בּוֹנֵה יְרוּשָׁלָיִם ») est repliée.
        const selfB = sdSelfBlock(trees[i]);
        if (selfB) {
            const to = i + 1 < trees.length && /^ברוך אתה .*מנחם ציון/.test(bares[i + 1]) ? i + 1 : i;
            const from = i;
            headFor(i, i);
            const bodyText = SiddurCore.plain(selfB.body);
            out.appendChild(sdVarBlock(selfB.m.atoms, '', bodyText, host => {
                const p = sdEl('p', 'sd-seg'); p.lang = 'he'; p.dir = 'rtl';
                selfB.body.forEach(b => { if (b.t === 'tag' && b.n === 'small') sdRenderNodes(b.c, p); else sdRenderNodes([b], p, true); });
                host.appendChild(p);
                for (let k = from + 1; k <= to; k++) host.appendChild(seg(k));
            }));
            if (to > from && to + 1 < trees.length && /^ברוך אתה .*בונה ירושלים/.test(bares[to + 1]) && SiddurCore.evaluate(selfB.m.atoms, sdCtx) === 'on') {
                const k = to + 1;
                out.appendChild(sdVarBlock([], 'Conclusion des autres jours', SiddurCore.plain(trees[k]), host => host.appendChild(seg(k)), 'off'));
                i = k + 1;
                continue;
            }
            i = to + 1;
            continue;
        }
        const mr = out === box ? sdMinyanRange(bares, i) : null;
        if (mr) {
            const fill = host => { const mb = sdMinyanBox(mr.name); for (let k = mr.from; k <= mr.to; k++) mb.appendChild(seg(k)); host.appendChild(mb); };
            if (mr.atoms) out.appendChild(sdVarBlock(mr.atoms, mr.label, SiddurCore.plain(trees.slice(mr.from, mr.to + 1)), fill));
            else fill(out);
            i = mr.to + 1;
            continue;
        }
        const kEnd = !byHeader[i] && out === box ? sdKaddichEnd(bares, i, byHeader) : -1;
        if (kEnd >= 0) { const kb = sdMinyanBox('Kaddich'); for (let k = i; k <= kEnd; k++) kb.appendChild(seg(k)); out.appendChild(kb); i = kEnd + 1; continue; }
        const mt = sdMonThuBlock(section.id, bares, i);
        if (mt) {
            mt.pre.forEach(p => out.appendChild(sdVarBlock([], p.label, SiddurCore.plain(trees.slice(p.from, p.to + 1)), host => sdAppendSegs(host, p.from, p.to, bares, byHeader, seg), p.state)));
            out.appendChild(sdVarBlock([], mt.label, SiddurCore.plain(trees.slice(mt.from, mt.to + 1)), host => sdAppendSegs(host, mt.from, mt.to, bares, byHeader, seg), mt.state));
            i = mt.to + 1;
            continue;
        }
        const g = byHeader[i];
        if (!g) {
            headFor(i, i); out.appendChild(seg(i)); hatAfter(i, i); flushEnd();
            const sh = sdPrefs.fr ? null : sdShortHat(section.id, bares[i]);
            if (sh) { const hp = sdEl('p', 'sd-hat', '[… ' + sh + '.]'); hp.lang = 'fr'; out.appendChild(hp); }
            if (section.id === 'birkat-hamazon' && /^הרחמן הוא יטע תורתו/.test(bares[i])) { out.appendChild(sdGuestBlock()); out.appendChild(sdOccasionBlocks()); }
            if (section.id === 'chacharit-tora' && /אשר בחר בנו מכל העמים/.test(bares[i])) out.appendChild(sdReadingButton());
            i++; continue;
        }
        headFor(g.from, g.to);
        // la consigne d'en-tête (« בראש חודש מוסיפים: ») devient le nom du bloc, en français si on l'a
        const headFr = !sdPrefs.heRub && frOf(g.header);
        // une consigne longue (plus d'une ligne) : le nom court de la condition suffit sur la ligne repliée
        const label = headFr && headFr.length <= 60 ? headFr.replace(/[\s:.]+$/, '') : sdCap(sdAtomsLabel(g.atoms));
        const bodyText = SiddurCore.plain(trees.slice(g.from, g.to + 1));
        const indFast = g.atoms.indexOf('fastIndividual') !== -1 && SiddurCore.evaluate(g.atoms, sdCtx) === 'unknown';
        // 'Anénou : deux passages, à distinguer (celui de l'officiant dans la répétition, celui de chacun dans Chéma' kolénou)
        const anenou = /^עננו/.test(bares[g.from]) && g.atoms.some(x => /fast/.test(x));
        const name = anenou ? (indFast ? '\'Anénou (jour de jeûne)' : g.atoms.indexOf('fastPublic') !== -1 && g.atoms.length === 1 ? '\'Anénou de l\'officiant (jeûne public)' : label) : label;
        out.appendChild(sdVarBlock(g.atoms, name, bodyText, host => sdAppendSegs(host, g.from, g.to, bares, byHeader, seg), indFast ? 'fold-ind' : undefined));
        // 9 Av (Min'ha) : ce jour-là, la conclusion ordinaire qui suit est repliée.
        if (g.atoms.indexOf('tishaBav') !== -1 && SiddurCore.evaluate(g.atoms, sdCtx) === 'on' && g.to + 1 < trees.length && /^ברוך אתה .*בונה ירושלים/.test(bares[g.to + 1])) {
            const k = g.to + 1;
            out.appendChild(sdVarBlock([], 'Conclusion des autres jours', SiddurCore.plain(trees[k]), host => host.appendChild(seg(k)), 'off'));
            i = k + 1;
            continue;
        }
        // été / hiver de Barekh alénou : deux blocs de suite, la conclusion vient après le second
        const nextG = byHeader[g.to + 1];
        hatAfter(g.from, g.to, !!(nextG && sdBerakhaStart(bares[nextG.from], bkList) && open && sdBerakhaStart(bares[nextG.from], bkList).id === open.id));
        i = g.to + 1;
    }
    if (section.id === 'birkat-hamazon' && sdPrefs.zimWed && sdPrefs.zim !== 1) {
        const note = sdEl('div', 'sd-chevaberakhot');
        const tx = sdEl('p', 'sd-origin', 'Repas de mariage : on récite maintenant les sept bénédictions nuptiales sur une coupe de vin (voir le texte).');
        tx.lang = 'fr';
        note.appendChild(tx);
        const btn = sdEl('button', 'tool-history-chip', 'Ouvrir les sept bénédictions');
        btn.type = 'button';
        btn.onclick = () => sdOpen(['cheva-berakhot'], 'Chéva berakhot');
        note.appendChild(btn);
        box.appendChild(note);
    }
    return box;
}
