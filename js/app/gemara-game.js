// =========================================================================
// === « MOTS DE LA GUÉMARA » : LE JEU D'ENTRAÎNEMENT (onglet « Jouer ») ===
// =========================================================================
// Les règles sont dans js/gemaraGameCore.js (pur, testé) ; le contenu dans le dictionnaire araméen (js/gemaraCore.js : mots, abréviations, sages). L'écran et son
// déroulé viennent de js/app/quiz-ui.js ; ici : le choix de la section, le bilan de mémoire et la fiche de la carte. Le jeu se lance depuis l'onglet « Jouer » ou
// depuis le dictionnaire araméen (`screen-tool-gemara`) et rend la main à l'écran d'où il vient. Tout ce qui vient des données passe par textContent.
// 
// La mémoire : chaque réponse est enregistrée aussitôt (js/memoryStore.js, `gemaraRecord`) dans les boîtes de révision espacée ; à l'ouverture, un bilan
// (« 12 cartes sur 108 maîtrisées »…) ; une partie mêle les cartes à réviser et des cartes nouvelles (GemaraGameCore.chooseSession). Les cartes à réviser
// se retrouvent aussi dans la séance « À réviser aujourd'hui » (js/app/review.js). On choisit la section jouée : tout, les mots, les abréviations ou les sages.

let gemgame = null;
let gemgameReturn = 'screen-main';
let gemgameSection = 'all';
let gemgameMasteredBefore = 0;

// Le réglage de l'appareil (la section jouée) : cette clé n'était jusqu'ici définie nulle part, donc le choix n'était jamais retenu.
const GEMARA_PREFS_KEY = 'torahaxe_gemgame_prefs_v1';

const GEMGAME_SECTION_KEYS = { all: 'section_all', words: 'section_words', abbr: 'section_abbr', sages: 'section_sages' };

function openGemaraGame(fromScreen) {
    gemgameReturn = fromScreen || 'screen-main';
    showScreen('screen-gemgame', 'forward');
    gemgameLoadPrefs();
    gemgameSetup();
}

function gemgameBack() {
    gamesBackTo(gemgameReturn);
}

// Le réglage de l'appareil : la section jouée.
function gemgameLoadPrefs() {
    const raw = QuizUI.loadPrefs(GEMARA_PREFS_KEY);
    gemgameSection = raw && GemaraGameCore.SECTIONS.indexOf(raw.section) >= 0 ? raw.section : 'all';
}

function gemgameSavePrefs() {
    QuizUI.savePrefs(GEMARA_PREFS_KEY, { section: gemgameSection });
}

function gemgameSetSection(section) {
    if (GemaraGameCore.SECTIONS.indexOf(section) < 0) return;
    gemgameSection = section;
    gemgameSavePrefs();
    gemgameSetup();
}

// Le bilan : combien de cartes maîtrisées, combien à réviser aujourd'hui, combien de nouvelles.
function gemgameSummary(section) {
    return GemaraGameCore.summary(gemaraLoad(), section || gemgameSection, Date.now());
}

// Le texte court de progression (« 12 cartes sur 108 maîtrisées », « 1 carte sur 108 maîtrisée »), repris par le dictionnaire.
function gemgameProgressLabel(mastered, total) {
    return t(mastered < 2 ? 'gemgame.progress_one' : 'gemgame.progress', { mastered: mastered, total: total });
}

function gemgameProgressText() {
    const s = gemgameSummary('all');
    return gemgameProgressLabel(s.mastered, s.total);
}

// Les cartes maîtrisées, pour marquer leur fiche dans le dictionnaire (un ensemble d'identifiants : « w:… », « a:… », « s:… »).
function gemgameMasteredSet() {
    const cards = GemaraGameCore.normalizeProgress(gemaraLoad()).cards;
    return new Set(Object.keys(cards).filter(id => GemaraGameCore.isMastered(cards[id])));
}

function gemgameSetup() {
    gemgame = null;
    const s = gemgameSummary();
    QuizUI.phase('gemgame', 'setup');
    QuizUI.progress('gemgame', gemgameProgressLabel(s.mastered, s.total), s.mastered, s.total);
    // Ce que la prochaine partie contiendra vraiment (les cartes nouvelles dépendent de la place laissée par les cartes à réviser).
    const fresh = GemaraGameCore.chooseSession({ progress: gemaraLoad(), section: gemgameSection, now: Date.now() }).fresh;
    // Le choix de la section : tout, les mots, les abréviations ou les sages, avec leur effectif.
    QuizUI.chips('gemgame', GemaraGameCore.SECTIONS.map(section => ({
        id: section, label: t('gemgame.' + GEMGAME_SECTION_KEYS[section]) + ' (' + GemaraGameCore.cards(section).length + ')'
    })), gemgameSection, gemgameSetSection);
    document.getElementById('gemgame-today').textContent = s.due > 0
        ? t('gemgame.today', { due: s.due, fresh: fresh })
        : t(s.unseen > 0 ? 'gemgame.today_none' : 'gemgame.today_done', { fresh: fresh });
}

// Une partie : les cartes à réviser aujourd'hui, des cartes nouvelles, puis des cartes à renforcer (GemaraGameCore.chooseSession).
function gemgameStart() {
    const session = GemaraGameCore.chooseSession({ progress: gemaraLoad(), section: gemgameSection, now: Date.now() });
    gemgame = GemaraGameCore.createGame({ section: gemgameSection, cardIds: session.cardIds, types: session.types });
    gemgameMasteredBefore = gemgameSummary().mastered;
    QuizUI.phase('gemgame', 'play');
    gemgameRender();
}

// Le texte de la question, selon sa sorte.
function gemgameAsk(q) {
    return t('gemgame.ask_' + q.type.replace('-', '_'));
}

// Le libellé d'une proposition : une traduction ou un mot tels quels, ou (époque d'un sage) le nom du groupe.
function gemgameOptionLabel(option) {
    return option.lang === 'grp' ? t('tools.gemara_grp_' + option.label) : option.label;
}

function gemgameRender() {
    const g = gemgame;
    const q = GemaraGameCore.question(g);
    QuizUI.status('gemgame', g);
    document.getElementById('gemgame-question').textContent = gemgameAsk(q);
    // Le mot, le sigle ou le nom hébreu en grand ; pour les questions « en français », c'est la traduction ou le nom français.
    QuizUI.word('gemgame', q.shown, q.shownLang === 'fr');
    QuizUI.options('gemgame', q, option => ({ label: gemgameOptionLabel(option), lang: option.lang }), gemgameAnswer);
}

// Les mots hébreux ou araméens, isolés dans une phrase française (sans quoi le « : » qui suit se glisse dans la lecture de droite à gauche).
function gemgameIsolate(text) { return '⁨' + text + '⁩'; }

// La fiche de la carte après la réponse : une ligne, et une remarque (celle du dictionnaire, ou la biographie d'un sage).
function gemgameCardInfo(card) {
    const r = card.ref;
    if (card.kind === 'w') return { line: gemgameIsolate(r.he) + ' : ' + r.fr.join(' ; '), note: r.note || '' };
    if (card.kind === 'a') return { line: gemgameIsolate(r.sigle) + ' = ' + gemgameIsolate(r.full) + ' : ' + r.fr.join(' ; '), note: r.note || '' };
    return { line: gemgameIsolate(r.he) + ' : ' + r.name + ' — ' + t('tools.gemara_grp_' + r.grp) + ', ' + r.period, note: r.bio };
}

function gemgameAnswer(choice) {
    const g = gemgame;
    if (!GemaraGameCore.answer(g, choice).length) return;
    const q = GemaraGameCore.question(g);
    // Enregistrée aussitôt : une partie quittée en route n'est pas perdue.
    if (!g.multi) gemaraRecord(q.id, g.resolved === 'right');
    QuizUI.resolve('gemgame', g, q, choice, gemgameCardInfo(q.card));
}

// Du retour à l'écran du dictionnaire, on retrouve la partie en cours : le bouton « Voir dans le dictionnaire » y mène, sur le bon onglet.
function gemgameOpenDictionary() {
    const g = gemgame;
    const q = g && GemaraGameCore.question(g);
    if (!q) return;
    const card = q.card;
    openTool('gemara', 'screen-gemgame');
    if (card.kind === 'a') toolGemaraShow('abbr', card.ref.sigle);
    else if (card.kind === 's') toolGemaraShow('sages', card.ref.name);
    else toolGemaraShow('words', card.ref.he);
}

function gemgameContinue() {
    const g = gemgame;
    if (!g || !g.resolved) return;
    if (GemaraGameCore.next(g).includes('done')) { gemgameFinish(); return; }
    gemgameRender();
}

function gemgameFinish() {
    // Le bilan de la mémoire : les cartes maîtrisées, et ce que la partie en a ajouté.
    const s = gemgameSummary();
    const gain = Math.max(0, s.mastered - gemgameMasteredBefore);
    QuizUI.finish('gemgame', gemgame, 'gemara', gemgameProgressLabel(s.mastered, s.total) + (gain > 0 ? ' ' + t('gemgame.gain', { n: gain }) : ''));
}
