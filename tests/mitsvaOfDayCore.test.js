const test = require('node:test');
const assert = require('node:assert');
const M = require('../js/mitsvaOfDayCore.js');
const D = require('../js/mitsvaCycleData.js');
const H = require('../js/hebrewCalendarCore.js');
const CY = require('../js/calendarYearCore.js');
const Commandments = require('../js/commandmentsCore.js');

// Le même calendrier que l'accueil : année hébraïque du jour, et jour fixe du 16 Chevat de chaque année.
const cal = {
    yearOf: f => H.hebrewFromFixed(f).year,
    shevat16: y => H.hebrewToGregorian(y, 'Shevat', 16).fixed,
};
const fx = (y, m, d) => CY.gregorianToFixed(y, m, d);

test('le cycle a 339 leçons, la première le 16 Chevat 5786 (3 février 2026)', () => {
    assert.strictEqual(M.LENGTH, 339);
    assert.strictEqual(cal.shevat16(5786), fx(2026, 2, 3));
    assert.deepStrictEqual(M.lessonOf(fx(2026, 2, 3), cal), { lesson: 1, tokens: [] });
    assert.strictEqual(M.lessonOf(fx(2026, 2, 3) - 1, cal), null);                 // la veille : le cycle précédent est fini
});

test('quelques dates du calendrier de Chabad.org', () => {
    assert.deepStrictEqual(M.lessonOf(fx(2026, 3, 13), cal).tokens, ['N320']);     // leçon 39 : 24 Adar 5786
    assert.deepStrictEqual(M.lessonOf(fx(2026, 5, 21), cal).tokens, ['P7']);       // leçon 108 : 5 Sivan
    assert.deepStrictEqual(M.lessonOf(fx(2027, 1, 7), cal), { lesson: 339, tokens: D.LESSONS[338] });   // 28 Tevet 5787 : dernière leçon
    assert.strictEqual(M.lessonOf(fx(2027, 1, 8), cal), null);                     // après le cycle : rien jusqu'au 16 Chevat suivant
});

test('avant le 16 Chevat, on est dans le cycle de l’année précédente', () => {
    // 1er août 2026 : le cycle commencé le 3 février 2026, 180e leçon.
    assert.strictEqual(M.lessonOf(fx(2026, 8, 1), cal).lesson, 180);
});

test('chaque positif (1 à 248) et chaque négatif (1 à 365) est étudié au moins une fois', () => {
    const seen = new Set(D.LESSONS.flat());
    for (let i = 1; i <= 248; i++) assert.ok(seen.has('P' + i), 'P' + i);
    for (let i = 1; i <= 365; i++) assert.ok(seen.has('N' + i), 'N' + i);
    assert.ok(D.LESSONS.every(t => t.every(x => /^[PN]\d+$/.test(x))));
});

test('of() donne les commandements du jour, avec leur type et leur numéro', () => {
    const pos = Commandments.list613('pos');
    const neg = Commandments.list613('neg');
    const day = M.of(fx(2026, 5, 24), cal, pos, neg);      // leçon 111 : N157 (voir les données)
    assert.ok(day && day.items.length >= 1);
    const first = day.items[0];
    assert.strictEqual(first.kind, 'neg');
    assert.strictEqual(first.n, 157);
    assert.strictEqual(first.text, neg[156].text);
    // Un jour avec deux commandements : leçon 50, P165, N329, P164, N196 (ordre du calendrier).
    const many = M.of(fx(2026, 3, 24), cal, pos, neg);
    assert.strictEqual(many.lesson, 50);
    assert.deepStrictEqual(many.items.map(i => i.kind + i.n), ['pos165', 'neg329', 'pos164', 'neg196']);
    // Jour sans commandement (leçon 1) : rien.
    assert.strictEqual(M.of(fx(2026, 2, 3), cal, pos, neg), null);
    // Hors cycle : rien.
    assert.strictEqual(M.of(fx(2027, 1, 8), cal, pos, neg), null);
});

test('entrées invalides', () => {
    assert.strictEqual(M.lessonOf('x', cal), null);
    assert.strictEqual(M.lessonOf(fx(2026, 2, 3), null), null);
    assert.strictEqual(M.of(fx(2026, 2, 3), cal, [], []), null);
});
