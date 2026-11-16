const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const R = require('../js/torahRefs.js');
const PAR = require('../data/torah/parashot.json');

test('LAYOUT : les chapitres et les versets de chaque livre correspondent aux fichiers de la Torah', () => {
    R.BOOK_IDS.forEach((id, i) => {
        const json = JSON.parse(fs.readFileSync('data/tanakh/' + id + '.json', 'utf8'));
        assert.deepStrictEqual(R.LAYOUT[i], json.chapters.map(c => c.length), id);
        assert.strictEqual(json.french.length, json.chapters.length, id + ' : traduction');
        json.chapters.forEach((c, ci) => assert.strictEqual(json.french[ci].length, c.length, id + ' ' + (ci + 1)));
    });
    assert.strictEqual(R.TOTAL, 5846);
});

test('indexOf et refAt : aller-retour sur tous les versets, bornes, versets inexistants', () => {
    for (let i = 0; i < R.TOTAL; i++) assert.strictEqual(R.indexOf(R.refAt(i)), i);
    assert.deepStrictEqual(R.refAt(0), { book: 1, chapter: 1, verse: 1 });
    assert.deepStrictEqual(R.refAt(R.TOTAL - 1), { book: 5, chapter: 34, verse: 12 });
    assert.strictEqual(R.refAt(-1), null);
    assert.strictEqual(R.refAt(R.TOTAL), null);
    assert.strictEqual(R.indexOf({ book: 1, chapter: 1, verse: 32 }), -1);
    assert.strictEqual(R.indexOf({ book: 1, chapter: 51, verse: 1 }), -1);
    assert.strictEqual(R.indexOf({ book: 6, chapter: 1, verse: 1 }), -1);
    assert.strictEqual(R.indexOf({ book: 2, chapter: 1, verse: 1 }), 1533);
});

test('parashaOf : frontières de parachiot, et chaque verset de la Torah a une paracha du bon livre', () => {
    const name = (b, c, v) => PAR.parashot[R.parashaOf(PAR, b, c, v)].fr;
    assert.strictEqual(name(1, 6, 8), 'Béréchit');
    assert.strictEqual(name(1, 6, 9), "Noa'h");
    assert.strictEqual(name(5, 34, 12), 'Vézot Ha-Bérakha');
    for (let i = 0; i < R.TOTAL; i++) {
        const r = R.refAt(i);
        const p = R.parashaOf(PAR, r.book, r.chapter, r.verse);
        assert.ok(p >= 0 && PAR.parashot[p].book === r.book, R.label(r));
    }
});

test('label : « Genèse 6:9 »', () => {
    assert.strictEqual(R.label({ book: 1, chapter: 6, verse: 9 }), 'Genèse 6:9');
});
