// =========================================================================
// === « LE VERSET EN DÉSORDRE » : LE JEU DES MOTS À REMETTRE EN ORDRE (onglet « Jouer ») ===
// =========================================================================
// Les règles sont dans js/scrambleGameCore.js (pur, testé) : un verset de la Torah coupé en mots, donnés en désordre ; 100 points en jeu, 20 par indice (un mot se place seul) et
// 20 par vérification fausse (les mots bien placés restent fixés). Ici : le chargement du texte (les cinq livres de data/tanakh/, partagés avec « Dans quelle paracha ? » quand ce jeu
// les a déjà lus), les places et les mots à toucher, la traduction facultative et la fiche. On touche un mot pour le poser à la première place libre, et un mot posé pour le reprendre.
// Les places vont de droite à gauche, comme l'hébreu. Tout ce qui vient des données passe par textContent.

let scrgame = null;
let scrgameReturn = 'screen-main';
let scrgameLevel = 'all';
let scrgameFr = true;            // montrer la traduction pour guider
let scrgameBooks = null;         // les cinq livres, une fois chargés
let scrgameLoading = false;
let scrgameMine = [];            // les mots posés par le joueur, place par place (null : libre) ; les places fixées ne passent pas par là

const SCRGAME_PREFS_KEY = 'torahaxe_scrgame_prefs_v1';

function openScrambleGame(fromScreen) {
    scrgameReturn = fromScreen || 'screen-main';
    showScreen('screen-scrgame', 'forward');
    const raw = QuizUI.loadPrefs(SCRGAME_PREFS_KEY);
    scrgameLevel = raw && ScrambleGameCore.LEVEL_IDS.indexOf(raw.level) >= 0 ? raw.level : 'all';
    scrgameFr = raw ? raw.fr !== false : true;
    document.getElementById('scrgame-fr').checked = scrgameFr;
    scrgameSetup();
}

function scrgameBack() { gamesBackTo(scrgameReturn); }

function scrgameSavePrefs() { QuizUI.savePrefs(SCRGAME_PREFS_KEY, { level: scrgameLevel, fr: scrgameFr }); }

function scrgameSetLevel(level) {
    if (ScrambleGameCore.LEVEL_IDS.indexOf(level) < 0) return;
    scrgameLevel = level;
    scrgameSavePrefs();
    scrgameSetup();
}

function scrgameToggleFr() {
    scrgameFr = document.getElementById('scrgame-fr').checked;
    scrgameSavePrefs();
    if (scrgame && !scrgame.over) scrgameDraw();
}

// Charge les cinq livres une fois (2 Mo) ; `then` est appelé quand tout est prêt.
function scrgameLoad(then) {
    if (scrgameBooks) { then(); return; }
    if (typeof versegameData !== 'undefined' && versegameData) { scrgameBooks = versegameData.books; then(); return; }
    if (scrgameLoading) return;
    scrgameLoading = true;
    const note = document.getElementById('scrgame-load');
    note.textContent = t('scrgame.loading');
    Promise.all(TorahRefs.BOOK_IDS.map(id => fetch('data/tanakh/' + id + '.json').then(r => { if (!r.ok) throw new Error(id); return r.json(); }))).then(books => {
        scrgameBooks = books;
        scrgameLoading = false;
        then();
    }).catch(() => { scrgameLoading = false; note.textContent = t('scrgame.load_error'); });
}

function scrgameSetup() {
    scrgame = null;
    QuizUI.phase('scrgame', 'setup');
    QuizUI.chips('scrgame', ScrambleGameCore.LEVEL_IDS.map(id => ({ id: id, label: t('scrgame.level_' + id) })), scrgameLevel, scrgameSetLevel);
    const start = document.getElementById('scrgame-start');
    const note = document.getElementById('scrgame-load');
    if (scrgameBooks) { note.textContent = ''; start.classList.remove('hidden'); return; }
    start.classList.add('hidden');
    scrgameLoad(() => { if (!document.getElementById('screen-scrgame').classList.contains('hidden') && !scrgame) scrgameSetup(); });
}

function scrgameStart() {
    if (!scrgameBooks) return;
    scrgame = ScrambleGameCore.createGame({ books: scrgameBooks, level: scrgameLevel });
    QuizUI.phase('scrgame', 'play');
    scrgameRender();
}

// --- Un verset --------------------------------------------------------------------------------------------------------------------------------
function scrgameRender() {
    const q = ScrambleGameCore.question(scrgame);
    scrgameMine = q.words.map(() => null);
    QuizUI.status('scrgame', scrgame);
    document.getElementById('scrgame-feedback').classList.add('hidden');
    document.getElementById('scrgame-actions').classList.remove('hidden');
    scrgameDraw();
}

// Les mots posés qui n'ont plus de pièce disponible (un indice vient de poser le mot qu'on avait placé ailleurs) retournent dans le tas.
function scrgameSanitize() {
    const avail = ScrambleGameCore.remainingPool(scrgame).slice();
    const fixed = ScrambleGameCore.fixedWords(scrgame);
    scrgameMine = scrgameMine.map((w, i) => {
        if (fixed[i] !== null || w === null) return null;
        const k = avail.indexOf(w);
        if (k < 0) return null;
        avail.splice(k, 1);
        return w;
    });
    return avail;       // ce qui reste dans le tas
}

function scrgameWord(text, className) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = className;
    el.lang = 'he'; el.dir = 'rtl';
    el.textContent = text;
    return el;
}

function scrgameDraw() {
    const g = scrgame;
    const q = ScrambleGameCore.question(g);
    const resolved = !!g.resolved;
    const pool = scrgameSanitize();
    const fixed = ScrambleGameCore.fixedWords(g);
    // La traduction, et la référence une fois le verset résolu.
    const fr = document.getElementById('scrgame-translation');
    fr.textContent = q.fr;
    fr.classList.toggle('hidden', !scrgameFr);
    document.getElementById('scrgame-ref').textContent = resolved ? q.label : '';
    // Les places.
    const slots = document.getElementById('scrgame-slots');
    toolClear(slots);
    q.words.forEach((_, i) => {
        const mine = scrgameMine[i];
        let slot;
        if (fixed[i] !== null) {
            slot = scrgameWord(fixed[i], 'scrgame-slot is-filled is-locked');
            slot.disabled = true;
            slot.setAttribute('aria-label', t('scrgame.slot_fixed_aria', { n: i + 1, word: fixed[i] }));
        } else if (mine !== null) {
            slot = scrgameWord(mine, 'scrgame-slot is-filled');
            slot.setAttribute('aria-label', t('scrgame.slot_aria', { n: i + 1, word: mine }));
            slot.onclick = () => { scrgameMine[i] = null; scrgameDraw(); };
        } else {
            slot = document.createElement('span');
            slot.className = 'scrgame-slot';
            slot.textContent = String(i + 1);
            slot.setAttribute('aria-label', t('scrgame.slot_empty_aria', { n: i + 1 }));
        }
        slots.appendChild(slot);
    });
    // Le tas.
    const box = document.getElementById('scrgame-pool');
    toolClear(box);
    if (!resolved) {
        pool.forEach(w => {
            const chip = scrgameWord(w, 'scrgame-chip');
            chip.setAttribute('aria-label', t('scrgame.chip_aria', { word: w }));
            chip.onclick = () => {
                const free = fixed.findIndex((f, i) => f === null && scrgameMine[i] === null);
                if (free >= 0) { scrgameMine[free] = w; scrgameDraw(); }
            };
            box.appendChild(chip);
        });
    }
    const freeLeft = fixed.filter((f, i) => f === null && scrgameMine[i] === null).length;
    document.getElementById('scrgame-points').textContent = resolved ? '' : t('scrgame.points', { n: g.points });
    document.getElementById('scrgame-check').disabled = resolved || freeLeft > 0;
    document.getElementById('scrgame-clear').disabled = resolved || !scrgameMine.some(w => w !== null);
    const hint = document.getElementById('scrgame-hint');
    hint.disabled = resolved || q.words.length - ScrambleGameCore.lockedCount(g) <= 2 || g.shown >= 1 + ScrambleGameCore.MAX_HINTS;
    hint.textContent = t('scrgame.hint', { cost: ScrambleGameCore.HINT_COST });
}

function scrgameClear() {
    if (scrgame && !scrgame.resolved) { scrgameMine = scrgameMine.map(() => null); scrgameDraw(); }
}

function scrgameHint() {
    const g = scrgame;
    const events = ScrambleGameCore.hint(g);
    if (!events.length) return;
    arcadeSound('bad');
    QuizUI.status('scrgame', g);
    scrgameDraw();
    if (events.indexOf('revealed') >= 0) scrgameFeedback('revealed', 0);
}

function scrgameCheck() {
    const g = scrgame;
    const q = ScrambleGameCore.question(g);
    const fixed = ScrambleGameCore.fixedWords(g);
    const placed = q.words.map((_, i) => (fixed[i] !== null ? fixed[i] : scrgameMine[i]));
    const before = ScrambleGameCore.lockedCount(g);
    const events = ScrambleGameCore.check(g, placed);
    if (!events.length) {
        if (!placed.some(w => w === null)) showToast(t('scrgame.already_tried'));
        return;
    }
    QuizUI.status('scrgame', g);
    if (events[0] === 'right') { arcadeSound('good'); scrgameDraw(); scrgameFeedback('right', 0); return; }
    arcadeSound('bad');
    scrgameMine = scrgameMine.map(() => null);       // les mots mal placés retournent dans le tas, les bons restent fixés
    scrgameDraw();
    if (events.indexOf('revealed') >= 0) { scrgameFeedback('revealed', 0); return; }
    showToast(t('scrgame.partial', { count: ScrambleGameCore.lockedCount(g) - before, cost: ScrambleGameCore.WRONG_COST }));
}

// La fiche : le verset en entier, sa référence et sa traduction. `outcome` : 'right' ou 'revealed'.
function scrgameFeedback(outcome) {
    const g = scrgame;
    const q = ScrambleGameCore.question(g);
    document.getElementById('scrgame-actions').classList.add('hidden');
    document.getElementById('scrgame-points').textContent = '';
    const feedback = document.getElementById('scrgame-feedback');
    feedback.classList.toggle('is-wrong', outcome !== 'right');
    const last = g.results[g.results.length - 1];
    document.getElementById('scrgame-feedback-title').textContent = outcome === 'right' ? t('scrgame.right', { points: last.points }) : t('scrgame.revealed');
    const he = document.getElementById('scrgame-answer');
    he.textContent = q.words.join(' ');
    document.getElementById('scrgame-answer-fr').textContent = q.fr;
    document.getElementById('scrgame-ref').textContent = q.label;
    const next = document.getElementById('scrgame-next');
    next.textContent = t(g.index + 1 >= g.questions.length ? 'scrgame.finish' : 'scrgame.next');
    feedback.classList.remove('hidden');
    next.focus();
}

function scrgameContinue() {
    const g = scrgame;
    if (!g || !g.resolved) return;
    if (ScrambleGameCore.next(g).includes('done')) { QuizUI.finish('scrgame', g, 'scrgame'); return; }
    scrgameRender();
}
