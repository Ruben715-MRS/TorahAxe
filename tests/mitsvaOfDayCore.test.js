const test = require('node:test');
const assert = require('node:assert');
const M = require('../js/mitsvaOfDayCore.js');
const Commandments = require('../js/commandmentsCore.js');

test('613 mitsvot, une par jour, en boucle', () => {
    const list = Commandments.list613('all');
    assert.strictEqual(list.length, 613);
    const seen = new Set();
    for (let d = 740000; d < 740000 + 613; d++) seen.add(M.of(d, list).index);
    assert.strictEqual(seen.size, 613);
    assert.strictEqual(M.of(740000, list).item, M.of(740000 + 613, list).item);
    assert.strictEqual(M.of(740001, list).number, (M.of(740000, list).number % 613) + 1);
});

test('la première mitsva de la liste est la première positive, la 249e la première négative', () => {
    const list = Commandments.list613('all');
    assert.strictEqual(list[0].kind, 'pos');
    assert.strictEqual(list[248].kind, 'neg');
});

test('entrées invalides', () => {
    assert.strictEqual(M.of('x', [1]), null);
    assert.strictEqual(M.of(5, []), null);
    assert.strictEqual(M.of(-1, [1, 2, 3]).index, 2);
});
