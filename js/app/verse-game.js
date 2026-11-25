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
let versegameMode = 'verse';     // 'verse' : un verset à identifier ; 'content' : le résumé d'une paracha à identifier (VerseGameCore.createContentGame)

const VERSEGAME_PREFS_KEY = 'torahaxe_versegame_prefs_v1';

function openVerseGame(fromScreen) {
    versegameReturn = fromScreen || 'screen-main';
    showScreen('screen-parashagame', 'forward');
    const raw = QuizUI.loadPrefs(VERSEGAME_PREFS_KEY);
    versegameFr = !!(raw && raw.fr);
    versegameMode = raw && raw.mode === 'content' ? 'content' : 'verse';
    document.getElementById('parashagame-fr').checked = versegameFr;
    versegameSetup();
}

// Le mode du jeu (« Verset » ou « Contenu ») : mémorisé sur l'appareil.
function parashagameMode(mode) {
    versegameMode = mode === 'content' ? 'content' : 'verse';
    QuizUI.savePrefs(VERSEGAME_PREFS_KEY, { fr: versegameFr, mode: versegameMode });
    versegameDrawModes();
}

function versegameDrawModes() {
    ['verse', 'content'].forEach(m => {
        const b = document.getElementById('parashagame-mode-' + m);
        if (b) b.setAttribute('aria-pressed', m === versegameMode ? 'true' : 'false');
    });
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
    versegameDrawModes();
    if (versegameData) { note.textContent = ''; start.classList.remove('hidden'); return; }
    start.classList.add('hidden');
    versegameLoad(() => { if (!document.getElementById('screen-parashagame').classList.contains('hidden') && !versegame) versegameSetup(); });
}

function parashagameStart() {
    if (!versegameData) return;
    versegame = versegameMode === 'content'
        ? VerseGameCore.createContentGame({ parashot: versegameData.parashot })
        : VerseGameCore.createGame({ books: versegameData.books, parashot: versegameData.parashot });
    QuizUI.phase('parashagame', 'play');
    versegameRender();
}

// Le résumé d'une paracha (ui/fr.json, tools.cmd_parachiot_<livre><rang>_text : le même texte que dans le Tanakh), pour le mode Contenu.
function versegameSummaryOf(i) {
    const P = versegameData.parashot.parashot;
    const p = P[i];
    const rank = P.slice(0, i).filter(x => x.book === p.book).length + 1;
    return t('tools.cmd_parachiot_' + ['g', 'e', 'l', 'n', 'd'][p.book - 1] + rank + '_text');
}

// Le statut : « Verset n sur 5 » ou « Résumé n sur 5 » selon le mode.
function versegameStatus(g) {
    QuizUI.status('parashagame', g);
    if (g.cfg === VerseGameCore.CONTENT_CFG) document.getElementById('parashagame-status').textContent = t('parashagame.status_content', { n: g.index + 1, total: g.questions.length, score: g.score });
}

// --- Un verset --------------------------------------------------------------------------------------------------------------------------------
function versegameRender() {
    const g = versegame;
    versegameBook = 0;
    versegameStatus(g);
    document.getElementById('parashagame-feedback').classList.add('hidden');
    const q = VerseGameCore.question(g);
    // Mode Contenu : l'intitulé de la question est le résumé de la paracha.
    document.getElementById('parashagame-ask').textContent = q && q.type === 'content' ? versegameSummaryOf(q.parasha) : t('parashagame.ask');
    versegameDrawVerses(false);
    versegameDrawControls();
    versegameDrawParashot();
}

// Les versets montrés ; `scroll` : amener le dernier ajouté à l'écran (après un indice).
function versegameDrawVerses(scroll) {
    const g = versegame;
    const box = document.getElementById('parashagame-verses');
    toolClear(box);
    if (g.cfg === VerseGameCore.CONTENT_CFG) return;     // mode Contenu : pas de verset, le résumé est dans l'intitulé
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
    if (g.cfg === VerseGameCore.CONTENT_CFG) { hint.classList.add('hidden'); return; }     // mode Contenu : pas d'indice
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
        QuizUI.chips('parashagame', TorahRefs.BOOK_NAMES.map((name, i) => ({ id: String(i + 1), label: name, he: versegameData.parashot.books[i] })), versegameBook ? String(versegameBook) : '', id => { versegameBook = Number(id); versegameDrawParashot(); });
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
    versegameStatus(g);
    versegameDrawVerses(false);
    versegameDrawControls();
    versegameDrawParashot();
    document.getElementById('parashagame-feedback').classList.toggle('is-wrong', !right);
    document.getElementById('parashagame-feedback-title').textContent = right ? t('parashagame.right', { n: g.points }) : t('parashagame.revealed');
    const bookName = TorahRefs.BOOK_NAMES[q.book - 1] + ' ⁨' + versegameData.parashot.books[q.book - 1] + '⁩';
    document.getElementById('parashagame-feedback-text').textContent = q.type === 'content'
        ? t('parashagame.answer_is_content', { fr: '⁨' + q.parashaFr + '⁩', he: '⁨' + q.parashaHe + '⁩', book: bookName })
        : t('parashagame.answer_is', { fr: '⁨' + q.parashaFr + '⁩', he: '⁨' + q.parashaHe + '⁩', book: bookName, ref: q.label });
    const note = document.getElementById('parashagame-feedback-note');
    note.textContent = '';
    note.classList.add('hidden');
    const next = document.getElementById('parashagame-next');
    const nextKey = g.cfg === VerseGameCore.CONTENT_CFG ? 'parashagame.next_content' : 'parashagame.next';
    next.textContent = t(g.index + 1 >= g.questions.length ? 'parashagame.finish' : nextKey);
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
