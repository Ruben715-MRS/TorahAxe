// =========================================================================
// === MICHNA YOMIT (deux michnayot par jour, calcul pur) ===
// =========================================================================
// Le cycle de Mishna Yomi : deux michnayot par jour, dans l'ordre de la Michna (63 traités, 4 192 michnayot → 2 096 jours, environ 5 ans et 9 mois),
// commencé le 20 mai 1947 (5 Sivan 5707) puis recommencé sans interruption. La table des chapitres (js/mishnaYomiTable.js) est générée par
// scripts/build_mishna_yomi.js à partir du programme de Hebcal et vérifiée chapitre par chapitre contre data/michna/.
// Pas de pause le Chabbat ni les jours de fête : la michna du jour se compte en jours civils (comme le Daf Yomi).
// Testé dans tests/mishnaYomiCore.test.js.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./mishnaYomiTable.js'), require('./calendarYearCore.js'));
    else root.MishnaYomiCore = factory(root.MISHNA_YOMI_TABLE, root.CalendarYearCore);
}(typeof self !== 'undefined' ? self : this, function (TABLE, CY) {
    'use strict';

    var PER_DAY = 2;
    var TOTAL = TABLE.reduce(function (n, t) { return n + t[3].reduce(function (a, b) { return a + b; }, 0); }, 0);   // 4192
    var DAYS = TOTAL / PER_DAY;                                                                                          // 2096
    var START = CY.gregorianToFixed(1947, 5, 20);

    // La michna de rang `k` (depuis 0) du cycle : { id, fr, he, chapter, mishna }.
    function at(k) {
        for (var i = 0; i < TABLE.length; i++) {
            var chapters = TABLE[i][3];
            for (var c = 0; c < chapters.length; c++) {
                if (k < chapters[c]) return { id: TABLE[i][0], fr: TABLE[i][1], he: TABLE[i][2], chapter: c + 1, mishna: k + 1 };
                k -= chapters[c];
            }
        }
        return null;
    }

    // Les deux michnayot du jour `fixed` : { cycle (depuis 1), day (1…2096), daysLeft, first, second } ; null avant le 20 mai 1947.
    function forFixed(fixed) {
        if (typeof fixed !== 'number' || fixed < START) return null;
        var n = fixed - START;
        var day = n % DAYS;
        return { cycle: Math.floor(n / DAYS) + 1, day: day + 1, daysLeft: DAYS - 1 - day, first: at(day * PER_DAY), second: at(day * PER_DAY + 1) };
    }

    // « Oholot 18:10 – Negaïm 1:1 » ; dans un même traité : « Berakhot 1:1-2 » ; dans un même chapitre, « Berakhot 1:1-2 ».
    function label(r) {
        if (!r) return '';
        var a = r.first, b = r.second;
        if (a.id !== b.id) return a.fr + ' ' + a.chapter + ':' + a.mishna + ' – ' + b.fr + ' ' + b.chapter + ':' + b.mishna;
        if (a.chapter === b.chapter) return a.fr + ' ' + a.chapter + ':' + a.mishna + '-' + b.mishna;
        return a.fr + ' ' + a.chapter + ':' + a.mishna + ' – ' + b.chapter + ':' + b.mishna;
    }

    return { forFixed: forFixed, label: label, at: at, START: START, TOTAL: TOTAL, DAYS: DAYS };
}));
