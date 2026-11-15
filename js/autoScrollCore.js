// =========================================================================
// === DÉFILEMENT AUTOMATIQUE (« prompteur » ; règles, sans DOM) ===
// =========================================================================
// La lecture d'un long texte (Tanakh, récits) défile toute seule, à une vitesse choisie ; au bas du texte, un compte à rebours mène au chapitre
// suivant. Ici : la machine à états et le calcul du mouvement, sans rien toucher à la page (js/app/autoscroll.js s'en sert). Testé dans
// tests/autoScrollCore.test.js.
//
// États : 'idle' (rien ne défile, ou le texte est fini), 'running', 'paused', 'countdown' (au bas du texte, avant le chapitre suivant), 'lead' (le
// chapitre suivant vient d'apparaître : le texte reste immobile quelques secondes, le temps d'en lire le début, puis le défilement reprend).
// Un état est un objet { mode, speed, carry, remaining, budget, minutes } qu'on ne modifie pas : chaque fonction en rend un nouveau.
//   speed     : rang dans SPEEDS ;
//   carry     : la fraction de pixel pas encore appliquée (le défilement du système ne prend que des pixels entiers : à vitesse lente, sans ce reste, le texte
//               ne bougerait pas) ;
//   remaining : millisecondes restantes du compte à rebours (countdown) ou de l'attente au début du chapitre (lead) ; pendant 'lead' on ne regarde
//               pas si l'on est au bas du texte : le nouveau chapitre a le temps de s'installer (il se remet en haut de l'écran un instant après) ;
//   budget    : « finir en X minutes » : millisecondes qu'il reste pour atteindre la fin (null : réglage par vitesse). Il ne baisse que pendant que ça
//               défile, attend ou compte à rebours : une pause ne le consomme pas. La vitesse est alors calculée par paceSpeed() à chaque instant, d'après
//               ce qu'il reste à parcourir, et corrigée toute seule d'une pause ou d'une mauvaise estimation ;
//   minutes   : la durée choisie (celle que l'écran affiche), null tant qu'aucune n'est choisie.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.AutoScrollCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Pixels par seconde ; une seconde est la même sur un écran à 60 ou à 120 Hz, car le mouvement dépend du temps écoulé, pas du nombre d'images.
    var SPEEDS = [8, 14, 22, 32, 46, 64, 90];
    var DEFAULT_SPEED = 2;
    var COUNTDOWN_MS = 5000;
    var LEAD_MS = 4000;        // immobilité au début d'un chapitre atteint par le compte à rebours
    var TRANSITION_MS = COUNTDOWN_MS + LEAD_MS;   // ce que coûte chaque passage au chapitre suivant (compte à rebours puis attente au début)
    var MIN_PACE = 4;          // px/s : bornes de la vitesse calculée pour tenir une durée
    var MAX_PACE = 240;
    var MIN_MINUTES = 5;
    var MAX_MINUTES = 120;
    var MINUTES_STEP = 5;
    var MAX_FRAME_MS = 100;   // une image très en retard (onglet en arrière-plan) ne fait pas sauter le texte
    var END_TOLERANCE = 2;    // pixels : « au bas » tolère l'arrondi du défilement

    function clampSpeed(i) {
        var n = Math.round(Number(i));
        if (!isFinite(n)) return DEFAULT_SPEED;
        return Math.max(0, Math.min(SPEEDS.length - 1, n));
    }

    function create(speed) {
        return { mode: 'idle', speed: clampSpeed(speed === undefined ? DEFAULT_SPEED : speed), carry: 0, remaining: 0, budget: null, minutes: null };
    }

    function with_(state, changes) {
        var out = {};
        Object.keys(state).forEach(function (k) { out[k] = state[k]; });
        Object.keys(changes).forEach(function (k) { out[k] = changes[k]; });
        return out;
    }

    // Les pixels entiers à défiler pendant `dtMs`, et ce qui reste de la fraction.
    function advance(carry, dtMs, pxPerSec) {
        var dt = Math.max(0, Math.min(Number(dtMs) || 0, MAX_FRAME_MS));
        var total = (carry || 0) + (pxPerSec * dt) / 1000;
        var px = Math.floor(total);
        return { px: px, carry: total - px };
    }

    // Le bas du texte est-il atteint ?
    function atEnd(scrollTop, scrollHeight, clientHeight) {
        return scrollHeight - clientHeight - scrollTop <= END_TOLERANCE;
    }

    // Quelque chose se passe-t-il : le texte défile, ou on attend (compte à rebours, début de chapitre) ?
    function isActive(state) {
        return state.mode === 'running' || state.mode === 'countdown' || state.mode === 'lead';
    }

    function start(state) {
        if (isActive(state)) return state;
        return with_(state, { mode: 'running', carry: 0, remaining: 0 });
    }

    function pause(state) {
        if (!isActive(state)) return state;
        return with_(state, { mode: 'paused', carry: 0, remaining: 0 });   // pendant le compte à rebours, pause = on reste dans ce chapitre ; pendant l'attente du début, on garde la main
    }

    function stop(state) {
        return with_(state, { mode: 'idle', carry: 0, remaining: 0 });
    }

    function toggle(state) {
        return isActive(state) ? pause(state) : start(state);
    }

    function faster(state) { return with_(state, { speed: clampSpeed(state.speed + 1) }); }
    function slower(state) { return with_(state, { speed: clampSpeed(state.speed - 1) }); }

    // La durée choisie, ramenée à un multiple de 5 minutes entre 5 et 120.
    function clampMinutes(m) {
        var n = Math.round(Number(m) / MINUTES_STEP) * MINUTES_STEP;
        if (!isFinite(n)) return 30;
        return Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, n));
    }

    // « Finir en X minutes » à partir de maintenant : le temps restant repart de X minutes.
    function setBudget(state, minutes) {
        var m = clampMinutes(minutes);
        return with_(state, { minutes: m, budget: m * 60000 });
    }

    // Retour au réglage par vitesse (la durée choisie est gardée pour la prochaine fois).
    function clearBudget(state) {
        return with_(state, { budget: null });
    }

    // Les minutes qu'il reste avant la fin voulue, arrondies au-dessus (1 tant qu'il reste du temps).
    function budgetMinutes(state) {
        return state.budget == null ? null : Math.ceil(state.budget / 60000);
    }

    // La vitesse (px/s) qui mène à la fin à temps : ce qu'il reste à parcourir (`remainingPx`, y compris les chapitres suivants, estimés), divisé par
    // le temps restant (`remainingMs`) moins ce que coûtent les passages de chapitre à venir (`transitions`). Bornée : trop lent, le texte
    // semblerait arrêté ; trop vite, il ne se lirait plus. Plus de temps utile : la vitesse maximale.
    function paceSpeed(info) {
        var usable = info.remainingMs - (info.transitions || 0) * TRANSITION_MS;
        if (!(usable > 1000)) return MAX_PACE;
        var pace = Math.max(0, info.remainingPx) / (usable / 1000);
        return Math.max(MIN_PACE, Math.min(MAX_PACE, pace));
    }

    // Les secondes entières affichées par le compte à rebours ou par l'attente du début de chapitre (5, 4, 3, 2, 1).
    function countdownSeconds(state) {
        return Math.max(0, Math.ceil(state.remaining / 1000));
    }

    // Un pas. `metrics` : { top, height, client } de l'écran qui défile ; `hasNext` : y a-t-il un chapitre après celui-ci ?
    // Rend { state, scroll, action } : `scroll` = pixels entiers à ajouter à scrollTop ; `action` = null, 'next' (passer au chapitre suivant)
    // ou 'finished' (le texte est fini, rien ne suit).
    function step(state, dtMs, metrics, hasNext, pxPerSec) {
        var dt = Math.max(0, Math.min(Number(dtMs) || 0, MAX_FRAME_MS));
        if (state.mode === 'countdown') {
            var left = state.remaining - dt;
            if (left > 0) return { state: with_(state, { remaining: left }), scroll: 0, action: null };
            return { state: with_(state, { mode: 'lead', carry: 0, remaining: LEAD_MS }), scroll: 0, action: 'next' };
        }
        if (state.mode === 'lead') {
            var wait = state.remaining - dt;
            if (wait > 0) return { state: with_(state, { remaining: wait }), scroll: 0, action: null };
            return { state: with_(state, { mode: 'running', carry: 0, remaining: 0 }), scroll: 0, action: null };
        }
        if (state.mode !== 'running') return { state: state, scroll: 0, action: null };
        if (atEnd(metrics.top, metrics.height, metrics.client)) {
            if (hasNext) return { state: with_(state, { mode: 'countdown', carry: 0, remaining: COUNTDOWN_MS }), scroll: 0, action: null };
            return { state: stop(state), scroll: 0, action: 'finished' };
        }
        var moved = advance(state.carry, dt, pxPerSec > 0 ? pxPerSec : SPEEDS[state.speed]);
        return { state: with_(state, { carry: moved.carry }), scroll: moved.px, action: null };
    }

    // Une image. `pxPerSec` (facultatif) remplace la vitesse du rang choisi : c'est la vitesse calculée par paceSpeed() quand une durée est choisie.
    function frame(state, dtMs, metrics, hasNext, pxPerSec) {
        var dt = Math.max(0, Math.min(Number(dtMs) || 0, MAX_FRAME_MS));
        var r = step(state, dt, metrics, hasNext, pxPerSec);
        if (state.budget != null && isActive(state)) r.state = with_(r.state, { budget: Math.max(0, state.budget - dt) });
        return r;
    }

    return {
        SPEEDS: SPEEDS, DEFAULT_SPEED: DEFAULT_SPEED, COUNTDOWN_MS: COUNTDOWN_MS, LEAD_MS: LEAD_MS, MAX_FRAME_MS: MAX_FRAME_MS,
        clampSpeed: clampSpeed, create: create, advance: advance, atEnd: atEnd, isActive: isActive, start: start, pause: pause, stop: stop, toggle: toggle,
        faster: faster, slower: slower, countdownSeconds: countdownSeconds, frame: frame,
        TRANSITION_MS: TRANSITION_MS, MIN_PACE: MIN_PACE, MAX_PACE: MAX_PACE, MIN_MINUTES: MIN_MINUTES, MAX_MINUTES: MAX_MINUTES, MINUTES_STEP: MINUTES_STEP,
        clampMinutes: clampMinutes, setBudget: setBudget, clearBudget: clearBudget, budgetMinutes: budgetMinutes, paceSpeed: paceSpeed
    };
}));
