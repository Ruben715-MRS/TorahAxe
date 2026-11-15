const test = require('node:test');
const assert = require('node:assert');
const A = require('../js/appearanceCore.js');

test('normalize : valeurs par défaut et rejet des valeurs inconnues', () => {
    assert.deepStrictEqual(A.normalize(null), A.DEFAULTS);
    assert.deepStrictEqual(A.normalize('x'), A.DEFAULTS);
    const p = A.normalize({ theme: 'dark', wallpaper: 'pink', motif: 'meander', intensity: 9 });
    assert.deepStrictEqual(p, { theme: 'dark', wallpaper: 'none', motif: 'meander', intensity: 'medium' });
});

test('resolveTheme : Auto suit le système', () => {
    assert.strictEqual(A.resolveTheme('auto', true), 'dark');
    assert.strictEqual(A.resolveTheme('auto', false), 'light');
    assert.strictEqual(A.resolveTheme('light', true), 'light');
    assert.strictEqual(A.resolveTheme('dark', false), 'dark');
});

test('apply : pose les quatre attributs', () => {
    const attrs = {};
    A.apply({ setAttribute: (k, v) => { attrs[k] = v; } }, { theme: 'auto', wallpaper: 'sky', motif: 'grid', intensity: 'high' }, true);
    assert.deepStrictEqual(attrs, { 'data-theme': 'dark', 'data-wallpaper': 'sky', 'data-motif': 'grid', 'data-motif-intensity': 'high' });
});
