// =========================================================================
// === « MAÎTRES ET ÉLÈVES » : LE JEU SUR LA CHAÎNE DE TRANSMISSION (écran de la Salle de jeux, « Jeux religieux ») ===
// =========================================================================
// Les règles sont dans js/transmissionGameCore.js (pur, testé) ; le contenu dans la chaîne de transmission (js/transmissionCore.js). Ici : l'écran, les
// boutons de réponse et la fiche après chaque réponse. Le jeu se lance depuis la salle de jeux (`screen-arcade`) ou depuis l'écran de la chaîne
// (`screen-tool-transmission`) et rend la main à l'écran d'où il vient. Meilleur score : mêmes clés que l'arcade (ArcadeCore.normalizeBest, clé
// `transmission`). Pas de répétition espacée : les questions sont tirées au hasard dans les liens sûrs. Tout ce qui vient des données passe par
// textContent, jamais par du HTML.

let trgame = null;
let trgameReturn = 'screen-arcade';
let trgameSection = 'all';

function openTransmissionGame(fromScreen) {
    trgameReturn = fromScreen || 'screen-arcade';
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
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(TRANSMISSION_PREFS_KEY)); } catch (e) { raw = null; }
    trgameSection = raw && TransmissionGameCore.SECTIONS.indexOf(raw.section) >= 0 ? raw.section : 'all';
}

function trgameSetSection(section) {
    if (TransmissionGameCore.SECTIONS.indexOf(section) < 0) return;
    trgameSection = section;
    try { localStorage.setItem(TRANSMISSION_PREFS_KEY, JSON.stringify({ section: trgameSection })); } catch (e) { /* stockage indisponible */ }
    trgameSetup();
}

function trgameSetup() {
    trgame = null;
    document.getElementById('trgame-status').textContent = '';
    document.getElementById('trgame-play').classList.add('hidden');
    document.getElementById('trgame-over').classList.add('hidden');
    document.getElementById('trgame-setup').classList.remove('hidden');
    // Le choix de la section, avec le nombre de maîtres qu'elle montre.
    const holder = document.getElementById('trgame-sections');
    toolClear(holder);
    TransmissionGameCore.SECTIONS.forEach(section => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tool-history-chip';
        btn.id = 'trgame-section-' + section;
        btn.setAttribute('aria-pressed', section === trgameSection ? 'true' : 'false');
        btn.textContent = t('trgame.section_' + section) + ' (' + TransmissionGameCore.sagesOf(section).length + ')';
        btn.onclick = () => trgameSetSection(section);
        holder.appendChild(btn);
    });
}

function trgameStart() {
    trgame = TransmissionGameCore.createGame({ section: trgameSection });
    if (trgame.empty) {
        document.getElementById('trgame-status').textContent = t('trgame.empty');
        trgame = null;
        return;
    }
    document.getElementById('trgame-setup').classList.add('hidden');
    document.getElementById('trgame-over').classList.add('hidden');
    document.getElementById('trgame-play').classList.remove('hidden');
    trgameRender();
}

function trgameStatus() {
    const g = trgame;
    document.getElementById('trgame-status').textContent = t('trgame.status', { n: g.index + 1, total: g.questions.length, score: g.score });
}

function trgameRender() {
    const g = trgame;
    const q = TransmissionGameCore.question(g);
    trgameStatus();
    document.getElementById('trgame-question').textContent = t('trgame.ask_' + q.type);
    document.getElementById('trgame-word').textContent = q.shown;
    document.getElementById('trgame-he').textContent = q.shownHe;
    document.getElementById('trgame-feedback').classList.add('hidden');
    const box = document.getElementById('trgame-options');
    toolClear(box);
    q.options.forEach((option, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-option cause-card lexgame-option';
        btn.dataset.choice = String(i);
        btn.textContent = option.label;
        btn.setAttribute('aria-label', t('trgame.option_aria', { n: i + 1, label: option.label }));
        btn.onclick = () => trgameAnswer(i);
        box.appendChild(btn);
    });
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
    const events = TransmissionGameCore.answer(g, choice);
    if (!events.length) return;
    const q = TransmissionGameCore.question(g);
    const right = g.resolved === 'right';
    arcadeSound(right ? 'good' : 'bad');
    trgameStatus();
    // La bonne réponse en vert, la réponse choisie à tort en rouge.
    document.querySelectorAll('#trgame-options .lexgame-option').forEach(btn => {
        const i = Number(btn.dataset.choice);
        btn.disabled = true;
        if (i === q.answer) btn.classList.add('correct');
        else if (i === choice) btn.classList.add('wrong');
    });
    const feedback = document.getElementById('trgame-feedback');
    feedback.classList.toggle('is-wrong', !right);
    document.getElementById('trgame-feedback-title').textContent = t(right ? 'trgame.right' : 'trgame.wrong');
    const info = trgameInfo(q);
    document.getElementById('trgame-feedback-text').textContent = info.line;
    const note = document.getElementById('trgame-feedback-note');
    note.textContent = info.note;
    note.classList.toggle('hidden', !info.note);
    const last = g.index + 1 >= g.questions.length;
    const next = document.getElementById('trgame-next');
    next.textContent = t(last ? 'trgame.finish' : 'trgame.next');
    feedback.classList.remove('hidden');
    next.focus();
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
    const g = trgame;
    const best = arcadeRecord('transmission', g.score);
    document.getElementById('trgame-play').classList.add('hidden');
    document.getElementById('trgame-status').textContent = '';
    document.getElementById('trgame-over-text').textContent =
        t('trgame.found', { found: g.found, total: g.questions.length, score: g.score }) + ' ' + t('arcade.best', { score: best.transmission });
    document.getElementById('trgame-over').classList.remove('hidden');
    if (typeof syncPushProgress === 'function') syncPushProgress();
}
