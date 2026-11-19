// =========================================================================
// === « QUIZ DE LA PARACHA » : LE QUIZ PAR NIVEAUX (onglet « Jouer », carte « Aujourd'hui ») ===
// =========================================================================
// Les règles sont dans js/parashaQuizCore.js (pur, testé) ; les questions de chaque paracha, dans data/torah/quiz/<paracha>.json (index.json : la liste). L'écran et son déroulé viennent
// de js/app/quiz-ui.js (préfixe `pquiz`). Ici : le choix de la paracha (celle de la semaine d'abord), le choix du NIVEAU avant chaque question (1 : 100 points, 2 : 200, 3 : 300), la question,
// la fiche (la réponse, l'explication, la référence, un lien vers le chapitre) et, à plusieurs, la question volée au joueur précédent. Les questions d'une paracha sont chargées une fois.
// Tout ce qui vient des données passe par textContent.

let pquiz = null;
let pquizReturn = 'screen-main';
let pquizIndex = null;            // data/torah/quiz/index.json : { parashot: { slug: { index, fr, counts } } }
let pquizParashot = null;         // data/torah/parashot.json
let pquizData = {};               // slug → le fichier de questions, une fois chargé
let pquizLoading = false;
let pquizSlug = '';               // la paracha choisie
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
    QuizUI.savePrefs(PQUIZ_PREFS_KEY, { slug: slug });
    const ready = () => {
        if (pquizSlug !== slug) return;
        const c = ParashaQuizCore.counts(pquizData[slug]);
        note.textContent = t('pquiz.counts', { n: c[1] + c[2] + c[3] });
        start.classList.remove('hidden');
        if (multi) multi.classList.remove('hidden');
    };
    if (pquizData[slug]) { ready(); return; }
    note.textContent = t('pquiz.loading');
    pquizJson('data/torah/quiz/' + slug + '.json').then(data => { pquizData[slug] = data; ready(); }).catch(() => { note.textContent = t('pquiz.load_error'); });
}

// Lance la partie (à plusieurs, `QuizUI.multiStartWith` l'appelle après avoir annoncé les joueurs : la partie doit donc être créée ici, tout de suite).
function pquizStart() {
    if (!pquizSlug || !pquizData[pquizSlug]) return;
    pquiz = ParashaQuizCore.createGame({ data: pquizData[pquizSlug] });
    QuizUI.phase('pquiz', 'play');
    pquizRender();
}

// --- Le déroulé -------------------------------------------------------------------------------------------------------------------------------
function pquizEl(id) { return document.getElementById('pquiz-' + id); }

// Le tour en cours : le choix du niveau, ou la question (déjà là : tirée, ou volée au joueur précédent).
function pquizRender() {
    const g = pquiz;
    QuizUI.status('pquiz', g);
    pquizEl('feedback').classList.add('hidden');
    if (ParashaQuizCore.pending(g)) {
        if (!ParashaQuizCore.playable(g)) { QuizUI.finish('pquiz', g, 'pquiz'); return; }
        pquizDrawLevels();
        return;
    }
    pquizDrawQuestion();
}

function pquizDrawLevels() {
    const g = pquiz;
    const box = pquizEl('levels');
    const left = ParashaQuizCore.available(g);
    toolClear(box);
    pquizEl('badge').textContent = '';
    pquizEl('question').textContent = t('pquiz.choose_level');
    toolClear(pquizEl('options'));
    ParashaQuizCore.LEVELS.forEach(level => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-option cause-card pquiz-level pquiz-level-' + level;
        btn.disabled = left[level] === 0;
        const title = document.createElement('strong');
        title.textContent = t('pquiz.level', { n: level }) + ' ' + PQUIZ_STARS[level - 1];
        const sub = document.createElement('span');
        sub.textContent = t('pquiz.level_sub_' + level, { points: ParashaQuizCore.pointsOf(level) });
        btn.appendChild(title);
        btn.appendChild(sub);
        btn.setAttribute('aria-label', t('pquiz.level_aria', { n: level, points: ParashaQuizCore.pointsOf(level), left: left[level] }));
        btn.onclick = () => { ParashaQuizCore.choose(g, level); pquizDrawQuestion(); };
        box.appendChild(btn);
    });
}

function pquizDrawQuestion() {
    const g = pquiz;
    const q = ParashaQuizCore.question(g);
    toolClear(pquizEl('levels'));
    const stars = t('pquiz.badge', { n: q.level, stars: PQUIZ_STARS[q.level - 1], points: ParashaQuizCore.pointsOf(q.level) });
    pquizEl('badge').textContent = q.steal ? t('pquiz.steal', { name: pquizStolenFrom() }) + ' · ' + stars : stars;
    pquizEl('question').textContent = q.q;
    QuizUI.options('pquiz', q, option => ({ label: option.label }), pquizAnswer);
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
    return {
        line: right ? t('pquiz.right_line', { a: q.a, points: ParashaQuizCore.pointsOf(q.level) }) : t('pquiz.wrong_line', { a: q.a }),
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
