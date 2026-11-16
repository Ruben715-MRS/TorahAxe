// =========================================================================
// === TORAHAXE — MÉMOIRE LOCALE DES JEUX « MOTS DU TANAKH » ET « MOTS DE LA GUÉMARA » ===
// =========================================================================
// Reprend telles quelles les six fonctions dont js/app/lexicon-game.js et js/app/gemara-game.js ont
// besoin dans js/storage.js d'HistoriAxe — sans le reste de ce fichier (1145 lignes, tout le compte et
// la synchronisation cloud) : TorahAxe n'a ni compte ni progression à distance (voir js/srs.js, pur,
// pour l'algorithme de répétition espacée). La mémoire reste 100% locale à l'appareil.
const LEXICON_KEY = 'torahaxe_lexicon_v1';
const GEMARA_KEY = 'torahaxe_gemara_v1';

function lexiconLoad() {
    try {
        const raw = JSON.parse(localStorage.getItem(LEXICON_KEY));
        if (raw && typeof raw === 'object' && raw.words && typeof raw.words === 'object') return raw;
    } catch (e) { /* stockage absent ou illisible : aucune progression */ }
    return { v: 1, words: {} };
}

function lexiconSave(data) {
    try { localStorage.setItem(LEXICON_KEY, JSON.stringify(data)); } catch (e) { }
}

function lexiconRecord(strong, isSuccess) {
    if (!strong) return;
    const data = lexiconLoad();
    data.words[strong] = SRS.applyResult(data.words[strong], isSuccess, Date.now());
    lexiconSave(data);
}

function gemaraLoad() {
    try {
        const raw = JSON.parse(localStorage.getItem(GEMARA_KEY));
        if (raw && typeof raw === 'object' && raw.cards && typeof raw.cards === 'object') return raw;
    } catch (e) { /* stockage absent ou illisible : aucune progression */ }
    return { v: 1, cards: {} };
}

function gemaraSave(data) {
    try { localStorage.setItem(GEMARA_KEY, JSON.stringify(data)); } catch (e) { }
}

function gemaraRecord(id, isSuccess) {
    if (!id) return;
    const data = gemaraLoad();
    data.cards[id] = SRS.applyResult(data.cards[id], isSuccess, Date.now());
    gemaraSave(data);
}

// Son et haptique d'une réponse (reprise réduite de js/app/arcade.js d'HistoriAxe) : js/audio.js gère le réglage « Sons » / « Vibrations ».
function arcadeSound(kind) {
    try {
        if (kind === 'good') {
            if (typeof playCorrectSound === 'function') playCorrectSound(1);
            if (typeof triggerHaptic === 'function') triggerHaptic('success');
        } else {
            if (typeof playWrongSound === 'function') playWrongSound();
            if (typeof triggerHaptic === 'function') triggerHaptic('error');
        }
    } catch (e) { /* un son manquant ne doit jamais bloquer le jeu */ }
}

// Meilleurs scores des trois jeux (`lexicon`, `gemara`, `transmission`), gardés sur l'appareil. Renvoie tous les meilleurs scores après enregistrement.
const ARCADE_BEST_KEY = 'torahaxe_best_v1';

function arcadeRecord(game, score) {
    let best = {};
    try {
        const raw = JSON.parse(localStorage.getItem(ARCADE_BEST_KEY));
        if (raw && typeof raw === 'object') best = raw;
    } catch (e) { best = {}; }
    const n = Number(score) || 0;
    if (!(best[game] >= n)) best[game] = n;
    try { localStorage.setItem(ARCADE_BEST_KEY, JSON.stringify(best)); } catch (e) { }
    return best;
}
