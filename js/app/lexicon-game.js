// =========================================================================
// === « MOTS DU TANAKH » : LE JEU DE VOCABULAIRE HÉBREU (onglet « Jouer ») ===
// =========================================================================
// Les règles sont dans js/lexiconGameCore.js (pur, testé) ; les mots et leurs niveaux de fréquence dans le dictionnaire (js/lexiconCore.js). L'écran et son
// déroulé (boutons de réponse, fiche, fin de partie) viennent de js/app/quiz-ui.js ; ici : les réglages (niveau, rouleau), le bilan de mémoire et la fiche du mot.
// La transcription n'est jamais montrée. Le jeu se lance depuis l'onglet « Jouer » ou depuis le dictionnaire (`screen-tool-lexicon`) et rend la main à l'écran
// d'où il vient. Tout ce qui vient des données passe par textContent.
// 
// La mémoire : chaque réponse est enregistrée aussitôt (js/memoryStore.js, `lexiconRecord`) dans les boîtes de révision espacée ; à l'ouverture, un bilan
// (« 47 mots sur 107 maîtrisés », les mots à réviser aujourd'hui) ; une partie mêle les mots à réviser et des mots nouveaux (LexiconGameCore.chooseSession).
// Les mots à réviser de tous les jeux se retrouvent aussi dans la séance « À réviser aujourd'hui » (js/app/review.js).
// Les questions se corsent à mesure qu'un mot est su (le mot sans voyelles, « comment dit-on… ? », la racine, la valeur en guématria) ; le niveau « courants »
// est verrouillé jusqu'à 80 % de maîtrise des mots très fréquents. Les réglages (niveau, rouleau) sont propres à l'appareil.

let lexgame = null;
let lexgameReturn = 'screen-main';

function openLexiconGame(fromScreen) {
    lexgameReturn = fromScreen || 'screen-main';
    showScreen('screen-lexgame', 'forward');
    lexgameLoadPrefs();
    lexgameSetup();
}

function lexgameBack() {
    // Le dictionnaire a pu être rouvert depuis la partie (« Voir dans le dictionnaire ») : son « Retour » mène alors à la partie. Quand on quitte la
    // partie, il retrouve son écran d'origine, sinon les deux écrans se renvoient la balle sans jamais revenir au menu.
    if (toolReturns.lexicon === 'screen-lexgame') toolReturns.lexicon = lexgameDictOrigin;
    gamesBackTo(lexgameReturn);
}

// Les réglages de l'appareil : le niveau de fréquence joué (3 très fréquents, 2 courants, 1 rares, 0 absents de la Torah, chacun une fois débloqué) et le mode « rouleau ».
const LEXGAME_PREFS_KEY = 'torahaxe_lexgame_prefs_v1';
let lexgameLevel = 3;
let lexgameScroll = false;

function lexgameLoadPrefs() {
    const raw = QuizUI.loadPrefs(LEXGAME_PREFS_KEY);
    lexgameLevel = LexiconGameCore.clampLevel(raw && raw.level);
    lexgameScroll = !!(raw && raw.scroll);
    // Un niveau verrouillé (progression réinitialisée depuis) n'est pas rejoué.
    if (!LexiconGameCore.unlockInfo(lexiconLoad(), lexgameLevel, Date.now()).unlocked) lexgameLevel = 3;
}

function lexgameSavePrefs() {
    QuizUI.savePrefs(LEXGAME_PREFS_KEY, { level: lexgameLevel, scroll: lexgameScroll });
}

function lexgameSetLevel(level) {
    const lv = LexiconGameCore.clampLevel(level);
    if (!LexiconGameCore.unlockInfo(lexiconLoad(), lv, Date.now()).unlocked) return;
    lexgameLevel = lv;
    lexgameSavePrefs();
    lexgameSetup();
}

function lexgameToggleScroll() {
    lexgameScroll = document.getElementById('lexgame-scroll').checked;
    lexgameSavePrefs();
}

// Le bilan : combien de mots maîtrisés, combien à réviser aujourd'hui, combien de nouveaux.
function lexgameSummary(level) {
    return LexiconGameCore.summary(lexiconLoad(), level || lexgameLevel, Date.now());
}

// Le texte court de progression (« 47 mots sur 107 maîtrisés », « 1 mot sur 107 maîtrisé »), repris par le dictionnaire.
function lexgameProgressLabel(mastered, total) {
    return t(mastered < 2 ? 'lexgame.progress_one' : 'lexgame.progress', { mastered: mastered, total: total });
}

function lexgameProgressText() {
    const s = lexgameSummary(3);
    return lexgameProgressLabel(s.mastered, s.total);
}

// Les mots maîtrisés, pour marquer leur carte dans le dictionnaire (un ensemble de numéros de Strong).
function lexgameMasteredSet() {
    const words = LexiconGameCore.normalizeProgress(lexiconLoad()).words;
    return new Set(Object.keys(words).filter(id => LexiconGameCore.isMastered(words[id])));
}

function lexgameSetup() {
    lexgame = null;
    const s = lexgameSummary();
    QuizUI.phase('lexgame', 'setup');
    QuizUI.progress('lexgame', lexgameProgressLabel(s.mastered, s.total), s.mastered, s.total);
    // Ce que la prochaine partie contiendra vraiment (les mots nouveaux dépendent de la place laissée par les mots à réviser).
    const fresh = LexiconGameCore.chooseSession({ progress: lexiconLoad(), level: lexgameLevel, now: Date.now() }).fresh;
    // Le choix du niveau : chacun reste verrouillé tant que 80 % du niveau précédent ne sont pas maîtrisés ; la note dit ce qui manque au premier verrouillé.
    let note = '';
    LexiconGameCore.LEVELS.forEach(level => {
        const info = LexiconGameCore.unlockInfo(lexiconLoad(), level, Date.now());
        const btn = document.getElementById('lexgame-level-' + level);
        btn.setAttribute('aria-pressed', level === lexgameLevel ? 'true' : 'false');
        btn.disabled = !info.unlocked;
        btn.textContent = (info.unlocked ? '' : '🔒 ') + t('tools.lexicon_level_' + level);
        if (!info.unlocked && !note) note = t('lexgame.level_locked', { level: t('tools.lexicon_level_' + level), prev: t('tools.lexicon_level_' + (level + 1)), have: info.have, need: info.need });
    });
    document.getElementById('lexgame-level-note').textContent = note;
    document.getElementById('lexgame-scroll').checked = lexgameScroll;
    document.getElementById('lexgame-today').textContent = s.due > 0
        ? t('lexgame.today', { due: s.due, fresh: fresh })
        : t(s.unseen > 0 ? 'lexgame.today_none' : 'lexgame.today_done', { fresh: fresh });
}

// Une partie : les mots à réviser aujourd'hui, des mots nouveaux, puis des mots à renforcer (LexiconGameCore.chooseSession).
function lexgameStart() {
    const session = LexiconGameCore.chooseSession({ progress: lexiconLoad(), level: lexgameLevel, now: Date.now() });
    lexgame = LexiconGameCore.createGame({ level: lexgameLevel, wordIds: session.wordIds, types: session.types, scroll: lexgameScroll });
    lexgameMasteredBefore = lexgameSummary().mastered;
    QuizUI.phase('lexgame', 'play');
    lexgameRender();
}
let lexgameMasteredBefore = 0;

// Le texte de la question, selon sa sorte.
function lexgameAsk(q) {
    if (q.type === 'fr-he') return t('lexgame.ask_fr_he');
    if (q.type === 'scroll') return t('lexgame.ask_scroll');
    if (q.type === 'root') return t('lexgame.ask_root');
    if (q.type === 'value') return t('lexgame.ask_value');
    return t('lexgame.ask_he_fr');
}

function lexgameRender() {
    const g = lexgame;
    const q = LexiconGameCore.question(g);
    QuizUI.status('lexgame', g);
    document.getElementById('lexgame-question').textContent = lexgameAsk(q);
    // Le mot hébreu en grand ; pour « comment dit-on… ? », c'est la traduction qui est en grand.
    const french = q.type === 'fr-he';
    QuizUI.word('lexgame', french ? q.prompt : q.shown, french);
    QuizUI.options('lexgame', q, option => ({ label: option.label, lang: option.lang }), lexgameAnswer);
}

// Ce que la fiche ajoute à la traduction, selon la question : la famille de la racine, ou le détail du calcul en guématria.
function lexgameExtra(q) {
    if (q.type === 'root') {
        const words = LexiconCore.family(q.word.root).map(e => e.he + ' (' + e.fr[0] + ')').join(', ');
        return t('lexgame.family', { root: '\u2068' + q.word.root + '\u2069', words: words });
    }
    if (q.type === 'value') {
        const calc = GematriaCore.compute(q.word.he, 'standard');
        return t('lexgame.value_sum', { sum: calc.letters.map(l => l.value).join(' + '), total: calc.total });
    }
    return '';
}

function lexgameAnswer(choice) {
    const g = lexgame;
    if (!LexiconGameCore.answer(g, choice).length) return;
    const q = LexiconGameCore.question(g);
    // Enregistrée aussitôt : une partie quittée en route n'est pas perdue.
    if (!g.multi) lexiconRecord(q.strong, g.resolved === 'right');
    // La fiche du mot : toutes ses traductions, sa remarque ; jamais sa transcription.
    QuizUI.resolve('lexgame', g, q, choice, { line: q.word.he + ' : ' + q.word.fr.join(' ; '), extra: lexgameExtra(q), note: q.word.note });
}

// Du retour à l'écran du dictionnaire, on retrouve la partie en cours : le bouton « Voir dans le dictionnaire » y mène.
// L'écran d'où le dictionnaire a été ouvert avant la partie (ce que son « Retour » doit retrouver au final).
let lexgameDictOrigin = 'screen-tools';

function lexgameOpenDictionary() {
    const g = lexgame;
    const q = g && LexiconGameCore.question(g);
    if (!q) return;
    if (toolReturns.lexicon !== 'screen-lexgame') lexgameDictOrigin = toolReturns.lexicon || 'screen-tools';
    openTool('lexicon', 'screen-lexgame');
    toolLexiconSearch(q.word.key);
}

function lexgameContinue() {
    const g = lexgame;
    if (!g || !g.resolved) return;
    if (LexiconGameCore.next(g).includes('done')) { lexgameFinish(); return; }
    lexgameRender();
}

function lexgameFinish() {
    // Le bilan de la mémoire : les mots maîtrisés, et ce que la partie en a ajouté.
    const s = lexgameSummary();
    const gain = Math.max(0, s.mastered - lexgameMasteredBefore);
    QuizUI.finish('lexgame', lexgame, 'lexicon', lexgameProgressLabel(s.mastered, s.total) + (gain > 0 ? ' ' + t('lexgame.gain', { n: gain }) : ''));
}
