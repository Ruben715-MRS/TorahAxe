// =========================================================================
// === PROGRESSION : SÉRIE DE JOURS, NIVEAUX PAR DOMAINE, BADGES (écran « Ma progression ») ===
// =========================================================================
// Le calcul est dans js/progressCore.js (pur, testé). Ici : le registre (localStorage, `torahaxe_progress_v1`), l'enregistrement d'une partie terminée (`progressRecord`, appelé à la
// fin de chaque jeu : par QuizUI.finish pour les jeux à questions, par la roue des fêtes et par les frises), le résumé qu'on affiche en fin de partie, la carte « Série » de l'accueil
// et l'écran de progression. Le jour est celui de l'accueil (le lieu de l'écran Zmanim, ou l'appareil). Tout ce qui vient des données passe par textContent.

const PROGRESS_KEY = 'torahaxe_progress_v1';

function progressStore() { return ProgressCore.normalize(QuizUI.loadPrefs(PROGRESS_KEY)); }

function progressToday() {
    const d = homeDay();
    return { civil: d.civil, israel: d.israel };
}

// La série d'aujourd'hui : { current, longest, status, lastActive }.
function progressStreak() {
    const d = progressToday();
    return ProgressCore.streak(progressStore(), d.civil, d.israel);
}

function progressDomainName(id) { return t('progress.domain_' + id); }

function progressStreakText(n) { return t(n === 1 ? 'progress.streak_one' : 'progress.streak_many', { n: n }); }

// Une partie terminée : on l'enregistre et on renvoie le résumé à afficher en fin de partie (« +82 points d'expérience · Série : 4 jours · Nouveau badge : … »). Ne lève jamais :
// un registre qui ne s'écrit pas ne doit jamais gêner la fin d'une partie. `xp` (facultatif) remplace le calcul d'après le score.
function progressRecord(game, score, max, xp) {
    try {
        if (!ProgressCore.GAMES[game]) return '';
        const d = progressToday();
        const before = progressStore();
        const play = { date: d.civil, game: game, score: score, max: max };
        if (xp !== undefined) play.xp = xp;
        const after = ProgressCore.record(before, play);
        QuizUI.savePrefs(PROGRESS_KEY, after);
        const change = ProgressCore.changes(before, after, d.civil, d.civil, d.israel);
        const gained = xp !== undefined ? xp : ProgressCore.xpOf(score, max);
        const parts = [t('progress.gain_xp', { xp: gained })];
        if (change.streak.status === 'frozen') parts.push(t('progress.gain_frozen'));
        else if (change.streak.current > 0) parts.push(t('progress.gain_streak', { n: progressStreakText(change.streak.current) }));
        change.levelUps.forEach(u => parts.push(t('progress.gain_level', { n: u.level, domain: progressDomainName(u.domain) })));
        change.newBadges.forEach(id => parts.push(t('progress.gain_badge', { name: t('progress.badge_' + id) })));
        return parts.join(' · ');
    } catch (e) { return ''; }
}

// --- L'écran -----------------------------------------------------------------------------------------------------------------------------------
let progressReturn = 'screen-main';

function openProgress(fromScreen) {
    progressReturn = fromScreen || 'screen-main';
    showScreen('screen-progress', 'forward');
    progressRender();
}

function progressBack() { gamesBackTo(progressReturn); }

function pEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

function progressRender() {
    const body = document.getElementById('progress-body');
    toolClear(body);
    const d = progressToday();
    const store = progressStore();
    const streak = ProgressCore.streak(store, d.civil, d.israel);

    // La série.
    const streakBox = pEl('section', 'progress-card progress-streak is-' + streak.status);
    streakBox.appendChild(pEl('small', '', t('progress.streak_title')));
    streakBox.appendChild(pEl('strong', 'progress-big', progressStreakText(streak.current)));
    streakBox.appendChild(pEl('p', 'tool-small', t('progress.status_' + streak.status)));
    streakBox.appendChild(pEl('p', 'tool-small', t('progress.streak_best', { n: progressStreakText(streak.longest) })));
    streakBox.appendChild(pEl('p', 'tool-small progress-rule', t('progress.rule')));
    body.appendChild(streakBox);

    // Les niveaux par domaine.
    body.appendChild(pEl('h2', 'home-section-title', t('progress.levels_title')));
    const levels = ProgressCore.domainLevels(store);
    ProgressCore.DOMAINS.forEach(dom => {
        const lv = levels[dom.id];
        const row = pEl('div', 'progress-card progress-level');
        const head = pEl('div', 'progress-level-head');
        const name = pEl('strong', '', progressDomainName(dom.id));
        const he = pEl('span', 'he', dom.he);
        he.lang = 'he'; he.dir = 'rtl';
        head.appendChild(name);
        head.appendChild(he);
        head.appendChild(pEl('span', 'progress-level-n', t(lv.to === null ? 'progress.level_max' : 'progress.level', { n: lv.level })));
        row.appendChild(head);
        const bar = pEl('div', 'lexgame-bar');
        bar.setAttribute('role', 'progressbar');
        bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '100'); bar.setAttribute('aria-valuenow', String(lv.pct));
        bar.setAttribute('aria-label', progressDomainName(dom.id));
        const fill = document.createElement('i');
        fill.style.width = lv.pct + '%';
        bar.appendChild(fill);
        row.appendChild(bar);
        row.appendChild(pEl('p', 'tool-small', t('progress.xp', { xp: lv.xp }) + (lv.to === null ? '' : ' · ' + t('progress.to_next', { n: lv.to - lv.xp, next: lv.level + 1 }))));
        body.appendChild(row);
    });

    // Les badges.
    const badges = ProgressCore.badges(store, streak);
    body.appendChild(pEl('h2', 'home-section-title', t('progress.badges_title') + ' · ' + t('progress.earned_count', { n: badges.filter(b => b.earned).length, total: badges.length })));
    const grid = pEl('div', 'progress-badges');
    badges.forEach(b => {
        const card = pEl('div', 'progress-badge' + (b.earned ? ' is-earned' : ''));
        card.appendChild(pEl('strong', '', t('progress.badge_' + b.id)));
        card.appendChild(pEl('span', 'tool-small', t('progress.badge_' + b.id + '_desc')));
        card.appendChild(pEl('em', '', b.earned ? '✓' : t('progress.badge_progress', { value: b.value, target: b.target })));
        grid.appendChild(card);
    });
    body.appendChild(grid);

    // En chiffres.
    const stats = ProgressCore.statsOf(store, streak);
    body.appendChild(pEl('h2', 'home-section-title', t('progress.stats_title')));
    const list = pEl('div', 'progress-card');
    [t('progress.stat_games', { n: stats.games }), t('progress.stat_perfect', { n: stats.perfect }), t('progress.stat_days', { n: stats.days })].forEach(line => list.appendChild(pEl('p', '', line)));
    body.appendChild(list);
}
