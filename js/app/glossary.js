// =========================================================================
// === GLOSSAIRE DE LA VIE JUIVE (écran de l'Atelier, groupe « Autour des textes ») ===
// =========================================================================
// On tape un mot (sous n'importe quelle écriture : « shabbat », « shabbos », « Chabbat »), en hébreu ou un mot de la définition ; les entrées
// correspondantes s'affichent : le mot en hébreu, sa transcription, sa catégorie, sa définition, ses autres écritures, les mots voisins (un clic
// les ouvre) et, quand l'app a un écran qui s'y rapporte, un bouton pour l'ouvrir. Au-dessus : un filtre par catégorie (liste déroulante) et l'index alphabétique,
// replié derrière un bouton. Sans saisie, tout le glossaire s'affiche, par ordre alphabétique, par pages de 50 cartes.
// La recherche est dans js/glossaryCore.js, les mots dans js/glossaryData.js, les libellés sous `tools.glossary_*` de ui/fr.json.
// Tout ce qui vient de la saisie passe par textContent, jamais par du HTML.

const GLOSSARY_PAGE = 50;
let glossaryShown = GLOSSARY_PAGE;
let glossaryCat = 'all';
let glossaryLetter = '';
let glossaryIndexOpen = false;

function toolGlossaryInit() {
    toolEl('tool-glossary-input').value = '';
    glossaryCat = 'all';
    glossaryLetter = '';
    glossaryIndexOpen = false;
    toolGlossaryUpdate();
}

function glossaryEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

// Les entrées à montrer : une initiale choisie, sinon le résultat de la recherche dans la catégorie.
function glossaryCompute() {
    if (glossaryLetter) return GlossaryCore.byInitial(glossaryLetter, glossaryCat);
    return GlossaryCore.search(toolEl('tool-glossary-input').value, glossaryCat);
}

function toolGlossaryUpdate() {
    // Taper dans la recherche quitte l'initiale : la saisie prend la main.
    glossaryLetter = '';
    glossaryShown = GLOSSARY_PAGE;
    toolGlossaryRender();
}

function toolGlossaryCat(id) {
    glossaryCat = id;
    glossaryLetter = '';
    glossaryShown = GLOSSARY_PAGE;
    toolGlossaryRender();
}

function toolGlossaryIndexToggle() {
    glossaryIndexOpen = !glossaryIndexOpen;
    toolGlossaryRender();
}

function toolGlossaryLetter(letter) {
    glossaryLetter = letter === glossaryLetter ? '' : letter;
    glossaryIndexOpen = false;
    glossaryShown = GLOSSARY_PAGE;
    toolEl('tool-glossary-input').value = '';
    toolGlossaryRender();
}

function toolGlossaryMore() {
    glossaryShown += GLOSSARY_PAGE;
    toolGlossaryRender();
}

// Ouvre un mot voisin : on le cherche par son nom, dans toutes les catégories. Il arrive en tête.
function toolGlossaryOpenWord(id) {
    const entry = GlossaryCore.get(id);
    if (!entry) return;
    glossaryCat = 'all';
    glossaryLetter = '';
    glossaryShown = GLOSSARY_PAGE;
    toolEl('tool-glossary-input').value = entry.tr;
    toolGlossaryRender();
    const screen = toolEl('screen-tool-glossary');
    if (screen) screen.scrollTop = 0;
}

// Ouvre l'écran de l'app qui se rapporte au mot ; « Retour » ramène au glossaire. Pour « Commandements », un onglet précis peut être demandé.
function toolGlossaryGo(go) {
    const target = GlossaryCore.parseGo(go);
    if (!target) return;
    openTool(target.tool, 'screen-tool-glossary');
    if (target.tool === 'commandments' && target.tab && typeof toolCommandmentsPick === 'function') toolCommandmentsPick(target.tab);
}

function glossaryCard(entry) {
    const card = glossaryEl('article', 'tool-result lex-card');
    card.id = 'glo-entry-' + entry.id;

    const head = glossaryEl('div', 'lex-head');
    const he = glossaryEl('strong', 'lex-he', entry.he);
    he.lang = 'he';
    he.dir = 'rtl';
    head.appendChild(he);
    head.appendChild(glossaryEl('span', 'lex-tr', entry.tr));
    head.appendChild(glossaryEl('span', 'glo-cat', t('tools.glossary_cat_' + entry.cat)));
    card.appendChild(head);

    card.appendChild(glossaryEl('p', 'lex-bio', entry.fr));

    if (entry.alias.length) {
        card.appendChild(glossaryEl('p', 'tool-small glo-aliases', t('tools.glossary_aliases') + ' ' + entry.alias.join(', ')));
    }

    // Les mots voisins : ceux que l'entrée cite, un clic les ouvre.
    const related = GlossaryCore.related(entry.id);
    if (related.length) {
        const rel = glossaryEl('div', 'glo-rel');
        rel.appendChild(glossaryEl('span', 'tool-small', t('tools.glossary_see')));
        related.forEach(other => {
            const chip = glossaryEl('button', 'tool-history-chip lex-chip', other.tr);
            chip.type = 'button';
            chip.setAttribute('aria-label', t('tools.glossary_see_aria', { word: other.tr }));
            chip.onclick = () => toolGlossaryOpenWord(other.id);
            rel.appendChild(chip);
        });
        card.appendChild(rel);
    }

    if (entry.go) {
        const btn = glossaryEl('button', 'tool-history-chip lex-chip glo-go');
        btn.type = 'button';
        btn.textContent = t('tools.glossary_go') + ' ' + t('tools.' + GlossaryCore.goLabelKey(entry.go)) + ' ›';
        btn.onclick = () => toolGlossaryGo(entry.go);
        card.appendChild(btn);
    }
    return card;
}

function toolGlossaryRender() {
    // Les catégories : « Tout » puis les dix, avec le nombre de mots de chacune, dans une liste déroulante (des puces prendraient six rangées).
    const cats = toolEl('tool-glossary-cats');
    toolClear(cats);
    ['all'].concat(GlossaryCore.CATEGORIES).forEach(id => {
        const option = glossaryEl('option', '', t('tools.glossary_cat_' + id) + ' (' + GlossaryCore.list(id).length + ')');
        option.value = id;
        option.selected = id === glossaryCat;
        cats.appendChild(option);
    });

    // L'index alphabétique, replié derrière son bouton.
    const indexBtn = toolEl('tool-glossary-index-btn');
    indexBtn.setAttribute('aria-expanded', glossaryIndexOpen ? 'true' : 'false');
    toolEl('tool-glossary-index-btn-label').textContent = glossaryLetter
        ? t('tools.glossary_index_btn_letter', { letter: glossaryLetter }) : t('tools.glossary_index_btn');
    const index = toolEl('tool-glossary-index');
    index.classList.toggle('hidden', !glossaryIndexOpen);
    toolClear(index);
    if (glossaryIndexOpen) {
        GlossaryCore.initials(glossaryCat).forEach(stat => {
            const btn = glossaryEl('button', 'tool-history-chip lex-letter');
            btn.type = 'button';
            btn.setAttribute('aria-pressed', stat.letter === glossaryLetter ? 'true' : 'false');
            btn.appendChild(glossaryEl('strong', '', stat.letter));
            btn.appendChild(glossaryEl('small', '', String(stat.n)));
            btn.onclick = () => toolGlossaryLetter(stat.letter);
            index.appendChild(btn);
        });
    }

    const found = glossaryCompute();
    const query = toolEl('tool-glossary-input').value.trim();
    const msg = toolEl('tool-glossary-msg');
    if (!found.length) msg.textContent = t('tools.glossary_none');
    else if (query || glossaryLetter) msg.textContent = t(found.length === 1 ? 'tools.glossary_count_one' : 'tools.glossary_count', { n: found.length });
    else msg.textContent = t(glossaryCat === 'all' ? 'tools.glossary_all' : 'tools.glossary_all_cat', { n: found.length });

    const list = toolEl('tool-glossary-list');
    toolClear(list);
    found.slice(0, glossaryShown).forEach(entry => list.appendChild(glossaryCard(entry)));

    const more = toolEl('tool-glossary-more');
    const left = found.length - glossaryShown;
    more.classList.toggle('hidden', left <= 0);
    if (left > 0) more.textContent = t('tools.glossary_more', { n: Math.min(GLOSSARY_PAGE, left), left: left });
}
