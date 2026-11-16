// =========================================================================
// === GUIDE DES BÉNÉDICTIONS : QUE DIRE SUR QUEL ALIMENT (écran de l'onglet « Explorer ») ===
// =========================================================================
// Une recherche (« banane », « pizza », « bouillon »…) et un filtre par bénédiction (Hamotsi, Mezonot, Haguafen, Haets, Haadama, Chéhakol) sur la liste
// du Guide des bénédictions du Beth Loubavitch, avec ses notes. Au-dessus de la liste, les six textes, qui ouvrent le Siddour (Birkhot haNéhénin).
// Les données sont dans js/benedictionsData.js, la recherche dans js/benedictionsCore.js (testée), les textes de l'écran sous `tools.ben_*` de
// ui/fr.json. Outil d'étude, pas une décision de halakha. Tout passe par textContent, jamais par du HTML.

const BEN_RITE_KEY = 'benediction-rite';
const benState = { b: 'all', query: '', rite: BenedictionsData.DEFAULT_RITE };

// Le rite choisi se garde sur l'appareil (confort, pas une donnée : l'écran fonctionne sans).
function benLoadRite() {
    try {
        const saved = localStorage.getItem(BEN_RITE_KEY);
        if (saved && BenedictionsData.RITES[saved]) return saved;
    } catch (e) { /* stockage indisponible */ }
    return BenedictionsData.DEFAULT_RITE;
}
function benSaveRite(rite) {
    try { localStorage.setItem(BEN_RITE_KEY, rite); } catch (e) { /* stockage indisponible */ }
}

function benNode(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

function benHebrew(tag, text, className) {
    const el = benNode(tag, className, text);
    el.lang = 'he';
    el.dir = 'rtl';
    return el;
}

function toolBenedictionsInit() {
    benState.b = 'all';
    benState.query = '';
    benState.rite = benLoadRite();
    benRender();
}

function benRender() {
    const D = BenedictionsData;
    const body = toolEl('tool-ben-body');
    toolClear(body);

    // Le rite : une bande de trois choix. La colonne des aliments ne change pas ; seule la bénédiction change.
    const rites = benNode('div', 'ben-rites');
    rites.id = 'ben-rites';
    rites.setAttribute('role', 'group');
    rites.setAttribute('aria-label', t('tools.ben_rite_aria'));
    D.RITE_ORDER.forEach(id => {
        const btn = benNode('button', 'ben-rite', D.RITES[id].short);
        btn.type = 'button';
        btn.dataset.rite = id;
        btn.setAttribute('aria-pressed', id === benState.rite ? 'true' : 'false');
        btn.onclick = () => {
            benState.rite = id;
            benSaveRite(id);
            Array.prototype.forEach.call(rites.children, el => el.setAttribute('aria-pressed', el.dataset.rite === id ? 'true' : 'false'));
            benRenderRiteInfo();
            benRenderChips();
            benRenderRows();
        };
        rites.appendChild(btn);
    });
    body.appendChild(rites);
    const info = benNode('p', 'tool-small ben-rite-info', '');
    info.id = 'ben-rite-info';
    body.appendChild(info);
    benRenderRiteInfo();

    // La recherche.
    const search = benNode('label', 'kor-filter kor-search');
    search.appendChild(benNode('span', 'tool-small', t('tools.ben_search')));
    const input = benNode('input', 'tool-input');
    input.type = 'search';
    input.id = 'ben-query';
    input.autocomplete = 'off';
    input.placeholder = t('tools.ben_search_placeholder');
    input.value = benState.query;
    input.oninput = () => { benState.query = input.value; benRenderRows(); };
    search.appendChild(input);
    body.appendChild(search);

    // Le filtre par bénédiction.
    const chips = benNode('div', 'tool-history-chips is-scroll');
    chips.id = 'ben-chips';
    chips.setAttribute('role', 'group');
    chips.setAttribute('aria-label', t('tools.ben_filter_aria'));
    body.appendChild(chips);
    benRenderChips();

    const msg = benNode('p', 'tool-msg', '');
    msg.id = 'ben-msg';
    msg.setAttribute('role', 'status');
    body.appendChild(msg);
    const list = benNode('div', 'kor-list');
    list.id = 'ben-rows';
    body.appendChild(list);

    body.appendChild(benTextsPanel());
    body.appendChild(benSourceCard());
    benRenderRows();
}

function benRenderRiteInfo() {
    const D = BenedictionsData;
    toolEl('ben-rite-info').textContent = D.RITES[benState.rite].desc + ' ' + t(benState.rite === 'habad' ? 'tools.ben_rite_habad_hint' : 'tools.ben_rite_other_hint');
}

// Les puces du filtre : leurs nombres dépendent du rite.
function benRenderChips() {
    const D = BenedictionsData;
    const chips = toolEl('ben-chips');
    toolClear(chips);
    const counts = BenedictionsCore.countByBlessing(benState.rite);
    [{ id: 'all', label: t('tools.ben_all') }].concat(D.ORDER.map(b => ({ id: b, label: BenedictionsCore.label(b) + ' · ' + counts[b] }))).forEach(c => {
        const btn = benNode('button', 'tool-history-chip', c.label);
        btn.type = 'button';
        btn.dataset.b = c.id;
        btn.setAttribute('aria-pressed', c.id === benState.b ? 'true' : 'false');
        btn.onclick = () => {
            benState.b = benState.b === c.id ? 'all' : c.id;
            Array.prototype.forEach.call(chips.children, el => el.setAttribute('aria-pressed', el.dataset.b === benState.b ? 'true' : 'false'));
            benRenderRows();
        };
        chips.appendChild(btn);
    });
}

// Une puce de bénédiction : le nom hébreu et le nom d'usage.
function benTag(b) {
    const D = BenedictionsData;
    const tag = benNode('span', 'kor-tag ben-tag ben-tag-' + b);
    if (D.BLESSINGS[b]) {
        tag.appendChild(benHebrew('span', D.BLESSINGS[b].he, 'ben-tag-he'));
        tag.appendChild(document.createTextNode(' ' + D.BLESSINGS[b].fr));
    } else {
        tag.textContent = D.NONE.fr;
    }
    return tag;
}

function benRenderRows() {
    const D = BenedictionsData;
    const rows = BenedictionsCore.filterFoods(benState);
    const list = toolEl('ben-rows');
    toolClear(list);
    rows.forEach(food => {
        const card = benNode('article', 'tool-result kor-card ben-card');
        card.dataset.row = String(food.id);
        const view = BenedictionsCore.view(food, benState.rite);
        card.classList.toggle('is-diff', view.diff);
        card.appendChild(benNode('strong', 'kor-situation', food.n));
        if (view.steps) {
            const steps = benNode('ol', 'ben-steps');
            view.steps.forEach(s => {
                const li = benNode('li', 'ben-step');
                li.appendChild(benNode('span', 'tool-small', s.t));
                li.appendChild(benTag(s.b));
                steps.appendChild(li);
            });
            card.appendChild(steps);
        } else {
            const tags = benNode('div', 'kor-tags');
            tags.appendChild(benTag(view.b));
            if (view.diff) tags.appendChild(benNode('span', 'kor-tag ben-diff', t('tools.ben_diff', { rite: D.RITES.habad.short })));
            card.appendChild(tags);
            if (view.diff) {
                const was = benNode('p', 'tool-small ben-was');
                was.appendChild(document.createTextNode(t('tools.ben_habad_says', { rite: D.RITES.habad.short }) + ' '));
                was.appendChild(benTag(view.habad));
                card.appendChild(was);
            }
        }
        // La précision du rite choisi (ses écarts ne viennent pas du Beth Loubavitch).
        if (view.note) {
            const box = benNode('div', 'ben-rite-note');
            box.appendChild(benNode('strong', 'tool-small', t('tools.ben_rite_note', { rite: D.RITES[benState.rite].fr })));
            box.appendChild(benNode('p', 'tool-small', view.note));
            card.appendChild(box);
        }
        const notes = BenedictionsCore.notesOf(food);
        if (notes.length) {
            const habad = benState.rite === 'habad';
            const details = benNode('details', 'kor-details ben-notes');
            const key = 'tools.ben_notes_' + (notes.length > 1 ? 'n' : '1') + (habad ? '' : '_habad');
            details.appendChild(benNode('summary', '', t(key, { n: notes.join(', ') })));
            notes.forEach(n => details.appendChild(benNode('p', 'tool-small', (notes.length > 1 ? '(' + n + ') ' : '') + D.NOTES[n])));
            card.appendChild(details);
        }
        list.appendChild(card);
    });
    toolEl('ben-msg').textContent = rows.length ? t('tools.ben_count', { n: rows.length, total: D.FOODS.length }) : t('tools.ben_none');
}

// Les six bénédictions, avec le texte, la phonétique et la traduction ; un bouton ouvre le Siddour.
function benTextsPanel() {
    const D = BenedictionsData;
    const panel = benNode('details', 'kor-details ben-texts');
    panel.id = 'ben-texts';
    panel.appendChild(benNode('summary', '', t('tools.ben_texts_title')));
    ['hamotsi', 'mezonot', 'haguafen', 'haets', 'haadama', 'chehakol'].forEach(b => {
        const def = D.BLESSINGS[b];
        const card = benNode('article', 'tool-result kor-type');
        const head = benNode('div', 'kor-type-head');
        head.appendChild(benHebrew('strong', def.he, 'kor-he kor-he-inline'));
        head.appendChild(benNode('span', 'kor-type-name', def.fr));
        card.appendChild(head);
        card.appendChild(benNode('p', 'tool-small', def.use));
        card.appendChild(benHebrew('p', def.text, 'ben-text-he'));
        card.appendChild(benNode('p', 'tool-small ben-tr', def.tr));
        card.appendChild(benNode('p', 'tool-small', def.trad));
        panel.appendChild(card);
    });
    const open = benNode('button', 'tool-history-chip', t('tools.ben_open_siddur'));
    open.type = 'button';
    open.id = 'ben-open-siddur';
    open.onclick = () => {
        openSiddurSections(['birkhot-hanehenin'], 'Birkhot haNéhénin');
        toolReturns.siddur = 'screen-tool-benedictions';
    };
    panel.appendChild(open);
    return panel;
}

// La source : le Beth Loubavitch, et qui a compilé le guide.
function benSourceCard() {
    const S = BenedictionsData.SOURCE;
    const card = benNode('article', 'tool-result kor-type ben-source');
    card.appendChild(benNode('strong', '', t('tools.ben_source_title')));
    card.appendChild(benNode('p', 'tool-small', t('tools.ben_source_text', { guide: S.guide, by: S.compiledBy, basis: S.basis })));
    const link = benNode('a', 'final-link', S.name + ' · loubavitch.fr');
    link.href = S.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    card.appendChild(link);
    card.appendChild(benNode('p', 'tool-small', t('tools.ben_disclaimer')));
    return card;
}
