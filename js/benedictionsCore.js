// =========================================================================
// === GUIDE DES BÉNÉDICTIONS — RECHERCHE ET FILTRES (sans DOM) ===
// =========================================================================
// Les données sont dans js/benedictionsData.js ; l'écran dans js/app/benedictions.js. Ici, ce qui se calcule, testé dans tests/benedictionsCore.test.js :
//  - la recherche d'un aliment (sans accents ni majuscules, sur son nom, le détail de ses cas et le nom de sa bénédiction) ;
//  - le rite (Séfarade, Ashkénaze, 'Habad) : la liste est celle de 'Habad ; `view` donne l'aliment tel qu'un autre rite le lit (bénédiction et note propres) ;
//  - la bénédiction finale (Birkat Hamazon, Al Hamihya, Al Haguéfen, Al Haets, Boré Nefachot) d'un aliment, et la quantité qui l'exige, selon le rite ;
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

    function riteOf(rite) { return Data.RITES[rite] ? rite : Data.DEFAULT_RITE; }

    // L'écart d'un rite pour un aliment, ou null : { b?, note }. 'Habad (la liste telle quelle) n'a jamais d'écart.
    function override(food, rite) {
        rite = riteOf(rite);
        var o = Data.RITE_OVERRIDES[food.n];
        return (rite !== 'habad' && o && o[rite]) || null;
    }

    // L'aliment tel qu'il se lit dans un rite : { b ou steps, diff (la bénédiction change par rapport à 'Habad), habad (la bénédiction 'Habad, si diff), note }.
    function view(food, rite) {
        var o = override(food, rite);
        var v = { b: food.b, steps: food.steps, diff: false, habad: null, note: o ? o.note : null };
        if (o && o.b && o.b !== food.b) { v.b = o.b; v.diff = true; v.habad = food.b; }
        return v;
    }

    // Les bénédictions d'un aliment dans un rite, sans doublon, dans l'ordre où on les dit.
    function blessingsOf(food, rite) {
        var v = view(food, rite);
        if (!v.steps) return [v.b];
        var seen = [];
        v.steps.forEach(function (s) { if (seen.indexOf(s.b) === -1) seen.push(s.b); });
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

    function searchText(food, rite) {
        var parts = [food.n];
        (food.steps || []).forEach(function (s) { parts.push(s.t); });
        blessingsOf(food, rite).forEach(function (b) { parts.push(label(b)); });
        return normalize(parts.join(' '));
    }

    // `f` : { b (une clé de Data.ORDER, ou « all »), query, rite } ; une valeur absente, vide ou « all » ne filtre pas.
    // Chaque mot de la recherche doit se retrouver (« tarte pomme » trouve « Tarte aux pommes »).
    function filterFoods(f) {
        f = f || {};
        var words = active(f.query) ? normalize(f.query).split(' ').filter(Boolean) : [];
        return Data.FOODS.filter(function (food) {
            if (active(f.b) && blessingsOf(food, f.rite).indexOf(f.b) === -1) return false;
            if (!words.length) return true;
            var hay = searchText(food, f.rite);
            return words.every(function (w) { return hay.indexOf(w) !== -1; });
        });
    }

    // La bénédiction finale (clé de Data.FINALS) qui suit une bénédiction initiale `b` pour un aliment, ou null s'il n'y en a pas.
    function finalOf(b, food) {
        if (b === 'aucune') return null;
        if (Data.FINAL_OVERRIDES[food.n]) return Data.FINAL_OVERRIDES[food.n];
        if (b === 'hamotsi') return 'hamazon';
        if (b === 'mezonot') return 'hamihya';
        if (b === 'haguafen') return 'hagefen';
        if (b === 'haets') return Data.SEVEN_SPECIES.indexOf(food.n) !== -1 ? 'haets' : 'nefachot';
        return 'nefachot';
    }

    // Les bénédictions finales d'un aliment dans un rite, sans doublon, dans l'ordre des bénédictions initiales (vide : aucune).
    function finalsOf(food, rite) {
        var seen = [];
        blessingsOf(food, rite).forEach(function (b) {
            var k = finalOf(b, food);
            if (k && seen.indexOf(k) === -1) seen.push(k);
        });
        return seen;
    }

    function isLiquid(food) { return Data.LIQUIDS.indexOf(food.n) !== -1; }

    // La quantité qui oblige à dire la bénédiction finale `key` : un liquide (revi'it) pour le vin et les boissons, un kazaït sinon.
    function shiur(key, food, rite) {
        var S = Data.SHIUR[riteOf(rite)];
        return (key === 'hagefen' || (key === 'nefachot' && isLiquid(food))) ? S.drink : S.food;
    }

    // La précision propre à un aliment et à un rite sur la bénédiction finale, ou null.
    function finalNote(food, rite) {
        var n = Data.FINAL_NOTES[food.n];
        return (n && n[riteOf(rite)]) || null;
    }

    // Le nombre d'aliments par bénédiction (pour les puces du filtre).
    function countByBlessing(rite) {
        var counts = {};
        Data.ORDER.forEach(function (b) { counts[b] = 0; });
        Data.FOODS.forEach(function (food) { blessingsOf(food, rite).forEach(function (b) { counts[b] = (counts[b] || 0) + 1; }); });
        return counts;
    }

    return { normalize: normalize, riteOf: riteOf, override: override, view: view, blessingsOf: blessingsOf, notesOf: notesOf, label: label, finalOf: finalOf, finalsOf: finalsOf, isLiquid: isLiquid, shiur: shiur, finalNote: finalNote, filterFoods: filterFoods, countByBlessing: countByBlessing };
}));
