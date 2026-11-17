// =========================================================================
// === MITSVA DU JOUR (calcul pur) ===
// =========================================================================
// Une des 613 mitsvot de la liste de Maïmonide (js/commandments613Data.js, par Commandments.list613 : les 248 positives puis les 365 négatives), une par jour,
// dans l'ordre de la liste, en boucle : le jour fixe N donne la mitsva N modulo 613. Même mitsva pour tout le monde le même jour ; en 613 jours on les a toutes vues.
// Testé dans tests/mitsvaOfDayCore.test.js.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.MitsvaOfDayCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // `list` : Commandments.list613('all') ; renvoie { index (0…), number (1…613 dans la liste), item } ou null.
    function of(fixed, list) {
        if (!Array.isArray(list) || !list.length || !Number.isInteger(fixed)) return null;
        var index = ((fixed % list.length) + list.length) % list.length;
        return { index: index, number: index + 1, total: list.length, item: list[index] };
    }

    return { of: of };
}));
