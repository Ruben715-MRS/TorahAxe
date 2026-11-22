const test = require('node:test');
const assert = require('node:assert');
const Gem = require('../js/gematriaCore.js');

test('compute : שלום vaut 376 en standard', () => {
    assert.strictEqual(Gem.compute('שלום', 'standard').total, 376);
});

test('compare : deux mots de même valeur', () => {
    const r = Gem.compare(Gem.compute('אהבה', 'standard'), Gem.compute('אחד', 'standard'));
    assert.strictEqual(r.equal, true);          // אהבה = 13 = אחד
    assert.strictEqual(r.difference, 0);
    assert.strictEqual(r.larger, null);
    assert.strictEqual(r.multiple, null);
    assert.deepStrictEqual(r.common, ['א']);
});

test('compare : écart, plus grand et multiple', () => {
    const r = Gem.compare(Gem.compute('שלום', 'standard'), Gem.compute('שלם', 'standard'));
    assert.strictEqual(r.equal, false);
    assert.strictEqual(r.difference, 6);        // 376 − 370
    assert.strictEqual(r.larger, 'a');
    assert.deepStrictEqual(r.common, ['ל', 'מ', 'ש']);
    // 26 (יהוה) et 13 (אחד) : 26 = 2 × 13
    const m = Gem.compare(Gem.compute('יהוה', 'standard'), Gem.compute('אחד', 'standard'));
    assert.strictEqual(m.multiple, 2);
    assert.strictEqual(m.larger, 'a');
});

test('compare : lettre finale et ordinaire comptent comme la même lettre commune', () => {
    const r = Gem.compare(Gem.compute('ם', 'standard'), Gem.compute('מ', 'standard'));
    assert.deepStrictEqual(r.common, ['מ']);
    assert.strictEqual(r.equal, true);
});

test('compare : même réduction à un chiffre malgré des totaux différents', () => {
    // 376 → 16 → 7 ; 25 → 7
    const a = Gem.compute('שלום', 'standard', true);
    const b = Gem.compute('כה', 'standard', true);      // 20 + 5 = 25
    const r = Gem.compare(a, b);
    assert.strictEqual(r.equal, false);
    assert.strictEqual(r.sameReduced, 7);
    // sans réduction demandée : pas de réduction commune
    assert.strictEqual(Gem.compare(Gem.compute('שלום', 'standard'), Gem.compute('כה', 'standard')).sameReduced, null);
});

test('compare : un texte vide donne un total nul sans erreur', () => {
    const r = Gem.compare(Gem.compute('', 'standard'), Gem.compute('אב', 'standard'));
    assert.strictEqual(r.difference, 3);
    assert.strictEqual(r.multiple, null);
    assert.deepStrictEqual(r.common, []);
});
