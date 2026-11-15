// =========================================================================
// === « MOTS HÉBREUX ESSENTIELS » : LE JEU DE VOCABULAIRE HÉBREU (écran de la Salle de jeux, « Jeux religieux ») ===
// =========================================================================
// Les règles sont dans js/lexiconGameCore.js (pur, testé) ; les mots et leurs niveaux de fréquence dans le dictionnaire (js/lexiconCore.js).
// Ici : l'écran, les boutons de réponse et la fiche du mot après chaque réponse. La transcription n'est jamais montrée. Le jeu se lance
// depuis la salle de jeux (`screen-arcade`) ou depuis le dictionnaire (`screen-tool-lexicon`) et rend la main à l'écran d'où il vient.
// Meilleur score : mêmes clés que l'arcade (ArcadeCore.normalizeBest). Tout ce qui vient des données passe par textContent.
//
// La mémoire (étape 2) : chaque réponse est enregistrée aussitôt (js/storage.js, `lexiconRecord`, clé synchronisée avec le compte) dans les
// boîtes de révision espacée ; à l'ouverture, un bilan (« 47 mots sur 107 maîtrisés », les mots à réviser aujourd'hui) ; une partie mêle les mots
// à réviser et des mots nouveaux (LexiconGameCore.chooseSession). Le même bilan s'affiche sur le bouton « S'entraîner » du dictionnaire.
//
// Les extensions (étape 3) : cinq sortes de questions (« que veut dire ce mot ? », le même mot sans voyelles, « comment dit-on… ? », la racine, la
// valeur en guématria), choisies mot par mot selon sa maîtrise ; un réglage « rouleau » (tout sans voyelles) ; le niveau « courants », verrouillé
// jusqu'à 80 % de maîtrise des mots très fréquents. Les réglages (niveau, rouleau) sont propres à l'appareil.

let lexgame = null;
let lexgameReturn = 'screen-arcade';

function openLexiconGame(fromScreen) {
    lexgameReturn = fromScreen || 'screen-arcade';
    showScreen('screen-lexgame', 'forward');
    lexgameLoadPrefs();
    lexgameSetup();
}

function lexgameBack() {
    // Le dictionnaire a pu être rouvert depuis la partie (« Voir dans le dictionnaire ») : son « Retour » mène alors à la partie. Quand on quitte la
    // partie, il retrouve son écran d'origine, sinon les deux écrans se renvoient la balle sans jamais revenir au menu.
    if (toolReturns.lexicon === 'screen-lexgame') toolReturns.lexicon = lexgameDictOrigin;
    gamesBackTo(lexgameReturn);
}

// Les réglages de l'appareil : le niveau de fréquence joué (3 très fréquents, 2 courants, 1 rares, 0 absents de la Torah, chacun une fois débloqué) et le mode « rouleau ».
const LEXGAME_PREFS_KEY = 'historiaxe_lexgame_prefs_v1';
let lexgameLevel = 3;
let lexgameScroll = false;

function lexgameLoadPrefs() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(LEXGAME_PREFS_KEY)); } catch (e) { raw = null; }
    lexgameLevel = LexiconGameCore.clampLevel(raw && raw.level);
    lexgameScroll = !!(raw && raw.scroll);
    // Un niveau verrouillé (progression réinitialisée depuis) n'est pas rejoué.
    if (!LexiconGameCore.unlockInfo(lexiconLoad(), lexgameLevel, Date.now()).unlocked) lexgameLevel = 3;
}

function lexgameSavePrefs() {
    try { localStorage.setItem(LEXGAME_PREFS_KEY, JSON.stringify({ level: lexgameLevel, scroll: lexgameScroll })); } catch (e) { /* stockage indisponible */ }
}

function lexgameSetLevel(level) {
    const lv = LexiconGameCore.clampLevel(level);
    if (!LexiconGameCore.unlockInfo(lexiconLoad(), lv, Date.now()).unlocked) return;
    lexgameLevel = lv;
    lexgameSavePrefs();
    lexgameSetup();
}

function lexgameToggleScroll() {
    lexgameScroll = document.getElementById('lexgame-scroll').checked;
    lexgameSavePrefs();
}

// Le bilan : combien de mots maîtrisés, combien à réviser aujourd'hui, combien de nouveaux.
function lexgameSummary(level) {
    return LexiconGameCore.summary(lexiconLoad(), level || lexgameLevel, Date.now());
}

// Le texte court de progression (« 47 mots sur 107 maîtrisés », « 1 mot sur 107 maîtrisé »), repris par le dictionnaire.
function lexgameProgressLabel(mastered, total) {
    return t(mastered < 2 ? 'lexgame.progress_one' : 'lexgame.progress', { mastered: mastered, total: total });
}

function lexgameProgressText() {
    const s = lexgameSummary(3);
    return lexgameProgressLabel(s.mastered, s.total);
}

// Les mots maîtrisés, pour marquer leur carte dans le dictionnaire (un ensemble de numéros de Strong).
function lexgameMasteredSet() {
    const words = LexiconGameCore.normalizeProgress(lexiconLoad()).words;
    return new Set(Object.keys(words).filter(id => LexiconGameCore.isMastered(words[id])));
}

function lexgameSetup() {
    lexgame = null;
    const s = lexgameSummary();
    document.getElementById('lexgame-status').textContent = '';
    document.getElementById('lexgame-play').classList.add('hidden');
    document.getElementById('lexgame-over').classList.add('hidden');
    document.getElementById('lexgame-setup').classList.remove('hidden');
    document.getElementById('lexgame-progress-text').textContent = lexgameProgressLabel(s.mastered, s.total);
    const bar = document.getElementById('lexgame-bar');
    bar.setAttribute('aria-valuemax', String(s.total));
    bar.setAttribute('aria-valuenow', String(s.mastered));
    document.getElementById('lexgame-bar-fill').style.width = (s.total ? Math.round(100 * s.mastered / s.total) : 0) + '%';
    // Ce que la prochaine partie contiendra vraiment (les mots nouveaux dépendent de la place laissée par les mots à réviser).
    const fresh = LexiconGameCore.chooseSession({ progress: lexiconLoad(), level: lexgameLevel, now: Date.now() }).fresh;
    // Le choix du niveau : chacun reste verrouillé tant que 80 % du niveau précédent ne sont pas maîtrisés ; la note dit ce qui manque au premier verrouillé.
    let note = '';
    LexiconGameCore.LEVELS.forEach(level => {
        const info = LexiconGameCore.unlockInfo(lexiconLoad(), level, Date.now());
        const btn = document.getElementById('lexgame-level-' + level);
        btn.setAttribute('aria-pressed', level === lexgameLevel ? 'true' : 'false');
        btn.disabled = !info.unlocked;
        btn.textContent = (info.unlocked ? '' : '🔒 ') + t('tools.lexicon_level_' + level);
        if (!info.unlocked && !note) note = t('lexgame.level_locked', { level: t('tools.lexicon_level_' + level), prev: t('tools.lexicon_level_' + (level + 1)), have: info.have, need: info.need });
    });
    document.getElementById('lexgame-level-note').textContent = note;
    document.getElementById('lexgame-scroll').checked = lexgameScroll;
    document.getElementById('lexgame-today').textContent = s.due > 0
        ? t('lexgame.today', { due: s.due, fresh: fresh })
        : t(s.unseen > 0 ? 'lexgame.today_none' : 'lexgame.today_done', { fresh: fresh });
}

// Une partie : les mots à réviser aujourd'hui, des mots nouveaux, puis des mots à renforcer (LexiconGameCore.chooseSession).
function lexgameStart() {
    const session = LexiconGameCore.chooseSession({ progress: lexiconLoad(), level: lexgameLevel, now: Date.now() });
    lexgame = LexiconGameCore.createGame({ level: lexgameLevel, wordIds: session.wordIds, types: session.types, scroll: lexgameScroll });
    lexgameMasteredBefore = lexgameSummary().mastered;
    document.getElementById('lexgame-setup').classList.add('hidden');
    document.getElementById('lexgame-over').classList.add('hidden');
    document.getElementById('lexgame-play').classList.remove('hidden');
    lexgameRender();
}
let lexgameMasteredBefore = 0;

function lexgameStatus() {
    const g = lexgame;
    document.getElementById('lexgame-status').textContent = t('lexgame.status', { n: g.index + 1, total: g.questions.length, score: g.score });
}

// Le texte de la question, selon sa sorte.
function lexgameAsk(q) {
    if (q.type === 'fr-he') return t('lexgame.ask_fr_he');
    if (q.type === 'scroll') return t('lexgame.ask_scroll');
    if (q.type === 'root') return t('lexgame.ask_root');
    if (q.type === 'value') return t('lexgame.ask_value');
    return t('lexgame.ask_he_fr');
}

function lexgameRender() {
    const g = lexgame;
    const q = LexiconGameCore.question(g);
    lexgameStatus();
    document.getElementById('lexgame-question').textContent = lexgameAsk(q);
    // Le mot hébreu en grand ; pour « comment dit-on… ? », c'est la traduction qui est en grand.
    const word = document.getElementById('lexgame-word');
    const french = q.type === 'fr-he';
    word.textContent = french ? q.prompt : q.shown;
    word.lang = french ? 'fr' : 'he';
    word.dir = french ? 'ltr' : 'rtl';
    word.classList.toggle('is-french', french);
    document.getElementById('lexgame-feedback').classList.add('hidden');
    const box = document.getElementById('lexgame-options');
    box.innerHTML = '';
    q.options.forEach((option, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-option cause-card lexgame-option';
        if (option.lang === 'he') { btn.lang = 'he'; btn.dir = 'rtl'; btn.classList.add('lexgame-option-he'); }
        if (option.lang === 'num') btn.classList.add('lexgame-option-num');
        btn.dataset.choice = String(i);
        btn.textContent = option.label;
        btn.setAttribute('aria-label', t('lexgame.option_aria', { n: i + 1, label: option.label }));
        btn.onclick = () => lexgameAnswer(i);
        box.appendChild(btn);
    });
}

// Ce que la fiche ajoute à la traduction, selon la question : la famille de la racine, ou le détail du calcul en guématria.
function lexgameExtra(q) {
    if (q.type === 'root') {
        const words = LexiconCore.family(q.word.root).map(e => e.he + ' (' + e.fr[0] + ')').join(', ');
        return t('lexgame.family', { root: '\u2068' + q.word.root + '\u2069', words: words });
    }
    if (q.type === 'value') {
        const calc = GematriaCore.compute(q.word.he, 'standard');
        return t('lexgame.value_sum', { sum: calc.letters.map(l => l.value).join(' + '), total: calc.total });
    }
    return '';
}

function lexgameAnswer(choice) {
    const g = lexgame;
    const events = LexiconGameCore.answer(g, choice);
    if (!events.length) return;
    const q = LexiconGameCore.question(g);
    const right = g.resolved === 'right';
    arcadeSound(right ? 'good' : 'bad');
    lexgameStatus();
    // Enregistrée aussitôt : une partie quittée en route n'est pas perdue.
    lexiconRecord(q.strong, right);
    // La bonne réponse en vert, la réponse choisie à tort en rouge.
    document.querySelectorAll('#lexgame-options .lexgame-option').forEach(btn => {
        const i = Number(btn.dataset.choice);
        btn.disabled = true;
        if (i === q.answer) btn.classList.add('correct');
        else if (i === choice) btn.classList.add('wrong');
    });
    // La fiche du mot : toutes ses traductions, sa remarque ; jamais sa transcription.
    const feedback = document.getElementById('lexgame-feedback');
    feedback.classList.toggle('is-wrong', !right);
    document.getElementById('lexgame-feedback-title').textContent = t(right ? 'lexgame.right' : 'lexgame.wrong');
    document.getElementById('lexgame-feedback-text').textContent = q.word.he + ' : ' + q.word.fr.join(' ; ');
    const extra = document.getElementById('lexgame-feedback-extra');
    extra.textContent = lexgameExtra(q);
    extra.classList.toggle('hidden', !extra.textContent);
    const note = document.getElementById('lexgame-feedback-note');
    note.textContent = q.word.note || '';
    note.classList.toggle('hidden', !q.word.note);
    const last = g.index + 1 >= g.questions.length;
    const next = document.getElementById('lexgame-next');
    next.textContent = t(last ? 'lexgame.finish' : 'lexgame.next');
    feedback.classList.remove('hidden');
    next.focus();
}

// Du retour à l'écran du dictionnaire, on retrouve la partie en cours : le bouton « Voir dans le dictionnaire » y mène.
// L'écran d'où le dictionnaire a été ouvert avant la partie (ce que son « Retour » doit retrouver au final).
let lexgameDictOrigin = 'screen-tools';

function lexgameOpenDictionary() {
    const g = lexgame;
    const q = g && LexiconGameCore.question(g);
    if (!q) return;
    if (toolReturns.lexicon !== 'screen-lexgame') lexgameDictOrigin = toolReturns.lexicon || 'screen-tools';
    openTool('lexicon', 'screen-lexgame');
    toolLexiconSearch(q.word.key);
}

function lexgameContinue() {
    const g = lexgame;
    if (!g || !g.resolved) return;
    if (LexiconGameCore.next(g).includes('done')) { lexgameFinish(); return; }
    lexgameRender();
}

function lexgameFinish() {
    const g = lexgame;
    const best = arcadeRecord('lexicon', g.score);
    document.getElementById('lexgame-play').classList.add('hidden');
    document.getElementById('lexgame-status').textContent = '';
    document.getElementById('lexgame-over-text').textContent =
        t('lexgame.found', { found: g.found, total: g.questions.length, score: g.score }) + ' ' + t('arcade.best', { score: best.lexicon });
    // Le bilan de la mémoire : les mots maîtrisés, et ce que la partie en a ajouté.
    const s = lexgameSummary();
    const gain = Math.max(0, s.mastered - lexgameMasteredBefore);
    document.getElementById('lexgame-over-progress').textContent = lexgameProgressLabel(s.mastered, s.total)
        + (gain > 0 ? ' ' + t('lexgame.gain', { n: gain }) : '');
    document.getElementById('lexgame-over').classList.remove('hidden');
    // La progression part vers le compte (comme après chaque partie).
    if (typeof syncPushProgress === 'function') syncPushProgress();
}
