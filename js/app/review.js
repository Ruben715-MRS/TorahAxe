// =========================================================================
// === « À RÉVISER AUJOURD'HUI » : L'ÉCRAN DE LA RÉVISION COMMUNE ===
// =========================================================================
// Les règles sont dans js/reviewCore.js (pur, testé) ; l'écran partage son déroulé avec les autres jeux (js/app/quiz-ui.js, préfixe `review`). Chaque
// question vient de « Mots du Tanakh » ou de « Mots de la Guémara » (`q.game`) : le texte de la question, la fiche et l'enregistrement de la réponse
// sont ceux du jeu concerné (lexgameAsk, gemgameCardInfo, lexiconRecord…), si bien qu'une réponse met à jour la progression du bon jeu.
// Lancée depuis l'onglet « Jouer » ou la carte de l'onglet « Aujourd'hui » ; rend la main à l'écran d'où elle vient.

let review = null;
let reviewReturn = 'screen-main';

function reviewProgress() { return { lexicon: lexiconLoad(), gemara: gemaraLoad() }; }

// Le bilan du jour : { total, lexicon, gemara, session }. Repris par l'accueil.
function reviewSummary() { return ReviewCore.summary(reviewProgress(), Date.now()); }

function reviewScroll() {
    const raw = QuizUI.loadPrefs(LEXGAME_PREFS_KEY);
    return !!(raw && raw.scroll);
}

function openReview(fromScreen) {
    reviewReturn = fromScreen || 'screen-main';
    showScreen('screen-review', 'forward');
    reviewSetup();
}

function reviewBack() { gamesBackTo(reviewReturn); }

function reviewSetup() {
    review = null;
    const s = reviewSummary();
    QuizUI.phase('review', 'setup');
    document.getElementById('review-progress-text').textContent = s.total ? t('review.progress_due', { total: s.total }) : t('review.progress_none');
    const bar = document.getElementById('review-bar');
    bar.setAttribute('aria-valuemax', String(Math.max(1, s.total)));
    bar.setAttribute('aria-valuenow', '0');
    document.getElementById('review-bar-fill').style.width = '0%';
    document.getElementById('review-today').textContent = s.total ? t('review.due', s) : t('review.none');
    document.getElementById('review-start').classList.toggle('hidden', !s.total);
}

function reviewStart() {
    const before = reviewSummary().total;
    review = ReviewCore.createGame({ progress: reviewProgress(), now: Date.now(), scroll: reviewScroll() });
    if (review.empty) { review = null; reviewSetup(); return; }
    review.dueBefore = before;
    QuizUI.phase('review', 'play');
    reviewRender();
}

function reviewRender() {
    const g = review;
    const q = ReviewCore.question(g);
    QuizUI.status('review', g);
    if (q.game === 'lexicon') {
        document.getElementById('review-question').textContent = lexgameAsk(q);
        const french = q.type === 'fr-he';
        QuizUI.word('review', french ? q.prompt : q.shown, french);
        QuizUI.options('review', q, option => ({ label: option.label, lang: option.lang }), reviewAnswer);
    } else {
        document.getElementById('review-question').textContent = gemgameAsk(q);
        QuizUI.word('review', q.shown, q.shownLang === 'fr');
        QuizUI.options('review', q, option => ({ label: gemgameOptionLabel(option), lang: option.lang }), reviewAnswer);
    }
}

function reviewAnswer(choice) {
    const g = review;
    if (!ReviewCore.answer(g, choice).length) return;
    const q = ReviewCore.question(g);
    const right = g.resolved === 'right';
    // Enregistrée aussitôt dans la progression du jeu d'où vient la question : une séance quittée en route n'est pas perdue.
    if (q.game === 'lexicon') {
        lexiconRecord(q.strong, right);
        QuizUI.resolve('review', g, q, choice, { line: q.word.he + ' : ' + q.word.fr.join(' ; '), extra: lexgameExtra(q), note: q.word.note });
    } else {
        gemaraRecord(q.id, right);
        QuizUI.resolve('review', g, q, choice, gemgameCardInfo(q.card));
    }
}

function reviewContinue() {
    const g = review;
    if (!g || !g.resolved) return;
    if (ReviewCore.next(g).includes('done')) { reviewFinish(); return; }
    reviewRender();
}

function reviewFinish() {
    // Ce qui reste à réviser (les réussites sortent de la liste ; les échecs reviennent demain).
    const left = reviewSummary().total;
    QuizUI.finish('review', review, 'review', left ? t('review.left', { n: left }) : t('review.done'));
    document.getElementById('review-again').classList.toggle('hidden', !left);
}
