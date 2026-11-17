// =========================================================================
// === « QUI SUIS-JE ? » : LE JEU DES INDICES (onglet « Jouer ») ===
// =========================================================================
// Les règles sont dans js/whoGameCore.js (pur, testé) : un personnage parle à la première personne, quatre noms sont proposés, 100 points, 20 points de moins par
// indice de plus, UNE SEULE réponse (une erreur vaut 0 point et dévoile la réponse). Les personnages de la Bible viennent de js/whoData.js, les sages du dictionnaire araméen. Ici :
// l'écran (les indices, les quatre noms, la fiche) et le choix de la section ; son déroulé commun vient de js/app/quiz-ui.js (préfixe `whogame`). À la fin d'une question, les
// indices qu'on n'a pas demandés s'affichent aussi, en grisé. Tout ce qui vient des données passe par textContent.

let whogame = null;
let whogameReturn = 'screen-main';
let whogameSection = 'all';

const WHOGAME_PREFS_KEY = 'torahaxe_whogame_prefs_v1';

function openWhoGame(fromScreen) {
    whogameReturn = fromScreen || 'screen-main';
    showScreen('screen-whogame', 'forward');
    const raw = QuizUI.loadPrefs(WHOGAME_PREFS_KEY);
    whogameSection = raw && WhoGameCore.SECTIONS.indexOf(raw.section) >= 0 ? raw.section : 'all';
    whogameSetup();
}

function whogameBack() { gamesBackTo(whogameReturn); }

function whogameSetSection(section) {
    if (WhoGameCore.SECTIONS.indexOf(section) < 0) return;
    whogameSection = section;
    QuizUI.savePrefs(WHOGAME_PREFS_KEY, { section: whogameSection });
    whogameSetup();
}

function whogameSetup() {
    whogame = null;
    QuizUI.phase('whogame', 'setup');
    QuizUI.chips('whogame', WhoGameCore.SECTIONS.map(section => ({ id: section, label: t('whogame.section_' + section) + ' (' + WhoGameCore.people(section).length + ')' })), whogameSection, whogameSetSection);
}

function whogameStart() {
    whogame = WhoGameCore.createGame({ section: whogameSection });
    QuizUI.phase('whogame', 'play');
    whogameRender();
}

// --- Un personnage ----------------------------------------------------------------------------------------------------------------------------
function whogameRender() {
    const g = whogame;
    const q = WhoGameCore.question(g);
    QuizUI.status('whogame', g);
    document.getElementById('whogame-feedback').classList.add('hidden');
    document.getElementById('whogame-ask').textContent = t('whogame.ask');
    QuizUI.options('whogame', q, option => ({ label: option.label, he: option.he }), whogameGuess);
    whogameDrawClues(false);
    whogameDrawControls();
}

// Les indices montrés ; `scroll` : amener le dernier ajouté à l'écran. Une fois la question résolue, ceux qu'on n'a pas demandés suivent, en grisé.
function whogameDrawClues(scroll) {
    const g = whogame;
    const q = WhoGameCore.question(g);
    const box = document.getElementById('whogame-clues');
    toolClear(box);
    q.clues.forEach((text, i) => {
        const seen = i < g.shown;
        if (!seen && !g.resolved) return;
        const card = document.createElement('div');
        card.className = 'whogame-clue' + (seen ? '' : ' is-unseen');
        const small = document.createElement('small');
        small.textContent = t('whogame.clue_n', { n: i + 1 }) + (seen ? '' : ' · ' + t('whogame.clue_unseen'));
        card.appendChild(small);
        const p = document.createElement('p');
        p.textContent = text;
        card.appendChild(p);
        box.appendChild(card);
    });
    if (scroll && g.shown > 0) {
        const last = box.children[g.shown - 1];
        if (last && last.scrollIntoView) last.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
}

// Les points en jeu, le bouton d'indice, et les quatre noms (la bonne réponse en vert, le nom choisi à tort en rouge, une fois la question résolue).
function whogameDrawControls() {
    const g = whogame;
    const q = WhoGameCore.question(g);
    document.getElementById('whogame-points').textContent = t('whogame.points', { n: g.points });
    const hint = document.getElementById('whogame-hint');
    const left = q.maxHints - (g.shown - 1);
    hint.classList.toggle('hidden', !!g.resolved);
    hint.disabled = !!g.resolved || left <= 0;
    hint.textContent = left <= 0 ? t('whogame.hint_none') : t('whogame.hint', { cost: WhoGameCore.HINT_COST });
    document.getElementById('whogame-ask').classList.toggle('hidden', !!g.resolved);
    document.querySelectorAll('#whogame-options .lexgame-option').forEach(btn => {
        const i = Number(btn.dataset.choice);
        const wrong = g.wrong.indexOf(i) >= 0;
        btn.disabled = wrong || !!g.resolved;
        btn.classList.toggle('wrong', wrong);
        btn.classList.toggle('correct', !!g.resolved && i === q.answer);
    });
}

function whogameHint() {
    const g = whogame;
    const events = WhoGameCore.hint(g);
    if (!events.length) return;
    whogameDrawClues(true);
    whogameDrawControls();
    if (events.includes('revealed')) whogameResolve();
}

function whogameGuess(choice) {
    const g = whogame;
    const events = WhoGameCore.guess(g, choice);
    if (!events.length) return;
    arcadeSound(events[0] === 'right' ? 'good' : 'bad');
    whogameResolve();   // une bonne réponse, ou une erreur : la question est résolue dans les deux cas (une seule réponse)
}

// La question est résolue (bonne réponse, ou réponse dévoilée) : la fiche, tous les indices, le bouton suivant.
function whogameResolve() {
    const g = whogame;
    const q = WhoGameCore.question(g);
    const right = g.resolved === 'right';
    QuizUI.status('whogame', g);
    whogameDrawClues(false);
    whogameDrawControls();
    document.getElementById('whogame-feedback').classList.toggle('is-wrong', !right);
    document.getElementById('whogame-feedback-title').textContent = right ? t('whogame.right', { n: g.points }) : t('whogame.revealed');
    document.getElementById('whogame-feedback-text').textContent = t('whogame.answer_is', { fr: '⁨' + q.person.fr + '⁩', he: '⁨' + q.person.he + '⁩' });
    const note = document.getElementById('whogame-feedback-note');
    note.textContent = '';
    note.classList.add('hidden');
    const next = document.getElementById('whogame-next');
    next.textContent = t(g.index + 1 >= g.questions.length ? 'whogame.finish' : 'whogame.next');
    document.getElementById('whogame-feedback').classList.remove('hidden');
    next.focus();
}

function whogameContinue() {
    const g = whogame;
    if (!g || !g.resolved) return;
    if (WhoGameCore.next(g).includes('done')) { QuizUI.finish('whogame', g, 'whogame'); return; }
    whogameRender();
}
