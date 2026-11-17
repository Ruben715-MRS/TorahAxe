// =========================================================================
// === TORAHAXE — MÉMOIRE LOCALE DES JEUX (progression, meilleurs scores, sons) ===
// =========================================================================
// La progression des jeux à mémoire (mots du Tanakh, cartes de la Guémara), les meilleurs scores, le son d'une réponse. Tout est local à l'appareil :
// TorahAxe n'a ni compte ni synchronisation (l'algorithme de répétition espacée est dans js/srs.js, pur).
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

// Son et haptique d'une réponse : js/audio.js gère le réglage « Sons » / « Vibrations ».
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

// Meilleurs scores (`lexicon`, `gemara`, `transmission`, `review`…), gardés sur l'appareil. Renvoie tous les meilleurs scores après enregistrement.
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
