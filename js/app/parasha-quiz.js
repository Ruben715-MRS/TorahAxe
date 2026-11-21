// =========================================================================
// === « QUIZ DE LA PARACHA » : LE QUIZ PAR NIVEAUX (onglet « Jouer », carte « Aujourd'hui ») ===
// =========================================================================
// Les règles sont dans js/parashaQuizCore.js (pur, testé) ; les questions de chaque paracha, dans data/torah/quiz/<paracha>.json (index.json : la liste). L'écran et son déroulé viennent
// de js/app/quiz-ui.js (préfixe `pquiz`). Ici : le choix de la paracha (celle de la semaine d'abord), le choix du NIVEAU avant de commencer (1 : 100 points, 2 : 200, 3 : 300) : on y reste
// jusqu'au bout, la question (avec l'écriture hébraïque sous chaque réponse quand ce sont des noms), la fiche (la réponse, l'explication, la référence, un lien vers le chapitre) et, à
// plusieurs, la question volée au joueur précédent. Les questions d'une paracha sont chargées une fois.
// Tout ce qui vient des données passe par textContent.

let pquiz = null;
let pquizReturn = 'screen-main';
let pquizIndex = null;            // data/torah/quiz/index.json : { parashot: { slug: { index, fr, counts } } }
let pquizParashot = null;         // data/torah/parashot.json
let pquizData = {};               // slug → le fichier de questions, une fois chargé
let pquizLoading = false;
let pquizSlug = '';               // la paracha choisie
let pquizLevel = 1;               // le niveau choisi (1, 2 ou 3)
let pquizPendingSlug = '';        // une paracha demandée par un autre écran (la carte « Aujourd'hui »)

const PQUIZ_PREFS_KEY = 'torahaxe_pquiz_prefs_v1';
const PQUIZ_STARS = ['★', '★★', '★★★'];

function openParashaQuiz(fromScreen, slug) {
    pquizReturn = fromScreen || 'screen-main';
    pquizPendingSlug = slug || '';
    showScreen('screen-pquiz', 'forward');
    pquizSetup();
}

function pquizBack() { gamesBackTo(pquizReturn); }

const pquizJson = url => fetch(url).then(r => { if (!r.ok) throw new Error(url); return r.json(); });

// Les paracha qui ont un quiz, dans l'ordre de la Torah : [{ slug, index, fr, counts }].
function pquizList() {
    return Object.keys(pquizIndex.parashot).map(slug => Object.assign({ slug: slug }, pquizIndex.parashot[slug])).sort((a, b) => a.index - b.index);
}

// L'indice (dans parashot.json) de la paracha de la semaine, ou -1.
function pquizWeekIndex() {
    try {
        const d = homeDay();
        const indices = TorahCore.parashaForDate(null, new Date(d.civil.year, d.civil.month - 1, d.civil.day), d.israel);
        return indices && indices.length ? indices[0] : -1;
    } catch (e) { return -1; }
}

// La paracha proposée d'abord : celle qu'un autre écran demande, sinon celle de la semaine, sinon la dernière jouée, sinon la première qui a un quiz.
function pquizDefault() {
    const list = pquizList();
    if (!list.length) return '';
    const has = slug => list.some(p => p.slug === slug);
    const raw = QuizUI.loadPrefs(PQUIZ_PREFS_KEY);
    const week = list.find(p => p.index === pquizWeekIndex());
    if (pquizPendingSlug && has(pquizPendingSlug)) return pquizPendingSlug;
    if (week) return week.slug;
    if (raw && has(raw.slug)) return raw.slug;
    return list[0].slug;
}

// --- Les réglages -----------------------------------------------------------------------------------------------------------------------------
function pquizSetup() {
    pquiz = null;
    QuizUI.phase('pquiz', 'setup');
    const raw = QuizUI.loadPrefs(PQUIZ_PREFS_KEY);
    if (raw && ParashaQuizCore.LEVELS.indexOf(raw.level) >= 0) pquizLevel = raw.level;
    pquizDrawLevels();
    const note = document.getElementById('pquiz-load');
    const start = document.getElementById('pquiz-start');
    const multi = document.getElementById('pquiz-multi-open');
    const hide = () => { start.classList.add('hidden'); if (multi) multi.classList.add('hidden'); };
    hide();
    if (pquizIndex && pquizParashot) { pquizSetupDraw(); return; }
    if (pquizLoading) return;
    pquizLoading = true;
    note.textContent = t('pquiz.loading');
    Promise.all([pquizJson('data/torah/quiz/index.json'), pquizJson('data/torah/parashot.json')]).then(all => {
        pquizIndex = all[0];
        pquizParashot = all[1];
        pquizLoading = false;
        if (!document.getElementById('screen-pquiz').classList.contains('hidden') && !pquiz) pquizSetupDraw();
    }).catch(() => { pquizLoading = false; note.textContent = t('pquiz.load_error'); });
}

// La liste des paracha (celles qui ont un quiz sont choisissables ; les autres sont grisées), puis le chargement des questions de la paracha choisie.
function pquizSetupDraw() {
    const select = document.getElementById('pquiz-select');
    toolClear(select);
    const week = pquizWeekIndex();
    const available = pquizIndex.parashot;
    const bySlug = {};
    Object.keys(available).forEach(slug => { bySlug[available[slug].index] = slug; });
    pquizParashot.parashot.forEach((p, i) => {
        const option = document.createElement('option');
        const slug = bySlug[i];
        option.value = slug || '';
        option.disabled = !slug;
        option.textContent = p.fr + ' · ' + p.he + (i === week ? ' · ' + t('pquiz.this_week') : '') + (slug ? '' : ' · ' + t('pquiz.soon'));
        select.appendChild(option);
    });
    pquizSlug = pquizDefault();
    if (pquizSlug) select.value = pquizSlug;
    pquizPendingSlug = '';
    pquizChoose(pquizSlug);
}

function pquizOnSelect() {
    const slug = document.getElementById('pquiz-select').value;
    if (slug) pquizChoose(slug);
}

function pquizChoose(slug) {
    const note = document.getElementById('pquiz-load');
    const start = document.getElementById('pquiz-start');
    const multi = document.getElementById('pquiz-multi-open');
    pquizSlug = slug;
    start.classList.add('hidden');
    if (multi) multi.classList.add('hidden');
    if (!slug) { note.textContent = t('pquiz.none'); return; }
    pquizSavePrefs();
    const ready = () => {
        if (pquizSlug !== slug) return;
        pquizCountNote();
        start.classList.remove('hidden');
        if (multi) multi.classList.remove('hidden');
    };
    if (pquizData[slug]) { ready(); return; }
    note.textContent = t('pquiz.loading');
    pquizJson('data/torah/quiz/' + slug + '.json').then(data => { pquizData[slug] = data; ready(); }).catch(() => { note.textContent = t('pquiz.load_error'); });
}

function pquizSavePrefs() { QuizUI.savePrefs(PQUIZ_PREFS_KEY, { slug: pquizSlug, level: pquizLevel }); }

// Les trois niveaux, à choisir avant de commencer : on y reste jusqu'au bout.
function pquizDrawLevels() {
    QuizUI.chips('pquiz', ParashaQuizCore.LEVELS.map(level => ({ id: String(level), label: t('pquiz.level_chip_' + level, { points: ParashaQuizCore.pointsOf(level) }) })), String(pquizLevel), id => pquizSetLevel(Number(id)));
}

function pquizSetLevel(level) {
    if (ParashaQuizCore.LEVELS.indexOf(level) < 0) return;
    pquizLevel = level;
    pquizSavePrefs();
    pquizDrawLevels();
    pquizCountNote();
}

// « 5 questions de niveau 2 (200 points chacune) », une fois les questions de la paracha chargées.
function pquizCountNote() {
    const note = document.getElementById('pquiz-load');
    if (!pquizSlug || !pquizData[pquizSlug]) return;
    const n = ParashaQuizCore.poolOf(pquizData[pquizSlug], pquizLevel).length;
    note.textContent = t('pquiz.counts', { n: n, level: pquizLevel, points: ParashaQuizCore.pointsOf(pquizLevel) });
}

// Lance la partie (à plusieurs, `QuizUI.multiStartWith` l'appelle après avoir annoncé les joueurs : la partie doit donc être créée ici, tout de suite).
function pquizStart() {
    if (!pquizSlug || !pquizData[pquizSlug]) return;
    pquiz = ParashaQuizCore.createGame({ data: pquizData[pquizSlug], level: pquizLevel });
    QuizUI.phase('pquiz', 'play');
    pquizRender();
}

// --- Le déroulé -------------------------------------------------------------------------------------------------------------------------------
function pquizEl(id) { return document.getElementById('pquiz-' + id); }

// La question en cours (la suivante du niveau choisi, ou celle que le joueur précédent a ratée et qu'on lui vole).
function pquizRender() {
    const g = pquiz;
    QuizUI.status('pquiz', g);
    pquizEl('feedback').classList.add('hidden');
    pquizDrawQuestion();
}

function pquizDrawQuestion() {
    const g = pquiz;
    const q = ParashaQuizCore.question(g);
    const stars = t('pquiz.badge', { n: q.level, stars: PQUIZ_STARS[q.level - 1], points: ParashaQuizCore.pointsOf(q.level) });
    pquizEl('badge').textContent = q.steal ? t('pquiz.steal', { name: pquizStolenFrom() }) + ' · ' + stars : stars;
    pquizEl('question').textContent = q.q;
    // Les noms de personnes et de lieux ont leur écriture hébraïque sous le nom (QuizUI.options l'affiche).
    QuizUI.options('pquiz', q, option => ({ label: option.label, he: option.he || '' }), pquizAnswer);
}

// Le joueur à qui la question a été volée : celui du tour précédent.
function pquizStolenFrom() {
    const g = pquiz;
    const n = g.multi.players.length;
    return g.multi.players[(g.index - 1 + n) % n].name;
}

// La fiche : la bonne réponse (et les points), l'explication, la source.
function pquizInfo(q, right) {
    const where = LibraryRefs.label(q.ref);
    const a = q.ah ? q.a + ' (' + q.ah + ')' : q.a;
    return {
        line: right ? t('pquiz.right_line', { a: a, points: ParashaQuizCore.pointsOf(q.level) }) : t('pquiz.wrong_line', { a: a }),
        extra: q.x,
        note: q.rashi ? t('pquiz.source_rashi', { ref: where }) : t('pquiz.source', { ref: where })
    };
}

// Les références écrites « 29:24 » deviennent « Genèse 29:24 » (le livre de la paracha en cours).
const LibraryRefs = {
    label: ref => {
        const p = pquizParashot ? pquizParashot.parashot[pquizIndex.parashot[pquizSlug].index] : null;
        return (p ? TorahRefs.BOOK_NAMES[p.book - 1] + ' ' : '') + ref;
    }
};

function pquizAnswer(choice) {
    const g = pquiz;
    if (!ParashaQuizCore.answer(g, choice).length) return;
    const q = ParashaQuizCore.question(g);
    QuizUI.resolve('pquiz', g, q, choice, pquizInfo(q, g.resolved === 'right'));
}

// « Voir le chapitre » : ouvre le Tanakh au chapitre de la question ; le retour ramène au quiz.
function pquizOpenChapter() {
    const g = pquiz;
    const q = g && ParashaQuizCore.question(g);
    if (!q) return;
    const p = pquizParashot.parashot[pquizIndex.parashot[pquizSlug].index];
    toolReturns.tanakh = 'screen-pquiz';
    tanakhOpenAt(TorahRefs.BOOK_IDS[p.book - 1], ParashaQuizCore.parseRef(q.ref).from.c - 1, 'both');
}

function pquizContinue() {
    const g = pquiz;
    if (!g || !g.resolved) return;
    if (ParashaQuizCore.next(g).includes('done')) { QuizUI.finish('pquiz', g, 'pquiz'); return; }
    pquizRender();
}
