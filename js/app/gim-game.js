// =========================================================================
// === « DÉFI GUÉMATRIA » : LE JEU DU CALCUL DES MOTS (onglet « Jouer ») ===
// =========================================================================
// Les règles, le choix des mots et le calcul sont dans js/gimGameCore.js (pur, testé) ; l'écran et son déroulé viennent de js/app/quiz-ui.js (préfixe `gimgame`). Ici : la série et
// le chronomètre facultatif (le « défi » : de quoi additionner à la main, voir GimGameCore.timeFor ; à zéro, la question est comptée fausse), la question selon son type (lettre, mot,
// nombre, même valeur) et la fiche, qui montre le calcul lettre par lettre. Les mots hébreux sont isolés du texte français (FSI/PDI) pour que les nombres ne se déplacent pas.
// Tout ce qui vient des données passe par textContent.

let gimgame = null;
let gimgameReturn = 'screen-main';
let gimgameSection = 'all';
let gimgameTimed = true;

const GIMGAME_PREFS_KEY = 'torahaxe_gimgame_prefs_v1';

function openGimGame(fromScreen) {
    gimgameReturn = fromScreen || 'screen-main';
    showScreen('screen-gimgame', 'forward');
    const raw = QuizUI.loadPrefs(GIMGAME_PREFS_KEY);
    gimgameSection = raw && GimGameCore.SECTIONS.indexOf(raw.section) >= 0 ? raw.section : 'all';
    gimgameTimed = raw ? raw.timed !== false : true;
    document.getElementById('gimgame-timed').checked = gimgameTimed;
    gimgameSetup();
}

function gimgameBack() {
    QuizUI.timerStop();
    gamesBackTo(gimgameReturn);
}

function gimgameSavePrefs() { QuizUI.savePrefs(GIMGAME_PREFS_KEY, { section: gimgameSection, timed: gimgameTimed }); }

function gimgameSetSection(section) {
    if (GimGameCore.SECTIONS.indexOf(section) < 0) return;
    gimgameSection = section;
    gimgameSavePrefs();
    gimgameSetup();
}

function gimgameToggleTimed() {
    gimgameTimed = document.getElementById('gimgame-timed').checked;
    gimgameSavePrefs();
}

function gimgameSetup() {
    QuizUI.timerStop();
    gimgame = null;
    QuizUI.phase('gimgame', 'setup');
    QuizUI.chips('gimgame', GimGameCore.SECTIONS.map(section => ({ id: section, label: t('gimgame.section_' + section) })), gimgameSection, gimgameSetSection);
}

function gimgameStart() {
    gimgame = GimGameCore.createGame({ section: gimgameSection });
    QuizUI.phase('gimgame', 'play');
    gimgameRender();
}

// --- Le déroulé -------------------------------------------------------------------------------------------------------------------------------
// Un mot ou une lettre hébraïque au milieu d'une phrase française : isolé, pour que les nombres voisins restent à leur place.
const gimgameHe = text => '⁨' + text + '⁩';

function gimgameRender() {
    const g = gimgame;
    const q = GimGameCore.question(g);
    QuizUI.status('gimgame', g);
    document.getElementById('gimgame-question').textContent = t('gimgame.ask_' + q.type);
    // L'objet de la question en grand : la lettre, le mot, ou (« lequel vaut ? ») le nombre.
    if (q.type === 'word') QuizUI.word('gimgame', String(q.value), true);
    else QuizUI.word('gimgame', q.type === 'letter' ? q.letter : q.word.he, false);
    const numbers = q.type === 'letter' || q.type === 'value';
    QuizUI.options('gimgame', q, option => (numbers ? { label: option.label, lang: 'num' } : { label: option.label, lang: 'he' }), gimgameAnswer);
    if (gimgameTimed) QuizUI.timerStart('gimgame', GimGameCore.timeFor(q), 'screen-gimgame', gimgameTimeout);
    else QuizUI.timerHide('gimgame');
}

// « ש 300 + ל 30 + ו 6 + ם 40 = 376 » (le calcul standard : une lettre finale vaut comme la lettre ordinaire).
function gimgameSum(he) {
    const b = GimGameCore.breakdown(he);
    return b.parts.map(p => gimgameHe(p.letter) + ' ' + p.value).join(' + ') + ' = ' + b.total;
}

function gimgameLine(he, fr) { return t('gimgame.line_word', { he: gimgameHe(he), fr: fr, calc: gimgameSum(he) }); }

// La fiche : le calcul de la bonne réponse, et ce que valent les autres propositions.
function gimgameInfo(q, timedOut) {
    const lead = timedOut ? t('gimgame.timeout') + ' ' : '';
    const note = t('gimgame.note_standard');
    if (q.type === 'letter') return { line: lead + t('gimgame.line_letter', { letter: gimgameHe(q.letter), name: q.name, value: q.value }), note: note };
    if (q.type === 'value') return { line: lead + gimgameLine(q.word.he, q.word.fr), note: note };
    const right = q.options[q.answer];
    const others = q.options.filter((o, i) => i !== q.answer).map(o => t('gimgame.other', { he: gimgameHe(o.label), value: o.value })).join(' ; ');
    if (q.type === 'word') return { line: lead + gimgameLine(right.label, right.fr), extra: t('gimgame.others', { list: others }), note: note };
    return { line: lead + gimgameLine(q.word.he, q.word.fr) + ' ' + gimgameLine(right.label, right.fr), extra: t('gimgame.others', { list: others }), note: note };
}

function gimgameAnswer(choice) {
    const g = gimgame;
    if (!GimGameCore.answer(g, choice).length) return;
    QuizUI.timerStop();
    QuizUI.timerHide('gimgame');
    QuizUI.resolve('gimgame', g, GimGameCore.question(g), choice, gimgameInfo(GimGameCore.question(g), false));
}

function gimgameTimeout() {
    const g = gimgame;
    QuizUI.timerStop();
    if (!g || !GimGameCore.expire(g).length) return;
    const q = GimGameCore.question(g);
    QuizUI.timerHide('gimgame');
    QuizUI.resolve('gimgame', g, q, -1, gimgameInfo(q, true));
}

function gimgameContinue() {
    const g = gimgame;
    if (!g || !g.resolved) return;
    if (GimGameCore.next(g).includes('done')) { QuizUI.timerStop(); QuizUI.finish('gimgame', g, 'gimgame'); return; }
    gimgameRender();
}
