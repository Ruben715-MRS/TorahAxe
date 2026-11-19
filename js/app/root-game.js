// =========================================================================
// === « FAMILLES DE RACINES » : LE JEU DES RACINES HÉBRAÏQUES (onglet « Jouer ») ===
// =========================================================================
// Les règles et les familles sont dans js/rootGameCore.js (pur, testé : vingt et une racines régulières, mot par mot, tirées du dictionnaire) ; l'écran et son déroulé viennent de
// js/app/quiz-ui.js (préfixe `rootgame`). Ici : la série jouée, la question selon son type (intrus, « lequel vient de la racine ? », « quelle est la racine ? ») et la fiche, qui montre
// toute la famille de la racine avec la traduction de chaque mot. Les mots hébreux sont isolés du texte français (FSI/PDI). Pas de chrono. Tout ce qui vient des données passe par
// textContent.

let rootgame = null;
let rootgameReturn = 'screen-main';
let rootgameSection = 'all';

const ROOTGAME_PREFS_KEY = 'torahaxe_rootgame_prefs_v1';

function openRootGame(fromScreen) {
    rootgameReturn = fromScreen || 'screen-main';
    showScreen('screen-rootgame', 'forward');
    const raw = QuizUI.loadPrefs(ROOTGAME_PREFS_KEY);
    rootgameSection = raw && RootGameCore.SECTIONS.indexOf(raw.section) >= 0 ? raw.section : 'all';
    rootgameSetup();
}

function rootgameBack() { gamesBackTo(rootgameReturn); }

function rootgameSetSection(section) {
    if (RootGameCore.SECTIONS.indexOf(section) < 0) return;
    rootgameSection = section;
    QuizUI.savePrefs(ROOTGAME_PREFS_KEY, { section: rootgameSection });
    rootgameSetup();
}

function rootgameSetup() {
    rootgame = null;
    QuizUI.phase('rootgame', 'setup');
    QuizUI.chips('rootgame', RootGameCore.SECTIONS.map(section => ({ id: section, label: t('rootgame.section_' + section) })), rootgameSection, rootgameSetSection);
}

function rootgameStart() {
    rootgame = RootGameCore.createGame({ section: rootgameSection });
    QuizUI.phase('rootgame', 'play');
    rootgameRender();
}

// --- Le déroulé -------------------------------------------------------------------------------------------------------------------------------
const rootgameHe = text => '⁨' + text + '⁩';

function rootgameRender() {
    const g = rootgame;
    const q = RootGameCore.question(g);
    QuizUI.status('rootgame', g);
    document.getElementById('rootgame-question').textContent = t('rootgame.ask_' + q.type);
    // L'objet de la question en grand : la racine (« lequel vient de ? »), le mot (« quelle racine ? »), rien pour l'intrus.
    QuizUI.word('rootgame', q.type === 'family' ? RootGameCore.rootShown(q.root) : q.type === 'root' ? q.word.he : '', false);
    QuizUI.options('rootgame', q, option => ({ label: option.label, lang: 'he' }), rootgameAnswer);
}

// « קֹדֶשׁ (sainteté) ; קָדַשׁ (être saint) ; … » : toute la famille d'une racine.
function rootgameFamily(r) {
    return RootGameCore.family(r).map(w => rootgameHe(w.he) + ' (' + w.fr + ')').join(' ; ');
}

// La fiche : la bonne réponse, puis la famille de la racine.
function rootgameInfo(q) {
    const root = rootgameHe(RootGameCore.rootShown(q.root));
    const note = t('rootgame.note');
    if (q.type === 'root') return { line: t('rootgame.line_root', { he: rootgameHe(q.word.he), fr: q.word.fr, root: root }), extra: t('rootgame.family', { root: root, list: rootgameFamily(q.root) }), note: note };
    if (q.type === 'family') return { line: t('rootgame.line_family', { he: rootgameHe(q.word.he), fr: q.word.fr, root: root }), extra: t('rootgame.family', { root: root, list: rootgameFamily(q.root) }), note: note };
    const own = rootgameHe(RootGameCore.rootShown(q.intruder.root));
    return {
        line: t('rootgame.line_intruder', { he: rootgameHe(q.intruder.he), fr: q.intruder.fr, own: own, root: root }),
        extra: t('rootgame.family', { root: root, list: rootgameFamily(q.root) }),
        note: note
    };
}

function rootgameAnswer(choice) {
    const g = rootgame;
    if (!RootGameCore.answer(g, choice).length) return;
    QuizUI.resolve('rootgame', g, RootGameCore.question(g), choice, rootgameInfo(RootGameCore.question(g)));
}

function rootgameContinue() {
    const g = rootgame;
    if (!g || !g.resolved) return;
    if (RootGameCore.next(g).includes('done')) { QuizUI.finish('rootgame', g, 'rootgame'); return; }
    rootgameRender();
}
