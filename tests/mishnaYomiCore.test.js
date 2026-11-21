const test = require('node:test');
const assert = require('node:assert');
const M = require('../js/mishnaYomiCore.js');
const CY = require('../js/calendarYearCore.js');
const fx = (y, m, d) => CY.gregorianToFixed(y, m, d);

test('le cycle : 63 traités, 4192 michnayot, 2096 jours', () => {
    assert.strictEqual(M.TOTAL, 4192);
    assert.strictEqual(M.DAYS, 2096);
});

test('le premier jour du cycle, le 20 mai 1947 : Berakhot 1:1-2 ; la veille, rien', () => {
    const r = M.forFixed(fx(1947, 5, 20));
    assert.deepStrictEqual([r.first.id, r.first.chapter, r.first.mishna, r.second.mishna, r.cycle, r.day], ['berakhot', 1, 1, 2, 1, 1]);
    assert.strictEqual(M.forFixed(fx(1947, 5, 19)), null);
    assert.strictEqual(M.label(r), 'Berakhot 1:1-2');
});

test('valeurs de référence (Hebcal) : 17 novembre 2026 = Oholot 18:10 – Negaïm 1:1', () => {
    const r = M.forFixed(fx(2026, 11, 17));
    assert.deepStrictEqual([r.first.id, r.first.chapter, r.first.mishna, r.second.id, r.second.chapter, r.second.mishna], ['oholot', 18, 10, 'negaim', 1, 1]);
});

test('le dernier jour finit par Oktsin 3:12, puis le cycle recommence', () => {
    const last = M.forFixed(M.START + M.DAYS - 1);
    assert.deepStrictEqual([last.second.id, last.second.chapter, last.second.mishna, last.daysLeft], ['oktzin', 3, 12, 0]);
    const next = M.forFixed(M.START + M.DAYS);
    assert.deepStrictEqual([next.cycle, next.day, next.first.id], [2, 1, 'berakhot']);
});

test('chaque jour consécutif avance de deux michnayot, sans trou ni doublon', () => {
    let prev = null;
    for (let i = 0; i < M.DAYS; i++) {
        const r = M.forFixed(M.START + i);
        if (prev) {
            const same = prev.second.id === r.first.id;
            if (same && prev.second.chapter === r.first.chapter) assert.strictEqual(r.first.mishna, prev.second.mishna + 1);
            else if (same) assert.strictEqual([r.first.chapter, r.first.mishna].join(), [prev.second.chapter + 1, 1].join());
            else assert.strictEqual(r.first.mishna, 1);
        }
        prev = r;
    }
});
