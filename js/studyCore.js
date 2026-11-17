// =========================================================================
// === SUIVI D'ÉTUDE (« étudié ✓ » du Daf Yomi, des Téhilim et de la Michna Yomit) ===
// =========================================================================
// Facultatif (désactivé par défaut) et volontairement minimal : une case par étude du jour, sur l'appareil, rien d'envoyé. Cela ne compte ni dans la série
// ni dans les niveaux (qui récompensent les jeux) : c'est un simple repère personnel. On ne garde que les derniers jours.
// Pur, sans DOM : testé dans tests/studyCore.test.js.
// Magasin : { v: 1, on: false, cards: { daf: true, … }, done: { daf: [jours fixes], tehilim: [...], mishna: [...], aliyah: [...], mitsva: [...] } }
//  `on` : les cases « étudié » ; `cards` : les cartes d'étude affichées dans l'onglet Aujourd'hui (Daf Yomi, Téhilim, Michna Yomit, montée du jour : affichées par défaut ;
//  mitsva du jour : désactivée par défaut).

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.StudyCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var KINDS = ['daf', 'tehilim', 'mishna', 'aliyah', 'mitsva'];
    var CARD_DEFAULTS = { daf: true, tehilim: true, mishna: true, aliyah: true, mitsva: false };
    var KEEP_DAYS = 400;

    function normalize(raw) {
        var out = { v: 1, on: false, cards: {}, done: {} };
        KINDS.forEach(function (k) { out.done[k] = []; out.cards[k] = CARD_DEFAULTS[k]; });
        if (!raw || typeof raw !== 'object') return out;
        out.on = raw.on === true;
        if (raw.cards && typeof raw.cards === 'object') KINDS.forEach(function (k) { if (typeof raw.cards[k] === 'boolean') out.cards[k] = raw.cards[k]; });
        if (raw.done && typeof raw.done === 'object') {
            KINDS.forEach(function (k) {
                var list = Array.isArray(raw.done[k]) ? raw.done[k] : [];
                out.done[k] = list.filter(function (x, i, a) { return Number.isInteger(x) && x > 0 && a.indexOf(x) === i; }).sort(function (a, b) { return a - b; });
            });
        }
        return out;
    }

    // La carte d'étude `kind` est-elle affichée ?
    function cardOn(store, kind) { return !!(store.cards && store.cards[kind]); }

    // Affiche ou masque une carte ; renvoie un nouveau magasin.
    function setCard(store, kind, on) {
        if (KINDS.indexOf(kind) === -1) return store;
        var out = normalize(store);
        out.cards[kind] = !!on;
        return out;
    }

    function isDone(store, kind, fixed) { return store.done[kind] ? store.done[kind].indexOf(fixed) !== -1 : false; }

    // Coche ou décoche un jour ; renvoie un nouveau magasin (les jours de plus de KEEP_DAYS avant `fixed` sont oubliés).
    function toggle(store, kind, fixed) {
        if (KINDS.indexOf(kind) === -1 || !Number.isInteger(fixed)) return store;
        var out = normalize(store);
        var list = out.done[kind];
        var at = list.indexOf(fixed);
        if (at === -1) list.push(fixed); else list.splice(at, 1);
        KINDS.forEach(function (k) { out.done[k] = out.done[k].filter(function (x) { return x >= fixed - KEEP_DAYS; }).sort(function (a, b) { return a - b; }); });
        return out;
    }

    // Les jours étudiés parmi les `days` derniers jours (jusqu'à `fixed` compris) : { daf, tehilim, mishna }.
    function recent(store, fixed, days) {
        var out = {};
        KINDS.forEach(function (k) { out[k] = store.done[k].filter(function (x) { return x <= fixed && x > fixed - days; }).length; });
        return out;
    }

    return { KINDS: KINDS, KEEP_DAYS: KEEP_DAYS, CARD_DEFAULTS: CARD_DEFAULTS, cardOn: cardOn, setCard: setCard, normalize: normalize, isDone: isDone, toggle: toggle, recent: recent };
}));
