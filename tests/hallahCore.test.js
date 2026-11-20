const test = require('node:test');
const assert = require('node:assert');
const H = require('../js/hallahCore.js');

test('toGrams : kg ou g, virgule décimale, rejet du reste', () => {
    assert.strictEqual(H.toGrams('1,5', 'kg'), 1500);
    assert.strictEqual(H.toGrams(2, 'kg'), 2000);
    assert.strictEqual(H.toGrams('900', 'g'), 900);
    assert.strictEqual(H.toGrams('', 'kg'), null);
    assert.strictEqual(H.toGrams('abc', 'g'), null);
    assert.strictEqual(H.toGrams(-3, 'kg'), null);
    assert.strictEqual(H.toGrams(0, 'kg'), null);
});

test('assess : les quatre paliers, bornes comprises', () => {
    assert.strictEqual(H.assess(null), null);
    assert.strictEqual(H.assess(1199), 'none');
    assert.strictEqual(H.assess(1200), 'noBless');
    assert.strictEqual(H.assess(1665), 'noBless');
    assert.strictEqual(H.assess(1666), 'bless');
    assert.strictEqual(H.assess(2249), 'bless');
    assert.strictEqual(H.assess(2250), 'blessAll');
    assert.strictEqual(H.assess(5000), 'blessAll');
});
