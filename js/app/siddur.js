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

let sdIndex = null;
const sdCache = {};
// v : version des réglages. En v2, la police par défaut passe de Noto Serif à Frank Ruhl Libre (la seule à avoir un vrai gras) ;
// un « noto-serif » enregistré avant la v2 n'était que l'ancien défaut, pas un choix : il est remplacé.
let sdPrefs = { v: 2, size: 2, niqqud: true, all: false, fr: false, font: 'frank', heRub: false, jx: true, name: 'adonai', fab: true, hideOff: false };
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
        israel = ZmanimCore.inIsrael(sdPlace);
    } else {
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
    return sdFetchJson(SD_DATA + 'index.json').then(index => { sdIndex = index; return index; });
}
function sdLoadSection(id) {
    if (sdCache[id]) return Promise.resolve(sdCache[id]);
    return sdFetchJson(SD_DATA + id + '.json').then(section => { sdCache[id] = section; return section; });
}
// La traduction française d'une section (facultative) : { indice : [empreinte, texte] }, ou null s'il n'y en a pas.
const sdFrCache = {};
function sdLoadFr(id) {
    if (id in sdFrCache) return Promise.resolve(sdFrCache[id]);
    return sdFetchJson(SD_DATA + 'fr/' + id + '.json').then(d => d.t || null).catch(() => null).then(t => { sdFrCache[id] = t; return t; });
}
function sdFindSection(id) {
    for (const g of sdIndex.groups) for (const s of g.sections) if (s.id === id) return { group: g, section: s };
    return null;
}

// Garde tout le siddour (et ses traductions) pour prier sans réseau, sans rien demander : au premier affichage, en arrière-plan, une seule fois
// (le service worker garde les fichiers lus). Un échec est sans conséquence : on réessaiera à la prochaine ouverture.
function sdPrecache() {
    try { if (localStorage.getItem('siddurOffline') === '1') return; } catch (e) { /* stockage indisponible : on essaie quand même */ }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    const ids = [];
    sdIndex.groups.forEach(g => g.sections.forEach(s => ids.push(s.id)));
    const next = () => {
        if (!ids.length) return sdLoadInter().then(() => Promise.all([sdFetchJson('data/torah/weekday.json'), sdFetchJson('data/torah/parashot.json')])).then(() => sdFetchJson(SD_DATA + 'fr/index.json')).then(idx => Promise.all(Object.keys(idx.sections || {}).map(sdLoadFr)));
        return sdLoadSection(ids.shift()).then(next);
    };
    next().then(() => {
        try { localStorage.setItem('siddurOffline', '1'); } catch (e) { /* idem */ }
    }).catch(() => { /* hors réseau ou interrompu : à la prochaine ouverture */ });
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
        { key: 's:birkat-hamazon-ashkenaze', he: 'ברכת המזון · אשכנז', ids: ['birkat-hamazon-ashkenaze'] },
        { key: 's:birkat-hamazon-habad', he: 'ברכת המזון · ספרד (חב״ד)', ids: ['birkat-hamazon-habad'] },
        { key: 's:al-hamihya', he: 'מעין שלוש', ids: ['al-hamihya'] },
        { key: 's:al-hamihya-ashkenaze', he: 'מעין שלוש · אשכנז', ids: ['al-hamihya-ashkenaze'] },
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
function sdCurrentService() {
    const base = sdPlace ? sdCurrentPrayer() : null;
    if (!base) return null;
    if (base === 'arvit' && !sdCtx.flags.yomTov && sdBetweenShkiaAndTzeit()) {
        // vendredi après la chkia : l'office du soir de Chabbat ; samedi après la chkia : Arvit de semaine (Chabbat finit à la sortie des étoiles)
        if (HebrewCalendarCore.weekdayOf(sdCtx.fixed) === 5) return { base: base, group: 'chabbat-arvit', title: 'Arvit de Chabbat', he: 'ערבית', shabbat: true };
        if (sdCtx.flags.shabbat) return { base: base, group: 'arvit', title: t('tools.sd_p_arvit'), he: SD_HE_PRAYER.arvit, shabbat: false };
    }
    if (sdCtx.flags.shabbat && !sdCtx.flags.yomTov) {
        const map = { chacharit: ['chabbat-chacharit', 'Cha\'harit', 'שחרית'], minha: ['chabbat-minha', 'Min\'ha', 'מנחה'], arvit: ['chabbat-arvit', 'Arvit', 'ערבית'] };
        return { base: base, group: map[base][0], title: map[base][1] + ' de Chabbat', he: map[base][2], shabbat: true };
    }
    return { base: base, group: base, title: t('tools.sd_p_' + base), he: SD_HE_PRAYER[base], shabbat: false };
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
    const found = row.ids.map(sdFindSection).filter(Boolean);
    if (!found.length) return null;
    const title = row.title || found[0].section.fr;
    return { key: row.key, he: row.he, title: title, ids: row.ids.slice(), desc: row.ids.length > 1 ? row.ids.length + ' textes' : '' };
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
        if (target) sdView = { mode: 'reader', ids: target.ids, title: target.title };
        sdRender();
        setTimeout(sdPrecache, 1500);
    }).catch(() => {
        toolClear(body);
        body.appendChild(sdEl('p', 'tool-msg', t('tools.sd_load_failed')));
    });
}

// L'ouverture en attente, résolue en { ids, title } (une prière entière, ou des sections données).
function sdTakePending() {
    const p = sdPending;
    sdPending = null;
    if (!p) return null;
    if (p.ids) return { ids: p.ids, title: p.title };
    const group = sdIndex.groups.filter(g => g.id === p.group)[0];
    return group ? { ids: group.sections.map(s => s.id), title: group.fr } : null;
}

// Depuis l'accueil : ouvre le siddour directement sur une prière (chacharit, minha, arvit), ou sur des sections.
function openSiddurPrayer(groupId) {
    sdPending = { group: groupId };
    openTool('siddur', 'screen-main');
}
function openSiddurSections(ids, title) {
    sdPending = { ids: ids, title: title };
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
function sdDayNoteLabels(ctx) {
    return SiddurCore.notesFor(ctx).filter(id => id !== 'shabbat' && id !== 'yomTov')
        .map(id => id === 'omer' ? t('tools.sd_note_omer', { n: ctx.omer }) : t('tools.sd_note_' + id));
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
    const g = sdIndex.groups.filter(x => x.id === groupId)[0];
    if (g) sdOpen(g.sections.map(s => s.id), sdCleanTitle(g.fr));
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

    // La carte du moment : l'office de l'heure et les variantes du jour.
    const hero = sdEl('section', 'home-hero sd-now');
    hero.id = 'sd-hero';
    if (service) {
        hero.appendChild(sdEl('small', 'home-hero-label', 'À cette heure · ' + hcalHebrewText(ctx.hebrew)));
        const row = sdEl('div', 'home-hero-row');
        row.appendChild(sdEl('div', 'home-hero-name', service.title));
        const he = sdEl('span', 'home-hero-he', service.he);
        he.lang = 'he'; he.dir = 'rtl';
        row.appendChild(he);
        hero.appendChild(row);
        if (special) hero.appendChild(sdEl('p', 'home-hero-text', t('tools.sd_warn_yomtov')));
        else {
            const chips = sdEl('div', 'home-chips');
            if (service.shabbat) chips.appendChild(sdEl('span', 'home-chip', 'Chabbat'));
            sdDayNoteLabels(ctx).forEach(label => chips.appendChild(sdEl('span', 'home-chip', label)));
            hero.appendChild(chips);
        }
        const regel = special && (ctx.flags.pesach || ctx.flags.sukkot || ctx.flags.shemini || ctx.flags.shavuot);
        const go = sdEl('button', 'home-hero-btn', regel ? 'Prières des trois fêtes' : 'Commencer');
        go.type = 'button';
        go.id = 'sd-quick-' + service.group;
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
    body.appendChild(hero);

    // Les autres offices de la journée (de Chabbat ou de semaine).
    const offices = ctx.flags.shabbat && !special
        ? [['chabbat-chacharit', 'Cha\'harit', 'שחרית'], ['chabbat-moussaf', 'Moussaf', 'מוסף'], ['chabbat-minha', 'Min\'ha', 'מנחה']]
        : SD_PRAYERS.map(g => [g, t('tools.sd_p_' + g), SD_HE_PRAYER[g]]);
    const others = offices.filter(o => !service || o[0] !== service.group);
    const prayers = sdEl('div', 'home-tiles c' + (others.length >= 3 ? 3 : 2));
    others.forEach(([gid, label, hebrew]) => {
        const b = sdEl('button', 'home-tile');
        b.type = 'button';
        b.id = 'sd-quick-' + gid;
        const he = sdEl('span', 'he', hebrew);
        he.lang = 'he'; he.dir = 'rtl';
        b.appendChild(he);
        b.appendChild(sdEl('span', 'fr', label));
        if (gid === 'arvit' && sdPlace) { const when = sdArvitTime(); if (when) b.appendChild(sdEl('span', 'sub', when)); }
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
function sdOpen(ids, title) {
    sdView = { mode: 'reader', ids: ids, title: title };
    sdRestoreTop = null;
    try { localStorage.setItem(SD_LAST_KEY, JSON.stringify({ ids: ids, title: title })); } catch (e) { /* stockage indisponible */ }
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

// --- La lecture de la Tora du jour (lundi, jeudi, jours particuliers) -------------------------------------------------------------------
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
    const b = sdEl('button', 'sd-reading-btn', 'Lecture de la Tora');
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
    sdSheet('Lecture de la Tora', (body) => {
        body.appendChild(sdEl('p', 'tool-small', t('tools.sd_loading')));
        const load = sdWeekday ? Promise.resolve(sdWeekday) : Promise.all([sdFetchJson('data/torah/weekday.json'), sdFetchJson('data/torah/parashot.json')]).then(([w, p]) => { sdParashot = p; return (sdWeekday = w); });
        load.then(data => {
            const israel = !!(sdCtx && sdCtx.israel);
            const next = TorahReadingCore.nextReading(sdCtx.fixed, israel);
            toolClear(body);
            if (!next) { body.appendChild(sdEl('p', 'sd-info', 'Pas de lecture de la Tora dans les jours qui viennent.')); return; }
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
    if ((state === 'off' && !sdPrefs.all) || state === 'fold-unknown') {
        if (state === 'off' && sdPrefs.hideOff) return document.createDocumentFragment();
        const fold = sdEl('details', 'sd-fold');
        const sum = sdEl('summary');
        sum.appendChild(sdEl('span', 'sd-fold-lab', name + (state === 'off' ? ' · pas aujourd\'hui' : ' · selon le cas')));
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
function sdRenderSegment(tree, index, fr) {
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
    // les variantes de premier niveau : marqueur + corps
    const vars = {};
    tree.c.forEach(k => {
        if (!k.m || (k.m.role !== 'marker' && k.m.role !== 'body')) return;
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
        if (k.m.role !== 'marker') return;                       // le corps est rendu avec son marqueur
        flush();
        const bodyText = SiddurCore.plain(v.bodies);
        wrap.appendChild(sdVarBlock(v.m.atoms, '', bodyText, host => {
            const p = newP();
            // un corps en <small> est rendu à taille normale : c'est le texte à dire
            v.bodies.forEach(b => { if (b.t === 'tag' && b.n === 'small') sdRenderNodes(b.c, p); else sdRenderNodes([b], p, true); });
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
function sdBerakhaStart(bare) { return SD_BERAKHOT.find(b => b.start.test(bare)) || null; }

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

function sdRenderSection(section) {
    const box = sdEl('section', 'sd-section-box');
    box.id = 'sd-sec-' + section.id;
    if (sdView.ids.length > 1) {
        const head = sdEl('h4', 'sd-sec-head');
        head.appendChild(sdEl('span', '', section.fr));
        const he = sdEl('span', 'sd-sec-head-he', section.he);
        he.lang = 'he'; he.dir = 'rtl';
        head.appendChild(he);
        box.appendChild(head);
    }
    if (section.about) box.appendChild(sdAboutCard(section.about));
    const counter = { n: 1 };
    const trees = section.segments.map(html => SiddurCore.analyseSegment(html, counter));
    const amida = sdIsAmida(section.id);
    const bares = trees.map(sdBare);
    let bows = 0;
    trees.forEach((tr, k) => { if (amida) bows += sdAddBows(tr, bares[k]); sdMarkNames(tr); });
    const groups = SiddurCore.groups(section.segments);
    const byHeader = {};
    groups.forEach(g => { byHeader[g.header] = g; });
    let omerAt = -1;
    if (section.id === 'omer' && sdCtx.omer > 0) omerAt = SiddurCore.omerSegment(section.segments, sdCtx.omer);
    if (section.id === 'omer' && sdCtx.omer > 0) box.appendChild(sdEl('p', 'sd-omer-note', t('tools.sd_omer_today', { n: sdCtx.omer })));
    // Les traductions servent toujours aux consignes ; sous chaque segment, seulement si on les a demandées.
    const frAll = section.fr_t || null;
    const frOf = (i) => { const tr = frAll && frAll[i]; return tr && tr[0] === SiddurCore.fingerprint(section.segments[i]) ? tr[1] : null; };
    if (sdPrefs.fr && !frAll) box.appendChild(sdEl('p', 'sd-fr-missing', t('tools.sd_fr_missing')));
    const seg = (i) => {
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
    const headFor = (from, to) => {
        if (!amida) return;
        for (let k = from; k <= to; k++) {
            const b = sdBerakhaStart(bares[k]);
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
        if (amida && out === box && /^קדושה/.test(bares[i])) { out = sdEl('div', 'sd-qed'); box.appendChild(out); }
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
        const g = byHeader[i];
        if (!g) {
            headFor(i, i); out.appendChild(seg(i)); hatAfter(i, i);
            if (section.id === 'chacharit-tora' && /אשר בחר בנו מכל העמים/.test(bares[i])) out.appendChild(sdReadingButton());
            i++; continue;
        }
        headFor(g.from, g.to);
        // la consigne d'en-tête (« בראש חודש מוסיפים: ») devient le nom du bloc, en français si on l'a
        const headFr = !sdPrefs.heRub && frOf(g.header);
        const label = headFr ? headFr.replace(/[\s:.]+$/, '') : sdCap(sdAtomsLabel(g.atoms));
        const bodyText = SiddurCore.plain(trees.slice(g.from, g.to + 1));
        out.appendChild(sdVarBlock(g.atoms, label, bodyText, host => { for (let k = g.from; k <= g.to; k++) host.appendChild(seg(k)); }));
        // été / hiver de Barekh alénou : deux blocs de suite, la conclusion vient après le second
        const nextG = byHeader[g.to + 1];
        hatAfter(g.from, g.to, !!(nextG && sdBerakhaStart(bares[nextG.from]) && open && sdBerakhaStart(bares[nextG.from]).id === open.id));
        i = g.to + 1;
    }
    return box;
}
