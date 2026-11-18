// =========================================================================
// === « QUELLE BÉNÉDICTION ? » : LE JEU DES BÉNÉDICTIONS (onglet « Jouer ») ===
// =========================================================================
// Les règles et la liste des aliments posés sont dans js/blessGameCore.js (pur, testé) ; les noms, le texte hébreu et la règle de chaque bénédiction viennent du guide
// (js/benedictionsData.js, déjà chargé). L'écran et son déroulé viennent de js/app/quiz-ui.js (préfixe `blessgame`) : ici, la série jouée, la question selon son type (aliment
// montré, bénédiction montrée, intrus) et la fiche qui rappelle la règle. Pas de chrono, pas de répétition espacée : les aliments sont tirés au hasard. Tout ce qui vient des
// données passe par textContent.

let blessgame = null;
let blessgameReturn = 'screen-main';
let blessgameSection = 'all';

const BLESSGAME_PREFS_KEY = 'torahaxe_blessgame_prefs_v1';

function openBlessGame(fromScreen) {
    blessgameReturn = fromScreen || 'screen-main';
    showScreen('screen-blessgame', 'forward');
    const raw = QuizUI.loadPrefs(BLESSGAME_PREFS_KEY);
    blessgameSection = raw && BlessGameCore.SECTIONS.indexOf(raw.section) >= 0 ? raw.section : 'all';
    blessgameSetup();
}

function blessgameBack() { gamesBackTo(blessgameReturn); }

function blessgameSetSection(section) {
    if (BlessGameCore.SECTIONS.indexOf(section) < 0) return;
    blessgameSection = section;
    QuizUI.savePrefs(BLESSGAME_PREFS_KEY, { section: blessgameSection });
    blessgameSetup();
}

function blessgameSetup() {
    blessgame = null;
    QuizUI.phase('blessgame', 'setup');
    QuizUI.chips('blessgame', BlessGameCore.SECTIONS.map(section => ({ id: section, label: t('blessgame.section_' + section) })), blessgameSection, blessgameSetSection);
}

function blessgameStart() {
    blessgame = BlessGameCore.createGame({ section: blessgameSection });
    QuizUI.phase('blessgame', 'play');
    blessgameRender();
}

// --- Le déroulé -------------------------------------------------------------------------------------------------------------------------------
function blessgameRender() {
    const g = blessgame;
    const q = BlessGameCore.question(g);
    QuizUI.status('blessgame', g);
    document.getElementById('blessgame-question').textContent = t('blessgame.ask_' + q.type);
    // L'aliment (ou, pour « Quel aliment ? », la bénédiction demandée) en grand ; l'intrus n'a rien à montrer.
    QuizUI.word('blessgame', q.type === 'blessing' ? q.food.shown : q.type === 'food' ? q.fr : '', true);
    document.getElementById('blessgame-he').textContent = q.type === 'food' ? q.he : '';
    QuizUI.options('blessgame', q, option => (option.kind === 'blessing' ? { label: option.label, he: option.he } : { label: option.label }), blessgameAnswer);
}

// Le nom d'une bénédiction (celui du guide).
const blessgameName = b => BenedictionsData.BLESSINGS[b].fr;

// La fiche : la bonne réponse, ce que valent les autres aliments, et la règle de la bénédiction.
function blessgameInfo(q) {
    const rule = BenedictionsData.BLESSINGS[q.blessing].use;
    if (q.type === 'blessing') return { line: t('blessgame.line_blessing', { food: q.food.shown, name: q.fr, he: q.he }), note: rule };
    if (q.type === 'food') {
        const others = q.options.filter((o, i) => i !== q.answer).map(o => t('blessgame.other', { food: o.label, name: blessgameName(o.b) })).join(' ; ');
        return { line: t('blessgame.line_food', { food: q.food.shown, name: q.fr }), extra: t('blessgame.others', { list: others }), note: rule };
    }
    return { line: t('blessgame.line_odd', { food: q.food.shown, own: blessgameName(q.intruderBlessing), name: q.fr }), note: rule };
}

function blessgameAnswer(choice) {
    const g = blessgame;
    if (!BlessGameCore.answer(g, choice).length) return;
    QuizUI.resolve('blessgame', g, BlessGameCore.question(g), choice, blessgameInfo(BlessGameCore.question(g)));
}

function blessgameContinue() {
    const g = blessgame;
    if (!g || !g.resolved) return;
    if (BlessGameCore.next(g).includes('done')) { QuizUI.finish('blessgame', g, 'blessgame'); return; }
    blessgameRender();
}
