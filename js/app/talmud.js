// =========================================================================
// === TALMUD DE BABYLONE (la Guémara, amoud par amoud, écran de l'Atelier) ===
// =========================================================================
// La Guémara en araméen vocalisé, un amoud (une face de page : 2a, 2b…) à la fois, avec un menu des traités, un menu des amoudim, un saut par chapitre
// et des boutons « précédent / suivant » qui passent d'un traité à l'autre. Les données : data/talmud/ (scripts/build_talmud.js, règles pures dans
// js/talmudCore.js). Chaque traité est chargé à son ouverture, une seule fois. Même organisation que la Michna (js/app/michna.js).
// « Sans voyelles » retire les voyelles et les accents. Tout le texte passe par des nœuds texte ; la police est celle des Réglages (--torah-font).
// Le choix (traité, amoud, voyelles) est gardé dans localStorage, sans jamais bloquer si le stockage est refusé.

const TALMUD_KEY = 'talmudPrefs';
let talmudIndex = null;
const talmudLoaded = {};    // traité -> data/talmud/<traité>.json
let talmudState = { id: 'berakhot', page: 0, vowels: 'full' };

function talmudLoadPrefs() {
    try {
        const p = JSON.parse(localStorage.getItem(TALMUD_KEY) || 'null');
        if (p && typeof p === 'object') {
            if (typeof p.id === 'string') talmudState.id = p.id;
            if (Number.isInteger(p.page) && p.page >= 0) talmudState.page = p.page;
            if (p.vowels === 'consonants') talmudState.vowels = 'consonants';
        }
    } catch (e) {}
}

function talmudSavePrefs() {
    try { localStorage.setItem(TALMUD_KEY, JSON.stringify({ id: talmudState.id, page: talmudState.page, vowels: talmudState.vowels })); } catch (e) {}
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
    talmudSavePrefs();
    talmudRender();
}

function talmudVow(text) {
    return talmudState.vowels === 'full' ? text : TalmudCore.stripMarks(text);
}

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
    talmudRenderText(tr);
    toolEl('tool-talmud-source').textContent = t('tools.talmud_source');
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
        msg.textContent = '';
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
            box.appendChild(talmudSegment(raw));
        });
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
