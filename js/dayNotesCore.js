// Ce qu'un jour a de spécial, pour la vue « Semaine » des Zmanim : fêtes, 'Hol haMoed, Roch 'Hodech, bougies de Hanouka, veille de fête. Pur : testable sous `npm test`.
// Rend des éléments structurés (pas de texte) : { level, parts }. `level` : 'yomtov' (jour de fête où l'on ne travaille pas), 'special' (autre fête, jeûne, Hanouka,
// 'Hol haMoed), 'minor' (Roch 'Hodech, veille de fête) ou null. L'écran écrit les phrases (js/app/zmanim.js, zmWeekNoteLines).
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./hebrewCalendarCore.js'));
    else root.DayNotesCore = factory(root.HebrewCalendarCore);
}(typeof self !== 'undefined' ? self : this, function (C) {
    'use strict';

    var RANK = { minor: 1, special: 2, yomtov: 3 };

    function feastById(year, israel, id) {
        var all = C.feastsOf(year, israel);
        for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
        return null;
    }

    // Les bougies de Hanouka du soir : le jour N de Hanouka, on allume le soir qui vient N + 1 bougies ; la veille du 1er jour (24 Kislev), la 1re bougie.
    // Le dernier jour, plus de bougie : on le dit seulement.
    function hanoukaPart(fixed, h, israel) {
        var f = feastById(h.year, israel, 'hanouka');
        if (!f) return null;
        var i = fixed - f.fixed;
        if (i >= -1 && i <= 6) return { type: 'hanouka', candles: i + 2, weekday: C.weekdayOf(fixed) };
        if (i === 7) return { type: 'hanouka', last: true };
        return null;
    }

    function notesOf(fixed, israel) {
        var info = C.dayInfo(fixed, israel), h = info.hebrew;
        var parts = [], level = null;
        var raise = function (l) { if (!level || RANK[l] > RANK[level]) level = l; };

        info.feasts.forEach(function (f) {
            if (f.id === 'hanouka') return;
            var ch = (f.id === 'souccot' || f.id === 'pessah') && C.cholHamoedOf(fixed, israel) === f.id;
            var yomtov = f.kind === 'moed' && !ch;
            parts.push({ type: 'feast', id: f.id, nameId: C.feastNameId(f.id, fixed, israel), ordinal: f.days > 1 && f.id !== 'chemini' ? fixed - f.fixed + 1 : 0, yomtov: yomtov });
            raise(yomtov ? 'yomtov' : 'special');
        });

        var han = hanoukaPart(fixed, h, israel);
        if (han) { parts.push(han); raise('special'); }

        // Roch 'Hodech : le 30 du mois qui finit est le 1er jour de celui qui vient ; le 1er est le 2e jour s'il suit un 30, sinon le seul.
        if (info.roshChodesh) {
            var rc;
            if (h.day === 30) { var n = C.hebrewFromFixed(fixed + 1); rc = { type: 'rc', year: n.year, month: n.month, ordinal: 1 }; }
            else rc = { type: 'rc', year: h.year, month: h.month, ordinal: C.hebrewFromFixed(fixed - 1).day === 30 ? 2 : 0 };
            parts.push(rc);
            raise('minor');
        }

        // La veille d'une fête de la Torah (le jour avant son 1er jour) : les bougies s'allument ce soir.
        var next = C.hebrewFromFixed(fixed + 1);
        var eveOf = C.feastsOf(next.year, israel).filter(function (f) { return f.kind === 'moed' && f.fixed === fixed + 1; })[0];
        if (eveOf) { parts.push({ type: 'eve', id: eveOf.id }); raise('minor'); }

        return { level: level, parts: parts };
    }

    return { notesOf: notesOf };
}));
