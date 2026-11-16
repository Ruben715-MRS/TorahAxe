// =========================================================================
// === « DANS QUELLE PARACHA ? » : LE JEU DU VERSET (onglet « Jouer ») ===
// =========================================================================
// Les règles sont dans js/verseGameCore.js (pur, testé) : un verset tiré au hasard dans la Torah, 100 points, un indice (le verset suivant) pour 20 points, une
// mauvaise réponse pour 20 points, la paracha dévoilée à zéro. Ici : le chargement du texte (les cinq livres de data/tanakh/, 2 Mo une seule fois, plus
// data/torah/parashot.json), les versets affichés, le choix du livre puis de la paracha, et la fiche. La traduction française (Bible du Rabbinat) est facultative
// et sans effet sur les points. Tout ce qui vient des données passe par textContent.

let versegame = null;
let versegameReturn = 'screen-main';
let versegameData = null;        // { books: [5 fichiers], parashot }, une fois chargé
let versegameBook = 0;           // le livre dont on voit les parachiot (0 : aucun)
let versegameFr = false;         // afficher aussi la traduction
let versegameLoading = false;

const VERSEGAME_PREFS_KEY = 'torahaxe_versegame_prefs_v1';

function openVerseGame(fromScreen) {
    versegameReturn = fromScreen || 'screen-main';
    showScreen('screen-parashagame', 'forward');
    const raw = QuizUI.loadPrefs(VERSEGAME_PREFS_KEY);
    versegameFr = !!(raw && raw.fr);
    document.getElementById('parashagame-fr').checked = versegameFr;
    versegameSetup();
}

function parashagameBack() { gamesBackTo(versegameReturn); }

function parashagameToggleFr() {
    versegameFr = document.getElementById('parashagame-fr').checked;
    QuizUI.savePrefs(VERSEGAME_PREFS_KEY, { fr: versegameFr });
}

// Charge les cinq livres et les parachiot une fois ; `then` est appelé quand tout est prêt.
function versegameLoad(then) {
    if (versegameData) { then(); return; }
    if (versegameLoading) return;
    versegameLoading = true;
    const note = document.getElementById('parashagame-load');
    note.textContent = t('parashagame.loading');
    const json = url => fetch(url).then(r => { if (!r.ok) throw new Error(url); return r.json(); });
    Promise.all(TorahRefs.BOOK_IDS.map(id => json('data/tanakh/' + id + '.json')).concat([json('data/torah/parashot.json')])).then(all => {
        versegameData = { books: all.slice(0, 5), parashot: all[5] };
        versegameLoading = false;
        then();
    }).catch(() => { versegameLoading = false; note.textContent = t('parashagame.load_error'); });
}

function versegameSetup() {
    versegame = null;
    QuizUI.phase('parashagame', 'setup');
    const start = document.getElementById('parashagame-start');
    const note = document.getElementById('parashagame-load');
    if (versegameData) { note.textContent = ''; start.classList.remove('hidden'); return; }
    start.classList.add('hidden');
    versegameLoad(() => { if (!document.getElementById('screen-parashagame').classList.contains('hidden') && !versegame) versegameSetup(); });
}

function parashagameStart() {
    if (!versegameData) return;
    versegame = VerseGameCore.createGame({ books: versegameData.books, parashot: versegameData.parashot });
    QuizUI.phase('parashagame', 'play');
    versegameRender();
}

// --- Un verset --------------------------------------------------------------------------------------------------------------------------------
function versegameRender() {
    const g = versegame;
    versegameBook = 0;
    QuizUI.status('parashagame', g);
    document.getElementById('parashagame-feedback').classList.add('hidden');
    document.getElementById('parashagame-ask').textContent = t('parashagame.ask');
    versegameDrawVerses(false);
    versegameDrawControls();
    versegameDrawParashot();
}

// Les versets montrés ; `scroll` : amener le dernier ajouté à l'écran (après un indice).
function versegameDrawVerses(scroll) {
    const g = versegame;
    const box = document.getElementById('parashagame-verses');
    toolClear(box);
    VerseGameCore.shownVerses(versegameData.books, g).forEach((v, i) => {
        const card = document.createElement('div');
        card.className = 'parashagame-verse';
        const small = document.createElement('small');
        small.textContent = t('parashagame.verse_n', { n: i + 1 });
        card.appendChild(small);
        const he = document.createElement('p');
        he.className = 'parashagame-he';
        he.lang = 'he'; he.dir = 'rtl';
        he.textContent = v.he;
        card.appendChild(he);
        if (versegameFr) {
            const fr = document.createElement('p');
            fr.className = 'parashagame-fr';
            fr.textContent = v.fr;
            card.appendChild(fr);
        }
        box.appendChild(card);
        // Une fois la paracha connue, la référence de chaque verset peut s'afficher sans rien révéler de plus.
        if (g.resolved) small.textContent += ' · ' + v.ref;
    });
    if (scroll && box.lastElementChild && box.lastElementChild.scrollIntoView) box.lastElementChild.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// Les points en jeu et le bouton d'indice.
function versegameDrawControls() {
    const g = versegame;
    document.getElementById('parashagame-points').textContent = t('parashagame.points', { n: g.points });
    const hint = document.getElementById('parashagame-hint');
    const left = VerseGameCore.MAX_HINTS - (g.shown - 1);
    hint.disabled = !!g.resolved || left <= 0;
    hint.classList.toggle('hidden', !!g.resolved);
    hint.textContent = left <= 0 ? t('parashagame.hint_none')
        : t(g.points - VerseGameCore.HINT_COST <= 0 ? 'parashagame.hint_last' : 'parashagame.hint', { cost: VerseGameCore.HINT_COST });
}

// Le choix du livre, puis les parachiot de ce livre.
function versegameDrawParashot() {
    const g = versegame;
    const q = VerseGameCore.question(g);
    const resolved = !!g.resolved;
    const holder = document.getElementById('parashagame-sections');
    holder.classList.toggle('hidden', resolved);
    if (!resolved) {
        QuizUI.chips('parashagame', TorahRefs.BOOK_NAMES.map((name, i) => ({ id: String(i + 1), label: name })), versegameBook ? String(versegameBook) : '', id => { versegameBook = Number(id); versegameDrawParashot(); });
    }
    const grid = document.getElementById('parashagame-parashot');
    toolClear(grid);
    document.getElementById('parashagame-ask').classList.toggle('hidden', resolved);
    if (resolved) return;
    if (!versegameBook) {
        const hintText = document.createElement('p');
        hintText.className = 'tool-small';
        hintText.textContent = t('parashagame.pick_book');
        hintText.style.gridColumn = '1 / -1';
        grid.appendChild(hintText);
        return;
    }
    versegameData.parashot.parashot.forEach((p, i) => {
        if (p.book !== versegameBook) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'parashagame-par';
        btn.dataset.index = String(i);
        btn.appendChild(document.createTextNode(p.fr));
        const he = document.createElement('span');
        he.className = 'he'; he.lang = 'he'; he.dir = 'rtl';
        he.textContent = p.he;
        btn.appendChild(he);
        if (g.wrong.indexOf(i) >= 0) { btn.classList.add('wrong'); btn.disabled = true; }
        btn.onclick = () => parashagameGuess(i);
        grid.appendChild(btn);
    });
}

function parashagameHint() {
    const g = versegame;
    const events = VerseGameCore.hint(g);
    if (!events.length) return;
    versegameDrawVerses(true);
    versegameDrawControls();
    if (events.includes('revealed')) versegameResolve(null);
}

function parashagameGuess(parasha) {
    const g = versegame;
    const events = VerseGameCore.guess(g, parasha);
    if (!events.length) return;
    arcadeSound(events[0] === 'right' ? 'good' : 'bad');
    if (events.includes('right') || events.includes('revealed')) { versegameResolve(parasha); return; }
    // Une mauvaise réponse : la paracha est écartée et les points baissent.
    versegameDrawControls();
    versegameDrawParashot();
    const points = document.getElementById('parashagame-points');
    points.textContent += ' · ' + t('parashagame.wrong_try', { name: versegameData.parashot.parashot[parasha].fr, cost: VerseGameCore.WRONG_COST });
}

// Le verset est résolu (bonne réponse, ou paracha dévoilée) : la fiche, le bouton suivant.
function versegameResolve(guessed) {
    const g = versegame;
    const q = VerseGameCore.question(g);
    const right = g.resolved === 'right';
    QuizUI.status('parashagame', g);
    versegameDrawVerses(false);
    versegameDrawControls();
    versegameDrawParashot();
    document.getElementById('parashagame-feedback').classList.toggle('is-wrong', !right);
    document.getElementById('parashagame-feedback-title').textContent = right ? t('parashagame.right', { n: g.points }) : t('parashagame.revealed');
    document.getElementById('parashagame-feedback-text').textContent = t('parashagame.answer_is', {
        fr: '⁨' + q.parashaFr + '⁩', he: '⁨' + q.parashaHe + '⁩', book: TorahRefs.BOOK_NAMES[q.book - 1], ref: q.label
    });
    const note = document.getElementById('parashagame-feedback-note');
    note.textContent = '';
    note.classList.add('hidden');
    const next = document.getElementById('parashagame-next');
    next.textContent = t(g.index + 1 >= g.questions.length ? 'parashagame.finish' : 'parashagame.next');
    document.getElementById('parashagame-feedback').classList.remove('hidden');
    next.focus();
}

function parashagameContinue() {
    const g = versegame;
    if (!g || !g.resolved) return;
    if (VerseGameCore.next(g).includes('done')) { versegameFinish(); return; }
    versegameRender();
}

// « Lire la paracha » : ouvre le Tanakh sur la paracha du verset, « Retour » ramène à la partie en cours.
function parashagameOpenParasha() {
    const q = versegame && VerseGameCore.question(versegame);
    if (!q) return;
    toolReturns.tanakh = 'screen-parashagame';
    tanakhOpenParasha(q.parasha, 1, 'screen-parashagame');
}

function versegameFinish() {
    QuizUI.finish('parashagame', versegame, 'parashagame');
}
