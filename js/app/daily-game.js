// =========================================================================
// === « DÉFI DU JOUR » : CINQ QUESTIONS SUR LA DATE (onglet « Aujourd'hui » et onglet « Jouer ») ===
// =========================================================================
// Les règles, le tirage du jour et le registre sont dans js/dailyGameCore.js (pur, testé). Ici : le contexte du jour (le jour et le lieu de l'écran Zmanim, comme l'accueil), les
// noms (mois et fêtes, de ui/fr.json), l'écran de jeu (son déroulé vient de js/app/quiz-ui.js, préfixe `dailygame`) et l'enregistrement du premier défi terminé de chaque jour
// (localStorage, `torahaxe_daily_v1`). Pas de défi le Chabbat ni les jours de fête : l'écran le dit et ne propose rien.
// La carte de l'accueil (js/app/home.js) lit `dailygameResult()` et `dailygameIsRestDay()`.

let dailygame = null;
let dailygameReturn = 'screen-main';
let dailygameData = null;        // { calendar, parashot } : data/torah/calendar.json et parashot.json, une fois chargés
let dailygameLoading = false;
let dailygameCtx = null;         // le contexte du défi en cours (la date est figée au lancement)

const DAILYGAME_KEY = 'torahaxe_daily_v1';

// Les noms de l'interface : mois hébraïques et fêtes (ui/fr.json).
const DAILYGAME_NAMES = {
    month: (year, id) => t('tools.hcal_month_' + HebrewCalendarCore.monthLabelId(year, id)),
    feast: (id, fixed, israel) => t('tools.hcal_f_' + HebrewCalendarCore.feastNameId(id, fixed, israel) + '_name')
};

function dailygameStore() { return DailyGameCore.normalizeStore(QuizUI.loadPrefs(DAILYGAME_KEY)); }

// Le jour et le lieu : ceux de l'accueil (écran Zmanim) ; sans lieu, le jour de l'appareil.
function dailygameDay() {
    const day = homeDay();
    return { civil: day.civil, israel: day.israel, hebrew: day.ctx.hebrew };
}

function dailygameIsRestDay() {
    const d = dailygameDay();
    return DailyGameCore.isRestDay(d.civil, d.israel);
}

// Le résultat du défi d'aujourd'hui : { score, found, total } ou null.
function dailygameResult() {
    return DailyGameCore.resultOf(dailygameStore(), DailyGameCore.dateKey(dailygameDay().civil));
}

function openDailyGame(fromScreen) {
    dailygameReturn = fromScreen || 'screen-main';
    showScreen('screen-dailygame', 'forward');
    dailygameSetup();
}

function dailygameBack() { gamesBackTo(dailygameReturn); }

// Les parachiot et le calendrier des Chabbats : ceux que l'accueil a déjà chargés, sinon on les charge.
function dailygameLoad(then) {
    if (dailygameData) { then(); return; }
    if (typeof homeParasha !== 'undefined' && homeParasha) { dailygameData = homeParasha; then(); return; }
    if (dailygameLoading) return;
    dailygameLoading = true;
    document.getElementById('dailygame-today').textContent = t('dailygame.loading');
    fetch('data/torah/parashot.json').then(r => (r.ok ? r.json() : null)).then(parashot => {
        dailygameLoading = false;
        // Sans paracha, le défi se fait quand même : il lui reste cinq autres questions.
        dailygameData = { calendar: null, parashot: parashot };
        then();
    }).catch(() => { dailygameLoading = false; dailygameData = { calendar: null, parashot: null }; then(); });
}

function dailygameSetup() {
    dailygame = null;
    QuizUI.phase('dailygame', 'setup');
    const d = dailygameDay();
    const hebrew = d.hebrew.day + ' ' + DAILYGAME_NAMES.month(d.hebrew.year, d.hebrew.month) + ' ' + d.hebrew.year;
    const civil = new Date(d.civil.year, d.civil.month - 1, d.civil.day).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    document.getElementById('dailygame-date').textContent = t('dailygame.date', { hebrew: hebrew, civil: civil });
    const start = document.getElementById('dailygame-start');
    const today = document.getElementById('dailygame-today');
    if (dailygameIsRestDay()) { today.textContent = t('dailygame.rest'); start.classList.add('hidden'); return; }
    const done = dailygameResult();
    start.classList.remove('hidden');
    start.textContent = t(done ? 'dailygame.replay' : 'dailygame.start');
    today.textContent = done ? t('dailygame.done', { score: done.score, max: done.total * DailyGameCore.POINTS, found: done.found, total: done.total }) : t('dailygame.today');
}

function dailygameStart() {
    if (dailygameIsRestDay()) return;
    dailygameLoad(() => {
        const d = dailygameDay();
        dailygameCtx = { civil: d.civil, israel: d.israel, calendar: dailygameData.calendar, parashot: dailygameData.parashot, names: DAILYGAME_NAMES };
        dailygame = DailyGameCore.createGame(dailygameCtx);
        QuizUI.phase('dailygame', 'play');
        dailygameRender();
    });
}

function dailygameRender() {
    const g = dailygame;
    const q = DailyGameCore.question(g);
    QuizUI.status('dailygame', g);
    document.getElementById('dailygame-question').textContent = q.ask;
    QuizUI.options('dailygame', q, option => ({ label: option.label, he: option.he }), dailygameAnswer);
}

function dailygameAnswer(choice) {
    const g = dailygame;
    if (!DailyGameCore.answer(g, choice).length) return;
    QuizUI.resolve('dailygame', g, DailyGameCore.question(g), choice, { line: DailyGameCore.question(g).explain });
}

function dailygameContinue() {
    const g = dailygame;
    if (!g || !g.resolved) return;
    if (DailyGameCore.next(g).includes('done')) { dailygameFinish(); return; }
    dailygameRender();
}

function dailygameFinish() {
    // Le premier défi terminé du jour est enregistré ; un défi rejoué ne change rien.
    const before = dailygameStore();
    const after = DailyGameCore.record(before, dailygame);
    const first = !!after.days[dailygame.key] && !before.days[dailygame.key];
    if (first) QuizUI.savePrefs(DAILYGAME_KEY, after);
    QuizUI.finish('dailygame', dailygame, 'daily', t(first ? 'dailygame.recorded' : 'dailygame.not_recorded'));
}
