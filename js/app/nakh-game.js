// =========================================================================
// === « DANS QUEL LIVRE DU NAKH ? » : LE JEU DU VERSET ET DU CHAPITRE (onglet « Jouer ») ===
// =========================================================================
// Les règles sont dans js/nakhGameCore.js (pur, testé) et la disposition des 34 livres dans js/nakhRefs.js. Trois modes : « Livre » (un verset tiré au hasard : de quel livre ?, avec des
// indices qui coûtent des points), « Livre et chapitre » (une fois le livre trouvé, le chapitre, en un seul essai, avec des points selon l'écart) et « Contenu » (le résumé d'un chapitre, sans
// le nom du livre). Ici : le chargement (les résumés des chapitres, 100 Ko, à l'ouverture ; le texte des seuls livres tirés, au lancement de la partie), les versets affichés, le choix du
// livre (Neviim ou Ketouvim, puis la grille des livres), le sélecteur de chapitre et la fiche. La traduction française (Bible du Rabbinat) est facultative et sans effet sur les points.
// Tout ce qui vient des données passe par textContent.

let nakhgame = null;
let nakhgameReturn = 'screen-main';
let nakhgameFiles = {};          // { fichier: contenu de data/tanakh/<fichier>.json }, chargés à la demande et gardés
let nakhgameSummaries = null;    // { fichier: contenu de data/tanakh/resume-<fichier>.json }, une fois chargé
let nakhgameGroup = '';          // le groupe dont on voit les livres ('nevi', 'ketouvim', '' : aucun)
let nakhgameFr = false;          // afficher aussi la traduction
let nakhgameLoading = false;
let nakhgameModeId = 'book';       // 'book', 'chapter' ou 'content' (NakhGameCore.MODES)
let nakhgameChapter = 1;         // le chapitre choisi sur le sélecteur

const NAKHGAME_PREFS_KEY = 'torahaxe_nakhgame_prefs_v1';

function openNakhGame(fromScreen) {
    nakhgameReturn = fromScreen || 'screen-main';
    showScreen('screen-nakhgame', 'forward');
    const raw = QuizUI.loadPrefs(NAKHGAME_PREFS_KEY);
    nakhgameFr = !!(raw && raw.fr);
    nakhgameModeId = raw && NakhGameCore.MODES.indexOf(raw.mode) >= 0 ? raw.mode : 'book';
    document.getElementById('nakhgame-fr').checked = nakhgameFr;
    nakhgameSetup();
}

function nakhgameSavePrefs() { QuizUI.savePrefs(NAKHGAME_PREFS_KEY, { fr: nakhgameFr, mode: nakhgameModeId }); }

// Le mode du jeu : mémorisé sur l'appareil.
function nakhgameMode(mode) {
    nakhgameModeId = NakhGameCore.MODES.indexOf(mode) >= 0 ? mode : 'book';
    nakhgameSavePrefs();
    nakhgameDrawModes();
}

function nakhgameDrawModes() {
    NakhGameCore.MODES.forEach(m => {
        const b = document.getElementById('nakhgame-mode-' + m);
        if (b) b.setAttribute('aria-pressed', m === nakhgameModeId ? 'true' : 'false');
    });
}

function nakhgameBack() { gamesBackTo(nakhgameReturn); }

function nakhgameToggleFr() {
    nakhgameFr = document.getElementById('nakhgame-fr').checked;
    nakhgameSavePrefs();
}

const nakhgameJson = url => fetch(url).then(r => { if (!r.ok) throw new Error(url); return r.json(); });

// Charge les résumés de chapitres (19 petits fichiers) une fois ; `then` est appelé quand ils sont prêts.
function nakhgameLoadSummaries(then) {
    if (nakhgameSummaries) { then(); return; }
    if (nakhgameLoading) return;
    nakhgameLoading = true;
    const note = document.getElementById('nakhgame-load');
    note.textContent = t('nakhgame.loading');
    Promise.all(NakhRefs.FILES.map(id => nakhgameJson('data/tanakh/resume-' + id + '.json'))).then(all => {
        const out = {};
        NakhRefs.FILES.forEach((id, i) => { out[id] = all[i]; });
        nakhgameSummaries = out;
        nakhgameLoading = false;
        then();
    }).catch(() => { nakhgameLoading = false; note.textContent = t('nakhgame.load_error'); });
}

// Charge le texte des fichiers demandés (ceux des livres tirés), sauf ceux qu'on a déjà.
function nakhgameLoadFiles(ids, then, fail) {
    const missing = ids.filter(id => !nakhgameFiles[id]);
    if (!missing.length) { then(); return; }
    Promise.all(missing.map(id => nakhgameJson('data/tanakh/' + id + '.json'))).then(all => {
        missing.forEach((id, i) => { nakhgameFiles[id] = all[i]; });
        then();
    }).catch(fail);
}

function nakhgameSetup() {
    nakhgame = null;
    QuizUI.phase('nakhgame', 'setup');
    const start = document.getElementById('nakhgame-start');
    const note = document.getElementById('nakhgame-load');
    nakhgameDrawModes();
    if (nakhgameSummaries) { note.textContent = ''; start.classList.remove('hidden'); return; }
    start.classList.add('hidden');
    nakhgameLoadSummaries(() => { if (!document.getElementById('screen-nakhgame').classList.contains('hidden') && !nakhgame) nakhgameSetup(); });
}

// La partie est créée tout de suite (le tirage ne demande que la disposition des livres : un jeu à plusieurs doit l'être dans cet appel), puis on charge le texte des livres tirés.
function nakhgameStart() {
    if (!nakhgameSummaries) return;
    const g = nakhgameModeId === 'content'
        ? NakhGameCore.createContentGame({ summaries: nakhgameSummaries })
        : NakhGameCore.createGame({ mode: nakhgameModeId });
    nakhgame = g;
    if (nakhgameModeId === 'content') { QuizUI.phase('nakhgame', 'play'); nakhgameRender(); return; }
    const note = document.getElementById('nakhgame-load');
    const start = document.getElementById('nakhgame-start');
    QuizUI.phase('nakhgame', 'setup');
    start.classList.add('hidden');
    note.textContent = t('nakhgame.loading_text');
    const files = g.questions.map(q => q.file).filter((f, i, all) => all.indexOf(f) === i);
    nakhgameLoadFiles(files, () => {
        if (nakhgame !== g) return;
        note.textContent = '';
        start.classList.remove('hidden');
        QuizUI.phase('nakhgame', 'play');
        nakhgameRender();
    }, () => {
        if (nakhgame !== g) return;
        nakhgame = null;
        start.classList.remove('hidden');
        note.textContent = t('nakhgame.load_error');
    });
}

// Le statut : « Verset n sur 5 » ou « Résumé n sur 5 » selon le mode.
function nakhgameStatus(g) {
    QuizUI.status('nakhgame', g);
    if (g.mode === 'content' && !g.multi) document.getElementById('nakhgame-status').textContent = t('nakhgame.status_content', { n: g.index + 1, total: g.questions.length, score: g.score });
}

// --- Une question -----------------------------------------------------------------------------------------------------------------------------
function nakhgameRender() {
    const g = nakhgame;
    nakhgameGroup = '';
    nakhgameStatus(g);
    document.getElementById('nakhgame-feedback').classList.add('hidden');
    nakhgameDrawAsk();
    nakhgameDrawVerses(false);
    nakhgameDrawControls();
    nakhgameDrawBooks();
    nakhgameDrawChapter();
}

// L'intitulé : la question, ou le résumé du chapitre (mode Contenu). En mode Contenu, le résumé reste affiché après la réponse.
function nakhgameDrawAsk() {
    const g = nakhgame;
    const q = NakhGameCore.question(g);
    const ask = document.getElementById('nakhgame-ask');
    if (q.type === 'content') { ask.textContent = q.summary; ask.classList.remove('hidden'); return; }
    ask.textContent = g.stage === 'chapter' ? t('nakhgame.ask_chapter', { book: NakhRefs.BOOKS[q.book].fr }) : t('nakhgame.ask');
    ask.classList.toggle('hidden', !!g.resolved);
}

// Les versets montrés ; `scroll` : amener le dernier ajouté à l'écran (après un indice).
function nakhgameDrawVerses(scroll) {
    const g = nakhgame;
    const box = document.getElementById('nakhgame-verses');
    toolClear(box);
    if (g.mode === 'content') return;     // mode Contenu : pas de verset, le résumé est dans l'intitulé
    NakhGameCore.shownVerses(nakhgameFiles, g).forEach((v, i) => {
        const card = document.createElement('div');
        card.className = 'parashagame-verse';
        const small = document.createElement('small');
        small.textContent = t('nakhgame.verse_n', { n: i + 1 });
        card.appendChild(small);
        const he = document.createElement('p');
        he.className = 'parashagame-he';
        he.lang = 'he'; he.dir = 'rtl';
        he.textContent = v.he;
        card.appendChild(he);
        if (nakhgameFr && v.fr) {
            const fr = document.createElement('p');
            fr.className = 'parashagame-fr';
            fr.textContent = v.fr;
            card.appendChild(fr);
        }
        box.appendChild(card);
        // Une fois la question résolue, la référence de chaque verset peut s'afficher sans rien révéler de plus.
        if (g.resolved) small.textContent += ' · ' + v.ref;
    });
    if (scroll && box.lastElementChild && box.lastElementChild.scrollIntoView) box.lastElementChild.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// Les points en jeu et le bouton d'indice.
function nakhgameDrawControls() {
    const g = nakhgame;
    document.getElementById('nakhgame-points').textContent = t('nakhgame.points', { n: g.points });
    const hint = document.getElementById('nakhgame-hint');
    if (g.mode === 'content') { hint.classList.add('hidden'); return; }     // mode Contenu : pas d'indice
    const left = NakhGameCore.MAX_HINTS - (g.shown - 1);
    hint.disabled = !!g.resolved || left <= 0;
    hint.classList.toggle('hidden', !!g.resolved);
    hint.textContent = left <= 0 ? t('nakhgame.hint_none')
        : t(g.points - NakhGameCore.HINT_COST <= 0 ? 'nakhgame.hint_last' : 'nakhgame.hint', { cost: NakhGameCore.HINT_COST });
}

// Le choix du livre : Neviim ou Ketouvim, puis la grille des livres du groupe.
function nakhgameDrawBooks() {
    const g = nakhgame;
    const picking = !g.resolved && g.stage === 'book';
    document.getElementById('nakhgame-sections').classList.toggle('hidden', !picking);
    const grid = document.getElementById('nakhgame-books');
    toolClear(grid);
    grid.classList.toggle('hidden', !picking);
    if (!picking) return;
    QuizUI.chips('nakhgame', NakhRefs.GROUPS.map(gr => ({ id: gr.id, label: gr.fr, he: gr.he })), nakhgameGroup, id => { nakhgameGroup = id; nakhgameDrawBooks(); });
    if (!nakhgameGroup) {
        const hintText = document.createElement('p');
        hintText.className = 'tool-small';
        hintText.textContent = t('nakhgame.pick_book');
        hintText.style.gridColumn = '1 / -1';
        grid.appendChild(hintText);
        return;
    }
    NakhRefs.inGroup(nakhgameGroup).forEach(i => {
        const b = NakhRefs.BOOKS[i];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'parashagame-par';
        btn.dataset.index = String(i);
        btn.appendChild(document.createTextNode(b.fr));
        const he = document.createElement('span');
        he.className = 'he'; he.lang = 'he'; he.dir = 'rtl';
        he.textContent = b.he;
        btn.appendChild(he);
        if (g.wrong.indexOf(i) >= 0) { btn.classList.add('wrong'); btn.disabled = true; }
        btn.onclick = () => nakhgameGuessBook(i);
        grid.appendChild(btn);
    });
}

// --- Le chapitre (mode « Livre et chapitre ») ------------------------------------------------------------------------------------------------------
// Le sélecteur : le numéro en grand, une barre, des boutons − et + (et ±10 dans un grand livre), « Valider ». Le chapitre de départ est le milieu du livre.
function nakhgameDrawChapter() {
    const g = nakhgame;
    const box = document.getElementById('nakhgame-chapter');
    toolClear(box);
    const q = NakhGameCore.question(g);
    const on = !g.resolved && g.stage === 'chapter';
    box.classList.toggle('hidden', !on);
    if (!on) return;
    nakhgameChapter = Math.ceil(q.chapters / 2);
    const value = document.createElement('p');
    value.id = 'nakhgame-chapter-value';
    value.className = 'nakhgame-chapter-value';
    value.setAttribute('aria-live', 'polite');
    box.appendChild(value);
    const row = document.createElement('div');
    row.className = 'nakhgame-chapter-row';
    const step = (label, delta, aria) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'tool-history-chip';
        b.textContent = label;
        b.setAttribute('aria-label', t('nakhgame.' + aria));
        b.onclick = () => nakhgameChapterSet(nakhgameChapter + delta);
        return b;
    };
    const big = q.chapters > 30;
    if (big) row.appendChild(step('−10', -10, 'chapter_minus10'));
    row.appendChild(step('‹', -1, 'chapter_minus'));
    const range = document.createElement('input');
    range.type = 'range';
    range.id = 'nakhgame-chapter-range';
    range.min = '1'; range.max = String(q.chapters); range.step = '1';
    range.value = String(nakhgameChapter);
    range.setAttribute('aria-label', t('nakhgame.chapter_aria'));
    range.oninput = () => nakhgameChapterSet(Number(range.value));
    row.appendChild(range);
    row.appendChild(step('›', 1, 'chapter_plus'));
    if (big) row.appendChild(step('+10', 10, 'chapter_plus10'));
    box.appendChild(row);
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'btn';
    ok.id = 'nakhgame-chapter-ok';
    ok.textContent = t('nakhgame.chapter_ok');
    ok.onclick = nakhgameChapterOk;
    box.appendChild(ok);
    nakhgameChapterSet(nakhgameChapter);
}

// Le chapitre choisi, ramené à l'intervalle du livre.
function nakhgameChapterSet(n) {
    const q = nakhgame && NakhGameCore.question(nakhgame);
    if (!q) return;
    nakhgameChapter = Math.min(q.chapters, Math.max(1, Math.round(n) || 1));
    const range = document.getElementById('nakhgame-chapter-range');
    if (range) range.value = String(nakhgameChapter);
    const value = document.getElementById('nakhgame-chapter-value');
    if (value) value.textContent = t('nakhgame.chapter_value', { n: nakhgameChapter, total: q.chapters });
}

function nakhgameChapterOk() {
    const g = nakhgame;
    const events = NakhGameCore.guessChapter(g, nakhgameChapter);
    if (!events.length) return;
    nakhgameResolve();
}

// --- Les réponses ---------------------------------------------------------------------------------------------------------------------------
function nakhgameHint() {
    const g = nakhgame;
    const events = NakhGameCore.hint(g);
    if (!events.length) return;
    nakhgameDrawVerses(true);
    nakhgameDrawControls();
    if (events.includes('revealed')) nakhgameResolve();
}

function nakhgameGuessBook(book) {
    const g = nakhgame;
    const events = NakhGameCore.guessBook(g, book);
    if (!events.length) return;
    // Le bon livre en mode « Livre et chapitre » : on passe au chapitre.
    if (events.includes('book')) {
        arcadeSound('good');
        nakhgameDrawAsk();
        nakhgameDrawBooks();
        nakhgameDrawChapter();
        return;
    }
    arcadeSound(events[0] === 'right' ? 'good' : 'bad');
    if (events.includes('right') || events.includes('revealed')) { nakhgameResolve(); return; }
    // Un mauvais livre : il est écarté et les points baissent.
    nakhgameDrawControls();
    nakhgameDrawBooks();
    document.getElementById('nakhgame-points').textContent += ' · ' + t('nakhgame.wrong_try', { name: NakhRefs.BOOKS[book].fr, cost: NakhGameCore.WRONG_COST });
}

// La question est résolue (bonne réponse, chapitre donné, ou livre dévoilé) : la fiche, le bouton suivant.
function nakhgameResolve() {
    const g = nakhgame;
    const q = NakhGameCore.question(g);
    const right = g.resolved === 'right';
    const b = NakhRefs.BOOKS[q.book];
    nakhgameStatus(g);
    nakhgameDrawAsk();
    nakhgameDrawVerses(false);
    nakhgameDrawControls();
    nakhgameDrawBooks();
    nakhgameDrawChapter();
    if (g.mode === 'chapter' && right) arcadeSound(g.points > 0 ? 'good' : 'bad');
    const feedback = document.getElementById('nakhgame-feedback');
    feedback.classList.toggle('is-wrong', !right || (g.mode === 'chapter' && g.points === 0));
    // Le titre : selon le mode, la distance du chapitre.
    let title;
    if (!right) title = t('nakhgame.revealed');
    else if (g.mode !== 'chapter') title = t('nakhgame.right', { n: g.points });
    else if (g.distance === 0) title = t('nakhgame.right_exact', { n: g.points });
    else if (g.points === 0) title = t('nakhgame.right_far');
    else title = t(g.distance === 1 ? 'nakhgame.right_near_one' : 'nakhgame.right_near_many', { d: g.distance, n: g.points });
    document.getElementById('nakhgame-feedback-title').textContent = title;
    const group = NakhRefs.GROUPS.find(gr => gr.id === b.group).fr;
    const name = { fr: '⁨' + b.fr + '⁩', he: '⁨' + b.he + '⁩', group: group };
    document.getElementById('nakhgame-feedback-text').textContent = q.type === 'content'
        ? t('nakhgame.answer_is_content', Object.assign({ chapter: q.chapter }, name))
        : t('nakhgame.answer_is', Object.assign({ ref: q.label }, name));
    // L'écart du chapitre, quand on l'a donné et qu'il n'est pas exact.
    const note = document.getElementById('nakhgame-feedback-note');
    const gapped = g.mode === 'chapter' && right && g.distance > 0;
    note.textContent = gapped
        ? t('nakhgame.chapter_note', { guess: g.chapterGuess, real: q.chapter, gap: t(g.distance === 1 ? 'nakhgame.gap_one' : 'nakhgame.gap_many', { d: g.distance }), pct: Math.round(g.kept * 100) })
        : '';
    note.classList.toggle('hidden', !gapped);
    const next = document.getElementById('nakhgame-next');
    next.textContent = t(g.index + 1 >= g.questions.length ? 'nakhgame.finish' : 'nakhgame.next');
    feedback.classList.remove('hidden');
    next.focus();
}

function nakhgameContinue() {
    const g = nakhgame;
    if (!g || !g.resolved) return;
    if (NakhGameCore.next(g).includes('done')) { nakhgameFinish(); return; }
    nakhgameRender();
}

// « Lire le chapitre » : ouvre le Tanakh sur le chapitre de la question, « Retour » ramène à la partie en cours.
function nakhgameOpenChapter() {
    const q = nakhgame && NakhGameCore.question(nakhgame);
    if (!q) return;
    toolReturns.tanakh = 'screen-nakhgame';
    tanakhOpenAt(q.file, q.fileChapter);
}

function nakhgameFinish() {
    QuizUI.finish('nakhgame', nakhgame, 'nakhgame');
}
