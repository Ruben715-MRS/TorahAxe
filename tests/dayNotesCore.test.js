const test = require('node:test');
const assert = require('node:assert');
const D = require('../js/dayNotesCore.js');
const CY = require('../js/calendarYearCore.js');
const fx = (y, m, d) => CY.gregorianToFixed(y, m, d);
const parts = (fixed, israel) => D.notesOf(fixed, !!israel);
const types = n => n.parts.map(p => p.type);

test('jour ordinaire : rien', () => {
    const n = parts(fx(2026, 11, 17));
    assert.strictEqual(n.level, null);
    assert.deepStrictEqual(n.parts, []);
});

test("Roch 'Hodech : le 30 du mois qui finit est son 1er jour, le 1er son 2e (Kislev 5787)", () => {
    const a = parts(fx(2026, 11, 10)).parts.find(p => p.type === 'rc');     // 30 'Hechvan 5787
    const b = parts(fx(2026, 11, 11)).parts.find(p => p.type === 'rc');     // 1 Kislev 5787
    assert.deepStrictEqual([a.month, a.ordinal], ['Kislev', 1]);
    assert.deepStrictEqual([b.month, b.ordinal], ['Kislev', 2]);
    assert.strictEqual(parts(fx(2026, 11, 11)).level, 'minor');
});

test("Roch 'Hodech sur toute l'année 5787 : 2 jours après un mois de 30, 1 seul (sans numéro) après un mois de 29", () => {
    const HC = require('../js/hebrewCalendarCore.js');
    const start = fx(2026, 9, 12);   // 1 Tichri 5787
    let one = 0, two = 0;
    for (let f = start; f < start + 354; f++) {
        const rc = D.notesOf(f, false).parts.find(p => p.type === 'rc');
        if (!rc) continue;
        const day = HC.hebrewFromFixed(f).day;
        if (rc.ordinal === 0) { one++; assert.strictEqual(day, 1); assert.strictEqual(HC.hebrewFromFixed(f - 1).day, 29); }
        else if (rc.ordinal === 1) { two++; assert.strictEqual(day, 30); }
        else assert.strictEqual(rc.ordinal, 2);
    }
    assert.ok(one > 0 && two > 0, one + ' / ' + two);
});

test('Hanouka 5787 : 1 bougie le 24 Kislev, N + 1 ensuite, rien le dernier jour', () => {
    const f1 = fx(2026, 12, 4);   // 24 Kislev 5787 (vendredi)
    const h = d => parts(f1 + d).parts.find(p => p.type === 'hanouka');
    assert.strictEqual(h(0).candles, 1);
    assert.strictEqual(h(0).weekday, 5);
    assert.strictEqual(h(1).candles, 2);
    assert.strictEqual(h(1).weekday, 6);
    assert.strictEqual(h(7).candles, 8);
    assert.strictEqual(h(8).last, true);
    assert.strictEqual(h(9), undefined);
    assert.strictEqual(h(-1), undefined);
    assert.strictEqual(parts(f1 + 3).level, 'special');
});

test('Pessa\'h 5787 : 1er jour = Yom Tov, 2e jour aussi en diaspora seulement, puis \'Hol haMoed', () => {
    const p1 = fx(2027, 4, 22);   // 15 Nissan 5787
    const first = parts(p1).parts.find(p => p.type === 'feast');
    assert.deepStrictEqual([first.id, first.ordinal, first.yomtov, parts(p1).level], ['pessah', 1, true, 'yomtov']);
    const day2d = parts(p1 + 1, false).parts.find(p => p.type === 'feast');
    assert.strictEqual(day2d.yomtov, true);
    const day2i = parts(p1 + 1, true).parts.find(p => p.type === 'feast');
    assert.deepStrictEqual([day2i.nameId, day2i.yomtov, parts(p1 + 1, true).level], ['pessah_ch', false, 'special']);
});

test('veille de fête : le jour avant le 1er jour, pas avant le 2e', () => {
    const eve = parts(fx(2027, 4, 21));                         // 14 Nissan 5787
    assert.deepStrictEqual(eve.parts.filter(p => p.type === 'eve').map(p => p.id), ['pessah']);
    assert.strictEqual(parts(fx(2027, 4, 22)).parts.some(p => p.type === 'eve'), false);
    const roshEve = parts(fx(2027, 10, 1));                     // 29 Elloul 5787 → Roch Hachana le 2 octobre 2027
    assert.ok(roshEve.parts.some(p => p.type === 'eve' && p.id === 'rosh'), JSON.stringify(roshEve));
});

test('Yom Kippour : Yom Tov', () => {
    const n = parts(fx(2026, 9, 21));                           // 10 Tichri 5787
    assert.ok(n.parts.some(p => p.id === 'kippour' && p.yomtov));
    assert.strictEqual(n.level, 'yomtov');
});
