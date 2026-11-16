// =========================================================================
// === « MITSVA EXPRESS » : LE JEU SUR LES 613 COMMANDEMENTS (onglet « Jouer ») ===
// =========================================================================
// Les règles et les questions sont dans js/mitsvaGameCore.js (pur, testé) ; l'écran, son déroulé et la barre de temps viennent de js/app/quiz-ui.js (préfixe
// `mitsvagame`). Ici : le chargement des parachiot (data/torah/parashot.json, une fois), le texte des questions et la fiche qui donne le verset cité par le
// Rambam et sa paracha. Pas de répétition espacée : les commandements sont tirés au hasard. Tout ce qui vient des données passe par textContent.

let mitsvagame = null;
let mitsvagameReturn = 'screen-main';
let mitsvagameParashot = null;       // { books, parashot[] }, une fois chargé

function openMitsvaGame(fromScreen) {
    mitsvagameReturn = fromScreen || 'screen-main';
    showScreen('screen-mitsvagame', 'forward');
    mitsvagameSetup();
}

function mitsvagameBack() {
    QuizUI.timerStop();
    gamesBackTo(mitsvagameReturn);
}

function mitsvagameSetup() {
    QuizUI.timerStop();
    mitsvagame = null;
    QuizUI.phase('mitsvagame', 'setup');
    const start = document.getElementById('mitsvagame-start');
    const note = document.getElementById('mitsvagame-load');
    if (mitsvagameParashot) { note.textContent = ''; start.classList.remove('hidden'); return; }
    // Les parachiot (3 Ko) se chargent à la première ouverture ; le bouton n'apparaît qu'une fois prêtes.
    start.classList.add('hidden');
    note.textContent = t('mitsvagame.loading');
    fetch('data/torah/parashot.json').then(r => (r.ok ? r.json() : null)).then(json => {
        if (!json || !Array.isArray(json.parashot)) throw new Error('parashot');
        mitsvagameParashot = json;
        if (!document.getElementById('screen-mitsvagame').classList.contains('hidden') && !mitsvagame) mitsvagameSetup();
    }).catch(() => { note.textContent = t('mitsvagame.load_error'); });
}

function mitsvagameStart() {
    if (!mitsvagameParashot) return;
    mitsvagame = MitsvaGameCore.createGame({ parashot: mitsvagameParashot });
    QuizUI.phase('mitsvagame', 'play');
    mitsvagameRender();
}

function mitsvagameRender() {
    const g = mitsvagame;
    const q = MitsvaGameCore.question(g);
    QuizUI.status('mitsvagame', g);
    document.getElementById('mitsvagame-question').textContent = t('mitsvagame.ask_' + q.type);
    QuizUI.word('mitsvagame', q.shown, true);
    // Les livres et les parachiot ont leur nom propre ; « positif » et « négatif » sont des clés de traduction.
    QuizUI.options('mitsvagame', q, option => ({ label: q.type === 'kind' ? t('mitsvagame.' + option.label) : option.label }), mitsvagameAnswer);
    QuizUI.timerStart('mitsvagame', q.timeMs, 'screen-mitsvagame', mitsvagameTimeout);
}

// La fiche : le commandement avec son numéro, puis le verset cité et sa paracha (et, pour un piège, ce qu'il faut en retenir).
function mitsvagameInfo(q, timedOut) {
    const it = q.item;
    const p = mitsvagameParashot.parashot[it.parasha];
    const line = (timedOut ? t('mitsvagame.timeout') + ' ' : '') + t('mitsvagame.fb_' + it.kind, { n: it.n, text: it.text });
    const source = t('mitsvagame.fb_source', { ref: it.ref, parasha: p.fr, book: it.bookFr });
    return { line: line, note: it.trap ? t('mitsvagame.fb_trap') + ' ' + source : source };
}

function mitsvagameAnswer(choice) {
    const g = mitsvagame;
    if (!MitsvaGameCore.answer(g, choice).length) return;
    QuizUI.timerStop();
    QuizUI.timerHide('mitsvagame');
    const q = MitsvaGameCore.question(g);
    QuizUI.resolve('mitsvagame', g, q, choice, mitsvagameInfo(q, false));
}

function mitsvagameTimeout() {
    const g = mitsvagame;
    QuizUI.timerStop();
    if (!g || !MitsvaGameCore.expire(g).length) return;
    QuizUI.timerHide('mitsvagame');
    const q = MitsvaGameCore.question(g);
    QuizUI.resolve('mitsvagame', g, q, -1, mitsvagameInfo(q, true));
}

function mitsvagameContinue() {
    const g = mitsvagame;
    if (!g || !g.resolved) return;
    if (MitsvaGameCore.next(g).includes('done')) { mitsvagameFinish(); return; }
    mitsvagameRender();
}

function mitsvagameFinish() {
    QuizUI.timerStop();
    QuizUI.finish('mitsvagame', mitsvagame, 'mitsvagame');
}
