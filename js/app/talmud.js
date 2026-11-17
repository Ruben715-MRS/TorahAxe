// =========================================================================
// === TALMUD DE BABYLONE (la Guémara, amoud par amoud, écran de l'Atelier) ===
// =========================================================================
// La Guémara en araméen vocalisé, un amoud (une face de page : 2a, 2b…) à la fois, avec un menu des traités, un menu des amoudim, un saut par chapitre
// et des boutons « précédent / suivant » qui passent d'un traité à l'autre. Les données : data/talmud/ (scripts/build_talmud.js, règles pures dans
// js/talmudCore.js). Chaque traité est chargé à son ouverture, une seule fois. Même organisation que la Michna (js/app/michna.js).
// « Sans voyelles » retire les voyelles et les accents. Tout le texte passe par des nœuds texte ; la police est celle des Réglages (--torah-font).
// Les commentateurs (Rachi, Rachbam, Ran, Rabbénou Guerchom, Tossafot) : même panneau repliable que la Michna ; chacun sous le segment de Guémara qu'il commente, avec sa couleur.
// Une pastille « 💬 n » à côté de chaque segment commenté ouvre ses commentaires, même quand la case n'est pas cochée (data/talmud/counts-<traité>.json).
// Le toucher d'un mot : une fiche du dictionnaire de la Guémara (js/gemaraCore.js) s'ouvre en bas de l'écran ; « Ouvrir dans le dictionnaire » mène à l'écran complet.
// Le choix (traité, amoud, voyelles, commentateurs cochés, dictionnaire au toucher) est gardé dans localStorage, sans jamais bloquer si le stockage est refusé.

const TALMUD_KEY = 'talmudPrefs';
// Le registre des commentateurs, dans l'ordre d'affichage. `name` : nom français ; `he` : nom hébreu (étiquette) ; `file` : préfixe des fichiers ;
// `source` : la clé i18n de sa mention de source ; `color` : la couleur de sa bordure.
const TALMUD_COMMENTATORS = [
    { id: 'rashi', name: 'Rachi', he: 'רש״י', file: 'rashi-', source: 'tools.talmud_src_rashi', color: '#7c8aa5' },
    { id: 'rashbam', name: 'Rachbam', he: 'רשב״ם', file: 'rashbam-', source: 'tools.talmud_src_rashbam', color: '#b5792a' },
    { id: 'ran', name: 'Ran', he: 'ר״ן', file: 'ran-', source: 'tools.talmud_src_ran', color: '#3d8b5a' },
    { id: 'rabbeinu-gershom', name: 'Rabbénou Guerchom', he: 'רבינו גרשום', file: 'rabbeinu-gershom-', source: 'tools.talmud_src_gershom', color: '#a04a6b' },
    { id: 'tosafot', name: 'Tossafot', he: 'תוספות', file: 'tosafot-', source: 'tools.talmud_src_tosafot', color: '#8e5aa8' }
];

let talmudIndex = null;
let talmudMichnaRef = null;     // data/talmud/michna-ref.json (les michnayot citées dans la Guémara) ; null tant qu'il n'est pas chargé ou s'il manque
let talmudSugyot = null;        // data/talmud/sugyot.json (titres de sugya, là où ils sont écrits) ; null tant qu'il n'est pas chargé ou s'il manque
let talmudResume = null;        // data/talmud/resume.json (une phrase par ordre, par traité et par chapitre) ; null tant qu'il n'est pas chargé ou s'il manque
const talmudLoaded = {};        // traité -> data/talmud/<traité>.json
const talmudCommLoaded = {};    // commentateur -> traité -> { pages } : commentaire chargé
const talmudCommPending = {};   // « commentateur/traité » -> promesse en cours, pour ne charger qu'une fois
const talmudCounts = {};        // traité -> counts-<traité>.json : { order, pages[amoud][segment] = masque }
let talmudState = { id: 'berakhot', page: 0, vowels: 'full', comm: { rashi: true }, open: {}, lookup: true, summary: true, sugyot: true };

let talmudPrefsLoaded = false;
function talmudLoadPrefs() {
    if (talmudPrefsLoaded) return;
    talmudPrefsLoaded = true;
    try {
        const p = JSON.parse(localStorage.getItem(TALMUD_KEY) || 'null');
        if (p && typeof p === 'object') {
            if (typeof p.id === 'string') talmudState.id = p.id;
            if (Number.isInteger(p.page) && p.page >= 0) talmudState.page = p.page;
            if (p.vowels === 'consonants') talmudState.vowels = 'consonants';
            if (p.comm && typeof p.comm === 'object') talmudState.comm = p.comm;
            if (p.lookup === false) talmudState.lookup = false;
            if (typeof p.summary === 'boolean') talmudState.summary = p.summary;
            if (p.sugyot === false) talmudState.sugyot = false;
        }
    } catch (e) {}
}

function talmudSavePrefs() {
    try { localStorage.setItem(TALMUD_KEY, JSON.stringify({ id: talmudState.id, page: talmudState.page, vowels: talmudState.vowels, comm: talmudState.comm, lookup: talmudState.lookup, summary: talmudState.summary, sugyot: talmudState.sugyot })); } catch (e) {}
}

function talmudNode(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
}

function talmudChips(box, items, current, onPick) {
    toolClear(box);
    items.forEach(([key, label]) => {
        const b = talmudNode('button', 'tool-history-chip', label);
        b.type = 'button';
        b.setAttribute('aria-pressed', key === current ? 'true' : 'false');
        b.onclick = () => onPick(key);
        box.appendChild(b);
    });
}

// Charge l'index une fois (la promesse est gardée : l'écran et « Ouvrir à cet amoud » ne le demandent qu'une fois) et pose le traité et l'amoud enregistrés.
let talmudIndexPromise = null;
function talmudLoadIndex() {
    if (talmudIndexPromise) return talmudIndexPromise;
    talmudLoadPrefs();
    talmudIndexPromise = fetch('data/talmud/index.json')
        .then(res => { if (!res.ok) throw new Error('http ' + res.status); return res.json(); })
        .then(json => {
            talmudIndex = json;
            const tr = TalmudCore.find(json, talmudState.id);
            if (!tr) talmudState = Object.assign(talmudState, { id: TalmudCore.tractates(json)[0].id, page: 0 });
            else talmudState.page = Math.min(talmudState.page, tr.amudim - 1);
            return json;
        })
        .catch(e => { talmudIndexPromise = null; throw e; });
    return talmudIndexPromise;
}

function toolTalmudInit() {
    const msg = toolEl('tool-talmud-msg');
    if (talmudIndex) { talmudRender(); return; }
    msg.textContent = t('tools.torah_loading');
    talmudLoadIndex()
        .then(() => {
            msg.textContent = '';
            talmudRender();
            talmudLoadResume();
            talmudLoadSugyot();
            talmudLoadMichnaRef();
            talmudLoadCounts(talmudState.id);
            talmudLoadComments(talmudState.id);
        })
        .catch(() => { msg.textContent = t('tools.torah_error'); });
}

// Les résumés (case « Résumé ») : une phrase par ordre, par traité et par chapitre, dans data/talmud/resume.json. Chargés une fois ; sans le fichier,
// rien ne s'affiche et le reste de l'écran fonctionne.
function talmudLoadResume() {
    if (talmudResume) return;
    fetch('data/talmud/resume.json')
        .then(res => { if (!res.ok) throw new Error('resume HTTP ' + res.status); return res.json(); })
        .then(data => { talmudResume = data; talmudRender(); })
        .catch(() => { /* pas de résumé */ });
}

// Les titres de sugya : un titre devant le segment où chaque développement commence, et un rappel en haut quand il vient de l'amoud précédent.
// Sans le fichier ou hors des amoudim couverts, rien ne s'affiche.
function talmudLoadSugyot() {
    if (talmudSugyot) return;
    fetch('data/talmud/sugyot.json')
        .then(res => { if (!res.ok) throw new Error('sugyot HTTP ' + res.status); return res.json(); })
        .then(data => { talmudSugyot = data; talmudRender(); })
        .catch(() => { /* pas de titres */ });
}

// Les michnayot citées : une ligne « Michna 1:2 » devant le segment qui ouvre la citation, qui mène à la michna dans l'écran de la Michna. Même case que les titres de sugya.
function talmudLoadMichnaRef() {
    if (talmudMichnaRef) return;
    fetch('data/talmud/michna-ref.json')
        .then(res => { if (!res.ok) throw new Error('michna-ref HTTP ' + res.status); return res.json(); })
        .then(data => { talmudMichnaRef = data; talmudRender(); })
        .catch(() => { /* pas de repères de michna */ });
}

function talmudMichnaRefNode(tr, ref) {
    const row = talmudNode('p', 'talmud-michna-ref');
    const btn = talmudNode('button', 'tool-history-chip', t('tools.talmud_michna_ref', { c: ref.c, m: ref.m }) + ' ›');
    btn.type = 'button';
    btn.setAttribute('aria-label', t('tools.talmud_michna_ref_aria', { c: ref.c, m: ref.m }));
    btn.onclick = () => {
        if (typeof michnaOpenAt !== 'function') return;
        michnaOpenAt(tr.id, ref.c, ref.m, 'screen-tool-talmud');
    };
    row.appendChild(btn);
    return row;
}

function talmudToggleSugyot(checked) {
    talmudState.sugyot = checked;
    talmudSavePrefs();
    talmudRender();
}

// « 58a–59b » : l'étendue d'une sugya, en amoudim.
function talmudSugyaRange(s) {
    return s.from.label === s.to.label ? s.from.label : s.from.label + '–' + s.to.label;
}

function talmudSugyaNode(s, continued) {
    const el = talmudNode('p', 'talmud-sugya' + (continued ? ' is-continued' : ''));
    el.appendChild(talmudNode('strong', '', (continued ? t('tools.talmud_sugya_continued') + ' ' : '') + s.title));
    el.appendChild(talmudNode('span', 'talmud-sugya-range', ' ' + talmudSugyaRange(s)));
    return el;
}

function talmudToggleSummary(checked) {
    talmudState.summary = checked;
    talmudSavePrefs();
    talmudRender();
}

// Le résumé de l'amoud, replié : la phrase du chapitre où l'amoud commence, et dessous (en touchant) celles du traité et de l'ordre. Seulement s'il y a au moins une
// phrase propre au traité (la phrase de l'ordre seule n'apprend rien sur l'amoud).
let talmudSummaryOpen = false;
function talmudRenderSummary(tr) {
    const box = toolEl('tool-talmud-summary');
    toolClear(box);
    toolEl('tool-talmud-summary-on').checked = !!talmudState.summary;
    const chapter = TalmudCore.chapterAt(tr, talmudState.page, 0) + 1;
    const s = talmudState.summary && talmudResume ? TalmudCore.summaryOf(talmudResume, talmudIndex, tr.id, chapter) : null;
    const row = (label, text) => {
        const line = talmudNode('span');
        line.appendChild(talmudNode('strong', '', label + ' '));
        line.appendChild(talmudNode('span', 'tool-small', text));
        return line;
    };
    const show = !!(s && s.book);
    box.hidden = !show;
    if (!show) return;
    const head = talmudNode('summary');
    head.appendChild(s.chapter ? row(t('tools.talmud_chapter_n', { n: chapter }) + ' :', s.chapter) : row(t('tools.michna_summary_book', { name: tr.fr }), s.book));
    box.appendChild(head);
    if (s.chapter) box.appendChild(talmudNode('div', 'tanakh-cycle-row')).appendChild(row(t('tools.michna_summary_book', { name: tr.fr }), s.book));
    if (s.seder) box.appendChild(talmudNode('div', 'tanakh-cycle-row')).appendChild(row(t('tools.michna_summary_seder', { name: tr.sederFr }), s.seder));
    box.open = talmudSummaryOpen;
    box.ontoggle = () => { talmudSummaryOpen = box.open; };
}

// Ouvre le Talmud à un amoud (« 58a ») d'un traité : sert au Daf Yomi de l'accueil. À appeler après openTool('talmud') : l'écran est déjà affiché.
function talmudOpenAt(id, label) {
    talmudLoadIndex().then(() => {
        const tr = TalmudCore.find(talmudIndex, id);
        const page = tr ? TalmudCore.pageOf(tr, label) : -1;
        if (page >= 0) { talmudOpen(id, page); toolEl('tool-talmud-msg').textContent = ''; }
    }).catch(() => {});
}

function talmudBook(id) {
    if (talmudLoaded[id]) return Promise.resolve(talmudLoaded[id]);
    return fetch('data/talmud/' + id + '.json')
        .then(res => { if (!res.ok) throw new Error('http ' + res.status); return res.json(); })
        .then(book => { talmudLoaded[id] = book; return book; });
}

// Ouvre un traité (chargé une fois) à un amoud (indice depuis 0), puis redessine.
function talmudOpen(id, page) {
    const tr = TalmudCore.find(talmudIndex, id);
    if (!tr) return;
    talmudState.id = id;
    talmudState.page = Math.min(Math.max(0, page || 0), tr.amudim - 1);
    talmudState.open = {};
    talmudLookupClose();
    talmudSavePrefs();
    talmudRender();
    talmudLoadCounts(id);
    talmudLoadComments(id);
}

function talmudVow(text) {
    return talmudState.vowels === 'full' ? text : TalmudCore.stripMarks(text);
}

// --- Les commentateurs --------------------------------------------------------------------------------

// Les commentateurs du registre qui couvrent le traité ouvert : l'index déclare leurs fichiers.
function talmudCommAvailable() {
    const tr = talmudIndex ? TalmudCore.find(talmudIndex, talmudState.id) : null;
    return TALMUD_COMMENTATORS.filter(c => tr && tr.comm.includes(c.id));
}

// Les commentateurs cochés qui couvrent le traité ouvert : ceux qu'on affiche.
function talmudCommActive() {
    return talmudCommAvailable().filter(c => talmudState.comm[c.id]);
}

// Les exégètes dont un commentaire est à l'écran, donc dont la source se mentionne : les cochés, et ceux qu'une pastille dépliée a fait charger.
function talmudCommSources() {
    const opened = Object.keys(talmudState.open).length > 0;
    return talmudCommAvailable().filter(c => talmudState.comm[c.id] || (opened && (talmudCommLoaded[c.id] || {})[talmudState.id]));
}

// Charge les commentaires de ces exégètes pour le traité `id` (une fois chacun) ; puis réaffiche si on est toujours sur ce traité.
function talmudLoadComm(list, id) {
    if (talmudState.id !== id) return;
    const msg = toolEl('tool-talmud-msg');
    list.forEach(comm => {
        const loaded = talmudCommLoaded[comm.id] || (talmudCommLoaded[comm.id] = {});
        const key = comm.id + '/' + id;
        if (loaded[id] || talmudCommPending[key]) return;
        msg.textContent = t('tools.torah_loading');
        talmudCommPending[key] = fetch('data/talmud/' + comm.file + id + '.json')
            .then(res => { if (!res.ok) throw new Error(comm.id + ' HTTP ' + res.status); return res.json(); })
            .then(data => {
                loaded[id] = data;
                msg.textContent = '';
                if (talmudState.id === id) talmudRender();
            })
            .catch(() => { msg.textContent = t('tools.tanakh_comm_error', { name: comm.name }); })
            .finally(() => { delete talmudCommPending[key]; });
    });
}

function talmudLoadComments(id) {
    talmudLoadComm(talmudCommActive(), id);
}

// Charge (une fois) les masques de pastilles du traité, s'il a des commentateurs ; puis réaffiche. Sans ce fichier, le traité s'affiche sans pastilles.
function talmudLoadCounts(id) {
    if (talmudCounts[id] || !talmudCommAvailable().length) return;
    fetch('data/talmud/counts-' + id + '.json')
        .then(res => { if (!res.ok) throw new Error('counts HTTP ' + res.status); return res.json(); })
        .then(counts => {
            talmudCounts[id] = counts;
            if (talmudState.id === id) talmudRender();
        })
        .catch(() => { /* pas de pastilles */ });
}

// Les commentateurs du registre qui commentent le segment `seg` (depuis 0) de l'amoud `page`, selon le masque du traité.
function talmudSegmentComms(page, seg) {
    const counts = talmudCounts[talmudState.id];
    const mask = counts && counts.pages[page] ? counts.pages[page][seg] || 0 : 0;
    if (!mask) return [];
    const available = talmudCommAvailable();
    return TalmudCore.maskIds(counts.order, mask).map(id => available.find(x => x.id === id)).filter(Boolean);
}

// La pastille « 💬 n » d'un segment : touchée, elle ouvre ou ferme les commentaires de tous ceux qui le commentent, cochés ou non.
function talmudBadge(page, seg, list) {
    const key = page + ':' + seg;
    const names = list.map(x => x.name).join(', ');
    const btn = talmudNode('button', 'tanakh-comm-badge', '💬 ' + list.length);
    btn.type = 'button';
    btn.dataset.badge = key;
    btn.title = names;
    btn.setAttribute('aria-label', t(list.length === 1 ? 'tools.talmud_comm_count_one' : 'tools.talmud_comm_count', { n: list.length, names }));
    btn.setAttribute('aria-expanded', talmudState.open[key] ? 'true' : 'false');
    btn.onclick = () => talmudToggleSegment(page, seg);
    return btn;
}

function talmudToggleSegment(page, seg) {
    const key = page + ':' + seg;
    if (talmudState.open[key]) delete talmudState.open[key]; else talmudState.open[key] = true;
    talmudRender();
    if (talmudState.open[key]) talmudLoadComm(talmudSegmentComms(page, seg), talmudState.id);
}

function talmudToggleComm(id, checked) {
    talmudState.comm[id] = checked;
    talmudSavePrefs();
    talmudRender();
    if (checked) talmudLoadComments(talmudState.id);
}

// Le panneau « Affichage » (replié) : une case par exégète du registre, construites une fois (le focus du clavier ne se perd pas à chaque affichage), puis les voyelles,
// le dictionnaire et le résumé. Un exégète qui ne couvre pas le traité n'est pas proposé. Le titre replié dit ce qui est actif : « Affichage · Rachi ».
function talmudRenderCommPanel() {
    const panel = toolEl('tool-talmud-comm');
    const list = toolEl('tool-talmud-comm-list');
    const available = talmudCommAvailable();
    panel.hidden = available.length === 0;
    if (!list.children.length) {
        TALMUD_COMMENTATORS.forEach(comm => {
            const label = talmudNode('label', 'dict-toggle tanakh-comm-item');
            label.dataset.comm = comm.id;
            label.style.setProperty('--comm-color', comm.color);
            const box = talmudNode('input');
            box.type = 'checkbox';
            box.id = 'tool-talmud-comm-' + comm.id;
            box.onchange = () => talmudToggleComm(comm.id, box.checked);
            label.appendChild(box);
            label.appendChild(talmudNode('span', '', ' ' + comm.name + ' '));
            const he = talmudNode('span', 'tanakh-comm-he', comm.he);
            he.lang = 'he';
            he.dir = 'rtl';
            label.appendChild(he);
            list.appendChild(label);
        });
    }
    TALMUD_COMMENTATORS.forEach(comm => {
        const box = toolEl('tool-talmud-comm-' + comm.id);
        box.checked = !!talmudState.comm[comm.id];
        box.disabled = !available.includes(comm);
        box.parentElement.hidden = !available.includes(comm);   // un exégète qui ne couvre pas le traité n'est pas proposé : la liste reste courte
    });
    const active = talmudCommActive();
    const parts = [t('tools.talmud_options')];
    if (active.length) parts.push(active.map(c => c.name).join(', '));
    if (talmudState.vowels === 'consonants') parts.push(t('tools.tanakh_vowels_consonants'));
    toolEl('tool-talmud-options-summary').textContent = parts.join(' · ');
}

// Un passage de commentaire : <b> le mot commenté, <i> une citation, <small> une variante. Le texte ne passe jamais par du HTML brut.
function talmudComment(comm, raw) {
    const p = talmudNode('p', 'tanakh-comm talmud-comm tanakh-comm-' + comm.id);
    p.style.setProperty('--comm-color', comm.color);
    p.lang = 'he';
    p.dir = 'rtl';
    TalmudCore.parseComment(raw).forEach(part => {
        const text = talmudVow(part.s);
        if (part.k) p.appendChild(talmudNode(part.k, '', text));
        else p.appendChild(document.createTextNode(text));
    });
    return p;
}

// L'étiquette du nom hébreu de l'exégète, en tête de son premier commentaire du segment.
function talmudCommTag(comm, p) {
    const tag = talmudNode('span', 'tanakh-comm-tag', comm.he);
    tag.lang = 'he';
    p.insertBefore(document.createTextNode(' '), p.firstChild);
    p.insertBefore(tag, p.firstChild);
}

// Les commentaires du segment : ceux dont la case est cochée et, si la pastille est ouverte, tous ceux qui le commentent ; seulement ceux dont le traité est
// chargé et qui ont quelque chose à dire ici. L'étiquette de nom n'est utile qu'à partir de deux exégètes.
function talmudCommParagraphs(page, seg, inSegment) {
    const open = !!talmudState.open[page + ':' + seg];
    const blocks = talmudCommAvailable()
        .filter(x => talmudState.comm[x.id] || (open && inSegment.includes(x)))
        .filter(x => (talmudCommLoaded[x.id] || {})[talmudState.id])
        .map(x => [x, (((talmudCommLoaded[x.id][talmudState.id].pages[page] || [])[seg]) || []).map(raw => talmudComment(x, raw))])
        .filter(([, list]) => list.length);
    const out = [];
    blocks.forEach(([comm, list]) => {
        if (blocks.length > 1) talmudCommTag(comm, list[0]);
        list.forEach(p => out.push(p));
    });
    return out;
}

// --- L'écran ------------------------------------------------------------------------------------------

// « Situer dans la chronologie » : l'époque des maîtres de ce texte (une seule fois par ouverture de l'écran).
function talmudChrono() {
    const box = toolEl('tool-talmud-chrono');
    if (!box || box.firstChild || typeof chrAddTargetButton !== 'function' || typeof ChronologieCore === 'undefined') return;
    chrAddTargetButton(box, model => ChronologieCore.forText(model, 'talmud'), 'screen-tool-talmud');
}

function talmudRender() {
    talmudChrono();
    if (!talmudIndex) return;
    const tr = TalmudCore.find(talmudIndex, talmudState.id);
    const page = talmudState.page;
    // Tous les traités dans un seul menu, rangés par ordre (un <optgroup> chacun) : moins de place qu'une rangée de boutons.
    const sel = toolEl('tool-talmud-tractate');
    toolClear(sel);
    talmudIndex.sedarim.forEach(seder => {
        const group = talmudNode('optgroup');
        group.label = seder.he + ' · ' + seder.fr;
        seder.tractates.forEach(x => {
            const o = talmudNode('option', '', x.he + ' · ' + x.fr);
            o.value = x.id;
            o.selected = x.id === tr.id;
            group.appendChild(o);
        });
        sel.appendChild(group);
    });
    // Les chapitres du traité : un saut vers l'amoud où chacun commence ; le chapitre en cours est celui d'où l'on lit.
    const chap = toolEl('tool-talmud-chapter');
    toolClear(chap);
    const current = TalmudCore.chapterAt(tr, page, 0);
    tr.chapters.forEach((c, k) => {
        const o = talmudNode('option', '', t('tools.talmud_chapter_short', { n: k + 1 }) + ' · ' + TalmudCore.amoudLabel(tr.start, c.from[0]));
        o.value = String(k);
        o.selected = k === current;
        chap.appendChild(o);
    });
    chap.hidden = !tr.chapters.length;
    chap.title = tr.chapters.map((c, k) => t('tools.talmud_chapter_n', { n: k + 1 }) + ' · ' + c.he).join('\n');
    // Les amoudim du traité.
    const daf = toolEl('tool-talmud-daf');
    toolClear(daf);
    for (let p = 0; p < tr.amudim; p++) {
        const label = TalmudCore.amoudLabel(tr.start, p);
        const o = talmudNode('option', '', label + ' · ' + TalmudCore.hebrewAmoud(label));
        o.value = String(p);
        o.selected = p === page;
        daf.appendChild(o);
    }
    const prev = TalmudCore.step(talmudIndex, { id: tr.id, page }, -1);
    const next = TalmudCore.step(talmudIndex, { id: tr.id, page }, 1);
    ['tool-talmud-prev', 'tool-talmud-prev2'].forEach(id => { toolEl(id).disabled = !prev; });
    ['tool-talmud-next', 'tool-talmud-next2'].forEach(id => { toolEl(id).disabled = !next; });
    toolEl('tool-talmud-nav-label').textContent = '↑ ' + tr.he + ' ' + TalmudCore.hebrewAmoud(TalmudCore.amoudLabel(tr.start, page));
    talmudChips(toolEl('tool-talmud-vowels'), [['full', t('tools.tanakh_vowels_full')], ['consonants', t('tools.tanakh_vowels_consonants')]], talmudState.vowels,
        key => { talmudState.vowels = key; talmudSavePrefs(); talmudRender(); });
    toolEl('tool-talmud-lookup-on').checked = !!talmudState.lookup;
    toolEl('tool-talmud-sugyot-on').checked = !!talmudState.sugyot;
    talmudRenderCommPanel();
    talmudRenderSummary(tr);
    talmudRenderText(tr);
    toolEl('tool-talmud-source').textContent = [t('tools.talmud_source')].concat(talmudCommSources().map(c => t(c.source))).join(' ');
}

// Un segment : les morceaux en gras (<b>) deviennent des <b>, le reste du texte simple. Le texte ne passe jamais par du HTML brut.
function talmudSegment(raw) {
    const p = talmudNode('p', 'tanakh-verse talmud-seg' + (TalmudCore.isHadran(raw) ? ' talmud-hadran' : ''));
    p.lang = 'he';
    TalmudCore.parseComment(raw).forEach(part => {
        const text = talmudVow(part.s);
        if (part.k) p.appendChild(talmudNode('b', '', text));
        else p.appendChild(document.createTextNode(text));
    });
    return p;
}

function talmudRenderText(tr) {
    const box = toolEl('tool-talmud-text');
    const msg = toolEl('tool-talmud-msg');
    const wanted = { id: tr.id, page: talmudState.page };
    const stale = () => talmudState.id !== wanted.id || talmudState.page !== wanted.page;
    if (!talmudLoaded[tr.id]) { msg.textContent = t('tools.torah_loading'); toolClear(box); }
    talmudBook(tr.id).then(book => {
        if (stale()) return;
        if (msg.textContent === t('tools.torah_loading') && !Object.keys(talmudCommPending).length) msg.textContent = '';
        // Le focus du clavier reste sur la pastille touchée quand le texte est reconstruit.
        const focused = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.badge : null;
        toolClear(box);
        const label = TalmudCore.amoudLabel(tr.start, wanted.page);
        const title = talmudNode('h3', 'tanakh-chapter-title', tr.he + ' · ' + TalmudCore.hebrewAmoud(label) + ' · ' + tr.fr + ' ' + label);
        title.lang = 'he';
        box.appendChild(title);
        // Un chapitre qui commence dans l'amoud : son titre se pose avant son premier segment. Sinon, un rappel du chapitre en cours en haut.
        const starts = {};
        TalmudCore.chaptersStartingIn(tr, wanted.page).forEach(c => { starts[c.seg] = c; });
        if (!starts[0] && toolEl('tool-talmud-summary').hidden) {
            const c = tr.chapters[TalmudCore.chapterAt(tr, wanted.page, 0)];
            if (c) {
                const reminder = talmudNode('p', 'tool-small talmud-chapter-reminder', t('tools.talmud_chapter_n', { n: TalmudCore.chapterAt(tr, wanted.page, 0) + 1 }) + ' · ' + c.he);
                box.appendChild(reminder);
            }
        }
        if (!(book.pages[wanted.page] || []).length) box.appendChild(talmudNode('p', 'tool-small', t('tools.talmud_empty', { label })));
        const sugyot = talmudState.sugyot && talmudSugyot ? TalmudCore.sugyotIn(talmudSugyot, tr, wanted.page) : [];
        const sugyaAt = {};
        sugyot.forEach(s => { if (s.starts >= 0) sugyaAt[s.starts] = s; });
        // Une sugya qui vient de l'amoud précédent : un rappel en haut, tant qu'une autre ne commence pas au premier segment.
        const michnaRefs = {};
        if (talmudState.sugyot && talmudMichnaRef) TalmudCore.michnaRefIn(talmudMichnaRef, tr, wanted.page).filter(r => r.start).forEach(r => { (michnaRefs[r.seg] = michnaRefs[r.seg] || []).push(r); });
        const carried = sugyot.find(s => s.continues);
        if (carried && sugyaAt[0] === undefined) box.appendChild(talmudSugyaNode(carried, true));
        (book.pages[wanted.page] || []).forEach((raw, i) => {
            if (starts[i]) {
                const h = talmudNode('h4', 'talmud-chapter-heading', t('tools.talmud_chapter_n', { n: starts[i].n }) + ' · ' + starts[i].he);
                box.appendChild(h);
                const sentence = talmudState.summary && talmudResume ? TalmudCore.summaryOf(talmudResume, talmudIndex, tr.id, starts[i].n).chapter : '';
                if (sentence && i > 0) box.appendChild(talmudNode('p', 'tool-small talmud-chapter-reminder', sentence));
            }
            if (sugyaAt[i]) box.appendChild(talmudSugyaNode(sugyaAt[i], false));
            (michnaRefs[i] || []).forEach(ref => box.appendChild(talmudMichnaRefNode(tr, ref)));
            const block = talmudNode('div', 'tanakh-block talmud-block');
            const p = talmudSegment(raw);
            const inSegment = talmudSegmentComms(wanted.page, i);
            if (inSegment.length) p.appendChild(talmudBadge(wanted.page, i, inSegment));
            block.appendChild(p);
            talmudCommParagraphs(wanted.page, i, inSegment).forEach(x => block.appendChild(x));
            box.appendChild(block);
        });
        if (focused) {
            const again = box.querySelector('[data-badge="' + focused + '"]');
            if (again) again.focus();
        }
    }).catch(() => { if (!stale()) msg.textContent = t('tools.torah_error'); });
}

function talmudSelectTractate(id) { talmudOpen(id, 0); talmudScrollTop(); }
function talmudSelectDaf(value) { talmudOpen(talmudState.id, parseInt(value, 10) || 0); talmudScrollTop(); }
function talmudSelectChapter(value) {
    const tr = TalmudCore.find(talmudIndex, talmudState.id);
    const c = tr && tr.chapters[parseInt(value, 10)];
    if (c) { talmudOpen(tr.id, c.from[0]); talmudScrollTop(); }
}

function talmudGo(delta) {
    const to = TalmudCore.step(talmudIndex, { id: talmudState.id, page: talmudState.page }, delta);
    if (to) { talmudOpen(to.id, to.page); talmudScrollTop(); }
}

function talmudScrollTop() {
    const top = toolEl('tool-talmud-top');
    if (top && top.scrollIntoView) top.scrollIntoView({ block: 'start', behavior: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}


// --- Le dictionnaire au toucher -----------------------------------------------------------------------------

let talmudLookupWord = null;        // le mot touché (tel qu'écrit dans le texte), pour « Ouvrir dans le dictionnaire »
let talmudLookupAbbr = false;       // le mot touché est une abréviation connue : on ouvre l'onglet des abréviations

function talmudToggleLookup(checked) {
    talmudState.lookup = checked;
    talmudSavePrefs();
    if (!checked) talmudLookupClose();
}

// La position du curseur sous un point de l'écran : { node, offset } ou null (Firefox : caretPositionFromPoint ; Safari et Chrome : caretRangeFromPoint).
function talmudCaretAt(x, y) {
    if (document.caretPositionFromPoint) {
        const pos = document.caretPositionFromPoint(x, y);
        return pos && pos.offsetNode ? { node: pos.offsetNode, offset: pos.offset } : null;
    }
    if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(x, y);
        return range ? { node: range.startContainer, offset: range.startOffset } : null;
    }
    return null;
}

// Un mot touché dans le texte de la Guémara ou d'un commentaire (pas un bouton, pas un titre) : { word, range } ou null.
function talmudWordAtPoint(x, y) {
    const caret = talmudCaretAt(x, y);
    if (!caret || caret.node.nodeType !== Node.TEXT_NODE) return null;
    const parent = caret.node.parentElement;
    if (!parent || parent.closest('button') || !parent.closest('.talmud-seg, .talmud-comm')) return null;
    const hit = TalmudCore.wordAt(caret.node.data, caret.offset);
    if (!hit) return null;
    const range = document.createRange();
    range.setStart(caret.node, hit.start);
    range.setEnd(caret.node, hit.end);
    return { word: hit.word, range };
}

// Le mot touché reste surligné tant que la fiche est ouverte (là où le navigateur sait surligner une plage sans toucher au texte).
function talmudLookupHighlight(range) {
    try {
        if (window.CSS && CSS.highlights && typeof Highlight !== 'undefined') {
            if (range) CSS.highlights.set('talmud-word', new Highlight(range));
            else CSS.highlights.delete('talmud-word');
        }
    } catch (e) {}
}

function talmudTextClick(ev) {
    if (!talmudState.lookup) return;
    if (ev.target.closest && ev.target.closest('button, a, summary')) return;
    const selection = window.getSelection && window.getSelection();
    if (selection && String(selection).length) return;   // une sélection de texte en cours : on ne l'interrompt pas
    const hit = talmudWordAtPoint(ev.clientX, ev.clientY);
    if (hit) talmudLookupOpen(hit.word, hit.range);
}

function talmudLookupCard(entry) {
    const card = talmudNode('article', 'tool-result lex-card');
    const head = talmudNode('div', 'lex-head');
    const he = talmudNode('strong', 'lex-he', entry.he);
    he.lang = 'he';
    he.dir = 'rtl';
    head.appendChild(he);
    head.appendChild(talmudNode('span', 'lex-tr', entry.tr));
    head.appendChild(talmudNode('span', 'tool-small lex-pos', t('tools.gemara_cat_' + entry.cat)));
    if (typeof gemaraPipBadge === 'function') head.appendChild(gemaraPipBadge(4 - entry.tier, t('tools.gemara_badge_' + entry.tier)));
    card.appendChild(head);
    card.appendChild(talmudNode('p', 'lex-fr', entry.fr.join(', ')));
    if (entry.note) card.appendChild(talmudNode('p', 'tool-small', entry.note));
    return card;
}

function talmudLookupAbbrCard(abbr) {
    const card = talmudNode('article', 'tool-result lex-card');
    const head = talmudNode('div', 'lex-head');
    const he = talmudNode('strong', 'lex-he', abbr.sigle);
    he.lang = 'he';
    he.dir = 'rtl';
    head.appendChild(he);
    const full = talmudNode('span', 'lex-full', abbr.full);
    full.lang = 'he';
    full.dir = 'rtl';
    head.appendChild(full);
    head.appendChild(talmudNode('span', 'tool-small lex-pos', t('tools.talmud_lookup_abbr') + ' · ' + t('tools.gemara_abbr_cat_' + abbr.cat)));
    card.appendChild(head);
    card.appendChild(talmudNode('p', 'lex-fr', abbr.fr.join(', ')));
    if (abbr.note) card.appendChild(talmudNode('p', 'tool-small', abbr.note));
    return card;
}

// Ouvre la fiche du mot touché en bas de l'écran. Tout ce qui s'affiche passe par textContent.
function talmudLookupOpen(word, range) {
    if (typeof GemaraCore === 'undefined' || typeof LexiconCore === 'undefined') return;
    const found = TalmudCore.lookup(GemaraCore, LexiconCore.normalizeHebrew, word);
    if (!found) return;
    talmudLookupWord = word;
    talmudLookupAbbr = found.abbr.length > 0 && found.direct.length === 0;
    const sheet = toolEl('tool-talmud-lookup');
    const body = toolEl('tool-talmud-lookup-body');
    toolClear(body);
    toolEl('tool-talmud-lookup-word').textContent = word;
    found.abbr.forEach(a => body.appendChild(talmudLookupAbbrCard(a)));
    if (found.guess) {
        body.appendChild(talmudNode('p', 'tool-small', t('tools.talmud_lookup_guess', { roots: found.guess.roots.join(', ') })));
        found.guess.results.forEach(e => body.appendChild(talmudLookupCard(e)));
    } else {
        found.direct.forEach(e => body.appendChild(talmudLookupCard(e)));
        if (found.moreDirect) body.appendChild(talmudNode('p', 'tool-small', t('tools.talmud_lookup_more', { n: found.moreDirect })));
        if (found.near.length && !found.direct.length && !found.abbr.length) {
            body.appendChild(talmudNode('p', 'tool-small', t('tools.talmud_lookup_near')));
            found.near.forEach(e => body.appendChild(talmudLookupCard(e)));
        }
        if (!found.direct.length && !found.abbr.length && !found.near.length) body.appendChild(talmudNode('p', 'tool-small', t('tools.talmud_lookup_none')));
    }
    sheet.hidden = false;
    sheet.scrollTop = 0;
    const screen = toolEl('screen-tool-talmud');
    screen.classList.add('talmud-lookup-open');
    talmudKeepVisible(range, screen, sheet);
    talmudLookupHighlight(range);
}

// Le mot touché ne doit pas disparaître derrière la fiche : si elle le recouvre, l'écran défile juste assez pour le remonter au-dessus.
function talmudKeepVisible(range, screen, sheet) {
    if (!range) return;
    const rect = range.getBoundingClientRect();
    const limit = window.innerHeight - sheet.offsetHeight - 16;
    if (rect.bottom > limit) screen.scrollTop += rect.bottom - limit + 24;
}

function talmudLookupClose() {
    const sheet = toolEl('tool-talmud-lookup');
    if (sheet) sheet.hidden = true;
    const screen = toolEl('screen-tool-talmud');
    if (screen) screen.classList.remove('talmud-lookup-open');
    talmudLookupWord = null;
    talmudLookupHighlight(null);
}

// « Ouvrir dans le dictionnaire » : l'écran complet, déjà sur ce mot (ou son abréviation) ; « Retour » ramène ici.
function talmudLookupOpenDictionary() {
    const word = talmudLookupWord;
    if (!word) return;
    const tab = talmudLookupAbbr ? 'abbr' : 'words';
    talmudLookupClose();
    openTool('gemara', 'screen-tool-talmud');
    toolGemaraShow(tab, word);
}

// Installé une fois, quand l'écran existe : le toucher sur le texte et la touche Échap.
(function () {
    const box = document.getElementById('tool-talmud-text');
    if (box) box.addEventListener('click', talmudTextClick);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') talmudLookupClose(); });
})();
