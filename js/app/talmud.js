// =========================================================================
// === TALMUD DE BABYLONE (la Guémara, amoud par amoud, écran de l'Atelier) ===
// =========================================================================
// La Guémara en araméen vocalisé, un amoud (une face de page : 2a, 2b…) à la fois, avec un menu des traités, un menu des amoudim, un saut par chapitre
// et des boutons « précédent / suivant » qui passent d'un traité à l'autre. Les données : data/talmud/ (scripts/build_talmud.js, règles pures dans
// js/talmudCore.js). Chaque traité est chargé à son ouverture, une seule fois. Même organisation que la Michna (js/app/michna.js).
// « Sans voyelles » retire les voyelles et les accents. Tout le texte passe par des nœuds texte ; la police est celle des Réglages (--torah-font).
// Les commentateurs (Rachi, Rachbam, Ran, Rabbénou Guerchom, Tossafot) : même panneau repliable que la Michna ; chacun sous le segment de Guémara qu'il commente, avec sa couleur.
// Une pastille « 💬 n » à côté de chaque segment commenté ouvre ses commentaires, même quand la case n'est pas cochée (data/talmud/counts-<traité>.json).
// Le choix (traité, amoud, voyelles, commentateurs cochés) est gardé dans localStorage, sans jamais bloquer si le stockage est refusé.

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
const talmudLoaded = {};        // traité -> data/talmud/<traité>.json
const talmudCommLoaded = {};    // commentateur -> traité -> { pages } : commentaire chargé
const talmudCommPending = {};   // « commentateur/traité » -> promesse en cours, pour ne charger qu'une fois
const talmudCounts = {};        // traité -> counts-<traité>.json : { order, pages[amoud][segment] = masque }
let talmudState = { id: 'berakhot', page: 0, vowels: 'full', comm: { rashi: true }, open: {} };

function talmudLoadPrefs() {
    try {
        const p = JSON.parse(localStorage.getItem(TALMUD_KEY) || 'null');
        if (p && typeof p === 'object') {
            if (typeof p.id === 'string') talmudState.id = p.id;
            if (Number.isInteger(p.page) && p.page >= 0) talmudState.page = p.page;
            if (p.vowels === 'consonants') talmudState.vowels = 'consonants';
            if (p.comm && typeof p.comm === 'object') talmudState.comm = p.comm;
        }
    } catch (e) {}
}

function talmudSavePrefs() {
    try { localStorage.setItem(TALMUD_KEY, JSON.stringify({ id: talmudState.id, page: talmudState.page, vowels: talmudState.vowels, comm: talmudState.comm })); } catch (e) {}
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

function toolTalmudInit() {
    const msg = toolEl('tool-talmud-msg');
    if (talmudIndex) { talmudRender(); return; }
    talmudLoadPrefs();
    msg.textContent = t('tools.torah_loading');
    fetch('data/talmud/index.json')
        .then(res => { if (!res.ok) throw new Error('http ' + res.status); return res.json(); })
        .then(json => {
            talmudIndex = json;
            const tr = TalmudCore.find(json, talmudState.id);
            if (!tr) talmudState = Object.assign(talmudState, { id: TalmudCore.tractates(json)[0].id, page: 0 });
            else talmudState.page = Math.min(talmudState.page, tr.amudim - 1);
            msg.textContent = '';
            talmudRender();
            talmudLoadCounts(talmudState.id);
            talmudLoadComments(talmudState.id);
        })
        .catch(() => { msg.textContent = t('tools.torah_error'); });
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

// Le panneau « Commentateurs » : une case par exégète du registre, construites une fois (le focus du clavier ne se perd pas à chaque affichage).
// Un exégète qui ne couvre pas le traité est grisé, sa case gardée.
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
    });
    const active = talmudCommActive();
    toolEl('tool-talmud-comm-summary').textContent = active.length
        ? t('tools.tanakh_comm_title') + ' · ' + active.map(c => c.name).join(', ')
        : t('tools.tanakh_comm_title');
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

function talmudRender() {
    if (!talmudIndex) return;
    const tr = TalmudCore.find(talmudIndex, talmudState.id);
    const page = talmudState.page;
    // Les ordres : un bouton chacun, qui ouvre son premier traité (inutile tant qu'il n'y en a qu'un).
    const chips = toolEl('tool-talmud-sedarim');
    chips.hidden = talmudIndex.sedarim.length < 2;
    talmudChips(chips, talmudIndex.sedarim.map(s => [s.id, s.fr]), tr.seder,
        id => { const s = talmudIndex.sedarim.find(x => x.id === id); talmudOpen(s.tractates[0].id, 0); });
    // Les traités de l'ordre choisi.
    const sel = toolEl('tool-talmud-tractate');
    toolClear(sel);
    talmudIndex.sedarim.find(s => s.id === tr.seder).tractates.forEach(x => {
        const o = talmudNode('option', '', x.he + ' · ' + x.fr);
        o.value = x.id;
        o.selected = x.id === tr.id;
        sel.appendChild(o);
    });
    // Les chapitres du traité : un saut vers l'amoud où chacun commence ; le chapitre en cours est celui d'où l'on lit.
    const chap = toolEl('tool-talmud-chapter');
    toolClear(chap);
    const current = TalmudCore.chapterAt(tr, page, 0);
    tr.chapters.forEach((c, k) => {
        const o = talmudNode('option', '', t('tools.talmud_chapter_n', { n: k + 1 }) + ' · ' + TalmudCore.amoudLabel(tr.start, c.from[0]) + ' · ' + c.he);
        o.value = String(k);
        o.selected = k === current;
        chap.appendChild(o);
    });
    chap.hidden = !tr.chapters.length;
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
    talmudRenderCommPanel();
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
        if (!starts[0]) {
            const c = tr.chapters[TalmudCore.chapterAt(tr, wanted.page, 0)];
            if (c) {
                const reminder = talmudNode('p', 'tool-small talmud-chapter-reminder', t('tools.talmud_chapter_n', { n: TalmudCore.chapterAt(tr, wanted.page, 0) + 1 }) + ' · ' + c.he);
                box.appendChild(reminder);
            }
        }
        if (!(book.pages[wanted.page] || []).length) box.appendChild(talmudNode('p', 'tool-small', t('tools.talmud_empty', { label })));
        (book.pages[wanted.page] || []).forEach((raw, i) => {
            if (starts[i]) {
                const h = talmudNode('h4', 'talmud-chapter-heading', t('tools.talmud_chapter_n', { n: starts[i].n }) + ' · ' + starts[i].he);
                box.appendChild(h);
            }
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
