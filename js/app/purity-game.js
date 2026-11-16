// =========================================================================
// === « PUR OU IMPUR ? » : LE JEU DE TRI CHRONOMÉTRÉ (onglet « Jouer ») ===
// =========================================================================
// Les règles et les animaux sont dans js/purityGameCore.js (pur, testé) ; l'écran et son déroulé viennent de js/app/quiz-ui.js (préfixe `purgame`). Ici : la
// section jouée, la barre de temps (huit secondes par animal ; à zéro, la question est comptée fausse) et la fiche qui explique le statut. Le jeu se lance
// depuis l'onglet « Jouer » et rend la main à l'écran d'où il vient. Pas de répétition espacée : les animaux sont tirés au hasard, à parts égales de purs et
// d'impurs. Tout ce qui vient des données passe par textContent.

let purgame = null;
let purgameReturn = 'screen-main';
let purgameSection = 'all';
let purgameTimer = null;        // l'intervalle de la barre de temps
let purgameDeadline = 0;        // l'instant (ms) où le temps est écoulé

const PURGAME_PREFS_KEY = 'torahaxe_purgame_prefs_v1';

function openPurityGame(fromScreen) {
    purgameReturn = fromScreen || 'screen-main';
    showScreen('screen-purgame', 'forward');
    const raw = QuizUI.loadPrefs(PURGAME_PREFS_KEY);
    purgameSection = raw && PurityGameCore.SECTIONS.indexOf(raw.section) >= 0 ? raw.section : 'all';
    purgameSetup();
}

function purgameBack() {
    purgameStopTimer();
    gamesBackTo(purgameReturn);
}

function purgameSetSection(section) {
    if (PurityGameCore.SECTIONS.indexOf(section) < 0) return;
    purgameSection = section;
    QuizUI.savePrefs(PURGAME_PREFS_KEY, { section: purgameSection });
    purgameSetup();
}

function purgameSetup() {
    purgameStopTimer();
    purgame = null;
    QuizUI.phase('purgame', 'setup');
    QuizUI.chips('purgame', PurityGameCore.SECTIONS.map(section => ({ id: section, label: t('purgame.section_' + section) })), purgameSection, purgameSetSection);
}

function purgameStart() {
    purgame = PurityGameCore.createGame({ section: purgameSection });
    QuizUI.phase('purgame', 'play');
    purgameRender();
}

// --- La barre de temps ------------------------------------------------------------------------------------------------------------------------
function purgameStopTimer() {
    if (purgameTimer) { clearInterval(purgameTimer); purgameTimer = null; }
}

function purgameDrawTimer(msLeft) {
    const left = Math.max(0, msLeft);
    const bar = document.getElementById('purgame-timer');
    document.getElementById('purgame-timer-fill').style.width = Math.round(100 * left / PurityGameCore.TIME_MS) + '%';
    bar.classList.toggle('is-low', left <= 2500);
    const seconds = Math.ceil(left / 1000);
    bar.setAttribute('aria-valuenow', String(seconds));
    bar.setAttribute('aria-valuetext', t('purgame.time_left', { n: seconds }));
    document.getElementById('purgame-time').textContent = t('purgame.time_left', { n: seconds });
}

function purgameHideTimer() {
    document.getElementById('purgame-timer').classList.add('hidden');
    document.getElementById('purgame-time').classList.add('hidden');
}

function purgameStartTimer() {
    purgameStopTimer();
    purgameDeadline = Date.now() + PurityGameCore.TIME_MS;
    purgameDrawTimer(PurityGameCore.TIME_MS);
    purgameTimer = setInterval(() => {
        // L'écran a été quitté sans passer par « Retour » (par exemple, un lien de l'accueil) : on arrête tout.
        if (document.getElementById('screen-purgame').classList.contains('hidden')) { purgameStopTimer(); return; }
        const left = purgameDeadline - Date.now();
        purgameDrawTimer(left);
        if (left <= 0) purgameTimeout();
    }, 100);
}

// --- Le déroulé -------------------------------------------------------------------------------------------------------------------------------
function purgameRender() {
    const g = purgame;
    const q = PurityGameCore.question(g);
    QuizUI.status('purgame', g);
    document.getElementById('purgame-question').textContent = t('purgame.ask_item');
    QuizUI.word('purgame', q.shown, true);
    document.getElementById('purgame-he').textContent = q.shownHe;
    QuizUI.options('purgame', q, option => ({ label: t('purgame.' + option.label) }), purgameAnswer);
    document.getElementById('purgame-timer').classList.remove('hidden');
    document.getElementById('purgame-time').classList.remove('hidden');
    purgameStartTimer();
}

// La fiche : le statut de l'animal et pourquoi (les signes, le verset).
function purgameInfo(q, timedOut) {
    const it = q.item;
    return {
        line: (timedOut ? t('purgame.timeout') + ' ' : '') + it.fr + ' : ' + t('purgame.is_' + it.status) + '. ' + it.why,
        note: it.ref || ''
    };
}

function purgameAnswer(choice) {
    const g = purgame;
    if (!PurityGameCore.answer(g, choice).length) return;
    purgameStopTimer();
    purgameHideTimer();
    QuizUI.resolve('purgame', g, PurityGameCore.question(g), choice, purgameInfo(PurityGameCore.question(g), false));
}

function purgameTimeout() {
    const g = purgame;
    purgameStopTimer();
    if (!g || !PurityGameCore.expire(g).length) return;
    const q = PurityGameCore.question(g);
    purgameHideTimer();
    QuizUI.resolve('purgame', g, q, -1, purgameInfo(q, true));
}

function purgameContinue() {
    const g = purgame;
    if (!g || !g.resolved) return;
    if (PurityGameCore.next(g).includes('done')) { purgameFinish(); return; }
    purgameRender();
}

function purgameFinish() {
    purgameStopTimer();
    QuizUI.finish('purgame', purgame, 'purgame');
}
