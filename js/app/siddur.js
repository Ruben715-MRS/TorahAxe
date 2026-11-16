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
let sdPrefs = { size: 2, niqqud: true, all: false, fr: false, font: 'noto-serif' };
let sdView = { mode: 'home', ids: [], title: '' };
let sdPlace = null;
let sdCtx = null;
// Une ouverture demandée par un autre écran (l'accueil) : { group } ou { ids, title }, exécutée dès que l'index du siddour est chargé.
let sdPending = null;
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

function sdLoadPrefs() {
    try {
        const p = JSON.parse(localStorage.getItem(SD_PREFS_KEY) || '{}');
        if (Number.isInteger(p.size) && p.size >= 0 && p.size < SD_SIZES.length) sdPrefs.size = p.size;
        if (typeof p.niqqud === 'boolean') sdPrefs.niqqud = p.niqqud;
        if (typeof p.all === 'boolean') sdPrefs.all = p.all;
        if (typeof p.fr === 'boolean') sdPrefs.fr = p.fr;
        if (typeof p.font === 'string' && sdFontById(p.font)) sdPrefs.font = p.font;
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
        if (!ids.length) return sdFetchJson(SD_DATA + 'fr/index.json').then(idx => Promise.all(Object.keys(idx.sections || {}).map(sdLoadFr)));
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

// Retour : de la lecture à l'accueil du siddour, puis à l'accueil de l'application.
function sdBack() {
    sdCloseSheet();
    if (sdView.mode === 'reader') {
        sdView = { mode: 'home', ids: [], title: '' };
        sdRestoreTop = null;
        sdRender();
        window.scrollTo && window.scrollTo(0, 0);
        const screen = toolEl('screen-tool-siddur');
        if (screen) screen.scrollTop = 0;
        return;
    }
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
    content.style.setProperty('--sd-font', sdFontStack());
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
    const prog = sdEl('div', 'sd-read-prog');
    prog.appendChild(sdEl('i'));
    bar.appendChild(prog);
    wrap.appendChild(bar);
    const content = sdEl('div', 'sd-content');
    content.style.setProperty('--sd-size', SD_SIZES[sdPrefs.size] + 'px');
    content.style.setProperty('--sd-font', sdFontStack());
    wrap.appendChild(content);
    body.appendChild(wrap);
    content.appendChild(sdEl('p', 'tool-small', t('tools.sd_loading')));
    Promise.all(sdView.ids.map(id => Promise.all([sdLoadSection(id), sdPrefs.fr ? sdLoadFr(id) : null]).then(r => { r[0].fr_t = r[1]; return r[0]; }))).then(sections => {
        if (sdView.mode !== 'reader') return;
        toolClear(content);
        if (sdShabbatNote) content.appendChild(sdEl('p', 'sd-fr-note', sdShabbatNote));
        if (sdPrefs.fr) content.appendChild(sdEl('p', 'sd-fr-note', t('tools.sd_fr_note')));
        sections.forEach(section => content.appendChild(sdRenderSection(section)));
        sdAddNav(wrap);
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

function sdRenderNodes(nodes, parent) {
    nodes.forEach(node => {
        let el;
        if (node.t === 'text') {
            const text = document.createTextNode(sdText(node.v));
            sdOrigText.set(text, node.v);
            if (node.m) { el = sdEl('span', sdVariantClass(node.m)); el.appendChild(text); } else { parent.appendChild(text); return; }
        } else if (node.n === 'br') {
            parent.appendChild(document.createElement('br'));
            return;
        } else {
            el = sdEl(node.n === 'b' ? 'strong' : 'span', node.n === 'small' ? 'sd-small' : node.n === 'big' ? 'sd-big' : '');
            if (node.m) el.className = (el.className + ' ' + sdVariantClass(node.m)).trim();
            sdRenderNodes(node.c, el);
        }
        if (node.m) {
            const state = SiddurCore.evaluate(node.m.atoms, sdCtx);
            if (state === 'off' && node.m.role !== 'rubric' && !sdPrefs.all) el.title = t('tools.sd_variant_off_title', { what: sdAtomsLabel(node.m.atoms) });
            if (state === 'on' && node.m.role !== 'rubric') el.title = t('tools.sd_variant_on_title', { what: sdAtomsLabel(node.m.atoms) });
        }
        parent.appendChild(el);
    });
}

function sdRenderSegment(tree, index) {
    const first = tree.c.filter(k => !(k.t === 'text' && !k.v.trim()))[0];
    const isTitle = index === 0 && first && first.t === 'tag' && first.n === 'big';
    const el = sdEl(isTitle ? 'h4' : 'p', isTitle ? 'sd-title' : 'sd-seg');
    el.lang = 'he';
    el.dir = 'rtl';
    // un segment tout en petits caractères (une consigne, un texte facultatif) : interligne resserré
    const kids = tree.c.filter(k => !(k.t === 'text' && !k.v.trim()));
    if (kids.length && kids.every(k => k.t === 'tag' && k.n === 'small')) el.classList.add('sd-seg-small');
    sdRenderNodes(tree.c, el);
    return el;
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
    const groups = SiddurCore.groups(section.segments);
    const byHeader = {};
    groups.forEach(g => { byHeader[g.header] = g; });
    let omerAt = -1;
    if (section.id === 'omer' && sdCtx.omer > 0) omerAt = SiddurCore.omerSegment(section.segments, sdCtx.omer);
    if (section.id === 'omer' && sdCtx.omer > 0) box.appendChild(sdEl('p', 'sd-omer-note', t('tools.sd_omer_today', { n: sdCtx.omer })));
    const frT = sdPrefs.fr ? section.fr_t : null;
    if (sdPrefs.fr && !frT) box.appendChild(sdEl('p', 'sd-fr-missing', t('tools.sd_fr_missing')));
    const seg = (i) => {
        const el = sdRenderSegment(trees[i], i);
        if (i === omerAt) el.classList.add('sd-omer-today');
        const tr = frT && frT[i];
        if (!tr || tr[0] !== SiddurCore.fingerprint(section.segments[i])) {
            return el;
        }
        const wrap = document.createDocumentFragment();
        wrap.appendChild(el);
        const fr = sdEl('p', 'sd-fr-seg', tr[1]);
        fr.lang = 'fr';
        wrap.appendChild(fr);
        return wrap;
    };
    let i = 0;
    while (i < trees.length) {
        const g = byHeader[i];
        if (!g) { box.appendChild(seg(i)); i++; continue; }
        const state = SiddurCore.evaluate(g.atoms, sdCtx);
        const label = sdAtomsLabel(g.atoms);
        let host;
        if (state === 'off' && !sdPrefs.all) {
            host = sdEl('details', 'sd-group is-off');
            host.appendChild(sdEl('summary', '', t('tools.sd_group_off', { what: label })));
        } else {
            host = sdEl(state === 'on' ? 'details' : 'div', 'sd-group ' + (state === 'on' ? 'is-on' : 'is-unknown'));
            if (state === 'on') { host.open = true; host.appendChild(sdEl('summary', 'sd-group-badge', t('tools.sd_group_on', { what: label }))); }
            else if (state === 'unknown') host.appendChild(sdEl('p', 'sd-group-badge', t('tools.sd_group_unknown', { what: label })));
        }
        for (let k = g.header; k <= g.to; k++) host.appendChild(seg(k));
        box.appendChild(host);
        i = g.to + 1;
    }
    return box;
}
