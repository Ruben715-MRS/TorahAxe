// =========================================================================
// === « MAÎTRES ET ÉLÈVES » : LE JEU SUR LA CHAÎNE DE TRANSMISSION (onglet « Jouer ») ===
// =========================================================================
// Les règles sont dans js/transmissionGameCore.js (pur, testé) ; le contenu dans la chaîne de transmission (js/transmissionCore.js). L'écran et son déroulé
// viennent de js/app/quiz-ui.js ; ici : le choix de la section et la fiche après chaque réponse. Le jeu se lance depuis l'onglet « Jouer » ou depuis l'écran de la
// chaîne (`screen-tool-transmission`) et rend la main à l'écran d'où il vient. Pas de répétition espacée : les questions sont tirées au hasard dans les liens
// sûrs. Tout ce qui vient des données passe par textContent.

let trgame = null;
let trgameReturn = 'screen-main';
let trgameSection = 'all';

// Le réglage de l'appareil (la section jouée) : cette clé n'était jusqu'ici définie nulle part, donc le choix n'était jamais retenu.
const TRANSMISSION_PREFS_KEY = 'torahaxe_trgame_prefs_v1';

function openTransmissionGame(fromScreen) {
    trgameReturn = fromScreen || 'screen-main';
    showScreen('screen-trgame', 'forward');
    trgameLoadPrefs();
    trgameSetup();
}

function trgameBack() {
    // Venu de l'écran de la chaîne, qui a pu être rouvert depuis la partie (« Voir la chaîne ») : son « Retour » ramène alors à l'Atelier, pas à la partie.
    if (trgameReturn === 'screen-tool-transmission' && toolReturns.transmission === 'screen-trgame') toolReturns.transmission = 'screen-tools';
    gamesBackTo(trgameReturn);
}

// Le réglage de l'appareil : la section jouée.
function trgameLoadPrefs() {
    const raw = QuizUI.loadPrefs(TRANSMISSION_PREFS_KEY);
    trgameSection = raw && TransmissionGameCore.SECTIONS.indexOf(raw.section) >= 0 ? raw.section : 'all';
}

function trgameSetSection(section) {
    if (TransmissionGameCore.SECTIONS.indexOf(section) < 0) return;
    trgameSection = section;
    QuizUI.savePrefs(TRANSMISSION_PREFS_KEY, { section: trgameSection });
    trgameSetup();
}

function trgameSetup() {
    trgame = null;
    QuizUI.phase('trgame', 'setup');
    // Le choix de la section, avec le nombre de maîtres qu'elle montre.
    QuizUI.chips('trgame', TransmissionGameCore.SECTIONS.map(section => ({
        id: section, label: t('trgame.section_' + section) + ' (' + TransmissionGameCore.sagesOf(section).length + ')'
    })), trgameSection, trgameSetSection);
}

function trgameStart() {
    trgame = TransmissionGameCore.createGame({ section: trgameSection });
    if (trgame.empty) {
        document.getElementById('trgame-status').textContent = t('trgame.empty');
        trgame = null;
        return;
    }
    QuizUI.phase('trgame', 'play');
    trgameRender();
}

function trgameRender() {
    const g = trgame;
    const q = TransmissionGameCore.question(g);
    QuizUI.status('trgame', g);
    document.getElementById('trgame-question').textContent = t('trgame.ask_' + q.type);
    document.getElementById('trgame-word').textContent = q.shown;
    document.getElementById('trgame-he').textContent = q.shownHe;
    QuizUI.options('trgame', q, option => ({ label: option.label }), trgameAnswer);
}

// « Rabbi Meïr (son père, discuté), Rabbi Akiva » : les noms d'une liste de liens, avec la nature du lien quand ce n'est pas un simple maître,
// et « discuté » pour un lien que seule la tradition tardive rapporte (« ? » sur la carte).
function trgameNames(links) {
    return links.map(x => {
        const notes = [];
        if (x.kind === 'pere' || x.kind === 'second' || x.kind === 'beaupere') notes.push(t('trgame.kind_' + x.kind));
        if (x.doubt) notes.push(t('trgame.kind_doubt'));
        return x.fr + (notes.length ? ' (' + notes.join(', ') + ')' : '');
    }).join(' ; ');
}

// La fiche après la réponse : les maîtres de l'élève, ou les élèves du maître et le nom de l'intrus ; la source des liens en remarque.
function trgameInfo(q) {
    const links = q.type === 'who' ? q.masters : q.students;
    const sources = links.map(x => x.src).filter((v, i, a) => v && a.indexOf(v) === i).join(' ; ');
    const line = q.type === 'who'
        ? t('trgame.feedback_who', { student: q.shown, masters: trgameNames(q.masters) })
        : t('trgame.feedback_intrus', { master: q.shown, students: trgameNames(q.students), intrus: q.intrus });
    return { line: line, note: sources ? t('tools.transmission_sources') + ' ' + sources : '' };
}

function trgameAnswer(choice) {
    const g = trgame;
    if (!TransmissionGameCore.answer(g, choice).length) return;
    const q = TransmissionGameCore.question(g);
    const info = trgameInfo(q);
    QuizUI.resolve('trgame', g, q, choice, info);
}

// Le bouton « Voir la chaîne » ouvre la carte sur le sage de la question ; « Retour » ramène à la partie en cours.
function trgameOpenChain() {
    const g = trgame;
    const q = g && TransmissionGameCore.question(g);
    if (!q) return;
    openTool('transmission', 'screen-trgame');
    trGoTo(q.subject.id);
}

function trgameContinue() {
    const g = trgame;
    if (!g || !g.resolved) return;
    if (TransmissionGameCore.next(g).includes('done')) { trgameFinish(); return; }
    trgameRender();
}

function trgameFinish() {
    QuizUI.finish('trgame', trgame, 'transmission');
}
