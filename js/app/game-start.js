// Extrait de l'ancien js/app.js — Lancement d'une partie de frise. (Le multijoueur de la frise, sans écran depuis longtemps, a été retiré : les jeux à questions se jouent à
// plusieurs par js/quizCore.js et js/app/quiz-ui.js.)
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).
// LANCEMENT DU JEU
// Annule un éventuel délai de révélation de mauvaise réponse encore en
// attente (voir checkPlacement) et réarme `isAnimating` à `false` : à
// appeler chaque fois qu'on (re)lance une partie ou qu'on la quitte, pour
// ne jamais laisser une partie suivante hériter d'un verrou de clic bloqué.
function resetPlacementAnimationState() {
    if (wrongAnswerTimeoutId) {
        clearTimeout(wrongAnswerTimeoutId);
        wrongAnswerTimeoutId = null;
    }
    timerFrozenAt = null;
    pendingEntryFx = null;
    isAnimating = false;
}

function startActualGame(mode) {
    resetPlacementAnimationState();
    resetSessionHistory();
    currentMode = mode;
    let sourceEvents;
    if (mode === 'class') {
        // Mode Classe : le paquet de la séance, dans l'ordre de l'enseignant. Retourné parce que la suite
        // pioche par la fin : la première carte du paquet devient l'ancre, puis les suivantes dans l'ordre.
        sourceEvents = classDeckEvents().slice().reverse();
    } else if (mode === 'daily') {
        // Défi du jour : 10 événements déjà tirés (et mélangés) de façon
        // déterministe par generateDailyEvents, indépendamment du thème
        // actuellement sélectionné dans le menu.
        sourceEvents = dailyChallengeEventsWithLocation.map(item => item.event);
    } else if (mode === 'weekly') {
        // Défi hebdomadaire : même principe, 30 événements (voir
        // generateWeeklyChallengeEvents dans js/weekly.js).
        sourceEvents = weeklyChallengeEventsWithLocation.map(item => item.event);
    } else if (mode === 'discovery') {
        // La Découverte n'est pas une partie mais une consultation : elle
        // garde le thème entier, une frise amputée n'ayant aucun sens.
        sourceEvents = getModePoolRaw();
    } else {
        sourceEvents = expeditionCap(getSessionPool(), 'classic');
    }
    if (sourceEvents.length === 0) {
        alert(t('modes.no_events_theme'));
        return;
    }
    let eventsCopy = [...sourceEvents];

    if (mode === 'discovery') {
        eventsCopy.sort((a, b) => a.date - b.date);
        placedEvents = eventsCopy;
        currentPool = [];
        totalEvents = placedEvents.length;
    } else if (mode === 'daily' || mode === 'weekly' || mode === 'class') {
        // Ordre de pioche déjà mélangé de façon déterministe (même graine du
        // jour/de la semaine pour tous les joueurs) : surtout ne pas
        // re-mélanger avec Math.random ici, sous peine de casser l'équité du
        // classement mondial.
        totalEvents = eventsCopy.length;
        placedEvents = [eventsCopy.pop()];
        // Un élève qui se reconnecte en cours de séance : les cartes déjà jouées reprennent leur place dans la frise
        // (bien ou mal posées, une carte jouée finit à sa vraie place), la suivante est celle où il s'était arrêté.
        const alreadyPlayed = mode === 'class' && typeof classResumeRound === 'function' ? classResumeRound('frise') : 0;
        for (let i = 0; i < alreadyPlayed && eventsCopy.length > 1; i++) {
            const card = eventsCopy.pop();
            let at = placedEvents.findIndex(e => card.date <= e.date);
            if (at < 0) at = placedEvents.length;
            placedEvents.splice(at, 0, card);
        }
        currentPool = eventsCopy;
    } else {
        // Même mélange que partout ailleurs : l'ordre de pioche décide quelles
        // cartes tombent en premier, donc à quel moment le joueur affronte les
        // dates les plus dures — un mélange biaisé y ferait remonter toujours
        // les mêmes.
        eventsCopy = shuffleArray(eventsCopy);
        totalEvents = eventsCopy.length;
        placedEvents = [eventsCopy.pop()];
        currentPool = eventsCopy;
    }

    if (mode === 'training' || mode === 'discovery' || mode === 'class') lives = Infinity; // la classe ne s'élimine pas
    else if (mode === 'expert') lives = 1;
    else lives = startingLives(); // classic, chrono, daily, weekly (3, ou ce qu'il reste en Expédition)

    score = 0;
    totalTimePlayed = 0;
    comboMultiplier = 1.0;
    const gameDates = eventsCopy.map(e => e.date);
    currentGameSpan = Math.max(1, Math.max(...gameDates) - Math.min(...gameDates));

    const hudLives = document.getElementById('hud-lives');
    const hudTimer = document.getElementById('hud-timer-container');
    const hand = document.getElementById('hand');
    const scoreContainer = document.getElementById('hud-score-container');
    const progressRail = document.getElementById('hud-progress-rail');

    hudLives.classList.remove('hidden');
    hudTimer.classList.add('hidden');
    hand.classList.remove('hidden');
    scoreContainer.classList.remove('hidden');
    progressRail.classList.remove('hidden');
    document.getElementById('hud-progress-fill').style.width = '0%';

    if (mode === 'training' || mode === 'discovery' || mode === 'class') {
        hudLives.classList.add('hidden');
        // Modes sans enjeu ni pression : pas de score affiché
        scoreContainer.classList.add('hidden');
    }

    if (mode === 'discovery') {
        // Lecture seule : ni carte en main, ni score, ni progression
        hand.classList.add('hidden');
        progressRail.classList.add('hidden');
        document.getElementById('hud-count').innerText = t('game.frise_complete', { n: totalEvents });
    }

    if (mode === 'chrono' || mode === 'expert' || mode === 'daily' || mode === 'weekly' || mode === 'class') {
        hudTimer.classList.remove('hidden');
        document.getElementById('hud-timer').innerText = "0,0";
        startTimer();
    }

    updateHUD();

    if (mode === 'discovery') {
        renderTimeline();
    } else {
        pickNextEvent();
    }

    showScreen('screen-game');
}

