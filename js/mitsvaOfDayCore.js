// =========================================================================
// === MITSVA DU JOUR (calcul pur) : le cycle annuel du Séfer ha-Mitsvot ===
// =========================================================================
// Le cycle suit le calendrier de Chabad.org (données dans js/mitsvaCycleData.js) : une leçon par jour, à partir du 16 Chevat de chaque année hébraïque,
// et il dure 339 jours. La leçon 1 tombe donc le 16 Chevat ; la leçon N, (16 Chevat + N − 1) jours. Après la leçon 339 (28 Tevet), et jusqu'au 16 Chevat suivant,
// il n'y a pas de mitsva du jour. Les leçons sans commandement (1 à 4, 36) n'en donnent pas non plus.
// Le calendrier est passé en paramètre : `calendar` = { yearOf(fixed) : année hébraïque du jour, shevat16(year) : jour fixe du 16 Chevat de cette année }.
// Testé dans tests/mitsvaOfDayCore.test.js.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./mitsvaCycleData.js'));
    else root.MitsvaOfDayCore = factory(root.MitsvaCycleData);
}(typeof self !== 'undefined' ? self : this, function (data) {
    'use strict';

    var LESSONS = data.LESSONS;

    // La leçon du jour fixe `fixed` : { lesson (1…339), tokens } ou null (hors cycle).
    function lessonOf(fixed, calendar) {
        if (!Number.isInteger(fixed) || !calendar) return null;
        var year = calendar.yearOf(fixed);
        var start = calendar.shevat16(year);
        if (fixed < start) start = calendar.shevat16(year - 1);   // avant le 16 Chevat : on est dans le cycle commencé l'année précédente
        var k = fixed - start;
        if (k < 0 || k >= LESSONS.length) return null;
        return { lesson: k + 1, tokens: LESSONS[k] };
    }

    // Les commandements du jour : { lesson, items: [{ kind, n, text, ref, group }] }, ou null s'il n'y en a pas.
    // `pos` et `neg` : les listes Commandments.list613('pos') et ('neg'), dont le numéro n est l'index + 1.
    function of(fixed, calendar, pos, neg) {
        var lesson = lessonOf(fixed, calendar);
        if (!lesson || !lesson.tokens.length) return null;
        var items = [];
        lesson.tokens.forEach(function (tok) {
            var kind = tok.charAt(0) === 'P' ? 'pos' : 'neg';
            var n = parseInt(tok.slice(1), 10);
            var list = kind === 'pos' ? pos : neg;
            if (list && n >= 1 && n <= list.length) items.push(list[n - 1]);
        });
        return items.length ? { lesson: lesson.lesson, items: items } : null;
    }

    return { of: of, lessonOf: lessonOf, LENGTH: LESSONS.length };
}));
