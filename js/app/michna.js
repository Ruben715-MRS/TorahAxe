// =========================================================================
// === MICHNA (les 63 traités et leurs commentateurs, écran de l'Atelier) ===
// =========================================================================
// La Michna en hébreu vocalisé, traité par traité et chapitre par chapitre, une michna par bloc numérotée en lettres. Hébreu seul. Les données :
// data/michna/ (scripts/build_michna.js, règles pures dans js/michnaCore.js). Chaque traité est chargé à son ouverture, une seule fois.
// Même organisation que le Tanakh (js/app/tanakh.js) : le panneau repliable « Commentateurs » liste les exégètes du registre MICHNA_COMMENTATORS,
// une case chacun, plusieurs à la fois, chacun sous la michna avec sa couleur ; un exégète qui ne couvre pas le traité est grisé. Une pastille « 💬 n »
// à côté du numéro de chaque michna commentée ouvre ses commentaires, même quand leur case n'est pas cochée (data/michna/counts-<traité>.json :
// quels exégètes commentent la michna). Aujourd'hui : Rambam, Rash de Sens (Zeraïm et Tohorot), Bartenura, Melekhet Shelomoh, Tosafot Yom Tov, Gra (Tohorot
// et Avot) et Tiferet Israël (Yachin). Pour en ajouter un : une entrée du registre, ses fichiers data/michna/<préfixe><traité>.json et son id dans `comm`
// de index.json (scripts/build_michna.js).
// « Sans voyelles » s'applique à la Michna et aux commentaires. Tout le texte passe par des nœuds texte ; la police est celle des Réglages (--torah-font).
// Le choix (traité, chapitre, commentateurs cochés, résumé, voyelles) est gardé dans localStorage, sans jamais bloquer si le stockage est refusé.
// Les résumés (case « Résumé », data/michna/resume.json) : texte écrit pour l'application, en français, à relire par une personne compétente.

const MICHNA_KEY = 'michnaPrefs';
// Le registre des commentateurs, dans l'ordre chronologique d'affichage. `name` : nom français ; `he` : nom hébreu (étiquette) ; `file` : préfixe des
// fichiers ; `source` : la clé i18n de sa mention de source ; `color` : la couleur de sa bordure.
const MICHNA_COMMENTATORS = [
    { id: 'rambam', name: 'Rambam', he: 'רמב״ם', file: 'rambam-', source: 'tools.michna_src_rambam', color: '#2a7d9c' },
    { id: 'rash', name: 'Rash de Sens', he: 'ר״ש משאנץ', file: 'rash-', source: 'tools.michna_src_rash', color: '#8e5aa8' },
    { id: 'bartenura', name: 'Bartenura', he: 'ברטנורא', file: 'bartenura-', source: 'tools.michna_src_bartenura', color: '#8a6d3b' },
    { id: 'melekhet', name: 'Melekhet Shelomoh', he: 'מלאכת שלמה', file: 'melekhet-', source: 'tools.michna_src_melekhet', color: '#c0504d' },
    { id: 'tosafot-yom-tov', name: 'Tosafot Yom Tov', he: 'תוספות יום טוב', file: 'tyt-', source: 'tools.michna_src_tyt', color: '#2f8f83' },
    { id: 'gra', name: 'Gaon de Vilna (Gra)', he: 'הגר״א', file: 'gra-', source: 'tools.michna_src_gra', color: '#5b8c2a' },
    { id: 'tiferet-yisrael', name: 'Tiferet Israël (Yachin)', he: 'תפארת ישראל', file: 'tiferet-', source: 'tools.michna_src_tiferet', color: '#3d6fb4' }
];

let michnaIndex = null;
const michnaLoaded = {};        // traité -> data/michna/<traité>.json
const michnaCommLoaded = {};    // commentateur -> traité -> { chapters } : commentaire chargé
const michnaCommPending = {};   // « commentateur/traité » -> promesse en cours, pour ne charger qu'une fois
const michnaCounts = {};        // traité -> counts-<traité>.json : { order, chapters[c][i] = masque }
let michnaState = { id: 'berakhot', chapter: 1, vowels: 'full', summary: true, comm: { bartenura: true }, open: {} };
let michnaResume = null;        // data/michna/resume.json (une phrase par ordre, par traité et par chapitre) ; null tant qu'il n'est pas chargé ou s'il manque

function michnaLoadPrefs() {
    try {
        const p = JSON.parse(localStorage.getItem(MICHNA_KEY) || 'null');
        if (p && typeof p === 'object') {
            if (typeof p.id === 'string') michnaState.id = p.id;
            if (Number.isInteger(p.chapter) && p.chapter > 0) michnaState.chapter = p.chapter;
            if (p.vowels === 'consonants') michnaState.vowels = 'consonants';
            if (typeof p.summary === 'boolean') michnaState.summary = p.summary;
            if (p.comm && typeof p.comm === 'object') michnaState.comm = p.comm;
            else if (typeof p.bart === 'boolean') michnaState.comm = { bartenura: p.bart };   // l'ancien choix « Avec Bartenura / Michna seule »
        }
    } catch (e) {}
}

function michnaSavePrefs() {
    try { localStorage.setItem(MICHNA_KEY, JSON.stringify({ id: michnaState.id, chapter: michnaState.chapter, vowels: michnaState.vowels, summary: michnaState.summary, comm: michnaState.comm })); } catch (e) {}
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
            michnaLoadCounts(michnaState.id);
            michnaLoadComments(michnaState.id);
        })
        .catch(() => { msg.textContent = t('tools.torah_error'); });
}

// Les résumés (case « Résumé ») : une phrase par ordre, par traité et par chapitre, dans data/michna/resume.json. Chargés une fois ;
// sans le fichier, rien ne s'affiche et le reste de l'écran fonctionne.
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
    michnaState.open = {};
    michnaSavePrefs();
    michnaRender();
    michnaLoadCounts(id);
    michnaLoadComments(id);
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

// --- Les commentateurs --------------------------------------------------------------------------------

// Les commentateurs du registre qui couvrent le traité ouvert : l'index déclare leurs fichiers.
function michnaCommAvailable() {
    const tr = michnaIndex ? MichnaCore.find(michnaIndex, michnaState.id) : null;
    return MICHNA_COMMENTATORS.filter(c => tr && tr.comm.includes(c.id));
}

// Les commentateurs cochés qui couvrent le traité ouvert : ceux qu'on affiche.
function michnaCommActive() {
    return michnaCommAvailable().filter(c => michnaState.comm[c.id]);
}

// Les exégètes dont un commentaire est à l'écran, donc dont la source se mentionne : les cochés, et ceux qu'une pastille dépliée a fait charger.
function michnaCommSources() {
    const opened = Object.keys(michnaState.open).length > 0;
    return michnaCommAvailable().filter(c => michnaState.comm[c.id] || (opened && (michnaCommLoaded[c.id] || {})[michnaState.id]));
}

// Charge les commentaires de ces exégètes pour le traité `id` (une fois chacun) ; puis réaffiche si on est toujours sur ce traité.
function michnaLoadComm(list, id) {
    if (michnaState.id !== id) return;
    const msg = toolEl('tool-michna-msg');
    list.forEach(comm => {
        const loaded = michnaCommLoaded[comm.id] || (michnaCommLoaded[comm.id] = {});
        const key = comm.id + '/' + id;
        if (loaded[id] || michnaCommPending[key]) return;
        msg.textContent = t('tools.torah_loading');
        michnaCommPending[key] = fetch('data/michna/' + comm.file + id + '.json')
            .then(res => { if (!res.ok) throw new Error(comm.id + ' HTTP ' + res.status); return res.json(); })
            .then(data => {
                loaded[id] = data;
                msg.textContent = '';
                if (michnaState.id === id) michnaRender();
            })
            .catch(() => { msg.textContent = t('tools.tanakh_comm_error', { name: comm.name }); })
            .finally(() => { delete michnaCommPending[key]; });
    });
}

// Charge les commentaires cochés du traité.
function michnaLoadComments(id) {
    michnaLoadComm(michnaCommActive(), id);
}

// Charge (une fois) les masques de pastilles du traité, s'il a des commentateurs ; puis réaffiche. Sans ce fichier, le traité s'affiche sans pastilles.
function michnaLoadCounts(id) {
    if (michnaCounts[id] || !michnaCommAvailable().length) return;
    fetch('data/michna/counts-' + id + '.json')
        .then(res => { if (!res.ok) throw new Error('counts HTTP ' + res.status); return res.json(); })
        .then(counts => {
            michnaCounts[id] = counts;
            if (michnaState.id === id) michnaRender();
        })
        .catch(() => { /* pas de pastilles */ });
}

// Les commentateurs du registre qui commentent la michna (chapitre `c`, michna `i`, depuis 0), selon le masque du traité.
function michnaMishnaComms(c, i) {
    const counts = michnaCounts[michnaState.id];
    const mask = counts && counts.chapters[c] ? counts.chapters[c][i] : 0;
    if (!mask) return [];
    const available = michnaCommAvailable();
    return MichnaCore.maskIds(counts.order, mask).map(id => available.find(x => x.id === id)).filter(Boolean);
}

// La pastille « 💬 n » d'une michna : touchée, elle ouvre ou ferme les commentaires de tous ceux qui la commentent, cochés ou non.
function michnaBadge(c, i, list) {
    const key = c + ':' + i;
    const names = list.map(x => x.name).join(', ');
    const btn = michnaNode('button', 'tanakh-comm-badge', '💬 ' + list.length);
    btn.type = 'button';
    btn.dataset.badge = key;
    btn.title = names;
    btn.setAttribute('aria-label', t(list.length === 1 ? 'tools.michna_comm_count_one' : 'tools.michna_comm_count', { n: list.length, names }));
    btn.setAttribute('aria-expanded', michnaState.open[key] ? 'true' : 'false');
    btn.onclick = () => michnaToggleMishna(c, i);
    return btn;
}

function michnaToggleMishna(c, i) {
    const key = c + ':' + i;
    if (michnaState.open[key]) delete michnaState.open[key]; else michnaState.open[key] = true;
    michnaRender();
    if (michnaState.open[key]) michnaLoadComm(michnaMishnaComms(c, i), michnaState.id);
}

function michnaToggleComm(id, checked) {
    michnaState.comm[id] = checked;
    michnaSavePrefs();
    michnaRender();
    if (checked) michnaLoadComments(michnaState.id);
}

// Le panneau « Commentateurs » : une case par exégète du registre, construites une fois (le focus du clavier ne se perd pas à chaque affichage).
// Un exégète qui ne couvre pas le traité est grisé, sa case gardée.
function michnaRenderCommPanel() {
    const panel = toolEl('tool-michna-comm');
    const list = toolEl('tool-michna-comm-list');
    const available = michnaCommAvailable();
    panel.hidden = available.length === 0;
    if (!list.children.length) {
        MICHNA_COMMENTATORS.forEach(comm => {
            const label = michnaNode('label', 'dict-toggle tanakh-comm-item');
            label.dataset.comm = comm.id;
            label.style.setProperty('--comm-color', comm.color);
            const box = michnaNode('input');
            box.type = 'checkbox';
            box.id = 'tool-michna-comm-' + comm.id;
            box.onchange = () => michnaToggleComm(comm.id, box.checked);
            label.appendChild(box);
            label.appendChild(michnaNode('span', '', ' ' + comm.name + ' '));
            const he = michnaNode('span', 'tanakh-comm-he', comm.he);
            he.lang = 'he';
            he.dir = 'rtl';
            label.appendChild(he);
            list.appendChild(label);
        });
    }
    MICHNA_COMMENTATORS.forEach(comm => {
        const box = toolEl('tool-michna-comm-' + comm.id);
        box.checked = !!michnaState.comm[comm.id];
        box.disabled = !available.includes(comm);
    });
    const active = michnaCommActive();
    toolEl('tool-michna-comm-summary').textContent = active.length
        ? t('tools.tanakh_comm_title') + ' · ' + (active.length <= 3 ? active.map(c => c.name).join(', ') : active.length)
        : t('tools.tanakh_comm_title');
}

// Un passage de commentaire : <b> le mot commenté, <i> une citation, <small> une variante. Le texte ne passe jamais par du HTML brut.
function michnaComment(comm, raw) {
    const p = michnaNode('p', 'tanakh-comm michna-comm tanakh-comm-' + comm.id);
    p.style.setProperty('--comm-color', comm.color);
    p.lang = 'he';
    p.dir = 'rtl';
    MichnaCore.parseComment(raw).forEach(part => {
        const text = michnaVow(part.s);
        if (part.k) p.appendChild(michnaNode(part.k, '', text));
        else p.appendChild(document.createTextNode(text));
    });
    return p;
}

// L'étiquette du nom hébreu de l'exégète, en tête de son premier commentaire de la michna.
function michnaCommTag(comm, p) {
    const tag = michnaNode('span', 'tanakh-comm-tag', comm.he);
    tag.lang = 'he';
    p.insertBefore(document.createTextNode(' '), p.firstChild);
    p.insertBefore(tag, p.firstChild);
}

// Les commentaires de la michna (chapitre `c`, michna `i`, depuis 0) : ceux dont la case est cochée et, si la pastille est ouverte, tous ceux qui la commentent ;
// seulement ceux dont le traité est chargé et qui ont quelque chose à dire ici. L'étiquette de nom n'est utile qu'à partir de deux exégètes.
function michnaCommParagraphs(c, i, inMishna) {
    const open = !!michnaState.open[c + ':' + i];
    const blocks = michnaCommAvailable()
        .filter(x => michnaState.comm[x.id] || (open && inMishna.includes(x)))
        .filter(x => (michnaCommLoaded[x.id] || {})[michnaState.id])
        .map(x => [x, ((michnaCommLoaded[x.id][michnaState.id].chapters[c] || [])[i] || []).map(raw => michnaComment(x, raw))])
        .filter(([, list]) => list.length);
    const out = [];
    blocks.forEach(([comm, list]) => {
        if (blocks.length > 1) michnaCommTag(comm, list[0]);
        list.forEach(p => out.push(p));
    });
    return out;
}

// --- L'écran ------------------------------------------------------------------------------------------

// « Situer dans la chronologie » : l'époque des maîtres de ce texte (une seule fois par ouverture de l'écran).
function michnaChrono() {
    const box = toolEl('tool-michna-chrono');
    if (!box || box.firstChild || typeof chrAddTargetButton !== 'function' || typeof ChronologieCore === 'undefined') return;
    chrAddTargetButton(box, model => ChronologieCore.forText(model, 'michna'), 'screen-tool-michna');
}

function michnaRender() {
    michnaChrono();
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

    michnaChips(toolEl('tool-michna-vowels'), [['full', t('tools.tanakh_vowels_full')], ['consonants', t('tools.tanakh_vowels_consonants')]], michnaState.vowels,
        key => { michnaState.vowels = key; michnaSavePrefs(); michnaRender(); });
    michnaRenderCommPanel();
    michnaRenderSummary();
    michnaRenderText(tr);
    toolEl('tool-michna-source').textContent = [t('tools.michna_source')].concat(michnaCommSources().map(c => t(c.source))).join(' ');
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
        if (msg.textContent === t('tools.torah_loading') && !Object.keys(michnaCommPending).length) msg.textContent = '';
        // Le focus du clavier reste sur la pastille touchée quand le texte est reconstruit.
        const focused = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.badge : null;
        toolClear(box);
        const title = michnaNode('h3', 'tanakh-chapter-title', tr.he + ' · ' + t('tools.michna_chapter_n', { n: michnaState.chapter }));
        title.lang = 'he';
        box.appendChild(title);
        const c = michnaState.chapter - 1;
        (book.chapters[c] || []).forEach((text, i) => {
            const block = michnaNode('div', 'tanakh-block michna-block');
            const p = michnaNode('p', 'tanakh-verse michna-mishna');
            p.lang = 'he';
            p.appendChild(michnaNode('span', 'tanakh-num', MichnaCore.hebrewNumber(i + 1)));
            p.appendChild(document.createTextNode(' ' + michnaVow(text)));
            const inMishna = michnaMishnaComms(c, i);
            if (inMishna.length) p.appendChild(michnaBadge(c, i, inMishna));
            const toTalmud = michnaTalmudChip(c, i);
            if (toTalmud) p.appendChild(toTalmud);
            block.appendChild(p);
            michnaCommParagraphs(c, i, inMishna).forEach(x => block.appendChild(x));
            box.appendChild(block);
        });
        if (focused) {
            const again = box.querySelector('[data-badge="' + focused + '"]');
            if (again) again.focus();
        }
        // Venu d'un repère du Talmud : la michna citée défile à l'écran et clignote un instant.
        if (michnaScrollTarget) {
            const target = box.children[michnaScrollTarget];   // le titre est le premier enfant, puis une michna par bloc
            michnaScrollTarget = 0;
            if (target) {
                target.classList.add('is-flash');
                setTimeout(() => target.classList.remove('is-flash'), 1600);
                if (target.scrollIntoView) target.scrollIntoView({ block: 'center', behavior: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
            }
        }
        michnaLoadTalmudRefs();
    }).catch(() => { if (!stale()) msg.textContent = t('tools.torah_error'); });
}

// Ouvre la Michna à une michna précise (depuis un repère du Talmud) : le traité et le chapitre, puis la michna défile à l'écran et clignote un instant.
let michnaScrollTarget = 0;    // la michna (depuis 1) à montrer après l'affichage du chapitre ; 0 : aucune
function michnaOpenAt(id, chapter, mishna, from) {
    michnaScrollTarget = mishna || 0;
    if (michnaIndex) {
        openTool('michna', from);
        michnaOpen(id, chapter);
    } else {
        // L'index n'est pas encore chargé : l'écran lira le choix enregistré à son ouverture.
        michnaLoadPrefs();
        michnaState.id = id;
        michnaState.chapter = chapter;
        michnaState.open = {};
        michnaSavePrefs();
        openTool('michna', from);
    }
}

// Les repères vers le Talmud : où chaque michna est citée dans la Guémara (data/talmud/michna-ref.json et l'index du Talmud), chargés une fois.
let michnaTalmudRefs = null;
let michnaTalmudIndex = null;
function michnaLoadTalmudRefs() {
    if (michnaTalmudRefs || typeof TalmudCore === 'undefined') return;
    Promise.all([
        fetch('data/talmud/michna-ref.json').then(res => { if (!res.ok) throw new Error('ref'); return res.json(); }),
        fetch('data/talmud/index.json').then(res => { if (!res.ok) throw new Error('index'); return res.json(); })
    ]).then(([refs, index]) => { michnaTalmudRefs = refs; michnaTalmudIndex = index; michnaRender(); }).catch(() => { /* pas de repères vers le Talmud */ });
}

// Le bouton « Talmud 2a » d'une michna citée dans la Guémara, ou null.
function michnaTalmudChip(c, i) {
    if (!michnaTalmudRefs || !michnaTalmudIndex) return null;
    const tr = TalmudCore.find(michnaTalmudIndex, michnaState.id);
    const at = tr ? TalmudCore.talmudOfMishna(michnaTalmudRefs, tr, c + 1, i + 1) : null;
    if (!at) return null;
    const btn = michnaNode('button', 'tanakh-comm-badge michna-talmud-chip', t('tools.michna_talmud_chip', { label: at.label }));
    btn.type = 'button';
    btn.setAttribute('aria-label', t('tools.michna_talmud_chip_aria', { label: at.label }));
    btn.onclick = () => {
        if (typeof talmudOpenAt !== 'function') return;
        openTool('talmud', 'screen-tool-michna');
        talmudOpenAt(tr.id, at.label);
    };
    return btn;
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
