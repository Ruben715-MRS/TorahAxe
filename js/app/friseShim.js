// =========================================================================
// === TORAHAXE — LANCEUR DE FRISE (un seul mode, sans le menu d'axes/modes) ===
// =========================================================================
// HistoriAxe propose vingt modes de jeu et un écran de fin très riche (XP, ligue, séries, pièces,
// trophées, partage). TorahAxe n'est qu'un aperçu : un seul thème choisi ouvre directement le mode
// « frise » classique (js/app/frise.js, js/app/game-start.js, js/app/axes-rounds.js, repris tels
// quels d'HistoriAxe), sans écran de choix d'axes ni de mode, et un écran de fin minimal, sans rien
// de ce qui suppose un compte.

// --- Petits remplacements de js/storage.js et js/app/expedition.js (voir leur taille réelle, hors
// sujet ici : 1145 et 457 lignes pour une poignée de lignes vraiment utiles) ---
const DEFAULT_SETTINGS = { roundLength: 20 };
let appSettings = { roundLength: 20, sound: true, haptics: true };

function resolveRoundLength(setting, poolSize) {
    const size = Math.max(0, poolSize || 0);
    const numeric = typeof setting === 'number' || (typeof setting === 'string' && setting.trim() !== '');
    const asked = numeric ? Number(setting) : NaN;
    if (!Number.isFinite(asked) || asked < 0) return Math.min(DEFAULT_SETTINGS.roundLength, size);
    if (asked === 0) return size;
    return Math.min(asked, size);
}

// Pas d'Expédition dans TorahAxe : toujours le comportement par défaut (3 vies, pas de plafond de manche).
function startingLives() { return 3; }
function expeditionCap(list) { return list; }

// --- Lancement d'un thème ------------------------------------------------------------------------
// Même mécanisme que l'« Année entière » d'HistoriAxe (js/app/themes-screens.js: openYearTheme) :
// selectedYearTheme fait que getCurrentTheme() renvoie ce thème sans jamais toucher à bdd/aux index
// de catégories, qui n'existent pas dans TorahAxe.
function openFriseTheme(theme, fromScreen) {
    friseReturnScreen = fromScreen || 'screen-main';
    selectedYearTheme = theme;
    revisionMode = false;
    dailyChallengeMode = false;
    weeklyChallengeMode = false;
    isSelectionActive = false;
    axisFilterActive = false;
    essentialFilterActive = false;
    startActualGame('classic');
}

let friseReturnScreen = 'screen-main';

// Toujours selectedYearTheme dans TorahAxe (voir openFriseTheme ci-dessus) : jamais de résolution par
// indices de catégorie/sous-catégorie/thème, qui n'existent pas ici (js/app/navigation.js d'HistoriAxe).
function getCurrentTheme() {
    return selectedYearTheme;
}

// --- Écran de fin minimal --------------------------------------------------------------------
// Remplace js/app/session-end.js: endGame (220 lignes : XP, classement, séries, pièces, trophées,
// partage, notifications — tout ce que TorahAxe n'a pas). Mêmes deux appels, mêmes deux arguments
// (voir js/app/frise.js), un score et un titre, rien d'autre.
function endGame(isWin) {
    stopTimer();
    showScreen('screen-frise-end');
    document.getElementById('frise-end-title').textContent = isWin
        ? 'Frise terminée !'
        : 'Partie terminée';
    document.getElementById('frise-end-score').textContent = score;
}

function friseEndReplay() {
    const theme = selectedYearTheme;
    openFriseTheme(theme, friseReturnScreen);
}

function friseEndHome() {
    showScreen(friseReturnScreen, 'back');
}

// --- Trois petites fonctions que l'écran de jeu (markup repris d'HistoriAxe) appelle, remplacées
// par des versions minimales plutôt que d'importer js/app/modal.js et le reste de
// js/app/session-end.js pour elles seules ---
function screenAfterGame() { return friseReturnScreen; }

function quitGame() {
    if (!confirm('Quitter la partie en cours ?')) return;
    stopTimer();
    showScreen(screenAfterGame());
}

let currentZoom = 1;
function changeZoom(delta) {
    currentZoom = Math.min(1.6, Math.max(0.85, currentZoom + delta));
    document.documentElement.style.setProperty('--zoom-level', currentZoom);
}

function openLayoutSettings() { /* Réglage d'HistoriAxe (Réglages > disposition) : pas encore dans TorahAxe. */ }

// Disposition de la frise en paysage (tablette) : toujours la plus simple (une seule ligne), au lieu
// du choix réglable d'HistoriAxe (js/app/settings.js: applyLandscapeFlow/effectiveLandscapeFlow).
function effectiveLandscapeFlow() { return 'line'; }

function applyLandscapeFlow() {
    document.documentElement.setAttribute('data-landscape-flow', 'line');
    document.documentElement.removeAttribute('data-landscape-multi');
    return 'line';
}

function landscapeByAxisActive() { return false; }

// Portrait (champ facultatif `image` d'un événement, voir js/app/modal.js) : aucun des 4 thèmes
// dupliqués dans TorahAxe n'en a aujourd'hui, mais la carte en main (#hand-portrait) y fait référence
// inconditionnellement, d'où ces deux petites fonctions plutôt que tout js/app/modal.js (~400 lignes :
// la fiche d'événement et sa modale, hors sujet ici).
const PORTRAIT_SRC_PATTERN = /^assets\/portraits\/[A-Za-z0-9_.-]+\.jpg$/;
function portraitOf(evt) {
    const image = evt && evt.image;
    return image && PORTRAIT_SRC_PATTERN.test(image.src || '') ? image : null;
}
function setPortraitImg(imgEl, evt) {
    if (!imgEl) return;
    const image = portraitOf(evt);
    imgEl.onerror = null;
    if (!image) {
        imgEl.classList.add('hidden');
        imgEl.removeAttribute('src');
        return;
    }
    imgEl.onerror = () => imgEl.classList.add('hidden');
    imgEl.src = image.src;
    imgEl.classList.remove('hidden');
}

// Repris de js/app/settings.js (mise en page multi-lignes de la frise en paysage, réglage non proposé
// dans TorahAxe — voir applyLandscapeFlow ci-dessus) : avec data-landscape-flow toujours 'line', seul
// le nettoyage en tête s'applique jamais, le reste (découpage en lignes) ne se déclenche pas.
function markTimelineRows() {
    const timeline = document.getElementById('timeline');
    if (!timeline) return;
    const items = Array.from(timeline.querySelectorAll('.entry, .slot'));
    items.forEach(el => {
        el.classList.remove('row-start', 'row-end', 'row-rtl', 'snake-end');
        el.style.gridRow = '';
        el.style.gridColumn = '';
    });
    timeline.querySelectorAll('.snake-turn').forEach(n => n.remove());
    timeline.style.removeProperty('--wrap-width');
    timeline.style.removeProperty('--snake-cols');
}

function createPortraitThumb(evt, className) {
    const image = portraitOf(evt);
    if (!image) return null;
    const img = document.createElement('img');
    img.className = className;
    img.alt = '';
    img.decoding = 'async';
    img.loading = 'lazy';
    img.addEventListener('error', () => img.remove(), { once: true });
    img.src = image.src;
    return img;
}

// Repris de js/app/session-end.js (utilisé par les récits pour signaler un lien ou un quiz de fin
// indisponible : TorahAxe n'a pas la base d'événements d'HistoriAxe à laquelle ces liens renvoient).
let toastTimeout = null;
function showToast(message, duration = 2800) {
    const toast = document.getElementById('app-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden', 'toast-hide');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.add('toast-hide');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, duration);
}

// Mémorisation des « points faibles » (js/storage.js: srsRecord) : TorahAxe n'a pas l'écran de
// révision qui l'exploite (js/app/selection-revision.js), donc rien à enregistrer.
function srsRecord() { }

// Trophées (js/app/rewards.js) : TorahAxe n'en a pas.
function checkBadgeProgressOnAction() { }

function shuffleArray(arr) {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

// --- Suivi de session minimal (js/app/session-end.js n'est pas repris : le partage Wordle et les
// anecdotes de fin de partie ne concernent pas TorahAxe) ---
let sessionHistory = [];
function resetSessionHistory() { sessionHistory = []; }
function recordSessionStep(event, isCorrect, isPartial = false) {
    if (!event) return;
    sessionHistory.push({ event, isCorrect: !!isCorrect, isPartial: !!isPartial });
}
