// =========================================================================
// === GUIDE DES BÉNÉDICTIONS — RECHERCHE ET FILTRES (sans DOM) ===
// =========================================================================
// Les données sont dans js/benedictionsData.js ; l'écran dans js/app/benedictions.js. Ici, ce qui se calcule, testé dans tests/benedictionsCore.test.js :
//  - la recherche d'un aliment (sans accents ni majuscules, sur son nom, le détail de ses cas et le nom de sa bénédiction) ;
//  - le filtre par bénédiction (un aliment à plusieurs bénédictions apparaît sous chacune d'elles) ;
//  - les notes d'un aliment, dans l'ordre et sans doublon.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./benedictionsData.js'));
    else root.BenedictionsCore = factory(root.BenedictionsData);
}(typeof self !== 'undefined' ? self : this, function (Data) {
    'use strict';

    function normalize(text) {
        return String(text == null ? '' : text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe')
            .replace(/[^a-z0-9]+/g, ' ').trim();
    }
    function active(v) { return v !== undefined && v !== null && v !== '' && v !== 'all'; }

    // Les bénédictions d'un aliment, sans doublon, dans l'ordre où on les dit.
    function blessingsOf(food) {
        if (!food.steps) return [food.b];
        var seen = [];
        food.steps.forEach(function (s) { if (seen.indexOf(s.b) === -1) seen.push(s.b); });
        return seen;
    }

    // Les numéros de notes d'un aliment (le sien, puis ceux de ses cas), sans doublon, dans l'ordre du guide.
    function notesOf(food) {
        var all = (food.notes || []).slice();
        (food.steps || []).forEach(function (s) { (s.notes || []).forEach(function (n) { all.push(n); }); });
        return all.filter(function (n, i) { return all.indexOf(n) === i; }).sort(function (a, b) { return a - b; });
    }

    function label(b) {
        var def = b === 'aucune' ? Data.NONE : Data.BLESSINGS[b];
        return def ? def.fr : String(b);
    }

    function searchText(food) {
        var parts = [food.n];
        (food.steps || []).forEach(function (s) { parts.push(s.t); });
        blessingsOf(food).forEach(function (b) { parts.push(label(b)); });
        return normalize(parts.join(' '));
    }

    // `f` : { b (une clé de Data.ORDER, ou « all »), query } ; une valeur absente, vide ou « all » ne filtre pas.
    // Chaque mot de la recherche doit se retrouver (« tarte pomme » trouve « Tarte aux pommes »).
    function filterFoods(f) {
        f = f || {};
        var words = active(f.query) ? normalize(f.query).split(' ').filter(Boolean) : [];
        return Data.FOODS.filter(function (food) {
            if (active(f.b) && blessingsOf(food).indexOf(f.b) === -1) return false;
            if (!words.length) return true;
            var hay = searchText(food);
            return words.every(function (w) { return hay.indexOf(w) !== -1; });
        });
    }

    // Le nombre d'aliments par bénédiction (pour les puces du filtre).
    function countByBlessing() {
        var counts = {};
        Data.ORDER.forEach(function (b) { counts[b] = 0; });
        Data.FOODS.forEach(function (food) { blessingsOf(food).forEach(function (b) { counts[b] = (counts[b] || 0) + 1; }); });
        return counts;
    }

    return { normalize: normalize, blessingsOf: blessingsOf, notesOf: notesOf, label: label, filterFoods: filterFoods, countByBlessing: countByBlessing };
}));
