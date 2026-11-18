// =========================================================================
// === LA LECTURE DE LA TORA EN SEMAINE : QUELLES MONTÉES LIT-ON AUJOURD'HUI ? (calculs purs, sans DOM) ===
// =========================================================================
// Données : data/torah/weekday.json (scripts/build_weekday_readings.py, d'après Hebcal) : les trois montées du lundi et du jeudi pour
// chaque paracha, et les lectures des jours particuliers (Roch 'Hodech, jeûne public, Pourim, 9 Av). Le lundi et le jeudi, on lit le début
// de la paracha du Chabbat qui vient (ou de la prochaine paracha lue, si ce Chabbat est une fête). Hanouka et 'Hol hamoèd ont leurs propres
// lectures, pas encore dans l'application. Contenu halakhique : **à relire**. Testé dans tests/torahReadingCore.test.js.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./siddurCore.js'), require('./sedraCore.js'));
    else root.TorahReadingCore = factory(root.SiddurCore, root.SedraCore);
}(typeof self !== 'undefined' ? self : this, function (S, Sedra) {
    'use strict';

    // La paracha du prochain Chabbat ordinaire à partir du jour `fixed` (les Chabbats de fête n'en ont pas) : son indice, ou null.
    function nextParasha(fixed, israel) {
        var shabbat = fixed + ((6 - S.contextFor(fixed, israel).weekday + 7) % 7);
        for (var k = 0; k < 5; k++) {
            var p = Sedra.parashaOfShabbat(shabbat + 7 * k, israel);
            if (p && p.length) return p[0];
        }
        return null;
    }

    // La lecture du jour hébraïque `fixed` : { kind, parasha?, special? }. kind : 'parasha' (lundi, jeudi), 'rc', 'fast', 'purim', 'tishaBav'
    // (lectures de la Tora du matin), 'hanukkah', 'cholHamoed' (lectures propres, pas encore dans l'application) ou 'none'.
    function readingFor(fixed, israel) {
        var ctx = S.contextFor(fixed, israel), f = ctx.flags;
        if (f.shabbat || f.yomTov) return { kind: 'none' };
        if (f.hanukkah) return { kind: 'hanukkah' };
        if (f.ch) return { kind: 'cholHamoed' };
        if (f.tishaBav) return { kind: 'tishaBav' };
        if (f.fastPublic) return { kind: 'fast' };
        if (f.purim) return { kind: 'purim' };
        if (f.rc) return { kind: 'rc' };
        if (ctx.weekday === 1 || ctx.weekday === 4) { var p = nextParasha(fixed, israel); return p === null ? { kind: 'none' } : { kind: 'parasha', parasha: p }; }
        return { kind: 'none' };
    }

    // La prochaine lecture à partir du jour `fixed` (inclus) : { fixed, reading }, dans les sept jours.
    function nextReading(fixed, israel) {
        for (var d = 0; d < 8; d++) { var r = readingFor(fixed + d, israel); if (r.kind !== 'none') return { fixed: fixed + d, reading: r }; }
        return null;
    }

    // Les montées : [{ book, c1, v1, c2, v2 }] ; null si la lecture n'est pas dans les données.
    function aliyot(reading, data) {
        var src = reading.kind === 'parasha' ? data.parashot[reading.parasha] : data.special[reading.kind];
        if (!src) return null;
        return src.a.map(function (r) { return { book: src.book, c1: r[0], v1: r[1], c2: r[2], v2: r[3] }; });
    }

    return { readingFor: readingFor, nextReading: nextReading, nextParasha: nextParasha, aliyot: aliyot };
}));
