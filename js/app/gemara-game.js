// =========================================================================
// === « MOTS DE LA GUÉMARA » : LE JEU D'ENTRAÎNEMENT (écran de la Salle de jeux, « Jeux religieux ») ===
// =========================================================================
// Les règles sont dans js/gemaraGameCore.js (pur, testé) ; le contenu dans le dictionnaire araméen (js/gemaraCore.js : mots, abréviations, sages).
// Ici : l'écran, les boutons de réponse et la fiche de la carte après chaque réponse. Le jeu se lance depuis la salle de jeux (`screen-arcade`) ou depuis
// le dictionnaire araméen (`screen-tool-gemara`) et rend la main à l'écran d'où il vient. Meilleur score : mêmes clés que l'arcade
// (ArcadeCore.normalizeBest, clé `gemara`). Tout ce qui vient des données passe par textContent, jamais par du HTML.
//
// La mémoire : chaque réponse est enregistrée aussitôt (js/storage.js, `gemaraRecord`, clé synchronisée avec le compte) dans les boîtes de révision
// espacée ; à l'ouverture, un bilan (« 12 cartes sur 108 maîtrisées », les cartes à réviser aujourd'hui) ; une partie mêle les cartes à réviser et des
// cartes nouvelles (GemaraGameCore.chooseSession). On choisit la section jouée : tout, les mots, les abréviations ou les sages (réglage de l'appareil).

let gemgame = null;
let gemgameReturn = 'screen-arcade';
let gemgameSection = 'all';
let gemgameMasteredBefore = 0;

const GEMGAME_SECTION_KEYS = { all: 'section_all', words: 'section_words', abbr: 'section_abbr', sages: 'section_sages' };

function openGemaraGame(fromScreen) {
    gemgameReturn = fromScreen || 'screen-arcade';
    showScreen('screen-gemgame', 'forward');
    gemgameLoadPrefs();
    gemgameSetup();
}

function gemgameBack() {
    gamesBackTo(gemgameReturn);
}

// Le réglage de l'appareil : la section jouée.
function gemgameLoadPrefs() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(GEMARA_PREFS_KEY)); } catch (e) { raw = null; }
    gemgameSection = raw && GemaraGameCore.SECTIONS.indexOf(raw.section) >= 0 ? raw.section : 'all';
}

function gemgameSavePrefs() {
    try { localStorage.setItem(GEMARA_PREFS_KEY, JSON.stringify({ section: gemgameSection })); } catch (e) { /* stockage indisponible */ }
}

function gemgameSetSection(section) {
    if (GemaraGameCore.SECTIONS.indexOf(section) < 0) return;
    gemgameSection = section;
    gemgameSavePrefs();
    gemgameSetup();
}

// Le bilan : combien de cartes maîtrisées, combien à réviser aujourd'hui, combien de nouvelles.
function gemgameSummary(section) {
    return GemaraGameCore.summary(gemaraLoad(), section || gemgameSection, Date.now());
}

// Le texte court de progression (« 12 cartes sur 108 maîtrisées », « 1 carte sur 108 maîtrisée »), repris par le dictionnaire.
function gemgameProgressLabel(mastered, total) {
    return t(mastered < 2 ? 'gemgame.progress_one' : 'gemgame.progress', { mastered: mastered, total: total });
}

function gemgameProgressText() {
    const s = gemgameSummary('all');
    return gemgameProgressLabel(s.mastered, s.total);
}

// Les cartes maîtrisées, pour marquer leur fiche dans le dictionnaire (un ensemble d'identifiants : « w:… », « a:… », « s:… »).
function gemgameMasteredSet() {
    const cards = GemaraGameCore.normalizeProgress(gemaraLoad()).cards;
    return new Set(Object.keys(cards).filter(id => GemaraGameCore.isMastered(cards[id])));
}

function gemgameSetup() {
    gemgame = null;
    const s = gemgameSummary();
    document.getElementById('gemgame-status').textContent = '';
    document.getElementById('gemgame-play').classList.add('hidden');
    document.getElementById('gemgame-over').classList.add('hidden');
    document.getElementById('gemgame-setup').classList.remove('hidden');
    document.getElementById('gemgame-progress-text').textContent = gemgameProgressLabel(s.mastered, s.total);
    const bar = document.getElementById('gemgame-bar');
    bar.setAttribute('aria-valuemax', String(s.total));
    bar.setAttribute('aria-valuenow', String(s.mastered));
    document.getElementById('gemgame-bar-fill').style.width = (s.total ? Math.round(100 * s.mastered / s.total) : 0) + '%';
    // Ce que la prochaine partie contiendra vraiment (les cartes nouvelles dépendent de la place laissée par les cartes à réviser).
    const fresh = GemaraGameCore.chooseSession({ progress: gemaraLoad(), section: gemgameSection, now: Date.now() }).fresh;
    // Le choix de la section : tout, les mots, les abréviations ou les sages, avec leur effectif.
    const holder = document.getElementById('gemgame-sections');
    toolClear(holder);
    GemaraGameCore.SECTIONS.forEach(section => {
        const total = GemaraGameCore.cards(section).length;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-history-chip';
        btn.id = 'gemgame-section-' + section;
        btn.setAttribute('aria-pressed', section === gemgameSection ? 'true' : 'false');
        btn.textContent = t('gemgame.' + GEMGAME_SECTION_KEYS[section]) + ' (' + total + ')';
        btn.onclick = () => gemgameSetSection(section);
        holder.appendChild(btn);
    });
    document.getElementById('gemgame-today').textContent = s.due > 0
        ? t('gemgame.today', { due: s.due, fresh: fresh })
        : t(s.unseen > 0 ? 'gemgame.today_none' : 'gemgame.today_done', { fresh: fresh });
}

// Une partie : les cartes à réviser aujourd'hui, des cartes nouvelles, puis des cartes à renforcer (GemaraGameCore.chooseSession).
function gemgameStart() {
    const session = GemaraGameCore.chooseSession({ progress: gemaraLoad(), section: gemgameSection, now: Date.now() });
    gemgame = GemaraGameCore.createGame({ section: gemgameSection, cardIds: session.cardIds, types: session.types });
    gemgameMasteredBefore = gemgameSummary().mastered;
    document.getElementById('gemgame-setup').classList.add('hidden');
    document.getElementById('gemgame-over').classList.add('hidden');
    document.getElementById('gemgame-play').classList.remove('hidden');
    gemgameRender();
}

function gemgameStatus() {
    const g = gemgame;
    document.getElementById('gemgame-status').textContent = t('gemgame.status', { n: g.index + 1, total: g.questions.length, score: g.score });
}

// Le texte de la question, selon sa sorte.
function gemgameAsk(q) {
    return t('gemgame.ask_' + q.type.replace('-', '_'));
}

// Le libellé d'une proposition : une traduction ou un mot tels quels, ou (époque d'un sage) le nom du groupe.
function gemgameOptionLabel(option) {
    return option.lang === 'grp' ? t('tools.gemara_grp_' + option.label) : option.label;
}

function gemgameRender() {
    const g = gemgame;
    const q = GemaraGameCore.question(g);
    gemgameStatus();
    document.getElementById('gemgame-question').textContent = gemgameAsk(q);
    // Le mot, le sigle ou le nom hébreu en grand ; pour les questions « en français », c'est la traduction ou le nom français.
    const word = document.getElementById('gemgame-word');
    const french = q.shownLang === 'fr';
    word.textContent = q.shown;
    word.lang = french ? 'fr' : 'he';
    word.dir = french ? 'ltr' : 'rtl';
    word.classList.toggle('is-french', french);
    document.getElementById('gemgame-feedback').classList.add('hidden');
    const box = document.getElementById('gemgame-options');
    toolClear(box);
    q.options.forEach((option, i) => {
        const label = gemgameOptionLabel(option);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-option cause-card lexgame-option';
        if (option.lang === 'he') { btn.lang = 'he'; btn.dir = 'rtl'; btn.classList.add('lexgame-option-he'); }
        btn.dataset.choice = String(i);
        btn.textContent = label;
        btn.setAttribute('aria-label', t('gemgame.option_aria', { n: i + 1, label: label }));
        btn.onclick = () => gemgameAnswer(i);
        box.appendChild(btn);
    });
}

// Les mots hébreux ou araméens, isolés dans une phrase française (sans quoi le « : » qui suit se glisse dans la lecture de droite à gauche).
function gemgameIsolate(text) { return '⁨' + text + '⁩'; }

// La fiche de la carte après la réponse : une ligne, et une remarque (celle du dictionnaire, ou la biographie d'un sage).
function gemgameCardInfo(card) {
    const r = card.ref;
    if (card.kind === 'w') return { line: gemgameIsolate(r.he) + ' : ' + r.fr.join(' ; '), note: r.note || '' };
    if (card.kind === 'a') return { line: gemgameIsolate(r.sigle) + ' = ' + gemgameIsolate(r.full) + ' : ' + r.fr.join(' ; '), note: r.note || '' };
    return { line: gemgameIsolate(r.he) + ' : ' + r.name + ' — ' + t('tools.gemara_grp_' + r.grp) + ', ' + r.period, note: r.bio };
}

function gemgameAnswer(choice) {
    const g = gemgame;
    const events = GemaraGameCore.answer(g, choice);
    if (!events.length) return;
    const q = GemaraGameCore.question(g);
    const right = g.resolved === 'right';
    arcadeSound(right ? 'good' : 'bad');
    gemgameStatus();
    // Enregistrée aussitôt : une partie quittée en route n'est pas perdue.
    gemaraRecord(q.id, right);
    // La bonne réponse en vert, la réponse choisie à tort en rouge.
    document.querySelectorAll('#gemgame-options .lexgame-option').forEach(btn => {
        const i = Number(btn.dataset.choice);
        btn.disabled = true;
        if (i === q.answer) btn.classList.add('correct');
        else if (i === choice) btn.classList.add('wrong');
    });
    const feedback = document.getElementById('gemgame-feedback');
    feedback.classList.toggle('is-wrong', !right);
    document.getElementById('gemgame-feedback-title').textContent = t(right ? 'gemgame.right' : 'gemgame.wrong');
    const info = gemgameCardInfo(q.card);
    document.getElementById('gemgame-feedback-text').textContent = info.line;
    const note = document.getElementById('gemgame-feedback-note');
    note.textContent = info.note;
    note.classList.toggle('hidden', !info.note);
    const last = g.index + 1 >= g.questions.length;
    const next = document.getElementById('gemgame-next');
    next.textContent = t(last ? 'gemgame.finish' : 'gemgame.next');
    feedback.classList.remove('hidden');
    next.focus();
}

// Du retour à l'écran du dictionnaire, on retrouve la partie en cours : le bouton « Voir dans le dictionnaire » y mène, sur le bon onglet.
function gemgameOpenDictionary() {
    const g = gemgame;
    const q = g && GemaraGameCore.question(g);
    if (!q) return;
    const card = q.card;
    openTool('gemara', 'screen-gemgame');
    if (card.kind === 'a') toolGemaraShow('abbr', card.ref.sigle);
    else if (card.kind === 's') toolGemaraShow('sages', card.ref.name);
    else toolGemaraShow('words', card.ref.he);
}

function gemgameContinue() {
    const g = gemgame;
    if (!g || !g.resolved) return;
    if (GemaraGameCore.next(g).includes('done')) { gemgameFinish(); return; }
    gemgameRender();
}

function gemgameFinish() {
    const g = gemgame;
    const best = arcadeRecord('gemara', g.score);
    document.getElementById('gemgame-play').classList.add('hidden');
    document.getElementById('gemgame-status').textContent = '';
    document.getElementById('gemgame-over-text').textContent =
        t('gemgame.found', { found: g.found, total: g.questions.length, score: g.score }) + ' ' + t('arcade.best', { score: best.gemara });
    // Le bilan de la mémoire : les cartes maîtrisées, et ce que la partie en a ajouté.
    const s = gemgameSummary();
    const gain = Math.max(0, s.mastered - gemgameMasteredBefore);
    document.getElementById('gemgame-over-progress').textContent = gemgameProgressLabel(s.mastered, s.total)
        + (gain > 0 ? ' ' + t('gemgame.gain', { n: gain }) : '');
    document.getElementById('gemgame-over').classList.remove('hidden');
    // La progression part vers le compte (comme après chaque partie).
    if (typeof syncPushProgress === 'function') syncPushProgress();
}
