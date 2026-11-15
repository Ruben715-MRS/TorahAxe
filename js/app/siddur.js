// =========================================================================
// === SIDDOUR SÉFARADE (écran de l'Atelier, groupe « Bible et tradition ») ===
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
let sdFontsOpen = false;
let sdView = { mode: 'home', ids: [], title: '' };
let sdPlace = null;
let sdCtx = null;

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
    if (r('tzeit') !== null && now < r('tzeit')) return 'minha';
    return 'arvit';
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

// --- Entrée de l'écran ---------------------------------------------------------------------------------------------------------------------
function toolSiddurInit() {
    sdLoadPrefs();
    sdView = { mode: 'home', ids: [], title: '' };
    const body = toolEl('tool-siddur-body');
    toolClear(body);
    body.appendChild(sdEl('p', 'tool-small', t('tools.sd_loading')));
    sdLoadIndex().then(() => { sdRender(); setTimeout(sdPrecache, 1500); }).catch(() => {
        toolClear(body);
        body.appendChild(sdEl('p', 'tool-msg', t('tools.sd_load_failed')));
    });
}

function sdRender() {
    const body = toolEl('tool-siddur-body');
    toolClear(body);
    sdComputeContext();
    if (sdView.mode === 'reader') sdRenderReader(body);
    else sdRenderHome(body);
}

// Retour : de la lecture à l'accueil du siddour, puis à l'Atelier.
function sdBack() {
    if (sdView.mode === 'reader') {
        sdView = { mode: 'home', ids: [], title: '' };
        sdRender();
        window.scrollTo && window.scrollTo(0, 0);
        const screen = toolEl('screen-tool-siddur');
        if (screen) screen.scrollTop = 0;
        return;
    }
    toolBack('siddur');
}

// --- L'accueil ----------------------------------------------------------------------------------------------------------------------------------
function sdRenderHome(body) {
    const ctx = sdCtx;
    const hero = sdEl('section', 'sd-hero');
    hero.id = 'sd-hero';
    const heTitle = sdEl('p', 'sd-hero-he', 'סידור עדות המזרח');
    heTitle.lang = 'he'; heTitle.dir = 'rtl';
    hero.appendChild(heTitle);
    hero.appendChild(sdEl('h3', 'sd-hero-title', t('tools.sd_hero_title')));
    hero.appendChild(sdEl('p', 'sd-hero-date', hcalHebrewText(ctx.hebrew) + ' · ' + hcalHebrewLetters(ctx.hebrew)));
    const chips = sdEl('div', 'sd-notes');
    SiddurCore.notesFor(ctx).forEach(id => {
        if (id === 'shabbat' || id === 'yomTov') return;
        chips.appendChild(sdEl('span', 'sd-note', id === 'omer' ? t('tools.sd_note_omer', { n: ctx.omer }) : t('tools.sd_note_' + id)));
    });
    hero.appendChild(chips);
    if (ctx.flags.shabbat || ctx.flags.yomTov) {
        hero.appendChild(sdEl('p', 'sd-warning', t(ctx.flags.shabbat && !ctx.flags.yomTov ? 'tools.sd_warn_shabbat' : 'tools.sd_warn_yomtov')));
    }
    if (!sdPlace) {
        const warn = sdEl('p', 'sd-warning');
        warn.appendChild(document.createTextNode(t('tools.sd_warn_place') + ' '));
        const link = sdEl('button', 'sd-link', t('tools.sd_warn_place_go'));
        link.type = 'button';
        link.onclick = () => openTool('zmanim', 'screen-tool-siddur');
        warn.appendChild(link);
        hero.appendChild(warn);
    }
    body.appendChild(hero);

    // Le parcours du jour : les trois prières, celle de l'heure en tête
    const current = sdCurrentPrayer();
    const quick = sdEl('section', 'sd-quick');
    const quickHead = sdEl('div', 'sd-quick-head');
    quickHead.appendChild(sdEl('h3', 'sd-h', t('tools.sd_quick')));
    // La direction du Kotel : un petit bouton discret à droite du titre (c'est un outil, pas une prière : pas de grande carte)
    const kotel = sdEl('button', 'tool-history-chip sd-kotel-link', '🧭 ' + t('tools.kotel_link'));
    kotel.type = 'button';
    kotel.id = 'sd-kotel-link';
    kotel.onclick = () => openTool('kotel', 'screen-tool-siddur');
    quickHead.appendChild(kotel);
    quick.appendChild(quickHead);
    const row = sdEl('div', 'sd-quick-row');
    SD_PRAYERS.forEach(gid => {
        const group = sdIndex.groups.filter(g => g.id === gid)[0];
        if (!group) return;
        const b = sdEl('button', 'sd-quick-btn' + (gid === current ? ' is-now' : ''));
        b.type = 'button';
        b.id = 'sd-quick-' + gid;
        const he = sdEl('strong', '', ({ chacharit: 'שחרית', minha: 'מנחה', arvit: 'ערבית' })[gid]);
        he.lang = 'he';
        b.appendChild(he);
        b.appendChild(sdEl('span', '', t('tools.sd_p_' + gid)));
        if (gid === current) b.appendChild(sdEl('small', '', t('tools.sd_now')));
        b.onclick = () => sdOpen(group.sections.map(s => s.id), group.fr);
        row.appendChild(b);
    });
    if (ctx.flags.ch) {
        const hm = sdIndex.groups.filter(g => g.id === 'hol-hamoed')[0];
        if (hm) {
            const b = sdEl('button', 'sd-quick-btn');
            b.type = 'button';
            b.id = 'sd-quick-hol-hamoed';
            const he = sdEl('strong', '', 'חול המועד');
            he.lang = 'he';
            b.appendChild(he);
            b.appendChild(sdEl('span', '', t('tools.sd_p_hol_hamoed')));
            b.onclick = () => sdOpen(hm.sections.slice(0, 2).map(s => s.id), hm.fr);
            row.appendChild(b);
        }
    }
    quick.appendChild(row);
    body.appendChild(quick);

    // Tout le livre, par groupes repliables
    body.appendChild(sdEl('h3', 'sd-h', t('tools.sd_all')));
    sdIndex.groups.forEach(group => {
        const d = sdEl('details', 'sd-group-card');
        d.id = 'sd-card-' + group.id;
        const sum = sdEl('summary', '', group.fr);
        d.appendChild(sum);
        if (group.sections.length > 1) {
            const all = sdEl('button', 'sd-section sd-section-all');
            all.type = 'button';
            all.appendChild(sdEl('span', 'sd-section-fr', t('tools.sd_read_all')));
            all.onclick = () => sdOpen(group.sections.map(s => s.id), group.fr);
            d.appendChild(all);
        }
        group.sections.forEach(s => {
            const b = sdEl('button', 'sd-section');
            b.type = 'button';
            b.dataset.section = s.id;
            b.appendChild(sdEl('span', 'sd-section-fr', s.fr));
            const he = sdEl('span', 'sd-section-he', s.he);
            he.lang = 'he'; he.dir = 'rtl';
            b.appendChild(he);
            b.onclick = () => sdOpen([s.id], s.fr);
            d.appendChild(b);
        });
        body.appendChild(d);
    });

    // Source
    const foot = sdEl('section', 'sd-foot');
    foot.appendChild(sdEl('p', 'tool-small', t('tools.sd_source', { edition: sdIndex.edition })));
    foot.appendChild(sdEl('p', 'tool-small sd-disclaimer', t('tools.sd_disclaimer')));
    body.appendChild(foot);
}

// --- La lecture ---------------------------------------------------------------------------------------------------------------------------------
function sdOpen(ids, title) {
    sdView = { mode: 'reader', ids: ids, title: title };
    sdRender();
    const screen = toolEl('screen-tool-siddur');
    if (screen) screen.scrollTop = 0;
    window.scrollTo && window.scrollTo(0, 0);
}

function sdControls(parent) {
    const bar = sdEl('div', 'sd-controls');
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', t('tools.sd_controls'));
    const mk = (id, label, aria, onclick, pressed) => {
        const b = sdEl('button', 'tool-history-chip sd-ctl', label);
        b.type = 'button';
        b.id = id;
        b.setAttribute('aria-label', aria);
        if (pressed !== undefined) b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
        b.onclick = onclick;
        bar.appendChild(b);
        return b;
    };
    mk('sd-smaller', 'A−', t('tools.sd_smaller'), () => { sdPrefs.size = Math.max(0, sdPrefs.size - 1); sdSavePrefs(); sdRerender(); });
    mk('sd-bigger', 'A+', t('tools.sd_bigger'), () => { sdPrefs.size = Math.min(SD_SIZES.length - 1, sdPrefs.size + 1); sdSavePrefs(); sdRerender(); });
    const nq = mk('sd-niqqud', 'ניקוד', t('tools.sd_niqqud'), () => { sdPrefs.niqqud = !sdPrefs.niqqud; sdSavePrefs(); sdRerender(); }, sdPrefs.niqqud);
    nq.lang = 'he';
    mk('sd-fr', 'FR', t('tools.sd_fr_aria'), () => { sdPrefs.fr = !sdPrefs.fr; sdSavePrefs(); sdRerender(); }, sdPrefs.fr);
    const fb = mk('sd-font', 'Aא', t('tools.sd_font_aria'), () => { sdFontsOpen = !sdFontsOpen; sdRerender(); }, sdFontsOpen);
    fb.lang = 'he';
    mk('sd-all', t('tools.sd_show_all'), t('tools.sd_show_all_aria'), () => { sdPrefs.all = !sdPrefs.all; sdSavePrefs(); sdRerender(); }, sdPrefs.all);
    parent.appendChild(bar);
    if (sdFontsOpen) {
        const list = sdEl('div', 'sd-font-list');
        list.id = 'sd-fonts';
        list.setAttribute('role', 'radiogroup');
        list.setAttribute('aria-label', t('tools.sd_font_aria'));
        TORAH_READER_FONTS.forEach(font => {
            const b = sdEl('button', 'sd-font-option');
            b.type = 'button';
            b.dataset.font = font.id;
            b.setAttribute('role', 'radio');
            b.setAttribute('aria-checked', font.id === sdPrefs.font ? 'true' : 'false');
            b.style.fontFamily = font.stack;
            const sample = sdEl('span', 'sd-font-sample', 'שְׁמַע יִשְׂרָאֵל');
            sample.lang = 'he'; sample.dir = 'rtl';
            b.appendChild(sample);
            b.appendChild(sdEl('small', 'sd-font-name', font.label));
            b.onclick = () => { sdPrefs.font = font.id; sdSavePrefs(); sdRerender(); };
            list.appendChild(b);
        });
        parent.appendChild(list);
    }
}

// Redessine la lecture sans perdre la place.
function sdRerender() {
    const screen = toolEl('screen-tool-siddur');
    const top = screen ? screen.scrollTop : 0;
    const win = window.scrollY || 0;
    sdRender();
    if (screen) screen.scrollTop = top;
    window.scrollTo && window.scrollTo(0, win);
}

function sdRenderReader(body) {
    const wrap = sdEl('div', 'sd-reader');
    wrap.id = 'sd-reader';
    wrap.appendChild(sdEl('h3', 'sd-reader-title', sdView.title));
    sdControls(wrap);
    if (sdView.ids.length > 1) {
        const jump = sdEl('select', 'tool-input sd-jump');
        jump.id = 'sd-jump';
        jump.setAttribute('aria-label', t('tools.sd_jump'));
        sdView.ids.forEach(id => {
            const f = sdFindSection(id);
            const o = document.createElement('option');
            o.value = id;
            o.textContent = f ? f.section.fr : id;
            jump.appendChild(o);
        });
        jump.onchange = () => { const target = document.getElementById('sd-sec-' + jump.value); if (target) target.scrollIntoView({ block: 'start' }); };
        wrap.appendChild(jump);
    }
    const content = sdEl('div', 'sd-content');
    content.style.setProperty('--sd-size', SD_SIZES[sdPrefs.size] + 'px');
    content.style.setProperty('--sd-font', sdFontStack());
    wrap.appendChild(content);
    body.appendChild(wrap);
    content.appendChild(sdEl('p', 'tool-small', t('tools.sd_loading')));
    Promise.all(sdView.ids.map(id => Promise.all([sdLoadSection(id), sdPrefs.fr ? sdLoadFr(id) : null]).then(r => { r[0].fr_t = r[1]; return r[0]; }))).then(sections => {
        if (sdView.mode !== 'reader') return;
        toolClear(content);
        if (sdPrefs.fr) content.appendChild(sdEl('p', 'sd-fr-note', t('tools.sd_fr_note')));
        sections.forEach(section => content.appendChild(sdRenderSection(section)));
        const mark = content.querySelector('.sd-omer-today');
        if (mark) mark.scrollIntoView({ block: 'center' });
        sdAddNav(wrap);
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
            host = sdEl('div', 'sd-group ' + (state === 'on' ? 'is-on' : 'is-unknown'));
            if (state === 'on') host.appendChild(sdEl('p', 'sd-group-badge', t('tools.sd_group_on', { what: label })));
            else if (state === 'unknown') host.appendChild(sdEl('p', 'sd-group-badge', t('tools.sd_group_unknown', { what: label })));
        }
        for (let k = g.header; k <= g.to; k++) host.appendChild(seg(k));
        box.appendChild(host);
        i = g.to + 1;
    }
    return box;
}
