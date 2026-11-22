// =========================================================================
// === LECTURES SPÉCIALES (écran de l'onglet Explorer, « Lois et pratique ») ===
// =========================================================================
// Toutes les lectures spéciales de l'année : la Torah, le maftir et la haftara des fêtes, des jeûnes, de Roch 'Hodech, de Hanouca et des Chabbatot spéciaux, selon
// l'usage de la Diaspora. Les références sont celles du Houmach Artscroll, édition Edmond J. Safra ; les montées viennent de Hebcal (data/torah/special-readings.json, construit par
// scripts/build_special_readings.py). Toucher une référence de Torah ou de maftir ouvre une feuille à trois choix : le Tikkoun (le rouleau, js/app/torah-reader.js),
// le Tanakh (le texte, la traduction et les commentaires, js/app/tanakh.js) ou les montées (le texte découpé montée par montée). La haftara n'est qu'un texte.
// Les calculs (étiquettes, numéros de montées) sont dans js/specialReadingsCore.js (testé). Tout passe par textContent, jamais par du HTML.

const SPR_SCREEN = 'screen-tool-readings';
let sprData = null;          // data/torah/special-readings.json, une fois chargé
let sprGroup = 'all';        // la période choisie dans les boutons du haut
let sprSheetEl = null;       // la feuille ouverte
let sprLang = (() => { try { return localStorage.getItem('torahaxe_readings_lang') === 'he' ? 'he' : 'fr'; } catch (e) { return 'fr'; } })();   // « A » (français) ou « א » (mots et références en hébreu)
const SPR_HE_LABELS = { torah: 'תורה', maftir: 'מפטיר', haftara: 'הפטרה', weekTorah: 'פרשת השבוע', weekMaftir: 'מפטיר הפרשה' };

function sprSetLang(lang) {
    sprLang = lang === 'he' ? 'he' : 'fr';
    try { localStorage.setItem('torahaxe_readings_lang', sprLang); } catch (e) { /* sans importance */ }
    if (sprData) sprRender();
}
function sprHeMode() { return sprLang === 'he'; }
// Un mot de l'écran (Torah, Maftir, Haftara…) dans la langue choisie.
function sprWord(key, frText) { return sprHeMode() ? SPR_HE_LABELS[key] : frText; }
const sprBookCache = {};     // data/tanakh/<livre>.json, par numéro de livre (1 à 5)
const SPR_BOOK_IDS = ['genesis', 'exode', 'levitique', 'nombres', 'deuteronome'];

function sprEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

function sprHebrew(tag, text, className) {
    const el = sprEl(tag, className, text);
    el.lang = 'he';
    el.dir = 'rtl';
    return el;
}

function sprLoad() {
    if (sprData) return Promise.resolve(sprData);
    return fetch('data/torah/special-readings.json')
        .then(res => { if (!res.ok) throw new Error('lectures HTTP ' + res.status); return res.json(); })
        .then(data => (sprData = data));
}

function sprLoadBook(n) {
    if (!sprBookCache[n]) {
        sprBookCache[n] = fetch('data/tanakh/' + SPR_BOOK_IDS[n - 1] + '.json')
            .then(res => { if (!res.ok) throw new Error('livre HTTP ' + res.status); return res.json(); })
            .catch(err => { delete sprBookCache[n]; throw err; });
    }
    return sprBookCache[n];
}

// --- L'écran -----------------------------------------------------------------------------------------------------------------------------------
function toolSpecialReadingsInit() {
    sprCloseSheet();
    const msg = toolEl('tool-lect-msg');
    if (sprData) { sprRender(); return; }
    msg.textContent = t('tools.torah_loading');
    sprLoad().then(() => { msg.textContent = ''; sprRender(); })
        .catch(() => { msg.textContent = t('tools.torah_error'); });
}

function sprRender() {
    sprRenderTabs();
    ['fr', 'he'].forEach(l => { const b = toolEl('lect-lang-' + l); if (b) b.setAttribute('aria-pressed', String(sprLang === l)); });
    const body = toolEl('tool-lect-body');
    toolClear(body);
    sprData.groups.forEach(group => {
        if (sprGroup !== 'all' && sprGroup !== group.id) return;
        const items = SpecialReadingsCore.itemsOf(sprData, group.id);
        if (!items.length) return;
        const section = sprEl('section', 'spr-section');
        const title = sprEl('h3', 'spr-group');
        title.appendChild(sprEl('span', '', group.fr));
        title.appendChild(sprHebrew('span', group.he, 'spr-group-he'));
        section.appendChild(title);
        const list = sprEl('div', 'spr-list');
        items.forEach(item => list.appendChild(sprCard(item)));
        section.appendChild(list);
        body.appendChild(section);
    });
    body.appendChild(sprEl('p', 'tool-small spr-source', t('tools.lect_source')));
}

function sprRenderTabs() {
    const box = toolEl('tool-lect-tabs');
    toolClear(box);
    [{ id: 'all', label: t('tools.lect_all') }].concat(sprData.groups.map(g => ({ id: g.id, label: g.short || g.fr }))).forEach(tab => {
        const b = sprEl('button', 'tool-history-chip', tab.label);
        b.type = 'button';
        b.setAttribute('aria-pressed', String(sprGroup === tab.id));
        b.onclick = () => { sprGroup = tab.id; sprRender(); };
        box.appendChild(b);
    });
}

// Une occasion : son nom, puis une ligne pour la Torah, le maftir et la haftara (celles qui n'existent pas ne sont pas affichées).
function sprCard(item) {
    const C = SpecialReadingsCore;
    const card = sprEl('article', 'spr-card');
    const head = sprEl('div', 'spr-card-head');
    head.appendChild(sprEl('h4', 'spr-name', item.fr));
    head.appendChild(sprHebrew('span', item.he, 'spr-he'));
    card.appendChild(head);

    const he = sprHeMode();
    const rangesText = (ranges) => (he ? C.rangesLabelHe(ranges) : C.rangesLabel(ranges));
    const torah = sprEl('div', 'spr-refs');
    if (item.torahText) torah.appendChild(sprText(he ? SPR_HE_LABELS.weekTorah : item.torahText));
    (item.torah || []).forEach((block, i) => torah.appendChild(sprRef(rangesText(block.r), () => sprMenu(item, { kind: 'torah', ranges: block.r, block: i }))));
    sprRow(card, sprWord('torah', t('tools.lect_torah')), torah);

    if (item.maftirText) {
        sprRow(card, sprWord('maftir', t('tools.lect_maftir')), sprText(he ? SPR_HE_LABELS.weekMaftir : item.maftirText));
    } else if (item.maftir && item.maftir.length) {
        const maftir = sprEl('div', item.maftir.length > 1 ? 'spr-options' : 'spr-refs');
        item.maftir.forEach(m => {
            const open = () => sprMenu(item, { kind: 'maftir', ranges: [m.r], label: m.lab });
            if (!m.lab) { maftir.appendChild(sprRef(rangesText([m.r]), open)); return; }
            const line = sprEl('div', 'spr-option');
            const lab = sprEl('span', 'spr-option-lab', he ? sprDayHe(m.lab) : m.lab);
            if (he) { lab.lang = 'he'; lab.dir = 'rtl'; }
            line.appendChild(lab);
            line.appendChild(sprRef(rangesText([m.r]), open));
            maftir.appendChild(line);
        });
        sprRow(card, sprWord('maftir', t('tools.lect_maftir')), maftir);
    }

    if (item.haftara && item.haftara.length) {
        const haftara = sprEl('div', 'spr-refs');
        // Une haftara se lit en chantant, d'une façon propre : elle ne mène qu'au Tanakh.
        haftara.appendChild(sprRef(C.haftaraLabel(item.haftara, he), () => tanakhOpenHaftaraFrom({ refs: C.haftaraRefs(item.haftara), title: item.fr, rite: '' }, SPR_SCREEN), true));
        sprRow(card, sprWord('haftara', t('tools.lect_haftara')), haftara);
    }
    (item.notes || []).forEach(note => card.appendChild(sprEl('p', 'spr-note', note)));
    return card;
}

// « 3e jour » → « יום ג׳ ».
function sprDayHe(label) {
    const m = /^(\d+)(?:er|e) jour$/.exec(label);
    return m ? 'יום ' + SpecialReadingsCore.numeral(+m[1]) + '׳' : label;
}

function sprText(text) {
    const el = sprEl('span', 'spr-text', text);
    if (sprHeMode()) { el.lang = 'he'; el.dir = 'rtl'; }
    return el;
}

function sprRow(card, label, content) {
    const row = sprEl('div', 'spr-row' + (sprHeMode() ? ' is-he' : ''));
    const lab = sprEl('span', 'spr-label', label);
    if (sprHeMode()) { lab.lang = 'he'; lab.dir = 'rtl'; }
    row.appendChild(lab);
    row.appendChild(content);
    card.appendChild(row);
}

// Une référence qu'on peut toucher.
function sprRef(label, onclick, direct) {
    const b = sprEl('button', 'spr-ref', label);
    b.type = 'button';
    if (!direct) b.setAttribute('aria-haspopup', 'dialog');
    if (sprHeMode()) { b.lang = 'he'; b.dir = 'rtl'; b.classList.add('is-he'); }
    b.onclick = onclick;
    return b;
}

// --- Les feuilles ------------------------------------------------------------------------------------------------------------------------------
function sprCloseSheet() {
    if (sprSheetEl && sprSheetEl.parentNode) sprSheetEl.parentNode.removeChild(sprSheetEl);
    sprSheetEl = null;
}

function sprSheet(title, build) {
    sprCloseSheet();
    const scrim = sprEl('div', 'sd-scrim');
    scrim.onclick = (e) => { if (e.target === scrim) sprCloseSheet(); };
    const sheet = sprEl('div', 'sd-sheet');
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', title);
    const head = sprEl('div', 'sd-sheet-head');
    head.appendChild(sprEl('h3', 'sd-sheet-title', title));
    const close = sprEl('button', 'sd-sheet-close', '✕');
    close.type = 'button';
    close.setAttribute('aria-label', 'Fermer');
    close.onclick = sprCloseSheet;
    head.appendChild(close);
    sheet.appendChild(head);
    const content = sprEl('div', 'sd-sheet-body');
    build(content);
    sheet.appendChild(content);
    scrim.appendChild(sheet);
    toolEl(SPR_SCREEN).appendChild(scrim);
    sprSheetEl = scrim;
    close.focus();
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sprSheetEl) sprCloseSheet(); });

// Une ligne du menu : le mot hébreu, le nom, l'explication.
function sprChoice(he, title, desc, onclick) {
    const b = sprEl('button', 'home-row');
    b.type = 'button';
    b.appendChild(sprHebrew('span', he, 'he'));
    const text = sprEl('span');
    text.appendChild(sprEl('span', 'fr', title));
    text.appendChild(sprEl('span', 'desc', desc));
    b.appendChild(text);
    b.appendChild(sprEl('span', 'chev', '›'));
    b.onclick = onclick;
    return b;
}

// Le menu d'une référence : `target` = { kind ('torah' | 'maftir'), ranges, block (indice du bloc de Torah), label (le jour d'un maftir à choisir) }.
function sprMenu(item, target) {
    const C = SpecialReadingsCore;
    const label = C.rangesLabel(target.ranges);
    const first = target.ranges[0];
    sprSheet(label, (body) => {
        const who = item.fr + (target.kind === 'maftir' ? ' · ' + t('tools.lect_maftir') + (target.label ? ' (' + target.label + ')' : '') : '');
        body.appendChild(sprEl('p', 'sd-sheet-note', who));
        const rows = sprEl('div', 'home-rows');
        rows.appendChild(sprChoice('תיקון', t('tools.lect_tikkoun'), t('tools.lect_tikkoun_desc'), () => {
            sprCloseSheet();
            openTikkounAtVerse({ book: first[0], chapter: first[1], verse: first[2] }, SPR_SCREEN);
        }));
        rows.appendChild(sprChoice('תנ״ך', t('tools.lect_tanakh'), t('tools.lect_tanakh_desc'), () => {
            sprCloseSheet();
            tanakhOpenHaftaraFrom({ refs: C.tanakhRefs(target.ranges), title: item.fr + (target.kind === 'maftir' ? ' (' + t('tools.lect_maftir').toLowerCase() + ')' : ''), kind: 'reading' }, SPR_SCREEN);
        }));
        rows.appendChild(sprChoice('עליות', t('tools.lect_aliyot'), t('tools.lect_aliyot_desc'), () => sprAliyot(item, target, false)));
        body.appendChild(rows);
    });
}

// Les montées d'une lecture : [{ title, range }]. Le maftir est une seule montée.
function sprAliyotList(item, target, shabbat) {
    const C = SpecialReadingsCore;
    if (target.kind === 'maftir') return [{ title: t('tools.lect_maftir'), range: target.ranges[0] }];
    const block = item.torah[target.block];
    return C.aliyot(block, shabbat, C.baseOf(item, target.block, shabbat)).map(a => ({
        title: block.lab || (a.n === 1 ? '1re' : a.n + 'e') + ' ' + t('tools.lect_aliyah') + (a.n <= 3 ? ' · ' + a.name : '') + (a.repeat ? ' ' + t('tools.lect_repeat') : ''),
        range: a.range
    }));
}

function sprAliyot(item, target, shabbat) {
    const C = SpecialReadingsCore;
    const block = target.kind === 'torah' ? item.torah[target.block] : null;
    const canShabbat = !!(block && block.s);
    sprSheet(t('tools.lect_aliyot') + ' · ' + C.rangesLabel(target.ranges), (body) => {
        body.appendChild(sprEl('p', 'sd-sheet-note', item.fr));
        if (canShabbat) {
            const switcher = sprEl('div', 'tool-history-chips');
            switcher.setAttribute('role', 'group');
            [[false, 'lect_weekday'], [true, 'lect_shabbat']].forEach(([value, key]) => {
                const n = sprAliyotList(item, target, value).length;
                const b = sprEl('button', 'tool-history-chip', t('tools.' + key, { n: n }));
                b.type = 'button';
                b.setAttribute('aria-pressed', String(value === shabbat));
                b.onclick = () => sprAliyot(item, target, value);
                switcher.appendChild(b);
            });
            body.appendChild(switcher);
        }
        const text = sprEl('div', 'sd-reading-text spr-aliyot');
        text.lang = 'he';
        text.dir = 'rtl';
        body.appendChild(text);
        const list = sprAliyotList(item, target, shabbat);
        const books = Array.from(new Set(list.map(a => a.range[0])));
        const note = sprEl('p', 'sd-ix-note', t('tools.lect_aliyot_source'));
        const loading = sprEl('p', 'tool-small', t('tools.sd_loading'));
        body.appendChild(loading);
        Promise.all(books.map(sprLoadBook)).then(loaded => {
            if (!loading.parentNode) return;    // la feuille a été fermée ou remplacée entre-temps
            const byBook = {};
            books.forEach((n, i) => { byBook[n] = loaded[i]; });
            body.removeChild(loading);
            list.forEach(a => text.appendChild(sprAliyahNode(a, byBook[a.range[0]])));
            body.appendChild(note);
        }).catch(() => { loading.textContent = t('tools.torah_error'); });
    });
}

// Le verset tel qu'on le lit : le qere, avec les voyelles mais sans les signes de cantillation ; les marques de paragraphe (פ) et (ס) sont retirées.
function sprVerse(verse) {
    return TorahCore.stripMarks(TorahCore.ketivText(verse).replace(/[{}]/g, '').replace(/\s*\([פס]\)\s*$/, ''), 'vowels');
}

function sprAliyahNode(a, book) {
    const C = SpecialReadingsCore;
    const box = sprEl('section', 'spr-aliyah');
    const head = sprEl('header', 'spr-aliyah-head');
    head.appendChild(sprEl('strong', '', a.title));
    const ref = sprEl('span', 'spr-aliyah-ref', C.refLabel(a.range));
    ref.lang = 'fr';
    ref.dir = 'ltr';
    head.appendChild(ref);
    box.appendChild(head);
    const p = sprEl('p', 'sd-reading-aliya');
    const lengths = book.chapters.map(ch => ch.length);
    C.segments(a.range, SPR_BOOK_IDS.map((_, i) => (i === a.range[0] - 1 ? lengths : []))).forEach(seg => {
        const ch = book.chapters[seg.c - 1] || [];
        for (let v = seg.from; v <= seg.to; v++) if (ch[v - 1]) p.appendChild(document.createTextNode(sprVerse(ch[v - 1]) + ' '));
    });
    box.appendChild(p);
    return box;
}
