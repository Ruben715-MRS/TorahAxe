// =========================================================================
// === « AUTEUR ET ŒUVRE » : LE JEU DE LA BIBLIOTHÈQUE (onglet « Jouer ») ===
// =========================================================================
// Les règles et le choix des œuvres sont dans js/authorGameCore.js (pur, testé) ; les œuvres, leurs auteurs, leurs dates et leur description viennent de la Bibliothèque
// (js/libraryCore.js, déjà chargé). L'écran et son déroulé viennent de js/app/quiz-ui.js (préfixe `authgame`) : ici, la série jouée, la question selon son type (auteur demandé, livre
// demandé, époque, le plus ancien) et la fiche qui rappelle l'œuvre. Pas de chrono, pas de répétition espacée. Tout ce qui vient des données passe par textContent.

let authgame = null;
let authgameReturn = 'screen-main';
let authgameSection = 'all';

const AUTHGAME_PREFS_KEY = 'torahaxe_authgame_prefs_v1';

function openAuthorGame(fromScreen) {
    authgameReturn = fromScreen || 'screen-main';
    showScreen('screen-authgame', 'forward');
    const raw = QuizUI.loadPrefs(AUTHGAME_PREFS_KEY);
    authgameSection = raw && AuthorGameCore.SECTIONS.indexOf(raw.section) >= 0 ? raw.section : 'all';
    authgameSetup();
}

function authgameBack() { gamesBackTo(authgameReturn); }

function authgameSetSection(section) {
    if (AuthorGameCore.SECTIONS.indexOf(section) < 0) return;
    authgameSection = section;
    QuizUI.savePrefs(AUTHGAME_PREFS_KEY, { section: authgameSection });
    authgameSetup();
}

function authgameSetup() {
    authgame = null;
    QuizUI.phase('authgame', 'setup');
    QuizUI.chips('authgame', AuthorGameCore.SECTIONS.map(section => ({ id: section, label: t('authgame.section_' + section) })), authgameSection, authgameSetSection);
}

function authgameStart() {
    authgame = AuthorGameCore.createGame({ section: authgameSection });
    QuizUI.phase('authgame', 'play');
    authgameRender();
}

// --- Le déroulé -------------------------------------------------------------------------------------------------------------------------------
function authgameRender() {
    const g = authgame;
    const q = AuthorGameCore.question(g);
    QuizUI.status('authgame', g);
    const ask = q.type === 'oldest' ? (q.last ? 'ask_newest' : 'ask_oldest') : 'ask_' + q.type;
    document.getElementById('authgame-question').textContent = t('authgame.' + ask);
    // L'œuvre (ou, pour « Lequel a écrit ? », l'auteur) en grand ; son nom hébreu en dessous quand il ne donne pas l'auteur (on ne le montre que pour « qui a écrit ? » et « époque »).
    const word = q.type === 'work' ? LibraryNames.author(q.authorId) : q.type === 'oldest' ? '' : q.work.fr;
    QuizUI.word('authgame', word, true);
    document.getElementById('authgame-he').textContent = q.type === 'author' || q.type === 'era' ? q.work.he : '';
    QuizUI.options('authgame', q, option => ({ label: option.label }), authgameAnswer);
}

// Le nom d'usage d'un auteur du jeu.
const LibraryNames = { author: id => AuthorGameCore.AUTHORS[id].name };
// L'auteur d'une œuvre : son nom d'usage s'il est dans le jeu, sinon le texte de la Bibliothèque (école, auteur discuté…).
const authgameWho = w => (AuthorGameCore.AUTHORS[w.authorId] ? LibraryNames.author(w.authorId) : w.author);

// La fiche : la bonne réponse, puis l'œuvre (ce que c'est, quand, où).
function authgameInfo(q) {
    const w = q.work;
    const when = LibraryCore.dating(w);
    const about = t('authgame.about', { work: w.fr, author: authgameWho(w), when: when, place: w.place });
    if (q.type === 'author') return { line: t('authgame.line_author', { work: w.fr, author: authgameWho(w) }), extra: about, note: w.desc };
    if (q.type === 'work') return { line: t('authgame.line_work', { author: LibraryNames.author(q.authorId), work: w.fr }), extra: about, note: w.desc };
    if (q.type === 'era') {
        const era = LibraryCore.ERAS.filter(e => e.id === q.era)[0].fr;
        return { line: t('authgame.line_era', { work: w.fr, era: era }), extra: about, note: w.desc };
    }
    // « le plus ancien » : les quatre œuvres, avec leur date, de la plus ancienne à la plus récente.
    const all = q.options.map(o => LibraryCore.byId(o.id)).sort((a, b) => a.from - b.from);
    return { line: t(q.last ? 'authgame.line_newest' : 'authgame.line_oldest', { work: w.fr, when: LibraryCore.dating(w) }), extra: t('authgame.order', { list: all.map(x => x.fr + ' (' + LibraryCore.dating(x) + ')').join(' ; ') }), note: w.desc };
}

function authgameAnswer(choice) {
    const g = authgame;
    if (!AuthorGameCore.answer(g, choice).length) return;
    QuizUI.resolve('authgame', g, AuthorGameCore.question(g), choice, authgameInfo(AuthorGameCore.question(g)));
}

function authgameContinue() {
    const g = authgame;
    if (!g || !g.resolved) return;
    if (AuthorGameCore.next(g).includes('done')) { QuizUI.finish('authgame', g, 'authgame'); return; }
    authgameRender();
}
