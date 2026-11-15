// =========================================================================
// === DÉFILEMENT AUTOMATIQUE (« prompteur ») : barre de commande et boucle d'images ===
// =========================================================================
// Un texte long défile tout seul (Tanakh : les livres ; Récits). Les règles (vitesse en pixels par seconde, fraction de pixel gardée, compte à
// rebours au bas du texte) sont dans js/autoScrollCore.js ; ici : la barre collée au bas de l'écran (pause, vitesse, fermer), la boucle
// requestAnimationFrame, et ce que chaque écran fait pour passer au chapitre suivant.
//
// - La barre est un bandeau opaque collé au bord bas de l'écran (au-dessus de la zone de l'indicateur d'accueil), ajouté à <body> : le pouce l'atteint, et
//   aucun texte ne se voit en dessous. Pendant qu'il est ouvert, l'écran reçoit la classe `has-autoscroll` (marge en bas : le dernier texte peut
//   remonter au-dessus du bandeau). Il se ferme dès que l'écran est masqué.
// - Jamais lancé tout seul : un bouton de l'écran le démarre. Un geste de l'utilisateur sur le texte (toucher, molette, clavier) le met en pause ;
//   la barre reste, ▶ reprend, ✕ ferme.
// - Au bas du texte, s'il y a un chapitre suivant : « Chapitre suivant dans 5 s » ; ⏸ annule et laisse dans ce chapitre. Sinon : « Fin du texte ».
//   Le chapitre suivant apparaît, puis reste immobile 4 s (« reprise dans 4 s ») pour qu'on en lise le début avant que le défilement reprenne ;
//   ⏸ pendant cette attente laisse la main, ▶ reprend tout de suite.
// - L'écran ne doit pas se verrouiller pendant la lecture. Dans l'app iOS : le plugin Capacitor `@capacitor-community/keep-awake` (il coupe la minuterie
//   de verrouillage de l'iPhone, `isIdleTimerDisabled`, tant que ça défile ; `Capacitor.Plugins.KeepAwake`, sans import car la page n'a pas de bundler).
//   Dans un navigateur : Screen Wake Lock (navigator.wakeLock) quand il existe. Sans l'un ni l'autre, l'écran se verrouille à sa minuterie habituelle
//   et le défilement s'arrête avec lui. Le verrou est rendu à la pause, à la fermeture, à la fin du texte, et quand l'app passe en arrière-plan.
// - La vitesse choisie est mémorisée sur l'appareil (localStorage, `autoScrollSpeed`).
// - « Finir en X minutes » (Récits seulement : l'écran fournit `pacing`) : la pastille « Vitesse 3/7 » du bandeau passe, au toucher, à « Durée 30 min » ;
//   − et + règlent alors la durée par pas de 5 minutes (5 à 120), et la vitesse est recalculée en continu (AutoScrollCore.paceSpeed) pour atteindre la fin du
//   récit à l'heure : elle tient compte de ce qui reste à parcourir, des chapitres suivants (estimés d'après leur nombre de mots et de figures, à l'échelle du
//   chapitre déjà affiché), et du coût de chaque passage de chapitre. Une pause ne consomme pas le temps ; la durée choisie est mémorisée (`autoScrollMinutes`).
// - Rien n'est inséré par innerHTML.

const AUTOSCROLL_SPEED_KEY = 'autoScrollSpeed';

const AUTOSCROLL_MINUTES_KEY = 'autoScrollMinutes';

// La durée « finir en X minutes » gardée sur l'appareil, ou null.
function autoScrollStoredMinutes() {
    try {
        const raw = localStorage.getItem(AUTOSCROLL_MINUTES_KEY);
        return raw === null ? null : AutoScrollCore.clampMinutes(raw);
    } catch (e) { return null; }
}

function autoScrollStoredSpeed() {
    try {
        const raw = localStorage.getItem(AUTOSCROLL_SPEED_KEY);
        return raw === null ? AutoScrollCore.DEFAULT_SPEED : AutoScrollCore.clampSpeed(raw);
    } catch (e) { return AutoScrollCore.DEFAULT_SPEED; }
}

// Le plugin natif qui garde l'écran de l'iPhone allumé, s'il est dans l'app (jamais dans un navigateur).
function autoScrollNativeKeepAwake() {
    try {
        const p = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.KeepAwake;
        return p && typeof p.keepAwake === 'function' && typeof p.allowSleep === 'function' ? p : null;
    } catch (e) { return null; }
}

// Un défilement automatique pour un écran. `host` :
//   key        : nom court (id du bandeau) ;
//   screenId   : l'écran qui défile (id) ;
//   launcher   : id du bouton qui le lance (son aria-pressed suit l'état), facultatif ;
//   label()    : le nom de l'endroit lu (chapitre) ;
//   hasNext()  : y a-t-il un chapitre après celui-ci ?
//   next()     : passe au chapitre suivant ;
//   toStart()  : replace le texte au début du nouveau chapitre, facultatif (quand next() ne le fait pas déjà) ;
//   theme      : classe ajoutée à la barre, facultatif ;
//   pacing     : facultatif, active « finir en X minutes » : { minutes() : durée proposée la première fois, remaining() : { px : pixels estimés des
//                chapitres suivants, transitions : leur nombre } }.
function autoScrollCreate(host) {
    let state = AutoScrollCore.create(autoScrollStoredSpeed());
    let open = false;
    let raf = 0;
    let last = 0;
    let lock = null;           // Screen Wake Lock du navigateur
    let nativeAwake = false;   // le plugin natif garde l'écran allumé
    let shown = '';   // ce que la barre affiche, pour ne réécrire que ce qui change
    let pace = 0;      // la vitesse calculée pour tenir la durée choisie (px/s), recalculée quelques fois par seconde
    let paceAt = 0;
    let minuteShown = null;
    const els = {};
    const pacing = host.pacing || null;
    const timeMode = () => state.budget != null;

    const screen = () => document.getElementById(host.screenId);

    function button(className, label, text) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'autoscroll-btn ' + className;
        b.setAttribute('aria-label', label);
        b.title = label;
        b.textContent = text;
        return b;
    }

    function build() {
        if (els.bar) return;
        const bar = document.createElement('div');
        bar.id = 'autoscroll-bar-' + host.key;
        bar.className = 'autoscroll-bar' + (host.theme ? ' ' + host.theme : '');
        bar.setAttribute('role', 'group');
        bar.setAttribute('aria-label', t('autoscroll.title'));
        bar.hidden = true;
        const status = document.createElement('p');
        status.className = 'autoscroll-status';
        status.setAttribute('role', 'status');
        const place = document.createElement('span');
        const count = document.createElement('span');
        count.className = 'autoscroll-count';
        count.setAttribute('aria-hidden', 'true');   // les secondes se voient ; le lecteur d'écran n'entend l'annonce qu'une fois
        status.appendChild(place);
        status.appendChild(count);
        const row = document.createElement('div');
        row.className = 'autoscroll-row';
        els.play = button('autoscroll-play', t('autoscroll.pause'), '⏸︎');
        els.slower = button('', t('autoscroll.slower'), '−');
        if (pacing) {   // une pastille qui change de réglage : vitesse ou durée
            els.level = document.createElement('button');
            els.level.type = 'button';
            els.level.className = 'autoscroll-level autoscroll-mode';
            els.level.onclick = () => toggleMode();
        } else {
            els.level = document.createElement('span');
            els.level.className = 'autoscroll-level';
        }
        els.faster = button('', t('autoscroll.faster'), '+');
        els.close = button('autoscroll-close', t('autoscroll.close'), '✕');
        els.play.onclick = () => { setState(AutoScrollCore.toggle(state)); };
        els.slower.onclick = () => { if (timeMode()) changeMinutes(-1); else { setState(AutoScrollCore.slower(state)); saveSpeed(); } };
        els.faster.onclick = () => { if (timeMode()) changeMinutes(1); else { setState(AutoScrollCore.faster(state)); saveSpeed(); } };
        els.close.onclick = () => close();
        [els.play, els.slower, els.level, els.faster, els.close].forEach(x => row.appendChild(x));
        bar.appendChild(status);
        bar.appendChild(row);
        els.bar = bar;
        els.place = place;
        els.count = count;
        document.body.appendChild(bar);
        // L'écran masqué (retour, autre écran) ferme le bandeau, qui n'est plus dans l'écran.
        new MutationObserver(() => { if (open && screen().classList.contains('hidden')) close(); })
            .observe(screen(), { attributes: true, attributeFilter: ['class'] });
        // Un geste de l'utilisateur sur l'écran (hors de la barre) met en pause : il reprend la main.
        const grab = (e) => { if (open && !bar.contains(e.target)) pauseByUser(); };
        const scr = screen();
        scr.addEventListener('pointerdown', grab);
        scr.addEventListener('wheel', grab, { passive: true });
        scr.addEventListener('keydown', (e) => { if (open && !bar.contains(e.target) && /^(Arrow|Page|Home|End| )/.test(e.key)) pauseByUser(); });
    }

    function saveSpeed() {
        try { localStorage.setItem(AUTOSCROLL_SPEED_KEY, String(state.speed)); } catch (e) {}
    }

    // « Finir en X minutes » : la pastille passe de la vitesse à la durée (la dernière choisie, ou celle d'une lecture normale du récit), et inversement.
    function toggleMode() {
        if (!pacing) return;
        if (timeMode()) setState(AutoScrollCore.clearBudget(state));
        else setState(AutoScrollCore.setBudget(state, autoScrollStoredMinutes() || pacing.minutes()));
        paceAt = 0;
    }

    // − / + en mode durée : 5 minutes de moins ou de plus ; le temps restant repart de la nouvelle durée.
    function changeMinutes(dir) {
        const next = AutoScrollCore.clampMinutes((state.minutes || 30) + dir * AutoScrollCore.MINUTES_STEP);
        setState(AutoScrollCore.setBudget(state, next));
        try { localStorage.setItem(AUTOSCROLL_MINUTES_KEY, String(next)); } catch (e) {}
        paceAt = 0;
    }

    // La vitesse (px/s) qui mène à la fin à l'heure : ce qui reste de cet écran, plus les chapitres suivants estimés.
    function computePace(scr) {
        const rest = pacing.remaining();
        const remainingPx = Math.max(0, scr.scrollHeight - scr.clientHeight - scr.scrollTop) + rest.px;
        return AutoScrollCore.paceSpeed({ remainingPx: remainingPx, remainingMs: state.budget, transitions: rest.transitions });
    }

    function pauseByUser() {
        if (AutoScrollCore.isActive(state)) setState(AutoScrollCore.pause(state));
    }

    function setState(next) {
        state = next;
        render();
        if (AutoScrollCore.isActive(state)) { wantLock(); startLoop(); } else { releaseLock(); stopLoop(); }
    }

    // Ce que dit la barre : l'endroit lu, ou la pause, ou le passage au chapitre suivant, ou la fin.
    function render() {
        if (!els.bar) return;
        const playing = AutoScrollCore.isActive(state);
        let place;
        let count = '';
        if (state.mode === 'countdown') {
            place = t('autoscroll.next_chapter');
            count = ' ' + t('autoscroll.seconds', { n: AutoScrollCore.countdownSeconds(state) });
        } else if (state.mode === 'lead') {
            place = host.label();   // le chapitre qui vient d'apparaître, immobile quelques secondes
            count = ' · ' + t('autoscroll.resume_in', { n: AutoScrollCore.countdownSeconds(state) });
        } else if (state.mode === 'idle' && open && shown === 'finished') {
            place = t('autoscroll.finished');
        } else if (state.mode === 'paused') {
            place = t('autoscroll.paused') + ' · ' + host.label();
        } else {
            place = host.label();
            if (timeMode() && state.mode === 'running') count = ' · ' + t('autoscroll.ends_in', { n: AutoScrollCore.budgetMinutes(state) });
        }
        if (els.place.textContent !== place) els.place.textContent = place;
        if (els.count.textContent !== count) els.count.textContent = count;
        els.play.textContent = playing ? '⏸︎' : '▶︎';
        const playLabel = playing ? t('autoscroll.pause') : t('autoscroll.play');
        els.play.setAttribute('aria-label', playLabel);
        els.play.title = playLabel;
        if (timeMode()) {
            els.level.textContent = t('autoscroll.mode_time', { n: state.minutes });
            els.slower.disabled = state.minutes <= AutoScrollCore.MIN_MINUTES;
            els.faster.disabled = state.minutes >= AutoScrollCore.MAX_MINUTES;
            els.slower.setAttribute('aria-label', t('autoscroll.shorter'));
            els.slower.title = t('autoscroll.shorter');
            els.faster.setAttribute('aria-label', t('autoscroll.longer'));
            els.faster.title = t('autoscroll.longer');
        } else {
            els.level.textContent = pacing ? t('autoscroll.mode_speed', { n: state.speed + 1, max: AutoScrollCore.SPEEDS.length }) : (state.speed + 1) + '/' + AutoScrollCore.SPEEDS.length;
            els.slower.disabled = state.speed === 0;
            els.faster.disabled = state.speed === AutoScrollCore.SPEEDS.length - 1;
            els.slower.setAttribute('aria-label', t('autoscroll.slower'));
            els.slower.title = t('autoscroll.slower');
            els.faster.setAttribute('aria-label', t('autoscroll.faster'));
            els.faster.title = t('autoscroll.faster');
        }
        if (pacing) {
            const hint = timeMode() ? t('autoscroll.to_speed') : t('autoscroll.to_time');
            els.level.setAttribute('aria-label', (timeMode() ? t('autoscroll.mode_time', { n: state.minutes }) : t('autoscroll.mode_speed', { n: state.speed + 1, max: AutoScrollCore.SPEEDS.length })) + '. ' + hint);
            els.level.title = hint;
        }
        if (host.launcher) {
            const l = document.getElementById(host.launcher);
            if (l) l.setAttribute('aria-pressed', open ? 'true' : 'false');
        }
    }

    function frame(ts) {
        raf = 0;
        const scr = screen();
        // L'écran a disparu (retour, autre écran) : le défilement s'arrête avec lui.
        if (!scr || scr.classList.contains('hidden') || !scr.isConnected) { close(); return; }
        const dt = last ? ts - last : 0;
        last = ts;
        let pxPerSec = 0;
        if (pacing && timeMode() && state.mode === 'running') {   // une durée est choisie : la vitesse se recalcule quatre fois par seconde
            if (!paceAt || ts - paceAt > 250) { pace = computePace(scr); paceAt = ts; }
            pxPerSec = pace;
        }
        const r = AutoScrollCore.frame(state, dt, { top: scr.scrollTop, height: scr.scrollHeight, client: scr.clientHeight }, !!host.hasNext(), pxPerSec);
        const before = state.mode;
        const second = AutoScrollCore.countdownSeconds(state);
        const minuteBefore = AutoScrollCore.budgetMinutes(state);
        state = r.state;
        if (r.scroll) scr.scrollTop += r.scroll;
        if (r.action === 'next') {
            host.next();
            if (host.toStart) host.toStart();
            paceAt = 0;   // le chapitre a changé : on remesure
        }
        if (r.action === 'finished') shown = 'finished';
        if (before !== state.mode || second !== AutoScrollCore.countdownSeconds(state) || minuteBefore !== AutoScrollCore.budgetMinutes(state) || r.action) render();
        if (AutoScrollCore.isActive(state)) raf = requestAnimationFrame(frame);
        else setState(state);   // fin du texte : on arrête la boucle et le verrou d'écran
    }

    function startLoop() {
        if (raf) return;
        last = 0;
        raf = requestAnimationFrame(frame);
    }

    function stopLoop() {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
    }

    // Empêche l'écran de se verrouiller tant que ça défile : le plugin natif de l'app iOS d'abord, sinon l'API du navigateur ; sans l'un ni l'autre, on ne
    // fait rien (l'écran suit sa minuterie).
    function wantLock() {
        const native = autoScrollNativeKeepAwake();
        if (native) {
            if (nativeAwake) return;
            nativeAwake = true;
            Promise.resolve().then(() => native.keepAwake()).catch(() => { nativeAwake = false; });
            return;
        }
        if (lock || !navigator.wakeLock || document.hidden) return;
        navigator.wakeLock.request('screen').then(sentinel => {
            if (!AutoScrollCore.isActive(state)) { sentinel.release(); return; }
            lock = sentinel;
            sentinel.addEventListener('release', () => { if (lock === sentinel) lock = null; });
        }).catch(() => { /* refusé (économie d'énergie…) : tant pis */ });
    }

    function releaseLock() {
        if (nativeAwake) {
            nativeAwake = false;
            const native = autoScrollNativeKeepAwake();
            if (native) Promise.resolve().then(() => native.allowSleep()).catch(() => {});
        }
        const s = lock;
        lock = null;
        if (s) s.release().catch(() => {});
    }

    function openBar() {
        build();
        open = true;
        shown = '';
        els.bar.hidden = false;
        screen().classList.add('has-autoscroll');
    }

    function close() {
        open = false;
        shown = '';
        state = AutoScrollCore.clearBudget(AutoScrollCore.stop(state));   // la prochaine ouverture repart du réglage par vitesse
        stopLoop();
        releaseLock();
        if (els.bar) els.bar.hidden = true;
        const scr = screen();
        if (scr) scr.classList.remove('has-autoscroll');
        if (host.launcher) {
            const l = document.getElementById(host.launcher);
            if (l) l.setAttribute('aria-pressed', 'false');
        }
    }

    document.addEventListener('visibilitychange', () => {
        if (!open) return;
        if (document.hidden) pauseByUser();   // l'app passe en arrière-plan : on ne défile pas dans le vide
    });

    return {
        isOpen: () => open,
        toggle() {
            if (open) { close(); return; }
            openBar();
            setState(AutoScrollCore.start(state));
        },
        close: close,
        state: () => state
    };
}

// Les deux écrans. Créés au premier appel, quand leur écran existe.
const autoScrollHosts = {
    tanakh: {
        key: 'tanakh',
        screenId: 'screen-tool-tanakh',
        launcher: 'tool-tanakh-auto',
        label: () => (document.getElementById('tool-tanakh-nav-label').textContent || '').replace(/^↑\s*/, ''),
        hasNext: () => !tanakhState.haftara && !document.getElementById('tool-tanakh-next').disabled,
        next: () => tanakhGoChapter(1),
        // Le nouveau chapitre commence au premier verset : sans cela, l'écran garderait la place du bas du chapitre d'avant.
        toStart: () => { document.getElementById('tool-tanakh-text').scrollIntoView({ behavior: 'auto', block: 'start' }); }
    },
    recit: {
        key: 'recit',
        screenId: 'screen-recit',
        launcher: 'recit-auto-btn',
        theme: 'autoscroll-recit',
        label: () => (recitCurrent && recitCurrent.chapitres[recitChapter] ? recitCurrent.chapitres[recitChapter].titre : ''),
        hasNext: () => !!recitCurrent && recitChapter < recitCurrent.chapitres.length - 1,
        next: () => recitGoChapter(recitChapter + 1),   // le récit se remet lui-même en haut de l'écran
        // « Finir en X minutes » : la durée proposée est celle d'une lecture normale du récit ; ce qui reste à parcourir après ce chapitre est estimé
        // (RecitsCore.chapterPxEstimate), puis corrigé pour moitié par l'écart entre l'estimation et la hauteur réellement mesurée des chapitres déjà
        // affichés (largeur de l'écran, taille du texte). Le dernier chapitre n'a plus rien à estimer : la vitesse y est exacte.
        pacing: (() => {
            const seen = {};   // récit -> { chapitre : hauteur mesurée / hauteur estimée }
            return {
                minutes: () => AutoScrollCore.clampMinutes(recitCurrent ? RecitsCore.readingMinutes(recitCurrent) : 30),
                remaining: () => {
                    if (!recitCurrent) return { px: 0, transitions: 0 };
                    const chapters = recitCurrent.chapitres;
                    const screen = document.getElementById('screen-recit');
                    const pad = parseFloat(getComputedStyle(screen).paddingBottom) || 0;   // la marge du bandeau n'est pas du texte
                    const measured = Math.max(1, screen.scrollHeight - pad - screen.clientHeight);
                    const ratios = seen[recitCurrent.id] || (seen[recitCurrent.id] = {});
                    ratios[recitChapter] = measured / Math.max(1, RecitsCore.chapterPxEstimate(recitCurrent, recitChapter));
                    const values = Object.keys(ratios).map(k => ratios[k]);
                    const scale = 0.5 + 0.5 * (values.reduce((a, b) => a + b, 0) / values.length);
                    let later = 0;
                    for (let i = recitChapter + 1; i < chapters.length; i++) later += RecitsCore.chapterPxEstimate(recitCurrent, i);
                    return { px: later * scale, transitions: chapters.length - 1 - recitChapter };
                }
            };
        })()
    }
};
const autoScrollInstances = {};

function autoScrollToggle(which) {
    if (!autoScrollInstances[which]) autoScrollInstances[which] = autoScrollCreate(autoScrollHosts[which]);
    autoScrollInstances[which].toggle();
}

// Quitter un récit ou changer de livre ne laisse pas la barre ouverte : appelé par les écrans.
function autoScrollClose(which) {
    if (autoScrollInstances[which]) autoScrollInstances[which].close();
}
