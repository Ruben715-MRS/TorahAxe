// =========================================================================
// === TORAHAXE — MÉLANGE ALÉATOIRE PARTAGÉ PAR LES JEUX « MOTS DU TANAKH » ET « MOTS DE LA GUÉMARA » ===
// =========================================================================
// js/lexiconGameCore.js et js/gemaraGameCore.js d'HistoriAxe attendent un global ArcadeCore avec une
// seule méthode, `shuffle` (Fisher-Yates) : reprise telle quelle de js/arcadeCore.js (731 lignes, les
// règles de Snake/Tetris/Pac-Man/Space Invaders, hors sujet pour TorahAxe), sans le reste du fichier.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.ArcadeCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function shuffle(list, rng) {
        var random = rng || Math.random;
        var out = list.slice();
        for (var i = out.length - 1; i > 0; i--) {
            var j = Math.floor(random() * (i + 1));
            var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
        }
        return out;
    }

    return { shuffle: shuffle };
});
