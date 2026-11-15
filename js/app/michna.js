// =========================================================================
// === MICHNA (les 63 traités avec le commentaire de Bartenura, écran de l'Atelier) ===
// =========================================================================
// La Michna en hébreu vocalisé, traité par traité et chapitre par chapitre, une michna par bloc numérotée en lettres, avec en dessous le
// commentaire de Rabbénou Ovadia de Bartenura (case « Bartenura »). Hébreu seul. Les données : data/michna/ (scripts/build_michna.js,
// règles pures dans js/michnaCore.js). Chaque traité est chargé à son ouverture, une seule fois. « Sans voyelles » s'applique à la Michna et
// au commentaire. Tout le texte passe par des nœuds texte ; la police est celle des Réglages (--torah-font). Le choix (traité, chapitre,
// Bartenura, voyelles) est gardé dans localStorage, sans jamais bloquer si le stockage est refusé.

const MICHNA_KEY = 'michnaPrefs';
let michnaIndex = null;
const michnaLoaded = {};
let michnaState = { id: 'berakhot', chapter: 1, bart: true, vowels: 'full', summary: true };
let michnaResume = null;   // data/michna/resume.json (une phrase par ordre, par traité et par chapitre) ; null tant qu'il n'est pas chargé ou s'il manque

function michnaLoadPrefs() {
    try {
        const p = JSON.parse(localStorage.getItem(MICHNA_KEY) || 'null');
        if (p && typeof p === 'object') {
            if (typeof p.id === 'string') michnaState.id = p.id;
            if (Number.isInteger(p.chapter) && p.chapter > 0) michnaState.chapter = p.chapter;
            if (typeof p.bart === 'boolean') michnaState.bart = p.bart;
            if (p.vowels === 'consonants') michnaState.vowels = 'consonants';
            if (typeof p.summary === 'boolean') michnaState.summary = p.summary;
        }
    } catch (e) {}
}

function michnaSavePrefs() {
    try { localStorage.setItem(MICHNA_KEY, JSON.stringify(michnaState)); } catch (e) {}
}

function toolMichnaInit() {
    const msg = toolEl('tool-michna-msg');
    if (michnaIndex) { michnaRender(); return; }
    michnaLoadPrefs();
    msg.textContent = t('tools.torah_loading');
    fetch('data/michna/index.json')
        .then(res => { if (!res.ok) throw new Error('http ' + res.status); return res.json(); })
        .then(json => {
            michnaIndex = json;
            if (!MichnaCore.find(json, michnaState.id)) michnaState = Object.assign(michnaState, { id: 'berakhot', chapter: 1 });
            msg.textContent = '';
            michnaRender();
            michnaLoadResume();
        })
        .catch(() => { msg.textContent = t('tools.torah_error'); });
}

// Les résumés (case « Résumé ») : une phrase par ordre, par traité et par chapitre, dans data/michna/resume.json. Texte écrit pour l'application, en
// français, à relire par une personne compétente. Chargés une fois ; sans le fichier, rien ne s'affiche et le reste de l'écran fonctionne.
function michnaLoadResume() {
    if (michnaResume) return;
    fetch('data/michna/resume.json')
        .then(res => { if (!res.ok) throw new Error('resume HTTP ' + res.status); return res.json(); })
        .then(data => { michnaResume = data; michnaRenderSummary(); })
        .catch(() => { /* pas de résumé */ });
}

function michnaRenderSummary() {
    const box = toolEl('tool-michna-summary');
    toolClear(box);
    toolEl('tool-michna-summary-on').checked = !!michnaState.summary;
    const s = michnaState.summary && michnaIndex ? MichnaCore.summaryOf(michnaResume, michnaIndex, michnaState.id, michnaState.chapter) : null;
    const tr = michnaIndex ? MichnaCore.find(michnaIndex, michnaState.id) : null;
    const lines = s ? [
        [t('tools.michna_summary_seder', { name: tr.sederFr }), s.seder],
        [t('tools.michna_summary_book', { name: tr.fr }), s.book],
        [t('tools.michna_chapter_n', { n: michnaState.chapter }) + ' :', s.chapter]
    ].filter(l => l[1]) : [];
    box.hidden = !lines.length;
    lines.forEach(([label, text]) => {
        const row = michnaNode('div', 'tanakh-cycle-row');
        row.appendChild(michnaNode('strong', '', label + ' '));
        row.appendChild(michnaNode('span', 'tool-small', text));
        box.appendChild(row);
    });
}

function michnaToggleSummary(checked) {
    michnaState.summary = checked;
    michnaSavePrefs();
    michnaRenderSummary();
}

// Ouvre un traité (chargé une fois) à un chapitre, puis redessine.
function michnaOpen(id, chapter) {
    const tr = MichnaCore.find(michnaIndex, id);
    if (!tr) return;
    michnaState.id = id;
    michnaState.chapter = Math.min(Math.max(1, chapter || 1), tr.chapters);
    michnaSavePrefs();
    michnaRender();
}

function michnaBook(id) {
    if (michnaLoaded[id]) return Promise.resolve(michnaLoaded[id]);
    return fetch('data/michna/' + id + '.json')
        .then(res => { if (!res.ok) throw new Error('http ' + res.status); return res.json(); })
        .then(book => { michnaLoaded[id] = book; return book; });
}

function michnaNode(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
}

function michnaChips(box, items, current, onPick) {
    toolClear(box);
    items.forEach(([key, label]) => {
        const b = michnaNode('button', 'tool-history-chip', label);
        b.type = 'button';
        b.setAttribute('aria-pressed', key === current ? 'true' : 'false');
        b.onclick = () => onPick(key);
        box.appendChild(b);
    });
}

function michnaRender() {
    if (!michnaIndex) return;
    const tr = MichnaCore.find(michnaIndex, michnaState.id);
    // Les six ordres : un bouton chacun, qui ouvre son premier traité.
    michnaChips(toolEl('tool-michna-sedarim'), michnaIndex.sedarim.map(s => [s.id, s.fr]), tr.seder,
        id => { const s = michnaIndex.sedarim.find(x => x.id === id); michnaOpen(s.tractates[0].id, 1); });
    // Les traités de l'ordre choisi, et les chapitres du traité choisi.
    const sel = toolEl('tool-michna-tractate');
    toolClear(sel);
    const seder = michnaIndex.sedarim.find(s => s.id === tr.seder);
    seder.tractates.forEach(x => {
        const o = michnaNode('option', '', x.he + ' · ' + x.fr);
        o.value = x.id;
        o.selected = x.id === tr.id;
        sel.appendChild(o);
    });
    const chap = toolEl('tool-michna-chapter');
    toolClear(chap);
    for (let c = 1; c <= tr.chapters; c++) {
        const o = michnaNode('option', '', t('tools.michna_chapter_n', { n: c }) + ' · ' + MichnaCore.hebrewNumber(c));
        o.value = String(c);
        o.selected = c === michnaState.chapter;
        chap.appendChild(o);
    }
    const prev = MichnaCore.step(michnaIndex, { id: tr.id, chapter: michnaState.chapter }, -1);
    const next = MichnaCore.step(michnaIndex, { id: tr.id, chapter: michnaState.chapter }, 1);
    ['tool-michna-prev', 'tool-michna-prev2'].forEach(id => { toolEl(id).disabled = !prev; });
    ['tool-michna-next', 'tool-michna-next2'].forEach(id => { toolEl(id).disabled = !next; });
    toolEl('tool-michna-nav-label').textContent = '↑ ' + tr.he + ' ' + MichnaCore.hebrewNumber(michnaState.chapter);

    michnaChips(toolEl('tool-michna-bart'), [['on', t('tools.michna_bart_on')], ['off', t('tools.michna_bart_off')]], michnaState.bart ? 'on' : 'off',
        key => { michnaState.bart = key === 'on'; michnaSavePrefs(); michnaRender(); });
    michnaChips(toolEl('tool-michna-vowels'), [['full', t('tools.tanakh_vowels_full')], ['consonants', t('tools.tanakh_vowels_consonants')]], michnaState.vowels,
        key => { michnaState.vowels = key; michnaSavePrefs(); michnaRender(); });
    toolEl('tool-michna-source').textContent = t('tools.michna_source');
    michnaRenderSummary();
    michnaRenderText(tr);
}

function michnaVow(text) {
    return michnaState.vowels === 'full' ? text : MichnaCore.stripMarks(text);
}

function michnaRenderText(tr) {
    const box = toolEl('tool-michna-text');
    const msg = toolEl('tool-michna-msg');
    const wanted = { id: tr.id, chapter: michnaState.chapter };
    const stale = () => michnaState.id !== wanted.id || michnaState.chapter !== wanted.chapter;
    if (!michnaLoaded[tr.id]) { msg.textContent = t('tools.torah_loading'); toolClear(box); }
    michnaBook(tr.id).then(book => {
        if (stale()) return;
        msg.textContent = '';
        toolClear(box);
        const title = michnaNode('h3', 'tanakh-chapter-title', tr.he + ' · ' + t('tools.michna_chapter_n', { n: michnaState.chapter }));
        title.lang = 'he';
        box.appendChild(title);
        (book.chapters[michnaState.chapter - 1] || []).forEach((entry, i) => {
            const block = michnaNode('div', 'tanakh-block michna-block');
            const p = michnaNode('p', 'tanakh-verse michna-mishna');
            p.lang = 'he';
            p.appendChild(michnaNode('span', 'tanakh-num', MichnaCore.hebrewNumber(i + 1)));
            p.appendChild(document.createTextNode(' ' + michnaVow(entry[0])));
            block.appendChild(p);
            if (michnaState.bart) entry[1].forEach(raw => block.appendChild(michnaComment(raw)));
            box.appendChild(block);
        });
    }).catch(() => { if (!stale()) msg.textContent = t('tools.torah_error'); });
}

// Un passage du Bartenura : <b> le mot commenté, <i> une citation. Le texte ne passe jamais par du HTML brut.
function michnaComment(raw) {
    const p = michnaNode('p', 'tanakh-comm michna-comm');
    p.style.setProperty('--comm-color', '#8a6d3b');
    p.lang = 'he';
    MichnaCore.parseComment(raw).forEach(part => {
        const text = michnaVow(part.s);
        if (part.k) p.appendChild(michnaNode(part.k === 'b' ? 'b' : 'i', '', text));
        else p.appendChild(document.createTextNode(text));
    });
    return p;
}

function michnaSelectTractate(id) { michnaOpen(id, 1); }
function michnaSelectChapter(value) { michnaOpen(michnaState.id, parseInt(value, 10) || 1); }

function michnaGo(delta) {
    const to = MichnaCore.step(michnaIndex, { id: michnaState.id, chapter: michnaState.chapter }, delta);
    if (to) { michnaOpen(to.id, to.chapter); michnaScrollTop(); }
}

function michnaScrollTop() {
    const top = toolEl('tool-michna-top');
    if (top && top.scrollIntoView) top.scrollIntoView({ block: 'start', behavior: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}
