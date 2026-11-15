// =========================================================================
// === DICTIONNAIRE FRANÇAIS – HÉBREU BIBLIQUE (écran de l'Atelier, groupe « Bible et tradition ») ===
// =========================================================================
// On tape un mot français ou hébreu : les entrées correspondantes s'affichent (mot vocalisé, transcription, catégorie, traductions, verset,
// fréquence, racine, valeur en guématria). Un clic sur la racine donne toute sa famille de mots ; un clic sur la valeur ouvre l'outil Guématria
// avec le mot. Sans saisie, tout le dictionnaire s'affiche, du mot le plus fréquent au moins fréquent, par pages de 40 cartes (un millier de
// cartes d'un coup serait lourd). Au-dessus : l'index des 22 lettres, pour feuilleter les mots ou les racines par initiale, et un filtre par
// niveau de fréquence dans la Torah (de 1 à 3 comme la renommée des figures : très fréquent, courant, rare ; seuils dans js/lexiconCore.js). Le
// filtre agit sur la liste complète, les lettres et les recherches ; la famille d'une racine, elle, s'affiche toujours en entier.
// La recherche est dans js/lexiconCore.js, les mots dans js/lexiconData.js, les textes sous `tools.lexicon_*` de ui/fr.json.
// Tout ce qui vient de la saisie passe par textContent, jamais par du HTML.

const LEXICON_PAGE = 40;
let lexiconShown = LEXICON_PAGE;
let lexiconLast = null;

// L'index des lettres : la lettre choisie ('' = aucune) et ce qu'on feuillette, les mots ou les racines.
let lexiconLetter = '';
let lexiconView = 'words';
// Le filtre : 'all', ou le niveau 0 (absent de la Torah), 1 (rare), 2 (courant) ou 3 (très fréquent).
let lexiconLevel = 'all';
// L'index des lettres est replié derrière un bouton (il prend quatre rangées) : il se referme quand on choisit une lettre.
let lexiconIndexOpen = false;

function toolLexiconInit() {
    toolEl('tool-lexicon-input').value = '';
    lexiconLetter = '';
    lexiconView = 'words';
    lexiconLevel = 'all';
    lexiconIndexOpen = false;
    toolLexiconLevelHelp(false);
    toolLexiconUpdate();
}

// Le niveau demandé au cœur de recherche (undefined = tous).
function lexiconWantedLevel() { return lexiconLevel === 'all' ? undefined : lexiconLevel; }

// Ce qu'il faut afficher : les mots de la lettre ouverte, ou le résultat de la recherche (la famille d'une racine n'est jamais filtrée).
function lexiconCompute() {
    const level = lexiconWantedLevel();
    if (lexiconLetter) return { kind: 'letter', letter: lexiconLetter, results: LexiconCore.byInitial(lexiconLetter, level) };
    const found = LexiconCore.search(toolEl('tool-lexicon-input').value);
    if (level !== undefined && found.kind !== 'root') found.results = LexiconCore.filterByLevel(found.results, level);
    return found;
}

function lexiconNWords(n) { return t(n === 1 ? 'tools.lexicon_n_words_one' : 'tools.lexicon_n_words', { n: n }); }
function lexiconNRoots(n) { return t(n === 1 ? 'tools.lexicon_n_roots_one' : 'tools.lexicon_n_roots', { n: n }); }

function lexiconLetterName(letter) {
    const found = GematriaCore.LETTERS.find(l => l.letter === letter);
    return found ? found.name : '';
}

// Les 22 boutons, de droite à gauche (l'alef à droite) : la lettre, et dessous combien de mots (ou de racines) elle ouvre.
function toolLexiconIndexRender() {
    const holder = toolEl('tool-lexicon-index');
    toolClear(holder);
    LexiconCore.initialStats(lexiconWantedLevel()).forEach(stat => {
        const n = lexiconView === 'roots' ? stat.roots : stat.words;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-history-chip lex-letter';
        btn.id = 'tool-lexicon-letter-' + stat.letter.charCodeAt(0).toString(16);
        btn.setAttribute('aria-pressed', stat.letter === lexiconLetter ? 'true' : 'false');
        btn.setAttribute('aria-label', stat.letter + ' (' + lexiconLetterName(stat.letter) + ') : ' + (lexiconView === 'roots' ? lexiconNRoots(n) : lexiconNWords(n)));
        btn.disabled = n === 0 && stat.letter !== lexiconLetter;
        btn.appendChild(lexiconHebrew('strong', stat.letter));
        const count = document.createElement('small');
        count.textContent = String(n);
        btn.appendChild(count);
        btn.onclick = () => toolLexiconLetter(stat.letter);
        holder.appendChild(btn);
    });
    // Le bouton qui plie ou déplie la grille ; fermée, il rappelle la lettre ouverte.
    holder.classList.toggle('hidden', !lexiconIndexOpen);
    toolEl('tool-lexicon-index-btn').setAttribute('aria-expanded', lexiconIndexOpen ? 'true' : 'false');
    toolEl('tool-lexicon-index-btn-label').textContent = lexiconLetter
        ? t('tools.lexicon_index_btn_letter', { letter: '\u2068' + lexiconLetter + '\u2069', name: lexiconLetterName(lexiconLetter) })
        : t('tools.lexicon_index_btn');
    toolEl('tool-lexicon-view').classList.toggle('hidden', !lexiconLetter);
    toolEl('tool-lexicon-view-words').setAttribute('aria-pressed', lexiconView === 'words' ? 'true' : 'false');
    toolEl('tool-lexicon-view-roots').setAttribute('aria-pressed', lexiconView === 'roots' ? 'true' : 'false');
}

function toolLexiconIndexToggle() {
    lexiconIndexOpen = !lexiconIndexOpen;
    toolLexiconIndexRender();
}

// Un clic sur une lettre l'ouvre ; un second clic la referme (retour à la liste complète). La saisie est vidée : on feuillette, on ne cherche plus.
// La grille se replie, pour que les résultats soient visibles aussitôt.
function toolLexiconLetter(letter) {
    lexiconLetter = letter === lexiconLetter ? '' : letter;
    lexiconIndexOpen = false;
    toolEl('tool-lexicon-input').value = '';
    lexiconShown = LEXICON_PAGE;
    lexiconLast = lexiconCompute();
    toolLexiconRender();
    const screen = toolEl('screen-tool-lexicon');
    if (screen) screen.scrollTop = 0;
}

// Les cinq boutons du filtre : toutes, très fréquents, courants, rares, absents de la Torah.
function toolLexiconLevelsRender() {
    const holder = toolEl('tool-lexicon-levels');
    toolClear(holder);
    ['all', 3, 2, 1, 0].forEach(level => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-history-chip';
        btn.id = 'tool-lexicon-level-' + level;
        btn.setAttribute('aria-pressed', level === lexiconLevel ? 'true' : 'false');
        btn.textContent = t('tools.lexicon_level_' + level);
        btn.onclick = () => toolLexiconLevel(level);
        holder.appendChild(btn);
    });
}

// Le bouton « ? » : déplie ou replie la légende des seuils (repliée par défaut, pour laisser la place aux cartes).
function toolLexiconLevelHelp(open) {
    const help = toolEl('tool-lexicon-level-help');
    const show = typeof open === 'boolean' ? open : help.classList.contains('hidden');
    help.classList.toggle('hidden', !show);
    toolEl('tool-lexicon-level-help-btn').setAttribute('aria-expanded', show ? 'true' : 'false');
}

function toolLexiconLevel(level) {
    lexiconLevel = level === lexiconLevel ? 'all' : level;
    lexiconShown = LEXICON_PAGE;
    lexiconLast = lexiconCompute();
    toolLexiconRender();
}

function toolLexiconView(view) {
    lexiconView = view === 'roots' ? 'roots' : 'words';
    lexiconShown = LEXICON_PAGE;
    toolLexiconRender();
}

// (U+2068 / U+2069 isolent le texte hébreu dans une phrase française : sans eux, le « : 4 » qui suit se glisse dans la lecture de droite à gauche.)
// Le nombre de mots, au singulier ou au pluriel.
function lexiconCount(n) { return t(n === 1 ? 'tools.lexicon_count_one' : 'tools.lexicon_count', { n: n }); }

function lexiconHebrew(tag, text, className) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    el.lang = 'he';
    el.dir = 'rtl';
    el.textContent = text;
    return el;
}

// La pastille du niveau de fréquence dans la Torah : trois points (1, 2 ou 3 pleins), toujours avec un libellé écrit. Rien pour un mot absent de la Torah.
function lexiconLevelBadge(level) {
    const badge = document.createElement('span');
    badge.className = 'lex-level lex-level-' + level;
    const pips = document.createElement('span');
    pips.className = 'lex-pips';
    pips.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i++) pips.appendChild(document.createElement('i'));
    badge.appendChild(pips);
    badge.appendChild(document.createTextNode(t('tools.lexicon_badge_' + level)));
    return badge;
}

// Les mots maîtrisés au jeu « Mots essentiels » (un ensemble de numéros de Strong), relevé une fois par affichage.
let lexiconMastered = null;

function lexiconCard(entry) {
    const card = document.createElement('article');
    card.className = 'tool-result lex-card';
    card.id = 'lex-entry-' + entry.id;
    card.dataset.strong = entry.strong;

    const head = document.createElement('div');
    head.className = 'lex-head';
    head.appendChild(lexiconHebrew('strong', entry.he, 'lex-he'));
    const tr = document.createElement('span');
    tr.className = 'lex-tr';
    tr.textContent = entry.tr;
    head.appendChild(tr);
    const pos = document.createElement('span');
    pos.className = 'tool-small lex-pos';
    pos.textContent = entry.pos;
    head.appendChild(pos);
    if (entry.level > 0) head.appendChild(lexiconLevelBadge(entry.level));
    if (lexiconMastered && lexiconMastered.has(entry.strong)) {
        const done = document.createElement('span');
        done.className = 'lex-mastered';
        done.textContent = '✓ ' + t('tools.lexicon_mastered');
        head.appendChild(done);
    }
    card.appendChild(head);

    const fr = document.createElement('p');
    fr.className = 'lex-fr';
    fr.textContent = entry.fr.join(', ');
    card.appendChild(fr);

    if (entry.note) {
        const note = document.createElement('p');
        note.className = 'tool-small';
        note.textContent = entry.note;
        card.appendChild(note);
    }

    const foot = document.createElement('div');
    foot.className = 'lex-foot';
    const ref = document.createElement('span');
    ref.className = 'tool-small';
    ref.textContent = t('tools.lexicon_ref') + ' ' + entry.ref + ' · ' + t(entry.occ === 1 ? 'tools.lexicon_occ_one' : 'tools.lexicon_occ', { n: entry.occ.toLocaleString('fr-FR') })
        + ' (' + (entry.torah > 0 ? t('tools.lexicon_in_torah', { n: entry.torah.toLocaleString('fr-FR') }) : t('tools.lexicon_not_in_torah')) + ')';
    foot.appendChild(ref);

    if (entry.root) {
        const rootBtn = document.createElement('button');
        rootBtn.type = 'button';
        rootBtn.className = 'tool-history-chip lex-chip';
        rootBtn.setAttribute('aria-label', t('tools.lexicon_root_aria', { root: entry.root }));
        rootBtn.appendChild(document.createTextNode(t('tools.lexicon_root') + ' '));
        rootBtn.appendChild(lexiconHebrew('span', entry.root));
        rootBtn.onclick = () => toolLexiconSearch(entry.root);
        foot.appendChild(rootBtn);
    }

    // La valeur du mot en guématria (mode standard) : un clic ouvre l'outil avec ce mot.
    const gem = GematriaCore.compute(entry.he, 'standard').total;
    const gemBtn = document.createElement('button');
    gemBtn.type = 'button';
    gemBtn.className = 'tool-history-chip lex-chip';
    gemBtn.textContent = t('tools.lexicon_gematria', { n: gem });
    gemBtn.onclick = () => toolLexiconToGematria(entry);
    foot.appendChild(gemBtn);

    card.appendChild(foot);
    return card;
}

// Remplit la recherche (par exemple avec une racine) et l'exécute.
function toolLexiconSearch(text) {
    toolEl('tool-lexicon-input').value = text;
    toolLexiconUpdate();
    const screen = toolEl('screen-tool-lexicon');
    if (screen) screen.scrollTop = 0;
}

// L'outil Guématria, avec le mot ; « Retour » ramène au dictionnaire.
function toolLexiconToGematria(entry) {
    openTool('gematria', 'screen-tool-lexicon');
    toolEl('tool-gematria-input').value = entry.he;
    toolGematriaUpdate();
}

function toolLexiconUpdate() {
    lexiconShown = LEXICON_PAGE;
    lexiconLetter = '';
    lexiconLast = lexiconCompute();
    toolLexiconRender();
}

// Les cartes déjà affichées, le message, et le bouton « Afficher la suite » s'il en reste.
function toolLexiconRender() {
    const found = lexiconLast;
    const msg = toolEl('tool-lexicon-msg');
    const list = toolEl('tool-lexicon-list');
    const more = toolEl('tool-lexicon-more');
    toolClear(list);
    // Le bouton « S'entraîner » dit où l'on en est ; les cartes des mots maîtrisés au jeu portent une marque.
    lexiconMastered = typeof lexgameMasteredSet === 'function' ? lexgameMasteredSet() : null;
    if (typeof lexgameProgressText === 'function') toolEl('tool-lexicon-train-progress').textContent = lexgameProgressText();
    toolLexiconLevelsRender();
    toolLexiconIndexRender();
    if (found.kind === 'letter' && lexiconView === 'roots') {
        // Les racines de la lettre : une puce par racine, qui mène à sa famille.
        const groups = LexiconCore.rootsOf(found.letter, lexiconWantedLevel());
        msg.textContent = t(groups.length ? 'tools.lexicon_letter_roots' : 'tools.lexicon_letter_roots_none', { letter: '\u2068' + found.letter + '\u2069', name: lexiconLetterName(found.letter), n: groups.length });
        const chips = document.createElement('div');
        chips.className = 'tool-history-chips lex-roots';
        groups.forEach(group => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'tool-history-chip lex-root-chip';
            chip.setAttribute('aria-label', t('tools.lexicon_root_aria', { root: group.root }) + ' (' + lexiconNWords(group.entries.length) + ')');
            chip.appendChild(lexiconHebrew('strong', group.root));
            const n = document.createElement('small');
            n.textContent = lexiconNWords(group.entries.length);
            chip.appendChild(n);
            chip.onclick = () => toolLexiconSearch(group.root);
            chips.appendChild(chip);
        });
        list.appendChild(chips);
        more.classList.add('hidden');
        return;
    }
    if (found.kind === 'letter') {
        msg.textContent = t('tools.lexicon_letter_words', { letter: '\u2068' + found.letter + '\u2069', name: lexiconLetterName(found.letter), n: found.results.length });
    } else if (found.kind === 'root') {
        msg.textContent = t('tools.lexicon_family', { root: '\u2068' + found.root + '\u2069', n: found.family.length });
    } else if (found.kind === 'all' && lexiconLevel === 'all') {
        msg.textContent = t('tools.lexicon_all', { n: found.results.length });
    } else if (!found.results.length) {
        msg.textContent = t('tools.lexicon_none');
    } else if (found.formHits && found.formHits.length) {
        const n = found.formHits.length;
        msg.textContent = t(n === 1 ? 'tools.lexicon_form_one' : 'tools.lexicon_form_many', { form: '\u2068' + toolEl('tool-lexicon-input').value.trim() + '\u2069', n: n }) + ' ' + lexiconCount(found.results.length);
    } else {
        msg.textContent = lexiconCount(found.results.length);
    }
    found.results.slice(0, lexiconShown).forEach(entry => {
        const card = lexiconCard(entry);
        if (found.formHits && found.formHits.indexOf(entry) !== -1) {
            const tag = document.createElement('p');
            tag.className = 'tool-small';
            tag.textContent = t('tools.lexicon_via_form');
            card.insertBefore(tag, card.querySelector('.lex-foot'));
        }
        list.appendChild(card);
    });
    const left = found.results.length - lexiconShown;
    more.classList.toggle('hidden', left <= 0);
    more.textContent = t('tools.lexicon_more', { n: Math.min(LEXICON_PAGE, Math.max(left, 0)), left: Math.max(left, 0) });
}

function toolLexiconMore() {
    lexiconShown += LEXICON_PAGE;
    toolLexiconRender();
}
