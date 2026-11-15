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
